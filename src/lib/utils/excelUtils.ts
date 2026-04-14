import ExcelJS from 'exceljs';

/**
 * 從 ExcelJS 的單元格值中提取純文字 (支援 String 與 RichText)
 */
export function getCellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  
  if (typeof value === 'string') return value;
  
  if (typeof value === 'object' && 'richText' in value && Array.isArray(value.richText)) {
    return value.richText.map((rt: any) => rt.text || "").join("");
  }
  
  // 處理連結或其他類型
  if (typeof value === 'object' && 'text' in value) {
    return String((value as any).text);
  }

  return String(value);
}

/**
 * 替換單元格中的標籤，如果是 RichText 則保留格式
 */
export function replaceTags(value: ExcelJS.CellValue, replacements: Record<string, string>): ExcelJS.CellValue {
  if (value === null || value === undefined) return value;

  // 1. 處理字串
  if (typeof value === 'string') {
    let content = value;
    Object.entries(replacements).forEach(([k, v]) => {
      // 支援 {{key}} 格式
      const regex = new RegExp(`\\{\\{${k}\\}\\}`, 'g');
      content = content.replace(regex, v || "");
    });
    return content;
  }

  // 2. 處理富文本 (Rich Text)
  if (typeof value === 'object' && 'richText' in value && Array.isArray(value.richText)) {
    const newRichText = value.richText.map((rt: any) => {
      let content = rt.text || "";
      Object.entries(replacements).forEach(([k, v]) => {
        const regex = new RegExp(`\\{\\{${k}\\}\\}`, 'g');
        content = content.replace(regex, v || "");
      });
      return { ...rt, text: content };
    });
    return { richText: newRichText };
  }

  return value;
}
