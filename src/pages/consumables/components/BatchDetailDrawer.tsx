import React from 'react';
import { Drawer, Descriptions, Tag, Table, Empty, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import type { ConsumableBatch, ConsumableUsage } from '../../../types';
import {
  BATCH_STATUS_COLOR,
  BATCH_STATUS_TEXT,
  getBatchStatus,
  getBatchUsages,
  getEffectiveExpiryDate,
  getRemainingDays
} from '../../../utils/consumables';

const { Text } = Typography;

interface BatchDetailDrawerProps {
  batch: ConsumableBatch | null;
  open: boolean;
  onClose: () => void;
}

const BatchDetailDrawer: React.FC<BatchDetailDrawerProps> = ({ batch, open, onClose }) => {
  const { consumables, consumableUsages, customers, employees, serviceRecords } =
    useSelector((s: RootState) => s.app);

  if (!batch) return <Drawer open={false} onClose={onClose} />;

  const consumable = consumables.find((c) => c.id === batch.consumableId);
  const status = getBatchStatus(batch, consumable);
  const remainingDays = getRemainingDays(batch, consumable);
  const effectiveExpiry = getEffectiveExpiryDate(batch, consumable);
  const usages = getBatchUsages(batch.id, consumableUsages);
  const usedTotal = batch.initialQuantity - batch.remainingQuantity;

  const customerMap = new Map(customers.map((c) => [c.id, c]));
  const employeeMap = new Map(employees.map((e) => [e.id, e]));

  const columns: ColumnsType<ConsumableUsage> = [
    {
      title: '领用日期',
      dataIndex: 'usageDate',
      width: 110,
      sorter: (a, b) => a.usageDate.localeCompare(b.usageDate),
      defaultSortOrder: 'descend'
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      width: 90,
      render: (v: number) => (
        <Text strong>
          -{v} {consumable?.unit}
        </Text>
      )
    },
    {
      title: '关联护理 / 顾客',
      render: (_, record) => {
        const customer = record.customerId ? customerMap.get(record.customerId) : null;
        const service = record.serviceRecordId
          ? serviceRecords.find((r) => r.id === record.serviceRecordId)
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
      render: (_, record) =>
        record.employeeId ? employeeMap.get(record.employeeId)?.name ?? '-' : '-'
    },
    { title: '用途', dataIndex: 'purpose', ellipsis: true },
    { title: '领用人', dataIndex: 'operator', width: 90 }
  ];

  return (
    <Drawer
      title={
        <span>
          批次台账 <Text type="secondary">{batch.batchNo}</Text>
        </span>
      }
      open={open}
      onClose={onClose}
      width={680}
    >
      <Descriptions column={2} bordered size="small" style={{ marginBottom: 20 }}>
        <Descriptions.Item label="耗材" span={2}>
          {consumable?.name ?? '-'}
        </Descriptions.Item>
        <Descriptions.Item label="批号" span={2}>
          {batch.batchNo}
        </Descriptions.Item>
        <Descriptions.Item label="状态">
          <Tag color={BATCH_STATUS_COLOR[status]}>{BATCH_STATUS_TEXT[status]}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="剩余可用">
          {remainingDays >= 0 && status !== 'used_up' ? (
            <Text type={status === 'near_expiry' ? 'warning' : undefined} strong>
              {remainingDays} 天
            </Text>
          ) : (
            <Text type="danger">已超期 {-remainingDays} 天</Text>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="入库日期">{batch.inboundDate}</Descriptions.Item>
        <Descriptions.Item label="效期">{batch.expiryDate}</Descriptions.Item>
        <Descriptions.Item label="开封日期">
          {batch.openedDate ?? <Text type="secondary">未开封</Text>}
        </Descriptions.Item>
        <Descriptions.Item label="实际失效日">
          <Text strong>{effectiveExpiry}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="入库量">
          {batch.initialQuantity} {consumable?.unit}
        </Descriptions.Item>
        <Descriptions.Item label="累计领用">
          {usedTotal.toFixed(3).replace(/\.?0+$/, '')} {consumable?.unit}（{usages.length} 次）
        </Descriptions.Item>
        <Descriptions.Item label="当前余量" span={2}>
          <Text strong style={{ fontSize: 16 }}>
            {batch.remainingQuantity} {consumable?.unit}
          </Text>
        </Descriptions.Item>
        <Descriptions.Item label="供应商" span={2}>
          {batch.supplier || '-'}
        </Descriptions.Item>
      </Descriptions>

      <div style={{ fontWeight: 600, marginBottom: 8 }}>领用流水（{usages.length}）</div>
      {usages.length === 0 ? (
        <Empty description="该批次暂无领用记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <Table
          rowKey="id"
          columns={columns}
          dataSource={usages}
          size="small"
          pagination={usages.length > 8 ? { pageSize: 8 } : false}
        />
      )}
    </Drawer>
  );
};

export default BatchDetailDrawer;
