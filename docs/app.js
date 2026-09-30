(function(){
"use strict";
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s)), S=window.YanceScenarios;
const STORE="yance-workspace-v4", SEGMENT_FLOOR=2;
const safeText=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const copy=v=>JSON.parse(JSON.stringify(v));
let ws={active:"merchant",states:{},names:{},studies:[]},scene=null,configuring=false,currentView="world",speed=1,toastId,lastProfile=null;
const UI_STORE="yance-interface-v1",motionQuery=matchMedia("(prefers-reduced-motion: reduce)");
const preferenceDefaults={textScale:100,density:"comfortable",sceneSize:"balanced",motion:"system",autoplay:true,speed:1,hints:true};
let prefs={...preferenceDefaults},moduleUI={},saveTimer,uiSaveTimer,renderFrame=0,transitionAnimations=[],switchVersion=0,scrubbing=false,scrubWasPlaying=false,changingModule=false;
let resultKey="",resultMemo=null;const dialogFocus=new WeakMap();
try{const stored=JSON.parse(localStorage.getItem(UI_STORE)||"null");if(stored&&typeof stored==="object"){const p=stored.preferences||{};for(const [key,allowed] of Object.entries({textScale:[100,112,125],density:["comfortable","compact"],sceneSize:["compact","balanced","large"],motion:["system","reduce"],speed:[1,2,4]})){if(allowed.includes(p[key]))prefs[key]=p[key]}for(const key of ["autoplay","hints"])if(typeof p[key]==="boolean")prefs[key]=p[key];if(stored.modules&&typeof stored.modules==="object")moduleUI=stored.modules}}catch{}
const validatedUI=new Set();
const reduceMotion=()=>prefs.motion==="reduce"||motionQuery.matches;
function ui(id=ws.active){if(validatedUI.has(id))return moduleUI[id];let u=moduleUI[id];if(!u||typeof u!=="object")u={};const camera=u.camera&&typeof u.camera==="object"?u.camera:{};u={view:["world","comparison","audience"].includes(u.view)?u.view:"world",progress:Number.isFinite(u.progress)?Math.max(0,Math.min(1,u.progress)):0,playing:typeof u.playing==="boolean"?u.playing:prefs.autoplay&&!reduceMotion(),selected:Number.isInteger(u.selected)&&u.selected>=1&&u.selected<=128?u.selected:null,sampleMode:u.sampleMode==="manual"?"manual":"auto",count:Number.isFinite(u.count)?Math.max(8,Math.min(128,Math.round(u.count))):32,lighting:["auto","day","night"].includes(u.lighting)?u.lighting:"auto",advanced:!!u.advanced,scrolls:u.scrolls&&typeof u.scrolls==="object"?u.scrolls:{},camera:{zoom:Number.isFinite(camera.zoom)?Math.max(1,Math.min(2.5,camera.zoom)):1,panX:Number.isFinite(camera.panX)?camera.panX:0,panY:Number.isFinite(camera.panY)?camera.panY:0}};moduleUI[id]=u;validatedUI.add(id);return u}
function persistUI(immediate=false){clearTimeout(uiSaveTimer);const write=()=>{try{localStorage.setItem(UI_STORE,JSON.stringify({preferences:prefs,modules:moduleUI}))}catch{$("#preference-note").textContent="浏览器未允许保存偏好，本次设置仍有效。"}};if(immediate)write();else uiSaveTimer=setTimeout(write,300)}

try{const raw=JSON.parse(localStorage.getItem(STORE)||"null");if(raw&&typeof raw==="object"){if(S.modules.some(m=>m.id===raw.active))ws.active=raw.active;if(raw.states&&typeof raw.states==="object")ws.states=raw.states;if(raw.names&&typeof raw.names==="object")ws.names=raw.names;if(Array.isArray(raw.studies))ws.studies=raw.studies.slice(0,40).filter(x=>x&&S.modules.some(m=>m.id===x.module)&&typeof x.name==="string").map(x=>({id:String(x.id).slice(0,70),module:x.module,name:x.name.slice(0,80),date:typeof x.date==="string"?x.date:"",state:S.normalise(x.module,x.state)}))}}catch{}
S.modules.forEach(m=>{ws.states[m.id]=S.normalise(m.id,ws.states[m.id]);ws.names[m.id]=typeof ws.names[m.id]==="string"?ws.names[m.id].slice(0,100):m.strategyTitle});
const paramModule=new URLSearchParams(location.search).get("scene");if(S.modules.some(m=>m.id===paramModule))ws.active=paramModule;
const config=()=>S.getModule(ws.active),state=()=>ws.states[ws.active];
function result(){const key=ws.active+":"+JSON.stringify(state());if(key!==resultKey){resultKey=key;resultMemo=S.compute(ws.active,state())}return resultMemo}

