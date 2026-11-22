import * as T from 'three/webgpu';
import {G,part,box,rod} from './mesh.js';
import {ground} from './terrain.js';
import {TAU,between,rng,hash2} from './math.js';
import {lantern,festoon} from './props.js';
import sites from './data/christmas-sites.json';

const bell=new T.LatheGeometry([[.062,.96],[.119,.94],[.20,.81],[.25,.57],[.306,.28],[.445,.082],[.461,.042],[.452,.012],[.410,.009],[.374,.110],[.286,.302],[.224,.559],[.169,.822],[.057,.906]].map(([x,y])=>new T.Vector2(x,y-.5)),20);
const knit=new T.Shape();knit.moveTo(-.16,.40);knit.lineTo(.15,.40);knit.lineTo(.125,.02);knit.quadraticCurveTo(.135,-.103,.284,-.108);knit.quadraticCurveTo(.389,-.125,.348,-.237);knit.quadraticCurveTo(.285,-.301,.078,-.298);knit.quadraticCurveTo(-.19,-.29,-.171,-.105);knit.closePath();
const woolSock=new T.ExtrudeGeometry(knit,{depth:.073,bevelEnabled:true,bevelThickness:.022,bevelSize:.027,bevelSegments:2,steps:1,curveSegments:8});woolSock.translate(0,0,-.037);
const pot=new T.LatheGeometry([[0,.02],[.19,.02],[.194,.05],[.254,.368],[.273,.383],[.276,.433],[.23,.441],[.214,.412],[.207,.368]].map(([x,y])=>new T.Vector2(x,y)),14);
const R=TAU/6;

