import { Search, Bell, User, Clock, FileText, Settings, Palmtree, Calendar, FileSpreadsheet, Users } from 'lucide-react';
import { useStaffStore } from '../../store/useStaffStore';
import { useState, useRef, useEffect } from 'react';
import type { Employee } from '../../types';

interface NavbarProps {
  setActiveTab: (tab: string) => void;
}

const MENU_ITEMS = [
  { id: 'dashboard', label: '總覽頁面', icon: FileText },
  { id: 'data', label: '資料來源', icon: FileSpreadsheet },
  { id: 'overtime', label: '加班處理', icon: Clock },
  { id: 'holiday', label: '國定假日', icon: Palmtree },
  { id: 'vehicle', label: '車輛排班', icon: Calendar },
  { id: 'staff', label: '員工管理', icon: Users },
  { id: 'settings', label: '系統設定', icon: Settings },
];

export function Navbar({ setActiveTab }: NavbarProps) {
  const { staffData, config, setGlobalSearchTerm } = useStaffStore();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 點擊外部關閉搜尋
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 過濾結果
  const filteredFunctions = query 
    ? MENU_ITEMS.filter(item => item.label.includes(query))
    : [];
    
  const filteredPeople = query && staffData
    ? (Object.values(staffData.people) as Employee[])
        .filter(p => p.header.name.includes(query) || p.header.emp_id.includes(query))
        .slice(0, 5)
    : [];

  const handleSelectFunction = (tabId: string) => {
    setActiveTab(tabId);
    setQuery('');
    setIsOpen(false);
  };

  const handleSelectPerson = (person: Employee) => {
    // 跨頁面連動：設定全局關鍵字並跳轉
    setGlobalSearchTerm(person.header.name);
    setActiveTab('overtime');
    setQuery('');
    setIsOpen(false);
  };

  return (
    <header className="h-16 border-b border-slate-200 bg-white flex items-center px-6 justify-between shrink-0 z-50">
      <div className="flex items-center space-x-4">
        <div className="relative" ref={containerRef}>
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="搜尋員工或功能..." 
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(!!query)}
            className="pl-10 pr-4 py-1.5 bg-slate-100 border-none rounded-full text-sm focus:ring-2 focus:ring-blue-500 w-64 transition-all focus:w-80"
          />

          {/* 搜尋建議選單 */}
          {isOpen && (filteredFunctions.length > 0 || filteredPeople.length > 0) && (
            <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl p-2 animate-in slide-in-from-top-2 duration-200">
              {filteredFunctions.length > 0 && (
                <div className="mb-2">
                  <p className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">功能導航</p>
                  {filteredFunctions.map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleSelectFunction(item.id)}
                      className="w-full flex items-center p-2 hover:bg-slate-50 rounded-xl text-sm text-slate-700 transition-colors"
                    >
                      <item.icon className="w-4 h-4 mr-3 text-slate-400" />
                      {item.label}
                    </button>
                  ))}
                </div>
              )}

              {filteredPeople.length > 0 && (
                <div>
                  <p className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">員工名單</p>
                  {filteredPeople.map(p => (
                    <button
                      key={p.header.emp_id}
                      onClick={() => handleSelectPerson(p)}
                      className="w-full flex items-center p-2 hover:bg-slate-50 rounded-xl text-sm text-slate-700 transition-colors"
                    >
                      <User className="w-4 h-4 mr-3 text-blue-400" />
                      <div className="text-left">
                        <p className="font-bold">{p.header.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{p.header.emp_id} | {p.header.shift}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-6">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-semibold text-slate-800">
            {staffData ? `民國 ${config?.roc_year || '---'} 年` : '載入中...'}
          </p>
          <p className="text-xs text-slate-500">
            {staffData?.month ? `${staffData.month} 月份資料` : '尚未載入來源'}
          </p>
        </div>
        
        <div className="flex items-center space-x-3 border-l pl-6 border-slate-200">
          <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
          </button>
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold border border-blue-200">
            <User className="w-4 h-4" />
          </div>
        </div>
      </div>
    </header>
  );
}
