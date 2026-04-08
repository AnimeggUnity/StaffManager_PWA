import { create } from 'zustand';
import { get, set } from 'idb-keyval';
import type { StaffData, AppConfig, SpecialRules, ManualOvertime } from '../types';

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
  globalSearchTerm: string;
  setGlobalSearchTerm: (term: string) => void;
  loadFromIndexedDB: () => Promise<void>;
  clearData: () => Promise<void>;
  
  // 國定假日加班相關
  holidayRules: ManualOvertime;
  setHolidayRules: (rules: ManualOvertime) => Promise<void>;
  
  // 手動加班相關
  manualRules: ManualOvertime;
  setManualRules: (rules: ManualOvertime) => Promise<void>;
  removeManualRule: (index: number) => Promise<void>;
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
  holidayRules: { records: [] },
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
      const holidayRules = await get<ManualOvertime>('holidayRules');
      
      setStore({ 
        staffData: staffData || null, 
        config: config || null, 
        rules: rules || null,
        manualRules: manualRules || { records: [] },
        holidayRules: holidayRules || { records: [] },
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

  setHolidayRules: async (rules) => {
    setStore({ holidayRules: rules });
    await set('holidayRules', rules);
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

  removeManualRule: async (index) => {
    const { staffData, manualRules } = useStaffStore.getState();
    const ruleToRemove = manualRules.records[index];
    if (!ruleToRemove) return;

    // 1. 更新規則清單
    const updatedRules = {
      records: manualRules.records.filter((_, i) => i !== index)
    };
    setStore({ manualRules: updatedRules });
    await set('manualRules', updatedRules);

    // 2. 如果目前已有資料，連動刪除對應的加班紀錄
    if (staffData) {
      const newPeople = JSON.parse(JSON.stringify(staffData.people));
      Object.keys(newPeople).forEach(id => {
        const person = newPeople[id];
        // 唯有班別符合、日期符合、事由符合，且標記為 isManual 的紀錄才會被移除
        person.records = person.records.filter((r: any) => 
          !(r.isManual === true && r.date === ruleToRemove.date && r.reason === ruleToRemove.reason)
        );
      });

      const newData = { ...staffData, people: newPeople };
      setStore({ staffData: newData });
      await set('staffData', newData);
    }
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
              manual_hours: rule.hours,
              isManual: true
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
