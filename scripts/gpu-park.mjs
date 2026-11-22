// Do not confuse successful submissions, output-target pixels and actual
// canvas/compositor pixels. Record them as separate GPU acceptance checks.
import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import {browserPage,boot} from './browser.mjs';
const p=await browserPage({backend:'gpu',width:480,height:300});
const dir=process.env.OUT||'/tmp/ww-r10/gpu-parks',out={profile:process.env.GPU_PROFILE||'default',errors:p.errors,warnings:p.warnings};
const tag=[out.profile,process.env.RUN_ID].filter(Boolean).join('-');
let failure=null;
try{
  out.backend=await boot(p,{world:1,quality:'low',present:process.env.PRESENT});
  out.build=await p.page.locator('script[type=module][src]').first().getAttribute('src');
  await mkdir(dir,{recursive:true});
  out.presentation=await p.page.evaluate(()=>parkQA.presentation);
  out.adapter=await p.page.evaluate(()=>parkQA.adapter);
  const {data,...info}=await p.page.evaluate(async()=>{
    const q=parkQA;q.goto('tree');q.render(12.8);
    await q.synchronize();await new Promise(requestAnimationFrame);
    const raw=document.querySelector('#park-canvas').toDataURL('image/png');
    const info=async data=>{
      const img=await createImageBitmap(await (await fetch(data)).blob());
      const c=new OffscreenCanvas(40,25).getContext('2d');c.drawImage(img,0,0,40,25);img.close();
      const d=c.getImageData(0,0,40,25).data;let a=0,r=0,g=0,b=0,min=255,max=0;
      for(let i=0;i<d.length;i+=4){a+=+(d[i+3]>240);r+=d[i];g+=d[i+1];b+=d[i+2];const l=d[i]*.213+d[i+1]*.715+d[i+2]*.072;min=Math.min(min,l);max=Math.max(max,l);}
      return {opaque:a,range:+(max-min).toFixed(2),rgb:[r,g,b].map(x=>x/1000)};
    };
    const target=await q.capture({id:'tree',tier:'low',phase:12.8});
    return {canvas:await info(raw),target:await info(target.data),stats:target.stats,data:target.data};
  });
  Object.assign(out,info);
  await writeFile(`${dir}/target-${tag}.png`,Buffer.from(data.split(',')[1],'base64'));
  const cmp=await p.page.locator('#park-canvas').screenshot({timeout:95000});
  await writeFile(`${dir}/compositor-${tag}.png`,cmp);
  out.compositor=await p.page.evaluate(async b64=>{
    const bmp=await createImageBitmap(await (await fetch('data:image/png;base64,'+b64)).blob());
    const c=new OffscreenCanvas(40,25).getContext('2d');c.drawImage(bmp,0,0,40,25);bmp.close();
    const d=c.getImageData(0,0,40,25).data;let lo=255,hi=0;
    for(let i=0;i<d.length;i+=4){const k=(d[i]+d[i+1]+d[i+2])/3;lo=Math.min(lo,k);hi=Math.max(hi,k);}
    return {range:+(hi-lo).toFixed(2)};
  },cmp.toString('base64'));
  assert.ok(out.target.opaque>950&&out.target.range>20,'Graded output render target is blank');
  assert.ok(out.canvas.opaque>950&&out.canvas.range>20,'Visible canvas is blank');
  assert.ok(out.compositor.range>20,'Page compositor is blank');
  assert.deepEqual(p.errors,[]);
}catch(e){failure=String(e);throw e;}
finally{
  console.log(JSON.stringify({...out,failure}));
  await mkdir('docs/evidence',{recursive:true});await writeFile(`docs/evidence/gpu-park-${out.profile}${process.env.RUN_ID?'-'+process.env.RUN_ID:''}.json`,JSON.stringify({...out,failure},null,2));
  await p.browser.close();
}
