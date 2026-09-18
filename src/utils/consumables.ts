import dayjs from 'dayjs';
import type {
  BatchLifeStatus,
  Consumable,
  ConsumableBatch,
  ConsumableUsage,
  StockCheckItem
} from '../types';

export const CONSUMABLE_CATEGORY_TEXT: Record<string, string> = {
  mask_powder: '面膜粉',
  essential_oil: '精油',
  wax: '脱毛蜡',
  other: '其他耗材'
};

/** 临期默认预警天数（耗材未单独配置时使用） */
export const DEFAULT_WARNING_DAYS = 30;

export const categoryText = (category: string): string =>
  CONSUMABLE_CATEGORY_TEXT[category] || category;

/**
 * 批次的实际失效日：
 * - 未开封：只看效期 expiryDate
 * - 已开封：取「效期」与「开封日 + 开封后保质期」中较早的一天
 * 语义为"最后可使用日"，与今天同日仍可用。
 */
export const getEffectiveExpiryDate = (
  batch: ConsumableBatch,
  consumable: Consumable | undefined
): string => {
  let effective = dayjs(batch.expiryDate);
  if (batch.openedDate && consumable) {
    const openedDeadline = dayjs(batch.openedDate).add(
      consumable.openedShelfLifeDays,
      'day'
    );
    if (openedDeadline.isBefore(effective)) {
      effective = openedDeadline;
    }
  }
  return effective.format('YYYY-MM-DD');
};

/** 距实际失效日还剩几天：0 = 今天到期（最后一天），负数 = 已过期 */
export const getRemainingDays = (
  batch: ConsumableBatch,
  consumable: Consumable | undefined,
  today: dayjs.Dayjs = dayjs()
): number => {
  const expiry = dayjs(getEffectiveExpiryDate(batch, consumable));
  return expiry.startOf('day').diff(today.startOf('day'), 'day');
};

/**
 * 批次账面状态
 * - used_up 余量为 0（用完，不再预警）
 * - expired 已过实际失效日（禁止领用）
 * - near_expiry 临期阈值内
 * - normal 正常
 */
export const getBatchStatus = (
  batch: ConsumableBatch,
  consumable: Consumable | undefined,
  today: dayjs.Dayjs = dayjs()
): BatchLifeStatus => {
  if (batch.remainingQuantity <= 0) return 'used_up';
  const remainingDays = getRemainingDays(batch, consumable, today);
  if (remainingDays < 0) return 'expired';
  const warningDays = consumable?.warningDays ?? DEFAULT_WARNING_DAYS;
  if (remainingDays <= warningDays) return 'near_expiry';
  return 'normal';
};

export const BATCH_STATUS_TEXT: Record<BatchLifeStatus, string> = {
  normal: '正常',
  near_expiry: '临期',
  expired: '已过期',
  used_up: '已用完'
};

export const BATCH_STATUS_COLOR: Record<BatchLifeStatus, string> = {
  normal: 'green',
  near_expiry: 'orange',
  expired: 'red',
  used_up: 'default'
};

/** 该批次当前是否允许领用：有余量、未过期 */
export const isBatchUsable = (
  batch: ConsumableBatch,
  consumable: Consumable | undefined,
  today: dayjs.Dayjs = dayjs()
): boolean => getBatchStatus(batch, consumable, today) !== 'expired'
  && batch.remainingQuantity > 0;

/** 不可领用原因 */
export const getBatchBlockReason = (
  batch: ConsumableBatch,
  consumable: Consumable | undefined,
  today: dayjs.Dayjs = dayjs()
): string | null => {
  const status = getBatchStatus(batch, consumable, today);
  if (status === 'expired') {
    return `该批次已于 ${getEffectiveExpiryDate(batch, consumable)} 过期，禁止领用`;
  }
  if (status === 'used_up') return '该批次余量为 0，已用完';
  return null;
};

/**
 * 推荐领用顺序（FEFO + 未开封优先）：
 * 1. 可领用（未过期、有余量）的批次才参与排序；
 * 2. 未开封批号排在已开封批号之前；
 * 3. 同为开封/未开封时，实际失效日早的优先（先到期先用）。
 */
export const sortBatchesByPriority = (
  batches: ConsumableBatch[],
  consumablesMap: Map<string, Consumable>,
  today: dayjs.Dayjs = dayjs()
): ConsumableBatch[] => {
  return [...batches]
    .filter((b) => isBatchUsable(b, consumablesMap.get(b.consumableId), today))
    .sort((a, b) => {
      const aOpened = a.openedDate ? 1 : 0;
      const bOpened = b.openedDate ? 1 : 0;
      if (aOpened !== bOpened) return aOpened - bOpened;
      const aExpiry = getEffectiveExpiryDate(a, consumablesMap.get(a.consumableId));
      const bExpiry = getEffectiveExpiryDate(b, consumablesMap.get(b.consumableId));
      return aExpiry.localeCompare(bExpiry);
    });
};

