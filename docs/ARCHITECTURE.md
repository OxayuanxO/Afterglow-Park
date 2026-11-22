# 架構與可調資料

## 執行流程

`index.html` → `main.js` 建立 UI → `WebGPURenderer.init()` → 程序化建世界 → 第一幀 → 入口。切換 HUD／面板不重建情景。無框架與後端。由單一迴圈驅動 camera、事件、天氣、發現、音源和畫面；尚未完成的 GPU 提交會節流，不累積無限待呈現幀。失焦會清掉按住的按鍵，分頁隱藏暫停呈現。

| 模組 | 職責 |
|---|---|
| `main.js`, `ui.js`, `styles.css` | 建置流程、實際輸入、焦點、模態面板、讀寫 localStorage、照片 PNG、設定與畫質串接。 |
| `scene.js`, `quality.js`, `lighting.js` | 共用 WebGPU/WebGL 2 TSL；HalfFloat 線性色彩、AgX/ACES → sRGB、門檻 bloom、色溫/暗角/顆粒、可選 DOF。月光陰影有更新閥值；固定 6 個點光 slot 重新指派；高度霧與烘焙暖光場；暖光場 alpha 存近地接觸遮蔽。 |
| `world.js`, `terrain.js`, `environment.js` | 按固定 seed 分段生成；地形、Catmull–Rom 路網、岸邊、跨高程 surface、夜空、風雪與蒸汽、平面反射。 |
| `mesh.js`, `materials/`, `vegetation.js`, `arbor.js` | 靜態幾何批次／instancing；程序化 albedo/normal/roughness/AO；樹冠網格與積雪、類型和 seed 變化、4 級距離 LOD。月光深度相機獨用簡化樹冠 layer，取代近景完整樹木再次投影。 |
| `buildings.js`, `areas.js`, `props.js`, `interiors.js`, `seasonal.js` | 舖面上的設施、門窗／遮擋、室內 cell、步橋與樹冠橋、園區地標和季節裝飾。 |
| `camera.js`, `interaction.js`, `activities.js` | 尺度以米計；自由與第一人稱移動、門／長椅／活動；候選集射線、眼位 transition，腳印、冰刀痕與落雪粉。 |
| `audio.js`, `characters.js`, `events.js`, `rhythm.js`, `discovery.js` | Web Audio、距離衰減、五角落 mix、簡化關節動畫、燈光節奏及非計分探索。 |

- WebGPU 渲染器用線性 HDR。非軟體 adapter 使用瀏覽器的交換鏈；如果偵測 SwiftShader / fallback adapter 或網址要求 `present=readback`，可走一次只留一幀的 RGBA8 → 2D 呈現。照片匯出與可見畫布分開驗證，低解析度軟體通道不是硬體效能測試。
- `survey.js` / `winter-craft.js`：在**建模**時為實例記錄位置、尺寸、分類；浮燈及天燈的位置隨物件。使用格網、地形與 collider 作 20 m 視線代理。展品位置由 JSON 固定，CPU 預查不等於瀏覽器像素或全連續場地的證明。
- `rhythm.js` 固定種子抽籤並輪換六種小事件、900 秒樹秀和本機整點。停用略過到期事件，不排隊補播。`events.js` 更新局部動畫，合成聲音走獨立 cue bus，可和底層風聲及主題音樂分開淡出。

### 空間、光與時間

- `Physics.solids` 和 `surfaces` 是不同空間雜湊。腳點半徑 0.30 m，高度測試約 1.55 m；圓柱與轉向盒近似膠囊掃掠，移動切小步，阻擋時嘗試沿軸滑動。相同 x/z 能有不同的地板，透過上一步高度與可跨高度選中，提高橋上／橋下的辨識。不是通用物理引擎；快跳、攀爬、自由跌落皆非玩法。
- 離開室內時切換混音與可用的室內局部光。窗、旋轉門與家具是幾何，碰撞不得拿透視平面代替。池塘／冰面近處反射用平面反射相機與獨立 layer 取樣簡化樹冠，遠處用天空近似，避免每幀第二次畫所有樹。
- `city-ground.js` 與地形共用 `9 × 52 m` 的鋪面尺度；外圍霧底由四個朝上的條帶組成，中孔延伸至可行走邊界之外。禁止以跨全園的平面取代，否則會蓋掉低於城市基底的湖面、山谷雪地與石板。
- 路燈的近處光由固定池選出，遠處保留發光、柔暈與 `512×512` 的暖光場。材質線性色彩圖中非顏色通道不做 sRGB 解碼。陰影圖不在每一幀更新。
- 世界秒數和 Web Audio 聲音秒數分離。照片模式可以固定世界秒數；真實鐘點以本機時間取樣，環境背景音與 UI 不因此凍結。
- `?qa` 才暴露 `parkQA`；`?qa&still` 便於截固定畫面與人工推進控制器，`?qa&world` 隱藏 UI。這些是本機驗收介面，並不是遊戲作弊提示或玩家功能。

