// Desktop engine spot checks. Linux WebKit is not a Safari certification;
// any Xvfb/Mesa software profile is functional testing, not a GPU benchmark.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,firefox,webkit} from 'playwright';
import {boot} from './browser.mjs';
const name=process.env.PW_ENGINE||'firefox',engine={chromium,firefox,webkit}[name];
if(!engine)throw Error(`Unknown engine ${name}`);
const output=process.env.OUT||'screenshots/render-check',rec={engine:name,stamp:new Date().toISOString(),headless:process.env.HEADFUL!=='1',errors:[],warnings:[],frames:[]};
let browser;
try{
  const opts={headless:rec.headless,timeout:45000};
  if(process.env.SOFTWARE==='1'){
    opts.env={...process.env,LIBGL_ALWAYS_SOFTWARE:'1'};
    if(name==='firefox')opts.firefoxUserPrefs={'webgl.force-enabled':true,'gfx.webrender.software':true,'widget.dmabuf.force-enabled':false};
    if(name==='chromium')opts.args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage'];
    rec.softwareRequested=true;
  }
  browser=await engine.launch(opts);rec.browserVersion=browser.version();
  const page=await browser.newPage({viewport:{width:480,height:300},deviceScaleFactor:1});
  page.on('pageerror',e=>rec.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')rec.errors.push(m.text().slice(0,360));if(m.type()==='warning')rec.warnings.push(m.text().slice(0,360));});
  rec.gl=await page.evaluate(()=>{
    const gl=document.createElement('canvas').getContext('webgl2');if(!gl)return null;
    const debug=gl.getExtension('WEBGL_debug_renderer_info');
    const support={renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),halfFloat:!!gl.getExtension('EXT_color_buffer_float'),version:gl.getParameter(gl.VERSION)};
    gl.getExtension('WEBGL_lose_context')?.loseContext();return support;
  });
  assert.ok(rec.gl,'No WebGL 2 context on this engine/profile');
  const p={backend:'webgl',browser,page,errors:rec.errors,warnings:rec.warnings};
  rec.backend=await boot(p,{still:null,skip:1,quality:'low'});assert.equal(rec.backend,'WebGL 2');
  rec.build=await page.locator('script[type=module][src]').first().getAttribute('src');
  await page.locator('#enter').click({timeout:45000});
  await page.waitForFunction(()=>parkQA.state().mode==='walk',null,{timeout:45000,polling:150});
  const z=await page.evaluate(()=>parkQA.player().z);await page.keyboard.down('w');
  try{await page.waitForFunction(z=>parkQA.player().z<z-.8,z,{timeout:35000,polling:140});}finally{await page.keyboard.up('w');}
  rec.motion=z-await page.evaluate(()=>parkQA.player().z);
  await page.evaluate(()=>parkQA.paused(true));
  await mkdir(output,{recursive:true});
  for(const id of ['promenade','cabin']){
    const {data,range,alpha,stats}=await page.evaluate(async id=>{
      const {data,stats}=await parkQA.capture({id,tier:'low',phase:12.8});
      const im=new Image();im.src=data;await im.decode();const c=document.createElement('canvas');c.width=40;c.height=25;
      const ctx=c.getContext('2d');ctx.drawImage(im,0,0,40,25);const px=ctx.getImageData(0,0,40,25).data;
      let lo=255,hi=0,alpha=0;for(let i=0;i<px.length;i+=4){let l=.213*px[i]+.715*px[i+1]+.072*px[i+2];lo=Math.min(lo,l);hi=Math.max(hi,l);alpha+=+(px[i+3]>=240);}
      return {data,stats,alpha,range:+(hi-lo).toFixed(2)};
    },id);
    assert.ok(alpha>=950&&range>20&&stats.calls>20,`Bad ${id} pixels/geometry`);
    const bytes=Buffer.from(data.split(',')[1],'base64'),file=`${output}/${name}-${id}.png`;
    await writeFile(file,bytes);rec.frames.push({id,file,alpha,range,stats,sha256:createHash('sha256').update(bytes).digest('hex')});
  }
  assert.deepEqual(rec.errors,[]);rec.ok=true;
}catch(e){rec.ok=false;rec.failure=String(e);process.exitCode=1;}
finally{
  await browser?.close();await mkdir('docs/evidence',{recursive:true});
  await writeFile(`docs/evidence/compat-${name}.json`,JSON.stringify(rec,null,2));
  console.log(JSON.stringify({engine:name,build:rec.build,gl:rec.gl,ok:rec.ok,failure:rec.failure,images:rec.frames.length,motion:rec.motion}));
}
