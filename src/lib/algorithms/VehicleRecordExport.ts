import ExcelJS from 'exceljs';
import type { StaffData, AppConfig, SpecialRules } from '../../types';

const GRAY_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFD9D9D9' }
};



const TEMPLATE_CONFIG: Record<string, { sheet_name: string; date_start_row: number; date_end_row: number }> = {
  "資收班用車": {
    "sheet_name": "資收車",
    "date_start_row": 7,
    "date_end_row": 37
  },
  "鏟裝機": {
    "sheet_name": "鏟裝機",
    "date_start_row": 6,
    "date_end_row": 36
  }
};

function findTagCell(sheet: ExcelJS.Worksheet, tag: string): ExcelJS.Cell | null {
  const target = `{{${tag}}}`;
  let foundCell: ExcelJS.Cell | null = null;
  sheet.eachRow(row => {
    row.eachCell(cell => {
      if (typeof cell.value === 'string' && cell.value.includes(target)) {
        foundCell = cell;
      }
    });
  });
  return foundCell;
}

function replaceCellTag(cell: ExcelJS.Cell | null, tag: string, value: any) {
  if (!cell) return;
  const target = `{{${tag}}}`;
  if (typeof cell.value === 'string') {
    const valText = value === null || value === undefined ? "" : String(value);
    cell.value = cell.value.replace(target, valText);
  } else {
    cell.value = value;
  }
}

function isOffDay(date: Date, rules: SpecialRules | null): boolean {
  const mmdd = `${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
  
  if (rules?.manual_workdays?.includes(mmdd)) return false;
  if (rules?.manual_holidays?.includes(mmdd)) return true;
  
  const day = date.getDay(); // 0 is Sunday
  // 強制轉為數字進行比對，避免字串/數字衝突 (關鍵修正)
  const offWeekdays = (rules?.default_off_weekdays || [3, 0]).map(Number); 
  return offWeekdays.includes(day);
}

export async function generateVehicleRecordReport(staffData: StaffData, appConfig: AppConfig | null, rules: SpecialRules | null): Promise<Blob> {
  const baseUrl = import.meta.env.BASE_URL || './';
  const response = await fetch(`${baseUrl}templates/driverec_template.xlsx`);
  if (!response.ok) throw new Error("找不到車輛紀錄模板");
  const arrayBuffer = await response.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  const vehicles = staffData.vehicleRecords || [];
  if (vehicles.length === 0) throw new Error("沒有車輛資料可供產出");

  // 精確計算年份與月份 (與 Python _parse_month 完全對齊)
  const monthStr = staffData.month.trim();
  const month = parseInt(monthStr.slice(-2)) || (new Date().getMonth() + 1);
  
  // 計算年份 (優先使用設定中的民國年)
  const rocYearNum = appConfig?.roc_year || (new Date().getFullYear() - 1911);
  const year = rocYearNum + 1911;
  const lastDay = new Date(year, month, 0).getDate();
  const rocYearStr = rocYearNum.toString();

  // 1:1 克隆所有車種樣板
  const templates: Record<string, ExcelJS.Worksheet> = {};
  for (const spec in TEMPLATE_CONFIG) {
    const sheet = workbook.getWorksheet(TEMPLATE_CONFIG[spec].sheet_name);
    if (sheet) templates[spec] = sheet;
  }

  for (const vehicle of vehicles) {
    const config = TEMPLATE_CONFIG[vehicle.spec] || TEMPLATE_CONFIG["資收班用車"];
    const templateSheet = templates[vehicle.spec] || templates["資收班用車"];
    if (!templateSheet) continue;

    const newSheet = workbook.addWorksheet(vehicle.plate);

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

        // 使用精準屬性賦值，確保邊框細節不因 JSON 序列化而遺失
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
      
      // 框線強化修復程序 (1:1 模板同步)
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

    // --- 2. 標籤替換 (對齊 Python: 僅替換特定位置，非全域替換) ---
    const tagYear = findTagCell(newSheet, 'year');
    const tagMonth = findTagCell(newSheet, 'month');
    const tagPlate = findTagCell(newSheet, 'car_plate');
    const tagOrder = findTagCell(newSheet, 'order_com');

    replaceCellTag(tagYear, 'year', rocYearStr);
    replaceCellTag(tagMonth, 'month', month);
    replaceCellTag(tagPlate, 'car_plate', vehicle.plate);
    replaceCellTag(tagOrder, 'order_com', vehicle.extra || "");

    // --- 3. 1-31 日生成與塗灰邏輯 (只改 A 欄，其餘欄位禁止變動) ---
    const startRow = config.date_start_row;
    
    for (let day = 1; day <= 31; day++) {
      const targetRow = startRow + day - 1;
      const currentRow = newSheet.getRow(targetRow);
      const dateCell = currentRow.getCell(1); // A 欄
      
      if (day > lastDay) {
        dateCell.value = "";
      } else {
        dateCell.value = day;
        
        // 判定休假日 (與 Python _is_off_day 對應)
        const currentDate = new Date(year, month - 1, day);
        if (isOffDay(currentDate, rules)) {
          // 僅對 1-12 欄進行噴塗，不改動內容
          for (let col = 1; col <= 12; col++) {
            currentRow.getCell(col).fill = GRAY_FILL;
          }
        }
      }
    }
    newSheet.views = [{ zoomScale: 100 }];
  }

  // 移除原始模板
  for (const spec in TEMPLATE_CONFIG) {
    const sheet = workbook.getWorksheet(TEMPLATE_CONFIG[spec].sheet_name);
    if (sheet) workbook.removeWorksheet(sheet.id);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
