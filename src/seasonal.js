// Small handcrafted mesh sets. Material and geometry identities are shared with the
// park batcher; no additional material per placement or photo billboard.
import * as T from 'three/webgpu';
import {uv,uniform,vec3,sin,cos,atan,fract,smoothstep} from 'three/tsl';
import {G,part,box,rod} from './mesh.js';
import {ground,pondEdge} from './terrain.js';
import {TAU,rng,between} from './math.js';

// A continuous stamped cookie profile, with a browned bevel, not joined rods.
const stamp=new T.Shape();stamp.moveTo(.047,.058);stamp.bezierCurveTo(.095,.08,.097,.169,.057,.200);stamp.bezierCurveTo(.016,.234,-.058,.223,-.077,.174);stamp.bezierCurveTo(-.111,.117,-.076,.069,-.050,.055);
stamp.bezierCurveTo(-.085,.060,-.114,.044,-.152,.010);stamp.quadraticCurveTo(-.177,-.023,-.143,-.044);stamp.quadraticCurveTo(-.124,-.052,-.067,-.030);
stamp.quadraticCurveTo(-.064,-.065,-.064,-.073);stamp.quadraticCurveTo(-.078,-.115,-.112,-.160);stamp.quadraticCurveTo(-.115,-.196,-.073,-.198);
stamp.quadraticCurveTo(-.056,-.200,-.008,-.128);stamp.quadraticCurveTo(.008,-.129,.048,-.190);stamp.quadraticCurveTo(.079,-.211,.108,-.188);
stamp.quadraticCurveTo(.132,-.164,.087,-.111);stamp.quadraticCurveTo(.070,-.077,.067,-.031);stamp.quadraticCurveTo(.113,-.054,.150,-.044);stamp.quadraticCurveTo(.180,-.024,.148,.013);stamp.quadraticCurveTo(.097,.051,.047,.058);stamp.closePath();
const stampedCookie=new T.ExtrudeGeometry(stamp,{depth:.035,bevelEnabled:true,bevelThickness:.006,bevelSize:.005,bevelSegments:2,steps:1,curveSegments:3});
stampedCookie.translate(0,0,-.018);const bakedUV=stampedCookie.attributes.uv;for(let i=0;i<bakedUV.count;i++)bakedUV.setXY(i,bakedUV.getX(i)*3.4+.52,bakedUV.getY(i)*3.4+.51);

