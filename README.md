# 訓練打卡 Training Check-in

個人跑步訓練週計畫打卡 App。

## 功能
- 📅 每日訓練打卡（±7天滑動）
- 📊 本月累積跑量 / 每月結算
- 🏁 賽事倒數（可新增多場賽事）
- 📆 月曆檢視（訓練記錄 + 賽事標記）

## 本地開發

```bash
npm install
npm run dev
```

## 部署到 GitHub Pages

1. 安裝 gh-pages：
```bash
npm install --save-dev gh-pages
```

2. 在 `package.json` 的 scripts 加入：
```json
"deploy": "vite build && gh-pages -d dist"
```

3. 執行：
```bash
npm run deploy
```

> 資料儲存於 localStorage，不需要後端。
