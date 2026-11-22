import * as T from 'three/webgpu';
import {attribute, cameraWorldMatrix, cameraPosition, positionLocal, positionWorld, positionView, uv, uniform, vec2, vec3, float, fog, texture, exp, sin, mix, smoothstep, mx_noise_float, materialAO} from 'three/tsl';
import {Grid,clamp,damp,rng,between} from './math.js';
import {ground} from './terrain.js';

const lightColor=new T.Color('#ffb167');
function skyEnvironment(){
  const w=192,h=96;const data=new Float32Array(w*h*4);
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){
    const a=i/w*Math.PI*2,y=Math.cos(j/h*Math.PI),haze=Math.exp(-Math.abs(y)*7);
    const n=(j*w+i)*4;const lamp=Math.pow(Math.max(0,Math.cos(a-1.9)),37)*Math.exp(-((y-.25)**2)*47)+.53*Math.pow(Math.max(0,Math.cos(a+1.65)),22)*Math.exp(-((y-.47)**2)*35);
    const g=.10+.085*Math.max(0,y)+.145*haze; data[n]=g*1.2+lamp*3.1;data[n+1]=g*.88+lamp*1.71;data[n+2]=g*.75+lamp*.67;data[n+3]=1;
  }
  const tex=new T.DataTexture(data,w,h,T.RGBAFormat,T.FloatType);tex.mapping=T.EquirectangularReflectionMapping;tex.colorSpace=T.LinearSRGBColorSpace;tex.needsUpdate=true;return tex;
}