function ornament(w,id,x,y,z,yaw=0,s=1,seed=0){
  const {batch:o,mat:m}=w;const cs=Math.cos(yaw),sn=Math.sin(yaw),r=rng(seed+29419);
  const loc=(X,Y,Z)=>[x+(X*cs+Z*sn)*s,y+Y*s,z+(-X*sn+Z*cs)*s];
  const p=(g,M,X,Y,Z,w,h=w,d=w,ax=0,ay=0,az=0)=>part(o,g,M,...loc(X,Y,Z),w*s,h*s,d*s,ax,yaw+ay,az);
  const line=(M,a,b,t)=>rod(o,M,loc(...a),loc(...b),t*s,G.fineRod);
  const circle=(M,X,Y,Z,rad,rm=G.smallBall)=>p(rm,M,X,Y,Z,rad);
  const leaf=(X,Y,Z,a,M=m.green,l=.13)=>p(G.ball,M,X,Y,Z,l,.029,l*.41,-.05,a,.3);
  const warm=m.filament,copper=m.bronze,I=m.ivory;
  let height=0,size=.42;
  switch(id){
    case 54: // tomte, wool, beard, small bowl of winter porridge
      p(G.cap,m.wool,0,.303,0,.40,.51,.34,0,.10,0);p(G.ball,m.cream,0,.484,.108,.154,.208,.093,.24);
      p(G.ball,m.plaster,0,.635,.080,.114,.126,.112);
      p(G.cone,m.red,-.065,.748,-.028,.389,.527,.395,0,.07,.28);p(G.rod,m.wine,0,.551,0,.41,.041,.39,0,0,.05);
      circle(m.plaster,.024,.624,.184,.068);for(const d of [-1,1])p(G.smallBall,m.coal,d*.098,.078,.093,.11,.047,.151);
      p(G.cap,m.wood,.33,.080,.208,.25,.111,.264,0,0,Math.PI);p(G.rod,I,.33,.124,.208,.216,.021,.216);
      height=.58;size=.55;break;
    case 55: // dried citrus and cinnamon string
      line(m.iron,[-.52,.71,0],[.52,.71,0],.012);
      for(let k=0;k<5;k++){const X=-.43+k*.211,Y=.48-Math.sin(k*Math.PI/4)*.13;
        line(m.bronze,[X,.7,0],[X,Y,0],.009);p(G.rod,m.glassGold,X,Y,0,.152,.028,.155,Math.PI/2,0,.12);
        p(G.rod,m.gold,X,Y,.017,.125,.011,.124,Math.PI/2);
        for(let j=0;j<6;j++){const a=j*TAU/6;line(m.wood,[X,Y,.027],[X+Math.cos(a)*.057,Y+Math.sin(a)*.057,.025],.004);}
        if(k%2===0){p(G.rod,m.wood,X+.024,Y-.166,-.025,.035,.152,.038,0,0,-.47);p(G.rod,m.bronze,X-.022,Y-.157,-.025,.039,.144,.037,0,0,-.69);}
      }height=.48;size=.72;break;
    case 56: // pair of actual hollow bells, with a clapper and curved links
      for(const d of [-1,1]){
        p(G.ringFine,m.iron,d*.165,.663,0,.087,.14,.084,0,d*.10);p(bell,m.gold,d*.208,.38,.006,.417,.462,.417,.08,d*.23,d*.21);
        p(G.ring,m.bronze,d*.251,.226,.002,.166,.167,.13,Math.PI/2,0,d*.21);line(copper,[d*.203,.511,0],[d*.272,.155,.002],.018);circle(copper,d*.272,.139,0,.046);
      }
      p(G.ico,m.red,-.155,.768,.018,.184,.09,.078,0,-.14,-.26);p(G.ico,m.red,.155,.768,.018,.181,.088,.071,0,.14,.27);circle(m.red,0,.763,.059,.062);
      height=.48;size=.50;break;
    case 57: // thickness, rolled cuff, stitched seam and embroidered diamonds
      for(const [d,M] of [[-1,m.wool],[1,m.red]]){const X=d*.273;
        p(woolSock,M,X,.342,0,.762,.822,.93,0,0,d*.10);p(G.box,I,X,.642,.021,.283,.104,.185,0,0,d*.102);
        for(let j=0;j<4;j++)p(G.box,m.ivory,X+(j-1.5)*.062,.642,.120,.013,.083,.013,0,0,d*.10);
        p(G.tinyStar,m.glassGold,X+.020,.421,.072,.068,.068,.091,0,0,.06);line(copper,[X,.686,0],[X-.027,.81,0],.014);
      }height=.47;size=.57;break;
    case 58: // mistletoe's pale berries and oval paired leaves
      line(copper,[0,.91,0],[0,.74,0],.012);
      for(let j=0;j<8;j++){
        const a=j*2.39,X=Math.cos(a)*between(r,.10,.30),Z=Math.sin(a)*between(r,.08,.19),Y=.44+r()*.17;
        line(m.wood,[0,.75,0],[X,Y,Z],.016);leaf(X*.79,Y+.035,Z*.8,a,m.swiss,.157);leaf(X,Y-.045,Z,a+.67,m.green,.134);
        circle(m.cream,X*.58,Y+.068,Z*.57,.033+r()*.019);circle(I,X*.50+.047,Y+.045,Z*.62+.023,.036);
      }
      p(G.ico,m.wool,-.11,.755,.028,.142,.075,.054,0,0,-.25);p(G.ico,m.wool,.105,.76,.03,.135,.078,.054,0,0,.25);height=.61;size=.54;break;
    case 59: // wheat-straw star, woven intersections rather than solid metal
      for(let j=0;j<8;j++){
        const a=j*TAU/8,b=a+.41,c=a-.41;const A=[Math.cos(a)*.349,.5+Math.sin(a)*.349,0],B=[Math.cos(b)*.147,.5+Math.sin(b)*.147,.022],C=[Math.cos(c)*.146,.5+Math.sin(c)*.146,-.023];
        line(m.wood,A,B,.019);line(m.glassGold,A,C,.014);line(I,[0,.5,.01],A,.011);if(j%2===0)p(G.smallBall,m.red,...B,.032);
      }p(G.ring,m.gold,0,.5,0,.091,.091,.075);height=.50;size=.69;break;
    case 60: // openwork snowflake sculpture, glowing tips and bronze silk cord
      for(let j=0;j<6;j++){
        const a=j*R,u=Math.cos(a),v=Math.sin(a),e=[u*.39,.52+v*.39,0];line(m.glassSilver,[0,.52,0],e,.023);
        for(const d of [-1,1])line(m.glassSilver,[u*.26,.52+v*.26,0],[u*.24-v*d*.139,.52+v*.24+u*d*.139,0],.016);
        p(G.bulb,m.amber,...e,.027,.035,.026);
      }p(G.bulb,warm,0,.52,0,.092,.102,.041);height=.52;size=.71;break;
    case 61: // faceted icicle wall with uneven filament drops
      line(copper,[-.45,.95,0],[.44,.95,0],.021);
      for(let k=0;k<9;k++){
        const X=-.42+k*.106,Y=.68+between(r,-.18,.16),D=(k%2)*.042;
        p(G.cap,m.ice,X,Y,D,.065,.40+(.69-Y)*.31,.064,0,.20,Math.PI+(r()-.5)*.09);
        p(G.bulb,k%3===0?warm:m.amber,X,Y-.17,D+.008,.028,.048,.028);
      }height=.65;size=.72;break;
    case 62:case 63:case 64:case 65:{
      p(pot,id===63?m.ivory:id===64?m.wood:m.pavers,0,0,0,1);p(G.rod,m.coal,0,.403,0,.434,.048,.434);
      const n=id===62?4:id===63?7:id===64?8:6;
      for(let j=0;j<n;j++){
        const a=j*2.399,dx=Math.cos(a),dz=Math.sin(a),r1=.092+r()*.092;
        const Y=.57+between(r,.04,id===62?.40:.18),X=dx*r1,Z=dz*r1;
        leaf(dx*.108,.493,dz*.114,-a,m.swiss,.15);if(id===64){for(let k=0;k<4;k++){const f=k/3;const tx=dx*(.17+f*.23),tz=dz*(.17+f*.23),ty=.56+Math.sin(f*3.24)*.16-f*.04; p(G.ball,k%2?m.green:m.swiss,tx,ty,tz,.117,.047,.080,0,-a,.16-f*.80);if(k===3)p(G.ball,m.red,tx,ty-.015,tz,.069,.064,.078,0,-a,.23);}continue;}
        line(m.green,[0,.43,0],[X,Y,Z],.013);
        for(let k=0;k<5;k++){const t=k*TAU/5+a,rr=id===62?.082:id===63?.051:.069;
          p(G.ball,id===62?m.red:id===63?m.wool:m.ivory,X+Math.cos(t)*rr,Y+(id===63?.057:.012),Z+Math.sin(t)*rr,id===62?.099:.072,id===63?.095:.043,.046,.34,-t,id===63?.54:.26);
        }circle(id===62?m.filament:m.glassGold,X,Y+.016,Z,.036);
      }height=.68;size=.50;break;
    }
    case 66: // small owl, drilled irises and wing scales
      p(G.ball,m.wood,0,.271,0,.25,.35,.194);p(G.ball,m.wood,0,.538,.061,.246,.217,.183);
      for(const d of [-1,1]){p(G.ico,m.wood,d*.146,.702,.037,.083,.135,.075,0,.2,-d*.39);p(G.ball,m.ivory,d*.086,.562,.206,.092,.088,.052);p(G.smallBall,m.bronze,d*.085,.564,.253,.044);p(G.smallBall,m.coal,d*.086,.562,.278,.021);p(G.ball,m.wood,d*.182,.300,-.010,.091,.239,.142,0,.29,d*.17);}
      p(G.cone,m.gold,0,.478,.205,.084,.135,.092,0,.1,Math.PI);p(G.rock,m.snowProp,-.063,.718,.01,.124,.032,.091);height=.48;size=.48;break;
    case 67: // chamfered bird house with roof, true dark entrance and perch
      p(G.box,m.plank,0,.43,0,.48,.59,.392);p(G.disk,m.coal,0,.531,.198,.208,.037,.201,Math.PI/2);
      p(G.ring,m.wood,0,.534,.228,.105,.105,.085);p(G.rod,m.wood,0,.352,.245,.049,.21,.046,Math.PI/2);
      for(const d of [-1,1]){p(G.box,m.wood,d*.157,.765,0,.358,.071,.490,0,0,-d*.62);p(G.box,m.snowProp,d*.151,.803,0,.326,.056,.479,0,0,-d*.62);}
      height=.58;size=.51;break;
    case 68: // carved curled fox beside a trail marker
      p(G.ball,m.wood,0,.179,-.097,.33,.217,.27,0,-.18,.055);p(G.ball,m.wood,.185,.33,.04,.179,.179,.166,0,.19,.19);p(G.ico,m.plaster,.237,.304,.164,.112,.063,.149,0,-.34,.04);
      for(const d of [-1,1])p(G.cone,m.wood,.18+d*.088,.493,.014,.125,.21,.101,0,.14,-d*.22);
      p(G.smallBall,m.coal,.277,.331,.278,.027);p(G.smallBall,m.coal,.255,.398,.157,.022);p(G.smallBall,m.coal,.107,.398,.156,.022);
      p(G.ball,m.wood,-.267,.145,.073,.235,.143,.139,0,-.51,.16);p(G.ball,m.cream,-.337,.139,.16,.124,.115,.121,0,-.24,0);height=.33;size=.59;break;
    case 69: // Yule goat, straw grooves, horns, wool ribbon and wooden hooves
      p(G.ball,m.wood,0,.397,-.057,.211,.232,.398,0,0,0,'#f0d195');p(G.ball,m.wood,0,.569,.211,.153,.27,.167,.48,.05,0,'#f6d9a2');
      p(G.ball,m.wood,0,.749,.321,.153,.125,.226,.15,0,0,'#f3d4a1');
      for(const d of [-1,1]){for(const k of [-1,1]){line(m.wood,[d*.135,.346,k*.225],[d*.15,.068,k*.259],.041);p(G.rod,m.bronze,d*.15,.059,k*.259,.119,.098,.11);}
        line(m.glassGold,[d*.108,.817,.245],[d*.166,.979,.111],.028);line(m.glassGold,[d*.166,.979,.111],[d*.144,1.043,-.004],.024);
        circle(m.coal,d*.11,.783,.414,.023);for(let i=0;i<10;i++)line(m.glassGold,[d*.165,.45+i*.006,-.384+(i%3)*.038],[d*.18,.25+(i%5)*.030,.228],.005);
      }
      p(G.ring,m.wool,0,.561,.185,.164,.171,.142,Math.PI/2+.3);p(G.box,m.wool,.12,.486,.308,.080,.24,.06,0,0,-.27);height=.56;size=.65;break;
    default:throw Error('No model for ornament '+id);
  }
  w.decor.add(id,x,y+height*s,z,size*s);
}

