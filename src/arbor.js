import * as T from 'three/webgpu';
import {attribute,uv,texture,vec2,vec3,sin,fract,float,positionLocal,instanceIndex,uniform,mix,smoothstep,normalMap,screenCoordinate,interleavedGradientNoise} from 'three/tsl';
import {TAU,between,lerp,clamp,rng,noise2} from './math.js';

// Needle tips, bough volumes, bark and sculpted snow share an original atlas.
// The needle alpha is only used on fine peripheral sprays, not on whole trees.
const paint=new Map();
function atlas(){
  const S=256,ca=document.createElement('canvas');ca.width=S*4;ca.height=S;const ctx=ca.getContext('2d'),r=rng(491086);
  const img=ctx.createImageData(ca.width,S),data=document.createElement('canvas');data.width=ca.width;data.height=S;const dc=data.getContext('2d');const nrm=dc.createImageData(ca.width,S);
  for(let j=0;j<S;j++)for(let i=0;i<S*3;i++){
    const x=i%S,y=j,k=(j*ca.width+i)*4,type=i>>8,u=x/S,v=y/S;
    const stripe=type===0?Math.sin(x*.83+Math.sin(y*.06)*1.7+Math.sin(x*.13)*2):0;
    const grain=(r()-.5)*(type===0?22:13),weft=Math.sin(u*TAU*27+Math.sin(v*TAU*2)*1.2);
    const n=type===0?Math.round(208+stripe*13+weft*12+grain):type===1?Math.round(226+weft*4+grain):Math.round(237+grain*.56);
    img.data[k]=clamp(n+(type===0?6:0),0,255);img.data[k+1]=clamp(n,0,255);img.data[k+2]=clamp(n-(type===0?4:0),0,255);img.data[k+3]=255;
  }
  // Periodic relief: bark grains, interwoven needles and crystalline snow.
  const patch=(t,x,y)=>{const u=x/S,v=y/S;
    if(t===0)return .35*Math.sin(x*.22+Math.sin(y*.037)*1.37)+.13*Math.sin(x*.93+Math.sin(y*.16)*.47)+.36*noise2(x*.07,y*.036);
    if(t===1)return .18*Math.sin(x*.83+Math.sin(y*.12)*1.42)+.18*Math.sin(x*.32-y*.76)+.18*noise2(x*.63,y*.19);
    if(t===2)return .61*noise2(x*.037,y*.041)+.35*noise2(x*.31,y*.36)+.105*r();
    return 0;
  };
  for(let y=0;y<S;y++)for(let x=0;x<S*4;x++){
    const t=x>>8,u=x%S,i=(y*ca.width+x)*4;
    const nx=(patch(t,(u+S-1)%S,y)-patch(t,(u+1)%S,y))*.47,ny=(patch(t,u,(y+1)%S)-patch(t,u,(y+S-1)%S))*.47,inv=1/Math.hypot(nx,ny,1);
    nrm.data[i]=128+nx*inv*127;nrm.data[i+1]=128+ny*inv*127;nrm.data[i+2]=128+inv*127;
    nrm.data[i+3]=255*(t===2?.72+.14*noise2(u*.063,y*.07)-.24*Math.max(0,noise2(u*.42,y*.47)-.65):.82+.15*noise2(u*.052,y*.05));
  }
  dc.putImageData(nrm,0,0);
  ctx.putImageData(img,0,0);ctx.save();ctx.translate(3*S,0);ctx.beginPath();ctx.rect(0,0,S,S);ctx.clip();ctx.lineCap='round';
  const spine=(v)=>S*(.5+.041*Math.sin(v*Math.PI*1.35));
  ctx.strokeStyle='#b9afa0';ctx.lineWidth=2.1;ctx.beginPath();ctx.moveTo(spine(.06),S*.94);for(let j=1;j<=21;j++){const v=j/22;ctx.lineTo(spine(v),S*(.94-v*.90));}ctx.stroke();
  for(let j=0;j<260;j++){
    const k=r(),v=.055+.926*k,y=S*(.94-v*.90),side=j%2?1:-1;
    const f=Math.pow(Math.sin(Math.PI*clamp(v,.025,.995)),.68);
    const dx=side*S*between(r,.045,.465)*f,dy=S*between(r,.016,.111)*(1-.46*v);
    const tone=Math.round(between(r,183,247));ctx.strokeStyle=`rgb(${tone},${tone},${tone-12})`;ctx.lineWidth=between(r,1.02,2.7);
    ctx.beginPath();ctx.moveTo(spine(v),y);ctx.quadraticCurveTo(spine(v)+dx*.49,y-dy*.39,spine(v)+dx,y-dy);ctx.stroke();
  }
  ctx.restore();const t=new T.CanvasTexture(ca);t.name='Hand-built bark, needles, snow and needle silhouette';t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;const relief=new T.CanvasTexture(data);relief.name='Arbor relief and gloss';relief.anisotropy=4;return [t,relief];
}