export function festiveTray(o,m,x,y,z,yaw=0,style='bakery'){
  const c=Math.cos(yaw),s=Math.sin(yaw),r=rng(422+Math.round(x*311+z*71));
  const p=(geo,mat,X,Y,Z,w,h=w,d=w,ax=0,ay=0,az=0)=>part(o,geo,mat,x+X*c+Z*s,y+Y,z-X*s+Z*c,w,h,d,ax,yaw+ay,az);
  const local=(X,Y,Z)=>[x+X*c+Z*s,y+Y,z-X*s+Z*c];
  const line=(mat,a,b,t)=>rod(o,mat,local(...a),local(...b),t,G.fineRod);
  const ball=(mat,X,Y,Z,w,h=w,d=w)=>p(G.smallBall,mat,X,Y,Z,w,h,d);
  const warm=(X,Y,Z,w,h,d)=>p(G.box,m.wood,X,Y,Z,w,h,d);
  warm(0,.024,0,1.45,.046,.74);
  if(style==='bakery'){
    // Starched linen, raised icing, a powdered cut loaf and candied peel.
    p(G.box,m.blanket,-.043,.050,.012,1.31,.009,.612,0,-.019);
    for(const d of [-1,1])line(m.wine,[-.669,.057,d*.27],[.588,.057,d*.267],.005);
    for(let j=0;j<4;j++){
      const X=-.532+j*.208,Z=-.143+j*.043,Y=.204,S=.73+.08*(j%3);
      const cookie=(u,v,w)=>[X+u*S,Y+v*S,Z+w*S];
      const bead=(mat,u,v,w,k)=>ball(mat,...cookie(u,v,w),k*S,k*S,k*.55*S);
      const pipe=(ap,bp,k=.007)=>line(m.cream,cookie(...ap),cookie(...bp),k*S);
      p(stampedCookie,m.biscuit,X,Y,Z,S,S,S);
      for(const d of [-1,1]){
        bead(m.cream,d*.029,.147,.032,.010);
        pipe([d*.126,.020,.027],[d*.119,-.021,.027]);
        pipe([d*.054,-.143,.027],[d*.082,-.126,.027]);
      }
      for(let k=0;k<5;k++){const a=k*Math.PI/4,b=(k+1)*Math.PI/4;
        if(k<4)pipe([.036*Math.cos(a),.127-.024*Math.sin(a),.029],[.036*Math.cos(b),.127-.024*Math.sin(b),.029],.006);
      }
      pipe([-.043,.044,.031],[.042,.037,.031]);
      for(let k=0;k<3;k++)bead(k%2?m.green:m.wine,.002,.008-k*.032,.031,.012);
    }
    p(G.ball,m.biscuit,.406,.124,-.151,.229,.096,.124,0,-.15);
    p(G.ball,m.cream,.402,.182,-.151,.201,.051,.111,0,-.15);
    for(let j=0;j<14;j++){const a=j*2.4,d=between(r,.016,.091);ball(j%4?m.cream:m.biscuit,.403+d*1.75*Math.cos(a),.219+between(r,-.007,.005),-.151+d*.63*Math.sin(a),.005,.003,.006);}
    for(let i=0;i<3;i++){
      const x=.347+i*.053,z=.069+i*.062;
      p(G.ball,m.biscuit,x,.091,z,.126,.054,.028,.27,0,-.22);
      p(G.ball,m.blanket,x,.105,z+.021,.107,.042,.016,.27,0,-.22);
      for(let j=0;j<6;j++)ball(j%2?m.wine:m.red,x+(j%3-1)*.051,.095+Math.floor(j/3)*.029,z+.037,.008,.006,.006);
    }
    for(let j=0;j<9;j++){const X=-.53+j*.07,Z=.245; p(G.rod,m.biscuit,X,.073,Z,.090,.025,.084);ball(j%2?m.cream:m.glassGold,X,.091,Z+.014,.018,.009,.015);}
  }else if(style==='spice'){
    // A crate of roasted chestnuts, cinnamon quills and cut peel disks.
    warm(-.36,.107,0,.53,.155,.43);p(G.box,m.coal,-.36,.189,0,.482,.023,.39);
    for(let j=0;j<25;j++)p(G.ico,j%7===1?m.red:m.wood,between(r,-.56,-.16),between(r,.203,.248),between(r,-.16,.16),.043,.033,.038,0,r()*TAU);
    for(let j=0;j<8;j++)p(G.rod,m.wood,.24+(j%4)*.038,.07+Math.floor(j/4)*.039,-.22,.047,.26,.044,Math.PI/2,.22);
    p(G.box,m.wool,.335,.103,-.22,.188,.035,.051);
    for(let j=0;j<5;j++){
      const X=.16+j*.077,Z=.155+(j%2)*.071;
      p(G.rod,m.glassGold,X,.087,Z,.169,.025,.169,0,.24);p(G.rod,m.ivory,X,.103,Z,.141,.011,.141);
      for(let k=0;k<6;k++){const a=k/6*TAU;line(m.glassGold,[X,.114,Z],[X+Math.cos(a)*.064,.114,Z+Math.sin(a)*.064],.004);}
    }
  }else{
    p(G.rod,m.red,-.45,.145,0,.25,.223,.25);for(const Y of [.05,.253])p(G.rod,m.gold,-.45,Y,0,.27,.041,.27);
    for(let j=0;j<8;j++){const a=j*TAU/8;line(m.ivory,[-.45+Math.cos(a)*.127,.065,Math.sin(a)*.127],[-.45+Math.cos(a+.35)*.127,.224,Math.sin(a+.35)*.127],.008);}
    for(let j=0;j<3;j++)p(G.tinyStar,j===1?m.glassSilver:m.gold,.35+j*.078,.061,-.20+j*.151,.13,.13,.12,Math.PI/2,0,0);
    // Turned rocking horse, little toy block and wreath tie.
    for(const d of [-1,1])for(let j=0;j<5;j++){const X=-.13+j*.059;line(m.gold,[X,.069+(j-2)**2*.008,d*.069],[X+.056,.069+(j-1)**2*.008,d*.069],.013);}
    for(const d of [-1,1]){
      line(m.wood,[-.05,.187,d*.055],[-.10,.083,d*.067],.018);line(m.wood,[.096,.192,d*.050],[.151,.085,d*.068],.018);
    }
    p(G.ball,m.wood,.019,.199,0,.131,.046,.077);p(G.ball,m.wood,.122,.283,0,.051,.090,.043,0,0,-.56);p(G.ball,m.wood,.167,.335,0,.057,.035,.049);
    p(G.box,m.wool,.018,.244,0,.087,.024,.131);p(G.cone,m.wood,.141,.388,0,.050,.081,.057,0,0,.18);
  }
}
export function candleArch(o,m,x,y,z,s=1){
  box(o,m.wood,x,y,z,1.06*s,.046*s,.23*s);
  const a=[];for(let i=0;i<=14;i++){const t=i/14*Math.PI;a.push([x+.44*s*Math.cos(t),y+.32*s*Math.sin(t)+.028*s,z]);}
  for(let i=1;i<a.length;i++)rod(o,m.gold,a[i-1],a[i],.018*s,G.fineRod);
  for(let i=0;i<7;i++){const t=Math.PI*(.08+i*.14),X=x+.43*s*Math.cos(t),Y=y+.32*s*Math.sin(t)+.028*s;
    part(o,G.rod,m.ivory,X,Y+.056*s,z,.038*s,.11*s,.038*s);part(o,G.bulb,m.candle,X,Y+.124*s,z,.023*s,.040*s,.024*s);
  }
  part(o,G.tinyStar,m.glassGold,x,y+.14*s,z,.071*s,.074*s,.070*s);
}
export function lanternFestival(w){
  const {batch:o,mat:m,light}=w;
  // Paper luminaria warm the edges of the trail without blocking walking lines.
  const path=w.paths.find(x=>x.id==='lanternTrail');
  for(let j=4;j<Math.min(44,path.points.length-2);j+=3){
    const a=path.points[j-1],b=path.points[j+1],q=path.points[j];const L=Math.hypot(b.x-a.x,b.z-a.z)||1;
    for(const d of [-1,1]){
      const x=q.x+d*(b.z-a.z)/L*1.64,z=q.z-d*(b.x-a.x)/L*1.64,y=ground(x,z);
      if(pondEdge(x,z)<1.04||w.physics.blocked(x,z,y,.39))continue;
      box(o,m.wood,x,y+.047,z,.39,.095,.31);part(o,G.box,m.dim,x,y+.285,z,.324,.372,.256,0,0,d*.074);
      box(o,m.cream,x,y+.473,z,.345,.013,.257);part(o,G.tinyStar,m.filament,x,y+.275,z+.136,.077,.077,.082,0,0,.03);
      w.decor?.add(8,x,y+.29,z,.41);light.add(x,y+.31,z,{glow:.71,power:9,bake:.40,radius:4.65,distance:6.8});
    }
  }
  // Suspended faceted Christmas stars use octahedral bodies with projecting bronze tips.
  for(const [x,y,z] of [[116.4,4.55,124.6],[120.6,4.28,127.8],[123.0,4.60,133.7],[124.0,4.79,136.3]]){
    const h=ground(x,z)+y;w.decor?.add(7,x,h,z,.78);
    part(o,G.bulb,m.dim,x,h,z,.31,.42,.31);part(o,G.bulb,m.filament,x,h,z,.21,.272,.218,0,.8,0);
    for(let i=0;i<6;i++){const a=i/6*TAU;rod(o,m.gold,[x+Math.cos(a)*.14,h,z+Math.sin(a)*.14],[x+Math.cos(a)*.40,h+(i%2?.115:-.087),z+Math.sin(a)*.40],.028,G.fineRod);}
    rod(o,m.iron,[x,h+.32,z],[x-.025,h+1.26,z+.023],.012,G.fineRod);light.add(x,h,z,{glow:.94,power:17,bake:.18,radius:5.7,distance:8.0});
  }
}

