// Afterglow Park — 部署前的瀏覽器檢查。
// 開啟建置版入口、確認字體與按鈕、進入公園並截圖到 pages-check/。
// 用法：先 `npm run build && npm run preview`，再 `PARK_URL=http://localhost:4173/ node scripts/pages-check.mjs`
import {mkdir,writeFile} from 'node:fs/promises';
import {browserPage,url} from './browser.mjs';

const out='pages-check';await mkdir(out,{recursive:true});
const p=await browserPage({width:1280,height:800});const {page,browser,errors}=p;
const report={url:null,title:null,fonts:null,enter:false,mode:null,errors:[]};
try{
  report.url=url({qa:1,backend:'webgl',quality:'low'});
  await page.goto(report.url,{timeout:75000});
  await page.waitForFunction(()=>{const b=document.querySelector('#enter');return (b&&!b.disabled)||document.body.dataset.error;},undefined,{timeout:120000,polling:250});
  if(await page.locator('body').getAttribute('data-error'))throw Error('Boot error: '+errors.join('\n'));
  report.title=await page.title();
  report.hero=await page.locator('#hero h1').innerText();
  report.fonts=await page.evaluate(async()=>{await document.fonts.load('600 20px ParkSans','晚霞未散燈火已暖際線');await document.fonts.ready;
    return {heroZh:document.fonts.check('600 20px ParkSans','霞際線'),faces:[...document.fonts].filter(f=>f.family.includes('ParkSans')).map(f=>({status:f.status,range:f.unicodeRange}))};});
  await page.waitForTimeout(1500);
  await page.screenshot({path:`${out}/entry.png`});
  await page.locator('#enter').click();report.enter=true;
  await page.waitForTimeout(800);await page.keyboard.press('Escape');
  await page.waitForTimeout(3000);
  report.mode=await page.evaluate(()=>window.parkQA?.state?.().mode??null);
  await page.screenshot({path:`${out}/walk.png`});
}catch(e){report.failure=e.message;process.exitCode=1;}
finally{
  report.errors=errors;
  await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
  await browser.close();
}
