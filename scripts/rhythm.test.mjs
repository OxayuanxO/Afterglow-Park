import test from 'node:test';
import assert from 'node:assert/strict';
import {Rhythm,INTERLUDE_IDS} from '../src/rhythm.js';

test('the quarter-hour cue and real-hour bell neither replay nor accumulate while disabled',()=>{
 const r=new Rhythm(1234,20);
 assert.equal(r.advance(899,20,true).show,null);
 assert.equal(r.advance(1,20,true).show,1);
 const silent=r.advance(901,21,false);
 assert.deepEqual(silent,{show:null,interlude:null,bell:false});
 assert.deepEqual(r.advance(1,21,true),{show:null,interlude:null,bell:false});
 const again=r.advance(900,22,true);assert.equal(again.show,3);assert.equal(again.bell,true);
});
test('quiet intervals are reproducible and cover all six events before repeats',()=>{
 const run=seed=>{
  const r=new Rhythm(seed,20),result=[];
  for(let i=0;i<18;i++){
   const dt=r.nextQuiet-r.clock;assert.ok(dt>=600&&dt<=1200);
   const out=r.advance(dt+.00001,20,true);result.push([out.interlude,dt]);
  }
  for(let i=0;i<3;i++)assert.deepEqual(new Set(result.slice(i*6,i*6+6).map(x=>x[0])),new Set(INTERLUDE_IDS));
  assert.ok(result.every((item,i)=>i===0||item[0]!==result[i-1][0]));return result;
 };
 assert.deepEqual(run(1234),run(1234));
});
