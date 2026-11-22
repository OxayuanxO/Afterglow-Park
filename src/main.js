import {pondEdge} from './terrain.js';
import * as T from 'three/webgpu';
import {createScene} from './scene.js';
import {buildWorld} from './world.js';
import {Atmosphere} from './environment.js';
import {Quality,readSettings,saveSettings} from './quality.js';
import {ParkCamera} from './camera.js';
import {ParkUI} from './ui.js';
import {ParkAudio} from './audio.js';
import {Activities} from './activities.js';
import {ParkEvents} from './events.js';
import {ground} from './terrain.js';
import {clamp} from './math.js';
import './styles.css';

const root=document.querySelector('#app'), host=document.querySelector('#world');
const q=new URLSearchParams(location.search),qa=q.has('qa'),still=qa&&q.has('still');
const settings=readSettings();const ui=new ParkUI(root,settings);ui.syncMode('lobby');
if(qa&&q.has('world'))document.body.dataset.clean='true';
const waitFrame=()=>new Promise(r=>requestAnimationFrame(r));
const movement=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight','KeyE','KeyQ','ShiftLeft','ShiftRight']);
let g;
boot().catch(err=>{console.error(err);ui.fail(err);});
async function boot(){
  ui.load(.045,'準備渲染器');await waitFrame();
  try{g=await createScene(host,q);}catch(err){if(q.get('backend')==='webgl')throw err;const alt=new URLSearchParams(q);alt.set('backend','webgl');g=await createScene(host,alt);}
  g.renderer.onDeviceLost=info=>{const old=q.get('backend');if(g.backend==='WebGPU'&&old!=='webgl'&&!qa){q.set('backend','webgl');q.set('quality','low');location.search=q.toString();}else{g.renderer.setAnimationLoop(null);ui.fail(info);}};
  g.renderer.info.autoReset=false;document.body.dataset.backend=g.backend;
  // Read the local subset fonts before drawing the 3D sign textures.
  try{await Promise.all([document.fonts.load('500 36px Edition'),document.fonts.load('500 24px ParkSans')]);}catch{}
  const world=await buildWorld(g.scene,(p,txt)=>ui.load(p,txt));
  const cam=new ParkCamera(g.camera,g.canvas,world,settings);
  const audio=new ParkAudio(settings),discovery=world.discovery,env=new Atmosphere(settings),quality=new Quality(g,world.light,settings,q);
  const photoValues={exposure:1.11,temp:0,focus:22,aperture:.85,photoDof:false,freeze:true,tone:'agx'};
  let last=0,lastRender=0,intervalAverage=0,intervalCount=0,time=0,hitClock=0,hudClock=0, renderCount=0,cacheStats=null,glFence=null,gpuBusy=false,framePause=false,lastHit=null,lastSaved=0,worldTime=0;
  const direction=new T.Vector3();
  let presentation=null,completedFrames=0,fenceError=null,submittedAt=0,worstGap=0;
  let mx=0,my=0,drag=null,ignoreMove=0,devicePrimed=false,fancy=false,withDof=false,showBloom=true,photoSaving=false,nextFrameAllowed=0,sceneAspect=0;
  const ctx={world,cam,audio,ui,discovery,env,settings,g,quality,photoValues,now:()=>time,worldNow:()=>worldTime,inputTime:performance.now(),activities:null,events:null,
    enter(){if(ui.boot)return;ctx.inputTime=performance.now();audio.start().catch(err=>console.warn('Audio:',err.message));cam.start(q.has('skip')||matchMedia('(pointer: coarse)').matches);ui.fade();},
    home(){cam.unlock();cam.setMode('lobby');cam.setView(world.layout.opening,true);cam.activeShot='tree';ui.vista('tree',false);ctx.applyPhoto();ui.fade();},
    changed(resize=false){if(resize){quality.resFactor=1;quality.set(settings.quality);}if(cam.mode==='walk'||cam.mode==='free'||cam.mode==='photo'){cam.camera.fov=settings.fov;cam.camera.updateProjectionMatrix();}ctx.applyPhoto();saveSettings(settings);},
    applyPhoto(){const active=cam.mode==='photo'||(qa&&ctx.qaPhoto);g.renderer.toneMapping=active&&photoValues.tone==='aces'?T.ACESFilmicToneMapping:T.AgXToneMapping;
      g.renderer.toneMappingExposure=active?photoValues.exposure:1.11;
      g.grade.temperature.value=active?photoValues.temp:0;g.grade.focus.value=photoValues.focus;g.grade.bokeh.value=photoValues.aperture;
      g.grade.vignette.value=settings.postVignette?settings.vignette*.48:0;g.grade.grain.value=settings.postGrain?settings.grain*.008:0;
      g.setQuality(quality.tier,settings.postAO);g.glow.strength.value=quality.tier.bloom*settings.bloom;const d=active&&photoValues.photoDof,b=settings.postBloom;
      if(d!==withDof||b!==showBloom){withDof=d;showBloom=b;g.output(d,b);}
    },
    goto(id,mode=cam.mode,snap=false){const shot=world.layout.shots.find(v=>v.id===id);if(!shot)return false;cam.setMode(mode);cam.setView(shot,true);
      if(!snap&&!settings.reduced)ui.fade();return true;},
    beginTour(i=0){audio.start().catch(()=>{});cam.tour(Math.max(0,i));ui.fade();},
    photo(){if(ui.panel==='photo'){ui.close();return;}ui.close();cam.photo(true);ctx.applyPhoto();ui.open('photo');},
    async savePhoto(mult=1){
      if(photoSaving)return;photoSaving=true;const previous=quality.scale;
      try{if(mult>1)g.resize(Math.min(previous*mult,2.52));
        framePause=true;await waitFrame();const data=await g.encodeFrame(()=>render(true,.035,true));
        const a=document.createElement('a');a.download=`Afterglow-Park-${cam.activeShot}-${Date.now()}${mult>1?'-2x':''}.png`;a.href=data;a.click();ui.status('已儲存冬夜照片');
      }catch(e){ui.status('無法儲存，請降低解析度再試。');console.warn(e);}finally{if(mult>1)g.resize(previous);photoSaving=false;framePause=false;}
    }};
  ctx.activities=new Activities(ctx);ctx.events=new ParkEvents(ctx);
  cam.onStep=(m,foot,yaw,n,fast)=>{if(audio.context)audio.step(m,fast);world.effects.imprint(foot,yaw,n,m);};
  cam.onStand=(prev,p)=>{if(prev==='lie'&&world.pathAt(p.x,p.z).edge>.12)world.effects.angel(p);};
  cam.isSkating=()=>ctx.activities.skates;
  cam.onMode=(mode)=>{ui.syncMode(mode);ctx.applyPhoto();lastHit=null;if(mode==='walk')hitClock=0;};
  cam.onTravel=()=>ui.fade();cam.onLockFail=()=>ui.status('可按住左鍵拖曳視角');cam.onShot=()=>ui.fade();
  ui.connect(ctx);ctx.applyPhoto();ui.vista(ui.selected,false);
  let pickCount=0;
  function pick(){
    if(ui.panel||cam.ts||!['walk','free'].includes(cam.mode)){lastHit=null;ui.updateHint(null);return null;}
    g.camera.updateMatrixWorld();lastHit=world.actions.pick(g.camera,{mode:cam.mode,mx,my,inside:cam.room(),physics:world.physics});ui.updateHint(lastHit,cam.mode==='free');pickCount++;
    return lastHit;
  }
  function interact(item=pick()){return world.actions.invoke(ctx,item);}
  function tick(dt,now,manual=false){
    const paused=ui.panel&&ui.panel!=='photo';const progressing=cam.mode!=='photo'||!photoValues.freeze;
    time+=dt;if(progressing){worldTime+=dt;for(const step of world.sim)step(dt);}
    if(!paused)cam.update(dt,worldTime,false);
    if(cam.mode!=='lobby')ctx.events.update(progressing?dt:0);
    env.update(progressing?dt:0,settings,cam.mode==='lie');g.grade.clock.value=Math.floor(worldTime*12)*.026;
    ctx.activities.update();audio.update(ctx);discovery.update(dt,ctx);
    hitClock-=dt;hudClock-=dt;
    if(hitClock<=0&&!manual){hitClock=.046;pick();}
    if(hudClock<=0){
      hudClock=.27;const p=cam.mode==='walk'?cam.feet:g.camera.position;ui.syncHud(discovery.location(p.x,p.z),cam.yaw,cam.isLocked());ui.updateMapPos();
      if(q.has('debug')){const d=ui.el.debug;d.hidden=false;const s=cacheStats??quality.stats();const interval=lastRender?Math.max(intervalAverage,(now-lastRender)*.001):0;const perf=intervalCount>=3?`${(1/interval).toFixed(1)} fps · ${Math.round(interval*1000)} ms`:'尚未量到幀時間';d.textContent=`${s.backend} · ${s.quality.toUpperCase()} · ${s.scale}×\n${perf}\n${s.calls} draws · ${s.triangles?.toLocaleString()} tris\n${s.geo} geo · ${s.textures} textures · ${s.lightSlots} pooled lights\n${Math.round(p.x)}, ${Math.round(p.y)}, ${Math.round(p.z)} · ${cam.mode}`;}
    }
    if(discovery.dirty&&time-lastSaved>8){lastSaved=time;discovery.save();}
    if(!paused&&settings.idleTour&&!settings.reduced&&cam.mode==='walk'&&now-ctx.inputTime>60000){ctx.beginTour(0);}
  }
  const backend=g.renderer.backend, gl=backend.gl;
  function readyToRender(){
    if(gpuBusy)return false;
    if(!glFence||!gl)return true;
    const r=gl.clientWaitSync(glFence,0,0);
    if(r===gl.TIMEOUT_EXPIRED)return false;
    gl.deleteSync(glFence);glFence=null;
    if(r===gl.WAIT_FAILED){fenceError='WAIT_FAILED';return !gl.isContextLost();}
    completedFrames++;return true;
  }
  function render(force=false,dt=.033,exportOnly=false){
    if(!force&&!readyToRender())return false;
    const pose=g.camera.position,inside=cam.room();
    world.update(dt,worldTime,g.camera,env,quality.tier,settings,inside);g.renderer.info.reset();
    const output=exportOnly?(g.pipeline.render(),null):g.present();cacheStats=quality.stats();renderCount++;
    if(output){
      gpuBusy=true;presentation=output.then(()=>{completedFrames++;},e=>{fenceError=String(e);g.renderer.onDeviceLost({message:fenceError});}).finally(()=>{gpuBusy=false;});
    }
    if(!still&&!force){
      const now=performance.now();if(submittedAt)worstGap=Math.max(worstGap,now-submittedAt);submittedAt=now;
      if(gl){glFence=gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE,0);gl.flush();}
      else if(backend.device&&!output){gpuBusy=true;backend.device.queue.onSubmittedWorkDone().then(()=>{completedFrames++;},e=>{fenceError=String(e);}).finally(()=>{gpuBusy=false;});}
    }
    return true;
  }
  function loop(now){
    if(document.hidden||framePause)return;
    const dt=last?clamp((now-last)*.001,.001,.12):.016;last=now;tick(dt,now);
    if(now<nextFrameAllowed)return;
    if(render(false,lastRender?clamp((now-lastRender)*.001,.016,.30):.016)){
      if(lastRender){const dt=(now-lastRender)*.001;intervalAverage=intervalCount++?intervalAverage+(dt-intervalAverage)*.15:dt;quality.update(clamp(dt,.001,.27));}lastRender=now;
      // Avoid busy-polling software rasterizers and hidden/multi-tab previews.
      if(quality.frameAvg>.073)nextFrameAllowed=now+8;
    }
  }
  addEventListener('resize',()=>quality.apply());
  addEventListener('pagehide',()=>{if(discovery.dirty)discovery.save();glFence&&gl?.deleteSync(glFence);});
  addEventListener('blur',()=>{cam.keys.clear();drag=null;});
  addEventListener('keydown',e=>{
    if(ui.boot)return;const code=e.code,editing=!!ui.panel&&e.target.matches?.('input,select,textarea');if(e.metaKey||e.ctrlKey||e.altKey)return;
    if(editing&&code!=='Escape')return;
    if(e.repeat&&!movement.has(code))return;
    ctx.inputTime=performance.now();
    if(code==='Escape'){
      e.preventDefault();if(ui.hideUI){ui.hide();return;}if(ui.panel){ui.close();return;}if(cam.mode==='cinematic'){cam.takeControl();return;}
      if(cam.mode==='intro'){cam.start(true);return;}if(['seat','ride','lie'].includes(cam.mode)){cam.stand();return;}
      if(cam.mode!=='lobby'){ui.open('pause');}return;
    }
    if(code==='KeyH'){e.preventDefault();ui.hide();return;}
    // Once a dialog is open, ordinary Tab remains available for keyboard focus.
    if(code==='Tab'&&!ui.panel){e.preventDefault();ui.open('settings');return;}
    if(code==='KeyM'){e.preventDefault();ui.toggle('map');return;}
    if(ui.panel&&ui.panel!=='photo')return;
    if(code==='KeyP'){e.preventDefault();ctx.photo();return;}
    if(code==='KeyV'){e.preventDefault();ui.close();cam.switchMode();return;}
    if(code==='KeyC'){e.preventDefault();if(cam.mode==='cinematic')cam.takeControl();else {ui.close();ctx.beginTour(0);}return;}
    if(cam.mode==='cinematic'){cam.takeControl();if(!movement.has(code))return;}
    if(cam.mode==='lobby')return;
    if(code==='KeyZ'&&!ui.panel){e.preventDefault();if(!cam.lie())ui.status('在較鬆軟的雪地，可以躺下看星。');return;}
    if(code==='KeyE'&&cam.mode==='walk'&&!ui.panel){e.preventDefault();if(!e.repeat)interact();return;}
    if(movement.has(code)){e.preventDefault();cam.setKey(code,true);}
  });
  addEventListener('keyup',e=>cam.setKey(e.code,false));
  document.addEventListener('pointerlockchange',()=>{
    if(!cam.isLocked()&&performance.now()-(cam.programmaticUnlock||0)>260&&!ui.panel&&cam.mode==='walk'&&!qa)ui.open('pause');
    ui.syncHud(null,cam.yaw,cam.isLocked());
  });
  const c=g.canvas;
  c.addEventListener('pointerdown',e=>{
    if(ui.panel&&ui.panel!=='photo')return;ctx.inputTime=performance.now();
    if(cam.mode==='cinematic'){cam.takeControl();return;}
    if(cam.mode==='lobby'||cam.mode==='intro')return;
    drag={id:e.pointerId,x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,button:e.button};
    if(!cam.isLocked())try{c.setPointerCapture(e.pointerId);}catch{}
  });
  c.addEventListener('pointerup',e=>{
    if(!drag)return;const click=Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)<5;const button=drag.button;drag=null;
    if(!click||button!==0)return;
    if(cam.mode==='walk'&&!cam.isLocked()){cam.lock();return;}
    if(cam.mode==='free')interact();
  });
  c.addEventListener('pointercancel',()=>{drag=null;});
  addEventListener('mousemove',e=>{
    const r=c.getBoundingClientRect();mx=(e.clientX-r.left)/r.width*2-1;my=1-(e.clientY-r.top)/r.height*2;
    if(ui.panel&&ui.panel!=='photo')return;
    if(!cam.isLocked()&&!drag)return;ctx.inputTime=performance.now();
    if(cam.ts&&cam.mode!=='photo')return;
    if(cam.isLocked())cam.look(e.movementX,e.movementY);
    else if(drag){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;
      if(drag.button===2&&['free','photo'].includes(cam.mode)){const h=1+Math.max(0,g.camera.position.y)*.068;cam.panX+=dx*.023*h;cam.panY+=dy*.024*h;}
      else if(drag.button===0)cam.look(dx,dy);
    }
  });
  c.addEventListener('wheel',e=>{if(!['free','photo'].includes(cam.mode)||ui.panel&&ui.panel!=='photo')return;e.preventDefault();cam.fwd+=clamp(-e.deltaY*.036,-13,13)*(1+Math.max(0,g.camera.position.y-5)*.051);},{passive:false});
  ui.load(.97,'沿著光走進冬夜');await waitFrame();
  env.update(0,settings,false);world.update(.37,worldTime,g.camera,env,quality.tier,settings,cam.room());
  render(true,.65);if(presentation)await presentation;
  ui.loaded();if(!still)g.renderer.setAnimationLoop(loop);
  // QA and capture hooks only exist on explicit ?qa URLs; the public UI uses the same controllers.
  if(qa)window.parkQA={ready:true,backend:g.backend,stats:()=>cacheStats??quality.stats(),layout:world.layout,
    trees:()=>({n:world.vegetation.list.length,f:world.vegetation.coverage,decorated:world.vegetation.decorated,firBulbs:world.fir.count,species:world.vegetation.counts}),
    state:()=>({mode:cam.mode,panel:ui.panel,room:cam.room()?.id??null,feet:{...cam.feet},cam:g.camera.position.toArray(),yaw:cam.yaw,distance:cam.walked,dt:cacheStats?.dt,frames:renderCount,snow:env.snow,time:env.night,skates:ctx.activities.skates,shake:ctx.activities.shakeCount,show:world.fir.showState(worldTime),seat:cam.seat?.id,seen:[...discovery.visited],stars:[...discovery.stars],notes:[...discovery.log.values()],audio:audio.context?.state??null,mix:audio.mix??null,notesPlayed:audio.totalNotes,events:ctx.events.clock,rhythm:ctx.events.state(),roomStates:world.cabins.filter(r=>r.enter).map(r=>({id:r.id,fire:r.fireOn,lamp:r.lampOn,strings:r.festiveOn,open:r.door.state,yaw:r.door.pivot.rotation.y}))}),
    survey:(step=7,phase)=>world.decor.report(step,phase),catalogue:()=>world.decor.catalogue(),
    visibleChristmas:(x,y,z)=>[...world.decor.visible({x,y,z}).values()],
    sightings:(framed=false)=>{const {position:p,aspect,fov}=g.camera;
      const d=framed?g.camera.getWorldDirection(direction).toArray():null;
      const f=Math.atan(Math.tan(fov*Math.PI/360)*Math.hypot(1,aspect));return world.decor.instances(p,d,Math.cos(f));},
    catalogPositions:()=>world.decor.examples(),
    atmosphere:()=>({clock:env.t,night:env.night,snow:env.snow,fog:env.fog,star:env.star,wind:env.wind}),
    pipelineFacts:()=>({backend:g.backend,halfFloatScene:g.beauty.renderTarget.texture.type===T.HalfFloatType,outputColorSpace:g.renderer.outputColorSpace,sceneSamples:g.beauty.renderTarget.samples}),
    actions:()=>world.actions.items.map(({id,x,y,z,reach,room,radius,hint,textKey})=>({id,x,y,z,reach,room,radius,hint,textKey})),
    poi:()=>world.pois,quiet:()=>world.quiet,place:(x,z,look,y)=>cam.snapFeet(x,z,look,y),look:(...a)=>cam.lookAt(...a),fit:(x,z,y)=>world.physics.safePoint(x,z,y),floor:(x,z,y)=>world.physics.floor(x,z,y),blocked:(x,z,y)=>{const hit=world.physics.blocked(x,z,y);return hit?.tag??null;},surface:(x,z,y)=>world.physics.material(x,z,y),rooms:()=>world.cabins.filter(c=>c.enter).map(c=>({id:c.id,w:c.w,d:c.d,y:c.y,x:c.x,z:c.z,yaw:c.yaw})),
    invoke:(id)=>interact(world.actions.byId.get(id)),pick:()=>pick()?.id??null,
    key:(name,bool)=>cam.setKey(name,bool),tick:(total=.24,dt=.033)=>{const n=Math.min(600,Math.ceil(total/dt));for(let i=0;i<n;i++)tick(dt,performance.now(),true);world.update(Math.min(total,.5),worldTime,g.camera,env,quality.tier,settings,cam.room());},
    goto:(id)=>{const ok=ctx.goto(id,'lobby',true);if(ok)ui.vista(id,false);return ok;},
    view:(p,t,fov)=>cam.setView({p,t,fov},true),stand:()=>cam.stand(),start:()=>cam.start(true),mode:()=>cam.switchMode(),statsFrame:()=>{render(true,.44);return cacheStats;},
    profile:()=>{const r=g.renderer,old=r.getRenderObjectFunction(),passes={};
      r.setRenderObjectFunction((o,scene,camera,geo,m,...rest)=>{
        const kind=camera===g.camera?'main':camera.layers.mask===4?'pond':camera.layers.mask===8?'ice':m.isShadowPassMaterial?'shadow':`aux:${camera.type}:${camera.layers.mask}`;
        const pass=(passes[kind]??={count:0,triangles:0,groups:{}});
        const group=o.name.includes('LOD')?'trees':o.isInstancedMesh||o.name.startsWith('Static tile')?'batch:'+m.name:m.name||o.name||'unnamed';
        const rec=(pass.groups[group]??={count:0,triangles:0});
        const before=r.info.render.drawCalls,tris=r.info.render.triangles;
        r.renderObject(o,scene,camera,geo,m,...rest);
        if(kind==='main'&&r.info.render.drawCalls-before>4)return; // recursive reflector records its own pass
        const n=r.info.render.drawCalls-before,t=r.info.render.triangles-tris;pass.count+=n;pass.triangles+=t;rec.count+=n;rec.triangles+=t;
      });try{const stats=(render(true,.41),cacheStats);return {stats,passes};}finally{r.setRenderObjectFunction(old);}},
    updateAudio:()=>audio.update(ctx),
    player:()=>({x:cam.feet.x,z:cam.feet.z,y:cam.feet.y,mode:cam.mode,walk:cam.walked,room:cam.room()?.id}),
    cueTest:(t,hour)=>{ // Explicitly QA-only; gameplay uses the unmodified clock.
      if(t>ctx.events.clock){const delta=t-ctx.events.clock;worldTime+=delta;ctx.events.update(delta,hour);}
      return ctx.events.state();
    },
    physicsTick:(n,dt)=>{for(let i=0;i<n;i++)tick(dt,performance.now(),true);},
    testStep:(p,dx,dz)=>{const step={...p};world.physics.step(step,dx,dz);return step;},
    nav:(x,z,y)=>{const f=world.physics.floor(x,z,y);const hit=world.physics.blocked(x,z,f.y,.38);return {y:f.y,deck:!!f.deck,clear:Math.abs(x)<228&&Math.abs(z)<228&&!hit&&(f.deck||pondEdge(x,z)>1.012)};},
    render:(at=10)=>{worldTime=at;env.t=at;env.update(0,settings,cam.mode==='lie');world.update(.49,worldTime,g.camera,env,quality.tier,settings,cam.room());return render(true,.49);},
    renderHealth:()=>({completedFrames,worstGapMs:Math.round(worstGap),lastSubmissionMs:submittedAt?Math.round(performance.now()-submittedAt):null,pending:!!glFence||gpuBusy,contextLost:gl?.isContextLost()??false,fenceError}),
    post:()=>g.settings(),
    capture:async(opts={})=>{if(opts.id==='opening'){cam.setMode('lobby');cam.setView(world.layout.opening,true);}else if(opts.id)ctx.goto(opts.id,'lobby',true);if(opts.tier)quality.set(opts.tier);if(opts.time)settings.time=opts.time;if(opts.tone)window.parkQA.tone(opts.tone);worldTime=opts.phase??12.8;env.t=worldTime;env.update(0,settings,false);const data=await g.encodeFrame(()=>render(true,.45,true),opts.mime);return {data,stats:cacheStats};},
    tier:(id)=>quality.set(id),setting:(k,v)=>{settings[k]=v;ctx.applyPhoto();ui.reflectMeta();},tone:(k)=>{photoValues.tone=k;ctx.qaPhoto=true;ctx.applyPhoto();},
    synchronize:()=>presentation??g.renderer.backend.device?.queue.onSubmittedWorkDone(),
    presentation:g.presentation,adapter:g.adapter,
    paused:(yes)=>{framePause=yes;},hide:()=>ui.hide(),discovery:()=>discovery.save(),estimates:()=>({instances:world.batch.instances,geometries:g.renderer.info.memory.geometries,textures:g.renderer.info.memory.textures,js:performance.memory?.usedJSHeapSize})};
}
