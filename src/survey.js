import {Grid,clamp,hash2,TAU} from './math.js';
import {ground,pondEdge} from './terrain.js';
import catalog from './data/catalog.json';

// Model anchors are registered where the geometry is actually placed. A site
// sample only counts when its readable silhouette is near and a view ray is
// not blocked by terrain, a wall, a tree trunk or another solid.
const typeNames=catalog.map(row=>row[0]);
function interval(o,a,b,max){
  let lo=0,hi=max;
  const clip=(v,d,min,max)=>{if(Math.abs(d)<.00001)return v>=min&&v<=max;const s=(min-v)/d,t=(max-v)/d;lo=Math.max(lo,Math.min(s,t));hi=Math.min(hi,Math.max(s,t));return lo<=hi;};
  if(!clip(a.y,b.y-a.y,o.lo,o.hi))return false;
  const x=a.x-o.x,z=a.z-o.z,dx=b.x-a.x,dz=b.z-a.z;
  if(o.type===1)return clip(x*o.c-z*o.s,dx*o.c-dz*o.s,-o.w,o.w)&&clip(x*o.s+z*o.c,dx*o.s+dz*o.c,-o.d,o.d);
  const q=dx*dx+dz*dz,t=clamp(-(x*dx+z*dz)/(q||1),lo,hi);
  return (x+t*dx)**2+(z+t*dz)**2<o.r**2;
}
export class Survey{
  constructor(w){this.w=w;this.points=[];this.moving=[];this.grid=new Grid(16);}
  add(type,x,y,z,size=.43,tag=null){
    if(!Number.isFinite(x+y+z+size)||!typeNames[type])throw Error('Invalid Christmas asset anchor '+type);
    const o={type,x,y,z,size,tag,index:this.points.length};this.points.push(o);this.grid.insert(o,x,z);return o;
  }
  motion(type,object,yOffset,size){
    const o={type,index:this.points.length,size,object,yOffset};this.points.push(o);this.moving.push(o);return o;
  }
  *near(eye){
    yield* this.grid.range(eye.x,eye.z,20);
    for(const p of this.moving){if(!p.object.visible)continue;const v=p.object.position;yield {type:p.type,index:p.index,x:v.x,y:v.y+p.yOffset,z:v.z,size:p.size};}
  }
  catalogue(){return [...new Set(this.points.map(p=>p.type))].sort((a,b)=>a-b).map(i=>[i,typeNames[i]]);}
  instances(eye,forward=null,cosine=-1){
    const hits=[];
    for(const a of this.near(eye)){
      const x=a.x-eye.x,y=a.y-eye.y,z=a.z-eye.z,d=Math.hypot(x,y,z);
      if(d>20||a.size<d*.0125||forward&&x*forward[0]+y*forward[1]+z*forward[2]<d*cosine)continue;
      if(this.ray(eye,a))hits.push([a.index,a.type]);
    }
    return hits;
  }
  examples(){
    const near={};
    for(const a of this.points){
      const list=(near[a.type]??=[]);if(list.length>=4)continue;
      const p=a.object?.position??a;
      if(list.some(o=>Math.hypot(o.x-p.x,o.z-p.z)<22))continue;
      list.push({x:+p.x.toFixed(2),y:+((a.yOffset??0)+p.y).toFixed(2),z:+p.z.toFixed(2),moving:!!a.object});
    }
    return near;
  }

