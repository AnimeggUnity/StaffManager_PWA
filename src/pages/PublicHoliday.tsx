import { useState, useMemo } from 'react';
import { useStaffStore } from '../store/useStaffStore';
import { 
  Palmtree, 
  Download, 
  AlertCircle, 
  Search,
  Users,
  CalendarDays
} from 'lucide-react';
import { cn } from '../lib/utils';
import { generatePublicHolidayReport } from '../lib/algorithms/PublicHolidayExport';
import { PublicHolidayModal } from '../components/modals/PublicHolidayModal';

export function PublicHoliday() {
  const { staffData, config, holidayRules, setHolidayRules } = useStaffStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 1. 處理搜尋過濾
  const filteredPeople = useMemo(() => {
    if (!staffData) return [];
    return Object.values(staffData.people).filter(p => 
      p.header.name.includes(searchTerm) || p.header.emp_id.includes(searchTerm)
    );
  }, [staffData, searchTerm]);

  // 2. 匯出邏輯
  const handleExport = async () => {
    if (!staffData || holidayRules.records.length === 0) return;
    setIsExporting(true);
    setError(null);
    try {
      const blob = await generatePublicHolidayReport(staffData, config, holidayRules.records);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `國定假日加班單_${staffData.month}月.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '匯出失敗');
    } finally {
      setIsExporting(false);
    }
  };

  // 3. 快速新增國定假日規則 (自動帶入 8 小時制)
  const [quickRule, setQuickRule] = useState({ date: '', reason: '' });

  const handleQuickAdd = () => {
    if (!quickRule.date || !quickRule.reason) return;
    
    const formattedDate = quickRule.date.replace(/\//g, '');
    
    // 同時產生早晚班兩條規則 (自動帶入使用者指定的 8 小時制)
    const newRecords = [
      ...holidayRules.records,
      {
        date: formattedDate,
        reason: quickRule.reason,
        shift: '早班' as const,
        start_time: '08:00',
        end_time: '17:00',
        hours: 8
      },
      {
        date: formattedDate,
        reason: quickRule.reason,
        shift: '晚班' as const,
        start_time: '13:00',
        end_time: '22:00',
        hours: 8
      }
    ];

    setHolidayRules({ records: newRecords });
    setQuickRule({ date: '', reason: '' });
  };

  if (!staffData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-white border border-slate-200 border-dashed rounded-3xl p-12 text-center">
        <div className="p-4 bg-indigo-50 rounded-full mb-4">
          <Palmtree className="w-10 h-10 text-indigo-400" />
        </div>
        <h3 className="text-xl font-bold text-slate-800">尚未載入人員資料</h3>
        <p className="text-slate-500 mt-2 max-w-sm">請先在首頁載入人員名單，才能進行國定假日對位管理。</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <span className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-black rounded-full tracking-widest uppercase">
              Holiday Manager
            </span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">國定假日處理</h1>
          <p className="text-slate-500 mt-1 font-medium">系統會根據班別自動帶入 08-17 (早) 或 13-22 (晚) 之 8 小時紀錄</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center px-5 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
          >
            <CalendarDays className="w-5 h-5 mr-2 text-indigo-600" />
            管理假日規則
          </button>
          
          <button
            onClick={handleExport}
            disabled={isExporting || holidayRules.records.length === 0}
            className={cn(
              "flex items-center px-6 py-3 rounded-2xl font-black transition-all shadow-lg active:scale-95",
              holidayRules.records.length > 0
                ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            )}
          >
            {isExporting ? <div className="animate-spin mr-2">⏳</div> : <Download className="w-5 h-5 mr-2" />}
            匯出國定假日報表
          </button>
        </div>
      </div>

      {/* Quick Add Banner */}
      <div className="bg-indigo-900 rounded-[2rem] p-8 text-white shadow-2xl shadow-indigo-900/20 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 transition-transform group-hover:scale-110 duration-700 opacity-20">
          <Palmtree className="w-32 h-32" />
        </div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="max-w-md">
            <h3 className="text-xl font-black mb-2 flex items-center">
              一鍵快速新增假日
              <span className="ml-3 px-2 py-0.5 bg-indigo-500 text-[10px] rounded uppercase font-bold tracking-widest">Auto 8H Mode</span>
            </h3>
            <p className="text-indigo-200 text-sm font-medium">輸入日期與事由，系統將自動為早/晚班產生對應的 8 小時申報資料。</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <input 
              type="text" 
              placeholder="日期 (MMDD)" 
              className="px-4 py-3 bg-indigo-800/50 border border-indigo-700 rounded-xl outline-none focus:ring-2 focus:ring-white/30 transition-all w-32 placeholder:text-indigo-400 font-mono"
              value={quickRule.date}
              onChange={e => setQuickRule({...quickRule, date: e.target.value})}
            />
            <input 
              type="text" 
              placeholder="假日名稱 (如: 勞動節)" 
              className="px-4 py-3 bg-indigo-800/50 border border-indigo-700 rounded-xl outline-none focus:ring-2 focus:ring-white/30 transition-all w-48 placeholder:text-indigo-400"
              value={quickRule.reason}
              onChange={e => setQuickRule({...quickRule, reason: e.target.value})}
            />
            <button 
              onClick={handleQuickAdd}
              className="px-8 py-3 bg-white text-indigo-900 rounded-xl font-bold hover:bg-indigo-50 transition-all shadow-xl active:scale-95"
            >
              套用至全隊
            </button>
          </div>
        </div>
      </div>

      {/* Staff Preview Table */}
      <div className="bg-white border border-slate-200 rounded-[2rem] shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <h2 className="font-bold text-slate-800 uppercase tracking-tight">國定假日預覽對話表</h2>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="搜尋工號或姓名..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 w-64 shadow-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">員工資訊</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">班別</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">生成的假日紀錄</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPeople.map(person => {
                const myHolidays = holidayRules.records.filter(r => r.shift === person.header.shift);
                return (
                  <tr key={person.header.emp_id} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="px-8 py-5">
                      <p className="font-black text-slate-900 text-lg">{person.header.name}</p>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">{person.header.emp_id}</p>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <span className={cn(
                        "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                        person.header.shift === '早班' ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"
                      )}>
                        {person.header.shift}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-wrap gap-2">
                        {myHolidays.map((h, i) => (
                          <div key={i} className="flex items-center bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl">
                            <span className="w-2 h-2 rounded-full bg-indigo-400 mr-2" />
                            <div className="flex flex-col">
                              <span className="text-xs font-black text-indigo-700">{h.reason} ({h.date})</span>
                              <span className="text-[10px] font-bold text-indigo-400">{h.start_time}-{h.end_time} | {h.hours}H</span>
                            </div>
                          </div>
                        ))}
                        {myHolidays.length === 0 && (
                          <span className="text-slate-300 italic text-sm font-medium">無適用規則</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 flex items-center font-bold">
           <AlertCircle className="w-5 h-5 mr-3" />
           {error}
        </div>
      )}

      <PublicHolidayModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}
