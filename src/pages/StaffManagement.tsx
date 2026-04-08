import { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  FileText,
  ChevronRight,
  UserCheck,
  UserX
} from 'lucide-react';
import { useStaffStore } from '../store/useStaffStore';
import { cn } from '../lib/utils';
import { StaffRecordModal } from '../components/modals/StaffRecordModal';

export function StaffManagement() {
  const { staffData } = useStaffStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [shiftFilter, setShiftFilter] = useState<'all' | '早班' | '晚班'>('all');
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  const staffList = useMemo(() => {
    if (!staffData || !staffData.people) return [];
    return Object.values(staffData.people).filter(person => {
      const matchesSearch = person.header.name.includes(searchTerm) || 
                          person.header.emp_id.includes(searchTerm);
      const matchesShift = shiftFilter === 'all' || person.header.shift === shiftFilter;
      return matchesSearch && matchesShift;
    });
  }, [staffData, searchTerm, shiftFilter]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">員工管理中心</h1>
          <p className="text-slate-500 mt-2 font-medium flex items-center">
            {(!staffData || !staffData.people || Object.keys(staffData.people).length === 0) ? (
              <>
                <UserX className="w-4 h-4 mr-2 text-slate-400" />
                尚無載入數據
              </>
            ) : (
              <>
                <UserCheck className="w-4 h-4 mr-2 text-emerald-500" />
                目前系統已載入 {Object.keys(staffData.people).length} 位員工數據
              </>
            )}
          </p>
        </div>
      </div>

      {(!staffData || !staffData.people || Object.keys(staffData.people).length === 0) ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white border-2 border-slate-100 border-dashed rounded-[3rem]">
          <div className="p-8 bg-blue-50 rounded-full mb-6">
            <Users className="w-16 h-16 text-blue-200" />
          </div>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight">尚未載入員工資料</h3>
          <p className="text-slate-400 font-medium mt-2 max-w-xs text-center leading-relaxed">
            請先至總覽中心上傳員工 Excel 名單，以便在此處進行資料驗證與管理。
          </p>
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('nav', { detail: 'dashboard' }))}
            className="mt-8 px-8 py-3 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20"
          >
            返回總覽中心
          </button>
        </div>
      ) : (
        <>
          {/* Control Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
          <input 
            type="text" 
            placeholder="輸入姓名或工號搜尋..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-14 pr-6 py-5 bg-white border border-slate-200 rounded-3xl shadow-xl shadow-slate-100/50 focus:ring-4 focus:ring-blue-100/50 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300 text-lg"
          />
        </div>
        
        <div className="lg:col-span-4 flex bg-white border border-slate-200 rounded-3xl p-2 shadow-xl shadow-slate-100/50">
          {(['all', '早班', '晚班'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setShiftFilter(s)}
              className={cn(
                "flex-1 py-3 px-4 rounded-2xl text-sm font-black transition-all",
                shiftFilter === s 
                  ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20 translate-y-[-1px]" 
                  : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
              )}
            >
              {s === 'all' ? '全部班別' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-2xl shadow-slate-200/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">員工基本資訊</th>
                <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest text-center">班別</th>
                <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest text-center">加班紀錄數</th>
                <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest text-right">管理操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {staffList.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-24 text-center">
                    <div className="flex flex-col items-center opacity-30">
                      <UserX className="w-12 h-12 mb-3" />
                      <p className="font-black text-xl italic tracking-tighter uppercase font-mono">No matching staff found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                staffList.map((person) => (
                  <tr key={person.header.emp_id} className="hover:bg-blue-50/20 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center space-x-4">
                        <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-slate-900/10 group-hover:scale-105 transition-transform">
                          {person.header.name.slice(0, 1)}
                        </div>
                        <div>
                          <p className="font-black text-slate-900 text-lg leading-tight">{person.header.name}</p>
                          <p className="text-xs text-slate-400 font-mono mt-1 font-bold">ID: {person.header.emp_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <span className={cn(
                        "px-4 py-1.5 rounded-xl text-xs font-black inline-block",
                        person.header.shift === '早班' ? "bg-amber-100 text-amber-700" : "bg-indigo-100 text-indigo-700"
                      )}>
                        {person.header.shift || '暫無資料'}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center font-black transition-all",
                          person.records.length > 0 
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                            : "bg-slate-100 text-slate-300"
                        )}>
                          {person.records.length}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button 
                        onClick={() => setSelectedStaffId(person.header.emp_id)}
                        className="inline-flex items-center px-5 py-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-900 hover:text-white hover:border-slate-900 rounded-2xl font-black text-sm transition-all shadow-sm hover:shadow-xl hover:translate-x-[-2px] group/btn"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        查看詳情
                        <ChevronRight className="w-4 h-4 ml-1 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Staff Modal Overlay */}
      {selectedStaffId && (
        <StaffRecordModal 
          staff={staffData.people[selectedStaffId]} 
          onClose={() => setSelectedStaffId(null)} 
        />
      )}
        </>
      )}
    </div>
  );
}
