import * as T from 'three/webgpu';
import {attribute} from 'three/tsl';
import {finishSurface} from './materials/finish.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
const _o=new T.Object3D(),_v=new T.Vector3(),_d=new T.Vector3(),_q=new T.Quaternion(),_up=new T.Vector3(0,1,0);
const _matrix=new T.Matrix4(),_color=new T.Color();
export const G={
  box:new T.BoxGeometry(1,1,1), ball:new T.SphereGeometry(1,12,8), smallBall:new T.SphereGeometry(1,8,6), ico:new T.IcosahedronGeometry(1,1), rock:new T.IcosahedronGeometry(1,0),
  post:new T.CylinderGeometry(.5,.5,1,10), rod:new T.CylinderGeometry(.5,.5,1,6), fineRod:new T.CylinderGeometry(.5,.5,1,4), taper:new T.CylinderGeometry(.39,.5,1,8),
  cap:new T.CylinderGeometry(.14,.5,1,8), cone:new T.ConeGeometry(.5,1,9), ring:new T.TorusGeometry(1,.10,7,24), ringFine:new T.TorusGeometry(1,.027,5,24),
  bulb:new T.OctahedronGeometry(1,0), satinPip:new T.SphereGeometry(1,6,3), plane:new T.PlaneGeometry(1,1), disk:new T.CylinderGeometry(.5,.5,1,32), tinyStar:null
};
function makeStar(n=5){const s=new T.Shape();for(let i=0;i<n*2;i++){const a=i*Math.PI/n+Math.PI/2,r=i%2?.435:1;const x=Math.cos(a)*r,y=Math.sin(a)*r;if(!i)s.moveTo(x,y);else s.lineTo(x,y);}s.closePath();const g=new T.ExtrudeGeometry(s,{depth:.105,bevelEnabled:true,bevelThickness:.07,bevelSize:.055,bevelSegments:1,steps:1});g.translate(0,0,-.0525);return g;}
G.tinyStar=makeStar();G.snowflake=makeStar(6);
export const rounded=new T.BoxGeometry(1,1,1);
export function bevelBox(w,h,d,r=.05){const s=new T.Shape();s.moveTo(-w/2+r,-h/2+r);s.lineTo(w/2-r,-h/2+r);s.lineTo(w/2-r,h/2-r);s.lineTo(-w/2+r,h/2-r);s.closePath();const g=new T.ExtrudeGeometry(s,{depth:d-2*r,bevelEnabled:true,bevelThickness:r,bevelSize:r,bevelSegments:1,steps:1});g.translate(0,0,-d/2+r);return g;}
export class Batch{
  constructor(scene,cell=72){
    this.scene=scene;this.cell=cell;this.bins=new Map();this.instances=0;this.meshes=[];
    this.solid=new T.MeshStandardNodeMaterial({name:'Static paint, iron & wood tint',vertexColors:true});
    const paint=attribute('finish','vec2');if(cell<180)finishSurface(this.solid,paint.x);else this.solid.roughnessNode=paint.x;this.solid.metalnessNode=paint.y;
    this.light=new T.MeshBasicNodeMaterial({name:'Static warm practicals',vertexColors:true});
  }
  put(geometry,material,matrix,color=null,cast=false,kind=''){
    // Flatten only truly static materials. Animated bulbs, textured PBR and
    // translucent glass retain their original node graphs and render state.
    const family=material.userData.staticBatch;
    const flat=family==='paint'&&!material.map&&!material.transparent;
    const lamp=family==='lamp'&&!material.colorNode&&!material.map&&!material.transparent;
    const m=flat?this.solid:lamp?this.light:material;
    const e=matrix.elements,cell=lamp?this.cell*1.4:this.cell,x=Math.floor(e[12]/cell),z=Math.floor(e[14]/cell);
    const k=[geometry.id,m.id,cell,x,z,+cast].join(':');
    let b=this.bins.get(k);if(!b)this.bins.set(k,b={geometry,material:m,matrices:[],colors:[],finish:flat?[]:null,cast,kind:kind||m.name,x,z,cell});
    b.matrices.push(matrix.clone());
    const tint=color===null?null:new T.Color(color);
    b.colors.push(flat||lamp?tint?.multiply(material.color)??material.color.clone():tint);
    if(flat)b.finish.push(material.roughness,material.metalness);
    this.instances++;
  }
  flush(){
    const mergeBins=new Map(),clones=new Map();
    for(const b of this.bins.values()){
      const a=b.geometry.attributes,pc=a.position.count,hasCustom=Object.keys(a).some(k=>!['position','normal','uv','color'].includes(k));
      // Only moderately-sized dissimilar shapes are concatenated. Large runs
      // of a single shape (e.g. 60k bulbs) remain cheap hardware instances.
      if(!hasCustom&&pc*b.matrices.length<=9400&&pc<1100&&!b.material.transparent&&a.uv&&a.normal){
        const id=[b.material.id,b.cell,b.x,b.z,+b.cast].join('/');let set=mergeBins.get(id);if(!set)mergeBins.set(id,set=[]);set.push(b);continue;
      }
      this.flushInstance(b);
    }
    const p3=new T.Vector3(),n3=new T.Vector3(),normalMat=new T.Matrix3();
    const merge=(bins)=>{
      if(bins.length===1){this.flushInstance(bins[0]);return;}
      const mat=bins[0].material,hasFinish=bins[0].finish!==null,colored=mat.vertexColors||bins.some(b=>b.colors.some(Boolean));let paint=mat;
      if(colored&&!mat.vertexColors){if(!clones.has(mat)){const m=mat.clone();m.vertexColors=true;clones.set(mat,m);}paint=clones.get(mat);}
      const v=[],n=[],uv=[],cl=[],ix=[],fin=[];
      for(const b of bins){
        const a=b.geometry.attributes,P=a.position,N=a.normal,U=a.uv,C=a.color,I=b.geometry.index;
        for(let j=0;j<b.matrices.length;j++){
          const matx=b.matrices[j],t=b.colors[j],offset=v.length/3;normalMat.getNormalMatrix(matx);
          for(let k=0;k<P.count;k++){
            p3.fromBufferAttribute(P,k).applyMatrix4(matx);n3.fromBufferAttribute(N,k).applyNormalMatrix(normalMat);
            v.push(p3.x,p3.y,p3.z);n.push(n3.x,n3.y,n3.z);uv.push(U.getX(k),U.getY(k));
            if(colored)cl.push((C?C.getX(k):1)*(t?t.r:1),(C?C.getY(k):1)*(t?t.g:1),(C?C.getZ(k):1)*(t?t.b:1));
            if(hasFinish)fin.push(b.finish[j*2],b.finish[j*2+1]);
          }
          for(let k=0;k<(I?.count||P.count);k++)ix.push(offset+(I?I.getX(k):k));
        }
      }
      const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(v,3));geo.setAttribute('normal',new T.Float32BufferAttribute(n,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));if(colored)geo.setAttribute('color',new T.Float32BufferAttribute(cl,3));if(hasFinish)geo.setAttribute('finish',new T.Float32BufferAttribute(fin,2));geo.setIndex(ix);
      const mesh=new T.Mesh(geo,paint);mesh.name='Static tile • '+mat.name;mesh.castShadow=bins[0].cast;mesh.receiveShadow=!mat.isMeshBasicNodeMaterial&&!mat.isMeshBasicMaterial;mesh.matrixAutoUpdate=false;this.scene.add(mesh);this.meshes.push(mesh);
    };
    for(const bins of mergeBins.values()){
      let set=[],n=0;for(const b of bins){const pc=b.geometry.attributes.position.count*b.matrices.length;if(n+pc>53000&&set.length){merge(set);set=[];n=0;}set.push(b);n+=pc;}
      if(set.length)merge(set);
    }
    this.bins.clear();return this.meshes;
  }
  flushInstance(b){
    let geo=b.geometry;
    if(b.finish){
      // Share original buffers. Only finish is per-tile/per-instance.
      geo=new T.BufferGeometry();for(const [id,a] of Object.entries(b.geometry.attributes))geo.setAttribute(id,a);geo.setIndex(b.geometry.index);geo.setAttribute('finish',new T.InstancedBufferAttribute(new Float32Array(b.finish),2));
    }
    const mesh=new T.InstancedMesh(geo,b.material,b.matrices.length);mesh.name=b.kind||b.material.name;
    for(let i=0;i<b.matrices.length;i++){mesh.setMatrixAt(i,b.matrices[i]);if(b.colors[i])mesh.setColorAt(i,b.colors[i]);}
    mesh.castShadow=b.cast;mesh.receiveShadow=!b.material.isMeshBasicMaterial&&!b.material.isMeshBasicNodeMaterial&&b.kind!=='detail';mesh.computeBoundingSphere();
    mesh.matrixAutoUpdate=false;this.scene.add(mesh);this.meshes.push(mesh);
  }
}

