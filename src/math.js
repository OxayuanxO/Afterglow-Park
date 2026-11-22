export const TAU=Math.PI*2;
export const clamp=(x,l,h)=>Math.max(l,Math.min(x,h));
export const lerp=(a,b,t)=>a+(b-a)*t;
export const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
export const damp=(a,b,w,dt)=>lerp(a,b,1-Math.exp(-w*dt));
export function rng(seed){let a=seed|0;return()=>{a=(a+0x6D2B79F5)|0;let t=Math.imul(a^a>>>15,1|a);t^=t+Math.imul(t^t>>>7,61|t);return ((t^t>>>14)>>>0)/4294967296;};}
export const between=(r,a,b)=>lerp(a,b,r());
export const pick=(r,arr)=>arr[Math.floor(r()*arr.length)];
export const hash2=(x,y)=>{let t=Math.imul(x|0,1402946737)^Math.imul(y|0,1597334677);t=Math.imul(t^(t>>>15),0x85ebca6b);return ((t^(t>>>13))>>>0)/4294967295;};
export function noise2(x,y){const i=Math.floor(x),j=Math.floor(y);const u=smooth(0,1,x-i),v=smooth(0,1,y-j);return lerp(lerp(hash2(i,j),hash2(i+1,j),u),lerp(hash2(i,j+1),hash2(i+1,j+1),u),v);}
export function distSegment(x,z,ax,az,bx,bz){const dx=bx-ax,dz=bz-az;const t=clamp(((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz||1),0,1);return Math.hypot(x-ax-t*dx,z-az-t*dz);}
export class Grid {
  constructor(size=12){this.size=size;this.cells=new Map();}
  key(i,j){return i+':'+j;}
  insert(item,x,z,r=0){const s=this.size;for(let j=Math.floor((z-r)/s);j<=Math.floor((z+r)/s);j++)for(let i=Math.floor((x-r)/s);i<=Math.floor((x+r)/s);i++){const k=this.key(i,j);let c=this.cells.get(k);if(!c)this.cells.set(k,c=[]);c.push(item);}return item;}
  at(x,z){return this.cells.get(this.key(Math.floor(x/this.size),Math.floor(z/this.size)))??[];}
  range(x,z,r){const s=this.size;const out=new Set();for(let j=Math.floor((z-r)/s);j<=Math.floor((z+r)/s);j++)for(let i=Math.floor((x-r)/s);i<=Math.floor((x+r)/s);i++){for(const o of this.cells.get(this.key(i,j))??[])out.add(o);}return out;}
}
