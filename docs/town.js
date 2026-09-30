/*
 * Yance pixel village — frontend scenario choreography, not an AI engine.
 * Terrain / building tiles: Kenney Tiny Town, CC0; see pixel-town-license.txt.
 * Palette adaptation, people, water, street furniture, animation and layout
 * are created for this demo. All displayed counts refer to 32 visual agents.
 */
(function () {
  'use strict';
  const W = 832, H = 448, TILE = 16;
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
    growth: { names:['用户研究站','创意工坊','产品体验中心','交流咖啡馆','灵感书屋','数据观察站'], primary:'体验中心', activity:'体验新功能', entered:'进入体验', done:'完成体验', browsing:'了解产品', offer:'体验邀请', speech:['这个功能不错','一起试试看','操作更顺手了','我想了解更多'], center:'PRODUCT LAB', market:'IDEA FAIR' },
    merchant: { names:['街角咖啡馆','生活杂货铺','新品概念门店','手作面包房','独立书店','会员服务站'], primary:'概念门店', activity:'浏览新品', entered:'进店体验', done:'完成购买', browsing:'浏览新品', offer:'活动优惠', speech:['这里有新品','去店里看看','带一份回家','价格挺合适'], center:'CONCEPT STORE', market:'WEEKEND MARKET' },
    public: { names:['便民咨询站','社区议事厅','社区服务中心','邻里活动室','共享阅读室','志愿者驿站'], primary:'服务中心', activity:'了解服务', entered:'进入服务点', done:'完成办理', browsing:'阅读服务指引', offer:'服务通知', speech:['这里可以咨询','指引很清楚','一起去服务站','办理好了'], center:'COMMUNITY HUB', market:'COMMUNITY FAIR' }
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

  class TownScene {
    constructor({canvas,onSelect,onTick}={}){
      if(!canvas?.getContext)throw new TypeError('TownScene requires a canvas.');
      this.canvas=canvas;this.viewCtx=canvas.getContext('2d');
      this.surface=document.createElement('canvas');this.surface.width=W;this.surface.height=H;
      this.ctx=this.surface.getContext('2d');
      this.background=document.createElement('canvas');this.background.width=W;this.background.height=H;
      this.onSelect=typeof onSelect==='function'?onSelect:()=>{};
      this.onTick=typeof onTick==='function'?onTick:()=>{};
      this.options={module:'merchant',segments:DEFAULT_SEGMENTS.map(s=>({...s})),scheme:'open',coupon:8,memberTarget:'all',coverage:1,memberShare:.4,weights:[35,25,25,15],duration:14,conversion:.18};
      this._progress=0;this._playing=!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      this._last=0;this._notifyAt=0;this._dirty=true;this._destroyed=false;this.speed=1;this.selected=null;this.positions=[];
      this.tiles=new Image();this.tiles.onload=()=>{this._prepareMap();this._dirty=true;};
      this.tiles.onerror=()=>{this._prepareMap();this._dirty=true;};this.tiles.src=ASSET;
      this._makeAgents();this._prepareMap();
      this._onClick=e=>this._selectAt(e);
      this._onMove=e=>{const p=this._eventPoint(e);this.canvas.style.cursor=this.positions.some(a=>Math.hypot(a.screenX-p.x,a.screenY-p.y+7*this.scale)<Math.max(12,13*this.scale))?'pointer':'default';};
      this.canvas.addEventListener('click',this._onClick);this.canvas.addEventListener('pointermove',this._onMove);
      this.canvas.setAttribute('role','img');this.canvas.setAttribute('aria-label','俯视像素小镇，32 位合成访客沿步道行动、交流和参与场景活动。点击人物可查看画像。');
      this._resize=()=>this.resize();
      if(typeof ResizeObserver!=='undefined'){this.observer=new ResizeObserver(this._resize);this.observer.observe(canvas);}else window.addEventListener('resize',this._resize);
      this.resize();this._notify();this._frame=this._frame.bind(this);this.raf=requestAnimationFrame(this._frame);
    }
    get progress(){return this._progress;}
    get playing(){return this._playing;}
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
        duration:o.duration!=null&&Number.isFinite(+o.duration)?clamp(+o.duration,1,365):old.duration,
        conversion:o.conversion!=null&&Number.isFinite(+o.conversion)?unit(o.conversion):old.conversion
      };
      this._makeAgents();if(old.module!==this.options.module)this._prepareMap();
      if(o.progress!=null)this.setProgress(o.progress);this._dirty=true;this._notify();
    }
    setPlaying(value){this._playing=!!value&&this._progress<1;this._last=0;this._dirty=true;this._notify();}
    setSpeed(value){this.speed=[1,2,4].includes(+value)?+value:1;}
    setProgress(value){if(!Number.isFinite(+value))return;this._progress=clamp(+value,0,1);if(this._progress===1)this._playing=false;this._dirty=true;this._notify();}
    reset(){this._progress=0;this._last=0;this._dirty=true;this._notify();}
    resize(){
      const r=this.canvas.getBoundingClientRect();this.width=Math.max(1,r.width||900);this.height=Math.max(1,r.height||480);
      this.dpr=Math.min(window.devicePixelRatio||1,2);this.canvas.width=Math.round(this.width*this.dpr);this.canvas.height=Math.round(this.height*this.dpr);
      this.scale=Math.min(this.width/W,this.height/H);this.offsetX=(this.width-W*this.scale)/2;this.offsetY=(this.height-H*this.scale)/2;this._dirty=true;this.draw();
    }
    destroy(){this._destroyed=true;cancelAnimationFrame(this.raf);this.observer?.disconnect();window.removeEventListener('resize',this._resize);this.canvas.removeEventListener('click',this._onClick);this.canvas.removeEventListener('pointermove',this._onMove);}
    selectAgent(id){const a=this.agents.find(a=>String(a.id)===String(id));if(a){this.selected=a.id;this._dirty=true;this.onSelect(this._profile(a));}}
    project(x,y,z=0){return{x,y:y-z};}
    _eventPoint(e){const r=this.canvas.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*this.width,y:(e.clientY-r.top)/r.height*this.height};}
    _selectAt(e){const p=this._eventPoint(e);let best=null,distance=Infinity;for(const a of this.positions){const d=Math.hypot(a.screenX-p.x,a.screenY-p.y+7*this.scale);if(d<Math.max(14,15*this.scale)&&d<distance){best=a;distance=d;}}if(best)this.selectAgent(best.id);}
    _makeAgents(){
      const total=this.options.weights.reduce((a,b)=>a+b,0),raw=this.options.weights.map(w=>w/total*32),counts=raw.map(Math.floor);
      const order=[0,1,2,3].sort((a,b)=>(raw[b]-counts[b])-(raw[a]-counts[a]));
      for(let i=0,missing=32-counts.reduce((a,b)=>a+b,0);i<missing;i++)counts[order[i]]++;
      const types=counts.flatMap((n,i)=>Array(n).fill(i));
      const ranks=Array.from({length:32},(_,i)=>i).sort((a,b)=>rnd(a+60)-rnd(b+60));
      const purchases=Math.round(32*this.options.conversion),visits=Math.max(purchases,Math.round(32*Math.min(.9,.32+this.options.conversion*1.25)));
      this.agents=Array.from({length:32},(_,i)=>{
        const type=types[i],start=Math.floor(rnd(i+4)*30),end=Math.floor(rnd(i+24)*30),walk=[nodes[start]];
        let current=start,last=-1;
        for(let s=0;s<35;s++){let possible=edges[current].filter(n=>n!==last&&n!==DOOR);if(!possible.length)possible=edges[current].filter(n=>n!==DOOR);const next=possible[Math.floor(rnd(i*41+s+830)*possible.length)];walk.push(nodes[next]);last=current;current=next;}
        const incoming=route(start,DOOR);if(incoming.length>1){const f=.15+rnd(i+813)*.65;incoming[0]={x:mix(incoming[0].x,incoming[1].x,f),y:mix(incoming[0].y,incoming[1].y,f)};}
        const exposedAt=rnd(i+320)*.70,visitAt=exposedAt+.12;
        return{id:i+1,name:NAMES[i],segmentIndex:type,segment:this.options.segments[type].name,member:type>=2,coat:shade(this.options.segments[type].color,[0,-10,9][i%3]),skin:['#EDC69A','#CCA07C','#E1B28B','#B98D70'][i%4],hair:['#574D44','#8A6849','#434D4A','#6F5549'][i%4],phase:rnd(i+520),lane:(i%3-1)*3,exposedAt,visitAt,purchaseAt:visitAt+.055,visits:ranks.indexOf(i)<visits,buys:ranks.indexOf(i)<purchases,incoming,outgoing:route(DOOR,end),walk};
      });
    }
    _agentPosition(a){
      const p=this._progress;if(!a.visits)return pathAt(a.walk,fract(p*1.3+a.phase));
      if(p<=a.visitAt)return pathAt(a.incoming,p/a.visitAt);
      if(p<=a.purchaseAt)return{...nodes[DOOR],x:nodes[DOOR].x+a.lane*2,dx:0,dy:0};
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
      return{id:a.id,name:a.name,segment:a.segment,member:a.member,status,quote:done?complete:(this.options.segments[a.segmentIndex].quote||quotes[a.segmentIndex])};
    }
    _notify(){const p=this._progress;this._counts={progress:p,day:Math.min(this.options.duration,Math.floor(p*this.options.duration)+1),visitors:this.agents.filter(a=>p>=a.exposedAt).length,visits:this.agents.filter(a=>a.visits&&p>=a.visitAt).length,purchases:this.agents.filter(a=>a.buys&&p>=a.purchaseAt).length};if(this.selected!=null){const selected=this.agents.find(a=>a.id===this.selected);if(selected)this.onSelect(this._profile(selected));}this.onTick(this._counts);}
    _frame(time){
      if(this._destroyed)return;const dt=this._last?Math.min((time-this._last)/1000,.06):0;this._last=time;
      if(this._playing&&document.visibilityState!=='hidden'){this._progress=clamp(this._progress+dt*this.speed/(this.options.duration*5),0,1);if(this._progress>=1)this._playing=false;this._dirty=true;}
      if(this._dirty){this.draw();this._dirty=false;}if(time-this._notifyAt>200){this._notifyAt=time;this._notify();}this.raf=requestAnimationFrame(this._frame);
    }
    rect(x,y,w,h,color){this.ctx.fillStyle=color;this.ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
    _tile(id,x,y,size=16){
      if(this.tiles.complete&&this.tiles.naturalWidth)this.ctx.drawImage(this.tiles,(id%12)*16,Math.floor(id/12)*16,16,16,Math.round(x),Math.round(y),size,size);
      else this.rect(x,y,size,size,id<12?'#90B872':id<44?'#DDBF8F':id<72?'#8395A9':'#CFB68E');
    }
    _prepareMap(){
      const old=this.ctx;this.ctx=this.background.getContext('2d');this.ctx.imageSmoothingEnabled=false;
      for(let y=0;y<H;y+=16)for(let x=0;x<W;x+=16){const r=rnd(x*2+y*7);this._tile(r>.91?2:r>.49?1:0,x,y);}
      // Slightly darker hedges and flower banks keep the edge richly planted.
      for(let x=0;x<W;x+=16){if(x<704||x>752){this._tile(1,x,0);this._tile(1,x,H-16);}}
      // Pedestrian network. No agent crosses water except on the wooden bridge.
      for(const [a,b]of links){if(a===DOOR||b===DOOR)continue;const p=nodes[a],q=nodes[b];if((p.x<752&&q.x>704)||(q.x<752&&p.x>704))continue;const major=p.y===228&&q.y===228||p.x===384&&q.x===384;this._path(p.x,p.y,q.x,q.y,major?32:18);}
      this._path(544,160,544,192,24);
      // Shop forecourts are light cobblestone, with small planting pockets.
      for(const [x,y,w,h]of[[58,143,142,30],[456,157,178,32],[52,387,150,22],[457,386,176,22]])this._court(x,y,w,h);
      this._river();this._bridge();
      // Lower-right village garden and allotment boxes.
      this._fence(470,276,144);this._flowerbed(475,283,44,12);this._flowerbed(535,282,52,12);
      this._flowerbed(248,167,72,13);this._flowerbed(82,45,81,10);
      this._flowerbed(745,301,45,12);this._flowerbed(637,365,26,18);
      // Buildings are tiled at native 16px for a true top-down RPG silhouette.
      BUILDINGS.forEach(b=>this._building(b));
      const trees=[[16,60,1],[10,120,1],[23,160,0],[21,320,1],[8,374,1],[61,21,0],[163,14,1],[296,12,0],[429,10,1],[635,14,0],[672,65,1],[654,123,0],[673,155,1],[667,310,1],[653,391,0],[764,30,1],[783,74,1],[755,114,0],[798,147,1],[758,283,1],[802,334,1],[762,374,0],[787,399,1],[18,432,0],[117,429,0],[305,429,0],[505,430,1],[613,430,0],[353,91,0],[351,334,0]];
      for(const tree of trees)this._tree(...tree);
      // Small lived-in details: benches, café tables, signs, lamps and market.
      for(const [x,y]of[[260,250],[97,177],[593,254],[741,264],[338,174]])this._bench(x,y);
      this._table(74,172);this._table(162,174);this._table(182,284);
      for(const [x,y]of[[360,169],[420,251],[639,173],[48,247],[216,404]])this._lamp(x,y);
      this._market(470,245);this._market(539,245);this._mailbox(410,123);
      this._notice(410,319);this._notice(193,253);
      this._fountainBase(308,251);
      this._fence(63,400,124);this._fence(237,399,112);
      this._sign(543,29,THEMES[this.options.module].center,'#465D55','#F1E8CF');
      this._sign(510,281,THEMES[this.options.module].market,'#6F7B61','#EEE3C7');
      this._bicycle(648,247);this._bicycle(642,265);
      // Quiet reeds and lily pads along the water.
      for(let i=0;i<18;i++){const y=17+i*23;this.rect(699+(i%2)*3,y,2,6,'#718C69');this.rect(703,y-2,2,8,'#ACC180');if(i%3===0){this.rect(739,y+6,6,2,'#7EA884');this.rect(741,y+4,3,5,'#88B48D');}}
      this.ctx=old;this._dirty=true;
    }
    _path(x1,y1,x2,y2,width){
      const left=Math.min(x1,x2)-width/2,top=Math.min(y1,y2)-width/2,w=Math.abs(x1-x2)+width,h=Math.abs(y1-y2)+width;
      this.rect(left-2,top-2,w+4,h+4,'#A8B87C');this.rect(left,top,w,h,'#DDBF8F');
      for(let x=Math.ceil(left/8)*8;x<left+w;x+=8)for(let y=Math.ceil(top/8)*8;y<top+h;y+=8){const r=rnd(x*9+y);if(r>.87)this.rect(x,y,2,1,r>.95?'#F1D7A9':'#C6A675');}
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
      this._sign(x+w/2,ground+12,THEMES[this.options.module].names[b.index]);
      this._pot(x+5,ground-3);this._pot(x+w-14,ground-3);
    }
    _sign(x,y,text,bg='#F4E7C9',fg='#596453'){
      const c=this.ctx;c.font='600 8px "Microsoft YaHei", sans-serif';const w=Math.ceil(c.measureText(text).width)+12;
      this.rect(x-w/2-1,y-7,w+2,14,'#716E5D');this.rect(x-w/2,y-6,w,12,bg);
      c.fillStyle=fg;c.textAlign='center';c.textBaseline='middle';c.fillText(text,Math.round(x),Math.round(y));
    }
    _tree(x,y,big=0){
      if(big){const matrix=[[6,7,8],[18,19,20],[30,31,32]];for(let r=0;r<3;r++)for(let c=0;c<3;c++)this._tile(matrix[r][c],x+c*12,y+r*12,12);}
      else{this._tile(4,x,y,16);this._tile(16,x,y+16,16);}
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
      if(!this.width)return;const c=this.ctx;c.imageSmoothingEnabled=false;c.clearRect(0,0,W,H);c.drawImage(this.background,0,0);
      this._environment();this.positions=[];
      const sorted=this.agents.map(a=>({a,p:this._agentPosition(a)})).sort((a,b)=>a.p.y-b.p.y);
      for(const {a,p}of sorted){p.x+=a.lane;p.y+=a.lane*.4;this.positions.push({id:a.id,x:p.x,y:p.y,screenX:this.offsetX+p.x*this.scale,screenY:this.offsetY+p.y*this.scale});this._person(a,p);}
      this._conversations();
      const v=this.viewCtx;v.setTransform(this.dpr,0,0,this.dpr,0,0);v.imageSmoothingEnabled=false;v.fillStyle='#CFDCB4';v.fillRect(0,0,this.width,this.height);v.drawImage(this.surface,this.offsetX,this.offsetY,W*this.scale,H*this.scale);
      window.sceneDebug={...this._counts,style:'top-down-pixel-village',module:this.options.module,progress:this._progress,playing:this._playing,options:{...this.options},positions:this.positions.map(p=>({...p}))};
    }
    _environment(){
      const tick=this._progress*this.options.duration*5;
      // Flowing water, a rippling fountain, smoke and a fluttering shop flag.
      for(let i=0;i<22;i++){const x=710+Math.floor(rnd(i+119)*31),y=Math.floor((i*23+tick*4)%H);if(y>201&&y<251)continue;this.rect(x,y,4+i%4,1,'#B9E0D7');if(i%3===0)this.rect(x-2,y+3,3,1,'#68A5B1');}
      for(let i=0;i<3;i++){const f=fract(tick*.8+i/3),s=3+Math.floor(f*13);this.rect(308-s,253-Math.floor(s*.45),s*2,1,'#A6D2C9');this.rect(308-s,253+Math.floor(s*.45),s*2,1,'#A6D2C9');}
      this.rect(307,230,2,17,'#D4E6D8');this.rect(305,231,6,2,'#C5E0D7');
      for(let i=0;i<3;i++){const f=fract(tick*.25+i*.33),xx=165+Math.floor(Math.sin(f*4)*4),yy=76-Math.floor(f*26);this.rect(xx,yy,4+i%2,3,'#E1E0CA');this.rect(xx+2,yy-2,4,3,'#E9E7D3');}
      this.rect(646,123,2,39,'#7A7E64');const wave=Math.floor(Math.sin(tick*3)*2);this.rect(648,125,17,9,'#D9BC83');this.rect(651,134,14,2,'#BC9F6F');this.rect(663,125+wave,5,8,'#D9BC83');
      // A small town cat strolling beside the bakery, animated with the same clock.
      const catX=95+Math.floor((Math.sin(tick*.23)+1)*21),catY=397;
      this.rect(catX,catY-4,11,5,'#C4AB7B');this.rect(catX+8,catY-7,6,6,'#C4AB7B');this.rect(catX+8,catY-9,2,3,'#A98C5D');this.rect(catX+12,catY-9,2,3,'#A98C5D');this.rect(catX+2,catY+1,2,2,'#8F7D5B');this.rect(catX+8,catY+1,2,2,'#8F7D5B');this.rect(catX-3,catY-6,3,3,'#C4AB7B');
      // A notice changes with the scenario; public scenes never show coupon sales.
      const label=this.options.module==='public'?'服务开放':this.options.module==='growth'?'体验进行中':this.options.scheme==='baseline'?'新品体验':this.options.scheme==='member'?'会员活动':'新品优惠';
      this._sign(626,193,label,'#F0DFC0','#746449');
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
      const phase=Math.floor(this._progress*this.options.duration*5/3),base=phase%32;
      const speakers=[base,(base+11)%32,(base+23)%32];
      for(const index of speakers){const a=this.agents[index];if(a.id===this.selected)continue;const p=this._agentPosition(a),t=THEMES[this.options.module];let text=t.speech[(phase+a.segmentIndex)%t.speech.length];
        if(a.visits&&this._progress>=a.visitAt&&this._progress<a.purchaseAt)text=this.options.module==='public'?'咨询办理流程':this.options.module==='growth'?'正在体验功能':'进店看看';
        if(this.options.module==='merchant'&&this._couponAvailable(a)&&phase%2===0)text=this.options.scheme==='member'?'会员权益可用':'有活动优惠';
        if(a.buys&&this._progress>=a.purchaseAt)text=t.done;
        this._bubble(p.x+a.lane,p.y-25,text,false);
      }
      if(this.selected){const a=this.agents[this.selected-1],p=this._agentPosition(a);this._bubble(p.x+a.lane,p.y-26,`${a.name} · ${this._profile(a).status}`,true);}
    }
    _bubble(x,y,text,selected){
      const c=this.ctx;c.font=`${selected?'600':'500'} 9px "Microsoft YaHei", sans-serif`;const w=Math.ceil(c.measureText(text).width)+12;
      const xx=clamp(Math.round(x-w/2),3,W-w-3),yy=clamp(Math.round(y-17),3,H-22);
      this.rect(xx+2,yy+2,w,18,'#556D592E');this.rect(xx,yy,w,17,selected?'#416D5E':'#FFFFE9');
      this.rect(xx-1,yy+2,1,13,selected?'#416D5E':'#7F8C6D');this.rect(xx+w,yy+2,1,13,selected?'#416D5E':'#7F8C6D');
      this.rect(xx+2,yy-1,w-4,1,selected?'#416D5E':'#7F8C6D');this.rect(xx+2,yy+17,w-4,1,selected?'#416D5E':'#7F8C6D');
      const pointer=clamp(Math.round(x),xx+5,xx+w-5);this.rect(pointer-2,yy+17,5,2,selected?'#416D5E':'#FFFFE9');this.rect(pointer,yy+19,2,2,selected?'#416D5E':'#7F8C6D');
      c.fillStyle=selected?'#FFFDE9':'#5E6C56';c.textAlign='center';c.textBaseline='middle';c.fillText(text,xx+w/2,yy+8);
    }
  }
  window.TownScene=TownScene;
})();
