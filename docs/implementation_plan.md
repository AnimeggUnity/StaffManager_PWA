# PWA 離線使用與即時更新升級計畫

本計畫旨在將應用程式提升為具備「主動更新提醒」與「全功能離線支援」的完整 PWA。

## 核心變更

### 1. 調整 PWA 註冊策略 [MODIFY] [vite.config.ts](file:///home/ubuntu/wordtoexcel/staff_manager/frontend/vite.config.ts)
- 將 `registerType` 從 `autoUpdate` 改為 `prompt`。
- 這樣當系統有新版時，Service Worker 會進入 `waiting` 狀態，等待使用者點擊按鈕後才切換新版，避免在使用中途重新載入。

### 2. 建立更新提示組件 [NEW] [PWAPrompt.tsx](file:///home/ubuntu/wordtoexcel/staff_manager/frontend/src/components/PWAPrompt.tsx)
- 使用 `useRegisterSW` 鈎子監聽更新事件。
- 提供一個美觀、沉浸式的通知視窗（Toast），包含「更新並重新載入」與「稍後再說」按鈕。

### 3. 主入口整合 [MODIFY] [App.tsx](file:///home/ubuntu/wordtoexcel/staff_manager/frontend/src/App.tsx) 與 [main.tsx](file:///home/ubuntu/wordtoexcel/staff_manager/frontend/src/main.tsx)
- 在 `main.tsx` 中移除自動註冊邏輯。
- 在 `App.tsx` 顶層引入 `PWAPrompt` 組件。

## 離線支援驗證
- 確保 `public/templates/*.xlsx` 檔案已納入 Workbox 的預載清單。
- 驗證 Service Worker 快取大小限制（已設為 5MB，足以應付目前的模板）。

## 驗證計畫
### 自動測試
- 使用 Chrome DevTools 的 Application > Service Workers 模擬更新推送。
- 檢查分頁在「無網路」狀態下重新整理後是否能正常顯示已有的員工資料與樣板。

### 手動驗證
- 發佈一個微小變動到 GitHub，觀察網頁是否會跳出「新版可用」的提示。
