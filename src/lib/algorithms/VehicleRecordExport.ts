import ExcelJS from 'exceljs';
import type { StaffData, AppConfig, SpecialRules } from '../../types';
import { getCellText, replaceTags } from '../utils/excelUtils';

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
        const text = getCellText(cell.value);
        if (text.includes('{{')) {
          const replacements = {
            year: rocYearStr,
            month: month.toString(),
            car_plate: vehicle.plate,
            order_com: vehicle.extra || ""
          };
          cell.value = replaceTags(cell.value, replacements);
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
    merges.forEach((m) => { newSheet.mergeCells(m); });

    // --- 終極邊框同步 pass (雙向推斷：slave格與fill覆蓋格均可補回邊框) ---
    const tRowCount = templateSheet.rowCount;
    const tColCount = templateSheet.columnCount;
    for (let r = 1; r <= tRowCount; r++) {
      for (let c = 1; c <= tColCount; c++) {
        const tCell = templateSheet.getRow(r).getCell(c);
        const directBorder = tCell.border || {};
        const effectiveBorder: Partial<ExcelJS.Borders> = { ...directBorder };

        // 向上鄰格推斷 top border
        if (!effectiveBorder.top && r > 1) {
          const above = templateSheet.getRow(r - 1).getCell(c);
          if (above.border?.bottom) effectiveBorder.top = above.border.bottom;
        }
        // 向下鄰格推斷 bottom border
        if (!effectiveBorder.bottom && r < tRowCount) {
          const below = templateSheet.getRow(r + 1).getCell(c);
          if (below.border?.top) effectiveBorder.bottom = below.border.top;
        }
        // 向左鄰格推斷 left border
        if (!effectiveBorder.left && c > 1) {
          const leftCell = templateSheet.getRow(r).getCell(c - 1);
          if (leftCell.border?.right) effectiveBorder.left = leftCell.border.right;
        }
        // 向右鄰格推斷 right border
        if (!effectiveBorder.right && c < tColCount) {
          const rightCell = templateSheet.getRow(r).getCell(c + 1);
          if (rightCell.border?.left) effectiveBorder.right = rightCell.border.left;
        }

        if (Object.keys(effectiveBorder).length > 0) {
          newSheet.getRow(r).getCell(c).border = JSON.parse(JSON.stringify(effectiveBorder));
        }
      }
    }

    // 強制列印設定：0.25邊界與單頁縮放
    newSheet.pageSetup = {
      ...JSON.parse(JSON.stringify(templateSheet.pageSetup || {})),
      margins: { left: 0.25, right: 0.25, top: 0.25, bottom: 0.25, header: 0.3, footer: 0.3 },
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
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