/** 某耗材的可领用总余量 */
export const getUsableStock = (
  consumableId: string,
  batches: ConsumableBatch[],
  consumablesMap: Map<string, Consumable>,
  today: dayjs.Dayjs = dayjs()
): number =>
  batches
    .filter(
      (b) =>
        b.consumableId === consumableId &&
        isBatchUsable(b, consumablesMap.get(consumableId), today)
    )
    .reduce((sum, b) => sum + b.remainingQuantity, 0);

/** 同一批号是否已存在（全局唯一，禁止重复入库） */
export const findBatchByNo = (
  batches: ConsumableBatch[],
  batchNo: string
): ConsumableBatch | undefined =>
  batches.find((b) => b.batchNo.trim().toLowerCase() === batchNo.trim().toLowerCase());

/** 校验入库数据，返回错误信息，null 表示通过 */
export const validateInbound = (
  data: {
    batchNo: string;
    inboundDate: string;
    expiryDate: string;
    quantity: number;
    openedDate: string | null;
  },
  existingBatches: ConsumableBatch[],
  selfBatchId: string | null = null
): string | null => {
  if (!data.batchNo.trim()) return '请输入批号';
  const duplicated = findBatchByNo(existingBatches, data.batchNo);
  if (duplicated && duplicated.id !== selfBatchId) {
    return `批号 ${data.batchNo} 已入库，同一批号禁止重复入库`;
  }
  if (!data.inboundDate) return '请选择入库日期';
  if (!data.expiryDate) return '请选择有效期';
  if (dayjs(data.expiryDate).isBefore(dayjs(data.inboundDate), 'day')) {
    return '有效期不能早于入库日期';
  }
  if (!(data.quantity > 0)) return '入库数量必须大于 0';
  if (data.openedDate) {
    if (dayjs(data.openedDate).isAfter(dayjs(), 'day')) {
      return '开封日期不能晚于今天';
    }
    if (dayjs(data.openedDate).isBefore(dayjs(data.inboundDate), 'day')) {
      return '开封日期不能早于入库日期';
    }
  }
  return null;
};

/**
 * 校验一次领用是否合法。
 * 规则：批次必须存在且未过期、有余量；领用数量 > 0 且不超过剩余量；
 * 领用日期不得早于开封日期（未开封时以领用日自动开封）。
 */
export const validateUsage = (
  payload: {
    batchId: string;
    quantity: number;
    usageDate: string;
  },
  batches: ConsumableBatch[],
  consumablesMap: Map<string, Consumable>,
  today: dayjs.Dayjs = dayjs()
): { error: string } | { batch: ConsumableBatch; consumable: Consumable } => {
  const batch = batches.find((b) => b.id === payload.batchId);
  if (!batch) return { error: '批次不存在' };
  const consumable = consumablesMap.get(batch.consumableId);
  if (!consumable) return { error: '耗材信息不存在' };

  const blockReason = getBatchBlockReason(batch, consumable, today);
  if (blockReason) return { error: blockReason };

  if (!(payload.quantity > 0)) return { error: '领用数量必须大于 0' };
  if (payload.quantity > batch.remainingQuantity) {
    return {
      error: `领用数量超过剩余量（剩余 ${batch.remainingQuantity} ${consumable.unit}）`
    };
  }
  if (!payload.usageDate) return { error: '请选择领用日期' };
  if (dayjs(payload.usageDate).isAfter(today, 'day')) {
    return { error: '领用日期不能晚于今天' };
  }
  if (
    batch.openedDate &&
    dayjs(payload.usageDate).isBefore(dayjs(batch.openedDate), 'day')
  ) {
    return { error: `领用日期早于该批次开封日期（${batch.openedDate}）` };
  }
  return { batch, consumable };
};

/** 批次的领用流水，按日期倒序 */
export const getBatchUsages = (
  batchId: string,
  usages: ConsumableUsage[]
): ConsumableUsage[] =>
  usages
    .filter((u) => u.batchId === batchId)
    .sort((a, b) => b.usageDate.localeCompare(a.usageDate));

/**
 * 生成月底点货明细（截至月末 23:59:59 已入库的批次）。
 * 若该月已有盘点单，沿用已录入的实盘数；否则账面余量取当前系统余量。
 */
export const buildStockCheckItems = (
  month: string,
  batches: ConsumableBatch[],
  existing: StockCheckItem[] | undefined
): StockCheckItem[] => {
  const monthEnd = dayjs(month).endOf('month');
  return batches
    .filter((b) => !dayjs(b.inboundDate).isAfter(monthEnd, 'day'))
    .map((b) => {
      const prev = existing?.find((i) => i.batchId === b.id);
      return {
        batchId: b.id,
        bookQuantity: b.remainingQuantity,
        actualQuantity: prev ? prev.actualQuantity : null
      };
    });
};

/** 按耗材汇总某盘点单的盘盈盘亏数量 */
export const summarizeCheck = (items: StockCheckItem[]) => {
  const checked = items.filter((i) => i.actualQuantity !== null);
  const diffTotal = checked.reduce(
    (sum, i) => sum + ((i.actualQuantity as number) - i.bookQuantity),
    0
  );
  return {
    checkedCount: checked.length,
    totalCount: items.length,
    diffTotal,
    hasLoss: checked.some((i) => (i.actualQuantity as number) < i.bookQuantity)
  };
};