export function arborMaterials(){
  const [sheet,relief]=atlas(),surface=attribute('surface','float'),raw=uv();
  const isSpray=smoothstep(2.65,2.96,surface);
  const region=(u,v)=>vec2(surface.mul(.25).add(u.mul(.240)).add(.005),v.mul(.974).add(.013));
  const tex=texture(sheet,region(mix(fract(raw.x),raw.x,isSpray),mix(fract(raw.y),raw.y,isSpray)));
  const detail=texture(relief,region(fract(raw.x.mul(1.9)),fract(raw.y.mul(1.55))));
  const fade=uniform(0).onObjectUpdate(({object})=>object.userData.lodFade??0);
  // Positive fade reveals pixels; negative fade covers complementary pixels.
  const pattern=interleavedGradientNoise(screenCoordinate.xy.floor());
  const coverage=fade.equal(0).or(fade.greaterThan(0).and(pattern.lessThanEqual(fade))).or(fade.lessThan(0).and(pattern.greaterThan(fade.negate())));
  const phase=uniform(0),wind=uniform(.25);
  const make=(name,lod)=>{
    const m=new T.MeshStandardNodeMaterial({name,roughness:.89,vertexColors:true,side:T.FrontSide});
    if(lod<2){
      m.colorNode=tex.rgb;m.roughnessNode=lod===0?mix(detail.a,.93,isSpray):mix(.92,.76,smoothstep(1.6,1.99,surface).mul(float(1).sub(isSpray)));
      m.opacityNode=mix(1,tex.a,isSpray);m.alphaTest=.34;m.alphaToCoverage=true;
      if(lod===0)m.normalNode=normalMap(detail.rgb,vec2(.53,.53));
      const a=phase.mul(.69).add(float(instanceIndex).mul(.518));
      const trunk=sin(a).mul(positionLocal.y.pow(2)).mul(.011);
      const bough=sin(a.mul(1.8).add(positionLocal.y.mul(19))).mul(positionLocal.xz.length()).mul(.0046);
      const tip=sin(a.mul(3.1).add(positionLocal.z.mul(18))).mul(isSpray).mul(.003);
      m.positionNode=positionLocal.add(vec3(trunk.add(tip),bough.add(tip.mul(.40)),trunk.mul(.67).add(tip.mul(.7))).mul(wind));
    }
    m.maskNode=coverage;return m;
  };
  return {near:make('Arbor · shaded bark and fine sprays',0),mid:make('Arbor · clustered needle cards',1),far:make('Arbor · compact solid canopy',2),phase,wind};
}

