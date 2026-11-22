import * as T from 'three/webgpu';
import layout from './data/layout.json';
import {ground,pondEdge} from './terrain.js';
import {TAU,between,clamp,damp,distSegment,lerp,rng,smooth} from './math.js';
import {G,box,ball,part,rod,line,absorb,compact,signTexture} from './mesh.js';
import {bench,bin,lowLantern,lamp,rail,shrub,urn,festoon,swag,wreath,lantern,candle,gifts,marker,makePondFlag,snowman,nutcracker,reindeer,candy} from './props.js';
import {pavilion,marketStall} from './buildings.js';
import {makeTreeAsset} from './vegetation.js';

export function buildAreas(w){
  pond(w);garden(w);rink(w);carousel(w);canopy(w);quiet(w);glades(w);tunnel(w);miniatures(w);entry(w);
}
function balcony(w,ax,az,bx,bz,width,altA,altB,{curve=0,rails='wood',lanternInterval=7,stone=false,id='deck',ends=true,joints=null}={}){
  const {batch:b,mat:m,physics}=w;
  const length=Math.hypot(bx-ax,bz-az),dirx=(bx-ax)/length,dirz=(bz-az)/length,px=dirz,pz=-dirx,yaw=Math.atan2(dirx,dirz),by=t=>lerp(altA,altB,t)+curve*Math.sin(t*Math.PI);
  const edge=(t,d)=>{
    const useA=joints?.[0]??[px,pz],useB=joints?.[1]??[px,pz];
    const wx=lerp(useA[0],px,clamp(t*length/2.5,0,1))+lerp(useB[0],px,clamp((1-t)*length/2.5,0,1))-px;
    const wz=lerp(useA[1],pz,clamp(t*length/2.5,0,1))+lerp(useB[1],pz,clamp((1-t)*length/2.5,0,1))-pz;
    return [lerp(ax,bx,t)+wx*d*width*.5,lerp(az,bz,t)+wz*d*width*.5];
  };
  for(const d of [1,-1]){
    const coords=[];for(let j=0;j<=Math.ceil(length/2.8);j++){const t=j/Math.ceil(length/2.8),[x,z]=edge(t,d);coords.push([x,by(t),z]);
      if(j%lanternInterval===1){const h=by(t)+.95;lantern(b,m,x,h+.29,z,.33,'brass');w.decor.add(3,x,h+.29,z,.42);w.light.add(x,h+.32,z,{power:10,distance:8.1,glow:.59,bake:.15,radius:4.7});}
      if(rails==='rope'&&j%2===0){const a=[x,by(t)+.83,z];if(j>0){const tt=(j-2)/Math.ceil(length/2.8),[ox,oz]=edge(tt,d),c=[ox,by(tt)+.83,oz];const mm=[(x+c[0])/2,(a[1]+c[1])/2-.27,(z+c[2])/2];line(b,m.wood,[c,mm,a],.032,G.rod);}}}
    rail(w,coords,{height:rails==='rope'?.94:1.01,style:rails==='iron'?'iron':'wood',step:rails==='rope'?2.1:.98});
    if(rails==='iron')swag(b,m,coords.map(([x,y,z],i)=>[x,y+.68,z]),true,true,.11);
  }
  const N=Math.ceil(length/.355);
  for(let j=0;j<N;j++){
    const t=(j+.5)/N,x=lerp(ax,bx,t),z=lerp(az,bz,t),y=by(t),t1=Math.min(1,t+.5/N),t0=Math.max(0,t-.5/N),angle=-Math.atan2(by(t1)-by(t0),length*(t1-t0));
    const mat=stone?m.limestone:j%8===0?m.plank:m.wood;part(b,G.box,mat,x,y-.095,z,width+.091,.185,length/N-.012,angle,yaw,0,j%6===3?'#c3b1a2':null,true,'deck planks');
    if(j%4===1){for(const k of [-1,1])part(b,G.rock,m.snowProp,x+px*k*width*.451,y+.021,z+pz*k*width*.451,.16,.050,.17,0,yaw,0);}
  }
  const count=Math.ceil(length/4.2);for(let j=1;j<=count;j++){
    const a=(j-1)/count,b=j/count;physics.deck(lerp(ax,bx,a),lerp(az,bz,a),lerp(ax,bx,b),lerp(az,bz,b),width,by(a),by(b),stone?'stone':'wood');
  }
  if(curve){
    for(const d of [-1,1]){const coords=[];for(let j=0;j<=32;j++){const t=j/32;coords.push([lerp(ax,bx,t)+px*d*width*.49,by(t)-.30,lerp(az,bz,t)+pz*d*width*.49]);}line(b,m.iron,coords,.19,G.rod);}
  }
  if(ends){for(const [x,z,y] of [[ax,az,altA],[bx,bz,altB]])for(const d of[-1,1]){const xx=x+d*px*width*.5,zz=z+d*pz*width*.5;box(b,stone?m.limestone:m.wood,xx,y+.38,zz,.39,1.34,.39,yaw);part(b,G.rock,m.snowProp,xx,y+1.074,zz,.29,.083,.29,0,yaw,0);}}
  w.surveyDecks.push({id,ax,az,bx,bz,by,width});
  return {length,point:t=>[lerp(ax,bx,t),by(t),lerp(az,bz,t)]};
}
function pond(w){
  const {batch:o,mat:m,physics,light}=w;
  const bridge=balcony(w,-99,142,-62,119,3.8,ground(-99,142)+.08,ground(-62,119)+.13,{curve:2.55,rails:'iron',lanternInterval:4,id:'bow-bridge'});
  balcony(w,-70,77,-64,86,2.65,ground(-70,77)+.08,ground(-64,86)+.10,{curve:.51,rails:'iron',stone:true,id:'stone-bridge'});
  const dockY=-.7;
  balcony(w,-169,109,-158,102,2.8,ground(-169,109)+.10,dockY,{rails:'wood',id:'dock'});
  for(const [x,z] of [[-157,103],[-159,108],[-165,108]]){
    const g=new T.Group();g.position.set(x,dockY-.35,z);g.rotation.y=(z-104)*.19;
    part(g,G.ico,m.wood,0,0,0,1.58,.26,.54,0,0,.031);part(g,G.ico,m.red,0,.071,0,1.46,.201,.47);box(g,m.wood,0,.22,0,.26,.073,.75);box(g,m.snowProp,-.08,.25,0,.24,.048,.72);
    absorb(g,o,false,'rowing boats');
  }
  const b=new T.Group();b.position.set(-173,ground(-173,111),111);b.rotation.y=1.41;
  box(b,m.wood,0,1.24,0,7.7,2.47,5.3);part(b,G.box,m.red,0,2.6,0,8.40,.22,6,0,0,.17);part(b,G.box,m.snowProp,0,2.75,0,8.23,.16,5.96,0,0,.17);
  for(const k of [-1,1]){
    box(b,m.dim,k*2.42,1.50,2.66,1.41,1.30,.055);box(b,m.wood,k*2.42,1.50,2.71,.16,1.42,.16);box(b,m.wood,k*2.42,1.50,2.71,1.59,.12,.17);lantern(b,m,k*1.19,2.13,2.83,.45,'brass');
    part(b,G.rod,m.limestone,k*3.43,.25,3.4,.53,.49,.53);
  }
  box(b,m.plank,0,1.11,2.675,1.71,2.18,.18);wreath(b,m,0,1.66,2.79,.40);
  const sign=signTexture('BOATHOUSE','MIRRORWATER · ROWING & CAFÉ');part(b,G.plane,sign,0,2.18,2.802,2.96,.50,1);
  absorb(b,o,true,'boathouse');physics.box(-173,111,7.7,5.3,b.position.y,b.position.y+2.5,1.41,'boathouse');light.add(-170.3,b.position.y+2.06,110.9,{power:33,glow:1.13,distance:13,radius:9,bake:.40});
  pavilion(w,-64.5,72.1,{r:4.85,h:3.74,theme:'green',id:'pond-pavilion'});
  lamp(w,-70.5,70.2,{wreath:true,h:4.12,power:39});lamp(w,-167.83,126.86,{h:3.89,s:.87,power:35});lamp(w,-105,144,{wreath:true});lamp(w,-65,118,{wreath:true,power:46});
  makePondFlag(w,-106.4,140.1,-.18);
  const r=rng(2111),buoys=[],pondCentre=[-115,layout.seaLevel,102],lanternCount=12;
  const form=new T.Group();part(form,G.rod,m.wood,0,0,0,.39,.095,.385);lantern(form,m,0,.232,0,.29,'paper');
  const cluster=new T.Group();cluster.position.set(...pondCentre);cluster.name='Drifting pond lanterns';w.dynamicGroup(cluster,151);
  const rings=compact(form).children.map(source=>{
    const mesh=new T.InstancedMesh(source.geometry,source.material,lanternCount);mesh.name='Shared floating lantern parts';
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);cluster.add(mesh);return mesh;
  });
  const local=new T.Object3D();
  function placeLantern(i,q){
    local.position.set(q.g.position.x-pondCentre[0],q.g.position.y-pondCentre[1],q.g.position.z-pondCentre[2]);
    local.rotation.y=q.g.rotation.y;local.updateMatrix();for(const mesh of rings)mesh.setMatrixAt(i,local.matrix);
  }
  for(let j=0;j<lanternCount;j++){
    const t=r()*TAU,rr=between(r,.29,.82),x=-115+Math.cos(t)*53*rr,z=102+Math.sin(t)*34*rr,y=layout.seaLevel+.065;
    const g=new T.Object3D();g.position.set(x,y,z);const q={g,x,z,y};buoys.push(q);placeLantern(j,q);
    w.decor.motion(43,g,.23,.43);light.halo(x,y+.23,z,.43,'#ffb881',.35);
  }
  for(const mesh of rings){mesh.computeBoundingSphere();mesh.boundingSphere.radius+=10;}
  w.anim.push((dt,t,cam,s)=>{
    const cue=w.landmarks.pondCue;if(cue&&w.rhythmClock>=cue.at+cue.len)w.landmarks.pondCue=null;
    const f=cue?clamp((w.rhythmClock-cue.at)/cue.len,0,1):0,offset=Math.sin(f*Math.PI);
    for(let i=0;i<buoys.length;i++){
      const q=buoys[i];q.g.visible=cluster.visible;if(!cluster.visible)continue;
      const x=q.x+Math.sin(t*.097+i)*.95+(s.reduced?.5:3.4)*offset,z=q.z+Math.sin(t*.121+i*1.81)*.63+Math.sin(2*f*Math.PI)*.88;
      const drift=pondEdge(x,z)<.887;
      q.g.position.set(drift?x:q.x,q.y+Math.sin(t*1.27+i)*.031,drift?z:q.z);q.g.rotation.y=Math.sin(t*.166+i)*.69;
      placeLantern(i,q);
    }
    if(cluster.visible)for(const mesh of rings)mesh.instanceMatrix.needsUpdate=true;
  });
  w.actions.add('float-a-light','湖邊的燭光浮燈',-165,dockY+1.02,106,{radius:.59,reach:2.6,hint:'送一盞燈',allowOccluded:true,action:ctx=>{buoys[0].x=-160;buoys[0].z=106;ctx.audio.chime('soft');ctx.discovery.add('float-a-light','送給池塘的一盞燈','它繞過薄冰，往樹影走去。');}});
  w.landmarks??={};w.landmarks.bridge=bridge;
}
// One motif shared by a family of carved winter gardeners. The robe is an
// asymmetrically folded surface of revolution, not a cone with a face.
function keeperGeometry(){
  const pos=[],UV=[],ix=[],seg=30;
  const shape=[[0,.22,.14],[.07,.29,.205],[.18,.301,.20],[.31,.262,.175],[.49,.235,.171],[.66,.234,.158],[.90,.189,.132],[1.04,.165,.124],[1.17,.205,.134],[1.31,.229,.121],[1.40,.151,.102],[1.42,.085,.078]];
  for(const [j,[y,rx,rz]] of shape.entries())for(let k=0;k<=seg;k++){
    const a=k/seg*TAU,fold=.016*Math.sin(7*a+y*2.3)+.013*Math.sin(11*a-y*.77)+.005*Math.cos(a*17+y*5.4),deep=fold*(.75+.24*Math.cos(y*5-1));
    pos.push(Math.cos(a)*(rx+fold)+.087*Math.sin(y*2.11-.45),y-.012*Math.sin(5*a)*(1-y*.39),Math.sin(a)*(rz+deep)-.046*y*y);
    UV.push(k/seg*.83,y*.56);const i=pos.length/3-1;
    if(j&&k)ix.push(i-seg-2,i,i-seg-1,i-seg-2,i-1,i);
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(UV,2));g.setIndex(ix);g.computeVertexNormals();return g;
}
const keeper=keeperGeometry(),sculpted=new T.SphereGeometry(1,18,12);
function stoneKeeper(w,x,y,z,yaw,variant){
  const g=new T.Group(),{batch:o,mat:m}=w;g.position.set(x,y,z);g.rotation.y=yaw;
  const stu=m.limestone;part(g,G.disk,stu,0,.079,0,1.36,.17,1.36);part(g,G.disk,stu,0,.207,0,1.22,.106,1.22);
  part(g,G.post,stu,0,.677,0,.78,.85,.78);part(g,G.disk,stu,0,1.124,0,1.091,.084,1.091);part(g,G.disk,m.ivory,0,1.192,0,1,.054,1);
  const h=1.221;part(g,keeper,stu,0,h,0,1,1,1,0,0,0,null,true);
  part(g,sculpted,stu,.012,h+1.512,-.079,.066,.147,.068,0,.12,.108);
  part(g,sculpted,stu,.024,h+1.630,-.065,.112,.149,.116,0,.13,.094);
  part(g,sculpted,stu,-.007,h+1.658,-.132,.125,.139,.071,0,.02,.092);
  part(g,G.smallBall,stu,.029,h+1.622,.050,.035,.042,.035);
  for(const d of [-1,1]){
    part(g,G.smallBall,stu,d*.117+.021,h+1.63,-.067,.039,.052,.031);
    rod(g,stu,[d*.208,h+1.291,-.032],[d*(variant?.299:.273),h+1.010,.026],.112,G.post);
    rod(g,stu,[d*(variant?.299:.273),h+1.01,.026],[d*.118,h+.989,.169],.084,G.post);
    part(g,sculpted,stu,d*.117,h+.989,.166,.053,.045,.050);
  }
  part(g,G.cap,stu,0,h+.993,.155,.213,.131,.176,0,.2,Math.PI);
  for(let k=0;k<5;k++)part(g,G.rock,stu,Math.cos(k*2.4)*.075,h+1.072+Math.sin(k*1.6)*.025,.155+Math.sin(k*2.4)*.07,.058,.061,.065,0,k*.31,0);
  part(g,G.rock,m.snowProp,.011,1.227,-.278,.53,.037,.26,0,.14,0);
  absorb(g,o,false,'carved winter gardener');
  w.physics.cylinder(x,z,.63,y,y+3.06,'garden statue');
}
function garden(w){
  const {batch:o,mat:m,physics,light,actions}=w;const cx=0,cz=-144,y=ground(cx,cz),r=rng(3183);
  for(const d of [-1,1]){
    for(let j=0;j<25;j++){const z=-144+(j-12)*2.84;if(Math.abs(z+145)<5.5&&d<0)continue;shrub(w,d*35.3,z,1.53,1.35,true);if(j%3===0)part(o,G.rock,m.snowProp,d*34.7,ground(d*34.7,z)+.32,z,1.04,.22,.85,0,j*.38);}
    for(let j=0;j<16;j++){const x=d*(j+.9)*2.18;if(Math.abs(x)<4.8)continue;shrub(w,x,-175.4,1.6,1.29,true);}
    for(const z of [-123,-165]){
      lamp(w,d*23,z,{h:4.00,power:38,s:.92,wreath:false});const xx=d*15.4,zz=z+(z>-140?-1:4),gy=ground(xx,zz);
      const cnt=19,pt=[];for(let j=0;j<=cnt;j++){const a=j/cnt*TAU;pt.push([xx+Math.cos(a)*4.75,gy+.09,zz+Math.sin(a)*3.20]);}
      for(let i=1;i<pt.length;i++){const a=pt[i-1],b=pt[i];rod(o,m.limestone,a,b,.156,G.rod);rod(o,m.snowProp,[a[0],a[1]+.14,a[2]],[b[0],b[1]+.14,b[2]],.059,G.rod);}
      for(let i=0;i<19;i++){
        const a=i*2.3999,h=between(r,.16,.62),xx1=xx+Math.cos(a)*between(r,1,4.05),zz1=zz+Math.sin(a)*between(r,1,2.7);const yy=ground(xx1,zz1);
        part(o,G.ico,m.green,xx1,yy+h*.42,zz1,.38,h*.83,.29,0,a,i*.17);part(o,G.rock,m.red,xx1,yy+h*.75+.05,zz1,.23,.085,.23,0,a,0);
        if(i%3===0)part(o,G.smallBall,m.glassRed,xx1+.09,yy+h*.91+.04,zz1+.11,.06);
      }urn(w,xx,zz,gy,'star',.81);
    }
    for(const t of [-1,1]){
      const xx=d*10.2,zz=-145+t*13.47;const yy=ground(xx,zz);
      // At the southwest entry the caretaker greets the path. Deeper
      // statues face the fountain and frame it from across the parterre.
      const entry=d<0&&t>0,yaw=entry?-.42:Math.atan2(-xx,-144-zz);
      stoneKeeper(w,xx,yy,zz,yaw,(d+t)===0);
      const theta=entry?-.75:d*.7+t*.2,lx=xx+Math.sin(theta)*1.31,lz=zz+Math.cos(theta)*1.31;
      lowLantern(w,lx,lz,'brass',{post:.17,s:.48,power:12,bake:.24,radius:5.2});
    }
  }
  const basin=new T.LatheGeometry([[0,0],[4.92,0],[4.94,.085],[4.82,.20],[4.56,.26],[4.51,.47],[4.56,.64],[4.42,.79],[4.16,.83],[3.98,.76],[3.95,.63]].map(a=>new T.Vector2(...a)),48);
  part(o,basin,m.limestone,cx,y,cz,1,1,1,0,0,0,null,true);part(o,G.disk,m.ice,cx,y+.48,cz,7.95,.18,7.95);
  for(const [h,r1] of [[.79,.55],[1.04,.68],[2.04,.53],[2.70,.28]]){part(o,G.rod,m.limestone,cx,y+h,cz,r1*1.76,.65,r1*1.76);}
  for(const [height,radius] of [[1.51,2.36],[2.37,1.23],[2.93,.79]]){
    const bowl=new T.LatheGeometry([[0,-.27],[radius*.28,-.25],[radius*.76,-.13],[radius,.025],[radius,.16],[radius*.87,.19],[radius*.81,.08],[0,.01]].map(p=>new T.Vector2(...p)),28);
    part(o,bowl,m.limestone,cx,y+height,cz,1,1,1,0,0,0,null,true);part(o,G.disk,m.ice,cx,y+height+.10,cz,radius*1.57,.053,radius*1.57);
    for(let i=0;i<16;i++){
      const a=i/16*TAU,b=r()*.93;part(o,G.cone,m.iceglass,cx+Math.cos(a)*radius*.89,y+height-b*.24,cz+Math.sin(a)*radius*.89,.08,.21+b*.36,.09,0,a,Math.PI);}
  }
  const droplets=new T.InstancedMesh(G.bulb,m.glassSilver,165);droplets.frustumCulled=false;droplets.position.set(cx,y,cz);w.dynamicGroup(droplets,51);const temp=new T.Object3D();let tick=-1;
  w.anim.push((dt,t)=>{if(!droplets.visible)return;const f=tick<0?.20:clamp(1-(t-tick)/14,0,1);for(let i=0;i<droplets.count;i++){
    const u=(i*.64655+t*(.66+(i%13)*.024))%1,a=i*2.4;const g=(i%4)*.255;
    temp.position.set(Math.cos(a)*(u*(1.63+g)+.03),2.98+1.12*Math.sin(u*Math.PI)*(.34+f)-u*2.4,Math.sin(a)*(u*(1.63+g)+.03));temp.scale.setScalar(.043+(i%5)*.006);temp.updateMatrix();droplets.setMatrixAt(i,temp.matrix);
  }droplets.instanceMatrix.needsUpdate=true;});
  physics.cylinder(cx,cz,4.91,y,y+2.85,'fountain');
  actions.add('fountain','象牙花園噴泉',0,y+1.0,-139.1,{radius:1.17,reach:3.0,allowOccluded:true,hint:'讓水流高一點',action:ctx=>{tick=ctx.now();ctx.audio.chime('water');}});
  for(let i=0;i<5;i++){const a=i/5*TAU+.41;lowLantern(w,cx+Math.cos(a)*5.45,cz+Math.sin(a)*5.45,'ice',{post:.03,power:12,bake:.36});}
}
function rink(w){
  const {batch:o,mat:m,physics,light}=w;const {x,z,rx,rz}=layout.rink;const y=.08;
  // Separate arcs leave two open entrances at 3 and 9 o’clock.
  for(const side of [0,1]){
    const points=[];for(let j=0;j<=32;j++){
      const a=lerp(.11,Math.PI-.11,j/32)+Math.PI*side,xx=x+(rx+.49)*Math.cos(a),zz=z+(rz+.49)*Math.sin(a);points.push([xx,y,zz]);
      if(j%3===1){lowLantern(w,xx,zz,'ice',{y:y+.95,power:9,post:0,s:.46});if(j%6===1)wreath(o,m,xx,.79,zz,.28,Math.PI/2-a);}
    }
    rail(w,points,{height:1.02,style:'wood',step:1.54});
  }
  for(let i=0;i<10;i++){
    const a=(i+.5)/10*TAU,xx=x+(rx+4.15)*Math.cos(a),zz=z+(rz+5.25)*Math.sin(a);if(!physics.blocked(xx,zz,ground(xx,zz),.85))lamp(w,xx,zz,{h:4.19,power:47,wreath:i%2===0});
  }
  for(let i=0;i<4;i++)makeTreeAsset(o,m,117+13*i,ground(117+13*i,30.2),30.2,2.9+i*.32,881+i*17);
  const hutX=149,hutZ=31,hy=ground(hutX,hutZ);
  const h=new T.Group();h.position.set(hutX,hy,hutZ);h.rotation.y=Math.PI;
  box(h,m.wood,0,1.14,0,5.73,2.23,3.45);box(h,m.limestone,0,.12,0,6.04,.24,3.80);
  for(const d of [-1,1]){part(h,G.box,m.roof,d*1.53,2.63,0,3.42,.218,4.28,0,0,-d*.333);part(h,G.box,m.snowProp,d*1.56,2.76,0,3.31,.153,4.26,0,0,-d*.333);lantern(h,m,d*2.41,2.02,1.94,.48,'brass');}
  box(h,m.dim,0,1.46,1.752,2.61,.89,.051);box(h,m.wood,0,.99,1.82,2.91,.15,.31);for(const a of [-1,0,1])box(h,m.plank,a*1.32,1.48,1.80,.092,1.06,.18);
  const s=signTexture('SKATE HIRE','免費借用冰鞋');part(h,G.plane,s,0,2.02,1.818,2.53,.45,1);
  wreath(h,m,-1.93,1.50,1.79,.33);
  absorb(h,o,true);physics.box(hutX,hutZ,5.73,3.45,hy,hy+2.3,Math.PI,'rent');light.add(hutX,hy+1.88,hutZ-2.09,{power:39,glow:1.09,distance:12,bake:.48,radius:9.1});
  w.actions.add('skates','冰鞋租借亭',hutX,hy+1.49,hutZ-1.90,{radius:.91,reach:3,hint:'換上冰鞋',allowOccluded:true,action:(ctx,item)=>{ctx.activities.toggleSkates(item);}});
  for(let i=0;i<3;i++){
    const xx=125+i*3.03,zz=-15.65,yy=ground(xx,zz);part(o,G.disk,m.limestone,xx,yy+.21,zz,1.77,.42,1.74);const color=m.iceglass;
    if(i===0){part(o,G.ico,color,xx,yy+.88,zz,.62,.50,.37,0,.28,.27);rod(o,color,[xx-.23,yy+1.01,zz],[xx-.50,yy+1.63,zz],.114,G.rod);part(o,G.ico,color,xx-.44,yy+1.68,zz,.25,.16,.12);}
    else if(i===1){part(o,G.tinyStar,color,xx,yy+1.24,zz,.87,.87,1.1,0,-.34,0);}
    else{for(let j=0;j<5;j++){part(o,G.post,color,xx+(j<2?-.53:.52),yy+.73+j*.15,zz+(j*.292)%1-.5,.36,.61+j*.1,.39);part(o,G.cone,color,xx+(j<2?-.53:.52),yy+1.12+j*.20,zz+(j*.292)%1-.5,.47,.49,.45,0,j*.15,0);}}
    w.decor.add(46+i,xx,yy+1.07,zz,1.22,'ice sculpture');
    lowLantern(w,xx+.52,zz+.51,'ice',{power:10,post:0,glow:.51});physics.cylinder(xx,zz,.87,yy,yy+1.74,'ice sculpture');
  }
}
function horse(g,m,style=0){
  const body=style===1?m.green:style===2?m.wine:style===3?m.wood:m.ivory,leather=m.red;
  part(g,G.ball,body,0,.44,0,.71,.31,.23,0,0,.08);part(g,G.ball,body,.43,.71,0,.23,.46,.19,0,0,-.48);
  part(g,G.ball,body,.66,1.02,0,.37,.192,.17,0,0,-.20);ball(g,m.iron,.95,.995,.014,.103,.091,.14);
  for(const d of [-1,1]){part(g,G.ico,body,.57,1.255,d*.095,.089,.16,.07,0,0,.11);ball(g,m.coal,.66,1.093,d*.158,.034);
    rod(g,m.gold,[.48,1.04,d*.162],[.83,.981,d*.143],.021);
    for(const k of [-1,1]){const x=k*.47,z=d*.13,j=d*k,tip=[x+.29*k,.05+j*.045,z+d*.035];rod(g,body,[x,.39,z],[x+.16*k,.14+j*.09,z],.102,G.taper);rod(g,body,[x+.16*k,.14+j*.09,z],tip,.061);part(g,G.smallBall,m.coal,tip[0],tip[1]-.035,tip[2],.079,.06,.085);}}
  for(let i=0;i<6;i++)part(g,G.rock,m.wine,.27+i*.055,.76+i*.059,0,.094,.17,.13,0,0,-.36);
  part(g,G.ball,m.wine,-.78,.294,0,.28,.121,.092,0,0,-.73);
  part(g,G.ball,leather,-.095,.697,0,.31,.095,.252);part(g,G.box,m.gold,-.132,.65,0,.48,.069,.46,0,.0,0);
  for(const d of [-1,1])part(g,G.ringFine,m.gold,-.05,.405,d*.256,.118,.108,.132);
}
function carousel(w){
  const {batch:o,mat:m,physics,light}=w;const x=66,z=78,y=ground(x,z),radius=6.85,H=4.30;
  part(o,G.disk,m.limestone,x,y+.215,z,14.63,.46,14.63,0,0,0,null,true);
  part(o,G.disk,m.bronze,x,y+.465,z,14.27,.13,14.27);
  for(let i=0;i<48;i++){
    const a=i/48*TAU;part(o,G.bulb,m.filament,x+Math.cos(a)*7.04,y+.401,z+Math.sin(a)*7.04,.034);}
  const ruf=new T.LatheGeometry([[0,0],[1,0],[1,.052],[.99,.13],[.86,.24],[.64,.36],[.25,.75],[.077,.89],[0,.96]].map(a=>new T.Vector2(...a)),12);
  part(o,ruf,m.red,x,y+H,z,radius*1.138,3.1,radius*1.138,0,Math.PI/12,0,null,true);
  part(o,ruf,m.snowProp,x,y+H+.15,z,radius*1.07,3.1,radius*1.07,0,Math.PI/12,0);
  part(o,G.post,m.iron,x,y+H-.37,z,radius*2.065,.133,radius*2.065);
  const fY=y+H-.22;
  for(let i=0;i<12;i++){
    const a=TAU*(i+.5)/12,u=TAU*(i+1.5)/12,ar=radius*1.095;
    const pos=[x+ar*Math.cos(a),fY,z+ar*Math.sin(a)],to=[x+ar*Math.cos(u),fY,z+ar*Math.sin(u)];
    rod(o,m.wine,pos,to,.254,G.rod);rod(o,m.gold,[pos[0],fY+.239,pos[2]],[to[0],fY+.239,to[2]],.046,G.rod);
    const mid=[(pos[0]+to[0])/2,fY,(pos[2]+to[2])/2];part(o,G.ringFine,m.gold,mid[0],fY,mid[2],.42,.237,.81,0,Math.PI/2-(a+u)*.5,0);
    part(o,G.tinyStar,m.filament,mid[0],fY,mid[2],.151,.151,.25,0,Math.PI/2-(a+u)*.5,0);
    for(let k=0;k<54;k++){
      const t=k/54,xx=lerp(pos[0],to[0],t),zz=lerp(pos[2],to[2],t);
      for(const H of [-.23,-.10,.11])part(o,G.bulb,k%7===0?m.amber:m.filament,xx,fY+H,zz,.038,.051,.038);
      if(k%18===3)light.halo(xx,fY,zz,.52,'#ffc181',.37);
    }
    const c=[x+Math.cos(a)*radius*1.04,y+.36,z+Math.sin(a)*radius*1.04];
    rod(o,m.wood,c,[c[0],y+H,c[2]],.107,G.rod,null,true);rod(o,m.gold,[c[0],y+.55,c[2]],[c[0],y+H-.18,c[2]],.053,G.rod);
  }
  part(o,G.smallBall,m.glassGold,x,y+H+3.07,z,.29);part(o,G.tinyStar,m.amber,x,y+H+3.63,z,.51,.51,.74);
  for(let j=0;j<4;j++){const a=j/4*TAU;light.add(x+Math.cos(a)*4.9,y+H+.05,z+Math.sin(a)*4.9,{power:53,glow:.95,distance:12,radius:11,bake:.46,color:'#ffbb7c'});}
  const turn=new T.Group();turn.position.set(x,y+.537,z);w.dynamicGroup(turn,100);
  const stage=new T.Group();part(stage,G.disk,m.plank,0,-.039,0,radius*2,.113,radius*2);
  part(stage,G.post,m.glassGold,0,1.46,0,2.26,3.11,2.26);
  for(let k=0;k<12;k++){const a=k/12*TAU;part(stage,G.box,k%2?m.glassSilver:m.gold,Math.cos(a)*1.137,1.46,Math.sin(a)*1.137,.51,2.79,.041,0,Math.PI/2-a,0);}
  turn.add(compact(stage));const mounts=[];
  for(let i=0;i<12;i++){
    const a=i/12*TAU,rr=i%3===1?4.14:5.30;const base=new T.Group();base.position.set(Math.cos(a)*rr,0,Math.sin(a)*rr);base.rotation.y=-a-Math.PI/2;turn.add(base);
    const pole=new T.Group();rod(pole,m.gold,[0,.01,0],[0,H-.54,0],.043,G.rod);for(let j=0;j<8;j++)part(pole,G.rod,m.bronze,0,.24+j*.393,0,.107,.072,.107);base.add(compact(pole));
    const model=new T.Group();if(i%6===3){part(model,G.box,m.red,0,.33,0,1.24,.15,.69,0,Math.PI/2,0);part(model,G.box,m.ivory,-.28,.63,0,.15,.61,1.24,0,Math.PI/2,0);}
    else horse(model,m,i%4);
    const h=compact(model);base.add(h);mounts.push({base,body:h,a});
  }
  w.landmarks.carousel={turn,mounts,x,y,z,H};
  w.anim.push((dt,t,cam,s)=>{
    const ride=w.landmarks.carousel,cue=ride.cue;
    const f=cue?clamp((w.rhythmClock-cue.at)/cue.len,0,1):0;
    const speed=s.reduced?.046:.083;let nudge=0;
    if(cue){nudge=smooth(0,1,f)*(TAU-speed*cue.len);cue.offset=nudge;
      if(f>=1){ride.offset=(ride.offset??0)+nudge;ride.cue=null;nudge=0;}}
    turn.rotation.y=t*speed+(ride.offset??0)+nudge;
    for(let i=0;i<mounts.length;i++)mounts[i].body.position.y=.56+Math.sin(t*.85+i*.73)*(s.reduced?.10:.29);
  });
  physics.cylinder(x,z,6.90,y,y+2.16,'carousel');
  for(const [i,d] of [1,-1].entries()){
    const xx=x+d*7.75,zz=z+2.8;lowLantern(w,xx,zz,'brass',{s:.63,post:.46,y:ground(xx,zz),power:13});
    w.actions.add('carousel-'+i,'松間旋轉木馬',xx,ground(xx,zz)+1.47,zz,{reach:3,radius:1.21,hint:'選擇坐騎',action:(ctx)=>ctx.activities.chooseRide(i),allowOccluded:true});
  }
  const sx=91,sz=75,sy=ground(sx,sz);lamp(w,84.5,82.3,{power:38,wreath:true});
  bench(w,{id:'play-seat',x:88,z:82,yaw:2.36,cup:true});
  for(let j=0;j<2;j++){
    const xx=sx-4+j*5,left=xx-1.96,right=xx+1.96;for(const d of [left,right])for(const zz of [-1,1])rod(o,m.wood,[d,sy,sz+zz*1.64],[d,sy+3.42,sz],.09,G.rod,null,true);
    rod(o,m.wood,[left-.19,sy+3.41,sz],[right+.19,sy+3.41,sz],.116,G.rod,null,true);
    const swing=new T.Group();swing.position.set(xx,sy+3.36,sz);
    for(const d of [-1,1])rod(swing,m.iron,[d*.55,0,0],[d*.49,-2.34,.02],.021,G.fineRod);
    box(swing,m.wood,0,-2.34,0,1.24,.10,.47);box(swing,m.snowProp,0,-2.274,-.066,1.05,.048,.31);const g=compact(swing);w.dynamicGroup(g,49);
    w.anim.push((dt,t,cam,s)=>{g.rotation.x=Math.sin(t*.95+j*1.62)*(s.reduced?.015:.12);});
  }
  const ladderX=94,ladderZ=71;
  for(const d of [-1,1]){rod(o,m.iron,[ladderX+d*.58,sy,ladderZ-.61],[ladderX+d*.59,sy+2.29,ladderZ+.11],.052);rod(o,m.iron,[ladderX+d*.59,sy+2.29,ladderZ+.11],[ladderX+d*.58,sy+.17,ladderZ+3.96],.052);}
  part(o,G.box,m.red,ladderX,sy+1.26,ladderZ+1.99,1.13,.099,4.50,.52,0,0);
  for(let j=0;j<8;j++)rod(o,m.wood,[ladderX-.60,sy+.24+j*.257,ladderZ-.61+j*.09],[ladderX+.60,sy+.24+j*.257,ladderZ-.61+j*.09],.043);
  part(o,G.box,m.wood,98,sy+.54,78,2.86,.107,.49,0,.26,.14);rod(o,m.iron,[98,sy,78],[98,sy+.73,78],.089);
  rail(w,[[86,ground(86,67),67],[102,ground(102,67),67],[102,ground(102,84),84]],{height:.72,style:'wood',step:1.61});
  const r=rng(55617);for(let j=0;j<22;j++){
    const a=j/22*TAU,x1=100+Math.cos(a)*1.65,z1=73+Math.sin(a)*1.43;box(o,m.snowProp,x1,ground(x1,z1)+.20,z1,.44,.39+between(r,-.16,.20),.37,Math.PI/2-a);}
}
function canopy(w){
  const pts=layout.canopySpans;
  const y0=ground(...pts[0])+.069,yN=ground(...pts.at(-1))+.078,heights=[y0,8.7,10.53,10.17,10.42,8.8,yN];
  const sides=pts.slice(1).map(([x,z],i)=>{const dx=x-pts[i][0],dz=z-pts[i][1],L=Math.hypot(dx,dz);return [dz/L,-dx/L];});
  const joint=pts.map((_,i)=>{
    const lo=sides[i-1]??sides[0],hi=sides[i]??sides.at(-1),jx=(lo[0]+hi[0])*.5,jz=(lo[1]+hi[1])*.5,den=Math.max(.54,jx*hi[0]+jz*hi[1]);
    return [jx/den,jz/den];
  });
  for(let i=1;i<pts.length;i++){
    const [ax,az]=pts[i-1],[bx,bz]=pts[i],a=heights[i-1],b=heights[i];
    // Real mitred handrails and a timber landing at each bend; previously a
    // fixed diagonal support pierced the deck on the upslope corner.
    balcony(w,ax,az,bx,bz,2.1,a,b,{curve:i===1||i===pts.length-1?0:-.27,rails:'rope',lanternInterval:3,ends:false,id:'canopy',joints:[joint[i-1],joint[i]]});
    const {batch:o,mat:m,physics}=w;
    if(i<pts.length-1){
      const [jx,jz]=joint[i],yaw=Math.atan2(-jz,jx),base=ground(bx,bz),height=b-base;
      part(o,G.disk,m.wood,bx,b-.075,bz,2.21,.136,2.21,0,yaw,0,null,true,'canopy landings');
      physics.deck(bx+jz*.63,bz-jx*.63,bx-jz*.63,bz+jx*.63,2.13,b,b,'wood');
      for(const d of [-1,1]){
        const xx=bx+d*jx*1.19,zz=bz+d*jz*1.19;
        rod(o,m.wood,[xx,base,zz],[xx,b+1.03,zz],.196,G.rod,null,true);
        rod(o,m.wood,[xx,base+height*.51,zz],[bx-d*jx*1.08,b-.072,bz-d*jz*1.08],.10,G.rod);
        physics.cylinder(xx,zz,.199,base,b+.96,'canopy pillar');
      }
    }
  }
  marker(w,109.6,124.7,'樹冠步道','CANOPY WALK · KEEP LEFT',-.15,'canopy-guide',false,'慢慢走，木板在雲杉間抬高。另一端也可回到林地。');
  w.landmarks.canopy=pts;
}
function quiet(w){
  const {batch:o,mat:m,light,physics}=w;
  for(const q of layout.quiet){
    const {x,z,id,look}=q;let y=ground(x,z);
    if(id==='gazebo'){pavilion(w,x,z,{r:3.65,h:3.26,theme:'green',id:'gazebo'});y+=.34;}
    if(id==='secret'){
      for(let j=0;j<23;j++){
        const a=j/23*TAU;if(Math.sin(a)>.79)continue;const xx=x+Math.cos(a)*6.87,zz=z+Math.sin(a)*5.57;shrub(w,xx,zz,1.06,1.15,true);
        if(j%6===0)urn(w,xx*.997,zz,ground(xx,zz),'star',.75);
      }for(const a of [-1,1])lowLantern(w,x+a*1.72,z+.63,'ice',{post:.13,power:8,bake:.20});
      part(o,G.disk,m.limestone,x,y+.065,z,5.17,.12,4.67);
    }
    if(id==='rest'){
      for(let i=0;i<4;i++)shrub(w,x-2.80+i*1.74,z+1.60,1.33,1.11);
      for(const [i,sgn] of [-1,1].entries()){
        const xx=x+sgn*2.6,zz=z+3.55,y0=ground(xx,zz);part(o,G.post,m.wood,xx,y0+1.18,zz,.17,2.36,.18);lowLantern(w,xx,zz,'paper',{post:0,s:.54,power:7});
      }
      festoon(w,[x-2.6,y+2.29,z+3.55],[x+2.6,y+2.28,z+3.55],.26,28,{size:.043});
    }
    if(id==='lookout'){
      const yy=y+.24;
      box(o,m.wood,x,yy-.12,z,6.59,.27,6.35,0,null,true);
      for(let i=0;i<20;i++)box(o,i%5===1?m.plank:m.wood,x-3.145+i*.327,yy+.005,z,.306,.07,6.10);
      physics.deck(x,z-3.12,x,z+3.13,6.32,yy+.05,yy+.05);
      rail(w,[[x-3.26,yy,z+1.63],[x-3.26,yy,z-3.16],[x+3.26,yy,z-3.16],[x+3.26,yy,z+3.13],[x-2.8,yy,z+3.13]],{height:.85,style:'iron',step:.39});
      lowLantern(w,x+1.67,z+.79,'brass',{y:yy,s:.37,power:7,post:.24,bake:.19});
      y=yy+.056;
      for(let j=0;j<11;j++){const xx=x-6+Math.sin(j*2.39)*4,zz=z+5+Math.cos(j*2.39)*2,cy=ground(xx,zz);part(o,G.rock,m.limestone,xx,cy-.1,zz,2.0,1.39,1.01,0,j,.20);part(o,G.rock,m.snowProp,xx,cy+.84,zz,1.83,.46,1.12,0,j,.2);}
    }
    const yaw=Math.atan2(look[0]-x,look[2]-z);
    w.quiet.push(bench(w,{id:'quiet-'+id,name:q.name,x,z,y,yaw,look,preset:q.preset,special:true,l:2.46}));
    if(!['gazebo','lookout'].includes(id))for(const d of [-1,1])shrub(w,x+d*2.72,z-.49,1.06,1.05);
  }
}
function glades(w){
  const {batch:o,mat:m,physics,light}=w;const x=82,z=151,y=ground(x,z),r=rng(554600);w.decor.add(42,x,y+.59,z,1.84,'campfire');
  for(let i=0;i<20;i++){const a=TAU*i/20,rr=between(r,1.12,1.25);part(o,G.rock,m.limestone,x+rr*Math.cos(a),y+.14,z+rr*Math.sin(a),.30,between(r,.15,.25),.26,0,a,.24);}
  part(o,G.disk,m.coal,x,y+.012,z,2.21,.055,2.21);for(let i=0;i<9;i++){const a=i*2.3999;const xx=x+Math.cos(a)*.61,zz=z+Math.sin(a)*.61;rod(o,m.bark,[x-.14,y+.43,z+.18],[xx,y+.16,zz],.103,G.rod);}
  const flame=new T.Group();flame.position.set(x,y,z);const f=[];
  for(let i=0;i<12;i++){const a=i*2.4,s=.18+r()*.43;const m1=i%5?m.amber:m.candle;const p=part(flame,G.cone,m1,Math.cos(a)*s,y*0+.26+i*.013,Math.sin(a)*s,.22+i*.015,.32+i*.045,.22+i*.014,0,a,.21);f.push(p);}
  w.dynamicGroup(flame,60);w.anim.push((dt,t,c,s)=>{if(!flame.visible)return;f.forEach((p,i)=>{p.scale.y=(.32+i*.045)*(1+Math.sin(t*(3.1+i*.19)+i)*.215);p.rotation.z=.19+Math.sin(t*2+i)*.097;});});
  w.vapors.add(x,y+.46,z,'spark',.77,16);w.vapors.add(x,y+.77,z,'smoke',.94,9);
  light.add(x,y+.81,z,{power:31,color:'#ff9b57',distance:10,bake:.55,radius:10,glow:1.27,kind:'fire'});physics.cylinder(x,z,1.22,y,y+.60,'campfire');
  for(const [i,a] of [1,2.5,3.9,5.7].entries()){
    const xx=x+Math.cos(a)*3.35,zz=z+Math.sin(a)*3.35;
    bench(w,{id:'campfire-'+i,name:'營火邊的長椅',x:xx,z:zz,yaw:-Math.PI/2-a,look:[x,y+.58,z],special:i===0,preset:'fire'});
  }
  for(const [xx,zz] of [[-139,-48],[-104,-36],[-112,6],[-143,7]]){
    for(let j=0;j<8;j++)part(o,G.rock,m.snowProp,xx+between(r,-1.5,1.5),ground(xx,zz)+.18,zz+between(r,-1.1,1.1),.34,.22,.47,0,r()*4,0);
  }
  for(let i=0;i<3;i++)snowman(w,-125+i*1.45,-9+i*.70,1.18-i*.21,.51-i*.52);
  const skatingSign=signTexture('STARGAZING','按 Z 躺下看星');part(o,G.plane,skatingSign,-121,ground(-121,-51)+1.18,-51,1.69,.46,1);
  box(o,m.wood,-121,ground(-121,-51)+.61,-51.035,.145,1.3,.106);
}
function tunnel(w){
  const {batch:o,mat:m,light,physics}=w;const x=43,z=75.5,y=ground(x,z);const length=12.7,r=2.66;
  for(let j=0;j<11;j++)for(let k=0;k<14;k++){
    const a=k/13*Math.PI,xx=x-length/2+length*j/10,yy=y+1.26+Math.sin(a)*r,zz=z+Math.cos(a)*r;
    part(o,G.box,m.limestone,xx,yy,zz,length/10+.058,.67,.64,0,0,0,null,true);
    part(o,G.box,m.limestone,xx,yy,zz,length/10+.058,.55,.72, a,0,0,null,true);
    if(k===0||k===13)box(o,m.limestone,xx,y+.58,zz,length/10+.078,1.25,.62,0,null,true);
    if(k%3===1&&j%2===0)part(o,G.rock,m.snowProp,xx,yy+.32,zz,1.01,.26,.86,0,a,j*.1);
  }
  for(const d of [-1,1]){
    physics.box(x,z+d*r,length+.43,.54,y-.27,y+1.97,0,'tunnel wall');
    for(const k of [-1,1]){const xx=x+k*4.28,zz=z+d*r*.91;lantern(o,m,xx,y+1.82,zz,.4,'brass');light.add(xx,y+1.83,zz,{glow:.65,bake:.29,radius:5.3,power:15,distance:7.5});}
  }
  w.landmarks.tunnel={x,z,y,r:5.9};
}
function miniatures(w){
  const {batch:o,mat:m}=w;const x=112,z=-126,y=ground(x,z),r=rng(552);
  w.decor.add(25,x,y+1.40,z,2.7);
  const scene=new T.Group();scene.position.set(x,y,z);box(scene,m.wood,0,1.30,-.48,3.56,2.61,.18);for(const d of [-1,1]){
    rod(scene,m.wood,[d*1.8,0,.65],[d*1.8,2.47,.65],.11,G.rod);part(scene,G.box,m.roof,d*.95,2.73,0,2.15,.19,1.92,0,0,-d*.44);
    part(scene,G.box,m.snowProp,d*.94,2.84,0,2.01,.14,1.79,0,0,-d*.44);}
  box(scene,m.wood,0,.29,0,3.42,.51,1.59);
  // Carved nativity silhouettes, with a tiny crib and a faceted star above.
  for(const [i,X] of [-.98,-.49,.60,1.10].entries()){
    part(scene,G.cap,i%2?m.wood:m.plaster,X,.77+(i%2)*.072,.12,.31,.58,.39);ball(scene,m.wood,X,1.13+(i%2)*.12,.12,.118,.149,.115);
    part(scene,G.smallBall,m.ivory,X,1.16+(i%2)*.12,.14,.107,.106,.12);
  }
  part(scene,G.box,m.wood,0,.52,.37,.56,.19,.34,0,-.14,0);part(scene,G.ball,m.ivory,0,.676,.37,.29,.084,.15,0,-.24,0);
  part(scene,G.tinyStar,m.filament,0,2.34,.70,.29,.29,.38);wreath(scene,m,0,1.94,-.323,.29,0,1);
  absorb(scene,o,true);w.light.add(x,y+1.75,z+.58,{power:20,distance:7.5,radius:6.6,bake:.25,glow:.79});
  const px=120,pz=-113.3,py=ground(px,pz);const tower=new T.Group();w.decor.add(44,px,py+1.31,pz,1.75,'christmas pyramid');tower.position.set(px,py,pz);w.dynamicGroup(tower,55);
  for(let i=0;i<4;i++){const h=.26+i*.55,s=1.54-i*.27;part(o,G.rod,m.wood,px,py+h,pz,s,.16,s);
    for(let j=0;j<5;j++){const a=j*TAU/5;candle(o,m,px+Math.cos(a)*s*.46,py+h+.083,pz+Math.sin(a)*s*.46,.22);}
  }
  part(tower,G.rod,m.gold,0,1.31,0,.13,2.67,.13);for(let j=0;j<7;j++){const a=j/7*TAU;part(tower,G.box,m.wood,Math.cos(a)*.49,2.58,Math.sin(a)*.49,.75,.103,.226,0,-a,.11);}
  for(let i=0;i<3;i++)for(let j=0;j<5;j++){const a=j*TAU/5,h=.56+i*.55,rad=.58-i*.144;part(tower,G.cap,i%2?m.red:m.green,Math.cos(a)*rad,h,Math.sin(a)*rad,.16,.29,.18);part(tower,G.smallBall,m.ivory,Math.cos(a)*rad,h+.19,Math.sin(a)*rad,.067);}
  w.anim.push((dt,t,c,s)=>{tower.rotation.y=t*.138;});w.physics.cylinder(px,pz,.81,py,py+2.70,'christmas pyramid');
}
function entry(w){
  const {batch:o,mat:m}=w;const r=rng(711);
  marketStall(w,17.8,207,-1.24,2);
  for(let j=0;j<12;j++){
    const x=-20+(j%4)*2.0,z=194+Math.floor(j/4)*3.9,y=ground(x,z);makeTreeAsset(o,m,x,y,z,1.9+r()*1.48,306+j*7,1);
    const p=[x+.29,y+.61,z+.39];w.decor.add(49,...p,1.36);rod(o,m.wood,[x-.18,y+.09,z+.19],p,.037,G.rod);box(o,m.ivory,p[0],p[1],p[2],.094,.143,.021,.23);
  }
  nutcracker(w,-7.34,208,3.24,.12);nutcracker(w,7.40,208,3.24,-.12);
  for(const q of [[-9.1,199],[9.4,206],[-11.9,217],[12.4,216]]){urn(w,...q,ground(...q),'star',1.22);lowLantern(w,q[0]+.62,q[1]+.37,'paper',{post:0,power:7});}
}
