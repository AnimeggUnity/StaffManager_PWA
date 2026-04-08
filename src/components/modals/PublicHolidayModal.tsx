import { useState } from 'react';
import { useStaffStore } from '../../store/useStaffStore';
import { X, Calendar, Plus, Trash2, AlertTriangle } from 'lucide-react';

interface PublicHolidayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PublicHolidayModal({ isOpen, onClose }: PublicHolidayModalProps) {
  const { holidayRules, setHolidayRules } = useStaffStore();
  const [newRule, setNewRule] = useState({
    date: '',
    shift: '早班' as '早班' | '晚班',
    start_time: '08:00',
    end_time: '12:00',
    hours: 4,
    reason: ''
  });

  if (!isOpen) return null;

  const handleAddRule = () => {
    if (!newRule.date || !newRule.reason) return;
    
    // 格式化日期 (確保是 MMDD)
    let formattedDate = newRule.date.replace(/\//g, '');
    if (formattedDate.length === 4) {
      // OK
    }

    const updatedRules = {
      records: [...holidayRules.records, { ...newRule, date: formattedDate }]
    };
    setHolidayRules(updatedRules);
    setNewRule({ ...newRule, date: '', reason: '' });
  };

  const handleDeleteRule = async (index: number) => {
    const updatedRules = {
      records: holidayRules.records.filter((_, i) => i !== index)
    };
    await setHolidayRules(updatedRules);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Calendar className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">國定假日管理</h2>
              <p className="text-xs text-slate-500">設定後的假日將用於產出獨立的「國定假日加班單」</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Form */}
          <div className="bg-amber-50/50 p-4 rounded-xl space-y-4 border border-amber-100">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">日期 (MMDD)</label>
                <input 
                  type="text" 
                  placeholder="例如 0404" 
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
                  placeholder="12:00" 
                  value={newRule.end_time}
                  onChange={e => setNewRule({...newRule, end_time: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">假日名稱/事由</label>
                <input 
                  type="text" 
                  placeholder="如：兒童節" 
                  value={newRule.reason}
                  onChange={e => setNewRule({...newRule, reason: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                />
              </div>
            </div>
            <button 
              onClick={handleAddRule}
              className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-bold transition-all shadow-md shadow-amber-100 flex items-center justify-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              新增假日規則
            </button>
          </div>

          {/* List */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-700 flex items-center">
              已設定假日
              <span className="ml-2 px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded-full">
                {holidayRules.records.length}
              </span>
            </h3>
            
            <div className="space-y-2">
              {holidayRules.records.map((rule, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-slate-200 transition-all">
                  <div className="flex items-center space-x-4">
                    <div className="text-center min-w-[50px]">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">日期</p>
                      <p className="text-sm font-black text-slate-700">{rule.date}</p>
                    </div>
                    <div className="h-8 w-px bg-slate-100" />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded text-[10px] font-bold">
                          {rule.shift}
                        </span>
                        <span className="text-xs font-bold text-slate-700">{rule.reason}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {rule.start_time} - {rule.end_time} ({rule.hours} 小時)
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
              
              {holidayRules.records.length === 0 && (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <AlertTriangle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">尚未設定任何國定假日</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-all shadow-lg"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
}
