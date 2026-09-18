export interface Customer {
  id: string;
  name: string;
  phone: string;
  birthday: string;
  gender: 'male' | 'female';
  avatar: string;
  address: string;
  skinType: string;
  notes: string;
  createdAt: string;
}

export interface SkinAnalysis {
  id: string;
  customerId: string;
  analysisDate: string;
  skinType: string;
  oiliness: string;
  moisture: string;
  elasticity: string;
  sensitivity: string;
  skinCondition: string;
  recommendations: string;
  photoUrl?: string;
}

export interface Allergy {
  id: string;
  customerId: string;
  allergen: string;
  severity: 'mild' | 'moderate' | 'severe';
  discoveredDate: string;
  notes: string;
}

export interface ServiceRecord {
  id: string;
  customerId: string;
  serviceId: string;
  employeeId: string;
  serviceDate: string;
  price: number;
  notes: string;
}

export interface Membership {
  id: string;
  customerId: string;
  level: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  points: number;
  totalSpent: number;
  joinDate: string;
  expireDate: string;
}

export interface Service {
  id: string;
  name: string;
  category: string;
  duration: number;
  price: number;
  description: string;
  suitableSkin: string[];
  effectDescription: string;
  imageUrl: string;
  status: 'active' | 'inactive';
}

export interface Package {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
  validityDays: number;
  description: string;
  imageUrl: string;
  status: 'active' | 'inactive';
}

export interface PackageItem {
  id: string;
  packageId: string;
  serviceId: string;
  count: number;
}

export interface Appointment {
  id: string;
  customerId: string;
  serviceId: string;
  employeeId: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  source: 'phone' | 'wechat' | 'walk_in' | 'online';
  notes: string;
  reminderSent: boolean;
}

export interface WaitList {
  id: string;
  customerId: string;
  serviceId: string;
  preferredDate: string;
  addedAt: string;
  status: 'waiting' | 'notified' | 'cancelled' | 'booked';
}

export interface Employee {
  id: string;
  name: string;
  role: 'beautician' | 'manager' | 'receptionist' | 'technician';
  phone: string;
  avatar: string;
  hireDate: string;
  baseSalary: number;
  commissionRate: number;
  skills: string[];
  status: 'active' | 'leave' | 'terminated';
}

export interface Schedule {
  id: string;
  employeeId: string;
  date: string;
  shiftType: 'morning' | 'afternoon' | 'full_day' | 'off' | 'overtime';
  startTime: string;
  endTime: string;
}

export interface Attendance {
  id: string;
  employeeId: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: 'present' | 'absent' | 'late' | 'leave';
}

export interface Review {
  id: string;
  employeeId: string;
  customerId: string;
  rating: number;
  comment: string;
  reviewDate: string;
  serviceId: string;
}

export interface Commission {
  id: string;
  employeeId: string;
  serviceRecordId: string;
  amount: number;
  commissionDate: string;
}

export interface DashboardStats {
  monthlyRevenue: number;
  newCustomers: number;
  totalAppointments: number;
  completedServices: number;
  revenueTrend: { date: string; value: number }[];
  topEmployees: { name: string; value: number }[];
  todayAppointments: TodayAppointment[];
}

export interface TodayAppointment {
  id: string;
  customerName: string;
  customerAvatar: string;
  serviceName: string;
  employeeName: string;
  time: string;
  status: string;
}

// ==================== 耗材消耗账 ====================

/** 耗材分类：面膜粉 / 精油 / 脱毛蜡 等 */
export type ConsumableCategory = 'mask_powder' | 'essential_oil' | 'wax' | string;

/** 耗材目录 */
export interface Consumable {
  id: string;
  name: string;
  category: ConsumableCategory;
  /** 计量单位，如 g / ml / 罐 / 瓶 */
  unit: string;
  /** 开封后保质期（天），开封日起算 */
  openedShelfLifeDays: number;
  /** 临期预警阈值（天） */
  warningDays: number;
  /** 安全库存（低于此值提示补货） */
  safetyStock: number;
  status: 'active' | 'inactive';
  createdAt: string;
}

/** 批次库存状态（账面派生状态） */
export type BatchLifeStatus = 'normal' | 'near_expiry' | 'expired' | 'used_up';

/** 入库批次 */
export interface ConsumableBatch {
  id: string;
  /** 批号，全局唯一，同一批号禁止重复入库 */
  batchNo: string;
  consumableId: string;
  /** 入库日期 YYYY-MM-DD */
  inboundDate: string;
  /** 有效期（未开封保质期截止日）YYYY-MM-DD */
  expiryDate: string;
  /** 开封日期 YYYY-MM-DD，null 表示尚未开封 */
  openedDate: string | null;
  /** 入库数量 */
  initialQuantity: number;
  /** 剩余数量（每次领用递减） */
  remainingQuantity: number;
  supplier: string;
  createdAt: string;
}

/** 领用流水（哪次护理用了哪一批、用了多少） */
export interface ConsumableUsage {
  id: string;
  batchId: string;
  consumableId: string;
  /** 领用日期 YYYY-MM-DD */
  usageDate: string;
  /** 领用数量 */
  quantity: number;
  /** 关联的护理记录（可选，代表"哪次护理"） */
  serviceRecordId: string | null;
  customerId: string | null;
  employeeId: string | null;
  /** 用途/备注 */
  purpose: string;
  operator: string;
  createdAt: string;
}

/** 盘点明细行：某一批对了多少 */
export interface StockCheckItem {
  batchId: string;
  /** 系统账面余量（盘点单生成时快照） */
  bookQuantity: number;
  /** 实盘数量 */
  actualQuantity: number | null;
}

/** 月底点货单 */
export interface StockCheck {
  id: string;
  /** 盘点月份 YYYY-MM */
  month: string;
  /** 盘点日期 YYYY-MM-DD */
  checkDate: string;
  items: StockCheckItem[];
  operator: string;
  note: string;
  createdAt: string;
}
