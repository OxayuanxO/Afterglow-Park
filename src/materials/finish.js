import * as T from 'three/webgpu';
import {materialColor,materialRoughness,positionWorld,texture,vec2,vec4} from 'three/tsl';
import {hash2,clamp,smooth} from '../math.js';

let patina;
// One shared, mipmapped linear texture for pore, abrasion and roughness.
// Coordinates are metric rather than scaled with every piece of geometry;
// a curved iron rail, a broad painted door and small hardware share a grain.
function sheet(){
  if(patina)return patina;
  const size=128, data=new Uint8Array(size*size*4);
  const noise=(x,z,n,seed)=>{
    const X=x*n,Z=z*n,i=Math.floor(X),j=Math.floor(Z),u=smooth(0,1,X-i),v=smooth(0,1,Z-j);
    const a=(dx,dz)=>hash2((i+dx)%n+seed,(j+dz)%n-seed);
    return (a(0,0)*(1-u)+a(1,0)*u)*(1-v)+(a(0,1)*(1-u)+a(1,1)*u)*v;
  };
  for(let j=0;j<size;j++)for(let i=0;i<size;i++){
    const u=i/size,v=j/size,k=(j*size+i)*4,grain=noise(u,v,43,85),age=noise(u,v,9,72),freckle=noise(u,v,65,15);
    const scratch=smooth(.89,.997,Math.sin((u*79+v*17)*2*Math.PI+grain*.18))*smooth(.34,.69,age)*smooth(.4,.91,freckle);
    const pits=smooth(.59,.84,noise(u,v,27,38))*smooth(.24,.71,age);
    data[k]=255*clamp(.62+(grain-.5)*.30+(age-.5)*.38+scratch*.36-pits*.27,0,1);
    data[k+1]=255*clamp(.39+grain*.29+age*.21+pits*.12-scratch*.51,0,1);
    data[k+2]=255*(1-pits*.72);data[k+3]=255;
  }
  patina=new T.DataTexture(data,size,size,T.RGBAFormat);patina.wrapS=patina.wrapT=T.RepeatWrapping;
  patina.magFilter=T.LinearFilter;patina.minFilter=T.LinearMipmapLinearFilter;patina.generateMipmaps=true;
  patina.name='Linear lacquer, brushed metal and casting grain';patina.needsUpdate=true;return patina;
}
export function finishSurface(material,baseRoughness=materialRoughness,amount=1){
  const p=positionWorld,coord=vec2(p.x.mul(2.16).add(p.z.mul(.77)),p.y.mul(2.38).add(p.z.mul(1.39)).add(p.x.mul(.19)));
  const wear=texture(sheet(),coord);
  const pigment=wear.r.sub(.55).mul(.36*amount).add(1);
  material.colorNode=vec4(materialColor.rgb.mul(pigment),materialColor.a);
  material.roughnessNode=baseRoughness.add(wear.g.sub(.6).mul(.29*amount)).clamp(.09,1);
  material.aoNode=wear.b.sub(1).mul(.21*amount).add(1);
  return material;
}
