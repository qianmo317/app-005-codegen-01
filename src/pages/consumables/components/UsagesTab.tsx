import React, { useMemo, useState } from 'react';
import { Card, Table, Tag, Space, Input, Select, DatePicker, Button, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ExportOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import { BATCH_STATUS_COLOR, categoryText, getBatchStatus } from '../../../utils/consumables';

const { RangePicker } = DatePicker;
const { Text } = Typography;

interface UsagesTabProps {
  onUsage: (consumableId?: string, batchId?: string) => void;
}

const UsagesTab: React.FC<UsagesTabProps> = ({ onUsage }) => {
  const { consumables, consumableBatches, consumableUsages, customers, employees, serviceRecords } =
    useSelector((s: RootState) => s.app);

  const [keyword, setKeyword] = useState('');
  const [consumableId, setConsumableId] = useState<string | undefined>();
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  const consumablesMap = useMemo(
    () => new Map(consumables.map((c) => [c.id, c])),
    [consumables]
  );
  const customerMap = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const employeeMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  const data = useMemo(() => {
    return consumableUsages
      .map((u) => {
        const batch = consumableBatches.find((b) => b.id === u.batchId);
        return { usage: u, batch };
      })
      .filter(({ usage, batch }) => {
        if (consumableId && usage.consumableId !== consumableId) return false;
        if (range && range[0] && range[1]) {
          const t = dayjs(usage.usageDate);
          if (t.isBefore(range[0], 'day') || t.isAfter(range[1], 'day')) return false;
        }
        if (keyword) {
          const kw = keyword.trim().toLowerCase();
          const hay = [
            batch?.batchNo ?? '',
            consumablesMap.get(usage.consumableId)?.name ?? '',
            usage.customerId ? customerMap.get(usage.customerId)?.name ?? '' : '',
            usage.purpose,
            usage.operator
          ]
            .join(' ')
            .toLowerCase();
          if (!hay.includes(kw)) return false;
        }
        return true;
      })
      .sort((a, b) =>
        b.usage.usageDate.localeCompare(a.usage.usageDate) ||
        b.usage.createdAt.localeCompare(a.usage.createdAt)
      );
  }, [
    consumableUsages,
    consumableBatches,
    consumableId,
    range,
    keyword,
    consumablesMap,
    customerMap
  ]);

  const totalUsed = useMemo(
    () => data.reduce((sum, r) => sum + r.usage.quantity, 0),
    [data]
  );

  const columns: ColumnsType<(typeof data)[number]> = [
    {
      title: '领用日期',
      dataIndex: ['usage', 'usageDate'],
      width: 110,
      defaultSortOrder: 'descend',
      sorter: (a, b) => a.usage.usageDate.localeCompare(b.usage.usageDate)
    },
    {
      title: '耗材 / 批号',
      width: 230,
      render: (_, r) => {
        const c = consumablesMap.get(r.usage.consumableId);
        const status = r.batch ? getBatchStatus(r.batch, c) : undefined;
        return (
          <div>
            <Space size={4}>
              <Text>{c?.name ?? '-'}</Text>
              {c ? <Tag>{categoryText(c.category)}</Tag> : null}
            </Space>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                批号 {r.batch?.batchNo ?? '（批次已不存在）'}
              </Text>
              {status === 'expired' ? (
                <Tag color={BATCH_STATUS_COLOR.expired} style={{ marginLeft: 4 }}>
                  该批现已过期
                </Tag>
              ) : null}
            </div>
          </div>
        );
      }
    },
    {
      title: '用量',
      width: 100,
      sorter: (a, b) => a.usage.quantity - b.usage.quantity,
      render: (_, r) => (
        <Text strong>
          -{r.usage.quantity} {consumablesMap.get(r.usage.consumableId)?.unit}
        </Text>
      )
    },
    {
      title: '哪次护理 / 顾客',
      width: 180,
      render: (_, r) => {
        const customer = r.usage.customerId ? customerMap.get(r.usage.customerId) : null;
        const service = r.usage.serviceRecordId
          ? serviceRecords.find((x) => x.id === r.usage.serviceRecordId)
          : null;
        return (
          <div>
            <div>{customer ? customer.name : <Text type="secondary">日常领用</Text>}</div>
            {service ? (
              <Text type="secondary" style={{ fontSize: 12 }}>
                护理单 {service.id}
              </Text>
            ) : null}
          </div>
        );
      }
    },
    {
      title: '美容师',
      width: 90,
      render: (_, r) =>
        r.usage.employeeId ? employeeMap.get(r.usage.employeeId)?.name ?? '-' : '-'
    },
    { title: '用途', dataIndex: ['usage', 'purpose'], ellipsis: true },
    { title: '领用人', dataIndex: ['usage', 'operator'], width: 90 }
  ];

  return (
    <Card
      title={
        <Space wrap>
          <span>领用流水</span>
          <Tag color="blue">{data.length} 条</Tag>
          <Text type="secondary" style={{ fontSize: 12, fontWeight: 'normal' }}>
            筛选范围内合计领用 {Number(totalUsed.toFixed(3))}
          </Text>
        </Space>
      }
      extra={
        <Button type="primary" icon={<ExportOutlined />} onClick={() => onUsage(consumableId)}>
          登记领用
        </Button>
      }
      styles={{ body: { paddingTop: 8 } }}
    >
      <Space wrap style={{ marginBottom: 12 }}>
        <Input.Search
          placeholder="批号 / 耗材 / 顾客 / 用途"
          allowClear
          style={{ width: 260 }}
          onSearch={setKeyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <Select
          placeholder="耗材"
          style={{ width: 200 }}
          allowClear
          value={consumableId}
          onChange={setConsumableId}
          options={consumables.map((c) => ({
            value: c.id,
            label: `${c.name}（${categoryText(c.category)}）`
          }))}
        />
        <RangePicker
          value={range as [Dayjs | null, Dayjs | null] | null}
          onChange={(v) => setRange(v as [Dayjs | null, Dayjs | null] | null)}
        />
      </Space>
      <Table
        rowKey={(r) => r.usage.id}
        columns={columns}
        dataSource={data}
        size="middle"
        scroll={{ x: 1000 }}
        pagination={{ pageSize: 12, showSizeChanger: false }}
      />
    </Card>
  );
};

export default UsagesTab;
