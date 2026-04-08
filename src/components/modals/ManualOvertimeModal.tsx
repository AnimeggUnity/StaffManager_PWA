import { useState } from 'react';
import { useStaffStore } from '../../store/useStaffStore';
import { X, Plus, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ManualOvertimeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ManualOvertimeModal({ isOpen, onClose }: ManualOvertimeModalProps) {
  const { manualRules, setManualRules, applyManualRules, staffData } = useStaffStore();
  const [newRule, setNewRule] = useState({
    date: '',
    shift: '早班' as '早班' | '晚班',
    start_time: '08:00',
    end_time: '10:00',
    hours: 2,
    reason: ''
  });
  const [status, setStatus] = useState<'idle' | 'success'>('idle');

  if (!isOpen) return null;

  const handleAddRule = () => {
    if (!newRule.date || !newRule.reason) return;
    
    // 格式化日期 (確保是 MM/DD)
    let formattedDate = newRule.date;
    if (newRule.date.length === 4 && !newRule.date.includes('/')) {
      formattedDate = `${newRule.date.slice(0, 2)}/${newRule.date.slice(2)}`;
    }

    const updatedRules = {
      records: [...manualRules.records, { ...newRule, date: formattedDate }]
    };
    setManualRules(updatedRules);
    setNewRule({ ...newRule, date: '', reason: '' });
  };

  const handleDeleteRule = (index: number) => {
    const updatedRules = {
      records: manualRules.records.filter((_, i) => i !== index)
    };
    setManualRules(updatedRules);
  };

  const handleApply = async () => {
    await applyManualRules();
    setStatus('success');
    setTimeout(() => setStatus('idle'), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 md:bg-white/80 md:backdrop-blur-md">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <Plus className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">全域手動加班設定</h2>
              <p className="text-xs text-slate-500">設定後的規則會套用到該班別的所有員工</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Form */}
          <div className="bg-slate-50 p-4 rounded-xl space-y-4 border border-slate-100">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">日期 (MMDD)</label>
                <input 
                  type="text" 
                  placeholder="例如 0321" 
                  value={newRule.date}
                  onChange={e => setNewRule({...newRule, date: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">班別</label>
                <select 
                  value={newRule.shift}
                  onChange={e => setNewRule({...newRule, shift: e.target.value as any})}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                >
                  <option value="早班">早班</option>
                  <option value="晚班">晚班</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">時數</label>
                <input 
                  type="number" 
                  value={newRule.hours}
                  onChange={e => setNewRule({...newRule, hours: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">開始時間</label>
                <input 
                  type="text" 
                  placeholder="08:00" 
                  value={newRule.start_time}
                  onChange={e => setNewRule({...newRule, start_time: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">結束時間</label>
                <input 
                  type="text" 
                  placeholder="10:00" 
                  value={newRule.end_time}
                  onChange={e => setNewRule({...newRule, end_time: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div className="space-y-1 md:col-span-1">
                <label className="text-xs font-bold text-slate-500">加班事由</label>
                <input 
                  type="text" 
                  placeholder="原因描述" 
                  value={newRule.reason}
                  onChange={e => setNewRule({...newRule, reason: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                />
              </div>
            </div>
            <button 
              onClick={handleAddRule}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-all shadow-md shadow-emerald-100 flex items-center justify-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              新增到規則清單
            </button>
          </div>

          {/* Rules List */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-700 flex items-center">
              規則清單
              <span className="ml-2 px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded-full">
                {manualRules.records.length}
              </span>
            </h3>
            
            <div className="space-y-2">
              {manualRules.records.map((rule, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-slate-200 transition-all">
                  <div className="flex items-center space-x-4">
                    <div className="text-center min-w-[50px]">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">日期</p>
                      <p className="text-sm font-black text-slate-700">{rule.date}</p>
                    </div>
                    <div className="h-8 w-px bg-slate-100" />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold",
                          rule.shift === '早班' ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                        )}>
                          {rule.shift}
                        </span>
                        <span className="text-xs font-bold text-slate-700">{rule.reason}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        時間：{rule.start_time} - {rule.end_time} ({rule.hours} 小時)
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeleteRule(i)}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              
              {manualRules.records.length === 0 && (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <AlertTriangle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">目前沒有設定任何全域規則</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex flex-col items-center">
          <button 
            onClick={handleApply}
            disabled={!staffData || manualRules.records.length === 0}
            className={cn(
              "w-full max-w-sm py-3 rounded-xl font-bold transition-all flex items-center justify-center space-x-2 shadow-lg",
              status === 'success' 
                ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                : "bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-200 disabled:shadow-none"
            )}
          >
            {status === 'success' ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>套用成功！已更新員工商名單</span>
              </>
            ) : (
              <span>套用到目前資料 ({staffData?.month}月份)</span>
            )}
          </button>
          <p className="mt-3 text-[10px] text-slate-400">
            * 點擊後會依照清單規則，自動在所有符合班別的員工名單中補上加班紀錄。
          </p>
        </div>
      </div>
    </div>
  );
}
