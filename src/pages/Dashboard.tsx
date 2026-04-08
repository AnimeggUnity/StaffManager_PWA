import { useState } from 'react';
import { 
  FileSpreadsheet, 
  Users, 
  AlertCircle, 
  CheckCircle2,
  ArrowUpRight,
  FileText,
  Trash2,
  BarChart3
} from 'lucide-react';
import { useStaffStore } from '../store/useStaffStore';
import { parseStaffExcel } from '../lib/algorithms/ExcelLoader';
import { parseOvertimeWord } from '../lib/algorithms/overtimeParser';
import { cn } from '../lib/utils';

export function Dashboard() {
  const { staffData, config, isLoading, setStaffData, clearData } = useStaffStore();
  
  // 遷移自 DataManagement 的狀態
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [defaultDate, setDefaultDate] = useState('');

  const stats = [
    { 
      label: '總員工數', 
      value: staffData ? Object.keys(staffData.people).length : 0, 
      unit: '位',
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    { 
      label: '目前月份', 
      value: staffData?.month || '未載入', 
      unit: '月',
      icon: FileSpreadsheet,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50'
    },
    { 
      label: '司機人數', 
      value: staffData ? Object.keys(staffData.drivers || {}).length : 0, 
      unit: '位',
      icon: BarChart3,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50'
    },
    { 
      label: '民國年份', 
      value: config?.roc_year || '---', 
      unit: '年',
      icon: ArrowUpRight,
      color: 'text-purple-600',
      bg: 'bg-purple-50'
    },
  ];

  const handleStaffUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    setMessages(['正在解析員工名單 Excel...']);
    try {
      const buffer = await file.arrayBuffer();
      const data = await parseStaffExcel(buffer);
      const { targetMonth } = useStaffStore.getState();
      if (targetMonth) data.month = targetMonth;
      await setStaffData(data);
      setMessages(prev => [
        ...prev, 
        ...(data.debugInfo || []),
        `✓ 成功載入 ${Object.keys(data.people).length} 位員工資料`
      ]);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setMessages(prev => [...prev, `✗ 錯誤: ${errorMsg}`]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWordUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !staffData) return;
    setIsProcessing(true);
    setMessages(prev => [...prev, `正在解析 Word 加班單: ${file.name}...`]);
    try {
      const buffer = await file.arrayBuffer();
      const { data, warnings, month } = await parseOvertimeWord(buffer, staffData, defaultDate || undefined);
      if (month) data.month = month;
      await setStaffData(data);
      setMessages(prev => [
        ...prev, 
        `✓ 解析完成！${month ? `(偵測到月份: ${month}月)` : ''}`,
        ...warnings.map(w => `⚠ ${w}`)
      ]);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setMessages(prev => [...prev, `✗ Word 解析失敗: ${errorMsg}`]);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">系統總覽中心</h1>
          <p className="text-slate-500 mt-1 font-medium">即時數據監控與資料來源載入</p>
        </div>
        {staffData && (
          <button 
            onClick={clearData}
            className="flex items-center px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl text-sm font-bold transition-all border border-red-100"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            清除所有載入資料
          </button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xl shadow-slate-100/50 flex items-start space-x-4">
            <div className={`p-4 rounded-2xl ${stat.bg}`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-3xl font-black text-slate-900">{stat.value} <span className="text-base text-slate-400 font-bold">{stat.unit}</span></p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Upload Tools (Span 7) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Excel Upload */}
            <div className={cn(
              "p-6 rounded-3xl border-2 border-dashed transition-all relative overflow-hidden group bg-white",
              staffData ? "border-emerald-200" : "border-slate-200 hover:border-blue-400"
            )}>
              <div className="flex items-center justify-between mb-6">
                <div className="p-3 bg-blue-50 rounded-xl">
                  <FileSpreadsheet className="w-6 h-6 text-blue-600" />
                </div>
                {staffData && <CheckCircle2 className="w-6 h-6 text-emerald-500" />}
              </div>
              <h3 className="text-lg font-black text-slate-800">員工綜合名單 (.xlsx)</h3>
              <p className="text-sm text-slate-400 font-medium mb-6 leading-relaxed">包含早晚班名單與車務管理對位表</p>
              
              <div className="space-y-4">
                <input 
                  type="file" 
                  accept=".xlsx"
                  onChange={handleStaffUpload}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-black file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                />
              </div>
            </div>

            {/* Word Upload */}
            <div className={cn(
              "p-6 rounded-3xl border-2 border-dashed transition-all bg-white",
              !staffData ? "border-slate-100 opacity-60 grayscale" : "border-emerald-200 hover:border-emerald-400"
            )}>
              <div className="flex items-center justify-between mb-6">
                <div className="p-3 bg-emerald-50 rounded-xl">
                  <FileText className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
              <h3 className="text-lg font-black text-slate-800">月份加班單 (.docx)</h3>
              <p className="text-sm text-slate-400 font-medium mb-6 leading-relaxed">讀取 Word 表格中的加班時數與事由</p>
              
              <div className="space-y-4">
                <input 
                  type="text" 
                  placeholder="預設日期 e.g. 03/01 (選填)"
                  value={defaultDate}
                  onChange={(e) => setDefaultDate(e.target.value)}
                  className="w-full text-sm bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 focus:ring-4 focus:ring-emerald-100 outline-none transition-all placeholder:text-slate-300 font-bold"
                />
                <input 
                  type="file" 
                  disabled={!staffData}
                  accept=".docx"
                  onChange={handleWordUpload}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-black file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 disabled:bg-slate-200 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Log & Tips (Span 5) */}
        <div className="lg:col-span-5 space-y-6">
          {/* System Log */}
          <div className="bg-slate-900 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center">
                <div className={cn("w-2 h-2 rounded-full mr-2", isProcessing ? "bg-blue-500 animate-pulse" : "bg-emerald-500")}></div>
                執行日誌 Log
              </h3>
              {messages.length > 0 && (
                <button onClick={() => setMessages([])} className="text-[10px] text-slate-600 hover:text-slate-400 underline">清除日誌</button>
              )}
            </div>
            
            <div className="space-y-2 h-[260px] overflow-y-auto pr-2 custom-scrollbar">
              {messages.length === 0 ? (
                <p className="text-slate-700 italic text-sm py-20 text-center uppercase tracking-tighter">Waiting for operations...</p>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className="flex items-start group">
                    <span className="text-[10px] text-slate-700 mr-2 mt-1 font-mono">[{new Date().toLocaleTimeString('zh-TW', {hour12: false})}]</span>
                    <p className={cn(
                      "text-sm font-medium leading-relaxed",
                      msg.startsWith('✓') ? "text-emerald-400" : 
                      msg.startsWith('✗') ? "text-red-400" : 
                      msg.startsWith('⚠') ? "text-amber-400" : "text-slate-300"
                    )}>
                      {msg}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Tips */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50">
            <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-indigo-500" />
              數據準備規範
            </h3>
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-2xl flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mr-3 shrink-0"></span>
                <p className="text-xs text-slate-600 font-bold">請確保 Word 導出的表格保持原狀（勿隨意合併單格）</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mr-3 shrink-0"></span>
                <p className="text-xs text-slate-600 font-bold">手動指定月份優先權高於自動偵測</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