const designs={gate:[[58,56,60,59],[62,57,55,54]],avenue:[[57,56,59,60],[58,55,54,61]],plaza:[[56,59,60,62],[69,55,61,57]],
  pond:[[64,67,66,60],[63,54,58,68]],market:[[55,57,62,69],[56,58,59,63]],rink:[[60,61,65,56],[59,62,54,68]],
  garden:[[63,65,60,58],[62,64,55,59]],hideaway:[[67,65,54,63],[66,59,62,58]],
  lawn:[[68,69,54,56],[67,66,57,59]],hill:[[67,60,66,59],[68,56,65,58]],carousel:[[59,57,69,54],[56,60,61,55]],
  lantern:[[61,54,66,59],[60,58,67,68]],canopy:[[60,58,59,61],[67,56,66,57]],campfire:[[54,55,68,69],[66,57,64,67]],
  woods:[[67,59,54,66],[68,58,56,61],[54,55,67,69],[66,60,65,59],[64,68,58,57],[69,59,67,58]]};
function vignette(w,x,y,z,yaw,zone,i,size=1){
  const {batch:o,mat:m}=w;const q=designs[zone]??designs.woods;
  const d=q[Math.floor(hash2(x*21,z*13)*q.length)%q.length],sn=Math.sin(yaw),cs=Math.cos(yaw),r=rng((x*471+z*1307)|0),A=[[-.74,.32,.09],[.01,.43,.13],[.74,.25,.10],[-.22,.060,.56]];
  // Some display on split logs, others on a low finial of carved stone.
  const pos=(u,v,h=0)=>[x+(u*cs+v*sn)*size,y+h*size,z+(-u*sn+v*cs)*size];
  const wide=zone==='market'||zone==='avenue'||zone==='plaza'||zone==='gate',stone=['garden','hideaway','pond','hill','rink'].includes(zone);
  const frame=stone?m.limestone:m.wood;
  const [px,py,pz]=pos(0,-.04,.208);
  part(o,wide?G.box:G.rod,frame,px,py,pz,1.91*size,.352*size,.76*size,0,yaw,0);
  part(o,G.rock,m.snowProp,...pos(0,-.12,.385),.94*size,.068*size,.40*size,0,yaw,0);
  for(let j=0;j<d.length;j++){
    const [u,h,v]=A[j];const [X,Y,Z]=pos(u,v,h);
    ornament(w,d[j],X,Y,Z,yaw+between(r,-.29,.29),size*between(r,.80,1.08),i*49+j);
  }
  if(wide||i%4===1){const l=pos(0,-.11,1.37);lantern(o,m,...l,.28*size,stone?'brass':'paper');w.decor.add(3,...l,.39*size);
    w.light.add(...l,{glow:.40*size,bake:.16,distance:5.9,radius:3.6,power:0,color:'#ffbf8a'});
    rod(o,frame,pos(0,-.12,.35),pos(0,-.12,1.42),.038*size,G.rod);
  }
  w.physics.box(px,pz,1.8*size,.80*size,y,y+.39*size,yaw,'winter-craft pedestal');
}

