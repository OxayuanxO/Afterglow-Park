import {readFile,writeFile} from 'node:fs/promises';
const data=async k=>JSON.parse(await readFile(`src/data/${k}.json`,'utf8'));
const l=await data('layout'),p=await data('pois'),c=await data('catalog');
let runtime;try{runtime=JSON.parse(await readFile('docs/evidence/poi-runtime.json','utf8'));}catch{}
const idp=(id,xy)=>{const a=runtime?.poi?.find(a=>a.id===id);return a?[a.x,a.z]:xy;};
const pos=(x,z)=>`(${Number(x.toFixed(2))}, ${Number(z.toFixed(2))})`,as=(arr)=>pos(...arr);
const A=[
['南門、售樹區、熱栗攤','入口牌 `(−7.8, 207)`；售樹 `(−20, 194)`；東邊熱栗 `(17.8, 207)`。'],
['宮廷小亭、樂亭與鐘塔','廣場西亭 `(−32, 19)`；樂亭 `(29, 120)`；北側鐘塔 `(13, −42)`。'],
['大雪杉、節禮與護衛','中央 `(0, 0)`；南側呼喚光點 `(0, 11.22)`；胡桃鉗守衛約 `(±6.5, 31)`。'],
['古典雕像、噴泉與花圃','噴泉 `(0, −144)`；花園中心線沿 `x = 0`；長椅與修剪樹籬在兩側。'],
['池塘、木橋、石橋與船屋','池中心約 `(−116, 102)`；南側橋 `(−99, 142) → (−62, 119)`；北東石橋 `(−70, 77) → (−64, 86)`；船屋 `(−173, 111)`。'],
['浮燈、停船與警示牌','浮燈互動 `(−165, 106)`；船坞 `(−169, 109) → (−158, 102)`；薄冰牌 `(−106.4, 140.1)`。'],
['市集與信箱','主要攤位 `(92, −114)` 至 `(149, −110)` 及北側排列；留言信箱 `(139.6, −116.5)`；馬槽擺設 `(112, −126)`；燭光金字塔 `(120, −113.3)`。'],
['冰面、冰雕、借冰鞋','冰面 `(135, 8)`，東西入口約 `(105, 8)` 與 `(165, 8)`；租借亭 `(149, 31)`，朝冰面；冰雕沿 `z ≈ −16`。'],
['木馬、鞦韆與滑梯','木馬 `(66, 78)`，東西互動點約 `(73.75, 80.8)`、`(58.25, 80.8)`；遊樂場 `(91, 75)`。'],
['石拱隧道與林中橋','隧道 `(43, 75.5)`，東西穿越；樹冠入口 `(110, 126)` 與 `(130, 176)`，走正中可逐段上下。'],
['星空雪地、營火空地','可在草坪北緣 `(−121, −51)` 試 Z；營火與座位圍繞 `(82, 151)`。'],
['導覽地圖、飲水台','地圖牌在南門、`(16,37)`、`(−121,143)`、`(99,−95)`、`(106,22)`、`(−12,−124)`；飲水台在 `(9.5,190)`、`(−35,21)`、`(109,−89)`、`(148,28)`。']];
const textViews=(runtime?.actions??[]).filter(a=>a.textKey);
const book=(tail)=>[...new Map(textViews.filter(a=>a.id.endsWith(tail)).reverse().map(a=>[a.textKey,a])).values()].sort((a,b)=>a.id.localeCompare(b.id, 'en', {numeric:true}));
const noteRows=book('-note'),plateRows=book('-plaque');
const txt=`# 園區驗收座標與物件目錄

> 內含探索劇透。座標為 (x, z) 公尺，負 z 向北。列表用地面或互動點近似位置，不是傳送指令。經地形微調後的坐標可比對 [瀏覽器 POI 匯出](evidence/poi-runtime.json)。

## 園區與設施

| 名稱 | 位置 |
|---|---|
${l.places.map(a=>`| ${a.name}（${a.en}） | ${pos(a.x,a.z)} |`).join('\n')}

| 驗收設施 | 與地標的相對位置 |
|---|---|
${A.map(x=>`| ${x.join(' | ')} |`).join('\n')}

## 小屋（共 ${l.cabins.length} 棟、可進入 ${l.cabins.filter(a=>a.enter).length} 棟）

| ID | 小屋 | 位置 | 進入與室內 |
|---|---|---|---|
${l.cabins.map((a,i)=>`| ${a.id} | ${a.name} | ${pos(a.x,a.z)} | ${['可：紅磚壁爐、沙發、樹、窗燭、煤油燈','可：原木牆、鑄鐵爐、爐邊扶手椅','可：柴爐、雙人窗邊沙發、音樂','可：木玩具、運行的模型火車、暖爐','可：玻璃與盆栽、桌燈、爐與座椅','不可：薑餅造型與暖色窗戶','不可：桁架與窗光'][i]} |`).join('\n')}

## 五處雙人座與音景

| 地點 | 座位原點 | 預設 | 特性 |
|---|---|---|---|
${l.quiet.map((a,i)=>`| ${a.name} | ${pos(a.x,a.z)} | \`${a.preset}\` | ${['加近岸水聲，低音樂','較弱風聲，棚內短殘響','壓低風和遠城聲','保留較多音樂盒','遠城最輕，偏聽風'][i]} |`).join('\n')}

