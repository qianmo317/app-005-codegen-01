import React, { useMemo } from 'react';
import { Card, Empty, Row, Col, Tag, Button, Space, Typography, Alert } from 'antd';
import {
  WarningOutlined,
  StopOutlined,
  ExportOutlined,
  UnlockOutlined,
  LockOutlined
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import {
  BATCH_STATUS_COLOR,
  BATCH_STATUS_TEXT,
  getBatchStatus,
  getEffectiveExpiryDate,
  getRemainingDays
} from '../../../utils/consumables';

const { Text } = Typography;

interface WarningsTabProps {
  onUsage: (consumableId: string, batchId: string) => void;
}

const WarningsTab: React.FC<WarningsTabProps> = ({ onUsage }) => {
  const { consumables, consumableBatches } = useSelector((s: RootState) => s.app);
  const consumablesMap = useMemo(
    () => new Map(consumables.map((c) => [c.id, c])),
    [consumables]
  );

  const near = useMemo(
    () =>
      consumableBatches
        .map((b) => ({
          batch: b,
          consumable: consumablesMap.get(b.consumableId),
          status: getBatchStatus(b, consumablesMap.get(b.consumableId)),
          days: getRemainingDays(b, consumablesMap.get(b.consumableId)),
          effectiveExpiry: getEffectiveExpiryDate(b, consumablesMap.get(b.consumableId))
        }))
        .filter((r) => r.status === 'near_expiry')
        .sort((a, b) => a.days - b.days),
    [consumableBatches, consumablesMap]
  );

  const expired = useMemo(
    () =>
      consumableBatches
        .map((b) => ({
          batch: b,
          consumable: consumablesMap.get(b.consumableId),
          status: getBatchStatus(b, consumablesMap.get(b.consumableId)),
          days: getRemainingDays(b, consumablesMap.get(b.consumableId)),
          effectiveExpiry: getEffectiveExpiryDate(b, consumablesMap.get(b.consumableId))
        }))
        .filter((r) => r.status === 'expired')
        .sort((a, b) => a.effectiveExpiry.localeCompare(b.effectiveExpiry)),
    [consumableBatches, consumablesMap]
  );

  const renderCard = (
    r: (typeof near)[number],
    kind: 'near' | 'expired'
  ) => (
    <Col xs={24} sm={12} lg={8} key={r.batch.id}>
      <Card
        size="small"
        className={kind === 'expired' ? 'cons-card-expired' : 'cons-card-near'}
        title={
          <Space>
            <Text strong>{r.consumable?.name}</Text>
            <Tag color={BATCH_STATUS_COLOR[r.status]}>{BATCH_STATUS_TEXT[r.status]}</Tag>
          </Space>
        }
        extra={
          r.batch.openedDate ? <UnlockOutlined /> : <LockOutlined style={{ color: '#1677ff' }} />
        }
      >
        <div style={{ marginBottom: 6 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            批号
          </Text>
          <div>{r.batch.batchNo}</div>
        </div>
        <Row gutter={8} style={{ marginBottom: 8 }}>
          <Col span={12}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              实际失效日
            </Text>
            <div>{r.effectiveExpiry}</div>
          </Col>
          <Col span={12}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              剩余
            </Text>
            <div>
              {kind === 'expired' ? (
                <Text type="danger" strong>
                  已超期 {-r.days} 天
                </Text>
              ) : r.days === 0 ? (
                <Text type="warning" strong>
                  今日到期
                </Text>
              ) : (
                <Text type="warning" strong>
                  还剩 {r.days} 天
                </Text>
              )}
            </div>
          </Col>
        </Row>
        <div style={{ marginBottom: 10 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            当前余量
          </Text>
          <div>
            <Text strong>{r.batch.remainingQuantity}</Text> {r.consumable?.unit}
            {r.batch.openedDate ? (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {' '}
                （{r.batch.openedDate} 开封）
              </Text>
            ) : (
              <Tag color="blue" style={{ marginLeft: 6 }}>
                未开封优先
              </Tag>
            )}
          </div>
        </div>
        {kind === 'near' ? (
          <Button
            block
            type="primary"
            ghost
            icon={<ExportOutlined />}
            onClick={() => onUsage(r.batch.consumableId, r.batch.id)}
          >
            优先领用
          </Button>
        ) : (
          <Button block danger disabled icon={<StopOutlined />}>
            已过期 · 禁止领用
          </Button>
        )}
      </Card>
    </Col>
  );

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card
        title={
          <Space>
            <WarningOutlined style={{ color: '#faad14' }} />
            <span>临期批号（未过期，建议尽快领用）</span>
            <Tag color="orange">{near.length}</Tag>
          </Space>
        }
      >
        {near.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无临期批号"
          />
        ) : (
          <Row gutter={[12, 12]}>{near.map((r) => renderCard(r, 'near'))}</Row>
        )}
      </Card>

      <Card
        title={
          <Space>
            <StopOutlined style={{ color: '#ff4d4f' }} />
            <span>已过期批号（禁止再被领用）</span>
            <Tag color="red">{expired.length}</Tag>
          </Space>
        }
      >
        {expired.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无过期批号" />
        ) : (
          <>
            <Alert
              type="error"
              showIcon
              style={{ marginBottom: 12 }}
              message="以下批号已超过实际失效日（效期或开封后保质期），系统已冻结其领用入口，任何领用提交都会被拒绝。"
            />
            <Row gutter={[12, 12]}>{expired.map((r) => renderCard(r, 'expired'))}</Row>
          </>
        )}
      </Card>
    </Space>
  );
};

export default WarningsTab;
