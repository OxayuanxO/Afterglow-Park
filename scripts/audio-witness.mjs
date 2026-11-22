// Native Web Audio signal probe. Observe the real post-limiter signal without
// changing the app source, and keep auditory judgement separate from RMS.
import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import {browserPage,boot} from './browser.mjs';
const p=await browserPage({width:400,height:250});
const rec={stamp:new Date().toISOString(),errors:p.errors,mode:'Post-compressor AudioContext time-domain tap, no speaker/headphone evaluation'};
try{
  await p.page.addInitScript(()=>{
    const native=AudioNode.prototype.connect;
    AudioNode.prototype.connect=function(target,...args){
      const out=Reflect.apply(native,this,[target,...args]);
      if(!window.wwQAudio && target===this.context.destination && this instanceof DynamicsCompressorNode){
        const ac=this.context,an=ac.createAnalyser(),silence=ac.createGain();
        an.fftSize=4096;silence.gain.value=0;
        Reflect.apply(native,this,[an]);Reflect.apply(native,an,[silence]);Reflect.apply(native,silence,[target]);
        window.wwQAudio={ac,an};
      }
      return out;
    };
  });
  rec.backend=await boot(p,{quality:'low'});rec.build=await p.page.locator('script[type=module][src]').first().getAttribute('src');
  await p.page.locator('#enter').click({timeout:45000});
  await p.page.waitForFunction(()=>window.wwQAudio?.ac.state==='running',null,{timeout:22000,polling:110});
  const fixture=async({mute,music,wait})=>await p.page.evaluate(async a=>{
    const {ac,an}=wwQAudio,b=new Float32Array(an.fftSize),r=[];parkQA.setting('muted',a.mute);parkQA.setting('music',a.music);
    const t0=ac.currentTime,start=performance.now();
    while(performance.now()-start<a.wait+1250){
      parkQA.updateAudio();
      if(performance.now()-start>=a.wait){
        an.getFloatTimeDomainData(b);let squares=0,peak=0;
        for(const x of b){squares+=x*x;peak=Math.max(peak,Math.abs(x));}
        r.push({rms:Math.sqrt(squares/b.length),peak});
      }
      await new Promise(r=>setTimeout(r,120));
    }
    return {rms:r.reduce((s,x)=>s+x.rms,0)/r.length,peak:Math.max(...r.map(x=>x.peak)),samples:r.length,inputClock:ac.currentTime-t0,mix:parkQA.state().mix,notesPlayed:parkQA.state().notesPlayed};
  },{mute,music,wait});
  rec.active=await fixture({mute:false,music:0,wait:950});
  rec.muted=await fixture({mute:true,music:0,wait:1600});
  rec.restored=await fixture({mute:false,music:.32,wait:1000});
  assert.ok(rec.active.rms>0.0004&&rec.active.peak<.89,'No usable ambience or clipping');
  assert.ok(rec.muted.rms<rec.active.rms*.09,'Master mute did not lower the output');
  assert.ok(rec.restored.rms>0.0004&&rec.restored.peak<.89,'Master volume did not recover');
  assert.ok(rec.restored.notesPlayed>0,'Public-domain music did not start scheduling');
  assert.deepEqual(p.errors,[]);rec.ok=true;
}catch(e){rec.ok=false;rec.failure=String(e);process.exitCode=1;}
finally{await mkdir('docs/evidence',{recursive:true});await writeFile('docs/evidence/audio-witness-webgl.json',JSON.stringify(rec,null,2));await p.browser.close();console.log(JSON.stringify(rec));}
