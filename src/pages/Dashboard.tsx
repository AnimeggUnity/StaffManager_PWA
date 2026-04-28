import { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  Users,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
  FileText,
  Trash2,
  BarChart3,
  RefreshCcw,
  XCircle,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { useStaffStore } from '../store/useStaffStore';
import { parseStaffExcel } from '../lib/algorithms/ExcelLoader';
import { parseOvertimeWord } from '../lib/algorithms/overtimeParser';
import { cn } from '../lib/utils';
import type { LogMessage } from '../types';

export function Dashboard() {
  const { staffData, config, isLoading, setStaffData, setYear, setMonth, clearData, clearAllRecords } = useStaffStore();

  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<LogMessage[]>([]);
  const [defaultDate, setDefaultDate] = useState('');

  const staffInputRef = useRef<HTMLInputElement>(null);
  const wordInputRef = useRef<HTMLInputElement>(null);

  const addMsg = (level: LogMessage['level'], text: string) =>
    setMessages(prev => [...prev, { level, text }]);

  const stats = [
    { label: '總員工數', value: staffData ? Object.keys(staffData.people).length : 0, unit: '位', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: '目前月份', value: staffData?.month || '未載入', unit: '月', icon: FileSpreadsheet, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: '司機人數', value: staffData ? Object.keys(staffData.drivers || {}).length : 0, unit: '位', icon: BarChart3, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: '民國年份', value: config?.roc_year || '---', unit: '年', icon: ArrowUpRight, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  const handleStaffUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    setMessages([]);
    try {
      const buffer = await file.arrayBuffer();
      const data = await parseStaffExcel(buffer);
      const { targetMonth } = useStaffStore.getState();
      if (targetMonth) data.month = targetMonth;
      await setStaffData(data);
      (data.debugInfo || []).forEach((t: string) => addMsg('info', t));
      addMsg('info', `成功載入 ${Object.keys(data.people).length} 位員工資料`);
    } catch (err: unknown) {
      addMsg('error', err instanceof Error ? err.message : String(err));
      if (staffInputRef.current) staffInputRef.current.value = '';
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWordUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !staffData) return;
    setIsProcessing(true);
    setMessages(prev => [...prev.filter(m => m.level === 'info')]);
    try {
      const buffer = await file.arrayBuffer();
      const { data, warnings, month } = await parseOvertimeWord(buffer, staffData, defaultDate || undefined);
      if (month) data.month = month;
      await setStaffData(data);
      addMsg('info', `解析完成${month ? `，偵測到月份：${month} 月` : ''}`);
      setMessages(prev => [...prev, ...warnings]);
    } catch (err: unknown) {
      addMsg('error', `Word 解析失敗：${err instanceof Error ? err.message : String(err)}`);
      if (wordInputRef.current) wordInputRef.current.value = '';
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFullClear = async () => {
    await clearData();
    setMessages([]);
    setDefaultDate('');
    if (staffInputRef.current) staffInputRef.current.value = '';
    if (wordInputRef.current) wordInputRef.current.value = '';
  };

  const handleClearOvertimeOnly = async () => {
    await clearAllRecords();
    setMessages(prev => [...prev]);
    if (wordInputRef.current) wordInputRef.current.value = '';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const hasOvertimeData = staffData && Object.values(staffData.people).some(p => p.records.length > 0);

  const errors   = messages.filter(m => m.level === 'error');
  const warnings = messages.filter(m => m.level === 'warning');
  const infos    = messages.filter(m => m.level === 'info');

  const logPanels = [
    {
      level: 'error' as const,
      label: '嚴重問題',
      icon: XCircle,
      items: errors,
      header: 'bg-red-600',
      body: 'bg-red-50 border-red-200',
      text: 'text-red-800',
      empty: 'text-red-300',
    },
    {
      level: 'warning' as const,
      label: '注意',
      icon: AlertTriangle,
      items: warnings,
      header: 'bg-amber-500',
      body: 'bg-amber-50 border-amber-200',
      text: 'text-amber-800',
      empty: 'text-amber-300',
    },
    {
      level: 'info' as const,
      label: '系統訊息',
      icon: Info,
      items: infos,
      header: 'bg-emerald-600',
      body: 'bg-emerald-50 border-emerald-200',
      text: 'text-emerald-800',
      empty: 'text-emerald-300',
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">系統總覽中心</h1>
          <p className="text-slate-500 mt-1 font-medium">即時數據監控與資料來源載入</p>
        </div>
        <div className="flex items-center space-x-3">
          {hasOvertimeData && (
            <button onClick={handleClearOvertimeOnly} className="flex items-center px-4 py-2 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-xl text-sm font-bold transition-all border border-amber-100">
              <RefreshCcw className="w-4 h-4 mr-2" />
              僅清空加班單
            </button>
          )}
          {staffData && (
            <button onClick={handleFullClear} className="flex items-center px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl text-sm font-bold transition-all border border-red-100">
              <Trash2 className="w-4 h-4 mr-2" />
              全部清除
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xl shadow-slate-100/50 flex items-start space-x-4">
            <div className={`p-4 rounded-2xl ${stat.bg}`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
              {stat.label === '民國年份' ? (
                <div className="flex items-center">
                  <input type="number" value={config?.roc_year || ''} onChange={(e) => setYear(parseInt(e.target.value) || 0)} className="text-3xl font-black text-slate-900 bg-transparent border-b-2 border-transparent focus:border-purple-300 outline-none w-20 transition-all" />
                  <span className="text-base text-slate-400 font-bold ml-1">{stat.unit}</span>
                </div>
              ) : stat.label === '目前月份' ? (
                <div className="flex items-center">
                  <input type="text" value={staffData?.month || ''} placeholder="未載入" onChange={(e) => setMonth(e.target.value)} className="text-3xl font-black text-slate-900 bg-transparent border-b-2 border-transparent focus:border-emerald-300 outline-none w-24 transition-all placeholder:text-slate-300" />
                  <span className="text-base text-slate-400 font-bold ml-1">{stat.unit}</span>
                </div>
              ) : (
                <p className="text-3xl font-black text-slate-900">{stat.value} <span className="text-base text-slate-400 font-bold">{stat.unit}</span></p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Upload Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Excel Upload */}
        <div className={cn("p-6 rounded-3xl border-2 border-dashed transition-all relative overflow-hidden group bg-white", staffData ? "border-emerald-200" : "border-slate-200 hover:border-blue-400")}>
          <div className="flex items-center justify-between mb-6">
            <div className="p-3 bg-blue-50 rounded-xl"><FileSpreadsheet className="w-6 h-6 text-blue-600" /></div>
            {staffData && <CheckCircle2 className="w-6 h-6 text-emerald-500" />}
          </div>
          <h3 className="text-lg font-black text-slate-800">員工綜合名單 (.xlsx)</h3>
          <p className="text-sm text-slate-400 font-medium mb-6 leading-relaxed">包含早晚班名單與車務管理對位表</p>
          <input type="file" ref={staffInputRef} accept=".xlsx" onChange={handleStaffUpload} className="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-black file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer" />
        </div>

        {/* Word Upload */}
        <div className={cn("p-6 rounded-3xl border-2 border-dashed transition-all bg-white", !staffData ? "border-slate-100 opacity-60 grayscale" : "border-emerald-200 hover:border-emerald-400")}>
          <div className="flex items-center justify-between mb-6">
            <div className="p-3 bg-emerald-50 rounded-xl"><FileText className="w-6 h-6 text-emerald-600" /></div>
            {isProcessing && <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />}
          </div>
          <h3 className="text-lg font-black text-slate-800">月份加班單 (.docx)</h3>
          <p className="text-sm text-slate-400 font-medium mb-6 leading-relaxed">讀取 Word 表格中的加班時數與事由</p>
          <div className="space-y-4">
            <input type="text" placeholder="預設日期 e.g. 03/01 (選填)" value={defaultDate} onChange={(e) => setDefaultDate(e.target.value)} className="w-full text-sm bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 focus:ring-4 focus:ring-emerald-100 outline-none transition-all placeholder:text-slate-300 font-bold" />
            <input type="file" ref={wordInputRef} disabled={!staffData} accept=".docx" onChange={handleWordUpload} className="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-black file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 disabled:opacity-50 cursor-pointer" />
          </div>
        </div>
      </div>

      {/* Three-Column Log */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {logPanels.map(panel => (
          <div key={panel.level} className={cn("rounded-2xl border overflow-hidden", panel.body)}>
            {/* Panel Header */}
            <div className={cn("flex items-center justify-between px-4 py-3", panel.header)}>
              <div className="flex items-center space-x-2">
                <panel.icon className="w-4 h-4 text-white" />
                <span className="text-sm font-black text-white">{panel.label}</span>
              </div>
              <span className="text-xs font-black text-white/80 bg-white/20 px-2 py-0.5 rounded-full">
                {panel.items.length}
              </span>
            </div>
            {/* Panel Body */}
            <div className="p-3 h-48 overflow-y-auto space-y-1.5">
              {panel.items.length === 0 ? (
                <p className={cn("text-xs italic text-center mt-16", panel.empty)}>無訊息</p>
              ) : (
                panel.items.map((msg, i) => (
                  <div key={i} className={cn("text-xs font-medium leading-relaxed px-2 py-1.5 rounded-lg bg-white/60", panel.text)}>
                    {msg.text}
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Clear log button */}
      {messages.length > 0 && (
        <div className="flex justify-end">
          <button onClick={() => setMessages([])} className="text-xs text-slate-400 hover:text-slate-600 underline transition-colors">
            清除所有訊息
          </button>
        </div>
      )}
    </div>
  );
}
