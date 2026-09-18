import React, { useMemo, useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Input,
  Select,
  Statistic,
  Row,
  Col,
  Progress,
  Popconfirm,
  message,
  Modal,
  DatePicker,
  Typography
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  ExportOutlined,
  LockOutlined,
  UnlockOutlined,
  ProfileOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import { openConsumableBatch } from '../../../store';
import type { ConsumableBatch, BatchLifeStatus } from '../../../types';
import {
  BATCH_STATUS_COLOR,
  BATCH_STATUS_TEXT,
  categoryText,
  getBatchStatus,
  getEffectiveExpiryDate,
  getRemainingDays,
  getUsableStock
} from '../../../utils/consumables';
import BatchInboundModal from './BatchInboundModal';
import UsageModal from './UsageModal';
import BatchDetailDrawer from './BatchDetailDrawer';

const { Text } = Typography;

type FilterStatus = BatchLifeStatus | 'all';

const BatchesTab: React.FC = () => {
  const dispatch = useDispatch();
  const { consumables, consumableBatches } = useSelector(
    (s: RootState) => s.app
  );

  const [keyword, setKeyword] = useState('');
  const [consumableFilter, setConsumableFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [inboundOpen, setInboundOpen] = useState(false);
  const [usageOpen, setUsageOpen] = useState(false);
  const [usagePreset, setUsagePreset] = useState<{
    consumableId?: string;
    batchId?: string;
  }>({});
  const [detailBatch, setDetailBatch] = useState<ConsumableBatch | null>(null);
  const [openDateModal, setOpenDateModal] = useState<{
    batch: ConsumableBatch;
    date: dayjs.Dayjs;
  } | null>(null);

  const consumablesMap = useMemo(
    () => new Map(consumables.map((c) => [c.id, c])),
    [consumables]
  );

  const rows = useMemo(() => {
    return consumableBatches.map((b) => {
      const consumable = consumablesMap.get(b.consumableId);
      const status = getBatchStatus(b, consumable);
      return {
        batch: b,
        consumable,
        status,
        remainingDays: getRemainingDays(b, consumable),
        effectiveExpiry: getEffectiveExpiryDate(b, consumable)
      };
    });
  }, [consumableBatches, consumablesMap]);

  const stats = useMemo(() => {
    const active = rows.filter((r) => r.status !== 'used_up');
    return {
      total: consumableBatches.length,
      near: active.filter((r) => r.status === 'near_expiry').length,
      expired: active.filter((r) => r.status === 'expired').length,
      unopened: active.filter((r) => !r.batch.openedDate).length,
      usableTypes: consumables.filter(
        (c) => getUsableStock(c.id, consumableBatches, consumablesMap) > 0
      ).length
    };
  }, [rows, consumables, consumableBatches, consumablesMap]);

  const filtered = useMemo(() => {
    return rows
      .filter((r) => {
        if (statusFilter !== 'all' && r.status !== statusFilter) return false;
        if (consumableFilter && r.batch.consumableId !== consumableFilter) return false;
        if (keyword) {
          const kw = keyword.trim().toLowerCase();
          return (
            r.batch.batchNo.toLowerCase().includes(kw) ||
            (r.consumable?.name ?? '').includes(keyword.trim())
          );
        }
        return true;
      })
      .sort((a, b) => {
        const rank: Record<BatchLifeStatus, number> = {
          expired: 0,
          near_expiry: 1,
          normal: 2,
          used_up: 3
        };
        if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
        return a.effectiveExpiry.localeCompare(b.effectiveExpiry);
      });
  }, [rows, keyword, consumableFilter, statusFilter]);

  const confirmOpen = () => {
    if (!openDateModal) return;
    dispatch(
      openConsumableBatch({
        id: openDateModal.batch.id,
        openedDate: openDateModal.date.format('YYYY-MM-DD')
      })
    );
    message.success('已登记开封');
    setOpenDateModal(null);
  };

  const openUsage = (consumableId: string, batchId?: string) => {
    setUsagePreset({ consumableId, batchId });
    setUsageOpen(true);
  };

  const columns: ColumnsType<(typeof rows)[number]> = [
    {
      title: '批号',
      dataIndex: ['batch', 'batchNo'],
      width: 190,
      render: (batchNo: string, record) => (
        <Space size={6}>
          <a onClick={() => setDetailBatch(record.batch)}>{batchNo}</a>
          {record.batch.openedDate ? (
            <Tag icon={<UnlockOutlined />} color="gold">
              已开封
            </Tag>
          ) : (
            <Tag icon={<LockOutlined />} color="blue">
              未开封
            </Tag>
          )}
        </Space>
      )
    },
    {
      title: '耗材',
      width: 180,
      render: (_, record) => (
        <div>
          <div>{record.consumable?.name ?? '-'}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.consumable ? categoryText(record.consumable.category) : ''}
          </Text>
        </div>
      )
    },
    {
      title: '有效期',
      width: 210,
      render: (_, record) => (
        <div>
          <div>
            效期 {record.batch.expiryDate}
            {record.batch.openedDate ? (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {' '}
                / {record.batch.openedDate} 开封
              </Text>
            ) : null}
          </div>
          <Text
            type={
              record.status === 'expired'
                ? 'danger'
                : record.status === 'near_expiry'
                ? 'warning'
                : 'secondary'
            }
            style={{ fontSize: 12 }}
          >
            实际失效日 {record.effectiveExpiry}
          </Text>
        </div>
      )
    },
    {
      title: '剩余天数',
      width: 110,
      sorter: (a, b) => a.remainingDays - b.remainingDays,
      render: (_, record) =>
        record.status === 'used_up' ? (
          '-'
        ) : record.remainingDays < 0 ? (
          <Text type="danger" strong>
            已超期 {-record.remainingDays} 天
          </Text>
        ) : record.remainingDays === 0 ? (
          <Text type="warning" strong>
            今日到期
          </Text>
        ) : (
          <Text
            strong={record.status === 'near_expiry'}
            type={record.status === 'near_expiry' ? 'warning' : undefined}
          >
            {record.remainingDays} 天
          </Text>
        )
    },
    {
      title: '状态',
      width: 90,
      render: (_, record) => (
        <Tag color={BATCH_STATUS_COLOR[record.status]}>{BATCH_STATUS_TEXT[record.status]}</Tag>
      )
    },
    {
      title: '余量',
      width: 170,
      sorter: (a, b) => a.batch.remainingQuantity - b.batch.remainingQuantity,
      render: (_, record) => {
        const unit = record.consumable?.unit ?? '';
        const percent =
          record.batch.initialQuantity > 0
            ? (record.batch.remainingQuantity / record.batch.initialQuantity) * 100
            : 0;
        return (
          <div>
            <Text strong>
              {record.batch.remainingQuantity} {unit}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {' '}
              / 入库 {record.batch.initialQuantity}
            </Text>
            <Progress percent={percent} size="small" showInfo={false} />
          </div>
        );
      }
    },
    {
      title: '操作',
      width: 190,
      fixed: 'right',
      render: (_, record) => {
        const usable = record.status !== 'expired' && record.status !== 'used_up';
        return (
          <Space size={4}>
            <Button
              type="link"
              size="small"
              icon={<ProfileOutlined />}
              onClick={() => setDetailBatch(record.batch)}
            >
              台账
            </Button>
            {!record.batch.openedDate ? (
              <Popconfirm
                title="登记开封"
                description="默认以今天为开封日期，确认？"
                onConfirm={() =>
                  setOpenDateModal({ batch: record.batch, date: dayjs() })
                }
                okText="今天开封"
                cancelText="取消"
              >
                <Button type="link" size="small">
                  开封
                </Button>
              </Popconfirm>
            ) : null}
            <Button
              type="link"
              size="small"
              danger={record.status === 'expired'}
              disabled={!usable}
              onClick={() => openUsage(record.batch.consumableId, record.batch.id)}
            >
              领用
            </Button>
          </Space>
        );
      }
    }
  ];

  const statusTabs: { value: FilterStatus; label: string; count: number }[] = [
    { value: 'all', label: '全部', count: rows.length },
    { value: 'normal', label: '正常', count: rows.filter((r) => r.status === 'normal').length },
    { value: 'near_expiry', label: '临期', count: stats.near },
    { value: 'expired', label: '已过期', count: stats.expired },
    { value: 'used_up', label: '已用完', count: rows.filter((r) => r.status === 'used_up').length }
  ];

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="在管批次" value={stats.total} suffix="批" />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="临期批次（有余量）"
              value={stats.near}
              suffix="批"
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="已过期（禁止领用）"
              value={stats.expired}
              suffix="批"
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="未开封批号" value={stats.unopened} suffix="批" />
          </Card>
        </Col>
      </Row>

      <Card
        extra={
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setInboundOpen(true)}>
              批次入库
            </Button>
            <Button icon={<ExportOutlined />} onClick={() => openUsage(consumableFilter ?? '')}>
              耗材领用
            </Button>
          </Space>
        }
        styles={{ body: { paddingTop: 8 } }}
      >
        <Space wrap style={{ marginBottom: 12 }}>
          <Input.Search
            placeholder="搜索批号 / 耗材名称"
            allowClear
            style={{ width: 240 }}
            onSearch={setKeyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <Select
            placeholder="耗材"
            style={{ width: 200 }}
            allowClear
            value={consumableFilter}
            onChange={setConsumableFilter}
            options={consumables.map((c) => ({
              value: c.id,
              label: `${c.name}（${categoryText(c.category)}）`
            }))}
          />
          <Select
            value={statusFilter}
            style={{ width: 140 }}
            onChange={setStatusFilter}
            options={statusTabs.map((t) => ({
              value: t.value,
              label: `${t.label}（${t.count}）`
            }))}
          />
        </Space>

        <Table
          rowKey={(r) => r.batch.id}
          columns={columns}
          dataSource={filtered}
          scroll={{ x: 1180 }}
          size="middle"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          rowClassName={(r) =>
            r.status === 'expired'
              ? 'cons-row-expired'
              : r.status === 'near_expiry'
              ? 'cons-row-near'
              : ''
          }
        />
      </Card>

      <BatchInboundModal
        open={inboundOpen}
        onClose={() => setInboundOpen(false)}
        defaultConsumableId={consumableFilter}
      />
      <UsageModal
        open={usageOpen}
        onClose={() => setUsageOpen(false)}
        defaultConsumableId={usagePreset.consumableId}
        defaultBatchId={usagePreset.batchId}
      />
      <BatchDetailDrawer
        batch={detailBatch}
        open={!!detailBatch}
        onClose={() => setDetailBatch(null)}
      />

      <Modal
        title="登记开封日期"
        open={!!openDateModal}
        onOk={confirmOpen}
        onCancel={() => setOpenDateModal(null)}
        okText="确认"
        cancelText="取消"
      >
        <Space direction="vertical">
          <span>批号：{openDateModal?.batch.batchNo}</span>
          <DatePicker
            value={openDateModal?.date}
            maxDate={dayjs()}
            onChange={(v) =>
              v && openDateModal && setOpenDateModal({ ...openDateModal, date: v })
            }
          />
        </Space>
      </Modal>
    </div>
  );
};

export default BatchesTab;
