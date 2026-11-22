import * as T from 'three/webgpu';
import layout from './data/layout.json';
import {ground} from './terrain.js';
import {TAU,between,pick,rng,noise2,lerp,clamp} from './math.js';
import {G,part,rod,box,ball,line,absorb,signTexture} from './mesh.js';
import {makeTreeAsset} from './vegetation.js';

const railProfile=new T.LatheGeometry([[0,0],[.55,0],[.55,.045],[.47,.064],[.43,.15],[.36,.18],[.35,.30],[.27,.38],[.21,.46],[.20,.67],[.28,.73],[.22,.76],[.14,.99],[0,1]].map(([x,y])=>new T.Vector2(x,y)),10);
const lampHat=new T.LatheGeometry([[0,0],[.66,0],[.61,.095],[.57,.13],[.44,.20],[.31,.42],[.16,.54],[.09,.63],[0,.68]].map(([x,y])=>new T.Vector2(x,y)),8);
const glassLamp=new T.CylinderGeometry(.35,.235,.78,6,1,true);
const cushion=new T.SphereGeometry(1,12,8);
const hooks=new Map();

export function lantern(out,m,x,y,z,s=1,variant='iron'){
  const metal=variant==='paper'?m.wood:variant==='brass'?m.bronze:m.iron;
  part(out,G.rod,metal,x,y-.46*s,z,.71*s,.13*s,.71*s,0,.53,0);part(out,G.rod,m.gold,x,y-.386*s,z,.49*s,.064*s,.49*s);
  part(out,glassLamp,variant==='paper'?m.dim:m.amber,x,y,z,.88*s,.90*s,.88*s,0,.53,0);
  part(out,G.post,m.filament,x,y-.12*s,z,.18*s,.38*s,.18*s);
  for(let i=0;i<6;i++){
    const a=i/6*TAU+.53;const c=Math.cos(a),d=Math.sin(a);rod(out,metal,[x+c*.225*s,y-.36*s,z+d*.225*s],[x+c*.345*s,y+.36*s,z+d*.345*s],.025*s,G.fineRod);
  }
  part(out,lampHat,metal,x,y+.34*s,z,.59*s,.68*s,.59*s,0,Math.PI/6,0);
  part(out,lampHat,m.snowProp,x,y+.392*s,z,.465*s,.60*s,.465*s,0,Math.PI/6+.12,0);
  part(out,G.smallBall,m.bronze,x,y+.82*s,z,.055*s,.075*s,.055*s);
}
export function wreath(out,m,x,y,z,r,yaw=0,style=0){
  const c=Math.cos(yaw),s=Math.sin(yaw);
  part(out,G.ring,m.green,x,y,z,r,r,r*1.45,0,yaw,0);
  for(let i=0;i<22;i++){
    const a=i/22*TAU,rx=Math.cos(a)*r,ry=Math.sin(a)*r;
    part(out,G.rock,i%5===0?m.swiss:m.green,x+rx*c,y+ry,z-rx*s,.17*r,.27*r,.18*r,0,yaw,a+.31,i%5===0?'#99a37a':null);
    if(i%3===0)part(out,G.smallBall,style?m.glassGold:m.glassRed,x+rx*c+.13*r*s,y+ry+.06*r,z-rx*s+.13*r*c,.082*r,.082*r,.082*r);
    if(i%3===1)part(out,G.bulb,m.filament,x+rx*c+.17*r*s,y+ry,z-rx*s+.17*r*c,.037*r,.037*r,.04*r);
  }
  const by=y-r*.88,bz=z+.15*r*c,bx=x+.15*r*s;
  for(const dir of [-1,1]){part(out,G.ico,m.red,bx+dir*.20*r*c,by+.04*r,bz-dir*.20*r*s,.24*r,.129*r,.098*r,0,yaw,-dir*.31);part(out,G.box,m.wool,bx+dir*.115*r*c,by-.17*r,bz-dir*.115*r*s,.11*r,.32*r,.04*r,0,yaw,dir*.32);}
  part(out,G.smallBall,m.glassGold,bx,by,bz,.073*r); 
}
export function lamp(w,x,z,opts={}){
  const {batch:b,mat:m,light,physics}=w;const y=opts.y??ground(x,z);const h=opts.h??4.32;const yaw=opts.yaw??0;
  const s=opts.s??1;const y0=y+h;
  part(b,G.rod,m.limestone,x,y+.074,z,.69*s,.148,.69*s);
  part(b,railProfile,m.iron,x,y+.10,z,.54*s,h*.55,.54*s,0,yaw,0,null,true);
  part(b,G.taper,m.iron,x,y+h*.58,z,.16*s,h*.65,.16*s,0,yaw,0,null,true);
  for(const [u,r,t] of [[.22,.25,.085],[.43,.20,.074],[.78,.195,.12],[.88,.25,.083],[.91,.40,.082]])part(b,G.rod,m.bronze,x,y+h*u,z,r*s,t,r*s);
  lantern(b,m,x,y0,z,s);w.decor?.add(3,x,y0,z,.72*s,'lamp');
  const arch=[];for(let i=0;i<=12;i++){const a=i/12*TAU*.84,r=.28*s;arch.push([x+Math.cos(a)*r*Math.cos(yaw),y+h-.80*s+Math.sin(a)*r,z+Math.cos(a)*r*Math.sin(yaw)]);}
  if(h>3)line(b,m.iron,arch,.023*s,G.fineRod);
  if(opts.wreath){const X=x+.17*s*Math.sin(yaw),Z=z+.17*s*Math.cos(yaw);wreath(b,m,X,y+h-.99*s,Z,.37*s,yaw);w.decor?.add(10,X,y+h-.99*s,Z,.68*s,'lamp');}
  light.add(x,y0+.04,z,{glow:1.11*s,power:opts.power??(h>3?54:18),distance:opts.distance??(h>3?18:9),radius:opts.radius??(h>3?10:5.8),bake:opts.bake??(h>3?.52:.43),air:.66,color:opts.color||'#ffc18b'});
  if(!opts.noCollision)physics.cylinder(x,z,.29*s,y,y+h*.97,'lamp');
}
export function lowLantern(w,x,z,kind='paper',opts={}){
  const {mat:m,batch:b,light}=w;const y=opts.y??ground(x,z);const s=opts.s??.45;const d=opts.post??.25;
  if(d)part(b,G.rod,m.iron,x,y+d*.53,z,.11,d*1.06,.11);
  if(kind==='ice'){
    const geo=G.ico;part(b,geo,m.iceglass,x,y+d+.26,z,.23,.32,.24,0,opts.yaw??0,.12);
    part(b,G.rod,m.ivory,x,y+d+.15,z,.12,.23,.12);part(b,G.bulb,m.candle,x,y+d+.30,z,.062,.096,.065);
  }else lantern(b,m,x,y+d+s*.45,z,s,kind);
  w.decor?.add(kind==='ice'?4:kind==='brass'?5:3,x,y+d+s*.46,z,.65*s);
  light.add(x,y+d+s*.46,z,{glow:opts.glow??.51,power:opts.power??10,distance:8.5,bake:opts.bake??.24,radius:opts.radius??4.8,air:.51,color:'#ffbd7c'});
}
export function swag(out,m,points,bows=true,lights=true,size=.19){
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i];rod(out,m.green,a,b,size*.58,G.fineRod);
    const [x,y,z]=b;
    part(out,G.rock,i%3?m.swiss:m.green,x,y,z,size*(1.35+(i%3)*.09),size*.77,size*.81,0,i*.55,i*.34);
    if(lights&&i%2===0)part(out,G.bulb,m.filament,x,y-size*.62,z+size*.22,size*.26,size*.26,size*.26);
    if(bows&&i%9===1){part(out,G.ico,m.red,x-.17,y,z+size*.36,.23,.115,.065,0,.15,.32);part(out,G.ico,m.red,x+.17,y,z+size*.36,.23,.115,.065,0,-.15,-.32);}
  }
}
export function festoon(w,a,b,drop=1.6,n=38,options={}){
  const {batch:o,mat:m,light}=w;const pts=[];
  for(let i=0;i<=n;i++){
    const t=i/n,x=lerp(a[0],b[0],t),y=lerp(a[1],b[1],t)-drop*Math.sin(t*Math.PI),z=lerp(a[2],b[2],t);
    pts.push([x,y,z]);if(i%Math.max(1,options.step||1)===0)part(o,G.bulb,i%7===4?m.amber:m.filament,x,y-.079,z,options.size??.059,(options.size??.059)*1.38,options.size??.059,0,t*10,.13);
    if(options.stars&&i%8===4)part(o,G.tinyStar,m.filament,x,y-.33,z,.22,.22,.22,0,.23,.10);
    if(i%13===6&&options.halo!==false)light.halo(x,y,z,.42,'#ffbe82',.26);
  }
  line(o,m.iron,pts,.014,G.fineRod);for(const i of [Math.round(n*.18),Math.round(n*.46),Math.round(n*.79)]){const v=pts[i];w.decor?.add(1,...v,Math.min(2.1,pts.length*.091));}
  return pts;
}
export function bench(w,{id,name='公園長椅',x,z,y=ground(x,z),yaw=0,look,preset='park',special=false,cup=false,decor=false,receipt=null,inscription=null,l=2.05}){
  const {mat:m,batch,physics,actions,light}=w;const g=new T.Group();g.position.set(x,y,z);g.rotation.y=yaw;
  const dark=m.iron;
  for(const a of [-l*.40,l*.40]){
    for(const k of [-1,1])rod(g,dark,[a,.07,k*.25],[a,.45,k*.235],.058,G.rod);
    rod(g,dark,[a,.39,-.27],[a,.92,-.37],.044,G.rod);
    const curl=[];for(let t=0;t<=12;t++){const b=t/12*Math.PI*1.20;curl.push([a,.46+Math.sin(b)*.21,.01+Math.cos(b)*.245]);}line(g,dark,curl,.032,G.rod);
    box(g,m.bronze,a,.663,.018,.106,.05,.55);box(g,dark,a,.05,0,.16,.066,.57);
  }
  for(let i=0;i<5;i++)box(g,m.wood,0,.457,-.241+i*.113,l,.064,.107);
  for(let i=0;i<4;i++)part(g,G.box,m.wood,0,.605+i*.105,-.34-i*.031,l,.087,.075,-.241,0,0);
  box(g,m.bronze,-.25,.843,-.358,.27,.087,.043);
  for(let i=0;i<(special?8:6);i++)part(g,G.rock,m.snowProp,l*(-.47+i*.126),.973,-.443,.135+(i%3)*.022,.031+(i%2)*.016,.075,0,i,.13);
  if(special||decor){
    part(g,cushion,m.wool,-l*.29,.528,.012,.29,.084,.25,0,.15,0);
    part(g,G.box,m.wool,-l*.27,.413,.263,.48,.228,.036,.12,.021,0);
    for(let i=0;i<6;i++)box(g,m.ivory,-l*.27-.20+i*.078,.30,.277,.027,.019,.082);
  }
  if(special||decor){const X=l*.27;w.decor?.add(23,x-X*Math.cos(yaw)+.26*Math.sin(yaw),y+.49,z+X*Math.sin(yaw)+.26*Math.cos(yaw),.38);}
  if(special||cup){
    part(g,G.rod,m.dim,l*.35,.555,.105,.122,.17,.122);part(g,G.ringFine,m.cream,l*.39,.574,.106,.072,.072,.065);
    part(g,G.rod,m.wood,l*.35,.642,.105,.102,.014,.102);
  }
  if(receipt){box(g,m.ivory,-l*.03,.508,.103,.22,.013,.16,.24);}
  absorb(g,batch,true,'benches');
  physics.box(x,z,l+.04,.69,y,y+1,yaw,id);
  const ss=Math.sin(yaw),cc=Math.cos(yaw);
  const seat={x:x+ss*.27,y:y+1.15,z:z+cc*.27,look:look??[x+ss*9,y+1.4,z+cc*9],preset,exit:[x+ss*.95,z+cc*.95],id};
  actions.add(id,name,x+ss*.23,y+.85,z+cc*.23,{reach:2.45,radius:.71,hint:'坐下',seat,allowOccluded:true,action:ctx=>ctx.cam.sit(seat)});
  if(receipt)actions.add(id+'-note','遺留的便箋',x-.18*cc+ss*.28,y+.54,z+.18*ss+cc*.28,{reach:1.8,radius:.18,allowOccluded:true,hint:'閱讀',detailOf:id,textKey:receipt,action:ctx=>ctx.discovery.read(id+'-note','長椅上的便箋',receipt)});
  if(inscription)actions.add(id+'-plaque','長椅的銅牌',x-.25*cc-.334*ss,y+.843,z+.25*ss-.334*cc,{reach:1.80,radius:.141,allowOccluded:true,detailOf:id,textKey:inscription,hint:'閱讀銘牌',action:ctx=>ctx.discovery.read(id+'-plaque','長椅的銅牌',inscription)});
  if(special&&!['gazebo','hill','garden'].includes(preset))lowLantern(w,x+cc*(l*.64)+ss*.38,z-ss*(l*.64)+cc*.38,'brass',{y,s:.42,bake:.23,power:8});
  return seat;
}
export function gifts(out,m,x,y,z,r,sc=1){
  const sx=between(r,.38,1.0)*sc,sy=between(r,.32,.78)*sc,sz=between(r,.46,.86)*sc,yaw=r()*TAU;
  const g=new T.Group();g.position.set(x,y,z);g.rotation.y=yaw;const paper=pick(r,[m.red,m.wool,m.green,m.ivory,m.cream,m.wine]);const rib=paper===m.red||paper===m.wine?m.gold:r()<.4?m.red:m.glassGold;
  box(g,paper,0,sy*.5,0,sx,sy,sz);box(g,paper,0,sy*.94,0,sx*1.064,sy*.14,sz*1.058);
  box(g,rib,0,sy*.51,0,sx*.148,sy*1.044,sz*1.064);box(g,rib,0,sy*.51,0,sx*1.070,sy*1.045,sz*.135);
  for(const d of [-1,1])part(g,G.ringFine,rib,d*.12*sx,sy+.072*sc,0,.151*sc,.085*sc,.129*sc,0,.11,d*.29);
  part(g,G.smallBall,rib,0,sy+.050*sc,0,.062*sc);
  if(out.isGroup)out.add(g);else absorb(g,out,true,'gifts');
}
export function candy(out,m,x,y,z,h=1.39,yaw=0){
  const pts=[];for(let j=0;j<9;j++)pts.push([0,j/8*h*.69]);for(let i=1;i<=13;i++){const a=i/13*(Math.PI+0.13);pts.push([Math.cos(a)*.15*h-.15*h,.69*h+Math.sin(a)*.15*h]);}
  const ry=Math.sin(yaw),rx=Math.cos(yaw);
  for(let i=1;i<pts.length;i++){
    const [ax,ay]=pts[i-1],[bx,by]=pts[i];const a=[x+ax*rx,y+ay,z-ax*ry],b=[x+bx*rx,y+by,z-bx*ry];
    rod(out,i%2?m.cream:m.red,a,b,h*.051);part(out,G.smallBall,i%2?m.cream:m.red,...b,h*.051);
  }
}
export function candle(out,m,x,y,z,s=.25){part(out,G.rod,m.cream,x,y+s*.45,z,s*.41,s*.92,s*.41);part(out,G.bulb,m.candle,x+.008,y+s*1.13,z,s*.106,s*.26,s*.115);}
export function urn(w,x,z,y=ground(x,z),variant='holly',s=1){
  const {batch:o,mat:m}=w;w.decor?.add(12,x,y+1.07*s,z,.92*s);
  part(o,G.rod,m.limestone,x,y+.1*s,z,.72*s,.20*s,.72*s);part(o,railProfile,m.limestone,x,y+.17*s,z,.75*s,.68*s,.75*s);
  part(o,G.taper,m.limestone,x,y+.69*s,z,.96*s,.32*s,.96*s,0,0,Math.PI);part(o,G.rod,m.ivory,x,y+.83*s,z,1.02*s,.12*s,1.02*s);
  for(let i=0;i<14;i++){
    const a=i*2.399,f=.31+.12*Math.cos(i*4);const h=variant==='star'?.23:.22;
    part(o,G.rock,m.swiss,x+Math.cos(a)*f*s,y+(.87+h*Math.sin(i*5)**2)*s,z+Math.sin(a)*f*s,.25*s,.166*s,.21*s,0,a,0);
    if(i%3===0)part(o,G.smallBall,variant==='star'?m.wool:m.glassRed,x+Math.cos(a)*f*s,y+1.15*s,z+Math.sin(a)*f*s,.09*s,.08*s,.09*s);
    if(i%4===1)part(o,G.rock,m.snowProp,x+Math.cos(a)*f*s,y+1.10*s,z+Math.sin(a)*f*s,.18*s,.09*s,.11*s,0,a,0);
  }
}
export function shrub(w,x,z,size=1,ht=.9,trimmed=false){
  const {batch:b,mat:m}=w;const y=ground(x,z);const r=rng((x*1243+z*917)|0);
  for(let j=0;j<(trimmed?3:8);j++){
    const a=j*2.399,rad=between(r,.12,.50)*size;const xx=x+Math.cos(a)*rad,zz=z+Math.sin(a)*rad;
    part(b,trimmed?G.ico:G.rock,m.swiss,xx,y+ht*.38,zz,between(r,.38,.68)*size,between(r,.33,.59)*ht,between(r,.40,.65)*size,0,a,.2);
    if(j%3!==2)part(b,G.ico,m.snowProp,xx+.06,y+ht*between(r,.67,.82),zz-.08,between(r,.27,.45)*size,.12*ht,between(r,.24,.43)*size,0,a,.1);
    if(!trimmed&&j%2===1)part(b,G.smallBall,m.glassRed,xx,y+ht*.65,zz+.23*size,.085*size);
  }
}
export function snowman(w,x,z,s=1,yaw=0){
  const {batch:out,mat:m}=w;const y=ground(x,z);const g=new T.Group();g.position.set(x,y,z);g.rotation.y=yaw;g.scale.setScalar(s);
  w.decor?.add(22,x,y+1.04*s,z,Math.max(.28,s*.79));
  ball(g,m.snowProp,0,.45,0,.54,.52,.51);ball(g,m.snowProp,.046,1.13,.02,.40,.394,.386);ball(g,m.snowProp,.09,1.65,.025,.284,.282,.274);
  part(g,G.post,m.wine,.09,1.865,.02,.65,.054,.63,0,0,-.13);part(g,G.post,m.iron,.064,2.017,.02,.43,.34,.41,0,0,-.12);part(g,G.post,m.red,.075,1.915,.02,.436,.081,.42,0,0,-.12);
  part(g,G.ring,m.wool,.072,1.40,.032,.28,.303,.37,Math.PI/2,0,-.15);part(g,G.box,m.wool,.25,1.24,.24,.15,.40,.057,.13,.24,.24);
  for(const k of [-1,1]){ball(g,m.coal,.09+k*.086,1.70,.278,.036);rod(g,m.wood,[k*.31,1.10,.03],[k*.73,1.37,.04],.025);rod(g,m.wood,[k*.63,1.32,.04],[k*.78,1.52,.064],.016);}
  const carrot=m.carrot??(m.carrot=new T.MeshStandardNodeMaterial({color:'#c97840',roughness:.72}));part(g,G.cone,carrot,.105,1.615,.36,.105,.22,.105,Math.PI/2,0,0);
  for(let j=0;j<3;j++)ball(g,m.coal,.055,1.29-j*.19,.413+(j%2)*.016,.031);
  absorb(g,out,true,'snow family');
}
export function reindeer(out,m,x,y,z,s=1,yaw=0,lit=false){
  const g=new T.Group();g.position.set(x,y,z);g.rotation.y=yaw;g.scale.setScalar(s);const wood=lit?m.gold:m.wood;
  part(g,G.ico,wood,-.18,1.01,0,.69,.32,.27,0,0,.08);rod(g,wood,[.26,1.11,0],[.51,1.68,0],.143,G.taper);
  part(g,G.ico,wood,.67,1.66,.05,.29,.142,.155,0,0,-.14);part(g,G.smallBall,m.red,.92,1.61,.05,.066);
  for(const i of [-1,1])for(const j of [-1,1]){
    const xx=-.23+i*.41;rod(g,wood,[xx,.93,j*.19],[xx+i*.11,.48,j*.22],.072);rod(g,wood,[xx+i*.11,.48,j*.22],[xx+i*.08,.13,j*.24],.054);
    part(g,G.rod,m.coal,xx+i*.07,.069,j*.24,.137,.139,.144,0,.25,0);
  }
  for(const j of [-1,1]){
    const path=[[.62,1.77,j*.115],[.56,1.95,j*.21],[.45,2.12,j*.30],[.44,2.34,j*.39]];
    line(g,m.gold,path,.027);rod(g,m.gold,path[1],[.68,2.22,j*.21],.025);rod(g,m.gold,path[2],[.34,2.24,j*.47],.019);
    part(g,G.ico,wood,.51,1.76,j*.21,.115,.06,.10,0,j*.42,-.35);part(g,G.smallBall,m.coal,.72,1.72,j*.185,.023);
  }
  part(g,G.ring,m.red,.43,1.41,0,.151,.151,.20,Math.PI/2,.20,-.25);part(g,G.smallBall,m.glassGold,.50,1.37,.14,.056);
  if(out.isGroup)out.add(g);else absorb(g,out,true,'woodland deer');return g;
}
export function nutcracker(w,x,z,h=3.3,yaw=0){
  const y=ground(x,z);const {batch:o,mat:m}=w;const g=new T.Group();g.position.set(x,y,z);g.rotation.y=yaw;g.scale.setScalar(h/3.3);
  w.decor?.add(19,x,y+.64*h,z,h*.58);
  part(g,G.rod,m.limestone,0,.085,0,.81,.17,.81);for(const d of [-1,1]){box(g,m.coal,d*.17,.31,.055,.29,.29,.40);box(g,m.ivory,d*.16,.67,0,.19,.53,.24);box(g,m.red,d*.42,1.33,0,.159,.64,.22);ball(g,m.ivory,d*.42,1.02,.026,.091);}
  box(g,m.red,0,1.19,0,.63,.79,.41);box(g,m.gold,0,1.06,.221,.58,.096,.041);for(let j=0;j<5;j++)ball(g,m.glassGold,0,1.2+j*.088,.225,.039);
  part(g,G.post,m.ivory,0,1.90,0,.49,.65,.45);part(g,G.ico,m.cream,0,1.89,.229,.062,.069,.10);
  for(const d of [-1,1]){ball(g,m.coal,d*.115,2.01,.215,.043);part(g,G.ico,m.coal,d*.089,1.8,.238,.13,.032,.041,0,0,d*.18);}
  part(g,G.post,m.iron,0,2.43,0,.65,.72,.59);part(g,G.post,m.gold,0,2.20,0,.69,.10,.61);part(g,G.tinyStar,m.glassGold,0,2.46,.302,.135,.135,.24);
  part(g,G.rod,m.gold,.61,1.22,.072,.071,1.88,.071);part(g,G.bulb,m.filament,.61,2.20,.072,.092);
  absorb(g,o,true);
}
export function rail(w,points,{height=1.06,style='iron',physics=true,step=1.2,snow=true}={}){
  const {mat:m,batch:o}=w;
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],len=Math.hypot(b[0]-a[0],b[2]-a[2]),yaw=Math.atan2(-(b[2]-a[2]),b[0]-a[0]);if(len<.01)continue;
    const n=Math.max(1,Math.ceil(len/step));const isWood=style==='wood';const material=isWood?m.wood:m.iron;
    for(const h of isWood?[.23,.71,.98]:[.19,.91])rod(o,material,[a[0],a[1]+h*height,a[2]],[b[0],b[1]+h*height,b[2]],isWood?.058:.032,G.fineRod);
    if(snow)rod(o,m.snowProp,[a[0],a[1]+height*(isWood?1.017:.958),a[2]],[b[0],b[1]+height*(isWood?1.017:.958),b[2]],isWood?.040:.024,G.fineRod);
    for(let j=0;j<n;j++){
      const t=j/n,x=lerp(a[0],b[0],t),y=lerp(a[1],b[1],t),z=lerp(a[2],b[2],t);
      const rr=j===0?.125:isWood?.083:.031;
      part(o,isWood?G.box:G.rod,material,x,y+height*.51,z,rr*2,height*(isWood?1.08:1.04),rr*2,0,yaw,0);
      if(!isWood)part(o,G.bulb,j===0?m.bronze:m.iron,x,y+height*1.04,z,rr*.91,rr*1.62,rr*.91);
      if(j===0&&snow)part(o,G.rock,m.snowProp,x,y+height*1.105,z,rr*1.42,rr*.45,rr*1.31,0,yaw,0);
    }
    if(physics)w.physics.box((a[0]+b[0])/2,(a[2]+b[2])/2,len,.12,Math.min(a[1],b[1]),Math.max(a[1],b[1])+height,yaw,'railing');
  }
}
export function arch(w,x,z,{y=ground(x,z),width=18,h=7,gate=false}={}){
  const {batch:o,mat:m,light,physics}=w;const color=m.iron;
  w.decor?.add(2,x,y+h*.89,z,Math.max(2.5,width*.29));
  for(const d of [-1,1]){
    const xx=x+d*width*.5;
    for(const [Y,W,H,D,M] of [[.22,1.50,.44,1.48,m.limestone],[.63,1.28,.53,1.32,m.limestone],[1.83,.98,2.4,1.03,m.limestone],[3.32,1.22,.26,1.22,m.limestone],[3.55,1.51,.19,1.48,m.limestone],[3.68,1.48,.12,1.45,m.snowProp]]){
      if(!gate&&Y>1){part(o,railProfile,color,xx,y+.42,z,.52,3.65,.51,0,0,0,null,true);break;}else box(o,M,xx,y+Y,z,W,H,D,0,null,true);
    }
    if(gate){lantern(o,m,xx,y+4.43,z,1.2);light.add(xx,y+4.4,z,{power:70,distance:17,glow:1.5,bake:.67,radius:12});}
    if(gate)wreath(o,m,xx,y+2.40,z+.54,.52);else wreath(o,m,xx,y+2.55,z+.13,.39);
    physics.box(xx,z,gate?1.2:.5,gate?1.2:.5,y,y+4,0,'arch');
  }
  const pts=[];
  for(let i=0;i<=72;i++){
    const t=i/72,xx=x+(t-.5)*width,yy=y+(gate?3.28:3.64)+(h-(gate?3.28:3.64))*Math.sin(Math.PI*t)**.68;pts.push([xx,yy,z]);
    part(o,G.bulb,i%4===0?m.amber:m.filament,xx,yy+.12,z+.015,.069,.085,.07);
    if(i%8===4){const a=gate?.74:.58;rod(o,color,[xx,yy+.06,z],[xx,yy-a,z],.017);part(o,G.tinyStar,m.amber,xx,yy-a,z,.195,.195,.285,0,.25,0);light.halo(xx,yy-a,z,.47,'#ffc58b',.20);}
    if(i%3===0&&i>0){const to=y+(gate?3.08:3.40)+(h-.64-(gate?3.08:3.40))*Math.sin(Math.PI*t)**.68;rod(o,color,[xx,yy,z],[xx,to,z],.041);}
  }
  line(o,color,pts,.081,G.rod);line(o,color,pts.map(([x,y,z])=>[x,y-.29,z]),.060,G.rod);
  swag(o,m,pts.filter((_,i)=>i%2===0),true,true,.124);
  if(gate){const s=signTexture('WINTER GARDENS','SOUTH GATE',{w:768,h:154});box(o,m.iron,x,y+h-.19,z,4.84,1.01,.115);part(o,G.plane,s,x,y+h-.19,z+.062,4.74,.91,1);part(o,G.plane,s,x,y+h-.19,z-.062,4.74,.91,1,0,Math.PI,0);}
}
export function pathLights(w){
  for(let i=0;i<8;i++)for(const d of [-1,1])lamp(w,d*(8.13+(i>6?.65:0)),48+i*22.3+(d<0?3.3:0),{wreath:i%2===0,yaw:d===1?.31:-.31,power:49});
  for(const j of [82,130,176])arch(w,.15,j,{width:18.4,h:j===130?7.3:6.85});
  for(const p of w.paths){
    if(p.id==='main'||p.id.startsWith('ice'))continue;const step=Math.max(4,Math.round((p.width>3.75?19:10)/1.85));
    for(let i=3;i<p.points.length-2;i+=step){
      const a=p.points[i-1],b=p.points[i+1],v=p.points[i],mag=Math.hypot(b.x-a.x,b.z-a.z),d=i%2===0?1:-1;
      const xx=v.x-d*(b.z-a.z)/mag*(p.width*.5+.68),zz=v.z+d*(b.x-a.x)/mag*(p.width*.5+.68);
      if(pondEdgeApprox(xx,zz)<1.02||w.physics.blocked(xx,zz,ground(xx,zz),.42))continue;
      if(p.kind==='stone'&&i%3===0)lamp(w,xx,zz,{h:3.9,s:.9,wreath:false});else lowLantern(w,xx,zz,p.kind==='gravel'?'paper':'iron',{post:p.width>3.9?.51:.24});
    }
  }
}
const pondEdgeApprox=(x,z)=>Math.hypot((x-layout.pond.x)/layout.pond.rx,(z-layout.pond.z)/layout.pond.rz);
export function bin(w,x,z,yaw=0){const {batch:o,mat:m}=w;const y=ground(x,z);part(o,G.post,m.green,x,y+.48,z,.53,.89,.53,0,yaw,0);part(o,G.post,m.iron,x,y+.945,z,.60,.118,.60);
  part(o,G.post,m.snowProp,x,y+1.016,z,.48,.047,.48);for(let i=0;i<8;i++){const a=i/8*TAU;part(o,G.rod,m.iron,x+Math.cos(a)*.272,y+.51,z+Math.sin(a)*.272,.036,.81,.036);}w.physics.cylinder(x,z,.29,y,y+1.01,'bin');}
