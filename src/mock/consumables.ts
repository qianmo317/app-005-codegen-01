import dayjs from 'dayjs';
import type { Consumable, ConsumableBatch, ConsumableUsage } from '../types';

/** 耗材消耗账的初始数据：目录 + 批次 + 领用流水 */
export interface ConsumableMockData {
  consumables: Consumable[];
  batches: ConsumableBatch[];
  usages: ConsumableUsage[];
}

interface BatchSeed {
  batchNo: string;
  consumableIndex: number;
  /** 相对今天的入库日偏移（负数=过去） */
  inboundOffset: number;
  /** 相对今天的失效日偏移（负数=已过期） */
  expiryOffset: number;
  openedOffset: number | null;
  initialQuantity: number;
  /** 已消耗量，将拆成 1-2 条流水；0 表示无流水 */
  consumed: number;
  supplier: string;
}

export const mockConsumables = (): ConsumableMockData => {
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss');

  const consumables: Consumable[] = [
    { id: 'M001', name: '玫瑰软膜粉', category: 'mask_powder', unit: 'g', openedShelfLifeDays: 90, warningDays: 30, safetyStock: 500, status: 'active', createdAt: now },
    { id: 'M002', name: '玻尿酸补水面膜粉', category: 'mask_powder', unit: 'g', openedShelfLifeDays: 60, warningDays: 30, safetyStock: 500, status: 'active', createdAt: now },
    { id: 'M003', name: '积雪草舒缓面膜粉', category: 'mask_powder', unit: 'g', openedShelfLifeDays: 90, warningDays: 45, safetyStock: 300, status: 'active', createdAt: now },
    { id: 'E001', name: '薰衣草精油', category: 'essential_oil', unit: 'ml', openedShelfLifeDays: 180, warningDays: 30, safetyStock: 50, status: 'active', createdAt: now },
    { id: 'E002', name: '茶树净痘精油', category: 'essential_oil', unit: 'ml', openedShelfLifeDays: 180, warningDays: 30, safetyStock: 30, status: 'active', createdAt: now },
    { id: 'E003', name: '玫瑰果按摩精油', category: 'essential_oil', unit: 'ml', openedShelfLifeDays: 120, warningDays: 30, safetyStock: 100, status: 'active', createdAt: now },
    { id: 'W001', name: '蜂蜜脱毛蜡', category: 'wax', unit: 'g', openedShelfLifeDays: 365, warningDays: 60, safetyStock: 800, status: 'active', createdAt: now },
    { id: 'W002', name: '芦荟低敏脱毛蜡', category: 'wax', unit: 'g', openedShelfLifeDays: 365, warningDays: 60, safetyStock: 800, status: 'active', createdAt: now }
  ];

  const d = (offset: number) => dayjs().add(offset, 'day').format('YYYY-MM-DD');

  const seeds: BatchSeed[] = [
    // 面膜粉
    { batchNo: 'MMF-20251108-A', consumableIndex: 0, inboundOffset: -130, expiryOffset: 60, openedOffset: -100, initialQuantity: 1000, consumed: 620, supplier: '广州美源化妆品' },
    { batchNo: 'MMF-20260115-B', consumableIndex: 0, inboundOffset: -60, expiryOffset: 200, openedOffset: null, initialQuantity: 1000, consumed: 0, supplier: '广州美源化妆品' },
    { batchNo: 'MMF-20250601-C', consumableIndex: 0, inboundOffset: -300, expiryOffset: -10, openedOffset: -200, initialQuantity: 1000, consumed: 700, supplier: '广州美源化妆品' },
    { batchNo: 'MMF-20240820-D', consumableIndex: 1, inboundOffset: -400, expiryOffset: -100, openedOffset: -300, initialQuantity: 800, consumed: 800, supplier: '上海妍妆生物' },
    { batchNo: 'MMF-20260301-E', consumableIndex: 1, inboundOffset: -20, expiryOffset: 320, openedOffset: null, initialQuantity: 1000, consumed: 0, supplier: '上海妍妆生物' },
    { batchNo: 'MMF-20251210-F', consumableIndex: 2, inboundOffset: -100, expiryOffset: 40, openedOffset: -20, initialQuantity: 600, consumed: 180, supplier: '杭州植萃科技' },
    // 精油
    { batchNo: 'EO-LV-20251012', consumableIndex: 3, inboundOffset: -160, expiryOffset: 200, openedOffset: -120, initialQuantity: 100, consumed: 35, supplier: '云南芳草居' },
    { batchNo: 'EO-LV-20260220', consumableIndex: 3, inboundOffset: -40, expiryOffset: 320, openedOffset: null, initialQuantity: 100, consumed: 0, supplier: '云南芳草居' },
    { batchNo: 'EO-TT-20250901', consumableIndex: 4, inboundOffset: -200, expiryOffset: -25, openedOffset: -180, initialQuantity: 50, consumed: 20, supplier: '云南芳草居' },
    { batchNo: 'EO-TT-20260108', consumableIndex: 4, inboundOffset: -70, expiryOffset: 150, openedOffset: -10, initialQuantity: 50, consumed: 8, supplier: '云南芳草居' },
    { batchNo: 'EO-RS-20251125', consumableIndex: 5, inboundOffset: -120, expiryOffset: 25, openedOffset: -100, initialQuantity: 500, consumed: 260, supplier: '保加利亚玫瑰庄园' },
    // 脱毛蜡
    { batchNo: 'WX-HN-20251030', consumableIndex: 6, inboundOffset: -150, expiryOffset: 400, openedOffset: -120, initialQuantity: 2000, consumed: 650, supplier: '义乌蜜蜡工坊' },
    { batchNo: 'WX-HN-20250518', consumableIndex: 6, inboundOffset: -300, expiryOffset: -40, openedOffset: -250, initialQuantity: 2000, consumed: 1200, supplier: '义乌蜜蜡工坊' },
    { batchNo: 'WX-AL-20251120', consumableIndex: 7, inboundOffset: -130, expiryOffset: 50, openedOffset: -110, initialQuantity: 1500, consumed: 700, supplier: '义乌蜜蜡工坊' },
    { batchNo: 'WX-AL-20260310', consumableIndex: 7, inboundOffset: -15, expiryOffset: 450, openedOffset: null, initialQuantity: 1500, consumed: 0, supplier: '义乌蜜蜡工坊' }
  ];

  const batches: ConsumableBatch[] = [];
  const usages: ConsumableUsage[] = [];
  const operators = ['林技师', '周美容师', '陈美容师'];
  const purposes = ['面部护理', '背部舒缓按摩', '脱毛护理', '肩颈疏通', '补水修护'];

  seeds.forEach((seed, idx) => {
    const id = `B${String(idx + 1).padStart(4, '0')}`;
    batches.push({
      id,
      batchNo: seed.batchNo,
      consumableId: consumables[seed.consumableIndex].id,
      inboundDate: d(seed.inboundOffset),
      expiryDate: d(seed.expiryOffset),
      openedDate: seed.openedOffset === null ? null : d(seed.openedOffset),
      initialQuantity: seed.initialQuantity,
      remainingQuantity: seed.initialQuantity - seed.consumed,
      supplier: seed.supplier,
      createdAt: `${d(seed.inboundOffset)} 09:30:00`
    });

    if (seed.consumed <= 0) return;

    // 已消耗量拆成 1~2 条流水；领用日夹在
    // [入库日, min(昨天, 开封日)] 之间，避免给已过期批次生成过期后领用
    const openedOffset = seed.openedOffset ?? seed.inboundOffset;
    const upperOffset = Math.min(-1, openedOffset);
    const lowerOffset = Math.min(seed.inboundOffset, upperOffset);
    const clamp = (v: number) => Math.max(lowerOffset, Math.min(upperOffset, v));
    const parts = seed.consumed > 100 ? 2 : 1;
    let left = seed.consumed;
    for (let p = 0; p < parts; p++) {
      const qty = p === parts - 1 ? left : Math.round(seed.consumed / 2 / 10) * 10;
      left -= qty;
      // 第一条靠近上界，第二条靠近下界，保证两条不同日且都合法
      const usageOffset =
        parts === 1 ? upperOffset : clamp(Math.round(lowerOffset + (upperOffset - lowerOffset) * (1 - p / parts)));
      usages.push({
        id: `CU${String(usages.length + 1).padStart(6, '0')}`,
        batchId: id,
        consumableId: consumables[seed.consumableIndex].id,
        usageDate: d(usageOffset),
        quantity: qty,
        serviceRecordId: null,
        customerId: null,
        employeeId: null,
        purpose: purposes[(idx + p) % purposes.length],
        operator: operators[(idx + p) % operators.length],
        createdAt: `${d(usageOffset)} ${10 + ((idx + p) % 8)}:15:00`
      });
    }
  });

  return { consumables, batches, usages: usages.sort((a, b) => b.usageDate.localeCompare(a.usageDate)) };
};
