import * as T from 'three/webgpu';
import {pass, vec4, vec3, uniform, screenUV, dot, sin, fract, smoothstep, mix} from 'three/tsl';
import {bloom} from 'three/addons/tsl/display/BloomNode.js';
import {ao} from 'three/addons/tsl/display/GTAONode.js';
import {dof} from 'three/addons/tsl/display/DepthOfFieldNode.js';

export async function createScene(root, query) {
  // HDR lives in the linear scene target. The tone-mapped sRGB image uses
  // the browser's preferred SDR swapchain, not an extended-range HDR canvas.
  const renderer = new T.WebGPURenderer({antialias:true, samples:4, forceWebGL:query.get('backend')==='webgl', alpha:false, outputBufferType:T.HalfFloatType, powerPreference:'high-performance'});
  await renderer.init();
  const isGPU=renderer.backend.isWebGPUBackend;
  const info=isGPU?(renderer.backend.device.adapterInfo??(await navigator.gpu.requestAdapter({powerPreference:'high-performance',featureLevel:'compatibility'}).catch(()=>null))?.info):null;
  // Some software WebGPU adapters can render correctly but cannot import
  // their swapchain image into the browser compositor. Keep the graphics
  // backend and present one byte readback at a time on those adapters.
  const bridge=isGPU&&(query.get('present')==='readback'||query.get('present')!=='direct'&&(info?.isFallbackAdapter||info?.architecture==='swiftshader'));
  renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.AgXToneMapping;
  renderer.toneMappingExposure=1.11;
  renderer.shadowMap.enabled=true;
  const scene=new T.Scene();
  const camera=new T.PerspectiveCamera(45,1,.09,1430);
  const pipeline=new T.RenderPipeline(renderer);
  const beauty=pass(scene,camera,{type:T.HalfFloatType,samples:4});
  const glow=bloom(beauty.getTextureNode(),.23,.43,1.04);
  const grade={vignette:uniform(.23),grain:uniform(.0024),temperature:uniform(0),clock:uniform(0),focus:uniform(22),bokeh:uniform(.8)};
  const depth=dof(beauty.getTextureNode(),beauty.getViewZNode(),grade.focus,uniform(18),grade.bokeh);
  const contact=ao(beauty.getTextureNode('depth'),null,camera);contact.resolutionScale=.38;
  contact.radius.value=.46;contact.thickness.value=1.1;contact.samples.value=8;
  const occlusion=uniform(.25);
  let latest={d:false,b:true,ao:false};
  function output(withDepth=false,withBloom=true,withAO=latest.ao) {
    latest={d:withDepth,b:withBloom,ao:withAO};
    const source=withDepth ? depth : beauty.getTextureNode();
    const aoMask=withAO?mix(1,contact.getTextureNode().r,occlusion):1;
    const lit=source.rgb.mul(aoMask);
    const rgb=withBloom?lit.add(glow.rgb.mul(vec3(1.04,.91,.76))):lit;
    const d=screenUV.sub(.5).mul(vec3(1,.83,1).xy);
    const vignette=smoothstep(.07,.48,dot(d,d)).mul(grade.vignette).oneMinus();
    const noise=fract(sin(dot(screenUV.mul(2713.4),vec3(12.9898,78.233,0).xy).add(grade.clock)).mul(43758.5453)).sub(.5);
    const tint=vec3(grade.temperature.mul(.10).add(1),1,grade.temperature.mul(-.15).add(1));
    const shadow=mix(vec3(.995,.965,1.025),vec3(1.025,1.008,.99),smoothstep(.02,.57,rgb.dot(vec3(.2126,.7152,.0722))));
    pipeline.outputNode=vec4(rgb.mul(tint).mul(shadow).mul(vignette).add(noise.mul(grade.grain)),1);
    pipeline.needsUpdate=true;
  }
  output();
  const canvas=bridge?document.createElement('canvas'):renderer.domElement;
  canvas.id='park-canvas';canvas.tabIndex=-1;root.append(canvas);
  const display=bridge?canvas.getContext('2d',{alpha:false,desynchronized:false}):null;
  const byteTarget=()=>new T.RenderTarget(1,1,{type:T.UnsignedByteType,depthBuffer:false,stencilBuffer:false});
  const displayTarget=bridge?byteTarget():null;
  let photoTarget=null;
  async function readBytes(target,width,height){
    const data=await renderer.readRenderTargetPixelsAsync(target,0,0,width,height);
    return new ImageData(new Uint8ClampedArray(data.buffer,data.byteOffset,data.byteLength),width,height);
  }
  function renderTo(target,width,height,draw){
    target.setSize(width,height);const previous=renderer.getRenderTarget();renderer.setRenderTarget(target);
    try{draw();}finally{renderer.setRenderTarget(previous);}
  }
  function present(){
    if(!bridge){pipeline.render();return null;}
    const width=canvas.width,height=canvas.height;
    renderTo(displayTarget,width,height,()=>pipeline.render());
    return readBytes(displayTarget,width,height).then(image=>{
      if(canvas.width===width&&canvas.height===height)display.putImageData(image,0,0);
    });
  }
  async function encodeFrame(draw,mime='image/png',q=.94){
    if(!isGPU){draw();return canvas.toDataURL(mime,q);}
    // Reading an HDR/volatile swapchain via toDataURL is not portable. Export
    // the exact same post chain into a byte target, with explicit readback.
    const width=canvas.width,height=canvas.height;
    photoTarget??=byteTarget();renderTo(photoTarget,width,height,draw);
    const image=await readBytes(photoTarget,width,height);
    const receiver=document.createElement('canvas');receiver.width=width;receiver.height=height;
    receiver.getContext('2d',{alpha:false}).putImageData(image,0,0);
    return receiver.toDataURL(mime,q);
  }
  const api={renderer,scene,camera,pipeline,beauty,glow,grade,output,encodeFrame,present,bridge,presentation:bridge?'gpu-readback-2d':'direct',adapter:info?{vendor:info.vendor,architecture:info.architecture,isFallbackAdapter:info.isFallbackAdapter}:null,
    settings:()=>({postAO:latest.ao,postBloom:latest.b,photoDof:latest.d}),
    setQuality(tier,postAO=true){const on=tier.id!=='low'&&postAO;contact.resolutionScale=tier.id==='ultra'?.58:tier.id==='high'?.47:.36;occlusion.value=tier.id==='medium'?.17:.25;if(on!==latest.ao)output(latest.d,latest.b,on);},canvas,backend:isGPU?'WebGPU':'WebGL 2', resize(scale=1){const w=root.clientWidth||innerWidth,h=root.clientHeight||innerHeight;canvas.style.width='100%';canvas.style.height='100%';camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio,1.6)*scale);renderer.setSize(w,h,false);if(bridge){const W=renderer.domElement.width,H=renderer.domElement.height;if(canvas.width!==W)canvas.width=W;if(canvas.height!==H)canvas.height=H;}}};
  api.resize();
  return api;
}
