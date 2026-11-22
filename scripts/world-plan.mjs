// CPU layout planning only (no renderer). For final evidence run `qa:density`
// in Chromium. The stub only suppresses rasterizes of procedural texels/text;
// the model anchors, geometry and collider code are the live world builder.
import { createServer } from 'vite';
import * as T from 'three/webgpu';
import {writeFile} from 'node:fs/promises';
const stub={createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),getImageData:(_x,_y,w,h)=>({data:new Uint8ClampedArray(w*h*4)}),measureText:s=>({width:s.length*8})};
globalThis.document={createElement:()=>({getContext:()=>new Proxy(stub,{get: (o,k)=>o[k]??(()=>{}),set:()=>true})})};
globalThis.requestAnimationFrame=cb=>setImmediate(cb);
const v=await createServer({configFile:false,server:{middlewareMode:true,ws:false,hmr:false},appType:'custom'});
try{
  const result={};
  const {buildWorld}=await v.ssrLoadModule('/src/world.js');
  const w=await buildWorld(new T.Scene(),(p,t)=>console.log(p,t),{plan:process.env.PLAN==='1',layoutOnly:process.env.ESTIMATE_RENDER!=='1'});
  if(process.env.PLAN==='1')await writeFile('src/data/christmas-sites.json',JSON.stringify(w.decor.plan,null,1)+'\n');
  const {ParkEvents}=await v.ssrLoadModule('/src/events.js');new ParkEvents({world:w});
  console.log('ready',w.vegetation.counts,w.vegetation.coverage,w.decor.niches);
  result.forest={coverage:w.vegetation.coverage,species:w.vegetation.counts,decorated:w.vegetation.decorated,lights:w.vegetation.bulbs};
  result.catalogue=w.decor.catalogue();
  result.sites=w.pois.filter(p=>['elf','village'].includes(p.type));
  if(process.env.ESTIMATE_RENDER==='1'){
    const {tiers,defaults}=await v.ssrLoadModule('/src/quality.js');
    const {Atmosphere}=await v.ssrLoadModule('/src/environment.js');
    const camera=new T.PerspectiveCamera(55,1.6,.09,1430);
    const proj=new T.Matrix4(),f=new T.Frustum();result.views={};
    for(const tier of Object.values(tiers)){
      const report={};result.views[tier.id]=report;
      for(const shot of w.layout.shots){
        camera.position.fromArray(shot.p);camera.lookAt(...shot.t);camera.fov=shot.fov;camera.updateProjectionMatrix();camera.updateMatrixWorld();
        const sett={...defaults,time:shot.time??'night'},env=new Atmosphere(sett);env.update(0,sett,false);
        w.update(.45,env.t,camera,env,tier,sett,shot.id==='cabin'?w.cabins[0]:null);
        w.scene.updateMatrixWorld(true);f.setFromProjectionMatrix(proj.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
        const bins={};let calls=0,tris=0;
        w.scene.traverseVisible(o=>{
          if(!o.isMesh||!o.layers.test(camera.layers)||o.frustumCulled&&!f.intersectsObject(o))return;
          const m=o.material,tri=(o.geometry.index?.count??o.geometry.attributes.position.count)/3*(o.count??(o.geometry.isInstancedBufferGeometry?o.geometry.instanceCount:1));
          const key=o.userData.craftLocal?'local-craft':o.name.includes('LOD')?'trees':m.name||o.name||'other';
          const bin=bins[key]??={calls:0,tris:0};const c=m.transparent&&m.side===T.DoubleSide&&!m.forceSinglePass?2:1;
          bin.calls+=c;bin.tris+=tri*c;calls+=c;tris+=tri*c;
        });report[shot.id]={calls,tris,bins};
      }
      console.log(tier.id,Object.entries(report).map(([k,a])=>[k,a.calls,Math.round(a.tris/1000)]));
    }
  }
  if(process.env.JUST_PLAN!=='1'){
    result.survey=w.decor.report(+(process.env.GRID||5.3),process.env.PHASE?.split(',').map(Number));
    if(process.env.PROBES)result.heldOut=process.env.PROBES.split(';').map(v=>{const [s,x,z]=v.split(',').map(Number);return w.decor.report(s,[x,z]);});
    result.instances={main:w.batch.instances,city:w.cityBatch.instances,craft:w.craftBatch.instances};
    console.log(JSON.stringify({pass:result.survey.pass,total:result.survey.total,groups:result.survey.groups,n:result.survey.n,niches:result.survey.niches,sites:result.sites.length,instances:result.instances,areas:result.survey.regions.map(r=>[r.id,r.placed.length,r.seen.length,r.passed,r.samples])}));
  }
  await writeFile(process.env.OUT||'/tmp/ww-r10/world-plan.json',JSON.stringify(result,null,2));
}finally{await v.close();}
