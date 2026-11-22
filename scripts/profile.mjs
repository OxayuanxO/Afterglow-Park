import {writeFile} from 'node:fs/promises';
import {browserPage,boot} from './browser.mjs';
const p=await browserPage({width:240,height:150});const views={};
try{
  const tier=process.env.QUALITY||'medium',backend=await boot(p,{world:1,quality:tier}),build=await p.page.locator('script[type=module][src]').first().getAttribute('src');console.log('Ready',build);
  const guide={medium:1000,high:1800}[tier],roof={medium:5000000,high:9000000}[tier];
  for(const id of (process.env.VIEWS||'aerial,tree,pond,market,rink,canopy').split(',')){
    views[id]=await p.page.evaluate(async id=>{parkQA.goto(id);await new Promise(requestAnimationFrame);const res=parkQA.profile();await new Promise(requestAnimationFrame);return res;},id);
    console.log(id,views[id].stats.calls,views[id].stats.triangles,Object.fromEntries(Object.entries(views[id].passes).map(([k,v])=>[k,[v.count,v.triangles,Object.entries(v.groups).sort((a,b)=>b[1].count-a[1].count).slice(0,9).map(([n,{count}])=>n+':'+count)]])));
    if(views[id].stats.calls<12||views[id].stats.triangles<10000)throw Error('No representative frame at '+id);
    await writeFile(process.env.OUT||'/tmp/ww-r10/profile.json',JSON.stringify({build,backend,tier,views,drawCallTarget:guide,triangleTarget:roof,exceeds:Object.entries(views).filter(([,a])=>a.stats.calls>guide||a.stats.triangles>roof).map(([k])=>k),errors:p.errors,warnings:[...new Set(p.warnings)]},null,2));
  }
  if(p.errors.length||process.env.REQUIRE==='1'&&Object.values(views).some(a=>a.stats.calls>guide||a.stats.triangles>roof))process.exitCode=1;
}finally{await p.browser.close();}