export function waterFountain(w,x,z){const {batch:o,mat:m}=w;const y=ground(x,z);part(o,railProfile,m.limestone,x,y,z,.47,.94,.47);part(o,G.cap,m.bronze,x,y+.92,z,.56,.22,.56,Math.PI,0,0);part(o,G.disk,m.iron,x,y+1.04,z,.46,.06,.46);rod(o,m.gold,[x-.11,y+1,z],[x-.11,y+1.17,z+.08],.029);w.physics.cylinder(x,z,.32,y,y+1.17,'fountain');}
export function marker(w,x,z,name,sub,yaw=0,id='map',wide=false,text=null){
  const {batch:o,mat:m,physics,actions}=w;const y=ground(x,z),s=wide?1.63:1,cs=Math.cos(yaw),ss=Math.sin(yaw);
  const ge=G.plane;
  const sign=signTexture(name,sub,{w:wide?728:512,h:wide?300:130,font:'ParkSans, Georgia, serif'});
  for(const a of wide?[-.89,.89]:[-.49]){
    part(o,G.taper,m.wood,x+a*cs*s,y+1.13*s,z-a*ss*s,.152*s,2.26*s,.159*s,0,yaw,0,null,true);
    part(o,G.rock,m.snowProp,x+a*cs*s,y+2.27*s,z-a*ss*s,.14*s,.06*s,.136*s);
  }
  box(o,m.wood,x,y+1.57*s,z,1.64*s,.64*s,.136*s,yaw,null,true);
  part(o,ge,sign,x+.075*s*ss,y+1.57*s,z+.075*s*cs,1.58*s,.594*s,1,0,yaw,0);
  box(o,m.snowProp,x,y+1.906*s,z,1.67*s,.059,.143*s,yaw);
  physics.box(x,z,1.67*s,.15*s,y,y+2.14*s,yaw,'sign');
  actions.add(id,name,x,y+1.57*s,z,{radius:.62*s,hint:text?'閱讀':'打開園區地圖',allowOccluded:true,action:ctx=>text?ctx.discovery.read(id,name,text):ctx.ui.toggle('map')});
}
export function makePondFlag(w,x,z,yaw=0){marker(w,x,z,'小心薄冰','THIN ICE · KEEP TO PATH',yaw,'pond-warning',false,'池邊的白色薄冰不承重。橋上可以聽見水從冰下流過。');}
export function facilityDecor(w){
  const r=rng(321861);let literarySeat=0;
  for(const [i,p] of w.paths.entries()){
    if(['main','lanternTrail','rangerPath','toyPath','fire','quietPath','lakeQuiet','cottagePath','marketLink','bridgeAccess'].includes(p.id))continue;
    for(let j=4;j<p.points.length-3;j+=p.id==='pondAccess'?8:11){
      const a=p.points[j-1],b=p.points[j+1],v=p.points[j],dd=Math.hypot(b.x-a.x,b.z-a.z),d=(i+j)%2?1:-1,dx=-d*(b.z-a.z)/dd,dz=d*(b.x-a.x)/dd,off=p.width/2+1.0;
      const x=v.x+dx*off,z=v.z+dz*off;const y=ground(x,z);if(pondEdgeApprox(x,z)<1.055||Math.hypot((x-layout.rink.x)/(layout.rink.rx+2),(z-layout.rink.z)/(layout.rink.rz+2))<1||w.physics.blocked(x,z,y,.95))continue;
      if(j%3===0)bin(w,x,z);else {
        const text= literarySeat++;
        bench(w,{id:`park-seat-${i}-${j}`,x,z,y,yaw:Math.atan2(-dx,-dz),cup:r()<.35,receipt:w.content.notes[text % w.content.notes.length],inscription:w.content.plaques[text]??null});
      }
    }
    const id=p.id;const a=p.points[Math.min(7,p.points.length-1)];const sign=(id==='pondAccess'?'鏡雪池塘':id==='market'?'聖誕市集':id==='west'?'林間雪地草坪':id==='woodland'?'松間步道':id==='ice'?'戶外溜冰場':'園區步道');const x=a.x+4.4,z=a.z+3.3,y=ground(x,z);
    if(pondEdgeApprox(x,z)>1.05&&!w.physics.blocked(x,z,y,1))marker(w,x,z,sign,'WINTER GARDENS',.18,'guide-'+id);
  }
  const mapLoc=[[-7.8,207,.13],[16,37,-.29],[-121,143,0],[99,-95,.4],[106,22,-.14],[-12,-124,0]];
  for(const [i,[x,z,yaw]] of mapLoc.entries())marker(w,x,z,'冬夜公園 · 導覽圖','WINTER GARDENS • PARK MAP',yaw,`map-${i}`,true);
  for(const [x,z] of [[9.5,190],[-35,21],[109,-89],[148,28]])waterFountain(w,x,z);
  for(let z=66;z<208;z+=14.3){for(const d of [-1,1]){
    const x=d*(9.7+between(r,0,.9));if(w.physics.blocked(x,z,ground(x,z),.82))continue;
    if(z%3>1.5)bin(w,x,z+1);else bench(w,{id:'ave-'+d+'-'+Math.round(z),x,z,yaw:d===1?-Math.PI/2:Math.PI/2});
  }}
}
export function siteVignettes(w){
  const {batch:o,mat:m,light,physics,actions}=w;const r=rng(7837);
  for(let i=0;i<52;i++){const a=r()*TAU,rr=between(r,6.9,10.45),x=Math.cos(a)*rr,z=Math.sin(a)*rr;gifts(o,m,x,.24,z,r,between(r,.72,1.42));if(i%3===0)w.decor.add(16,x,.68,z,.75,'tree island');}
  for(let i=0;i<12;i++){
    const a=i/12*TAU;const x=Math.cos(a)*13.9,z=Math.sin(a)*13.9;
    if(i%2===0)lowLantern(w,x,z,'ice',{post:.067,power:14,bake:.36});
    else if(i%3===1){candy(o,m,x,ground(x,z),z,1.75,a);w.decor.add(15,x,ground(x,z)+1.27,z,.83);}
  }
  nutcracker(w,-6.5,31,3.65,.13);nutcracker(w,6.5,31,3.5,-.13);
  for(const [x,z] of [[-10,24],[10,24],[-26,20],[26,20],[27,55],[-12,196],[-40,1]])urn(w,x,z,ground(x,z),'star',1.04);
  const deerPos=[[-23,19,1.28],[24,15,-1.26],[108,-119,.48],[112,-118,.21]];
  for(const [i,[x,z,yaw]] of deerPos.entries()){
    const D=new T.Group();const g=reindeer(D,m,0,0,0,1.2,yaw);D.position.set(x,ground(x,z),z);D.visible=true;w.dynamicGroup(D,23);w.decor.add(20,x,ground(x,z)+1.4,z,1.34);
    let t=-9;w.anim.push((dt,tt)=>{if(tt-t<1.8)g.rotation.z=Math.sin((tt-t)*Math.PI/1.8)*.12;else g.rotation.z=0;});
    actions.add('deer-'+i,'木雕馴鹿',x,ground(x,z)+1.16,z,{radius:.73,hint:'輕碰頸鈴',action:ctx=>{t=ctx.now();ctx.audio.chime('soft');}});
  }
  for(const [x,z,n] of [[-106,9,3],[-18,187,2],[74,93,2],[32,50,1],[126,143,2],[-162.8,132.2,1]])for(let i=0;i<n;i++)snowman(w,x+(i-.6)*1.65,z+i*.82,1.12-i*.24,i*.44-.2);
  makeTreeAsset(o,m,30,ground(30,50),50,3.4,853);makeTreeAsset(o,m,-18,ground(-18,194),194,4,371,1);
  for(const [x,z] of [[-19,51],[-16,62],[22,51],[-12,57],[20,55],[-10,47]] )shrub(w,x,z,1.46,.91);
  const random=rng(152938);
  for(let i=0;i<420;i++){
    const x=between(random,-216,216),z=between(random,-216,216);if(w.pathAt(x,z).edge<.56||!w.vegetation.grid.at(x,z).length||pondEdgeApprox(x,z)<1.1||Math.hypot(x,z)<44)continue;
    const a=random()*TAU,y=ground(x,z),s=between(random,.40,1.55);
    part(o,G.rock,m.limestone,x,y+.18,z,1.21*s,.49*s,.69*s,0,a,.17);
    part(o,G.rock,m.snowProp,x+.07,y+.35*s,z+.12,1.07*s,.325*s,.58*s,0,a,-.08,random()<.45?'#d6d0c8':null);
    if(i%7===0)shrub(w,x+1.2,z+.75,s,.6+random()*.4);
  }
}
