import { useState } from 'react';
import { useStaffStore } from '../store/useStaffStore';
import { Calendar, Truck, UserCheck, Download, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { cn } from '../lib/utils';
import { generateVehicleRecordReport } from '../lib/algorithms/VehicleRecordExport';
import { generateDriveBonusReport } from '../lib/algorithms/DriveBonusExport';

export function VehicleManagement() {
  const { staffData, config, rules, targetMonth, setTargetMonth } = useStaffStore();
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasData = !!staffData;
  const vehicles = staffData?.vehicleRecords || [];
  const drivers = staffData?.drivers || {};
  const driverIds = Object.keys(drivers);

  const handleExportRecords = async () => {
    try {
      // 構建包含特定月份的資料副本進行匯出
      const exportData = { ...staffData, month: targetMonth || staffData.month };
      const blob = await generateVehicleRecordReport(exportData, config, rules);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `車輛行駛紀錄表_${exportData.month}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '行駛紀錄表匯出失敗');
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportBonus = async () => {
    try {
      const exportData = { ...staffData, month: targetMonth || staffData.month };
      const blob = await generateDriveBonusReport(exportData, config, rules);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `司機獎金清冊_${exportData.month}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '獎金清冊匯出失敗');
    } finally {
      setIsExporting(null);
    }
  };

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center animate-in fade-in zoom-in duration-500">
        <div className="p-8 bg-slate-50 rounded-full mb-6 border-2 border-dashed border-slate-200">
          <Truck className="w-16 h-16 text-slate-300" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-4">尚未載入資料</h2>
        <p className="text-slate-500 max-w-md mb-8">車務與司機資料已整合至「資料來源管理」。請先前往該頁面上傳含有機具與司機分頁的 Excel。</p>
        <button 
          onClick={() => window.location.hash = '#/data-management'}
          className="px-8 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95"
        >
          前往匯入資料
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-6">
          <div className="p-2 bg-emerald-600 rounded-xl shadow-lg shadow-emerald-200">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">車務管理系統</h1>
            <div className="flex items-center mt-2 gap-4">
              <p className="text-slate-500 font-medium">1:1 車務紀錄與獎金核算</p>
              <div className="h-4 w-px bg-slate-200" />
              <div className="flex items-center bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm">
                <span className="text-[10px] font-black text-slate-400 mr-2 uppercase tracking-wider">產出月份 (YYYMM)</span>
                <input 
                  type="text" 
                  value={targetMonth}
                  onChange={(e) => setTargetMonth(e.target.value)}
                  placeholder={staffData?.month || "11503"}
                  className="w-20 text-sm font-black text-slate-900 outline-none placeholder:text-slate-200"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleExportRecords}
            disabled={!!isExporting || vehicles.length === 0}
            className={cn(
              "flex items-center px-6 py-3 rounded-xl font-bold transition-all shadow-lg",
              vehicles.length > 0 
                ? "bg-slate-800 text-white hover:bg-slate-900 shadow-slate-200" 
                : "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
            )}
          >
            {isExporting === 'records' ? <div className="animate-spin mr-2">⏳</div> : <FileSpreadsheet className="w-5 h-5 mr-2" />}
            產出「行駛紀錄表」
          </button>

          <button
            onClick={handleExportBonus}
            disabled={!!isExporting || driverIds.length === 0}
            className={cn(
              "flex items-center px-6 py-3 rounded-xl font-bold transition-all shadow-lg",
              driverIds.length > 0 
                ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-100" 
                : "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
            )}
          >
            {isExporting === 'bonus' ? <div className="animate-spin mr-2">⏳</div> : <Download className="w-5 h-5 mr-2" />}
            產出「獎金清冊」
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 flex items-center font-bold">
           <AlertCircle className="w-5 h-5 mr-3" />
           {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 車輛清單 */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-black text-slate-800 flex items-center">
              <Truck className="w-5 h-5 mr-2 text-emerald-600" /> 車輛清單 ({vehicles.length})
            </h2>
          </div>
          
          <div className="grid gap-3">
            {vehicles.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-slate-100 rounded-3xl p-12 text-center text-slate-400">
                尚未載入車輛資料
              </div>
            ) : (
              vehicles.map((v, i) => (
                <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center font-black text-indigo-600 border border-slate-100">
                      {i + 1}
                    </div>
                    <div>
                      <div className="font-black text-slate-900">{v.plate}</div>
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{v.spec}</div>
                    </div>
                  </div>
                  {v.extra && <span className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded-md font-bold">{v.extra}</span>}
                </div>
              ))
            )}
          </div>
        </section>

        {/* 司機清單 */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-black text-slate-800 flex items-center">
              <UserCheck className="w-5 h-5 mr-2 text-emerald-600" /> 司機清單 ({driverIds.length})
            </h2>
          </div>

          <div className="grid gap-3">
            {driverIds.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-slate-100 rounded-3xl p-12 text-center text-slate-400">
                尚未載入司機資料
              </div>
            ) : (
              driverIds.map((id) => (
                <div key={id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900">{drivers[id].name}</span>
                      <span className="text-xs font-bold text-slate-400 tracking-tighter">({id})</span>
                    </div>
                    <span className={cn(
                      "px-2 py-0.5 text-[10px] font-black rounded-md uppercase tracking-wider",
                      drivers[id].role === '正駕' ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700"
                    )}>
                      {drivers[id].role}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {drivers[id].cars.map(c => (
                      <span key={c} className="text-[10px] px-2 py-1 bg-slate-50 text-slate-600 rounded-md border border-slate-100 font-mono">
                         {c}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
