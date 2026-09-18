import dayjs from 'dayjs';
import type { Consumable, ConsumableBatch } from '../types';

export type BatchStatus = 'sealed' | 'opened' | 'expiring' | 'expired' | 'depleted';

// 有效效期 = min(未开封有效期, 开封日期 + 开封后保质期)
export const getEffectiveExpiryDate = (consumable: Consumable, batch: ConsumableBatch): string => {
  const expiry = dayjs(batch.expiryDate);
  if (batch.openedDate && consumable.shelfLifeDaysAfterOpen > 0) {
    const openExpiry = dayjs(batch.openedDate).add(consumable.shelfLifeDaysAfterOpen, 'day');
    return (openExpiry.isBefore(expiry) ? openExpiry : expiry).format('YYYY-MM-DD');
  }
  return expiry.format('YYYY-MM-DD');
};

export const getDaysLeft = (consumable: Consumable, batch: ConsumableBatch): number => {
  return dayjs(getEffectiveExpiryDate(consumable, batch))
    .startOf('day')
    .diff(dayjs().startOf('day'), 'day');
};

export const getBatchStatus = (consumable: Consumable, batch: ConsumableBatch): BatchStatus => {
  if (batch.remaining <= 0) return 'depleted';
  const daysLeft = getDaysLeft(consumable, batch);
  if (daysLeft < 0) return 'expired';
  if (daysLeft <= consumable.warnDays) return 'expiring';
  return batch.openedDate ? 'opened' : 'sealed';
};

export const getBatchStatusText = (status: BatchStatus): string => {
  const texts: Record<BatchStatus, string> = {
    sealed: '未开封',
    opened: '已开封',
    expiring: '临期',
    expired: '已过期',
    depleted: '已用完'
  };
  return texts[status];
};

export const getBatchStatusColor = (status: BatchStatus): string => {
  const colors: Record<BatchStatus, string> = {
    sealed: 'blue',
    opened: 'green',
    expiring: 'orange',
    expired: 'red',
    depleted: 'default'
  };
  return colors[status];
};

// 领用优先级：未开封批次优先，同组内按有效效期近的先出
export const sortBatchesForIssue = <T extends { batch: ConsumableBatch; daysLeft: number }>(
  rows: T[]
): T[] => {
  return [...rows].sort((a, b) => {
    const aSealed = a.batch.openedDate ? 1 : 0;
    const bSealed = b.batch.openedDate ? 1 : 0;
    if (aSealed !== bSealed) return aSealed - bSealed;
    return a.daysLeft - b.daysLeft;
  });
};
