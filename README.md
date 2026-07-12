# 🏙 香港城市儀表板 HK City Dashboard

<div align="center">

![Hong Kong City Dashboard](https://img.shields.io/badge/Hong%20Kong-City%20Dashboard-blue?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiI+PHJlY3QgeD0iMiIgeT0iMjIiIHdpZHRoPSI0IiBoZWlnaHQ9IjgiIHJ4PSIxIiBmaWxsPSIjNjBhNWZhIi8+PHJlY3QgeD0iOCIgeT0iMTYiIHdpZHRoPSI0IiBoZWlnaHQ9IjE0IiByeD0iMSIgZmlsbD0iIzYwYTVmYSIvPjxyZWN0IHg9IjE0IiB5PSIxMCIgd2lkdGg9IjQiIGhlaWdodD0iMjAiIHJ4PSIxIiBmaWxsPSIjNjBhNWZhIi8+PHJlY3QgeD0iMjAiIHk9IjE0IiB3aWR0aD0iNSIgaGVpZ2h0PSIxNiIgcng9IjEiIGZpbGw9IiM2MGE1ZmEiLz48L3N2Zz4=)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Data Source](https://img.shields.io/badge/Data-data.gov.hk-red?style=for-the-badge)
![PWA](https://img.shields.io/badge/PWA-Ready-purple?style=for-the-badge)
![Pages](https://img.shields.io/badge/Pages-15-orange?style=for-the-badge)

**全港最完整的免費開源實時城市數據儀表板**

A comprehensive, real-time open-source city dashboard for Hong Kong using 100% government open data APIs

[🌐 Live Demo](https://realfrankhau.github.io/hk-dashboard/index.html) · [📱 Install as App](#pwa)

</div>

---


## ✨ Features · 功能

### 🌤 天氣 Weather
- **實時天氣** — 氣溫、濕度、紫外線、海水溫度（香港天文台 HKO）
- **九天預報** — 圖示、最高/最低溫、降雨概率
- **本地天氣預報全文** — 天氣概況、預測、展望
- **天氣警告系統** — 颱風（T1–T10）、暴雨（黃/紅/黑）、寒冷、酷熱警告，全幅顏色橫幅提示
- **各區氣溫分佈** — 全港 26 個氣象站即時溫度
- **各區降雨量** — 過去一小時降雨數據
- **實時熱帶氣旋路徑圖** — 即時熱帶氣旋資訊

### 🚇 交通 Transport
- **港鐵班次** — 所有路線實時班次，30秒刷新
- **輕鐵班次** — 各站各月台分組顯示
- **MTR 服務狀況** — 所有路線是否正常，故障即時提示

### 🚌 巴士 Bus ETA
- **路線搜尋** — 輸入路線號，自動列出所有站點，點擊即顯示到站時間
- **KMB 九巴** — 全港 1600+ 路線，實時 ETA
- **CTB 城巴** — 實時到站時間
- **GMB 專線小巴** — 新界/九龍/港島所有路線
- **常用站點** — 預設青衣/東涌/空郵中心常用路線

### 🚢 渡輪 Ferry ETA
- **新渡輪航線** — 來往中環至長洲及梅窩、北角至紅磡及九龍城和各橫水渡航線
- **港九小輪航線** — 來往中環、榕樹灣、索罟灣、坪洲、喜靈洲

### 🌊 潮汐 Tides
- **逐時潮汐圖** — SVG 折線圖顯示今日 24 小時潮汐高度
- **所有香港天文台的測潮站**

### 🏥 醫療 Healthcare
- **急症室等候時間** — 全港所有公立醫院，每小時更新

### 📅 假期 Holidays
- **公眾假期** — 2024-2026 全部法定假期，倒計時下一個假期
- **24 節氣** — 當前節氣及下一個節氣倒計時
- **年份切換** — 2024/2025/2026 完整假期列表

### ✈️ 航班 Flights
- **航班資訊** — 離港及抵航班資訊



---

## 📱 PWA — 安裝為手機 App {#pwa}

這個儀表板支援 PWA（Progressive Web App），可以像原生 App 一樣安裝到手機主屏幕：

**iOS (iPhone/iPad):**
1. 用 Safari 打開網站
2. 點擊底部分享按鈕 `⬆`
3. 選「加入主畫面」

**Android:**
1. 用 Chrome 打開網站
2. 點擊「安裝」提示橫幅，或選單 → 「安裝應用程式」

**功能：**
- ✅ 離線緩存 — 無網絡時顯示上次數據
- ✅ 全屏顯示 — 無瀏覽器欄
- ✅ 主屏幕圖示

---

## 🗂 Data Sources · 數據來源

| 數據 | 來源 | API |
|------|------|-----|
| 天氣、潮汐、地震 | 香港天文台 HKO | `data.weather.gov.hk` |
| 急症室等候時間 | 醫院管理局 HA | `ha.org.hk` |
| MTR / 輕鐵班次 | 香港鐵路 MTR | `mtr.com.hk` |
| KMB 九巴 ETA | 九龍巴士 | `kmb.hk` |
| CTB 城巴 ETA | 城巴 | `mobile.citybus.com.hk` |
| GMB 專線小巴 | 運輸署 | `data.etagmb.gov.hk` |
| 新渡輪 ETA | 新渡輪 | `sunferry.com.hk` |
| HKKF ETA | 港九小輪 | `hkkf.com.hk` |
| 公眾假期 | 1823 | `1823.gov.hk` |
| 航班資訊 | 香港國際機場 | `hongkongairport.com` |




> 所有數據來自香港政府官方開放數據平台 [data.gov.hk](https://data.gov.hk)，完全免費使用。

---

## 🚀 Quick Start · 快速開始

### 直接使用
打開 [Live Demo](https://realfrankhau.github.io/hk-dashboard/index.html) 即可，無需安裝。

### 本地運行
```bash
# Clone the repo
git clone https://github.com/RealFrankhau/hk-dashboard.git
cd hk-dashboard

# Serve locally (Python)
python3 -m http.server 8080

# Or with Node.js
npx serve .
```

打開 `http://localhost:8080`

### Replit 部署
1. 打開 [replit.com](https://replit.com)
2. 點「+ Create Repl」→「Import from GitHub」
3. 輸入 `https://github.com/RealFrankhau/hk-dashboard`
4. 點「Run ▶」

---

## 🏗 Project Structure · 項目結構

```
hk-dashboard/
├── index.html          # 主頁面（15個分頁）
├── manifest.json       # PWA 設定
├── sw.js               # Service Worker（離線緩存）
├── css/
│   ├── tokens.css      # CSS 設計 tokens（顏色/字體/間距）
│   └── base.css        # 基礎樣式 + 響應式
└── js/
    ├── core.js         # 主題切換、時鐘、農曆、導航
    ├── weather.js      # 天氣模組（HKO）
    ├── transport.js    # 交通模組（MTR/LRT）
    ├── bus.js          # 巴士 ETA（KMB/CTB/GMB）
    ├── tides.js        # 潮汐 + 地震 + 天氣展望
    ├── typhoon.js      # 颱風資訊及路徑
    ├── health.js       # 急症室等候時間
    ├── flights.js      # 香港國際機場抵港及離港航班資訊    
    ├── holidays.js     # 公眾假期 + 節氣
    └── app.js          # 主入口（初始化 + 自動刷新）
```

---

## 🛠 Tech Stack · 技術棧

| 技術 | 用途 |
|------|------|
| Pure HTML/CSS/JS | 零依賴，無需構建工具 |
| [Leaflet.js](https://leafletjs.com/) | 互動地圖（CDN） |
| [CartoDB Tiles](https://carto.com/) | 深色/淺色地圖底圖 |
| Service Worker | PWA 離線支援 |
| CSS Custom Properties | 深色/淺色主題切換 |
| Google Fonts | Noto Sans TC + Inter + JetBrains Mono |


---

## 🎨 Design System · 設計系統

- **主色** `#60a5fa`（深色）/ `#0070c0`（淺色）
- **背景** 深海軍藍 `#0d1b2e`（深色）/ 白 `#ffffff`（淺色）
- **字體** Noto Sans TC（中文）、Inter（英文）、JetBrains Mono（數字）
- **圓角** 一致的 border-radius tokens
- **動畫** 骨架屏載入、脈衝徽章、平滑過渡

---

## 📄 License · 授權

MIT License — 免費使用、修改、分發。

詳見 [LICENSE](LICENSE) 文件。

---

## 🙏 Acknowledgements · 致謝

- [香港天文台 Hong Kong Observatory](https://www.hko.gov.hk/) — 天氣、潮汐、地震數據
- [data.gov.hk](https://data.gov.hk/) — 香港政府開放數據平台
- [醫院管理局 HA](https://www.ha.org.hk/) — 急症室數據
- [香港鐵路 MTR](https://opendata.mtr.com.hk/) — 班次數據
- [Leaflet.js](https://leafletjs.com/) — 開源地圖庫

---

<div align="center">

**如果喜歡這個項目，請給一個 ⭐ Star！**


</div>
