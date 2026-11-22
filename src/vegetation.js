import * as T from 'three/webgpu';
import {positionWorld,float,vec3,uniform,sin,smoothstep,cos,mix,step} from 'three/tsl';
import {arborMaterials,modelArbor} from './arbor.js';
import layout from './data/layout.json';
import {ground,pondEdge} from './terrain.js';
import {TAU,clamp,rng,between,noise2,hash2,Grid,distSegment} from './math.js';
import {G,part} from './mesh.js';

// Layer 4 belongs only to the moon's depth camera. Visible LOD0 keeps all
// branches, sprays and snow; coarse silhouettes suffice for a softened map.
const treeShadowLayer=4;
const species=[
  ['Norway spruce',.71,.76,.112,0x314637],['Caucasian fir',.92,.92,.092,0x3b4d38],['Silver fir',.82,1.08,.119,0x3d493c],
  ['Scots pine',.64,1.35,.30,0x394a33],['Cedar',.96,1.24,.144,0x404d36],['Juniper',.74,1.43,.065,0x43513c],
  ['Birch',0,1,.28,0xa99e8d],['Aspen',0,.78,.27,0x746453],['Mountain ash',0,1.11,.20,0x694633],['Larch',0,.85,.19,0x554333]
];
export const boughRadius=(y,f=.76)=>Math.pow(Math.max(0,1-y),f)*1.11;
function allowed(x,z,env,extra=0){
  const p=layout.plaza, l=layout.lawn,ri=layout.rink;
  if(Math.hypot(x,z)<p.r+extra+1.8||pondEdge(x,z)<1.065||Math.hypot((x-l.x)/l.rx,(z-l.z)/l.rz)<1.01||Math.hypot((x-ri.x)/(ri.rx+8),(z-ri.z)/(ri.rz+7))<1)return false;
  if(z>37&&z<216&&Math.abs(x)<(z<85?15:12.2)+extra)return false;
  if(distSegment(x,z,12,66,3,36)<7.9||Math.hypot(x-12,z-63)<9.0)return false;
  if(z>32&&z<80&&distSegment(x,z,7,82,25,30)<4.1)return false;
  if(Math.hypot(x+32,z-19)<8.7||Math.hypot(x-29,z-120)<8.2)return false;
  if(x>84&&x<162&&z> -153&&z< -89)return false;
  if(Math.abs(x)<47&&z> -183&&z< -106)return false;
  if(Math.hypot(x-66,z-78)<17.5||Math.hypot(x-91,z-75)<13||Math.hypot(x-81,z-151)<11||Math.hypot(x-121,z-135)<7.9||Math.hypot(x+53,z+154)<10||Math.hypot(x+143,z+133)<11)return false;
  if(Math.hypot(x-18,z-209)<14||Math.hypot(x+22,z-201)<13||Math.hypot(x+65,z-72)<9||Math.hypot(x+149,z-75)<8)return false;
  if(Math.hypot(x+165.3,z-128.1)<6.8||Math.hypot(x+22,z-99)<5.1||Math.hypot(x+125,z+57)<6.5)return false;
  if(distSegment(x,z,-146,-133,0,0)<(Math.hypot(x+146,z+133)<74?10.8:5.7)&&Math.hypot(x+146,z+133)<133)return false;
  if(distSegment(x,z,-163,128,-9,6)<5.7&&x< -48)return false;
  if(distSegment(x,z,-23,100,1,19)<3||distSegment(x,z,130,122,171,164)<3.0||distSegment(x,z,129,120,106,119)<2.8)return false;
  if(layout.cabins.some(c=>Math.hypot(x-c.x,z-c.z)<Math.max(c.w,c.d)*.5+6+extra))return false;
  if(layout.canopySpans?.some(([ax,az],i,a)=>i>0&&distSegment(x,z,a[i-1][0],a[i-1][1],ax,az)<2.45))return false;
  const ped=env.pathAt(x,z);if(ped.edge<1.0+extra)return false;
  return true;
}
export function distribution(env){
  const random=rng(layout.seed+871),min=4.20,list=[];let grid=new Grid(6.4);
  function add(x,z,h,rr,type,row=false){
    const id=list.length;const t={x,z,y:ground(x,z),h,rr,type,v:Math.floor(random()*3),yaw:random()*TAU,tilt:between(random,-.062,.062),tint:between(random,.83,1.16),id,row};list.push(t);grid.insert(t,x,z,6.65);return t;
  }
  // Measured rhythm of the promenade, with gaps left to reveal lamps and arches.
  for(const sign of [-1,1])for(let row=0;row<2;row++)for(let i=0;i<19;i++){
    const z=52+8.42*i+between(random,-2,2),x=sign*(12.1+row*7.4+between(random,-1.7,1.9));
    if((z<86&&row===0)||!allowed(x,z,env,-.7)||i===18&&row===0)continue;
    add(x,z,between(random,18,27),between(random,3.3,4.9),i%9===1?6:i%5===0?2:0,true);
  }
  // Low foreground snow boughs plus taller picture frames.
  for(const a of [[-18,55,22,4.7,0],[-27,63,26,5.2,1],[28,61,15,3.2,0],[43,51,23,4.5,4],[-24,43,20,4.4,0],[-35,35,16,3.35,0],[26,69,24,4.7,0],[-16,71,20,4.2,4]])if(allowed(a[0],a[1],env,-4))add(...a,true);
  for(let i=0;i<155000 && list.length<layout.treeTarget;i++){
    const x=between(random,-223,223),z=between(random,-223,223);const density=noise2(x*.022+.5,z*.022+6);
    if(density<.30&&random()<.69||!allowed(x,z,env,0))continue;
    if(grid.at(x,z).some(q=>(q.x-x)**2+(q.z-z)**2<min**2*(.87+.36*(1-density))))continue;
    const pr=random();const type=pr<.39?0:pr<.52?1:pr<.62?2:pr<.70?3:pr<.77?4:pr<.81?5:pr<.91?6:pr<.944?7:pr<.975?8:9;
    const h=type===5?between(random,3.9,8.6):type===8?between(random,7.1,12.5):type>5?between(random,13,23.7):between(random,16.9,31.1);
    const rr=h*(type===5?.34:type===3?.204:type===1?.193:between(random,.177,.217));
    add(x,z,h,rr,type);
  }
  // Move only the seed's measured offender, before placing roots, anchor
  // lights or colliders. Rejection in the generator would reshuffle the forest.
  let moved=0;
  for(const {from,to} of layout.treeTransplants??[]){
    const t=list.find(t=>Math.hypot(t.x-from[0],t.z-from[1])<.065);
    if(!t||!allowed(to[0],to[1],env,.13)||list.some(v=>v!==t&&Math.hypot(v.x-to[0],v.z-to[1])<4.20))continue;
    [t.x,t.z]=to;t.y=ground(t.x,t.z);moved++;
  }
  if(moved){grid=new Grid(6.4);for(const t of list)grid.insert(t,t.x,t.z,6.65);}
  // Keep the seeded positions and protected vistas while balancing species.
  // Leave the largest fir groups at the entrances and along framed views.
  for(const t of list){
    if(t.type!==0||t.row||Math.hypot(t.x,t.z)<59||hash2(t.x*19|0,t.z*17|0)>.318)continue;
    const h=hash2(t.id,614);t.type=h<.50?6:h<.73?7:h<.87?9:8;
    t.h=t.type===8?5.9+h*2.7:Math.min(t.h,24.8);if(t.type===8)t.rr*=.80;
  }
  let covered=0,tot=0;
  for(let x=-224;x<225;x+=2)for(let z=-224;z<225;z+=2){tot++;if(grid.at(x,z).some(t=>(x-t.x)**2+(z-t.z)**2<(t.rr*(t.type<6?.94:.8))**2))covered++;}
  return {grid,list,coverage:covered/tot,moved};
}
export function forest(w){
  const data=distribution(w);const {list}=data;const {mat,scene,physics}=w;
  const {near,mid,far,phase,wind}=arborMaterials();
  mat.arborNear=near;mat.arborMid=mid;mat.arborFar=far;
  const libs=species.map((_,i)=>[0,1,2].map(v=>[0,1,2,3].map(l=>modelArbor(39242+i*5154+v*288,i,species[i],l))));
  const groups=new Map();const o=new T.Object3D();const color=new T.Color();const cell=50;
  const shadowPaint=new T.MeshBasicNodeMaterial({name:'Depth-only winter canopy'});
  w.light.moon.shadow.camera.layers.enable(treeShadowLayer);
  for(const t of list){
    physics.cylinder(t.x,t.z,clamp(t.h*.032,.22,.70),t.y,t.y+t.h*.85,'tree');
    const i=Math.floor(t.x/cell),j=Math.floor(t.z/cell),key=i+':'+j;
    let c=groups.get(key);if(!c)groups.set(key,c={x:(i+.5)*cell,z:(j+.5)*cell,variants:new Map(),lod:3});
    const v=t.type*3+t.v;let a=c.variants.get(v);if(!a)c.variants.set(v,a=[]);a.push(t);
  }
  for(const c of groups.values()){
    c.levels=[];
    for(let l=0;l<4;l++){
      const variants=new Map();
      for(const [id,trees] of c.variants){const i=Math.floor(id/3),key=l===0?id:l===1?(i<3?0:i<6?9:i<8?18:24):l===2?(i<3?0:i<6?9:18):(i<6?0:18);
        if(!variants.has(key))variants.set(key,[]);variants.get(key).push(...trees);
      }
      const entries=[];
      for(const [id,trees] of variants){
        const geo=libs[Math.floor(id/3)][id%3][l],mesh=new T.InstancedMesh(geo,[near,mid,far,far][l],trees.length);
        mesh.name=species[Math.floor(id/3)][0]+` LOD ${l}`;
        for(let i=0;i<trees.length;i++){
          const t=trees[i];o.position.set(t.x,t.y-.045,t.z);o.scale.set(t.rr,t.h,t.rr);o.rotation.set(t.tilt,t.yaw,t.tilt*.65);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);mesh.setColorAt(i,color.setRGB(t.tint,t.tint*.98,t.tint*.96));(t.refs??=[]).push({mesh,i});
        }
        mesh.computeBoundingSphere();mesh.boundingSphere.radius+=2;mesh.matrixAutoUpdate=false;mesh.receiveShadow=l<3;mesh.castShadow=false;mesh.visible=false;scene.add(mesh);entries.push(mesh);
      }c.levels.push(entries);
    }
    c.shadow=c.levels[1].map(src=>{
      const mesh=new T.InstancedMesh(src.geometry,shadowPaint,src.count);
      mesh.instanceMatrix=src.instanceMatrix;mesh.boundingSphere=src.boundingSphere;
      mesh.layers.set(treeShadowLayer);mesh.castShadow=true;mesh.visible=false;mesh.matrixAutoUpdate=false;
      mesh.name='Moon depth • coarse tree silhouette';scene.add(mesh);return mesh;
    });
  }
  for(const [layer,cx,cz,radius] of [[2,-115,102,102],[3,135,8,65]]){
    for(const [isLeaf,type] of [[true,0],[false,6]]){
      const trees=list.filter(t=>(t.type<6)===isLeaf&&Math.hypot(t.x-cx,t.z-cz)<radius),geo=libs[type][1][3];
      if(!trees.length)continue;const proxy=new T.InstancedMesh(geo,far,trees.length);proxy.layers.set(layer);proxy.name='Reflection canopy LOD';
      for(let i=0;i<trees.length;i++){const t=trees[i];o.position.set(t.x,t.y,t.z);o.scale.set(t.rr,t.h,t.rr);o.rotation.set(t.tilt,t.yaw,0);o.updateMatrix();proxy.setMatrixAt(i,o.matrix);proxy.setColorAt(i,color.setRGB(t.tint,t.tint*.98,t.tint*.96));}proxy.computeBoundingSphere();scene.add(proxy);
    }
  }
  return {...data,shake(t){(data.shaking??=new Set()).add(t);},counts:species.map((s,i)=>[s[0],list.filter(t=>t.type===i).length]),decorated:0,bulbs:0,
    update(camera,tier,env,settings){phase.value=env.t;wind.value=settings.reduced?0:env.wind;const f=tier.lod;
      for(const t of data.shaking??[]){const u=env.t-t.shakeAt;const wobble=u>=2?0:Math.sin(u*14)*(1-u/2)*.027;if(u>2.08)continue;
        o.position.set(t.x,t.y-.045,t.z);o.scale.set(t.rr,t.h,t.rr);o.rotation.set(t.tilt+wobble,t.yaw,t.tilt*.65-wobble*.57);o.updateMatrix();for(const {mesh,i} of t.refs??[]){mesh.setMatrixAt(i,o.matrix);mesh.instanceMatrix.needsUpdate=true;}}
      if(data.shaking?.size)for(const t of data.shaking)if(env.t-t.shakeAt>2.07)data.shaking.delete(t);
      // At the photographed viewpoints the active cells snap immediately.
      // Only continuous camera changes blend; no doubled layers on a teleport.
      const last=data.lodCamera,teleport=!last||camera.distanceToSquared(last)>33**2||data.lastTier!==tier.id;
      if(!last)data.lodCamera=camera.clone();else last.copy(camera);data.lastTier=tier.id;
      const altitude=Math.max(0,camera.y);
      // The forest cannot end at a circular clearing when the camera climbs
      // above the canopy. High viewpoints retain the far-side LOD3 groves;
      // at ground and bridge height the walking budget is unchanged.
      const visRange=(tier.id==='low'?247:285)+Math.min(130,altitude*1.26)+Math.min(380,Math.max(0,altitude-46)*3);
      const edges=[25,62,101].map(n=>n*f);
      function set(items,vis,fade=0){for(const mesh of items){mesh.visible=vis;mesh.userData.lodFade=fade;}}
      for(const c of groups.values()){
        const dx=camera.x-c.x,dz=camera.z-c.z;
        const dist=Math.hypot(dx,dz,Math.max(0,camera.y-13)*.82);
        const boxDist=Math.hypot(Math.max(0,Math.abs(dx)-25),Math.max(0,Math.abs(dz)-25),Math.max(0,camera.y-16));
        let next=dist<edges[0]||boxDist<4&&camera.y<30?0:dist<edges[1]?1:dist<edges[2]?2:3;
        if(!teleport&&c.visible&&next!==c.lod){const boundary=edges[Math.min(next,c.lod)];if(Math.abs(dist-boundary)<5.25)next=c.lod;}
        const vis=dist<visRange,cast=vis&&boxDist<26&&camera.y<42;
        if(c.cast!==cast){c.cast=cast;for(const k of c.shadow)k.visible=cast;}
        if(teleport||!vis||!c.visible){if(c.transition)set(c.levels[c.transition.from],false);c.transition=null;set(c.levels[c.lod],false);c.lod=next;c.visible=vis;set(c.levels[next],vis);continue;}
        if(next!==c.lod){if(c.transition)set(c.levels[c.transition.from],false);c.transition={from:c.lod,start:env.t};c.lod=next;}
        if(c.transition){const fade=clamp((env.t-c.transition.start)/.42,0,1);const prev=c.levels[c.transition.from];
          if(fade>=1||settings.reduced){c.transition=null;set(prev,false);set(c.levels[c.lod],true);}
          else{set(prev,true,-Math.max(.001,fade));set(c.levels[c.lod],true,Math.max(.001,fade));}
        }
      }
    }};
}
export function dressForest(w){
  const {batch,mat:m,light,vegetation:data}=w;const r=rng(482139);
  const isFestive=t=> (t.row?10:0)+(26-Math.max(0,Math.abs(t.x)-10))/18*(t.z>35?2.3:.22)+(Math.hypot(t.x,t.z)>42&&Math.hypot(t.x,t.z)<66?3:0)+ (Math.hypot(t.x-117,t.z+114)<47?4.2:0)+(Math.hypot(t.x-113,t.z-124)<55?3.4:0)+(Math.hypot(t.x+81,t.z+99)<29?3.3:0)+ (w.pathAt(t.x,t.z).edge<5?.5:0)+r()*3;
  const choices=data.list.filter(t=>t.type<6).map(t=>({t,a:isFestive(t)})).sort((a,b)=>b.a-a.a).slice(0,layout.decoratedTrees).map(t=>t.t);
  for(const t of choices){w.decor?.add(0,t.x,t.y+t.h*.26,t.z,t.rr*.89,'tree');const n=t.row?103:48+Math.floor(r()*17);const c=t.row?m.filament:r()<.3?m.amber:m.filament;
    for(let i=0;i<n;i++){
      const u=i/(n-1),h=.104+u*(t.row?.69:.58),a=t.yaw+i/n*TAU*(t.row?7:5)+r()*.075;
      const R=t.rr*boughRadius(h,species[t.type][1])*between(r,.66,.90);const y=t.y+h*t.h;
      const ss=between(r,.037,.093)*(t.row?1.04:.69);part(batch,t.row?G.satinPip:G.bulb,c,t.x+Math.cos(a)*R,y,t.z+Math.sin(a)*R,ss,ss*1.18,ss,0,a,0,null,false,'tree lights');
    }
    if(t.row||r()<.15){const h=t.y+2.3;light.add(t.x+.7,h,t.z+.3,{power:0,glow:.60,bake:.12,radius:5,air:.27});}
    if(t.row&&r()<.61){w.decor?.add(17,t.x+.21*t.rr,t.y+.26*t.h,t.z,t.rr*.24);for(let i=0;i<7;i++){const a=i*.9+1.7,h=between(r,.17,.44),R=.78*t.rr*boughRadius(h);part(batch,G.smallBall,i%2?m.glassRed:m.glassGold,t.x+Math.cos(a)*R,t.y+t.h*h,t.z+Math.sin(a)*R,.15,.16,.15);}}
  }
  data.decorated=choices.length;data.bulbs=batch.instances;
}
export function makeTreeAsset(out,m,x,y,z,h=2,seed=329,style=0){
  const sc=style===1?.24:.32;const key=seed%5;let g=miniCache.get(key);if(!g){g=modelArbor(10025+key*843,0,species[0],1);miniCache.set(key,g);}
  part(out,g,m.arborMid,x,y,z,h*sc,h,h*sc,0,seed,0,null,true);
  for(let i=0;i<54;i++){const a=seed+i/54*TAU*5,t=.12+i/54*.76,R=h*sc*boughRadius(t)*.88;part(out,G.satinPip,i%9===0?m.amber:m.filament,x+Math.cos(a)*R,y+h*t,z+Math.sin(a)*R,.013*h,.015*h,.013*h);}
  for(let i=0;i<15;i++){const a=i*2.48+seed,t=.13+(i/15)*.71,R=h*sc*boughRadius(t)*.87;part(out,G.smallBall,i%3===0?m.glassRed:m.glassGold,x+Math.cos(a)*R,y+h*t,z+Math.sin(a)*R,.035*h,.037*h,.035*h);}
  part(out,G.tinyStar,m.filament,x,y+h*1.033,z,h*.081,h*.081,h*.077,0,-.2,0);
}
const miniCache=new Map();
export function christmasTree(w){
  const {scene,batch,mat:m,light,physics}=w;const height=37.9,R=12.4;
  w.decor?.add(0,0,5.8,0,11.0,'tree island');w.decor?.add(18,.6,height+1.15,-.48,2.7);
  const geometry=modelArbor(573837,0,species[0],0,true);const tree=part(scene,geometry,m.arborNear,0,.24,0,R,height,R,0,-.58,0,null,true);tree.name='The Grand Fir';
  const clock=uniform(0),progress=uniform(0),show=uniform(0),energy=uniform(1),motion=uniform(1);
  const mBulb=new T.MeshBasicNodeMaterial({name:'Grand fir • sequenced champagne bulbs'});
  const wave=smoothstep(6.2,0,positionWorld.y.sub(progress.mul(43)).abs()).mul(show);
  const ribbon=sin(positionWorld.y.mul(.62).sub(clock.mul(.85)).add(positionWorld.x.mul(.21))).mul(.5).add(.5);
  const champagne=cos(positionWorld.z.mul(6.1).add(positionWorld.x.mul(3.8))).mul(.37).add(.43).add(ribbon.mul(show).mul(.27)).clamp(0,1);
  const pulse=sin(clock.mul(.61).add(positionWorld.y.mul(.73)).add(positionWorld.x.mul(4.25))).mul(.11).mul(motion).add(.89);
  const c1=vec3(2.96,.93,.18),c2=vec3(4.16,2.19,.63);
  mBulb.colorNode=mix(c1,c2,champagne).mul(pulse).mul(energy).mul(mix(.80,1.27,wave));
  const r=rng(248127);let count=0;
  for(let i=0;i<layout.treeBulbs;i++){
    let u,a,R0;
    if(i<1900){u=.075+i/1900*.899;a=i/1900*TAU*13+.038*Math.sin(i*.54);R0=.971+.098*Math.sin(a*2+u*77);}
    else{u=between(r,.073,.973);a=r()*TAU;R0=between(r,.62,.99)+.055*Math.sin(a*4+u*46);}
    const rad=R*boughRadius(u)*R0;
    const s=between(r,.028,.079)*(i<1900?1.32:.89)*(1+u*.25);
    part(batch,G.bulb,mBulb,Math.cos(a)*rad+.70*u*u,.31+u*height,Math.sin(a)*rad-.48*u*u,s,s*between(r,.85,1.24),s,0,a,0,null,false,'fir bulbs');count++;
  }
  for(let i=0;i<252;i++){
    const t=.078+Math.pow(r(),1.35)*.86,a=i*2.399963+between(r,-.8,.8),rad=R*boughRadius(t)*between(r,.81,.987),sz=between(r,.125,.39)*(1-t*.42);
    const x=Math.cos(a)*rad+.7*t*t,z=Math.sin(a)*rad-.48*t*t,y=height*t+.22;
    if(i%8===0&&y<19)w.decor?.add(17,x,y,z,sz*2.0);
    part(batch,G.ball,i%5===0?m.glassSilver:i%5<3?m.glassRed:m.glassGold,x,y,z,sz,sz*1.018,sz);
    part(batch,G.rod,m.gold,x,y+sz*.97,z,sz*.38,sz*.22,sz*.38);
    if(i%8===2)light.halo(x,y,z,sz*.85,'#ffb67b',.33);
  }
  // Velvet bows and brass bells are large enough to read from the circle.
  for(let j=0;j<24;j++){const a=j*2.4,t=.11+j*.029,rad=R*boughRadius(t)*.91;const x=Math.cos(a)*rad,z=Math.sin(a)*rad,y=height*t;
    if(j%2===0)w.decor?.add(14,x,y+.06,z,1.23);
    for(const k of [-1,1])part(batch,G.ico,m.red,x+Math.sin(a)*k*.44,y+.06,z-Math.cos(a)*k*.44,.42,.22,.24,0,-a,-k*.29);
    part(batch,G.smallBall,m.glassGold,x,y,z,.20);part(batch,G.cap,m.gold,x+.22,y-.36,z,.29,.36,.29,0,0,.23);
  }
  const top=new T.Group();top.name='The solstice star';top.position.set(.6,height+1.15,-.48);
  part(top,G.tinyStar,m.gold,0,0,0,1.9,1.9,2.6);part(top,G.tinyStar,m.candle,0,0,.22,1.66,1.66,.42);part(top,G.tinyStar,m.candle,0,0,-.23,1.66,1.66,.42);
  part(top,G.tinyStar,m.amber,0,0,0,1.79,1.79,.64,0,Math.PI/2,0);scene.add(top);
  light.halo(.6,height+1.15,-.25,3.3,'#ffc383',.56);light.halo(.6,height+1.15,-.24,6.1,'#f5ae78',.20);
  for(let i=0;i<10;i++){const a=i/10*TAU;light.add(Math.cos(a)*6.4,3.8,Math.sin(a)*6.4,{power:123,distance:27,bake:.68,radius:20,glow:1.6,air:.40,color:'#ffc385'});}
  physics.cylinder(0,0,10.66,.0,2.9,'tree island');
  let event=-100,duration=0;
  return {count,event(long=false,at=clock.value){event=at;duration=long?60:11;},cancel(){duration=0;},showState(t){return {active:t>=event&&t-event<duration,duration,at:event};},
    update(t,s){clock.value=t;motion.value=s.reduced?0:1;const u=t-event;
      const fading=u>=0&&u<duration?Math.min(1,u/.7,(duration-u)/2.8):0;
      show.value=fading*(s.reduced?.35:1);progress.value=duration===60?(u/10)%1:u/8;
      energy.value=s.lights;top.rotation.y=s.reduced?-.12:Math.sin(t*.16)*.39-.12;top.scale.setScalar(1+fading*.08*(s.reduced?1:Math.sin(t*.81)**2));}};
}
