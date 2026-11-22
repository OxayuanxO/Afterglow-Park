import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {browserPage,boot,base} from './browser.mjs';
// Serve the extracted ZIP as a real subpath; not a Vite SPA fallback.
const p=await browserPage({width:520,height:325});const rec={base,archive:{name:process.env.PARK_ARCHIVE_NAME??null,sha256:process.env.PARK_ARCHIVE_SHA256??null,runtimeSha256:process.env.PARK_RUNTIME_SHA256??null},when:new Date().toISOString(),requests:[],foreign:[],errors:p.errors};
try{
  const prefix=new URL(base).pathname;
  assert.ok(prefix!=='/'&&prefix.endsWith('/'),'PARK_URL must be the extracted nested directory');
  await p.page.route('**/*',r=>{if(new URL(r.request().url()).origin===new URL(base).origin)return r.continue();rec.foreign.push(r.request().url());return r.abort();});
  p.page.on('response',r=>{if(new URL(r.url()).origin===new URL(base).origin)rec.requests.push({url:new URL(r.url()).pathname,status:r.status(),mime:r.headers()['content-type']??null});});
  rec.backend=await boot(p,{qa:1,still:1});
  rec.build=await p.page.locator('script[type=module][src]').first().getAttribute('src');
  const bytes=await p.page.request.get(new URL(rec.build,base).href);assert.ok(bytes.ok());
  rec.buildSha256=createHash('sha256').update(await bytes.body()).digest('hex');
  rec.thumbs=await p.page.evaluate(async()=>{
    const cards=[...document.querySelectorAll('.vista')];
    return await Promise.all(cards.map(async card=>{
      const im=new Image();im.src=getComputedStyle(card).backgroundImage.match(/url\(["']?([^"']+)["']?\)/)?.[1];
      await im.decode();return [new URL(im.src).pathname,im.naturalWidth];
    }));
  });
  assert.equal(rec.thumbs.length,4);assert.ok(rec.thumbs.every(([url,w])=>url.startsWith(prefix)&&w>=640));
  assert.ok(rec.requests.some(r=>r.url.startsWith(prefix+'assets/')&&r.url.endsWith('.js')&&r.status===200));
  assert.ok(rec.requests.every(r=>r.url.startsWith(prefix)&&r.status<400&&(!/\.(js|css|webp|woff2)$/.test(r.url)||!(r.mime??'').includes('text/html'))));assert.deepEqual(rec.foreign,[]);assert.deepEqual(p.errors,[]);
  await p.page.locator('#enter').evaluate(e=>e.click());
  rec.player=await p.page.evaluate(()=>{parkQA.key('KeyW',true);parkQA.tick(1,.033);parkQA.key('KeyW',false);return parkQA.player();});
  assert.equal(rec.player.mode,'walk');assert.ok(rec.player.z<213.5);rec.ok=true;
}catch(e){rec.failure=String(e);throw e;}finally{await writeFile(process.env.PARK_PROOF_OUT||'docs/evidence/nested-archive-webgl.json',JSON.stringify(rec,null,2));await p.browser.close();}
