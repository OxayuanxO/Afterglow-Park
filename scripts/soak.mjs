import assert from 'node:assert/strict';
import {browserPage,boot} from './browser.mjs';
import {installNavigator} from './navigator.mjs';
import {writeFile,mkdir} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {setTimeout as delay} from 'node:timers/promises';

// Controlled browser simulation. REALTIME=1 uses a wall-clock paced driver;
// it still renders GPU spot checks, not a 30-minute display/driver stress test.
const actual=process.env.REALTIME==='1',seconds=+(process.env.SECONDS_TOTAL||1800),kind=actual?'wall-clock':'accelerated';
const p=await browserPage({width:464,height:290,flags:['--enable-precise-memory-info']});
const {page,browser}=p;let simulated=0,finished=false,passed=false,build,backend,routeResult=null,wall=0;
const logs=[];const path=`docs/evidence/soak-${kind}-${p.backend}.json`;
const save=async()=>{await mkdir('docs/evidence',{recursive:true});await writeFile(path,JSON.stringify({kind,build,passed,backend,seconds,simulated,wall,finished,route:routeResult,logs,errors:p.errors,warnings:[...new Set(p.warnings)]},null,2));};
try{
  backend=await boot(p,{world:1});build=await page.locator('script[type=module][src]').first().getAttribute('src');await page.locator('#enter').evaluate(e=>e.click());
  await page.evaluate(installNavigator);
  await page.evaluate(()=>{
    const q=parkQA,{walk,dist,plan}=parkNavigator;
    let next=0,path=[],anchors=0,retries=0,stuck=0,last=null,part=0,targetName='南門',navFailures=[];const checkpoints=[];let reached=null;
    window.drive=(n)=>{
      for(let j=0;j<n;j++){
        const p=q.player();if(p.mode!=='walk'||!Number.isFinite(p.y)||Math.abs(p.x)>228.01||Math.abs(p.z)>228.01)throw Error('Locomotion left validated state '+JSON.stringify(p));
        if(!path.length){
          if(reached){checkpoints.push({name:reached,feet:p,dist:p.walk});anchors++;reached=null;}
          const [name,spot]=walk[next%walk.length];next++;part=0;targetName=name;
          const goal=q.fit(spot[0],spot[1]);path=plan(p,goal)||[];reached=path.length?name:null;
          if(!path.length){navFailures.push({name,from:p,reason:'no capsule path'});q.key('KeyW',false);q.physicsTick(1,.10);continue;}
        }
        const t=path[0];if(dist(t.x-p.x,t.z-p.z)<.235){path.shift();part++;stuck=0;q.key('KeyW',false);q.physicsTick(1,.10);continue;}
        q.look(t.x,p.y+1.65,t.z);q.key('KeyW',true);q.physicsTick(1,.10);const after=q.player();const delta=dist(after.x-p.x,after.z-p.z);stuck=delta<.014?stuck+1:0;
        if(stuck>=14){const final=path.at(-1);path=plan(after,final)||[];retries++;stuck=0;if(!path.length||retries>35){navFailures.push({name:targetName,from:after,reason:'collision blocked'});path.length=0;reached=null;}}
        last=after;
      }
      return {next,anchors,retries,targetName,navFailures,checkpoints,last,seen:q.state().seen,moments:q.state().notes.filter(n=>n.tag==='今晚').map(n=>n.id)};
    };
  });
  const cdp=await page.context().newCDPSession(page);const start=performance.now();const interval=actual?1:15;const nTotal=Math.round(seconds*10);
  for(let steps=0;steps<nTotal;){
    const n=Math.min(nTotal-steps,interval*10);routeResult=await page.evaluate(n=>drive(n),n);steps+=n;simulated=steps/10;wall=(performance.now()-start)/1000;
    if(steps===n||steps%(actual?600:1500)<n||steps===nTotal){
      await cdp.send('HeapProfiler.collectGarbage');const est=await page.evaluate(()=>parkQA.estimates());
      const frame=process.env.SOAK_FRAMES==='0'?null:await page.evaluate(()=>parkQA.statsFrame());
      logs.push({wallSeconds:+wall.toFixed(2),simulationSeconds:simulated,movedMeters:+(routeResult.last?.walk??0).toFixed(2),anchors:routeResult.anchors,flags:routeResult.navFailures.length,seen:routeResult.seen,...est,frame});await save();console.log(JSON.stringify(logs.at(-1)));
    }
    if(actual){const wait=start+simulated*1000-performance.now();if(wait>0)await delay(wait);}
  }
  wall=(performance.now()-start)/1000;finished=true;
  assert.ok(seconds<600||routeResult.anchors>15,'Not enough route checkpoints reached');assert.ok(!routeResult.navFailures.length,JSON.stringify(routeResult.navFailures));assert.deepEqual(p.errors,[]);
  passed=true;console.log('COMPLETED',kind,simulated,'seconds; actual',Math.round(wall),'s;',routeResult.anchors,'checkpoints');
}finally{try{await save();}finally{await browser.close();}}
