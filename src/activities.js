import * as T from 'three/webgpu';
import {attribute,uv,uniform,vec3,smoothstep} from 'three/tsl';
import {G,part,rod,box} from './mesh.js';
import {rng,between,clamp,TAU} from './math.js';
import {ground} from './terrain.js';
import config from './data/activities.json';

export class Effects {
  constructor(scene,m){
    this.scene=scene;this.mat=m;this.clock=uniform(0);this.r=rng(56252);this.lifetime=135;this.footCursor=0;this.dummy=new T.Object3D();
    const c=document.createElement('canvas');c.width=64;c.height=100;const ct=c.getContext('2d');ct.fillStyle='rgba(37,25,24,.62)';ct.beginPath();ct.ellipse(32,31,21,26,.08,0,TAU);ct.ellipse(32,72,15,18,0,0,TAU);ct.fill();ct.globalCompositeOperation='destination-out';for(let i=0;i<8;i++)ct.fillRect(9,i*11+7,49,3.8);
    const ftex=new T.CanvasTexture(c);ftex.colorSpace=T.SRGBColorSpace;
    const fm=new T.MeshBasicNodeMaterial({transparent:true,depthWrite:false,alphaTest:.009,map:ftex,name:'Footsteps in compressed powder'});
    const geo=new T.PlaneGeometry(1,1);const t=new Float32Array(160);t.fill(-999);
    this.ages=new T.InstancedBufferAttribute(t,1);geo.setAttribute('stamped',this.ages);
    fm.opacityNode=smoothstep(this.lifetime,40,this.clock.sub(attribute('stamped','float'))).mul(.62);
    this.feet=new T.InstancedMesh(geo,fm,160);this.feet.frustumCulled=false;this.feet.visible=false;scene.add(this.feet);
    const pm=new T.MeshBasicNodeMaterial({color:'#dcc9b3',transparent:true,opacity:.83,depthWrite:false});
    const puff=new T.InstancedMesh(G.bulb,pm,108);puff.visible=false;puff.frustumCulled=false;scene.add(puff);this.cloud=puff;this.emitters=[];
    this.angels=new T.Group();scene.add(this.angels);this.cracks=new T.Group();scene.add(this.cracks);
  }
  imprint(foot,yaw,n,material){
    const sc=material==='ice';if(!sc&&['powder','snow','gravel'].includes(material)===false)return;
    if(sc){
      const p=new T.Group();const mt=this.iceMat??(this.iceMat=new T.MeshBasicNodeMaterial({color:'#baab9e',opacity:.48,transparent:true,depthWrite:false}));p.position.set(foot.x,Math.max(.096,foot.y+.021),foot.z);p.rotation.y=yaw;box(p,mt,n%2?.071:-.081,0,0,.018,.0013,.61);this.cracks.add(p);if(this.cracks.children.length>92)this.cracks.remove(this.cracks.children[0]);return;
    }
    const i=this.footCursor++%this.feet.count,side=n%2?1:-1,d=this.dummy;
    d.position.set(foot.x+Math.cos(yaw)*.105*side,foot.y+(material==='powder'?.054:.073),foot.z-Math.sin(yaw)*.105*side);
    d.rotation.set(-Math.PI/2,0,-yaw+side*.126);d.scale.set(.165,.28,1);d.updateMatrix();this.feet.setMatrixAt(i,d.matrix);this.feet.instanceMatrix.needsUpdate=true;this.ages.array[i]=this.clock.value;this.ages.needsUpdate=true;this.feet.visible=true;
  }
  puff(type,p,h=1){this.emitters.push({type,p:p.clone(),h,t:this.clock.value,seed:this.r()*83});if(this.emitters.length>4)this.emitters.shift();this.cloud.visible=true;}
  angel(foot){
    const g=new T.Group();g.position.set(foot.x,foot.y+.023,foot.z);
    const sm=this.angelMat??(this.angelMat=new T.MeshStandardNodeMaterial({color:'#aba1a3',roughness:.91,transparent:true,opacity:.54}));
    part(g,G.ico,sm,0,0,0,.19,.009,.66);part(g,G.ball,sm,0,0,-.61,.18,.009,.18);
    for(const d of [-1,1]){part(g,G.ball,sm,d*.32,.001,-.17,.48,.012,.26,0,d*.28);part(g,G.ico,sm,d*.14,0,.475,.196,.009,.14,0,d*.14);}
    this.angels.add(g);if(this.angels.children.length>18)this.angels.remove(this.angels.children[0]);
  }
  update(t){
    this.clock.value=t;if(!this.emitters.length)return;
    const d=this.dummy;for(let i=this.emitters.length-1;i>=0;i--)if(t-this.emitters[i].t>3.4)this.emitters.splice(i,1);
    if(!this.emitters.length){this.cloud.visible=false;return;}
    for(let i=0;i<this.cloud.count;i++){
      const e=this.emitters[i%this.emitters.length],age=t-e.t,life=clamp((age-(i%9)*.065)/3,0,1),a=i*2.399+e.seed,r=(i%11)*.09*(life+.12),snow=e.type==='snow';
      d.position.set(e.p.x+Math.cos(a)*r*(snow?4.2:1)+life*.51,e.p.y+(snow?(1-life)*(e.h+(i%7)*.40):.2+life*e.h*1.88),e.p.z+Math.sin(a)*r*(snow?3.25:1));
      d.rotation.set(age*.3,i,a);d.scale.setScalar(life===0||life>=.99?0:(.029+(i%4)*.015)*(snow?1:1.36)*(1-life*.69));d.updateMatrix();this.cloud.setMatrixAt(i,d.matrix);
    }this.cloud.instanceMatrix.needsUpdate=true;
  }
}
export class Activities {
  constructor(ctx){this.ctx=ctx;this.skates=false;this.wasIce=false;this.cfg=config;this.sw=0;this.shakeCount=0;}
  toggleSkates(item){
    this.skates=!this.skates;this.wasIce=false;if(item)item.hint=this.skates?'換回便鞋':'換上冰鞋';this.ctx.audio.chime('soft');this.ctx.ui.status(this.skates?'已換上冰鞋 · 由兩側入口進冰面':'已換回便鞋',2400);
  }
  chooseRide(from=0){this.ctx.ui.rides(i=>{
    const a=this.ctx.world.actions.byId.get('carousel-'+from);this.ctx.cam.ride(i,[a.x+(from===0?.5:-.5),a.z+.42]);this.ctx.audio.chime('soft');
  });}
  shake(tree){const {ctx}=this;const p=new T.Vector3(tree.x,tree.y+1.2,tree.z);ctx.world.effects.puff('snow',p,tree.h*.26);tree.shakeAt=ctx.env.t;ctx.world.vegetation.shake(tree);this.shakeCount++;ctx.audio.step('powder',false,true);ctx.audio.chime('knock');}
  update(){
    const {cam,world}=this.ctx;if(!this.skates||cam.mode!=='walk')return;const p=cam.feet,ice=world.physics.material(p.x,p.z,p.y)==='ice';
    if(ice)this.wasIce=true;else if(this.wasIce){this.skates=false;this.wasIce=false;const a=world.actions.byId.get('skates');if(a)a.hint='換上冰鞋';}
  }
}
