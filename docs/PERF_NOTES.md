# 效能與實測紀錄

`./assets/index-DvCP7TDu.js` · [建置大小與 SHA-256](evidence/build.json)。2026-11-19，Debian 沙盒、2 vCPU、約 1.9 GiB，無可用實體 GPU 裝置節點；Node 20、Vite 8、Three.js r187、Playwright Chromium。**SwiftShader 的幀率不代表筆電的 GPU 幀率。**

## 功能整合

| 項目 | 結果與範圍 |
|---|---|
| 正式版 WebGL 2 smoke | 26/26；0 console errors；同一建置。[JSON](evidence/smoke-production-webgl.json) |
| 開發版 WebGL 2 smoke | 26/26；0 console errors；輸入原始碼雜湊相同。開發模組不是正式 bundle。[JSON](evidence/smoke-dev-webgl.json) |
| 自動後端、原生動畫迴圈 | 短測通過。[JSON](evidence/live-browser.json) |
| 入口縮圖 | 4 張解碼。[JSON](evidence/ui-production.json) |
| 五個坐姿及混音 | 5/5。[JSON](evidence/quiet-views.json) |
| 探索與日程 | 126 筆射線互動；0 未命中；12 小門 + 12 雙屋雪村。60 秒燈秀與開關斷言見 clock。 [JSON](evidence/discovery-webgl.json) |
| 多層碰撞 | 19 段樹冠膠囊步進；最高 10.53 m。3 橋／隧道另從入口走到出口。 [JSON](evidence/canopy-route.json) |
| 實際混音訊號 | 主輸出有訊號、靜音後衰減且能恢復；再驗音符排程。非人耳聽評。 [JSON](evidence/audio-witness-webgl.json) |
| 嵌套路徑解壓測試 | 解壓 ZIP 由 HTTP 子路徑載入，縮圖、走路和本機請求檢查通過。 [JSON](evidence/nested-archive-webgl.json) |

Smoke 使用實際按鍵、射線和碰撞；含局部放位與手動時間步，不能證明連續遊走。樹木 3,400 棵；常綠針葉 69.12%；平面冠幅估算 61.95%；綴燈 720 棵；主樹 21,200 顆燈泡。

## 12 × 四檔，WebGL 2

計數來自 `renderer.info`，含反射、陰影與後製；截圖的 `dt` **不是**幀時間。幾何／貼圖是觸及的資源件數，不是顯存位元組。

| 檔 | 張數 | 內部尺寸 | draw calls | 三角形 | 幾何 / 貼圖 |
|---|---:|---:|---:|---:|---:|
| low | 12/12 | 600 × 375 | 212–891 | 948,145–4,552,335 | 494–873 / 132–145 |
| medium | 12/12 | 800 × 500 | 256–894 | 1,310,080–4,718,630 | 873–987 / 147–149 |
| high | 12/12 | 919 × 575 | 289–907 | 1,594,154–4,941,140 | 987–1,108 / 149–149 |
| ultra | 12/12 | 1080 × 675 | 295–917 | 1,831,670–5,386,860 | 1,108–1,109 / 149–149 |

超過 Medium 1,000 draws 或 5M tris 的鏡位：無；超過 High 1,800 draws 或 9M tris：無。這不是硬體 FPS 門檻或全視角上限。 [JSON](evidence/shots-webgl.json) · [逐鏡索引](../screenshots/README.md)。Medium 即時 AO 開／關與 Low 保持關閉已另測；兩張相同鏡位的 2,560 點平均絕對亮度差 21.84。[JSON](evidence/near-art-webgl.json)

- high；6 個鏡位分解，超過門檻：無。[JSON](evidence/profiles-webgl-high-r10l.json)
- medium；6 個鏡位分解，超過門檻：無。[JSON](evidence/profiles-webgl-medium-r10l.json)

湖面與花園的固定區域亮度抽檢 8/8；與曾被城市平面覆蓋的黑面分開。這是遮擋回歸檢查，反射品質仍以圖像和視角判斷。[JSON](evidence/optical-fixtures-webgl.json)

## 20 m 可視密度（代理）

80 個類型有實際放置或事件節點的幾何定位。以 3D 半徑、表觀大小下限、地形和碰撞體遮擋作 360° 可見代理，不等於任一面向的實際像素。未逐枝葉或薄欄杆判遮擋。

| 地面格與偏移 | 至少三種 | 未達 | 14 區最少放置 / 可見種類 | 證據 |
|---|---:|---:|---:|---|
| 6 m / 0.5, 0.5 | 5,811 / 5,811 | 0 | 13 / 15 | [JSON](evidence/decoration-density-webgl-r10l.json) |
| 4.93 m / 0.25, 0.74 | 8,955 / 8,955 | 0 | 13 / 15 | [JSON](evidence/decoration-density-webgl-r10l-holdout.json) |
| 4.16 m / 0.39, 0.91 | 11,895 / 11,895 | 0 | 13 / 15 | [JSON](evidence/decoration-density-webgl-r10l-repaired-416.json) |
| 3.83 m / 0.63, 0.37 | 13,809 / 13,814 | 5 | 13 / 15 | [JSON](evidence/decoration-density-webgl-r10l-audit-383.json) |
| 3.61 m / 0.08, 0.46 | 15,317 / 15,317 | 0 | 13 / 15 | [JSON](evidence/decoration-density-webgl-r10l-repaired-361.json) |

