(function(){
"use strict";
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s)), S=window.YanceScenarios, M=window.YanceMaps;
const STORE="yance-workspace-v4", SEGMENT_FLOOR=2;
const safeText=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const copy=v=>JSON.parse(JSON.stringify(v));
let ws={active:"merchant",states:{},names:{},studies:[]},scene=null,configuring=false,currentView="world",speed=1,toastId,lastProfile=null;
const UI_STORE="yance-interface-v1",motionQuery=matchMedia("(prefers-reduced-motion: reduce)");
const preferenceDefaults={textScale:100,density:"comfortable",sceneSize:"balanced",motion:"system",autoplay:true,speed:1,hints:true};
let prefs={...preferenceDefaults},moduleUI={},saveTimer,uiSaveTimer,renderFrame=0,transitionAnimations=[],switchVersion=0,scrubbing=false,scrubWasPlaying=false,changingModule=false;
let resultKey="",resultMemo=null,feedbackKey="",navigationFrame=0;const customUndo={};let rangeUndoKey=null;const dialogFocus=new WeakMap();
try{const stored=JSON.parse(localStorage.getItem(UI_STORE)||"null");if(stored&&typeof stored==="object"){const p=stored.preferences||{};for(const [key,allowed] of Object.entries({textScale:[100,112,125],density:["comfortable","compact"],sceneSize:["compact","balanced","large"],motion:["system","reduce"],speed:[1,2,4]})){if(allowed.includes(p[key]))prefs[key]=p[key]}for(const key of ["autoplay","hints"])if(typeof p[key]==="boolean")prefs[key]=p[key];if(stored.modules&&typeof stored.modules==="object")moduleUI=stored.modules}}catch{}
const validatedUI=new Set();
const reduceMotion=()=>prefs.motion==="reduce"||motionQuery.matches;
function ui(id=ws.active){if(validatedUI.has(id))return moduleUI[id];let u=moduleUI[id];if(!u||typeof u!=="object")u={};const camera=u.camera&&typeof u.camera==="object"?u.camera:{};u={view:["world","comparison","audience"].includes(u.view)?u.view:"world",progress:Number.isFinite(u.progress)?Math.max(0,Math.min(1,u.progress)):0,playing:typeof u.playing==="boolean"?u.playing:prefs.autoplay&&!reduceMotion(),selected:Number.isInteger(u.selected)&&u.selected>=1&&u.selected<=128?u.selected:null,sampleMode:u.sampleMode==="manual"?"manual":"auto",count:Number.isFinite(u.count)?Math.max(8,Math.min(128,Math.round(u.count))):32,lighting:["auto","day","night"].includes(u.lighting)?u.lighting:"auto",environment:["clear","rain","autumn"].includes(u.environment)?u.environment:"clear",context:typeof u.context==="string"?u.context.slice(0,120):"",mapId:M.get(u.mapId,id).id,facilities:["standard","active","service"].includes(u.facilities)?u.facilities:"standard",flow:["steady","peak","spread"].includes(u.flow)?u.flow:"steady",advanced:!!u.advanced,scrolls:u.scrolls&&typeof u.scrolls==="object"?u.scrolls:{},camera:{zoom:Number.isFinite(camera.zoom)?Math.max(1,Math.min(2.5,camera.zoom)):1,panX:Number.isFinite(camera.panX)?camera.panX:0,panY:Number.isFinite(camera.panY)?camera.panY:0}};moduleUI[id]=u;validatedUI.add(id);return u}
const SCENE_FIELDS=['mapId','facilities','flow','context','lighting','environment','sampleMode','count','camera'];
function sceneSnapshot(id=ws.active){const current=ui(id),snapshot={};SCENE_FIELDS.forEach(key=>snapshot[key]=copy(current[key]));return snapshot}
function restoreScene(id,snapshot){const current=ui(id),source=snapshot||{mapId:M.defaults[id],facilities:'standard',flow:'steady',context:'',lighting:'auto',environment:'clear',sampleMode:'auto',count:32,camera:{zoom:1,panX:0,panY:0}};SCENE_FIELDS.forEach(key=>{if(Object.prototype.hasOwnProperty.call(source,key))current[key]=source[key]});validatedUI.delete(id);ui(id)}
function persistUI(immediate=false){clearTimeout(uiSaveTimer);const write=()=>{try{localStorage.setItem(UI_STORE,JSON.stringify({preferences:prefs,modules:moduleUI}))}catch{$("#preference-note").textContent="浏览器未允许保存偏好，本次设置仍有效。"}};if(immediate)write();else uiSaveTimer=setTimeout(write,300)}

try{const raw=JSON.parse(localStorage.getItem(STORE)||"null");if(raw&&typeof raw==="object"){if(S.modules.some(m=>m.id===raw.active))ws.active=raw.active;if(raw.states&&typeof raw.states==="object")ws.states=raw.states;if(raw.names&&typeof raw.names==="object")ws.names=raw.names;if(Array.isArray(raw.studies))ws.studies=raw.studies.slice(0,40).filter(x=>x&&S.modules.some(m=>m.id===x.module)&&typeof x.name==="string").map(x=>({id:String(x.id).slice(0,70),module:x.module,name:x.name.slice(0,80),date:typeof x.date==="string"?x.date:"",state:S.normalise(x.module,x.state),scene:x.scene&&typeof x.scene==="object"?x.scene:null}))}}catch{}
S.modules.forEach(m=>{ws.states[m.id]=S.normalise(m.id,ws.states[m.id]);ws.names[m.id]=typeof ws.names[m.id]==="string"?ws.names[m.id].slice(0,100):m.strategyTitle});
const paramModule=new URLSearchParams(location.search).get("scene");if(S.modules.some(m=>m.id===paramModule))ws.active=paramModule;
const config=()=>S.getModule(ws.active),state=()=>ws.states[ws.active];
function result(){const key=ws.active+":"+JSON.stringify(state());if(key!==resultKey){resultKey=key;resultMemo=S.compute(ws.active,state())}return resultMemo}


