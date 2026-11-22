import {candleArch} from './seasonal.js';
import * as T from 'three/webgpu';
import {positionLocal,uniform,vec3,sin,smoothstep,mix,uv} from 'three/tsl';
import {G,box,ball,part,rod,compact,bevelBox,signTexture} from './mesh.js';
import {wreath,lantern,candle,gifts,swag} from './props.js';
import {makeTreeAsset} from './vegetation.js';
import {TAU,between,damp,rng,smooth} from './math.js';
import {jacquard} from './materials/rug.js';

const bUnit=bevelBox(1,1,1,.068);
function orbLamp(g,m,x,y,z){
  part(g,G.rod,m.gold,x,y+.063,z,.25,.125,.25);part(g,G.smallBall,m.iceglass,x,y+.326,z,.13,.238,.128);
  part(g,G.bulb,m.filament,x,y+.28,z,.045,.125,.040);part(g,G.cap,m.bronze,x,y+.537,z,.26,.138,.26);
  part(g,G.ringFine,m.bronze,x+.108,y+.22,z,.128,.165,.158);
}
function sideTable(g,m,x,z,yaw=.0,r=.55){
  part(g,G.rod,m.wood,x,.076,z,r*1.02,.14,r*1.01);part(g,G.taper,m.wood,x,.395,z,.135,.61,.135);
  part(g,G.rod,m.plank,x,.709,z,r*1.57,.122,r*1.49,0,yaw,0);part(g,G.rod,m.iron,x,.632,z,r*1.46,.042,r*1.42);
  candle(g,m,x-.19,.77,z+.075,.235);part(g,G.rod,m.cream,x+.12,.874,z+.07,.174,.207,.167);part(g,G.rod,m.wood,x+.12,.982,z+.07,.143,.022,.142);
  part(g,G.ringFine,m.ivory,x+.214,.889,z+.071,.105,.09,.095);
  part(g,G.rod,m.ivory,x+.025,.793,z-.16,.294,.022,.291);for(let i=0;i<4;i++)part(g,G.rod,m.wood,x+.032+(i%2)*.075-.05,.819,z-.18+(i>1?.064:-.039),.086,.027,.084,0,i*.31,0);
}
function couch(out,m,room,x,z,yaw,label,id,two=true){
  const g=new T.Group();g.position.set(x,0,z);g.rotation.y=yaw;out.add(g);
  const L=two?2.16:1.16,b=two?m.wool:m.velvet;
  for(const a of [-1,1])for(const d of [-1,1])part(g,G.taper,m.wood,a*L*.392,.181,d*.295,.139,.22,.139,0,0,d*.14);
  part(g,bUnit,b,0,.367,0,L,.289,.910);
  part(g,bUnit,b,0,.784,-.397,L*.99,.77,.256,-.13,0,0);
  for(const a of [-1,1]){
    part(g,bUnit,b,a*L*.434,.617,0,.274,.393,.897,.033,0,-a*.047);
    part(g,G.rod,m.wood,a*L*.45,.819,.15,.267,.067,.62,0,0,-a*.12);
  }
  for(let i=0;i<(two?2:1);i++)part(g,bUnit,two?m.wool:m.velvet,two?(i-.5)*L*.373:0,.543,.035,L*(two?.365:.675),.174,.689,.021);
  part(g,bUnit,m.ivory,-L*.26,.861,-.247,.39,.41,.18,-.15,.17,-.26);
  if(two)part(g,bUnit,m.green,L*.254,.808,-.286,.406,.32,.181,-.26,-.25,.24);
  // Woven throw goes over the cushion and drops in soft folds instead of
  // ending in two rectangular blocks. Width and hem vary continuously.
  const throwGeom=new T.BufferGeometry(),xx=[],uu=[],ix=[];
  for(let j=0;j<=18;j++)for(let k=0;k<=14;k++){
    const v=j/18,u=k/14,pleat=Math.sin(u*21+.71*v)+.25*Math.sin(u*39-v*6),drop=smooth(.58,1,v);
    xx.push(L*.19+(u-.5)*.43+.038*Math.sin(v*2.1)*u,.652-.312*drop+pleat*(.008+.022*drop)+.014*Math.sin(v*Math.PI),-.084+.64*Math.sin(v*1.49)+.023*drop*pleat);
    uu.push(u,v);const i=j*15+k;if(j&&k)ix.push(i-16,i-1,i-15,i-15,i-1,i);
  }
  throwGeom.setIndex(ix);throwGeom.setAttribute('position',new T.Float32BufferAttribute(xx,3));throwGeom.setAttribute('uv',new T.Float32BufferAttribute(uu,2));throwGeom.computeVertexNormals();
  part(g,throwGeom,m.blanket,0,0,0);
  const rY=room.y,cs=Math.cos(yaw),ss=Math.sin(yaw);
  const p=room.world(x+ss*.16,1.04,z+cs*.16),pos=room.world(x+ss*.225,1.15,z+cs*.225),tgt=room.world(x+ss*5,1.30,z+cs*5),ei=room.world(x+ss*.99,.09,z+cs*.99);
  const seat={x:pos[0],y:pos[1],z:pos[2],look:tgt,exit:[ei[0],ei[2]],preset:'hearth',id,room:room.id};
  const c=room.world(x,0,z);room.worldRef.physics.box(c[0],c[2],L,.93,rY,rY+1.18,room.yaw+yaw,id);
  room.worldRef.actions.add(id,label,...p,{reach:2.45,radius:.72,room:room.id,allowOccluded:true,hint:'坐下',seat,action:ctx=>ctx.cam.sit(seat)});
}
function fireplace(w,room,g,x,z,classic){
  const {mat:m,actions,light}=w;
  const o=new T.Group();o.position.set(x,.10,z);g.add(o);const back=-.297,width=classic?2.54:1.39;
  if(classic){
    box(o,m.brick,0,1.03,back,width,2.06,.59);box(o,m.limestone,0,.02,.21,width*1.075,.095,1.119);
    box(o,m.coal,0,.44,.009,1.13,.84,.132);box(o,m.limestone,0,.105,.295,1.36,.183,.657);
    for(const i of [-1,1])box(o,m.brick,i*.725,.462,.16,.445,.923,.492);
    const arch=[];for(let j=0;j<=12;j++){
      const a=j/12*Math.PI,xx=Math.cos(a)*.681,yy=.54+Math.sin(a)*.42;part(o,G.box,m.brick,xx,yy,.318,.237,.312,.31,0,0,a-Math.PI/2);arch.push([Math.cos(a)*.568,.56+Math.sin(a)*.332,.49]);
    }
    for(let k=1;k<arch.length;k++)rod(o,m.gold,arch[k-1],arch[k],.018,G.fineRod);
    box(o,m.wood,0,1.25,.076,2.73,.16,.85);box(o,m.ivory,0,1.344,.086,2.80,.054,.94);
    wreath(o,m,0,1.83,.057,.385,0,1);
  }else{
    part(o,bUnit,m.coal,0,.576,0,1.44,1.05,.89);
    box(o,m.iron,0,.64,.455,1.33,.72,.155);box(o,m.coal,0,.61,.548,1.06,.63,.056);
    part(o,G.rod,m.coal,0,1.89,-.12,.27,1.56,.28);
    for(const h of [1.62,2.07,2.63])part(o,G.rod,m.bronze,0,h,-.12,.307,.05,.307);
    box(o,m.limestone,0,.02,.15,1.75,.091,1.40);
    for(const a of [-1,1])rod(o,m.bronze,[a*.53,.125,.25],[a*.54,.50,.25],.07);
    orbLamp(o,m,.44,1.10,.06);
  }
  const dr=rng(912+room.id.charCodeAt(0));
  for(let i=0;i<6;i++){
    const a=dr()*TAU,zz=(classic?.30:.540);rod(o,m.wood,[Math.cos(a)*.3,.16+dr()*.085,zz+Math.sin(a)*.10],[-Math.cos(a)*.30,.21+dr()*.15,zz+Math.sin(a)*.22],.068,G.rod);}
  const fP=room.world(x,.65,z+(classic?.32:.57)),clock=uniform(0);
  const fMat=new T.MeshBasicNodeMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,name:'Hearth flame gradient'});
  const ky=positionLocal.y.mul(.77).add(.51).clamp(0,1);
  fMat.colorNode=mix(vec3(4.0,1.12,.25),vec3(1.93,.23,.024),smoothstep(.12,.99,ky));
  fMat.positionNode=positionLocal.add(vec3(sin(clock.mul(4.4).add(positionLocal.y.mul(4))).mul(ky.pow(2)).mul(.15),sin(clock.mul(4.7)).mul(ky.pow(2)).mul(.13),sin(clock.mul(3.8)).mul(ky).mul(.091)));
  fMat.opacityNode=smoothstep(.08,.34,ky).mul(smoothstep(1,.62,ky)).mul(.89);
  const shape=new T.LatheGeometry([[0,-.69],[.51,-.49],[.65,-.17],[.51,.06],[.32,.34],[.18,.52],[.037,.81],[0,.92]].map(p=>new T.Vector2(...p)),9);
  const fx=new T.Group();fx.position.set(x,0,z+(classic?.30:.56));const flames=[];for(let i=0;i<11;i++){
    const a=i*2.4,sc=between(dr,.17,.52),F=part(fx,shape,fMat,Math.cos(a)*.212,.29+sc*.23,Math.sin(a)*.065,sc*.48,sc,sc*.155,0,a,Math.sin(a)*.25);F.userData.orig=sc;flames.push(F);
  }
  const sparks=new T.InstancedMesh(G.bulb,m.amber,21);sparks.frustumCulled=false;fx.add(sparks);
  const tmp=new T.Object3D();g.parent.add(fx); // dynamic flame siblings are not merged with static furnishings
  const id=room.id+'-fire';
  light.add(...fP,{power:15,radius:1.8,bake:0,distance:7.9,glow:0,kind:'fire',color:'#ffa463',active:()=>room.fireOn&&w.inside?.id===room.id});
  const interact=room.world(x,1.19,z+.63);
  actions.add(id,classic?'紅磚壁爐':'鑄鐵柴火爐',...interact,{room:room.id,reach:2.35,radius:.59,hint:'熄滅爐火',allowOccluded:true,action:(ctx,a)=>{room.fireOn=!room.fireOn;fx.visible=room.fireOn;a.hint=room.fireOn?'熄滅爐火':'點起爐火';ctx.audio.chime('soft');}});
  w.anim.push((dt,t,pos,s)=>{if(!room.content.visible)return;clock.value=s.reduced?t*.29:t;fx.visible=room.fireOn;if(!room.fireOn)return;
    for(let i=0;i<flames.length;i++)flames[i].scale.y=flames[i].userData.orig*(.91+Math.sin(t*(2.8+i*.094)+i)*(s.reduced?.042:.17));
    for(let i=0;i<sparks.count;i++){const a=i*2.4,tt=(i*.12+t*(.45+(i%7)*.042))%1;tmp.position.set(Math.cos(a)*(.063+tt*.23),.25+tt*.91,Math.sin(a)*(.093+tt*.11));tmp.scale.setScalar(.019*(1-tt)*Math.sin(tt*Math.PI));tmp.updateMatrix();sparks.setMatrixAt(i,tmp.matrix);}sparks.instanceMatrix.needsUpdate=true;
  });
  if(classic){
    for(const i of [-1,1]){const xx=i*.82;box(o,i===1?m.cream:m.red,xx,1.195,.487,.173,.142,.083);box(o,m.wool,xx,1.021,.517,.153,.31,.084);box(o,m.wool,xx+.065,.909,.52,.244,.10,.086);candle(o,m,xx,1.38,.22,.24);}
  }
  const base=room.world(x,0,z);w.physics.box(base[0],base[2],width,classic?1.17:.88,room.y,room.y+(classic?2.08:1.11),room.yaw,id);
}
export function interiors(w){
  const hearthRug=jacquard(w.mat.wool);
  for(const room of w.cabins){
    if(!room.enter)continue;
    const {mat:m,actions,light,physics}=w;const xw=room.w/2,zd=room.d/2,hy=room.H,seed=rng(55892+room.x*81+room.z*149);
    const cell=new T.Group();cell.name=room.id+' interior cell';room.frame.add(cell);room.content=cell;room.worldRef=w;
    const add=(type,x,y,z,size)=>w.decor.add(type,...room.world(x,y,z),size);
    const fixed=new T.Group(),festive=new T.Group();cell.add(fixed);room.festiveOn=true;const classic=room.id==='santa',toys=room.id==='toys',green=room.id==='glass',ranger=room.id==='ranger';
    if(!green)box(fixed,m.ceiling,0,hy-.064,0,room.w-.16,.139,room.d-.20);
    for(let i=0;i<7;i++){
      const z=(i/6-.5)*(room.d-.44);box(fixed,green?m.green:m.ceiling,0,hy-.14,z,room.w-.17,.24,.19);
      if(i%2===1){for(let j=0;j<19;j++){const x=(j/18-.5)*(room.w-.566),y=hy-.276-.115*Math.sin(j/18*Math.PI);
        rod(fixed,m.iron,[x,y+.05,z],[x,y-.061,z],.013,G.fineRod);part(festive,G.smallBall,j%4===2?m.amber:m.fairy,x,y-.063,z,.020,.029,.020);}}
    }
    for(let i=0;i<24;i++){
      const zz=(i/23-.5)*(room.d-.24);box(fixed,m.plank,0,.102,zz,room.w-.18,.028,room.d/24-.023,0);
    }
    // Woven rugs, border embroidery and individual knot fringe.
    const runner=classic?hearthRug:green?m.velvet:m.wool;
    box(fixed,runner,-.17,.127,.20,room.w*.48,.023,room.d*.51,.024);
    for(const d of [-1,1]){
      box(fixed,m.ivory,-.17+d*room.w*.221,.141,.20,.033,.014,room.d*.49,.024);
      for(let j=0;j<24;j++){const xx=(j/23-.5)*room.w*.44-.16,zz=.20+d*room.d*.256;rod(fixed,m.ivory,[xx,.142,zz-d*.033],[xx+Math.sin(j*3.2)*.025,.135,zz+d*.080],.008,G.fineRod);}
    }
    const fx=classic?-.91:toys?xw*.58:-xw*.52, fz=-zd+.66;
    fireplace(w,room,fixed,fx,fz,classic);
    if(!green){
      const x=xw-1.32,z=-zd+1.15;
      if(toys){ // workbench and oval toy railway
        box(fixed,m.wood,x,.897,z,1.98,.15,.85);
        for(const a of [-1,1])for(const b of [-1,1])box(fixed,m.wood,x+a*.79,.453,z+b*.32,.15,.90,.129);
        const railroad=new T.Group();railroad.position.set(x,1.01,z);cell.add(railroad);
        for(let j=0;j<30;j++){const a=j/30*TAU;part(fixed,G.box,m.iron,x+Math.cos(a)*.73,.985,z+Math.sin(a)*.24,.15,.032,.059,0,-a,0);}
        box(railroad,m.red,.01,.09,0,.19,.125,.13);part(railroad,G.rod,m.coal,.056,.172,0,.057,.095,.057);
        for(const a of [-1,1])for(const b of [-1,1])part(railroad,G.rod,m.gold,a*.065,.034,b*.066,.071,.032,.070,Math.PI/2,0,0);
        w.anim.push((dt,t)=>{railroad.position.set(x+Math.cos(t*.64)*.73,1.018,z+Math.sin(t*.64)*.24);railroad.rotation.y=-t*.64-Math.PI/2;});
        makeTreeAsset(fixed,m,x,1.047,z,.66,855);add(27,x,1.149,z,.80);add(0,x,1.31,z,.62);
        for(let i=0;i<7;i++){part(fixed,G.box,i%2?m.red:m.plank,x-.75+i*.17,1.159,z+.17,.121,.18,.083,0,i*.47,0);}
      }else{makeTreeAsset(fixed,m,x,.13,z,classic?2.39:1.93,Math.floor(seed()*1000),0);add(0,x,1.12,z,1.62);add(17,x,.93,z+.39,.44);add(16,x,.31,z+.57,.52);for(let j=0;j<8;j++){const a=j*2.4;gifts(fixed,m,x+Math.cos(a)*(.54+j*.033),.122,z+Math.sin(a)*(.55+j*.025),seed,.56);}}
    }else{
      for(const d of [-1,1])for(let j=0;j<6;j++){
        const z=(j/5-.5)*(room.d-1.7);const x=d*(xw-.52);part(fixed,G.cap,m.red,x,.271,z,.406,.406,.42,0,0,Math.PI);
        if(j%2===0){
          for(let k=0;k<7;k++){const a=k*TAU/7;part(fixed,G.rock,m.green,x+.18*Math.cos(a),.525,z+.18*Math.sin(a),.16,.055,.09,0,-a,-.29);part(fixed,G.rock,m.red,x+.15*Math.cos(a),.691,z+.15*Math.sin(a),.157,.043,.086,0,-a,.10);}
          part(fixed,G.ico,m.gold,x,.729,z,.056,.038,.056);add(13,x,.69,z,.60);continue;
        }
        for(let k=0;k<7;k++){
          const a=k*2.4;part(fixed,G.rock,m.swiss,x+Math.cos(a)*.21,.57,z+Math.sin(a)*.22,.17,.19,.15,0,a,.39);part(fixed,G.rock,k%3?m.wool:m.ivory,x+Math.cos(a)*.25,.74,z+Math.sin(a)*.28,.17,.076,.16,0,a,.21);
        }
      }makeTreeAsset(fixed,m,xw-.93,.133,-zd+.82,1.8,839);add(0,xw-.93,1.03,-zd+.82,1.01);
    }
    const y=room.y;let seatX=-xw+.93,seatZ=1.45,seatYaw=Math.PI/2-.24;
    if(classic){seatX=-xw+.88;seatZ=.51;seatYaw=Math.PI/2+.30;}
    if(ranger){seatX=xw-1.0;seatZ=.97;seatYaw=-Math.PI/2+.12;}
    couch(fixed,m,room,seatX,seatZ,seatYaw,classic?'聖誕老人留下的沙發':ranger?'窗邊雙人沙發':green?'花房扶手椅':'爐邊扶手椅',room.id+'-seat',classic||ranger);
    const tbx=seatX+(seatX<0?.62:-.62),tbz=seatZ+1.12;sideTable(fixed,m,tbx,tbz);const tbp=room.world(tbx,.12,tbz);physics.cylinder(tbp[0],tbp[2],.44,y,y+.77,'tea table');
    if(classic){
      // Personal scale against the deep room: low tea table, one book and a
      // mended rug below, with room left for the sofa's stand-up transition.
      const x=-1.38,z=.29;
      part(fixed,bUnit,m.plank,x,.592,z,.86,.086,1.27,0,.085,0);
      for(const a of [-1,1])for(const b of [-1,1])part(fixed,G.taper,m.wood,x+a*.296,.319,z+b*.453,.091,.47,.092,0,0,a*.118);
      for(const d of [-1,1])rod(fixed,m.wood,[x-.29,.26,z+d*.45],[x+.32,.26,z+d*.45],.026,G.fineRod);
      part(fixed,G.box,m.wool,x-.21,.646,z+.30,.267,.035,.332,0,.17,0);
      part(fixed,G.box,m.cream,x-.21,.661,z+.30,.253,.017,.322,0,.17,0);
      part(fixed,G.box,m.green,x-.24,.676,z+.312,.261,.024,.324,0,.25,0);
      part(fixed,G.rod,m.ivory,x+.11,.646,z-.171,.27,.022,.26);
      part(fixed,G.cap,m.bronze,x+.11,.768,z-.171,.161,.21,.211);
      part(fixed,G.ringFine,m.iron,x+.253,.768,z-.171,.12,.09,.103);
      candle(fixed,m,x-.13,.652,z-.48,.245);
      add(6,x-.13,.86,z-.48,.32);
      const tea=room.world(x,0,z);physics.box(tea[0],tea[2],.89,1.25,y,y+.65,room.yaw+.085,'hearth tea table');
      const bx=fx-1.51,bz=fz+.62;
      part(fixed,G.rod,m.bronze,bx,.294,bz,.539,.32,.49);
      for(let j=0;j<7;j++){
        const u=j*.15;rod(fixed,m.wood,[bx+Math.sin(u*17)*.14,.25,bz+.12],[bx+Math.sin(u*9)*.17,.63-u*.13,bz-.21],.058,G.rod);
      }
      part(fixed,G.ringFine,m.iron,bx,.488,bz,.50,.48,.50,0,.38,0);
    }
    const sx=room.w*.19,sz=zd-.192,sy=1.44;
    box(fixed,m.wood,sx,sy,sz,.354,.455,.085);
    box(fixed,m.bronze,sx,sy,sz-.05,.223,.284,.048);
    part(festive,G.bulb,m.amber,sx,sy+.066,sz-.084,.052,.063,.048);
    const sw=room.world(sx,sy,sz-.14);
    actions.add(room.id+'-strings','門邊的彩燈開關',...sw,{room:room.id,reach:2.36,radius:.24,hint:'關閉彩燈',allowOccluded:true,action:(ctx,a)=>{room.festiveOn=!room.festiveOn;a.hint=room.festiveOn?'關閉彩燈':'打開彩燈';ctx.audio.chime('soft');}});
    const strings=compact(festive);strings.name=room.id+' ceiling lights';cell.add(strings);
    const lx=classic?xw-.71:-xw+.46,lz=classic?.33:-zd+1.63;
    const cabinet=new T.Group();cabinet.position.set(lx,0,lz);cabinet.rotation.y=classic?-Math.PI/2:Math.PI/2;fixed.add(cabinet);
    box(cabinet,m.wood,0,.795,-.035,1.35,1.41,.50);box(cabinet,m.plank,0,1.477,-.012,1.46,.10,.62);
    for(let i=0;i<10;i++)box(cabinet,i%3===0?m.wool:i%3===1?m.green:m.ivory,-.548+i*.121,1.275,.251,.093,.256-(i%3)*.04,.159,i*.026);
    for(let j=0;j<2;j++){box(cabinet,m.bronze,-.34+.68*j,.723,.232,.58,.611,.068);part(cabinet,G.smallBall,m.glassGold,-.15+.30*j,.77,.296,.036);}
    const lathe=new T.LatheGeometry([[0,0],[.145,0],[.124,.16],[.074,.305],[.32,.44],[.351,.51],[.359,.54],[.264,.55]].map(p=>new T.Vector2(...p)),14);
    part(cabinet,lathe,m.gold,-.23,1.49,.034,.58,.57,.59,.3,-.5,.56);part(cabinet,G.rod,m.coal,-.24,1.549,.117,.34,.041,.344);
    const ph=room.world(lx,1.46,lz+(classic?.22:.315));add(28,lx,1.69,lz,.62);
    actions.add(room.id+'-music','木櫃上的音樂盒',...ph,{room:room.id,reach:2.44,radius:.40,hint:'播放旋律',allowOccluded:true,action:(ctx,a)=>{room.recordOn=!room.recordOn;a.hint=room.recordOn?'停止旋律':'播放旋律';ctx.audio.toggleCabin(room);}});
    if(!green){
      const z=zd-.245,xx=1.96;box(fixed,m.green,xx,1.98,z,1.02,.68,.136);box(fixed,m.gold,xx,1.98,z-.081,.94,.60,.036);
      const pg=new T.Group();pg.position.set(xx,1.98,z-.116);cell.add(pg);
      const mini=[];for(let j=0;j<24;j++){const xs=(j%6-2.5)*.141,ys=(Math.floor(j/6)-1.5)*.133;box(pg,m.wood,xs,ys,.0,.111,.109,.037);const q=box(pg,m.amber,xs,ys,-.027,.085,.083,.034);q.visible=false;mini.push(q);}
      room.calendarWindows=mini;add(26,xx,1.98,z-.16,1.02);const p=room.world(xx,1.98,z-.229);
      actions.add(room.id+'-calendar','倒數日曆',...p,{room:room.id,reach:2.18,radius:.53,hint:'打開一扇小窗',allowOccluded:true,action:ctx=>{room.calendar=(room.calendar+1)%25;ctx.audio.chime('soft');ctx.discovery.add(room.id+'-calendar','日曆小窗','一顆松果，和還沒寄出的祝福。');}});
    }
    candleArch(fixed,m,toys?1.62:.40,1.49,-room.d*.5+.24,.68);add(9,toys?1.62:.40,1.68,-room.d*.5+.24,.76);add(6,tbx-.19,1.03,tbz+.075,.32);
    const lampMesh=new T.Group();lampMesh.position.set(tbx+.09,.766,tbz-.124);cell.add(lampMesh);orbLamp(lampMesh,m,0,0,0);
    let lampH=room.world(tbx+.09,1.095,tbz-.124);add(5,tbx+.09,1.095,tbz-.124,.56);light.add(...lampH,{power:7.7,distance:6.0,glow:0,bake:0,color:'#ffe0a6',active:()=>room.lampOn&&w.inside?.id===room.id});
    actions.add(room.id+'-lamp','桌邊的煤油燈',...lampH,{room:room.id,reach:2.20,radius:.25,hint:'熄燈',allowOccluded:true,action:(ctx,a)=>{room.lampOn=!room.lampOn;lampMesh.children[2].visible=room.lampOn;a.hint=room.lampOn?'熄燈':'點燈';ctx.audio.chime('soft');}});
    const p=room.world(.04,hy-.69,.032);light.add(...p,{power:11.5,distance:8.9,glow:0,bake:0,color:'#ffcd91',active:()=>room.festiveOn&&w.inside?.id===room.id});
    // A quiet wall clock and a basket of kindling.
    const cX=room.w*.29,cZ=-zd+.164;
    part(fixed,G.rod,m.bronze,cX,2.14,cZ,.53,.163,.54,Math.PI/2,0,0);part(fixed,G.rod,m.ivory,cX,2.14,cZ+.092,.449,.047,.446,Math.PI/2,0,0);
    rod(fixed,m.coal,[cX,2.14,cZ+.123],[cX+.07,2.247,cZ+.123],.012);rod(fixed,m.coal,[cX,2.14,cZ+.121],[cX-.13,2.19,cZ+.121],.015);
    cell.remove(fixed);cell.add(compact(fixed));
    if(room.door)w.sim.push(dt=>{
      const door=room.door;door.pivot.rotation.y=damp(door.pivot.rotation.y,door.state?1.37:0,8.5,dt);
      door.collision.disabled=door.state&&door.pivot.rotation.y>.72;
    });
    w.anim.push((dt,t,pos,s)=>{
      const d=(pos.x-room.x)**2+(pos.z-room.z)**2;cell.visible=d<1600;strings.visible=room.festiveOn;
      for(const g of room.windowed)g.visible=d>400;

      const marks=room.id==='santa'?Math.max(room.calendar,w.discovery?.stars?.size??0):room.calendar;
      if(room.calendarWindows)for(let i=0;i<24;i++)room.calendarWindows[i].visible=i<marks;
    });
  }
}
