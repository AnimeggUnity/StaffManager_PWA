import ExcelJS from 'exceljs';
import type { StaffData, AppConfig, ManualOvertime } from '../../types';
import { getCellText, replaceTags } from '../utils/excelUtils';

export async function generatePublicHolidayReport(
  staffData: StaffData, 
  appConfig: AppConfig | null,
  holidayRecords: ManualOvertime['records']
): Promise<Blob> {
  const baseUrl = import.meta.env.BASE_URL || './';
  const response = await fetch(`${baseUrl}templates/public_holiday_overtime_template.xlsx?v=${Date.now()}`);
  if (!response.ok) throw new Error("找不到國定假日模板");
  const arrayBuffer = await response.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);
  
  const templateSheet = workbook.getWorksheet(1);
  if (!templateSheet) throw new Error("模板內容錯誤");

  // 1. 抓取標籤樣板
  const globalTags: Array<{ r: number, c: number, template: string }> = [];
  const recordTags: Array<{ r: number, c: number, template: string }> = [];

  templateSheet.eachRow((row, rowNumber) => {
    row.eachCell((cell, colNumber) => {
      const val = getCellText(cell.value);
      if (val.includes('{{')) {
        if (val.includes('_n')) {
          recordTags.push({ r: rowNumber, c: colNumber, template: val });
        } else {
          globalTags.push({ r: rowNumber, c: colNumber, template: val });
        }
      }
    });
  });

  const rocYear = (appConfig?.roc_year || (new Date().getFullYear() - 1911)).toString();
  const people = Object.values(staffData.people);

  // 2. 為每個符合條件的員工生成分頁
  for (const person of people) {
    // 依據 Shift 條件篩選這名員工適用的假日紀錄
    const filteredRecords = holidayRecords.filter((hr: any) => 
      hr.shift === '全部' || hr.shift === person.header.shift
    );

    if (filteredRecords.length === 0) continue;

    const sheetName = person.header.emp_id;
    const newSheet = workbook.addWorksheet(sheetName);

    // --- 1:1 佈局同步 ---
    if (templateSheet.columns) {
      templateSheet.columns.forEach((col, idx) => {
        const nCol = newSheet.getColumn(idx + 1);
        if (idx + 1 === 13) nCol.width = 22.71; 
        else if (col.width) nCol.width = col.width + 1;
        nCol.hidden = col.hidden;
        // 同步整欄樣式
        if (col.font) nCol.font = { ...col.font };
        if (col.fill) nCol.fill = { ...col.fill } as any;
        if (col.alignment) nCol.alignment = { ...col.alignment };
        if (col.border) nCol.border = { ...col.border };
        if (col.numFmt) nCol.numFmt = col.numFmt;
      });
    }

    templateSheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      const newRow = newSheet.getRow(rowNumber);
      newRow.height = row.height;
      // 同步整列樣式
      if (row.font) newRow.font = { ...row.font };
      if (row.fill) newRow.fill = { ...row.fill } as any;
      if (row.alignment) newRow.alignment = { ...row.alignment };
      if (row.border) newRow.border = { ...row.border };
      if (row.numFmt) newRow.numFmt = row.numFmt;

      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const newCell = newRow.getCell(colNumber);

        // 改用精準屬性賦值，避免 JSON 轉換導致的樣式細節丟失 (解決 H6 斷線問題)
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

    // 3. 填充全域標籤
    const globalValues: Record<string, string> = {
      name: person.header.name,
      emp_id: person.header.emp_id,
      year: rocYear,
      month: staffData.month
    };
    globalTags.forEach(tag => {
      const cell = newSheet.getRow(tag.r).getCell(tag.c);
      cell.value = replaceTags(cell.value, globalValues);
    });

    // 4. 填充假日紀錄 (9 槽位限制)
    const distinctRows = [...new Set(recordTags.map(t => t.r))].sort((a, b) => a - b);
    const baseRows: number[] = [];
    if (distinctRows.length > 0) {
        baseRows.push(distinctRows[0]);
        if (distinctRows.length > 1 && distinctRows[1] === distinctRows[0] + 1) {
            baseRows.push(distinctRows[1]);
        }
    }
    const baseRecordTags = recordTags.filter(t => baseRows.includes(t.r));

    const limitedRecords = filteredRecords.slice(0, 9);
    for (let slotIdx = 0; slotIdx < 9; slotIdx++) {
      const record = limitedRecords[slotIdx];
      const rowOffset = slotIdx * 2;
      
      let reps: Record<string, string>;
      if (!record) {
        reps = { date: "", sh_day: "", reason: "", sh: "", sm: "", eh: "", em: "", 
                 day_total: "", pay_hours: "", rest_hours: "", pay_check: "□", rest_check: "□", repeat: "" };
      } else {
        const [sh, sm] = record.start_time.split(':');
        const [eh, em] = record.end_time.split(':');
        const hrs = record.hours || 0;
        reps = { 
          date: record.date.length === 4 ? `${record.date.substring(0, 2)}/${record.date.substring(2)}` : record.date, 
          sh_day: record.date.length === 4 ? record.date.substring(2) : record.date,
          reason: record.reason,
          sh: sh || "", sm: sm || "", eh: eh || "", em: em || "",
          day_total: hrs.toString(), pay_hours: hrs.toString(), rest_hours: "", 
          pay_check: hrs > 0 ? "■" : "□", rest_check: "□", repeat: ""
        };
      }

      baseRecordTags.forEach(tag => {
        const targetRow = tag.r + rowOffset;
        const cell = newSheet.getRow(targetRow).getCell(tag.c);
        
        // 建立專屬此 slot 的替換表
        const slotReps: Record<string, string> = {};
        Object.entries(reps).forEach(([k, v]) => {
          slotReps[`${k}_n`] = v;
        });
        
        cell.value = replaceTags(cell.value, slotReps);
      });
    }

    // --- 5. 同步合併儲存格與最終邊框修復 ---
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

    newSheet.properties.tabColor = { argb: 'FFFFC000' };
  }

  workbook.removeWorksheet(templateSheet.id);
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
