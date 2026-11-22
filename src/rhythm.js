import {between,rng} from './math.js';

export const INTERLUDE_IDS=['lantern','pond','carousel','bandstand','carol','bells'];

// Shuffle a complete set before drawing a second copy of any cue. A visitor
// can stop anywhere: no UI, countdown or completion state is derived from it.
export class Rhythm {
  constructor(seed,hour){this.r=rng(seed);this.hour=hour;this.clock=0;this.nextShow=900;this.nextQuiet=between(this.r,600,1200);this.bag=[];this.last=null;}
  nextInterlude(){
    if(!this.bag.length){
      this.bag=[...INTERLUDE_IDS];
      for(let i=this.bag.length-1;i>0;i--){const j=Math.floor(this.r()*(i+1));[this.bag[i],this.bag[j]]=[this.bag[j],this.bag[i]];}
      if(this.bag.at(-1)===this.last)[this.bag[0],this.bag[this.bag.length-1]]=[this.bag.at(-1),this.bag[0]];
    }
    this.last=this.bag.pop();return this.last;
  }
  advance(dt,hour,enabled){
    this.clock+=dt;
    let show=null,interlude=null,bell=false;
    if(hour!==this.hour){this.hour=hour;bell=enabled;}
    if(this.clock>=this.nextShow){
      const index=Math.floor((this.clock+1e-9)/900);this.nextShow=(index+1)*900;
      if(enabled)show=index;
    }
    if(this.clock>=this.nextQuiet){
      this.nextQuiet=this.clock+between(this.r,600,1200);
      const key=this.nextInterlude();if(enabled)interlude=key;
    }
    return {show,interlude,bell};
  }
}