export function marketCanopy(w){
  const {batch:o,mat:m,light}=w;const r=rng(59013);
  for(const [x,z,h,span] of [[112,-107,4.41,5.3],[124.7,-109,5.02,5.0],[133,-99.8,4.404,5.6]]){
    for(const d of [-1,1]){
      const xx=x+d*span*.5,gy=ground(xx,z);rod(o,m.iron,[xx,gy,z],[xx,h+.30,z],.084);part(o,G.rod,m.bronze,xx,gy+.123,z,.435,.238,.446);
      part(o,G.smallBall,m.gold,xx,h+.356,z,.116,.162,.116);w.physics.cylinder(xx,z,.147,gy,h+.3,'market canopy post');
    }
    rod(o,m.iron,[x-span*.5,h,z],[x+span*.5,h,z],.028,G.fineRod);
    for(let j=0;j<19;j++){
      const d=(j/18-.5)*span*.972,drop=.32+Math.sin(j*.83)**2*.41+r()*.56;
      rod(o,m.bronze,[x+d,h,z],[x+d,h-drop,z+.026],.0062,G.fineRod);
      for(let k=0;k<5;k++)part(o,G.bulb,k%3?m.filament:m.amber,x+d,h-(k+.5)*drop/5,z+.037,.023,.034,.028,0,j*.31,0);
      if(j%5===2){part(o,G.tinyStar,m.dim,x+d,h-drop-.085,z,.185,.185,.30,0,j*.392,0);light.halo(x+d,h-drop-.02,z,.34,'#e7af75',.30);}
    }
    w.decor.add(71,x,h-.60,z,span);
  }
}

