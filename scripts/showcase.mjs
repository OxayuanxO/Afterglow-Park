import assert from 'node:assert/strict';
import {browserPage,boot,capture} from './browser.mjs';
import {writeFile,mkdir} from 'node:fs/promises';
const p=await browserPage({width:+(process.env.W||1440),height:+(process.env.H||900)});
try{const mark=performance.now();await boot(p,{quality:process.env.QUALITY||'low'});console.log('ready',Math.round(performance.now()-mark));
  const build=await p.page.locator('script[type=module][src]').first().getAttribute('src');const s=await p.page.evaluate(()=>parkQA.stats());console.log(JSON.stringify(s));
  const thumbs=await p.page.locator('.vista').evaluateAll(async cards=>Promise.all(cards.map(async card=>{
    const url=getComputedStyle(card).backgroundImage.match(/url\(["']?([^"')]+)["']?\)/)?.[1];
    if(!url)return {id:card.dataset.id,width:0};
    const img=new Image();img.src=new URL(url,document.baseURI).href;
    try{await img.decode();return {id:card.dataset.id,width:img.naturalWidth,height:img.naturalHeight,url:img.src};}catch{return {id:card.dataset.id,width:0,url:img.src};}
  })));
  assert.equal(thumbs.length,4);for(const t of thumbs)assert.ok(t.width>400,JSON.stringify(t));
  console.log('gallery images decoded',thumbs.map(t=>t.id+' '+t.width+'x'+t.height));
  await capture(p.page,'screenshots/entry-ui.png');console.log('entry UI captured');
  await p.page.locator('.header-setting').click();await capture(p.page,'screenshots/settings-ui.png');await p.page.keyboard.press('Escape');
  await p.page.locator('[data-action="map"]').first().click();await capture(p.page,'screenshots/map-ui.png');await p.page.keyboard.press('Escape');
  console.log({errors:p.errors,warnings:p.warnings});assert.deepEqual(p.errors,[]);
  await mkdir('docs/evidence',{recursive:true});await writeFile('docs/evidence/ui-'+(process.env.TARGET||'production')+'.json',JSON.stringify({when:new Date().toISOString(),build,stats:s,thumbs,errors:p.errors,warnings:p.warnings},null,2));
}finally{await p.browser.close();}