export class Lighting {
  constructor(scene,density=1){
    this.scene=scene;this.practicals=[];this.glows=[];this.locations=new Grid(18);this.grid=new Grid(24);this.slots=[];this.brightness=1;this.ambiance=1;this.t=0;
    this.fogDensity=uniform(.0052);this.fogColor=uniform(new T.Color('#53414b'));this.clock=uniform(0);this.skyTime=uniform(.52);this.starBoost=uniform(1);this.glowScale=uniform(1);this.worldLight=uniform(1);
    const tall=exp(positionWorld.y.max(0).mul(-.045)).mul(.64).add(.36);
    // Approximate the integrated haze along a sloped view ray. Retain mist
    // at eye level without flattening the entire aerial garden to mauve.
    const column=mix(1,.65,smoothstep(26,154,cameraPosition.y));
    const factor=exp(positionView.z.negate().max(0).mul(this.fogDensity).mul(tall).mul(column).mul(-1)).oneMinus();
    scene.fogNode=fog(this.fogColor,factor);
    this.hemi=new T.HemisphereLight('#d4c4d2','#857565',1.34);scene.add(this.hemi);
    scene.environment=skyEnvironment();scene.environmentIntensity=.34;
    this.moon=new T.DirectionalLight('#ffe4d2',.82);this.moon.position.set(-68,97,-53);this.moon.castShadow=true;
    const sh=this.moon.shadow;Object.assign(sh.camera,{left:-55,right:55,top:55,bottom:-55,near:8,far:230});sh.mapSize.set(1024,1024);sh.bias=-.00032;sh.normalBias=.085;sh.radius=3;sh.intensity=.59;sh.autoUpdate=false;sh.needsUpdate=true;
    scene.add(this.moon,this.moon.target);this.lastShadow=new T.Vector3(1000,0,1000);
    for(let i=0;i<6;i++){const p=new T.PointLight(lightColor,0,22,2);p.position.set(0,-50,0);scene.add(p);this.slots.push({p,source:null,level:0});}
    this.makeSky();
  }
  makeSky(){
    const ge=new T.SphereGeometry(1,40,24), m=new T.MeshBasicNodeMaterial({side:T.BackSide,depthWrite:false,fog:false,name:'Procedural city sky'});
    const v=positionLocal.normalize();const h=v.y;
    const tm=this.skyTime;
    const zenith=mix(vec3(.046,.043,.069),vec3(.006,.009,.019),tm);
    const horizon=mix(vec3(.172,.083,.067),vec3(.047,.039,.053),tm);
    const sky=mix(horizon,zenith,smoothstep(-.035,.70,h).pow(.38));
    const cloud=mx_noise_float(v.mul(vec3(5.0,16.0,5.0)).add(vec3(1.9,9.1,this.clock.mul(.006)))).mul(.64)
      .add(mx_noise_float(v.mul(vec3(12,29,12)).add(5)).mul(.24)).add(mx_noise_float(v.mul(vec3(30,71,30)).add(3.5)).mul(.12));
    const wisps=smoothstep(.04,.38,cloud).mul(exp(h.sub(.12).abs().mul(-3.5))).mul(smoothstep(-.08,.07,h));
    const dir=new T.Vector3(-.525,.387,-.755).normalize();
    const moonDot=v.dot(vec3(dir.x,dir.y,dir.z)).max(0);
    const halo=moonDot.pow(185).mul(.13).add(moonDot.pow(850).mul(.32));
    const disk=smoothstep(.99974,.99981,moonDot);
    const tex=mx_noise_float(v.mul(330)).mul(.23).add(.82);
    // Below the apparent horizon the far ground blends into the same fog
    // colour as the sky. The city no longer ends at a visible rectangle.
    const start=mix(this.fogColor,sky,smoothstep(-.12,.035,h)).add(vec3(.092,.049,.038).mul(wisps)).add(vec3(1.1,.74,.49).mul(halo));
    m.colorNode=start.add(vec3(1.18,.96,.74).mul(disk).mul(tex));
    this.sky=new T.Mesh(ge,m);this.sky.scale.setScalar(1220);this.sky.frustumCulled=false;this.sky.name='Sky dome';this.sky.renderOrder=-100;this.scene.add(this.sky);
    const r=rng(655962);
    const pos=[],sizes=[];for(let i=0;i<330;i++){const h=between(r,.155,1),a=r()*Math.PI*2,d=Math.sqrt(1-h*h);pos.push(Math.cos(a)*d*1150,h*1150,Math.sin(a)*d*1150);sizes.push(i<40?between(r,.45,1):between(r,.25,.6));}
    const starGeo=new T.InstancedBufferGeometry().copy(new T.PlaneGeometry(1,1));starGeo.setAttribute('pHome',new T.InstancedBufferAttribute(new Float32Array(pos),3));starGeo.setAttribute('pScale',new T.InstancedBufferAttribute(new Float32Array(sizes),1));starGeo.instanceCount=sizes.length;
    const sm=new T.MeshBasicNodeMaterial({transparent:true,depthWrite:false,fog:false,blending:T.AdditiveBlending,name:'Winter stars'});
    const hp=attribute('pHome','vec3'),size=attribute('pScale','float');
    sm.positionNode=hp.add(cameraWorldMatrix.element(0).xyz.mul(positionLocal.x).add(cameraWorldMatrix.element(1).xyz.mul(positionLocal.y)).mul(size.mul(3.2)));
    const alpha=uv().sub(.5).length().mul(2).saturate().oneMinus().pow(2.5);
    sm.colorNode=vec3(.96,.80,.62);sm.opacityNode=alpha.mul(this.starBoost).mul(size).mul(sin(this.clock.mul(.55).add(hp.x)).mul(.21).add(.78)).mul(smoothstep(.16,.77,hp.y.div(1150)).mul(.82).add(.18));
    this.stars=new T.Mesh(starGeo,sm);this.stars.frustumCulled=false;this.stars.renderOrder=-30;this.scene.add(this.stars);
  }
  add(x,y,z,{color='#ffb470',power=30,distance=16,radius=9,glow=1,air=.67,bake=.23,kind='lamp',active=null}={}){
    const s={x,y,z, color:new T.Color(color),power,distance,radius,active,kind,bake,glow,air};
    if(power>0){this.practicals.push(s);this.grid.insert(s,x,z,0);}
    if(glow>0)this.halo(x,y,z,glow,color,air);
    if(bake>0)this.locations.insert(s,x,z,radius);
    return s;
  }
  halo(x,y,z,r,color='#ffc490',opacity=.65){if(r>0)this.glows.push([x,y,z,r,new T.Color(color),opacity]);}
  finish(mats,physics){
    const fieldSize=512,field=new Uint8Array(fieldSize*fieldSize*4);const side=512,unit=side/fieldSize;
    for(let j=0;j<fieldSize;j++)for(let i=0;i<fieldSize;i++){
      const x=(i+.5)*unit-side/2,z=(j+.5)*unit-side/2;const k=(j*fieldSize+i)*4;let r=0,g=0,b=0;
      for(const l of this.locations.at(x,z)){const d=((l.x-x)**2+(l.z-z)**2)/(l.radius*l.radius);if(d>=1)continue;const f=Math.exp(-4.5*d)*(1-d)*l.bake; r+=l.color.r*f;g+=l.color.g*f;b+=l.color.b*f;}
      // Bake the contact term into unused alpha. Keep the practical light
      // field intact and don't draw coplanar shadow decals over trail joints.
      let mask=1;
      const solids=physics.solids.at(x,z);
      if(solids.length){const h=ground(x,z);for(const o of solids){
        if(o.lo>h+.47||o.hi<h+.12||o.tag==='campfire')continue;
        const dx=x-o.x,dz=z-o.z;
        const edge=o.type===1?Math.hypot(Math.max(0,Math.abs(dx*o.c-dz*o.s)-o.w),Math.max(0,Math.abs(dx*o.s+dz*o.c)-o.d)):Math.max(0,Math.hypot(dx,dz)-o.r);
        if(edge>.94)continue;mask=Math.min(mask,1-.55*(1-edge/.94)**2);
      }}
      field[k]=Math.min(255,r*200);field[k+1]=Math.min(255,g*200);field[k+2]=Math.min(255,b*200);field[k+3]=255*mask;
    }
    this.field=new T.DataTexture(field,fieldSize,fieldSize,T.RGBAFormat);this.field.minFilter=this.field.magFilter=T.LinearFilter;this.field.needsUpdate=true;
    const fUV=positionWorld.xz.div(side).add(.5);
    const lightmap=texture(this.field,fUV),f=lightmap.rgb.mul(this.worldLight);
    const contact=mix(1,lightmap.a,exp(positionWorld.y.max(0).mul(-.06)));
    const grounded=new Set(['snow','powder','stone','sett','pavers']);
    for(const id of grounded)mats[id].aoNode=materialAO.mul(contact);
    for(const [id,k] of Object.entries({snow:.77,powder:.54,stone:.71,sett:.76,pavers:.56,snowProp:.13,leaf:.029,arborNear:.095,arborMid:.073,arborFar:.05,wood:.07,brick:.048})){mats[id].emissiveNode=f.mul(k).mul(exp(positionWorld.y.max(0).mul(-.081)).mul(.87).add(.13)).mul(grounded.has(id)?mix(1,contact,.62):1);}
    const geo=new T.InstancedBufferGeometry().copy(new T.PlaneGeometry(1,1));const ps=[],sz=[],cl=[],op=[];
    for(const [x,y,z,r,c,a] of this.glows){ps.push(x,y,z);sz.push(r);cl.push(c.r,c.g,c.b);op.push(a);}
    geo.setAttribute('glowPosition',new T.InstancedBufferAttribute(new Float32Array(ps),3));geo.setAttribute('glowRadius',new T.InstancedBufferAttribute(new Float32Array(sz),1));geo.setAttribute('glowColor',new T.InstancedBufferAttribute(new Float32Array(cl),3));geo.setAttribute('glowOpacity',new T.InstancedBufferAttribute(new Float32Array(op),1));geo.instanceCount=sz.length;
    const m=new T.MeshBasicNodeMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,fog:false,name:'Diffused practical halos'});
    const gp=attribute('glowPosition','vec3'),gr=attribute('glowRadius','float');
    m.positionNode=gp.add(cameraWorldMatrix.element(0).xyz.mul(positionLocal.x).add(cameraWorldMatrix.element(1).xyz.mul(positionLocal.y)).mul(gr.mul(2)));
    const jx=uv().sub(.5).mul(2), r2=jx.dot(jx);
    const edge=smoothstep(1,.2,r2);
    const soft=exp(r2.mul(-9)).mul(.43).add(exp(r2.mul(-3.6)).mul(.34));
    m.colorNode=attribute('glowColor','vec3').mul(1.25);
    m.opacityNode=edge.mul(soft).mul(attribute('glowOpacity','float')).mul(this.glowScale).mul(exp(positionView.z.negate().max(0).mul(-.0034)));
    const mesh=new T.Mesh(geo,m);mesh.frustumCulled=false;mesh.renderOrder=3;this.scene.add(mesh);
  }
  update(dt,pos,env,settings,tier,inside){
    this.clock.value=env.t;this.sky.position.copy(pos);this.stars.position.copy(pos);this.skyTime.value=env.night;this.fogColor.value.setRGB(env.fogRGB[0],env.fogRGB[1],env.fogRGB[2]);this.fogDensity.value=env.fog*(inside?.32:1);
    this.starBoost.value=env.star;this.brightness=damp(this.brightness,settings.lights,2,dt);this.glowScale.value=this.brightness*(settings.postBloom?1:.69);this.worldLight.value=this.brightness*.91;
    this.hemi.intensity=env.ambient*(inside?.49:1);this.moon.intensity=env.key*(inside?.58:1);
    if(this.lastShadow.distanceToSquared(pos)>19**2){const x=Math.round(pos.x/11)*11,z=Math.round(pos.z/11)*11;this.lastShadow.copy(pos);this.moon.target.position.set(x,ground(x,z),z);this.moon.position.copy(this.moon.target.position).add(new T.Vector3(-61,104,-47));this.moon.shadow.needsUpdate=true;}
    this.t-=dt;
    if(this.t<=0){this.t=.14;const ready=[];for(const s of this.grid.range(pos.x,pos.z,46)){
      const d2=(pos.x-s.x)**2+(pos.z-s.z)**2+((pos.y-s.y)*1.3)**2;
      if(d2>Math.max(17,s.distance)**2||s.active&&!s.active())continue;
      ready.push({s,rank:d2/(10+Math.sqrt(s.power))});
    }ready.sort((a,b)=>a.rank-b.rank);this.targets=ready.slice(0,tier.lights).map(v=>v.s);}
    const targets=this.targets||[];
    for(const s of this.slots){const ok=targets.includes(s.source);s.level=damp(s.level,+ok,ok?5:10,dt);
      if(!ok&&s.level<.14){const newSource=targets.find(l=>!this.slots.some(w=>w.source===l));s.source=newSource||null;s.level=0;}
      const a=s.source;if(a){s.p.position.set(a.x,a.y,a.z);s.p.color.copy(a.color);s.p.distance=a.distance;s.p.intensity=a.power*s.level*this.brightness*((a.kind==='fire'&&!settings.reduced)?(.90+.10*Math.sin(env.t*4.6)+.065*Math.sin(env.t*7.2)):1)*(a.active&&!a.active()?0:1);}else s.p.intensity=0;
    }
  }
}
