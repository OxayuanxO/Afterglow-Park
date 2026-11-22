import * as T from 'three/webgpu';
import {Rhythm} from './rhythm.js';
import {G,part} from './mesh.js';
export class ParkEvents{
  constructor(ctx){this.ctx=ctx;this.rhythm=new Rhythm(ctx.world.layout.seed+1226,new Date().getHours());this.firPlayed=false;this.snowWas=null;this.balloon=this.makeLantern();this.active={};}
  get clock(){return this.rhythm.clock;}
  state(){return {lantern:this.balloon.visible,active:{...this.active},nextQuiet:this.rhythm.nextQuiet,last:this.rhythm.last};}
  fir(show=false){const {world,audio,discovery}=this.ctx;world.fir.event(show,this.ctx.worldNow());if(!show)audio.chime('ceremony');else audio.scheduledSound('show');if(show)discovery.add('show-'+Math.floor(this.clock/900),'廣場的燈光','香檳金從雪邊一路亮到樹梢。','今晚');}
  eve(){this.ctx.settings.time='night';this.ctx.audio.chime('bell');this.lantern();this.ctx.discovery.add('eve','平安夜','這座公園還留著一盞特別的燈。','今晚');}
  clearSnow(){if(!this.snowWas)this.snowWas=this.ctx.settings.snow;this.snowUntil=this.clock+12;this.ctx.settings.snow='none';}
  makeLantern(){
    const {world}=this.ctx,g=new T.Group();
    part(g,G.ball,world.mat.dim,0,0,0,.36,.52,.34);part(g,G.bulb,world.mat.candle,0,-.21,0,.11,.16,.11);
    g.position.set(-146,14,-132);g.visible=false;world.scene.add(g);world.decor.motion(53,g,0,.92);return g;
  }
  lantern(scheduled=false){
    this.balloon.position.set(-146,14,-132);this.balloon.visible=true;this.lanternStart=this.clock;this.scheduledLantern=scheduled;
  }
  interlude(key){
    const {world,audio,discovery}=this.ctx;
    const lines={lantern:['觀景台上浮起了燈','一盞燈向雪夜深處走去。',52],pond:['浮燈繞過薄冰','燭光沿水面漂了一小段路。',38],carousel:['木馬慢慢轉過一圈','鏡面收起了一整圈樹燈。',56],bandstand:['音樂亭的旋律','有一小段曲子從林子那頭傳來。',28],carol:['窗後傳來一段聖歌','遠遠地，像有人把旋律唱給雪聽。',23],bells:['夜裡的遠鐘','風把最後一聲留下。',6]};
    const [name,line,len]=lines[key];this.active[key]=this.clock+len;
    if(key==='lantern')this.lantern(true);
    else if(key==='pond')world.landmarks.pondCue={at:this.clock,len};
    else if(key==='carousel'){world.landmarks.carousel.cue={at:this.clock,len};audio.scheduledSound('carousel');}
    else if(key==='bandstand')audio.scheduledSound('bandstand');
    else if(key==='carol')audio.scheduledSound('carol');
    else audio.scheduledSound('bell');
    discovery.add('quiet-'+Math.floor(this.clock/60),name,line,'今晚');
  }
  update(dt,hour=new Date().getHours()){
    const {settings:s,cam,world,audio,discovery}=this.ctx;
    const cue=this.rhythm.advance(dt,hour,s.events&&cam.mode!=='lobby');
    world.rhythmClock=this.clock;
    if(this.snowWas&&this.clock>this.snowUntil){s.snow=this.snowWas;this.snowWas=null;}
    if(this.balloon.visible){const t=this.clock-this.lanternStart;this.balloon.position.set(-146+t*.21,14+t*.60,-132-t*.41);this.balloon.rotation.z=Math.sin(t*.62)*.10;this.balloon.visible=t<52;}
    for(const key of Object.keys(this.active))if(this.active[key]<=this.clock)delete this.active[key];
    if(!s.events){
      if(world.fir.showState(this.ctx.worldNow()).duration===60)world.fir.cancel();
      if(this.scheduledLantern)this.balloon.visible=false;
      world.landmarks.pondCue=null;const ride=world.landmarks.carousel;if(ride.cue){ride.offset=(ride.offset??0)+(ride.cue.offset??0);ride.cue=null;}this.active={};return;
    }
    if(cue.show){this.firPlayed=true;this.fir(true);}
    if(!this.firPlayed&&cam.mode==='walk'&&Math.hypot(cam.feet.x,cam.feet.z)<41){this.firPlayed=true;this.fir();}
    if(cue.bell){
      audio.scheduledSound('bell');const c=world.cabins.find(a=>a.id==='santa');if(c)c.calendar=(c.calendar+1)%25;
      discovery.add('hour-'+hour,'鐘樓報時','鐘聲在樹林裡慢慢消失。','今晚');
    }
    if(cue.interlude)this.interlude(cue.interlude);
  }
}