const PIXELS={clock:'M4 1h8v2h2v10h-2v2H4v-2H2V3h2Zm1 2v10h6V3Zm2 1h2v4h2v2H7Z',bus:'M4 1h8v2h2v10h-2v2h-2v-2H6v2H4v-2H2V3h2Zm0 3v4h8V4Zm0 6v2h2v-2Zm6 0v2h2v-2Z',play:'M5 3h2v2h2v2h2v2H9v2H7v2H5Z',pause:'M4 3h3v10H4Zm5 0h3v10H9Z',restart:'M3 3h2v2h7v2h2v5h-2v2H6v-2h6V7H5v2H3Zm-2 2h2v2H1Z',person:'M6 1h4v2h2v4h-2v2h3v5h-3v2H8v-2H6v2H4v-2H3V9h3V7H4V3h2Zm0 2v4h4V3Z',map:'M2 3h4V1h4v2h4v11h-4v-2H6v2H2Zm2 2v7h2V5Zm4-2v7h2V3Zm4 2v7h1V5Z',chart:'M2 13h12v2H1V1h2v12Zm2-4h2v3H4Zm4-4h2v7H8Zm4-4h2v11h-2Z',store:'M2 2h12v2H2ZM1 4h14v3h-2v7H3V7H1Zm4 4v4h2V8Zm4 0v4h2V8Z',civic:'M7 1h2v2h3v2h3v2H1V5h3V3h3ZM2 8h2v5H2Zm5 0h2v5H7Zm5 0h2v5h-2ZM1 14h14v2H1Z',lab:'M3 1h10v2h-2v4l4 7H1l4-7V3H3Zm4 2v5l-2 4h6L9 8V3Z',plus:'M7 2h2v5h5v2H9v5H7V9H2V7h5Z',minus:'M2 7h12v2H2Z',focus:'M1 1h5v2H3v3H1Zm9 0h5v5h-2V3h-3ZM1 10h2v3h3v2H1Zm12 0h2v5h-5v-2h3Z',ticket:'M1 4h14v3h-2v2h2v3H1V9h2V7H1Zm6 1v2h2V5Zm0 4v2h2V9Z',steps:'M1 2h4v3H1Zm5 3h4v3H6Zm5 3h4v6h-4Z',sun:'M6 4h4v2h2v4h-2v2H6v-2H4V6h2ZM7 0h2v2H7Zm0 14h2v2H7ZM0 7h2v2H0Zm14 0h2v2h-2Z',rain:'M4 2h6v2h3v2h2v3H1V6h3Zm0 9h2v3H4Zm4 1h2v3H8Zm4-1h2v3h-2Z',leaf:'M7 1h6v6h-2v3H8v2H5v3H3v-3h2V9H3V6h2V3h2Z'};
function pixelIcon(name){return '<svg class="pixel-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false" shape-rendering="crispEdges"><path fill="currentColor" stroke="none" d="'+(PIXELS[name]||PIXELS.focus)+'"/></svg>'}
const icons=()=>{if(window.lucide)lucide.createIcons({attrs:{"stroke-width":1.65,"aria-hidden":"true","focusable":"false"}});$$('[data-pixel]').forEach(el=>{const name=el.dataset.pixel;el.outerHTML=pixelIcon(name)})};
const nr=(v,d=0)=>Number.isFinite(v)?new Intl.NumberFormat("zh-CN",{maximumFractionDigits:d,minimumFractionDigits:d}).format(v):"—";
function fmt(v,m={format:"integer"}){if(!Number.isFinite(v))return"—";if(m.format==="percent")return nr(v,1)+"%";if(m.format==="currency")return (v<0?"−":"")+"¥"+nr(Math.abs(v),m.key==="unitCost"?2:0);return nr(v)}
function currentMeta(){const r=result();return config().metrics.concat(config().tableMetrics).find(m=>m.key===r.chartKey)||{key:r.chartKey,label:r.chartLabel,format:r.chartUnit==="元"?"currency":r.chartUnit==="%"?"percent":"integer",unit:r.chartUnit}}
function flushPersist(){clearTimeout(saveTimer);try{localStorage.setItem(STORE,JSON.stringify(ws));$("#saved-status").textContent="已保存到此浏览器"}catch{$("#saved-status").textContent="未能自动保存，请下载报告保留研究"}}
function persist(){$("#library-count").textContent=ws.studies.length;clearTimeout(saveTimer);saveTimer=setTimeout(flushPersist,300)}
function scheduleRender(){if(renderFrame)return;renderFrame=requestAnimationFrame(()=>{renderFrame=0;renderAll()})}
function flushRender(){if(renderFrame){cancelAnimationFrame(renderFrame);renderFrame=0;renderAll()}}
function notify(t){clearTimeout(toastId);$("#toast").textContent=t;$("#toast").classList.add("show");toastId=setTimeout(()=>$("#toast").classList.remove("show"),2300)}
function openDialog(id){flushRender();const d=$("#"+id);if(!d.open){dialogFocus.set(d,document.activeElement);d.showModal()}icons();syncScenePlayback()}
function closeDialogs(){$$("dialog[open]").forEach(d=>d.close())}
function moduleMenu(){$("#module-tabs").innerHTML=["public","growth","merchant"].map(id=>S.getModule(id)).map(m=>'<button role="tab" aria-selected="'+(m.id===ws.active)+'" tabindex="'+(m.id===ws.active?0:-1)+'" data-module="'+m.id+'"><span class="module-symbol">'+pixelIcon({public:"civic",growth:"lab",merchant:"store"}[m.id])+'</span><span><b>'+safeText(m.title)+' <em>'+safeText(m.productLabel)+'</em></b><small>'+safeText(m.audience||m.english)+'</small></span></button>').join("");icons()}
function controlMarkup(c){
 const custom=state().scheme==="custom"&&!!c.scheme,value=(custom?state().custom.params:state().params)[c.key],id="param-"+c.key;
 const label='<span>'+safeText(c.label)+(c.type==="range"?'<output for="'+id+'">'+safeText(value)+' <small>'+safeText(c.unit)+'</small></output>':c.unit?'<small class="control-unit">'+safeText(c.unit)+'</small>':"")+'</span>';
 let field="";
 if(c.type==="select")field='<select id="'+id+'" data-param="'+c.key+'" aria-describedby="'+id+'-hint">'+c.options.map(o=>'<option value="'+safeText(o.value)+'"'+(String(o.value)===String(value)?" selected":"")+'>'+safeText(o.label)+'</option>').join("")+'</select>';
 else field='<input id="'+id+'" data-param="'+c.key+'" type="'+(c.type==="range"?"range":"number")+'" min="'+c.min+'" max="'+c.max+'" step="'+c.step+'" value="'+value+'" aria-label="'+safeText(c.label)+'" aria-describedby="'+id+'-hint">';
 return'<label class="field '+(['daily','demand'].includes(c.key)?'scale-field':'')+'">'+label+field+(c.type==="range"?'<div class="range-extents"><span>'+c.min+'</span><span>'+c.max+' '+safeText(c.unit)+'</span></div>':"")+'<p id="'+id+'-hint" class="'+"control-hint"+'">'+safeText(c.hint)+'</p></label>';
}
function renderStrategyChoices(){
 const c=config(),s=state(),schemeIcons={growth:["route","list-filter","messages-square"],merchant:["tag","ticket","badge-check"],public:["building-2","clock-4","bus-front"]};
 const choices=c.schemes.map((v,i)=>({...v,icon:schemeIcons[c.id][i]}));
 choices.push({id:"custom",name:s.custom.enabled?s.custom.name:"创建我的策略",desc:s.custom.enabled?"独立调整参数，保留预设方案作对照。":"选一种行动方式，命名并设置自己的方案。",tag:"我的策略",icon:s.custom.enabled?"pencil-line":"plus"});
 $("#scheme-options").innerHTML=choices.map(v=>'<button type="button" class="'+(v.id==="custom"?"custom-choice":"")+'" role="radio" aria-checked="'+(s.scheme===v.id)+'" tabindex="'+(s.scheme===v.id?0:-1)+'" data-scheme="'+v.id+'"><span class="scheme-symbol">'+pixelIcon(v.id==="custom"?"plus":v.id==="baseline"?"map":c.id==="public"?(v.id==="open"?"clock":"bus"):c.id==="growth"?(v.id==="open"?"steps":"person"):(v.id==="open"?"ticket":"person"))+'</span><span class="radio"></span><span class="scheme-copy"><b>'+safeText(v.name)+'</b><small>'+safeText(v.desc)+'</small></span><span class="scheme-tag">'+(s.scheme===v.id?"当前策略":safeText(v.tag))+'</span></button>').join("");icons();
}
function renderSettings(){
 const c=config(),s=state(),custom=s.scheme==="custom",scheme=custom?s.custom.baseScheme:s.scheme;
 $("#strategy-editor").classList.toggle("is-baseline",scheme==="baseline");
 renderStrategyChoices();
 $("#custom-identity").hidden=!custom;$("#custom-actions").hidden=!custom;$("#undo-custom").disabled=!customUndo[ws.active];$("#custom-name").value=s.custom.name;
 $("#custom-template").innerHTML=c.schemes.filter(x=>x.id!=="baseline").map(v=>'<option value="'+v.id+'"'+(v.id===s.custom.baseScheme?' selected':'')+'>'+safeText(v.name)+'</option>').join("");
 $("#copy-strategy").hidden=custom||scheme==="baseline";$("#copy-strategy").dataset.confirm="false";$("#copy-strategy").innerHTML='<i data-lucide="copy-plus"></i>复制为我的策略';
 const controls=c.controls.filter(x=>x.scheme===scheme);
 $("#variant-controls").innerHTML=controls.length?controls.map(controlMarkup).join(""):'<p class="baseline-note">这是现状参照。选择另一种做法，查看改变行动后可能带来的差异。</p>';
 $("#main-controls").innerHTML=c.controls.filter(x=>x.section==="shared"&&["days","budget","daily","demand"].includes(x.key)).map(controlMarkup).join("");
 const advanced=c.controls.filter(x=>x.section==="shared"&&!["days","budget","daily","demand"].includes(x.key));$("#advanced-controls").innerHTML=advanced.map(controlMarkup).join("");$(".advanced").hidden=!advanced.length;
 $("#objective").innerHTML=c.objectives.map(o=>'<option value="'+o.value+'"'+(o.value===s.objective?" selected":"")+'>'+safeText(o.label)+'</option>').join("");
 $(".advanced summary").innerHTML=(c.id==="merchant"?"售价与成本":c.id==="growth"?"服务能力":"现有窗口能力")+'<i data-lucide="chevron-down"></i>';
 $(".advanced").open=ui().advanced;icons();syncControls();
}
function syncControls(){
 $$("[data-param]").forEach(el=>{const c=config().controls.find(c=>c.key===el.dataset.param);el.value=(state().scheme==="custom"&&c.scheme?state().custom.params:state().params)[c.key];const out=el.closest("label").querySelector("output");if(out)out.innerHTML=safeText(el.value)+' <small>'+safeText(c.unit)+'</small>'});
 $("#objective").value=state().objective;$("#period-label").textContent=state().params.days+" 天观察窗口";$("#day-total").textContent=state().params.days+" 天";
 $("#world-location").textContent=result().selected.name;$("#active-strategy-name").textContent="正在调整 · "+result().selected.name;$("#world-count-summary").dataset.context=ui().context;
}
function renderModule(){
 const c=config();document.documentElement.dataset.product=c.id;moduleMenu();$("#module-caption").textContent=(c.audience||c.title)+" · "+c.title;$("#study-title").textContent=c.strategyTitle;$("#study-decision").textContent=c.decision;$("#world-title").textContent={growth:"创新园区 · 产品体验",merchant:"滨水商街 · 新品集市",public:"市民广场 · 社区服务"}[c.id];renderEnvironment();
 $("#audience-title").textContent=c.audienceTitle;$("#audience-definition").textContent=c.audienceNote;$("#visitor-select").dataset.signature="";
 $("#world-legend").innerHTML=c.segments4.map(s=>'<span style="--seg:'+s.color+'"><i></i>'+s.name+'</span>').join("");
 $("#audience-cards").innerHTML=c.segments4.map((s,i)=>'<article class="audience-card" style="--seg:'+s.color+';--seg-soft:'+s.color+'20"><div class="audience-head"><div class="audience-avatar">'+avatar(i,s.color)+'</div><div><h4>'+s.name+'</h4><small>'+s.short+'</small></div></div><label class="audience-amount"><span class="sr-only">'+safeText(s.name)+'比例</span><input data-weight-number="'+i+'" type="number" min="2" max="94" step="1"><span>%</span></label><p>'+s.desc+'</p><input data-weight="'+i+'" type="range" min="2" max="94" step="1" aria-label="'+s.name+'占比"></article>').join("");
 resetObserver();renderSettings();renderAll({sceneUpdate:false});$("#report-name").value=ws.names[ws.active];icons()
}
function resetObserver(){lastProfile=null;$("#observer-title").textContent="选择一位观察对象";$("#observer-status").textContent="";$("#observer-status").hidden=true;$("#observer-quote").textContent="点击人物，查看其当前行动与反馈。";$("#observer-destination").hidden=true;$("#focus-observer").disabled=true;$(".observer").classList.remove("is-observing");$("#visitor-select").value="";$("#portrait").style.background="";$("#portrait").innerHTML=avatar(1,"#7895aa");$("#expanded-observer-name").textContent="选择场景人物";$("#expanded-observer-quote").textContent="查看其当前行为与反馈。";$("#expanded-observer").hidden=true}
function renderMix(){
 const c=config(),s=state();
 const marks=s.weights.map((w,i)=>'<span style="width:'+w+'%;background:'+c.segments4[i].color+'"></span>').join("");
 const legend=c.segments4.map((g,i)=>'<span style="--seg:'+g.color+'"><i></i><span class="mix-name">'+safeText(g.name)+'</span><b class="mix-value">'+nr(s.weights[i],Number.isInteger(s.weights[i])?0:1)+'%</b></span>').join("");
 $("#mini-mix").innerHTML=marks;$("#full-mix").innerHTML=marks;$("#mix-summary").innerHTML=legend;$("#full-mix-legend").innerHTML=legend;$("#mini-mix").setAttribute("aria-label",c.segments4.map((g,i)=>g.name+" "+nr(s.weights[i],1)+"%").join("，"));
 $$("[data-weight]").forEach(el=>{const i=+el.dataset.weight;el.value=s.weights[i];$('[data-weight-number="'+i+'"]').value=nr(s.weights[i],Number.isInteger(s.weights[i])?0:1)});
}

