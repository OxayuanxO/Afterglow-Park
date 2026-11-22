import * as T from 'three/webgpu';
import {rng,TAU} from '../math.js';

// Original low-contrast jacquard design. Albedo is sRGB; the wool's linear
// normal / roughness maps remain separate and carry the weave under firelight.
export function jacquard(wool){
  const ca=document.createElement('canvas');ca.width=704;ca.height=960;
  const c=ca.getContext('2d'),w=ca.width,h=ca.height;
  const ink='#845238',field='#58302d',linen='#b09261',moss='#80724e',wine='#743c36';
  c.fillStyle=field;c.fillRect(0,0,w,h);
  const rule=(n,col,width)=>{c.strokeStyle=col;c.lineWidth=width;c.strokeRect(n,n,w-2*n,h-2*n);};
  rule(27,'#986f4c',3);rule(38,wine,18);rule(54,linen,4);rule(71,ink,19);rule(87,'#9f7f54',3);rule(99,moss,2);rule(118,wine,3);
  const diamond=(x,y,radius,sides=4,squish=1)=>{c.beginPath();for(let k=0;k<sides;k++){const a=k*TAU/sides;const X=x+Math.sin(a)*radius,Y=y+Math.cos(a)*radius*squish;k?c.lineTo(X,Y):c.moveTo(X,Y);}c.closePath();};
  const medallion=(x,y,r,a=1)=>{
    c.save();c.translate(x,y);c.scale(1,a);
    c.fillStyle='#652e32';c.strokeStyle='#947050';c.lineWidth=3;
    c.beginPath();for(let k=0;k<32;k++){const ang=k*TAU/32,L=r*(k%4===0?1:k%2?.67:.79);const X=Math.sin(ang)*L,Y=Math.cos(ang)*L;k?c.lineTo(X,Y):c.moveTo(X,Y);}c.closePath();c.fill();c.stroke();
    c.strokeStyle='#ac8057';c.lineWidth=2;diamond(0,0,r*.67,8);c.stroke();
    for(let k=0;k<8;k++){c.save();c.rotate(k*TAU/8);c.fillStyle=k%2?moss:'#b69c70';diamond(0,r*.36,r*.23,4,1.7);c.fill();c.restore();}
    c.fillStyle='#ad8260';diamond(0,0,r*.22,8);c.fill();c.restore();
  };
  medallion(w/2,h/2,205,1.32);
  for(const x of [144,w-144])for(const y of [157,h-157])medallion(x,y,44,.96);
  c.lineWidth=1.1;c.strokeStyle='#9c7354';
  for(let i=0;i<17;i++){const y=97+i*47.8;for(const x of [71,w-71]){diamond(x,y,6,4,1.55);c.stroke();}}
  for(let i=0;i<13;i++){const x=81+i*45.2;for(const y of [71,h-71]){diamond(x,y,8,4,.60);c.stroke();}}
  const pic=c.getImageData(0,0,w,h),r=rng(101995);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const k=(y*w+x)*4,nap=(r()-.5)*16+Math.sin(x*.35+y*.16)*3+(x%3===0?2.7:-1.3)+(y%4===0?2:-1.8);
    for(let i=0;i<3;i++)pic.data[k+i]+=nap;
  }
  c.putImageData(pic,0,0);const tex=new T.CanvasTexture(ca);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=8;tex.name='Hearth rug • wreath and lozenge jacquard';
  const out=wool.clone();out.map=tex;out.color.set('#fff3e5');out.name='Handwoven cranberry carpet';return out;
}
