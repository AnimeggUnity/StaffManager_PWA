import { useStaffStore } from '../store/useStaffStore';
import { 
  Clock, 
  Search, 
  Filter, 
  Trash2, 
  Plus,
  Calendar,
  Download
} from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Employee } from '../types';
import { cn } from '../lib/utils';
import { generateExcelReport } from '../lib/algorithms/ExcelExport';
import { generatePublicHolidayReport } from '../lib/algorithms/PublicHolidayExport';
import { ManualOvertimeModal } from '../components/modals/ManualOvertimeModal';
import { PublicHolidayModal } from '../components/modals/PublicHolidayModal';

export function OvertimeProcessing() {
  const { staffData, config, setStaffData, globalSearchTerm, setGlobalSearchTerm, holidayRules } = useStaffStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isHolidayExporting, setIsHolidayExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);

  // 同步全局搜尋關鍵字 (關鍵連動)
  useEffect(() => {
    if (globalSearchTerm) {
      setSearchTerm(globalSearchTerm);
      // 使用後清除，避免下次從選單進來時還留著搜尋
      setGlobalSearchTerm('');
    }
  }, [globalSearchTerm, setGlobalSearchTerm]);

  const handleExport = async () => {
    if (!staffData) return;
    setIsExporting(true);
    setExportError(null);
    try {
      const blob = await generateExcelReport(staffData, config);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `加班統計表_${staffData.month}月.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setExportError(err instanceof Error ? err.message : "匯出失敗");
    } finally {
      setIsExporting(false);
    }
  };

  const handleHolidayExport = async () => {
    if (!staffData || holidayRules.records.length === 0) return;
    setIsHolidayExporting(true);
    setExportError(null);
    try {
      const blob = await generatePublicHolidayReport(staffData, config, holidayRules.records);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `國定假日加班單_${staffData.month}月.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setExportError(err instanceof Error ? err.message : "假日報表匯出失敗");
    } finally {
      setIsHolidayExporting(false);
    }
  };

  if (!staffData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-white border border-slate-200 rounded-2xl p-8 text-center">
        <div className="p-4 bg-slate-50 rounded-full mb-4">
          <Clock className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900">尚未載入資料</h3>
        <p className="text-slate-500 max-w-sm mt-2">請先前往「資料來源」頁面載入員工名單與 Word 加班單，才能開始進行核對與編輯。</p>
      </div>
    );
  }

  const handleRemoveRecord = (empId: string, recordIndex: number) => {
    if (!staffData) return;
    
    // 複製資料以觸發 React 更新
    const newData = JSON.parse(JSON.stringify(staffData));
    newData.people[empId].records.splice(recordIndex, 1);
    
    setStaffData(newData);
  };

  const people = (Object.values(staffData.people) as Employee[]).filter(person => 
    person.header.name.includes(searchTerm) || person.header.emp_id.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">加班處理與核對</h1>
          <p className="text-slate-500">檢視系統從 Word 解析出的加班紀錄，並可進行手動修正。</p>
        </div>
        
        <div className="flex items-center space-x-3">
          {exportError && (
            <span className="text-xs text-red-500 bg-red-50 px-3 py-1 rounded-lg border border-red-100">
              {exportError}
            </span>
          )}
          
          <button 
            onClick={handleExport}
            disabled={isExporting}
            className={cn(
              "flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all",
              isExporting 
                ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-200"
            )}
          >
            {isExporting ? "產出中..." : "匯出報表 (Excel)"}
          </button>

          <button 
            onClick={handleHolidayExport}
            disabled={isHolidayExporting || holidayRules.records.length === 0}
            className={cn(
              "flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all",
              isHolidayExporting || holidayRules.records.length === 0
                ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                : "bg-amber-500 text-white hover:bg-amber-600 shadow-md shadow-amber-200"
            )}
            title={holidayRules.records.length === 0 ? "請先設定國定假日規則" : ""}
          >
            <Download className="w-4 h-4 mr-2" />
            {isHolidayExporting ? "產出中..." : "匯出國定假日報表"}
          </button>
          
          <button 
            onClick={() => setIsManualModalOpen(true)}
            className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2 text-emerald-600" />
            全域手動加班
          </button>

          <button 
            onClick={() => setIsHolidayModalOpen(true)}
            className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
          >
            <Calendar className="w-4 h-4 mr-2 text-amber-600" />
            國定假日管理
          </button>
          
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="搜尋工號或姓名..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>
          <button className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50">
            <Filter className="w-4 h-4 mr-2" />
            篩選
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-40">員工資訊</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">加班內容預覽</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-32 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {people.map((person) => (
                <tr key={person.header.emp_id} className="hover:bg-slate-50/50 transition-colors pointer-default">
                  <td className="px-6 py-5">
                    <div className="flex items-center space-x-2">
                       <span className={cn(
                         "w-2 h-2 rounded-full",
                         person.header.shift === '早班' ? "bg-amber-400" : "bg-blue-400"
                       )}></span>
                       <p className="font-bold text-slate-900">{person.header.name}</p>
                    </div>
                    <div className="mt-1 ml-4 flex flex-col space-y-0.5">
                      <div className="flex items-center space-x-2 text-xs font-mono">
                        <span className="text-slate-500 uppercase">{person.header.emp_id}</span>
                        <span className="text-slate-300">|</span>
                        <span className={cn(
                          "font-bold",
                          person.header.shift === '早班' ? "text-amber-600" : "text-blue-600"
                        )}>
                          {person.header.shift}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">
                        本月加班：<span className="font-bold text-slate-700">{person.records.length}</span> 次
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-wrap gap-2">
                      {person.records.map((record, i) => (
                        <div key={i} className={cn(
                          "group relative flex items-center px-3 py-1 rounded-lg text-xs font-medium shadow-sm border transition-all",
                          record.isManual 
                            ? "bg-indigo-50 border-indigo-200 text-indigo-700" 
                            : "bg-white border-slate-200 text-slate-700"
                        )}>
                          <span className={cn(
                            "font-bold mr-2",
                            record.isManual ? "text-indigo-600" : "text-blue-600"
                          )}>{record.date}</span>
                          <span className="mr-4">{record.reason}</span>
                          <button 
                            onClick={() => handleRemoveRecord(person.header.emp_id, i)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded-md transition-all ml-auto"
                            title="刪除此筆紀錄"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {person.records.length === 0 && <span className="text-slate-400 italic text-sm">無紀錄</span>}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    {/* 新增紀錄功能暫不開發 */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ManualOvertimeModal 
        isOpen={isManualModalOpen} 
        onClose={() => setIsManualModalOpen(false)} 
      />
      <PublicHolidayModal
        isOpen={isHolidayModalOpen}
        onClose={() => setIsHolidayModalOpen(false)}
      />
    </div>
  );
}
