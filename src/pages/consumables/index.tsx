import React, { useState } from 'react';
import { Tabs, Button, Space } from 'antd';
import {
  DatabaseOutlined,
  WarningOutlined,
  ProfileOutlined,
  AuditOutlined,
  AppstoreOutlined
} from '@ant-design/icons';
import BatchesTab from './components/BatchesTab';
import WarningsTab from './components/WarningsTab';
import UsagesTab from './components/UsagesTab';
import StockCheckTab from './components/StockCheckTab';
import UsageModal from './components/UsageModal';
import ConsumableCatalogModal from './components/ConsumableCatalogModal';

const ConsumablesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('batches');
  const [usageOpen, setUsageOpen] = useState(false);
  const [usagePreset, setUsagePreset] = useState<{
    consumableId?: string;
    batchId?: string;
  }>({});
  const [catalogOpen, setCatalogOpen] = useState(false);

  const openUsage = (consumableId?: string, batchId?: string) => {
    setUsagePreset({ consumableId, batchId });
    setUsageOpen(true);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-header-title">耗材消耗账</h1>
          <p className="page-header-subtitle">
            面膜粉、精油、脱毛蜡等耗材按批号管理 · 未开封优先 · 过期冻结领用
          </p>
        </div>
        <Space>
          <Button icon={<AppstoreOutlined />} onClick={() => setCatalogOpen(true)}>
            耗材目录
          </Button>
        </Space>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'batches',
            label: (
              <span>
                <DatabaseOutlined /> 批次台账
              </span>
            ),
            children: <BatchesTab />
          },
          {
            key: 'warnings',
            label: (
              <span>
                <WarningOutlined /> 临期 / 超期
              </span>
            ),
            children: <WarningsTab onUsage={(c, b) => openUsage(c, b)} />
          },
          {
            key: 'usages',
            label: (
              <span>
                <ProfileOutlined /> 领用流水
              </span>
            ),
            children: <UsagesTab onUsage={(c, b) => openUsage(c, b)} />
          },
          {
            key: 'stockcheck',
            label: (
              <span>
                <AuditOutlined /> 月底点货
              </span>
            ),
            children: <StockCheckTab />
          }
        ]}
      />

      <UsageModal
        open={usageOpen}
        onClose={() => setUsageOpen(false)}
        defaultConsumableId={usagePreset.consumableId}
        defaultBatchId={usagePreset.batchId}
      />
      <ConsumableCatalogModal open={catalogOpen} onClose={() => setCatalogOpen(false)} />
    </div>
  );
};

export default ConsumablesPage;