export function winterTrailMarker(w,x,y,z,yaw,i){
  // Grounded hand-carved trail ornament: split post, cast lantern, a
  // straw figure and a wooden animal. Local combinations vary by grove.
  const sn=Math.sin(yaw),cs=Math.cos(yaw),at=(u,h,v)=>[x+u*cs+v*sn,y+h,z-u*sn+v*cs];
  const local={...w,batch:w.craftBatch},{batch:o,mat:m}=local;
  part(o,G.rock,m.limestone,...at(0,.12,0),.86,.22,.54,0,yaw,0);
  part(o,G.rock,m.snowProp,...at(.23,.23,-.07),.38,.10,.31,0,yaw-.17,.03);
  const lampPos=at(-.16,.96,.06);
  rod(o,m.wood,at(-.18,.11,.02),at(-.20,.84,.05),.057,G.rod);
  lantern(o,m,...lampPos,.33,'brass');w.decor.add(3,...lampPos,.36);
  w.light.add(...lampPos,{power:0,glow:.32,bake:.13,radius:2.9,color:'#e9a568'});
  const c=[[68,59],[66,56],[54,58],[67,55],[68,60],[69,66]][i%6];
  ornament(local,c[0],...at(.24,.17,.09),yaw,.88,207+i*9);
  ornament(local,c[1],...at(.15,.70,-.10),yaw,.83,208+i*9);
  rod(o,m.wood,at(.15,.19,-.16),at(.15,.79,-.16),.033,G.fineRod);
  w.physics.cylinder(x,z,.45,y,y+.34,'winter trail stone');
}

