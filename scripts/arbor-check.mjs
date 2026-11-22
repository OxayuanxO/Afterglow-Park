import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import {browserPage,boot} from './browser.mjs';
const p=await browserPage({width:+(process.env.W||800),height:+(process.env.H||500),flags:process.env.GPU_FLAGS?.split(' ').filter(Boolean)||[]});
const folder=process.env.OUT||'/tmp/ww-r10/probe';
const out={backend:null,rows:[],errors:p.errors,warnings:p.warnings};
try{
  out.backend=await boot(p,{world:1});console.log('READY',out.backend);await mkdir(folder,{recursive:true});
  out.forest=await p.page.evaluate(()=>parkQA.trees());
  for(const id of (process.env.VIEWS||'opening,tree,walk,aerial,rink,canopy').split(',')){
    const {data,stats}=await p.page.evaluate(id=>{
      if(id==='walk'){parkQA.view([-7,1.63,106],[-13,4.42,100],58);return parkQA.capture({tier:'medium',time:'night'});}
      return parkQA.capture({id,tier:'medium',time:id==='aerial'?'dusk':'night'});
    },id);
    const img=Buffer.from(data.split(',')[1],'base64');assert.ok(img.length>14000,'Empty or mostly blank frame '+id+' '+img.length);
    await writeFile(`${folder}/${p.backend}-${id}.png`,img);out.rows.push({id,bytes:img.length,...stats});console.log(JSON.stringify(out.rows.at(-1)));
  }
  assert.deepEqual(p.errors,[]);
}catch(e){out.failure=String(e.stack??e);throw e;}finally{await mkdir(folder,{recursive:true});await writeFile(`${folder}/${p.backend}.json`,JSON.stringify(out,null,2));await p.browser.close();}
