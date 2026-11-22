import {BufferGeometry,Float32BufferAttribute} from 'three/webgpu';

// Shared with the terrain tessellation. The exterior's inner seam is outside
// the collision boundary; no city foundation is allowed below the park.
export const terrainTiles=9,terrainTileMeters=52;
export const terrainExtent=terrainTiles*terrainTileMeters/2;
export function cityGround(inner=terrainExtent-.6,outer=1200,y=-.394){
  const p=[],uv=[],ix=[];
  const strip=(x0,x1,z0,z1)=>{
    const k=p.length/3;
    for(const [x,z] of [[x0,z0],[x0,z1],[x1,z1],[x1,z0]]){p.push(x,y,z);uv.push(x*.05,z*.05);}
    ix.push(k,k+1,k+2,k,k+2,k+3);
  };
  strip(-outer,outer,-outer,-inner);strip(-outer,outer,inner,outer);
  strip(-outer,-inner,-inner,inner);strip(inner,outer,-inner,inner);
  const geo=new BufferGeometry();geo.setAttribute('position',new Float32BufferAttribute(p,3));geo.setAttribute('uv',new Float32BufferAttribute(uv,2));geo.setIndex(ix);geo.computeVertexNormals();
  return geo;
}