## `src/data/layout.json`

北向是負 z，東向是正 x；一單位一公尺。Y 是高程；地圖中央 `(0,0)`。

| 欄位 | 內容與注意事項 |
|---|---|
| `seed`, `size`, `entry`, `seaLevel`, `treeTarget`, `treeBulbs` | 地景種子、450 m 尺度、開始位置、水面、樹與巨杉燈珠預算。改 seed 後應重做 POI 對位／可達性檢查。`treeTransplants` 是固定 seed 下精確移植的位置，例如石橋的東側橋腳；不把碰撞從仍看得見的樹幹上移除。 |
| `places[]` | `id`, `name`, `en`, `x`, `z`, `r`：區域名稱、中心、高亮/造訪半徑，不是地形邊界。 |
| `plaza`, `pond`, `lawn`, `rink` | 廣場半徑與土地利用遮罩，池塘與冰面橢圓用 `x,z,rx,rz`；池岸另用正弦調整輪廓。 |
| `paths[]` | `id`, `kind`, `width`, `points: [[x,z],...]`；編成等弧長採樣。路網也是植栽排除及雪況取樣依據。修改路線後要重新驗證欄杆、燈柱和機構入口。 |
| `cabins[]` | `id/name/en`, `x/z`, `yaw` 弧度，`w/d`，`skin/roof`、`enter`。外殼與可走入室內分開。不開放的兩棟沒有假入口。 |
| `quiet[]` | 雙人座 `id/name/en/x/z`、`look: [x,y,z]`、音景 `preset`。 |
| `deckDressing.edgeDetails` | 林下坡腳、岸與邊界的手置三維燈景；碰撞與步道淨寬通過才會放置。 |
| `canopySpans` | 逐段軸線座標；高程在 `areas.js` 跟隨分段。橋下仍用原始地形。 |
| `opening`, `shots[]`, `gallery` | 入口構圖；12 組相機 `p` 與目標 `t`、`fov`、區域和選用時段；入口選景卡的 id。 |

`catalog.json` 是種類／示例位置清單，`christmas-sites.json` 是 seed 對應的林下小景位置、架位和小型景物的佈點快取。用 `PLAN=1 npm run plan:decor` 可重算，改資料須複驗視線及路徑。`pois.json`：小星星、精靈門、故事木牌和驚喜名單／座標。世界可依固體與樹根略微微調位置。`content.json`：區域祝福、童話、便箋與銘牌原文。`activities.json`：互動距離、進場 transition、相機及音色標籤；個別場地仍有程式配置。材質與近距離模型的部分的尺寸、位置在場景模組中，**並非每一個道具都由 JSON 控制**。


## 驗證工具

- `scripts/smoke.mjs` 執行 Dev / build 的頁面互動，配合固定時間步與局部放位，輸出逐項斷言。
- `scripts/shots.mjs` 在真實 Chromium 畫布擷取所有鏡位與色調曲線，`showcase.mjs` 驗證入口的四張圖片可解碼並截取 UI。
- `scripts/navigator.mjs` 用 A* 查詢 `?qa` 中真實膠囊與地板測試。`soak.mjs` 是快速控制器檢查；`soak-live.mjs` 則讓產品的原生 RAF 與音訊迴圈照常執行，腳本只設定朝向、按鍵與互動，不使用傳送或手動 tick，採樣結果存於 `docs/evidence/`。皆未加入使用者的正常模組。

高空鏡位擴大最遠 LOD 的可見距離，避免空拍把公園遠側的樹冠裁成一道圓弧；低空與步行距離預算不變。近距樹根為連續彎折截面，較遠樹根維持簡化網格。
