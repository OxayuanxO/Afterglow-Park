// Low-resolution desktop-engine diagnostics. The first-frame mode deliberately
// stops RAF; do not confuse scripted stepping with normal native keyboard play.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {firefox,webkit} from 'playwright';
import {url} from './browser.mjs';

const name=process.env.PW_ENGINE||'firefox',engine={firefox,webkit}[name];
if(!engine)throw Error(`Unknown engine ${name}`);
const live=process.env.CHECK==='live-lite',kind=live?'live-lite':'first-frame';
const viewport={width:384,height:240},output=process.env.OUT||'screenshots/render-check';
const evidence=process.env.PARK_PROOF_OUT||`docs/evidence/compat-${name}-${kind}.json`;
const proof={engine:name,stamp:new Date().toISOString(),url:url({backend:'webgl',quality:'low',qa:1,still:live?null:1,skip:1,world:live?1:null}),viewport:[viewport.width,viewport.height],kind,softwareRequested:true,phases:[],errors:[],warnings:[],frames:[],ok:false};
let browser,stage='setup';
const save=()=>writeFile(evidence,JSON.stringify(proof,null,2)+'\n');
const mark=async next=>{stage=next;proof.stage=next;await save();};
const deadline=(fn,ms)=>new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error(`${stage} exceeded ${ms} ms`)),ms);
  Promise.resolve().then(fn).then(v=>{clearTimeout(timer);resolve(v);},e=>{clearTimeout(timer);reject(e);});
});
try{
  await mkdir(output,{recursive:true});await mkdir('docs/evidence',{recursive:true});
  const opts={headless:false,env:{...process.env,LIBGL_ALWAYS_SOFTWARE:'1'},timeout:30000};
  if(name==='firefox')opts.firefoxUserPrefs={'webgl.force-enabled':true,'gfx.webrender.software':true,'widget.dmabuf.force-enabled':false};
  browser=await engine.launch(opts);proof.browserVersion=browser.version();
  const page=await browser.newPage({viewport,deviceScaleFactor:1});page.setDefaultTimeout(20000);
  page.on('console',m=>{
    const t=m.text();if(t.startsWith('PARK_BOOT_PHASE')){proof.phases.push(t);console.log(name,t);}
    else if(m.type()==='error')proof.errors.push(t);else if(m.type()==='warning')proof.warnings.push(t);
  });
  page.on('pageerror',e=>proof.errors.push(e.message));page.on('crash',()=>proof.errors.push('page crashed'));
  await page.addInitScript(()=>{
    let last='';const obs=new MutationObserver(()=>{
      const status=document.getElementById('loading');if(!status)return;
      const s=[document.body.dataset.backend,status.hidden?'hidden':status.textContent,document.body.dataset.ready,document.body.dataset.error].filter(Boolean).join(' · ');
      if(s!==last){last=s;console.log('PARK_BOOT_PHASE '+s);}
    });obs.observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['data-backend','data-ready','data-error','hidden']});
  });
  const index=await page.request.get(proof.url);assert.ok(index.ok());proof.build=(await index.text()).match(/<script[^>]*type="module"[^>]*src="([^"]+)"/)?.[1];
  assert.ok(proof.build,'Serve a production build for the desktop-engine diagnostic.');
  if(process.env.EXPECT_BUNDLE)assert.ok(proof.build.endsWith('/'+process.env.EXPECT_BUNDLE),'Unexpected build.');
  await mark('startup');
  await page.goto(proof.url,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>window.parkQA?.ready||document.body.dataset.error,undefined,{timeout:95000,polling:150});
  proof.backend=await deadline(()=>page.evaluate(()=>window.parkQA?.backend??null),12000);assert.equal(proof.backend,'WebGL 2');
  await mark('walk');
  if(live){
    // Skip the intro without starting the audio device in this smoke check.
    const start=await deadline(()=>page.evaluate(()=>{parkQA.start();return {z:parkQA.player().z,frames:parkQA.renderHealth().completedFrames};}),12000);
    await page.keyboard.down('w');
    try{await page.waitForFunction(({z})=>parkQA.player().z<z-.8,start,{timeout:20000,polling:140});}
    finally{await page.keyboard.up('w');}
    const now=await deadline(()=>page.evaluate(()=>({z:parkQA.player().z,health:parkQA.renderHealth()})),12000);
    proof.motion=start.z-now.z;
    await page.waitForFunction(({frames})=>parkQA.renderHealth().completedFrames>=frames+2,start,{timeout:22000,polling:140});
    proof.renderHealth=await deadline(()=>page.evaluate(()=>{parkQA.paused(true);return parkQA.renderHealth();}),12000);
    assert.ok(!proof.renderHealth.contextLost&&!proof.renderHealth.fenceError);
    proof.completed=proof.renderHealth.completedFrames-start.frames;
    await mark('compositor');
    const file=`${output}/compat-${name}-live-lite.png`,png=await page.screenshot({path:file,animations:'disabled',timeout:18000});
    proof.frames.push({file,id:'arrival',source:'browser-compositor',sha256:createHash('sha256').update(png).digest('hex')});
    // Image content must be reviewed separately. No offscreen-to-canvas bypass.
  }else{
    await page.locator('#enter').click({timeout:20000});
    proof.motion=await deadline(()=>page.evaluate(()=>{const start=parkQA.player().z;parkQA.key('KeyW',true);parkQA.tick(1,.033);parkQA.key('KeyW',false);return start-parkQA.player().z;}),12000);assert.ok(proof.motion>.8);
    for(const id of ['promenade','cabin']){
      await mark(`capture-${id}`);
      const {data,stats,range,alpha}=await deadline(()=>page.evaluate(async id=>{
        const {data,stats}=await parkQA.capture({id,tier:'low',phase:12.8});const img=new Image();img.src=data;await img.decode();
        const c=document.createElement('canvas');c.width=40;c.height=25;const g=c.getContext('2d');g.drawImage(img,0,0,40,25);const p=g.getImageData(0,0,40,25).data;
        let min=255,max=0,alpha=0;for(let i=0;i<p.length;i+=4){const l=.213*p[i]+.715*p[i+1]+.072*p[i+2];min=Math.min(l,min);max=Math.max(l,max);alpha+=+(p[i+3]>=240);}
        return {data,stats,range:max-min,alpha};
      },id),48000);
      assert.ok(range>20&&alpha>=950&&stats.calls>20,'Expected drawing and color variation');
      const image=Buffer.from(data.split(',')[1],'base64'),file=`${output}/compat-${name}-${id}.png`;
      await writeFile(file,image);proof.frames.push({id,stats,range,alpha,file,source:'canvas',sha256:createHash('sha256').update(image).digest('hex')});
    }
  }
  assert.deepEqual(proof.errors,[]);proof.ok=true;await mark('finished');
}catch(error){
  proof.ok=false;proof.failure=String(error).split('\nBrowser logs:')[0];process.exitCode=1;
}finally{
  await save();console.log(JSON.stringify(proof));await browser?.close();
}
