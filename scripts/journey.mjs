import assert from 'node:assert/strict';
import {browserPage,boot,capture} from './browser.mjs';
import {writeFile,mkdir} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
const p=await browserPage({backend:process.env.BACKEND||'auto',width:720,height:450});const {page,browser}=p;
const steps=[];let ok=false,build=null;
try{
  const now=performance.now();const renderer=await boot(p,{still:null,skip:null,debug:1});
  build=await page.locator('script[type=module][src]').first().getAttribute('src');
  steps.push({test:'actual loop startup',backend:renderer,elapsedMs:Math.round(performance.now()-now)});
  const get=()=>page.evaluate(()=>parkQA.state());
  const enter=await page.locator('#enter').click({timeout:65000});
  await page.waitForFunction(()=>parkQA.state().mode==='intro'||parkQA.state().mode==='walk',null,{polling:140,timeout:55000});
  let st=await get();if(st.mode==='intro'){
    const from=st.cam;await page.waitForFunction(([y,z])=>{const p=parkQA.state().cam;return Math.abs(p[1]-y)+Math.abs(p[2]-z)>.4;},[from[1],from[2]],{polling:160,timeout:35000});
    await page.keyboard.press('Escape');steps.push({test:'intro moved then Escape skipped',from});
  }
  st=await get();assert.equal(st.mode,'walk');
  // Real browser key held while RAF, scene and physics progress; no manual tick or placement.
  await page.keyboard.down('w');
  try{await page.waitForFunction(z=>parkQA.state().feet.z<z-1.25,st.feet.z,{polling:150,timeout:48000});}
  finally{await page.keyboard.up('w');}
  const s=await get();assert.ok(s.frames>1);steps.push({test:'held W in real-time loop',startZ:st.feet.z,endZ:s.feet.z,frames:s.frames,renderer:await page.evaluate(()=>parkQA.stats())});
  await page.locator('#park-canvas').click({position:{x:355,y:224},timeout:18000});
  steps.push({test:'pointer lock request',locked:await page.evaluate(()=>document.pointerLockElement?.id==='park-canvas')});
  await page.keyboard.press('Tab');await page.waitForFunction(()=>parkQA.state().panel==='settings',null,{polling:160,timeout:15000});await page.keyboard.press('Escape');
  await page.keyboard.press('m');assert.equal((await get()).panel,'map');await page.keyboard.press('Escape');
  await page.evaluate(()=>{parkQA.paused(true);parkQA.statsFrame();});
  await capture(page,'screenshots/walk-ui.png');steps.push({test:'map/settings shortcuts and first-person UI capture'});
  assert.deepEqual(p.errors,[]);ok=true;
}finally{
  await mkdir('docs/evidence',{recursive:true});await writeFile('docs/evidence/live-browser.json',JSON.stringify({ok,build,steps,errors:[...new Set(p.errors)],warnings:[...new Set(p.warnings)]},null,2));await browser.close();
}
