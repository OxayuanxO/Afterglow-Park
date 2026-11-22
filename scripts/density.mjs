import {writeFile,mkdir} from 'node:fs/promises';
import {browserPage,boot} from './browser.mjs';
const p=await browserPage({width:384,height:240});const out={stamp:new Date().toISOString()};
try{
  out.backend=await boot(p,{world:1});
  const step=+(process.env.GRID||6);console.log('READY',out.backend,'grid',step);
  out.build=await p.page.locator('script[type=module][src]').first().getAttribute('src');
  out.catalogue=await p.page.evaluate(()=>parkQA.catalogue());
  out.report=await p.page.evaluate(([n,phase])=>parkQA.survey(n,phase),[step,process.env.PHASE?.split(',').map(Number)]);
  const {pass,total,regions,groups,n,niches,shelves,trailMarkers}=out.report;
  console.log(JSON.stringify({pass,total,groups,n,niches,shelves,trailMarkers,areas:regions.map(r=>[r.id,r.placed.length,r.seen.length,r.passed,r.samples])}));
  if(process.env.LOCATORS==='1')out.locators=await p.page.evaluate(()=>parkQA.layout.places.map(r=>[r.id,parkQA.visibleChristmas(r.x,parkQA.floor(r.x,r.z).y+1.65,r.z)]));
  out.passed=out.catalogue.length>=80&&pass===total&&regions.every(r=>r.placed.length>=8&&r.seen.length>=8);
  if(process.env.REQUIRE==='1'&&!out.passed)process.exitCode=1;
} catch(e){out.failure=String(e);throw e;}
finally{await mkdir('docs/evidence',{recursive:true});await writeFile(`docs/evidence/decoration-density-${p.backend}${process.env.RUN_ID?'-'+process.env.RUN_ID:''}.json`,JSON.stringify({...out,errors:p.errors,warnings:[...new Set(p.warnings)]},null,2));await p.browser.close();if(p.errors.length)process.exitCode=1;}
