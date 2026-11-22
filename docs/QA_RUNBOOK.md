# 重現驗收

Chromium／SwiftShader 適合重現功能及截圖，不是硬體幀率的評分環境。驗收以 `docs/evidence/*.json` 的 `build` 和 [建置 SHA-256](evidence/build.json) 對照，不以檔名中的版本代替。

```bash
npm ci
npx playwright install --with-deps chromium
npm run test:unit
npm run build
npm run preview -- --port 5173 --strictPort
```

另一個終端機（軟體 GPU 環境請一次執行一個瀏覽器工作）：

```bash
export PARK_URL=http://localhost:5173/
TARGET=production npm test           # 五屋、五座、玩法、天氣、相機、實際 PNG 下載
npm run qa:discovery                # 逐件射線、24 微縮場址與節奏斷言
npm run qa:canopy                   # 在實際膠囊碰撞上步進樓層、橋與隧道
npm run qa:seats                    # 入座實際眼位、混音參數、離場
npm run qa:journey                  # 真鍵鼠輸入、前景 RAF、自動渲染後端
GRID=6 REQUIRE=1 npm run qa:density # 360° 種類下限；非畫素測量
GRID=4.93 PHASE=.25,.74 RUN_ID=holdout npm run qa:density
QUALITY=medium REQUIRE=1 OUT=docs/evidence/profiles-webgl-medium.json npm run qa:profile
QUALITY=high REQUIRE=1 OUT=docs/evidence/profiles-webgl-high.json npm run qa:profile
OUT=screenshots/detail npm run qa:art # AO 開關與材質近景
node scripts/audio-witness.mjs       # 實際 Web Audio 訊號；不是人耳聽評
PREVIEWS=1 W=800 H=500 npm run shots # 12 鏡位 × 4 檔，另有 tone 及入口縮圖
npm run build                       # 入口縮圖更新後重建；JS 識別碼應維持相同
TARGET=production npm run qa:ui    # 載入重建產物並解碼縮圖
RUN_ID=release W=384 H=240 QUALITY=low SECONDS_TOTAL=1800 npm run soak:live
```

**需看畫面。** `shots` 檢查不透明度、亮度跨度、HDR 設定和檔案雜湊，不能評估透視、氛圍、材質真實性或幀間閃爍。`python scripts/shot-sheet.py --tier all`（選裝 Pillow）可組成檢視表。也請在目標裝置快速轉向、走完橋坡、跨室內門檻，並用實際耳機長聽。

### WebGPU 不是 WebGL2 截圖的別名

有真正 WebGPU 硬體時，設 `HARDWARE=1`，不加軟體 adapter flags；同時保留 `BACKEND=webgl` 的獨立測試。沙盒軟體路徑的重現命令：

```bash
GPU_PROFILE=vulkan-sw RUN_ID=bridge npm run qa:gpu:park
GPU_PROFILE=vulkan-sw RUN_ID=bridge npm run qa:gpu:live
GPU_PROFILE=vulkan-sw RUN_ID=direct PRESENT=direct npm run qa:gpu:park
BACKEND=gpu GPU_PROFILE=vulkan-sw TIERS=medium W=640 H=400 RUN_ID=sw npm run shots
```

`qa:gpu:park` 核對 tone-mapped 離屏結果、可見 canvas 及瀏覽器合成圖；軟體讀回模式的 `shots` 取呈現後畫布，不把離屏紋理當可見矩陣；另用 `qa:gpu:live` 實際 W 和 Tab 測互動及前景幀。照片的導出讀回並非交換鏈證據。`PRESENT=direct` 在無實體 GPU 的沙盒可得到空白或 GPU validation failure；不能把有像素的離屏 PNG 當成通過該對照。`GPU_PROFILE` 是驗收工具的啟動旗標，製品不要求玩家設定環境變數。

### 開發伺服器與離線發行

```bash
npm run qa:dev                      # 匿名本機 Vite 埠，測完自動關閉
npm run docs:poi
node scripts/evidence-doc.mjs
python scripts/release.py
node scripts/verify-release.mjs ../winter-wonderland-playable.zip
```

發行腳本拒絕把舊 bundle 的圖片與測試紀錄當成目前版。`verify-release.mjs` 會暫時開一個本機 HTTP 埠並清理。若手動測試，將 `winter-wonderland-playable.zip` 解壓到一個 HTTP 根目錄下的 `parks/winter/`，再執行 `PARK_URL=http://localhost:4173/parks/winter/ npm run qa:archive`，測真正的子路徑、同源資產與鍵盤走路。不要使用 `file://`，也不要讓測試依賴 Vite 的 SPA 404 回退。相依套件安裝完後，`npm run dev` 和 ZIP 不需要外部服務或帳號。

在低記憶體 CI，可依序執行 `soak:live` 和 `RUN_ID=release bash scripts/candidate-checks.sh`；後者不會啟動另一次耐久測試。Firefox／WebKit 的 Linux 模擬路徑需另裝相依與 Xvfb。它們的結果要與 macOS Safari 分開。

```bash
PW_ENGINE=firefox xvfb-run -a node scripts/compat-first-frame.mjs
```

診斷模式在 384×240 視窗只啟動首幀，再用手動步進及明確的 PNG 擷取，不算實時步行。另可設 `CHECK=live-lite` 在資源允許的設備上測真實 W 輸入和原生動畫迴圈；需檢視瀏覽器合成 PNG，且它仍不是 30 分鐘耐久。兩種模式都記錄啟動及卡住的步驟。

正式封裝使用 `WW_REQUIRE_NESTED=1 WW_REQUIRE_SOAK=1 python scripts/release.py`：前者要求實際解壓 HTTP 驗證的 runtime 檔案指紋，後者要求同一正式 JS 的 30 分鐘 pass、兩個嚴格檔位與同來源 dev smoke。若剛更新縮圖，先重建，並重驗 `WW_ONLY_PLAYABLE=1` 的暫存包。最終 ZIP 再驗一次，將 `PARK_PROOF_OUT` 指向 ZIP 外的結果檔，避免輸入 ZIP 包含自己的摘要。`node scripts/verify-source.mjs ../winter-wonderland-source.zip` 另測原始碼壓縮包可安裝鎖定套件、跑單元並重建逐檔相同產品；`WW_SOURCE_PROOF` 可指定 ZIP 外的證據檔，已有 npm cache 可用 `WW_OFFLINE=1`。

選裝 Pillow 時，`python scripts/compact-captures.py` 可在封裝前去掉全不透明 PNG 的冗餘 alpha，逐像素驗證並更新 JSON 雜湊。不改顏色、尺寸或裁切；證據保留瀏覽器原始位元組 digest。
