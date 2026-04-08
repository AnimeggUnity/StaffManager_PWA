# PWA 離線使用與即時更新功能實錄

本系統已升級至具備「主動更新通知」與「離線全功能」的專業級 PWA 規格。

## 主要更新內容

### 1. 離線工作流優化
我們在 [vite.config.ts](file:///home/ubuntu/wordtoexcel/staff_manager/frontend/vite.config.ts) 中將所有 Excel 樣板 (`.xlsx`) 納入了靜態預載清單。
> [!TIP]
> 系統現在支援在完全斷網的情況下開啟 App 並產出 Excel 報表，確保特殊作業環境下的穩定度。

### 2. 即時更新提醒 (Update Prompt)
系統偵測到新版時（例如樣板修正），會在右下角顯示 [PWAPrompt.tsx](file:///home/ubuntu/wordtoexcel/staff_manager/frontend/src/components/PWAPrompt.tsx) 通視窗：

| 狀態 | 通知視覺表現 | 觸發按鈕 |
| :--- | :--- | :--- |
| **發現新版** | 顯示「發現新功能可用！」 | 立即更新 (Reload) |
| **備便離線** | 顯示「系統已備便離線使用」 | 稍後再說 (Close) |

### 3. 操作流程調整
- 移除 `main.tsx` 中的自動強制更新邏輯，確保資料安全性。
- 在 `App.tsx` 加入頂層監聽，確保使用者在任何分頁都能收到更新通知。

## 驗證紀錄

### PWA 通訊驗證
Service Worker 已在 [main.tsx](file:///home/ubuntu/wordtoexcel/staff_manager/frontend/src/main.tsx) 中清理完畢，並成功透過組件接管。

### 更新流程錄製
請觀察右下角的閃爍提示，這是目前系統中最新的「主動告知」模式。這比先前的隱身靜默更新更有感，也能確保使用者拿到的永遠是您最新修正過的邊框樣板。
