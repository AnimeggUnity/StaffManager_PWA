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
  const day = date.getDay();
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

  const monthStr = staffData.month.trim();
  const month = parseInt(monthStr.slice(-2)) || (new Date().getMonth() + 1);
  const rocYearNum = appConfig?.roc_year || (new Date().getFullYear() - 1911);
  const year = rocYearNum + 1911;
  const lastDay = new Date(year, month, 0).getDate();
  const rocYearStr = rocYearNum.toString();

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

    // --- 1. 樣式同步 (1:1 繼承) ---
    if (templateSheet.columns) {
      templateSheet.columns.forEach((col, idx) => {
        const nCol = newSheet.getColumn(idx + 1);
        if (col.width) nCol.width = col.width + 1; 
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

    // --- 2. 標籤與資料填充 (改用全表掃描，確保處理複合字串如 '車號：{{car_plate}}') ---
    newSheet.eachRow(row => {
      row.eachCell(cell => {
        if (typeof cell.value === 'string') {
          let text = cell.value;
          if (text.includes('{{year}}')) text = text.replace(/\{\{year\}\}/g, rocYearStr);
          if (text.includes('{{month}}')) text = text.replace(/\{\{month\}\}/g, month.toString());
          if (text.includes('{{car_plate}}')) text = text.replace(/\{\{car_plate\}\}/g, vehicle.plate);
          if (text.includes('{{order_com}}')) text = text.replace(/\{\{order_com\}\}/g, vehicle.extra || "");
          cell.value = text;
        }
      });
    });

    const startRow = config.date_start_row;
    for (let day = 1; day <= 31; day++) {
      const targetRow = startRow + day - 1;
      const currentRow = newSheet.getRow(targetRow);
      const dateCell = currentRow.getCell(1);
      if (day > lastDay) {
        dateCell.value = "";
      } else {
        dateCell.value = day;
        const currentDate = new Date(year, month - 1, day);
        if (isOffDay(currentDate, rules)) {
          for (let col = 1; col <= 12; col++) {
            currentRow.getCell(col).fill = GRAY_FILL;
          }
        }
      }
    }

    // --- 3. 最終步驟：合併儲存格與聯集邊框修補 ---
    const merges = (templateSheet.model as { merges?: string[] }).merges || [];
    merges.forEach((m) => {
      newSheet.mergeCells(m);
      try {
        const [start, end] = m.split(':');
        if (start && end) {
          const startCell = templateSheet.getCell(start);
          const endCell = templateSheet.getCell(end);
          for (let r = Number(startCell.row); r <= Number(endCell.row); r++) {
            for (let c = Number(startCell.col); c <= Number(endCell.col); c++) {
              const tRow = templateSheet.getRow(r);
              const tCol = templateSheet.getColumn(c);
              const tCell = templateSheet.getCell(r, c);
              const combinedBorder: Partial<ExcelJS.Borders> = {
                top: tCell.border?.top || tRow.border?.top || tCol.border?.top,
                left: tCell.border?.left || tRow.border?.left || tCol.border?.left,
                bottom: tCell.border?.bottom || tRow.border?.bottom || tCol.border?.bottom,
                right: tCell.border?.right || tRow.border?.right || tCol.border?.right,
                diagonal: tCell.border?.diagonal || tRow.border?.diagonal,
              };
              const nCell = newSheet.getCell(r, c);
              if (combinedBorder.top || combinedBorder.left || combinedBorder.bottom || combinedBorder.right) {
                nCell.border = combinedBorder as ExcelJS.Borders;
              }
            }
          }
        }
      } catch (e) { /* ignore */ }
    });

    // 強制列印設定：確保寬度縮放至一頁 (Fit to One Page Width)
    newSheet.pageSetup = {
      ...JSON.parse(JSON.stringify(templateSheet.pageSetup || {})),
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0, // 0 代表高度自動分頁
      orientation: 'portrait'
    };
    newSheet.views = [{ zoomScale: 100 }];
  }

  for (const spec in TEMPLATE_CONFIG) {
    const sheet = workbook.getWorksheet(TEMPLATE_CONFIG[spec].sheet_name);
    if (sheet) workbook.removeWorksheet(sheet.id);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
