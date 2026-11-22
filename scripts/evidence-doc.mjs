// Regenerate technical reports from measurements; keep old runs labelled by hash.
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {sourceDigest} from './source-digest.mjs';
const read=async file=>readFile(file,'utf8');
const ev=async name=>{try{return JSON.parse(await read(`docs/evidence/${name}.json`));}catch{return null;}};
const link=(key,label='JSON')=>`[${label}](evidence/${key}.json)`;
const n=x=>Number.isFinite(x)?x.toLocaleString('en-US'):'—';
const percent=x=>Number.isFinite(x)?`${(x*100).toFixed(2)}%`:'—';
const mb=x=>Number.isFinite(x)?`${(x/2**20).toFixed(1)} MiB`:'—';
const bound=(arr,id)=>arr.length?`${n(Math.min(...arr.map(x=>x[id])))}–${n(Math.max(...arr.map(x=>x[id])))}`:'—';
const files=(await readdir('docs/evidence')).filter(x=>x.endsWith('.json')).map(x=>x.slice(0,-5));
const index=await read('dist/index.html'),build=index.match(/<script[^>]*type="module"[^>]*src="([^"]+)/)?.[1];
if(!build)throw Error('Build missing');
const code=await readFile('dist/'+build);const sha256=createHash('sha256').update(code).digest('hex');
const matrix=await ev('shots-webgl'),smoke=await ev('smoke-production-webgl'),dev=await ev('smoke-dev-webgl');
const quiet=await ev('quiet-views'),showcase=await ev('ui-production'),disco=await ev('discovery-webgl');
const seat=await ev('canopy-route'),journey=await ev('live-browser'),art=await ev('near-art-webgl');
const nest=await ev('nested-archive-webgl'),sound=await ev('audio-witness-webgl');
const optics=await ev('optical-fixtures-webgl');
const layoutBytes=await readFile('src/data/layout.json'),layout=JSON.parse(layoutBytes),layoutSha=createHash('sha256').update(layoutBytes).digest('hex');
const sourceSha256=await sourceDigest(),sameDev=dev?.sourceSha256===sourceSha256;
const sitesSha=createHash('sha256').update(await readFile('src/data/christmas-sites.json')).digest('hex');
const sameLayout=x=>x?.digests?.['src/data/layout.json']===layoutSha&&x.digests['src/data/christmas-sites.json']===sitesSha;
const same=x=>x?.build===build;
const keyed=async prefix=>(await Promise.all(files.filter(x=>x.startsWith(prefix)).map(async k=>[k,await ev(k)]))).filter(([,x])=>x);
const density=(await keyed('decoration-density-webgl')).filter(([,x])=>same(x)&&!x.errors?.length&&!x.failure&&x.report).sort((a,b)=>b[1].report.step-a[1].report.step);
const edgeRefinement=(await keyed('decoration-edge-refine')).find(([,x])=>sameLayout(x));
const cpuPlan=(await keyed('decoration-plan-cpu')).find(([,x])=>sameLayout(x));
const softwareGPU=(await keyed('shots-gpu')).filter(([,x])=>same(x)&&x.rows.length>0);
const profiles=(await keyed('profiles-webgl')).filter(([,x])=>same(x));
const compat=await keyed('compat-');
const gpuWalk=(await keyed('gpu-live')).find(([,x])=>same(x)&&x.ok);
const coreGPU=(await keyed('gpu-park')).filter(([,x])=>same(x));
const goodGPU=coreGPU.find(([,x])=>x.compositor?.range>20&&!x.failure&&!x.errors.length);
const gpuLive=goodGPU?.[1].presentation==='gpu-readback-2d';
const native=(await keyed('soak-live-webgl')).sort((a,b)=>Date.parse(b[1].savedAt??0)-Date.parse(a[1].savedAt??0));
const currentNative=native.find(([,x])=>same(x));
const usedNative=currentNative??native.find(([,x])=>x.passed)??native[0];
const data=usedNative?.[1],end=data?.samples?.at(-1),warm=data?.samples?.find(x=>x.wallSec>=900),heaps=data?.samples?.map(x=>x.cdpHeapUsed).filter(Number.isFinite)??[];
const late=data?.samples?.filter(x=>x.wallSec>=1200&&Number.isFinite(x.cdpHeapUsed))??[];
const resourceTail=late.length>2?`最後 ${late.length} 個 GC 後 JS heap 樣本範圍 ${mb(Math.min(...late.map(x=>x.cdpHeapUsed)))}–${mb(Math.max(...late.map(x=>x.cdpHeapUsed)))}；觸及的幾何 ${n(late[0].resources.geometries)} → ${n(late.at(-1).resources.geometries)}，貼圖 ${n(late[0].resources.textures)} → ${n(late.at(-1).resources.textures)}。`:'未取得足夠的後段樣本。';
const draw=Object.fromEntries(['low','medium','high','ultra'].map(t=>[t,(same(matrix)?matrix.rows:[]).filter(x=>x.tier===t&&x.file.startsWith('screenshots/webgl2/'))]));
const all=Object.values(draw).flat();
const medium=draw.medium.filter(x=>x.calls>1000||x.triangles>5000000),high=draw.high.filter(x=>x.calls>1800||x.triangles>9000000);
const f=(same(smoke)?smoke:null)?.logs?.find(x=>x.passed&&x.value?.firBulbs)?.value;
const types=density[0]?.[1].catalogue?.length??null;
const dlines=density.map(([key,x])=>`| ${x.report.step} m / ${x.report.phase?.join(', ')} | ${n(x.report.pass)} / ${n(x.report.total)} | ${x.report.miss.length} | ${Math.min(...x.report.regions.map(r=>r.placed.length))} / ${Math.min(...x.report.regions.map(r=>r.seen.length))} | ${link(key)} |`).join('\n');
const counts=(x)=>x?.logs?.length?`${x.logs.filter(a=>a.passed).length}/${x.logs.length}`:'—';
const work=disco?.checks?Object.values(disco.checks).reduce((n,a)=>n+(a.activated??0),0):null;
const auth='**製作資訊**：製作模型／版本／模型 ID **無法確認**；執行環境未提供可核對的識別碼或換模記錄。製作環境：Arena.ai Agent Mode（Debian、Node.js、Vite、Three.js、Playwright／Chromium）；日期：2026-11-19（臺灣時間）。互動文案、故事與便箋由本次 Agent 撰寫；幾何、貼圖與音景由程式生成，未使用獨立的 AI 圖像、3D、音樂或語音生成服務。截圖為實際 3D 渲染。';
const wall=end?`${end.wallSec.toFixed(2)} / ${data.seconds} 秒；${end.frames-(data.baseline?.frames??0)} 次新增提交、${(end.renderHealth?.completedFrames??0)-(data.baseline?.renderHealth?.completedFrames??0)||'—'} 次確認完成、${n(+end.feet.walk.toFixed(1))} m、${end.checkpoints} 個路點。`:'無最終樣本。';
const nativePath=usedNative?link(usedNative[0]):'—';
const nativeText=usedNative?`使用 \`${data.build??'未記錄'}\`（${same(data)?'本版':'不同建置，不移植通過結果'}）、${data.backend}、${data.quality??'low'}、${data.viewport?.join(' × ')??'未記錄'} 視窗，${wall} ${data.passed?'通過該路線腳本的斷言。':data.failure?'未通過：'+data.failure.split('\n')[0]:'尚無完整通過證據。'} ${nativePath}`:'尚未執行。';
const night=coreGPU.map(([k,g])=>`- ${g.presentation??'直接顯示'} · ${g.profile}：目標像素有色差 ${g.target?.range??'—'}，合成影像色差 ${g.compositor?.range??'—'}；${g.errors.length} errors。${g.failure?'失敗。':'完成。'} ${link(k)}`).join('\n');
const captures=softwareGPU.map(([k,v])=>{
  const heroes=v.rows.filter(x=>x.file.startsWith('screenshots/webgpu/'));
  return `- ${heroes.length} 個 WebGPU 鏡位；${heroes.filter(x=>x.source==='presented-canvas').length} 張直接取呈現後畫布。${v.adapter?.architecture??'未記錄'}，${v.presentation??'未記錄呈現路線'}。${v.failure?'批次未完成。':''}${link(k)}`;
}).join('\n');
const compatLines=compat.map(([k,x])=>{
  const scope=({'first-frame':'低檔、暫停動畫迴圈的取景診斷','live-lite':'低檔、原生迴圈短測'})[x.kind]??'原生迴圈初測';
  const images=x.frames.map(r=>r.file?`[${r.id}](../${r.file})`:null).filter(Boolean).join('、');
  const stepped=Number.isFinite(x.motion)?`${x.kind==='first-frame'?'手動步進':'實際 W 移動'} ${x.motion.toFixed(2)} m。`:'';
  const result=same(x)&&x.ok?`完成 ${x.frames.length} 張；${stepped}${x.completed?`確認完成 ${x.completed} 幀。`:''}${images?' '+images:''}`:
    `未通過${same(x)&&x.backend?`；已啟動 ${x.backend}。${stepped}`:'。'}${x.termination?' '+x.termination:x.failure?' '+x.failure.split('\n')[0]:x.stage?' 停在 '+x.stage+'。':''}`;
  return `- ${x.engine} ${x.browserVersion??''}（${scope}）：${result} ${link(k)}`;
}).join('\n');
const grids=list=>list.map(x=>x.step+' m '+n(x.pass)+'/'+n(x.total)).join('、');
const cpuNote=edgeRefinement?`固定佈景新增 ${edgeRefinement[1].additions.length} 處局部小景、六類組合。舊弱點 ${edgeRefinement[1].formerBlindSpots.length} 點仍可通行，CPU 視域代理皆達三種；修補輸入 ${grids(edgeRefinement[1].after)}。未取作佈景輸入的獨立 CPU 格：${grids(edgeRefinement[1].independent)}。總點數因新增的小碰撞體可略變；不把被阻擋的舊弱點算成修好。${link(edgeRefinement[0])}`:cpuPlan?`本版相同配置的 CPU 代理：${grids(cpuPlan[1].heldOut)}。${link(cpuPlan[0])}`:'';

