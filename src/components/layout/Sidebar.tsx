import { 
  Users, 
  Calendar, 
  Clock, 
  Settings, 
  FileText,
  ChevronRight,
  Palmtree
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useState } from 'react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: '總覽與載入', icon: FileText },
    { id: 'overtime', label: '加班處理', icon: Clock },
    { id: 'holiday', label: '國定假日', icon: Palmtree },
    { id: 'vehicle', label: '車輛排班', icon: Calendar },
    { id: 'staff', label: '員工管理', icon: Users },
    { id: 'settings', label: '系統設定', icon: Settings },
  ];

  return (
    <aside 
      className={cn(
        "bg-slate-900 text-slate-300 transition-all duration-300 flex flex-col h-screen",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <div className="p-4 flex items-center justify-between border-b border-slate-800">
        {!isCollapsed && <span className="font-bold text-white text-lg truncate">Staff Manager</span>}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 hover:bg-slate-800 rounded-md"
        >
          <ChevronRight className={cn("w-5 h-5 transition-transform", isCollapsed ? "" : "rotate-180")} />
        </button>
      </div>

      <nav className="flex-1 py-4 px-2 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center p-3 rounded-lg transition-colors group",
                isActive 
                  ? "bg-blue-600 text-white" 
                  : "hover:bg-slate-800 hover:text-slate-100"
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className={cn("w-5 h-5 flex-shrink-0", isCollapsed ? "" : "mr-3")} />
              {!isCollapsed && <span className="font-medium">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 text-xs text-slate-500">
        {!isCollapsed && <span>v2.0.0 (Web App)</span>}
      </div>
    </aside>
  );
}
