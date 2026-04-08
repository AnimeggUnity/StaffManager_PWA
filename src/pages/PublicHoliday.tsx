import { useState } from 'react';
import { useStaffStore } from '../store/useStaffStore';
import { Palmtree, Trash2, Plus, Download, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import type { PublicHolidayEntry } from '../types';
import { generatePublicHolidayReport } from '../lib/algorithms/PublicHolidayExport';

export function PublicHoliday() {
  const { staffData, config, setHolidayRecords } = useStaffStore();
  const [newEntry, setNewEntry] = useState<PublicHolidayEntry>({
    date: '', reason: '國定假日加班', start_time: '08:00', end_time: '16:00', shift: '全部'
  });
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const holidayRecords = staffData?.holidayRecords || [];

  const handleAdd = async () => {
    if (!newEntry.date || !newEntry.reason) return;
    const updated = [...holidayRecords, { ...newEntry }];
    await setHolidayRecords(updated);
    setNewEntry({ ...newEntry, date: '' }); // Reset date only
  };

  const handleRemove = async (index: number) => {
    const updated = holidayRecords.filter((_, i) => i !== index);
    await setHolidayRecords(updated);
  };

  const handleExport = async () => {
    if (!staffData || holidayRecords.length === 0) return;
    setIsExporting(true);
    setError(null);
    try {
      const blob = await generatePublicHolidayReport(staffData, config);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `國定假日加班單_${staffData.month}月.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '匯出失敗');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center">
            <div className="p-2 bg-indigo-600 rounded-xl mr-4 shadow-lg shadow-indigo-200">
              <Palmtree className="w-8 h-8 text-white" />
            </div>
            國定假日管理
          </h1>
          <p className="text-slate-500 mt-2 font-medium">1:1 連線 Python 邏輯 - 專屬 9 槽位報表模式</p>
        </div>

        <button
          onClick={handleExport}
          disabled={isExporting || holidayRecords.length === 0}
          className={cn(
            "flex items-center px-6 py-3 rounded-xl font-bold transition-all shadow-lg",
            holidayRecords.length > 0 
              ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100" 
              : "bg-slate-100 text-slate-400 cursor-not-allowed"
          )}
        >
          {isExporting ? <div className="animate-spin mr-2">⏳</div> : <Download className="w-5 h-5 mr-2" />}
          匯出國定假日報表 (Excel)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 新增區域 */}
        <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50">
          <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
             <Plus className="w-5 h-5 mr-2 text-indigo-600" /> 新增假日紀錄
          </h2>
          
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">日期 (MMDD)</label>
              <input 
                type="text" 
                placeholder="例如: 0101" 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                value={newEntry.date}
                onChange={(e) => setNewEntry({...newEntry, date: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">事由</label>
              <input 
                type="text" 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                value={newEntry.reason}
                onChange={(e) => setNewEntry({...newEntry, reason: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="block text-sm font-bold text-slate-600 mb-2">開始時間</label>
                 <input type="time" className="w-full px-3 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none" value={newEntry.start_time} onChange={(e)=>setNewEntry({...newEntry, start_time:e.target.value})} />
               </div>
               <div>
                 <label className="block text-sm font-bold text-slate-600 mb-2">結束時間</label>
                 <input type="time" className="w-full px-3 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none" value={newEntry.end_time} onChange={(e)=>setNewEntry({...newEntry, end_time:e.target.value})} />
               </div>
            </div>

            <div>
               <label className="block text-sm font-bold text-slate-600 mb-2">適用班別</label>
               <div className="flex p-1 bg-slate-100 rounded-xl">
                  {(['全部', '早班', '晚班'] as const).map(s => (
                    <button 
                       key={s}
                       onClick={() => setNewEntry({...newEntry, shift: s})}
                       className={cn(
                        "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
                        newEntry.shift === s ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                       )}
                    >
                      {s}
                    </button>
                  ))}
               </div>
            </div>

            <button 
              onClick={handleAdd}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 mt-4 active:scale-95"
            >
              加入清單
            </button>
          </div>
        </div>

        {/* 列表區域 */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start">
             <AlertCircle className="w-5 h-5 text-amber-600 mr-3 mt-0.5" />
             <div className="text-sm text-amber-800 leading-relaxed">
                <strong>1:1 規則提示：</strong> 國定假日報表每人分頁上限為 <strong>9 筆</strong>。若超過上限，請考慮分拆月份匯出以維持格式正確。
             </div>
          </div>

          {holidayRecords.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-100 rounded-3xl p-20 flex flex-col items-center justify-center text-slate-400">
               <Palmtree className="w-16 h-16 mb-4 opacity-20" />
               <p className="font-medium">尚未加入任何國定假日紀錄</p>
            </div>
          ) : (
            holidayRecords.map((item, idx) => (
              <div key={idx} className="group bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <div className="w-16 h-16 bg-slate-50 rounded-xl flex flex-col items-center justify-center border border-slate-100">
                    <span className="text-xs font-bold text-slate-400">DATE</span>
                    <span className="text-lg font-black text-indigo-600 font-mono tracking-tighter">{item.date}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-black text-slate-800">{item.reason}</h3>
                      <span className={cn(
                        "px-2 py-0.5 text-[10px] font-black rounded-md uppercase tracking-wider",
                        item.shift === '全部' ? "bg-slate-100 text-slate-600" :
                        item.shift === '早班' ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                      )}>
                        {item.shift}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-400">{item.start_time} - {item.end_time}</p>
                  </div>
                </div>
                
                <button 
                   onClick={() => handleRemove(idx)}
                   className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
      
      {error && (
        <div className="mt-8 p-4 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 flex items-center font-bold">
           <AlertCircle className="w-5 h-5 mr-3" />
           {error}
        </div>
      )}
    </div>
  );
}
