import React, { useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Select, DatePicker, message } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import { addConsumableBatch } from '../../../store';
import { validateInbound, categoryText } from '../../../utils/consumables';

interface BatchInboundModalProps {
  open: boolean;
  onClose: () => void;
  defaultConsumableId?: string;
}

interface FormValues {
  consumableId: string;
  batchNo: string;
  inboundDate: Dayjs;
  expiryDate: Dayjs;
  initialQuantity: number;
  opened: boolean;
  openedDate: Dayjs | null;
  supplier: string;
}

const BatchInboundModal: React.FC<BatchInboundModalProps> = ({
  open,
  onClose,
  defaultConsumableId
}) => {
  const dispatch = useDispatch();
  const { consumables, consumableBatches } = useSelector((s: RootState) => s.app);
  const [form] = Form.useForm<FormValues>();
  const opened = Form.useWatch('opened', form);

  useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue({
        consumableId: defaultConsumableId,
        inboundDate: dayjs(),
        opened: false,
        openedDate: dayjs(),
        initialQuantity: 100,
        supplier: ''
      });
    }
  }, [open, defaultConsumableId, form]);

  const activeConsumables = consumables.filter((c) => c.status === 'active');

  const handleOk = async () => {
    const values = await form.validateFields();
    const openedDate = values.opened ? (values.openedDate ?? dayjs()).format('YYYY-MM-DD') : null;
    const error = validateInbound(
      {
        batchNo: values.batchNo,
        inboundDate: values.inboundDate.format('YYYY-MM-DD'),
        expiryDate: values.expiryDate.format('YYYY-MM-DD'),
        quantity: values.initialQuantity,
        openedDate
      },
      consumableBatches
    );
    if (error) {
      message.error(error);
      return;
    }
    dispatch(
      addConsumableBatch({
        id: `B${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        batchNo: values.batchNo.trim(),
        consumableId: values.consumableId,
        inboundDate: values.inboundDate.format('YYYY-MM-DD'),
        expiryDate: values.expiryDate.format('YYYY-MM-DD'),
        openedDate,
        initialQuantity: values.initialQuantity,
        remainingQuantity: values.initialQuantity,
        supplier: values.supplier?.trim() || '',
        createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss')
      })
    );
    message.success(`批号 ${values.batchNo} 入库成功`);
    onClose();
  };

  return (
    <Modal
      title="耗材入库（新批次）"
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      okText="确认入库"
      cancelText="取消"
      width={560}
      destroyOnClose
    >
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
            options={activeConsumables.map((c) => ({
              value: c.id,
              label: `${c.name}（${categoryText(c.category)}）`
            }))}
          />
        </Form.Item>
        <Form.Item
          name="batchNo"
          label="批号"
          rules={[{ required: true, message: '请输入批号' }]}
          extra="同一批号全局唯一，重复入库将被拒绝"
        >
          <Input placeholder="如 MMF-20260918-A" allowClear />
        </Form.Item>
        <Form.Item style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              name="inboundDate"
              label="入库日期"
              style={{ flex: 1 }}
              rules={[{ required: true, message: '请选择入库日期' }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              name="expiryDate"
              label="有效期（未开封失效日）"
              style={{ flex: 1 }}
              rules={[{ required: true, message: '请选择有效期' }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </div>
        </Form.Item>
        <Form.Item style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              name="initialQuantity"
              label="入库数量"
              style={{ flex: 1 }}
              rules={[{ required: true, message: '请输入入库数量' }]}
            >
              <InputNumber style={{ width: '100%' }} min={0.001} step={10} precision={3} />
            </Form.Item>
            <Form.Item name="supplier" label="供应商" style={{ flex: 1 }}>
              <Input placeholder="选填" allowClear />
            </Form.Item>
          </div>
        </Form.Item>
        <Form.Item name="opened" label="入库时是否已开封" valuePropName="checked">
          <Select
            options={[
              { value: false, label: '未开封（优先使用未开封批号）' },
              { value: true, label: '已开封（需登记开封日期）' }
            ]}
          />
        </Form.Item>
        {opened ? (
          <Form.Item
            name="openedDate"
            label="开封日期"
            rules={[{ required: true, message: '请选择开封日期' }]}
            extra="开封后按该耗材的开封保质期计算剩余可用天数"
          >
            <DatePicker style={{ width: '100%' }} maxDate={dayjs()} />
          </Form.Item>
        ) : null}
      </Form>
    </Modal>
  );
};

export default BatchInboundModal;
