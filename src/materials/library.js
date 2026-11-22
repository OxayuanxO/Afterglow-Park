import * as T from 'three/webgpu';
import {finishSurface} from './finish.js';
import {between,noise2,rng,smooth,hash2,clamp} from '../math.js';

function tile(name,base,size=384,span=1){
  const paint=document.createElement('canvas'); paint.width=paint.height=size;
  const c=paint.getContext('2d',{willReadFrequently:true});
  const hm=new Float32Array(size*size),rough=new Float32Array(hm.length),ao=new Float32Array(hm.length);
  const col=c.createImageData(size,size);
  const rand=rng(name.split('').reduce((v,e)=>v*7+e.charCodeAt(0),99));
  const course=name==='stone'?8:name==='brick'?13:name==='shingle'?8:7;
  const columns=name==='brick'?5:name==='shingle'?7:8;
  const shifts=Array.from({length:course},(_,i)=>(i%2)*.5+between(rand,-.14,.14));
  const scale=name==='brick'?4:name==='stone'?3:1;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=y*size+x;const u=x/size,v=y/size;
    const coarse=noise2(u*16,v*16),fine=noise2(u*139,v*139),pix=rand()-.5;
    let value=0,h=0,r=.70,a=1,mixGrey=0;
    if(['stone','brick','shingle','sett','tile'].includes(name)){
      const vv=v*course;const row=Math.floor(vv);const uu=u*columns+shifts[row];const ux=uu-Math.floor(uu),vy=vv-row, cell=hash2(Math.floor(uu+columns)%columns,row);
      const edge=Math.min(ux,1-ux,vy,1-vy)+(fine-.5)*.06+(coarse-.5)*.10;
      const top=smooth(name==='brick'?.048:.019,name==='brick'?.103:.089,edge);
      h=top*(.62+(cell-.5)*.22)+(fine-.5)*.074+(coarse-.5)*.10+pix*.022;
      value=(cell-.5)*40+(coarse-.5)*27+(fine-.5)*22+pix*9+top*3;
      if(name==='shingle'){h+=(1-vy)*.32;value+= Math.sin(ux*44+coarse*5)*4+(1-vy)*9;}
      mixGrey=(1-top)*.75;r=(name==='stone'||name==='sett')?.28+.44*coarse+(1-top)*.23:.73+(1-top)*.11-smallOil(coarse);
      a=.60+.40*top;value+= name==='brick'? -6*smooth(.55,.78,coarse):0;
    }else if(name==='wood'||name==='bark'||name==='plank'){
      const boards=u*(name==='plank'?6:3), bx=boards%1, id=Math.floor(boards);
      const ridge=Math.sin(u*550+noise2(u*6,v*3)*7+.7*Math.sin(v*15+id))*.35 + Math.sin(u*1360+coarse*.6)*.16;
      const fibre=noise2(u*122,v*3.4),rings=noise2(u*34,v*1.7);
      const gap=name==='plank'?smooth(.012,.030,Math.min(bx,1-bx)):1;
      value=(rings-.5)*41+(fibre-.5)*29+ridge*21+(hash2(id,18)-.5)*23-(1-gap)*42+pix*7;
      h=(fibre-.5)*.39+ridge*.18+gap*.24+(fine-.5)*.066;r=.52-.17*rings+.19*fibre+.19*(1-gap);a=.75+.25*gap;
    }else if(name==='snow'||name==='powder'||name==='ice'){
      const hills=noise2(u*6,v*6);const rime=smooth(.84,.98,fine);
      const ice=name==='ice';const streak=ice?Math.max(0,Math.sin(u*88+v*91+Math.sin(v*2.9)*3)-.976)*19:0;
      h=.50*hills+.19*coarse+.059*fine+pix*.04+streak*.025;
      value=(hills-.5)*(ice?33:13)+(coarse-.5)*13+pix*10+rime*13+18*streak;
      r=ice?.21+.36*hills+.16*streak:.60+.21*coarse-.23*rime; a=.98;
    }else if(name==='biscuit'){
      const wells=smooth(.56,.82,noise2(u*115,v*117)),blister=noise2(u*24,v*28);
      value=(coarse-.5)*32+(fine-.5)*24-31*wells+pix*10;
      h=.46*blister+.18*fine-.44*wells;r=.79+.15*coarse;a=1-.16*wells;
    }else if(name==='fabric'){
      const weave=Math.cos(u*size*Math.PI*.92)*Math.cos(v*size*Math.PI*.92);
      value=(fine-.5)*19+7*weave+pix*5;h=.1*weave+.07*fine;r=.95;
    }else{
      value=(coarse-.5)*25+(fine-.5)*18+pix*7;h=.35*coarse+.15*fine;r=.69+.17*fine;
    }
    hm[i]=h*scale;rough[i]=clamp(r,0,1);ao[i]=a;
    const mortar=name==='brick'?138:name==='shingle'?46:name==='stone'||name==='sett'?51:66;
    for(let ch=0;ch<3;ch++)col.data[i*4+ch]=clamp((base[ch]+value)*(1-mixGrey)+(mortar+(fine-.5)*19+pix*7)*mixGrey,0,255);
    col.data[i*4+3]=255;
  }
  c.putImageData(col,0,0);
  function tex(canvas,color=false){const t=new T.CanvasTexture(canvas);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=8;t.repeat.set(span,span);t.colorSpace=color?T.SRGBColorSpace:T.NoColorSpace;t.name=name+(color?' albedo':' data');return t;}
  const data=document.createElement('canvas'),normal=document.createElement('canvas');data.width=data.height=normal.width=normal.height=size;
  const dc=data.getContext('2d'),nc=normal.getContext('2d'),d=dc.createImageData(size,size),n=nc.createImageData(size,size);
  const idx=(x,y)=>((y+size)%size)*size+(x+size)%size;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const k=y*size+x,i=k*4;const nx=(hm[idx(x-1,y)]-hm[idx(x+1,y)])*.70,ny=(hm[idx(x,y+1)]-hm[idx(x,y-1)])*.70;
    const il=1/Math.hypot(nx,ny,1);n.data[i]=128+nx*il*127;n.data[i+1]=128+ny*il*127;n.data[i+2]=128+il*127;n.data[i+3]=255;
    d.data[i]=255*ao[k];d.data[i+1]=255*rough[k];d.data[i+2]=0;d.data[i+3]=255;
  }
  dc.putImageData(d,0,0);nc.putImageData(n,0,0);const linear=tex(data);
  return {map:tex(paint,true),normalMap:tex(normal),roughnessMap:linear,aoMap:linear};
}
const smallOil=x=>smooth(.50,.8,x)*.12;
export function createMaterials(){
  const pbr=(name,rgb,color='#ffffff',options={},size=384)=>new T.MeshStandardNodeMaterial({name,color,roughness:1,aoMapIntensity:.62,...tile(name,rgb,size),...options});
  const flat=(name,color,roughness=.72,metalness=0)=>finishSurface(new T.MeshStandardNodeMaterial({name,color,roughness,metalness,userData:{staticBatch:'paint'}}),undefined,name.includes('Needled')?.61:1);
  const plain=(name,color,intensity=1)=>new T.MeshBasicNodeMaterial({name,color:new T.Color(color).multiplyScalar(intensity),userData:{staticBatch:'lamp'}});
  const gold=finishSurface(new T.MeshPhysicalNodeMaterial({name:'Patinated champagne brass',color:'#c9974c',metalness:.61,roughness:.31,clearcoat:.35,clearcoatRoughness:.3,envMapIntensity:1.2}),undefined,.73);
  const material={
    snow:pbr('snow',[221,218,212],'#f5eee8',{vertexColors:true,normalScale:new T.Vector2(.57,.57)},320),
    powder:pbr('powder',[214,207,198],'#f4eee1',{vertexColors:true},256),
    stone:pbr('stone',[113,104,100],'#f4e7de',{vertexColors:true,normalScale:new T.Vector2(.65,.65)},512),
    sett:pbr('sett',[145,136,125],'#fff1dc',{vertexColors:true},448),
    pavers:pbr('tile',[137,97,81],'#f7e1c5',{vertexColors:true},384),
    limestone:pbr('rough-stone',[174,158,144],'#e5d8c4',{},256),
    roof:pbr('shingle',[102,61,56],'#e8cbbe',{},384),
    brick:pbr('brick',[138,73,58],'#e7d2c6',{},512),
    wood:pbr('wood',[117,78,47],'#dfbca1',{},384),
    plaster:pbr('plaster',[200,174,138],'#f5e5ce',{},224),
    plank:pbr('plank',[130,94,57],'#efd7b9',{},384),
    biscuit:pbr('biscuit',[175,103,56],'#f7ded2',{},192),
    bark:pbr('bark',[107,81,62],'#e2ceba',{vertexColors:true},256),
    wool:pbr('fabric',[156,79,72],'#ded1c6',{side:T.DoubleSide},256),
    velvet:pbr('fabric',[99,104,77],'#f4e0c7',{},192), blanket:pbr('fabric',[181,159,117],'#f7e7c8',{side:T.DoubleSide},256),
    iron:flat('Forged iron','#302e2b',.48,.46), gold:gold, bronze:flat('Aged bronze','#754c33',.38,.57), ivory:flat('Painted ivory','#e2d0ad',.58),
    green:flat('Historic spruce paint','#334637',.61), red:flat('Heritage burgundy','#7d333c',.58), wine:flat('Dark wine','#40262b',.62),
    cream:flat('Wool white','#eee2d1',.81), snowProp:pbr('snow',[227,224,215],'#f4efea',{},256), ice:pbr('ice',[166,171,170],'#eedec9',{},384),
    leaf:flat('Needled boughs','#a2a28c',.92), swiss:flat('Moss and needles','#53604a',.92),
    candle:plain('Candle flame','#ffb05d',5.5), filament:plain('Champagne filament','#ffcb83',4.6), amber:plain('Glowing amber','#ff9f4e',3.15), dim:plain('Honey-lit window','#ffb976',1.04),
    fairy:plain('Small satin glass light','#ffd39a',2.24), distant:plain('Distant lights','#ffbd83',.95), coal:flat('Blackened cast iron','#25201c',.88,.18), white:plain('Reflective lettering','#e5cda9',.8)
  };
  material.leaf.vertexColors=true;
  material.ceiling=material.wood.clone();material.ceiling.name='Matt sawn ceiling';material.ceiling.roughnessMap=null;material.ceiling.roughness=.92;
  material.ceiling.normalScale.set(.58,.58);
  const bauble=(id,color)=>finishSurface(new T.MeshPhysicalNodeMaterial({name:id,color,metalness:.64,roughness:.24,clearcoat:.7,clearcoatRoughness:.23,envMapIntensity:1.18}),undefined,.34);
  material.glassRed=bauble('Mulled wine lacquer','#aa3841'); material.glassGold=bauble('Champagne gold lacquer','#dbae53');material.glassSilver=bauble('Mercury glass','#dcd0b6');
  material.iceglass=new T.MeshPhysicalNodeMaterial({name:'Tinted ice sculpture',color:'#cad0bc',roughness:.16,metalness:.26,clearcoat:1,opacity:.68,transparent:true,depthWrite:false});
  material.windowGlass=new T.MeshPhysicalNodeMaterial({name:'House glass',color:'#ead3ae',metalness:.35,roughness:.2,transparent:true,opacity:.12,depthWrite:false,side:T.DoubleSide});
  return material;
}
