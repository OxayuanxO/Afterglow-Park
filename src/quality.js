import {clamp} from './math.js';
export const tiers={
  low:{id:'low',label:'低',scale:.75,lights:3,snow:6100,shadow:1024,shadowSpan:34,lod:.7,bloom:.18},
  medium:{id:'medium',label:'中',scale:1,lights:5,snow:15000,shadow:1536,shadowSpan:43,lod:1,bloom:.24},
  high:{id:'high',label:'高',scale:1.15,lights:6,snow:30000,shadow:2048,shadowSpan:53,lod:1.26,bloom:.27},
  ultra:{id:'ultra',label:'極高',scale:1.35,lights:6,snow:50000,shadow:2048,shadowSpan:57,lod:1.52,bloom:.30}
};
export const defaults={quality:'auto',snow:'flurry',time:'night',wind:.35,city:.18,ambience:.56,music:.25,lights:1,bloom:.86,grain:.30,vignette:.44,fov:56,timeFlow:false,weatherFlow:false,solitude:false,events:true,postBloom:true,postAO:true,postGrain:true,postVignette:true,bob:true,reduced:false,idleTour:false,sensitivity:1,muted:false};
const KEY='winter-wonderland-settings-v1';
export function readSettings(){let data={};try{data=JSON.parse(localStorage.getItem(KEY)||'{}');}catch{}const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;return {...defaults,reduced,...data};}
export function saveSettings(s){try{localStorage.setItem(KEY,JSON.stringify(s));}catch{}}
export class Quality{
  constructor(g,l,settings,query){this.g=g;this.l=l;this.s=settings;this.query=query;this.autoTier=(g.backend==='WebGPU'&&(navigator.hardwareConcurrency||4)>=6)?'medium':'low';this.frameAvg=.032;this.resFactor=1;this.elapsed=0;this.bench=0;this.count=0;this.sizeMult=1;this.set(query.get('quality')||settings.quality);}
  set(id){this.requested=tiers[id]||id==='auto'?id:'auto';this.tier=tiers[this.requested==='auto'?this.autoTier:this.requested];this.apply();}
  apply(){const {g,l,tier}=this;this.scale=tier.scale*this.resFactor;g.resize(this.scale);g.setQuality(tier,this.s.postAO);g.glow.strength.value=tier.bloom*this.s.bloom;
    const sh=l.moon.shadow,sp=tier.shadowSpan;
    if(sh.camera.right!==sp){Object.assign(sh.camera,{left:-sp,right:sp,bottom:-sp,top:sp});sh.camera.updateProjectionMatrix();sh.needsUpdate=true;}
    if(sh.mapSize.x!==tier.shadow){sh.mapSize.setScalar(tier.shadow);sh.map?.dispose();sh.map=null;sh.needsUpdate=true;}}
  update(dt){if(dt<=0||document.hidden)return;this.frameAvg+= (clamp(dt,.001,.3)-this.frameAvg)*.04;this.elapsed+=dt;
    if(this.requested!=='auto'||this.query.has('qa'))return;
    if(this.elapsed>3.5){this.elapsed=0;this.count++;
      if(this.count===1&&this.frameAvg>.05&&this.autoTier!=='low'){this.autoTier='low';this.set('auto');}
      if(this.frameAvg>.041&&this.resFactor>.60){this.resFactor=Math.max(.60,this.resFactor-.065);this.apply();}
      else if(this.frameAvg<.022&&this.resFactor<.99){this.resFactor=Math.min(1,this.resFactor+.045);this.apply();}
    }
  }
  stats(){const r=this.g.renderer.info.render,m=this.g.renderer.info.memory;return {backend:this.g.backend,quality:this.tier.id,scale:+this.scale.toFixed(2),dt:+(this.frameAvg*1000).toFixed(1),calls:r.drawCalls,triangles:r.triangles,geo:m.geometries,textures:m.textures,lightSlots:this.l.slots.length,resolution:[this.g.canvas.width,this.g.canvas.height]};}
}
