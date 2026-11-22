import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {writeFile,mkdir,readFile} from 'node:fs/promises';
import {browserPage,boot,capture} from './browser.mjs';
import {sourceDigest} from './source-digest.mjs';
const targetName=process.env.TARGET;const sourceSha256=await sourceDigest();
const p=await browserPage({width:850,height:540});const {page,browser}=p;
const evalp=(f,v)=>page.evaluate(f,v);const state=()=>evalp(()=>parkQA.state());const tick=(n=.9,dt=.031)=>evalp(([n,dt])=>parkQA.tick(n,dt),[n,dt]);
const logs=[]; const doCheck=async(name,fn)=>{try{const value=await fn();logs.push({name,passed:true,value:value??null});console.log('PASS',name,typeof value==='object'?JSON.stringify(value):value??'');return value;}catch(e){logs.push({name,passed:false,detail:e.message});console.error('FAIL',name,e.message);return null;}};
const press=(key)=>page.keyboard.press(key);
let a=[],build=null;const act=(id)=>a.find(x=>x.id===id);
async function target(id,{dist=[1.35,1.7,2.12],room=null,allowBack=true}={}){
  const obj=act(id);if(!obj)throw Error('Unknown action '+id);
  const result=await evalp(({obj,dist,room,allowBack})=>{
    const g=window.parkQA;const rooms=g.rooms();const cabin=room?rooms.find(c=>c.id===room):null;
    for(const r of dist)for(let i=0;i<24;i++){
      if(!allowBack&&i>9)break;
      const f=i*2.3999632, x=obj.x+Math.sin(f)*r,z=obj.z+Math.cos(f)*r;
      if(cabin){const dx=x-cabin.x,dz=z-cabin.z,c=Math.cos(cabin.yaw),s=Math.sin(cabin.yaw);if(Math.abs(dx*c-dz*s)>cabin.w/2-.34||Math.abs(dx*s+dz*c)>cabin.d/2-.34)continue;}
      const s=g.fit(x,z,(cabin?.y??obj.y)-.85);if(Math.hypot(x-s.x,z-s.z)>.2)continue;
      g.place(s.x,s.z,[obj.x,obj.y,obj.z],s.y);
      if(g.pick()===obj.id)return {x:s.x,z:s.z,room:g.state().room};
    }
    return null;
  },{obj,dist,room,allowBack});
  if(!result)throw Error('Ray could not target '+id+' from a clear standing position');
  return result;
}
async function aimTo(x,z,ms=1,run=false){
  const s=await state(),f=s.feet;await evalp(([x,y,z])=>parkQA.look(x,y,z),[x,f.y+1.65,z]);
  if(run)await page.keyboard.down('Shift');await page.keyboard.down('w');await tick(ms);await page.keyboard.up('w');if(run)await page.keyboard.up('Shift');return state();
}
try{
 await doCheck('啟動與樹海統計',async()=>{const b=await boot(p);build=await page.locator('script[type=module][src]').first().getAttribute('src');const t=await evalp(()=>parkQA.trees());assert.equal(t.n,3400);assert.ok(t.f>.60&&t.f<.70);assert.equal(t.firBulbs,21200);const evergreen=t.species.slice(0,6).reduce((n,a)=>n+a[1],0)/t.n;assert.ok(evergreen>=.65&&evergreen<=.75);assert.ok(t.decorated/t.n>=.20&&t.decorated/t.n<=.30);return {backend:b,...t,evergreen};});
 a=await evalp(()=>parkQA.actions());
 await mkdir('docs/evidence',{recursive:true});await writeFile(`docs/evidence/poi-runtime${targetName==='dev'?'-dev':''}.json`,JSON.stringify({build,sourceSha256,catalogue:await evalp(()=>parkQA.catalogue()),positions:await evalp(()=>parkQA.catalogPositions()),poi:await evalp(()=>parkQA.poi()),quiet:await evalp(()=>parkQA.quiet()),actions:a},null,2));
 await doCheck('入口按鈕與音訊解鎖',async()=>{await page.locator('#enter').click();const s=await state();assert.equal(s.mode,'walk');assert.ok(s.feet.z>205);await page.waitForFunction(()=>parkQA.state().audio==='running');return (await state()).audio;});
 await doCheck('第一人稱從南門走完林蔭大道',async()=>{
   await evalp(()=>parkQA.look(0,1.41,0));await page.keyboard.down('Shift');await page.keyboard.down('w');for(let i=0;i<4;i++)await tick(15);await page.keyboard.up('w');await page.keyboard.up('Shift');const s=await state();assert.ok(s.feet.z<23&&s.feet.z>10,JSON.stringify(s.feet));assert.ok(s.distance>=187);return {start:214,end:s.feet.z,meters:s.distance,seen:s.seen};
 });
 await doCheck('自由視角切換與 Q/E 高度操作',async()=>{await press('v');await tick(1);const before=await state();assert.equal(before.mode,'free');await page.keyboard.down('e');await tick(1.5);await page.keyboard.up('e');assert.ok((await state()).cam[1]-before.cam[1]>3);await press('v');await tick(1);assert.equal((await state()).mode,'walk');});
 const cabins=await evalp(()=>parkQA.rooms());
 for(const c of cabins){
   await doCheck(`${c.id}：開門、進屋、熄火、點火、煤油燈、彩燈、坐下、離開`,async()=>{
     const o=act(c.id+'-door'),sin=Math.sin(c.yaw),cos=Math.cos(c.yaw),forward=(d)=>[c.x+sin*d,c.z+cos*d];const out=forward(c.d/2+1.66),inside=forward(c.d/2-1.06);
     await evalp(([out,o])=>parkQA.place(out[0],out[1],[o.x,o.y,o.z]),[out,o]);assert.equal(await evalp(()=>parkQA.pick()),c.id+'-door');
     await press('e');await tick(.79);assert.ok((await state()).roomStates.find(r=>r.id===c.id).open);
     await aimTo(...inside,2.02);let st=await state();assert.equal(st.room,c.id,'Could not pass through the opened door. '+JSON.stringify(st.feet));const entered=st.feet;
     await target(c.id+'-fire',{room:c.id});await press('e');assert.equal((await state()).roomStates.find(r=>r.id===c.id).fire,false);await press('e');assert.equal((await state()).roomStates.find(r=>r.id===c.id).fire,true);
     await target(c.id+'-lamp',{room:c.id,dist:[.93,1.29,1.68]});await press('e');assert.equal((await state()).roomStates.find(r=>r.id===c.id).lamp,false);await press('e');
     await target(c.id+'-strings',{room:c.id,dist:[.92,1.15,1.46]});await press('e');assert.equal((await state()).roomStates.find(r=>r.id===c.id).strings,false);await press('e');assert.equal((await state()).roomStates.find(r=>r.id===c.id).strings,true);
     await target(c.id+'-seat',{room:c.id});await press('e');await tick(1);st=await state();assert.equal(st.mode,'seat');assert.equal(st.seat,c.id+'-seat');await press('Escape');await tick(.9);
     await evalp(([inside,o,y])=>parkQA.place(inside[0],inside[1],[o.x,o.y,o.z],y+.10),[inside,o,c.y]);await aimTo(...out,2.23);st=await state();assert.equal(st.room,null,'Could not exit '+JSON.stringify(st.feet));return {entered,exit:st.feet};
   });
 }
 for(const id of ['shore','gazebo','secret','rest','lookout'])await doCheck(`安靜角落：${id}`,async()=>{
   await target('quiet-'+id,{dist:[1.2,1.50,1.9]});await press('e');await tick(1.01);const s=await state();assert.equal(s.seat,'quiet-'+id);assert.equal(s.mode,'seat');
   const preset={shore:'water',gazebo:'gazebo',secret:'garden',rest:'nook',lookout:'hill'}[id];
   await page.waitForFunction(p=>{parkQA.updateAudio();return parkQA.state().mix?.preset===p;},preset,{polling:70,timeout:6000});
   const mix=(await state()).mix;assert.ok(mix.city<.3);await press('Escape');await tick(.83);assert.equal((await state()).mode,'walk');return {cam:s.cam,mix};
 });
 await doCheck('景物：四種互動、閱讀、手札',async()=>{let seen=[];for(const id of ['granfir','fountain','deer-0','stall-0','story-1','elf-2','globe']){
     if(!act(id))throw Error('Missing '+id);await target(id);await press('e');if((await state()).panel)await press('Escape');seen.push(id);
   }await tick(.8);assert.ok((await state()).notes.some(n=>n.id==='story-1'));return seen;});
 await doCheck('活動：坐上木馬與離開',async()=>{await target('carousel-0');await press('e');assert.equal((await state()).panel,'rides');await page.locator('[data-action="pick-ride"][data-id="0"]').click();await tick(1.16);const s=await state();assert.equal(s.mode,'ride');await tick(1.44);const t=await state();assert.ok(Math.hypot(t.cam[0]-s.cam[0],t.cam[2]-s.cam[2])>.3);await press('Escape');await tick(.84);assert.equal((await state()).mode,'walk');});
 await doCheck('活動：溜冰、慣性與離開冰面',async()=>{
   await target('skates');await press('e');assert.ok((await state()).skates);await evalp(()=>parkQA.place(101.23,8,[136,1.65,8]));const s=await aimTo(136,8,6.1,true);assert.ok(s.feet.x>110);assert.equal(await evalp(({x,y,z})=>parkQA.surface(x,z,y),s.feet),'ice');assert.ok(s.skates);await evalp(()=>parkQA.place(167.4,8,[174,1.65,8]));await tick(.38);assert.equal((await state()).skates,false);return s.feet;
 });
 await doCheck('活動：躺下看星、搖落樹雪',async()=>{await evalp(()=>parkQA.place(-120,-42,[0,15,0]));await press('z');await tick(1.22);assert.equal((await state()).mode,'lie');await press('z');await tick(.86);assert.equal((await state()).mode,'walk');await target('shake-0');await press('e');assert.equal((await state()).shake,1);await tick(.45);await tick(2.1);});
 await doCheck('碰撞：中央樹島、牆面、岸邊與園區邊界',async()=>{
   const pos=await evalp(()=>{
     const g=parkQA,F=(x,z)=>({x,z,y:g.floor(x,z).y}),move=(p,dx,dz,n)=>{let out=p;for(let j=0;j<n;j++)out=g.testStep(out,dx,dz);return out;};
     const c=g.rooms()[0],fx=Math.sin(c.yaw),fz=Math.cos(c.yaw),bx=c.x-fx*(c.d/2+1.7),bz=c.z-fz*(c.d/2+1.7);
     return {island:move(F(0,16),0,-.08,100),wall:move(F(bx,bz),.055*fx,.055*fz,100),shore:move(F(-115,138),0,-.10,200),edge:move(F(0,220),0,.12,160),c};
   });assert.ok(pos.island.z>10.8);assert.ok(Math.hypot(pos.wall.x-pos.c.x,pos.wall.z-pos.c.z)>pos.c.d/2);assert.ok(pos.shore.z>124);assert.ok(pos.edge.z<=228);return pos;
 });
 await doCheck('上層／下層的樹冠橋面判定' ,async()=>{
   const f=await evalp(()=>({top:parkQA.floor(150,139,10.1),bottom:parkQA.floor(150,139,.81)}));assert.ok(f.top.deck&&f.top.y-f.bottom.y>5,JSON.stringify(f));return {top:f.top.y,bottom:f.bottom.y};
 });
 await doCheck('樹冠橋第一段：由地面步行到上層',async()=>{
   const r=await evalp(()=>{const q=parkQA,[start,top]=q.layout.canopySpans;q.place(...start);const a=q.player();
     for(let i=0;i<251;i++){const p=q.player(),d=Math.hypot(p.x-top[0],p.z-top[1]);if(d<.65)break;q.look(top[0],p.y+1.65,top[1]);q.key('KeyW',true);q.physicsTick(1,.1);}q.key('KeyW',false);return {a,b:q.player()};});
   assert.ok(r.b.y-r.a.y>5,JSON.stringify(r));return r;
 });
 await doCheck('地圖與設定；雪天切換、獨處及持久化',async()=>{await press('Tab');assert.equal((await state()).panel,'settings');await page.locator('select[name="snow"]').selectOption('heavy');await page.locator('input[name="solitude"]').check();await press('Escape');await tick(7);assert.ok((await state()).snow>.91);await press('m');assert.equal((await state()).panel,'map');await page.locator('[data-id="journal"]').click();assert.ok(await page.locator('.notes article').count()>0);await press('Escape');const saved=await evalp(()=>JSON.parse(localStorage.getItem('winter-wonderland-settings-v1')));assert.ok(saved.solitude&&saved.snow==='heavy');});
 await doCheck('氛圍會平滑變化；日夜、天氣可鎖定',async()=>{
    const r=await evalp(()=>{
      const q=parkQA,dt=(s)=>q.tick(s,.025),a=q.atmosphere;
      q.setting('timeFlow',false);q.setting('weatherFlow',false);q.setting('time','night');q.setting('snow','flurry');dt(7);const start=a();
      q.setting('time','late');q.setting('snow','heavy');dt(.11);const blend=a();dt(8);const end=a();
      q.setting('timeFlow',true);q.setting('weatherFlow',true);dt(7);const auto=a();
      q.setting('timeFlow',false);q.setting('weatherFlow',false);dt(8);const lock=a();
      q.setting('time','night');q.setting('snow','flurry');q.setting('solitude',false);dt(5);
      return {start,blend,end,auto,lock};
    });
    assert.ok(r.start.night<r.blend.night&&r.blend.night<r.end.night&&r.end.night>.95);assert.ok(r.start.snow<r.blend.snow&&r.blend.snow<r.end.snow&&r.end.snow>.95);
    assert.ok(Math.abs(r.auto.snow-r.end.snow)>.1&&Math.abs(r.auto.night-r.end.night)>.05);assert.ok(r.lock.night>.95&&r.lock.snow>.95);return r;
 });
 await doCheck('照片模式、相機書籤、PNG 下載',async()=>{
   await press('p');assert.equal((await state()).mode,'photo');await page.locator('select[name="bookmark"]').selectOption('cabin');await tick(.45);const d=page.waitForEvent('download',{timeout:105000});await page.locator('[data-action="capture"]').first().click({timeout:100000});const image=await d;assert.match(image.suggestedFilename(),/\.png$/);
   const buf=await readFile(await image.path());assert.ok(buf.length>15000);assert.equal(buf.toString('ascii',1,4),'PNG');const w=buf.readUInt32BE(16),h=buf.readUInt32BE(20);assert.ok(w>=500&&h>=300);
   await press('Escape');assert.equal((await state()).mode,'free');
   const saved=targetName==='production'?'screenshots/render-check/photo-export.png':null;
   if(saved){await mkdir('screenshots/render-check',{recursive:true});await writeFile(saved,buf);}
   return {file:image.suggestedFilename(),saved,sha256:createHash('sha256').update(buf).digest('hex'),bytes:buf.length,w,h};
 });
 await doCheck('電影運鏡與立即接手',async()=>{await press('c');assert.equal((await state()).mode,'cinematic');const f=(await state()).cam;await tick(2.7);assert.notDeepEqual((await state()).cam,f);await press('w');assert.equal((await state()).mode,'free');});
 await doCheck('沒有瀏覽器 console error',async()=>{assert.deepEqual(p.errors,[]);});
}finally{
 await mkdir('docs/evidence',{recursive:true});await writeFile(`docs/evidence/smoke-${process.env.TARGET?process.env.TARGET+'-':''}${p.backend}.json`,JSON.stringify({when:new Date().toISOString(),build,sourceSha256,target:targetName??process.env.PARK_URL??'Vite live',logs,warnings:[...new Set(p.warnings)],errors:p.errors},null,2));await browser.close();
 if(logs.some(t=>!t.passed))process.exitCode=1;
}
