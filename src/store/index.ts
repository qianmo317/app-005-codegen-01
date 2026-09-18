import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';
import dayjs from 'dayjs';
import { storage } from '../utils/storage';
import type {
  Customer,
  SkinAnalysis,
  Allergy,
  Membership,
  Service,
  Package,
  PackageItem,
  Employee,
  Appointment,
  ServiceRecord,
  Schedule,
  Review,
  Attendance,
  Commission,
  WaitList,
  Consumable,
  ConsumableBatch,
  ConsumableUsage,
  StockCheck
} from '../types';
import {
  mockCustomers,
  mockSkinAnalyses,
  mockAllergies,
  mockMemberships,
  mockServices,
  mockPackages,
  mockPackageItems,
  mockEmployees,
  mockAppointments,
  mockServiceRecords,
  mockSchedules,
  mockReviews,
  mockAttendance,
  mockCommissions,
  mockWaitList
} from '../mock';
import { mockConsumables } from '../mock/consumables';
import { validateInbound, validateUsage } from '../utils/consumables';

interface AppState {
  customers: Customer[];
  skinAnalyses: SkinAnalysis[];
  allergies: Allergy[];
  memberships: Membership[];
  services: Service[];
  packages: Package[];
  packageItems: PackageItem[];
  employees: Employee[];
  appointments: Appointment[];
  serviceRecords: ServiceRecord[];
  schedules: Schedule[];
  reviews: Review[];
  attendance: Attendance[];
  commissions: Commission[];
  waitList: WaitList[];
  consumables: Consumable[];
  consumableBatches: ConsumableBatch[];
  consumableUsages: ConsumableUsage[];
  stockChecks: StockCheck[];
  initialized: boolean;
}

const STORAGE_KEY = 'app_state';

const loadState = (): AppState => {
  const buildFreshData = () => {
    const customers = mockCustomers();
    const customerIds = customers.map(c => c.id);
    const services = mockServices() as Service[];
    const serviceIds = services.map(s => s.id);
    const employees = mockEmployees() as Employee[];
    const employeeIds = employees.map(e => e.id);
    const packages = mockPackages() as Package[];
    const consumableData = mockConsumables();

    return {
      customers,
      skinAnalyses: mockSkinAnalyses(customerIds),
      allergies: mockAllergies(customerIds),
      memberships: mockMemberships(customerIds),
      services,
      packages,
      packageItems: mockPackageItems(packages),
      employees,
      appointments: mockAppointments(customerIds, serviceIds, employeeIds),
      serviceRecords: mockServiceRecords(customerIds, serviceIds, employeeIds),
      schedules: mockSchedules(employeeIds),
      reviews: mockReviews(customerIds, employeeIds, serviceIds),
      attendance: mockAttendance(employeeIds),
      commissions: mockCommissions(employeeIds),
      waitList: mockWaitList(customerIds, serviceIds),
      consumables: consumableData.consumables,
      consumableBatches: consumableData.batches,
      consumableUsages: consumableData.usages,
      stockChecks: [],
      initialized: true
    };
  };

  try {
    const saved = storage.get<AppState>(STORAGE_KEY);
    if (saved && saved.initialized) {
      // Verify data integrity
      const firstCustomer = saved.customers[0];
      if (firstCustomer && firstCustomer.avatar && firstCustomer.avatar.includes('data:image/svg+xml;base64,')) {
        const b64 = firstCustomer.avatar.replace('data:image/svg+xml;base64,', '');
        try {
          atob(b64);
          // 旧版本存档迁移：补齐耗材消耗账相关字段
          const migrated = buildFreshData();
          return {
            ...migrated,
            ...saved,
            consumables: saved.consumables ?? migrated.consumables,
            consumableBatches: saved.consumableBatches ?? migrated.consumableBatches,
            consumableUsages: saved.consumableUsages ?? migrated.consumableUsages,
            stockChecks: saved.stockChecks ?? migrated.stockChecks
          };
        } catch {
          console.log('Detected corrupted data, regenerating...');
          storage.clear();
        }
      }
    }
  } catch {
    console.log('Loading fresh data...');
  }

  return buildFreshData();
};

const initialState: AppState = loadState();