export function winterCraft(w){
  const conf=w.layout.deckDressing;
  // Bench-front edge arrangements are set back to leave their approach and
  // seating sightlines untouched. Each handcrafted model has a real anchor.
  for(const [i,p] of conf.centers.entries()){
    const [id,x,z,yaw]=p;if(w.physics.blocked(x,z,ground(x,z),.85))continue;
    vignette(w,x,ground(x,z),z,yaw,id,i,1.26);
  }
  for(const room of w.cabins){if(!room.enter)continue;
    const M=room.id==='glass'?[62,63,64,65]:room.id==='log'?[66,68,57,55]:room.id==='toys'?[54,69,59,56]:[57,58,56,63];
    for(let j=0;j<M.length;j++){
      const side=j%2?1:-1;const u=side*(room.w*.5-.78),z=-room.d*.27+Math.floor(j/2)*room.d*.56;
      const [X,Y,Z]=room.world(u,.52,z);
      box(w.batch,w.mat.wood,X,Y-.31,Z,.72,.55,.51,room.yaw);ornament(w,M[j],X,Y,Z,room.yaw,.66,j*791);
    }
  }
  // Every canopy bay has a small cluster on the *outside* of the handrail.
  // The start of either ramp is left empty. Alternating forms direct the eye.
  for(const [i,a] of (w.surveyDecks??[]).entries()){
    const dx=a.bx-a.ax,dz=a.bz-a.az,L=Math.hypot(dx,dz);
    const n=Math.max(2,Math.ceil(L/12)),set=a.id==='canopy'?designs.canopy:designs.pond;
    for(let j=0;j<n;j++){
      const f=(j+.5)/n,yaw=Math.atan2(-dz,dx),h=a.by(f)+.74;
      for(let k=0;k<3;k++){
        const u=f+(k-1)*.72/L,edge=(a.width??2.1)*.5+.13,x=a.ax+dx*u+dz/L*edge,z=a.az+dz*u-dx/L*edge,id=set[(i+j)%2][k];
        ornament(w,id,x,a.by(u)+.79,z,yaw,.91,i*77+j*9+k);
        rod(w.batch,w.mat.wood,[x,h-.71,z],[x,h+.29,z],.027,G.fineRod);
      }
    }
  }
  // Snowflake pendants above the ice give the rink centre three visible
  // festive forms without putting a collision object on the skating line.
  for(const [i,x] of [125,137,149].entries()){
    const z=8,rim=w.layout.rink,span=Math.sqrt(1-((x-rim.x)/rim.rx)**2)*rim.rz+1.5;
    for(const d of [-1,1]){
      const zz=z+d*span,h=ground(x,zz);rod(w.batch,w.mat.iron,[x,h,zz],[x,6.18,zz],.067);
      part(w.batch,G.rod,w.mat.bronze,x,h+.102,zz,.272,.21,.272);
    }
    festoon(w,[x,6.15,z-span],[x,6.15,z+span],1.28,45,{size:.039,halo:false});
    for(const [j,id] of [60,61,59].entries()){
      const zz=z+(j-1)*(5.3+i*.47),h=4.16+.12*j;
      ornament(w,id,x,h,zz,Math.PI*.5,.97,140+i*18+j*7);
      const lineY=6.15-1.28*Math.cos((zz-z)/span*Math.PI*.5);
      rod(w.batch,w.mat.iron,[x,h+.35,zz],[x,lineY,zz],.011,G.fineRod);
    }
  }
  const local={...w,batch:w.craftBatch};
  const drawShelf=(tree,x,y,z,yaw,i)=>{
    const d=designs.woods[i%designs.woods.length],sn=Math.sin(yaw),cs=Math.cos(yaw),Z=.12;
    part(local.batch,G.box,w.mat.wood,x,y-.04,z,1.29,.076,.40,0,yaw,0);
    for(let j=0;j<3;j++){
      const off=(j-1)*.47;ornament(local,d[j],x+off*cs+Z*sn,y-.02,z-off*sn+Z*cs,yaw,.82,i*30+j);
      rod(local.batch,w.mat.wood,[tree.x,y-.32,tree.z],[x+off*cs,y-.061,z-off*sn],.029,G.fineRod);
    }
  };
  const marker=(...a)=>winterTrailMarker(w,...a);
  // Hand-placed at offset woodland edges between broad path vignettes.
  // The posts face the forest, not the boundary rail or the backs of trunks.
  for(const [i,[x,z,a]] of [[-138.04,15.64,-.95],[-131.72,49.46,-1.5],[-93.82,-112.38,-1.20],[11.90,219.37,-1.07],[53.67,-42.14,1.30],[140.71,219.54,-1.42],[189.77,203.9,0],[120.72,185.5,.47]].entries()){
    const y=ground(x,z);if(!w.physics.blocked(x,z,y,.84)&&w.pathAt(x,z).edge>.83)marker(x,y,z,a,390+i);
  }
  if(w.generateFestivePlan||sites.seed!==w.layout.seed||!sites.vignettes.length){
    const vignettes=[],shelves=[],markers=[];
    w.decor.placeMissing((...a)=>{vignettes.push(a);vignette(local,...a,.91);});
    w.decor.retainSightlines((tree,...a)=>{shelves.push([tree.id,...a]);drawShelf(tree,...a);});
    w.decor.markEdges((...a)=>{markers.push(a);marker(...a);});
    w.decor.plan={seed:w.layout.seed,vignettes,shelves,markers};
  }else{
    for(const a of sites.vignettes)vignette(local,...a,.91);
    for(const [id,...a] of sites.shelves)drawShelf(w.vegetation.list[id],...a);
    for(const a of sites.markers??[])marker(...a);
    w.decor.niches=sites.vignettes.length;w.decor.shelved=sites.shelves.length;w.decor.marked=sites.markers?.length??0;
  }
  // An occasional story lantern along the wooded banks and clearings; each
  // grouping faces the accessible pocket instead of hiding behind a trunk.
  for(const [x,z,yaw,style] of conf.edgeDetails??[]){
    const y=ground(x,z);if(w.physics.blocked(x,z,y,1.00)||w.pathAt(x,z).edge<1.15)continue;
    marker(x,y,z,yaw,426+style);w.decor.marked=(w.decor.marked??0)+1;
  }
}

