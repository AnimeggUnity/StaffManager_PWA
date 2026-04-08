import ExcelJS from 'exceljs';
import type { StaffData, AppConfig, SpecialRules } from '../../types';

const GRAY_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFD9D9D9' }
};

const WHITE_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFFFFFFF' }
};

const ROLE_CONFIG: Record<string, { template_name: string; rows: number }> = {
  "正駕": {
    "template_name": "正駕",
    "rows": 10
  },
  "輪代": {
    "template_name": "輪代",
    "rows": 22
  }
};

function isOffDay(date: Date, rules: SpecialRules | null): boolean {
  const mmdd = `${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
  if (rules?.manual_workdays?.includes(mmdd)) return false;
  if (rules?.manual_holidays?.includes(mmdd)) return true;
  
  const day = date.getDay(); // 0 is Sunday
  // 強制轉為數字進行比對
  const offWeekdays = (rules?.default_off_weekdays || [3, 0]).map(Number);
  return offWeekdays.includes(day);
}

export async function generateDriveBonusReport(staffData: StaffData, appConfig: AppConfig | null, rules: SpecialRules | null): Promise<Blob> {
  const baseUrl = import.meta.env.BASE_URL || './';
  const response = await fetch(`${baseUrl}templates/drivebonus_template.xlsx`);
  if (!response.ok) throw new Error("找不到獎金清冊模板");
  const arrayBuffer = await response.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  const drivers = staffData.drivers || {};
  const driverIds = Object.keys(drivers);
  if (driverIds.length === 0) throw new Error("沒有司機資料可供產出");

  // 精確計算年份與月份
  const monthStr = staffData.month.trim();
  const month = parseInt(monthStr.slice(-2)) || (new Date().getMonth() + 1);
  const rocYearNum = appConfig?.roc_year || (new Date().getFullYear() - 1911);
  const year = rocYearNum + 1911;
  const lastDay = new Date(year, month, 0).getDate();
  const rocYearStr = rocYearNum.toString();

  // 1:1 克隆角色樣板
  const templates: Record<string, ExcelJS.Worksheet> = {};
  for (const role in ROLE_CONFIG) {
    const sheet = workbook.getWorksheet(ROLE_CONFIG[role].template_name);
    if (sheet) templates[role] = sheet;
  }

  for (const empId of driverIds) {
    const info = drivers[empId];
    const role = info.role === '輪代' ? '輪代' : '正駕';
    const templateSheet = templates[role];
    const roleConfig = ROLE_CONFIG[role];
    if (!templateSheet) continue;

    const newSheet = workbook.addWorksheet(empId);

    // --- 1. 佈局克隆 (1:1) ---
    if (templateSheet.columns) {
        templateSheet.columns.forEach((col, idx) => {
          const nCol = newSheet.getColumn(idx + 1);
          nCol.width = col.width ? col.width + 1 : undefined; 
          nCol.hidden = col.hidden;
        });
    }

    templateSheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      const newRow = newSheet.getRow(rowNumber);
      newRow.height = row.height;
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const newCell = newRow.getCell(colNumber);
        
        // 使用精準屬性賦值，防止邊框細節丟失 (解決斷線問題)
        if (cell.style) {
          if (cell.font) newCell.font = { ...cell.font };
          if (cell.fill) newCell.fill = { ...cell.fill } as any;
          if (cell.alignment) newCell.alignment = { ...cell.alignment };
          if (cell.border) newCell.border = { ...cell.border };
          if (cell.numFmt) newCell.numFmt = cell.numFmt;
        }
        newCell.value = cell.value;
      });
    });

    const merges = (templateSheet.model as { merges?: string[] }).merges || [];
    merges.forEach((m) => {
      newSheet.mergeCells(m);
      
      // 框線強化修復：確保合併邊界 (如 H6) 完整繼承模板框線
      try {
        const [start, end] = m.split(':');
        if (start && end) {
          const startCell = templateSheet.getCell(start);
          const endCell = templateSheet.getCell(end);
          
          for (let r = Number(startCell.row); r <= Number(endCell.row); r++) {
            for (let c = Number(startCell.col); c <= Number(endCell.col); c++) {
              const templateCell = templateSheet.getCell(r, c);
              if (templateCell.border) {
                newSheet.getCell(r, c).border = { ...templateCell.border };
              }
            }
          }
        }
      } catch (e) {
        // 靜默處理
      }
    });
    newSheet.pageSetup = JSON.parse(JSON.stringify(templateSheet.pageSetup || {}));

    // --- 2. 標籤與紀錄填充 (1:1) ---
    let dateRow = 0, dateCol = 0, nameRow=0, nameCol=0, idRow=0, idCol=0, carRow=0, carCol=0;
    
    newSheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        if (typeof cell.value === 'string') {
          const val = cell.value;
          if (val.includes('{{year}}')) cell.value = val.replace('{{year}}', rocYearStr);
          if (val.includes('{{month}}')) cell.value = val.replace('{{month}}', month.toString());
          if (val.includes('{{date_row}}')) { dateRow = rowNumber; dateCol = colNumber; cell.value = 1; }
          if (val.includes('{{name}}')) { nameRow = rowNumber; nameCol = colNumber; cell.value = val.replace('{{name}}', info.name); }
          if (val.includes('{{emp_id}}')) { idRow = rowNumber; idCol = colNumber; cell.value = val.replace('{{emp_id}}', `店${empId}`); }
          if (val.includes('{{car_plate}}')) { carRow = rowNumber; carCol = colNumber; cell.value = val.replace('{{car_plate}}', info.cars[0] || ""); }
        }
      });
    });

    // 填充 1-31 日日期與垂直塗灰 (修正重心)
    if (dateRow && dateCol) {
      for (let day = 1; day <= 31; day++) {
        const dateCell = newSheet.getRow(dateRow).getCell(dateCol + day - 1);
        
        if (day > lastDay) {
          dateCell.value = "";
          // 超過天數清空底色
          for (let r = 1; r <= roleConfig.rows; r++) {
             newSheet.getRow(dateRow + r).getCell(dateCol + day - 1).fill = WHITE_FILL;
          }
        } else {
          dateCell.value = day;
          const currentDate = new Date(year, month - 1, day);
          const fillStyle = isOffDay(currentDate, rules) ? GRAY_FILL : WHITE_FILL;
          
          // 垂直塗灰全部角色行 (根據判定著色)
          for (let r = 1; r <= roleConfig.rows; r++) {
             newSheet.getRow(dateRow + r).getCell(dateCol + day - 1).fill = fillStyle;
          }
        }
      }
    }

    // 填充多台車輛 (1:1)
    if (carRow && carCol) {
        for (let i = 1; i < roleConfig.rows; i++) {
           if (info.cars[i]) {
              const carCell = newSheet.getRow(carRow + i).getCell(carCol);
              carCell.value = info.cars[i];
              newSheet.getRow(nameRow + i).getCell(nameCol).value = info.name;
              newSheet.getRow(idRow + i).getCell(idCol).value = `店${empId}`;
           }
        }
    }

    newSheet.views = [{ zoomScale: 57 }];
  }

  // 移除原始模板
  for (const role in ROLE_CONFIG) {
    const sheet = workbook.getWorksheet(ROLE_CONFIG[role].template_name);
    if (sheet) workbook.removeWorksheet(sheet.id);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
