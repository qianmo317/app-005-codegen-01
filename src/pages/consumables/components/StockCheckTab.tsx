import React, { useMemo, useState } from 'react';
import {
  Card,
  DatePicker,
  Table,
  Tag,
  Button,
  Space,
  InputNumber,
  Input,
  Statistic,
  Row,
  Col,
  Alert,
  Empty,
  message,
  Typography
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SaveOutlined, FileDoneOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import { saveStockCheck } from '../../../store';
import type { StockCheckItem } from '../../../types';
import {
  buildStockCheckItems,
  categoryText,
  getBatchStatus,
  summarizeCheck
} from '../../../utils/consumables';

const { Text } = Typography;

const StockCheckTab: React.FC = () => {
  const dispatch = useDispatch();
  const { consumables, consumableBatches, stockChecks } = useSelector((s: RootState) => s.app);
  const [month, setMonth] = useState<Dayjs>(dayjs());
  const [operator, setOperator] = useState('管理员');
  const [note, setNote] = useState('');

  const monthStr = month.format('YYYY-MM');
  const existing = stockChecks.find((c) => c.month === monthStr);

  const consumablesMap = useMemo(
    () => new Map(consumables.map((c) => [c.id, c])),
    [consumables]
  );

  // 每次切换月份，以当前账面余量重建行，并沿用该月已录实盘数
  const items = useMemo<StockCheckItem[]>(
    () => buildStockCheckItems(monthStr, consumableBatches, existing?.items),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [monthStr, consumableBatches, existing?.id]
  );

  const [draftActual, setDraftActual] = useState<Record<string, number | null>>({});

  React.useEffect(() => {
    const map: Record<string, number | null> = {};
    items.forEach((i) => {
      map[i.batchId] = i.actualQuantity;
    });
    setDraftActual(map);
    if (existing) {
      setOperator(existing.operator || '管理员');
      setNote(existing.note || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthStr, existing?.id]);

  const rows = items.map((i) => {
    const batch = consumableBatches.find((b) => b.id === i.batchId);
    const consumable = batch ? consumablesMap.get(batch.consumableId) : undefined;
    const actual = draftActual[i.batchId] ?? null;
    return {
      item: i,
      batch,
      consumable,
      actual
    };
  });

  const summary = useMemo(() => {
    const withActual = items.map((i) => ({
      ...i,
      actualQuantity: draftActual[i.batchId] ?? i.actualQuantity
    }));
    return summarizeCheck(withActual);
  }, [items, draftActual]);

  const handleSave = () => {
    const payload = items.map((i) => ({
      batchId: i.batchId,
      bookQuantity: i.bookQuantity,
      actualQuantity: draftActual[i.batchId] ?? null
    }));
    if (payload.some((p) => p.actualQuantity === null)) {
      message.warning('还有批次未录入实盘数，请全部点完再保存');
      return;
    }
    if (payload.some((p) => (p.actualQuantity as number) < 0)) {
      message.error('实盘数量不能为负');
      return;
    }
    dispatch(
      saveStockCheck({
        id: existing?.id,
        month: monthStr,
        checkDate: dayjs().format('YYYY-MM-DD'),
        items: payload,
        operator: operator.trim() || '管理员',
        note: note.trim()
      })
    );
    message.success(`${monthStr} 盘点单已保存，可随时修订重存`);
  };

  const columns: ColumnsType<(typeof rows)[number]> = [
    {
      title: '耗材',
      width: 180,
      render: (_, r) => (
        <div>
          <div>{r.consumable?.name ?? <Text type="danger">耗材已删除</Text>}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {r.consumable ? categoryText(r.consumable.category) : ''}
          </Text>
        </div>
      )
    },
    {
      title: '批号',
      width: 190,
      render: (_, r) => (
        <Space size={4}>
          <span>{r.batch?.batchNo ?? '-'}</span>
          {r.batch && !r.batch.openedDate ? <Tag color="blue">未开封</Tag> : null}
          {r.batch
            ? (() => {
                const status = getBatchStatus(r.batch, r.consumable);
                return status === 'expired' ? (
                  <Tag color="red">已过期</Tag>
                ) : status === 'used_up' ? (
                  <Tag>已用完</Tag>
                ) : null;
              })()
            : null}
        </Space>
      )
    },
    { title: '入库日期', width: 110, render: (_, r) => r.batch?.inboundDate ?? '-' },
    {
      title: '系统账面余量',
      width: 130,
      dataIndex: ['item', 'bookQuantity'],
      render: (v: number) => <Text strong>{v}</Text>
    },
    {
      title: '实盘数量',
      width: 150,
      render: (_, r) => (
        <InputNumber
          min={0}
          precision={3}
          style={{ width: 120 }}
          placeholder="点货数"
          value={r.actual}
          onChange={(v) =>
            setDraftActual((prev) => ({ ...prev, [r.item.batchId]: v }))
          }
        />
      )
    },
    {
      title: '差异（实盘-账面）',
      width: 150,
      render: (_, r) => {
        if (r.actual === null || r.actual === undefined) return <Text type="secondary">待点</Text>;
        const diff = Number((r.actual - r.item.bookQuantity).toFixed(3));
        if (diff === 0) return <Tag color="green">一致</Tag>;
        return (
          <Text type={diff < 0 ? 'danger' : 'warning'} strong>
            {diff < 0 ? `盘亏 ${-diff}` : `盘盈 ${diff}`} {r.consumable?.unit}
          </Text>
        );
      }
    }
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card>
        <Row gutter={16} align="middle">
          <Col>
            <Space>
              <span>盘点月份：</span>
              <DatePicker
                picker="month"
                value={month}
                onChange={(v) => v && setMonth(v)}
                allowClear={false}
              />
            </Space>
          </Col>
          <Col>
            <Input
              style={{ width: 160 }}
              addonBefore="盘点人"
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
            />
          </Col>
          <Col flex="auto">
            <Input
              placeholder="备注（如 月末实物盘点）"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Col>
          <Col>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
              保存盘点单
            </Button>
          </Col>
        </Row>
      </Card>

      <Row gutter={16}>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="应点批次" value={summary.totalCount} suffix="批" />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="已点批次"
              value={summary.checkedCount}
              suffix={`/ ${summary.totalCount}`}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="有差异批次"
              value={rows.filter(
                (r) =>
                  r.actual !== null &&
                  r.actual !== undefined &&
                  Math.abs(r.actual - r.item.bookQuantity) > 0.0001
              ).length}
              suffix="批"
              valueStyle={{ color: summary.hasLoss ? '#ff4d4f' : undefined }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="净差异（件数合计）"
              value={Number(summary.diffTotal.toFixed(3))}
              valueStyle={{
                color: summary.diffTotal < 0 ? '#ff4d4f' : summary.diffTotal > 0 ? '#faad14' : undefined
              }}
              suffix={summary.diffTotal === 0 ? '账实相符' : summary.diffTotal < 0 ? '盘亏' : '盘盈'}
              prefix={summary.diffTotal === 0 ? <FileDoneOutlined /> : undefined}
            />
          </Card>
        </Col>
      </Row>

      {existing ? (
        <Alert
          type="success"
          showIcon
          message={`${monthStr} 盘点单已于 ${existing.checkDate} 保存（盘点人：${existing.operator}），当前页面可继续修订后重存。`}
        />
      ) : (
        <Alert
          type="info"
          showIcon
          message={`正在对 ${monthStr} 月底点货：账面余量按系统当前数据列示，逐批录入实盘数量后保存。差异为负即盘亏（少货），可直接定位到具体批号。`}
        />
      )}

      <Card styles={{ body: { paddingTop: 8 } }}>
        {rows.length === 0 ? (
          <Empty description="该月末之前没有任何批次入库，无需点货" />
        ) : (
          <Table
            rowKey={(r) => r.item.batchId}
            columns={columns}
            dataSource={rows}
            size="middle"
            scroll={{ x: 980 }}
            pagination={false}
            rowClassName={(r) => {
              if (r.actual === null || r.actual === undefined) return '';
              const diff = r.actual - r.item.bookQuantity;
              if (diff < -0.0001) return 'cons-row-loss';
              if (diff > 0.0001) return 'cons-row-profit';
              return '';
            }}
          />
        )}
      </Card>
    </Space>
  );
};

export default StockCheckTab;