export function stencilLights(w){
  const scene=w.scene,m=w.mat,clock=uniform(0),energy=uniform(.8),show=uniform(1);
  const mat=new T.MeshBasicNodeMaterial({name:'Amber snowflake gobo · localized projected light',transparent:true,depthWrite:false,blending:T.AdditiveBlending});
  const on=uv().sub(.5).mul(2),r=on.length();
  const sector=fract(atan(on.y,on.x).mul(.95493).add(clock.mul(.023))).sub(.5).mul(Math.PI/3);
  const side=sin(sector).abs().mul(r),fwd=cos(sector).mul(r);
  const ray=smoothstep(.036,.009,side),branches=smoothstep(.036,.009,side.sub(fwd.sub(.22).mul(.48)).abs()).mul(smoothstep(.20,.27,fwd)).mul(smoothstep(.48,.42,fwd))
    .add(smoothstep(.034,.008,side.sub(fwd.sub(.43).mul(.57)).abs()).mul(smoothstep(.43,.49,fwd)).mul(smoothstep(.64,.59,fwd)));
  const beam=smoothstep(.93,.68,r).mul(ray.mul(.76).add(branches).add(.045)).mul(energy).mul(show);
  mat.colorNode=vec3(.83,.47,.20);mat.opacityNode=beam.mul(.21);
  for(const [x,z,yaw,surface] of [[26.2,14.5,1.71,.090],[111.7,-101.6,-.41,.113],[127.4,-105.2,1.41,.113]]){
    const g=new T.PlaneGeometry(5.7,5.7,18,18);g.rotateX(-Math.PI/2);const a=g.attributes.position;for(let i=0;i<a.count;i++)a.setY(i,ground(x+a.getX(i),z+a.getZ(i))+surface+.027);g.computeVertexNormals();
    const p=new T.Mesh(g,mat);p.position.set(x,0,z);p.renderOrder=2;scene.add(p);
    const xx=x+Math.sin(yaw)*3.62,zz=z+Math.cos(yaw)*3.62,y=ground(xx,zz);
    part(w.batch,G.taper,m.bronze,xx,y+.54,zz,.127,1.08,.13);part(w.batch,G.rod,m.iron,xx,y+.086,zz,.37,.17,.37);
    part(w.batch,G.rod,m.iron,xx,y+1.13,zz,.265,.392,.263,1.25,yaw,0);part(w.batch,G.smallBall,m.dim,xx-Math.sin(yaw)*.17,y+1.083,zz-Math.cos(yaw)*.17,.109,.072,.107);
    w.physics.cylinder(xx,zz,.17,y,y+1.30,'gobo');w.decor.add(72,xx,y+1.03,zz,.63,'gobo');
  }
  w.anim.push((dt,t,pos,s)=>{clock.value=s.reduced?9:t;energy.value=s.lights;show.value=.70+.27*Math.sin(t*.40)**2;});
}