const icons=()=>{if(window.lucide)lucide.createIcons({attrs:{"stroke-width":1.65,"aria-hidden":"true","focusable":"false"}})};
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
function moduleMenu(){$("#module-tabs").innerHTML=S.modules.map(m=>'<button role="tab" aria-selected="'+(m.id===ws.active)+'" tabindex="'+(m.id===ws.active?0:-1)+'" data-module="'+m.id+'"><span class="module-symbol"><i data-lucide="'+m.icon+'"></i></span><span><b>'+m.title+'</b><small>'+m.english+'</small></span></button>').join("");icons()}
function controlMarkup(c){
 const value=state().params[c.key],id="param-"+c.key;
 const label='<span>'+safeText(c.label)+(c.type==="range"?'<output for="'+id+'">'+safeText(value)+' <small>'+safeText(c.unit)+'</small></output>':c.unit?'<small class="control-unit">'+safeText(c.unit)+'</small>':"")+'</span>';
 let field="";
 if(c.type==="select")field='<select id="'+id+'" data-param="'+c.key+'" aria-describedby="'+id+'-hint">'+c.options.map(o=>'<option value="'+safeText(o.value)+'"'+(String(o.value)===String(value)?" selected":"")+'>'+safeText(o.label)+'</option>').join("")+'</select>';
 else field='<input id="'+id+'" data-param="'+c.key+'" type="'+(c.type==="range"?"range":"number")+'" min="'+c.min+'" max="'+c.max+'" step="'+c.step+'" value="'+value+'" aria-describedby="'+id+'-hint">';
 return'<label class="field '+(['daily','demand'].includes(c.key)?'scale-field':'')+'">'+label+field+(c.type==="range"?'<div class="range-extents"><span>'+c.min+'</span><span>'+c.max+' '+safeText(c.unit)+'</span></div>':"")+'<p id="'+id+'-hint" class="'+(c.scheme?"control-hint":"sr-only")+'">'+safeText(c.hint)+'</p></label>';
}
function renderSettings(){
 const c=config(),s=state();
 const schemeIcons={growth:["route","list-filter","messages-square"],merchant:["tag","ticket","badge-check"],public:["building-2","clock-4","bus-front"]};
 $("#scheme-options").innerHTML=c.schemes.map((v,i)=>'<button type="button" role="radio" aria-checked="'+(s.scheme===v.id)+'" tabindex="'+(s.scheme===v.id?0:-1)+'" data-scheme="'+v.id+'"><span class="scheme-symbol"><i data-lucide="'+schemeIcons[c.id][i]+'"></i></span><span class="radio"></span><span class="scheme-copy"><b>'+v.name+'</b><small>'+v.desc+'</small></span><span class="scheme-tag">'+v.tag+'</span></button>').join("");
 const controls=c.controls.filter(x=>x.scheme===s.scheme);
 $("#variant-controls").innerHTML=controls.length?controls.map(controlMarkup).join(""):'<p class="baseline-note">不调整现有流程，作为两个候选方案的比较基线。</p>';
 $("#main-controls").innerHTML=c.controls.filter(x=>x.section==="shared"&&["days","budget","daily","demand"].includes(x.key)).map(controlMarkup).join("");
 $("#advanced-controls").innerHTML=c.controls.filter(x=>x.section==="shared"&&!["days","budget","daily","demand"].includes(x.key)).map(controlMarkup).join("");
 $("#objective").innerHTML=c.objectives.map(o=>'<option value="'+o.value+'"'+(o.value===s.objective?" selected":"")+'>'+o.label+'</option>').join("");
 $(".advanced").open=ui().advanced;icons();syncControls();
}
function syncControls(){
 $$("[data-param]").forEach(el=>{const c=config().controls.find(c=>c.key===el.dataset.param);el.value=state().params[c.key];const out=el.closest("label").querySelector("output");if(out)out.innerHTML=safeText(el.value)+' <small>'+safeText(c.unit)+'</small>'});
 $("#objective").value=state().objective;$("#period-label").textContent=state().params.days+" 天观察窗口";$("#day-total").textContent=state().params.days+" 天";
 $("#world-location").textContent=config().schemes.find(x=>x.id===state().scheme).short;
}
function renderModule(){
 const c=config();moduleMenu();$("#module-caption").textContent=c.title+" / "+c.english;$("#study-title").textContent=c.strategyTitle;$("#study-decision").textContent=c.decision;$("#world-title").textContent=c.worldTitle;
 $("#audience-title").textContent=c.audienceTitle;$("#audience-definition").textContent=c.audienceNote;$("#visitor-select").dataset.signature="";
 $("#world-legend").innerHTML=c.segments4.map(s=>'<span style="--seg:'+s.color+'"><i></i>'+s.name+'</span>').join("");
 $("#audience-cards").innerHTML=c.segments4.map((s,i)=>'<article class="audience-card" style="--seg:'+s.color+';--seg-soft:'+s.color+'20"><div class="audience-head"><div class="audience-avatar"></div><div><h4>'+s.name+'</h4><small>'+s.short+'</small></div></div><strong data-weight-label="'+i+'"></strong><p>'+s.desc+'</p><input data-weight="'+i+'" type="range" min="2" max="94" step="1" aria-label="'+s.name+'占比"></article>').join("");
 resetObserver();renderSettings();renderAll({sceneUpdate:false});$("#report-name").value=ws.names[ws.active];icons()
}
function resetObserver(){lastProfile=null;$("#observer-title").textContent="选择一位观察对象";$("#observer-status").textContent="人物详情";$("#observer-quote").textContent="点击场景人物或选择人群，查看当前行为与反馈。";$("#visitor-select").value="";$("#portrait").style.background="#eaf0ed";$("#expanded-observer-name").textContent="选择场景人物";$("#expanded-observer-quote").textContent="查看其当前行为与反馈。";$("#expanded-observer").hidden=true}
function renderMix(){
 const c=config(),s=state();
 const marks=s.weights.map((w,i)=>'<span style="width:'+w+'%;background:'+c.segments4[i].color+'"></span>').join("");
 const legend=c.segments4.map((g,i)=>'<span style="--seg:'+g.color+'"><i></i>'+g.name+" "+nr(s.weights[i],Number.isInteger(s.weights[i])?0:1)+'%</span>').join("");
 $("#mini-mix").innerHTML=marks;$("#full-mix").innerHTML=marks;$("#mix-summary").innerHTML=legend;$("#full-mix-legend").innerHTML=legend;$("#mini-mix").setAttribute("aria-label",c.segments4.map((g,i)=>g.name+" "+nr(s.weights[i],1)+"%").join("，"));
 $$("[data-weight]").forEach(el=>{const i=+el.dataset.weight;el.value=s.weights[i];$('[data-weight-label="'+i+'"]').textContent=nr(s.weights[i],Number.isInteger(s.weights[i])?0:1)+"%"});
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
 $("#agent-count").textContent=n;
}
function clockText(clock){
 if(!clock)return;
 const time=String(clock.hour).padStart(2,"0")+":"+String(clock.minute).padStart(2,"0");
 $("#day-label").textContent="第 "+clock.day+" 天 · "+time;const phaseLabel=ui().lighting==="auto"?clock.phase:ui().lighting==="night"?"夜景预览":"白昼预览";$("#scene-clock").textContent=time+" · "+phaseLabel;
 const node=$(".scene-clock");if(node.dataset.phase!==clock.phase){node.dataset.phase=clock.phase;const name=clock.phase==="夜间"?"moon":clock.phase==="傍晚"?"sunset":clock.phase==="晨间"?"sunrise":"sun";node.querySelector("svg, i")?.remove();const icon=document.createElement("i");icon.dataset.lucide=name;node.prepend(icon);icons()}
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
 const label=progress>=1?"重新播放":u.playing?"暂停场景":"继续播放";
 if($("#play").getAttribute("aria-label")!==label){$("#play").innerHTML='<i data-lucide="'+(progress>=1?"rotate-ccw":u.playing?"pause":"play")+'"></i>';$("#play").setAttribute("aria-label",label);$("#play").dataset.tooltip=label;icons()}
 $("#play-indicator").style.background=playing?"#4d8270":"#a4b4ae";$("#play-indicator").classList.toggle("paused",!playing);
}
function canShowScene(){return currentView==="world"&&!document.hidden&&!$("dialog[open]")}
function syncScenePlayback(){if(!scene)return;const visible=canShowScene();scene.setVisible(visible);scene.setPlaying(visible&&!scrubbing&&ui().playing);scene.setSpeed(prefs.speed);if(visible)sceneTick({progress:scene.progress})}
function cameraChanged(camera){if(configuring||changingModule)return;ui().camera={zoom:camera.zoom,panX:camera.panX,panY:camera.panY};updateCameraControls(camera);persistUI()}
function updateCameraControls(camera=scene?.getCamera()||ui().camera){$("#zoom-value").textContent=Math.round(camera.zoom*100)+"%";$("#zoom-out").disabled=camera.zoom<=1.001;$("#zoom-in").disabled=camera.zoom>=2.499;$("#zoom-fit").disabled=camera.zoom<=1.001;$("#zoom-value").setAttribute("aria-label","画面缩放 "+Math.round(camera.zoom*100)+"%")}
function updateVisitorMenu(){
 if(!scene)return;const select=$("#visitor-select"),markup='<option value="">选择观察对象</option>'+config().segments4.map((seg,i)=>'<optgroup label="'+safeText(seg.name)+'">'+scene.agents.filter(a=>a.segmentIndex===i).map(a=>'<option value="'+a.id+'">'+safeText(a.name)+' · '+safeText(seg.name)+'</option>').join("")+'</optgroup>').join("");
 if(select.dataset.signature!==markup){select.innerHTML=markup;select.dataset.signature=markup}
 select.value=ui().selected?String(ui().selected):"";
}
function updateScene(){
 if(!window.TownScene){$("#play-state").textContent="场景加载失败，请刷新重试";return}
 const r=result(),c=config(),s=state(),p=s.params,u=ui();configuring=true;
 if(!scene){scene=new TownScene({canvas:$("#town"),onSelect:selectPerson,onTick:sceneTick,onCamera:cameraChanged});window.yanceTown=scene}
 scene.setVisible(canShowScene());
 const count=sceneCount();if(u.selected>count){u.selected=null;resetObserver()}scene.selected=u.selected;scene.setOptions({count,groupRates:r.selected.groups.map(g=>(g.rate||g.completion||0)/100),lighting:u.lighting,module:ws.active,segments:c.segments4.map(g=>({id:g.id,name:g.name,color:g.color,quote:g.quote})),scheme:s.scheme,coupon:ws.active==="merchant"?r.selected.d:0,memberTarget:p.memberTarget||"all",coverage:r.selected.coverage,weights:s.weights.slice(),duration:p.days,conversion:(r.selected.rate||r.selected.completion||0)/100,progress:u.progress});
 scene.setCamera(u.camera);scene.setSpeed(prefs.speed);scene.setPlaying(canShowScene()&&!scrubbing&&u.playing);configuring=false;
 syncSceneControls();updateVisitorMenu();updateCameraControls();if(u.selected&&scene.visible)scene.selectAgent(u.selected);sceneTick(scene.getSnapshot?scene.getSnapshot():{progress:scene.progress});
}
function selectPerson(profile){
 if(configuring||changingModule)return;
 if(!profile){resetObserver();return}
 const signature=JSON.stringify(profile);if(lastProfile&&JSON.stringify(lastProfile)===signature)return;lastProfile=profile;
 const idx=config().segments4.findIndex(s=>s.name===profile.segment||s.id===profile.segment),seg=config().segments4[idx]||config().segments4[0];ui().selected=profile.id;
 $("#observer-title").textContent=profile.name+" / "+seg.name;$("#observer-status").textContent=profile.status;$("#observer-quote").textContent=profile.quote||seg.quote;$("#portrait").style.background=seg.color+"25";$("#visitor-select").value=String(profile.id);
 $("#expanded-observer-name").textContent=profile.name+" / "+seg.name+" · "+profile.status;$("#expanded-observer-quote").textContent=profile.quote||seg.quote;
 $("#expanded-observer").hidden=!isExpanded();persistUI();
}
function cards(){
 const r=result(),c=config(),primary=currentMeta();
 const secondary=c.metrics.filter(m=>m.key!==r.chartKey).slice(0,2);
 $("#scenario-cards").innerHTML=r.rows.map(row=>'<button class="scenario-card '+(row.id===r.best.id?"best":"")+'" data-select-scenario="'+row.id+'"><div class="scenario-tag">'+row.tag+'</div><div class="scenario-top"><h4>'+row.name+'</h4>'+(row.id===r.best.id?'<span class="recommend-label">建议验证</span>':"")+'</div><div class="scenario-number">'+fmt(row[r.chartKey],primary)+(primary.format==="integer"?'<small>'+safeText(primary.unit)+'</small>':"")+'</div><div class="scenario-label">'+r.chartLabel+'</div><div class="scenario-bottom">'+secondary.map(m=>'<div><span>'+m.label+'</span><b>'+fmt(row[m.key],m)+'</b></div>').join("")+'</div></button>').join("");
}
function tableMarkup(r){
 const ms=r.tableMetrics;
 return'<thead><tr><th scope="col">策略</th>'+ms.map(m=>'<th scope="col">'+m.label+(m.format==="integer"?" / "+m.unit:"")+'</th>').join("")+'</tr></thead><tbody>'+r.rows.map(row=>'<tr class="'+(row.id===r.best.id?"best":"")+'"><td>'+row.name+(row.id===r.best.id?" · 建议验证":"")+'</td>'+ms.map(m=>'<td>'+fmt(row[m.key],m)+'</td>').join("")+'</tr>').join("")+'</tbody>';
}
function comparison(){
 const r=result(),c=config(),m=currentMeta(),best=r.best;
 $("#recommendation").textContent=r.recommendation.split("。")[0]+"。";$("#recommendation-detail").textContent="基于 "+nr(r.reach)+" "+(ws.active==="public"?"人次服务需求":"位触达用户")+"、"+state().params.days+" 天窗口与当前人群结构。"+r.recommendation.split("。").slice(1).join("。");$("#recommendation-tag").textContent=best.tag+" / "+r.chartLabel+" "+fmt(best[r.chartKey],m);
 $("#stats").innerHTML=r.metrics.map(meta=>'<article class="stat"><small>'+meta.label+'</small><strong>'+fmt(best[meta.key],meta)+'</strong><em>'+((meta.unit&&!["%","元"].includes(meta.unit))?meta.unit:"完整活动窗口")+'</em></article>').join("");
 $("#chart-title").textContent=r.chartLabel+"对照";$("#chart-unit").textContent="单位 / "+r.chartUnit;
 const low=Math.min(0,...r.rows.map(row=>row[r.chartKey])),high=Math.max(1,...r.rows.map(row=>row[r.chartKey])),range=high-low,zero=-low/range*100;
 $("#result-chart").innerHTML=r.rows.map(row=>{const value=row[r.chartKey],left=value<0?(value-low)/range*100:zero;return'<div class="chart-row '+(row.id===best.id?"best":"")+'"><span>'+row.short+'</span><div class="chart-track" role="img" aria-label="'+row.name+' '+fmt(value,m)+'"><div class="zero-line" style="left:'+zero+'%"></div><div class="chart-bar '+(value<0?"loss":"")+'" style="left:'+left+'%;width:'+Math.abs(value)/range*100+'%"></div></div><b>'+fmt(value,m)+'</b></div>'}).join("");
 const top=state().weights.indexOf(Math.max(...state().weights)),difference=best[r.chartKey]-r.rows[0][r.chartKey];
 const n=[{title:"评价目标决定优先级",text:c.objectives.find(o=>o.value===state().objective).label+"是当前评价目标。"+(difference>1e-8?"优先方案较对照增加 "+(m.format==="percent"?nr(difference,1)+" 个百分点":fmt(difference,m))+"。":"当前方案与对照在该指标上持平或优先保留现状。")},{title:"人群结构是一项关键假设",text:c.segments4[top].name+"占比 "+nr(state().weights[top],1)+"%。建议重点验证这一人群的行为基线与响应。"}].concat(r.notes.map((note,i)=>({title:i===r.notes.length-1?"落地前需要验证":r.selected.short+" · 资源边界",text:note})));
 $("#insights").innerHTML=n.map(x=>'<div class="insight"><h4>'+safeText(x.title)+'</h4><p>'+safeText(x.text)+'</p></div>').join("");
 $("#comparison-population").textContent=nr(r.reach)+" "+(ws.active==="public"?"人次需求":"人触达")+" / "+state().params.days+" 天";
 const temp=document.createElement("table");temp.innerHTML=tableMarkup(r);$("#table-head").innerHTML=temp.tHead.innerHTML;$("#table-body").innerHTML=temp.tBodies[0].innerHTML;
 $("#validation-steps").innerHTML=c.validation.map(v=>'<li>'+safeText(v)+'</li>').join("");
}
function renderAll({sceneUpdate=true}={}){
 ws.states[ws.active]=S.normalise(ws.active,state());syncControls();renderMix();cards();if(currentView==="comparison")comparison();if(sceneUpdate)updateScene();persist();
}
function cancelTransition(){transitionAnimations.forEach(a=>a.cancel());transitionAnimations=[];$("#view-host").style.height="";$("#view-host").classList.remove("switching")}
function transitionView(change,{targetView=currentView,focus=false,scroll=false}={}){
 const host=$("#view-host"),oldHeight=host.getBoundingClientRect().height,token=++switchVersion;
 cancelTransition();change();const panel=$("#view-"+targetView),newHeight=panel.getBoundingClientRect().height;
 if(!reduceMotion()&&oldHeight&&newHeight){host.style.height=oldHeight+"px";host.classList.add("switching");
 const a=host.animate([{height:oldHeight+"px"},{height:newHeight+"px"}],{duration:190,easing:"cubic-bezier(.2,.7,.2,1)",fill:"forwards"});
 const fade=panel.animate([{opacity:.45},{opacity:1}],{duration:160,easing:"ease-out"});transitionAnimations=[a,fade];
 a.finished.then(()=>{if(token===switchVersion){host.style.height="";host.classList.remove("switching");a.cancel();transitionAnimations=[]}}).catch(()=>{});
 }
 if(scroll){const anchor=$(".view-tabs").getBoundingClientRect().top+scrollY-18,target=Math.max(anchor,Number(ui().scrolls[targetView])||anchor);window.scrollTo({top:target,behavior:reduceMotion()?"auto":"smooth"})}
 if(focus)panel.focus({preventScroll:true});
 if(currentView==="world")requestAnimationFrame(()=>scene?.resize());
}
function viewMarkup(name){
 currentView=name;ui().view=name;
 $$(".view").forEach(el=>el.hidden=el.id!=="view-"+name);
 $$("[data-view]").forEach(el=>{const on=el.dataset.view===name;el.classList.toggle("active",on);if(el.getAttribute("role")==="tab"){el.setAttribute("aria-selected",on?"true":"false");el.tabIndex=on?0:-1}});
}
function setView(name,options={}){
 if(!["world","comparison","audience"].includes(name)||name===currentView)return;
 flushRender();ui().scrolls[currentView]=scrollY;const fromContent=options.source&&!options.source.closest(".view-tabs");
 const scroll=fromContent||scrollY>$(".view-tabs").getBoundingClientRect().top+scrollY+30;
 transitionView(()=>{viewMarkup(name);if(name==="comparison")comparison();syncScenePlayback()}, {targetView:name,focus:!!fromContent,scroll});
 persistUI();
}
function setModule(id,{force=false,resetPlayback=false}={}){
 if(!S.modules.some(m=>m.id===id)||(!force&&id===ws.active))return;flushRender();ui().scrolls[currentView]=scrollY;
 if(scene){ui().progress=scene.progress;ui().camera=scene.getCamera()}
 closeDialogs();changingModule=true;if(scene)scene.setVisible(false);
 ws.active=id;const saved=ui();if(resetPlayback){saved.progress=0;saved.view="world";saved.selected=null}currentView=saved.view;lastProfile=null;
 transitionView(()=>{viewMarkup(currentView);renderModule();if(currentView==="comparison")comparison();changingModule=false;updateScene()},{targetView:currentView});
 persist();persistUI();try{const url=new URL(location.href);url.searchParams.set("scene",id);history.replaceState(null,"",url)}catch{}
}
function methodContent(){
 const c=config();
 return'<div class="method-source"><b>当前来源：'+c.title+'行业情景样例</b><br>人群基线与策略响应采用预设假设，适合方案比较与研究讨论。真实业务结论需要使用获授权的数据进行校准与验证。</div><h3>'+c.title+'的测算口径</h3><ul>'+c.assumptions.map(a=>'<li>'+safeText(a)+'</li>').join("")+'</ul><h3>动态场景与总体指标</h3><p>小镇中的人物是可调数量的行为可视化样本，不与全部触达用户逐一对应。总体指标按完整周期与人群结构计算；场景人数可随每日规模调整，也可手动设置为 8–128 人。人群分布与完成概率遵循当前模型的分群结果，动画样本不等同于实际业务总人数。当前版本未连接后台推理或真实业务数据。</p><h3>保存与隐私</h3><p>设置与研究记录仅保存在当前浏览器，不上传服务器。下载的报告可独立保留；清除浏览器数据会移除本地研究记录。</p><h3>素材与字体</h3><p>像素地形采用 Kenney Tiny Town（CC0），人物与场景交互为原创绘制。中文标题使用 Noto Serif SC，正文使用 Noto Sans SC；英文字体以 Georgia 与系统衬线字体配合。字体与图标许可随网站代码保留。</p>';
}
function reportContent(){
 const r=result(),c=config(),bestContext=S.compute(ws.active,{...state(),scheme:r.best.id});
 return'<div class="report-summary">'+safeText(r.recommendation)+'</div><div class="report-condition"><span>'+c.title+'</span><span>'+state().params.days+' 天</span><span>'+nr(r.reach)+' '+(ws.active==="public"?"人次需求":"人触达")+'</span><span>'+safeText(c.objectives.find(o=>o.value===state().objective).label)+'</span></div><div class="stat-grid">'+r.metrics.map(m=>'<article class="stat"><small>'+m.label+'</small><strong>'+fmt(r.best[m.key],m)+'</strong><em>'+m.unit+'</em></article>').join("")+'</div><h3>三方案完整对照</h3><div class="table-wrap"><table>'+tableMarkup(r)+'</table></div><h3>研究条件</h3><div class="report-condition">'+c.controls.map(ctrl=>{const v=state().params[ctrl.key],label=ctrl.type==="select"?ctrl.options.find(x=>String(x.value)===String(v))?.label:v;return'<span>'+ctrl.label+'：'+safeText(label)+' '+(ctrl.type==="select"?"":safeText(ctrl.unit))+'</span>'}).join("")+'</div><p>'+c.segments4.map((g,i)=>g.name+" "+nr(state().weights[i],1)+"%").join(" / ")+'</p><h3>实际验证计划</h3><ol>'+c.validation.map(x=>'<li>'+safeText(x)+'</li>').join("")+'</ol><p class="report-method">数据来源：'+c.title+'行业情景样例。'+safeText(bestContext.notes.join(" "))+' 本报告不构成对真实业务结果的保证。生成时间：'+new Date().toLocaleString("zh-CN")+'</p>';
}
function openReport(){$("#report-name").value=ws.names[ws.active];$("#report-body").innerHTML=reportContent();openDialog("report-dialog")}
function download(content,name,type){
 const href=URL.createObjectURL(new Blob([content],{type})),a=document.createElement("a");a.href=href;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),2000)
}
function exportHTML(){
 const title=ws.names[ws.active],css='body{font:14px/1.85 Georgia,"Microsoft YaHei",serif;color:#294f5c;max-width:1000px;padding:40px;margin:auto;background:#fff}h1{font-size:30px;font-weight:500;margin:12px 0 28px}h2,h3{font-size:19px;margin-top:30px}header{border-bottom:1px solid #ccdce1;padding-bottom:20px}small{color:#829aa4}.report-summary{font-size:21px;margin:25px 0}.report-condition{display:flex;gap:10px 22px;flex-wrap:wrap;color:#8199a3;font:12px/1.8 "Microsoft YaHei",sans-serif}.stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:25px 0}.stat{background:#f2f7f8;padding:15px;border-radius:6px}.stat small,.stat strong,.stat em{display:block}.stat strong{font-size:25px;font-weight:400}.stat em{font-size:11px;color:#859da6;font-style:normal}table{border-collapse:collapse;width:100%;font:12px/1.8 "Microsoft YaHei",sans-serif}th,td{padding:12px 8px;border-bottom:1px solid #deeaed;text-align:right}th:first-child,td:first-child{text-align:left}th{font-weight:400;color:#8aa2ab}.best{background:#f1f6f7}p,li{color:#6d8995;font-size:13px}.report-method{border-top:1px solid #d6e3e7;margin-top:30px;padding-top:18px;font-size:11px}.table-wrap{overflow:auto}@media(max-width:640px){body{padding:20px}.stat-grid{grid-template-columns:1fr 1fr}h1{font-size:25px}}@media print{body{padding:0}.stat, tr{break-inside:avoid}}';
 const page='<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+safeText(title)+' · 演策</title><style>'+css+'</style></head><body><header><small>演策 YANCE / 决策研究</small><h1>'+safeText(title)+'</h1></header>'+reportContent()+'</body></html>';
 download(page,"演策-"+title.replace(/[\\/:*?"<>|]/g,"-")+".html","text/html;charset=utf-8");notify("已下载 HTML 报告")
}
function exportCSV(){
 const r=result(),head=["策略",...r.tableMetrics.map(m=>m.label+" ("+m.unit+")")],csvCell=v=>'"'+String(v).replace(/"/g,'""')+'"',rows=[head,...r.rows.map(row=>[row.name,...r.tableMetrics.map(m=>Number.isFinite(row[m.key])?+row[m.key].toFixed(4):"")])];
 rows.push([],["数据来源","行业情景样例，非真实业务预测"]);download("\ufeff"+rows.map(row=>row.map(csvCell).join(",")).join("\r\n"),"演策-"+ws.active+"-方案比较.csv","text/csv;charset=utf-8");notify("已下载 CSV 指标表")
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
 const scheme=e.target.closest("[data-scheme]");if(scheme){if(state().scheme===scheme.dataset.scheme)return;state().scheme=scheme.dataset.scheme;renderSettings();renderAll();return}
 const card=e.target.closest("[data-select-scenario]");if(card){state().scheme=card.dataset.selectScenario;renderSettings();renderAll();notify("已将「"+result().selected.name+"」应用到场景");return}
 const close=e.target.closest("[data-close]");if(close){close.closest("dialog").close();return}
 const action=e.target.closest("[data-action]");
 if(action){switch(action.dataset.action){case"preferences":syncPreferenceControls();openDialog("preferences-dialog");break;case"report":openReport();break;case"method":$("#method-body").innerHTML=methodContent();openDialog("method-dialog");break;case"library":library();break;case"save":$("#study-name").value=ws.names[ws.active];openDialog("save-dialog");break;case"reset":ws.states[ws.active]=S.defaults(ws.active);ui().progress=0;ui().selected=null;if(scene){scene.selected=null;scene.reset()}resetObserver();$("#expanded-observer").hidden=true;renderSettings();renderAll();notify("已恢复本场景默认参数");break}return}
 const load=e.target.closest("[data-load-study]");if(load){const item=ws.studies.find(x=>x.id===load.dataset.loadStudy);if(item){ws.states[item.module]=S.normalise(item.module,item.state);ws.names[item.module]=item.name;setModule(item.module,{force:true,resetPlayback:true});notify("已打开「"+item.name+"」")}return}
 const del=e.target.closest("[data-delete-study]");if(del){const item=ws.studies.find(x=>x.id===del.dataset.deleteStudy);if(item){if(del.dataset.confirm!=="true"){del.dataset.confirm="true";del.title="再次点击确认删除";del.setAttribute("aria-label","确认删除 "+item.name);del.style.color="#ac6d54";del.innerHTML='<i data-lucide="check"></i>';icons();return}ws.studies=ws.studies.filter(x=>x.id!==item.id);persist();library();notify("研究已移除，当前工作台设置仍然保留")}return}
});
document.addEventListener("input",e=>{
 const el=e.target;if(el.matches("[data-param][type=range]")){state().params[el.dataset.param]=+el.value;scheduleRender()}
 if(el.matches("[data-weight]"))applyWeight(+el.dataset.weight,+el.value);
});
document.addEventListener("change",e=>{const el=e.target;if(el.matches("[data-param]:not([type=range])")){const c=config().controls.find(c=>c.key===el.dataset.param);if(c.type!=="select"&&el.value===""){el.value=state().params[c.key];return}state().params[c.key]=c.type==="select"?el.value:+el.value;renderAll()}});
$("#objective").addEventListener("change",e=>{state().objective=e.target.value;renderAll()});
$("#reset-audience").addEventListener("click",()=>{state().weights=S.defaults(ws.active).weights;renderAll();notify("已恢复当前场景的人群结构")});
function stopScrub(){if(!scrubbing)return;scrubbing=false;ui().playing=scrubWasPlaying&&scene.progress<1;syncScenePlayback();persistUI()}
function startScrub(){if(scrubbing||!scene)return;scrubbing=true;scrubWasPlaying=ui().playing;scene.setPlaying(false)}
$("#play").addEventListener("click",()=>{const u=ui();if(u.progress>=1){u.progress=0;scene.setProgress(0);u.playing=true}else u.playing=!u.playing;syncScenePlayback();persistUI()});
$("#replay").addEventListener("click",()=>{const u=ui();u.progress=0;u.playing=true;scene.reset();syncScenePlayback();persistUI();notify("已从第 1 天重新播放")});
$$("[data-speed]").forEach(b=>b.addEventListener("click",()=>{prefs.speed=+b.dataset.speed;applyPreferences();persistUI()}));
$("#timeline").addEventListener("pointerdown",startScrub);window.addEventListener("pointerup",stopScrub);window.addEventListener("pointercancel",stopScrub);
$("#timeline").addEventListener("keydown",e=>{if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End","PageUp","PageDown"].includes(e.key))startScrub()});
$("#timeline").addEventListener("keyup",stopScrub);$("#timeline").addEventListener("blur",stopScrub);
$("#timeline").addEventListener("input",e=>{const p=+e.target.value/1000;ui().progress=p;if(p>=1)ui().playing=false;scene.setProgress(p);clockText(scene.getClock?.());persistUI()});
$("#visitor-select").addEventListener("change",e=>{if(e.target.value==="")return;scene.selectAgent(+e.target.value)});
$("#sample-mode").addEventListener("change",e=>{ui().sampleMode=e.target.value;if(ui().sampleMode==="manual")ui().count=scene?.agents.length||32;updateScene();persistUI()});
$("#sample-count").addEventListener("change",e=>{ui().count=Math.max(8,Math.min(128,Math.round(Number(e.target.value)||32)));updateScene();persistUI()});
$("#scene-light").addEventListener("change",e=>{ui().lighting=e.target.value;updateScene();persistUI()});
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
$("#save-form").addEventListener("submit",e=>{e.preventDefault();const name=$("#study-name").value.trim();if(!name)return;ws.studies.push({id:"study-"+Date.now()+"-"+Math.random().toString(16).slice(2,7),module:ws.active,name:name.slice(0,80),date:new Date().toISOString(),state:copy(state())});if(ws.studies.length>40)ws.studies.shift();ws.names[ws.active]=name;persist();$("#save-dialog").close();notify("已保存「"+name+"」")});
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
window.addEventListener("resize",()=>{cancelTransition()},{passive:true});
window.YanceApp={getWorkspace:()=>copy(ws),getState:()=>copy(state()),getModule:()=>config(),compute:result,setModule,setView,getInterface:()=>copy({preferences:prefs,modules:moduleUI,currentView}),flush:()=>{flushRender();flushPersist();persistUI(true)}};
currentView=ui().view;if(reduceMotion())ui().playing=false;viewMarkup(currentView);applyPreferences();renderModule();if(currentView==="comparison")comparison();updateScene();icons();persist();
})();