export function part(out,g,m,x,y,z,sx=1,sy=sx,sz=sx,rx=0,ry=0,rz=0,color=null,cast=false,kind=''){
  if(out instanceof Batch){_o.position.set(x,y,z);_o.rotation.set(rx,ry,rz);_o.scale.set(sx,sy,sz);_o.updateMatrix();out.put(g,m,_o.matrix,color,cast,kind);return null;}
  const shape=new T.Mesh(g,m);shape.position.set(x,y,z);shape.rotation.set(rx,ry,rz);shape.scale.set(sx,sy,sz);shape.castShadow=cast;shape.receiveShadow=!m.isMeshBasicNodeMaterial;shape.userData.tint=color;out.add(shape);return shape;
}
export const box=(o,m,x,y,z,w,h,d,ry=0,color=null,cast=false)=>part(o,G.box,m,x,y,z,w,h,d,0,ry,0,color,cast);
export const ball=(o,m,x,y,z,sx,sy=sx,sz=sx,color=null)=>part(o,G.ball,m,x,y,z,sx,sy,sz,0,0,0,color);
export function rod(out,m,a,b,r,g=G.rod,color=null,cast=false,kind=''){
  _v.set(b[0]-a[0],b[1]-a[1],b[2]-a[2]);const L=_v.length();if(L<.0001)return null;
  _q.setFromUnitVectors(_up,_v.multiplyScalar(1/L));_d.set((a[0]+b[0])*.5,(a[1]+b[1])*.5,(a[2]+b[2])*.5);_v.set(r*2,L,r*2);_matrix.compose(_d,_q,_v);
  if(out instanceof Batch){out.put(g,m,_matrix,color,cast,kind);return null;}
  const mesh=new T.Mesh(g,m);mesh.position.copy(_d);mesh.quaternion.copy(_q);mesh.scale.copy(_v);mesh.castShadow=cast;mesh.receiveShadow=!m.isMeshBasicNodeMaterial;mesh.userData.tint=color;out.add(mesh);return mesh;
}
export function line(out,m,points,thickness=.04,g=G.rod,kind='detail'){for(let i=1;i<points.length;i++)rod(out,m,points[i-1],points[i],thickness,g,null,false,kind);}
export function absorb(group,batch,forceCast=false,kind=''){
  group.updateMatrixWorld(true);group.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh)batch.put(o.geometry,o.material,o.matrixWorld,o.userData.tint??null,forceCast||o.castShadow,kind);});
}
// Merge dynamic models while preserving their local origin and material boundaries.
export function compact(src){
  src.updateMatrixWorld(true);const inv=src.matrixWorld.clone().invert(),bins=new Map();
  src.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||Array.isArray(o.material))return;
    let geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();geo.applyMatrix4(_matrix.multiplyMatrices(inv,o.matrixWorld));
    let set=bins.get(o.material);if(!set)bins.set(o.material,set=[]);set.push(geo);
  });
  const g=new T.Group();g.position.copy(src.position);g.rotation.copy(src.rotation);g.scale.copy(src.scale);
  for(const [m,gs] of bins){const geo=mergeGeometries(gs);if(geo){const mesh=new T.Mesh(geo,m);mesh.receiveShadow=!m.isMeshBasicNodeMaterial;g.add(mesh);}for(const d of gs)d.dispose();}
  return g;
}
export function signTexture(text,sub='',options={}){
  const canvas=document.createElement('canvas');canvas.width=options.w||512;canvas.height=options.h||128;const ctx=canvas.getContext('2d');
  ctx.fillStyle=options.bg||'#262b22';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.strokeStyle=options.stroke||'#ab8756';ctx.lineWidth=2;
  ctx.strokeRect(7,7,canvas.width-14,canvas.height-14);ctx.fillStyle=options.fg||'#f1d9a9';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font=`500 ${Math.min(58,canvas.height*.41)}px ${options.font||'Edition, Georgia, serif'}`;ctx.fillText(text,canvas.width/2,canvas.height*(sub?.43:.49),canvas.width-34);
  if(sub){ctx.font=`450 ${Math.min(26,canvas.height*.19)}px ParkSans, sans-serif`;ctx.fillStyle='#d9af77';ctx.fillText(sub,canvas.width/2,canvas.height*.76,canvas.width-32);}
  const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=8;
  return new T.MeshBasicNodeMaterial({name:'Sign: '+text,map:tex,side:T.DoubleSide});
}
