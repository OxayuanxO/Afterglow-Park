import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {rng,Grid,distSegment,smooth} from '../src/math.js';
const load=k=>JSON.parse(readFileSync(new URL(`../src/data/${k}.json`,import.meta.url),'utf8'));
test('map has all requested camera bookmarks and five quiet corners',()=>{
  const a=load('layout');assert.equal(a.size,450);assert.equal(a.shots.length,12);assert.equal(new Set(a.shots.map(x=>x.id)).size,12);assert.equal(a.quiet.length,5);assert.equal(a.cabins.filter(x=>x.enter).length,5);
  assert.ok(a.paths.every(p=>p.width>=1.5&&p.points.length>=2));
});
test('exploration content minimums and duplicate checks',()=>{
  const a=load('pois'),b=load('content');assert.equal(a.stars.length,24);assert.equal(a.doors.length,12);assert.equal(a.secrets.length,8);assert.equal(a.story.length,12);assert.equal(b.story.length,12);assert.equal(new Set(b.notes).size,40);assert.equal(new Set(b.plaques).size,30);assert.ok([...b.notes,...b.plaques].every(t=>t.length<=40));
});
test('fixed seed and collision spatial index',()=>{
  const a=rng(129),b=rng(129);for(let i=0;i<400;i++)assert.equal(a(),b());
  const g=new Grid(10),o={id:'p'};g.insert(o,-1,1,5);assert.ok(g.at(3,5).includes(o));assert.equal(g.range(1,1,1).size,1);assert.equal(g.range(61,12,2).size,0);
  assert.equal(distSegment(3,2,0,0,5,0),2);assert.equal(smooth(0,10,5),.5);
});

test('real winter mesh catalogue crosses both count milestones',()=>{
  const a=load('catalog');assert.equal(a.length,80);assert.equal(new Set(a.map(t=>t[0])).size,a.length);
  assert.ok(a.every(t=>t.length===3&&t[2].endsWith('.js')));
});
