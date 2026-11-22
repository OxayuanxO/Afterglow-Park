import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {browserPage,boot} from './browser.mjs';

// Verify the exact in-game seated camera (not just the higher landscape bookmark).
const p=await browserPage({width:+(process.env.W||768),height:+(process.env.H||480)});
const {page,browser}=p,results=[];let backend,build;
try{
  backend=await boot(p,{world:1,quality:'low'});build=await page.locator('script[type=module][src]').first().getAttribute('src');
  await page.locator('#enter').evaluate(e=>e.click());
  await mkdir('screenshots/quiet',{recursive:true});
  for(const short of ['shore','gazebo','secret','rest','lookout']){
    const id='quiet-'+short;
    await page.evaluate(id=>{
      const q=parkQA, a=q.actions().find(a=>a.id===id);
      for(const d of [1.16,1.30,1.55,1.86,2.07])for(let i=0;i<24;i++){
        const t=i*2.39996, x=a.x+Math.sin(t)*d,z=a.z+Math.cos(t)*d, f=q.fit(x,z,a.y-1.02);
        if(Math.hypot(f.x-x,f.z-z)>.13)continue;
        q.place(f.x,f.z,[a.x,a.y,a.z],f.y);if(q.pick()===id)return true;
      }
      throw Error('No clear E position: '+id);
    },id);
    await page.keyboard.press('e');
    await page.evaluate(()=>parkQA.tick(1.05));
    const preset={shore:'water',gazebo:'gazebo',secret:'garden',rest:'nook',lookout:'hill'}[short];
    await page.waitForFunction(v=>{parkQA.updateAudio();return parkQA.state().mix?.preset===v;},preset,{polling:70,timeout:6500});
    const snap=await page.evaluate(async()=>{const s=parkQA.state();const pic=await parkQA.capture({phase:16.6});return {view:s.cam,mode:s.mode,seat:s.seat,mix:s.mix?.preset,...pic};});
    const {data,...state}=snap;assert.equal(state.mode,'seat');assert.equal(state.seat,id);
    const file=`screenshots/quiet/${short}.png`;await writeFile(file,Buffer.from(data.split(',')[1],'base64'));const raw=await readFile(file);assert.ok(raw.length>40e3);
    results.push({id,file,bytes:raw.length,...state});console.log(`${state.seat} (${state.mix}) -> ${file}`);
    await page.keyboard.press('Escape');await page.evaluate(()=>parkQA.tick(.75));assert.equal(await page.evaluate(()=>parkQA.state().mode),'walk');
  }
  assert.deepEqual(p.errors,[]);
}finally{
  await mkdir('docs/evidence',{recursive:true});await writeFile('docs/evidence/quiet-views.json',JSON.stringify({build,backend,results,errors:p.errors,warnings:[...new Set(p.warnings)]},null,2));await browser.close();
}
