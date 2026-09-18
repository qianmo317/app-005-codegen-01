import { configureStore, createSlice, PayloadAction, combineReducers } from '@reduxjs/toolkit';
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
  mockWaitList,
  mockConsumables,
  mockConsumableBatches,
  mockConsumableUsages
} from '../mock';
import { getDaysLeft } from '../utils/consumable';

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
  try {
    const saved = storage.get<AppState>(STORAGE_KEY);
    if (saved && saved.initialized) {
      // Verify data integrity
      const firstCustomer = saved.customers[0];
      if (firstCustomer && firstCustomer.avatar && firstCustomer.avatar.includes('data:image/svg+xml;base64,')) {
        const b64 = firstCustomer.avatar.replace('data:image/svg+xml;base64,', '');
        try {
          atob(b64);
          // 老数据缺少耗材模块时补生成
          if (!saved.consumables) {
            const consumables = mockConsumables();
            const consumableBatches = mockConsumableBatches(consumables);
            return {
              ...saved,
              consumables,
              consumableBatches,
              consumableUsages: mockConsumableUsages(consumableBatches, consumables, saved.serviceRecords ?? []),
              stockChecks: []
            };
          }
          return saved;
        } catch (e) {
          console.log('Detected corrupted data, regenerating...');
          storage.clear();
        }
      }
    }
  } catch (e) {
    console.log('Loading fresh data...');
  }

  const customers = mockCustomers();
  const customerIds = customers.map(c => c.id);
  const services = mockServices() as Service[];
  const serviceIds = services.map(s => s.id);
  const employees = mockEmployees() as Employee[];
  const employeeIds = employees.map(e => e.id);
  const packages = mockPackages() as Package[];
  const consumables = mockConsumables();
  const consumableBatches = mockConsumableBatches(consumables);
  const serviceRecords = mockServiceRecords(customerIds, serviceIds, employeeIds);

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
    serviceRecords,
    schedules: mockSchedules(employeeIds),
    reviews: mockReviews(customerIds, employeeIds, serviceIds),
    attendance: mockAttendance(employeeIds),
    commissions: mockCommissions(employeeIds),
    waitList: mockWaitList(customerIds, serviceIds),
    consumables,
    consumableBatches,
    consumableUsages: mockConsumableUsages(consumableBatches, consumables, serviceRecords),
    stockChecks: [],
    initialized: true
  };
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
    addConsumable: (state, action: PayloadAction<Consumable>) => {
      state.consumables.unshift(action.payload);
      saveState(state);
    },
    addConsumableBatch: (state, action: PayloadAction<ConsumableBatch>) => {
      const batch = action.payload;
      // 同一耗材下批号不允许重复入库
      const duplicated = state.consumableBatches.some(
        b => b.consumableId === batch.consumableId && b.batchNo === batch.batchNo
      );
      if (duplicated) return;
      state.consumableBatches.unshift(batch);
      saveState(state);
    },
    openConsumableBatch: (state, action: PayloadAction<{ id: string; openedDate: string }>) => {
      const batch = state.consumableBatches.find(b => b.id === action.payload.id);
      if (batch && !batch.openedDate) {
        batch.openedDate = action.payload.openedDate;
        saveState(state);
      }
    },
    issueConsumable: (state, action: PayloadAction<ConsumableUsage>) => {
      const usage = action.payload;
      const batch = state.consumableBatches.find(b => b.id === usage.batchId);
      const consumable = state.consumables.find(c => c.id === usage.consumableId);
      if (!batch || !consumable) return;
      // 已过期批次禁止领用
      if (getDaysLeft(consumable, batch) < 0) return;
      if (usage.quantity <= 0 || usage.quantity > batch.remaining) return;
      batch.remaining -= usage.quantity;
      // 未开封批次首次领用自动记开封日期
      if (!batch.openedDate) {
        batch.openedDate = usage.usedAt.slice(0, 10);
      }
      state.consumableUsages.unshift(usage);
      saveState(state);
    },
    addStockCheck: (state, action: PayloadAction<StockCheck>) => {
      const check = action.payload;
      const batch = state.consumableBatches.find(b => b.id === check.batchId);
      if (!batch) return;
      batch.remaining = check.actualQuantity;
      state.stockChecks.unshift(check);
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
  addConsumableBatch,
  openConsumableBatch,
  issueConsumable,
  addStockCheck
} = appSlice.actions;

export const store = configureStore({
  reducer: {
    app: appSlice.reducer
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
