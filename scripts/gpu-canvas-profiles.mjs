// Small adapter/attachment/presentation test. Success requires screenshot pixels,
// not merely a submitted command buffer or a resolved onSubmittedWorkDone().
import {chromium} from 'playwright';
import {writeFile,mkdir} from 'node:fs/promises';
const sdr=['--enable-unsafe-webgpu','--ignore-gpu-blocklist'];
const swift=['--use-angle=swiftshader','--enable-unsafe-swiftshader'];
const vk=['--enable-features=Vulkan'];
const profiles={
  'dawn-sw':[...sdr,...swift,'--use-webgpu-adapter=swiftshader'],
  'vulkan-sw':[...sdr,...vk,'--use-angle=vulkan','--disable-vulkan-surface'],
  'hybrid-sw':[...sdr,...vk,...swift],
  'vulkan-surface':[...sdr,...vk,'--use-angle=vulkan'],
  'default-sw':[...sdr,...swift],
};
const entries=Object.entries(profiles).filter(([id])=>!process.env.PROFILES||process.env.PROFILES.split(',').includes(id));
const results=[],out='/tmp/ww-r10/gpu-canvas';await mkdir(out,{recursive:true});
for(const [id,args] of entries){
  let b;
  const r={id,args,errors:[],warnings:[]};
  try{
    b=await chromium.launch({headless:process.env.HEADFUL!=='1',args:['--disable-dev-shm-usage',...args]});
    const page=await b.newPage({viewport:{width:192,height:120}});page.setDefaultTimeout(20000);
    page.on('pageerror',e=>r.errors.push(e.message));page.on('console',v=>{if(v.type()==='error')r.errors.push(v.text());if(v.type()==='warning')r.warnings.push(v.text());});
    const url=new URL('display-probe.html',process.env.PARK_URL||'http://localhost:5173').href;
    await page.route(url,x=>x.fulfill({contentType:'text/html',body:'<!DOCTYPE html><body style="margin:0;background:#17140b"><canvas width="192" height="120"></canvas>'}));await page.goto(url);
    r.gpu=await page.evaluate(async()=>{
      const adapter=await navigator.gpu.requestAdapter({featureLevel:'compatibility'});if(!adapter)throw Error('No adapter');
      const info={vendor:adapter.info.vendor,architecture:adapter.info.architecture, fallback:adapter.info.isFallbackAdapter};
      const device=await adapter.requestDevice(),format=navigator.gpu.getPreferredCanvasFormat(),context=document.querySelector('canvas').getContext('webgpu');
      context.configure({device,format,alphaMode:'opaque'});
      const s=`@vertex fn vs(@builtin(vertex_index)i:u32)->@builtin(position)vec4f{let a=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));return vec4f(a[i],0,1);}`;
      const hdr=device.createTexture({size:[192,120],format:'rgba16float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING});
      const multi=device.createTexture({size:[192,120],format:'rgba16float',sampleCount:4,usage:GPUTextureUsage.RENDER_ATTACHMENT});
      const make=async(code,fmt,count)=>{const module=device.createShaderModule({code:s+code});return device.createRenderPipelineAsync({layout:'auto',vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format:fmt}]},multisample:{count}});};
      const hi=await make('@fragment fn fs(@builtin(position)p:vec4f)->@location(0)vec4f{return vec4f(p.x/72.0,0.56,p.y/285.0,1);}', 'rgba16float',4);
      const lo=await make('@group(0) @binding(0) var img:texture_2d<f32>; @fragment fn fs(@builtin(position)p:vec4f)->@location(0)vec4f{let q=textureLoad(img,vec2i(p.xy),0);return vec4f(q.rgb/(vec3f(1)+q.rgb),1);}',format,1);
      const group=device.createBindGroup({layout:lo.getBindGroupLayout(0),entries:[{binding:0,resource:hdr.createView()}]});
      const e=device.createCommandEncoder();const a=e.beginRenderPass({colorAttachments:[{view:multi.createView(),resolveTarget:hdr.createView(),loadOp:'clear',storeOp:'store'}]});a.setPipeline(hi);a.draw(3);a.end();
      const p=e.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]});p.setPipeline(lo);p.setBindGroup(0,group);p.draw(3);p.end();
      device.queue.submit([e.finish()]);await Promise.race([device.queue.onSubmittedWorkDone(),new Promise((_,fail)=>setTimeout(()=>fail(Error('queue timeout')),7000))]);
      return {info,format};
    });
    const png=await page.screenshot({path:`${out}/${id}.png`,timeout:18000});
    r.pixels=await page.evaluate(async buf=>{
      const bmp=await createImageBitmap(await (await fetch('data:image/png;base64,'+buf)).blob());const c=new OffscreenCanvas(bmp.width,bmp.height).getContext('2d');c.drawImage(bmp,0,0);bmp.close();
      return [18,96,168].map(x=>Array.from(c.getImageData(x,64,1,1).data));
    },png.toString('base64'));
    r.ok=r.pixels[2][0]-r.pixels[0][0]>70&&r.pixels.every(p=>p[1]>55&&p[3]===255)&&!r.errors.length;
  }catch(e){r.failure=String(e);r.ok=false;}
  finally{await b?.close().catch(()=>{});results.push(r);console.log(JSON.stringify(r));}
}
await writeFile(`docs/evidence/gpu-canvas-profiles${process.env.RUN_ID?'-'+process.env.RUN_ID:''}.json`,JSON.stringify({stamp:new Date().toISOString(),results},null,2));
