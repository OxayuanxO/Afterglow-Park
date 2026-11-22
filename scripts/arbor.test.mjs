import test from 'node:test';
import assert from 'node:assert/strict';
import {modelArbor} from '../src/arbor.js';
const fir=['Norway spruce',.71,.76,.112,0x314637],birch=['Birch',0,1,.28,0xa99e8d];
test('tree lod topology decreases; fine sprays, structured snow and bark have different surfaces',()=>{
  for(const [i,s] of [[0,fir],[6,birch]]){
    for(let variant=0;variant<3;variant++){
      const levels=[0,1,2,3].map(l=>modelArbor(39242+i*5154+variant*288,i,s,l));
      const tri=levels.map(g=>g.index.count/3);
      assert.ok(tri.every((n,j)=>j===0||n<tri[j-1]));assert.ok(tri[0]<30000&&tri[1]<3300&&tri[2]<600&&tri[3]<310);
      for(const g of levels){
        assert.ok(g.attributes.position.array.every(Number.isFinite));assert.ok(g.attributes.normal.array.every(Number.isFinite));assert.equal(g.attributes.surface.count,g.attributes.position.count);
        assert.ok(g.index.array.every(n=>n<g.attributes.position.count));
      }
      const atlas=new Set(levels[0].attributes.surface.array);assert.ok(atlas.has(0));if(i===0)assert.deepEqual(atlas,new Set([0,1,2,3]));
    }
  }
});
test('same seed reuses geometry; neighboring seed gives a distinct silhouette',()=>{
  const a=modelArbor(8179,0,fir,1);assert.equal(a,modelArbor(8179,0,fir,1));const b=modelArbor(8299,0,fir,1);
  assert.notDeepEqual(a.attributes.position.array.subarray(0,60),b.attributes.position.array.subarray(0,60));
});
