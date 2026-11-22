import * as T from 'three/webgpu';
import {attribute, cameraWorldMatrix, cameraPosition, positionLocal, positionWorld, positionView, reflector, uv, uniform, vec2, vec3, mix, exp, smoothstep, sin, cos, fract, float, texture, mx_noise_float, screenUV} from 'three/tsl';
import layout from './data/layout.json';
import {ground,pondEdge} from './terrain.js';
import {terrainTiles,terrainTileMeters} from './city-ground.js';
import {rng,between,clamp,damp,lerp,noise2,smooth,TAU} from './math.js';
import {G,part,box,rod} from './mesh.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

const NIGHT={dusk:[.11,1.35,.83,[.070,.053,.059]],night:[.63,1.04,.63,[.040,.034,.049]],late:[.97,.85,.51,[.030,.026,.045]]};
const WEATHERS={none:[0,.0038,1.35],flurry:[.31,.0054,.95],steady:[.61,.0074,.7],heavy:[1,.0118,.57],clear:[0,.0032,2.25]};
export class Atmosphere{
  constructor(s){this.t=0;this.night=NIGHT[s.time]?.[0]??.63;this.ambient=1.3;this.key=.84;this.fogRGB=[.082,.055,.077];this.fog=.0054;this.snow=.31;this.star=1;this.wind=.35;}
  update(dt,s,lying){
    this.t+=dt;
    let n=NIGHT[s.time]??NIGHT.night;let a=WEATHERS[s.snow]??WEATHERS.flurry;
    if(s.timeFlow){const v=((this.t/2160+.22)%1)*3,i=Math.floor(v),u=smooth(0,1,v-i);const x=Object.values(NIGHT),j=(i+1)%3;n=[lerp(x[i][0],x[j][0],u),lerp(x[i][1],x[j][1],u),lerp(x[i][2],x[j][2],u),x[i][3].map((k,k2)=>lerp(k,x[j][3][k2],u))];}
    if(s.weatherFlow){const x=[WEATHERS.flurry,WEATHERS.steady,WEATHERS.heavy,WEATHERS.clear],v=this.t/170%4,i=Math.floor(v),u=smooth(0,1,v-i);a=x[i].map((k,k2)=>lerp(k,x[(i+1)%4][k2],u));}
    const w=dt===0?1:1-Math.exp(-dt*1.04);
    [this.night,this.ambient,this.key]=[lerp(this.night,n[0],w),lerp(this.ambient,n[1],w),lerp(this.key,n[2],w)];
    this.snow=lerp(this.snow,a[0],w);this.fog=lerp(this.fog,a[1],w);this.star=lerp(this.star,a[2]*(lying?2.8:1),w);this.wind=lerp(this.wind,s.wind,w);
    for(let i=0;i<3;i++)this.fogRGB[i]=lerp(this.fogRGB[i],n[3][i]+a[0]*[.015,.010,.008][i],w);
  }
}
function addGeom(scene,m,xyz,uvs,index,colors,cast=false){
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(xyz,3));if(uvs)g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));if(colors)g.setAttribute('color',new T.Float32BufferAttribute(colors,3));if(index)g.setIndex(index);g.computeVertexNormals();
  const mesh=new T.Mesh(g,m);mesh.castShadow=cast;mesh.receiveShadow=true;scene.add(mesh);return mesh;
}
export function buildFloor(w){
  const {scene,mat:m,paths,light,physics,batch}=w;
  const plantGrid=w.vegetation?.grid;
  // Keep the 2.36 m snow tessellation, but avoid paying a submission per
  // patch and per short trail segment. Material and light attributes stay
  // identical; only the culling granularity changes.
  const floorTiles=new Map();
  const tile={add(mesh){
    const g=mesh.geometry;g.computeBoundingBox();const b=g.boundingBox;
    const key=[mesh.material.id,Math.floor((b.min.x+b.max.x)/208),Math.floor((b.min.z+b.max.z)/208)].join('/');
    const set=floorTiles.get(key)??[];set.push(mesh);floorTiles.set(key,set);
  }};
  const cells=terrainTiles,l=terrainTileMeters,d=22;
  for(let j=0;j<cells;j++)for(let i=0;i<cells;i++){
    const vs=[],uvs=[],cs=[],ix=[];const ox=(i-cells/2)*l,oz=(j-cells/2)*l;
    for(let v=0;v<=d;v++)for(let u=0;u<=d;u++){
      const x=ox+u/d*l,z=oz+v/d*l;const coarse=noise2(x*.038,z*.038);
      vs.push(x,ground(x,z)-.022,z);uvs.push(x*.84,z*.84);
      let ao=0;
      if(plantGrid){for(const tree of plantGrid.at(x,z)){const dd=(x-tree.x)**2+(z-tree.z)**2;if(dd<15)ao=Math.max(ao,(1-Math.sqrt(dd/15))*.49);}}
      const c=clamp(.86+coarse*.20+.08*noise2(x*.65,z*.7)-ao,.43,1.10);
      cs.push(c*1.008,c*.956,c*.975);
      if(v&&u){const b=v*(d+1)+u;ix.push(b-d-2,b-1,b-d-1,b-1,b,b-d-1);}
    }
    addGeom(tile,m.snow,vs,uvs,ix,cs);
  }
  for(const p of paths){
    const right=[],left=[],ry=[];const N=p.points.length;
    for(let i=0;i<N;i++){
      const a=p.points[Math.max(0,i-1)],b=p.points[Math.min(N-1,i+1)],at=p.points[i];const L=Math.hypot(b.z-a.z,b.x-a.x),nx=-(b.z-a.z)/L,nz=(b.x-a.x)/L;
      left.push([at.x+nx*p.width/2,at.z+nz*p.width/2]);right.push([at.x-nx*p.width/2,at.z-nz*p.width/2]);ry.push([nx,nz]);
    }
    const isMain=p.id==='main',det=p.kind==='stone'||p.kind==='brick';
    const tt=p.kind==='brick'?m.pavers:p.kind==='stone'?m.stone:m.powder;
    const cN=isMain?14:6;
    for(let start=0;start<N-1;start+=22){
      const vs=[],u=[],ix=[],cs=[];const end=Math.min(N-1,start+22);
      for(let i=start;i<=end;i++)for(let j=0;j<=cN;j++){
        const f=j/cN,x=lerp(left[i][0],right[i][0],f),z=lerp(left[i][1],right[i][1],f);const b=vs.length/3;
        vs.push(x,ground(x,z)+.058+(isMain?.008:.003)*Math.cos(i+j),z);u.push(f*p.width/(p.kind==='stone'?3.45:2.72),i*1.85/(p.kind==='stone'?3.45:2.72));
        let col=.87+.20*noise2(x*.153,z*.164);if(j===0||j===cN)col*=p.kind==='gravel'?.93:1.10;const v=det?col:col*(p.kind==='gravel'?.62:.81);
        cs.push(v,v*.96,v*.96);
        if(i>start&&j>0)ix.push(b-cN-2,b-cN-1,b-1,b-cN-1,b,b-1);
      }
      addGeom(tile,tt,vs,u,ix,cs).material.side=T.DoubleSide;
    }
    if(isMain){
      for(const [idx,pts] of [left,right].entries()){
        const v=[],u=[],c=[],ix=[];
        for(let i=0;i<N;i++)for(let a=0;a<3;a++){
          const dir=idx===0?1:-1,fx=dir*ry[i][0],fz=dir*ry[i][1];const bump=noise2(i*.39,idx*17);const t=[-.14,.24,.8+bump*.74][a];const [px,pz]=pts[i];const x=px+t*fx,z=pz+t*fz;const h=[.07,.11+bump*.21,-.012][a];v.push(x,ground(x,z)+h,z);u.push(x*.6,z*.6);c.push(.92,.88,.89);const q=v.length/3-1;if(i&&a)ix.push(q-4,q-3,q-1,q-3,q,q-1);
        }
        addGeom(scene,m.snow,v,u,ix,c).material.side=T.DoubleSide;
      }
    }
  }
  for(const a of floorTiles.values()){
    const o=a[0];if(a.length>1){const pieces=a.map(m=>m.geometry);o.geometry=mergeGeometries(pieces);for(const g of pieces)g.dispose();}
    o.name='Landscape tile • '+o.material.name;o.matrixAutoUpdate=false;scene.add(o);
  }
  radialFloor(scene,m.sett,0,0,0,43,43,.084,10,96,true);
  for(const r of [11.2,11.65,27.2,40.7,42.0])ringFloor(scene,m.stone,0,0,r-.19,r+.19,.105);
  radialFloor(scene,m.pavers,119,-106,0,32,20,.103,10,64,true);
  radialFloor(scene,m.sett,0,-144,-Math.PI/4,27,25,.106,8,48,true);
  radialFloor(scene,m.sett,0,209,0,14,14,.106,7,56,true);
  radialFloor(scene,m.pavers,66,78,0,16,16,.096,7,64,true);
  // Snowy stone edging around the tree island.
  for(let i=0;i<96;i++){const a=TAU*i/96,x=Math.cos(a)*10.65,z=Math.sin(a)*10.65;
    box(batch,m.limestone,x,.19,z,.74,.37,.44,Math.PI/2-a, i%5===0?'#c4b6a8':null);
    part(batch,G.rock,m.snowProp,x,.35,z,.43,.11,.25,0,Math.PI/2-a,0,'#dad3c8');}
  radialFloor(scene,m.snow,0,0,0,10.50,10.50,.24,4,56,true);
}
export function radialFloor(scene,mat,cx,cz,rot,rx,rz,dy,rings=8,segments=64,follow=true){
  const v=[],ix=[],u=[],c=[];for(let r=0;r<=rings;r++)for(let i=0;i<=segments;i++){
    const t=TAU*i/segments, dx=Math.cos(t)*rx*r/rings,dz=Math.sin(t)*rz*r/rings;
    const x=cx+dx*Math.cos(rot)-dz*Math.sin(rot),z=cz+dx*Math.sin(rot)+dz*Math.cos(rot);const y=(follow?ground(x,z):0)+dy;
    v.push(x,y,z);u.push(x*.28,z*.28);const k=.87+.20*noise2(x*.143,z*.15);c.push(k,k*.97,k*.95);
    if(r&&i){const a=v.length/3-1;ix.push(a-segments-2,a-1,a-segments-1,a-1,a,a-segments-1);}
  }const mesh=addGeom(scene,mat,v,u,ix,c);return mesh;
}
function ringFloor(scene,m,x,z,r1,r2,y){const v=[],u=[],ix=[],c=[];for(let j=0;j<=96;j++){const a=j/96*TAU;for(const r of [r1,r2]){const tx=x+Math.cos(a)*r,tz=z+Math.sin(a)*r;v.push(tx,ground(tx,tz)+y,tz);u.push(tx*.3,tz*.3);c.push(.83,.74,.70);}if(j){const k=j*2;ix.push(k-2,k,k+1,k-2,k+1,k-1);}}m.side=T.DoubleSide;return addGeom(scene,m,v,u,ix,c);}
function pondGeometry(){const {x,z,rx,rz}=layout.pond;const vs=[x,layout.seaLevel,z],ix=[],uvs=[.5,.5];for(let i=0;i<=112;i++){const a=TAU*i/112,w=(1+.067*Math.sin(a*3+.2)+.046*Math.cos(a*5))*.987;vs.push(x+rx*Math.cos(a)*w,layout.seaLevel,z+rz*Math.sin(a)*w);uvs.push(.5+.5*Math.cos(a),.5+.5*Math.sin(a));if(i)ix.push(0,i+1,i);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vs,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setIndex(ix);g.computeVertexNormals();return g;}
function surface(scene,geo,clock,y,ice=false){
  const mirror=reflector({resolutionScale:ice?.30:.46,bounces:false,samples:0});
  const baseNode=mirror.reflector,full=baseNode.getVirtualCamera.bind(baseNode);
  baseNode.getVirtualCamera=camera=>{const vc=full(camera);vc.layers.set(ice?3:2);return vc;};
  mirror.target.rotation.x=-Math.PI/2;mirror.target.position.y=y+.002;
  const m=new T.MeshBasicNodeMaterial({name:ice?'Ice - etched mirror':'Pond - planar reflection'});
  const w=positionWorld.xz;const t=clock.mul(ice?.08:.64);
  const wob=vec2(sin(w.x.mul(.9).add(w.y.mul(.68)).add(t.mul(1.25))).add(sin(w.y.mul(1.1).sub(w.x.mul(.33)).sub(t)).mul(.47)), cos(w.y.mul(1.18).add(w.x.mul(.53)).sub(t)).add(sin(w.x.mul(1.61).add(t.mul(1.77))).mul(.61)));
  const distort=wob.mul(vec2(ice?.0017:.0023,ice?.0013:.0041));
  const map=mirror.sample(screenUV.flipX().add(distort).clamp(.003,.997)).rgb;
  const fres=cameraPosition.sub(positionWorld).normalize().y.abs().oneMinus().pow(2.6);
  const tiny=sin(w.x.mul(4.47).add(w.y.mul(15.7)).add(sin(w.x.mul(.91)).mul(2.4))).mul(.5).add(.5).pow(ice?34:13);
  const rime=mx_noise_float(w.mul(.52)).mul(.28).add(.66);
  const base=ice?vec3(.113,.105,.108).mul(rime).add(vec3(.019,.014,.010).mul(tiny).mul(mx_noise_float(w.mul(.32)).mul(.69).add(.40))):vec3(.021,.028,.027).mul(rime).add(vec3(.002,.0018,.00145).mul(tiny));
  m.colorNode=base.add(map.mul(fres.mul(ice?.65:1.14).add(ice?.22:.24)).mul(ice?vec3(.91,.81,.75):vec3(.91,.86,.79)));
  const surrogate=new T.MeshBasicNodeMaterial({name:ice?'Ice – sky fallback':'Pond – sky fallback'});
  surrogate.colorNode=base.add(mix(vec3(.041,.036,.048),vec3(.112,.079,.056),fres).mul(ice?.65:.69));
  const mesh=new T.Mesh(geo,surrogate);mesh.add(mirror.target);scene.add(mesh);
  return {mesh,mirror,m,surrogate,fillFrom(field){
    // A cheap Fresnel reflection of the same ground-space practical field
    // used for snow lighting. Low ice never starts a second forward pass.
    const dir=positionWorld.sub(cameraPosition).normalize().xz;
    const shore=texture(field,w.add(dir.mul(fres.mul(19).add(3))).div(512).add(.5)).rgb;
    surrogate.colorNode=surrogate.colorNode.add(shore.mul(fres.mul(.66).add(.21)).mul(.82));
  }};
}
export function waters(w){
  const r=rng(layout.seed+432);const {scene,batch,mat,light}=w;const clock=uniform(0);
  const pond=surface(scene,pondGeometry(),clock,layout.seaLevel);
  const ri=layout.rink,iv=[],iu=[],ii=[];
  iv.push(ri.x,.08,ri.z);iu.push(.5,.5);for(let i=0;i<=100;i++){const a=TAU*i/100;iv.push(ri.x+ri.rx*Math.cos(a),.08,ri.z+ri.rz*Math.sin(a));iu.push(.5+Math.cos(a)/2,.5+Math.sin(a)/2);if(i)ii.push(0,i+1,i);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(iv,3));g.setAttribute('uv',new T.Float32BufferAttribute(iu,2));g.setIndex(ii);g.computeVertexNormals();const ice=surface(scene,g,clock,.08,true);
  const edgeMaterial=mat.ice.clone();edgeMaterial.name='Frosted shore ice';edgeMaterial.color.set('#b0a8a0');edgeMaterial.roughness=.72;edgeMaterial.metalness=.24;
  const shelfShapes=Array.from({length:4},(_,k)=>{
    const S=14,rngShape=rng(8751+k*513),radii=Array.from({length:S},()=>between(rngShape,.74,1.14));
    const h=Array.from({length:S},()=>between(rngShape,-.11,.14)),vs=[],tex=[],ix=[];
    for(const [j,[d,y]] of [[.84,-.43],[1,-.07],[.93,.23],[.54,.39],[.001,.46]].entries())for(let i=0;i<=S;i++){
      const a=i/S*TAU,L=radii[i%S]*d,x=Math.cos(a)*L,z=Math.sin(a)*L;
      vs.push(x,y+h[i%S]*d,z);tex.push(.5+x*.49,.5+z*.49);
      if(j&&i){const a=vs.length/3-1,b=a-S-1;ix.push(b-1,a-1,b,b,a-1,a);}
    }
    const m=new T.BufferGeometry();m.setIndex(ix);m.setAttribute('position',new T.Float32BufferAttribute(vs,3));m.setAttribute('uv',new T.Float32BufferAttribute(tex,2));m.computeVertexNormals();return m;
  });
  for(let i=0;i<185;i++){
    const a=r()*TAU,{x,z,rx,rz}=layout.pond,f=1+.067*Math.sin(a*3+.2)+.046*Math.cos(a*5),rr=between(r,.886,1.033)*f;
    const xx=x+Math.cos(a)*rx*rr,zz=z+Math.sin(a)*rz*rr;const gy=ground(xx,zz);if(gy>-.6)continue;
    part(batch,shelfShapes[i%4],gy>layout.seaLevel?mat.snowProp:edgeMaterial,xx,Math.max(gy,layout.seaLevel+.024),zz,between(r,.35,2.05),between(r,.025,.08),between(r,.38,1.15),0,-a,0,between(r,.65,1)>.81?'#c9bdab':null);
  }
  return {pond,ice,finish(field){ice.fillFrom(field);},update(env,tier,p){clock.value=env.t;
    const low=tier.id==='low';pond.mirror.reflector.resolutionScale=low?.30:.46;ice.mirror.reflector.resolutionScale=.32;
    pond.mesh.material=p.y<32&&Math.hypot(p.x-layout.pond.x,p.z-layout.pond.z)<86?pond.m:pond.surrogate;
    ice.mesh.material=!low&&p.y<24&&Math.hypot(p.x-ri.x,p.z-ri.z)<47?ice.m:ice.surrogate;
  }};
}
export function snowfall(scene,lighting){
  const g=new T.InstancedBufferGeometry().copy(new T.PlaneGeometry(1,1));const n=50000,r=rng(11462),seeds=new Float32Array(n*4);for(let i=0;i<seeds.length;i++)seeds[i]=r();
  g.setAttribute('snowSeed',new T.InstancedBufferAttribute(seeds,4));g.instanceCount=6000;
  const m=new T.MeshBasicNodeMaterial({transparent:true,depthWrite:false,fog:false,name:'GPU drift snow'});
  const clk=uniform(0),level=uniform(.34),wind=uniform(.35),covered=uniform(0);const seed=attribute('snowSeed','vec4');
  const layer=smoothstep(.35,.88,seed.w),span=layer.mul(120).add(22),ht=layer.mul(31).add(14);
  const v=clk.mul(seed.z.mul(.83).add(.37));const cx=cameraPosition.x.div(span),cy=cameraPosition.y.div(ht),cz=cameraPosition.z.div(span);
  const wx=fract(seed.x.sub(cx).add(v.mul(wind.mul(.023).add(.003))).add(sin(v.mul(1.13).add(seed.y.mul(59))).mul(.028))).sub(.5).mul(span).add(cameraPosition.x);
  const wy=fract(seed.y.sub(cy).sub(v.mul(.042))).sub(.48).mul(ht).add(cameraPosition.y);
  const wz=fract(seed.z.sub(cz).add(v.mul(wind.mul(.008).add(.002))).add(cos(v.mul(.77).add(seed.x.mul(43))).mul(.022))).sub(.5).mul(span).add(cameraPosition.z);
  const at=vec3(wx,wy,wz),size=seed.z.mul(seed.x.mul(.85).add(.15)).mul(layer.mul(.107).add(.108)).add(layer.mul(.047).add(.024));
  const spin=sin(v.mul(.47).add(seed.w.mul(30))).mul(.51);
  m.positionNode=at.add(cameraWorldMatrix.element(0).xyz.mul(positionLocal.x.add(positionLocal.y.mul(spin))).add(cameraWorldMatrix.element(1).xyz.mul(positionLocal.y)).mul(size));
  const alpha=uv().sub(.5).mul(2).length().saturate().oneMinus().pow(1.2);
  const pLight=texture(lighting.field,positionWorld.xz.div(512).add(.5)).rgb.r.mul(exp(positionWorld.y.max(0).mul(-.13)));
  m.colorNode=mix(vec3(.55,.48,.53),vec3(1.31,.91,.58),pLight.mul(2).clamp(0,1));
  const distance=positionWorld.distance(cameraPosition);
  m.opacityNode=alpha.mul(smoothstep(seed.z.mul(.8),seed.z.mul(.8).add(.16),level)).mul(smoothstep(.20,1.8,distance)).mul(exp(distance.mul(-.016)))
    .mul(mix(float(.30),float(.83),pLight.mul(2.4).clamp(0,1))).mul(smoothstep(covered.mul(6.3),covered.mul(7.6).add(.1),distance));
  const mesh=new T.Mesh(g,m);mesh.frustumCulled=false;mesh.renderOrder=8;scene.add(mesh);
  return {update(env,tier,inRoom){clk.value=env.t;level.value=env.snow;wind.value=env.wind;covered.value=inRoom?1:0;g.instanceCount=tier.snow;mesh.visible=env.snow>.002;}};
}
export class Vapors {
  constructor(scene){this.scene=scene;this.sources=[];this.clock=uniform(0);this.r=rng(662138);}
  add(x,y,z,type='smoke',size=1,n=8){for(let i=0;i<n;i++)this.sources.push([x,y,z,this.r(),type==='steam'?1:type==='spark'?2:0,size,this.r()]);}
  finish(){
    const g=new T.InstancedBufferGeometry().copy(new T.PlaneGeometry(1,1)),p=[],s=[];for(const e of this.sources){p.push(...e.slice(0,3));s.push(...e.slice(3));}
    g.setAttribute('vPos',new T.InstancedBufferAttribute(new Float32Array(p),3));g.setAttribute('vSeed',new T.InstancedBufferAttribute(new Float32Array(s),4));g.instanceCount=this.sources.length;
    const m=new T.MeshBasicNodeMaterial({transparent:true,depthWrite:false,name:'Hearth smoke, steam, embers'});
    const point=attribute('vPos','vec3'),ss=attribute('vSeed','vec4'),spark=smoothstep(1.45,1.95,ss.y),steam=smoothstep(.55,.95,ss.y);
    const phase=fract(ss.x.add(this.clock.mul(mix(float(.11),float(.23),steam)).mul(ss.w.mul(.27).add(.83))));
    const mixy=mix(float(4.2),float(1.25),steam);const off=vec3(phase.mul(ss.w.sub(.27)).mul(.65).add(sin(phase.mul(6).add(ss.x.mul(20))).mul(phase).mul(.38)),phase.mul(mixy).mul(.87),phase.mul(ss.w.sub(.7)).mul(.68));
    const sz=mix(phase.mul(.99).add(.18),float(.078),spark).mul(ss.z);
    m.positionNode=point.add(off.mul(ss.z)).add(cameraWorldMatrix.element(0).xyz.mul(positionLocal.x).add(cameraWorldMatrix.element(1).xyz.mul(positionLocal.y)).mul(sz));
    const a=uv().sub(.5).mul(2).length().saturate().oneMinus().pow(2);
    m.opacityNode=a.mul(smoothstep(0,.12,phase)).mul(smoothstep(1,.20,phase)).mul(steam.mul(.17).add(.19).add(spark.mul(.28)));
    m.colorNode=mix(vec3(.43,.35,.32),vec3(2.90,.92,.20),spark);
    const mesh=new T.Mesh(g,m);mesh.frustumCulled=false;mesh.renderOrder=5;this.scene.add(mesh);
  }
  update(t){this.clock.value=t;}
}

export function reflectionLayers(w){
  w.scene.updateMatrixWorld(true);const v=new T.Vector3();
  w.scene.traverse(o=>{
    if(o.isPointLight)return;
    if(o.isLight||['Sky dome','The Grand Fir','The solstice star'].includes(o.name)) {o.layers.enable(2);o.layers.enable(3);if(o.name==='The solstice star')o.traverse(x=>{x.layers.enable(2);x.layers.enable(3);});return;}
    if(!o.isMesh||!o.layers.isEnabled(0)||o.userData.craftLocal||o===w.waters.pond.mesh||o===w.waters.ice.mesh||o.name.includes('LOD')||o.material?.name?.includes('stars')||o.material?.name?.includes('snow')&&o.material?.transparent||o.material?.name?.includes('Hearth'))return;
    let r=0;
    const g=o.geometry;
    if(o.isInstancedMesh&&o.boundingSphere){v.copy(o.boundingSphere.center).applyMatrix4(o.matrixWorld);r=o.boundingSphere.radius;}
    else{if(!g.boundingSphere)g.computeBoundingSphere();if(!g.boundingSphere)return;v.copy(g.boundingSphere.center).applyMatrix4(o.matrixWorld);r=g.boundingSphere.radius*o.matrixWorld.getMaxScaleOnAxis();}
    if(!Number.isFinite(r)||r>96)return;
    if(Math.hypot(v.x+115,v.z-102)-r*.66<79||o.name.includes('fir bulbs'))o.layers.enable(2);
    if(Math.hypot(v.x-135,v.z-8)-r*.66<47)o.layers.enable(3);
  });
}
