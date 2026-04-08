export interface TimeRecord {
  date: string; // "MM/DD" 格式
  reason: string;
  sh: string; // start_hour
  sm: string; // start_min
  eh: string; // end_hour
  em: string; // end_min
  manual_hours?: number | null;
}

export interface Employee {
  header: {
    name: string;
    emp_id: string;
    title?: string;
    shift?: string;
    month: string;
  };
  records: TimeRecord[];
}

export interface AppConfig {
  roc_year: number;
  last_updated?: string;
}

export interface SpecialRules {
  default_off_weekdays: number[];
  employee_off_weekdays: Record<string, number[]>;
  vehicle_off_weekdays: Record<string, number[]>;
  manual_holidays: string[];
  manual_workdays: string[];
}

export interface ManualOvertime {
  records: Array<{
    date: string;
    shift: "早班" | "晚班";
    start_time: string;
    end_time: string;
    hours: number;
    reason: string;
  }>;
}

export interface StaffData {
  month: string;
  people: Record<string, {
    header: {
      name: string;
      emp_id: string;
      title?: string;
      shift?: string;
      month: string;
    };
    records: TimeRecord[];
  }>;
  holidayRecords?: PublicHolidayEntry[];
  vehicleRecords?: VehicleInfo[];
  drivers?: Record<string, DriverInfo>;
}

export interface DriverInfo {
  name: string;
  role: string; // 正駕 | 輪代
  cars: string[]; // 車牌清單
}

export interface PublicHolidayEntry {
  date: string; // MMDD
  reason: string;
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  hours?: number;
  shift: '全部' | '早班' | '晚班';
}

export interface VehicleInfo {
  plate: string;
  spec: string;
  extra?: string;
}
