import React, { useMemo, useState } from 'react';
import {
  Row,
  Col,
  Card,
  Table,
  Tag,
  Button,
  Space,
  Input,
  Select,
  Modal,
  Form,
  InputNumber,
  DatePicker,
  Tabs,
  Statistic,
  Progress,
  message
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  InboxOutlined,
  ExportOutlined,
  ClockCircleOutlined,
  AuditOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import dayjs from 'dayjs';
import type { RootState } from '../../store';
import {
  addConsumable,
  addConsumableBatch,
  openConsumableBatch,
  issueConsumable,
  addStockCheck
} from '../../store';
import type { Consumable, ConsumableBatch, ConsumableUsage, StockCheck } from '../../types';
import {
  getBatchStatus,
  getBatchStatusText,
  getBatchStatusColor,
  getDaysLeft,
  getEffectiveExpiryDate,
  sortBatchesForIssue,
  type BatchStatus
} from '../../utils/consumable';
import { formatDate, generateId } from '../../utils/format';

interface BatchRow {
  batch: ConsumableBatch;
  consumable: Consumable;
  status: BatchStatus;
  daysLeft: number;
  effectiveExpiry: string;
}

const ConsumableManage: React.FC = () => {
  const dispatch = useDispatch();
  const state = useSelector((s: RootState) => s.app);

  const [searchText, setSearchText] = useState('');
  const [consumableFilter, setConsumableFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<BatchStatus | undefined>();

  const [isReceiveOpen, setIsReceiveOpen] = useState(false);
  const [isConsumableOpen, setIsConsumableOpen] = useState(false);
  const [isIssueOpen, setIsIssueOpen] = useState(false);
  const [isOpenBatchOpen, setIsOpenBatchOpen] = useState(false);
  const [isCheckOpen, setIsCheckOpen] = useState(false);
  const [openingBatch, setOpeningBatch] = useState<BatchRow | null>(null);
  const [checkActuals, setCheckActuals] = useState<Record<string, number>>({});

  const [receiveForm] = Form.useForm();
  const [consumableForm] = Form.useForm();
  const [issueForm] = Form.useForm();
  const [openForm] = Form.useForm();

  const consumableMap = useMemo(
    () => Object.fromEntries(state.consumables.map(c => [c.id, c])),
    [state.consumables]
  );
  const customerMap = useMemo(
    () => Object.fromEntries(state.customers.map(c => [c.id, c])),
    [state.customers]
  );
  const serviceMap = useMemo(
    () => Object.fromEntries(state.services.map(s => [s.id, s])),
    [state.services]
  );
  const employeeMap = useMemo(
    () => Object.fromEntries(state.employees.map(e => [e.id, e])),
    [state.employees]
  );
  const batchMap = useMemo(
    () => Object.fromEntries(state.consumableBatches.map(b => [b.id, b])),
    [state.consumableBatches]
  );

  const rows: BatchRow[] = useMemo(
    () =>
      state.consumableBatches
        .filter(b => consumableMap[b.consumableId])
        .map(batch => {
          const consumable = consumableMap[batch.consumableId];
          return {
            batch,
            consumable,
            status: getBatchStatus(consumable, batch),
            daysLeft: getDaysLeft(consumable, batch),
            effectiveExpiry: getEffectiveExpiryDate(consumable, batch)
          };
        }),
    [state.consumableBatches, consumableMap]
  );

  const filteredRows = rows.filter(
    r =>
      (!searchText ||
        r.batch.batchNo.includes(searchText) ||
        r.consumable.name.includes(searchText)) &&
      (!consumableFilter || r.consumable.id === consumableFilter) &&
      (!statusFilter || r.status === statusFilter)
  );

  const expiringRows = rows.filter(r => r.status === 'expiring');
  const expiredRows = rows.filter(r => r.status === 'expired');
  const activeRows = rows.filter(r => r.batch.remaining > 0);

  // ---------- 入库 ----------
  const handleReceive = async () => {
    try {
      const values = await receiveForm.validateFields();
      const duplicated = state.consumableBatches.some(
        b => b.consumableId === values.consumableId && b.batchNo === values.batchNo.trim()
      );
      if (duplicated) {
        message.error('同一批号不许重复入库');
        return;
      }
      const batch: ConsumableBatch = {
        id: generateId(),
        consumableId: values.consumableId,
        batchNo: values.batchNo.trim(),
        quantity: values.quantity,
        remaining: values.quantity,
        expiryDate: values.expiryDate.format('YYYY-MM-DD'),
        openedDate: null,
        supplier: values.supplier || '',
        unitPrice: values.unitPrice || 0,
        receivedAt: dayjs().format('YYYY-MM-DD'),
        notes: values.notes || ''
      };
      dispatch(addConsumableBatch(batch));
      message.success('入库成功');
      setIsReceiveOpen(false);
    } catch {
      // validation error
    }
  };

  // ---------- 新增耗材 ----------
  const handleAddConsumable = async () => {
    try {
      const values = await consumableForm.validateFields();
      const consumable: Consumable = {
        id: generateId(),
        name: values.name,
        category: values.category,
        unit: values.unit,
        spec: values.spec || '',
        shelfLifeDaysAfterOpen: values.shelfLifeDaysAfterOpen,
        warnDays: values.warnDays
      };
      dispatch(addConsumable(consumable));
      message.success('添加耗材成功');
      setIsConsumableOpen(false);
    } catch {
      // validation error
    }
  };

  // ---------- 领用 ----------
  const issueConsumableId = Form.useWatch('consumableId', issueForm);
  const issueBatchId = Form.useWatch('batchId', issueForm);

  const issueCandidates = useMemo(() => {
    if (!issueConsumableId) return [];
    return sortBatchesForIssue(
      rows.filter(r => r.consumable.id === issueConsumableId && r.batch.remaining > 0)
    );
  }, [rows, issueConsumableId]);

  const selectedIssueRow = issueCandidates.find(r => r.batch.id === issueBatchId);

  const openIssueModal = (row?: BatchRow) => {
    issueForm.resetFields();
    if (row) {
      issueForm.setFieldsValue({
        consumableId: row.consumable.id,
        batchId: row.status === 'expired' || row.batch.remaining <= 0 ? undefined : row.batch.id
      });
    }
    setIsIssueOpen(true);
  };

  const handleIssue = async () => {
    try {
      const values = await issueForm.validateFields();
      const row = issueCandidates.find(r => r.batch.id === values.batchId);
      if (!row) {
        message.error('请选择领用批次');
        return;
      }
      if (row.status === 'expired') {
        message.error('该批次已过期，禁止领用');
        return;
      }
      if (values.quantity > row.batch.remaining) {
        message.error('领用数量超过剩余量');
        return;
      }
      const sr = values.serviceRecordId
        ? state.serviceRecords.find(s => s.id === values.serviceRecordId)
        : null;
      const usage: ConsumableUsage = {
        id: generateId(),
        batchId: row.batch.id,
        consumableId: row.consumable.id,
        quantity: values.quantity,
        serviceRecordId: sr ? sr.id : null,
        customerId: sr ? sr.customerId : null,
        serviceId: sr ? sr.serviceId : null,
        employeeId: values.employeeId,
        usedAt: dayjs().toISOString(),
        notes: values.notes || ''
      };
      dispatch(issueConsumable(usage));
      if (!row.batch.openedDate) {
        message.success(`领用成功，批次 ${row.batch.batchNo} 已自动登记开封日期`);
      } else {
        message.success('领用成功');
      }
      setIsIssueOpen(false);
    } catch {
      // validation error
    }
  };

  // ---------- 开封 ----------
  const handleOpenBatch = async () => {
    try {
      const values = await openForm.validateFields();
      if (!openingBatch) return;
      dispatch(
        openConsumableBatch({
          id: openingBatch.batch.id,
          openedDate: values.openedDate.format('YYYY-MM-DD')
        })
      );
      message.success('已登记开封日期');
      setIsOpenBatchOpen(false);
    } catch {
      // validation error
    }
  };

  // ---------- 盘点 ----------
  const openCheckModal = () => {
    const actuals: Record<string, number> = {};
    activeRows.forEach(r => {
      actuals[r.batch.id] = r.batch.remaining;
    });
    setCheckActuals(actuals);
    setIsCheckOpen(true);
  };

  const handleCheck = () => {
    let diffCount = 0;
    activeRows.forEach(r => {
      const actual = checkActuals[r.batch.id];
      if (actual === undefined || actual === r.batch.remaining) return;
      diffCount += 1;
      const check: StockCheck = {
        id: generateId(),
        batchId: r.batch.id,
        consumableId: r.consumable.id,
        bookQuantity: r.batch.remaining,
        actualQuantity: actual,
        difference: actual - r.batch.remaining,
        checkedAt: dayjs().toISOString(),
        notes: ''
      };
      dispatch(addStockCheck(check));
    });
    if (diffCount > 0) {
      message.warning(`盘点完成，共 ${diffCount} 个批次账实不符，已按实盘数调整`);
    } else {
      message.success('盘点完成，账实相符');
    }
    setIsCheckOpen(false);
  };

  // ---------- 表格列 ----------
  const batchColumns = [
    {
      title: '耗材',
      key: 'consumable',
      render: (_: unknown, r: BatchRow) => (
        <div>
          <div style={{ fontWeight: 500 }}>{r.consumable.name}</div>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>
            {r.consumable.category} · {r.consumable.spec}
          </div>
        </div>
      )
    },
    { title: '批号', dataIndex: ['batch', 'batchNo'], key: 'batchNo' },
    {
      title: '状态',
      key: 'status',
      render: (_: unknown, r: BatchRow) => (
        <Tag color={getBatchStatusColor(r.status)}>{getBatchStatusText(r.status)}</Tag>
      )
    },
    {
      title: '剩余量',
      key: 'remaining',
      render: (_: unknown, r: BatchRow) => (
        <div style={{ minWidth: 120 }}>
          <Progress
            percent={r.batch.quantity ? Math.round((r.batch.remaining / r.batch.quantity) * 100) : 0}
            size="small"
            strokeColor="#C9A86C"
          />
          <span style={{ fontSize: 12 }}>
            {r.batch.remaining} / {r.batch.quantity} {r.consumable.unit}
          </span>
        </div>
      )
    },
    {
      title: '有效期至',
      key: 'expiry',
      render: (_: unknown, r: BatchRow) => (
        <div>
          <div>{r.effectiveExpiry}</div>
          {r.batch.openedDate && r.effectiveExpiry !== r.batch.expiryDate && (
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>按开封保质期折算</div>
          )}
        </div>
      )
    },
    {
      title: '开封日期',
      key: 'openedDate',
      render: (_: unknown, r: BatchRow) => r.batch.openedDate || <span style={{ color: '#bfbfbf' }}>未开封</span>
    },
    {
      title: '剩余天数',
      key: 'daysLeft',
      render: (_: unknown, r: BatchRow) => {
        if (r.status === 'depleted') return <span style={{ color: '#bfbfbf' }}>-</span>;
        if (r.daysLeft < 0) return <span style={{ color: '#ff4d4f' }}>已超期 {-r.daysLeft} 天</span>;
        return (
          <span style={{ color: r.daysLeft <= r.consumable.warnDays ? '#fa8c16' : undefined }}>
            剩 {r.daysLeft} 天
          </span>
        );
      }
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, r: BatchRow) => (
        <Space>
          <Button
            size="small"
            type="link"
            disabled={r.status === 'expired' || r.batch.remaining <= 0}
            onClick={() => openIssueModal(r)}
          >
            领用
          </Button>
          {!r.batch.openedDate && r.batch.remaining > 0 && (
            <Button
              size="small"
              type="link"
              onClick={() => {
                setOpeningBatch(r);
                openForm.setFieldsValue({ openedDate: dayjs() });
                setIsOpenBatchOpen(true);
              }}
            >
              开封
            </Button>
          )}
        </Space>
      )
    }
  ];

  const usageColumns = [
    {
      title: '领用时间',
      dataIndex: 'usedAt',
      key: 'usedAt',
      render: (v: string) => formatDate(v, 'YYYY-MM-DD HH:mm')
    },
    {
      title: '耗材',
      key: 'consumable',
      render: (_: unknown, u: ConsumableUsage) => consumableMap[u.consumableId]?.name || '-'
    },
    {
      title: '批号',
      key: 'batchNo',
      render: (_: unknown, u: ConsumableUsage) => batchMap[u.batchId]?.batchNo || '-'
    },
    {
      title: '用量',
      key: 'quantity',
      render: (_: unknown, u: ConsumableUsage) =>
        `${u.quantity} ${consumableMap[u.consumableId]?.unit || ''}`
    },
    {
      title: '关联护理',
      key: 'service',
      render: (_: unknown, u: ConsumableUsage) => {
        if (!u.serviceRecordId) return <span style={{ color: '#bfbfbf' }}>未关联</span>;
        const sr = state.serviceRecords.find(s => s.id === u.serviceRecordId);
        return (
          <div>
            <div>
              {customerMap[u.customerId || '']?.name || '-'} · {serviceMap[u.serviceId || '']?.name || '-'}
            </div>
            {sr && (
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>{formatDate(sr.serviceDate)}</div>
            )}
          </div>
        );
      }
    },
    {
      title: '领用人',
      key: 'employee',
      render: (_: unknown, u: ConsumableUsage) => employeeMap[u.employeeId]?.name || '-'
    },
    { title: '备注', dataIndex: 'notes', key: 'notes', render: (v: string) => v || '-' }
  ];

  const alertColumns = [
    {
      title: '耗材',
      key: 'consumable',
      render: (_: unknown, r: BatchRow) => r.consumable.name
    },
    { title: '批号', dataIndex: ['batch', 'batchNo'], key: 'batchNo' },
    {
      title: '剩余量',
      key: 'remaining',
      render: (_: unknown, r: BatchRow) => `${r.batch.remaining} ${r.consumable.unit}`
    },
    {
      title: '开封日期',
      key: 'openedDate',
      render: (_: unknown, r: BatchRow) => r.batch.openedDate || '未开封'
    },
    { title: '有效期至', key: 'expiry', render: (_: unknown, r: BatchRow) => r.effectiveExpiry },
    {
      title: '剩余天数',
      key: 'daysLeft',
      render: (_: unknown, r: BatchRow) =>
        r.daysLeft < 0 ? (
          <span style={{ color: '#ff4d4f' }}>已超期 {-r.daysLeft} 天</span>
        ) : (
          <span style={{ color: '#fa8c16' }}>剩 {r.daysLeft} 天</span>
        )
    }
  ];

  const checkColumns = [
    {
      title: '盘点时间',
      dataIndex: 'checkedAt',
      key: 'checkedAt',
      render: (v: string) => formatDate(v, 'YYYY-MM-DD HH:mm')
    },
    {
      title: '耗材',
      key: 'consumable',
      render: (_: unknown, c: StockCheck) => consumableMap[c.consumableId]?.name || '-'
    },
    {
      title: '批号',
      key: 'batchNo',
      render: (_: unknown, c: StockCheck) => batchMap[c.batchId]?.batchNo || '-'
    },
    {
      title: '账面数量',
      key: 'book',
      render: (_: unknown, c: StockCheck) =>
        `${c.bookQuantity} ${consumableMap[c.consumableId]?.unit || ''}`
    },
    {
      title: '实盘数量',
      key: 'actual',
      render: (_: unknown, c: StockCheck) =>
        `${c.actualQuantity} ${consumableMap[c.consumableId]?.unit || ''}`
    },
    {
      title: '差异',
      key: 'difference',
      render: (_: unknown, c: StockCheck) => (
        <span style={{ color: c.difference < 0 ? '#ff4d4f' : '#52c41a', fontWeight: 600 }}>
          {c.difference > 0 ? `+${c.difference}` : c.difference}（{c.difference < 0 ? '盘亏' : '盘盈'}）
        </span>
      )
    }
  ];

  const recentServiceRecords = useMemo(
    () =>
      [...state.serviceRecords]
        .sort((a, b) => +new Date(b.serviceDate) - +new Date(a.serviceDate))
        .slice(0, 50),
    [state.serviceRecords]
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-header-title">耗材管理</h1>
          <p className="page-header-subtitle">
            共 {state.consumables.length} 种耗材 · {rows.length} 个批次
          </p>
        </div>
        <Space>
          <Button icon={<PlusOutlined />} onClick={() => { consumableForm.resetFields(); setIsConsumableOpen(true); }}>
            新增耗材
          </Button>
          <Button icon={<ExportOutlined />} onClick={() => openIssueModal()}>
            耗材领用
          </Button>
          <Button
            type="primary"
            icon={<InboxOutlined />}
            onClick={() => { receiveForm.resetFields(); setIsReceiveOpen(true); }}
          >
            耗材入库
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}>
          <Card className="stat-card" bordered={false}>
            <Statistic title="耗材种类" value={state.consumables.length} suffix="种" />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card className="stat-card" bordered={false}>
            <Statistic title="在库批次" value={activeRows.length} suffix="批" />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card className="stat-card" bordered={false}>
            <Statistic
              title="临期批次"
              value={expiringRows.length}
              suffix="批"
              valueStyle={{ color: '#fa8c16' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card className="stat-card" bordered={false}>
            <Statistic
              title="已过期批次"
              value={expiredRows.length}
              suffix="批"
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card className="card-wrapper" bordered={false} style={{ marginTop: 16 }}>
        <Tabs
          defaultActiveKey="batches"
          items={[
            {
              key: 'batches',
              label: '批次库存',
              children: (
                <>
                  <Space style={{ marginBottom: 16 }} wrap>
                    <Input
                      placeholder="搜索批号 / 耗材名称"
                      prefix={<SearchOutlined />}
                      value={searchText}
                      onChange={e => setSearchText(e.target.value)}
                      style={{ width: 220 }}
                      allowClear
                    />
                    <Select
                      placeholder="耗材"
                      style={{ width: 180 }}
                      allowClear
                      value={consumableFilter}
                      onChange={setConsumableFilter}
                      options={state.consumables.map(c => ({ value: c.id, label: c.name }))}
                    />
                    <Select
                      placeholder="状态"
                      style={{ width: 140 }}
                      allowClear
                      value={statusFilter}
                      onChange={setStatusFilter}
                      options={(['sealed', 'opened', 'expiring', 'expired', 'depleted'] as BatchStatus[]).map(s => ({
                        value: s,
                        label: getBatchStatusText(s)
                      }))}
                    />
                  </Space>
                  <Table
                    columns={batchColumns}
                    dataSource={filteredRows}
                    rowKey={r => r.batch.id}
                    pagination={{ pageSize: 10 }}
                  />
                </>
              )
            },
            {
              key: 'usages',
              label: `领用台账 (${state.consumableUsages.length})`,
              children: (
                <Table
                  columns={usageColumns}
                  dataSource={state.consumableUsages}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                />
              )
            },
            {
              key: 'alerts',
              label: (
                <span>
                  效期预警
                  {expiringRows.length + expiredRows.length > 0 && (
                    <Tag color="red" style={{ marginLeft: 8 }}>
                      {expiringRows.length + expiredRows.length}
                    </Tag>
                  )}
                </span>
              ),
              children: (
                <>
                  <Card
                    type="inner"
                    title={<span style={{ color: '#fa8c16' }}>临期批次（{expiringRows.length}）</span>}
                    style={{ marginBottom: 16 }}
                  >
                    <Table
                      columns={alertColumns}
                      dataSource={expiringRows}
                      rowKey={r => r.batch.id}
                      pagination={false}
                      locale={{ emptyText: '暂无临期批次' }}
                    />
                  </Card>
                  <Card
                    type="inner"
                    title={<span style={{ color: '#ff4d4f' }}>已过期批次（{expiredRows.length}）</span>}
                  >
                    <Table
                      columns={alertColumns}
                      dataSource={expiredRows}
                      rowKey={r => r.batch.id}
                      pagination={false}
                      locale={{ emptyText: '暂无过期批次' }}
                    />
                  </Card>
                </>
              )
            },
            {
              key: 'checks',
              label: '月末盘点',
              children: (
                <>
                  <Space style={{ marginBottom: 16 }}>
                    <Button type="primary" icon={<AuditOutlined />} onClick={openCheckModal}>
                      发起盘点
                    </Button>
                    <span style={{ color: '#8c8c8c', fontSize: 12 }}>
                      逐批录入实盘数量，系统自动比对账面差异并按实盘调整库存
                    </span>
                  </Space>
                  <Table
                    columns={checkColumns}
                    dataSource={state.stockChecks}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                    locale={{ emptyText: '暂无盘点记录' }}
                  />
                </>
              )
            }
          ]}
        />
      </Card>

      {/* 耗材入库 */}
      <Modal
        title="耗材入库"
        open={isReceiveOpen}
        onOk={handleReceive}
        onCancel={() => setIsReceiveOpen(false)}
        okText="确认入库"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={receiveForm} layout="vertical">
          <Form.Item
            name="consumableId"
            label="耗材"
            rules={[{ required: true, message: '请选择耗材' }]}
          >
            <Select
              placeholder="选择耗材"
              showSearch
              optionFilterProp="label"
              options={state.consumables.map(c => ({
                value: c.id,
                label: `${c.name}（${c.spec}）`
              }))}
            />
          </Form.Item>
          <Form.Item
            name="batchNo"
            label="批号"
            rules={[{ required: true, message: '请输入批号' }]}
            extra="同一耗材下批号不许重复入库"
          >
            <Input placeholder="如 MP20260918A" />
          </Form.Item>
          <Form.Item
            name="quantity"
            label="入库数量"
            rules={[{ required: true, message: '请输入入库数量' }]}
          >
            <InputNumber min={1} precision={0} style={{ width: '100%' }} placeholder="按耗材单位计" />
          </Form.Item>
          <Form.Item
            name="expiryDate"
            label="有效期至"
            rules={[{ required: true, message: '请选择有效期' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="supplier" label="供应商">
            <Input placeholder="选填" />
          </Form.Item>
          <Form.Item name="unitPrice" label="单价（元）">
            <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="选填" />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={2} placeholder="选填" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 新增耗材 */}
      <Modal
        title="新增耗材"
        open={isConsumableOpen}
        onOk={handleAddConsumable}
        onCancel={() => setIsConsumableOpen(false)}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form
          form={consumableForm}
          layout="vertical"
          initialValues={{ category: '面膜粉', unit: 'g', shelfLifeDaysAfterOpen: 90, warnDays: 30 }}
        >
          <Form.Item name="name" label="耗材名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="如 玫瑰软膜粉" />
          </Form.Item>
          <Form.Item name="category" label="分类" rules={[{ required: true }]}>
            <Select
              options={['面膜粉', '精油', '脱毛蜡', '精华液', '纯露', '其他'].map(c => ({ value: c, label: c }))}
            />
          </Form.Item>
          <Form.Item name="unit" label="计量单位" rules={[{ required: true }]}>
            <Select options={['g', 'ml', '片', '支', '瓶'].map(u => ({ value: u, label: u }))} />
          </Form.Item>
          <Form.Item name="spec" label="规格">
            <Input placeholder="如 500g/罐" />
          </Form.Item>
          <Form.Item
            name="shelfLifeDaysAfterOpen"
            label="开封后保质期（天）"
            rules={[{ required: true, message: '请输入开封后保质期' }]}
            extra="开封后按此天数折算剩余有效期"
          >
            <InputNumber min={1} precision={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="warnDays"
            label="临期预警（天）"
            rules={[{ required: true, message: '请输入预警天数' }]}
            extra="剩余天数不超过该值时列入临期预警"
          >
            <InputNumber min={1} precision={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 耗材领用 */}
      <Modal
        title="耗材领用"
        open={isIssueOpen}
        onOk={handleIssue}
        onCancel={() => setIsIssueOpen(false)}
        okText="确认领用"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={issueForm} layout="vertical">
          <Form.Item
            name="consumableId"
            label="耗材"
            rules={[{ required: true, message: '请选择耗材' }]}
          >
            <Select
              placeholder="选择耗材"
              showSearch
              optionFilterProp="label"
              onChange={() => issueForm.setFieldsValue({ batchId: undefined, quantity: undefined })}
              options={state.consumables.map(c => ({ value: c.id, label: c.name }))}
            />
          </Form.Item>
          <Form.Item
            name="batchId"
            label="领用批次"
            rules={[{ required: true, message: '请选择批次' }]}
            extra="未开封批次优先，已过期批次不可领用"
          >
            <Select
              placeholder={issueConsumableId ? '选择批次（未开封优先）' : '请先选择耗材'}
              options={issueCandidates.map(r => ({
                value: r.batch.id,
                disabled: r.status === 'expired',
                label: `${r.batch.batchNo}｜${r.batch.openedDate ? '已开封' : '未开封'}｜剩余 ${r.batch.remaining}${r.consumable.unit}｜${
                  r.daysLeft < 0 ? '已过期' : `剩${r.daysLeft}天`
                }`
              }))}
            />
          </Form.Item>
          {selectedIssueRow && !selectedIssueRow.batch.openedDate && (
            <div style={{ marginBottom: 16, color: '#fa8c16', fontSize: 12 }}>
              该批次尚未开封，首次领用将自动登记今日为开封日期
            </div>
          )}
          <Form.Item
            name="quantity"
            label={`领用数量${selectedIssueRow ? `（${selectedIssueRow.consumable.unit}，剩余 ${selectedIssueRow.batch.remaining}）` : ''}`}
            rules={[{ required: true, message: '请输入领用数量' }]}
          >
            <InputNumber
              min={1}
              max={selectedIssueRow?.batch.remaining}
              precision={0}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item name="serviceRecordId" label="关联护理记录">
            <Select
              placeholder="选填，选择本次耗材用于哪次护理"
              allowClear
              showSearch
              optionFilterProp="label"
              options={recentServiceRecords.map(sr => ({
                value: sr.id,
                label: `${formatDate(sr.serviceDate)} ${customerMap[sr.customerId]?.name || ''} · ${serviceMap[sr.serviceId]?.name || ''}`
              }))}
              onChange={(v: string | undefined) => {
                const sr = v ? state.serviceRecords.find(s => s.id === v) : null;
                if (sr) issueForm.setFieldsValue({ employeeId: sr.employeeId });
              }}
            />
          </Form.Item>
          <Form.Item
            name="employeeId"
            label="领用人"
            rules={[{ required: true, message: '请选择领用人' }]}
          >
            <Select
              placeholder="选择领用人"
              showSearch
              optionFilterProp="label"
              options={state.employees
                .filter(e => e.status === 'active')
                .map(e => ({ value: e.id, label: e.name }))}
            />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={2} placeholder="选填" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 登记开封 */}
      <Modal
        title="登记开封"
        open={isOpenBatchOpen}
        onOk={handleOpenBatch}
        onCancel={() => setIsOpenBatchOpen(false)}
        okText="确认"
        cancelText="取消"
        destroyOnClose
      >
        {openingBatch && (
          <div style={{ marginBottom: 16 }}>
            {openingBatch.consumable.name} · 批号 {openingBatch.batch.batchNo}
            <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
              开封后保质期 {openingBatch.consumable.shelfLifeDaysAfterOpen} 天，将与未开封有效期取较早者计算剩余天数
            </div>
          </div>
        )}
        <Form form={openForm} layout="vertical">
          <Form.Item
            name="openedDate"
            label="开封日期"
            rules={[{ required: true, message: '请选择开封日期' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 月末盘点 */}
      <Modal
        title="月末盘点"
        open={isCheckOpen}
        onOk={handleCheck}
        onCancel={() => setIsCheckOpen(false)}
        okText="提交盘点"
        cancelText="取消"
        width={720}
        destroyOnClose
      >
        <Table
          size="small"
          pagination={false}
          rowKey={r => r.batch.id}
          dataSource={activeRows}
          scroll={{ y: 400 }}
          columns={[
            {
              title: '耗材',
              key: 'consumable',
              render: (_: unknown, r: BatchRow) => r.consumable.name
            },
            { title: '批号', key: 'batchNo', render: (_: unknown, r: BatchRow) => r.batch.batchNo },
            {
              title: '账面数量',
              key: 'book',
              render: (_: unknown, r: BatchRow) => `${r.batch.remaining} ${r.consumable.unit}`
            },
            {
              title: '实盘数量',
              key: 'actual',
              render: (_: unknown, r: BatchRow) => (
                <InputNumber
                  min={0}
                  precision={0}
                  value={checkActuals[r.batch.id]}
                  onChange={v =>
                    setCheckActuals(prev => ({ ...prev, [r.batch.id]: v ?? 0 }))
                  }
                />
              )
            },
            {
              title: '差异',
              key: 'diff',
              render: (_: unknown, r: BatchRow) => {
                const actual = checkActuals[r.batch.id];
                if (actual === undefined) return '-';
                const diff = actual - r.batch.remaining;
                if (diff === 0) return <span style={{ color: '#bfbfbf' }}>相符</span>;
                return (
                  <span style={{ color: diff < 0 ? '#ff4d4f' : '#52c41a', fontWeight: 600 }}>
                    {diff > 0 ? `+${diff}` : diff}
                  </span>
                );
              }
            }
          ]}
        />
      </Modal>
    </div>
  );
};

export default ConsumableManage;
