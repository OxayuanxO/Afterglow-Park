import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import {browserPage,boot} from './browser.mjs';
import {installNavigator} from './navigator.mjs';
const p=await browserPage({width:288,height:180});const rec={};
try{
  rec.backend=await boot(p,{world:1});rec.build=await p.page.locator('script[type=module][src]').first().getAttribute('src');console.log('READY',rec.backend);
  await p.page.evaluate(installNavigator);
  rec.route=await p.page.evaluate(()=>{
    const q=parkQA,spans=q.layout.canopySpans,goal=[];const along=(i,f)=>({x:spans[i][0]+(spans[i+1][0]-spans[i][0])*f,z:spans[i][1]+(spans[i+1][1]-spans[i][1])*f});
    let pos=along(0,-.095);pos.y=q.floor(pos.x,pos.z).y;
    for(let i=0;i<spans.length-1;i++)for(const f of i===0?[.075,.42,.95,.985]:i===spans.length-2?[.027,.52,1.08]:[.027,.52,.985])goal.push(along(i,f));
    const track=[];
    for(const g of goal){
      const clear=parkNavigator.canLine(pos,g);let d=Math.hypot(pos.x-g.x,pos.z-g.z);const initial=d;let n=0;
      while(d>.024&&n++<800){const s=Math.min(.15,d)/d;pos=q.testStep(pos,(g.x-pos.x)*s,(g.z-pos.z)*s);d=Math.hypot(pos.x-g.x,pos.z-g.z);}
      track.push({goal:g,at:pos,length:initial,clear,reached:d<.026,deck:q.nav(pos.x,pos.z,pos.y).deck});
    }
    return track;
  });
  for(const r of rec.route)assert.ok(r.clear&&r.reached,JSON.stringify(r));
  assert.ok(rec.route.some(r=>r.at.y>10&&r.deck));assert.ok(rec.route.at(-1).at.y<4.6);
  rec.crossings=await p.page.evaluate(()=>{
    const q=parkQA,{canLine,plan}=parkNavigator;
    function check(name,from,to,isDeck){
      const along=t=>({x:from[0]+(to[0]-from[0])*t,z:from[1]+(to[1]-from[1])*t});
      const length=Math.hypot(to[0]-from[0],to[1]-from[1]),margin=1.25/length;
      const start=along(isDeck?-margin:0),goals=(isDeck?[.035,.26,.50,.74,.96,1+margin]:[1]).map(along);
      let p={...start,y:q.floor(start.x,start.z).y},meters=0,maxY=p.y,deck=0;
      const waypoints=[];
      for(const g of goals){
        const route=canLine(p,g)?[g]:plan(p,g);let reached=true,reason=null;
        if(!route){reached=false;reason='no capsule-clear path';}
        if(route)for(const next of route){
          let n=0,d=Math.hypot(p.x-next.x,p.z-next.z);
          while(d>.027&&n++<1800){
            const step=Math.min(.085,d)/d;
            const pt=q.testStep(p,(next.x-p.x)*step,(next.z-p.z)*step),m=Math.hypot(pt.x-p.x,pt.z-p.z);
            if(m<.0015){reached=false;reason='blocked by the actual stepper';break;}
            p=pt;meters+=m;maxY=Math.max(maxY,p.y);deck+=+q.nav(p.x,p.z,p.y).deck;
            d=Math.hypot(p.x-next.x,p.z-next.z);
          }
          if(!reached||d>.035){reached=false;reason??='step limit';break;}
        }
        waypoints.push({goal:g,at:p,onDeck:q.nav(p.x,p.z,p.y).deck,reached,reason});
        if(!reached)break;
      }
      return {name,meters,deck,maxY,start,landed:!q.nav(p.x,p.z,p.y).deck,waypoints,reached:waypoints.length===goals.length&&waypoints.every(x=>x.reached)};
    }
    return [check('bow-bridge',[-99,142],[-62,119],true),check('stone-bridge',[-70,77],[-64,86],true),check('stone-tunnel',[36.47,75.5],[49.7,75.5],false)];
  });
  for(const r of rec.crossings){
    assert.ok(r.reached&&r.landed,JSON.stringify(r));
    if(r.name.endsWith('bridge'))assert.ok(r.deck>20&&r.waypoints.slice(1,-1).every(x=>x.onDeck),JSON.stringify(r));
  }
  assert.deepEqual(p.errors,[]);console.log('Ramp across entire structure',rec.route.length,'reached, peak',Math.max(...rec.route.map(q=>q.at.y)),rec.crossings.map(x=>x.name));
}catch(e){rec.failure=String(e);throw e;}
finally{await mkdir('docs/evidence',{recursive:true});await writeFile('docs/evidence/canopy-route.json',JSON.stringify({...rec,errors:p.errors,warnings:p.warnings},null,2));await p.browser.close();}
