import {createHash} from 'node:crypto';
import {writeFile,mkdir} from 'node:fs/promises';
import {browserPage,boot,capture} from './browser.mjs';
const p=await browserPage({width:+(process.env.W||960),height:+(process.env.H||600)});
const {page,browser}=p;
const rows=[];let build=null,adapter=null,failure=null,presentation=null,pipeline=null;const tiers=(process.env.TIERS||'low,medium,high,ultra').split(',');
const selected=process.env.SHOTS?.split(',');const mode=process.env.CAPTURE_UI==='1';
const pathFor=(tier,id)=>`${process.env.SHOT_DIR||'screenshots'}/${p.backend==='gpu'?'webgpu':'webgl2'}/${tier}/${id}.png`;
const shoot=async(tier,shot,opts={})=>{
  const dest=opts.file??pathFor(tier,shot.id);await mkdir(dest.slice(0,dest.lastIndexOf('/')),{recursive:true});
  const rec=await page.evaluate(async a=>{
    const q=parkQA;
    let v;
    if(a.visible){
      if(!q.goto(a.id))throw Error('Visible matrix needs an existing camera: '+a.id);
      q.tier(a.tier);q.setting('time',a.time);if(a.tone)q.tone(a.tone);
      q.render(a.phase);await q.synchronize();
      v={data:document.querySelector('#park-canvas').toDataURL(a.mime??'image/png'),stats:q.stats()};
    }else v=await q.capture(a);
    const bmp=await createImageBitmap(await (await fetch(v.data)).blob());
    const ctx=new OffscreenCanvas(40,25).getContext('2d',{willReadFrequently:true});ctx.drawImage(bmp,0,0,40,25);bmp.close();
    const px=ctx.getImageData(0,0,40,25).data;let opaque=0,min=255,max=0,s=0,warm=0,cool=0,lim=0,clipped=0;
    for(let i=0;i<px.length;i+=4){if(px[i+3]<240)continue;opaque++;const l=.213*px[i]+.715*px[i+1]+.072*px[i+2];min=Math.min(min,l);max=Math.max(max,l);s+=l;clipped+=+(Math.min(px[i],px[i+1],px[i+2])>246);if(l>=122){lim++;warm+=+(px[i]-px[i+2]>10);cool+=+(px[i+2]-px[i]>13);}}
    return {...v,pixels:{opaque,range:+(max-min).toFixed(1),mean:+(s/Math.max(1,opaque)).toFixed(1),highlightSamples:lim,warmSamples:warm,coolSamples:cool,nearWhite:clipped}};
  },{id:shot.id,tier,time:shot.time||'night',tone:opts.tone,phase:opts.phase??12.8,mime:opts.mime,visible:presentation==='gpu-readback-2d'&&shot.id!=='opening'});
  if(rec.pixels.opaque<950||rec.pixels.range<15)throw Error(`Blank/transparent capture ${tier}/${shot.id} ${JSON.stringify(rec.pixels)}`);
  if(rec.data.length<3000||rec.data.length>100_000_000)throw Error('Invalid image payload '+rec.data.length);
  const png=Buffer.from(rec.data.split(',')[1],'base64');await writeFile(dest,png);
  rows.push({sha256:createHash('sha256').update(png).digest('hex'),file:dest,shot:shot.id,tier,source:presentation==='gpu-readback-2d'&&shot.id!=='opening'?'presented-canvas':'export-target',stamp:new Date().toISOString(),pixels:rec.pixels,...rec.stats});console.log(p.backend,tier,shot.id,rec.stats.calls,rec.stats.triangles);
};
try{
  const g=await boot(p,{world:1,present:process.env.PRESENT});console.log('Renderer:',g);build=await page.locator('script[type="module"][src]').first().getAttribute('src');
  ({adapter,presentation,pipeline}=await page.evaluate(()=>({adapter:parkQA.adapter,presentation:parkQA.presentation,pipeline:parkQA.pipelineFacts()})));
  if(!pipeline.halfFloatScene||pipeline.outputColorSpace!=='srgb')throw Error('Expected linear HalfFloat scene and sRGB output: '+JSON.stringify(pipeline));
  const layout=await page.evaluate(()=>parkQA.layout),list=layout.shots.filter(x=>!selected||selected.includes(x.id));
  for(const tier of tiers)for(const shot of list){await shoot(tier,shot);}
  if(process.env.TONES!=='0'){
    const shot=layout.shots.find(x=>x.id==='tree');for(const tone of ['agx','aces'])await shoot('medium',shot,{tone,file:`screenshots/tone-${p.backend}-${tone}.png`});
    if(rows.at(-1).sha256===rows.at(-2).sha256)throw Error('Tone mapping switch did not change pixels');
  }
  if(process.env.PREVIEWS==='1'){
    for(const id of (process.env.PREVIEW_IDS?.split(',')??[...layout.gallery,'opening'])){const shot=(id==='opening'?{id,time:'night'}:layout.shots.find(x=>x.id===id));await shoot('medium',shot,{file:`public/previews/${id}.webp`,mime:'image/webp',tone:'agx'});}
  }
  if(mode){await page.evaluate(()=>delete document.body.dataset.clean);await page.evaluate(()=>parkQA.render());await capture(page,'screenshots/entry-ui.png');}
}catch(e){failure=String(e);throw e;}finally{
  await mkdir('docs/evidence',{recursive:true});await writeFile(`docs/evidence/shots-${p.backend}${process.env.RUN_ID?'-'+process.env.RUN_ID:''}.json`,JSON.stringify({build,adapter,presentation,pipeline,failure,profile:process.env.GPU_PROFILE??(process.env.HARDWARE==='1'?'native-request':'default-software'),rows,errors:p.errors,warnings:[...new Set(p.warnings)]},null,2));await browser.close();
  if(p.errors.length)process.exitCode=1;
}
