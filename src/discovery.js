import * as T from 'three/webgpu';
import layout from './data/layout.json';
import POI from './data/pois.json';
import {ground,pondEdge} from './terrain.js';
import {G,box,ball,part,rod,absorb,compact} from './mesh.js';
import {marker,lantern,lowLantern,gifts,wreath} from './props.js';
import {TAU,between,clamp,rng} from './math.js';
const SAVE='winter-wonderland-journal-v1';
export class Discovery {
  constructor(w){
    this.world=w;let s={};try{s=JSON.parse(localStorage.getItem(SAVE)||'{}');}catch{}
    this.log=new Map(s.log||[]);this.visited=new Set(s.visited||[]);this.stars=new Set(s.stars||[]);this.marks=new Set(s.marks||[]);this.once=new Set();this.tick=0;this.dirty=false;this.logCursor=0;
  }
  save(){try{localStorage.setItem(SAVE,JSON.stringify({log:[...this.log],visited:[...this.visited],stars:[...this.stars],marks:[...this.marks].slice(-8000)}));}catch{}this.dirty=false;}
  add(id,name,text,tag='發現'){if(!this.log.has(id)){this.log.set(id,{id,name,text,tag});this.dirty=true;this.save();this.ui?.refreshMap();return true;}return false;}
  read(id,name,text){this.add(id,name,text,'手札');this.ui?.reader(name,text);}
  setStar(id,ctx){if(!this.stars.has(id)){this.stars.add(id);this.add(id,'拾到一點星光','飄回日曆上的一點暖光。','微光');ctx.audio.chime('soft');if(this.stars.size===24){ctx.world.fir.event(false,ctx.worldNow());ctx.events.eve();}return true;}return false;}
  clear(){this.log.clear();this.visited.clear();this.stars.clear();this.marks.clear();this.once.clear();this.save();this.ui?.refreshMap();}
  location(x,z){let a=null,n=1;for(const p of layout.places){const d=Math.hypot(p.x-x,p.z-z);const ratio=d/p.r;if(ratio<n){n=ratio;a=p;}}return a;}
  update(dt,ctx){
    this.tick+=dt;if(this.tick<.31)return;this.tick=0;if(ctx.cam.mode!=='walk')return;
    const {x,y,z}=ctx.cam.feet;const p=this.location(x,z);if(p&&!this.visited.has(p.id)){this.visited.add(p.id);this.dirty=true;this.save();this.ui?.refreshMap();}
    const k=Math.floor((x+225)/6)+','+Math.floor((z+225)/6);if(!this.marks.has(k)){this.marks.add(k);this.dirty=true;}
    for(const v of this.world.starPositions){if(this.stars.has(v.id)||Math.hypot(x-v.x,z-v.z,y+1.4-v.y)>1.75)continue;this.setStar(v.id,ctx);v.g.visible=false;}
  }
}
function chooseSite(w,x,z,shift=0){
  for(let i=0;i<16;i++){const a=i*2.4,d=i===0?0:.39+i*.34;const xx=x+Math.sin(a)*d,zz=z+Math.cos(a)*d;if(w.physics.blocked(xx,zz,ground(xx,zz),.42)||pondEdge(xx,zz)<1.06)continue;return [xx,zz];}
  return [x,z];
}
const storyDoors=[['薄荷小門','門後有剛出爐的薄荷餅乾。'],['風的郵局','小住客正在替一封信貼上雪花郵票。'],['毛衣工作室','一件裝得下兩隻松鼠的毛衣。'],['借來的蠟燭','有人把一小束火光借給了窗。'],['慢鐘工房','這裡的鐘面根本沒有指針。'],['千層樹皮廚房','晚餐是三粒栗子和一碟雪。'],['山雀書房','架上的書只讀到雪停那一頁。'],['松果桌旁','兩張小椅子，一整晚的話。'],['夜雪包裝店','窗裡有一個大得過不了門的禮物。'],['楓糖廚房','一點楓糖和一小撮鹽，留給冷天。'],['燈籠圖書室','有人在壁爐邊讀一本沒有結局的書。'],['星星小旅店','門後的小床比松果還窄。']];
export function discoveries(w){
  const {scene,batch:o,mat:m,light,actions}=w;const rnd=rng(92904);w.starPositions=[];
  for(const [i,[x0,z0]] of POI.stars.entries()){
    const [x,z]=chooseSite(w,x0,z0);const y=ground(x,z)+.88+(i%3)*.17,id=`star-${String(i+1).padStart(2,'0')}`;
    const g=new T.Group();g.position.set(x,y,z);part(g,G.tinyStar,m.amber,0,0,0,.17,.17,.30);w.dynamicGroup(g,43);
    w.anim.push((dt,t)=>{if(w.discovery?.stars.has(id)){g.visible=false;return;}const sc=1+Math.sin(t*.64+i)*.08;g.scale.setScalar(sc);g.rotation.y=t*.30+i;});
    actions.add(id,'遺落的小星星',x,y,z,{radius:.24,reach:2.3,hint:'觸碰微光',enabled:()=>!w.discovery.stars.has(id),action:ctx=>ctx.discovery.setStar(id,ctx)});
    w.decor.add(52,x,y,z,.33);w.starPositions.push({id,x,y,z,g});w.pois.push({id,type:'star',x,y,z});
  }
  for(const [i,[x0,z0]] of POI.doors.entries()){
    const [x,z]=chooseSite(w,x0,z0);const t=[...w.vegetation.grid.range(x,z,7)].filter(t=>Math.hypot(t.x-x,t.z-z)<7).sort((a,b)=>Math.hypot(a.x-x,a.z-z)-Math.hypot(b.x-x,b.z-z))[0];
    const yaw=t?Math.atan2(x-t.x,z-t.z):i*.66, xx=t?t.x+Math.sin(yaw)*.60:x,zz=t?t.z+Math.cos(yaw)*.60:z, y=ground(xx,zz),id=`elf-${i+1}`;
    const g=new T.Group();g.position.set(xx,y,zz);g.rotation.y=yaw;
    const jamb=new T.Group();g.add(jamb);box(jamb,m.wood,0,.241,-.005,.52,.47,.125);part(jamb,G.ball,m.wood,0,.454,-.01,.263,.195,.062);
    box(jamb,m.gold,0,.039,.080,.535,.072,.084);part(jamb,G.rock,m.snowProp,0,.635,-.033,.253,.071,.097);
    for(const d of [-1,1])rod(jamb,m.bronze,[d*.25,.07,.065],[d*.25,.446,.065],.023,G.fineRod);
    for(let j=0;j<10;j++){const a=(j/9)*Math.PI;part(jamb,G.smallBall,m.gold,Math.cos(a)*.25,.456+Math.sin(a)*.17,.066,.039,.031,.040);}
    const opened=new T.Group();opened.position.set(-.222,.277,.060);g.add(opened);box(opened,m.green,.222,0,0,.426,.434,.052);part(opened,G.ball,m.green,.221,.204,-.004,.213,.156,.037);
    box(opened,m.plank,.224,-.015,.028,.420,.082,.018);part(opened,G.smallBall,m.glassGold,.352,.035,.046,.028);
    const interior=new T.Group();interior.position.set(0,0,.027);g.add(interior);box(interior,m.dim,0,.274,.014,.420,.429,.024);part(interior,G.ball,m.dim,0,.48,.002,.210,.156,.027);
    box(interior,m.wood,0,.119,.069,.328,.041,.089);for(let j=0;j<4;j++)box(interior,j%3===0?m.red:m.green,-.103+j*.071,.14+j*.023,.091,.057,.039+j*.035,.048);
    part(interior,G.tinyStar,m.candle,.020,.334,.049,.071,.071,.053);interior.visible=false;
    w.dynamicGroup(g,28);let ticks=-99;
    w.anim.push((dt,t)=>{if(!g.visible)return;const active=t-ticks<22;opened.rotation.y+=( (active?-1.44:0)-opened.rotation.y)*clamp(dt*7,0,1);interior.visible=opened.rotation.y<-.51;});
    const idName=storyDoors[i];const ax=xx+Math.sin(yaw)*.17,az=zz+Math.cos(yaw)*.17;
    actions.add(id,idName[0],ax,y+.318,az,{reach:2.55,radius:.40,hint:'敲敲門',allowOccluded:true,action:ctx=>{ticks=ctx.now();ctx.audio.chime('knock');ctx.discovery.add(id,...idName);}});
    w.decor.add(41,ax,y+.35,az,.67,'tree');w.pois.push({id,type:'elf',x:xx,y,z:zz});
  }
  for(const [i,[x0,z0]] of POI.story.entries()){
    const [x,z]=chooseSite(w,x0,z0),id=`story-${i+1}`;marker(w,x,z,'守燈人的雪夜',`冬夜童話 · ${String(i+1).padStart(2,'0')}`,i<6?0:Math.PI/2,id,false,w.content.story[i]);w.pois.push({id,type:'story',x,z});
  }
  for(const s of POI.secrets){
    const [x,z]=chooseSite(w,s.x,s.z);const y=ground(x,z);let h=.45,type=s.type;
    if(type==='mushrooms'){for(let i=0;i<9;i++){
      const a=i/9*TAU,h1=between(rnd,.19,.38),xx=x+.63*Math.cos(a),zz=z+.62*Math.sin(a);
      part(o,G.rod,m.ivory,xx,y+h1/2,zz,.088,h1,.087);part(o,G.ball,i%3?m.amber:m.dim,xx,y+h1,zz,h1*.67,h1*.31,h1*.65);
    }light.halo(x,y+.30,z,.69,'#ffba71',.37);}
    if(type==='music'||type==='bell'){
      part(o,G.taper,m.wood,x,y+.30,z,.71,.61,.66);part(o,G.rod,m.plank,x,y+.61,z,.651,.072,.60);
      part(o,G.cap,m.gold,x,y+.81,z,.39,.38,.38);part(o,G.smallBall,m.glassGold,x,y+.645,z+.052,.092);h=.79;
    }
    if(type==='well'){
      part(o,G.disk,m.limestone,x,y+.43,z,1.66,.87,1.66);part(o,G.disk,m.coal,x,y+.889,z,1.24,.040,1.24);
      part(o,G.ring,m.snowProp,x,y+.909,z,.754,.754,.777,-Math.PI/2);part(o,G.rod,m.iron,x,y+.916,z,.106,.026,.105);
      for(const d of [-1,1])rod(o,m.wood,[x+d*.75,y+.71,z],[x+d*.75,y+2.15,z],.059);rod(o,m.wood,[x-.76,y+2.05,z],[x+.76,y+2.05,z],.067);
      lantern(o,m,x,y+1.54,z,.35,'brass');h=1.09;light.halo(x,y+1.53,z,.53,'#ffbe80',.46);
    }
    if(type==='globe'){
      part(o,G.rod,m.wood,x,y+.49,z,.65,1.01,.66);part(o,G.rod,m.gold,x,y+1.021,z,.75,.158,.74);
      part(o,G.ball,m.windowGlass,x,y+1.353,z,.378,.393,.372);box(o,m.red,x,y+1.24,z,.26,.243,.23);
      part(o,G.cone,m.snowProp,x,y+1.416,z,.371,.22,.32,0,.33,0);part(o,G.bulb,m.amber,x,y+1.29,z+.12,.065);h=1.37;
    }
    if(type==='sleigh'){
      for(const d of [-1,1]){rod(o,m.iron,[x+d*.48,y+.116,z-.88],[x+d*.48,y+.116,z+.97],.052);rod(o,m.gold,[x+d*.48,y+.116,z+.97],[x+d*.48,y+.38,z+1.16],.043);}
      for(let i=0;i<8;i++)box(o,m.red,x+(i/7-.5)*.835,y+.313,z,.107,.103,1.93);
      gifts(o,m,x,y+.38,z-.18,rnd,.655);h=.72;
    }
    if(type==='mitten'){part(o,G.ball,m.wool,x,y+.153,z,.179,.074,.225,0,.61,0);part(o,G.ball,m.red,x+.16,y+.154,z-.021,.079,.067,.109);box(o,m.ivory,x-.09,y+.145,z+.147,.218,.065,.063,.49);h=.29;}
    if(type==='lantern'){lowLantern(w,x,z,'brass',{post:.42,s:.70,power:13,bake:.31});h=.94;}
    const decor=({sleigh:21,mitten:24,globe:51,music:29})[type];if(decor!==undefined)w.decor.add(decor,x,y+h,z,type==='sleigh'?1.0:.43);
    const action=ctx=>{
      ctx.discovery.read(s.id,s.name,s.text);ctx.audio.chime('soft');
      if(type==='music')ctx.audio.melody('carousel',true);if(type==='globe')ctx.events.clearSnow();
    };actions.add(s.id,s.name,x,y+h,z,{radius:.58,reach:2.52,hint:'仔細看看',allowOccluded:true,action});w.pois.push({id:s.id,type:'secret',x,y,z});
  }
  const wx=103,wz=120,wy=ground(wx,wz),nearest=w.vegetation.list.slice().sort((a,b)=>Math.hypot(a.x-wx,a.z-wz)-Math.hypot(b.x-wx,b.z-wz)).find(t=>t.type<6 && Math.hypot(t.x-wx,t.z-wz)>3.3);
  const tx=nearest?.x??wx,tz=nearest?.z??wz,ty=ground(tx,tz);
  for(let j=0;j<36;j++){
    const a=rnd()*TAU,rad=between(rnd,.72,2.04),h=between(rnd,1.26,3.72),x=tx+Math.cos(a)*rad,z=tz+Math.sin(a)*rad;
    part(o,G.box,j%3?m.wool:m.ivory,x,ty+h,z,.10,.23,.035,0,a,j*.14);rod(o,m.gold,[x,ty+h+.05,z],[x,ty+h+.29,z],.012,G.fineRod);
    if(j%3===0)part(o,G.bulb,m.filament,x,ty+h+.21,z,.049,.064,.052);
  }
  w.decor.add(40,tx,ty+2.21,tz,2.03,'tree');
  actions.add('wish-tree','許願樹',tx,ty+1.32,tz,{reach:2.7,radius:.69,hint:'繫一張祝福',allowOccluded:true,action:ctx=>ctx.ui.wish(true)});
  // A gently interactable spruce next to the trail, plus several optional local trees.
  for(const [i,spot] of [[0,124],[-79,-76],[113,121],[-153,127],[31,46]].entries()){
    const [x,z]=spot;const trees=[...w.vegetation.grid.range(x,z,20)].filter(t=>t.type<=2&&Math.hypot(x-t.x,z-t.z)<22).sort((a,b)=>Math.hypot(x-a.x,z-a.z)-Math.hypot(x-b.x,z-b.z)); const t=trees[0];if(!t)continue;
    const y=t.y+1.37;actions.add('shake-'+i,'抱著雪的雲杉',t.x,y,t.z,{reach:2.7,radius:1.04,hint:'輕搖樹幹',allowOccluded:true,action:(ctx)=>ctx.activities.shake(t)});
  }
}
