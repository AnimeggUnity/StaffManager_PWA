import { useState, useEffect } from 'react';
import { useStaffStore } from '../store/useStaffStore';
import { Settings as SettingsIcon, Save, RefreshCw, CalendarRange, Clock } from 'lucide-react';
import { cn } from '../lib/utils';
import type { AppConfig, SpecialRules } from '../types';

export function Settings() {
  const { config, rules, setConfig, setRules } = useStaffStore();
  
  // 本地編輯狀態 (給予預設值避免 undefined)
  const [localConfig, setLocalConfig] = useState<AppConfig>({ roc_year: 114 });
  const [localRules, setLocalRules] = useState<SpecialRules>({
    default_off_weekdays: [3, 0],
    employee_off_weekdays: {},
    vehicle_off_weekdays: {},
    manual_holidays: [],
    manual_workdays: []
  });

  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // 初始化資料 (僅在 Store 載入時同步到本地，避免串聯渲染警告)
  useEffect(() => {
    if (config) setLocalConfig(prev => prev.roc_year === 114 ? config : prev);
    if (rules) setLocalRules(prev => prev.manual_holidays.length === 0 ? rules : prev);
  }, [config, rules]);

  const handleSave = async () => {
    setIsSaving(true);
    await setConfig(localConfig);
    await setRules(localRules);
    setIsSaving(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  };

  const toggleWeekday = (day: number) => {
    const current = localRules.default_off_weekdays || [];
    const updated = current.includes(day) 
      ? current.filter(d => d !== day) 
      : [...current, day].sort();
    setLocalRules({ ...localRules, default_off_weekdays: updated });
  };

  const parseDates = (val: string) => {
    // 支援半形或全形逗號、空格作為分隔符
    return val.split(/[,，\s]+/).map(s => s.trim()).filter(Boolean);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center">
            <div className="p-2 bg-slate-800 rounded-xl mr-4 shadow-lg shadow-slate-200">
              <SettingsIcon className="w-8 h-8 text-white" />
            </div>
            系統設定
          </h1>
          <p className="text-slate-500 mt-2 font-medium">調整民國年與全局休假規則 (1:1 參數對位)</p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className={cn(
            "flex items-center px-8 py-3 rounded-xl font-bold transition-all shadow-lg active:scale-95",
            success ? "bg-emerald-500 text-white" : "bg-slate-900 text-white hover:bg-black"
          )}
        >
          {isSaving ? <RefreshCw className="w-5 h-5 mr-2 animate-spin" /> : 
           success ? "已儲存！" : <Save className="w-5 h-5 mr-2" />}
          儲存設定
        </button>
      </div>

      <div className="space-y-8">
        <section className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50">
          <div className="flex items-center gap-3 mb-6">
            <Clock className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-black text-slate-800">全域報表年份</h2>
          </div>
          
          <div className="max-w-xs">
            <label className="block text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">目前民國年 (ROC Year)</label>
            <div className="flex items-center gap-4">
               <input 
                 type="number" 
                 className="flex-1 px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 transition-all text-2xl font-black text-indigo-600"
                 value={localConfig.roc_year}
                 onChange={(e) => setLocalConfig({...localConfig, roc_year: parseInt(e.target.value) || 0})}
               />
               <span className="font-bold text-slate-400 text-xl">年度</span>
            </div>
          </div>
        </section>

        <section className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50">
          <div className="flex items-center gap-3 mb-6">
            <CalendarRange className="w-6 h-6 text-emerald-600" />
            <h2 className="text-xl font-black text-slate-800">預設休假規則</h2>
          </div>

          <div className="mb-10">
            <label className="block text-sm font-bold text-slate-500 mb-4 uppercase tracking-wider">每週固定休假 (影響車務自動塗灰)</label>
            <div className="flex gap-2">
              {['日', '一', '二', '三', '四', '五', '六'].map((name, i) => (
                <button
                  key={i}
                  onClick={() => toggleWeekday(i)}
                  className={cn(
                    "w-12 h-14 rounded-2xl font-black transition-all border-2",
                    localRules.default_off_weekdays?.includes(i)
                      ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-100"
                      : "bg-slate-50 border-slate-100 text-slate-400 hover:border-emerald-200"
                  )}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">手動補假 (例外假日 MMDD)</label>
              <textarea 
                className="w-full h-32 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-50 focus:bg-white transition-all font-mono text-sm leading-relaxed"
                placeholder="例如: 0101, 1010 (用逗號隔開)"
                value={localRules.manual_holidays?.join(', ')}
                onChange={(e) => setLocalRules({...localRules, manual_holidays: parseDates(e.target.value)})}
              />
              <p className="mt-2 text-xs text-slate-400 font-medium">※ 將平日強行變更為「灰色底色」</p>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">手動補班 (例外工作日 MMDD)</label>
              <textarea 
                className="w-full h-32 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-amber-50 focus:bg-white transition-all font-mono text-sm leading-relaxed"
                placeholder="例如: 0104, 0215 (用逗號隔開)"
                value={localRules.manual_workdays?.join(', ')}
                onChange={(e) => setLocalRules({...localRules, manual_workdays: parseDates(e.target.value)})}
              />
              <p className="mt-2 text-xs text-slate-400 font-medium">※ 將週休強制變更為「白色背景」</p>
            </div>
          </div>
        </section>

        <section className="bg-slate-50 p-6 rounded-3xl border border-dashed border-slate-300">
          <h3 className="text-sm font-bold text-slate-600 mb-3 flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            快速教學：如何填寫補假/補班？
          </h3>
          <ul className="text-xs text-slate-500 space-y-2 leading-relaxed">
            <li>• <strong>格式規範</strong>：請一律使用四位數日期，例如元旦請填 <code className="bg-white px-1 border rounded text-slate-700">0101</code>。</li>
            <li>• <strong>多筆輸入</strong>：日期之間請使用「英文逗號 <code className="bg-white px-1 border rounded text-slate-700">,</code>」隔開。</li>
            <li>• <strong>效果確認</strong>：設定儲存後，重新下載報表即可看到日期的塗灰區域發生變化。</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
