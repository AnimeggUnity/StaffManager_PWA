import { create } from 'zustand';
import { get, set } from 'idb-keyval';
import type { StaffData, AppConfig, SpecialRules, PublicHolidayEntry, ManualOvertime } from '../types';

interface StaffState {
  staffData: StaffData | null;
  config: AppConfig | null;
  rules: SpecialRules | null;
  isLoading: boolean;
  error: string | null;
  targetMonth: string;
  
  // Actions
  setStaffData: (data: StaffData) => Promise<void>;
  setConfig: (config: AppConfig) => Promise<void>;
  setRules: (rules: SpecialRules) => Promise<void>;
  setTargetMonth: (month: string) => void;
  globalSearchTerm: string; // 新增類型定義
  setGlobalSearchTerm: (term: string) => void; // 新增類型定義
  loadFromIndexedDB: () => Promise<void>;
  clearData: () => Promise<void>;
  setHolidayRecords: (records: PublicHolidayEntry[]) => Promise<void>;
  
  // 手動加班相關
  manualRules: ManualOvertime;
  setManualRules: (rules: ManualOvertime) => Promise<void>;
  applyManualRules: () => Promise<void>;
  
  addBulkOvertime: (record: { date: string, reason: string, sh: string, sm: string, eh: string, em: string, shift: '全部' | '早班' | '晚班' }) => Promise<void>;
  clearAllRecords: () => Promise<void>;
}

export const useStaffStore = create<StaffState>((setStore) => ({
  staffData: null,
  config: null,
  rules: null,
  globalSearchTerm: '', // 初始化
  targetMonth: '',
  manualRules: { records: [] },
  isLoading: false,
  error: null,

  setStaffData: async (data) => {
    setStore({ staffData: data });
    await set('staffData', data);
  },

  setConfig: async (config) => {
    setStore({ config });
    await set('appConfig', config);
  },

  setRules: async (rules) => {
    setStore({ rules });
    await set('specialRules', rules);
  },
  
  setTargetMonth: (month) => {
    setStore({ targetMonth: month });
  },

  loadFromIndexedDB: async () => {
    setStore({ isLoading: true });
    try {
      const staffData = await get<StaffData>('staffData');
      const config = await get<AppConfig>('appConfig');
      const rules = await get<SpecialRules>('specialRules');
      const manualRules = await get<ManualOvertime>('manualRules');
      
      setStore({ 
        staffData: staffData || null, 
        config: config || null, 
        rules: rules || null,
        manualRules: manualRules || { records: [] },
        isLoading: false 
      });
    } catch {
      setStore({ error: '無法讀取本機快取資料', isLoading: false });
    }
  },

  clearData: async () => {
    setStore({ staffData: null });
    await set('staffData', null);
  },

  setHolidayRecords: async (records) => {
    const { staffData } = useStaffStore.getState();
    if (!staffData) return;
    const newData = { ...staffData, holidayRecords: records };
    setStore({ staffData: newData });
    await set('staffData', newData);
  },

  addBulkOvertime: async (bulkRecord) => {
    const { staffData } = useStaffStore.getState();
    if (!staffData) return;

    const newPeople = { ...staffData.people };
    Object.keys(newPeople).forEach(id => {
      const person = newPeople[id];
      // 根據班別篩選
      if (bulkRecord.shift === '全部' || person.header.shift === bulkRecord.shift) {
        person.records.push({
          date: bulkRecord.date,
          reason: bulkRecord.reason,
          sh: bulkRecord.sh,
          sm: bulkRecord.sm,
          eh: bulkRecord.eh,
          em: bulkRecord.em
        });
      }
    });

    const newData = { ...staffData, people: newPeople };
    setStore({ staffData: newData });
    await set('staffData', newData);
  },

  setGlobalSearchTerm: (term) => {
    setStore({ globalSearchTerm: term });
  },

  setManualRules: async (rules) => {
    setStore({ manualRules: rules });
    await set('manualRules', rules);
  },

  applyManualRules: async () => {
    const { staffData, manualRules } = useStaffStore.getState();
    if (!staffData || !manualRules.records.length) return;

    const newPeople = JSON.parse(JSON.stringify(staffData.people));
    
    manualRules.records.forEach(rule => {
      Object.keys(newPeople).forEach(id => {
        const person = newPeople[id];
        if (person.header.shift === rule.shift) {
          // 檢查是否已存在 (避免重複套用)
          const exists = person.records.some((r: any) => r.date === rule.date && r.reason === rule.reason);
          if (!exists) {
            const [sh, sm] = rule.start_time.split(':');
            const [eh, em] = rule.end_time.split(':');
            person.records.push({
              date: rule.date,
              reason: rule.reason,
              sh,
              sm,
              eh,
              em,
              manual_hours: rule.hours
            });
          }
        }
      });
    });

    const newData = { ...staffData, people: newPeople };
    setStore({ staffData: newData });
    await set('staffData', newData);
  },

  clearAllRecords: async () => {
    const { staffData } = useStaffStore.getState();
    if (!staffData) return;

    const newPeople = { ...staffData.people };
    Object.keys(newPeople).forEach(id => {
      newPeople[id].records = [];
    });

    const newData = { ...staffData, people: newPeople };
    setStore({ staffData: newData });
    await set('staffData', newData);
  }
}));
