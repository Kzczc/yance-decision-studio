/*
 * ZHIYAN pixel village — frontend scenario choreography, not an AI engine.
 * Terrain / building tiles: Kenney Tiny Town, CC0; see pixel-town-license.txt.
 * Palette adaptation, people, water, street furniture, animation and layout
 * are created for this product. Displayed counts refer to the current visual sample.
 */
(function () {
  'use strict';
  const W = 832, H = 448, TILE = 16;
  const MAPS = window.YanceMaps;
  const ASSET = new URL('assets/pixel-town-tiles.png', document.currentScript?.src || document.baseURI).href;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const fract = v => v - Math.floor(v);
  const rnd = n => fract(Math.sin(n * 127.1 + 311.7) * 43758.5453);
  const unit = v => clamp(Number(v) > 1 ? Number(v) / 100 : Number(v), 0, 1);
  const mix = (a, b, f) => a + (b - a) * f;
  const NAMES = ['林悦','陈予','许言','周宁','沈禾','苏晴','方洲','李可','顾安','赵然','吴桐','江月','叶青','唐棠','陆遥','温岚','韩雨','程旭','徐嘉','宋知','季川','何夏','蒋乐','白羽','郑一','邓澄','梁溪','余墨','王舒','秦越','冯晓','谢星'];
  const DEFAULT_SEGMENTS = [
    {name:'优惠导向新客',color:'#7895aa'}, {name:'品质导向新客',color:'#c7876f'},
    {name:'活跃会员',color:'#739b79'}, {name:'沉睡会员',color:'#adb96c'}
  ];
  const MODULE_SEGMENT_NAMES = {
    growth:['首次使用者','品质导向用户','活跃用户','回流用户'],
    merchant:DEFAULT_SEGMENTS.map(s=>s.name),
    public:['首次办理居民','流程关注居民','常办居民','低频居民']
  };
  const THEMES = {
    growth: { names:['用户研究站','创意工坊','产品体验中心','交流咖啡馆','灵感书屋','数据观察站'], primary:'体验中心', activity:'体验新功能', entered:'进入体验', done:'完成体验', browsing:'了解产品', offer:'体验邀请', speech:['这个功能不错','一起试试看','操作更顺手了','我想了解更多'], center:'产品体验中心', market:'创意展场' },
    merchant: { names:['街角咖啡馆','生活杂货铺','新品概念门店','手作面包房','独立书店','会员服务站'], primary:'概念门店', activity:'浏览新品', entered:'进店体验', done:'完成购买', browsing:'浏览新品', offer:'活动优惠', speech:['这里有新品','去店里看看','带一份回家','价格挺合适'], center:'新品概念门店', market:'周末集市' },
    public: { names:['便民咨询站','社区议事厅','社区服务中心','邻里活动室','共享阅读室','志愿者驿站'], primary:'服务中心', activity:'了解服务', entered:'进入服务点', done:'完成办理', browsing:'阅读服务指引', offer:'服务通知', speech:['这里可以咨询','指引很清楚','一起去服务站','办理好了'], center:'市民服务中心', market:'社区活动场' }
  };

  const XS = [32,216,384,440,672,792], YS = [32,192,228,272,420];
  const nodes = [], links = [];
  for (let j=0;j<YS.length;j++) for(let i=0;i<XS.length;i++) nodes.push({x:XS[i],y:YS[j]});
  const edges = nodes.map(()=>[]);
  function link(a,b){ edges[a].push(b);edges[b].push(a);links.push([a,b]); }
  for(let j=0;j<YS.length;j++) for(let i=0;i<XS.length;i++) {
    const n=j*XS.length+i;
    if(i<XS.length-1 && (i!==4 || j===2)) link(n,n+1);
    if(j<YS.length-1) link(n,n+XS.length);
  }
  const DOOR = nodes.length;
  nodes.push({x:544,y:176}); edges.push([]);
  const APPROACH = nodes.length;
  nodes.push({x:544,y:192}); edges.push([]);
  link(9,APPROACH);link(APPROACH,10);link(APPROACH,DOOR);
  const MOBILE_ACCESS=nodes.length;nodes.push({x:618,y:228});edges.push([]);
  const MOBILE=nodes.length;nodes.push({x:618,y:260});edges.push([]);
  const KIOSK_ACCESS=nodes.length;nodes.push({x:495,y:228});edges.push([]);
  const KIOSK=nodes.length;nodes.push({x:495,y:264});edges.push([]);
  link(15,KIOSK_ACCESS);link(KIOSK_ACCESS,MOBILE_ACCESS);link(MOBILE_ACCESS,16);link(MOBILE_ACCESS,MOBILE);link(KIOSK_ACCESS,KIOSK);
  const DESTINATIONS=[DOOR,MOBILE,KIOSK];
  function route(start,end) {
    const q=[start],prev={[start]:null};
    while(q.length){ const n=q.shift();if(n===end)break;for(const v of edges[n])if(!(v in prev)){prev[v]=n;q.push(v);} }
    const out=[end];while(prev[out[0]]!=null)out.unshift(prev[out[0]]);return out.map(i=>nodes[i]);
  }
  function pathAt(path,t) {
    const lengths=[];let total=0;
    for(let i=1;i<path.length;i++){const d=Math.hypot(path[i].x-path[i-1].x,path[i].y-path[i-1].y);lengths.push(d);total+=d;}
    let target=clamp(t,0,1)*total;
    for(let i=0;i<lengths.length;i++){
      if(target<=lengths[i]||i===lengths.length-1){const f=lengths[i]?target/lengths[i]:0;return{x:mix(path[i].x,path[i+1].x,f),y:mix(path[i].y,path[i+1].y,f),dx:path[i+1].x-path[i].x,dy:path[i+1].y-path[i].y};}target-=lengths[i];
    }return{...path[0],dx:0,dy:0};
  }
  function shade(hex, delta){
    if(!/^#[0-9a-f]{6}$/i.test(hex))return hex;
    return '#'+[1,3,5].map(i=>clamp(parseInt(hex.slice(i,i+2),16)+delta,0,255).toString(16).padStart(2,'0')).join('');
  }
  const BUILDINGS = [
    {x:64,y:64,w:128,rows:3,roof:'blue',index:0},
    {x:240,y:64,w:96,rows:3,roof:'red',index:1},
    {x:464,y:48,w:160,rows:5,roof:'red',index:2},
    {x:64,y:304,w:128,rows:3,roof:'red',index:3},
    {x:240,y:304,w:112,rows:3,roof:'blue',index:4},
    {x:464,y:304,w:160,rows:3,roof:'blue',index:5}
  ];
  // Interior lots vary by purpose. Street nodes and the primary entrance stay
  // fixed, so district design cannot invalidate the tested pedestrian routes.
  const DISTRICT_BUILDINGS = {
    growth:[BUILDINGS[0],{x:250,y:76,w:80,rows:2,index:1},BUILDINGS[2],{x:480,y:328,w:128,rows:2,index:5}],
    merchant:[BUILDINGS[0],{x:244,y:77,w:96,rows:2,roof:'red',index:1},BUILDINGS[2],BUILDINGS[4]],
    public:[{x:80,y:76,w:96,rows:2,index:0},{x:250,y:64,w:96,rows:2,index:1},BUILDINGS[2],{x:258,y:298,w:80,rows:2,index:4},{x:490,y:326,w:112,rows:2,index:5}]
  };
  const MAP_BUILDING_NAMES={
    'public-neighborhood':['邻里咨询站','活动室','社区服务站','社区食堂','阅读室'],
    'public-transit':['便民咨询站','社区议事厅','换乘大厅','候车服务点','便民窗口'],
    'public-oldtown':['老城咨询点','街巷议事厅','社区食堂','邻里活动室','小型服务点'],
    'growth-expo':['用户研究站','创意工坊','产品展厅','演示舞台','体验分区'],
    'growth-headquarters':['研发办公楼','运营中心','会议中心','员工餐厅','协作空间'],
    'growth-city':['沿街体验店','快闪空间','培训室','咨询店','用户交流点'],
    'merchant-highstreet':['咖啡馆','生活杂货铺','旗舰门店','手作面包房','配送中心'],
    'merchant-neighborhood':['早餐铺','生鲜店','邻里超市','取件点','社区便利店'],
    'merchant-night':['街角咖啡馆','生活杂货铺','餐饮摊位','夜市食堂','共享食集']
  };
  const buildingName=(mapId,module,index)=>MAP_BUILDING_NAMES[mapId]?.[index]||THEMES[module].names[index];

  class TownScene {
    constructor({canvas,onSelect,onTick,onCamera,onPan,environment='clear'}={}){
      if(!canvas?.getContext)throw new TypeError('TownScene requires a canvas.');
      this.canvas=canvas;this.viewCtx=canvas.getContext('2d');
      this.surface=document.createElement('canvas');this.surface.width=W;this.surface.height=H;
      this.ctx=this.surface.getContext('2d');
      this.background=document.createElement('canvas');this.background.width=W;this.background.height=H;
      this.onSelect=typeof onSelect==='function'?onSelect:()=>{};
      this.onTick=typeof onTick==='function'?onTick:()=>{};
      this.onCamera=typeof onCamera==='function'?onCamera:()=>{};
      this.onPan=typeof onPan==='function'?onPan:()=>{};
      this.options={module:'merchant',mapId:'merchant-riverside',segments:DEFAULT_SEGMENTS.map(s=>({...s})),scheme:'open',coupon:8,memberTarget:'all',coverage:1,memberShare:.4,weights:[35,25,25,15],duration:14,conversion:.18,count:32,groupRates:null,lighting:'auto',environment:'clear',context:'',layout:'street',facilities:'standard',flow:'steady',resourceActive:true,guideSteps:2,supportAgents:4};
      if(['clear','rain','autumn'].includes(environment))this.options.environment=environment;
      this._mapLabels=[];this._labels=[];
      this._progress=0;this._playing=!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      this._last=0;this._notifyAt=0;this._dirty=true;this._destroyed=false;this.speed=1;this.selected=null;this.following=false;this.positions=[];
      this._visible=true;this._zoom=1;this.panX=0;this.panY=0;this.raf=0;this._resizeRaf=0;this._drag=null;this._suppressClickUntil=0;
      this._metrics={agentBuilds:0,mapBuilds:0,resizes:0,frames:0,draws:0,notifications:0};
      this._originalTouchAction=canvas.style.touchAction;
      this._frame=this._frame.bind(this);
      this.tiles=new Image();this.tiles.onload=()=>{if(this._destroyed)return;this._prepareMap();this._schedule();};
      this.tiles.onerror=()=>{if(this._destroyed)return;this._prepareMap();this._schedule();};this.tiles.src=ASSET;
      this._makeAgents();this._prepareMap();
      this._onClick=e=>{if(performance.now()>=this._suppressClickUntil)this._selectAt(e);};
      this._onMove=e=>this._pointerMove(e);
      this._onDown=e=>this._pointerDown(e);this._onUp=e=>this._pointerUp(e);
      this.canvas.addEventListener('click',this._onClick);this.canvas.addEventListener('pointermove',this._onMove);
      this.canvas.addEventListener('pointerdown',this._onDown);this.canvas.addEventListener('pointerup',this._onUp);this.canvas.addEventListener('pointercancel',this._onUp);this.canvas.addEventListener('lostpointercapture',this._onUp);
      this.canvas.setAttribute('role','img');this.canvas.setAttribute('aria-label','俯视像素小镇，合成人物沿步道行动、交流和参与场景活动。点击人物可查看画像。');
      this._resize=()=>{if(this._destroyed||this._resizeRaf||!this._visible)return;this._resizeRaf=requestAnimationFrame(()=>{this._resizeRaf=0;this.resize();});};
      this._onVisibility=()=>{this._last=0;if(document.visibilityState==='hidden')this._cancelFrame();else if(this._visible){this.resize();this._dirty=true;this._notify();this._schedule();}};
      document.addEventListener('visibilitychange',this._onVisibility);
      if(typeof ResizeObserver!=='undefined'){this.observer=new ResizeObserver(this._resize);this.observer.observe(canvas);}else window.addEventListener('resize',this._resize);
      this.resize();this._notify();this._schedule();
    }
    get progress(){return this._progress;}
    get playing(){return this._playing;}
    get zoom(){return this._zoom;}
    get visible(){return this._visible;}
    getClock(){
      const hours=Math.min(this.options.duration*24-1/60,8+this._progress*(this.options.duration*24-8)),local=hours%24;
      const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
      const naturalNight=local<6?1:local<8?1-smooth((local-6)/2):local<17?0:local<20?smooth((local-17)/3):1;
      return{day:clamp(Math.floor(hours/24)+1,1,this.options.duration),hour:Math.floor(local),minute:Math.floor((local%1)*60+1e-7),phase:local>=6&&local<9?'晨间':local>=9&&local<17?'日间':local>=17&&local<20?'傍晚':'夜间',night:this.options.lighting==='day'?0:this.options.lighting==='night'?1:naturalNight};
    }
    _extraService(){return this.options.resourceActive&&this.options.coverage>0&&!(this.options.module==='growth'&&this.options.scheme==='member'&&this.options.supportAgents===0);}
    _isOpen(){const hour=this.getClock().hour;if(this.options.module==='public')return hour>=9&&hour<(this.options.scheme==='open'&&this._extraService()?21:18);if(this.options.module==='growth')return this.options.scheme==='member'&&this._extraService()?hour>=9&&hour<21:true;return hour>=8&&hour<22;}
    _personOpacity(a){
      if(a.id===this.selected)return 1;
      const clock=this.getClock(),hour=clock.hour+clock.minute/60,p=this._progress;
      if(a.visits&&p>=a.exposedAt&&p<a.purchaseAt)return 1;
      const end=this.options.module==='public'&&!(this.options.scheme==='open'&&this._extraService())?19:22;
      const activity=hour<6?.22:hour<8?.22+(hour-6)*.39:hour<end-2?1:hour<end?1-(hour-end+2)*.39:.22;
      return clamp((activity+.025-rnd(a.id+914))*40,0,1);
    }
    setOptions(o={}){
      const old=this.options;
      let weights=Array.isArray(o.weights)&&o.weights.length===4&&o.weights.every(n=>Number.isFinite(+n)&&+n>=0)&&o.weights.reduce((a,b)=>a+ +b,0)>0?o.weights.map(Number):old.weights;
      if(!o.weights&&o.memberShare!=null&&Number.isFinite(+o.memberShare)){const m=unit(o.memberShare);weights=[(1-m)*.6,(1-m)*.4,m*.68,m*.32];}
      let segments=old.segments;
      if(THEMES[o.module]&&o.module!==old.module&&!Array.isArray(o.segments))segments=MODULE_SEGMENT_NAMES[o.module].map((name,i)=>({name,color:DEFAULT_SEGMENTS[i].color}));
      if(Array.isArray(o.segments)&&o.segments.length===4)segments=o.segments.map((s,i)=>({name:typeof s==='string'?s:String(s.name||old.segments[i].name),color:typeof s==='object'&&/^#[0-9a-f]{6}$/i.test(s.color)?s.color:old.segments[i].color,id:typeof s==='object'?s.id:undefined,quote:typeof s==='object'&&typeof s.quote==='string'?s.quote:undefined}));
      this.options={
        module:THEMES[o.module]?o.module:old.module,segments,weights,
        scheme:['baseline','open','member'].includes(o.scheme)?o.scheme:old.scheme,
        coupon:o.coupon!=null&&Number.isFinite(+o.coupon)?clamp(+o.coupon,0,1000):old.coupon,
        memberTarget:['all','active','dormant'].includes(o.memberTarget)?o.memberTarget:old.memberTarget,
        coverage:o.coverage!=null&&Number.isFinite(+o.coverage)?unit(o.coverage):old.coverage,
        memberShare:(weights[2]+weights[3])/weights.reduce((a,b)=>a+b,0),
        duration:o.duration!=null&&Number.isFinite(+o.duration)?clamp(Math.round(+o.duration),1,365):old.duration,
        conversion:o.conversion!=null&&Number.isFinite(+o.conversion)?unit(o.conversion):old.conversion,
        count:o.count!=null&&Number.isFinite(+o.count)?clamp(Math.round(+o.count),8,128):old.count,
        groupRates:Array.isArray(o.groupRates)&&o.groupRates.length===4&&o.groupRates.every(n=>Number.isFinite(+n))?o.groupRates.map(n=>clamp(+n,0,1)):o.groupRates===null?null:old.groupRates,
        lighting:['auto','day','night'].includes(o.lighting)?o.lighting:old.lighting,
        environment:['clear','rain','autumn'].includes(o.environment)?o.environment:old.environment,
        context:typeof o.context==='string'?o.context.slice(0,120):old.context||'',mapId:MAPS.get(o.mapId||old.mapId,THEMES[o.module]?o.module:old.module).id,layout:['street','campus','square'].includes(o.layout)?o.layout:old.layout||'street',facilities:['standard','active','service'].includes(o.facilities)?o.facilities:old.facilities||'standard',flow:['steady','peak','spread'].includes(o.flow)?o.flow:old.flow||'steady',
        resourceActive:typeof o.resourceActive==='boolean'?o.resourceActive:old.resourceActive,
        guideSteps:o.guideSteps!=null&&Number.isFinite(+o.guideSteps)?clamp(Math.round(+o.guideSteps),1,5):old.guideSteps,
        supportAgents:o.supportAgents!=null&&Number.isFinite(+o.supportAgents)?clamp(Math.round(+o.supportAgents),0,50):old.supportAgents
      };
      const changed=JSON.stringify(old)!==JSON.stringify(this.options);
      const agentsChanged=old.module!==this.options.module||old.conversion!==this.options.conversion||old.count!==this.options.count||old.scheme!==this.options.scheme||old.duration!==this.options.duration||old.resourceActive!==this.options.resourceActive||old.facilities!==this.options.facilities||(old.coverage>0)!==(this.options.coverage>0)||(old.supportAgents>0)!==(this.options.supportAgents>0)||JSON.stringify(old.groupRates)!==JSON.stringify(this.options.groupRates)||JSON.stringify(old.weights)!==JSON.stringify(weights)||JSON.stringify(old.segments)!==JSON.stringify(segments);
      const mapChanged=old.mapId!==this.options.mapId;
      if(mapChanged)this._configureMap();
      if(agentsChanged||mapChanged||old.flow!==this.options.flow)this._makeAgents();if(old.module!==this.options.module||old.environment!==this.options.environment||old.layout!==this.options.layout||old.facilities!==this.options.facilities||mapChanged)this._prepareMap();
      const progressChanged=o.progress!=null&&Number.isFinite(+o.progress)&&clamp(+o.progress,0,1)!==this._progress;
      if(progressChanged){this._progress=clamp(+o.progress,0,1);this._last=0;if(this._progress===1)this._playing=false;}
      if(changed||progressChanged){this._dirty=true;this._notify();this._schedule();}
    }
    setPlaying(value){const next=!!value&&this._progress<1;if(next===this._playing)return;this._playing=next;this._last=0;this._dirty=true;this._notify();this._schedule();}
    setSpeed(value){this.speed=[1,2,4].includes(+value)?+value:1;}
    setProgress(value){if(!Number.isFinite(+value))return;const next=clamp(+value,0,1);if(next===this._progress)return;this._progress=next;this._last=0;if(this._progress===1)this._playing=false;this._dirty=true;this._notify();this._schedule();}
    reset(){this._progress=0;this._last=0;this._dirty=true;this._notify();this._schedule();}
    setVisible(value){const next=!!value;if(next===this._visible)return;this._visible=next;this._last=0;if(!next){this._cancelFrame();cancelAnimationFrame(this._resizeRaf);this._resizeRaf=0;this._pointerUp();}else{this.resize();this._dirty=true;this._notify();this._schedule();}this._debug();}
    getCamera(){return{zoom:this._zoom,panX:this.panX,panY:this.panY,canPan:this._zoom>1};}
    setZoom(value){this.setCamera({zoom:value});}
    resetCamera(){this.setCamera({zoom:1,panX:0,panY:0});}
    setCamera({zoom,panX,panY}={}){
      const before=this.getCamera();
      if(zoom!=null&&Number.isFinite(+zoom))this._zoom=clamp(+zoom,1,2.5);
      if(panX!=null&&Number.isFinite(+panX))this.panX=+panX;
      if(panY!=null&&Number.isFinite(+panY))this.panY=+panY;
      this._applyCamera();
      if(before.zoom!==this._zoom||before.panX!==this.panX||before.panY!==this.panY){this._dirty=true;this.onCamera(this.getCamera());this._schedule();}
    }
    _applyCamera(){
      if(!this.width)return;
      this.baseScale=Math.min(this.width/W,this.height/H);this.scale=this.baseScale*this._zoom;
      const maxX=Math.max(0,(W-this.width/this.scale)/2),maxY=Math.max(0,(H-this.height/this.scale)/2);
      this.panX=clamp(this.panX,-maxX,maxX);this.panY=clamp(this.panY,-maxY,maxY);
      this.offsetX=(this.width-W*this.scale)/2+this.panX*this.scale;this.offsetY=(this.height-H*this.scale)/2+this.panY*this.scale;
      this.canvas.style.touchAction=this._zoom>1?'none':this._originalTouchAction||'pan-y';
      this.canvas.style.cursor=this._zoom>1?'grab':'default';
    }
    resize(){
      if(this._destroyed||!this._visible)return;
      const r=this.canvas.getBoundingClientRect();if(r.width<=0||r.height<=0)return;
      const dpr=clamp(window.devicePixelRatio||1,1,3);
      if(this.width===r.width&&this.height===r.height&&this.dpr===dpr)return;
      this.width=r.width;this.height=r.height;this.dpr=dpr;
      const pixelW=Math.round(this.width*dpr),pixelH=Math.round(this.height*dpr);
      if(this.canvas.width!==pixelW)this.canvas.width=pixelW;if(this.canvas.height!==pixelH)this.canvas.height=pixelH;
      this._metrics.resizes++;this._applyCamera();this._dirty=true;this.onCamera(this.getCamera());this._schedule();
    }
    destroy(){this._destroyed=true;this._cancelFrame();cancelAnimationFrame(this._resizeRaf);this._pointerUp();this.observer?.disconnect();window.removeEventListener('resize',this._resize);document.removeEventListener('visibilitychange',this._onVisibility);this.canvas.removeEventListener('click',this._onClick);this.canvas.removeEventListener('pointermove',this._onMove);this.canvas.removeEventListener('pointerdown',this._onDown);this.canvas.removeEventListener('pointerup',this._onUp);this.canvas.removeEventListener('pointercancel',this._onUp);this.canvas.removeEventListener('lostpointercapture',this._onUp);this.canvas.style.touchAction=this._originalTouchAction;}
    selectAgent(id){const a=this.agents.find(a=>String(a.id)===String(id));if(a){this.selected=a.id;this._dirty=true;if(this._canRender())this.onSelect(this._profile(a));this._schedule();}}
    focusAgent(id){const a=this.agents.find(a=>String(a.id)===String(id));if(!a)return;this.selectAgent(id);const p=this._agentPosition(a);this.setCamera({zoom:Math.max(1.55,this.zoom),panX:W/2-p.x,panY:H/2-p.y});}
    setFollowing(value){this.following=!!value&&this.selected!=null;if(this.following)this._trackSelected();}
    _trackSelected(){
      const a=this.agents.find(agent=>agent.id===this.selected);if(!a)return;
      const p=this._agentPosition(a),before=this.getCamera();this._zoom=Math.max(1.55,this._zoom);this.panX=W/2-p.x;this.panY=H/2-p.y;this._applyCamera();
      if(before.zoom!==this._zoom||before.panX!==this.panX||before.panY!==this.panY){this._dirty=true;this._schedule();}
    }
    _configureMap(){
      const map=MAPS.get(this.options.mapId,this.options.module),xs=map.xs||XS,ys=map.ys||YS;
      for(let j=0;j<ys.length;j++)for(let i=0;i<xs.length;i++){const n=j*xs.length+i;nodes[n].x=xs[i];nodes[n].y=ys[j];}
      links.length=0;edges.forEach(list=>list.length=0);
      for(let j=0;j<ys.length;j++)for(let i=0;i<xs.length;i++){
        const n=j*xs.length+i;
        const horizontal=map.pattern==='cross'?j===2||i===1||i===3:map.pattern==='loop'?j===0||j===2||j===4:map.pattern==='alleys'?j===2||(i+j)%2===0:true;
        if(i<xs.length-1&&horizontal&&(!map.river||i!==4||j===2))link(n,n+1);
        const vertical=map.pattern==='loop'?i===0||i===4||i===5||j===1||j===2:map.pattern==='lanes'?i%2===0||i===5||j===1:true;
        if(j<ys.length-1&&vertical)link(n,n+xs.length);
      }
      if(map.pattern==='alleys'){link(7,14);link(15,22);}
      const door=map.primary||[544,176];nodes[DOOR]={x:door[0],y:door[1]};nodes[APPROACH]={x:door[0],y:ys[1]};
      const nearest=xs.slice(0,5).map((x,i)=>({i,d:Math.abs(x-door[0])})).sort((a,b)=>a.d-b.d)[0].i;
      link(xs.length+nearest,APPROACH);link(APPROACH,DOOR);
      nodes[MOBILE_ACCESS]={x:xs[4]-48,y:ys[2]};nodes[MOBILE]={x:xs[4]-48,y:ys[2]+32};
      nodes[KIOSK_ACCESS]={x:xs[3]+42,y:ys[2]};nodes[KIOSK]={x:xs[3]+42,y:ys[2]+32};
      link(2*xs.length+3,KIOSK_ACCESS);link(KIOSK_ACCESS,MOBILE_ACCESS);link(MOBILE_ACCESS,2*xs.length+4);link(MOBILE_ACCESS,MOBILE);link(KIOSK_ACCESS,KIOSK);
    }
    project(x,y,z=0){return{x,y:y-z};}
    _eventPoint(e){const r=this.canvas.getBoundingClientRect();return{x:(e.clientX-r.left)/(r.width||1)*(this.width||r.width),y:(e.clientY-r.top)/(r.height||1)*(this.height||r.height)};}
    _hitAt(p){let best=null,distance=Infinity;for(const a of this.positions){const d=Math.hypot(a.screenX-p.x,a.screenY-p.y-9*this.scale);if(d<Math.max(14,13*this.scale)&&d<distance){best=a;distance=d;}}return best;}
    _selectAt(e){const best=this._hitAt(this._eventPoint(e));if(best)this.selectAgent(best.id);}
    _pointerDown(e){if(this._zoom<=1||e.isPrimary===false||(e.button!=null&&e.button!==0))return;this._drag={id:e.pointerId,x:e.clientX,y:e.clientY,panX:this.panX,panY:this.panY,moved:false};try{this.canvas.setPointerCapture(e.pointerId);}catch{}this.canvas.style.cursor='grabbing';}
    _pointerMove(e){
      if(this._drag&&e.pointerId===this._drag.id){const dx=e.clientX-this._drag.x,dy=e.clientY-this._drag.y;if(Math.hypot(dx,dy)>4)this._drag.moved=true;if(this._drag.moved){if(this.following){this.following=false;this.onPan()}const r=this.canvas.getBoundingClientRect();this.setCamera({panX:this._drag.panX+dx*(this.width/(r.width||1))/this.scale,panY:this._drag.panY+dy*(this.height/(r.height||1))/this.scale});this.canvas.style.cursor='grabbing';}return;}
      this.canvas.style.cursor=this._hitAt(this._eventPoint(e))?'pointer':this._zoom>1?'grab':'default';
    }
    _pointerUp(e){if(!this._drag||(e&&e.pointerId!==this._drag.id))return;const drag=this._drag;this._drag=null;if(drag.moved)this._suppressClickUntil=performance.now()+400;try{if(this.canvas.hasPointerCapture?.(drag.id))this.canvas.releasePointerCapture(drag.id);}catch{}this.canvas.style.cursor=this._zoom>1?'grab':'default';}
    _makeAgents(){
      this._metrics.agentBuilds++;
      // Weighted prefix allocation keeps existing identities in the same group as
      // the displayed sample grows or shrinks, without shuffling the whole town.
      const total=this.options.weights.reduce((a,b)=>a+b,0),counts=[0,0,0,0],types=[];
      for(let i=0;i<this.options.count;i++){let type=0,best=-Infinity;for(let g=0;g<4;g++){const need=(i+1)*this.options.weights[g]/total-counts[g];if(need>best){best=need;type=g;}}types.push(type);counts[type]++;}
      const ranks=[0,1,2,3].map(g=>types.map((t,i)=>t===g?i:-1).filter(i=>i>=0).sort((a,b)=>rnd(a+60)-rnd(b+60)));
      const rates=this.options.groupRates||[0,1,2,3].map(()=>this.options.conversion);
      const purchases=counts.map((n,g)=>Math.round(n*rates[g])),visits=counts.map((n,g)=>Math.max(purchases[g],Math.round(n*Math.min(.94,.27+rates[g]*1.4))));
      this.agents=Array.from({length:this.options.count},(_,i)=>{
        const type=types[i],start=Math.floor(rnd(i+4)*30),end=Math.floor(rnd(i+24)*30),walk=[nodes[start]];
        const strategyDestination=this._extraService()&&this.options.module==='public'&&this.options.scheme==='member'&&(type>=2||rnd(i+38)>.5)?MOBILE:this._extraService()&&this.options.module==='growth'&&this.options.scheme==='member'?KIOSK:DOOR;
        const destination=strategyDestination!==DOOR?strategyDestination:this.options.facilities==='service'&&i%4===0?MOBILE:this.options.facilities==='active'&&i%3===0?KIOSK:DOOR;
        let current=start,last=-1;
        for(let s=0;s<35;s++){let possible=edges[current].filter(n=>n!==last&&!DESTINATIONS.includes(n));if(!possible.length)possible=edges[current].filter(n=>!DESTINATIONS.includes(n));const next=possible[Math.floor(rnd(i*41+s+830)*possible.length)];walk.push(nodes[next]);last=current;current=next;}
        const incoming=route(start,destination);if(incoming.length>1){const f=.15+rnd(i+813)*.65;incoming[0]={x:mix(incoming[0].x,incoming[1].x,f),y:mix(incoming[0].y,incoming[1].y,f)};}
        const lastDay=Math.max(0,this.options.duration-1),day=Math.floor(rnd(i+320)*(lastDay+1)),extended=this.options.module==='public'&&this.options.scheme==='open'&&this._extraService();
        const selfService=this.options.module==='growth'&&(this.options.scheme!=='member'||!this._extraService());
        const opening=selfService?0:this.options.module==='merchant'?8:9,closing=selfService?24:this.options.module==='merchant'?22:extended||this.options.module==='growth'?21:18;
        // Work in absolute business hours first. Clamping normalized progress can
        // push late-period visits into the preceding night on long studies.
        const peak=this.options.flow==='peak',spread=this.options.flow==='spread';
        const windowStart=Math.max(8.1,day*24+(extended&&type===1?18:opening)+(peak?3:0)),windowEnd=day*24+closing-.08-(peak?2:0);
        const dwell=.45+rnd(i+803)*1.15,available=Math.max(0,windowEnd-windowStart-dwell-.24),arrival=peak?rnd(i+401)*Math.max(.5,available*.28):spread?rnd(i+401)*available:fract((i+1)*.61803398875)*available,visitHour=windowStart+.12+arrival,completionHour=visitHour+dwell;
        const span=this.options.duration*24-8,visitAt=(visitHour-8)/span,purchaseAt=(completionHour-8)/span,exposedAt=Math.max(0,(visitHour-8-(1+rnd(i+43)*2))/span);
        const groupRank=ranks[type].indexOf(i);
        return{id:i+1,name:NAMES[i%NAMES.length]+(i>=NAMES.length?' '+(Math.floor(i/NAMES.length)+1):''),segmentIndex:type,segment:this.options.segments[type].name,member:type>=2,coat:shade(this.options.segments[type].color,[0,-10,9][i%3]),skin:['#EDC69A','#CCA07C','#E1B28B','#B98D70'][i%4],hair:['#574D44','#8A6849','#434D4A','#6F5549'][i%4],phase:rnd(i+520),lane:((i*3)%7-3)*1.7,exposedAt,visitAt,purchaseAt,visits:groupRank<visits[type],buys:groupRank<purchases[type],destination,incoming,outgoing:route(destination,end),walk};
      });
      if(this.selected!=null&&!this.agents.some(a=>a.id===this.selected)){this.selected=null;this.onSelect(null);}
      this.canvas.setAttribute('aria-label',`俯视像素小镇，${this.agents.length} 位合成人物沿步道行动。点击人物可查看画像。`);
    }
    _agentPosition(a){
      const p=this._progress;if(!a.visits)return pathAt(a.walk,fract(p*1.3+a.phase));
      if(p<=a.visitAt)return pathAt(a.incoming,p/a.visitAt);
      if(p<=a.purchaseAt){const queue=this.agents.filter(b=>b.visits&&b.destination===a.destination&&p>=b.visitAt&&p<b.purchaseAt).sort((u,v)=>u.visitAt-v.visitAt),index=queue.findIndex(b=>b.id===a.id);return{...nodes[a.destination],x:nodes[a.destination].x+(index%2)*8-4,y:nodes[a.destination].y+Math.floor(index/2)*9+4,dx:0,dy:0};}
      return pathAt(a.outgoing,clamp((p-a.purchaseAt)/(1-a.purchaseAt),0,1));
    }
    _couponAvailable(a){
      if(this.options.coupon<=0||this.options.scheme==='baseline')return false;
      const targeted=this.options.scheme==='open'||(a.member&&(this.options.memberTarget==='all'||(this.options.memberTarget==='active'&&a.segmentIndex===2)||(this.options.memberTarget==='dormant'&&a.segmentIndex===3)));
      return targeted&&rnd(a.id+923)<this.options.coverage;
    }
    _profile(a){
      const t=THEMES[this.options.module],p=this._progress,arrived=a.visits&&p>=a.visitAt,done=a.buys&&p>=a.purchaseAt;
      let status=p<a.exposedAt?'街区漫步':t.browsing;if(arrived)status=p<a.purchaseAt?t.entered:done?t.done:'与同伴交流';
      const available=this._couponAvailable(a);
      let quotes;
      if(this.options.module==='public')quotes=['我想先看清楚办理条件和需要准备的材料。','如果指引更清楚，第一次来就容易找到办理窗口。','熟悉这里，希望预约和现场服务能衔接顺畅。','邻居提到了这项服务，我来了解是否适合自己。'];
      else if(this.options.module==='growth')quotes=['我希望用更少的步骤完成目标，先试一下新流程。','我会注意信息是否清楚，以及体验是否流畅。','经常使用这个产品，熟悉的功能最好容易找到。','有段时间没用了，这次改进让我想再试一试。'];
      else quotes=[available?`如果能直接减 ${this.options.coupon} 元，我愿意了解这款新品。`:'我会比较到手价格，再决定是否购买。','我更关注材质、使用体验和售后服务。',available?(this.options.scheme==='member'?'熟悉这个品牌，会员权益让我更愿意尝试新品。':'熟悉这个品牌，这次优惠让我更愿意尝试新品。'):'之前体验不错，新品是否值得买还想再看看。',available?'有段时间没来了，这次活动让我想重新了解一下。':'我还在观望，需要一个合适的理由再次到店。'];
      const complete=this.options.module==='public'?'已完成本次样例办理，服务满意度仍需实际回访。':this.options.module==='growth'?'已完成本次样例体验，持续使用意愿仍需真实测试。':'已完成本次样例购买，后续复购仍需真实测试。';
      if(arrived&&p<a.purchaseAt)status=a.destination===MOBILE?(this.options.facilities==='service'?'在增设服务点':'在流动服务点办理'):a.destination===KIOSK?(this.options.facilities==='active'?'参与现场活动':'与顾问交流'):t.entered;
      const closed=!this._isOpen()&&!(arrived&&p<a.purchaseAt);if(closed&&!done)status='等候下一开放时段';
      const closedQuote=this.options.module==='public'?'当前窗口已经休息，我会在下一开放时段再来。':this.options.module==='growth'?'顾问当前不在线，我先查看自助指引。':'门店已经打烊，等营业后再来看看。';
      const map=MAPS.get(this.options.mapId,this.options.module),destination=a.destination===MOBILE?(this.options.facilities==='service'?'增设服务点':'流动服务点'):a.destination===KIOSK?(this.options.facilities==='active'?'活动与交流区':'顾问工作站'):map.features[0];
      return{id:a.id,name:a.name,segment:a.segment,segmentIndex:a.segmentIndex,member:a.member,status,quote:done?complete:closed?closedQuote:(this.options.segments[a.segmentIndex].quote||quotes[a.segmentIndex]),destination};
    }
    getSnapshot(){
      const p=this._progress,clock=this.getClock();
      const groups=[0,1,2,3].map(g=>{const sample=this.agents.filter(a=>a.segmentIndex===g);return{size:sample.length,exposed:sample.filter(a=>p>=a.exposedAt).length,visits:sample.filter(a=>a.visits&&p>=a.visitAt).length,completed:sample.filter(a=>a.buys&&p>=a.purchaseAt).length};});
      const visitors=groups.reduce((n,g)=>n+g.exposed,0),visits=groups.reduce((n,g)=>n+g.visits,0),purchases=groups.reduce((n,g)=>n+g.completed,0),queued=this.agents.filter(a=>a.visits&&p>=a.visitAt&&p<a.purchaseAt).length;
      return{progress:p,day:clock.day,clock,agentCount:this.agents.length,visibleCount:this.agents.filter(a=>this._personOpacity(a)>.1).length,visitors,visits,purchases,counts:{exposed:visitors,visiting:visits,completed:purchases,queued,groups}};
    }
    _notify(){
      if(!this._canRender())return;this._metrics.notifications++;this._counts=this.getSnapshot();
      if(this.selected!=null){const selected=this.agents.find(a=>a.id===this.selected);if(selected)this.onSelect(this._profile(selected));}this.onTick(this._counts);
    }
    _canRender(){return !this._destroyed&&this._visible&&document.visibilityState!=='hidden'&&this.width>0&&this.height>0;}
    _schedule(){if(!this.raf&&this._canRender()&&(this._dirty||this._playing))this.raf=requestAnimationFrame(this._frame);}
    _cancelFrame(){cancelAnimationFrame(this.raf);this.raf=0;}
    _frame(time){
      this.raf=0;if(!this._canRender()){this._last=0;return;}this._metrics.frames++;const dt=this._last?Math.min((time-this._last)/1000,.06):0;this._last=time;
      let ended=false;if(this._playing){this._progress=clamp(this._progress+dt*this.speed/(this.options.duration*5),0,1);if(this._progress>=1){this._playing=false;ended=true;}this._dirty=true;}if(this.following)this._trackSelected();
      if(this._dirty){this.draw();this._dirty=false;}if(ended||(this._playing&&time-this._notifyAt>200)){this._notifyAt=time;this._notify();}if(!this._playing)this._last=0;this._schedule();
    }
    rect(x,y,w,h,color){this.ctx.fillStyle=color;this.ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
    _tile(id,x,y,size=16){
      if(this.tiles.complete&&this.tiles.naturalWidth)this.ctx.drawImage(this.tiles,(id%12)*16,Math.floor(id/12)*16,16,16,Math.round(x),Math.round(y),size,size);
      else this.rect(x,y,size,size,id<12?'#90B872':id<44?'#DDBF8F':id<72?'#8395A9':'#CFB68E');
    }
    _prepareMap(){
      this._metrics.mapBuilds++;
      this._mapLabels=[];this._mapLights=[];this._mapPreparing=true;
      const old=this.ctx;this.ctx=this.background.getContext('2d');this.ctx.imageSmoothingEnabled=false;
      for(let y=0;y<H;y+=16)for(let x=0;x<W;x+=16){const r=rnd(x*2+y*7);this._tile(r>.94?1:0,x,y);}
      const module=this.options.module;
      // Every district shares the accessible pedestrian graph, but its materials,
      // silhouettes and public spaces belong to a different part of the city.
      this.rect(0,0,W,H,module==='growth'?'#D6E4DF66':module==='public'?'#DCE4CF42':'#F0E3BD25');
      if(this.options.layout==='campus')this.rect(34,36,652,370,'#91B29B16');
      if(this.options.layout==='square'){this._court(212,146,230,136);this.rect(222,156,210,116,'#F1E7CE70');}
      if(this.options.environment==='autumn')this.rect(0,0,W,H,'#E5CF9850');
      if(this.options.environment==='rain')this.rect(0,0,W,H,'#819AA62D');
      const map=MAPS.get(this.options.mapId,module);
      if(!map.legacy){this._alternativeMap(map);this._mapPreparing=false;this.ctx=old;this._dirty=true;return;}
      // Pedestrian network. No agent crosses water except on the wooden bridge.
      for(const [a,b]of links){if(a===DOOR||b===DOOR)continue;const p=nodes[a],q=nodes[b];if((p.x<752&&q.x>704)||(q.x<752&&p.x>704))continue;const major=p.y===228&&q.y===228||p.x===384&&q.x===384;this._path(p.x,p.y,q.x,q.y,(major?32:18)+(this.options.layout==='square'&&major?8:0));}
      this._path(544,160,544,192,24);
      for(const [x,y,w,h]of[[58,143,142,30],[456,157,178,32],[457,386,176,22]])this._court(x,y,w,h);
      this._river();this._bridge();
      this._districtGround();
      this._flowerbed(475,283,44,12);this._flowerbed(535,282,52,12);
      this._flowerbed(248,167,72,13);this._flowerbed(82,45,81,10);
      this._flowerbed(745,301,45,12);this._flowerbed(637,365,26,18);
      this._buildings=DISTRICT_BUILDINGS[module];this._buildings.forEach(b=>this._building(b));
      this._districtLots();
      if(this.options.facilities!=='standard')this._scenarioFacilities();
      const trees=[[16,60,1],[10,120,1],[23,160,0],[21,320,1],[8,374,1],[61,21,0],[163,14,1],[296,12,0],[429,10,1],[635,14,0],[672,65,1],[654,123,0],[673,155,1],[667,310,1],[653,391,0],[764,30,1],[783,74,1],[755,114,0],[798,147,1],[758,283,1],[802,334,1],[762,374,0],[787,399,1],[18,432,0],[117,429,0],[305,429,0],[505,430,1],[613,430,0],[353,91,0],[351,334,0]];
      for(const tree of trees)this._tree(...tree);
      for(const [x,y]of[[260,250],[97,177],[593,254],[741,264],[338,174]])this._bench(x,y);
      for(const [x,y]of[[360,169],[420,251],[639,173],[48,247],[216,404]])this._lamp(x,y);
      this._districtDetails();
      this._mailbox(410,123);this._notice(410,319);this._notice(193,253);
      this._sign(543,29,THEMES[module].center,module==='growth'?'#456672':module==='public'?'#466A5D':'#775B4B','#FAF4E4');
      this._bicycle(648,247);this._bicycle(642,265);
      for(let i=0;i<18;i++){const y=17+i*23;this.rect(699+(i%2)*3,y,2,6,'#718C69');this.rect(703,y-2,2,8,'#ACC180');if(i%3===0){this.rect(739,y+6,6,2,'#7EA884');this.rect(741,y+4,3,5,'#88B48D');}}
      this._seasonGround();
      this._mapPreparing=false;this.ctx=old;this._dirty=true;
    }
    _alternativeMap(map){
      const xs=map.xs,ys=map.ys,module=this.options.module;
      const accent=module==='public'?'#b8cba9':module==='growth'?'#afcbc5':'#d9c7a4';
      if(map.pattern==='alleys'){
        this._court(xs[1]+12,ys[1]+12,96,71);this._court(xs[2]+18,ys[2]+17,93,65);
        this.rect(xs[1]+21,ys[1]+21,77,52,accent);this.rect(xs[2]+27,ys[2]+26,75,47,'#bfd2af');
      }else if(map.pattern==='lanes'){
        this._court(xs[1]+10,ys[1]+19,xs[4]-xs[1]-35,57);
        this.rect(xs[1]+19,ys[1]+26,xs[4]-xs[1]-53,43,accent);
      }else{
        this._court(xs[1]+12,ys[1]+12,Math.max(70,xs[3]-xs[1]-26),Math.max(36,ys[3]-ys[1]-24));
        this.rect(xs[1]+18,ys[1]+18,Math.max(58,xs[3]-xs[1]-38),Math.max(24,ys[3]-ys[1]-36),accent);
      }
      if(map.id.includes('transit')){for(let x=67;x<650;x+=62){this.rect(x,350,39,8,'#779b99');this.rect(x+3,353,33,2,'#dce4d6');}this._sign(353,382,'换乘站台');}
      if(map.id.includes('night')){for(let x=70;x<640;x+=57){this._lamp(x,279);this.rect(x,187,2,11,'#6f715b');this.rect(x-5,198,11,8,'#e3b475');this.rect(x-3,200,7,4,'#ffe3a8');}this.rect(65,278,550,7,'#b59874');this.rect(67,187,572,2,'#826c57');}
      if(map.id.includes('expo')){this._court(244,285,120,48);this.rect(262,295,85,24,'#668e94');this._sign(305,327,'演示舞台');}
      if(map.id.includes('headquarters')){this.rect(246,261,112,68,'#96b58d');this._flowerbed(264,281,76,22);this._sign(302,329,'中央草坪');}
      if(map.id.includes('oldtown')||map.id.includes('neighborhood')){this._flowerbed(259,267,74,31);this._pergola(252,293,92,17);}
      if(map.id.includes('highstreet')||map.id.includes('city')){for(let x=74;x<620;x+=64)this._table(x,287);}
      for(const [a,b]of links){if([DOOR,MOBILE,KIOSK].includes(a)||[DOOR,MOBILE,KIOSK].includes(b))continue;const p=nodes[a],q=nodes[b];if(map.river&&(p.x<704&&q.x>704||q.x<704&&p.x>704))continue;const width=map.pattern==='cross'&&p.y===ys[2]?31:17;if(p.x!==q.x&&p.y!==q.y)this._diagonalPath(p,q,width);else this._path(p.x,p.y,q.x,q.y,width);}
      this._path(nodes[APPROACH].x,nodes[APPROACH].y,nodes[DOOR].x,nodes[DOOR].y,20);
      if(map.river){this._river();this._bridge();}
      this._buildings=map.buildings.map(([index,x,y,w,rows])=>({index,x,y,w,rows,roof:index%2?'red':'blue'}));
      this._buildings.forEach(b=>this._building(b));
      for(const [x,y]of[[70,270],[150,280],[380,287],[600,275],[72,395],[370,390]])this._tree(x,y,0);
      for(const [x,y]of[[85,280],[360,277],[590,286]])this._bench(x,y);
      if(module==='merchant'){for(const x of[86,160,245,333])this._market(x,299);}
      if(module==='growth'){this._glassPavilion(83,304,72,39);this._collaborationBooth(261,312);}
      if(module==='public'){this._accessibleLane(384,281,11,47);this._fountainBase(300,286);}
      if(this.options.facilities==='active'){const point=nodes[KIOSK];for(const x of[point.x-55,point.x,point.x+55])this._table(x,point.y+42);this._sign(point.x,point.y+64,'活动与交流区');}
      if(this.options.facilities==='service'){const point=nodes[MOBILE];for(const x of[point.x-95,point.x-35,point.x+25]){this._pergola(x,point.y+34,50,23);this._bench(x+9,point.y+61);}this._sign(point.x,point.y+72,'增设服务点');}
      this._sign(392,267,map.features[1]);this._sign(560,135,map.features[0]);
    }
    _scenarioFacilities(){
      if(this.options.facilities==='active'){
        const point=nodes[KIOSK];this._bench(point.x-31,point.y+5);this._table(point.x+9,point.y+5);this._flowerbed(point.x-50,point.y+25,38,12);this._sign(point.x,point.y+35,'活动与交流区','#E8EBDD','#526F68');
      }else{
        const point=nodes[MOBILE];this._bench(point.x-25,point.y+6);this._accessibleLane(point.x+25,point.y-12,12,52);this._sign(point.x,point.y+34,'增设服务点','#E7EDE2','#526F68');
      }
    }
    _districtGround(){
      const module=this.options.module;
      if(module==='growth'){
        this._court(240,236,111,29);
        for(let x=251;x<350;x+=12)this.rect(x,241,1,18,'#9DB3AB');
        this.rect(284,240,45,21,'#91AAA0');this.rect(288,243,37,15,'#BACDC3');
        this.rect(58,58,140,83,'#A9BFB2');this.rect(234,58,110,82,'#A9BFB2');
        // Running ribbon along the riverbank, kept separate from the footpath.
        this.rect(762,5,14,194,'#A3BDB4');this.rect(762,255,14,181,'#A3BDB4');
        for(let y=12;y<438;y+=16)if(y<200||y>252)this.rect(768,y,2,6,'#DDE7D8');
      }else if(module==='public'){
        this._court(236,234,116,30);this.rect(277,240,60,21,'#E2DFCB');
        for(let x=245;x<350;x+=16)this.rect(x,238,2,24,'#C6CCB6');
        // An open civic forecourt and a small community growing garden.
        this._court(457,150,176,32);this.rect(462,155,166,2,'#A9B9A3');
        this._court(538,240,45,27);this.rect(541,243,39,21,'#A3BA90');
        for(let y=246;y<263;y+=7){this.rect(545,y,30,3,'#8D775C');for(let x=547;x<573;x+=7)this.rect(x,y-2,3,3,'#779B69');}
        this.rect(759,11,19,185,'#C9C8AE');this.rect(759,257,19,176,'#C9C8AE');
        for(let y=13;y<433;y+=8)if(y<199||y>253)this.rect(760,y,17,1,'#B1B39A');
      }else{
        this._court(239,236,111,29);this.rect(240,241,110,2,'#AF9A7A');this.rect(240,261,110,2,'#AF9A7A');
        this._court(465,241,124,27);
        this.rect(759,9,21,190,'#C3AC85');this.rect(759,253,21,184,'#C3AC85');
        for(let y=11;y<438;y+=7)if(y<200||y>251)this.rect(760,y,19,2,'#D7C49F');
        for(const y of[86,328]){this.rect(705,y,32,18,'#93765A');for(let x=707;x<738;x+=5)this.rect(x,y+2,3,14,'#CDB58B');}
      }
    }
    _districtDetails(){
      const module=this.options.module;
      if(module==='growth'){
        // An innovation campus: solar roofs, an outdoor workspace and a small
        // geometric sculpture make the district recognizable at a glance.
        this.rect(301,250,17,8,'#899E98');this.rect(303,246,13,6,'#CFD9D0');
        this.rect(306,231,7,17,'#688D95');this.rect(297,230,24,6,'#AACBC8');this.rect(307,223,7,7,'#DCE7D7');
        this._pergola(540,243,43,20);this._table(550,256);
        this._table(82,172);this._table(168,174);this._flowerbed(249,284,38,9);
        this._sign(558,282,'开放交流区','#DCE9E6','#456672');
        for(let x=252;x<330;x+=21){this.rect(x,151,13,8,'#526E76');this.rect(x+2,152,9,4,'#C1D8D2');this.rect(x+5,159,3,3,'#6E857B');}
      }else if(module==='public'){
        this._fountainBase(308,251);this._bench(249,282);
        this.rect(570,242,13,19,'#91A383');this.rect(568,239,17,4,'#697F68');this.rect(572,245,9,10,'#EFE3C3');
        for(let i=0;i<4;i++)this.rect(573+i*2,247,1,6,['#AC8970','#719E9E','#CDB474','#8DA16F'][i]);
        this._sign(558,282,'邻里共享花园','#E5ECD7','#506D58');
        // Permeable shade and a ramp alongside the main service hall.
        for(let x=592;x<624;x+=6)this.rect(x,171,2,9,'#C4CDB5');
      }else{
        this._fountainBase(308,251);this._market(470,245);this._market(539,245);
        this._table(74,172);this._table(162,174);this._table(182,284);
        this._fence(237,399,112);this._fence(470,276,144);
        this._sign(527,283,'河畔周末集市','#EFE0C0','#795F47');
        this._boat(728,118,'#C8A780');this._boat(720,349,'#849F99');
        // A string of square paper lanterns follows the market frontage.
        this.rect(472,239,116,1,'#7D8064');for(let x=478;x<590;x+=22){this.rect(x,240,1,4,'#8B8065');this.rect(x-3,244,7,6,'#E0BA7E');this.rect(x-2,245,5,3,'#F3D7A0');}
      }
    }
    _districtLots(){
      // All furniture remains inside the lots bounded by the route network.
      // Large open spaces give each district a different rhythm, rather than
      // decorating six identical building footprints.
      if(this.options.module==='growth'){
        this.rect(56,291,141,114,'#B9CCBE');this.rect(59,294,135,108,'#DFE5D5');
        this.rect(115,333,27,42,'#769DA3');this.rect(118,335,21,37,'#B6D2CD');
        for(let y=339;y<371;y+=7)this.rect(118,y,21,1,'#E1EBDA');
        this._glassPavilion(63,300,91,45);this._glassPavilion(120,356,72,36);
        this.rect(66,357,36,32,'#9AB38F');this.rect(70,361,28,24,'#C8D4AE');
        this._table(79,373);this._tree(168,301,0);this._sign(120,399,'协作玻璃院','#E7EFE5','#48656C');
        this.rect(238,294,116,107,'#AABCAE');this.rect(241,297,110,101,'#DAE1D0');
        for(const x of[247,282,317])this._collaborationBooth(x,303);
        this.rect(249,344,94,2,'#A9BBB0');this.rect(249,383,94,2,'#A9BBB0');
        for(let i=0;i<3;i++){
          const x=249+i*33;this.rect(x,354,26,24,'#C5D3C4');this.rect(x+5,350,16,12,'#5B7E88');this.rect(x+7,352,12,7,'#B6D7D0');this.rect(x+11,362,3,6,'#718A82');this.rect(x+7,368,12,2,'#8BA394');
        }
        this._sign(296,395,'开放测试庭院','#E7EFE5','#48656C');
      }else if(this.options.module==='public'){
        this.rect(56,293,142,112,'#B5C69E');this.rect(59,296,136,106,'#D4DDC0');
        this._accessibleLane(121,283,11,128);this._accessibleLane(60,341,133,10);
        this._pergola(66,301,117,21);this._bench(76,323);this._bench(148,323);
        this._tree(63,356,0);this._tree(165,359,0);
        this.rect(87,367,24,15,'#9CAF91');this.rect(90,369,18,11,'#ABCDD0');this.rect(93,372,10,2,'#DAE6CB');
        this.rect(141,362,15,29,'#AC9878');this.rect(144,365,9,23,'#E3DABD');
        for(let y=368;y<385;y+=6)this.rect(145,y,7,3,'#89A49A');
        this._bench(72,390);this._bench(150,390);this._sign(126,398,'树荫阅读花园','#EDF0DE','#526F5E');
        this.rect(242,374,108,29,'#D9DFC7');this._accessibleLane(290,369,11,43);
        this._bench(247,382);this._bench(317,382);this.rect(278,379,5,15,'#B6C39E');this.rect(306,379,5,15,'#B6C39E');
        // Meeting steps face the community hall without filling the whole lot.
        this.rect(252,146,91,7,'#CAD1B6');this.rect(258,153,79,6,'#DEE1C8');this.rect(264,159,67,5,'#B3C0A1');
      }else{
        this.rect(56,292,143,114,'#B4A087');this.rect(59,295,137,108,'#E1CEAA');
        this.rect(119,296,16,105,'#EDE0BF');this.rect(60,341,135,11,'#EDE0BF');
        for(const [x,y]of[[66,307],[143,307],[66,363],[143,363]])this._market(x,y);
        // A clear cross-aisle and crate corners distinguish
        // this open market from the enclosed shops elsewhere in the district.
        this._crate(62,391);this._crate(184,391);
        this._sign(126,399,'手作与花果市集','#FAF0DA','#795F47');
        this._serviceDepot();
      }
    }
    _glassPavilion(x,y,w,h){
      this.rect(x+4,y+5,w,h,'#617D7430');this.rect(x,y,w,h,'#638B91');this.rect(x+3,y+3,w-6,h-12,'#AAD0CB');
      for(let xx=x+11;xx<x+w-4;xx+=14)this.rect(xx,y+3,2,h-12,'#DFE8D8');
      this.rect(x+3,y+Math.floor(h*.42),w-6,2,'#D8E5D8');this.rect(x+3,y+h-9,w-6,6,'#D9D8BD');
      this.rect(x+w-21,y+h-16,13,14,'#47717B');this.rect(x+w-19,y+h-14,9,9,'#C1DBD3');
      this.rect(x+5,y+5,3,h-20,'#E9F0DF');this.rect(x+5,y+h,15,3,'#BFCBB6');
      this._mapLights.push([x+w-19,y+h-14,9,9]);
    }
    _collaborationBooth(x,y){
      this.rect(x+2,y+4,27,30,'#748D7930');this.rect(x,y,27,27,'#85A395');this.rect(x+3,y+3,21,21,'#D7E2CB');
      this.rect(x+4,y+16,19,4,'#AF9776');this.rect(x+9,y+9,10,8,'#60858D');this.rect(x+11,y+10,6,4,'#C0DAD3');
      this.rect(x+9,y+22,10,5,'#74978B');this.rect(x+3,y+29,21,3,'#BFCDB7');
      this._mapLights.push([x+11,y+10,6,4]);
    }
    _accessibleLane(x,y,w,h){
      this.rect(x,y,w,h,'#EEEAD3');
      if(w>h){this.rect(x,y+2,w,1,'#C4CBB4');this.rect(x,y+h-3,w,1,'#C4CBB4');}
      else{this.rect(x+2,y,1,h,'#C4CBB4');this.rect(x+w-3,y,1,h,'#C4CBB4');}
    }
    _crate(x,y){this.rect(x,y,10,10,'#AC8961');this.rect(x+1,y+1,8,2,'#D4B88D');this.rect(x+1,y+6,8,2,'#D4B88D');this.rect(x+4,y+2,2,7,'#C6A57B');}
    _serviceDepot(){
      const x=483,y=310,w=131;
      this.rect(x+5,y+5,w,66,'#62776530');this.rect(x,y,w,65,'#72877D');this.rect(x+3,y+3,w-6,32,'#A5B4A5');
      for(let xx=x+10;xx<x+w-5;xx+=12)this.rect(xx,y+5,2,27,'#CAD2BB');
      this.rect(x+2,y+36,w-4,27,'#DFD5B8');this.rect(x+7,y+42,36,21,'#A5AE9B');this.rect(x+51,y+42,36,21,'#A5AE9B');
      for(let yy=y+45;yy<y+62;yy+=4){this.rect(x+9,yy,32,1,'#C9CFB6');this.rect(x+53,yy,32,1,'#C9CFB6');}
      this.rect(x+100,y+41,20,22,'#5A7D7B');this.rect(x+103,y+43,14,10,'#B1CCC2');
      this._mapLights.push([x+103,y+43,14,10]);
      this.rect(x-7,y+65,w+14,25,'#C5BEA1');this.rect(x-4,y+67,w+8,2,'#ECE1BA');
      this._crate(x+3,y+72);this._crate(x+17,y+72);this._crate(x+31,y+72);
      // A parked cargo tricycle stays within its loading court.
      this.rect(x+84,y+72,24,10,'#8DAB9A');this.rect(x+101,y+66,8,7,'#6F8E82');this.rect(x+107,y+65,5,2,'#59766D');
      for(const xx of[x+87,x+103]){this.rect(xx,y+80,5,5,'#576B61');this.rect(xx+1,y+81,3,3,'#C6D1B6');}
      this._sign(x+w/2,y+96,'配货与会员服务','#FAF0DA','#795F47');
    }
    _pergola(x,y,w,h){
      this.rect(x+3,y+3,3,h,'#849581');this.rect(x+w-6,y+3,3,h,'#849581');
      this.rect(x,y,w,3,'#A8B698');this.rect(x,y+8,w,3,'#A8B698');
      for(let xx=x+4;xx<x+w-2;xx+=9)this.rect(xx,y-2,3,15,'#CDD4AD');
      for(let xx=x+1;xx<x+w-3;xx+=16){this.rect(xx,y,7,3,'#73966E');this.rect(xx+4,y+6,7,3,'#96AC7D');}
    }
    _boat(x,y,color){this.rect(x-5,y-14,12,28,'#5D969B');this.rect(x-6,y-12,12,24,color);this.rect(x-4,y-16,8,32,color);this.rect(x-3,y-11,6,22,'#E6D8B6');this.rect(x-4,y-4,8,3,'#96795D');this.rect(x-4,y+7,8,3,'#96795D');this.rect(x-8,y-9,2,22,'#BAAA7F');}
    _seasonGround(){
      if(this.options.environment==='rain'){
        for(const [x,y,w]of[[69,225,23],[233,192,17],[403,271,16],[577,190,21],[778,229,18],[202,420,20],[384,92,12]]){
          this.rect(x-w/2,y-2,w,4,'#92ACA9');this.rect(x-w/2+3,y-3,w-6,6,'#A8BDB5');this.rect(x-w/2+4,y-2,w-10,1,'#D7E2D2');
        }
      }else if(this.options.environment==='autumn'){
        for(let i=0;i<45;i++){const x=47+Math.floor(rnd(i+247)*638),y=17+Math.floor(rnd(i+314)*421);if((y>289&&y<408&&x<362)||this._buildings.some(b=>x>b.x-4&&x<b.x+b.w+4&&y>b.y-8&&y<b.y+b.rows*16+40))continue;this.rect(x,y,2+i%2,1,i%3===0?'#C17D52':i%3===1?'#DBB25F':'#BB9E5E');}
      }
    }
    _path(x1,y1,x2,y2,width){
      const left=Math.min(x1,x2)-width/2,top=Math.min(y1,y2)-width/2,w=Math.abs(x1-x2)+width,h=Math.abs(y1-y2)+width;
      const campus=this.options.module==='growth',publicSpace=this.options.module==='public',rain=this.options.environment==='rain';
      this.rect(left-2,top-2,w+4,h+4,campus?'#A0B7A7':'#AAB787');this.rect(left,top,w,h,rain?'#BECCBF':campus?'#D7DCD0':publicSpace?'#D9D8BD':'#DDCAA4');
      for(let x=Math.ceil(left/8)*8;x<left+w;x+=8)for(let y=Math.ceil(top/8)*8;y<top+h;y+=8){const r=rnd(x*9+y);if(r>.87)this.rect(x,y,2,1,campus?(r>.95?'#ECF0E3':'#B7C3B3'):publicSpace?(r>.95?'#EEE9D2':'#BABC9F'):(r>.95?'#F1DFC1':'#C4AF8B'));}
    }
    _diagonalPath(start,end,width){
      const c=this.ctx;c.save();c.lineCap='square';c.beginPath();c.moveTo(start.x,start.y);c.lineTo(end.x,end.y);c.lineWidth=width+4;c.strokeStyle='#aab787';c.stroke();c.lineWidth=width;c.strokeStyle=this.options.module==='growth'?'#d7dcd0':this.options.module==='public'?'#d9d8bd':'#ddcaa4';c.stroke();c.restore();
    }
    _court(x,y,w,h){this.rect(x,y,w,h,'#B7B69B');for(let yy=y+1;yy<y+h-2;yy+=8)for(let xx=x+1;xx<x+w-2;xx+=12){const offset=(Math.floor((yy-y)/8)%2)*5;this.rect(xx+offset,yy,10,6,rnd(xx+yy)>.5?'#C9C7AF':'#DBD6BC');}}
    _river(){
      this.rect(700,0,56,H,'#B8CAA0');this.rect(704,0,48,H,'#74AEB9');this.rect(708,0,40,H,'#83C2C7');
      for(let y=0;y<H;y+=16){this.rect(701+(Math.floor(y/16)%3===0?0:3),y,4,16,'#A6BF8C');this.rect(747,y,5,16,'#659DA5');this.rect(751,y,4,16,'#A9BF8F');}
      for(let y=8;y<H;y+=32){this.rect(711,y,9,2,'#A4D4D0');this.rect(731,y+14,10,1,'#B7DFD7');}
    }
    _bridge(){
      this.rect(687,208,82,39,'#896C4D');this.rect(688,211,80,32,'#B6986B');
      for(let x=690;x<768;x+=7){this.rect(x,213,5,28,x%3?'#CFB387':'#D7BF90');this.rect(x,217,5,1,'#E7CEA0');}
      this.rect(687,208,83,4,'#7D6048');this.rect(687,242,83,4,'#7D6048');
      for(const x of[687,711,744,767]){this.rect(x,203,3,10,'#826046');this.rect(x,238,3,11,'#826046');this.rect(x,202,3,2,'#CEB18A');}
    }
    _building(b){
      if(this.options.module==='growth'){this._campusBuilding(b);return;}
      if(this.options.module==='public'){this._civicBuilding(b);return;}
      const x=b.x,y=b.y,w=b.w,rh=b.rows*16,blue=b.roof==='blue';
      this.rect(x+5,y+8,w+7,rh+30,'#61785335');
      for(let row=0;row<b.rows;row++)for(let col=0;col<w/16;col++){
        const first=col===0,last=col===w/16-1;
        const id=blue?(row===0?(first?48:last?50:49):(first?60:last?62:61)):(row===0?(first?52:last?54:53):(first?64:last?66:65));
        this._tile(id,x+col*16,y+row*16);
      }
      const cols=w/16,door=Math.floor(cols/2);
      for(let col=0;col<cols;col++){
        this._tile(blue?(col===0?76:col===cols-1?79:77):(col===0?72:col===cols-1?75:73),x+col*16,y+rh);
        const doorTile=blue?89:85;
        this._tile(col===door?doorTile:(col%2===0?(blue?88:84):(blue?77:73)),x+col*16,y+rh+16);
      }
      this.rect(x-2,y+rh-1,w+4,4,blue?'#526678':'#805A49');
      // A tiny dormer, chimney and roof highlight make each roof distinct.
      this._tile(blue?51:55,x+16,y+12);this.rect(x+20,y+10,8,3,'#DBD9C5');
      if(w>110){this.rect(x+w-27,y+16,9,15,'#826B60');this.rect(x+w-28,y+14,11,4,'#B1A18A');this.rect(x+w-25,y+15,5,2,'#645C53');}
      if(b.index!==2){
        const fabric=['#7E9B92','#BA9277','#BB8F74','#C69769','#7E9AA5','#899F7E'][b.index];
        this.rect(x+6,y+rh+9,w-12,7,fabric);for(let i=0;i<w-12;i+=12)this.rect(x+6+i,y+rh+9,5,7,'#F0E0BD');
        this.rect(x+5,y+rh+16,w-10,2,'#7D705A');
        if(b.index===0||b.index===3){this.rect(x+w-39,y+rh+21,20,9,'#B48F69');this.rect(x+w-37,y+rh+20,16,2,'#E6D0A5');}
      }
      if(b.index===2){
        // Broad front awning of the primary experience / shop / service building.
        const accent=this.options.module==='public'?'#789897':this.options.module==='growth'?'#8596B0':'#B9856D';
        this.rect(x+7,y+rh+9,w-14,8,accent);for(let i=0;i<w-14;i+=12)this.rect(x+7+i,y+rh+9,5,8,'#EDDBB7');
        this.rect(x+5,y+rh+17,w-10,2,'#655B4D');
        if(this.options.module==='public'){this.rect(x+w/2-3,y+29,6,17,'#E9E7D1');this.rect(x+w/2-9,y+35,18,5,'#E9E7D1');}
        if(this.options.module==='growth'){this.rect(x+w/2-18,y+29,37,22,'#505F70');this.rect(x+w/2-15,y+32,31,15,'#B7D3CB');for(let n=0;n<4;n++)this.rect(x+w/2-11+n*6,y+42-n*2,4,3+n*2,'#6E9C91');}
        if(this.options.module==='merchant'){this.rect(x+w/2-13,y+31,28,20,'#E2C9A0');this.rect(x+w/2-6,y+25,14,10,'#B5916E');this.rect(x+w/2-3,y+28,8,7,blue?'#8B9BB4':'#BB8A70');}
      }
      const doorX=x+door*16+8,ground=y+rh+32;
      this.rect(doorX-8,ground,16,4,'#BEAE8D');this.rect(doorX-11,ground+4,22,3,'#D3C19D');
      this._sign(x+w/2,ground+12,buildingName(this.options.mapId,this.options.module,b.index));
      this._pot(x+5,ground-3);this._pot(x+w-14,ground-3);
    }
    _campusBuilding(b){
      const {x,y,w,index}=b,rh=b.rows*16,face=y+rh,ground=face+32;
      const roof=index===1?'#B99F88':index===3?'#ADBAA0':'#9BAEB1',trim='#57767A';
      this.rect(x+6,y+8,w+5,rh+31,'#526F6035');
      this.rect(x,y,w,rh+32,trim);this.rect(x+3,y+3,w-6,rh-4,roof);
      this.rect(x+6,y+6,w-12,rh-10,'#CDD8CC');this.rect(x+9,y+9,w-18,rh-16,index===1?'#E0D3BA':'#A8BDB4');
      this.rect(x+4,face-3,w-8,4,'#E4E7D7');this.rect(x+3,face+2,w-6,28,'#CDDBD2');
      // Two glazed storeys, separated by a warm timber floor band.
      for(let row=0;row<2;row++)for(let xx=x+7;xx<x+w-8;xx+=14){
        this.rect(xx,face+4+row*13,10,10,'#60868F');this.rect(xx+1,face+5+row*13,8,4,'#ACCCC9');this.rect(xx+8,face+5+row*13,1,8,'#DBE5D4');
      }
      this.rect(x+3,face+14,w-6,3,index===1||index===3?'#B29A7C':'#B4C8BC');
      if(index===2){
        this.rect(x+15,y+16,w-30,rh-32,'#829F8F');this.rect(x+20,y+21,58,34,'#6E98A2');
        for(let yy=y+24;yy<y+53;yy+=10){this.rect(x+23,yy,50,1,'#BCD7CE');for(let xx=x+23;xx<x+72;xx+=12)this.rect(xx,yy,1,8,'#9DC2C1');}
        this.rect(x+91,y+21,31,32,'#C9D7B6');this.rect(x+96,y+26,21,21,'#73986F');
        for(let yy=y+27;yy<y+45;yy+=6)for(let xx=x+98;xx<x+115;xx+=6)this.rect(xx,yy,3,3,'#A6BC83');
        this.rect(x+65,face+9,30,9,'#56777C');this.rect(x+69,face+10,22,4,'#DCE9D9');
        this.rect(x+59,face+19,42,3,'#D5C6A7');
      }else{
        const columns=index===0||index===5?3:2;
        for(let n=0;n<columns;n++){const xx=x+15+n*26;this.rect(xx,y+13,22,16,'#5D7B88');this.rect(xx+2,y+15,18,12,'#799CA6');this.rect(xx+11,y+15,1,12,'#ACCAC6');this.rect(xx+2,y+21,18,1,'#ACCAC6');}
        this.rect(x+w-25,y+rh-18,13,11,'#DDE1D0');this.rect(x+w-22,y+rh-15,7,5,'#A3B4A7');
      }
      const door=x+Math.floor(w/32)*16+8;
      this.rect(door-6,ground-15,12,15,'#436571');this.rect(door-4,ground-13,8,9,'#B9D5D0');this.rect(door-1,ground-12,1,11,'#E1E9DA');
      this.rect(door-11,ground,22,4,'#DCE0CC');this.rect(door-15,ground+4,30,3,'#C0CBB6');
      this._pot(x+4,ground-2);this._pot(x+w-12,ground-2);this._sign(x+w/2,ground+12,buildingName(this.options.mapId,'growth',index),'#E7EFE5','#48656C');
    }
    _civicBuilding(b){
      const {x,y,w,index}=b,rh=b.rows*16,face=y+rh,ground=face+32;
      this.rect(x+6,y+8,w+5,rh+31,'#58765830');
      this.rect(x,y+5,w,rh+27,'#859A89');this.rect(x+3,y+8,w-6,rh+22,'#E0DBC3');
      this.rect(x-2,y+rh-4,w+4,6,'#607F72');
      if(index===2){
        // The civic hall has a stepped copper roof, a central clock and a
        // colonnade; it shares no storefront silhouette with the commercial street.
        this.rect(x+9,y+6,w-18,rh-10,'#7F9D8E');this.rect(x+17,y+1,w-34,8,'#ABC1A6');
        this.rect(x+22,y+12,w-44,rh-25,'#99B19A');
        for(let yy=y+18;yy<face-19;yy+=9)this.rect(x+27,yy,w-54,1,'#B9CAB0');
        this.rect(x+w/2-17,y-4,34,41,'#DAD5BD');this.rect(x+w/2-20,y-6,40,5,'#5B7D6F');
        this.rect(x+w/2-10,y+5,20,20,'#638474');this.rect(x+w/2-8,y+7,16,16,'#F0E6C7');
        this.rect(x+w/2,y+10,1,7,'#668274');this.rect(x+w/2,y+16,5,1,'#668274');
        this.rect(x+8,face+3,w-16,5,'#EEE6CE');
        for(let xx=x+10;xx<x+w-8;xx+=23){this.rect(xx,face+9,15,20,'#688F89');this.rect(xx+2,face+11,11,8,'#BCD4BD');this.rect(xx+15,face+7,6,23,'#EDE5CE');this.rect(xx+14,face+28,8,3,'#C7C9AE');}
      }else{
        this.rect(x+4,y+3,w-8,rh-7,index===4?'#9FAB87':'#8FA797');
        this.rect(x+10,y+9,w-20,rh-20,'#B7C5A7');
        for(let yy=y+13;yy<face-15;yy+=8)this.rect(x+13,yy,w-26,1,'#9BAD96');
        // Reading-room skylights and planted roofs distinguish the civic outbuildings.
        if(index===1||index===4){this.rect(x+w/2-16,y+14,32,17,'#668B87');this.rect(x+w/2-13,y+17,26,11,'#C8DBC4');this.rect(x+w/2,y+17,2,11,'#8AACA0');}
        else{this.rect(x+17,y+15,29,16,'#839B72');for(let xx=x+19;xx<x+43;xx+=7)this.rect(xx,y+18,4,10,'#A0B783');}
        for(let xx=x+10;xx<x+w-10;xx+=23){this.rect(xx,face+7,15,21,'#74928B');this.rect(xx+2,face+9,11,8,'#C9DCC3');this.rect(xx+7,face+8,2,20,'#DDE1C8');}
      }
      const door=x+Math.floor(w/32)*16+8;
      this.rect(door-7,ground-20,14,20,'#58786E');this.rect(door-5,ground-18,10,12,'#BACFBA');this.rect(door-1,ground-18,1,17,'#E5DFC5');
      this.rect(door-12,ground,24,3,'#C5C8AE');this.rect(door-16,ground+3,32,3,'#E5DFC6');
      this._pot(x+4,ground-2);this._pot(x+w-13,ground-2);this._sign(x+w/2,ground+12,buildingName(this.options.mapId,'public',index),'#EDF0DE','#526F5E');
    }
    _sign(x,y,text,bg='#F4E7C9',fg='#596453'){
      // Pixel artwork and typography are separate layers. Text is rasterized only
      // once, at the actual display DPR, even when the camera is zoomed or panned.
      const label={x,y,text,bg,fg,kind:'sign',priority:this._mapPreparing?(x===544||x===543?4:1):30};
      (this._mapPreparing?this._mapLabels:this._labels).push(label);
    }
    _tree(x,y,big=0){
      const autumn=this.options.environment==='autumn',rain=this.options.environment==='rain',campus=this.options.module==='growth';
      const width=big?29:18,height=big?35:26,cx=x+width/2,base=y+height;
      const dark=autumn?'#A78954':rain?'#668A78':'#6A905F',mid=autumn?'#CBA55E':rain?'#7B9D81':campus?'#91AB7F':'#89A96B',light=autumn?'#E2BE75':rain?'#ABC29B':'#B1C786';
      this.rect(x+4,base-2,width,5,'#5B78552B');this.rect(cx-2,y+14,4,height-13,'#8C8160');this.rect(cx+1,y+17,2,height-16,'#B5A079');
      if(campus){
        this.rect(x+5,y+5,width-9,height-13,dark);this.rect(x+2,y+10,width-3,height-23,dark);this.rect(x+6,y+3,width-11,height-15,mid);this.rect(x+8,y,width-15,5,light);this.rect(x+6,y+7,5,height-21,light);
      }else{
        this.rect(x+5,y,width-9,5,mid);this.rect(x+2,y+4,width-3,height-16,dark);this.rect(x,y+9,width,height-25,dark);
        this.rect(x+4,y+3,width-9,height-17,mid);this.rect(x+2,y+8,width-7,height-23,mid);this.rect(x+7,y+2,width-14,4,light);this.rect(x+4,y+7,5,5,light);this.rect(x+width-9,y+10,4,3,light);
        if(this.options.module==='merchant'&&!autumn){this.rect(x+width-10,y+8,2,2,'#D2B171');if(big)this.rect(x+6,y+17,2,2,'#D2B171');}
      }
    }
    _flowerbed(x,y,w,h){
      this.rect(x,y,w,h,'#8D9E68');this.rect(x+2,y+2,w-4,h-4,'#647F55');
      for(let xx=x+5;xx<x+w-3;xx+=7)for(let yy=y+4;yy<y+h-2;yy+=6){this.rect(xx,yy,1,4,'#8CAF6F');const col=rnd(xx+yy)>.5?'#F1D084':'#D6A18C';this.rect(xx-1,yy,3,2,col);this.rect(xx,yy-1,1,4,col);}
    }
    _pot(x,y){this.rect(x,y-5,8,5,'#BA8A62');this.rect(x-1,y-7,10,3,'#D2A47C');this.rect(x+1,y-13,6,7,'#668B5F');this.rect(x-1,y-11,10,3,'#7CA471');this.rect(x+3,y-15,3,5,'#8DB278');}
    _fence(x,y,w){for(let p=0;p<w;p+=16)this._tile(p===0?80:p+16>=w?82:81,x+p,y);}
    _bench(x,y){this.rect(x,y+4,25,4,'#B99668');this.rect(x,y,25,3,'#CCA875');this.rect(x+3,y+8,3,4,'#6D7054');this.rect(x+20,y+8,3,4,'#6D7054');this.rect(x+1,y-2,2,7,'#867D57');this.rect(x+23,y-2,2,7,'#867D57');}
    _table(x,y){this.rect(x-2,y,3,7,'#947957');this.rect(x+9,y,3,7,'#947957');this.rect(x-6,y-5,23,7,'#BFA174');this.rect(x-5,y-7,21,3,'#D6BC8D');this.rect(x+4,y-7,3,2,'#EEE3BF');this.rect(x-12,y+2,7,3,'#AD8B63');this.rect(x+17,y+2,7,3,'#AD8B63');}
    _lamp(x,y){this.rect(x-2,y,5,3,'#8C9C78');this.rect(x,y-19,2,20,'#657563');this.rect(x-3,y-24,8,6,'#617264');this.rect(x-2,y-23,6,4,'#EED89C');this.rect(x-4,y-26,10,2,'#657563');}
    _market(x,y){
      const c=this.options.module==='public'?'#819B8C':this.options.module==='growth'?'#8C9DB1':'#BD8D72';
      this.rect(x+3,y+8,3,13,'#8A7256');this.rect(x+43,y+8,3,13,'#8A7256');this.rect(x,y,49,9,c);for(let i=0;i<49;i+=10)this.rect(x+i,y,5,9,'#EDDEBA');this.rect(x+2,y+16,45,6,'#B2946C');
      if(this.options.module==='public'){this.rect(x+10,y+10,7,7,'#DDE1CB');this.rect(x+24,y+10,15,4,'#9BAE9B');}
      else if(this.options.module==='growth'){this.rect(x+9,y+10,11,7,'#6E7E91');this.rect(x+11,y+11,7,4,'#B5D0CE');this.rect(x+30,y+10,7,7,'#D4C7A5');}
      else{for(let i=0;i<5;i++){this.rect(x+7+i*7,y+11,5,5,i%2?'#C79D64':'#9EB076');this.rect(x+8+i*7,y+10,3,2,'#E2C383');}}
    }
    _mailbox(x,y){this.rect(x+4,y,3,10,'#8E8068');this.rect(x,y-10,12,12,'#8CA5A4');this.rect(x+2,y-8,8,3,'#B6CBC1');this.rect(x+2,y-3,8,1,'#607D79');}
    _notice(x,y){this.rect(x,y,2,14,'#8D7859');this.rect(x+22,y,2,14,'#8D7859');this.rect(x-2,y-16,28,20,'#9E8662');this.rect(x,y-14,24,16,'#E5D5AC');this.rect(x+3,y-11,9,10,'#F2E6C6');this.rect(x+14,y-10,7,2,'#9BA88F');this.rect(x+14,y-5,7,2,'#B0B496');}
    _bicycle(x,y){this.rect(x,y,7,6,'#667F76');this.rect(x+16,y,7,6,'#667F76');this.rect(x+2,y+1,3,4,'#C6C5A3');this.rect(x+18,y+1,3,4,'#C6C5A3');this.rect(x+6,y+1,12,2,'#956E53');this.rect(x+8,y-5,2,7,'#956E53');this.rect(x+16,y-7,2,9,'#956E53');this.rect(x+6,y-6,6,2,'#6D7463');this.rect(x+15,y-8,6,2,'#6D7463');}
    _fountainBase(x,y){this.rect(x-22,y-15,44,30,'#B8B89C');this.rect(x-27,y-9,54,18,'#B8B89C');this.rect(x-21,y-12,42,24,'#D4D4B7');this.rect(x-25,y-7,50,14,'#D4D4B7');this.rect(x-16,y-9,32,18,'#7AA9AA');this.rect(x-21,y-4,42,8,'#7AA9AA');this.rect(x-4,y-12,8,16,'#C3CEBC');}
    draw(){
      if(!this._canRender())return;this._metrics.draws++;const c=this.ctx;c.imageSmoothingEnabled=false;c.clearRect(0,0,W,H);c.drawImage(this.background,0,0);
      this._labels=this._mapLabels.map(label=>({...label}));
      this._environment();this.positions=[];
      const observed=this.agents.find(a=>a.id===this.selected);
      if(observed){
        const trail=observed.visits?(this._progress<observed.purchaseAt?observed.incoming:observed.outgoing):observed.walk;
        const c=this.ctx;c.save();c.setLineDash([7,5]);c.strokeStyle='#fff5c5';c.lineWidth=6;c.beginPath();trail.forEach((point,i)=>i?c.lineTo(point.x,point.y):c.moveTo(point.x,point.y));c.stroke();c.strokeStyle='#477c75';c.lineWidth=2;c.stroke();c.restore();
        const p=this._agentPosition(observed);c.save();c.strokeStyle='#fff2b3';c.lineWidth=3;c.beginPath();c.arc(p.x+observed.lane,p.y-9,15,0,Math.PI*2);c.stroke();c.restore();
      }
      const sorted=this.agents.map(a=>({a,p:this._agentPosition(a)})).sort((a,b)=>a.p.y-b.p.y);
      for(const {a,p}of sorted){const opacity=this._personOpacity(a);if(opacity<=0)continue;p.x+=a.lane;p.y+=a.lane*.4;this.positions.push({id:a.id,x:p.x,y:p.y,screenX:this.offsetX+p.x*this.scale,screenY:this.offsetY+p.y*this.scale});c.save();c.globalAlpha=opacity;this._person(a,p);c.restore();}
      this._conversations();
      this._lighting();
      const v=this.viewCtx;v.setTransform(this.dpr,0,0,this.dpr,0,0);v.imageSmoothingEnabled=false;v.fillStyle='#CFDCB4';v.fillRect(0,0,this.width,this.height);v.drawImage(this.surface,this.offsetX,this.offsetY,W*this.scale,H*this.scale);
      this._renderLabels();
      this._debug();
    }
    _debug(){window.sceneDebug={...this._counts,style:'top-down-pixel-village',module:this.options.module,progress:this._progress,playing:this._playing,visible:this._visible,following:this.following,camera:this.getCamera(),metrics:this._metrics,options:{...this.options},positions:this.positions.map(p=>({...p})),textLabels:(this._renderedLabels||[]).map(label=>({...label}))};}
    _environment(){
      const tick=this._progress*this.options.duration*5;
      // Flowing water, a rippling fountain, smoke and a fluttering shop flag.
      if(MAPS.get(this.options.mapId,this.options.module).river)for(let i=0;i<22;i++){const x=710+Math.floor(rnd(i+119)*31),y=Math.floor((i*23+tick*4)%H);if(y>201&&y<251)continue;this.rect(x,y,4+i%4,1,'#B9E0D7');if(i%3===0)this.rect(x-2,y+3,3,1,'#68A5B1');}
      if(this.options.module!=='growth'&&(this.options.module==='public'||MAPS.get(this.options.mapId,this.options.module).legacy)){
        for(let i=0;i<3;i++){const f=fract(tick*.8+i/3),s=3+Math.floor(f*13);this.rect(308-s,253-Math.floor(s*.45),s*2,1,'#A6D2C9');this.rect(308-s,253+Math.floor(s*.45),s*2,1,'#A6D2C9');}
        this.rect(307,230,2,17,'#D4E6D8');this.rect(305,231,6,2,'#C5E0D7');
      }
      if(this.options.module==='merchant'){
        for(let i=0;i<3;i++){const f=fract(tick*.25+i*.33),xx=165+Math.floor(Math.sin(f*4)*4),yy=76-Math.floor(f*26);this.rect(xx,yy,4+i%2,3,'#E1E0CA');this.rect(xx+2,yy-2,4,3,'#E9E7D3');}
        const catX=95+Math.floor((Math.sin(tick*.23)+1)*21),catY=397;
        this.rect(catX,catY-4,11,5,'#C4AB7B');this.rect(catX+8,catY-7,6,6,'#C4AB7B');this.rect(catX+8,catY-9,2,3,'#A98C5D');this.rect(catX+12,catY-9,2,3,'#A98C5D');this.rect(catX+2,catY+1,2,2,'#8F7D5B');this.rect(catX+8,catY+1,2,2,'#8F7D5B');this.rect(catX-3,catY-6,3,3,'#C4AB7B');
      }else if(this.options.module==='public'){
        for(let i=0;i<3;i++){const x=262+i*11+Math.floor(Math.sin(tick*.15+i)*4),y=292+i%2*3;this.rect(x,y,5,3,'#D4D7C5');this.rect(x+4,y-2,3,3,'#EAEBDD');this.rect(x+1,y+3,1,1,'#977D5E');}
      }
      this.rect(646,123,2,39,'#7A7E64');const wave=Math.floor(Math.sin(tick*3)*2),flag=this.options.module==='growth'?'#91B8B7':this.options.module==='public'?'#A8BA8B':'#D9BC83';this.rect(648,125,17,9,flag);this.rect(651,134,14,2,'#8D9E7C');this.rect(663,125+wave,5,8,flag);
      this._weather(tick);
      // A notice changes with the scenario; public scenes never show coupon sales.
      this._strategy();
    }
    _weather(tick){
      if(this.options.environment==='rain'){
        for(let i=0;i<38;i++){const x=8+Math.floor(rnd(i+532)*810),y=Math.floor((i*47+tick*18)%H);this.rect(x,y,1,5,'#BCD2CE');this.rect(x-1,y+5,2,1,'#9CB8B9');}
        for(const [x,y]of[[75,227],[291,193],[439,273],[606,190],[673,349]]){const f=fract(tick*.14+x*.001);this.rect(x-3-Math.floor(f*4),y,6+Math.floor(f*8),1,'#B5CAC5');this.rect(x-1-Math.floor(f*2),y+2,2+Math.floor(f*4),1,'#D2DFD5');}
      }else if(this.options.environment==='autumn'){
        for(let i=0;i<4;i++){const leafX=30+Math.floor(fract(tick*.025+i*.27)*640),leafY=53+Math.floor(fract(tick*.022+i*.21)*316);this.rect(leafX,leafY,3,2,i%2?'#D9AD5F':'#C89051');}
      }
    }
    _strategy(){
      const {module,scheme,count}=this.options,open=this._isOpen(),tick=this._progress*this.options.duration*5;
      const pulse=.48+Math.sin(tick*2)*.18;
      if(module==='public'){
        const text=scheme==='open'&&this._extraService()?'延时窗口 · 09:00–21:00':'服务窗口 · 09:00–18:00';
        this._sign(544,179,open?text:'窗口休息 · 次日 09:00 开放','#F8F3E6','#415E58');
        if(scheme==='member'&&this._extraService()){
          // Mobile service has its own reachable destination on the market path.
          this.rect(592,238,52,23,'#D8DCCB');this.rect(592,238,36,4,'#73988B');this.rect(592,243,33,12,'#EDF0DF');
          this.rect(628,244,15,14,'#789C9A');this.rect(631,246,10,7,'#BDDBD6');this.rect(594,258,49,3,'#59736D');
          for(const x of[600,633]){this.rect(x,258,7,6,'#4D615B');this.rect(x+2,259,3,3,'#B8C5B3');}
          this.rect(598,242,24,4,'#93AEA0');this.rect(601,247,19,8,'#F5ECD3');this.rect(608,248,4,6,'#87A898');this.rect(604,250,12,2,'#87A898');
          this._sign(618,276,open?'流动服务点 · 就近办理':'流动服务点 · 已收班','#E7F1E8','#45675D');
          if(open){this.rect(615,266,6,2,'#DECC93');this.rect(592,264,50,2,'#98B6A0');}
        }
      }else if(module==='growth'){
        if(scheme==='open'&&this._extraService()){
          this.rect(453,153,9,17,'#677E85');this.rect(451,148,13,12,'#446879');this.rect(453,150,9,7,'#C2DBD6');
          for(let i=0;i<this.options.guideSteps;i++){this.rect(477+i*14,181,7,2,'#E1BC73');this.rect(482+i*14,179,2,5,'#E1BC73');}
          this._sign(481,194,`自助引导 · ${this.options.guideSteps} 步体验`,'#E7EFF0','#446675');
        }else if(scheme==='member'&&this._extraService()){
          this.rect(475,247,42,8,'#79969F');this.rect(476,255,40,3,'#DFD2B1');this.rect(479,258,3,8,'#80755C');this.rect(511,258,3,8,'#80755C');
          this.rect(486,246,10,7,'#54707B');this.rect(488,247,6,4,'#BDD8D1');this.rect(502,247,7,5,'#E8DDC1');
          this._sign(496,279,open?`顾问工作站 · ${this.options.supportAgents} 席支持`:'顾问已离线 · 可自助体验','#E7EFF0','#446675');
        }else this._sign(544,179,'自助体验 · 现行 5 步流程','#E7EFF0','#446675');
      }else{
        const available=this.options.coupon>0&&this.options.coverage>0;
        const offer=scheme==='baseline'||!available?'原价体验 · 新品陈列':scheme==='member'?(this.options.memberTarget==='active'?'活跃会员':this.options.memberTarget==='dormant'?'回流会员':'会员专享')+' · ¥'+this.options.coupon:'全员优惠 · ¥'+this.options.coupon;
        this._sign(544,181,open?offer:'门店休息 · 08:00 开放','#FAF0DA','#745D44');
        if(scheme!=='baseline'&&available){
          const accent=scheme==='member'?'#BDA065':'#BC886E';
          for(const x of[469,618]){this.rect(x,147,2,25,'#7B7D64');this.rect(x+2,148,14,11,accent);this.rect(x+5,151,8,2,'#F3E4BF');this.rect(x+5,155,5,1,'#F3E4BF');}
          for(const a of this.agents){if(!this._couponAvailable(a)||this._progress<a.exposedAt||this._progress>a.purchaseAt||this._personOpacity(a)<=0)continue;const p=this._agentPosition(a);this.rect(p.x+a.lane+7,p.y-24,7,5,'#E6CA85');this.rect(p.x+a.lane+9,p.y-22,3,1,'#AA895B');}
        }
      }
      // The entrance and extra queue bays make resource pressure visible without
      // turning aggregate business totals into literal map population.
      const destination=this._extraService()&&module==='public'&&scheme==='member'?nodes[MOBILE]:this._extraService()&&module==='growth'&&scheme==='member'?nodes[KIOSK]:nodes[DOOR];
      const c=this.ctx;c.save();c.globalAlpha=pulse;
      this.rect(destination.x-11,destination.y+4,22,2,open?'#F6DE9B':'#A3B5A4');this.rect(destination.x-13,destination.y+1,2,4,open?'#F6DE9B':'#A3B5A4');this.rect(destination.x+11,destination.y+1,2,4,open?'#F6DE9B':'#A3B5A4');c.restore();
      if(count>40){const bays=Math.min(5,Math.floor(count/24));for(let i=0;i<bays;i++){this.rect(destination.x-12,destination.y+11+i*6,3,2,'#AFC0A5');this.rect(destination.x+10,destination.y+11+i*6,3,2,'#AFC0A5');}}
    }
    _lighting(){
      const c=this.ctx,clock=this.getClock(),night=clock.night,hour=clock.hour+clock.minute/60;
      c.save();
      // A restrained blue wash preserves texture and keeps figures readable.
      if(night>0){c.fillStyle=`rgba(31,53,91,${night*.28})`;c.fillRect(0,0,W,H);}
      const twilight=this.options.lighting==='auto'&&hour>=16&&hour<20?Math.sin((hour-16)/4*Math.PI):0;
      if(twilight>0){const gradient=c.createLinearGradient(0,0,W,H);gradient.addColorStop(0,`rgba(230,180,102,${twilight*.12})`);gradient.addColorStop(1,'rgba(216,175,130,0)');c.fillStyle=gradient;c.fillRect(0,0,W,H);}
      if(night>.18){
        const intensity=(night-.18)/.82;
        for(const [x,y]of[[360,169],[420,251],[639,173],[48,247],[216,404]]){
          const glow=c.createRadialGradient(x,y-19,1,x,y-19,28);glow.addColorStop(0,`rgba(255,224,155,${intensity*.26})`);glow.addColorStop(.45,`rgba(247,210,137,${intensity*.10})`);glow.addColorStop(1,'rgba(250,222,154,0)');c.fillStyle=glow;c.fillRect(x-28,y-47,56,56);
          this.rect(x-2,y-23,6,4,`rgba(255,233,166,${.35+intensity*.65})`);
        }
        for(const b of this._buildings){
          const face=b.y+b.rows*16,light=`rgba(255,224,159,${intensity*.64})`;
          if(this.options.module==='growth'){
            for(let x=b.x+8;x<b.x+b.w-9;x+=14)for(let row=0;row<2;row++)if(rnd(x+row)>.22)this.rect(x,face+5+row*13,8,4,light);
          }else if(this.options.module==='public'){
            for(let x=b.x+12;x<b.x+b.w-10;x+=23)this.rect(x,face+(b.index===2?11:9),11,8,light);
          }else{
            for(let column=0;column<b.w/16;column+=2){const x=b.x+column*16+5;if(column===Math.floor(b.w/32))continue;this.rect(x,face+21,5,6,light);}
          }
        }
        for(const [x,y,w,h]of this._mapLights)this.rect(x,y,w,h,`rgba(255,224,159,${intensity*.57})`);
        // Main entrance remains easy to locate during the evening shift.
        if(this._isOpen()){const glow=c.createRadialGradient(544,166,2,544,166,27);glow.addColorStop(0,`rgba(255,224,154,${intensity*.23})`);glow.addColorStop(1,'rgba(255,224,154,0)');c.fillStyle=glow;c.fillRect(517,139,54,54);}
      }
      c.restore();
    }
    _person(a,p){
      const x=Math.round(p.x),y=Math.round(p.y),waiting=a.visits&&this._progress>=a.visitAt&&this._progress<a.purchaseAt;
      const frame=waiting?0:Math.floor(this._progress*this.options.duration*39+a.phase*4)%4;
      const side=Math.abs(p.dx)>Math.abs(p.dy),right=p.dx>=0,back=!side&&p.dy<0;
      const leg=frame===1?1:frame===3?-1:0;
      this.rect(x-5,y-1,11,3,'#5E745C45');
      if(this.selected===a.id){this.rect(x-8,y,16,2,'#F8E7A6');this.rect(x-9,y-3,2,3,'#F8E7A6');this.rect(x+7,y-3,2,3,'#F8E7A6');}
      this.rect(x-3-leg,y-5,3,5,'#536268');this.rect(x+1+leg,y-5,3,5,'#536268');
      this.rect(x-4-leg,y-1,4,2,'#3F5054');this.rect(x+1+leg,y-1,4,2,'#3F5054');
      this.rect(x-4,y-12,9,8,a.coat);this.rect(x-3,y-13,7,2,shade(a.coat,10));this.rect(x+3,y-10,2,6,shade(a.coat,-15));
      this.rect(x-6,y-11+(frame===1?1:0),2,6,a.coat);this.rect(x+5,y-11+(frame===3?1:0),2,6,a.coat);
      this.rect(x-6,y-6+(frame===1?1:0),2,2,a.skin);this.rect(x+5,y-6+(frame===3?1:0),2,2,a.skin);
      this.rect(x-3,y-19,7,7,a.skin);this.rect(x-2,y-20,5,2,a.hair);this.rect(x-4,y-18,9,2,a.hair);this.rect(x-4,y-16,2,3,a.hair);
      if(back){this.rect(x-3,y-18,7,5,a.hair);this.rect(x-2,y-13,5,1,a.skin);}
      else if(side){this.rect(x+(right?3:-4),y-15,2,2,a.skin);this.rect(x+(right?2:-2),y-16,1,1,'#424C45');this.rect(x+(right?-3:3),y-17,2,4,a.hair);}
      else{this.rect(x-2,y-16,1,1,'#424C45');this.rect(x+2,y-16,1,1,'#424C45');}
      if(a.id%5===0){this.rect(x-4,y-13,8,2,'#D6C398');if(back)this.rect(x-3,y-11,6,6,'#C6AC7D');}
      if(a.member){this.rect(x+2,y-10,2,2,'#E7D69B');}
      if(a.buys&&this._progress>=a.purchaseAt){
        if(this.options.module==='merchant'){this.rect(x+7,y-7,6,7,'#D8BC88');this.rect(x+8,y-9,4,2,'#A28A65');this.rect(x+9,y-5,2,2,'#738E76');}
        else{this.rect(x+7,y-7,5,7,this.options.module==='public'?'#EFE1BB':'#9AB7BC');this.rect(x+8,y-5,3,1,'#748F8A');}
      }
    }
    _conversations(){
      const phase=Math.floor(this._progress*this.options.duration*5/3),length=this.agents.length,base=phase%length;
      const speakers=[base,(base+Math.floor(length/3))%length,(base+Math.floor(length*2/3))%length];
      for(const index of speakers){const a=this.agents[index];if(a.id===this.selected||this._personOpacity(a)<.7)continue;const p=this._agentPosition(a),t=THEMES[this.options.module];let text=t.speech[(phase+a.segmentIndex)%t.speech.length];
        if(a.visits&&this._progress>=a.visitAt&&this._progress<a.purchaseAt)text=this.options.module==='public'?'咨询办理流程':this.options.module==='growth'?'正在体验功能':'进店看看';
        if(this.options.module==='merchant'&&this._couponAvailable(a)&&phase%2===0)text=this.options.scheme==='member'?'会员权益可用':'有活动优惠';
        if(a.buys&&this._progress>=a.purchaseAt)text=t.done;
        else if(!this._isOpen())text=this.options.module==='growth'?'先查看自助指引':'下个开放时段再来';
        this._bubble(p.x+a.lane,p.y-25,text,false);
      }
      if(this.selected){const a=this.agents.find(a=>a.id===this.selected);if(a){const p=this._agentPosition(a);this._bubble(p.x+a.lane,p.y-26,`${a.name} · ${this._profile(a).status}`,true);}}
    }
    _bubble(x,y,text,selected){
      this._labels.push({x,y,text,kind:'speech',selected,priority:selected?100:60,bg:selected?'#355E58':'#FFFDF1',fg:selected?'#FFFAE8':'#3F534A'});
    }
    _renderLabels(){
      const c=this.viewCtx,used=[],visible=[];
      const narrow=this.width<500,scalePreference=clamp(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--text-scale'))||1,1,1.25);
      const canvasBox=this.canvas.getBoundingClientRect();
      const overlays=[...this.canvas.parentElement.querySelectorAll('.world-location,.scene-clock,.camera-controls,.world-legend,.scene-hint')].map(el=>{
        const box=el.getBoundingClientRect();return{x:box.left-canvasBox.left,y:box.top-canvasBox.top,w:box.width,h:box.height};
      }).filter(box=>box.w>0&&box.h>0);
      // Typography respects the real overlay rectangles, including expanded text
      // preferences and mobile controls, instead of guessing their current size.
      used.push(...overlays);let speechCount=0,signCount=0;
      const inView=(x,y)=>x>=8&&x<=this.width-8&&y>=20&&y<this.height-12;
      c.save();c.textAlign='center';c.textBaseline='middle';
      for(const label of [...this._labels].sort((a,b)=>b.priority-a.priority)){
        const x=this.offsetX+label.x*this.scale,y=this.offsetY+label.y*this.scale;
        if(!inView(x,y))continue;
        // At small sizes keep the primary destinations and conversations; secondary
        // building signs reappear on zoom so mobile labels remain legible.
        if(narrow&&label.kind==='sign'&&(label.priority<4||signCount>=1))continue;
        const speech=label.kind==='speech';if(narrow&&speech&&!label.selected&&speechCount>=1)continue;
        const fontSize=(narrow?11:speech?12:11.5)*scalePreference;
        c.font=`${label.selected?'600':'500'} ${fontSize}px "Yance Sans", "Noto Sans SC", "Microsoft YaHei", sans-serif`;
        let text=narrow&&!speech?label.text.split(' · ')[0]:label.text;
        const maxWidth=Math.min(this.width-24,narrow?(label.selected?190:150):speech?245:230);
        while(c.measureText(text).width>maxWidth-18&&text.length>2)text=text.slice(0,-2)+'…';
        const width=Math.ceil(c.measureText(text).width)+18,height=narrow?(speech?24:21):speech?28:24;
        const xx=clamp(Math.round(x-width/2),6,this.width-width-6),preferredY=y-(speech?height+4:height/2);
        const candidateYs=label.selected?[preferredY,preferredY-28,preferredY+28,42,70]:narrow?[preferredY,preferredY-25,preferredY+25]:[preferredY];
        let box;
        for(const candidate of candidateYs){const yy=clamp(Math.round(candidate),6,this.height-height-8),next={x:xx,y:yy,w:width,h:height};
          if(!used.some(b=>next.x<b.x+b.w+4&&next.x+next.w+4>b.x&&next.y<b.y+b.h+3&&next.y+next.h+3>b.y)){box=next;break;}}
        if(!box)continue;
        used.push(box);if(speech&&!label.selected)speechCount++;if(!speech)signCount++;visible.push({text:label.text,displayText:text,kind:label.kind,selected:!!label.selected,x:box.x,y:box.y,width:box.w,height:box.h,fontSize});
        c.shadowColor='rgba(40,59,48,.11)';c.shadowBlur=speech?5:2;c.shadowOffsetY=2;
        c.fillStyle=label.bg;c.beginPath();c.roundRect(box.x,box.y,box.w,box.h,speech?5:3);c.fill();c.shadowColor='transparent';c.shadowBlur=0;c.shadowOffsetY=0;
        c.strokeStyle=label.selected?'#355E58':speech?'#91A28C':'rgba(86,103,72,.34)';c.lineWidth=1;c.stroke();
        if(speech){const pointer=clamp(x,box.x+8,box.x+box.w-8);c.fillStyle=label.bg;c.beginPath();c.moveTo(pointer-4,box.y+box.h-1);c.lineTo(pointer,box.y+box.h+4);c.lineTo(pointer+4,box.y+box.h-1);c.fill();}
        c.fillStyle=label.fg;c.fillText(text,Math.round(box.x+box.w/2),Math.round(box.y+box.h/2));
      }
      c.restore();this._renderedLabels=visible;
    }
  }
  window.TownScene=TownScene;
})();
