import * as T from 'three/webgpu';
import {Grid} from './math.js';

const HIT=new T.SphereGeometry(1,8,6);const hiddenMat=new T.MeshBasicMaterial({visible:false});
export class Interaction{
  constructor(){this.items=[];this.byId=new Map();this.grid=new Grid(10);this.ray=new T.Raycaster();this.tmp=new T.Vector3();this.dir=new T.Vector3();this.ndc=new T.Vector2();this.candidates=[];this.hit=null;this.acc=0;}
  add(id,label,x,y,z,{reach=2.55,radius=.55,action=()=>{},hint='互動',enabled=null,dynamic=false,...details}={}){
    const proxy=new T.Mesh(HIT,hiddenMat);proxy.position.set(x,y,z);proxy.scale.setScalar(radius);proxy.updateMatrixWorld(true);
    const a={id,label,x,y,z,reach,radius,action,hint,enabled,proxy,dynamic,...details};proxy.userData.action=a;
    this.items.push(a);this.byId.set(id,a);if(!dynamic)this.grid.insert(a,x,z,2);return a;
  }
  pick(camera,{mode='walk',mx=0,my=0,inside=null,physics}={}){
    const {x,y,z}=camera.position,fromFree=mode==='free';
    this.ndc.set(fromFree?mx:0,fromFree?my:0);this.ray.setFromCamera(this.ndc,camera);this.ray.near=.05;this.ray.far=fromFree?40:6.8;
    const near=this.grid.range(x,z,fromFree?38:6.5);this.candidates.length=0;
    let fallback=null,score=1e9;
    for(const a of near){
      if(a.enabled&&!a.enabled()||a.room&&a.room!==inside?.id)continue;
      this.tmp.set(a.x-x,a.y-y,a.z-z);const d=this.tmp.length();if(d>(fromFree?40:a.reach+.48))continue;
      const angle=this.tmp.dot(this.ray.ray.direction)/Math.max(.01,d);
      if(angle<.30)continue;
      this.candidates.push(a.proxy);
      const q=d*(1.0+(1-angle)*9.0);
      if(!fromFree&&angle>.86&&d<a.reach&&q<score){fallback=a;score=q;}
    }
    const hits=this.ray.intersectObjects(this.candidates,false),first=hits[0]?.object.userData.action;
    // Small surfaces on a larger object (a bench's plaque or paper) can be
    // aimed at on purpose, even if its broad sit proxy is closer to the eye.
    const detail=first&&hits.find(h=>{const a=h.object.userData.action;return a.detailOf===first.id&&(fromFree||h.distance<a.reach+.08);});
    let item=detail?.object.userData.action??first??fallback;
    if(item&&physics&&!fromFree&&!item.allowOccluded){const a=item;const n=Math.ceil(Math.hypot(a.x-x,a.z-z)/.29);for(let j=1;j<n-2;j++){
      const f=j/n,test=physics.blocked(x+(a.x-x)*f,z+(a.z-z)*f,y+(a.y-y)*f-.21,.065,.16);
      if(test&&test.tag!==a.id){item=null;break;}
    }}
    this.hit=item;return item;
  }
  invoke(ctx,item=this.hit){if(!item||(item.enabled&&!item.enabled()))return false; item.action(ctx,item);return true;}
}
