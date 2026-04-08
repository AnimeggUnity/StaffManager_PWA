import { useState } from 'react';
import ExcelJS from 'exceljs';

export function ExcelReader() {
  const [status, setStatus] = useState<string>('尚未載入檔案');
  const [employeeCount, setEmployeeCount] = useState<number>(0);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setStatus(`正在讀取: ${file.name}...`);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const allSheets = workbook.worksheets.map(s => s.name);
      
      const employeeIds = new Set<string>();
      
      // 比照 Python 版邏輯，讀取早班與晚班名單
      ['早班名單', '晚班名單'].forEach(name => {
        const sheet = workbook.getWorksheet(name);
        if (sheet) {
          // 假設第一列是標題，從第二列開始讀取
          sheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) {
              const id = row.getCell(1).value?.toString().trim();
              if (id) employeeIds.add(id);
            }
          });
        }
      });

      setEmployeeCount(employeeIds.size);
      setStatus(`成功解析 Excel！(偵測到工作表: ${allSheets.join(', ')})`);
    } catch (error: any) {
      console.error(error);
      setStatus(`讀取失敗: ${error.message}`);
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200">
      <h2 className="text-xl font-bold mb-4 text-slate-800">1. Excel 讀取測試 (ExcelJS)</h2>
      <p className="text-slate-600 mb-4 text-sm">請選擇專案目錄中的 input/綜合資料來源.xlsx 進行測試</p>
      
      <input 
        type="file" 
        accept=".xlsx"
        onChange={handleFileUpload}
        className="block w-full text-sm text-slate-500
          file:mr-4 file:py-2 file:px-4
          file:rounded-full file:border-0
          file:text-sm file:font-semibold
          file:bg-blue-50 file:text-blue-700
          hover:file:bg-blue-100 mb-4"
      />
      
      <div className="bg-slate-50 p-4 rounded-lg">
        <p className="font-medium text-slate-700">狀態: <span className="text-blue-600">{status}</span></p>
        {employeeCount > 0 && (
          <p className="mt-2 text-green-600 font-bold">✓ 成功識別到 {employeeCount} 項員工資料</p>
        )}
      </div>
    </div>
  );
}
