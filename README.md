# 永彰科技大樓 Three.js 3D 圖台

以永彰科技 14 樓 SVG 平面圖建立的網頁端 3D 建築與智慧空間管理原型，支援大樓樓層導覽、設備監控、環境數據及互動式平面圖。

## 線上預覽

[開啟 GitHub Pages](https://nofxyuan.github.io/three-floor-plan/)

## 主要功能

- 22 層大樓外觀、道路、植栽與 360° 自動展示
- 點選 14 樓切換至 3D 平面圖
- 3D、俯視、縮放、旋轉、平移及全螢幕操作
- SVG 牆面、隔間、柱體與空間名稱立體化
- 空間滑鼠感應與溫度、濕度、CO₂ 數值
- 會議室預約中／使用中狀態
- 各區域冷氣與溫濕度感應器
- 設備狀態顏色、異常紅色光暈及 XYZ 座標微調
- 可拖曳 SOS 緊急設備、綠燈待命與紅燈警報
- 18 組照明單獨控制與群控開關
- 7 支 CCTV 狀態、八方向角度、拖曳與錄影畫面
- 依系統時間呈現早晨／傍晚光影
- 閒置自動切換 2D 的省電模式
- 依硬體調整解析度與 FPS 的效能優化

## 操作方式

| 操作 | 說明 |
| --- | --- |
| 滑鼠左鍵拖曳 | 旋轉 3D 場景 |
| 滑鼠滾輪 | 拉近或拉遠 |
| 滑鼠右鍵拖曳 | 平移場景 |
| 點選 14F | 由大樓外觀進入 14 樓 |
| 點選 CCTV | 開啟監視錄影畫面 |
| 空間設定 | 控制設備、照明、會議室及日照狀態 |

## 技術

- Three.js `0.179.x`
- Vite `7.x`
- JavaScript ES Modules
- SVG 平面圖解析與材質貼圖
- GitHub Actions 與 GitHub Pages

## 本機執行

```bash
pnpm install
pnpm dev
```

瀏覽器開啟 `http://127.0.0.1:5173/`。

## 正式建置

```bash
pnpm build
pnpm preview
```

建置結果會輸出至 `dist/`。

## 版本歷史

> 版本號為功能里程碑整理，詳細變更以 Git Commit 為準。

### v1.8.0 — SOS 警示燈造型（2026-07-23）

- SOS 設備改為透明圓頂警示燈模型。
- 增加金屬底座、防護環與中央雙向燈芯。
- 紅色警報時燈罩增亮並旋轉，綠色狀態維持待命常亮。

相關提交：[SOS 警示燈](https://github.com/nofxyuan/three-floor-plan/commit/7aaf219)

### v1.7.0 — SOS 緊急設備（2026-07-23）

- 14 樓畫面中央新增 SOS 緊急設備模型。
- 支援物件拖曳與 XYZ 座標微調。
- 設定面板可切換綠燈待命及紅燈警報。
- 啟動 SOS 時同步顯示紅色光暈與警報狀態。

相關提交：[SOS 緊急設備](https://github.com/nofxyuan/three-floor-plan/commit/b439516)

### v1.6.0 — CCTV 錄影與效能優化（2026-07-23）

- CCTV 點選後顯示辦公室錄影圖片、時間、頻道與方向。
- 停用非異常設備的點光源運算，降低陰影與像素密度負擔。
- 快取射線偵測目標，限制滑鼠偵測頻率及渲染 FPS。

相關提交：[CCTV 錄影畫面](https://github.com/nofxyuan/three-floor-plan/commit/025e3df)・[場景效能優化](https://github.com/nofxyuan/three-floor-plan/commit/f3b717c)

### v1.5.0 — 區域設備與燈光群控（2026-07-23）

- 各空間增加冷氣與溫濕度感應器。
- 新增 18 組照明群控開關。
- CCTV 改為藍色，提高模型辨識度。

相關提交：[燈光群控](https://github.com/nofxyuan/three-floor-plan/commit/8c74967)・[CCTV 藍色樣式](https://github.com/nofxyuan/three-floor-plan/commit/2cb4203)・[區域設備](https://github.com/nofxyuan/three-floor-plan/commit/4efd17c)

### v1.4.0 — 大樓外觀與日照系統（2026-07-23）

- 依參考照片重建玻璃帷幕、陽台及大樓比例。
- 增加道路、標誌、花叢與樹木。
- 新增系統時間光影、早晨與傍晚切換。
- 調整牆面、地板對比與物件陰影。

相關提交：[大樓外觀](https://github.com/nofxyuan/three-floor-plan/commit/e2b16ce)・[時間光影](https://github.com/nofxyuan/three-floor-plan/commit/3228932)・[道路植栽](https://github.com/nofxyuan/three-floor-plan/commit/401b710)

### v1.3.0 — 大樓導覽與裝置操作（2026-07-22）

- 建立 22 層大樓總覽與 14 樓場景切換。
- 新增自動拉近、拉遠及 360° 旋轉展示。
- CCTV 支援拖曳，設定面板顯示目前調整的裝置編號。
- 平面圖增加 3D 操作提示。

相關提交：[CCTV 拖曳](https://github.com/nofxyuan/three-floor-plan/commit/a48ae86)・[大樓 360° 控制](https://github.com/nofxyuan/three-floor-plan/commit/b6ea21d)・[自動展示](https://github.com/nofxyuan/three-floor-plan/commit/80c5cfc)

### v1.2.0 — 智慧空間管理（2026-07-22）

- 新增溫度、濕度與 CO₂ 空間資訊。
- 修正 404、406 會議室區域感應。
- 新增會議室預約中／使用中狀態。
- 新增照明、CCTV 狀態及八方向角度控制。

相關提交：[環境資訊](https://github.com/nofxyuan/three-floor-plan/commit/3dbd8a5)・[CO₂](https://github.com/nofxyuan/three-floor-plan/commit/c7595f2)・[會議室狀態](https://github.com/nofxyuan/three-floor-plan/commit/bf96996)・[照明與 CCTV](https://github.com/nofxyuan/three-floor-plan/commit/2a45345)

### v1.1.0 — GitHub Pages 與省電模式（2026-07-22）

- 設定 GitHub Actions 自動部署至 GitHub Pages。
- 將 SVG 納入建置資源並處理瀏覽器快取。
- 新增可設定分鐘數的 2D 省電模式。

相關提交：[Pages 部署](https://github.com/nofxyuan/three-floor-plan/commit/037b45b)・[SVG 資源](https://github.com/nofxyuan/three-floor-plan/commit/6f2489b)・[省電模式](https://github.com/nofxyuan/three-floor-plan/commit/56fb794)

### v1.0.0 — 初始 3D 平面圖（2026-07-22）

- 將單樓層 SVG 平面圖轉換成 Three.js 3D 場景。
- 完成牆面、隔間、柱體、視角切換與基本互動。

相關提交：[初始版本](https://github.com/nofxyuan/three-floor-plan/commit/dd3a716)
