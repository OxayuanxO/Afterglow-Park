import {rng,between,clamp} from './math.js';
// The pitches are newly transcribed short phrases from traditional public-domain tunes.
// Durations are in score beats. Each phrase is surrounded with several beats of space.
const scores=[
 ['Silent Night',[[67,1.5],[69,.5],[67,1],[64,3],[67,1.5],[69,.5],[67,1],[64,3],[74,2],[74,1],[71,3],[72,2],[72,1],[67,3],[69,2],[69,1],[72,1.5],[71,.5],[69,1],[67,1.5],[69,.5],[67,1],[64,3]]],
 ['Greensleeves',[[69,1],[72,2],[74,1],[76,1.5],[77,.5],[76,1],[74,2],[71,1],[67,1.5],[69,.5],[71,1],[72,2],[69,1],[69,1.5],[68,.5],[69,1],[71,2],[68,1],[64,3]]],
 ['Deck the Halls',[[77,1.5],[75,.5],[74,1],[72,1],[70,1],[72,1],[74,1],[70,1],[72,.5],[74,.5],[75,.5],[72,.5],[74,1.5],[72,.5],[70,1],[69,1],[70,2]]],
 ['O Come, All Ye Faithful',[[67,1],[67,2],[62,1],[67,1],[69,2],[62,2],[71,1],[69,1],[71,1],[72,1],[71,2],[69,1],[67,1],[67,2],[66,1],[64,1],[66,1],[67,2],[69,1],[71,1],[66,1],[64,1],[62,3]]],
 ['Jingle Bells',[[64,1],[64,1],[64,2],[64,1],[64,1],[64,2],[64,1],[67,1],[60,1.5],[62,.5],[64,4],[65,1],[65,1],[65,1.5],[65,.5],[65,1],[64,1],[64,1],[64,.5],[64,.5],[62,1],[62,1],[64,1],[62,2],[67,2]]],
 ['The First Noel',[[64,.5],[62,.5],[60,1.5],[62,.5],[64,.5],[65,.5],[67,2],[69,.5],[71,.5],[72,1],[71,1],[69,1],[67,2],[69,.5],[71,.5],[72,1],[71,1],[69,1],[67,1],[69,1],[71,1],[72,1],[67,1],[65,1],[64,2]]],
 ['God Rest You Merry, Gentlemen',[[69,1],[69,1],[76,1],[76,1],[74,1],[72,1],[71,1],[69,1],[67,1],[69,1],[71,1],[72,1],[74,1],[76,3],[69,1],[69,1],[76,1],[76,1],[74,1],[72,1],[71,1],[69,1],[67,1],[69,1],[71,1],[72,1],[74,1],[76,3]]],
 ['In the Bleak Midwinter',[[65,2],[65,1],[67,1],[69,1],[67,1],[65,2],[65,1],[65,1],[67,1],[65,1],[62,2],[60,2],[62,1],[64,1],[65,2],[67,1],[69,1],[70,2],[69,1],[67,1],[65,2],[65,2]]]
];
const tune=(i)=>scores[(i+scores.length)%scores.length];
// City, wind, music, near-water, shelter/reverb. Each quiet seat has its own balance.
const presets={park:[1,1,1,0,.16],water:[.20,.78,.50,1,.14],gazebo:[.26,.47,.78,0,.29],garden:[.16,.36,.70,0,.22],nook:[.22,.64,.94,0,.19],hill:[.12,.85,.64,0,.12],hearth:[.026,.04,.85,0,.26],stars:[.12,.38,.57,0,.11],fire:[.16,.40,.68,0,.17],carousel:[.17,.45,1,0,.16]};
export class ParkAudio {
  constructor(settings){this.settings=settings;this.r=rng(216);this.context=null;this.tracks=[];this.local=new Map();this.record=null;this.room=null;this.lastBeat=-1;this.totalNotes=0;}
  async start(){
    const A=window.AudioContext||window.webkitAudioContext;if(!A)return null;
    if(this.context){if(this.context.state!=='running')await this.context.resume();return this.context;}
    const c=this.context=new A();const lim=c.createDynamicsCompressor();lim.threshold.value=-24;lim.knee.value=19;lim.ratio.value=3.8;lim.attack.value=.012;lim.release.value=.24;
    const master=this.master=c.createGain();master.gain.value=this.settings.muted?0:.67;master.connect(lim).connect(c.destination);
    this.main=c.createGain();this.main.connect(master);this.mus=c.createGain();this.mus.connect(master);
    this.cueBus=c.createGain();this.cueBus.gain.value=+this.settings.events;this.cueBus.connect(this.mus);
    this.cuePoints={show:this.spatial([0,4.5,0],this.cueBus,8.5),bandstand:this.spatial([29,2,120],this.cueBus,4.6),carol:this.spatial([123,1.8,-111],this.cueBus,4.1),carousel:this.spatial([66,1.8,78],this.cueBus,4.8),bell:this.spatial([13,9,-42],this.cueBus,12)};
    const buffer=c.createBuffer(1,Math.floor(c.sampleRate*5),c.sampleRate),ch=buffer.getChannelData(0);
    for(let i=0;i<ch.length;i++)ch[i]=between(this.r,-1,1);this.noise=buffer;
    const impulse=c.createBuffer(2,Math.floor(c.sampleRate*2.4),c.sampleRate);
    for(let k=0;k<2;k++){const vs=impulse.getChannelData(k);for(let i=0;i<vs.length;i++)vs[i]=between(this.r,-1,1)*(.9-i/vs.length*.9)**3.65;}
    this.reverb=c.createConvolver();this.reverb.buffer=impulse;this.wet=c.createGain();this.wet.gain.value=.22;this.reverb.connect(this.wet).connect(master);this.cueBus.connect(this.reverb);
    this.wind=this.loop(450,'lowpass',this.main,.0001);this.city=this.loop(92,'lowpass',this.main,.0001);
    this.mini=this.loop(620,'bandpass',this.main,.0001);this.mini.filter.Q.value=.78;
    this.shore=this.loop(288,'bandpass',this.main,.0001);this.shore.filter.Q.value=.54;
    this.tracks.push({idx:0,j:0,next:c.currentTime+5,scale:.53,position:null,type:'global',volume:.033});
    this.tracks.push({idx:1,j:0,next:c.currentTime+2,scale:.47,position:[66,1.5,78],type:'carousel',volume:.09});
    this.tracks.push({idx:4,j:0,next:c.currentTime+8,scale:.54,position:[29,2,120],type:'bandstand',volume:.072});
    this.tracks.push({idx:5,j:0,next:c.currentTime+10,scale:.52,position:[121,1.5,-110],type:'market',volume:.072});
    for(const p of this.tracks)if(p.position)p.out=this.spatial(p.position,this.mus,.9);
    for(const [id,loc,fc] of [['pond',[-115,-1.1,106],267],['fountain',[0,1,-144],874],['fire',[82,.45,151],410],['market',[121,1,-103],186],['ice',[135,.22,8],514],['swing',[89,1,75],254]]){
      const s=this.spatial(loc,this.main,3.2);const n=this.loop(fc,id==='market'?'lowpass':'bandpass',s,.001);this.local.set(id,{s,n,loc});
    }
    await c.resume();return c;
  }
  spatial(pos,out,ref=1.6){const p=this.context.createPanner();p.panningModel='equalpower';p.distanceModel='exponential';p.refDistance=ref;p.rolloffFactor=1.07;p.maxDistance=150;this.pos(p,pos);p.connect(out);return p;}
  pos(p,pos){if(p.positionX){p.positionX.value=pos[0];p.positionY.value=pos[1];p.positionZ.value=pos[2];}else p.setPosition(...pos);}
  loop(hz,type,out,volume){const c=this.context,source=c.createBufferSource();source.buffer=this.noise;source.loop=true;const filter=c.createBiquadFilter();filter.type=type;filter.frequency.value=hz;const g=c.createGain();g.gain.value=volume;source.connect(filter).connect(g).connect(out);source.start(0,this.r()*3.95);return {g,filter};}
  _tone(midi,len,start,gain=.04,loud=.05,type='bell',out=null,directWet=true){
    const c=this.context;if(!c||c.state!=='running'||gain<.0002)return;
    const pitch=440*2**((midi-69)/12);const partials=type==='chime'?[[1,1],[2.01,.36],[2.77,.17],[4.11,.066]]:type==='soft'?[[1,1],[2.00,.24],[4,.032]]:[[1,1],[2.003,.25],[3.006,.077]];
    const g=c.createGain();g.gain.value=1;g.connect(out||this.mus);if(directWet)g.connect(this.reverb);
    const b=Math.max(len+.6,1.12);let run=partials.length;
    for(const [ratio,mul] of partials){const o=c.createOscillator(),v=c.createGain();o.type=type==='soft'&&ratio===1?'triangle':'sine';o.frequency.setValueAtTime(pitch*ratio,start);
      v.gain.setValueAtTime(.00001,start);v.gain.exponentialRampToValueAtTime(Math.max(.0001,gain*mul),start+(type==='soft'?.095:.025));v.gain.exponentialRampToValueAtTime(.00006,start+b/(1+.43*(ratio-1)));o.connect(v).connect(g);o.start(start);o.stop(start+b+.02);o.onended=()=>{o.disconnect();v.disconnect();if(--run===0)g.disconnect();};}
    this.totalNotes++;
  }
  cut(g,value,time=.4){g.gain.setTargetAtTime(Math.max(0,value),this.context.currentTime,time);}
  noiseHit(hz,len,vol,out=null,type='bandpass'){
    const c=this.context;if(!c||c.state!=='running')return;const now=c.currentTime;const src=c.createBufferSource();src.buffer=this.noise;src.playbackRate.value=between(this.r,.71,1.34);
    const f=c.createBiquadFilter();f.type=type;f.frequency.value=hz;f.Q.value=.75;const g=c.createGain();g.gain.setValueAtTime(.00003,now);g.gain.exponentialRampToValueAtTime(vol,now+.016);g.gain.exponentialRampToValueAtTime(.00005,now+len);
    src.connect(f).connect(g).connect(out||this.main);if(this.inTunnel)g.connect(this.reverb);src.start(now,this.r()*2.3);src.stop(now+len+.08);src.onended=()=>{src.disconnect();f.disconnect();g.disconnect();};
  }
  step(material,fast=false,shake=false){const v=shake?.092:fast?.060:.046;const b={powder:[440,.21],snow:[630,.165],gravel:[762,.175],wood:[233,.14],stone:[805,.10],brick:[692,.11],ice:[1490,.24]}[material]||[523,.17];this.noiseHit(b[0]*between(this.r,.77,1.32),b[1],v);if(!shake&&['wood','stone','brick'].includes(material))this._tone(material==='wood'?37:46,.04,this.context.currentTime,.010,.05,'soft',this.main);}
  chime(type='soft'){
    const c=this.context;if(!c)return;const t=c.currentTime+.021;
    if(type==='door'||type==='knock'){this.noiseHit(type==='door'?163:282,type==='door'?.23:.14,.066);if(type==='knock')this._tone(46,.055,t+.09,.030,.03,'soft',this.main);return;}
    if(type==='water'||type==='cup'){this.noiseHit(type==='water'?843:576,.33,.053);this._tone(71,.13,t,.041,.03,'soft',this.main);return;}
    const ids=type==='bell'?[54,61,66,73]:type==='ceremony'?[64,67,71,76]:[72,79];
    for(let i=0;i<ids.length;i++)this._tone(ids[i],type==='bell'?3.1:.86,t+i*(type==='bell'?.42:.106),type==='bell'?.046:.036,.05,'chime',this.main);
  }
  scheduledSound(key){
    const c=this.context,out=this.cuePoints?.[key];if(!out||c?.state!=='running')return;
    const t=c.currentTime+.042;
    if(key==='bell'){for(const [i,n] of [54,61,66,73].entries())this._tone(n,3.6,t+i*.49,.053,.05,'chime',out,false);return;}
    const index={show:2,bandstand:7,carol:3,carousel:1}[key],tempo={show:.47,bandstand:.66,carol:.68,carousel:.47}[key];
    let at=t;for(const [i,[note,time]] of tune(index)[1].slice(0,key==='show'?24:18).entries()){
      const gain=key==='show'?.074:key==='carol'?.052:.063;
      this._tone(note+(key==='show'?0:-5),time*tempo,at,gain,.04,key==='carol'?'soft':'bell',out,false);
      if(i%4===0)this._tone(note-12,time*tempo,at+.03,gain*.29,.03,'soft',out,false);
      at+=time*tempo;
    }
  }
  setCues(on){if(this.context&&this.cueBus&&this.cuesOn!==on){this.cuesOn=on;this.cut(this.cueBus,+on,.066);}}
  melody(where='carousel',jump=false){const d=this.tracks.find(x=>x.type===where);if(d&&this.context){if(jump)d.j=0;d.next=this.context.currentTime+.058;}}
  toggleCabin(room){
    if(!this.context)return;const c=this.context;
    if(this.record){this.record=null;}
    if(room?.recordOn)this.record={idx:room.id==='ranger'?1:room.id==='toys'?4:0,j:0,next:c.currentTime+.09,scale:.77,type:'record',volume:.064,out:this.mus,room:room.id};
  }
  stepTrack(c,b){
    if(b.next>c.currentTime+.22)return;
    const score=tune(b.idx)[1],record=b.type==='record';
    if(b.j===score.length){b.j=0;if(b.type==='global')b.idx=(b.idx+1)%scores.length;b.next=c.currentTime+(b.type==='global'?12:3.8);return;}
    const beat=score[b.j++],t=Math.max(c.currentTime+.031,b.next),sound=record||b.type==='global'?'soft':'bell';const semitones=record?-7:b.type==='global'?-12:0;
    const note=beat[0]+semitones;const gain=b.volume*between(this.r,.8,1.03);this._tone(note,beat[1]*b.scale,t,gain,.05,sound,b.out);
    if((b.j%4===1||beat[1]>1.7)&&b.type!=='market'){this._tone(note-12,beat[1]*b.scale,t+.04,gain*.33,.03,'soft',b.out);}
    b.next=t+beat[1]*b.scale;
  }
  update(ctx){
    const c=this.context;if(!c||c.state!=='running')return;const {cam,settings:s,env}=ctx;this.setCues(s.events);const cp=cam.camera.position,room=cam.room();const t=c.currentTime;
    if(t-this.lastBeat<.135)return;this.lastBeat=t;
    this.inTunnel=Math.abs(cp.x-43)<5.9&&Math.abs(cp.z-75.5)<2.55&&cp.y<4;
    const cdir=cam.camera.getWorldDirection(this._direction??(this._direction=cp.clone()));const L=c.listener;
    if(L.positionX){L.positionX.setTargetAtTime(cp.x,t,.08);L.positionY.setTargetAtTime(cp.y,t,.08);L.positionZ.setTargetAtTime(cp.z,t,.08);L.forwardX.setTargetAtTime(cdir.x,t,.09);L.forwardY.setTargetAtTime(cdir.y,t,.09);L.forwardZ.setTargetAtTime(cdir.z,t,.09);}
    else {L.setPosition(cp.x,cp.y,cp.z); L.setOrientation(cdir.x,cdir.y,cdir.z,0,1,0);}
    const preset=room?'hearth':cam.seat?.preset||'park',rp=presets[preset]??presets.park;
    const [city,wind,music,water,wet]=rp;this.mix={preset,city,wind,music,water,wet};const cityDist=1-Math.min(1,Math.max(Math.abs(cp.x),Math.abs(cp.z))/244);
    this.cut(this.master,s.muted?0:.65,.18);this.cut(this.main,s.ambience,.24);this.cut(this.mus,s.music*music,.32);
    this.cut(this.wind.g,wind*(.065+env.wind*.135+env.snow*.035),.8);this.wind.filter.frequency.setTargetAtTime((245+env.wind*540)*(room?.41:1),t,.74);
    this.cut(this.city.g,s.city*(.05+(1-cityDist)*.35)*city,.9);
    this.cut(this.mini.g,room&&room.fireOn?.058:0,.25);this.cut(this.shore.g,water*(.022+Math.sin(t*.42)*.008),.57);this.wet.gain.setTargetAtTime(this.inTunnel?.49:wet,t,.28);
    for(const [id,{s:n,n:nu,loc}] of this.local){
      const d=Math.hypot(cp.x-loc[0],cp.y-loc[1],cp.z-loc[2]);const k=room?.12:1;
      this.cut(nu.g,d<72?k*(id==='market'?(s.solitude?0:.061):id==='pond'?.18:id==='ice'?.054:.118):0,.44);
      if(d<23&&!room&&!(s.solitude&&id==='market')&&this.r()<.15)this.noiseHit(id==='fire'?1280:610,between(this.r,.10,.23),.060,n);
    }
    if(room&&room.fireOn&&this.r()<.49)this.noiseHit(between(this.r,730,1630),between(this.r,.10,.22),between(this.r,.032,.081));
    if(room&&Math.floor(t*1.02)!==this.prevTick){this.prevTick=Math.floor(t*1.02);this._tone(48,.05,t+.008,.009,.05,'chime',this.main);}
    if(room?.id!==this.room){this.room=room?.id;this.toggleCabin(room);}
    for(const p of this.tracks){
      if((p.position&&(!room&&Math.hypot(p.position[0]-cp.x,p.position[2]-cp.z)<56))||(!p.position&&!room)){this.stepTrack(c,p);}else p.next=t+.3;
    }
    if(this.record&&room?.id===this.record.room)this.stepTrack(c,this.record);
  }
}
export const tracks=scores.map(x=>x[0]);
