import * as T from 'three/webgpu';
import layout from './data/layout.json';
import {ground} from './terrain.js';
import {cityGround} from './city-ground.js';
import {TAU,between,pick,rng,clamp,lerp,noise2} from './math.js';
import {G,box,part,line,rod,ball,absorb,compact,signTexture,bevelBox} from './mesh.js';
import {arch,lantern,wreath,swag,festoon,rail,shrub,candle,gifts,candy,marker,lowLantern,lamp,urn} from './props.js';
import {makeTreeAsset} from './vegetation.js';
import {festiveTray,candleArch,merchantsTray} from './seasonal.js';

const incl=(g,x,y,z)=>{const a=new T.Vector3(x,y,z).applyAxisAngle(new T.Vector3(0,1,0),g.rotation.y).add(g.position);return [a.x,a.y,a.z];};
export const locate=incl;
const cShade=(x)=>new T.Color(x);
function gable(w,h,d){
  const sh=new T.Shape();sh.moveTo(-w/2,0);sh.lineTo(w/2,0);sh.lineTo(.11*w,h);sh.closePath();
  const g=new T.ExtrudeGeometry(sh,{depth:d,bevelEnabled:false});g.translate(0,0,-d/2);const p=g.attributes.position;
  const uv=g.attributes.uv;for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)*.45,p.getY(i)*.48);return g;
}
function roofs(o,m,w,d,eave,rise,style='burgundy',seed=0){
  const tw=w+.98,dd=d+.9,rid=w*.108,random=rng(seed+947);
  const snow=m.snowProp;
  const base=style==='olive'?m.green:style==='charcoal'?m.coal:style==='glass'?m.iron:m.roof;
  for(const side of [-1,1]){
    const fin=side*tw/2,R=Math.abs(fin-rid);const sag=.15+(side>0?.14:0);
    const rr=Math.hypot(R,rise+sag),angle=Math.atan2(-side*(rise+sag),R);
    const x=(fin+rid)/2,y=eave+(rise-sag)/2;
    if(style!=='glass'){
      part(o,G.box,base,x,y,0,rr,.22,dd,0,0,angle,null,true);
      for(let j=0;j<12;j++){const t=(j+.42)/12;const xx=lerp(rid,fin,t),yy=lerp(eave+rise,eave-sag,t);rod(o,j%2?m.roof:m.wood,[xx,yy+.04,-dd*.502],[xx,yy+.04,dd*.502],.044,G.rod);}
      const v=[],u=[],idx=[],n=16,cols=12;
      for(let j=0;j<=cols;j++)for(let i=0;i<=n;i++){
        let t=j/cols, z=lerp(-dd*.512,dd*.512,i/n);
        if(j===cols)t-=.050+noise2(i*.24,seed*.2)*.059;else if(j>0)t+=(noise2(i*.48,j*.79)-.5)*.032;
        const xx=lerp(rid,fin,t),yy=lerp(eave+rise,eave-sag,t)+.18+(noise2(i*.48,j*.63)-.3)*.105;
        v.push(xx,yy,z);u.push(xx*.64,z*.64);
        if(j&&i){const b=v.length/3-1;const el=side===1?[b-n-2,b-1,b-n-1,b-1,b,b-n-1]:[b-n-2,b-n-1,b-1,b-1,b-n-1,b];idx.push(...el);}
      }
      const geom=new T.BufferGeometry();geom.setAttribute('position',new T.Float32BufferAttribute(v,3));geom.setAttribute('uv',new T.Float32BufferAttribute(u,2));geom.setIndex(idx);geom.computeVertexNormals();if(geom.attributes.normal.getY(n+3)<0){for(let i=0;i<idx.length;i+=3)[idx[i],idx[i+1]]=[idx[i+1],idx[i]];geom.setIndex(idx);geom.computeVertexNormals();}part(o,geom,snow,0,0,0,1,1,1,0,0,0,null,true);
      for(let j=0;j<15;j++){const z=between(random,-dd*.48,dd*.48),sz=between(random,.04,.15);if(random()<.67)part(o,G.cone,m.iceglass,fin-side*.038,eave-sag-.13-sz,z,.09,sz*3.1,.083,0,0,Math.PI);}
      // front and back fascia, eave and gutter.
      for(const zz of [-dd*.50,dd*.50]){rod(o,m.wood,[rid,eave+rise-.075,zz],[fin,eave-sag-.075,zz],.135,G.rod,null,true);rod(o,m.ivory,[rid,eave+rise+.017,zz*1.009],[fin,eave-sag+.017,zz*1.009],.042,G.rod);}
      rod(o,m.wood,[fin,eave-sag,-dd/2],[fin,eave-sag,dd/2],.125,G.rod);
    }else{
      part(o,G.box,m.windowGlass,x,y,0,rr,.055,dd,0,0,angle);for(let j=0;j<=10;j++){const zz=dd*(j/10-.5);rod(o,m.green,[rid,eave+rise,zz],[fin,eave-sag,zz],.049,G.rod);}
      for(let j=0;j<=4;j++){const t=j/4;rod(o,m.green,[lerp(rid,fin,t),lerp(eave+rise,eave-sag,t),-dd/2],[lerp(rid,fin,t),lerp(eave+rise,eave-sag,t),dd/2],.046,G.rod);}
      for(let j=0;j<8;j++)part(o,G.rock,m.snowProp,fin-side*.06,eave+.07,dd*(j/7-.5),.32,.12,.72,0,.22,.16);
    }
  }
  rod(o,m.roof,[rid,eave+rise+.121,-dd*.509],[rid,eave+rise+.121,dd*.509],.133,G.rod);
  for(let i=0;i<9;i++)part(o,G.ico,m.snowProp,rid,eave+rise+.221,dd*(-.46+i*.114),.24,.105,dd*.091,0,i*.66,0);
}
function flatWindow(out,m,x,y,z,w,h,yaw,frame,glowing=true,arched=false,back=null){
  const g=new T.Group();g.position.set(x,y,z);g.rotation.y=yaw;out.add(g);
  const radius=arched?.38*w:0;
  const fill=glowing?m.dim:m.windowGlass;
  box(g,fill,0,0,.018,w,h,.035);if(back)box(back,glowing?m.dim:m.amber,0,0,-.012,w,h,.042);
  for(const d of [-1,1]){box(g,frame,d*w*.506,0,.04,.097,h+.12,.147);box(g,frame,0,d*h*.51,.051,w+.12,.146,.16);}
  for(const a of [-1,1])box(g,m.wood,a*w*.247,0,.084,.041,h,.074);
  for(const a of [-1,1])box(g,frame,0,a*h*.181,.079,w,.042,.074);
  if(glowing){
    for(let i=0;i<3;i++)part(g,G.box,m.red,(-.415+i*.415)*w,0,.054,.06*w,h,.025,0,0,0);
    for(const d of [-1,1])part(g,G.box,frame,d*w*.596,0,.068,.136,h*.93,.08,0,d*.20,0);
  }
  box(g,m.wood,0,-h*.54,.102,w+.26,.10,.27);part(g,G.box,m.snowProp,0,-h*.49-.039,.179,w+.23,.051,.161,0,0,0);
  if(arched){
    const pts=[];for(let i=0;i<=17;i++){const a=i/17*Math.PI;pts.push([Math.cos(a)*(w/2+.055),h/2+Math.sin(a)*radius,.054]);}
    line(g,frame,pts,.069,G.rod);
    part(g,G.ball,fill,0,h/2-.033,.015,w*.503,radius*.92,.028);
    for(const a of [-1,1])rod(g,frame,[0,h/2,.067],[a*w*.35,h*.50+radius*.73,.067],.018);
  }
  return g;
}
function logPanel(out,m,x,y,z,w,h,yaw){
  const c=Math.cos(yaw),s=Math.sin(yaw),n=Math.ceil(h/.29);for(let j=0;j<n;j++){
    const yy=y-h/2+(j+.5)*h/n;rod(out,m.wood,[x-w*.5*c,yy,z+w*.5*s],[x+w*.5*c,yy,z-w*.5*s],h/n*.54,G.taper, j%3===0?'#b6a095':null,true);
    if(j%4===0)for(const d of [-1,1])part(out,G.rod,m.plank,x+d*w*.506*c,yy,z-d*w*.506*s,h/n*.95,.055,h/n*.95,0,yaw,Math.PI/2);
  }
}
function panel(o,m,skin,x,y,z,w,h,d,yaw){
  if(w<=0||h<=0)return;
  if(skin==='log')logPanel(o,m,x,y,z,w,h,yaw);
  else if(skin==='glass'){
    box(o,m.windowGlass,x,y,z,w,h,d*.57,yaw);for(const d of [-1,1])box(o,m.green,x+d*w*.50*Math.cos(yaw),y,z-d*w*.50*Math.sin(yaw),.078,h+.045,.14,yaw);
  }else{
    const material=skin==='brick'?m.brick:skin==='ranger'?m.plank:skin==='ginger'?m.wood:m.plaster;
    const g=new T.BoxGeometry(w,h,d);const a=g.attributes.uv,p=g.attributes.position;
    for(let i=0;i<a.count;i++){const k=i%4;a.setXY(i,(k%2?1:0)*w*.70,(k<2?1:0)*h*1.05);}
    part(o,g,material,x,y,z,1,1,1,0,yaw,0,null,true);
  }
}
export function cabin(w,c){
  const {batch,mat:m,physics,actions,light}=w;
  const y=ground(c.x,c.z)+.13,cY=Math.cos(c.yaw),sY=Math.sin(c.yaw),styl=c.skin==='glass'?'glass':c.skin;
  const local=new T.Group();local.position.set(c.x,y,c.z);local.rotation.y=c.yaw;
  const H=c.id==='holly'?3.76:styl==='glass'?3.11:2.95,winY=1.65+ (c.id==='holly'?.17:0);
  const width=c.w,depth=c.d,windowed=[],colliders=[]; const th=.25;
  box(local,m.limestone,0,-.085,0,width+.25,.36,depth+.29,0,null,true);
  box(local,m.plank,0,.035,0,width-.09,.13,depth-.05,0,null,true);
  const pl=styl==='brick'?m.ivory:styl==='glass'?m.green:m.wood;
  const exteriorStyle=styl==='glass'?m.green:styl==='brick'?m.ivory:styl==='ginger'?m.cream:m.wood;
  const face=(xc,zc,L,yaw,door=false,winCount=2)=>{
    const cc=Math.cos(yaw),ss=Math.sin(yaw);const lane=[];
    if(door)lane.push({center:0,width:1.44,y:0,h:2.27,door:true});
    for(let k=0;k<winCount;k++){
      const win=styl==='glass'?{center:(k+1)/(winCount+1)*L-L/2,width:Math.min(1.47,L/(winCount+1)-.17),y:.80,h:1.91}:{center:(k+1)/(winCount+1)*L-L/2,width:L<7?1.18:1.40,y:winY-.66,h:1.28};
      if(!door||Math.abs(win.center)>1.61)lane.push(win);
    }
    lane.sort((a,b)=>a.center-b.center);let from=-L/2;
    function wall(a,b,bot,top,col=true){
      const dc=(a+b)/2,ey=(bot+top)/2,H=top-bot,W=b-a;if(W<=.012||H<=.012)return;
      panel(local,m,styl,xc+cc*dc,ey,zc-ss*dc,W,H,th,yaw);
      if(col)colliders.push([xc+cc*dc,zc-ss*dc,W,th,bot,top,yaw]);
    }
    for(const e of lane){
      const a=e.center-e.width/2,b=e.center+e.width/2;
      wall(from,a,.08,H);wall(a,b,.08,e.y);wall(a,b,e.y+e.h,H,!e.door);from=b;
      if(!e.door){
        const x=xc+cc*e.center+.126*ss,z=zc-ss*e.center+.126*cc;
        const g=flatWindow(local,m,x,e.y+e.h/2,z,e.width,e.h, yaw,exteriorStyle,!c.enter, c.id==='holly'&&yaw===0);
        if(c.enter){
          const mg=new T.Group(); mg.position.set(x-.21*ss,e.y+e.h/2,z-.21*cc);mg.rotation.y=yaw;box(mg,m.dim,0,0,0,e.width,e.h,.042);mg.visible=false;windowed.push(mg);local.add(mg);
          // Frost deposits along glass edges; clear in the middle.
          for(let i=0;i<7;i++)part(g,G.rock,m.snowProp,-e.width*.445+i*.065,e.h*.445-i*.056,.032,.056,.090,.020,0,0,-.86);
          colliders.push([xc+cc*e.center,zc-ss*e.center,e.width,.35,e.y,e.y+e.h,yaw]);
        }
        const p=incl(local,x+.68*ss,e.y+.56,z+.68*cc);
        light.add(...p,{power:c.enter?11:22,distance:10,bake:.34,radius:7.3,glow:.72,air:.49,color:'#ffb174'});
      }
    }
    wall(from,L/2,.08,H);
    for(const h of [.19,H-.16])box(local,pl,xc,h,zc,L+.09,.145,th+.056,yaw,null,true);
    for(const d of [-1,1])box(local,pl,xc+cc*d*(L*.5-.045),H*.53,zc-ss*d*(L*.5-.045),.18,H*.92,.33,yaw,null,true);
  };
  face(0,depth/2,width,0,true,2);face(0,-depth/2,width,Math.PI,false,2);face(width/2,0,depth,Math.PI/2,false,styl==='glass'?4:2);face(-width/2,0,depth,-Math.PI/2,false,styl==='glass'?4:2);
  const rise=styl==='glass'?2.12:c.id==='holly'?4.13:styl==='ranger'?2.11:styl==='log'?2.69:3.08;
  const capskin=styl==='glass'?m.windowGlass:styl==='log'?m.plank:styl==='brick'?m.brick:styl==='ginger'?m.wood:m.plaster;
  const gab=gable(width+.10,rise,.245);
  part(local,gab,capskin,0,H,depth*.5,1,1,1,0,0,0,null,true);part(local,gab,capskin,0,H,-depth*.5,1,1,1,0,0,0,null,true);
  roofs(local,m,width,depth,H,rise,c.roof,c.x*55+c.z*17);
  rod(local,pl,[.108*width,H+.055,depth*.5+.163],[.108*width,H+rise-.17,depth*.5+.163],.077,G.rod,null,true);
  for(const i of [-1,1]){
    const v=[i*width*.476,H+.02,depth*.5+.17];rod(local,pl,v,[.098*width,H+rise-.16,v[2]],.084,G.rod,null,true);
    if(i===1||styl!=='ranger')rod(local,pl,[i*width*.32,H+.04,v[2]],[i*width*.085,H+rise*.49,v[2]],.072,G.rod);
  }
  if(styl!=='glass'){
    const X=width*.257,Y=H+rise*.31,Z=depth*.50+.185;
    part(local,G.rod,m.dim,X,Y,Z,.68,.047,.68,Math.PI/2,0,0);part(local,G.ringFine,m.ivory,X,Y,Z+.041,.369,.369,.55);
    box(local,pl,X,Y,Z+.078,.68,.039,.04);box(local,pl,X,Y,Z+.082,.039,.68,.040);
    const chimX=width*.25,chimZ=-depth*.22,chimHeight=H+rise+.54;
    const chimSty=styl==='log'?m.limestone:m.brick;box(local,chimSty,chimX,chimHeight-.98,chimZ,.82,1.97,1.02,0,null,true);
    for(let i=0;i<3;i++)box(local,i%2?m.iron:m.limestone,chimX,chimHeight+.081*i,chimZ,.96+i*.028,.12,1.10+i*.028,0,null,true);
    box(local,m.snowProp,chimX,chimHeight+.236,chimZ,.99,.074,1.09);
    const cap=incl(local,chimX,chimHeight+.31,chimZ);w.vapors.add(...cap,'smoke',1.22,10);
  }
  for(const a of [0,1])box(local,a?m.snowProp:m.limestone,0,a?-.051:-.164,depth/2+.37+(a?0:.15),2.06,a?.09:.13,.98+(a?0:.25),0,null,true);
  box(local,pl,0,2.40,depth/2+.134,1.75,.17,.24);
  for(const d of [-1,1]){
    box(local,pl,d*.781,1.19,depth/2+.133,.159,2.36,.22);
    lantern(local,m,d*(styl==='ranger'?1.26:1.58),1.92,depth/2+.28,styl==='ranger'?.45:.59,'brass');
    const pos=incl(local,d*1.43,1.88,depth/2+.52);
    light.add(...pos,{power:25,distance:10,glow:.82,bake:.43,radius:9.2,air:.66,color:'#ffb675'});
  }
  const n=46,pts=[];for(let i=0;i<=n;i++){const t=i/n,xx=lerp(-width*.49,width*.49,t),height=H-.17-Math.abs(Math.sin(t*3*Math.PI))*.295,zz=depth/2+.192;
    pts.push([xx,height,zz]);if(i%2===0)part(local,G.bulb,i%6===0?m.amber:m.filament,xx,height-.134,zz+.09,.057,.072,.06);}
  swag(local,m,pts,true,true,.123);
  const name=signTexture(c.en.toUpperCase(),c.id==='holly'?'BISCUITS & WARM LIGHT':'WINTER GARDENS',{w:648,h:126});
  box(local,m.wood,0,2.615,depth/2+.175,Math.min(3.4,width*.42),.54,.134);
  part(local,G.plane,name,0,2.615,depth/2+.247,Math.min(3.28,width*.41),.47,1);
  if(styl==='ginger'){
    w.decor.add(50,...incl(local,0,2.39,depth*.5+.15),4.2,'cabin-'+c.id);
    for(const d of [-1,1]){candy(local,m,d*width*.32,0,depth*.5+.53,2.31,-d*.16);w.decor.add(15,...incl(local,d*width*.32,1.62,depth*.5+.53),1.07);}
    for(let i=0;i<16;i++)part(local,G.smallBall,i%3===0?m.amber:i%3===1?m.red:m.cream,(i/15-.5)*width,H-.02,depth/2+.32,.115);
  }
  if(c.id==='holly'||c.id==='santa'||c.id==='log'){
    makeTreeAsset(local,m,-width*.50+.63,0,depth*.50+.93,2.16,840+c.id.charCodeAt(0));
    gifts(local,m,width*.26,.025,depth*.50+.7,rng(4291),.94);
    // Sled, firewood and boots outside the porch.
    for(const d of [-1,1])rod(local,m.iron,[width*.31+d*.17,.09,depth*.5+.66],[width*.31+d*.17,.09,depth*.5+1.51],.039);
    for(let i=0;i<4;i++)box(local,m.wood,width*.31+(i-1.5)*.10,.23,depth*.5+1.04,.09,.071,.96);
  }
  if(!c.enter){box(local,styl==='ginger'?m.iron:m.plank,0,1.16,depth/2+.072,1.40,2.21,.12);wreath(local,m,0,1.66,depth/2+.177,.38,0,1);part(local,G.smallBall,m.gold,.52,1.087,depth/2+.183,.075);}
  for(const g of windowed)local.remove(g);
  absorb(local,batch,false,'cabin exterior');
  for(const go of windowed)local.add(go);
  const room={...c,y,H,cs:cY,sn:sY,frame:local,windowed,world:(x,y,z)=>incl(local,x,y,z),door:null,fireOn:true,lampOn:true,recordOn:false,calendar:0};
  if(c.enter){
    // Only enterable cabins register an interior footprint, not their whole house as a box.
    const door=new T.Group();const fw=depth*.50;door.position.set(-.699,0,fw+.025);local.add(door);
    const d=new T.Group();box(d,styl==='glass'?m.green:m.wood,.685,1.159,-.052,1.36,2.24,.158,0,null,true);
    for(const off of [.24,.74]){box(d,pl,.69,off,-.145,1.17,.082,.031);box(d,pl,.69,off,.035,1.17,.084,.054);}
    flatWindow(d,m,.685,1.64,.035,.68,.63,0,pl,styl!=='glass');
    part(d,G.ringFine,m.gold,1.18,1.133,.10,.064,.064,.075);part(d,G.smallBall,m.glassGold,1.18,1.20,.111,.039);
    wreath(d,m,.65,1.62,.123,.29,0,1);door.add(compact(d));
    const [xx,yy,zz]=incl(local,0,1.19,fw+.087);
    const dc=physics.box(xx,zz,1.43,.21,y,y+2.23,c.yaw,c.id+'-door');
    for(const [a,b,W,D,lo,hi,Y] of colliders){const [X,Y0,Z]=incl(local,a,lo,b);physics.box(X,Z,W,D,Y0,Y0+hi-lo,c.yaw+Y,c.id+'-wall');}
    room.door={pivot:door,state:false,collision:dc};physics.rooms.push(room);
    const floor1=incl(local,0,.09,-depth*.50),floor2=incl(local,0,.09,depth*.5+.16);physics.deck(floor1[0],floor1[2],floor2[0],floor2[2],width-.09,y+.09,y+.09,'wood');
    actions.add(c.id+'-door','開啟'+c.name,xx,yy,zz,{reach:2.7,radius:.68,allowOccluded:true,hint:'開門',roomData:room,action:(ctx,a)=>{
      const [dx, ,dz]=room.world(.689,1.16,fw);if(Math.hypot(ctx.cam.feet.x-dx,ctx.cam.feet.z-dz)<.48&&room.door.state)return;
      room.door.state=!room.door.state;a.label=(room.door.state?'關上':'開啟')+c.name;a.hint=room.door.state?'關門':'開門';ctx.audio.chime('door');
    }});
  }else{
    physics.box(c.x,c.z,width,depth,y-.12,y+H,c.yaw,c.id);const p=incl(local,0,1.7,depth*.50+.12);let on=true;
    const shutter=new T.Group();shutter.visible=false;
    for(const q of [-1,1])box(shutter,m.wood,q*width/6,winY,depth*.50+.199,1.23,1.18,.067);
    local.add(shutter);
    actions.add(c.id+'-windows',c.name,...p,{radius:1.0,reach:3.2,hint:'切換窗光',allowOccluded:true,action:ctx=>{on=!on;shutter.visible=!on;ctx.audio.chime('soft');}});
  }
  // The shell is instanced. Only door, swappable far panes and interior remain as live nodes.
  for(const child of [...local.children])if(child!==room.door?.pivot&&!windowed.includes(child)&&child.visible!==false)local.remove(child);
  w.dynamicGroup(local, c.enter?45:35);w.cabins.push(room);
  return room;
}
const lathe=(p,s=32)=>new T.LatheGeometry(p.map(([r,y])=>new T.Vector2(r,y)),s);
const roundRoof=lathe([[0,0],[1,0],[1,.06],[.89,.09],[.78,.14],[.50,.43],[.28,.64],[.06,.81],[0,.86]],8);
const column=lathe([[.23,0],[.25,.05],[.21,.09],[.16,.12],[.14,.16],[.13,.68],[.12,.85],[.19,.91],[.24,.97],[.23,1]],9);
export function pavilion(w,x,z,{r=5.25,h=4.2,theme='ivory',id='pavilion',steps=true,y=ground(x,z)}={}){
  const {batch:o,mat:m,physics,light}=w;const shift=Math.PI/8,roofCol=theme==='ruby'?m.roof:theme==='green'?m.green:m.wine;
  part(o,G.disk,m.limestone,x,y+.12,z,r*2.14,.34,r*2.14);
  part(o,G.disk,m.plank,x,y+.29,z,r*1.97,.11,r*1.97);
  if(steps)for(let k=0;k<3;k++)box(o,m.limestone,x,y+.047+k*.054,z+r*(1.07-.056*k),2.89,.12,.45,0,null,true);
  physics.deck(x,z+r*1.067,x,z-r*.92,r*1.31,y+.22,y+.34);
  for(let i=0;i<8;i++){
    const a=i/8*TAU+shift,c=Math.cos(a),s=Math.sin(a),cx=x+c*r*.841,cz=z+s*r*.841;
    part(o,column,theme==='green'?m.wood:m.ivory,cx,y+.30,cz,1.15,h-.29,1.15,0,a,0,null,true);part(o,G.rod,m.bronze,cx,y+h-.46,cz,.41,.092,.41,0,a,0);
    w.physics.cylinder(cx,cz,.265,y,y+h,'pavilion column');
    const xx=x+Math.cos(a+TAU/8)*r*.841,zz=z+Math.sin(a+TAU/8)*r*.841;
    const pts=[];for(let j=0;j<=15;j++){const f=j/15;const yy=y+h-.51+.41*Math.sin(f*Math.PI);pts.push([lerp(cx,xx,f),yy,lerp(cz,zz,f)]);}
    line(o,m.gold,pts,.051,G.rod);line(o,theme==='green'?m.wood:m.ivory,pts.map(([cx,yy,cz])=>[cx,yy+.092,cz]),.072,G.rod);
    festoon(w,[cx,y+h-.09,cz],[xx,y+h-.09,zz],.37,14,{size:.048,stars:i%2===0});
    if(i%2===0)wreath(o,m,cx+.18*c,y+2.25,cz+.18*s,.36,Math.PI/2-a,1);
  }
  part(o,roundRoof,roofCol,x,y+h,z,r,h*.74,r,0,0,0,null,true);part(o,roundRoof,m.snowProp,x,y+h+.12,z,r*.94,h*.739,r*.94,0,.013,0,null,true);
  for(let i=0;i<8;i++){
    const a=i/8*TAU;const c=Math.cos(a),s=Math.sin(a);const v=[[x+c*r,y+h+.06,z+s*r],[x+c*r*.82,y+h+.51,z+s*r*.82],[x+c*r*.49,y+h+1.31,z+s*r*.49],[x+c*r*.063,y+h+h*.59,z+s*r*.063]];
    line(o,m.bronze,v,.058,G.rod);
  }
  part(o,G.rod,m.bronze,x,y+h+h*.683,z,.23,.41,.23);part(o,G.tinyStar,m.gold,x,y+h+h*.792,z,.39,.39,.39);
  rod(o,m.iron,[x,y+h,x*0+z],[x,y+h-.76,z],.031);
  part(o,G.ringFine,m.gold,x,y+h-1.04,z,.87,.87,.87,Math.PI/2,0,0);
  for(let j=0;j<8;j++){const a=j/8*TAU;candle(o,m,x+.80*Math.cos(a),y+h-.983,z+.80*Math.sin(a),.24);}
  lantern(o,m,x,y+h-1.20,z,.86,'brass');
  light.add(x,y+h-1.19,z,{power:46,distance:17,radius:10.6,bake:.73,glow:1.45,color:'#ffbd7d',air:.46});
  if(id==='bandstand')w.actions.add('bandstand-box','音樂亭的音樂盒',x,y+1.03,z,{reach:3,radius:.81,hint:'轉動音樂盒',action:ctx=>ctx.audio.melody('bandstand',true)});
  return y;
}
export function clockTower(w,x,z){
  const {batch:o,mat:m,light,physics}=w;const y=ground(x,z);
  box(o,m.limestone,x,y+.58,z,5.8,1.16,5.8,0,null,true);box(o,m.brick,x,y+5.25,z,4.94,9.40,4.91,0,null,true);
  for(const h of [1.23,5.7,9.65,10.06])box(o,m.limestone,x,y+h,z,5.24,.16,5.23,0,null,true);
  for(const a of [-1,1])for(const b of [-1,1])for(let j=0;j<9;j++)if(j%3!==2)box(o,m.limestone,x+a*2.40,y+.85+j*.94,z+b*2.41,.37,.32,.37,0,null,true);
  for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
    const g=new T.Group();g.position.set(x,y,z);g.rotation.y=a;
    part(g,G.rod,m.iron,0,7.38,2.502,2.91,.14,2.91,Math.PI/2,0,0);
    part(g,G.rod,m.dim,0,7.38,2.59,2.56,.091,2.56,Math.PI/2,0,0);
    part(g,G.ringFine,m.gold,0,7.38,2.656,1.35,1.35,1.1);
    for(let i=0;i<12;i++){const th=i/12*TAU;part(g,G.box,m.iron,Math.sin(th)*1.092,7.38+Math.cos(th)*1.092,2.649,.059,.17,.044,0,0,-th);}
    rod(g,m.coal,[0,7.38,2.668],[-.43,7.17,2.668],.059);rod(g,m.coal,[0,7.38,2.679],[.336,8.171,2.679],.037);
    for(const d of [-1,1])flatWindow(g,m,d*.83,3.45,2.483,.83,1.68,0,m.limestone,true,true);
    absorb(g,o,true);light.halo(x+2.66*Math.sin(a),y+7.38,z+2.66*Math.cos(a),2.0,'#ffc78d',.36);
  }
  const roof=lathe([[0,0],[1,0],[1,.06],[.86,.12],[.72,.17],[.57,.30],[.43,.54],[.24,.85],[.09,1.20],[0,1.38]],8);
  part(o,roof,m.roof,x,y+10.18,z,3.58,4.85,3.58,0,Math.PI/8,0,null,true);part(o,roof,m.snowProp,x,y+10.27,z,3.48,4.868,3.48,0,Math.PI/8,0);
  part(o,G.smallBall,m.glassGold,x,y+16.91,z,.29);part(o,G.tinyStar,m.gold,x,y+17.69,z,.51,.51,.51,0,.22,0);
  physics.box(x,z,5.7,5.7,y,y+14,0,'clockTower');
}
const stalls=[['熱可可','HOT CHOCOLATE','cocoa'],['熱香料紅酒','MULLED WINE','wine'],['烤栗子','ROASTED CHESTNUTS','nuts'],['薑餅與糖霜','GINGERBREAD','ginger'],['冬日麵包與烤腸','BREAD & BRATWURST','bread'],['肉桂捲','CINNAMON BUNS','rolls'],['糖漬蘋果','CANDIED APPLES','apple'],['松香蠟燭','PINE & BEESWAX','candle'],['手工木玩具','WOODEN TOYS','toys'],['冬日針織','WOOL & MITTENS','wool'],['節日玻璃球','BAUBLES & BELLS','glass'],['明信片與舊書','WINTER POST','books']];
let marketGlass;
function stallGlass(){
  if(marketGlass)return marketGlass;
  const size=256,h=128,data=new Uint8Array(size*h*4),grain=rng(590281);
  for(let i=0;i<size*h;i++){
    const u=(i%size+.5)/size,v=(Math.floor(i/size)+.5)/h;
    const shine=Math.exp(-3.8*((u-.31)**2+1.8*(v-.75)**2))*.87+.17*Math.exp(-13*((u-.79)**2+(v-.48)**2));
    const frost=(1-v)**2*(.35+.46*noise2(u*43,v*41))+(grain()-.5)*.036;
    const bar=Math.max(0,1-Math.abs(v-.36)*48)*.19;
    const shape=Math.sin(u*238+v*.7)*.017+noise2(u*31,v*9)*.025;
    const k=i*4;
    data[k]=clamp(133+shine*106+frost*25-bar*94+shape*186,0,255);
    data[k+1]=clamp(82+shine*104+frost*24-bar*56+shape*168,0,255);
    data[k+2]=clamp(56+shine*72+frost*23-bar*34+shape*140,0,255);data[k+3]=255;
  }
  const t=new T.DataTexture(data,size,h,T.RGBAFormat);t.colorSpace=T.SRGBColorSpace;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.generateMipmaps=true;t.needsUpdate=true;t.name='Painted warm panes · frost and uneven light';
  marketGlass=new T.MeshBasicNodeMaterial({name:'Frosted stall light',map:t,color:'#fff0db'});return marketGlass;
}
export function marketStall(w,x,z,yaw,i=0){
  const {batch:o,mat:m,light,physics}=w;const s=stalls[i%stalls.length];const r=rng(244+i*1643),y=ground(x,z),width=between(r,4.0,5.5),depth=between(r,3.12,3.88),H=between(r,2.68,3.05);
  const g=new T.Group();g.position.set(x,y,z);g.rotation.y=yaw;const wall=i%4===2?m.brick:m.plank,frame=i%3===1?m.red:i%3===2?m.wood:m.green, ruf=i%4===0?m.roof:i%4===1?m.green:i%4===2?m.wine:m.wood;
  box(g,m.limestone,0,.08,0,width+.118,.18,depth+.08,0,null,true);
  box(g,wall,0,1.51,-depth*.50,width,2.78,.174,0,null,true);
  for(const k of [-1,1]){box(g,wall,k*width*.50,1.17,0,.13,2.23,depth,0,null,true);box(g,frame,k*width*.464,H*.51,depth*.491,.179,H,.212,0,null,true);}
  box(g,frame,0,.56,depth*.49,width,.947,.213,0,null,true);box(g,m.wood,0,1.069,depth*.51,width+.22,.124,.686,0,null,true);
  part(g,G.plane,stallGlass(),0,1.94,-depth*.50+.191,width*.79,1.39,1);
  box(g,m.bronze,0,1.124,depth*.51+.347,width+.29,.043,.041);
  box(g,frame,0,.946,depth*.49+.121,width-.18,.038,.093);
  for(const d of [-1,1]){
    box(g,m.bronze,d*width*.44,.543,depth*.49+.119,.033,.730,.036);
    for(let k=0;k<3;k++)part(g,G.smallBall,m.bronze,d*width*.44,.32+k*.228,depth*.49+.136,.018,.018,.011);
  }
  for(let j=0;j<7;j++)box(g,wall,(j/6-.5)*width*.79,1.95,-depth*.5+.183,.072,1.39,.068);
  if(i%3===0){
    roofs(g,m,width,depth,H-.18,1.37,i%2?'olive':'burgundy',i*37);
  }else{
    part(g,G.box,ruf,0,H+.11,-.03,width+.67,.23,depth+.72,.21,0,0,null,true);
    part(g,G.box,m.snowProp,0,H+.245,-.11,width+.55,.11,depth+.53,.21,0,0,null,true);
    for(let j=0;j<13;j++)part(g,G.box,j%2===0?frame:m.wool,(j/12-.5)*(width+.56),H-.179,depth*.50+.31,(width+.60)/13,.259,.107,.085,0,0);
  }
  const sign=signTexture(s[1],s[0],{w:696,h:144});const by=H-.204,bz=depth*.51+.40;box(g,m.wood,0,by,bz-.05,width*.71,.632,.092);part(g,G.plane,sign,0,by,bz,width*.68,.58,1);
  for(const k of [-1,1])lantern(g,m,k*(width*.44),H-.463,depth*.51+.24,.40,'brass');
  const price=[4,5,4,3,6,4,4,7,8,9,6,3][i%12];
  const slate=signTexture(`€ ${price}.00`,'WINTER MARKET',{bg:'#242622',fg:'#e6d4a9',stroke:'#615841',w:256,h:128});
  part(g,G.box,m.wood,-width*.36,1.292,depth*.50+.348,.454,.321,.072,-.112,-.097,.021);
  part(g,G.plane,slate,-width*.36,1.291,depth*.50+.388,.396,.263,1,-.112,-.097,.021);
  const q=incl(g,0,2.23,depth*.5+.43);
  w.decor?.add(11,...incl(g,0,H-.09,depth*.5+.52),width*.8,'stall-'+i);
  if(['cocoa','wine','nuts'].includes(s[2]))w.decor?.add(30,...incl(g,0,1.28,depth*.59),1.3,'stall-'+i);
  if(s[2]==='candle')w.decor?.add(6,...incl(g,0,1.35,depth*.56),1.4,'stall-'+i);
  if(s[2]==='glass')w.decor.add(17,...incl(g,-.76,1.24,depth*.57),.70,'stall-'+i);
  if(i%3===1)w.decor?.add(9,...incl(g,.30,1.49,depth*.59),.82,'stall-'+i);
  light.add(...q,{power:38,distance:11,bake:.46,radius:9.5,glow:1.19,air:.56,color:'#ffb16b'});
  // A single garland treatment ties together the hand-painted facades.
  const pts=[];for(let k=0;k<29;k++){const f=k/28;pts.push([(f-.5)*(width*.94),H+.052-.35*Math.sin(f*Math.PI),depth*.5+.51]);}
  swag(g,m,pts,true,true,.113);
  if(i%4===0)wreath(g,m,-width*.34,.68,depth*.5+.143,.30);
  for(let j=0;j<11;j++){
    const xx=between(r,-width*.428,width*.428),zz=depth*.5+between(r,-.22,.25),yy=1.138;
    const otype=s[2];const size=between(r,.109,.23);
    if(['cocoa','wine','nuts'].includes(otype)){
      part(g,G.rod,j%2?m.cream:m.bronze,xx,yy+size*.31,zz,size*.93,size*.63,size*.90);
      part(g,G.rod,m.wood,xx,yy+size*.63,zz,size*.76,.023,size*.74);part(g,G.ringFine,m.ivory,xx+size*.44,yy+size*.36,zz,size*.36,size*.38,size*.58);
    }else if(otype==='candle'){candle(g,m,xx,yy,zz,size*(1+j%3));}
    else if(otype==='glass'||otype==='apple'){part(g,G.smallBall,otype==='apple'?m.glassRed:j%3?m.glassSilver:m.glassGold,xx,yy+size*.45,zz,size*.51);}
    else if(otype==='books'||otype==='wool'){box(g,j%2?m.wool:m.green,xx,yy+size*.31,zz,size*1.42,size*.62,size*.97,r()*TAU);}
    else if(otype==='toys'){gifts(g,m,xx,yy,zz,r,.33);}
    else if(otype==='ginger'){part(g,G.tinyStar,m.wood,xx,yy+size*.31,zz,size*.58,size*.54,size*.34,0,0,j*.41);}
    else{part(g,G.ico,m.wood,xx,yy+size*.34,zz,size,size*.53,size*.78,0,j*.28);}
  }
  const tray=i===2?'spice':i===8||i===9?'craft':i===0||i===3||i===4?'bakery':null;
  if(tray){
    const tx=-.52,ty=1.133,tz=depth*.51+.11;
    festiveTray(g,m,tx,ty,tz,0,tray);
    const items={bakery:[[32,-.21,.18,.10,.41],[33,.38,.17,-.11,.31],[34,-.25,.08,.245,.54]],spice:[[31,-.36,.22,0,.52],[35,.29,.11,-.22,.32],[36,.30,.09,.19,.31]],craft:[[37,.08,.22,0,.35],[38,-.45,.14,0,.26],[39,.45,.07,-.08,.36]]}[tray];
    for(const [id,u,v,d,extent] of items)w.decor.add(id,...incl(g,tx+u,ty+v,tz+d),extent,'stall-'+i);
  }
  const specialty=({apple:[73],rolls:[74,75],bread:[76],wool:[77],candle:[78],books:[79]})[s[2]];
  if(specialty){merchantsTray(g,m,.61,1.134,depth*.50+.04,s[2]);for(const id of specialty)w.decor?.add(id,...incl(g,.61,1.34,depth*.50+.32),1.09,'stall-'+i);}
  if(i%3===1)candleArch(g,m,.30,1.15,depth*.44,.82);
  if(i<4){
    part(g,G.post,m.iron,width*.23,1.45,depth*.29,.52,.52,.52);part(g,G.cap,m.gold,width*.23,1.794,depth*.29,.59,.19,.59);part(g,G.smallBall,m.coal,width*.23,1.924,depth*.29,.078);
    const p=incl(g,width*.23,1.78,depth*.41);w.vapors.add(...p,'steam',.92,12);const pos=incl(g,0,1.53,depth*.58);
    w.actions.add(x<40?'entry-chestnuts':'stall-'+i,s[0],...pos,{radius:.72,hint:'暖杯',allowOccluded:true,action:ctx=>{ctx.audio.chime('cup');ctx.ui.warmCup(s[0]);const steam=new T.Group();steam.position.set(...p);w.effects?.puff('steam',steam.position);}});
  }
  absorb(g,o,false,'market stalls');physics.box(x,z,width,depth,y,y+H,yaw,'stall-'+i);
  return {x,z};
}
export function buildMarket(w){
  const placement=[[92,-114,.65],[102,-119,.16],[115,-118,-.10],[120,-122,.24],[143,-119,-.81],[149,-110,-1.58],[146,-98,-2.53],[132,-94,Math.PI],[122,-93,Math.PI],[111,-93,Math.PI],[103,-93,3.43],[93,-95,2.36]];
  for(let i=0;i<placement.length;i++)marketStall(w,...placement[i],i);
  for(const x of [99,109,122,138])festoon(w,[x,6.05,-114],[x+2,5.80,-96],.81,43,{size:.068,stars:true});
  const {batch:o,mat:m,physics,light}=w;
  for(let i=0;i<5;i++){
    const x=108+i*6.6,z=-103+1.5*Math.sin(i*2.7),y=ground(x,z);if(i===2)continue;
    part(o,G.post,m.iron,x,y+.57,z,.10,1.1,.10);part(o,G.disk,m.wood,x,y+1.14,z,1.19,.16,1.19);candle(o,m,x,y+1.23,z,.28);part(o,G.rod,m.ivory,x-.31,y+1.31,z-.11,.14,.17,.14);
    light.add(x,y+1.44,z,{power:8,glow:.42,bake:.27,radius:4.7,distance:7.1});physics.cylinder(x,z,.62,y,y+1.2,'street table');
  }
  makeTreeAsset(o,m,135,ground(135,-106),-106,6.1,214);lamp(w,95,-107,{h:4.35,wreath:true});lamp(w,142,-105,{h:4.26,wreath:true});
  const x=139.6,z=-116.5,y=ground(x,z);
  part(o,G.post,m.red,x,y+.827,z,.59,1.42,.58);part(o,G.smallBall,m.red,x,y+1.535,z,.30,.28,.29);
  box(o,m.iron,x,y+1.346,z+.299,.29,.061,.031);part(o,G.tinyStar,m.gold,x,y+1.063,z+.307,.15,.15,.22);
  w.decor?.add(45,x,y+1.08,z,.88);
  w.actions.add('postbox','寄給冬夜的信',x,y+1.30,z+.33,{reach:2.5,radius:.43,hint:'投遞祝福',action:ctx=>ctx.ui.wish()});
}
export function gatesAndCity(w){
  const {batch:o,mat:m,scene,physics,light}=w;
  for(const z of [219,-219])arch(w,0,z,{width:z>0?20:9.8,h:z>0?8.3:6.2,gate:z>0});
  for(const D of [-1,1])for(const off of [-4.7,4.7]){
    const x=D*222,z=off,y=ground(x,z);
    box(o,m.limestone,x,y+1.59,z,1.42,3.18,1.31,0,null,true);box(o,m.snowProp,x,y+3.26,z,1.56,.135,1.46);lantern(o,m,x,y+3.84,z,.74);light.add(x,y+3.8,z,{power:45,glow:1.03,bake:.49,radius:9});physics.box(x,z,1.42,1.31,y,y+3.2,0,'gate');
  }
  for(const d of [-1,1])for(const ax of [0,1]){
    for(const half of [-1,1]){
      const pts=[];for(let a=0;a<=34;a++){
        const j=lerp(ax||d<0?5.6:10.8,223,a/34)*half,x=ax?d*223:j,z=ax?j:d*223,y=ground(x,z);
        pts.push([x,y+.20,z]);if(a%2===0){box(o,m.limestone,x,y+.36,z,.64,.72,.64);box(o,m.snowProp,x,y+.748,z,.73,.12,.73);}
      }
      rail(w,pts,{height:.91,step:1.16});
    }
  }
  for(const d of [-1,1])for(const ax of [0,1]){
    for(const [s,offset,M,h] of [[472,227,m.limestone,-.014],[493,237,m.stone,-.065],[510,248,m.limestone,-.022]]){
      const ge=new T.BoxGeometry(ax?8:s,.10,ax?s:8);const a=ge.attributes.uv;for(let i=0;i<a.count;i++)a.setXY(i,a.getX(i)*(ax?2:90),a.getY(i)*(ax?90:2));part(o,ge,M,ax?d*offset:0,h,ax?0:d*offset);
    }
  }
  // Keep the haze foundation outside the terrain. An uncut 2.4 km
  // plane here hides the pond and clips through low parts of the garden.
  const base=new T.Mesh(cityGround(),m.coal);base.name='City ground ring into horizon haze';base.matrixAutoUpdate=false;scene.add(base);
  // Near-block architecture and farther skyline, with projected shadowed rooms behind some windows.
  const random=rng(292183),buildTints=['#4e4245','#5c4945','#5a4e48','#4d4844','#46414a','#494651'].map(cShade);
  const bw=new T.MeshStandardNodeMaterial({name:'Warm stone city masonry',color:'#a08b81',roughness:.86,userData:{staticBatch:'paint'}});
  const dark=new T.MeshStandardNodeMaterial({name:'Rooftop copper / slate',color:'#49454c',roughness:.85,userData:{staticBatch:'paint'}});
  const pale=new T.MeshBasicNodeMaterial({name:'City gentle lit window',color:'#a88672',userData:{staticBatch:'lamp'}});
  const winn=new T.MeshBasicNodeMaterial({name:'City amber lamp silhouettes',color:'#f5ba89',userData:{staticBatch:'lamp'}});
  // The city is at least a block away: façade glazing is front-facing trim,
  // not a box with five hidden faces. Nearby park windows are still 3D.
  const block=(x,z,wide,deep,h,row,index)=>{
    const y=-.16,g=new T.Group();g.position.set(x,y,z);g.rotation.y=row%2===0?0:Math.PI/2;
    const color=pick(random,buildTints).clone().multiplyScalar(between(random,1.01,1.57));
    box(g,bw,0,h*.49,0,wide,h*.98,deep,0,color);
    box(g,dark,0,h*.98,0,wide*1.035,h*.039,deep*1.035,0,color);
    if(index%3!==0){box(g,bw,0,h*1.023,0,wide*.76,h*.084,deep*.76,0,color);box(g,dark,wide*.10,h*1.091,-deep*.07,wide*.43,h*.089,deep*.53,0,color);}
    for(const d of [-1,1])if(index%4===2){box(g,dark,d*wide*.34,h*.61,d*deep*.47,wide*.16,h*.70,deep*.25,0,color);}
    const floors=Math.floor(h/(h>60?4.24:3.4)),per=Math.ceil(wide/4.0);const ww=wide/per;
    for(const d of [-1,1]){
      for(let j=1;j<floors;j++){
        const yy=h*j/floors;
        if(j%3===1&&Math.max(Math.abs(x),Math.abs(z))<335)box(g,dark,0,yy-.87,d*deep*.508,wide*1.016,.108,.22,0,color);
        for(let i=0;i<per;i++){
          if(random()<.29)continue;
          const xx=ww*(i+.5)-wide*.5;const hi=between(random,1.00,1.81);
          part(g,G.plane,random()<.46?pale:winn,xx,yy,d*(deep*.5+.095),ww*between(random,.26,.53),hi,1,0,d<0?Math.PI:0,0,color.clone().lerp(new T.Color('#fff6db'),.61));
          if(index%5!==0&&row<4)part(g,G.plane,dark,xx,yy,d*(deep*.5+.135),.095,hi+.038,1,0,d<0?Math.PI:0);
        }
        for(let j2=0;j2<Math.ceil(deep/4.2);j2++)if(random()>.44){const zz=(j2+.5)*deep/Math.ceil(deep/4.2)-deep*.5;part(g,G.plane,pale,d*(wide*.5+.06),yy,zz,wide*.068,1.52,1,0,d*Math.PI/2,0,color.clone().lerp(new T.Color('#fbddc0'),.70));}
      }
      if(index%2===0&&row<4){for(let jj=0;jj<per-1;jj++)box(g,m.distant,ww*(jj+1)-wide*.5,1.68,d*(deep*.5+.08),ww*.70,2.40,.042,0,color.clone().lerp(new T.Color('#edbd91'),.52));}
    }
    if(index%5===4){part(g,G.rod,dark,0,h*1.14,0,.13,h*.15,.13);part(g,G.bulb,m.amber,0,h*1.222,0,.29,.38,.29);}
    absorb(g,w.cityBatch,false,'city blocks');
  };
  for(let D=0;D<4;D++)for(let i=0;i<10;i++){
    const dist=285+between(random,-10,22),a=-270+(i+.5)*54+between(random,-10,12);const [x,z]=D===0?[a,-dist]:D===1?[dist,a]:D===2?[a,dist]:[-dist,a];
    let h=between(random,13,48)*(D===0?1.18:1);if(D===0&&i===4)h=76;if(D===0&&i===6)h=85;
    block(x,z,between(random,19,43),between(random,19,37),h,D,i);
  }
  // A lower street wall sits between the park and the irregular towers.
  // Roof ridges, warm shop strips and gaps reach around the boundary.
  const rowRand=rng(444839);const rowroof=new T.MeshStandardNodeMaterial({name:'Snow on slate tenements',color:'#877d72',roughness:.90,userData:{staticBatch:'paint'}});
  for(const d of [-1,1])for(let side=0;side<2;side++)for(let i=0;i<19;i++){
    if(i===9||i%7===1)continue;
    const off=-247+i*27.55+between(rowRand,-3.2,3.2),sub=between(rowRand,262,270)*d;
    const cx=side?sub:off,z=side?off:sub,h=between(rowRand,6.5,14.8),ww=between(rowRand,18,23),dd=between(rowRand,9,13);
    const quarter=new T.Group();quarter.position.set(cx,-.23,z);quarter.rotation.y=side?d*Math.PI/2:d<0?0:Math.PI;
    const tint=pick(rowRand,buildTints).clone().multiplyScalar(1.53);
    box(quarter,bw,0,h*.49,0,ww,h*.98,dd,0,tint);
    for(const e of [-1,1]){
      part(quarter,G.box,rowroof,0,h+.63,e*dd*.298,ww+.22,.148,dd*.625,e*.38,0,0,tint.clone().lerp(new T.Color('#ab9c8b'),.45));
      for(let k=0;k<7;k++)if(rowRand()<.8)part(quarter,G.plane,pale,ww*(k/7-.424),h*.63,e*(dd*.5+.06),.86,1.37,1,0,e<0?Math.PI:0,0,tint.clone().lerp(new T.Color('#dfab7d'),.52));
    }
    for(let j=0;j<3;j++)box(quarter,dark,ww*(j*.29-.29),h+1.24,.56,.77,1.49,.78,0,tint);
    absorb(quarter,w.cityBatch,false,'city roof strip');
  }
  for(let i=0;i<27;i++){
    const a=i/27*TAU+between(random,-.072,.074),d=between(random,355,490),hx=between(random,25,108);
    block(Math.cos(a)*d,Math.sin(a)*d,between(random,25,52),between(random,23,45),hx,4,i);
  }
  // Street-light ribbons connect the near roofline and the towers. They are
  // subdued vistas, not thousands of dynamic shadow-casting practicals.
  const streets=rng(843164),sparkTypes=['#ddaa84','#ffd0a3','#ad8b7e'];
  for(const d of [-1,1])for(const side of [0,1])for(const main of [242,293,335,397,469]){
    for(let j=0;j<46;j++){
      if(j%7===6||streets()<.09)continue;
      const along=(j-22)*19.4+between(streets,-1.1,1.1),out=d*(main+between(streets,-2.25,2.3));
      const size=between(streets,.12,.36),x=side?out:along,z=side?along:out;
      part(w.cityBatch,G.bulb,m.distant,x,2.2+between(streets,0,3.3),z,size,size*.82,size,0,j,0,pick(streets,sparkTypes),false,'Distant street lights');
    }
  }
}
