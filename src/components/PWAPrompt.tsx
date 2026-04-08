import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const PWAPrompt: React.FC = () => {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered:', r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!offlineReady && !needRefresh) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white rounded-xl shadow-2xl border border-emerald-100 p-4 max-w-sm w-full">
        <div className="flex items-start gap-4">
          <div className="bg-emerald-100 p-2 rounded-full">
            <RefreshCw className={cn("w-5 h-5 text-emerald-600", needRefresh && "animate-spin")} />
          </div>
          
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900">
              {needRefresh ? '發現新功能可用！' : '系統已備便離線使用'}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {needRefresh 
                ? '我們更新了 Excel 樣板與修正，請立即更新以獲得最佳體驗。' 
                : '所有檔案已快取完畢，下次沒網路也能正常操作。'}
            </p>
            
            <div className="flex gap-2 mt-3">
              {needRefresh && (
                <button
                  onClick={() => updateServiceWorker(true)}
                  className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  立即更新
                </button>
              )}
              <button
                onClick={close}
                className="px-3 py-1.5 bg-gray-50 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-100 transition-colors"
              >
                稍後再說
              </button>
            </div>
          </div>

          <button onClick={close} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAPrompt;