// The tiny houses are relief architecture, not additional explorable cabins.
// Every site has pitched roofs, projecting window trim and a real doorstep.
const villages=[[-16.1,190.7],[-18.9,137.3],[-58.7,144.3],[-111.7,155.2],[-106.7,35.1],[-90.3,-65.4],[-65.4,-160.2],[-17,-152],[74.6,-138.5],[132.8,-113.9],[91.9,154.7],[106.6,135.0]];
export function villageWindows(w){
  const {batch:o,mat:m}=w;
  for(const [i,[px,pz]] of villages.entries()){
    let pos=null;for(let j=0;j<26;j++){
      const r=j*.37,a=j*2.39996,x=px+Math.cos(a)*r,z=pz+Math.sin(a)*r,y=ground(x,z);
      if(w.physics.blocked(x,z,y,1.03)||w.pathAt(x,z).edge<.7||w.layout.quiet.some(q=>Math.hypot(q.x-x,q.z-z)<6.5))continue;
      pos={x,y,z};break;
    }
    if(!pos)continue;
    const {x,y,z}=pos,a=i*.71,cs=Math.cos(a),ss=Math.sin(a),R=rng(109186+i*649),S=i%3===0?.98:.76;
    const at=(u,v,t)=>[x+cs*u+ss*t,y+v,z-ss*u+cs*t];
    for(const j of [-1,1]){
      const X=j*(.39+i%2*.05),H=between(R,.55,.79)*S,B=between(R,.54,.64)*S,D=between(R,.48,.59)*S,T=between(R,.22,.32)*S;
      const style=i%3===0?m.wool:i%3===1?m.plank:m.brick;
      part(o,G.box,m.limestone,...at(X,.069,0),B+.16,.16,D+.11,0,a,0);
      part(o,G.box,style,...at(X,.19+H*.5,0),B,H,D,0,a,0);
      for(const k of [-1,1]){
        part(o,G.box,m.wood,...at(X+k*B*.25,.185+H+T*.55,0),B*.65,.062,D+.15,0,a,-k*.67);
        part(o,G.box,m.snowProp,...at(X+k*B*.235,.185+H+T*.63,0),B*.623,.043,D+.109,0,a,-k*.67);
        part(o,G.box,m.ivory,...at(X+k*B*.264,H*.67,D*.509),B*.34,H*.30,.026,0,a,0);
        part(o,G.box,m.dim,...at(X+k*B*.264,H*.67,D*.539),B*.227,H*.215,.021,0,a,0);
        part(o,G.box,m.wood,...at(X+k*B*.264,H*.67,D*.562),.014,H*.217,.013,0,a,0);
      }
      part(o,G.box,m.green,...at(X,.14+H*.225,D*.55),B*.25,H*.41,.069,0,a,0);
      part(o,G.smallBall,m.gold,...at(X+.039,.16+H*.23,D*.607),.026);
      part(o,G.box,m.brick,...at(X-.12,.22+H+T*.74,-.102),.11,.245,.14,0,a,0);
      part(o,G.box,m.snowProp,...at(X-.12,.35+H+T*.74,-.102),.14,.031,.16,0,a,0);
    }
    w.decor.add(70,x,y+.66,z,1.42);w.pois.push({id:'village-'+String(i+1).padStart(2,'0'),type:'village',x,y,z});
    w.light.add(x,y+.52,z,{glow:.42,bake:.11,power:0,radius:2.7});
  }
}
