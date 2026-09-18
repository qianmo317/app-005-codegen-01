import React, { useEffect, useState } from 'react';
import {
  Modal,
  Table,
  Button,
  Space,
  Tag,
  Form,
  Input,
  InputNumber,
  Select,
  message
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import { addConsumable, updateConsumable } from '../../../store';
import type { Consumable } from '../../../types';
import {
  CONSUMABLE_CATEGORY_TEXT,
  categoryText,
  getUsableStock
} from '../../../utils/consumables';

interface ConsumableCatalogModalProps {
  open: boolean;
  onClose: () => void;
}

interface FormValues {
  name: string;
  category: string;
  unit: string;
  openedShelfLifeDays: number;
  warningDays: number;
  safetyStock: number;
  status: 'active' | 'inactive';
}

const ConsumableCatalogModal: React.FC<ConsumableCatalogModalProps> = ({ open, onClose }) => {
  const dispatch = useDispatch();
  const { consumables, consumableBatches } = useSelector((s: RootState) => s.app);
  const [editing, setEditing] = useState<Consumable | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form] = Form.useForm<FormValues>();

  const consumablesMap = new Map(consumables.map((c) => [c.id, c]));

  useEffect(() => {
    if (!formOpen) return;
    if (editing) {
      form.setFieldsValue({
        name: editing.name,
        category: editing.category,
        unit: editing.unit,
        openedShelfLifeDays: editing.openedShelfLifeDays,
        warningDays: editing.warningDays,
        safetyStock: editing.safetyStock,
        status: editing.status
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        category: 'mask_powder',
        unit: 'g',
        openedShelfLifeDays: 90,
        warningDays: 30,
        safetyStock: 500,
        status: 'active'
      });
    }
  }, [formOpen, editing, form]);

  const handleOk = async () => {
    const values = await form.validateFields();
    if (editing) {
      dispatch(updateConsumable({ ...editing, ...values }));
      message.success('耗材已更新');
    } else {
      const newConsumable: Consumable = {
        id: `M${Date.now()}`,
        ...values,
        createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss')
      };
      dispatch(addConsumable(newConsumable));
      message.success('耗材已添加');
    }
    setFormOpen(false);
  };

  const columns: ColumnsType<Consumable> = [
    {
      title: '耗材名称',
      dataIndex: 'name',
      render: (name: string, r) => (
        <Space>
          <span>{name}</span>
          {r.status === 'inactive' ? <Tag>停用</Tag> : null}
        </Space>
      )
    },
    { title: '分类', dataIndex: 'category', width: 90, render: (c: string) => categoryText(c) },
    { title: '单位', dataIndex: 'unit', width: 70 },
    {
      title: '开封后保质期',
      dataIndex: 'openedShelfLifeDays',
      width: 120,
      render: (v: number) => `${v} 天`
    },
    { title: '临期阈值', dataIndex: 'warningDays', width: 90, render: (v: number) => `${v} 天` },
    {
      title: '当前可用库存',
      width: 120,
      render: (_, r) => {
        const stock = getUsableStock(r.id, consumableBatches, consumablesMap);
        return (
          <span style={{ color: stock < r.safetyStock ? '#faad14' : undefined }}>
            {stock} {r.unit}
          </span>
        );
      }
    },
    {
      title: '操作',
      width: 80,
      render: (_, r) => (
        <Button
          type="link"
          size="small"
          icon={<EditOutlined />}
          onClick={() => {
            setEditing(r);
            setFormOpen(true);
          }}
        >
          编辑
        </Button>
      )
    }
  ];

  return (
    <Modal
      title="耗材目录"
      open={open}
      onCancel={onClose}
      footer={null}
      width={860}
      destroyOnClose
    >
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          添加耗材
        </Button>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={consumables}
        size="small"
        pagination={false}
      />

      <Modal
        title={editing ? '编辑耗材' : '添加耗材'}
        open={formOpen}
        onOk={handleOk}
        onCancel={() => setFormOpen(false)}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="耗材名称"
            rules={[{ required: true, message: '请输入耗材名称' }]}
          >
            <Input placeholder="如 玫瑰软膜粉" />
          </Form.Item>
          <Space style={{ display: 'flex' }}>
            <Form.Item
              name="category"
              label="分类"
              style={{ flex: 1 }}
              rules={[{ required: true }]}
            >
              <Select
                options={Object.entries(CONSUMABLE_CATEGORY_TEXT).map(([value, label]) => ({
                  value,
                  label
                }))}
              />
            </Form.Item>
            <Form.Item
              name="unit"
              label="计量单位"
              style={{ flex: 1 }}
              rules={[{ required: true, message: '请输入单位' }]}
            >
              <Input placeholder="g / ml / 瓶" />
            </Form.Item>
          </Space>
          <Space style={{ display: 'flex' }}>
            <Form.Item
              name="openedShelfLifeDays"
              label="开封后保质期（天）"
              style={{ flex: 1 }}
              rules={[{ required: true }]}
              extra="开封日 + 该天数 与效期取较早者"
            >
              <InputNumber style={{ width: '100%' }} min={1} />
            </Form.Item>
            <Form.Item
              name="warningDays"
              label="临期预警（天）"
              style={{ flex: 1 }}
              rules={[{ required: true }]}
            >
              <InputNumber style={{ width: '100%' }} min={1} />
            </Form.Item>
            <Form.Item
              name="safetyStock"
              label="安全库存"
              style={{ flex: 1 }}
              rules={[{ required: true }]}
            >
              <InputNumber style={{ width: '100%' }} min={0} precision={3} />
            </Form.Item>
          </Space>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'active', label: '启用' },
                { value: 'inactive', label: '停用' }
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Modal>
  );
};

export default ConsumableCatalogModal;