const profileText=profiles.map(([k,v])=>`- ${v.tier}；${Object.keys(v.views).length} 個鏡位分解，超過門檻：${v.exceeds.join('、')||'無'}。${link(k)}`).join('\n');
const gpuTone=softwareGPU.find(([,v])=>v.rows.some(r=>r.file.startsWith('screenshots/tone-gpu-')));
const briefGPU=gpuWalk?`- WebGPU 原生 RAF、實際 W、設定鍵及兩個不同的可見頁面畫素通過短測。${link(gpuWalk[0])}`:'';
const date=new Date().toISOString();
await writeFile('docs/evidence/build.json',JSON.stringify({build,stamp:date,sha256,sourceSha256,bytes:code.byteLength,node:process.version},null,2));
await writeFile('docs/PERF_NOTES.md',`# 效能與實測紀錄

\`${build}\` · ${link('build','建置大小與 SHA-256')}。2026-11-19，Debian 沙盒、2 vCPU、約 1.9 GiB，無可用實體 GPU 裝置節點；Node 20、Vite 8、Three.js r187、Playwright Chromium。**SwiftShader 的幀率不代表筆電的 GPU 幀率。**

## 功能整合

| 項目 | 結果與範圍 |
|---|---|
| 正式版 WebGL 2 smoke | ${counts(smoke)}；${smoke?.errors?.length??'—'} console errors；${same(smoke)?'同一建置':'不同建置或未核對'}。${link('smoke-production-webgl')} |
| 開發版 WebGL 2 smoke | ${counts(dev)}；${dev?.errors?.length??'—'} console errors；${sameDev?'輸入原始碼雜湊相同':'待本版來源雜湊核對'}。開發模組不是正式 bundle。${link('smoke-dev-webgl')} |
| 自動後端、原生動畫迴圈 | ${same(journey)&&journey.ok?'短測通過':'未取得同建置通過紀錄'}。${link('live-browser')} |
| 入口縮圖 | ${same(showcase)?showcase.thumbs.length+' 張解碼':'待本版紀錄'}。${link('ui-production')} |
| 五個坐姿及混音 | ${same(quiet)?quiet.results.length+'/5':'待本版紀錄'}。${link('quiet-views')} |
| 探索與日程 | ${same(disco)?`${n(work)} 筆射線互動；${disco.misses.length} 未命中；${disco.checks.placed.elfDoors} 小門 + ${disco.checks.placed.villages} 雙屋雪村。60 秒燈秀與開關斷言見 clock。`:'待本版紀錄'} ${link('discovery-webgl')} |
| 多層碰撞 | ${same(seat)&&!seat.failure&&seat.route?.every(v=>v.reached)?`${seat.route.length} 段樹冠膠囊步進；最高 ${Math.max(...seat.route.map(v=>v.at.y)).toFixed(2)} m。${seat.crossings?.length??0} 橋／隧道另從入口走到出口。`:'待本版步進紀錄。'} ${link('canopy-route')} |
| 實際混音訊號 | ${same(sound)&&sound.ok?'主輸出有訊號、靜音後衰減且能恢復；再驗音符排程。非人耳聽評。':'未取得本版訊號測量。'} ${same(sound)?link('audio-witness-webgl'):'—'} |
| 嵌套路徑解壓測試 | ${same(nest)&&nest.ok?'解壓 ZIP 由 HTTP 子路徑載入，縮圖、走路和本機請求檢查通過。':'待對實際 ZIP 驗證。'} ${same(nest)?link('nested-archive-webgl'):'—'} |

Smoke 使用實際按鍵、射線和碰撞；含局部放位與手動時間步，不能證明連續遊走。${f?`樹木 ${n(f.n)} 棵；常綠針葉 ${percent(f.evergreen)}；平面冠幅估算 ${percent(f.f)}；綴燈 ${n(f.decorated)} 棵；主樹 ${n(f.firBulbs)} 顆燈泡。`:'尚未載入本版森林統計。'}

## 12 × 四檔，WebGL 2

計數來自 \`renderer.info\`，含反射、陰影與後製；截圖的 \`dt\` **不是**幀時間。幾何／貼圖是觸及的資源件數，不是顯存位元組。

| 檔 | 張數 | 內部尺寸 | draw calls | 三角形 | 幾何 / 貼圖 |
|---|---:|---:|---:|---:|---:|
${Object.entries(draw).map(([t,v])=>`| ${t} | ${v.length}/12 | ${v[0]?.resolution?.join(' × ')??'—'} | ${bound(v,'calls')} | ${bound(v,'triangles')} | ${bound(v,'geo')} / ${bound(v,'textures')} |`).join('\n')}

${all.length?'超過 Medium 1,000 draws 或 5M tris 的鏡位：'+(medium.map(x=>x.shot).join('、')||'無')+'；超過 High 1,800 draws 或 9M tris：'+(high.map(x=>x.shot).join('、')||'無')+'。這不是硬體 FPS 門檻或全視角上限。':'尚無本建置矩陣。'} ${link('shots-webgl')} · [逐鏡索引](../screenshots/README.md)。${same(art)&&!art.failure?'Medium 即時 AO 開／關與 Low 保持關閉已另測；兩張相同鏡位的 2,560 點平均絕對亮度差 '+art.mediumAO?.meanAbsoluteDifference?.toFixed(2)+'。'+link('near-art-webgl'):''}

${profileText}

${same(optics)&&optics.ok?`湖面與花園的固定區域亮度抽檢 ${optics.results.length}/8；與曾被城市平面覆蓋的黑面分開。這是遮擋回歸檢查，反射品質仍以圖像和視角判斷。${link('optical-fixtures-webgl')}`:''}

## 20 m 可視密度（代理）

${types??'—'} 個類型有實際放置或事件節點的幾何定位。以 3D 半徑、表觀大小下限、地形和碰撞體遮擋作 360° 可見代理，不等於任一面向的實際像素。未逐枝葉或薄欄杆判遮擋。

| 地面格與偏移 | 至少三種 | 未達 | 14 區最少放置 / 可見種類 | 證據 |
|---|---:|---:|---:|---|
${dlines||'| — | — | — | — | 尚無本版瀏覽器抽樣 |'}

${cpuNote}

## 兩個渲染後端

${night||'無本建置的 WebGPU 合成像素紀錄。'}
${captures}
${briefGPU}
${gpuTone?'同鏡位色調對照：[WebGPU AgX](../screenshots/tone-gpu-agx.png) · [WebGPU ACES](../screenshots/tone-gpu-aces.png)。':''}

在沙盒裡，直接 WebGPU canvas 轉交合成器失敗的紀錄保留（[實景對照](evidence/gpu-park-vulkan-sw-r10c.json)；[極小梯度驗證](evidence/gpu-canvas-profiles.json)）。看到成功提交不代表看到畫面。${gpuLive?'本版另在軟體 adapter 上經 RGBA8 readback → 2D 呈現，已用實際瀏覽器合成像素檢查；3D+HDR 仍由 WebGPU 做。這不是原生交換鏈或實體 GPU 驗收。':'本建置仍未通過 WebGPU 可見畫面驗證。'}

## 連續漫步耐久

${nativeText}
${end?`\n確認出屋：${end.cabins?.join('、')||'無'}。活動：${[...new Set(end.activity??[])].join('、')||'無'}；導航異常 ${end.faults?.length??0}、console errors ${data.errors?.length??0}；造訪 ${end.seen?.length??'—'} 區。最長提交間隔 ${Number.isFinite(end.renderHealth?.worstGapMs)?(end.renderHealth.worstGapMs/1000).toFixed(2)+' s':'—'}；context 遺失 ${end.renderHealth?.contextLost?'有':end.renderHealth?'無':'未記錄'}。${heaps.length?`GC 後 CDP JS heap ${mb(heaps[0])} → ${mb(heaps.at(-1))}；第 15 分鐘 ${mb(warm?.cdpHeapUsed)}。${resourceTail}資源可能因首次接近而常駐，JS heap 不涵蓋驅動和 GPU；單趟不是無洩漏證明。`:''}`:''}
${data?.encounters?.distinct?`\n每 5 m 於已走路線測 360° 視域。${n(data.encounters.windowCount)} 個完整 180 s 窗中：至少有 ${data.encounters.distinct.min} 種，未達三種 ${data.encounters.distinct.failing} 窗；若只算首次看到的實例，最低 ${data.encounters.freshInstanceTypes.min} 種、${data.encounters.freshInstanceTypes.failing} 窗未達；若只算從未看到的分類，最低 ${data.encounters.firstType.min} 種、${data.encounters.firstType.failing} 窗未達。${data.encounters.forwardFresh?'前向錐代理（獨立只記進入過前向錐的實例）最低 '+data.encounters.forwardFresh.min+' 種、'+data.encounters.forwardFresh.failing+' 窗未達。':''}不混稱為「新發現」。`:''}

另附 [歷史加速路線](evidence/soak-accelerated-webgl.json)；與上述原生 RAF 分開。

## 其他桌面引擎

${compatLines||'尚未取得 Firefox／WebKit 實跑結果。'}

Linux Playwright WebKit 非 macOS Safari；仍缺 Safari／Edge 實機、多 DPI、實體 GPU 1080p/1440p、GPU VRAM、耳機長聽與普遍 3A 主觀評級。
`);
await writeFile('docs/RELEASE_REPORT.md',`${auth}

# WINTER WONDERLAND｜0.10 交付紀錄

一座 450 × 450 m 的原創、即時 3D 都市森林公園：14 區、七間小屋（五間可進）、五個雙人座，步行、坐下、溜冰、旋轉木馬、躺下看星、搖雪、拍照與運鏡。沒有任務、分數或遊玩倒數。本版保留高空遠側的樹冠；把城市基底限制在園外，修復湖面與低處花園被蓋住的問題。林下小景以不同風格補足舊抽樣弱點。

- 兩座池畔橋、石拱隧道、樹冠步道採實際膠囊步進驗證；石橋移走擋在登陸端的樹幹，並保留移植後的碰撞。
- 正式 WebGL 2 smoke ${counts(smoke)}、${smoke?.errors?.length??'—'} 個 console errors${same(smoke)?'（同一建置）':'（不同建置或未核對）'}；${all.length} 張同建置 hero PNG；五座、活動及運鏡的測法見 [效能筆記](PERF_NOTES.md)。
- ${same(nest)&&nest.ok?'已通過解壓後子路徑 HTTP、縮圖與本機資產測試。':'解壓部署仍待測。'} ${sameDev?'開發伺服器與原始碼雜湊已對照，smoke '+counts(dev)+'。':'開發伺服器結果仍待本版核對。'}
- ${types??'尚待本版統計的'} 個聖誕型錄定位類型、24 個微縮場址；60 秒樹燈日程與停用／重啟。密度是多點視線代理，而非全場像素認證。
- 即時耐久：${nativeText}
- ${gpuLive?'WebGPU 軟體讀回呈現有 12 個中檔鏡位；同建置強制直接呈現的軟體對照是空白，未驗證實體 GPU。':'WebGPU 可產生離屏像素，但沙盒的直接呈現仍未驗收。'}
- ${compat.some(([k,x])=>k==='compat-firefox-first-frame'&&same(x)&&x.ok)?'Linux Firefox 的低檔定格診斷取得兩張 WebGL 2 圖。 ':''}其他桌面引擎的原生迴圈結果及限制見 [效能筆記](PERF_NOTES.md#其他桌面引擎)，未做實機瀏覽器認證。

**未全數達標。** 不宣稱 12 鏡位皆達 3A、任意角落或任意三分鐘皆有三種新東西，也不宣稱達到指定硬體 FPS。P1/P2 的 SSR、TAA、更多陰影、完整人物蒙皮與野生動物等差距見 [KNOWN_ISSUES](KNOWN_ISSUES.md)。建議優先以實機重做可見畫面、幀時間、耳機聲景與長程記憶體驗收，再深化城市、材質細部及遠景層次。

遊玩包解壓後用 \`python3 -m http.server 4173\` 提供 \`index.html\`；需桌面鍵鼠。原始碼用 \`npm install\` → \`npm run dev\`，建置用 \`npm run build\`。完整操作見 [README](../README.md)。
`);