// Readable silhouettes and inspectable surfaces for the specialty stall goods.
// These are separate mesh constructions, not colour variants of the cup prop.
export function merchantsTray(out,m,x,y,z,style){
  const p=(g,mat,X,Y,Z,A,B=A,C=A,ax=0,ay=0,az=0)=>part(out,g,mat,x+X,y+Y,z+Z,A,B,C,ax,ay,az);
  const line=(mat,a,b,r)=>rod(out,mat,[x+a[0],y+a[1],z+a[2]],[x+b[0],y+b[1],z+b[2]],r,G.fineRod);
  const tray=(w=1.47,d=.58)=>p(G.box,m.wood,0,.020,0,w,.044,d);
  if(style==='apple'){
    tray();for(let j=0;j<8;j++){
      const X=-.53+(j%4)*.34,Z=(j/4|0)*.27-.11,ty=.164+(j%3)*.017;
      p(G.ball,j%3?m.glassRed:m.wine,X,ty,Z,.125,.120,.111,0,j,.06-.04*j);
      p(G.smallBall,m.glassRed,X+.05,ty+.029,Z-.017,.073,.094,.088);
      line(m.wood,[X,ty+.076,Z],[X-.029,ty+.216,Z+.013],.014);
      for(let k=0;k<4;k++)p(G.rock,m.ivory,X+.037+Math.cos(k*2.4)*.058,ty+.018+Math.sin(k*2.4)*.054,Z+.10,.012,.009,.012,0,k,.2);
    }
  }else if(style==='rolls'){
    tray();for(let j=0;j<4;j++){
      const X=-.51+j*.33,Z=-.06+(j%2)*.036;p(G.ball,m.wood,X,.101,Z,.142,.088,.143);
      for(let i=0;i<24;i++){
        const loc=i=>{const a=i*.50,s=.012+.11*i/24;return [X+Math.cos(a)*s,.178-.016*i/24,Z+Math.sin(a)*s];};line(i%5===1?m.cream:m.bronze,loc(i),loc(i+1),i%5===1?.013:.019);
      }
    }
    for(let j=0;j<3;j++){
      const X=-.39+j*.42,Z=.192;p(G.box,m.wood,X,.091,Z,.285,.091,.168,j%2*.09,-.22,.20);p(G.box,m.glassGold,X+.012,.136,Z,.270,.026,.151,0,-.23,.20);
      for(let k=0;k<7;k++)line(m.wood,[X-.115+k*.039,.154,Z-.06],[X-.115+k*.039,.154,Z+.06],.005);
      for(let k=0;k<4;k++)line(m.wood,[X-.116,.154,Z-.064+k*.041],[X+.112,.154,Z-.064+k*.041],.005);
    }
  }else if(style==='bread'){
    tray(1.62,.55);for(let j=0;j<5;j++){
      const X=-.66+j*.274;
      p(G.ball,m.bronze,X,.119,.045,.113,.092,.152,0,.28,-.16);p(G.ico,m.cream,X,.104,.071,.102,.069,.141,0,.27,0);
      const a=[];for(let k=0;k<=6;k++){const t=k/6;a.push([X-.061+.128*t,.153+Math.sin(t*Math.PI)*.089,.028+(t-.49)*.275]);}for(let k=1;k<a.length;k++)line(m.red,a[k-1],a[k],.042);
      for(let k=0;k<3;k++)line(m.ivory,[X-.078,.187-k*.014,-.01+k*.043],[X+.034,.198-k*.025,.024+k*.031],.006);
    }
  }else if(style==='wool'){
    tray(1.27,.61);for(let j=0;j<4;j++){
      const X=-.43+j*.27,Z=(j%2)*.175-.04,cloth=j%2?m.velvet:m.wool;
      p(G.ball,cloth,X,.155,Z,.133,.128,.136,0,j*.32,0);p(G.rod,cloth,X,.106,Z,.278,.076,.274,0,0,.13);
      p(G.rod,m.cream,X,.084,Z,.269,.037,.266,0,0,.13);p(G.ball,m.wool,X-.026,.283,Z+.014,.060,.048,.067);
      for(let k=0;k<7;k++){const a=k*TAU/7;const xx=X+Math.cos(a)*.098,zz=Z+Math.sin(a)*.095;line(m.cream,[xx,.136,zz],[xx*.999,.174,zz],.012);}
    }
  }else if(style==='candle'){
    tray();for(let j=0;j<9;j++){
      const X=-.46+j%3*.43,Z=(-1+(j/3|0))*.168;
      p(G.box,j%2?m.plaster:m.ivory,X,.081,Z,.298,.099,.146,0,j%3*.32-.42,0);
      p(G.box,m.green,X,.089,Z,.125,.112,.153,0,j%3*.32-.42,0);
      p(G.tinyStar,m.cream,X,.148,Z,.040,.044,.105,-Math.PI/2,0,j*.36);
    }
  }else if(style==='books'){
    tray();for(let j=0;j<5;j++){
      const X=-.57+j*.270,A=j*.29-.48,color=j%3===0?m.wine:j%3===1?m.green:m.plank;
      p(G.box,color,X,.074,-.08,.231,.051,.247,0,A,0);p(G.box,m.ivory,X,.095,-.078,.216,.030,.222,0,A,0);
      p(G.box,color,X,.120,-.083,.238,.026,.256,0,A,0);p(G.box,m.glassGold,X-.015,.135,-.062,.08,.006,.127,0,A,0);
      for(let k=0;k<3;k++)p(G.box,m.ivory,X+.034*k,.085+.020*k,.175,.203,.017,.134,-.18,A+.36*k,.07);
      p(G.tinyStar,m.bronze,X,.147,.126,.035,.033,.13,Math.PI/2,A,.17);
    }
  }
}