function avatar(id,color){const hair=['#514b46','#846049','#384c4b','#705747'][id%4];return '<svg viewBox="0 0 24 30" shape-rendering="crispEdges" class="person-avatar" aria-hidden="true"><path fill="'+hair+'" d="M8 3h8v2h2v7H6V5h2Z"/><path fill="#ddb796" d="M8 7h8v7H8Z"/><path fill="#394c46" d="M9 9h1v1H9Zm5 0h1v1h-1Z"/><path fill="'+color+'" d="M6 14h12v9H6Zm-2 2h2v8H4Zm14 0h2v8h-2Z"/><path fill="#536166" d="M7 23h4v5H7Zm6 0h4v5h-4Z"/><path fill="#344449" d="M6 27h5v2H6Zm7 0h5v2h-5Z"/></svg>'}
function mapPreview(map){
 const xs=map.xs||[32,216,384,440,672,792],ys=map.ys||[32,192,228,272,420],buildings=map.buildings||[[0,64,64,128,3],[1,240,64,96,3],[2,464,48,160,5],[3,64,304,128,3],[4,240,304,112,3]];
 const paths=[];for(let j=0;j<5;j++)for(let i=0;i<6;i++){if(i<5&&(j===2||map.pattern==='grid'||map.pattern==='lanes'&&j>0&&j<4||map.pattern==='loop'&&(j===0||j===4)||map.pattern==='alleys'&&(i+j)%2===0||map.pattern==='cross'&&(i===1||i===3)))paths.push('M'+xs[i]+' '+ys[j]+'H'+xs[i+1]);if(j<4&&(map.pattern!=='loop'||i%2===0))paths.push('M'+xs[i]+' '+ys[j]+'V'+ys[j+1]);}
 const color=map.module==='public'?'#6b9b83':map.module==='growth'?'#609a9b':'#b68162';
 const motif={grid:'<circle cx="310" cy="250" r="48" fill="#a1c8bf" stroke="#e9eedb" stroke-width="13"/>',alleys:'<path d="M225 285h120v-78h92" fill="none" stroke="#81ab88" stroke-width="23"/>',lanes:'<rect x="215" y="196" width="330" height="38" fill="#8eafa9"/><path d="M234 215h290" stroke="#e8dfbb" stroke-width="5" stroke-dasharray="25 17"/>',cross:'<path d="M360 120v245M215 245h310" stroke="#87aca0" stroke-width="30"/>',loop:'<rect x="245" y="150" width="235" height="180" rx="12" fill="none" stroke="#789d99" stroke-width="25"/><rect x="300" y="208" width="125" height="68" fill="#a0c9c3"/>'}[map.pattern];
 return'<svg viewBox="0 0 832 448" aria-hidden="true" preserveAspectRatio="none"><rect width="832" height="448" fill="'+(map.id.includes('night')?'#9faa8e':'#dce7d7')+'"/><path d="'+paths.join(' ')+'" fill="none" stroke="#eee9d8" stroke-width="28"/><path d="'+paths.join(' ')+'" fill="none" stroke="#b8c8b6" stroke-width="2"/>'+motif+buildings.map(([index,x,y,w,rows])=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+(rows*16+30)+'" fill="'+(index===2?color:'#849d94')+'"/>').join('')+(map.river?'<rect x="705" width="47" height="448" fill="#86b8bc"/><rect x="698" y="207" width="62" height="44" fill="#c6b18d"/>':'')+'<circle cx="'+(map.primary?.[0]||544)+'" cy="'+(map.primary?.[1]||176)+'" r="13" fill="#ffde8e" stroke="#48625a" stroke-width="5"/></svg>';
}
function renderMapPicker(){
 const selected=ui().mapId;
 $("#map-picker").innerHTML=M.forModule(ws.active).map(map=>'<button type="button" class="map-choice" data-map="'+map.id+'" aria-pressed="'+(selected===map.id)+'">'+mapPreview(map)+'<span><b>'+safeText(map.name)+'</b><small>'+safeText(map.summary)+'</small></span></button>').join('');
}
function renderFlowPreview(){
 let node=$("#flow-preview");if(!node){$(".scene-builder-grid").insertAdjacentHTML('afterend','<div class="flow-preview" id="flow-preview" role="img"></div>');node=$("#flow-preview")}
 const curves={steady:[4,4,5,4,5,4,4,5,4,5,4,4],peak:[1,2,3,5,9,12,10,6,3,2,1,1],spread:[5,2,6,3,4,2,6,3,5,2,4,3]},labels={steady:'均匀到访',peak:'短时集中',spread:'分散到访'},flow=ui().flow;
 node.setAttribute('aria-label','客流节奏预览：'+labels[flow]);node.innerHTML='<span>到访分布 · '+labels[flow]+'</span><div class="flow-bars">'+curves[flow].map(n=>'<i style="height:'+n*7+'%"></i>').join('')+'</div>';
}
function contextConditions(text){
 const found={},labels=[],match=(test,value,key,label)=>{if(test.test(text)){found[key]=value;labels.push(label)}};
 const mapRules={public:[[/枢纽|地铁|车站|换乘/,'public-transit'],[/老城|旧城|老街/,'public-oldtown'],[/社区|邻里|住宅/,'public-neighborhood'],[/广场|市民大厅/,'public-plaza']],growth:[[/展场|展馆|展厅|展会/,'growth-expo'],[/总部|办公园区|办公楼/,'growth-headquarters'],[/街区|快闪|体验店/,'growth-city'],[/园区|创新/,'growth-campus']],merchant:[[/夜市|夜间餐饮|餐饮街/,'merchant-night'],[/邻里|社区|底商/,'merchant-neighborhood'],[/商业街|沿街店面|十字街/,'merchant-highstreet'],[/滨水|沿河|河岸|集市/,'merchant-riverside']]};
 const entry=mapRules[ws.active].find(([re])=>re.test(text));if(entry){found.mapId=entry[1];labels.push('地图：'+M.get(entry[1],ws.active).name)}
 match(/雨|阴雨|下雨/,'rain','environment','细雨');if(!found.environment)match(/秋|落叶/,'autumn','environment','秋日');
 match(/夜间|夜晚|晚上|傍晚/,'night','lighting','夜间光照');if(!found.lighting)match(/白天|白昼|上午/,'day','lighting','白昼光照');
 match(/全天|分散|错峰/,'spread','flow','全天分散客流');if(!found.flow)match(/高峰|集中|周末|下班/,'peak','flow','高峰客流');
 match(/服务点|窗口|咨询|便民/,'service','facilities','服务优先设施');if(!found.facilities)match(/活动|交流|演示|促销/,'active','facilities','活动优先设施');
 return{found,labels};
}
function updateContextFeedback(applied=false){
 const text=$("#scene-context").value.trim(),{found,labels}=contextConditions(text),effective=applied||labels.length>0&&Object.entries(found).every(([key,value])=>ui()[key]===value);
 $("#apply-context").disabled=!labels.length||effective;
 $("#context-feedback").textContent=!text?'输入背景后，会显示可应用的场景条件。':labels.length?(effective?'已应用：':'识别到：')+labels.join(' · ')+(effective?'。其余文字保留为备注。':'；应用后改变可视化场景。'):'这段文字已作为研究备注保存；未识别到可改变画面的条件。';
}
function applyContext(){const{found,labels}=contextConditions(ui().context);if(!labels.length){updateContextFeedback();return}Object.assign(ui(),found);renderEnvironment();updateScene();updateContextFeedback(true);persistUI(true)}
function renderEnvironment(){
 const c=config(),u=ui(),e=u.environment,map=M.get(u.mapId,c.id);document.documentElement.dataset.environment=e;
 $("#environment-options").innerHTML=[['clear','晴日','sun'],['rain','细雨','rain'],['autumn','秋日','leaf']].map(([id,label,icon])=>'<button class="environment-option" data-environment="'+id+'" aria-pressed="'+(e===id)+'">'+pixelIcon(icon)+'<span>'+label+'</span></button>').join('');
 $("#world-title").textContent=map.name;$("#scene-purpose").textContent=u.context||{growth:'进入产品 → 完成体验 → 激活',merchant:'看到活动 → 走进门店 → 成交',public:'了解服务 → 到场办理 → 办结'}[c.id];
 $("#scene-landmark-tags").textContent=map.features.join(' / ')+' · '+({standard:'标准设施',active:'活动优先',service:'服务优先'}[u.facilities]);
 $("#scene-context").value=u.context;$("#scene-facilities").value=u.facilities;$("#scene-flow").value=u.flow;renderMapPicker();renderFlowPreview();updateContextFeedback();
}
function sceneCount(){
 const p=state().params,base=S.defaults(ws.active).params,u=ui();
 if(u.sampleMode==="manual")return u.count;
 return Math.max(8,Math.min(128,Math.round(32*Math.sqrt((p.daily||p.demand||1)/(base.daily||base.demand||1))/4)*4));
}
function syncSceneControls(){
 const r=result(),u=ui(),n=sceneCount();
 $("#population-total").textContent=nr(r.reach)+(ws.active==="public"?" 人次需求":" 人触达");
 $("#sample-mode").value=u.sampleMode;$("#sample-count").value=n;$("#sample-count").disabled=u.sampleMode==="auto";$("#scene-light").value=u.lighting;
 $("#sample-count").setAttribute("title",u.sampleMode==="auto"?"显示人数随每日研究规模调整；选择自定人数可直接修改。":"仅调整可视化样本量，不改变研究总体规模。");
 $("#agent-count").textContent=n;document.documentElement.dataset.environment=u.environment;
}
function clockText(clock){
 if(!clock)return;
 const time=String(clock.hour).padStart(2,"0")+":"+String(clock.minute).padStart(2,"0");
 $("#day-label").textContent="第 "+clock.day+" 天 · "+time;const phaseLabel=ui().lighting==="auto"?clock.phase:ui().lighting==="night"?"夜景预览":"白昼预览";$("#scene-clock").textContent=time+" · "+phaseLabel;
 const visualPhase=ui().lighting==="day"?"日间":ui().lighting==="night"?"夜间":clock.phase;const node=$(".scene-clock");if(node.dataset.phase!==visualPhase){node.dataset.phase=visualPhase;const name=visualPhase==="夜间"?"moon":visualPhase==="傍晚"?"sunset":visualPhase==="晨间"?"sunrise":"sun";node.querySelector("svg, i")?.remove();const icon=document.createElement("i");icon.dataset.lucide=name;node.prepend(icon);icons()}
 document.documentElement.dataset.scenePhase=clock.night>.5?"night":clock.phase==="傍晚"&&ui().lighting==="auto"?"evening":"day";
}
function sceneTick(t){
 if(configuring||changingModule)return;
 const progress=Number.isFinite(t.progress)?t.progress:scene?.progress||0,u=ui(),playing=scene?scene.playing:false;
 u.progress=progress;if(progress>=1)u.playing=false;
 if(!scrubbing)$("#timeline").value=Math.round(progress*1000);
 $("#day-label").textContent="第 "+Math.min(state().params.days,Math.floor(progress*state().params.days)+1)+" 天";$("#play-state").textContent=progress>=1?"播放完毕":playing?"正在播放":"已暂停";
 $("#agent-count").textContent=scene?scene.agents.length:sceneCount();clockText(t.clock||scene?.getClock?.());
 if(Number.isFinite(t.visitors)){const labels=ws.active==="public"?["了解服务","到场","办结"]:ws.active==="growth"?["接触产品","体验","激活"]:["看到活动","进店","成交"];$("#world-count-summary").textContent=labels[0]+" "+t.visitors+" · "+labels[1]+" "+t.visits+" · "+labels[2]+" "+t.purchases+" / 场景样本"}

 const label=progress>=1?"重播":playing?"暂停":"播放",mode=progress>=1?'ended':playing?'playing':'paused';
 if($("#play").dataset.mode!==mode){$("#play").innerHTML=pixelIcon(playing?'pause':'play')+'<span class="play-label">'+label+'</span>';$("#play").setAttribute("aria-label",label+"场景");$("#play").dataset.mode=mode;$("#play").setAttribute("aria-pressed",String(playing));}
 $("#play-indicator").style.background="";$("#play-indicator").classList.toggle("paused",!playing);$(".world-panel").dataset.playback=mode;
 $("#preview-strategy").innerHTML=pixelIcon('map')+'<span>查看街区预演</span>';

}
function canShowScene(){return currentView==="world"&&!document.hidden&&!$("dialog[open]")}
function sceneOnScreen(){const box=$(".world-panel").getBoundingClientRect();return isExpanded()||box.bottom>0&&box.top<innerHeight}
function syncScenePlayback(){if(!scene)return;const visible=canShowScene();scene.setVisible(visible);scene.setPlaying(visible&&sceneOnScreen()&&!scrubbing&&ui().playing);scene.setSpeed(prefs.speed);if(visible)sceneTick({progress:scene.progress})}
function cameraChanged(camera){if(configuring||changingModule)return;ui().camera={zoom:camera.zoom,panX:camera.panX,panY:camera.panY};updateCameraControls(camera);persistUI()}
function updateCameraControls(camera=scene?.getCamera()||ui().camera){$("#zoom-value").textContent=Math.round(camera.zoom*100)+"%";$("#zoom-out").disabled=camera.zoom<=1.001;$("#zoom-in").disabled=camera.zoom>=2.499;$("#zoom-fit").disabled=camera.zoom<=1.001;$("#zoom-value").setAttribute("aria-label","画面缩放 "+Math.round(camera.zoom*100)+"%")}
function updateVisitorMenu(){
 if(!scene)return;const select=$("#visitor-select"),markup='<option value="">选择观察对象</option>'+config().segments4.map((seg,i)=>'<optgroup label="'+safeText(seg.name)+'">'+scene.agents.filter(a=>a.segmentIndex===i).map(a=>'<option value="'+a.id+'">'+safeText(a.name)+' · '+safeText(seg.name)+'</option>').join("")+'</optgroup>').join("");
 if(select.dataset.signature!==markup){select.innerHTML=markup;select.dataset.signature=markup}
 select.value=ui().selected?String(ui().selected):"";
}
function updateScene(){
 if(!window.TownScene){$("#play-state").textContent="场景加载失败，请刷新重试";return}
 const r=result(),c=config(),s=state(),p=r.selectedParams||s.params,u=ui();configuring=true;
 if(!scene){scene=new TownScene({canvas:$("#town"),onSelect:selectPerson,onTick:sceneTick,onCamera:cameraChanged});window.yanceTown=scene}
 scene.setVisible(canShowScene());
 const count=sceneCount();if(u.selected>count){u.selected=null;resetObserver()}scene.selected=u.selected;scene.setOptions({count,environment:u.environment,context:u.context,mapId:u.mapId,facilities:u.facilities,flow:u.flow,resourceActive:c.id==="public"?r.selected.addedCapacity>0:c.id==="growth"?r.selected.covered>0:r.selected.coverage>0,guideSteps:p.stepsA,supportAgents:p.supportAgents,groupRates:r.selected.groups.map(g=>(g.rate||g.completion||0)/100),lighting:u.lighting,module:ws.active,segments:c.segments4.map(g=>({id:g.id,name:g.name,color:g.color,quote:g.quote})),scheme:r.selectedScheme||s.scheme,coupon:ws.active==="merchant"?r.selected.d:0,memberTarget:p.memberTarget||"all",coverage:r.selected.coverage,weights:s.weights.slice(),duration:p.days,conversion:(r.selected.rate||r.selected.completion||0)/100,progress:u.progress});
 scene.setCamera(u.camera);scene.setSpeed(prefs.speed);scene.setPlaying(canShowScene()&&sceneOnScreen()&&!scrubbing&&u.playing);configuring=false;
 syncSceneControls();updateVisitorMenu();updateCameraControls();if(u.selected&&scene.visible)scene.selectAgent(u.selected);sceneTick(scene.getSnapshot?scene.getSnapshot():{progress:scene.progress});
}
function selectPerson(profile){
 if(configuring||changingModule)return;
 if(!profile){resetObserver();return}
 const signature=JSON.stringify(profile);if(lastProfile&&JSON.stringify(lastProfile)===signature)return;lastProfile=profile;
 const idx=config().segments4.findIndex(s=>s.name===profile.segment||s.id===profile.segment),seg=config().segments4[idx]||config().segments4[0];ui().selected=profile.id;
 $("#observer-title").textContent=profile.name+" / "+seg.name;$("#observer-status").textContent=profile.status;$("#observer-status").hidden=false;$("#observer-quote").textContent=profile.quote||seg.quote;$("#observer-destination").textContent="前往 · "+profile.destination;$("#observer-destination").hidden=false;$("#focus-observer").disabled=false;$(".observer").classList.add("is-observing");$("#portrait").style.background=seg.color+"25";$("#portrait").innerHTML=avatar(profile.id,seg.color);$("#visitor-select").value=String(profile.id);
 $("#expanded-observer-name").textContent=profile.name+" / "+seg.name+" · "+profile.status;$("#expanded-observer-quote").textContent=profile.quote||seg.quote;
 $("#expanded-observer").hidden=!isExpanded();persistUI();
}
function deltaText(row,base,meta){
 const delta=row[meta.key]-base[meta.key];if(Math.abs(delta)<.00001)return "与现状相同";
 const sign=delta>0?"+":"−",value=Math.abs(delta);
 return sign+(meta.format==="percent"?nr(value,1)+" 个百分点":fmt(value,meta)+(meta.format==="integer"?(meta.unit||""):""))+" / 较现状";
}
function strategyFeedback(){
 const r=result(),c=config(),s=state(),p=r.selectedParams||s.params,base=r.rows[0],scheme=r.selectedScheme||s.scheme;
 const guidance={growth:{baseline:["现有流程表现","用现状作为起点，再比较精简步骤或人工帮助是否值得投入。"],open:["激活与留存","减少首次操作步骤会影响激活与后续留存；同时留意服务投入。"],member:["人工支持的覆盖与成本","比较被帮助的新用户、7 日留存与服务成本，判断人手是否足够。"]},merchant:{baseline:["原价销售表现","保留原价作为参照，避免只看到订单增加，却忽略优惠成本。"],open:["成交与贡献毛利","同时看成交和贡献毛利。提高优惠力度不一定让利润更高。"],member:["会员范围与优惠投入","调整会员范围与金额，比较定向成交、优惠投入和贡献毛利。"]},public:{baseline:["现有窗口能力","以现有服务能力为参照，观察还剩多少办事需求未被满足。"],open:["新增办理量与运营费用","比较新增办理量、重点居民覆盖与运营支出，检查名额是否用得上。"],member:["完成办理与重点覆盖","比较流动点的完成办理量和重点居民覆盖，留意可用预算。"]}};
 const [title,desc]=guidance[c.id][scheme]||guidance[c.id].baseline;$("#focus-title").textContent=title;$("#focus-copy").textContent=desc;
 const keys=c.id==="merchant"?[r.chartKey,r.chartKey==="margin"?"orders":"margin","subsidy"]:c.id==="growth"?[r.chartKey,r.chartKey==="retained"?"activated":"retained","cost"]:[r.chartKey,r.chartKey==="served"?"access":"served","cost"];
 const all=c.metrics.concat(c.tableMetrics),metrics=keys.map(key=>all.find(m=>m.key===key)).filter(Boolean);
 $("#effect-metrics").innerHTML=metrics.map(m=>'<div class="effect-metric"><small>'+safeText(m.label)+'</small><strong>'+fmt(r.selected[m.key],m)+'</strong><em>'+safeText(deltaText(r.selected,base,m))+'</em></div>').join("");
 const nextFeedback=JSON.stringify([c.id,s.scheme,metrics.map(m=>r.selected[m.key])]);if(feedbackKey&&feedbackKey!==nextFeedback&&!reduceMotion())$("#effect-metrics").animate([{opacity:.5},{opacity:1}],{duration:240,easing:"ease-out"});feedbackKey=nextFeedback;
 const coverage=scheme==="baseline"?"现状参照 · 未增加策略投入":r.selected.coverage<.999?"资源提醒：预算或服务能力可支持计划的 "+nr(r.selected.coverage*100,1)+"%，已按可承担范围测算。":"当前预算与能力可覆盖本方案计划。";
 $("#resource-feedback").textContent=coverage;$("#resource-feedback").classList.toggle("limited",scheme!=="baseline"&&r.selected.coverage<.999);
 $("#change-status").textContent="已应用「"+r.selected.name+"」 · "+p.days+" 天测算，指标随设置更新";
 $("#settings-status").textContent=r.selected.name+" · "+r.chartLabel+" "+fmt(r.selected[r.chartKey],currentMeta());
 $("#comparison-selected").textContent="当前选择 · "+r.selected.name;
}
function cards(){
 const r=result(),c=config(),primary=currentMeta(),secondary=c.metrics.filter(m=>m.key!==r.chartKey).slice(0,2);
 $("#selection-feedback").textContent="正在观察："+r.selected.name;$("#scenario-cards").innerHTML=r.rows.map(row=>'<button class="scenario-card '+(row.id===r.selected.id?"selected":"")+'" aria-pressed="'+(row.id===r.selected.id)+'" data-select-scenario="'+row.id+'"><div class="scenario-tag">'+safeText(row.tag)+(row.id===r.selected.id?'<span class="selection-label">当前选择</span>':"")+'</div><div class="scenario-top"><h4>'+safeText(row.name)+'</h4>'+(row.id===r.best.id?'<span class="recommend-label">此目标下较优</span>':"")+'</div><div class="scenario-number">'+fmt(row[r.chartKey],primary)+(primary.format==="integer"?'<small>'+safeText(primary.unit)+'</small>':"")+'</div><div class="scenario-label">'+safeText(r.chartLabel)+'</div><div class="scenario-delta">'+safeText(deltaText(row,r.rows[0],primary))+'</div><div class="scenario-bottom">'+secondary.map(m=>'<div><span>'+safeText(m.label)+'</span><b>'+fmt(row[m.key],m)+'</b></div>').join("")+'</div></button>').join("");
 strategyFeedback();
}
function tableMarkup(r){
 const ms=r.tableMetrics;
 return'<thead><tr><th scope="col">策略</th>'+ms.map(m=>'<th scope="col">'+m.label+(m.format==="integer"?" / "+m.unit:"")+'</th>').join("")+'</tr></thead><tbody>'+r.rows.map(row=>'<tr class="'+(row.id===r.selected.id?"selected":"")+'"><td>'+safeText(row.name)+(row.id===r.selected.id?" · 当前选择":"")+(row.id===r.best.id?" · 此目标下较优":"")+'</td>'+ms.map(m=>'<td>'+fmt(row[m.key],m)+'</td>').join("")+'</tr>').join("")+'</tbody>';
}
function comparison(){
 const r=result(),c=config(),m=currentMeta(),best=r.best;
 $("#comparison-selected").textContent="当前选择 · "+r.selected.name;
 $("#adopt-recommended").hidden=r.selected.id===r.best.id;$("#adopt-recommended").textContent="观察「"+r.best.name+"」";$("#recommendation").textContent=r.selected.name+"："+r.chartLabel+" "+fmt(r.selected[r.chartKey],m);
 $("#recommendation-detail").textContent="较现状"+(Math.abs(r.selected[r.chartKey]-r.rows[0][r.chartKey])<.00001?"无变化。":deltaText(r.selected,r.rows[0],m).replace(" / 较现状","")+"。")+"下方指标与资源说明均属于当前选择。";
 $("#recommendation-tag").textContent=state().params.days+" 天 · "+nr(r.reach)+(ws.active==="public"?" 人次需求":" 人触达");
 $("#ranking-note").textContent="按「"+c.objectives.find(o=>o.value===state().objective).label+"」比较，当前领先的是「"+r.best.name+"」。"+(r.best.id===r.selected.id?"它也是你当前选择的策略。":"你可以在上方策略区选择它，或保留自己的方案继续调整。")+"排序基于当前假设，实际效果需验证。";
 $("#stats").innerHTML=r.metrics.map(meta=>'<article class="stat"><small>'+safeText(meta.label)+'</small><strong>'+fmt(r.selected[meta.key],meta)+'</strong><em>'+safeText(deltaText(r.selected,r.rows[0],meta))+'</em></article>').join("");
 $("#chart-title").textContent=r.chartLabel+"对照";$("#chart-unit").textContent="单位 / "+r.chartUnit;
 const low=Math.min(0,...r.rows.map(row=>row[r.chartKey])),high=Math.max(1,...r.rows.map(row=>row[r.chartKey])),range=high-low,zero=-low/range*100;
 $("#result-chart").innerHTML=r.rows.map(row=>{const value=row[r.chartKey],left=value<0?(value-low)/range*100:zero;return'<div class="chart-row '+(row.id===r.selected.id?"selected":"")+'"><span>'+safeText(row.short)+'</span><div class="chart-track" role="img" aria-label="'+safeText(row.name)+' '+fmt(value,m)+'"><div class="zero-line" style="left:'+zero+'%"></div><div class="chart-bar '+(value<0?"loss":"")+'" style="left:'+left+'%;width:'+Math.abs(value)/range*100+'%"></div></div><b>'+fmt(value,m)+'</b></div>'}).join("");
 const top=state().weights.indexOf(Math.max(...state().weights)),difference=r.selected[r.chartKey]-r.rows[0][r.chartKey];
 const n=[{title:"与现状的差异",text:c.objectives.find(o=>o.value===state().objective).label+"是当前评价目标。"+(difference>1e-8?"当前选择较现状增加 "+(m.format==="percent"?nr(difference,1)+" 个百分点":fmt(difference,m))+"。":"当前选择未高于现状，可结合资源投入继续比较。")},{title:"主要人群",text:c.segments4[top].name+"占比 "+nr(state().weights[top],1)+"%。建议重点验证这一人群的行为基线与响应。"}].concat(r.notes.map((note,i)=>({title:i===r.notes.length-1?"测算说明":r.selected.short+" · 资源边界",text:note})));
 $("#insights").innerHTML=n.map(x=>'<div class="insight"><h4>'+safeText(x.title)+'</h4><p>'+safeText(x.text)+'</p></div>').join("");
 $("#comparison-population").textContent=nr(r.reach)+" "+(ws.active==="public"?"人次需求":"人触达")+" / "+state().params.days+" 天";
 const temp=document.createElement("table");temp.innerHTML=tableMarkup(r);$("#table-head").innerHTML=temp.tHead.innerHTML;$("#table-body").innerHTML=temp.tBodies[0].innerHTML;
 $("#validation-steps").innerHTML=c.validation.map(v=>'<li>'+safeText(v)+'</li>').join("");
}
function renderAll({sceneUpdate=true}={}){
 ws.states[ws.active]=S.normalise(ws.active,state());syncControls();renderMix();cards();if(currentView==="comparison")comparison();if(sceneUpdate)updateScene();persist();
}
function cancelTransition(){transitionAnimations.forEach(a=>a.cancel());transitionAnimations=[];cancelAnimationFrame(navigationFrame);navigationFrame=0;$("#view-host").style.height="";$("#view-host").classList.remove("switching")}
function scrollToView(target){const element=target==="scene"?$(".world-panel"):$(".view-tabs");element.scrollIntoView({behavior:reduceMotion()?"instant":"smooth",block:"start"})}
function transitionView(change,{targetView=currentView,focus=false,scroll=false,anchor=null}={}){
 cancelTransition();window.scrollTo({top:scrollY,behavior:"instant"});const before=anchor?.getBoundingClientRect().top;
 change();const panel=$("#view-"+targetView);
 if(anchor&&Number.isFinite(before))window.scrollBy({top:anchor.getBoundingClientRect().top-before,behavior:"instant"});
 if(!reduceMotion()){const fade=panel.animate([{opacity:.8},{opacity:1}],{duration:140,easing:"ease-out"});transitionAnimations=[fade];fade.finished.then(()=>{fade.cancel();transitionAnimations=transitionAnimations.filter(a=>a!==fade)}).catch(()=>{})}
 if(scroll)navigationFrame=requestAnimationFrame(()=>{navigationFrame=0;scrollToView(scroll)});
 if(focus)panel.focus({preventScroll:true});
 if(currentView==="world")requestAnimationFrame(()=>scene?.resize());
}
function viewMarkup(name){
 currentView=name;ui().view=name;
 $$(".view").forEach(el=>el.hidden=el.id!=="view-"+name);
 $$("[data-view]").forEach(el=>{const on=el.dataset.view===name;el.classList.toggle("active",on);if(el.getAttribute("role")==="tab"){el.setAttribute("aria-selected",on?"true":"false");el.tabIndex=on?0:-1}});
}
function setView(name,options={}){
 if(!["world","comparison","audience"].includes(name))return;
 const fromContent=!!options.source&&!options.source.closest(".view-tabs"),target=options.target||(fromContent?"view":false);
 if(name===currentView){if(target){cancelTransition();scrollToView(target)}return}
 flushRender();transitionView(()=>{viewMarkup(name);if(name==="comparison")comparison();syncScenePlayback()},{targetView:name,focus:fromContent,scroll:target,anchor:target?null:$(".view-tabs")});persistUI();
}
function setModule(id,{force=false,resetPlayback=false}={}){
 if(!S.modules.some(m=>m.id===id))return;if(!force&&id===ws.active){setView("world",{target:"scene"});return}flushRender();
 const nav=$("#module-tabs"),restoreFocus=document.activeElement?.hasAttribute("data-module");
 if(scene){ui().progress=scene.progress;ui().camera=scene.getCamera()}
 closeDialogs();changingModule=true;if(scene)scene.setVisible(false);
 ws.active=id;const saved=ui();saved.view="world";if(resetPlayback){saved.progress=0;saved.selected=null}currentView="world";lastProfile=null;
 transitionView(()=>{viewMarkup(currentView);renderModule();if(currentView==="comparison")comparison();changingModule=false;updateScene()},{targetView:currentView,scroll:"scene"});
 if(restoreFocus)$('[data-module="'+id+'"]').focus({preventScroll:true});
 persist();persistUI();try{const url=new URL(location.href);url.searchParams.set("scene",id);history.replaceState(null,"",url)}catch{}
}
function methodContent(){
 const c=config();
 return'<div class="method-source"><b>当前来源：'+c.title+'行业情景样例</b><br>人群基线与策略响应采用预设假设，适合方案比较与研究讨论。真实业务结论需要使用获授权的数据进行校准与验证。</div><h3>'+c.title+'的测算口径</h3><ul>'+c.assumptions.map(a=>'<li>'+safeText(a)+'</li>').join("")+'</ul><h3>动态场景与总体指标</h3><p>小镇中的人物是可调数量的行为可视化样本，不与全部触达用户逐一对应。总体指标按完整周期与人群结构计算；场景人数可随每日规模调整，也可手动设置为 8–128 人。人群分布与完成概率遵循当前模型的分群结果，动画样本不等同于实际业务总人数。当前版本未连接后台推理或真实业务数据。</p><h3>保存与隐私</h3><p>设置与研究记录仅保存在当前浏览器，不上传服务器。下载的报告可独立保留；清除浏览器数据会移除本地研究记录。</p><h3>素材与字体</h3><p>像素地形采用 Kenney Tiny Town（CC0），人物与场景交互为原创绘制。中文界面使用霞鹜文楷屏幕版，英文与数字使用 Inter。字体与图标许可随网站代码保留。</p>';
}
function reportContent(){
 const r=result(),c=config(),p=r.selectedParams||state().params,scheme=r.selectedScheme||state().scheme;
 const conditions=c.controls.filter(ctrl=>!ctrl.scheme||ctrl.scheme===scheme);
 return'<div class="report-summary">当前选择：'+safeText(r.selected.name)+'</div><p>'+safeText(r.recommendation)+'</p><div class="report-condition"><span>'+safeText(c.title)+'</span><span>'+p.days+' 天</span><span>'+nr(r.reach)+' '+(ws.active==="public"?"人次需求":"人触达")+'</span><span>'+safeText(c.objectives.find(o=>o.value===state().objective).label)+'</span></div><h3>当前策略的结果</h3><div class="stat-grid">'+r.metrics.map(m=>'<article class="stat"><small>'+safeText(m.label)+'</small><strong>'+fmt(r.selected[m.key],m)+'</strong><em>'+safeText(deltaText(r.selected,r.rows[0],m))+'</em></article>').join("")+'</div><h3>全部方案对照</h3><div class="table-wrap"><table>'+tableMarkup(r)+'</table></div><h3>当前策略的设置</h3><div class="report-condition">'+(state().scheme==="custom"?'<span>行动方式：'+safeText(c.schemes.find(x=>x.id===scheme).name)+'</span>':"")+conditions.map(ctrl=>{const v=p[ctrl.key],label=ctrl.type==="select"?ctrl.options.find(x=>String(x.value)===String(v))?.label:v;return'<span>'+safeText(ctrl.label)+'：'+safeText(label)+' '+(ctrl.type==="select"?"":safeText(ctrl.unit))+'</span>'}).join("")+'</div><p>'+c.segments4.map((g,i)=>safeText(g.name)+" "+nr(state().weights[i],1)+"%").join(" / ")+'</p><h3>需要留意的资源与假设</h3><ul>'+r.notes.map(note=>'<li>'+safeText(note)+'</li>').join("")+'</ul><h3>实际验证计划</h3><ol>'+c.validation.map(x=>'<li>'+safeText(x)+'</li>').join("")+'</ol><p class="report-method">数据来源：'+safeText(c.title)+'行业情景样例。人群响应为预设假设，当前未接入真实业务数据或后台推理。生成时间：'+new Date().toLocaleString("zh-CN")+'</p>';
}
function openReport(){$("#report-name").value=ws.names[ws.active];$("#report-body").innerHTML=reportContent();openDialog("report-dialog")}
function download(content,name,type){
 const href=URL.createObjectURL(new Blob([content],{type})),a=document.createElement("a");a.href=href;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),2000)
}
function exportHTML(){
 const title=ws.names[ws.active],css='body{font:14px/1.85 "Segoe UI","Microsoft YaHei",sans-serif;color:#253b34;max-width:1000px;padding:40px;margin:auto;background:#fff}h1{font-size:30px;font-weight:500;margin:12px 0 28px}h2,h3{font-size:19px;margin-top:30px}header{border-bottom:1px solid #cbd3c1;padding-bottom:20px}small{color:#687663}.report-summary{font-size:21px;margin:25px 0}.report-condition{display:flex;gap:10px 22px;flex-wrap:wrap;color:#63725d;font:12px/1.8 "Microsoft YaHei",sans-serif}.stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:25px 0}.stat{background:#edf1e6;padding:15px;border-radius:6px}.stat small,.stat strong,.stat em{display:block}.stat strong{font-size:25px;font-weight:400}.stat em{font-size:11px;color:#6c7c61;font-style:normal}table{border-collapse:collapse;width:100%;font:12px/1.8 "Microsoft YaHei",sans-serif}th,td{padding:12px 8px;border-bottom:1px solid #d8dfcc;text-align:right}th:first-child,td:first-child{text-align:left}th{font-weight:400;color:#748267}.best{background:#edf2e4}p,li{color:#58694f;font-size:13px}.report-method{border-top:1px solid #d0d9c5;margin-top:30px;padding-top:18px;font-size:11px}.table-wrap{overflow:auto}@media(max-width:640px){body{padding:20px}.stat-grid{grid-template-columns:1fr 1fr}h1{font-size:25px}}@media print{body{padding:0}.stat, tr{break-inside:avoid}}';
 const page='<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+safeText(title)+' · 演策</title><style>'+css+'</style></head><body><header><small>演策 YANCE / 决策研究</small><h1>'+safeText(title)+'</h1></header>'+reportContent()+'</body></html>';
 download(page,"演策-"+title.replace(/[\\/:*?"<>|]/g,"-")+".html","text/html;charset=utf-8");notify("已下载 HTML 报告")
}
function exportCSV(){
 const r=result(),head=["策略",...r.tableMetrics.map(m=>m.label+" ("+m.unit+")")],csvCell=v=>'"'+(typeof v==="string"&&/^[\s]*[=+@\-\t\r]/.test(v)?"'"+v:String(v)).replace(/"/g,'""')+'"',rows=[head,...r.rows.map(row=>[row.name,...r.tableMetrics.map(m=>Number.isFinite(row[m.key])?+row[m.key].toFixed(4):"")])];
 rows.push([],["当前选择",r.selected.name],["行动方式",config().schemes.find(x=>x.id===(r.selectedScheme||state().scheme)).name]);config().controls.filter(c=>!c.scheme||c.scheme===(r.selectedScheme||state().scheme)).forEach(c=>rows.push([c.label,(r.selectedParams||state().params)[c.key],c.unit]));rows.push([],["数据来源","行业情景样例，非真实业务预测"]);download("\ufeff"+rows.map(row=>row.map(csvCell).join(",")).join("\r\n"),"演策-"+ws.active+"-方案比较.csv","text/csv;charset=utf-8");notify("已下载 CSV 指标表")
}
function library(){
 $("#library-body").innerHTML=ws.studies.length?ws.studies.slice().reverse().map(item=>'<article class="library-item"><div><h3>'+safeText(item.name)+'</h3><p>'+S.getModule(item.module).title+" / "+safeText(new Date(item.date).toLocaleString("zh-CN"))+'</p></div><button class="button" data-load-study="'+safeText(item.id)+'">继续研究<i data-lucide="arrow-up-right"></i></button><button class="icon-button" data-delete-study="'+safeText(item.id)+'" aria-label="删除'+safeText(item.name)+'" title="删除研究" data-tooltip="删除研究"><i data-lucide="trash-2"></i></button></article>').join(""):'<div class="library-empty"><i data-lucide="bookmark"></i><h3>还没有保存的研究。</h3><p>选择场景并设置参数后，点击「保存研究」。之后可在这里打开，继续比较。</p></div>';
 openDialog("library-dialog")
}
function allocate(total,scores){let sum=scores.reduce((a,b)=>a+b,0);if(!sum){scores=scores.map(()=>1);sum=scores.length}const raw=scores.map(x=>total*x/sum),values=raw.map(Math.floor),order=raw.map((v,i)=>i).sort((a,b)=>(raw[b]-values[b])-(raw[a]-values[a]));for(let n=total-values.reduce((a,b)=>a+b,0),j=0;j<n;j++)values[order[j%order.length]]++;return values}
function applyWeight(i,value){const others=[0,1,2,3].filter(j=>j!==i),extras=allocate(100-value-SEGMENT_FLOOR*3,others.map(j=>Math.max(0,state().weights[j]-SEGMENT_FLOOR)));state().weights[i]=value;others.forEach((j,k)=>state().weights[j]=SEGMENT_FLOOR+extras[k]);scheduleRender()}
document.addEventListener("click",e=>{
 const module=e.target.closest("[data-module]");if(module){setModule(module.dataset.module);return}
 const v=e.target.closest("[data-view]");if(v){setView(v.dataset.view,{source:v});return}
 const map=e.target.closest("button[data-map]");if(map){ui().mapId=M.get(map.dataset.map,ws.active).id;renderEnvironment();updateScene();persistUI(true);$("#map-picker [aria-pressed=true]").focus({preventScroll:true});return}
 const environment=e.target.closest("button[data-environment]");if(environment){ui().environment=environment.dataset.environment;renderEnvironment();updateScene();persistUI();$('button[data-environment="'+ui().environment+'"]').focus({preventScroll:true});return}
 const scheme=e.target.closest("[data-scheme]");if(scheme){chooseStrategy(scheme.dataset.scheme);return}
 const card=e.target.closest("[data-select-scenario]");if(card){const top=card.getBoundingClientRect().top;chooseStrategy(card.dataset.selectScenario,{editor:false,focus:false});const newCard=$('[data-select-scenario="'+card.dataset.selectScenario+'"]');window.scrollBy({top:newCard.getBoundingClientRect().top-top,behavior:"instant"});newCard.focus({preventScroll:true});return}
 const jump=e.target.closest("[data-jump]");if(jump){const target=$("#"+jump.dataset.jump);target.scrollIntoView({behavior:reduceMotion()?"auto":"smooth",block:"start"});target.querySelector("button")?.focus({preventScroll:true});return}
 const close=e.target.closest("[data-close]");if(close){close.closest("dialog").close();return}
 const action=e.target.closest("[data-action]");
 if(action){switch(action.dataset.action){case"preferences":syncPreferenceControls();openDialog("preferences-dialog");break;case"report":openReport();break;case"method":$("#method-body").innerHTML=methodContent();openDialog("method-dialog");break;case"library":library();break;case"save":$("#study-name").value=ws.names[ws.active];openDialog("save-dialog");break;case"reset":{const defaults=S.defaults(ws.active);config().controls.filter(c=>!c.scheme).forEach(c=>state().params[c.key]=defaults.params[c.key]);state().objective=defaults.objective;state().weights=defaults.weights;renderSettings();renderAll();notify("已恢复比较条件，策略设置已保留");break}}return}
 const load=e.target.closest("[data-load-study]");if(load){const item=ws.studies.find(x=>x.id===load.dataset.loadStudy);if(item){ws.states[item.module]=S.normalise(item.module,item.state);ws.names[item.module]=item.name;restoreScene(item.module,item.scene);setModule(item.module,{force:true,resetPlayback:true});notify("已打开「"+item.name+"」")}return}
 const del=e.target.closest("[data-delete-study]");if(del){const item=ws.studies.find(x=>x.id===del.dataset.deleteStudy);if(item){if(del.dataset.confirm!=="true"){del.dataset.confirm="true";del.title="再次点击确认删除";del.setAttribute("aria-label","确认删除 "+item.name);del.style.color="#ac6d54";del.innerHTML='<i data-lucide="check"></i>';icons();return}ws.studies=ws.studies.filter(x=>x.id!==item.id);persist();library();notify("研究已移除，当前工作台设置仍然保留")}return}
});

function editParam(el){
 const c=config().controls.find(c=>c.key===el.dataset.param),target=state().scheme==="custom"&&c.scheme?state().custom.params:state().params;
 if(c.type!=="select"&&el.value===""){el.value=target[c.key];return}
 if(state().scheme==="custom"&&c.scheme&&rangeUndoKey!==c.key){rememberCustom();rangeUndoKey=c.key}target[c.key]=c.type==="select"?el.value:+el.value;scheduleRender();
}
document.addEventListener("input",e=>{
 const el=e.target;if(el.matches("[data-param][type=range]"))editParam(el);if(el.matches("[data-param][type=number]")&&el.value!==""&&el.validity.valid)editParam(el);
 if(el.matches("[data-weight]"))applyWeight(+el.dataset.weight,+el.value);if(el.matches("[data-weight-number]")&&el.value!==""&&el.validity.valid)applyWeight(+el.dataset.weightNumber,+el.value);
});
document.addEventListener("change",e=>{const el=e.target;if(el.matches("[data-param]:not([type=range])"))editParam(el);if(el.matches("[data-weight-number]")){const v=Number(el.value);if(el.value!==""&&Number.isFinite(v))applyWeight(+el.dataset.weightNumber,Math.max(2,Math.min(94,Math.round(v))));else el.value=state().weights[+el.dataset.weightNumber]}});
function showStrategyEditor(open){$("#strategy-editor").classList.toggle("is-collapsed",!open);$("#strategy-toggle").setAttribute("aria-expanded",String(open));$("#strategy-toggle").innerHTML=(open?"收起细节":"调整策略参数")+'<i data-lucide="'+(open?"chevron-up":"chevron-down")+'"></i>';icons()}
function createCustom(){
 if(state().custom.enabled)rememberCustom();else delete customUndo[ws.active];const s=state();s.custom={enabled:true,name:{merchant:"我的促销策略",growth:"我的引导策略",public:"我的服务策略"}[ws.active],baseScheme:s.scheme==="member"?"member":"open",params:Object.fromEntries(config().controls.filter(c=>c.scheme).map(c=>[c.key,s.params[c.key]]))};s.scheme="custom";
}
function chooseStrategy(id,{editor=true,focus=true}={}){
 flushRender();if(state().scheme===id){if(editor)showStrategyEditor(true);return}if(id==="custom"&&!state().custom.enabled)createCustom();else state().scheme=id;
 ui().playing=false;if(ui().progress>=1){ui().progress=0;if(scene)scene.setProgress(0)}
 renderSettings();renderAll();if(editor)showStrategyEditor(true);persistUI();
 if(focus)requestAnimationFrame(()=>$('[data-scheme="'+id+'"]')?.focus({preventScroll:true}));
}
$("#strategy-toggle").addEventListener("click",()=>showStrategyEditor($("#strategy-editor").classList.contains("is-collapsed")));
$("#copy-strategy").addEventListener("click",()=>{
 if(state().custom.enabled&&$("#copy-strategy").dataset.confirm!=="true"){$("#copy-strategy").dataset.confirm="true";$("#copy-strategy").textContent="再次点击，替换我的策略";return}
 createCustom();renderSettings();renderAll();showStrategyEditor(true);$("#copy-strategy").dataset.confirm="false";$("#custom-name").focus();
});
$("#custom-name").addEventListener("focus",rememberCustom);
$("#custom-name").addEventListener("input",e=>{state().custom.name=e.target.value.trim().slice(0,40)||"我的策略";renderStrategyChoices();scheduleRender()});
$("#custom-name").addEventListener("blur",()=>{$("#custom-name").value=state().custom.name});
$("#custom-template").addEventListener("change",e=>{rememberCustom();state().custom.baseScheme=e.target.value;renderSettings();renderAll();$("#custom-template").focus()});

function observeSelection(){flushRender();if(ui().progress>=1){ui().progress=0;scene?.setProgress(0)}setView("world",{target:"scene"});updateScene();$("#play").focus({preventScroll:true});persistUI()}
$("#preview-strategy").addEventListener("click",observeSelection);$("#observe-selection").addEventListener("click",observeSelection);
$("#adopt-recommended").addEventListener("click",()=>{chooseStrategy(result().best.id,{editor:false,focus:false});$("#recommendation").focus({preventScroll:true})});
function rememberCustom(){if(state().custom.enabled){customUndo[ws.active]=copy(state().custom);$("#undo-custom").disabled=false}}
$("#undo-custom").addEventListener("click",()=>{if(!customUndo[ws.active])return;state().custom=customUndo[ws.active];delete customUndo[ws.active];rangeUndoKey=null;renderSettings();renderAll();notify("已撤销上次策略修改")});
document.addEventListener("pointerup",()=>{rangeUndoKey=null});document.addEventListener("keyup",()=>{rangeUndoKey=null});document.addEventListener("change",()=>{rangeUndoKey=null});

$("#objective").addEventListener("change",e=>{state().objective=e.target.value;renderAll()});
$("#reset-audience").addEventListener("click",()=>{state().weights=S.defaults(ws.active).weights;renderAll();notify("已恢复当前场景的人群结构")});
function stopScrub(){if(!scrubbing)return;scrubbing=false;ui().playing=scrubWasPlaying&&scene.progress<1;syncScenePlayback();persistUI()}
function startScrub(){if(scrubbing||!scene)return;scrubbing=true;scrubWasPlaying=ui().playing;scene.setPlaying(false)}
$("#play").addEventListener("click",()=>{const u=ui();if(u.progress>=1){u.progress=0;scene.setProgress(0);u.playing=true}else u.playing=!u.playing;syncScenePlayback();persistUI()});
$("#replay").addEventListener("click",()=>{const u=ui();u.progress=0;scene.reset();syncScenePlayback();persistUI();notify(ui().playing?"已从第 1 天重新播放":"已回到第 1 天，保持暂停")});
$$("[data-speed]").forEach(b=>b.addEventListener("click",()=>{prefs.speed=+b.dataset.speed;applyPreferences();persistUI()}));
$("#timeline").addEventListener("pointerdown",startScrub);window.addEventListener("pointerup",stopScrub);window.addEventListener("pointercancel",stopScrub);
$("#timeline").addEventListener("keydown",e=>{if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End","PageUp","PageDown"].includes(e.key))startScrub()});
$("#timeline").addEventListener("keyup",stopScrub);$("#timeline").addEventListener("blur",stopScrub);
$("#timeline").addEventListener("input",e=>{const p=+e.target.value/1000;ui().progress=p;if(p>=1)ui().playing=false;scene.setProgress(p);clockText(scene.getClock?.());persistUI()});
$("#visitor-select").addEventListener("change",e=>{if(e.target.value===""){ui().selected=null;scene.selected=null;resetObserver();updateScene();persistUI();return}scene.focusAgent(+e.target.value)});
$("#focus-observer").addEventListener("click",()=>{if(ui().selected)scene.focusAgent(ui().selected)});
$("#sample-mode").addEventListener("change",e=>{ui().sampleMode=e.target.value;if(ui().sampleMode==="manual")ui().count=scene?.agents.length||32;updateScene();persistUI()});
$("#sample-count").addEventListener("change",e=>{ui().count=Math.max(8,Math.min(128,Math.round(Number(e.target.value)||32)));updateScene();persistUI()});
$("#scene-light").addEventListener("change",e=>{ui().lighting=e.target.value;updateScene();persistUI()});$("#scene-context").addEventListener("input",e=>{ui().context=e.target.value.slice(0,120);updateContextFeedback();persistUI(true)});$("#scene-context").addEventListener("change",()=>applyContext());$("#apply-context").addEventListener("click",applyContext);["facilities","flow"].forEach(k=>$("#scene-"+k).addEventListener("change",e=>{ui()[k]=e.target.value;renderEnvironment();updateScene();persistUI(true)}));
$("#zoom-in").addEventListener("click",()=>scene.setZoom(Math.min(2.5,scene.zoom+.25)));$("#zoom-out").addEventListener("click",()=>scene.setZoom(Math.max(1,scene.zoom-.25)));$("#zoom-fit").addEventListener("click",()=>scene.resetCamera());
function isExpanded(){return !!document.fullscreenElement||$(".world-panel").classList.contains("expanded")}
function syncFullscreen(){const expanded=isExpanded();$("#fullscreen").innerHTML='<i data-lucide="'+(expanded?"minimize-2":"maximize-2")+'"></i>';$("#fullscreen").setAttribute("aria-label",expanded?"退出展开":"展开场景");$("#fullscreen").setAttribute("aria-pressed",expanded?"true":"false");$("#fullscreen").dataset.tooltip=expanded?"退出展开":"展开场景";$("#expanded-observer").hidden=!(expanded&&ui().selected);document.body.classList.toggle("scene-expanded",$(".world-panel").classList.contains("expanded"));icons();requestAnimationFrame(()=>scene?.resize())}
async function exitExpanded(){if(document.fullscreenElement){try{await document.exitFullscreen()}catch{}}$(".world-panel").classList.remove("expanded");syncFullscreen();$("#fullscreen").focus({preventScroll:true})}
$("#fullscreen").addEventListener("click",async()=>{const panel=$(".world-panel");if(isExpanded()){await exitExpanded();return}if(panel.requestFullscreen){try{await panel.requestFullscreen();syncFullscreen();return}catch{}}panel.classList.add("expanded");syncFullscreen();$("#fullscreen").focus({preventScroll:true})});
document.addEventListener("fullscreenchange",syncFullscreen);
document.addEventListener("keydown",e=>{
 if(e.key==="Escape"&&isExpanded()){e.preventDefault();exitExpanded()}
 if(e.key==="Tab"&&$(".world-panel").classList.contains("expanded")){
  const nodes=$$("button:not([disabled]),input,select,a[href]",$(".world-panel")).filter(x=>x.getClientRects().length),first=nodes[0],last=nodes[nodes.length-1];
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
 }
 const b=e.target.closest("[data-module],[data-scheme],.view-tabs [data-view]");
 if(b&&["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End"].includes(e.key)){
  e.preventDefault();const key=b.hasAttribute("data-module")?"[data-module]":b.hasAttribute("data-scheme")?"[data-scheme]":".view-tabs [data-view]",items=$$(key),delta=["ArrowRight","ArrowDown"].includes(e.key)?1:-1,next=e.key==="Home"?items[0]:e.key==="End"?items.at(-1):items[(items.indexOf(b)+delta+items.length)%items.length],attr=b.hasAttribute("data-module")?"data-module":b.hasAttribute("data-scheme")?"data-scheme":"data-view",val=next.getAttribute(attr);
  next.click();requestAnimationFrame(()=>$('['+attr+'="'+val+'"]')?.focus({preventScroll:true}));
 }
});
$(".advanced").addEventListener("toggle",()=>{ui().advanced=$(".advanced").open;persistUI()});
$$("dialog").forEach(d=>d.addEventListener("close",()=>{syncScenePlayback();const focus=dialogFocus.get(d);if(focus?.isConnected)focus.focus({preventScroll:true})}));
document.addEventListener("visibilitychange",()=>{if(document.hidden){stopScrub();flushPersist();persistUI(true)}syncScenePlayback()});
$("#report-name").addEventListener("input",e=>{ws.names[ws.active]=e.target.value.slice(0,100);persist()});
$("#save-form").addEventListener("submit",e=>{e.preventDefault();const name=$("#study-name").value.trim();if(!name)return;ws.studies.push({id:"study-"+Date.now()+"-"+Math.random().toString(16).slice(2,7),module:ws.active,name:name.slice(0,80),date:new Date().toISOString(),state:copy(state()),scene:sceneSnapshot()});if(ws.studies.length>40)ws.studies.shift();ws.names[ws.active]=name;persist();$("#save-dialog").close();notify("已保存「"+name+"」")});
$("#html-export").addEventListener("click",exportHTML);$("#csv-export").addEventListener("click",exportCSV);$("#report-print").addEventListener("click",()=>{$("#report-body").innerHTML=reportContent();window.print()});
function syncPreferenceControls(){
 $$("[data-pref]").forEach(b=>b.setAttribute("aria-pressed",String(prefs[b.dataset.pref])===b.dataset.value?"true":"false"));
 $$("[data-pref-select]").forEach(el=>el.value=prefs[el.dataset.prefSelect]);$$("[data-pref-check]").forEach(el=>el.checked=prefs[el.dataset.prefCheck]);
}
function applyPreferences(){
 document.documentElement.style.setProperty("--text-scale",prefs.textScale/100);
 document.documentElement.dataset.density=prefs.density;document.documentElement.dataset.sceneSize=prefs.sceneSize;document.documentElement.dataset.motion=reduceMotion()?"reduce":"standard";document.documentElement.dataset.hints=String(prefs.hints);
 speed=prefs.speed;$$("[data-speed]").forEach(b=>{const on=+b.dataset.speed===speed;b.classList.toggle("active",on);b.setAttribute("aria-pressed",on?"true":"false")});
 syncPreferenceControls();syncScenePlayback();requestAnimationFrame(()=>scene?.resize());
}
document.addEventListener("click",e=>{const b=e.target.closest("[data-pref]");if(!b)return;prefs[b.dataset.pref]=b.dataset.pref==="textScale"?+b.dataset.value:b.dataset.value;cancelTransition();applyPreferences();persistUI()});
$$("[data-pref-select]").forEach(el=>el.addEventListener("change",()=>{prefs[el.dataset.prefSelect]=el.dataset.prefSelect==="speed"?+el.value:el.value;if(el.dataset.prefSelect==="motion"&&reduceMotion()){S.modules.forEach(m=>ui(m.id).playing=false);cancelTransition()}applyPreferences();persistUI()}));
$$("[data-pref-check]").forEach(el=>el.addEventListener("change",()=>{prefs[el.dataset.prefCheck]=el.checked;if(el.dataset.prefCheck==="autoplay"&&!el.checked)ui().playing=false;applyPreferences();persistUI()}));
$("#reset-preferences").addEventListener("click",()=>{prefs={...preferenceDefaults};ui().playing=prefs.autoplay&&!reduceMotion();applyPreferences();persistUI();notify("已恢复显示偏好，研究参数保持不变")});
motionQuery.addEventListener("change",()=>{if(motionQuery.matches){S.modules.forEach(m=>ui(m.id).playing=false);cancelTransition()}applyPreferences();persistUI()});
window.addEventListener("pagehide",()=>{if(scene){ui().progress=scene.progress;ui().camera=scene.getCamera()}flushPersist();persistUI(true)});
window.addEventListener("resize",()=>{cancelTransition();syncScenePlayback()},{passive:true});
const sceneVisibility=new IntersectionObserver(()=>syncScenePlayback(),{threshold:0});sceneVisibility.observe($(".world-panel"));
window.YanceApp={getWorkspace:()=>copy(ws),getState:()=>copy(state()),getModule:()=>config(),compute:result,setModule,setView,getInterface:()=>copy({preferences:prefs,modules:moduleUI,currentView}),flush:()=>{flushRender();flushPersist();persistUI(true)}};
$("#replay").innerHTML=pixelIcon('restart')+'<span class="replay-label">回到开始</span>';$("#replay").removeAttribute("data-tooltip");$("#replay").setAttribute("aria-label","回到开始，保留播放状态");$("#play").removeAttribute("data-tooltip");
for(const [selector,name]of[['#tab-world','map'],['#tab-comparison','chart'],['#tab-audience','person'],['#zoom-in','plus'],['#zoom-out','minus'],['#zoom-fit','focus'],['.population-stamp','person']]){const target=$(selector),icon=target?.querySelector('i,svg');if(icon)icon.outerHTML=pixelIcon(name)}
$(".scene-display").addEventListener("keydown",e=>{if(e.key==="Escape"){$(".scene-display").open=false;$(".scene-display summary").focus()}});document.addEventListener("click",e=>{if(!e.composedPath().includes($(".scene-display")))$(".scene-display").open=false});
currentView=ui().view;if(reduceMotion())ui().playing=false;viewMarkup(currentView);applyPreferences();renderModule();showStrategyEditor(false);if(currentView==="comparison")comparison();updateScene();icons();persist();
})();



