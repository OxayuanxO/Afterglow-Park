**製作資訊**：製作模型名稱、版本與模型 ID **無法確認**；本次執行環境未提供可核對識別碼，也沒有可核對的換模記錄。執行環境：Arena.ai Agent Mode（Debian、Node.js、Vite、Three.js、Playwright／Chromium）；2026-11-19（臺灣時間）。AI 生成素材：本次 Agent 撰寫的介面／故事／手札文字及程序化資產程式，精確模型 ID 無法確認。未使用獨立生成圖像、語音、音樂或模型工具；未引入外部 3D 模型、影像、HDRI 或錄音。

# 來源與授權

## 外部素材

| 檔案 | 作者與來源 | 授權與變更 |
|---|---|---|
| `edition-roman.woff2`、`edition-italic.woff2` | Cormorant Garamond — Christian Thalmann 與 Cormorant Project Authors。 [Google Fonts 原始檔](https://github.com/google/fonts/tree/main/ofl/cormorantgaramond) · [上游](https://github.com/CatharsisFonts/Cormorant) | SIL Open Font License 1.1。轉為 Latin 子集 WOFF2；CSS 以 Edition 作字族別名。原授權 `public/fonts/OFL-Cormorant.txt`。 |
| `park-sans.woff2` | Noto Sans TC — Adobe、Google／Noto 專案與合作字體團隊。[Google Fonts 原始檔](https://github.com/google/fonts/tree/main/ofl/notosanstc) | SIL Open Font License 1.1。從可變 TTF 擷取介面使用的字元，轉為 WOFF2；CSS 別名 ParkSans。未使用保留字族名 Source 作為本作字體別名。原授權 `public/fonts/OFL-NotoSansTC.txt`。動態文字可使用系統 CJK fallback。 |
| `park-sans-extra.woff2` | Noto Sans TC（同上，Version 2.004），取自 [@fontsource-variable/noto-sans-tc 5.3.1](https://www.npmjs.com/package/@fontsource-variable/noto-sans-tc) | SIL Open Font License 1.1。Afterglow Park 入口新增文案用到的「霞、際、線」三字可變字形（wght 100–900），以 fontTools 擷取合併；CSS 以同一 ParkSans 字族加 `unicode-range` 載入。 |

字體與授權文件一併發放。工具為 fontTools `pyftsubset` 和 Brotli；不另向網路請求字體。

## 公版旋律與音景

`src/audio.js` 使用新寫的短句音高編排、合成音色與節奏；**沒有採樣任何樂手、現代編曲或商業錄音**。下列連結是曲調歷史與公版譜源參照，不是下載音檔的來源。公版指傳統曲調／已到期的曲調著作權，不指所有版本或錄音。

| 曲調 | 起源／作者 | 參考 |
|---|---|---|
| Silent Night | Franz Xaver Gruber（1818） | [IMSLP — Stille Nacht](https://imslp.org/wiki/Stille_Nacht,_heilige_Nacht_(Gruber,_Franz_Xaver)) |
| Greensleeves | 英格蘭傳統曲調（16 世紀） | [Wikisource — Greensleeves](https://en.wikisource.org/wiki/Greensleeves) |
| Deck the Halls | 威爾斯傳統《Nos Galan》 | [Hymnary — Nos Galan](https://hymnary.org/tune/nos_galan) |
| O Come, All Ye Faithful | 傳統曲調 *Adeste Fideles*，18 世紀 John Francis Wade 抄本 | [Hymnary — Adeste Fideles](https://hymnary.org/tune/adeste_fideles_wade) |
| Jingle Bells | James Lord Pierpont（1857） | [Library of Congress — One Horse Open Sleigh](https://www.loc.gov/item/2017701772/) |
| The First Noel | 英格蘭傳統曲調（19 世紀出版） | [Hymnary — First Nowell](https://hymnary.org/tune/the_first_nowell) |
| God Rest You Merry, Gentlemen | 英格蘭傳統頌歌（早期出版譜） | [Hymnary — God Rest You Merry](https://hymnary.org/tune/god_rest_you_merry_gentlemen) |
| In the Bleak Midwinter | Gustav Holst 的 Cranham 曲調（1906） | [IMSLP — In the Bleak Midwinter](https://imslp.org/wiki/In_the_Bleak_Midwinter_(Holst,_Gustav)) |

風、腳步、模擬低語／市集、爐火、水聲、鐘聲皆由 Web Audio 的振盪器、雜訊、濾波器與殘響合成。

## 程式工具

- [Three.js](https://github.com/mrdoob/three.js) — Three.js Authors，MIT；webgpu／TSL `RenderPipeline`、bloom、景深、幾何工具。
- [Vite](https://github.com/vitejs/vite) — Vite Contributors，MIT；本機伺服器與建置。
- [Playwright](https://github.com/microsoft/playwright) — Microsoft 與 contributors，Apache-2.0；自動化 Chromium 測試。Chromium 的各項授權隨瀏覽器安裝提供。
- [WebGPURenderer 手冊](https://threejs.org/manual/en/webgpurenderer.html) · [後製手冊](https://threejs.org/manual/en/webgpu-postprocessing.html) · [Bloom 範例](https://threejs.org/examples/webgpu_postprocessing_bloom.html)。

未複製實際公園配置、既有遊戲資產、品牌商標或故事。`public/previews/` 與 `screenshots/` 為此專案的即時場景捕捉；介面圖標與園區地圖是自製 SVG，不是世界中的景物替身。
