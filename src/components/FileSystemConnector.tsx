import { useState } from 'react';

export function FileSystemConnector() {
  const [status, setStatus] = useState<string>('未提供授權');
  const [configData, setConfigData] = useState<any>(null);

  const requestAccess = async () => {
    try {
      // 1. Request a directory handle
      const dirHandle = await (window as any).showDirectoryPicker({
        mode: 'read',
      });
      setStatus(`已獲得授權: ${dirHandle.name}`);

      // 2. Try to navigate to config/app_config.json
      try {
        const configDirHandle = await dirHandle.getDirectoryHandle('config');
        const fileHandle = await configDirHandle.getFileHandle('app_config.json');
        
        const file = await fileHandle.getFile();
        const text = await file.text();
        const json = JSON.parse(text);
        
        setConfigData(json);
        setStatus(`✓ 授權並成功讀取 config/app_config.json`);
      } catch (err: any) {
        setStatus(`取得授權，但找不到 config/app_config.json (錯誤: ${err.message})。請確保選擇了 staff_manager 根目錄！`);
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        setStatus('使用者取消了授權請求');
      } else {
        setStatus(`錯誤: ${error.message} (您的瀏覽器可能不支援 File System Access API)`);
      }
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200">
      <h2 className="text-xl font-bold mb-4 text-slate-800">3. 本機檔案直讀測試 (File System API)</h2>
      <p className="text-slate-600 mb-4 text-sm">點擊下方按鈕，並選擇 <b>staff_manager</b> 整個資料夾，我們將嘗試直接讀取你的 <code>config/app_config.json</code>。</p>
      
      <button 
        onClick={requestAccess}
        className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium transition-colors mb-4"
      >
        授權讀取本機資料夾
      </button>
      
      <div className="bg-slate-50 p-4 rounded-lg">
        <p className="font-medium text-slate-700 mb-2">狀態: <span className="text-purple-600">{status}</span></p>
        
        {configData && (
          <div className="mt-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">解析到的設定</p>
            <div className="bg-slate-800 text-pink-300 p-3 rounded-md text-sm font-mono overflow-x-auto">
              <pre>{JSON.stringify(configData, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