class Tree {
  constructor(){this.p=[];this.u=[];this.c=[];this.i=[];this.s=[];}
  v(x,y,z,color,k,skin,u,v){const id=this.p.length/3;this.p.push(x,y,z);this.c.push(color.r*k,color.g*k,color.b*k);this.u.push(u,v);this.s.push(skin);return id;}
  q(a,b,c,d){this.i.push(a,b,c,a,c,d);}
  tube(a,b,ra,rb,c,r,n=6,seed=0){
    const start=this.p.length/3;
    const A=new T.Vector3(...a),B=new T.Vector3(...b),d=B.clone().sub(A).normalize();
    const u=new T.Vector3(0,0,1);if(Math.abs(d.z)>.84)u.set(1,0,0);u.cross(d).normalize();const v=new T.Vector3().crossVectors(d,u);
    for(let j=0;j<2;j++)for(let k=0;k<=n;k++){
      const angle=k/n*TAU,rr=(j?rb:ra)*(1+.11*Math.sin(angle*3+seed)+.055*Math.sin(angle*5-.5));const p=j?B:A;
      this.v(p.x+(Math.cos(angle)*u.x+Math.sin(angle)*v.x)*rr,p.y+(Math.cos(angle)*u.y+Math.sin(angle)*v.y)*rr,p.z+(Math.cos(angle)*u.z+Math.sin(angle)*v.z)*rr,c,.78+.21*Math.cos(angle+.8)+r()*.12,0,k/n*2.8+seed,a[1]*25+j*B.distanceTo(A)*25);
    }
    for(let i=0;i<n;i++)this.q(start+i,start+i+1,start+i+2+n,start+i+1+n);
  }
  root(a,L,W,color,r,n=8){
    const start=this.p.length/3,dx=Math.cos(a),dz=Math.sin(a),b=between(r,-.20,.20),S=5;
    // Lead the root out of the trunk in one rounded, self-tapering ribbon.
    // Keep the end below the snow rather than exposing two cylinder collars.
    for(let j=0;j<=S;j++){
      const t=j/S,ww=W*(.95*(1-t)**1.5+.045),offset=b*t*t*L,xx=dx*(.036+L*t)-dz*offset,zz=dz*(.036+L*t)+dx*offset;
      const h=-.011+.051*(1-t)**2.2,relief=.037*(1-t)**2+.004;
      for(let k=0;k<=n;k++){
        const u=k/n*TAU,side=Math.cos(u)*ww,lift=Math.sin(u)*relief;
        this.v(xx-dz*side,h+lift,zz+dx*side,color,.74+.13*Math.sin(u)+r()*.075,0,k/n*1.5+.4,t*7.1);
      }
    }
    for(let j=0;j<S;j++)for(let k=0;k<n;k++){const i=start+j*(n+1)+k;this.q(i,i+n+1,i+n+2,i+1);}
  }
  // A bough is a closed, smooth asymmetric swept ellipsoid. The snow cap
  // rides above it as an independent mass rather than a hard white triangle.
  bough(x,y,z,a,L,W,H,bend,color,r,{kind=1,rings=5,cross=7,wobble=0,seed=0}={}){
    const start=this.p.length/3,dx=Math.cos(a),dz=Math.sin(a),isSnow=kind===2;
    const skew=between(r,-.29,.27),bump=between(r,.67,1.32);
    for(let i=0;i<=rings;i++){
      const t=i/rings,s=Math.pow(Math.max(.001,Math.sin(Math.PI*t)),isSnow?.36:.63);
      const sweep=(skew*t*t+wobble*t*(1-t))*W;
      const fr=1+.11*Math.sin(t*18+seed)+.12*Math.sin(8*t+wobble);
      for(let k=0;k<cross;k++){
        const angle=k/cross*TAU,c=Math.cos(angle),v=Math.sin(angle);
        const bi=Math.sin(angle*3+t*19+seed)*.10;
        const wide=c*W*s*fr*(1+bi),high=v*H*s*(v<0&&!isSnow?.64:bump)*(1+bi);
        const cy=y+t*bend+.007*Math.sin(t*Math.PI)+s*H*(isSnow?.18:.03)+high;
        const tint=isSnow?.92+.08*v+bi*.2:.82+.24*v-.14*t+bi*.6;
        this.v(x+dx*t*L-dz*(wide+sweep),cy,z+dz*t*L+dx*(wide+sweep),color,tint,kind,(k/cross)*1.2+seed,t*(1+L*1.7)+seed*.8);
      }
    }
    for(let i=0;i<rings;i++)for(let j=0;j<cross;j++){
      const a=start+i*cross+j,b=start+i*cross+(j+1)%cross;this.q(a,a+cross,b+cross,b);
    }
  }
  spray(x,y,z,a,len,width,r,c,twist=0){
    const dx=Math.cos(a),dz=Math.sin(a),s=this.p.length/3;
    const h=.008+len*.019,sy=y-len*.017+twist*width*.039;
    // Same atlas feather is rotated around each physical shoot. Double-sided
    // only for the few alpha-cut sprigs; solid canopy retains front sides.
    this.v(x+dz*width,y-twist*.015,z-dx*width,c,.91,3,0,0);
    this.v(x-dz*width,y+twist*.015,z+dx*width,c,.94,3,1,0);
    this.v(x+dx*len-dz*width,sy+h,z+dz*len+dx*width,c,1.02,3,1,1);
    this.v(x+dx*len+dz*width,sy-h,z+dz*len-dx*width,c,1.01,3,0,1);
    this.q(s,s+1,s+2,s+3);this.q(s,s+3,s+2,s+1);
  }
  mantle(x,y,z,R,H,c,r,n,skin,roughness=1){
    const q=this.p.length/3,turn=r()*TAU;
    const vary=Array.from({length:n},(_,i)=>between(r,.67,1.28)+.10*Math.cos(i*2.3));
    // Irregular sweep gives a scalloped contour even on far silhouettes.
    const bands=skin===4?[[.065,.94],[.56,.47],[.98,-.07],[.75,-.20]]:skin===2?[[.075,.94],[.49,.65],[.71,.28],[.96,.02],[.80,-.13]]:[[.05,.91],[.45,.59],[.76,.29],[1,-.04],[.80,-.235]];
    for(let j=0;j<bands.length;j++)for(let i=0;i<n;i++){
      const th=turn+i/n*TAU,s=vary[i];const [rad,h]=bands[j],lobes=.06*Math.sin(th*5+j*.8)*roughness,rd=R*rad*(s+lobes);
      // Keep canopy colour at range; cap just windward shoulders rather
      // than filling an entire circular crown with pale snow.
      const crust=skin===4&&(j===0&&i%3===0||j===1&&i%4===1&&r()>.31||j===2&&i%7===0&&r()>.65);
      this.v(x+Math.cos(th)*rd,y+(h+(j<2?.24:.42)*(s-.85)+Math.sin(i*2.39+turn)*.19*(j>=1?1:.26))*H,z+Math.sin(th)*rd,crust?COLORS.deepSnow:c,skin===2?.98-.11*rad:crust?.82:.97-.29*rad+.07*Math.sin(th*4),skin===4?1:skin,i/n*3+j*.11,j*.55+turn);
    }
    for(let j=1;j<bands.length;j++)for(let i=0;i<n;i++){const a=q+(j-1)*n+i,b=q+(j-1)*n+(i+1)%n;this.q(a,b,b+n,a+n);}
  }
  finish(){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(this.p,3));g.setAttribute('uv',new T.Float32BufferAttribute(this.u,2));g.setAttribute('color',new T.Float32BufferAttribute(this.c,3));g.setAttribute('surface',new T.Float32BufferAttribute(this.s,1));g.setIndex(this.i);g.computeVertexNormals();
    const norm=g.attributes.normal;for(let i=0;i<norm.count;i++)if(this.s[i]===3){const dx=this.p[i*3],dz=this.p[i*3+2];const d=Math.hypot(dx,dz)*.8||1;norm.setXYZ(i,dx*.45/d,.84,dz*.45/d);}
    return g;
  }
}

