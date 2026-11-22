import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
export const base=process.env.PARK_URL||'http://localhost:5173/';
export function url(par={}){const u=new URL(base);for(const [k,v] of Object.entries(par))if(v!=null)u.searchParams.set(k,v);return u.href;}
export async function browserPage({backend=process.env.BACKEND||'webgl',width=960,height=600,flags=[],launch={}}={}){
  const args=['--disable-dev-shm-usage','--disable-background-timer-throttling'];
  if(backend==='gpu'&&process.env.GPU_PROFILE==='vulkan-sw'){
    // Diagnostic Dawn Vulkan / SwiftShader profile; not a hardware FPS run.
    // Explicitly a software profile; HARDWARE=1 is a different request.
    args.push('--enable-unsafe-webgpu','--enable-features=Vulkan','--use-angle=vulkan','--disable-vulkan-surface','--ignore-gpu-blocklist');
  }else if(process.env.HARDWARE!=='1'){
    args.push('--use-angle=swiftshader','--enable-unsafe-swiftshader');if(backend==='gpu')args.push('--enable-unsafe-webgpu','--use-webgpu-adapter=swiftshader');
  }
  if(process.env.HEADFUL==='1')launch.headless=false;
  const browser=await chromium.launch({args:[...args,...flags],...launch});
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,acceptDownloads:true});
  page.setDefaultTimeout(25000);const errors=[],warnings=[];
  page.on('pageerror',e=>errors.push('exception: '+e.message));
  page.on('console',m=>{
    if(m.type()==='error')errors.push(m.text());else if(m.type()==='warning')warnings.push(m.text().slice(0,350));
  });
  return {browser,page,backend,errors,warnings};
}
export async function boot(p,params={}){
  const defaults={qa:1,still:1,quality:'low',backend:p.backend,skip:1};
  await p.page.goto(url({...defaults,...params}),{timeout:75000});
  await p.page.waitForFunction(()=>window.parkQA?.ready||document.body.dataset.error,undefined,{timeout:95000,polling:90});
  if(await p.page.locator('body').getAttribute('data-error'))throw Error('Boot error: '+p.errors.join('\n'));
  const current=await p.page.evaluate(()=>parkQA.backend);if(p.backend==='gpu'&&current!=='WebGPU')throw Error('Requested GPU but received '+current);
  return current;
}
export async function capture(page,path,opt={}){
  await mkdir(new URL('.',new URL(path,'file://'+process.cwd()+'/')).pathname,{recursive:true});
  return page.screenshot({path,timeout:95000,animations:'disabled',...opt});
}
export async function fromCanvas(page,path,mime='image/png',q=.94){
  const data=await page.evaluate(([mime,q])=>document.querySelector('#park-canvas').toDataURL(mime,q),[mime,q]);
  if(!data.startsWith('data:image/'))throw Error('Cannot copy canvas');
  await writeFile(path,Buffer.from(data.split(',')[1],'base64'));
}
