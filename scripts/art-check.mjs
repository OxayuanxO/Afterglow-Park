// Near-field, independently toggled AO and off-path framing checks.
import {writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {browserPage,boot} from './browser.mjs';
const p=await browserPage({width:640,height:400});
const rec={frames:[],errors:p.errors,warnings:p.warnings},folder=process.env.OUT||'/tmp/ww-r10/art';
let failure=null;
try{
  rec.backend=await boot(p,{world:1});rec.build=await p.page.locator('script[type=module][src]').first().getAttribute('src');
  await mkdir(folder,{recursive:true});
  const scenes=[
    {id:'cabin-low',shot:'cabin',tier:'low',ao:true},
    {id:'cabin-medium-no-ao',shot:'cabin',tier:'medium',ao:false},
    {id:'cabin-medium-ao',shot:'cabin',tier:'medium',ao:true},
    {id:'market-goods',p:[143.13,1.87,-101.50],t:[144.57,1.25,-99.25],fov:46},
    {id:'market-bakery',p:[120.34,1.95,-118.60],t:[119.84,1.51,-120.05],fov:54},
    {id:'bark',p:[-8.56,1.72,139.8],t:[-17.4,4.26,135.81],fov:56},
    {id:'gobo',p:[24.50,1.89,18.35],t:[26.31,-.08,14.54],fov:57},
    {id:'canopy-detail',shot:'canopy'},
    {id:'woodland-detail',p:[-132.46,1.39,44.24],t:[-132.65,.66,46.34],fov:50},
  ];
  for(const v of scenes){
    const {data,...row}=await p.page.evaluate(async o=>{
      const q=parkQA;q.setting('postAO',o.ao??true);if(o.p)q.view(o.p,o.t,o.fov);
      const snap=await q.capture({id:o.shot,tier:o.tier??'medium',phase:18.2});
      const img=await createImageBitmap(await (await fetch(snap.data)).blob());
      const c=new OffscreenCanvas(64,40).getContext('2d');c.drawImage(img,0,0,64,40);img.close();
      const a=c.getImageData(0,0,64,40).data,lum=[];
      for(let i=0;i<a.length;i+=4)lum.push(Math.round(a[i]*.213+a[i+1]*.715+a[i+2]*.072));
      return {post:q.post(),lum,...snap};
    },v);
    assert.equal(row.post.postAO,v.tier!=='low'&&(v.ao??true));
    const path=`${folder}/${v.id}.png`,buf=Buffer.from(data.split(',')[1],'base64');assert.ok(buf.length>25000,'Unexpectedly small frame '+v.id);await writeFile(path,buf);
    rec.frames.push({id:v.id,bytes:buf.length,...row});console.log(v.id,row.stats.calls,row.stats.triangles,row.post);
  }
  const a=rec.frames.find(x=>x.id==='cabin-medium-no-ao').lum,b=rec.frames.find(x=>x.id==='cabin-medium-ao').lum;
  rec.mediumAO={changed:a.filter((v,i)=>v!==b[i]).length,samples:a.length,meanAbsoluteDifference:a.reduce((n,v,i)=>n+Math.abs(v-b[i]),0)/a.length};assert.ok(rec.mediumAO.changed>5);
  for(const f of rec.frames)delete f.lum;
  assert.deepEqual(p.errors,[]);
}catch(e){failure=String(e);throw e;}finally{await writeFile('docs/evidence/near-art-webgl.json',JSON.stringify({...rec,failure},null,2));await p.browser.close();}
