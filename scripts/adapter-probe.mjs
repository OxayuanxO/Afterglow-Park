import {chromium} from 'playwright';
import {writeFile,mkdir} from 'node:fs/promises';
const base=process.env.PARK_URL||'http://localhost:5173/';const samples=[];
const recipes=[
  ['platform',[],{}],
  ['software-dawn',['--enable-unsafe-webgpu','--use-webgpu-adapter=swiftshader','--use-angle=swiftshader','--enable-unsafe-swiftshader'],{}],
  ['software-vulkan',['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-angle=vulkan','--disable-vulkan-surface','--ignore-gpu-blocklist'],{VK_ICD_FILENAMES:'/usr/share/vulkan/icd.d/lvp_icd.json'}],
];
for(const [id,flags,env] of recipes){
  const result={id,flags,errors:[],warnings:[]};let browser;
  try{
    browser=await chromium.launch({args:['--disable-dev-shm-usage',...flags],env:{...process.env,...env}});
    const page=await browser.newPage({viewport:{width:160,height:120}});page.on('console',m=>{if(m.type()==='error')result.errors.push(m.text());if(m.type()==='warning')result.warnings.push(m.text());});
    await page.goto(new URL('winter.svg',base).href,{timeout:12500});
    const gpu=await page.evaluate(async()=>{
      const out={secure:isSecureContext,api:!!navigator.gpu,ok:false};if(!navigator.gpu)return out;
      try{
        const a=await navigator.gpu.requestAdapter({powerPreference:'low-power'});if(!a)return out;
        const i=a.info;out.adapter={vendor:i.vendor,architecture:i.architecture,device:i.device,description:i.description,isFallbackAdapter:i.isFallbackAdapter};
        const d=await a.requestDevice();d.lost.then(l=>out.lost={reason:l.reason,message:l.message});
        const buf=d.createBuffer({size:4,usage:GPUBufferUsage.MAP_READ|GPUBufferUsage.COPY_DST});
        const small=d.createBuffer({size:4,usage:GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST});
        d.queue.writeBuffer(small,0,new Uint32Array([0x1357acbd]));const c=d.createCommandEncoder();c.copyBufferToBuffer(small,0,buf,0,4);d.queue.submit([c.finish()]);
        await Promise.race([buf.mapAsync(GPUMapMode.READ),new Promise((_,no)=>setTimeout(()=>no(Error('mapAsync timeout')),12000))]);
        out.pixel='0x'+new Uint32Array(buf.getMappedRange())[0].toString(16);out.ok=out.pixel==='0x1357acbd';buf.unmap();buf.destroy();small.destroy();
      }catch(e){out.failure=String(e);}
      return out;
    });Object.assign(result,gpu);
  }catch(e){result.failure=String(e);}finally{await browser?.close().catch(()=>{});}
  samples.push(result);console.log(JSON.stringify(result));
}
await mkdir('docs/evidence',{recursive:true});await writeFile('docs/evidence/adapter-probe.json',JSON.stringify({when:new Date().toISOString(),samples},null,2));
