import * as T from 'three/webgpu';
import {clamp,damp,lerp,TAU} from './math.js';
import {ground,pondEdge} from './terrain.js';
import cfg from './data/activities.json';
const UP=new T.Vector3(0,1,0),D=new T.Vector3(),E=new T.Euler(0,0,0,'YXZ'),A=new T.Quaternion(),B=new T.Quaternion(),M=new T.Matrix4();
const POS=new T.Vector3(),TRG=new T.Vector3(),L=new T.Vector3();
const motionKeys=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight']);
const facing=(pos,look)=>A.setFromRotationMatrix(M.lookAt(pos,look,UP));
export const angleWrap=x=>((x+Math.PI)%TAU+TAU)%TAU-Math.PI;
const ease=x=>x*x*(3-2*x);
export class ParkCamera {
  constructor(camera,canvas,w,settings){
    this.camera=camera;this.canvas=canvas;this.w=w;this.physics=w.physics;this.s=settings;this.mode='lobby';this.keys=new Set;this.feet={x:0,y:ground(0,214),z:214};
    this.rx=0;this.ry=0;this.pitch=0;this.yaw=0;this.ts=null;this.vx=0;this.vz=0;this.vy=0;this.fwd=0;this.panX=0;this.panY=0;this.walked=0;this.stepAcc=0;this.cycle=0;
    this.activeShot='tree';this.setView(w.layout.opening,true);this.canvas.addEventListener('contextmenu',e=>e.preventDefault());
  }
  readAngles(){E.setFromQuaternion(this.camera.quaternion,'YXZ');this.pitch=E.x;this.yaw=E.y;}
  setMode(type){this.mode=type;this.vx=this.vz=this.vy=this.fwd=0;this.keys.clear();this.onMode?.(type);}
  lookAt(x,y,z){this.camera.lookAt(x,y,z);this.readAngles();}
  setView(shot,snap=false,secs=.91){
    const p=new T.Vector3(...shot.p),t=new T.Vector3(...shot.t),q=facing(p,t).clone();
    if(snap||this.s.reduced){this.ts=null;this.camera.position.copy(p);this.camera.quaternion.copy(q);this.camera.fov=shot.fov??this.s.fov;this.camera.updateProjectionMatrix();this.readAngles();}
    else this.motion(p,q,shot.fov??this.s.fov,secs);
    this.activeShot=shot.id||'tree';
  }
  motion(p,q,fov,duration=.7){this.ts={p0:this.camera.position.clone(),q0:this.camera.quaternion.clone(),f0:this.camera.fov,p,q:q.clone(),fov,duration:this.s.reduced?Math.min(.23,duration):duration,t:0};}
  orient(yaw,pitch){this.yaw=yaw;this.pitch=pitch;this.camera.quaternion.setFromEuler(E.set(pitch,yaw,0,'YXZ'));}
  start(skip=false){
    const [x,z]=this.w.layout.entry;const p=this.physics.safePoint(x,z);this.feet={...p};
    if(skip||this.s.reduced){this.setMode('walk');this.ts=null;this.camera.position.set(p.x,p.y+1.65,p.z);this.lookAt(0,4.65,0);this.camera.fov=this.s.fov;this.camera.updateProjectionMatrix();return;}
    this.setMode('intro');this.ts=null;this.introT=0;
    this.entryP=new T.CatmullRomCurve3([new T.Vector3(60,96,250),new T.Vector3(38,67,226),new T.Vector3(4,25,227),new T.Vector3(p.x,p.y+1.65,p.z)],false,'centripetal');
    this.entryT=new T.CatmullRomCurve3([new T.Vector3(-18,12,-77),new T.Vector3(0,12,-37),new T.Vector3(0,8,7),new T.Vector3(0,3.8,37)],false,'centripetal');
  }
  switchMode(){
    if(this.mode==='intro'){this.start(true);return;}if(this.mode==='seat'||this.mode==='ride'||this.mode==='lie')this.stand();
    if(this.mode==='free'||this.mode==='photo'){
      const p=this.camera.position;this.feet=this.physics.safePoint(p.x,p.z,p.y-1.65);const h=new T.Vector3(this.feet.x,this.feet.y+1.65,this.feet.z);
      this.setMode('walk');const q=new T.Quaternion().setFromEuler(E.set(clamp(this.pitch,-.18,.34),this.yaw,0,'YXZ'));this.motion(h,q,this.s.fov,.94);return;
    }
    this.unlock();this.ts=null;this.readAngles();this.setMode('free');
    this.motion(this.camera.position.clone().add(new T.Vector3(0,2.65,0)),this.camera.quaternion,this.s.fov,.75);
  }
  travel(x,z,look,mode=this.mode){
    this.unlock();this.ts=null;
    this.feet=this.physics.safePoint(x,z,ground(x,z));
    if(mode==='lobby')mode='walk';
    if(!['walk','free','photo'].includes(mode))mode='walk';
    this.setMode(mode);
    const {x:a,y:b,z:c}=this.feet;
    this.camera.position.set(a,b+(mode==='walk'?1.65:5.2),c);
    if(look)this.lookAt(...look);else this.orient(this.yaw,0);
    this.camera.fov=this.s.fov;this.camera.updateProjectionMatrix();this.onTravel?.();
  }
  sit(seat){
    this.seat=seat;this.exit=seat.exit;
    this.setMode('seat');this.baseYaw=0;this.basePitch=0;const p=new T.Vector3(seat.x,seat.y,seat.z),q=facing(p,new T.Vector3(...seat.look)).clone();
    E.setFromQuaternion(q,'YXZ');this.baseYaw=E.y;this.basePitch=E.x;this.motion(p,q,Math.min(58,this.s.fov),cfg.seat.transition);
  }
  lie(){
    if(this.mode==='lie'){this.stand();return true;}
    if(this.mode!=='walk')return false;
    const {x,y,z}=this.feet;const mat=this.physics.material(x,z,y);
    if(!['powder','snow','gravel'].includes(mat)||this.room())return false;
    this.seat={preset:'stars',x,y:y+.32,z};this.exit=[x,z];this.setMode('lie');this.baseYaw=this.yaw;this.basePitch=1.36;
    this.motion(new T.Vector3(x,y+.32,z),new T.Quaternion().setFromEuler(E.set(1.36,this.yaw,0,'YXZ')),64,cfg.stargaze.transition);return true;
  }
  ride(i,exit){
    const car=this.w.landmarks.carousel,part=car.mounts[i%car.mounts.length];this.riding={car,part,reset:true};this.seat={preset:'carousel'};this.exit=exit;this.setMode('ride');this.rider(0,true);
  }
  rider(dt,first=false){
    const {car,part:p}=this.riding;p.base.updateWorldMatrix(true,false);
    POS.set(0,.93+p.body.position.y,0).applyMatrix4(p.base.matrixWorld);
    const yaw=p.base.rotation.y+car.turn.rotation.y-Math.PI/2, q=B.setFromEuler(E.set(first?.041:this.pitch,yaw+(this.rideOffset||0),0,'YXZ'));
    this.baseYaw=yaw;
    if(first){this.rideOffset=0;this.pitch=.041;this.motion(POS.clone(),q,56,cfg.carousel.transition);}else{this.camera.position.lerp(POS,1-Math.exp(-9*dt));this.camera.quaternion.copy(q);this.yaw=yaw+(this.rideOffset||0);}
  }
  stand(){
    if(!['seat','ride','lie'].includes(this.mode))return;
    const prev=this.mode;
    if(this.exit){this.feet=this.physics.safePoint(this.exit[0],this.exit[1],this.camera.position.y-.84);}
    this.setMode('walk');this.readAngles();const q=new T.Quaternion().setFromEuler(E.set(prev==='lie'?-.027:clamp(this.pitch,-.3,.40),this.yaw,0,'YXZ'));
    this.motion(new T.Vector3(this.feet.x,this.feet.y+1.65,this.feet.z),q,this.s.fov,.68);this.seat=null;this.riding=null;this.onStand?.(prev,this.feet);
  }
  tour(from=0){this.unlock();this.ts=null;this.tourIdx=from;this.tourT=0;this.oldMode=this.mode;this.setMode('cinematic');this.tourSegment(true);}
  tourSegment(snap){
    const shot=this.w.layout.shots[this.tourIdx];const p=new T.Vector3(...shot.p),t=new T.Vector3(...shot.t),d=t.clone().sub(p).normalize();
    const side=new T.Vector3(-d.z,0,d.x);const len=this.tourIdx===8?.72:this.tourIdx===0?14:Math.min(4.15,p.distanceTo(t)*.093);
    this.curve=new T.CatmullRomCurve3([p,p.clone().addScaledVector(side,len*.47).addScaledVector(d,len*.31),p.clone().addScaledVector(side,len).addScaledVector(d,len*.81)],false,'centripetal');
    this.tourLook=t;this.tourTime=13.1+this.tourIdx%6*.83;this.setView(shot,true);if(!snap)this.onTravel?.();this.onShot?.(shot);
  }
  takeControl(){if(this.mode!=='cinematic')return;this.setMode('free');this.onShot?.(null);}
  photo(on=true){if(!on&&this.mode==='photo'){this.setMode(this.photoReturn==='lobby'?'lobby':'free');return;}if(this.mode==='intro')this.start(true);if(['seat','lie','ride'].includes(this.mode)){this.stand();}this.photoReturn=this.mode;this.unlock();this.ts=null;this.setMode('photo');}
  room(){const p=this.camera.position;if(this.mode==='walk')return this.physics.room(this.feet.x,this.feet.z)??null;const room=this.physics.room(p.x,p.z);return room&&p.y>=room.y-.22&&p.y<room.y+room.H+.11?room:null;}
  setKey(code,down){if(down)this.keys.add(code);else this.keys.delete(code);if(down&&motionKeys.has(code)&&['seat','lie','ride'].includes(this.mode))this.stand();}
  look(dx,dy){
    if(this.mode==='intro'||this.mode==='lobby')return;if(this.mode==='cinematic'){this.takeControl();return;}
    const s=.00236*this.s.sensitivity;
    if(this.mode==='ride'){this.rideOffset=clamp((this.rideOffset||0)-dx*s,-1.7,1.7);this.pitch=clamp(this.pitch-dy*s,-.71,.68);return;}
    let yaw=this.yaw-dx*s,pitch=this.pitch-dy*s;
    if(this.mode==='seat'||this.mode==='lie'){yaw=this.baseYaw+clamp(angleWrap(yaw-this.baseYaw),-1.68,1.68);pitch=clamp(pitch,this.mode==='lie'?.436:-.70,this.mode==='lie'?1.55:.79);}
    this.orient(yaw,clamp(pitch,-1.52,1.56));
  }
  isLocked(){return document.pointerLockElement===this.canvas;}
  lock(){if(this.mode==='walk'||this.mode==='seat'||this.mode==='lie'||this.mode==='ride'){
    if(!this.canvas.requestPointerLock)return;try{this.canvas.requestPointerLock()?.catch(()=>{this.onLockFail?.();});}catch{this.onLockFail?.();}
  }}
  unlock(){if(this.isLocked()){this.programmaticUnlock=performance.now();document.exitPointerLock?.();}}
  snapFeet(x,z,look=null,yStart){
    const f=this.physics.safePoint(x,z,yStart);this.feet={...f};this.ts=null;this.setMode('walk');this.camera.position.set(f.x,f.y+1.65,f.z);
    if(look)this.lookAt(...look);this.camera.fov=this.s.fov;this.camera.updateProjectionMatrix();
  }
  update(dt,t,paused=false){
    const camera=this.camera;
    if(paused)return;
    if(this.mode==='lobby'){return;}
    if(this.mode==='intro'){
      this.introT+=dt;const progress=clamp(this.introT/6.6,0,1),u=ease(progress);this.entryP.getPoint(u,camera.position);this.entryT.getPoint(u,TRG);camera.lookAt(TRG);
      camera.fov=lerp(53,this.s.fov,u);camera.updateProjectionMatrix();if(progress>=1){this.setMode('walk');this.readAngles();}return;
    }
    if(this.mode==='cinematic'){
      this.tourT+=dt;const t2=clamp(this.tourT/this.tourTime,0,1);this.curve.getPoint(ease(t2),camera.position);camera.lookAt(this.tourLook);this.readAngles();
      if(t2>=1){this.tourIdx=(this.tourIdx+1)%this.w.layout.shots.length;this.tourT=0;this.tourSegment(false);}return;
    }
    if(this.ts){
      const a=this.ts;a.t+=dt;const u=ease(clamp(a.t/a.duration,0,1));camera.position.lerpVectors(a.p0,a.p,u);camera.quaternion.slerpQuaternions(a.q0,a.q,u);camera.fov=lerp(a.f0,a.fov,u);camera.updateProjectionMatrix();
      if(u>=1){this.ts=null;this.readAngles();}return;
    }
    if(this.mode==='seat'||this.mode==='lie'){
      camera.position.set(this.seat.x,this.seat.y+(this.s.reduced?0:Math.sin(t*1.1)*.009),this.seat.z);return;
    }
    if(this.mode==='ride'){this.rider(dt);return;}
    const k=this.keys;
    const f=+(k.has('KeyW')||k.has('ArrowUp'))-+(k.has('KeyS')||k.has('ArrowDown'));
    const side=+(k.has('KeyD')||k.has('ArrowRight'))-+(k.has('KeyA')||k.has('ArrowLeft'));const mag=Math.hypot(f,side)||1;
    const fast=k.has('ShiftLeft')||k.has('ShiftRight');const sy=Math.sin(this.yaw),cy=Math.cos(this.yaw);
    if(this.mode==='free'||this.mode==='photo'){
      const p=camera.position,height=Math.max(0,p.y-ground(p.x,p.z)),speed=(3.9+height*.61)*(fast?2.49:1),lift=+k.has('KeyE')-+k.has('KeyQ');
      this.vx=damp(this.vx,(-sy*f+cy*side)/mag*speed,7.2,dt);this.vz=damp(this.vz,(-cy*f-sy*side)/mag*speed,7.2,dt);this.vy=damp(this.vy,lift*speed*.91,6.1,dt);
      camera.getWorldDirection(D);const zoom=this.fwd*.13;const mx=this.panX*.22,mz=this.panY*.22;this.panX-=mx;this.panY-=mz;this.fwd-=zoom;
      const xx=clamp(p.x+this.vx*dt+D.x*zoom-cy*mx,-444,444),zz=clamp(p.z+this.vz*dt+D.z*zoom+sy*mx,-444,444);const y=Math.max(this.physics.floor(xx,zz,p.y).y+1.5,Math.min(256,p.y+this.vy*dt+D.y*zoom+mz));
      const building=this.physics.blocked(xx,zz,y-.17,.41,.47);
      if(!building||(!this.physics.blocked(p.x,p.z,p.y-.17,.41,.46)&&y>24))p.set(xx,y,zz);
      else if(Math.abs(this.vy)>.35&&!this.physics.blocked(p.x,p.z,y-.17,.41,.47))p.y=y;
      return;
    }
    const foot=this.feet,x=foot.x,z=foot.z;
    const material=this.physics.material(x,z,foot.y),skate=this.isSkating?.()&&material==='ice';const speed=skate?4.05:fast?3.50:1.40;
    this.vx=damp(this.vx,(-sy*f+cy*side)*speed/mag,skate?2.1:13,dt);this.vz=damp(this.vz,(-cy*f-sy*side)*speed/mag,skate?2.1:13,dt);
    const steps=Math.ceil(dt/.033);for(let i=0;i<steps;i++)this.physics.step(foot,this.vx*dt/steps,this.vz*dt/steps);
    const distance=Math.hypot(foot.x-x,foot.z-z);this.walked+=distance;this.stepAcc+=distance;
    if(this.stepAcc>(skate?1.38:fast?.90:.68)){this.stepAcc=0;this.cycle++;this.onStep?.(material,foot,this.yaw,this.cycle,fast);}
    const bob=this.s.reduced||!this.s.bob?0:Math.sin(this.walked*(skate?2.17:9.3))*Math.min(.036, (.016+(fast?.014:0))*distance/Math.max(.001,dt));
    camera.position.x=foot.x;camera.position.z=foot.z;camera.position.y=damp(camera.position.y,foot.y+1.65+bob,19,dt);
  }
}
