import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
const results=[];const base=process.env.PARK_URL||'http://localhost:5173/';
const recipes=[['dawn-sw',['--enable-unsafe-webgpu','--use-webgpu-adapter=swiftshader','--use-angle=swiftshader','--enable-unsafe-swiftshader']],['vulkan-request',['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-angle=vulkan','--disable-vulkan-surface','--ignore-gpu-blocklist']]];
for(const [id,args] of recipes){
  const result={id,errors:[],warnings:[]};let browser;
  try{
    browser=await chromium.launch({headless:process.env.HEADFUL!=='1',args:['--disable-dev-shm-usage',...args]});const page=await browser.newPage({viewport:{width:210,height:140}});
    page.on('pageerror',e=>result.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')result.errors.push(m.text());if(m.type()==='warning')result.warnings.push(m.text());});
    const u=new URL('gpu-present-test.html',base).href;await page.route(u,r=>r.fulfill({body:'<!DOCTYPE html><html><body style="background:#161616"><canvas width="120" height="80"></canvas></body></html>',contentType:'text/html'}));await page.goto(u);
    const ret=await page.evaluate(async()=>{
      const caps={stages:[],errors:[]};
      const fail=(v)=>{caps.errors.push(String(v));return caps;};
      try{
        const adapter=await navigator.gpu.requestAdapter();if(!adapter)return fail('no adapter');caps.info=adapter.info.toJSON?.()??{vendor:adapter.info.vendor,architecture:adapter.info.architecture,fallback:adapter.info.isFallbackAdapter};
        const device=await adapter.requestDevice();device.addEventListener('uncapturederror',e=>caps.errors.push(e.error.message));device.lost.then(x=>caps.errors.push(x.message));
        const c=document.querySelector('canvas'),context=c.getContext('webgpu'),fmt=navigator.gpu.getPreferredCanvasFormat();context.configure({device,format:fmt});caps.stages.push('canvas context');
        const make=(format,samples)=>device.createTexture({size:[120,80],format,sampleCount:samples,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING});
        const hdr=make('rgba16float',4),dep=make('depth24plus',4),res=make('rgba16float',1);
        const shader=device.createShaderModule({code:`@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f{var p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));return vec4f(p[i],0.5,1.);}
         @fragment fn fs()->@location(0) vec4f{return vec4f(2.5,0.7,0.15,1.);}`});
        device.pushErrorScope('validation');const pipeline=await device.createRenderPipelineAsync({layout:'auto',vertex:{module:shader,entryPoint:'vs'},fragment:{module:shader,entryPoint:'fs',targets:[{format:'rgba16float'}]},depthStencil:{format:'depth24plus',depthWriteEnabled:true,depthCompare:'less'},multisample:{count:4}});const validation=await device.popErrorScope();if(validation)return fail(validation.message);caps.stages.push('HDR multisample pipeline');
        const e=device.createCommandEncoder();const ps=e.beginRenderPass({colorAttachments:[{view:hdr.createView(),resolveTarget:res.createView(),loadOp:'clear',storeOp:'store',clearValue:[0,0,0,1]}],depthStencilAttachment:{view:dep.createView(),depthClearValue:1,depthLoadOp:'clear',depthStoreOp:'store'}});ps.setPipeline(pipeline);ps.draw(3);ps.end();
        const display=e.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:[.22,.075,.017,1]}]});display.end();device.queue.submit([e.finish()]);
        await Promise.race([device.queue.onSubmittedWorkDone(),new Promise((_,reject)=>setTimeout(()=>reject(Error('queue timeout')),12000))]);
        await new Promise(requestAnimationFrame);caps.stages.push('queue-completed (compositor pixels not checked)');caps.ok=!caps.errors.length;return caps;
      }catch(e){return fail(e);}
    });Object.assign(result,ret);
  }catch(e){result.failure=String(e);}finally{await browser?.close().catch(()=>{});}
  results.push(result);console.log(JSON.stringify(result));
}
await writeFile(`docs/evidence/gpu-present-probe${process.env.HEADFUL==='1'?'-headful':''}.json`,JSON.stringify({date:new Date().toISOString(),results},null,2));
