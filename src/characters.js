import * as T from 'three/webgpu';
import {G,part,box,rod,compact} from './mesh.js';
import {ground} from './terrain.js';
import {TAU,rng,between} from './math.js';
function buildPerson(m,i,skate=false){
  const rand=rng(681+i*1432),p=new T.Group(),tone=['#ac826e','#dbc2a0','#b2927d','#787267'][i%4];
  const ms=new T.MeshStandardNodeMaterial({color:tone,roughness:.80});
  const coat=[m.wine,m.green,m.wood,m.red,m.iron][i%5],trouser=i%2?m.coal:m.wine,outer=i%2?m.wool:m.green;
  const torso=new T.Group();torso.position.y=.76;p.add(torso);
  part(torso,G.taper,coat,0,.275,0,.44,.61,.33,0,.21,0);part(torso,G.ball,coat,0,.373,0,.229,.245,.159);
  part(torso,G.ball,ms,0,.712,0,.117,.147,.111);part(torso,G.ico,ms,0,.697,.103,.035,.045,.035);
  part(torso,G.rod,m.iron,0,.803,-.012,.25,.069,.251,0,0,.09);part(torso,G.ball,outer,.002,.836,-.012,.127,.103,.123,0,.19,.13);part(torso,G.smallBall,m.ivory,.01,.940,-.023,.045);
  part(torso,G.ring,outer,0,.539,-.005,.104,.109,.151,Math.PI/2,0,0);
  part(torso,G.box,outer,.102,.399,.117,.093,.254,.043,0,0,.17);
  for(let k=0;k<4;k++)part(torso,G.smallBall,m.gold,-.022,.18+k*.075,.15,.01);
  const limbs=[];for(const d of [-1,1]){
    const arm=new T.Group();arm.position.set(d*.199,.447,0);torso.add(arm);arm.rotation.z=d*.12;
    rod(arm,coat,[0,0,0],[d*.025,-.271,.009],.081,G.taper);rod(arm,coat,[d*.026,-.229,.009],[d*.072,-.461,.054],.065,G.taper);
    part(arm,G.ball,m.wool,d*.074,-.474,.055,.065,.086,.061);
    const legs=new T.Group();legs.position.set(d*.105,.83,0);p.add(legs);
    rod(legs,trouser,[0,0,0],[0,-.40,.02],.085,G.rod);
    const ankle=new T.Group();ankle.position.set(0,-.40,.02);legs.add(ankle);
    rod(ankle,trouser,[0,0,0],[0,-.32,-.039],.068,G.rod);part(ankle,G.box,m.coal,0,-.364,.017,.154,.162,.27);if(skate){part(ankle,G.box,m.glassSilver,0,-.440,.013,.036,.049,.291);}
    limbs.push({arm,legs,ankle,d});
  }
  p.scale.setScalar(between(rand,.92,1.06));return {p,torso,limbs};
}
export function characters(w){
  const positions=[[-12,26,.17],[5,17,-.41],[21,-15,.74],[-17,-20,-1.4],[100,-104,-.33],[124,-107,1.7],[143,-115,1.6],[-82,135,2.7]];const people=[];
  const {mat:m}=w;
  for(let i=0;i<positions.length+3;i++){
    const skating=i>=positions.length,e=buildPerson(m,i,skating);let [x,z,yaw]=skating?[135,8,0]:positions[i];
    e.p.position.set(x,ground(x,z),z);e.p.rotation.y=yaw;e.x=x;e.z=z;e.yaw=yaw;e.i=i;e.skating=skating;w.dynamicGroup(e.p,130);people.push(e);
  }
  w.anim.push((dt,t,c,s)=>{
    for(const e of people){const {p,i,torso,limbs}=e;const d=Math.hypot(p.position.x-c.x,p.position.z-c.z);p.visible=!s.solitude&&d<127;if(!p.visible)continue;
      const u=t*.39+i*2.41, k=e.skating?u+i*1.5:t*.75+i;let heading=e.yaw;
      if(e.skating){const a=i*.21,rx=22-(i%3)*2.9,rz=12.1-(i%3)*1.13;
        p.position.set(135+Math.cos(k)*rx,.13,8+Math.sin(k)*rz);heading=Math.atan2(-Math.sin(k)*rx,Math.cos(k)*rz);p.rotation.z=-.12*Math.sin(k*.79);}
      else if(i>3){const x=e.x+Math.sin(u*.35)*2.21,z=e.z+Math.cos(u*.44)*1.27;p.position.set(x,ground(x,z)+.079,z);heading=e.yaw+Math.sin(u*.25)*.78;}
      else p.position.y=ground(e.x,e.z)+.096;
      p.rotation.y=heading;torso.rotation.y=Math.sin(t*.41+i)*.083;torso.rotation.z=e.skating?Math.cos(k*3)*.082:0;
      for(const {arm,legs,ankle,d} of limbs){const st=Math.sin(t*(e.skating?1.49:1.08)+i)*d;arm.rotation.z=d*(e.skating?.43+st*.21:.123);arm.rotation.x=e.skating?st*.44:i>3?st*.24:0;legs.rotation.x=e.skating?-.127+st*.20:i>3?st*.30:0;
        legs.rotation.z=e.skating?d*(.12+st*.20):d*.029;ankle.rotation.x=e.skating?.18+Math.max(0,st)*.50:i>3?Math.max(0,st)*.26:0;}
    }
  });
  const cars=[];
  for(let i=0;i<5;i++){
    const g=new T.Group();box(g,[m.wine,m.coal,m.cream][i%3],0,.59,0,1.73,.54,3.79);box(g,m.iron,0,1.08,-.132,1.52,.55,1.98);box(g,m.iron,0,1.365,-.13,1.55,.138,1.96);
    for(const d of [-1,1]){part(g,G.box,m.filament,d*.53,.63,1.91,.34,.168,.098);part(g,G.box,m.red,d*.56,.62,-1.91,.32,.157,.091);for(const s of [-1,1])part(g,G.post,m.coal,d*.88,.30,s*1.22,.62,.20,.61,0,0,Math.PI/2);}
    const car=compact(g);w.scene.add(car);cars.push(car);
  }
  w.anim.push((dt,t,cam)=>{for(let i=0;i<cars.length;i++){
    const p=cars[i],d=(t*(5.6+i*.39)+i*375)%1904, a=Math.floor(d/476),v=d%476-238;p.position.set(a===0?v:a===1?238:a===2?-v:-238,.08,a===0?-237:a===1?v:a===2?237:-v);p.rotation.y=[Math.PI/2,0,-Math.PI/2,Math.PI][a];p.visible=cam.y>24||Math.hypot(p.position.x-cam.x,p.position.z-cam.z)<90;
  }});
  return people;
}