## 聖誕物件類型

以可辨識的不同模型／用途手工列冊，共 **${c.length} 種**；瀏覽器實際登錄 ${runtime?.catalogue?.length??'待驗證'} 種（含隨事件移動的道具）。不把球飾個別顏色、單一燈串的燈珠或同型樹的尺度計成新類型。這不是全園每 20 m 視域密度的證明。

| 類型 | 驗收區域／位置 | 代表定位（x, z） | 實作 |
|---|---|---|---|
${c.map((a,i)=>`| ${a[0]} | ${a[1]} | ${(runtime?.positions?.[i]??[]).slice(0,2).map(v=>pos(v.x,v.z)+(v.moving?'（移動起點）':'')).join('、')||'—'} | \`${a[2]}\` |`).join('\n')}

## 探索位置

| 小星星 | 位置 | 小精靈門 | 位置 | 故事牌 | 位置 |
|---|---|---|---|---|---|
${p.stars.map((s,i)=>{const star='star-'+String(i+1).padStart(2,'0'),elf='elf-'+(i+1),story='story-'+(i+1);return `| ${star} | ${as(idp(star,s))} | ${p.doors[i]?elf:'—'} | ${p.doors[i]?as(idp(elf,p.doors[i])):'—'} | ${p.story[i]?story:'—'} | ${p.story[i]?as(idp(story,p.story[i])):'—'} |`;}).join('\n')}

| 隱藏驚喜 | ID | 位置 |
|---|---|---|
${p.secrets.map(s=>`| ${s.name} | ${s.id} | ${as(idp(s.id,[s.x,s.z]))} |`).join('\n')}

## 微縮雙屋雪村

這些景物和可敲門的 12 個樹根小門是不同地點。微縮雙屋不算作額外可進入小屋，不可移動或收集。

| ID | 實際建模座標 |
|---|---|
${(runtime?.poi??[]).filter(p=>p.type==='village').map(p=>`| ${p.id} | ${pos(p.x,p.z)} |`).join('\n')||'| — | 待重跑 smoke 匯出 |'}

## 長椅文字

${textViews.length?`下方是 ${noteRows.length} 則相異便箋、${plateRows.length} 則相異銘牌的代表位置（重複便箋不另列）。瞄準小紙片或椅背銅牌再按 E；大字在閱讀面板呈現，而非在遠處讀小字。`:'文字資料庫有 40 則原創便箋、30 則銘牌短句；請重跑 smoke 取得帶文字 ID 的實際分配。'}

${textViews.length?`| 文字類別 | 代表座標 | 內容 |\n|---|---|---|\n${[...noteRows.map(a=>['便箋',a]),...plateRows.map(a=>['銅牌',a])].map(([kind,a])=>`| ${kind} | ${pos(a.x,a.z)} | ${a.textKey} |`).join('\n')}\n`:''}
手札不顯示收集總數、百分比或任務提示。
`;
await writeFile('docs/POI_LIST.md',txt);
