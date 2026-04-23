import ExcelJS from 'exceljs';
import type { StaffData, TimeRecord, AppConfig } from '../../types';
import { getCellText, replaceTags } from '../utils/excelUtils';

function calculateLastWorkingDay(monthStr: string): string {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = parseInt(monthStr);
    const firstDayOfCurrent = new Date(year, month - 1, 1);
    const lastDayOfPrev = new Date(firstDayOfCurrent.getTime() - 24 * 60 * 60 * 1000);
    while (lastDayOfPrev.getDay() === 3 || lastDayOfPrev.getDay() === 0) {
      lastDayOfPrev.setDate(lastDayOfPrev.getDate() - 1);
    }
    return `${(lastDayOfPrev.getMonth() + 1).toString().padStart(2, '0')}/${lastDayOfPrev.getDate().toString().padStart(2, '0')}`;
  } catch { return ""; }
}

function calculateHours(record: TimeRecord): number {
  if (record.manual_hours !== undefined && record.manual_hours !== null) return record.manual_hours;
  try {
    const sh = parseInt(record.sh);
    const eh = parseInt(record.eh);
    return isNaN(eh - sh) ? 0 : eh - sh;
  } catch { return 0; }
}

export async function generateExcelReport(staffData: StaffData, appConfig: AppConfig | null): Promise<Blob> {
  const baseUrl = import.meta.env.BASE_URL || './';
  const response = await fetch(`${baseUrl}templates/overtime_template.xlsx?v=${Date.now()}`);
  if (!response.ok) throw new Error("找不到 Excel 模板");
  const arrayBuffer = await response.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);
  
  const templateSheet = workbook.getWorksheet(1);
  if (!templateSheet) throw new Error("模板內容錯誤");

  // 1. 抓取標籤樣板 (Tag Discovery)
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
  const applicationDate = calculateLastWorkingDay(staffData.month);

  // 2. 總表實作 (還原回原本只有 工號、姓名 的狀態)
  const summarySheet = workbook.addWorksheet("加班明細", { properties: { tabColor: { argb: 'FF2F5597' } } });
  const peopleSorted = Object.values(staffData.people);
  const maxRecords = Math.max(...peopleSorted.map(p => p.records.length), 0);
  const header = ["工號", "姓名"];
  for (let i = 1; i <= maxRecords; i++) header.push(`日期${i}`, `地點${i}`);
  summarySheet.addRow(header);
  
  const headerRow = summarySheet.getRow(1);
  headerRow.height = 22;
  headerRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F5597' } };
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
  });

  summarySheet.getColumn(1).width = 10;
  summarySheet.getColumn(2).width = 12;
  for (let i = 0; i < maxRecords; i++) {
    summarySheet.getColumn(3 + i*2).width = 10;
    summarySheet.getColumn(4 + i*2).width = 14;
  }

  peopleSorted.forEach((person, idx) => {
    const rowData = [person.header.emp_id, person.header.name];
    person.records.forEach(r => rowData.push(r.date, r.reason));
    const row = summarySheet.addRow(rowData);
    const isEven = (idx + 1) % 2 === 0;
    row.eachCell((cell, colNum) => {
       cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
       cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
       if (isEven) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF6F7FB' } };
       if (colNum === 1 || (colNum >= 3 && (colNum - 3) % 2 === 0)) cell.font = { bold: true };
    });
  });
  
  summarySheet.views = [{ state: 'frozen', xSplit: 2, ySplit: 1 }];

  // 3. 員工分頁 (維持高品質同步)
  for (const person of peopleSorted) {
    const chunks: TimeRecord[][] = [];
    if (person.records.length === 0) {
      chunks.push([]); 
    } else {
      for (let i = 0; i < person.records.length; i += 12) {
        chunks.push(person.records.slice(i, i + 12));
      }
    }

    chunks.forEach((chunk, pageIdx) => {
      const sheetName = chunks.length > 1 ? `${person.header.emp_id}_${pageIdx + 1}` : person.header.emp_id;
      const newSheet = workbook.addWorksheet(sheetName);

      if (templateSheet.columns) {
        templateSheet.columns.forEach((col, idx) => {
          const nCol = newSheet.getColumn(idx + 1);
          if (idx + 1 === 13) nCol.width = 22.71; 
          else if (col.width) nCol.width = col.width + 1; 
          nCol.hidden = col.hidden;
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

      // 填充全域標籤
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

      // 填充加班槽位
      const distinctRows = [...new Set(recordTags.map(t => t.r))].sort((a, b) => a - b);
      const baseRows: number[] = [];
      if (distinctRows.length > 0) {
          baseRows.push(distinctRows[0]);
          if (distinctRows.length > 1 && distinctRows[1] === distinctRows[0] + 1) {
              baseRows.push(distinctRows[1]);
          }
      }
      const baseRecordTags = recordTags.filter(t => baseRows.includes(t.r));

      for (let slotIdx = 0; slotIdx < 12; slotIdx++) {
        const record = chunk[slotIdx];
        const rowOffset = slotIdx * 2;
        let reps: Record<string, string>;

        if (record) {
          const hrs = calculateHours(record);
          reps = { 
            date: applicationDate, 
            sh_day: record.date.split('/')[1] || "", 
            reason: record.reason || "",
            sh: record.sh, sm: record.sm, eh: record.eh, em: record.em,
            day_total: hrs.toString(), pay_hours: hrs.toString(), rest_hours: "", 
            pay_check: hrs > 0 ? "■" : "□", rest_check: "□", repeat: ""
          };
        } else if (person.records.length > 0) {
          const isEarly = person.header.shift === '早班';
          reps = {
            date: "", sh_day: "", reason: "", 
            sh: isEarly ? "18" : "08", 
            sm: "00", 
            eh: isEarly ? "22" : "12", 
            em: "00", 
            day_total: "4", pay_hours: "4", rest_hours: "", 
            pay_check: "■", rest_check: "□", repeat: ""
          };
        } else {
          reps = { 
            date: "", sh_day: "", reason: "", 
            sh: "", sm: "", eh: "", em: "", 
            day_total: "", pay_hours: "", rest_hours: "", 
            pay_check: "□", rest_check: "□", repeat: "" 
          };
        }

        baseRecordTags.forEach(tag => {
          const targetRow = tag.r + rowOffset;
          const targetCell = newSheet.getRow(targetRow).getCell(tag.c);
          
          // 如果處理的是第二筆（含）以上的資料，主動從模板基準格複製內容（含標籤點）過來
          if (slotIdx > 0) {
            const templateCell = templateSheet.getRow(tag.r).getCell(tag.c);
            targetCell.value = templateCell.value;
          }
          
          const slotReps: Record<string, string> = {};
          Object.entries(reps).forEach(([k, v]) => {
            slotReps[`${k}_n`] = v;
          });
          
          targetCell.value = replaceTags(targetCell.value, slotReps);
        });
      }

      newSheet.eachRow(row => row.eachCell(cell => {
         if (typeof cell.value === 'string' && cell.value.includes('{{')) 
           cell.value = cell.value.replace(/\{\{[^}]+\}\}/g, "");
      }));

      // --- 5. 同步合併儲存格與邊框修復 ---
      const merges = (templateSheet.model as { merges?: string[] }).merges || [];
      merges.forEach((m) => { newSheet.mergeCells(m); });

      const tRowCount = templateSheet.rowCount;
      const tColCount = templateSheet.columnCount;
      for (let r = 1; r <= tRowCount; r++) {
        for (let c = 1; c <= tColCount; c++) {
          const tCell = templateSheet.getRow(r).getCell(c);
          const directBorder = tCell.border || {};
          const effectiveBorder: Partial<ExcelJS.Borders> = { ...directBorder };

          if (!effectiveBorder.top && r > 1) {
            const above = templateSheet.getRow(r - 1).getCell(c);
            if (above.border?.bottom) effectiveBorder.top = above.border.bottom;
          }
          if (!effectiveBorder.bottom && r < tRowCount) {
            const below = templateSheet.getRow(r + 1).getCell(c);
            if (below.border?.top) effectiveBorder.bottom = below.border.top;
          }
          if (!effectiveBorder.left && c > 1) {
            const leftCell = templateSheet.getRow(r).getCell(c - 1);
            if (leftCell.border?.right) effectiveBorder.left = leftCell.border.right;
          }
          if (!effectiveBorder.right && c < tColCount) {
            const rightCell = templateSheet.getRow(r).getCell(c + 1);
            if (rightCell.border?.left) effectiveBorder.right = rightCell.border.left;
          }

          if (Object.keys(effectiveBorder).length > 0) {
            newSheet.getRow(r).getCell(c).border = JSON.parse(JSON.stringify(effectiveBorder));
          }
        }
      }

      newSheet.properties.tabColor = { argb: person.header.shift === '早班' ? 'FF00B050' : 'FF4472C4' };
    });
  }

  workbook.removeWorksheet(templateSheet.id);
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
