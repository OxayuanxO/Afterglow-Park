import * as T from 'three/webgpu';
import layout from './data/layout.json';
import {clamp,smooth,lerp,Grid,distSegment} from './math.js';
export const pondEdge=(x,z)=>{const p=layout.pond;const a=Math.atan2((z-p.z)/p.rz,(x-p.x)/p.rx);return Math.hypot((x-p.x)/p.rx,(z-p.z)/p.rz)/(1+.067*Math.sin(a*3+.2)+.046*Math.cos(a*5));};
const gauss=(x,z,cx,cz,rx,rz)=>Math.exp(-(((x-cx)/rx)**2+((z-cz)/rz)**2));
export function ground(x,z){
  let y=.60*Math.sin(.037*x+.2)*Math.cos(.027*z)+.26*Math.sin(z*.061-x*.06)+.19*Math.sin(z*.097+x*.122);
  y+=11.8*gauss(x,z,-147,-133,37,35)+3.8*gauss(x,z,-180,-68,20,29)+3.3*gauss(x,z,116,175,32,27)+2.6*gauss(x,z,172,-61,30,30);
  y*=smooth(37,58,Math.hypot(x,z))*smooth(8,18,Math.abs(x))* (1-.99*gauss(x,z,135,8,33,24));
  // Flatten the promenade only south of the plaza, not its entire meridian.
  if(z<40){const flat=smooth(38,60,Math.hypot(x,z));const unscaled=.60*Math.sin(.037*x+.2)*Math.cos(.027*z)+.26*Math.sin(z*.061-x*.06)+.19*Math.sin(z*.097+x*.122); y+=unscaled*(1-smooth(8,18,Math.abs(x)))*flat;}
  y+= -.24*(1-smooth(210,229,Math.max(Math.abs(x),Math.abs(z))));
  y=lerp(y,-3.6,1-smooth(.87,1.11,pondEdge(x,z)));
  for(const c of layout.cabins){const d=Math.hypot(x-c.x,z-c.z);if(d<10)y=lerp(c.id==='holly'?-.16:c.id==='santa'?-.19:.02,y,smooth(6.5,9.9,d));}
  const ice=layout.rink,edge=Math.hypot((x-ice.x)/ice.rx,(z-ice.z)/ice.rz);
  if(edge<1.27)y=lerp(.028,y,smooth(.97,1.27,edge));
  return y;
}
export function buildPaths(){
  const pathGrid=new Grid(14);
  const paths=layout.paths.map(p=>{
    const curve=new T.CatmullRomCurve3(p.points.map(([x,z])=>new T.Vector3(x,0,z)),false,'centripetal');
    const points=curve.getSpacedPoints(Math.ceil(curve.getLength()/1.85));
    for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];pathGrid.insert({a,b,p},(a.x+b.x)/2,(a.z+b.z)/2,p.width/2+6.4);}
    return {...p,points,curve};
  });
  function pathAt(x,z){let best=Infinity,kind='powder',d=Infinity;for(const {a,b,p} of pathGrid.at(x,z)){const dd=distSegment(x,z,a.x,a.z,b.x,b.z);const edge=dd-p.width/2;if(edge<best){best=edge;kind=p.kind;d=dd;}}return {edge:best,kind,d};}
  return {paths,pathAt};
}
export class Physics {
  constructor(pathAt){this.pathAt=pathAt;this.solids=new Grid(7);this.surfaces=new Grid(9);this.rooms=[];this.rad=.30;}
  cylinder(x,z,r,lo=ground(x,z),hi=lo+2,tag=''){return this.solids.insert({x,z,r,lo,hi,tag,type:0},x,z,r+1);}
  box(x,z,w,d,lo,hi,yaw=0,tag=''){return this.solids.insert({x,z,w:w/2,d:d/2,lo,hi,c:Math.cos(yaw),s:Math.sin(yaw),tag,type:1},x,z,Math.hypot(w,d)/2+1);}
  deck(ax,az,bx,bz,w,start,end,kind='wood'){
    const len=Math.hypot(bx-ax,bz-az);const s={ax,az,bx,bz,w,start,end,len,kind,dx:(bx-ax)/len,dz:(bz-az)/len};
    // Register by segment so long decks do not fill a large square of the grid.
    for(let i=0;i<=Math.ceil(len/6);i++){const t=i/Math.ceil(len/6);this.surfaces.insert(s,lerp(ax,bx,t),lerp(az,bz,t),w/2+4);}
    return s;
  }
  floor(x,z,prev=ground(x,z),step=.56){
    let y=ground(x,z), deck=null;
    for(const s of this.surfaces.at(x,z)){const dx=x-s.ax,dz=z-s.az;const t=dx*s.dx+dz*s.dz;if(t<-.23||t>s.len+.23||Math.abs(dx*s.dz-dz*s.dx)>s.w*.5+.10)continue;
      const h=lerp(s.start,s.end,clamp(t/s.len,0,1));if(h>=y-.12 && h<=prev+step && (!deck||h>y)){y=h;deck=s;}
    }return {y,deck};
  }
  room(x,z){return this.rooms.find(c=>{const dx=x-c.x,dz=z-c.z;return Math.abs(dx*c.cs-dz*c.sn)<c.w*.5&&Math.abs(dx*c.sn+dz*c.cs)<c.d*.5;});}
  blocked(x,z,y,r=this.rad,height=1.55){
    for(const o of this.solids.at(x,z)){
      if(o.disabled||y+height<=o.lo+.015||y+.20>=o.hi)continue;
      const dx=x-o.x,dz=z-o.z;
      if(o.type===0){if(dx*dx+dz*dz<(r+o.r)**2)return o;}
      else{const lx=Math.abs(dx*o.c-dz*o.s),lz=Math.abs(dx*o.s+dz*o.c);if(lx<=o.w+r&&lz<=o.d+r&&Math.hypot(Math.max(0,lx-o.w),Math.max(0,lz-o.d))<r)return o;}
    }return null;
  }
  step(p,dx,dz){
    const check=(x,z)=>{
      if(Math.max(Math.abs(x),Math.abs(z))>228)return null;
      const f=this.floor(x,z,p.y);
      if((!f.deck&&pondEdge(x,z)<.984)||this.blocked(x,z,f.y))return null;
      const delta=f.y-p.y;
      if(delta>.54||delta<-.62)return null;
      return f;
    };
    let f=check(p.x+dx,p.z+dz);
    if(f){p.x+=dx;p.y=f.y;p.z+=dz;return f;}
    f=check(p.x+dx,p.z);if(f&&Math.abs(dx)>.00001){p.x+=dx;p.y=f.y;}
    const g=check(p.x,p.z+dz);if(g&&Math.abs(dz)>.00001){p.z+=dz;p.y=g.y;}
    return g||f;
  }
  safePoint(x,z,fromY=ground(x,z)){
    for(let i=0;i<20;i++){const a=i*2.39996,d=i===0?0:.95+.64*i;const sx=clamp(x+Math.sin(a)*d,-221,221),sz=clamp(z+Math.cos(a)*d,-221,221);const f=this.floor(sx,sz,fromY); if((f.deck||pondEdge(sx,sz)>1.005)&&!this.blocked(sx,sz,f.y))return {x:sx,y:f.y,z:sz};}
    return {x:0,y:ground(0,213),z:213};
  }
  material(x,z,y){const f=this.floor(x,z,y);if(f.deck)return f.deck.kind;if(this.room(x,z))return 'wood';const r=layout.rink;if(((x-r.x)/r.rx)**2+((z-r.z)/r.rz)**2<.93)return 'ice';if(Math.hypot(x,z)<43)return 'stone';return this.pathAt(x,z).edge<0?this.pathAt(x,z).kind:'powder';}
}
