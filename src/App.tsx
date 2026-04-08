import { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { Dashboard } from './pages/Dashboard';
import { OvertimeProcessing } from './pages/OvertimeProcessing';
import { PublicHoliday } from './pages/PublicHoliday';
import { VehicleManagement } from './pages/VehicleManagement';
import { Settings } from './pages/Settings';
import { StaffManagement } from './pages/StaffManagement';
import { useStaffStore } from './store/useStaffStore';
import PWAPrompt from './components/PWAPrompt';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const loadFromIndexedDB = useStaffStore((state) => state.loadFromIndexedDB);

  useEffect(() => {
    loadFromIndexedDB();
  }, [loadFromIndexedDB]);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans antialiased text-slate-900">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar setActiveTab={setActiveTab} />
        
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'overtime' && <OvertimeProcessing />}
            {activeTab === 'holiday' && <PublicHoliday />}
            {activeTab === 'vehicle' && <VehicleManagement />}
            {activeTab === 'staff' && <StaffManagement />}
            {activeTab === 'settings' && <Settings />}
            {activeTab !== 'dashboard' && activeTab !== 'overtime' && activeTab !== 'holiday' && activeTab !== 'vehicle' && activeTab !== 'staff' && activeTab !== 'settings' && (
              <div className="flex flex-col items-center justify-center h-64 bg-white border border-slate-200 border-dashed rounded-2xl">
                <p className="text-slate-400 font-medium">「{activeTab}」功能模組開發中...</p>
                <button 
                  onClick={() => setActiveTab('dashboard')}
                  className="mt-4 text-blue-600 font-semibold hover:underline"
                >
                  返回首頁
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
      <PWAPrompt />
    </div>
  );
}

export default App;
