import React, { useEffect, useMemo } from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Alert,
  Tag,
  Space,
  Typography,
  message
} from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import { addConsumableUsage } from '../../../store';
import {
  getBatchStatus,
  getEffectiveExpiryDate,
  getRemainingDays,
  getBatchBlockReason,
  sortBatchesByPriority,
  BATCH_STATUS_COLOR,
  BATCH_STATUS_TEXT,
  categoryText
} from '../../../utils/consumables';

interface UsageModalProps {
  open: boolean;
  onClose: () => void;
  defaultConsumableId?: string;
  defaultBatchId?: string;
}

interface FormValues {
  consumableId: string;
  batchId: string;
  usageDate: Dayjs;
  quantity: number;
  serviceRecordId: string | null;
  employeeId: string | null;
  purpose: string;
  operator: string;
}

const { Text } = Typography;

const UsageModal: React.FC<UsageModalProps> = ({
  open,
  onClose,
  defaultConsumableId,
  defaultBatchId
}) => {
  const dispatch = useDispatch();
  const {
    consumables,
    consumableBatches,
    serviceRecords,
    customers,
    employees
  } = useSelector((s: RootState) => s.app);
  const [form] = Form.useForm<FormValues>();

  const consumablesMap = useMemo(
    () => new Map(consumables.map((c) => [c.id, c])),
    [consumables]
  );

  const consumableId = Form.useWatch('consumableId', form);
  const batchId = Form.useWatch('batchId', form);
  const serviceRecordId = Form.useWatch('serviceRecordId', form);

  // 推荐领用顺序：未开封优先，其次先到期先用；过期批号置灰禁止选择
  const priorityBatches = useMemo(() => {
    if (!consumableId) return [];
    return sortBatchesByPriority(
      consumableBatches.filter((b) => b.consumableId === consumableId),
      consumablesMap
    );
  }, [consumableId, consumableBatches, consumablesMap]);

  // 含已过期/已用完批号（置灰展示，明确"不可领用"原因）
  const allBatches = useMemo(
    () =>
      consumableBatches
        .filter((b) => b.consumableId === consumableId)
        .sort((a, b) => {
          const ia = priorityBatches.findIndex((x) => x.id === a.id);
          const ib = priorityBatches.findIndex((x) => x.id === b.id);
          if (ia !== -1 && ib !== -1) return ia - ib;
          if (ia !== -1) return -1;
          if (ib !== -1) return 1;
          return a.batchNo.localeCompare(b.batchNo);
        }),
    [consumableId, consumableBatches, priorityBatches]
  );

  const selectedBatch = consumableBatches.find((b) => b.id === batchId);
  const selectedConsumable = consumablesMap.get(consumableId);
  const selectedService = serviceRecords.find((r) => r.id === serviceRecordId);

  useEffect(() => {
    if (open) {
      const cId = defaultConsumableId ?? consumables.find((c) => c.status === 'active')?.id;
      form.resetFields();
      form.setFieldsValue({
        consumableId: cId,
        usageDate: dayjs(),
        quantity: undefined,
        serviceRecordId: null,
        employeeId: null,
        purpose: '',
        operator: '管理员'
      });
      // 默认批号：优先外部指定，否则取推荐首位
      setTimeout(() => {
        const preset =
          defaultBatchId &&
          consumableBatches.find(
            (b) =>
              b.id === defaultBatchId &&
              b.consumableId === cId &&
              getBatchBlockReason(b, consumablesMap.get(b.consumableId)) === null
          );
        if (preset) {
          form.setFieldsValue({ batchId: preset.id });
        }
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // 耗材切换时自动选中推荐首位批号
  useEffect(() => {
    if (!open || !consumableId) return;
    if (defaultBatchId) return;
    const current = consumableBatches.find((b) => b.id === batchId);
    if (current && current.consumableId === consumableId) return;
    const first = sortBatchesByPriority(
      consumableBatches.filter((b) => b.consumableId === consumableId),
      consumablesMap
    )[0];
    form.setFieldsValue({ batchId: first?.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consumableId, open]);

  // 选中护理记录后自动带出顾客与美容师
  useEffect(() => {
    if (selectedService) {
      form.setFieldsValue({
        employeeId: selectedService.employeeId,
        purpose: form.getFieldValue('purpose') || ''
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceRecordId]);

  const customerMap = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);

  const recentServices = useMemo(() => {
    return [...serviceRecords]
      .sort((a, b) => b.serviceDate.localeCompare(a.serviceDate))
      .slice(0, 60);
  }, [serviceRecords]);

  const handleOk = async () => {
    const values = await form.validateFields();
    if (!selectedBatch || !selectedConsumable) return;
    const blockReason = getBatchBlockReason(selectedBatch, selectedConsumable);
    if (blockReason) {
      message.error(blockReason);
      return;
    }
    const linked = serviceRecords.find((r) => r.id === values.serviceRecordId);
    dispatch(
      addConsumableUsage({
        batchId: selectedBatch.id,
        consumableId: selectedBatch.consumableId,
        usageDate: values.usageDate.format('YYYY-MM-DD'),
        quantity: values.quantity,
        serviceRecordId: values.serviceRecordId || null,
        customerId: linked?.customerId ?? null,
        employeeId: values.employeeId || linked?.employeeId || null,
        purpose: values.purpose?.trim() || (linked ? '护理消耗' : '日常领用'),
        operator: values.operator?.trim() || '管理员'
      })
    );
    message.success(
      `已领用 ${values.quantity} ${selectedConsumable.unit}，批号 ${selectedBatch.batchNo} 余量同步扣减`
    );
    onClose();
  };

  return (
    <Modal
      title="耗材领用登记"
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      okText="确认领用"
      cancelText="取消"
      width={600}
      destroyOnClose
    >
      <Alert
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        style={{ marginBottom: 16 }}
        message="系统按「未开封批号优先、先到期先用」自动推荐批号；已过期批号禁止领用。未开封批号首次领用时将自动登记为当日开封。"
      />
      <Form form={form} layout="vertical">
        <Form.Item
          name="consumableId"
          label="耗材"
          rules={[{ required: true, message: '请选择耗材' }]}
        >
          <Select
            placeholder="选择耗材"
            showSearch
            optionFilterProp="label"
            options={consumables
              .filter((c) => c.status === 'active')
              .map((c) => ({
                value: c.id,
                label: `${c.name}（${categoryText(c.category)}）`
              }))}
          />
        </Form.Item>

        <Form.Item
          name="batchId"
          label="领用批号"
          rules={[{ required: true, message: '请选择批号' }]}
        >
          <Select
            placeholder="选择批号"
            optionLabelProp="label"
            options={allBatches.map((b, idx) => {
              const c = consumablesMap.get(b.consumableId);
              const status = getBatchStatus(b, c);
              const reason = getBatchBlockReason(b, c);
              const days = getRemainingDays(b, c);
              const labelParts = [
                b.batchNo,
                BATCH_STATUS_TEXT[status],
                !b.openedDate ? '未开封' : '已开封',
                `余${b.remainingQuantity}${c?.unit ?? ''}`,
                reason ? `（${reason}）` : idx === 0 && !reason ? '（推荐）' : ''
              ];
              return {
                value: b.id,
                label: labelParts.join(' '),
                disabled: !!reason,
                labelNode: (
                  <Space size={6} wrap>
                    <Text strong={!b.openedDate && !reason}>
                      {b.batchNo}
                    </Text>
                    <Tag color={BATCH_STATUS_COLOR[status]}>{BATCH_STATUS_TEXT[status]}</Tag>
                    <Tag color={b.openedDate ? 'gold' : 'blue'}>
                      {b.openedDate ? '已开封' : '未开封'}
                    </Tag>
                    <Text type="secondary">
                      余 {b.remainingQuantity} {c?.unit}
                    </Text>
                    {days >= 0 && status !== 'used_up' ? (
                      <Text type={days <= (c?.warningDays ?? 30) ? 'warning' : 'secondary'}>
                        剩 {days} 天
                      </Text>
                    ) : null}
                    {reason ? <Text type="danger">{reason}</Text> : null}
                  </Space>
                )
              };
            })}
            optionRender={(option) => option.data.labelNode}
          />
        </Form.Item>

        {selectedBatch && selectedConsumable ? (
          <Alert
            style={{ marginBottom: 16 }}
            type={
              getBatchStatus(selectedBatch, selectedConsumable) === 'near_expiry'
                ? 'warning'
                : 'success'
            }
            showIcon
            message={
              <Space direction="vertical" size={2}>
                <span>
                  实际失效日：
                  <Text strong>{getEffectiveExpiryDate(selectedBatch, selectedConsumable)}</Text>
                  {selectedBatch.openedDate
                    ? `（${selectedBatch.openedDate} 开封，开封后保质期 ${selectedConsumable.openedShelfLifeDays} 天）`
                    : '（未开封，按效期计算）'}
                </span>
                <span>
                  当前余量：{selectedBatch.remainingQuantity} {selectedConsumable.unit}
                  {!selectedBatch.openedDate ? '；领用后该批号自动标记为已开封' : ''}
                </span>
              </Space>
            }
          />
        ) : null}

        <Form.Item style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              name="usageDate"
              label="领用日期"
              style={{ flex: 1 }}
              rules={[{ required: true, message: '请选择领用日期' }]}
            >
              <DatePicker style={{ width: '100%' }} maxDate={dayjs()} />
            </Form.Item>
            <Form.Item
              name="quantity"
              label={`领用数量${selectedConsumable ? `（${selectedConsumable.unit}）` : ''}`}
              style={{ flex: 1 }}
              rules={[{ required: true, message: '请输入领用数量' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0.001}
                step={1}
                precision={3}
                max={selectedBatch?.remainingQuantity}
              />
            </Form.Item>
          </div>
        </Form.Item>

        <Form.Item
          name="serviceRecordId"
          label="关联护理（哪次护理使用）"
          extra={
            selectedService
              ? `顾客：${customerMap.get(selectedService.customerId)?.name ?? '-'} 美容师：${
                  employees.find((e) => e.id === selectedService.employeeId)?.name ?? '-'
                }`
              : undefined
          }
        >
          <Select
            allowClear
            placeholder="可选择近期护理记录，不选则为日常领用"
            showSearch
            optionFilterProp="label"
            options={recentServices.map((r) => ({
              value: r.id,
              label: `${dayjs(r.serviceDate).format('MM-DD HH:mm')} ${
                customerMap.get(r.customerId)?.name ?? ''
              }`
            }))}
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item name="employeeId" label="操作美容师" style={{ flex: 1 }}>
              <Select
                allowClear
                placeholder="选择美容师"
                options={employees.map((e) => ({ value: e.id, label: e.name }))}
              />
            </Form.Item>
            <Form.Item name="operator" label="领用人/登记人" style={{ flex: 1 }}>
              <Input placeholder="如 管理员" />
            </Form.Item>
          </div>
        </Form.Item>

        <Form.Item name="purpose" label="用途说明" style={{ marginBottom: 0 }}>
          <Input.TextArea
            rows={2}
            placeholder="如：面部补水护理一份；关联护理后可留空"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default UsageModal;
