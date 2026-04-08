import { useState } from 'react';
import mammoth from 'mammoth';

export function WordReader() {
  const [status, setStatus] = useState<string>('尚未載入檔案');
  const [extractedText, setExtractedText] = useState<string[]>([]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setStatus(`正在讀取: ${file.name}...`);
    try {
      const buffer = await file.arrayBuffer();
      
      // mammoth .docx to raw text
      const result = await mammoth.extractRawText({ arrayBuffer: buffer });
      
      const textLines = result.value.split('\n').filter(line => line.trim().length > 0);
      setExtractedText(textLines.slice(0, 10)); // Display only first 10 for PoC
      
      setStatus(`成功解析 Word！共 ${textLines.length} 行`);
    } catch (error: any) {
      console.error(error);
      setStatus(`讀取失敗: ${error.message}`);
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200">
      <h2 className="text-xl font-bold mb-4 text-slate-800">2. Word 純文字擷取測試 (mammoth.js)</h2>
      <p className="text-slate-600 mb-4 text-sm">請選擇 input/ 目錄下的其中一份 Word 加班單進行測試</p>
      
      <input 
        type="file" 
        accept=".docx"
        onChange={handleFileUpload}
        className="block w-full text-sm text-slate-500
          file:mr-4 file:py-2 file:px-4
          file:rounded-full file:border-0
          file:text-sm file:font-semibold
          file:bg-emerald-50 file:text-emerald-700
          hover:file:bg-emerald-100 mb-4"
      />
      
      <div className="bg-slate-50 p-4 rounded-lg">
        <p className="font-medium text-slate-700 mb-2">狀態: <span className="text-emerald-600">{status}</span></p>
        
        {extractedText.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">前 10 行預覽</p>
            <div className="bg-slate-800 text-green-400 p-3 rounded-md text-sm font-mono overflow-x-auto max-h-48 overflow-y-auto">
              {extractedText.map((line, idx) => (
                <div key={idx}>{line}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
