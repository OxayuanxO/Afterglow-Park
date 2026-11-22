import assert from 'node:assert/strict';
import {browserPage,boot} from './browser.mjs';
import {installNavigator} from './navigator.mjs';
import {writeFile,mkdir} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {setTimeout as delay} from 'node:timers/promises';

// This variant keeps the app's RAF / audio / rendering loop running for wall-clock
// time. The navigator supplies heading and movement keys; not ticks or teleporting.
const seconds=+(process.env.SECONDS_TOTAL||1800),w=+(process.env.W||480),h=+(process.env.H||300);
const p=await browserPage({width:w,height:h,flags:['--enable-precise-memory-info']});
const {page,browser}=p,path=`docs/evidence/soak-live-${p.backend}${process.env.RUN_ID?'-'+process.env.RUN_ID:seconds!==1800?'-'+seconds:''}.json`;
let backend=null,baseline=null,finished=false,passed=false,failure=null;const samples=[];
let build=null,encounters=null,trail=null;const quality=process.env.QUALITY||'low';const savedAt=new Date().toISOString();
const save=async()=>{await mkdir('docs/evidence',{recursive:true});await writeFile(path,JSON.stringify({savedAt,build,seconds,quality,viewport:[w,h],backend,baseline,finished,passed,failure,samples,encounters,trail,errors:[...new Set(p.errors)],warnings:[...new Set(p.warnings)]},null,2));};
try{
  backend=await boot(p,{still:null,skip:1,quality,world:1});await page.locator('#enter').evaluate(e=>e.click());
  await page.waitForFunction(()=>parkQA.state().mode==='walk',null,{polling:120,timeout:65000});
  build=await page.locator('script[type="module"][src]').first().getAttribute('src');
  await page.evaluate(installNavigator);
  const cdp=await page.context().newCDPSession(page);
  const sample=()=>page.evaluate(()=>{
    const q=parkQA,s=q.state();return {feet:q.player(),mode:s.mode,frames:s.frames,events:s.events,audio:s.audio,seen:s.seen,room:s.room,hidden:document.hidden,renderHealth:q.renderHealth(),resources:q.estimates(),...window.readDrive?.()};
  });
  await cdp.send('HeapProfiler.collectGarbage');baseline=await sample();
  console.log('READY',backend,JSON.stringify(baseline));
  await page.evaluate(()=>{
    const q=parkQA,{walk,dist,plan}=parkNavigator;
    const rooms=q.rooms(),a=new Map(q.actions().map(v=>[v.id,v]));
    const names={護林人小屋外:'ranger',玻璃花房外:'glass',木玩具工坊外:'toys',壁爐小屋外:'santa',原木小屋外:'log'};
    const hit=(code,key)=>dispatchEvent(new KeyboardEvent('keydown',{code,key,bubbles:true,cancelable:true}));
    const action=(id)=>{const v=a.get(id);q.look(v.x,v.y,v.z);if(q.pick()!==id)return false;hit('KeyE','e');return true;};
    const route=[],insideAt=new Set(),completed=[],faults=[],activity=[],checkpoints=[],encounters=[];
    const goal=(name,x,z,opts={})=>route.push({name,x,z,...opts});
    for(const [name,pt] of walk){
      const r=rooms.find(c=>c.id===names[name]);
      if(r){
        const f=(d)=>[r.x+Math.sin(r.yaw)*d,r.z+Math.cos(r.yaw)*d];
        goal(name,...f(r.d/2+1.66),{door:r.id});goal('室內：'+r.id,...f(r.d/2-1.10),{inside:r.id});goal('離開：'+r.id,...f(r.d/2+1.66),{exit:r.id});continue;
      }
      if(name==='溜冰場西入口')goal('換冰鞋',149,30.75,{act:'skates'});
      if(name==='旋轉木馬外')goal('木馬入口',75.29,81.61,{act:'carousel-0'});
      goal(name,...pt,name==='溜冰場'?{ice:true}:name==='溜冰場東入口'?{iceExit:true}:name==='草坪'&&pt[0]<-100?{lie:true}:{});
      if(name==='樹冠入口'){
        const spans=q.layout.canopySpans;
        const along=(i,f)=>[spans[i][0]+(spans[i+1][0]-spans[i][0])*f,spans[i][1]+(spans[i+1][1]-spans[i][1])*f];
        const ramp=(name,i,f,check=false)=>goal(name,...along(i,f),{ramp:true,deck:check});
        ramp('坡道前',0,-.095);ramp('坡腳',0,.075);ramp('上坡',0,.42);ramp('橋面',0,.95,true);
        for(let i=1;i<spans.length-1;i++){
          ramp('橋墩前 '+i,i-1,.985);ramp('轉角 '+i,i,.027);ramp('板道 '+i,i,.52,i===2);
        }
        ramp('下橋',spans.length-2,1.08);
      }
      if(name==='營火空地'){const v=a.get('shake-0');goal('可搖雪的雲杉',v.x,v.z+1.46,{act:'shake-0'});}
    }
    let path=[],index=0,t=null,pause=0,last=null,retry=0,stranded=0,step=0,walkClock=0,roomPause=null,doorWait=null,lastEncounter=-1,maxY=0,loops=0;
    const stop=()=>{q.key('KeyW',false);q.key('ShiftLeft',false);};
    const no=(reason,id=t?.name)=>faults.push({reason,id,at:q.player()});
    const record=(name)=>activity.push({name,at:q.player(),clock:walkClock});
    function arrive(now){
      stop();const s=q.state();checkpoints.push({name:t.name,x:s.feet.x,y:s.feet.y,z:s.feet.z});
      if(t.door){
        const door=s.roomStates.find(r=>r.id===t.door);
        if((door.open||action(t.door+'-door'))&&q.state().roomStates.find(r=>r.id===t.door).open){
          // Door collider releases once the visible hinge has passed the release angle.
          // Wait for readiness, not an assumed software-render wall duration.
          doorWait={id:t.door,timeout:now+27000};
        }else no('door ray missed',t.door);
      }
      if(t.inside){if(s.room===t.inside){insideAt.add(t.inside);pause=now+1500;}else no('not inside cabin',t.inside);}
      if(t.exit){if(!s.room&&insideAt.delete(t.exit))completed.push(t.exit);else no('cabin exit not confirmed',t.exit);}
      if(t.act==='carousel-0'&&!activity.some(a=>a.name==='carousel')){
        if(action(t.act)&&q.state().panel==='rides'){document.querySelector('[data-action="pick-ride"][data-id="0"]').click();roomPause='carousel';pause=now+6000;}else no('did not select carousel');
      }
      if(t.act==='skates'&&!s.skates){if(!action(t.act)||!q.state().skates)no('did not put on skates');}
      if(t.ice&&s.skates&&q.surface(s.feet.x,s.feet.z,s.feet.y)==='ice')record('ice');
      if(t.iceExit&&activity.some(a=>a.name==='ice')&&!s.skates)record('ice exit');
      if(t.act==='shake-0'&&!s.shake){if(action(t.act)&&q.state().shake>s.shake){record('shake');pause=now+2600;}else no('could not shake tree');}
      if(t.lie&&!activity.some(a=>a.name==='lie')){hit('KeyZ','z');if(q.state().mode==='lie'){roomPause='lie';pause=now+5500;}else no('not loose snow');}
      if(t.deck){if(s.feet.y>6&&q.nav(s.feet.x,s.feet.z,s.feet.y).deck)record('canopy');else no('took ground layer instead of bridge');}
      t=null;path=[];retry=0;stranded=0;
    }
    function frame(now){
      try{
        if(document.hidden)throw Error('page became hidden');
        if(now<pause)return;
        if(doorWait){
          const door=q.state().roomStates.find(r=>r.id===doorWait.id);
          if(door.open&&door.yaw>.733)doorWait=null;
          else if(now>doorWait.timeout){no('door did not finish opening',doorWait.id);doorWait=null;}
          else return;
        }
        if(roomPause){
          const s=q.state(),i=roomPause;roomPause=null;
          if(s.mode===(i==='carousel'?'ride':'lie')){hit('Escape','Escape');if(q.state().mode==='walk')record(i);else no('did not recover walk',i);}
          else no('activity did not start',i);
          pause=now+1300;return;
        }
        const p=q.player();
        if(p.mode!=='walk'||Math.abs(p.x)>228.01||Math.abs(p.z)>228.01||!Number.isFinite(p.y))throw Error('unexpected player state '+JSON.stringify(p));
        walkClock=q.state().events;
        if(p.walk>lastEncounter+5){
          lastEncounter=p.walk;const hits=q.sightings(),framed=q.sightings(true);
          encounters.push({sec:Math.round(now),walk:+p.walk.toFixed(2),hits,framed});
        }
        maxY=Math.max(maxY,p.y);
        if(!t){
          if(index>=route.length){index=0;loops++;}
          t=route[index++];
          // The exact nominal cabin/ramp positions are needed for layered ground.
          t.fit=(t.ramp||t.door||t.inside||t.exit)?{x:t.x,z:t.z}:q.fit(t.x,t.z,p.y);
          path=plan(p,t.fit)||[];
          if(!path.length){no('no capsule path');t=null;return;}
        }
        const g=path[0];if(!g)throw Error('empty segment');
        const left=dist(g.x-p.x,g.z-p.z);
        if(left<(path.length===1?(t.ramp?.21:.39):.27)){
          path.shift();stranded=0;if(!path.length){arrive(now);return;}stop();return;
        }
        if(last&&p.walk-last.walk<.005)stranded++;else stranded=0;
        last=p;
        if(stranded>85){
          if(++retry>3){no('stuck after replanning');stop();stranded=0;path=[];t=null;return;}
          path=plan(p,t.fit)||[];stranded=0;stop();if(!path.length){no('no replanned path');t=null;}return;
        }
        const v=q.state().cam;
        q.look(g.x,v[1]+Math.min(.9,left*.055),g.z);q.key('ShiftLeft',left>7&&!t.inside&&!t.ramp);q.key('KeyW',true);step++;
      }catch(e){stop();faults.push({reason:String(e),fatal:true});return;}
      finally{if(!faults.at(-1)?.fatal)requestAnimationFrame(frame);}
    }
    window.readDrive=()=>({index,loops,maxY,target:t?.name,step,checkpoints:checkpoints.length,recent:checkpoints.slice(-3),faults:[...faults],cabins:[...new Set(completed)],activity:activity.map(v=>v.name)});
    window.routeResult=()=>({encounters,checkpoints,activity,loops});
    requestAnimationFrame(frame);
  });
  const begin=performance.now(),period=Math.max(3,+(process.env.SAMPLE_SECS||30));
  for(let k=Math.min(period,seconds);;k=Math.min(k+period,seconds)){
    await delay(Math.max(0,begin+k*1000-performance.now()));
    await cdp.send('HeapProfiler.collectGarbage');const s=await sample();const used=await cdp.send('Runtime.getHeapUsage');
    const m={wallSec:+((performance.now()-begin)/1000).toFixed(2),...s,cdpHeapUsed:used.usedSize};samples.push(m);
    console.log(JSON.stringify({sec:m.wallSec,frames:m.frames,dist:+m.feet.walk.toFixed(1),target:m.target,waypoints:m.checkpoints,room:m.room,cabins:m.cabins,activity:m.activity,faults:m.faults,heapMiB:+(m.cdpHeapUsed/2**20).toFixed(1)}));
    await save();const previous=samples.at(-2)??baseline;
    assert.ok(s.frames>previous.frames,'No new renderer frames in the sampling interval');assert.ok(s.renderHealth?.completedFrames>previous.renderHealth?.completedFrames,'No confirmed GPU completion in the sampling interval');assert.ok(!s.renderHealth.contextLost&&!s.renderHealth.fenceError,JSON.stringify(s.renderHealth));assert.ok(!s.hidden,'Page became hidden');assert.ok(!s.faults?.some(f=>f.fatal),JSON.stringify(s.faults));assert.deepEqual(p.errors,[]);
    if(k===seconds)break;
  }
  finished=true;const s=samples.at(-1);
  const r=await page.evaluate(()=>routeResult());trail={checkpoints:r.checkpoints,activity:r.activity,loops:r.loops};
  const seen=r.encounters,fresh=[],known=new Set(),firstType=new Set(),forwardSeen=new Set();
  for(const s of seen){const f=[],k=[],forward=[];for(const [id,type] of s.hits){if(!known.has(id)){known.add(id);f.push(type);}if(!firstType.has(type)){firstType.add(type);k.push(type);}}for(const [id,type] of s.framed)if(!forwardSeen.has(id)){forwardSeen.add(id);forward.push(type);}fresh.push({f,k,forward});}
  const windows=[];
  for(let i=0;i<seen.length;i++){
    const start=seen[i].sec;if(seen.at(-1).sec-start<180000)break;
    const unique=new Set(),newInstances=new Set(),newTypes=new Set(),forward=new Set();let j=i;
    while(j<seen.length&&seen[j].sec<start+180000){
      for(const [,type] of seen[j].hits)unique.add(type);
      for(const type of fresh[j].f)newInstances.add(type);
      for(const type of fresh[j].k)newTypes.add(type);for(const type of fresh[j].forward)forward.add(type);
      j++;
    }
    windows.push({sec:+((start-seen[0].sec)*.001).toFixed(1),types:unique.size,freshInstanceTypes:newInstances.size,newTypes:newTypes.size,forward:forward.size});
  }
  const bands=key=>({min:windows.length?Math.min(...windows.map(w=>w[key])):null,failing:windows.filter(w=>w[key]<3).length});
  encounters={method:'360-degree ray plus cone of forward view (diagonal FOV upper bound), sampled every 5 m; freshness uses individual anchor IDs',sampled:seen.length,windowSec:180,windowCount:windows.length,distinct:bands('types'),freshInstanceTypes:bands('freshInstanceTypes'),firstType:bands('newTypes'),forwardFresh:bands('forward'),windows};
  assert.ok(s.feet.walk>Math.min(seconds*.05,80),'Not enough real-time player progress');assert.ok(!s.faults?.length,JSON.stringify(s.faults));
  if(seconds>=1800){assert.equal(s.seen.length,14,'Did not visit all 14 park regions');assert.ok(s.cabins?.length===5,'Did not enter and leave every cabin');for(const id of ['ice','ice exit','lie','carousel','shake','canopy'])assert.ok(s.activity?.includes(id),'Did not complete '+id);}
  passed=true;
}catch(e){failure=e.stack||String(e);throw e;}
finally{try{await save();}finally{await browser.close();}}
