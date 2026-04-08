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
  const offWeekdays = (rules?.default_off_weekdays || [3, 0]).map(Number);
  return offWeekdays.includes(day);
}

export async function generateDriveBonusReport(staffData: StaffData, appConfig: AppConfig | null, rules: SpecialRules | null): Promise<Blob> {
  const baseUrl = import.meta.env.BASE_URL || './';
  const response = await fetch(`${baseUrl}templates/drivebonus_template.xlsx?v=${Date.now()}`);
  if (!response.ok) throw new Error("找不到獎金清冊模板");
  const arrayBuffer = await response.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  const drivers = staffData.drivers || {};
  const driverIds = Object.keys(drivers);
  if (driverIds.length === 0) throw new Error("沒有司機資料可供產出");

  const monthStr = staffData.month.trim();
  const month = parseInt(monthStr.slice(-2)) || (new Date().getMonth() + 1);
  const rocYearNum = appConfig?.roc_year || (new Date().getFullYear() - 1911);
  const year = rocYearNum + 1911;
  const lastDay = new Date(year, month, 0).getDate();
  const rocYearStr = rocYearNum.toString();

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

    // --- 1. 佈局與繼承樣式同步 ---
    if (templateSheet.columns) {
      templateSheet.columns.forEach((col, idx) => {
        const nCol = newSheet.getColumn(idx + 1);
        nCol.width = col.width ? col.width + 1 : undefined; 
        nCol.hidden = col.hidden;
        if (col.font) nCol.font = { ...col.font };
        if (col.fill) nCol.fill = { ...col.fill } as any;
        if (col.alignment) nCol.alignment = { ...col.alignment };
        if (col.border) nCol.border = { ...col.border };
      });
    }

    templateSheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      const newRow = newSheet.getRow(rowNumber);
      newRow.height = row.height;
      if (row.font) newRow.font = { ...row.font };
      if (row.fill) newRow.fill = { ...row.fill } as any;
      if (row.alignment) newRow.alignment = { ...row.alignment };
      if (row.border) newRow.border = { ...row.border };

      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const newCell = newRow.getCell(colNumber);
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

    newSheet.pageSetup = JSON.parse(JSON.stringify(templateSheet.pageSetup || {}));

    // --- 2. 標籤定位與資料填充 ---
    let dateRow = 0, dateCol = 0, nameRow = 0, nameCol = 0, idRow = 0, idCol = 0, carRow = 0, carCol = 0;
    
    newSheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        if (typeof cell.value === 'string') {
          let text = cell.value;
          if (text.includes('{{year}}')) text = text.replace(/\{\{year\}\}/g, `    ${rocYearStr}    `);
          if (text.includes('{{month}}')) text = text.replace(/\{\{month\}\}/g, `  ${month.toString()}  `);
          if (text.includes('{{name}}')) text = text.replace(/\{\{name\}\}/g, info.name);
          if (text.includes('{{emp_id}}')) text = text.replace(/\{\{emp_id\}\}/g, `店${empId}`);
          if (text.includes('{{car_plate}}')) text = text.replace(/\{\{car_plate\}\}/g, info.cars[0] || "");
          
          if (text.includes('{{date_row}}')) {
            dateRow = rowNumber;
            dateCol = colNumber;
            cell.value = 1;
          } else {
            cell.value = text;
          }
        }
      });
    });

    if (dateRow && dateCol) {
      for (let day = 1; day <= 31; day++) {
        const dateCell = newSheet.getRow(dateRow).getCell(dateCol + day - 1);
        if (day > lastDay) {
          dateCell.value = "";
          for (let r = 1; r <= roleConfig.rows; r++) {
             newSheet.getRow(dateRow + r).getCell(dateCol + day - 1).fill = WHITE_FILL;
          }
        } else {
          dateCell.value = day;
          const currentDate = new Date(year, month - 1, day);
          const fillStyle = isOffDay(currentDate, rules) ? GRAY_FILL : WHITE_FILL;
          for (let r = 1; r <= roleConfig.rows; r++) {
             newSheet.getRow(dateRow + r).getCell(dateCol + day - 1).fill = fillStyle;
          }
        }
      }
    }

    if (carRow && carCol) {
      for (let i = 1; i < roleConfig.rows; i++) {
        if (info.cars[i]) {
          newSheet.getRow(carRow + i).getCell(carCol).value = info.cars[i];
          newSheet.getRow(nameRow + i).getCell(nameCol).value = info.name;
          newSheet.getRow(idRow + i).getCell(idCol).value = `店${empId}`;
        }
      }
    }

    // --- 3. 最終步驟：合併儲存格與聯集邊框修復 (確保 C3 上框線等細節不丟失)
    const merges = (templateSheet.model as { merges?: string[] }).merges || [];
    merges.forEach((m) => { newSheet.mergeCells(m); });

    // --- 終極邊框同步 pass (確保 C3 上框線等細節不丟失) ---
    templateSheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        if (cell.border) {
          newSheet.getRow(rowNumber).getCell(colNumber).border = JSON.parse(JSON.stringify(cell.border));
        }
      });
    });

    const shift = staffData.people[empId]?.header.shift;
    newSheet.properties.tabColor = { argb: shift === '早班' ? 'FF00B050' : 'FF4472C4' };

    newSheet.views = [{ zoomScale: 57 }];
  }

  for (const role in ROLE_CONFIG) {
    const sheet = workbook.getWorksheet(ROLE_CONFIG[role].template_name);
    if (sheet) workbook.removeWorksheet(sheet.id);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
