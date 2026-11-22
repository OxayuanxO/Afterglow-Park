import layout from './data/layout.json';
import {clamp,TAU} from './math.js';
import {defaults} from './quality.js';
const paths={
 snow:'<path d="M12 2.5v19M3.8 7.3l16.4 9.4M3.8 16.7l16.4-9.4M9 4l3 2.8L15 4M9 20l3-2.8 3 2.8M4.5 10.3l4-.9-.9-3.9M19.5 13.7l-4 .9.9 3.9M4.5 13.7l4 .9-.9 3.9M19.5 10.3l-4-.9.9-3.9"/>',
 arrow:'<path d="M4 12h15m-6-6 6 6-6 6"/>',external:'<path d="M7 17 17 7M7 7h10v10"/>',chevron:'<path d="m9 18 6-6-6-6"/>', map:'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15"/>',
 sound:'<path d="M11 5 6 9H3v6h3l5 4zM15 9c1.7 1.7 1.7 4.3 0 6m3-9c3.3 3.3 3.3 8.7 0 12"/>', mute:'<path d="M11 5 6 9H3v6h3l5 4zM16 9l5 6m0-6-5 6"/>',
 settings:'<path d="M3 6h18M3 12h18M3 18h18"/><circle cx="8" cy="6" r="2" fill="currentColor"/><circle cx="15" cy="12" r="2" fill="currentColor"/><circle cx="10" cy="18" r="2" fill="currentColor"/>',
 headphones:'<path d="M4 13v-2a8 8 0 1 1 16 0v2M4 13h1.5c1 0 1.5.5 1.5 1.5v4c0 1-.55 1.5-1.5 1.5h-.6A1.9 1.9 0 0 1 3 18v-3a2 2 0 0 1 1-2Zm16 0h-1.5c-1 0-1.5.5-1.5 1.5v4c0 1 .55 1.5 1.5 1.5h.6a1.9 1.9 0 0 0 1.9-2v-3a2 2 0 0 0-1-2Z"/>',
 camera:'<path d="M4 7h4l2-3h4l2 3h4a1.5 1.5 0 0 1 1.5 1.5v10A1.5 1.5 0 0 1 20 20H4a1.5 1.5 0 0 1-1.5-1.5v-10A1.5 1.5 0 0 1 4 7Z"/><circle cx="12" cy="13" r="3.5"/>',
 play:'<path d="m9 5 11 7-11 7z"/>', close:'<path d="m5 5 14 14m0-14L5 19"/>', pin:'<path d="M19 10c0 5-7 11-7 11s-7-6-7-11a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.2"/>',
 moon:'<path d="M20.2 15.6a9 9 0 0 1-11.8-11.8 9 9 0 1 0 11.8 11.8Z"/>', sun:'<circle cx="12" cy="12" r="3.4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
 expand:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',compass:'<circle cx="12" cy="12" r="9.2"/><path d="m16 8-2.4 5.6L8 16l2.4-5.6L16 8Z"/>',
 person:'<circle cx="12" cy="5" r="2.3"/><path d="m5 20 4-5 2-5-3 2-2 1m5-3 4 3 4-.6M11 13l4 3 1.5 5"/>',spark:'<path d="M12 2v20M2 12h20M5 5l14 14m0-14L5 19"/>',
 tree:'<path d="m12 2 5 7h-3l5 6h-4l5 5H4l5-5H5l5-6H7zM12 20v3"/>', water:'<path d="M3 8c2 0 2 2 4.5 2S10 8 12 8s2 2 4.5 2S19 8 21 8M3 15c2 0 2 2 4.5 2s2.5-2 4.5-2 2 2 4.5 2 2.5-2 4.5-2"/>',
 home:'<path d="m3 11 9-8 9 8M6 10v10h12V10m-8 10v-6h4v6"/>',book:'<path d="M4 5c3-1 5-.5 8 1 3-1.5 5-2 8-1v14c-3-1-5-.5-8 1-3-1.5-5-2-8-1Zm8 1v14"/>', download:'<path d="M12 3v12m-4-4 4 4 4-4M4 16v4h16v-4"/>', keys:'<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M6 9h.1M10 9h.1M14 9h.1M18 9h.1M6 12h.1M10 12h.1M14 12h.1M18 12h.1M7 15h10"/>', cup:'<path d="M5 8h12v7a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4zM17 9h1a3 3 0 1 1 0 6h-1M7 3v2m4-2v2m4-2v2"/>'
};
const icon=(id,cls='')=>`<svg class="${cls}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[id]??paths.spark}</svg>`;
const key=t=>`<kbd>${t}</kbd>`;
const safe=x=>String(x).replace(/[&<>"']/g,k=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[k]);
// CSS custom-property URLs are resolved from the stylesheet (assets/ in a build).
// Resolve against the document instead, including a nested static deployment.
const asset=(id)=>new URL(`${import.meta.env.BASE_URL}previews/${encodeURIComponent(id)}.webp`,document.baseURI).href.replaceAll("'",'%27');
const menuTitle={settings:['氛圍設定','SET THE MOOD','把夜晚調成你喜歡的樣子。'],map:['園區地圖','WINTER GARDENS','沿著雪中的燈，找個地方停一停。'],pause:['慢慢來','TAKE A BREATH','夜晚會等你。'],photo:['照片模式','THE WINTER CAMERA','把這一刻留在雪裡。'],reader:['','FIELD JOURNAL',''],wish:['留下一句祝福','WINTER POST','文字只留在這台裝置的手札。'],rides:['選一個坐騎','PINEWOOD CAROUSEL','木馬會慢慢轉，想下來隨時都可以。'],help:['漫遊指南','FIELD GUIDE','沒有任務，也不必趕路。']};
const timeLabels={dusk:'傍晚藍調',night:'初夜',late:'深夜'};
const snowLabels={none:'無雪',flurry:'細雪',steady:'穩定降雪',heavy:'大雪',clear:'雪停星夜'};
const modes={walk:'第一人稱',free:'自由視角',photo:'照片模式',seat:'坐下',lie:'仰望冬夜',ride:'旋轉木馬',cinematic:'電影漫遊',intro:'進入公園'};
const dash='M0 10h35m18 0h35';
function lobbyMarkup(){
  const gallery=layout.gallery.map((id,i)=>{const shot=layout.shots.find(s=>s.id===id);
    return `<button class="vista ${i===0?'is-selected':''}" data-action="vista" data-id="${id}" aria-pressed="${i===0}" style="--thumb:url('${safe(asset(id))}')"><span class="vista-num">0${i+1}</span><span class="vista-copy"><span>${shot.name}</span><em>${shot.en}</em></span><span class="vista-arrow">${icon('external')}</span></button>`;
  }).join('');
  return `
    <div class="poster" aria-hidden="true"></div><div id="scrim" aria-hidden="true"></div>
    <header id="header"><button class="brand" data-action="home" aria-label="返回入口畫面"><span class="seal">${icon('snow')}</span><span><strong>AFTERGLOW PARK</strong><small>晚 霞 燈 園</small></span></button>
    <div class="header-center"><span class="header-rule"></span><span>風景氛圍模擬器</span><span class="header-rule"></span></div>
    <div class="header-actions"><button class="icon-btn" id="mute-btn" data-action="mute" title="靜音／開啟聲音" aria-label="靜音／開啟聲音">${icon('sound')}</button><button class="header-setting" data-action="settings" aria-label="氛圍設定">${icon('settings')}<span>氛圍設定</span></button></div></header>
    <main id="hero"><div class="hero-copy"><span class="eyebrow"><span></span>A COZY CHRISTMAS PARK</span>
    <h1>Afterglow<em>Park</em></h1><p class="hero-zh">晚霞未散，燈火已暖</p><p class="hero-intro">晚霞落進城市的天際線，燈一盞盞亮了。<br>沿著暖光散步，把這一晚慢慢走完。</p>
    <div class="hero-actions"><button class="btn btn-primary" data-action="enter" id="enter" disabled>進入公園${icon('arrow')}</button><button class="btn btn-ghost" data-action="map">${icon('map')} 園區地圖</button></div>
    <div id="loading" role="status"><div class="loading-track"><b></b></div><span>準備冬夜</span><small>0%</small></div>
    <div class="headphone-note">${icon('headphones')} 建議配戴耳機 <i></i> 桌面瀏覽器體驗</div>
    </div>
    <div class="scenic-stamp"><div class="weather-tag">${icon('snow')} <span id="weather-tag">細雪</span><i></i>${icon('moon')} <span id="night-tag">初夜</span></div>
      <div class="scenic-spot"><span class="place-cross">${icon('pin')}</span><div><small id="gallery-en">GRAND CHRISTMAS PLAZA</small><b id="gallery-name">聖誕中央廣場</b></div></div>
    </div></main>
    <section id="gallery" aria-label="園區選景"><div class="gallery-heading"><div><span class="ornament"></span><strong>園區選景</strong><small>PARK VISTAS</small></div><button class="text-button" data-action="tour">${icon('play')} 電影漫遊 <span>${key('C')}</span></button></div><div class="vistas">${gallery}</div></section>
    <footer id="footer"><div class="footer-keys"><span>${key('W')}${key('A')}${key('S')}${key('D')} 移動</span><span>${key('V')} 切換視角</span><span>${key('P')} 拍照</span><span>${key('H')} 隱藏介面</span></div><button class="text-button" data-action="help">${icon('keys')} 操作指南</button></footer>
    <div class="mobile-hint" role="note">請用電腦的鍵盤與滑鼠漫遊。你仍然可以在此觀賞雪夜。</div>
    <section id="game-hud" hidden aria-label="漫遊控制"><div class="game-top"><button class="brand game-brand" data-action="home" aria-label="回到入口">${icon('snow')} <strong>AFTERGLOW PARK</strong></button><div class="compass-strip"><span></span><b id="heading">N</b><span></span></div><div class="game-tool"><button class="icon-btn" data-action="map" title="園區地圖 · M" aria-label="園區地圖">${icon('map')}</button><button class="icon-btn" data-action="photo" title="照片模式 · P" aria-label="照片模式">${icon('camera')}</button><button class="icon-btn" data-action="settings" title="氛圍設定 · Tab" aria-label="氛圍設定">${icon('settings')}</button></div></div>
    <span id="crosshair" aria-hidden="true"></span><div id="prompt" hidden><span id="hint-key">E</span><div><b id="hint-label"></b><small id="hint-text"></small></div></div>
    <div class="game-bottom"><div class="game-location"><small id="game-location-en">WINTER GARDENS</small><strong id="game-location-zh">南門入口</strong></div><div id="game-controls"></div><button class="mode-chip" data-action="mode">${icon('compass')} <span id="mode-label">第一人稱</span> ${key('V')}</button></div>
    <button id="skip" class="btn btn-ghost" data-action="skip" hidden>略過開場 ${icon('arrow')}</button><div id="sit-text" hidden>${key('W')} / ${key('Esc')} 起身</div>
    </section>
    <div id="play-status" role="status" hidden></div><div id="cup" hidden aria-hidden="true">${icon('cup')} <span></span></div><div id="travel-fade" aria-hidden="true"></div><div id="panel-bg" hidden></div><aside id="panel" hidden role="dialog" aria-modal="true" aria-labelledby="panel-title"></aside><pre id="debug" hidden></pre><div class="boot-error" hidden></div>`;
}
export class ParkUI{
  constructor(root,settings){
    this.root=root;this.settings=settings;this.el={};this.panel=null;this.selected='tree';this.currentMap='map';this.hideUI=false;this.frozen=true;this.photoDof=false;this.boot=true;this.mode='lobby';this.card=0;
    root.innerHTML=lobbyMarkup();
    for(const el of root.querySelectorAll('[id]'))this.el[el.id]=el;
    root.addEventListener('click',e=>{const a=e.target.closest('[data-action]');if(a&&!a.disabled)this.handle(a.dataset.action,a,e);});
    this.el['panel-bg'].addEventListener('click',()=>this.close());
    root.addEventListener('input',e=>this.input(e.target));root.addEventListener('change',e=>{if(e.target.matches('select'))this.input(e.target);});
    this.reflectMeta();
  }
  connect(ctx){this.ctx=ctx;ctx.discovery.ui=this;this.syncMode(ctx.cam.mode);}
  load(f,txt){const bar=this.el.loading;bar.hidden=false;bar.querySelector('b').style.width=`${Math.round(f*100)}%`;bar.querySelector('span').textContent=txt;bar.querySelector('small').textContent=`${Math.floor(f*100)}%`;}
  loaded(){this.boot=false;this.el['enter'].disabled=false;this.el.loading.hidden=true;document.body.dataset.ready='true';}
  fail(err){const e=this.root.querySelector('.boot-error');e.hidden=false;e.innerHTML=`<strong>還不能打開公園</strong><p>需要可用的 WebGPU 或 WebGL 2。請開啟瀏覽器的硬體加速，或使用 WebGL 2 模式重試。</p><a class="btn btn-primary" href="?backend=webgl&quality=low">以 WebGL 2 重試 ${icon('arrow')}</a>`;this.el.loading.hidden=true;document.body.dataset.error='true';}
  reflectMeta(){
    this.el['weather-tag'].textContent=snowLabels[this.settings.snow]||'細雪';this.el['night-tag'].textContent=timeLabels[this.settings.time]||'初夜';
    this.el['mute-btn'].innerHTML=icon(this.settings.muted?'mute':'sound');this.el['mute-btn'].setAttribute('aria-pressed',String(this.settings.muted));
  }
  syncMode(mode){
    this.mode=mode;this.root.dataset.mode=mode;this.el['game-hud'].hidden=mode==='lobby'||mode==='photo';
    this.el['mode-label'].textContent=modes[mode]??mode;const seat=['seat','ride','lie'].includes(mode);this.el['sit-text'].hidden=!seat;this.el.skip.hidden=mode!=='intro';
    this.el.crosshair.hidden=mode!=='walk';this.el.prompt.hidden=true;
    this.el['game-controls'].innerHTML=mode==='walk'?`<span>${key('W')}${key('A')}${key('S')}${key('D')} 散步</span><span>${key('E')} 互動</span><span>${key('Tab')} 氛圍</span>`:mode==='free'?`<span>拖曳旋轉 · 右鍵平移</span> <span>${key('Q')}${key('E')} 高度</span>`:'';
  }
  opts(){return this.ctx?.settings||this.settings;}
  handle(action,node,e){
    const ctx=this.ctx;
    if(action==='help'){this.toggle('help');return;}
    if(!ctx){if(action==='mute'){this.settings.muted=!this.settings.muted;this.reflectMeta();}return;}
    ctx.inputTime=performance.now();
    if(action==='enter'){this.close();ctx.enter();}
    if(action==='home'){this.close();ctx.home();}
    if(action==='mute'){ctx.settings.muted=!ctx.settings.muted;if(!ctx.settings.muted)ctx.audio.start().catch(console.warn);ctx.changed();this.reflectMeta();}
    if(action==='settings'||action==='map')this.toggle(action);
    if(action==='tour'){this.close();ctx.beginTour(layout.shots.findIndex(s=>s.id===this.selected));}
    if(action==='vista'){this.vista(node.dataset.id);}
    if(action==='close')this.close();
    if(action==='resume'){this.close();ctx.cam.lock();}
    if(action==='mode'){this.close();ctx.cam.switchMode();}
    if(action==='skip')ctx.cam.start(true);
    if(action==='photo')ctx.photo();
    if(action==='peek'){this.el.panel.classList.toggle('peek');node.textContent=this.el.panel.classList.contains('peek')?'展開拍照設定':'收起拍照設定';}
    if(action==='shot')ctx.goto(node.value??node.dataset.id,'photo');
    if(action==='capture')ctx.savePhoto(node.dataset.size==='2'?2:1);
    if(action==='map-tab'){this.currentMap=node.dataset.id;this.drawPanel();}
    if(action==='travel'){const [x,z]=node.dataset.xy.split(',').map(Number);this.close();ctx.cam.travel(x,z,[0,5,0]);}
    if(action==='reset-progress'){if(node.dataset.confirm==='yes'){ctx.discovery.clear();this.drawPanel();}else{node.dataset.confirm='yes';node.textContent='再次按下，清除本機手札與足跡';}}
    if(action==='reset-settings'){const reduce=ctx.settings.reduced;Object.assign(ctx.settings,defaults,{reduced:reduce});ctx.changed(true);this.drawPanel();}
    if(action==='wish-choice'){const index=+node.dataset.id;ctx.discovery.add('wish-'+index, '留給公園的祝福',ctx.world.content.wishes[index],'祝福');ctx.events.lantern();ctx.audio.chime('soft');this.close();}
    if(action==='pick-ride'){const p=this._rides;this.close();p?.(+node.dataset.id);}
    if(action==='full'){if(document.fullscreenElement)document.exitFullscreen?.().catch(()=>{});else document.documentElement.requestFullscreen?.().catch(()=>this.status('目前的預覽不允許全螢幕'));}
  }
  vista(id,move=true){
    const shot=layout.shots.find(s=>s.id===id);if(!shot)return;this.selected=id;
    for(const b of this.root.querySelectorAll('.vista')){const yes=b.dataset.id===id;b.classList.toggle('is-selected',yes);b.setAttribute('aria-pressed',String(yes));}
    this.el['gallery-name'].textContent=shot.name;this.el['gallery-en'].textContent=shot.en.toUpperCase();if(move)this.ctx?.goto(id,'lobby');
  }
  toggle(name){if(this.panel===name){this.close();return;}this.open(name);}
  open(name){
    const old=this.panel;this.panel=name;this.ctx?.cam.unlock();this.ctx?.cam.keys.clear();
    this.el['panel-bg'].hidden=name==='photo';this.el.panel.hidden=false;this.el.panel.classList.remove('peek');this.el.panel.dataset.type=name;
    if(!old)this.lastFocus=document.activeElement;this.drawPanel();
    if(name!=='photo')this.el.panel.querySelector('.close-panel')?.focus({preventScroll:true});
  }
  close(){
    if(!this.panel)return;const old=this.panel,focused=document.activeElement;
    if(focused?.closest('#panel'))focused.blur();this.panel=null;this.el.panel.hidden=true;this.el['panel-bg'].hidden=true;this.el.panel.classList.remove('peek');
    if(old==='photo'&&this.ctx?.cam.mode==='photo')this.ctx?.cam.photo(false);
    if(this.lastFocus instanceof HTMLElement&&this.lastFocus.getClientRects().length&&this.lastFocus.closest('#app')&&!this.lastFocus.closest('#panel'))this.lastFocus.focus({preventScroll:true});else this.ctx?.g.canvas.focus({preventScroll:true});
  }
  updateHint(action,free){
    const q=this.el.prompt;const should=!!action&&!this.panel&&!this.hideUI&&['walk','free'].includes(this.mode);
    q.hidden=!should;document.body.classList.toggle('can-interact',should);this.el.crosshair.classList.toggle('near',should);
    if(!should)return;this.el['hint-label'].textContent=action.label;this.el['hint-text'].textContent=action.hint;this.el['hint-key'].textContent=free?'點':'E';
  }
  syncHud(place,yaw,locked){
    if(this.mode==='lobby')return;
    if(place){this.el['game-location-zh'].textContent=place.name;this.el['game-location-en'].textContent=place.en.toUpperCase();}
    const n=((Math.round(-yaw/(Math.PI/4))%8)+8)%8;this.el.heading.textContent=['N','NE','E','SE','S','SW','W','NW'][n];this.root.classList.toggle('is-locked',locked);
  }
  hide(){this.hideUI=!this.hideUI;this.root.classList.toggle('is-hidden',this.hideUI);}
  fade(){const f=this.el['travel-fade'];f.classList.remove('wash');void f.offsetWidth;f.classList.add('wash');}
  status(t,ms=1700){this.el['play-status'].hidden=false;this.el['play-status'].textContent=t;clearTimeout(this.statusTimer);this.statusTimer=setTimeout(()=>this.el['play-status'].hidden=true,ms);}
  reader(name,text){this.reading={name,text};this.open('reader');}
  wish(tree=false){this.isWishingTree=tree;this.open('wish');}
  rides(onPick){this._rides=onPick;this.open('rides');}
  warmCup(label){const cup=this.el.cup;cup.hidden=false;cup.querySelector('span').textContent=label;clearTimeout(this.cupTimer);this.cupTimer=setTimeout(()=>cup.hidden=true,4200);}
  range(k,label,min,max,step=.01,s=this.opts()){
    const n=s[k]??min;return `<label class="form-range"><span>${label}<output data-out="${k}">${this.fmt(k,n)}</output></span><input type="range" name="${k}" min="${min}" max="${max}" step="${step}" value="${n}" style="--at:${(n-min)/(max-min)*100}%"></label>`;
  }
  fmt(k,n){return ['focus'].includes(k)?`${Math.round(n)} m`:k==='fov'?`${Math.round(n)}°`:k==='exposure'?Number(n).toFixed(2)+'×':k==='temp'?(n>=0?'+':'')+Number(n).toFixed(2):`${Math.round(n*100)}%`;}
  check(k,label,s=this.opts()){return `<label class="form-check"><span>${label}</span><input type="checkbox" name="${k}" ${s[k]?'checked':''}><i></i></label>`;}
  select(k,title,objects,value=this.opts()[k]){return `<label class="form-select"><span>${title}</span><select name="${k}">${Object.entries(objects).map(([a,b])=>`<option value="${a}" ${String(value)===a?'selected':''}>${b}</option>`).join('')}</select></label>`;}
  section(title,ico,body){return `<section class="form-section"><h3>${icon(ico)} ${title}</h3>${body}</section>`;}
  settingsPanel(){
    return [this.section('季節與光','snow',this.select('snow','降雪',snowLabels)+this.select('time','時間',timeLabels)+this.check('timeFlow','自動時間流轉')+this.check('weatherFlow','自然天氣起伏')+this.range('lights','庭園燈光',.2,1.48)),
      this.section('環境與音樂','headphones',this.range('wind','風',0,1)+this.range('city','城市聲',0,1)+this.range('ambience','環境音量',0,1)+this.range('music','音樂音量',0,1)+this.check('solitude','獨處模式')+this.check('events','公園節奏事件')),
      this.section('顯示與舒適','settings',this.select('quality','畫質',{auto:'自動',low:'低',medium:'中',high:'高',ultra:'極高'})+this.range('fov','視野',37,82,1)+this.check('reduced','減少動態')+this.check('bob','走路時的輕微晃動')+this.check('idleTour','閒置時播放電影漫遊')+this.range('sensitivity','滑鼠靈敏度',.35,1.9)),
      this.section('影像後製','camera',this.check('postBloom','燈光泛光')+this.check('postAO','接觸陰影（中檔以上）')+this.range('bloom','泛光強度',0,1.5)+this.check('postVignette','暗角')+this.range('vignette','暗角強度',0,1)+this.check('postGrain','細緻顆粒')+this.range('grain','顆粒強度',0,1)),
      `<div class="panel-actions"><button class="btn btn-ghost" data-action="full">${icon('expand')} 全螢幕</button><button class="text-button" data-action="reset-settings">恢復預設</button></div>`].join('');
  }
  photoPanel(){
    const p=this.ctx?.photoValues??{exposure:1.11,temp:0,focus:22,aperture:.8,photoDof:false,freeze:true,tone:'agx'};
    return `<div class="photo-rack">${this.select('bookmark','鏡位',Object.fromEntries(layout.shots.map(x=>[x.id,x.name])),this.ctx.cam.activeShot)}${this.select('tone','色調映射',{agx:'AgX',aces:'ACES Filmic'},p.tone)}${this.range('exposure','曝光',.52,1.92,.01,p)}${this.range('temp','色溫',-1,1,.01,p)}${this.check('freeze','凍結雪與時間',p)}${this.check('photoDof','景深',p)}${this.range('focus','對焦距離',2,130,1,p)}${this.range('aperture','景深強度',0,2.5,.01,p)}${this.range('vignette','暗角',0,1)}</div><div class="panel-actions"><button class="btn btn-primary" data-action="capture">${icon('download')} 儲存 PNG</button><button class="btn btn-ghost" data-action="capture" data-size="2">2×</button></div><button class="text-button" data-action="peek">收起拍照設定</button>`;
  }
  input(el){
    if(!this.ctx||!el.name)return;const name=el.name;
    const value=el.type==='checkbox'?el.checked:el.type==='range'?Number(el.value):el.value;
    if(name==='bookmark'){this.ctx.goto(value,'photo');return;}
    if(el.type==='range'){
      el.style.setProperty('--at',(value-+el.min)/(+el.max-+el.min)*100+'%');const out=el.parentNode.querySelector('output');if(out)out.textContent=this.fmt(name,value);
    }
    if(['exposure','temp','focus','aperture','photoDof','freeze','tone'].includes(name)){this.ctx.photoValues[name]=value;this.ctx.applyPhoto();}
    else{this.settings[name]=value;this.ctx.changed(name==='quality');this.reflectMeta();}
  }
  mapPanel(){
    const ctx=this.ctx,d=ctx?.discovery,travel=ctx?.cam?.mode!=='lobby';const places=layout.places;
    const tab=`<div class="map-tabs"><button data-action="map-tab" data-id="map" ${this.currentMap==='map'?'class="selected"':''}>${icon('map')} 地圖</button><button data-action="map-tab" data-id="journal" ${this.currentMap==='journal'?'class="selected"':''}>${icon('book')} 漫遊手札</button></div>`;
    if(this.currentMap==='journal'){
      const records=[...(d?.log.values()??[])].reverse();
      return tab+`<div class="notes">${records.length?records.map(a=>`<article><small>${safe(a.tag)}</small><h3>${safe(a.name)}</h3><p>${safe(a.text)}</p></article>`).join(''):`<p class="muted">雪還新，手札還空白。散步時遇到的故事和小驚喜，會留在這裡。</p>`}</div><button class="text-button muted" data-action="reset-progress">重設手札與足跡</button>`;
    }
    const coord=(n)=>n+225;
    const svg=`<svg id="park-map" viewBox="-10 -11 470 472" xmlns="http://www.w3.org/2000/svg" aria-label="製圖：北方朝上，中央是聖誕樹"><defs><pattern id="pine-map" width="27" height="24" patternUnits="userSpaceOnUse"><path d="m7 4 4 7H8l4 5H2l4-5H3z" fill="#717b5e" opacity=".32"/><path d="m21 14 3 6h-6z" fill="#6c775c" opacity=".24"/></pattern></defs><rect width="450" height="450" rx="10" fill="#decda8"/><rect x="11" y="11" width="428" height="428" rx="10" fill="url(#pine-map)" stroke="#a89a6e" stroke-width="1.75" stroke-dasharray="4 3"/><ellipse cx="110" cy="327" rx="52" ry="34" fill="#9aaba0" stroke="#7d9690" stroke-width="2"/><ellipse cx="104" cy="207" rx="51" ry="33" fill="#d5c5a0" opacity=".84"/><ellipse cx="360" cy="233" rx="31" ry="19" fill="#b4b9a1" stroke="#918d71" stroke-width="1.6"/><circle cx="225" cy="225" r="43" fill="#d6bb91" stroke="#b18f61" stroke-width="2"/><rect x="191" y="49" width="68" height="66" rx="17" fill="#b9bb8c" opacity=".8"/><circle cx="78" cy="92" r="28" fill="none" stroke="#a79f72" stroke-width="6" opacity=".44"/>${layout.paths.map(p=>`<polyline points="${p.points.map(([x,z])=>`${coord(x)},${coord(z)}`).join(' ')}" stroke="${p.kind==='gravel'?'#f0dfb6':'#f4e6c2'}" fill="none" stroke-width="${p.id==='main'?10:p.width*.85}" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}
    ${[...(d?.marks??[])].slice(-1000).map(k=>{const [x,z]=k.split(',').map(Number);return `<circle cx="${x*6+3}" cy="${z*6+3}" r="1.18" fill="#9b7950" opacity=".68"/>`;}).join('')}
    ${layout.cabins.filter(c=>c.enter).map(c=>`<g transform="translate(${coord(c.x)},${coord(c.z)})" fill="#89594d"><path d="M-4 0v6h8V0l-4-4Z"/><path d="M-5.6 .6 0-5.2 5.6.6" fill="none" stroke="#70483d" stroke-width="1.3"/></g>`).join('')}
    ${places.map((p,i)=>`<g><circle cx="${coord(p.x)}" cy="${coord(p.z)}" r="${p.id==='plaza'?9.8:7}" fill="${d?.visited.has(p.id)||!travel?'#4b5140':'#8f8265'}" stroke="#e9d8ae" stroke-width="1.4"/><text x="${coord(p.x)}" y="${coord(p.z)+2.9}" fill="#fff0ce" text-anchor="middle" font-size="8" font-family="sans-serif">${p.id==='plaza'?'✦':i+1}</text></g>`).join('')}
    <g transform="translate(411,35)" fill="#62634e"><path d="M0-12 4 6 0 3-4 6Z"/><text x="0" y="17" text-anchor="middle" font-size="9">N</text></g><g id="map-player" fill="#884f3e" stroke="#fff0cd" stroke-width="1.9"><path d="M0-9 6 6 0 3-6 6Z"/></g></svg>`;
    const lst=places.map((p,i)=>{
      let dest={x:p.x,z:p.z};if(p.id==='plaza')dest={x:0,z:35};if(p.id==='pond')dest={x:-154,z:123};if(p.id==='garden')dest={x:6.5,z:-139};if(p.id==='carousel')dest={x:75,z:81};if(p.id==='canopy')dest={x:109,z:125};if(p.id==='campfire')dest={x:84,z:154};
      const visited=!travel||d?.visited.has(p.id)||p.id==='gate';
      return `<li><span class="map-counter">${String(i+1).padStart(2,'0')}</span><span><b>${p.name}</b><small>${p.en}</small></span>${travel?`<button class="text-button" data-action="travel" data-xy="${dest.x},${dest.z}" ${visited?'':'disabled'}>${visited?'前往':'未造訪'}${visited?icon('chevron'):''}</button>`:''}</li>`;
    }).join('');
    return tab+`<div class="map-frame">${svg}</div><div class="map-legend"><span>${icon('pin')} 目前位置</span><span>${icon('home')} 可進入小屋</span><span>北 ↑</span></div><ul class="place-list">${lst}</ul>`;
  }
  updateMapPos(){if(this.panel!=='map'||this.currentMap!=='map')return;const p=this.el.panel.querySelector('#map-player');if(!p||!this.ctx)return;const {cam}=this.ctx;const at=cam.mode==='walk'?cam.feet:cam.camera.position;p.setAttribute('transform',`translate(${clamp(at.x+225,3,447)} ${clamp(at.z+225,3,447)}) rotate(${cam.yaw*-180/Math.PI})`);p.style.opacity=cam.mode==='lobby'?'0':'1';}
  refreshMap(){if(this.panel==='map'&&this.currentMap==='journal')this.drawPanel();}
  helpPanel(){return `<div class="manual"><div>${key('W')}${key('A')}${key('S')}${key('D')}<span>移動；按住 Shift 慢跑／加速</span></div><div>${key('滑鼠')}<span>第一人稱：點擊鎖定視角，或按住拖曳</span></div><div>${key('V')}<span>切換第一人稱和自由視角</span></div><div>${key('Q')}${key('E')}<span>自由視角升降（Q 降、E 升）；左拖旋轉、右拖平移、滾輪推拉</span></div><div>${key('E')}<span>對準近處的門、長椅與其他物件互動</span></div><div>${key('Z')}<span>在雪地躺下看星；再按 Z 或移動起身</span></div><div>${key('M')}${key('Tab')}<span>園區地圖與手札／氛圍設定</span></div><div>${key('P')}${key('C')}<span>照片模式／電影漫遊</span></div><div>${key('H')}${key('Esc')}<span>隱藏介面／解除鎖定、起身或暫停</span></div></div>`;}
  drawPanel(){
    let html='',type=this.panel;if(!type)return;let [zh,en,desc]=menuTitle[type];
    if(type==='settings')html=this.settingsPanel();
    if(type==='photo')html=this.photoPanel();
    if(type==='map')html=this.mapPanel();
    if(type==='help')html=this.helpPanel();
    if(type==='reader'){zh=this.reading.name;html=`<div class="read-ornament">${icon('spark')}</div><p class="reading">${safe(this.reading.text)}</p><button class="btn btn-ghost" data-action="close">收好便箋 ${icon('arrow')}</button>`;}
    if(type==='pause')html=`<div class="pause-menu"><button class="btn btn-primary" data-action="resume">繼續漫遊 ${icon('arrow')}</button><button class="btn btn-ghost" data-action="settings">${icon('settings')} 氛圍設定</button><button class="btn btn-ghost" data-action="help">${icon('keys')} 操作指南</button><button class="text-button" data-action="home">回到入口畫面</button></div>`;
    if(type==='wish')html=`<div class="choice">${this.ctx.world.content.wishes.map((p,i)=>`<button class="btn btn-ghost" data-action="wish-choice" data-id="${i}">${icon('spark')}${safe(p)}</button>`).join('')}</div>`;
    if(type==='rides')html=`<div class="choice"><button class="btn btn-ghost" data-action="pick-ride" data-id="0">香檳色木馬 ${icon('arrow')}</button><button class="btn btn-ghost" data-action="pick-ride" data-id="1">深松綠木馬 ${icon('arrow')}</button><button class="btn btn-ghost" data-action="pick-ride" data-id="3">奶油雪橇座 ${icon('arrow')}</button></div>`;
    this.el.panel.innerHTML=`<header class="panel-top"><span class="mini-rule">${en}</span><h2 id="panel-title">${safe(zh)}</h2>${desc?`<p>${desc}</p>`:''}<button class="icon-btn close-panel" data-action="close" aria-label="關閉">${icon('close')}</button></header><div class="panel-body">${html}</div>`;this.updateMapPos();
  }
}
