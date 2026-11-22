import {Survey} from './survey.js';
import {winterCraft,villageWindows} from './winter-craft.js';
import {lanternFestival,marketCanopy,stencilLights} from './seasonal.js';
import * as T from 'three/webgpu';
import {buildPaths,Physics,ground} from './terrain.js';
import {Lighting} from './lighting.js';
import {createMaterials} from './materials/library.js';
import {Batch} from './mesh.js';
import {buildFloor,waters,snowfall,Vapors,reflectionLayers} from './environment.js';
import {forest,dressForest,christmasTree} from './vegetation.js';
import {Interaction} from './interaction.js';
import {pathLights,siteVignettes,facilityDecor,lamp,bench} from './props.js';
import {cabin,buildMarket,pavilion,clockTower,gatesAndCity} from './buildings.js';
import {buildAreas} from './areas.js';
import {interiors} from './interiors.js';
import {Discovery,discoveries} from './discovery.js';
import {Effects} from './activities.js';
import {characters} from './characters.js';
import layout from './data/layout.json';
import content from './data/content.json';
const step=()=>new Promise(r=>requestAnimationFrame(()=>r()));
export async function buildWorld(scene,onProgress=()=>{},options={}){
  const w={scene,layout,content,generateFestivePlan:!!options.plan,anim:[],cabins:[],dynamic:[],sim:[],...buildPaths(),pois:[],quiet:[],vignettes:[]};w.physics=new Physics(w.pathAt);w.decor=new Survey(w);w.surveyDecks=[];
  w.mat=createMaterials();w.actions=new Interaction();w.batch=new Batch(scene,88);w.craftBatch=new Batch(scene,32);w.cityBatch=new Batch(scene,220);w.light=new Lighting(scene);w.vapors=new Vapors(scene);
  w.dynamicGroup=(g,r=50)=>{scene.add(g);w.dynamic.push({g,r});return g;};
  onProgress(.23,'鋪上第一層雪');await step();
  w.vegetation=forest(w);buildFloor(w);w.waters=waters(w);
  onProgress(.42,'讓雲杉圍住這座公園');await step();
  w.fir=christmasTree(w);
  w.actions.add('granfir','中央聖誕樹',0,.98,11.22,{reach:3,radius:1.13,hint:'喚亮樹梢',allowOccluded:true,action:ctx=>ctx.events.fir()});
  dressForest(w);siteVignettes(w);
  for(const c of layout.cabins)cabin(w,c);
  interiors(w);
  pavilion(w,-32,19,{r:5.6,h:4.55,theme:'ruby',id:'plaza-pavilion'});
  pavilion(w,29,120,{r:5.14,h:3.8,id:'bandstand',theme:'ivory'});
  clockTower(w,13,-42);buildMarket(w);buildAreas(w);
  gatesAndCity(w);pathLights(w);facilityDecor(w);lanternFestival(w);
  w.discovery=new Discovery(w);discoveries(w);w.effects=new Effects(scene,w.mat);w.people=characters(w);
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2+.16,x=37*Math.cos(a),z=37*Math.sin(a);if(Math.abs(x)<10&&z>22)continue;if(!w.physics.blocked(x,z,ground(x,z),1.25))lamp(w,x,z,{wreath:i%2===0,power:68});}
  villageWindows(w);marketCanopy(w);stencilLights(w);winterCraft(w);
  if(options.layoutOnly)return w; // offline terrain/ray planning; no GPU resources
  onProgress(.72,'點起長廊與窗邊的燈');await step();
  w.light.finish(w.mat,w.physics);w.waters.finish(w.light.field);w.batch.flush();w.cityBatch.flush();
  const craft=w.craftBatch.flush().map(m=>{if(!m.boundingSphere)m.geometry.computeBoundingSphere();return {m,s:m.boundingSphere??m.geometry.boundingSphere};});
  for(const a of craft)a.m.userData.craftLocal=true;w.snow=snowfall(scene,w.light);w.vapors.finish();reflectionLayers(w);
  w.update=(dt,t,camera,env,tier,s,inside)=>{
    w.inside=inside;
    const here=camera.position,detailRange=tier.id==='low'?54:tier.id==='medium'?66:78;
    for(const {m,s:bounds} of craft){const d=here.distanceTo(bounds.center);m.visible=d<detailRange+Math.min(28,bounds.radius)&&(here.y<61||d<46);}
    w.vegetation.update(camera.position,tier,env,s);w.light.update(dt,camera.position,env,s,tier,inside);w.waters.update(env,tier,camera.position);w.snow.update(env,tier,inside);w.vapors.update(env.t);w.fir.update(t,s);w.effects.update(env.t);
    for(const {g,r} of w.dynamic){const dx=g.position.x-camera.position.x,dz=g.position.z-camera.position.z;g.visible=dx*dx+dz*dz<r*r;}
    for(const a of w.anim)a(dt,t,camera.position,s);
  };
  return w;
}
