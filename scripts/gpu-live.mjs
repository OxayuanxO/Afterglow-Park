// Native RAF, real input and browser compositing with the chosen WebGPU presenter.
// Offscreen pixel export is checked by gpu-park.mjs, not counted as live output here.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {writeFile,mkdir} from 'node:fs/promises';
import {browserPage,boot} from './browser.mjs';
const p=await browserPage({backend:'gpu',width:480,height:300});
const o={profile:process.env.GPU_PROFILE??'native-request',frames:[],errors:p.errors,warnings:p.warnings};
const id=[o.profile,process.env.RUN_ID].filter(Boolean).join('-');
const folder=process.env.OUT||'/tmp/ww-r10/gpu-parks';
let failure=null;
try{
  o.backend=await boot(p,{still:null,present:process.env.PRESENT,quality:'low'});
  o.build=await p.page.locator('script[type=module][src]').first().getAttribute('src');
  Object.assign(o,await p.page.evaluate(()=>({presentation:parkQA.presentation,adapter:parkQA.adapter,pipeline:parkQA.pipelineFacts()})));
  assert.ok(o.pipeline.halfFloatScene);
  await p.page.locator('#enter').click({timeout:80000});
  await p.page.waitForFunction(()=>parkQA.state().mode==='walk'&&parkQA.state().audio==='running',null,{timeout:80000,polling:90});
  await mkdir(folder,{recursive:true});
  const grab=async name=>{
    const h=await p.page.evaluate(()=>parkQA.renderHealth());
    const buf=await p.page.locator('#park-canvas').screenshot({timeout:90000});
    const rec=await p.page.evaluate(async b=>{
      const img=await createImageBitmap(await (await fetch('data:image/png;base64,'+b)).blob());
      const ctx=new OffscreenCanvas(40,25).getContext('2d');ctx.drawImage(img,0,0,40,25);img.close();
      const px=ctx.getImageData(0,0,40,25).data;let min=255,max=0;
      for(let i=0;i<px.length;i+=4){const l=px[i]*.21+px[i+1]*.72+px[i+2]*.07;min=Math.min(min,l);max=Math.max(max,l);}
      return {range:+(max-min).toFixed(2)};
    },buf.toString('base64'));
    const file=`${folder}/${name}-${id}.png`;await writeFile(file,buf);
    assert.ok(rec.range>20,'Blank live frame '+name);
    o.frames.push({name,file,...rec,sha256:createHash('sha256').update(buf).digest('hex'),health:h});
  };
  await p.page.waitForFunction(()=>parkQA.renderHealth().completedFrames>=2,null,{timeout:85000,polling:180});
  await grab('live-start');
  const before=await p.page.evaluate(()=>({z:parkQA.player().z,c:parkQA.renderHealth().completedFrames}));
  await p.page.keyboard.down('w');
  try{await p.page.waitForFunction(a=>parkQA.player().z<a.z-3&&parkQA.renderHealth().completedFrames>=a.c+2,before,{timeout:85000,polling:130});}finally{await p.page.keyboard.up('w');}
  await grab('live-walk');
  assert.notEqual(o.frames[0].sha256,o.frames[1].sha256);
  await p.page.keyboard.press('Tab');assert.equal(await p.page.evaluate(()=>parkQA.state().panel),'settings');
  await p.page.keyboard.press('Escape');assert.deepEqual(p.errors,[]);o.player=await p.page.evaluate(()=>parkQA.player());o.ok=true;
}catch(e){failure=String(e);throw e;}
finally{await writeFile(`docs/evidence/gpu-live-${id}.json`,JSON.stringify({...o,failure},null,2));await p.browser.close();}
