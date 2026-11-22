import test from 'node:test';
import assert from 'node:assert/strict';
import {Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three/webgpu';
import {cityGround,terrainExtent} from '../src/city-ground.js';

test('city ground is upward-facing outside the landscape and never covers a park valley',()=>{
  const g=cityGround(),p=g.getAttribute('position'),normals=g.getAttribute('normal');
  for(let i=0;i<normals.count;i++)assert.ok(normals.getY(i)>.95);
  for(let i=0;i<g.index.count;i+=3){
    const face=[0,1,2].map(j=>g.index.getX(i+j));
    const x=face.map(j=>p.getX(j)),z=face.map(j=>p.getZ(j));
    assert.ok(Math.min(...x)>terrainExtent-1||Math.max(...x)<1-terrainExtent||Math.min(...z)>terrainExtent-1||Math.max(...z)<1-terrainExtent);
  }
});

test('downward rays see no exterior at the pond or garden and see it along all city edges',()=>{
  const m=new Mesh(cityGround(),new MeshBasicMaterial());
  const extent=terrainExtent;
  const hits=(x,z)=>new Raycaster(new Vector3(x,6,z),new Vector3(0,-1,0)).intersectObject(m);
  for(const [x,z] of [[-115,102],[0,-144],[-218,-218],[226,227],[0,0]]) assert.equal(hits(x,z).length,0);
  for(const [x,z] of [[extent+8,0],[-extent-8,0],[0,extent+8],[0,-extent-8],[450,-760]]){
    assert.ok(Math.abs(hits(x,z)[0]?.point.y-(-.394))<1e-6,'City foundation has a gap');
  }
});