  ray(a,b){
    const dx=b.x-a.x,dz=b.z-a.z,dy=b.y-a.y,len=Math.hypot(dx,dy,dz);if(len<.22)return true;
    const last=Math.max(.08,1-Math.min(.28,(.08+(b.size??0)*.25)/len));
    for(const o of this.w.physics.solids.range((a.x+b.x)*.5,(a.z+b.z)*.5,Math.hypot(dx,dz)*.5+.8)){
      if(o.disabled||o.tag===b.tag&&Math.hypot(o.x-b.x,o.z-b.z)<2.6)continue;
      if(interval(o,a,b,last))return false;
    }
    const n=Math.ceil(len/1.9);for(let i=1;i<n;i++){const f=i/n;if(ground(a.x+dx*f,a.z+dz*f)>a.y+dy*f+.07)return false;}
    return true;
  }
  visible(eye,stop=Infinity,maxType=Infinity){
    const types=new Map();for(const p of this.near(eye)){
      if(p.type>maxType||types.has(p.type))continue;
      const d=Math.hypot(p.x-eye.x,p.y-eye.y,p.z-eye.z);if(d>20||p.size<d*.0125)continue;
      if(this.ray(eye,p)){types.set(p.type,p);if(types.size>=stop)break;}
    }return types;
  }
  probes(step=7,phase=[.5,.5]){
    const {w}=this,flat=[],keys=new Set();
    const add=(x,z,kind,y=ground(x,z))=>{
      const k=`${Math.round(x*2)}:${Math.round(z*2)}:${Math.round(y*2)}`;if(keys.has(k))return;
      if(kind!=='seat'&&((kind!=='deck'&&pondEdge(x,z)<1.014)||w.physics.blocked(x,z,y,.32)))return;
      keys.add(k);flat.push({x,y:y+1.65,z,kind});
    };
    for(const p of w.paths)for(let j=0;j<p.points.length;j+=Math.max(1,Math.floor(step*.64/1.85)))add(p.points[j].x,p.points[j].z,'path');
    for(const q of w.quiet)add(q.x,q.z,'seat',q.y-1.65);
    for(const s of w.surveyDecks??[]){const n=Math.max(1,Math.ceil(Math.hypot(s.bx-s.ax,s.bz-s.az)/(step*.59)));
      for(let j=0;j<=n;j++){const t=j/n;add(s.ax+(s.bx-s.ax)*t,s.az+(s.bz-s.az)*t,'deck',s.by(t));}
    }
    const k=(w.layout.size-6)*.5;
    for(let x=-k+step*phase[0];x<k;x+=step)for(let z=-k+step*phase[1];z<k;z+=step)add(x,z,'ground');
    for(const room of w.cabins)if(room.enter){for(const d of [0,.22,-.18,.33]){const [x,y,z]=room.world(0,.09,room.d*d);add(x,z,'cabin',y);}}
    return flat;
  }
  report(step=7,phase){
    const probes=this.probes(step,phase),types=new Set(this.points.map(p=>p.type));const groups={},miss=[],regions=this.w.layout.places.map(p=>({...p,placed:new Set(),visible:new Set(),samples:0,passed:0}));
    for(const entry of this.points){const site=entry.object?entry.object.position:entry;for(const r of regions)if(Math.hypot(site.x-r.x,site.z-r.z)<=r.r)r.placed.add(entry.type);}
    for(const q of probes){const seen=this.visible(q),ok=seen.size>=3;const a=(groups[q.kind]??={total:0,pass:0,min:Infinity});a.total++;a.pass+=+ok;a.min=Math.min(a.min,seen.size);
      if(!ok)miss.push([+q.x.toFixed(2),+q.y.toFixed(2),+q.z.toFixed(2),q.kind,[...seen.keys()].map(i=>typeNames[i])]);
      for(const r of regions)if(Math.hypot(q.x-r.x,q.z-r.z)<=r.r){r.samples++;r.passed+=+ok;for(const type of seen.keys())r.visible.add(type);}
    }
    return {meters:20,step,method:'Registered 3D asset anchors, 3D length, minimum apparent extent, terrain and capsule-collider ray occlusion; 360° turn at each tested point, not one FOV',n:this.points.length,registered:types.size,niches:this.niches??0,shelves:this.shelved??0,trailMarkers:this.marked??0,phase:phase??[.5,.5],total:probes.length,pass:probes.length-miss.length,groups,miss,
      regions:regions.map(({id,name,r,samples,passed,placed,visible})=>({id,name,r,samples,passed,placed:[...placed].map(i=>typeNames[i]).sort(),seen:[...visible].map(i=>typeNames[i]).sort()}))};
  }
  // A second pass handles ground-level blind spots between the coarse lattice
  // positions. Shelves are attached to existing trunks, not added as blockers.
  retainSightlines(place){
    const {w}=this,used=new Grid(14);let n=0;
    for(const q of this.probes(5.3)){
      if(q.kind!=='path'&&q.kind!=='ground'||this.visible(q,3).size>=3)continue;
      const candidates=[...w.vegetation.grid.range(q.x,q.z,12)].filter(t=>{const d=Math.hypot(t.x-q.x,t.z-q.z);return d>1.9&&d<12.6;}).sort((a,b)=>Math.hypot(a.x-q.x,a.z-q.z)-Math.hypot(b.x-q.x,b.z-q.z));
      for(const t of candidates){
        const yaw=Math.atan2(q.x-t.x,q.z-t.z),margin=.31+Math.min(.74,t.h*.032),x=t.x+Math.sin(yaw)*margin,z=t.z+Math.cos(yaw)*margin;
        if(w.pathAt(x,z).edge<.85||w.layout.quiet.some(p=>Math.hypot(x-p.x,z-p.z)<6.3)||[...used.range(x,z,3.8)].some(p=>Math.hypot(x-p.x,z-p.z)<2.6))continue;
        const y=Math.max(t.y+.79,ground(x,z)+.54,q.y-.51);if(!this.ray(q,{x,y:y+.36,z,size:.51,tag:'tree'}))continue;
        place(t,x,y,z,yaw,n);used.insert({x,z},x,z);n++;break;
      }
    }
    this.shelved=n;
  }
  // Reserve some views where the wide vignettes or trunk shelves do not fit.
  // The ground marker is lower than a bollard and always clear of the cleared
  // walk line, quiet seats, steep banks and existing user interactions.
  markEdges(place){
    const {w}=this,used=new Grid(12);let n=0;
    const phaseSets=[[4.15,[.17,.67]],[4.45,[.83,.19]],[3.85,[.78,.43]],[5.20,[.52,.49]],[6,[.50,.50]],[3.68,[.61,.33]],[3.97,[.21,.88]]];
    for(const [step,phase] of phaseSets)for(const q of this.probes(step,phase)){
      if(q.kind!=='ground'&&q.kind!=='path'||this.visible(q,3).size>=3)continue;
      const rot=hash2(q.x*31,q.z*15)*TAU;
      for(let i=0;i<56;i++){
        const a=i*2.399963+rot,r=[3.7,5.3,7.1,9.4,12,15.4,2.65,2.04][i%8],x=q.x+Math.sin(a)*r,z=q.z+Math.cos(a)*r,y=ground(x,z);
        if(Math.max(Math.abs(x),Math.abs(z))>223||w.pathAt(x,z).edge<1||pondEdge(x,z)<1.055||Math.hypot(x,z)<15)continue;
        const ri=w.layout.rink;if(Math.hypot((x-ri.x)/(ri.rx+2),(z-ri.z)/(ri.rz+2))<1)continue;
        if(w.layout.quiet.some(p=>Math.hypot(x-p.x,z-p.z)<6.7)||[...w.actions.grid.range(x,z,2.2)].some(p=>Math.hypot(x-p.x,z-p.z)<2.4))continue;
        if(Math.abs(y-ground(x+.75,z+.75))>.32||w.physics.blocked(x,z,y,.88)||[...used.range(x,z,2.8)].some(p=>Math.hypot(x-p.x,z-p.z)<2.55))continue;
        if(!this.ray(q,{x,y:y+.91,z,size:.52})||!this.ray(q,{x,y:y+.50,z,size:.39}))continue;
        place(x,y,z,Math.atan2(q.x-x,q.z-z),n);used.insert({x,z},x,z);n++;
        if(this.visible(q,3).size>=3)break;
      }
    }
    this.marked=n;
  }
  placeMissing(place){
    // Never place compulsory checkpoints; these are unmarked environmental
    // arrangements. Try a small object beside the sightline, not on it.
    const step=this.w.layout.deckDressing.grid,seenAt=(p)=>this.visible(p,3,72).size;
    const probes=this.probes(step),near=[],other=[];
    for(const q of probes){if(q.kind==='cabin'||q.kind==='deck'||q.kind==='seat')continue;(q.kind==='ground'?other:near).push(q);}
    other.sort((a,b)=>hash2(a.x*21,a.z*21)-hash2(b.x*21,b.z*21));
    const used=new Grid(10);
    const {w}=this;
    let count=0;
    for(const q of [...near,...other]){
      if(count>=w.layout.deckDressing.limit)break;
      if(seenAt(q)>=3)continue;
      const rot=hash2(q.x*13,q.z*57)*TAU;
      for(let j=0;j<36;j++){
        const a=j*2.399963+rot,d=[5.2,7.9,10.7,13.9][j%4],x=q.x+Math.sin(a)*d,z=q.z+Math.cos(a)*d;
        if(Math.max(Math.abs(x),Math.abs(z))>221||w.pathAt(x,z).edge<1.35||pondEdge(x,z)<1.08)continue;
        if(w.layout.quiet.some(s=>Math.hypot(x-s.x,z-s.z)<8.2)||[...w.actions.grid.range(x,z,3)].some(s=>Math.hypot(s.x-x,s.z-z)<2.7))continue;
        if(w.layout.cabins.some(c=>Math.hypot(c.x-x,c.z-z)<Math.max(c.w,c.d)*.5+2.8))continue;
        if(Math.hypot(x,z)<17.0||Math.hypot((x-w.layout.rink.x)/(w.layout.rink.rx+1),(z-w.layout.rink.z)/(w.layout.rink.rz+1))<1.02)continue;
        const y=ground(x,z);if(w.physics.blocked(x,z,y,1.04)||[...used.range(x,z,4.0)].some(s=>Math.hypot(s.x-x,s.z-z)<4.6))continue;
        if(Math.abs(y-ground(x+.7,z-.6))>.45||!this.ray(q,{x,y:y+1.05,z,size:.31}))continue;
        const r=w.layout.places.map(v=>[v,Math.hypot(x-v.x,z-v.z)]).sort((a,b)=>a[1]-b[1])[0];
        const yaw=Math.atan2(q.x-x,q.z-z);
        place(x,y,z,yaw,r[1]<r[0].r+19?r[0].id:'woods',count);
        used.insert({x,z},x,z,4.3);count++;if(seenAt(q)>=3)break;
        if(j>5)break;
      }
    }
    this.niches=count;
  }
}
