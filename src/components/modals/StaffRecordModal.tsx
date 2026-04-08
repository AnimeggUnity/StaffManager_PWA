import { X, Clock, Calendar, AlertCircle } from 'lucide-react';
import type { Employee } from '../../types';

interface StaffRecordModalProps {
  staff: Employee;
  onClose: () => void;
}

export function StaffRecordModal({ staff, onClose }: StaffRecordModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div>
            <div className="flex items-center space-x-2 text-blue-600 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-black uppercase tracking-widest">加班紀錄詳情</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900">
              {staff.header.name} <span className="text-slate-400 text-lg font-medium ml-2">#{staff.header.emp_id}</span>
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-slate-50 text-slate-400 hover:text-slate-900 rounded-2xl transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-4 bg-slate-50/30">
          {staff.records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
              <p className="font-bold">目前無任何加班紀錄</p>
              <p className="text-sm mt-1">請上傳 Word 加班單以載入數據</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {staff.records.map((record, idx) => (
                <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-50 rounded-xl flex flex-col items-center justify-center text-blue-600">
                        <Calendar className="w-4 h-4 mb-0.5" />
                        <span className="text-[10px] font-black">{record.date}</span>
                      </div>
                      <div>
                        <p className="font-black text-slate-800 text-lg">{record.reason}</p>
                        <p className="text-slate-400 font-bold text-sm">
                          {record.sh}:{record.sm} - {record.eh}:{record.em}
                        </p>
                      </div>
                    </div>
                    {record.manual_hours && (
                      <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-black">
                        手動時數: {record.manual_hours}h
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-white flex justify-end">
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10"
          >
            關閉視窗
          </button>
        </div>
      </div>
    </div>
  );
}