固定佈景新增 16 處局部小景、六類組合。舊弱點 17 點仍可通行，CPU 視域代理皆達三種；修補輸入 4.16 m 11,895/11,895、3.61 m 15,317/15,317。未取作佈景輸入的獨立 CPU 格：6 m 5,811/5,811、4.93 m 8,955/8,955、3.83 m 13,809/13,814、3.27 m 18,381/18,388。總點數因新增的小碰撞體可略變；不把被阻擋的舊弱點算成修好。[JSON](evidence/decoration-edge-refine-r10l.json)

## 兩個渲染後端

- direct · vulkan-sw：目標像素有色差 137.95，合成影像色差 0；1 errors。失敗。 [JSON](evidence/gpu-park-vulkan-sw-r10l-direct.json)
- gpu-readback-2d · vulkan-sw：目標像素有色差 137.95，合成影像色差 132；0 errors。完成。 [JSON](evidence/gpu-park-vulkan-sw-r10l.json)
- 12 個 WebGPU 鏡位；12 張直接取呈現後畫布。swiftshader，gpu-readback-2d。[JSON](evidence/shots-gpu-r10l.json)
- WebGPU 原生 RAF、實際 W、設定鍵及兩個不同的可見頁面畫素通過短測。[JSON](evidence/gpu-live-vulkan-sw-r10l.json)
同鏡位色調對照：[WebGPU AgX](../screenshots/tone-gpu-agx.png) · [WebGPU ACES](../screenshots/tone-gpu-aces.png)。

在沙盒裡，直接 WebGPU canvas 轉交合成器失敗的紀錄保留（[實景對照](evidence/gpu-park-vulkan-sw-r10c.json)；[極小梯度驗證](evidence/gpu-canvas-profiles.json)）。看到成功提交不代表看到畫面。本版另在軟體 adapter 上經 RGBA8 readback → 2D 呈現，已用實際瀏覽器合成像素檢查；3D+HDR 仍由 WebGPU 做。這不是原生交換鏈或實體 GPU 驗收。

## 連續漫步耐久

使用 `./assets/index-DvCP7TDu.js`（本版）、WebGL 2、low、384 × 240 視窗，1800.47 / 1800 秒；471 次新增提交、471 次確認完成、3,994.7 m、122 個路點。 通過該路線腳本的斷言。 [JSON](evidence/soak-live-webgl-r10l.json)

確認出屋：ranger、glass、toys、santa、log。活動：lie、ice、ice exit、carousel、canopy、shake；導航異常 0、console errors 0；造訪 14 區。最長提交間隔 17.34 s；context 遺失 無。GC 後 CDP JS heap 38.0 MiB → 69.0 MiB；第 15 分鐘 67.0 MiB。最後 21 個 GC 後 JS heap 樣本範圍 68.3 MiB–69.1 MiB；觸及的幾何 1,866 → 1,879，貼圖 147 → 147。資源可能因首次接近而常駐，JS heap 不涵蓋驅動和 GPU；單趟不是無洩漏證明。

每 5 m 於已走路線測 360° 視域。728 個完整 180 s 窗中：至少有 24 種，未達三種 0 窗；若只算首次看到的實例，最低 0 種、78 窗未達；若只算從未看到的分類，最低 0 種、430 窗未達。前向錐代理（獨立只記進入過前向錐的實例）最低 5 種、0 窗未達。不混稱為「新發現」。

另附 [歷史加速路線](evidence/soak-accelerated-webgl.json)；與上述原生 RAF 分開。

## 其他桌面引擎

- firefox 159.0（低檔、暫停動畫迴圈的取景診斷）：完成 2 張；手動步進 1.35 m。 [promenade](../screenshots/render-check/compat-firefox-promenade.png)、[cabin](../screenshots/render-check/compat-firefox-cabin.png) [JSON](evidence/compat-firefox-first-frame.json)
- firefox 159.0（低檔、原生迴圈短測）：未通過；已啟動 WebGL 2。 Aborted in walk stage after sandbox tool responses timed out; no completed native walk or compositor image confirmed. [JSON](evidence/compat-firefox-live-lite.json)
- firefox 159.0（原生迴圈初測）：未通過。 TimeoutError: page.waitForFunction: Timeout 95000ms exceeded. [JSON](evidence/compat-firefox.json)
- webkit 27.2（低檔、暫停動畫迴圈的取景診斷）：未通過；已啟動 WebGL 2。手動步進 1.35 m。 The diagnostic timed out during the first PNG capture (122 s job watchdog). Startup and scripted movement returned, but no PNG was produced. [JSON](evidence/compat-webkit-first-frame.json)
- webkit 27.2（原生迴圈初測）：未通過。 TimeoutError: locator.getAttribute: Timeout 30000ms exceeded. [JSON](evidence/compat-webkit.json)

Linux Playwright WebKit 非 macOS Safari；仍缺 Safari／Edge 實機、多 DPI、實體 GPU 1080p/1440p、GPU VRAM、耳機長聽與普遍 3A 主觀評級。