if(all.length===48){
  const picture=(t,k)=>`[PNG](webgl2/${t}/${k}.png)`;
  const gpuHeroes=softwareGPU.flatMap(([,m])=>m.rows).filter(r=>r.file.startsWith('screenshots/webgpu/medium/'));
  const row=shot=>`| ${shot.en} | ${Object.keys(draw).map(t=>picture(t,shot.id)).join(' | ')} | ${gpuHeroes.some(r=>r.shot===shot.id)?`[PNG](webgpu/medium/${shot.id}.png)`:'—'} |`;
  await writeFile('screenshots/README.md',`# WINTER WONDERLAND｜實際瀏覽器鏡位

建置：\`${build}\` · [SHA-256](../docs/evidence/build.json) · [效能與實測紀錄](../docs/PERF_NOTES.md)。這些是從可操作場景取得的 PNG，不是概念圖。亮度與圖片張數不等於 §3.9 全部通過。

| 鏡位 | WebGL 2 Low | Medium | High | Ultra | WebGPU Medium |
|---|---|---|---|---|---|
${layout.shots.map(row).join('\n')}

**逐鏡檢視：** [看見的焦點與仍待改善處](../docs/VISUAL_REVIEW.md)。

**看近景：** [薑餅](detail/market-bakery.png) · [攤位](detail/market-goods.png) · [壁爐與地毯](detail/cabin-medium-ao.png) · [樹皮及雪村](detail/bark.png) · [雪花投影](detail/gobo.png) · [樹冠棧道](detail/canopy-detail.png) · [林下燈景](detail/woodland-detail.png)。

**實際坐姿：** [湖畔](quiet/shore.png) · [涼亭](quiet/gazebo.png) · [花園](quiet/secret.png) · [書隅](quiet/rest.png) · [丘頂](quiet/lookout.png)。

**同景色調：** [AgX](tone-webgl-agx.png) · [ACES](tone-webgl-aces.png)${gpuTone?' · [WebGPU AgX](tone-gpu-agx.png) · [WebGPU ACES](tone-gpu-aces.png)':''}。AgX 保留為場景預設。

**入口及介面：** [入口](entry-ui.png) · [地圖](map-ui.png) · [設定](settings-ui.png) · [原生迴圈第一人稱](walk-ui.png) · [實際下載的照片 PNG](render-check/photo-export.png)。

**四檔總覽：** [Low](vista-overview-low.jpg) · [Medium](vista-overview.jpg) · [High](vista-overview-high.jpg) · [Ultra](vista-overview-ultra.jpg)。縮圖僅供瀏覽，逐張 PNG 才是畫面原件。
`);
}