const saveState = (state: AppState) => {
  storage.set(STORAGE_KEY, state);
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    addCustomer: (state, action: PayloadAction<Customer>) => {
      state.customers.unshift(action.payload);
      saveState(state);
    },
    updateCustomer: (state, action: PayloadAction<Customer>) => {
      const index = state.customers.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.customers[index] = action.payload;
        saveState(state);
      }
    },
    deleteCustomer: (state, action: PayloadAction<string>) => {
      state.customers = state.customers.filter(c => c.id !== action.payload);
      saveState(state);
    },
    addSkinAnalysis: (state, action: PayloadAction<SkinAnalysis>) => {
      state.skinAnalyses.unshift(action.payload);
      saveState(state);
    },
    addAllergy: (state, action: PayloadAction<Allergy>) => {
      state.allergies.unshift(action.payload);
      saveState(state);
    },
    updateAllergy: (state, action: PayloadAction<Allergy>) => {
      const index = state.allergies.findIndex(a => a.id === action.payload.id);
      if (index !== -1) {
        state.allergies[index] = action.payload;
        saveState(state);
      }
    },
    deleteAllergy: (state, action: PayloadAction<string>) => {
      state.allergies = state.allergies.filter(a => a.id !== action.payload);
      saveState(state);
    },
    addService: (state, action: PayloadAction<Service>) => {
      state.services.unshift(action.payload);
      saveState(state);
    },
    updateService: (state, action: PayloadAction<Service>) => {
      const index = state.services.findIndex(s => s.id === action.payload.id);
      if (index !== -1) {
        state.services[index] = action.payload;
        saveState(state);
      }
    },
    deleteService: (state, action: PayloadAction<string>) => {
      state.services = state.services.filter(s => s.id !== action.payload);
      saveState(state);
    },
    addPackage: (state, action: PayloadAction<Package>) => {
      state.packages.unshift(action.payload);
      saveState(state);
    },
    updatePackage: (state, action: PayloadAction<Package>) => {
      const index = state.packages.findIndex(p => p.id === action.payload.id);
      if (index !== -1) {
        state.packages[index] = action.payload;
        saveState(state);
      }
    },
    addAppointment: (state, action: PayloadAction<Appointment>) => {
      state.appointments.unshift(action.payload);
      saveState(state);
    },
    updateAppointment: (state, action: PayloadAction<Appointment>) => {
      const index = state.appointments.findIndex(a => a.id === action.payload.id);
      if (index !== -1) {
        state.appointments[index] = action.payload;
        saveState(state);
      }
    },
    deleteAppointment: (state, action: PayloadAction<string>) => {
      state.appointments = state.appointments.filter(a => a.id !== action.payload);
      saveState(state);
    },
    addEmployee: (state, action: PayloadAction<Employee>) => {
      state.employees.unshift(action.payload);
      saveState(state);
    },
    updateEmployee: (state, action: PayloadAction<Employee>) => {
      const index = state.employees.findIndex(e => e.id === action.payload.id);
      if (index !== -1) {
        state.employees[index] = action.payload;
        saveState(state);
      }
    },
    updateSchedule: (state, action: PayloadAction<Schedule>) => {
      const index = state.schedules.findIndex(s => s.id === action.payload.id);
      if (index !== -1) {
        state.schedules[index] = action.payload;
      } else {
        state.schedules.push(action.payload);
      }
      saveState(state);
    },
    addWaitList: (state, action: PayloadAction<WaitList>) => {
      state.waitList.unshift(action.payload);
      saveState(state);
    },
    updateWaitList: (state, action: PayloadAction<WaitList>) => {
      const index = state.waitList.findIndex(w => w.id === action.payload.id);
      if (index !== -1) {
        state.waitList[index] = action.payload;
        saveState(state);
      }
    },
    deleteWaitList: (state, action: PayloadAction<string>) => {
      state.waitList = state.waitList.filter(w => w.id !== action.payload);
      saveState(state);
    },
    addServiceRecord: (state, action: PayloadAction<ServiceRecord>) => {
      state.serviceRecords.unshift(action.payload);
      const membership = state.memberships.find(m => m.customerId === action.payload.customerId);
      if (membership) {
        membership.totalSpent += action.payload.price;
        membership.points += Math.floor(action.payload.price / 10);
        if (membership.totalSpent > 30000) membership.level = 'diamond';
        else if (membership.totalSpent > 20000) membership.level = 'platinum';
        else if (membership.totalSpent > 10000) membership.level = 'gold';
        else if (membership.totalSpent > 5000) membership.level = 'silver';
      }
      saveState(state);
    },

    // ==================== 耗材消耗账 ====================

    addConsumable: (state, action: PayloadAction<Consumable>) => {
      state.consumables.unshift(action.payload);
      saveState(state);
    },
    updateConsumable: (state, action: PayloadAction<Consumable>) => {
      const index = state.consumables.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.consumables[index] = action.payload;
        saveState(state);
      }
    },

    /**
     * 批次入库。同一批号不许重复入库（全局唯一），
     * 入库数据不合法时拒绝写入。UI 层另做前置提示。
     */
    addConsumableBatch: (state, action: PayloadAction<ConsumableBatch>) => {
      const batch = action.payload;
      const error = validateInbound(
        {
          batchNo: batch.batchNo,
          inboundDate: batch.inboundDate,
          expiryDate: batch.expiryDate,
          quantity: batch.initialQuantity,
          openedDate: batch.openedDate
        },
        state.consumableBatches
      );
      if (error) return;
      state.consumableBatches.unshift(batch);
      saveState(state);
    },

    /** 标记开封（只能从未开封变为已开封，开封日期不晚于今天） */
    openConsumableBatch: (
      state,
      action: PayloadAction<{ id: string; openedDate: string }>
    ) => {
      const { id, openedDate } = action.payload;
      const batch = state.consumableBatches.find(b => b.id === id);
      if (!batch || batch.openedDate) return;
      if (dayjs(openedDate).isAfter(dayjs(), 'day')) return;
      batch.openedDate = openedDate;
      saveState(state);
    },

    /**
     * 耗材领用：写一条流水并扣减批次余量。
     * 过期批次 / 超量领用在此处被最终拦截，即使绕过 UI 也无法提交；
     * 未开封批次首次领用自动以领用日期开封。
     */
    addConsumableUsage: (
      state,
      action: PayloadAction<Omit<ConsumableUsage, 'id' | 'createdAt'>>
    ) => {
      const payload = action.payload;
      const consumablesMap = new Map(state.consumables.map(c => [c.id, c]));
      const result = validateUsage(
        { batchId: payload.batchId, quantity: payload.quantity, usageDate: payload.usageDate },
        state.consumableBatches,
        consumablesMap
      );
      if ('error' in result) return;
      if (!result.batch.openedDate) {
        result.batch.openedDate = payload.usageDate;
      }
      result.batch.remainingQuantity = Number(
        (result.batch.remainingQuantity - payload.quantity).toFixed(3)
      );
      state.consumableUsages.unshift({
        ...payload,
        id: `CU${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss')
      });
      saveState(state);
    },

    /** 保存/更新月底点货单（同月覆盖） */
    saveStockCheck: (
      state,
      action: PayloadAction<Omit<StockCheck, 'id' | 'createdAt'> & { id?: string }>
    ) => {
      const { id, ...data } = action.payload;
      const existingIndex = state.stockChecks.findIndex(c => c.month === data.month);
      if (existingIndex !== -1) {
        state.stockChecks[existingIndex] = {
          ...state.stockChecks[existingIndex],
          ...data
        };
      } else {
        state.stockChecks.unshift({
          ...data,
          id: id || `SC${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss')
        });
      }
      saveState(state);
    }
  }
});

export const {
  addCustomer,
  updateCustomer,
  deleteCustomer,
  addSkinAnalysis,
  addAllergy,
  updateAllergy,
  deleteAllergy,
  addService,
  updateService,
  deleteService,
  addPackage,
  updatePackage,
  addAppointment,
  updateAppointment,
  deleteAppointment,
  addEmployee,
  updateEmployee,
  updateSchedule,
  addWaitList,
  updateWaitList,
  deleteWaitList,
  addServiceRecord,
  addConsumable,
  updateConsumable,
  addConsumableBatch,
  openConsumableBatch,
  addConsumableUsage,
  saveStockCheck
} = appSlice.actions;

export const store = configureStore({
  reducer: {
    app: appSlice.reducer
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
