import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {browserPage,boot} from './browser.mjs';
const p=await browserPage({width:704,height:440});const {page,browser}=p;const checks={};const misses=[];let build,backend,result,clock;
try{
  backend=await boot(p,{world:1});build=await page.locator('script[type=module][src]').first().getAttribute('src');await page.locator('#enter').evaluate(e=>e.click());
  const {pois,acts}=await page.evaluate(()=>({pois:parkQA.poi(),acts:parkQA.actions()}));
  const notes=acts.filter(a=>a.id.startsWith('park-seat-')&&a.id.endsWith('-note'));
  const plates=acts.filter(a=>a.id.endsWith('-plaque')&&a.textKey);
  const once=l=>[...new Map(l.map(a=>[a.textKey,a])).values()];
  checks.placed={stars:pois.filter(a=>a.type==='star').length,elfDoors:pois.filter(a=>a.type==='elf').length,villages:pois.filter(a=>a.type==='village').length,storyPlaques:pois.filter(a=>a.type==='story').length,secrets:pois.filter(a=>a.type==='secret').length,notes:notes.length,uniqueNotes:once(notes).length,uniquePlaques:once(plates).length};
  const sites=pois.filter(a=>['elf','village'].includes(a.type));
  const unique=new Set(sites.map(p=>`${p.x.toFixed(1)}/${p.z.toFixed(1)}`));assert.ok(unique.size>=20,'At least 20 distinct miniature sites');
  assert.equal(checks.placed.uniqueNotes,40);assert.equal(checks.placed.uniquePlaques,30);
  for(const [name,list] of Object.entries({stars:pois.filter(a=>a.type==='star'),doors:pois.filter(a=>a.type==='elf'),stories:pois.filter(a=>a.type==='story'),secrets:pois.filter(a=>a.type==='secret'),notes:once(notes),plaques:once(plates)})){
    let done=0;
    for(const {id} of list){
      const r=await page.evaluate(id=>{
        const q=parkQA,a=q.actions().find(v=>v.id===id);
        for(const d of [.92,1.12,1.32,1.61,1.83,2.08])for(let i=0;i<29;i++){
          const f=i*2.3999632,x=a.x+Math.sin(f)*d,z=a.z+Math.cos(f)*d,y=q.floor(x,z).y;
          if(Math.hypot(d,y+1.65-a.y)>a.reach+.13)continue;
          const p=q.fit(x,z,y);if(Math.hypot(x-p.x,z-p.z)>.12)continue;
          q.place(x,z,[a.x,a.y,a.z],p.y);
          if(q.pick()===id)return {x,z};
        }return null;
      },id);
      if(!r){misses.push({name,id,why:'no aim from clear position'});continue;}
      await page.keyboard.press('e');const st=await page.evaluate(()=>parkQA.state());
      if(st.panel)await page.keyboard.press('Escape');
      if(st.stars.includes(id)||st.notes.some(n=>n.id===id))done++;else misses.push({name,id,why:'no journal record'});
    }
    checks[name]={count:list.length,activated:done};console.log(name,done+'/'+list.length);
  }
  result=await page.evaluate(()=>{
    const st=parkQA.state(),s=JSON.parse(localStorage.getItem('winter-wonderland-journal-v1')||'{}');
    return {stars:st.stars.length,eve:st.notes.some(a=>a.id==='eve'),savedStars:s.stars?.length??0,savedRecords:s.log?.length??0};
  });
  assert.equal(result.savedStars,24);assert.ok(result.eve);
  clock=await page.evaluate(()=>{
    const q=parkQA,advance=(t)=>{const n=Math.ceil((t-q.state().events)/.10);if(n>0)q.physicsTick(n,.10);};
    advance(901);const initial=q.state().show,scheduled=q.state().notes.some(n=>n.id==='show-1');
    advance(955);const lasts=q.state().show.active;advance(963);const ended=!q.state().show.active;
    q.setting('events',false);advance(1801);const disabled=!q.state().notes.some(n=>n.id==='show-2');
    q.setting('events',true);advance(1804);const noReplay=!q.state().show.active&&!q.state().notes.some(n=>n.id==='show-2');
    advance(2701);const resumes=q.state().show.active;q.setting('events',false);advance(2702);const cancels=!q.state().show.active;
    return {scheduled,disabled,duration:initial.duration,lasts,ended,noReplay,resumes,cancels};
  });
  assert.ok(clock.scheduled&&clock.disabled&&clock.lasts&&clock.ended&&clock.noReplay&&clock.resumes&&clock.cancels&&clock.duration===60,JSON.stringify(clock));
  clock.cues=await page.evaluate(()=>{
    const q=parkQA;let t=q.state().events;const h=new Date().getHours();q.setting('events',true);
    const seen=[],cancelled=[];
    for(let i=0;i<12&&new Set(seen).size<6;i++){
      const state=q.cueTest(q.state().rhythm.nextQuiet+.01,h);const key=state.last;seen.push(key);
      if(!state.active[key])throw Error('Interlude not active: '+key);
      if(key==='lantern'&&!state.lantern)throw Error('No moving lantern');
      q.setting('events',false);t=q.state().events+.04;const end=q.cueTest(t,h);
      if(Object.keys(end.active).length||key==='lantern'&&end.lantern)throw Error('Interlude still active after setting off: '+key);
      cancelled.push(key);q.setting('events',true);
    }
    q.cueTest(t+.1,(h+1)%24);const hour=q.state().notes.some(n=>n.id==='hour-'+((h+1)%24));
    q.setting('events',false);q.cueTest(t+.2,(h+2)%24);q.setting('events',true);q.cueTest(t+.3,(h+2)%24);
    const hourDisabled=!q.state().notes.some(n=>n.id==='hour-'+((h+2)%24));
    return {seen,cancelled,hour,hourDisabled};
  });
  assert.equal(new Set(clock.cues.seen).size,6);assert.deepEqual(clock.cues.cancelled,clock.cues.seen);assert.ok(clock.cues.hour&&clock.cues.hourDisabled);assert.deepEqual(p.errors,[]);assert.deepEqual(misses,[]);
}finally{await mkdir('docs/evidence',{recursive:true});await writeFile('docs/evidence/discovery-webgl.json',JSON.stringify({build,backend,checks,result,clock,misses,errors:p.errors,warnings:[...new Set(p.warnings)]},null,2));await browser.close();}
