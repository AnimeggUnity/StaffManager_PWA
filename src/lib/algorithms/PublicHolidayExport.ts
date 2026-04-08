import ExcelJS from 'exceljs';
import type { StaffData, AppConfig, ManualOvertime } from '../../types';

export async function generatePublicHolidayReport(
  staffData: StaffData, 
  appConfig: AppConfig | null,
  holidayRecords: ManualOvertime['records']
): Promise<Blob> {
  const baseUrl = import.meta.env.BASE_URL || './';
  const response = await fetch(`${baseUrl}templates/public_holiday_overtime_template.xlsx`);
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
      });
    }

    templateSheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      const newRow = newSheet.getRow(rowNumber);
      newRow.height = row.height;
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

    const merges = (templateSheet.model as { merges?: string[] }).merges || [];
    merges.forEach((m) => {
      newSheet.mergeCells(m);
      
      // 修復合併區域邊框
      try {
        const [start, end] = m.split(':');
        if (start && end) {
          const startCell = newSheet.getCell(start);
          const endCell = newSheet.getCell(end);
          const masterBorder = startCell.border;

          if (masterBorder) {
            for (let r = Number(startCell.row); r <= Number(endCell.row); r++) {
              for (let c = Number(startCell.col); c <= Number(endCell.col); c++) {
                newSheet.getCell(r, c).border = { ...masterBorder };
              }
            }
          }
        }
      } catch (e) {
        // 靜默處理
      }
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
      let content = tag.template;
      Object.entries(globalValues).forEach(([k, v]) => {
        content = content.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v || "");
      });
      cell.value = content;
    });

    // 4. 填充假日紀錄 (9 槽位限制)
    const limitedRecords = filteredRecords.slice(0, 9);
    for (let slotIdx = 0; slotIdx < 9; slotIdx++) {
      const record = limitedRecords[slotIdx];
      const rowOffset = slotIdx * 2;
      
      let reps: Record<string, string>;
      if (!record) {
        reps = { date: "", sh_day: "", reason: "", sh: "", sm: "", eh: "", em: "", 
                 day_total: "", pay_hours: "", rest_hours: "", pay_check: "□", rest_check: "□" };
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
          pay_check: hrs > 0 ? "■" : "□", rest_check: "□"
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

    // 5. 清理標籤
    newSheet.eachRow(row => row.eachCell(cell => {
       if (typeof cell.value === 'string' && cell.value.includes('{{')) 
         cell.value = cell.value.replace(/\{\{[^}]+\}\}/g, "");
    }));

    newSheet.properties.tabColor = { argb: person.header.shift === '早班' ? 'FF00B050' : 'FF4472C4' };
  }

  workbook.removeWorksheet(templateSheet.id);
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
