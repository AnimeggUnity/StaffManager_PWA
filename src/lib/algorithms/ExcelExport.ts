import ExcelJS from 'exceljs';
import type { StaffData, TimeRecord, AppConfig } from '../../types';

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
  const response = await fetch(`${baseUrl}templates/overtime_template.xlsx`);
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
      const val = cell.value;
      if (typeof val === 'string' && val.includes('{{')) {
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

  // 2. 總表實作 (橫向展開)
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

  // 3. 員工分頁 (高品質手動還原)
  for (const person of peopleSorted) {
    if (person.records.length === 0) continue;
    const chunks = [];
    for (let i = 0; i < person.records.length; i += 12) chunks.push(person.records.slice(i, i + 12));

    chunks.forEach((chunk, pageIdx) => {
      const sheetName = chunks.length > 1 ? `${person.header.emp_id}_${pageIdx + 1}` : person.header.emp_id;
      const newSheet = workbook.addWorksheet(sheetName);

      // --- 強化：同步欄位屬性並加入 1 單位緩衝 (解決斷行問題) ---
      if (templateSheet.columns) {
        templateSheet.columns.forEach((col, idx) => {
          const nCol = newSheet.getColumn(idx + 1);
          if (idx + 1 === 13) {
            nCol.width = 22.71; // 使用者指定的 M 欄精確寬度
          } else if (col.width) {
            nCol.width = col.width + 1; // 其他欄位保留 1 單位緩衝
          }
          nCol.hidden = col.hidden;
        });
      }

      // --- 2. 同步行高、樣式與內容 ---
      templateSheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
        const newRow = newSheet.getRow(rowNumber);
        newRow.height = row.height;
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          const newCell = newRow.getCell(colNumber);
          newCell.value = cell.value;
          if (cell.style) newCell.style = cell.style; // 直接引用樣式
        });
      });

      // --- 3. 同步合併儲存格 ---
      const merges = (templateSheet.model as { merges?: string[] }).merges || [];
      merges.forEach((m) => newSheet.mergeCells(m));

      // --- 4. 同步頁面佈局 (Page Setup) ---
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
        let content = tag.template;
        Object.entries(globalValues).forEach(([k, v]) => {
          content = content.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v || "");
        });
        cell.value = content;
      });

      // 填充加班槽位 (1-12 槽)
      for (let slotIdx = 0; slotIdx < 12; slotIdx++) {
        const record = chunk[slotIdx];
        const rowOffset = slotIdx * 2;
        let reps: Record<string, string>;
        if (!record) {
          reps = { date: "　　", sh_day: "　　", reason: "　　", sh: "　", sm: "　", eh: "　", em: "　", 
                   day_total: "　　", pay_hours: "　", rest_hours: "　", pay_check: "□", rest_check: "□", repeat: "　" };
        } else {
          const hrs = calculateHours(record);
          reps = { 
            date: applicationDate, sh_day: record.date.split('/')[1], reason: record.reason,
            sh: record.sh, sm: record.sm, eh: record.eh, em: record.em,
            day_total: hrs.toString(), pay_hours: hrs.toString(), rest_hours: "", 
            pay_check: hrs > 0 ? "■" : "□", rest_check: "□", repeat: ""
          };
        }
        recordTags.forEach(tag => {
          const targetRow = tag.r + rowOffset;
          const cell = newSheet.getRow(targetRow).getCell(tag.c);
          let content = tag.template;
          Object.entries(reps).forEach(([k, v]) => {
            content = content.replace(new RegExp(`\\{\\{${k}_n\\}\\}`, 'g'), v);
          });
          cell.value = content;
        });
      }

      // 清理
      newSheet.eachRow(row => row.eachCell(cell => {
         if (typeof cell.value === 'string' && cell.value.includes('{{')) 
           cell.value = cell.value.replace(/\{\{[^}]+\}\}/g, "");
      }));

      newSheet.properties.tabColor = { argb: person.header.shift === '早班' ? 'FF00B050' : 'FF4472C4' };
    });
  }

  workbook.removeWorksheet(templateSheet.id);
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
