// Optional offline scene planning. Suggest low detail clusters where a
// neighborhood lacks types. Never rewrites layout: visually review proposals
// and rerun the real-browser survey, which also remains a visibility proxy.
import {createServer} from 'vite';
import {Scene} from 'three/webgpu';
import {writeFile} from 'node:fs/promises';
const stub={createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),getImageData:(_x,_y,w,h)=>({data:new Uint8ClampedArray(w*h*4)}),measureText:s=>({width:s.length*8})};
globalThis.document={createElement:()=>({getContext:()=>new Proxy(stub,{get:(o,k)=>o[k]??(()=>{}),set:()=>true})})};
globalThis.requestAnimationFrame=cb=>setImmediate(cb);
const v=await createServer({configFile:false,server:{middlewareMode:true,ws:false,hmr:false},appType:'custom'});
const opts=(input,defaults)=>input?input.split(';').map(a=>a.split(',').map(Number)):defaults;
const fit=opts(process.env.FIT,[[4.16,.39,.91],[3.61,.08,.46]]);
const audit=opts(process.env.AUDIT,[[6,.5,.5],[4.93,.25,.74],[3.83,.63,.37],[3.27,.13,.57]]);
const runs=async(w,grids)=>grids.map(([step,x,z])=>w.decor.report(step,[x,z]));
const dist=(x,z,a,b)=>Math.hypot(x-a,z-b);
try{
  const {buildWorld}=await v.ssrLoadModule('/src/world.js');
  const {ground,pondEdge}=await v.ssrLoadModule('/src/terrain.js');
  const {winterTrailMarker}=await v.ssrLoadModule('/src/winter-craft.js');
  const {ParkEvents}=await v.ssrLoadModule('/src/events.js');
  const w=await buildWorld(new Scene(),()=>{},{layoutOnly:true});new ParkEvents({world:w});
  const before=await runs(w,fit);const additions=[],excluded=[],used=Array(6).fill(0);
  const targets=before.flatMap(o=>o.miss.map(([x,y,z])=>({x,y,z})));
  const model=[[68,59],[66,56],[54,58],[67,55],[68,60],[69,66]];
  const dims={54:[.58,.55],55:[.48,.72],56:[.48,.50],58:[.61,.54],59:[.50,.69],60:[.52,.71],66:[.48,.48],67:[.58,.51],68:[.33,.59],69:[.56,.65]};
  const rink=w.layout.rink;
  function cluster(x,y,z,yaw,style){
    const f=(type,u,h,t,size)=>({type,x:x+u*Math.cos(yaw)+t*Math.sin(yaw),y:y+h,z:z-u*Math.sin(yaw)+t*Math.cos(yaw),size});
    const [a,b]=model[style],aa=dims[a],bb=dims[b];
    return [f(3,-.16,.96,.06,.36),f(a,.24,.17+aa[0]*.88,.09,aa[1]*.88),f(b,.15,.70+bb[0]*.83,-.10,bb[1]*.83)];
  }
  for(const q of targets){
    if(w.decor.visible(q,3).size>=3)continue;
    const neighborhood=[];
    for(let dz=-4;dz<=4;dz+=1)for(let dx=-4;dx<=4;dx+=1){
      const x=q.x+dx,z=q.z+dz,y=ground(x,z);
      if(Math.max(Math.abs(x),Math.abs(z))<=223&&pondEdge(x,z)>1.014&&!w.physics.blocked(x,z,y,.32)){
        const eye={x,y:y+1.65,z},prior=w.decor.visible(eye,3);
        if(prior.size<3)neighborhood.push([eye,prior]);
      }
    }
    let best=null;
    const start=Math.sin(q.x*1.15+q.z*.21)*Math.PI;
    for(let i=0;i<160;i++){
      const a=i*2.39996+start,b=[2.6,3.2,4.3,5.5,6.7,8.2,9.6,11.6][i%8],x=+(q.x+b*Math.sin(a)).toFixed(3),z=+(q.z+b*Math.cos(a)).toFixed(3),y=ground(x,z);
      if(Math.max(Math.abs(x),Math.abs(z))>222.8||Math.hypot(x,z)<17||pondEdge(x,z)<1.065||w.pathAt(x,z).edge<1.30||Math.hypot((x-rink.x)/(rink.rx+2),(z-rink.z)/(rink.rz+2))<1.02)continue;
      if(w.layout.quiet.some(p=>dist(x,z,p.x,p.z)<8.5)||w.cabins.some(p=>dist(x,z,p.x,p.z)<Math.hypot(p.w,p.d)*.61+1.8)||[...w.actions.grid.range(x,z,3)].some(p=>dist(x,z,p.x,p.z)<3))continue;
      if(w.physics.blocked(x,z,y,1.03)||Math.abs(y-ground(x+.55,z-.55))>.27||[...w.decor.grid.range(x,z,2.8)].some(p=>dist(x,z,p.x,p.z)<2.35))continue;
      if(!w.decor.ray(q,{x,y:y+.96,z,size:.36}))continue;
      const yaw=+Math.atan2(q.x-x,q.z-z).toFixed(3),prior=w.decor.visible(q,3);
      for(let style=0;style<6;style++){
        const m=cluster(x,y,z,yaw,style);
        const count=(eye,seen)=>seen.size+m.reduce((n,p)=>{const d=Math.hypot(p.x-eye.x,p.y-eye.y,p.z-eye.z);return n+(!seen.has(p.type)&&d<=20&&p.size>=d*.0125&&w.decor.ray(eye,p)?1:0);},0);
        if(count(q,prior)<3)continue;
        const score=neighborhood.reduce((n,[eye,seen])=>n+(count(eye,seen)>=3?1:0),0)-b*.09-used[style]*.016;
        if(!best||score>best.score)best={x,y,z,yaw,style,score};
      }
    }
    if(!best){excluded.push(q);continue;}
    const {x,y,z,yaw,style}=best;
    winterTrailMarker(w,x,y,z,yaw,426+style);
    additions.push([x,z,yaw,style]);used[style]++;
    console.log(`new detail ${x}, ${z}; prior gap ${q.x}, ${q.z}; local neighbors ${neighborhood.length}`);
  }
  const after=await runs(w,fit),independent=await runs(w,audit);
  const formerBlindSpots=targets.map(p=>({eye:p,visible:w.decor.visible(p).size,clear:!w.physics.blocked(p.x,p.z,ground(p.x,p.z),.32)}));
  for(const [group,list] of Object.entries({before,after,independent}))console.log(group,list.map(v=>[v.step,v.phase,v.pass,v.total]));
  await writeFile(process.env.OUT||'/tmp/ww-edge-refine.json',JSON.stringify({additions,excluded,before,after,independent,formerBlindSpots},null,2));
}finally{await v.close();}