const COLORS={snow:new T.Color('#f0eae1'),deepSnow:new T.Color('#d8d6c9'),fork:new T.Color('#555045'),birch:new T.Color('#c6b6a0'),spruce:new T.Color('#6f5442'),pine:new T.Color('#9e6241')};
export function modelArbor(seed,type,s,lod,hero=false){
  const cacheKey=[seed,type,lod,+hero].join(':');if(paint.has(cacheKey))return paint.get(cacheKey);
  const r=rng(seed),o=new Tree(),isLeaf=type<6;const TINT=new T.Color(s[4]).lerp(new T.Color('#637d43'),.29),LIGHT=TINT.clone().lerp(new T.Color('#73895b'),.24);
  const base=type===6?COLORS.birch:type===3?COLORS.pine:type===7?new T.Color('#8e7167'):COLORS.spruce;
  const tilt=[between(r,-.17,.17),between(r,-.14,.14)],curve=(h)=>[tilt[0]*h*h+.024*Math.sin(6*h)*h,h,tilt[1]*h*h];
  const N=lod===0?14:lod===1?9:lod===2?6:4,root=type===6?.076:type===3?.107:hero?.083:.094;
  for(let i=0;i<N;i++){
    const f=i/N,h=(i+1)/N;const c=type===6&&i%4===2?COLORS.fork:base;
    o.tube(curve(f),curve(h),root*(1-f)**.66+.005,root*(1-h)**.67+.004,c,r,lod===0?8:lod===1?6:5,i*.03);
  }
  if(lod<=1){for(let k=0;k<5;k++){
    const a=k*TAU/5+between(r,-.18,.18),L=between(r,.18,.35);
    if(lod===0){
      // Separate RNG keeps species bough and needle placement stable.
      for(let j=0;j<28;j++)r();
      o.root(a,L,root*.65,base,rng(seed+k*20301+515),8);
    }else{
      const co=Math.cos(a),si=Math.sin(a);
      o.tube([co*.038,.021,si*.038],[co*L*.58,.005,si*L*.58],root*.41,.028,base,r,6,k);
      o.tube([co*L*.57,.008,si*L*.57],[co*L,-.002,si*L],.046,.006,base,r,6,k);
    }
  }}
  if(isLeaf){
    const n=hero?22:lod===0?13:lod===1?10:lod===2?7:5;
    const start=hero?.071:clamp(s[3]+between(r,-.024,.047),.08,.42);
    for(let j=0;j<n;j++){
      const y=start+(1-start)*(j+between(r,.20,.55))/n;const [x,,z]=curve(y);
      const L=Math.max(.021,1.09*(1-y)**s[1]*(type===3?.65+.35*Math.sin(y*Math.PI*.69):1));
      const thick=(type===4?1.1:type===3?.66:.79)*(1-y)*.035+.015;
      if(lod>=2){const tr=lod===2?10:8;
        o.mantle(x,y-.015,z,L,.109+(1-y)*.05,TINT,r,tr,4);
        continue;
      }
      o.mantle(x,y-.020,z,L*.59,.081+(1-y)*.055,TINT,r,10,1,.69);
      const count=hero?8+(j%2):lod===0?5+(j%2):4;
      for(let k=0;k<count;k++){
        const a=j*2.39996+k/count*TAU+between(r,-.21,.24),dx=Math.cos(a),dz=Math.sin(a),s=between(r,.77,1.24),len=L*s;
        const drop=type===3?between(r,.004,.024):between(r,-.047,-.012)*(1-y)-.006;
        const yy=y+between(r,-.013,.013),w=len*between(r,.17,.246),h=thick*between(r,.76,1.16),b=between(r,-.7,.85);
        const greenery=k%3===0?LIGHT:TINT;
        o.bough(x,yy,z,a,len,w,h,drop,greenery,r,{rings:lod===0?5:3,cross:lod===0?7:5,wobble:b,seed:j*.33+k*.19});
        if(j<n-1&&r()<(hero?.67+.11*Math.sin(j*.91):.73)){
          const f=between(r,.06,.27),snowL=len*between(r,.42,.77),snowW=w*between(r,.59,1.04);
          o.bough(x+dx*len*f,yy+h*.77-f*.006,z+dz*len*f,a+.042*Math.cos(j),snowL,snowW,h*between(r,.44,.69),drop*.37,j%4===2?COLORS.deepSnow:COLORS.snow,r,{kind:2,rings:lod===0?5:2,cross:lod===0?7:5,wobble:b*.7,seed:k*.57+j*.39});
        }
        if(lod===0){
          o.tube([x,yy-.006,z],[x+dx*len*.82,yy+drop*.85,z+dz*len*.82],.008,.0017,base,r,4,k*.11);
          for(let l=0;l<4;l++){
            const f=.20+l*.195+between(r,-.07,.09),d=l%2?1:-1,dir=a+d*between(r,.46,1.04),sx=x+dx*len*f,sz=z+dz*len*f,hy=yy+drop*f;
            const sl=len*between(r,.30,.54)*(1-f*.46);
            o.spray(sx,hy+.004,sz,dir,sl,sl*.42,r,l%3===0?LIGHT:greenery,d*between(r,.13,.91));
            if(l===3)o.spray(x+dx*len*.67,hy, z+dz*len*.67,a+.065,len*.50,len*.15,r,greenery,.25);
          }
        }else{
          o.spray(x+dx*len*.44,yy+drop*.43,z+dz*len*.44,a+.43,len*.64,len*.19,r,greenery,.45);
          o.spray(x+dx*len*.45,yy+drop*.43,z+dz*len*.45,a-.50,len*.65,len*.16,r,LIGHT,-.57);
        }
      }
    }
  }else{
    const depth=lod===0?3:lod===1?2:lod===2?1:0;
    const branches=lod===0?10:lod===1?8:lod===2?7:5;
    function branch(a,b,ra,level){
      o.tube(a,b,ra,ra*.35,base,r,lod===0?6:4,ra*23);
      if(level>0){const qty=level===depth?4:3;for(let k=0;k<qty;k++){
        const u=between(r,.01,.09)+.42+k/qty*.53,a2=a.map((v,j)=>lerp(v,b[j],u));const ang=between(r,.40,1.8)*(k%2?1:-1),f=between(r,.51,.86)*(1-u*.41);
        const dkx=b[0]-a[0],dkz=b[2]-a[2];const dx=dkx*Math.cos(ang)-dkz*Math.sin(ang),dz=dkz*Math.cos(ang)+dkx*Math.sin(ang);
        branch(a2,[a2[0]+dx*f,Math.min(1.09,a2[1]+.044+(b[1]-a[1])*.42+between(r,.002,.061)),a2[2]+dz*f],ra*.43,level-1);
      }}else if(type===8&&lod<=1){o.tube(b,[b[0]+.007,b[1]+.007,b[2]+.003],.010,.005,new T.Color('#aa4e46'),r,4,0);}
    }
    for(let i=0;i<branches;i++){
      const y=s[3]+(i+1)/branches*(.77-s[3]),a=i*2.4+r()*.5,f=(.53+.32*Math.sin(y*4))*between(r,.78,1.28),x=curve(y);
      branch(x,[x[0]+Math.cos(a)*f,Math.min(1.03,y+between(r,.09,.24)),x[2]+Math.sin(a)*f],.035*(1-y)+.008,depth);
    }
  }
  const mesh=o.finish();paint.set(cacheKey,mesh);return mesh;
}
