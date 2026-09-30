(function(){
"use strict";
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s)), S=window.YanceScenarios;
const STORE="yance-workspace-v4", SEGMENT_FLOOR=2;
const safeText=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const copy=v=>JSON.parse(JSON.stringify(v));
let ws={active:"merchant",states:{},names:{},studies:[]},scene=null,configuring=false,currentView="world",elapsed={},resume={},speed=1,toastId,lastProfile=null,lastPaint=0;
try{const raw=JSON.parse(localStorage.getItem(STORE)||"null");if(raw&&typeof raw==="object"){if(S.modules.some(m=>m.id===raw.active))ws.active=raw.active;if(raw.states&&typeof raw.states==="object")ws.states=raw.states;if(raw.names&&typeof raw.names==="object")ws.names=raw.names;if(Array.isArray(raw.studies))ws.studies=raw.studies.slice(0,40).filter(x=>x&&S.modules.some(m=>m.id===x.module)&&typeof x.name==="string").map(x=>({id:String(x.id).slice(0,70),module:x.module,name:x.name.slice(0,80),date:typeof x.date==="string"?x.date:"",state:S.normalise(x.module,x.state)}))}}catch{}
S.modules.forEach(m=>{ws.states[m.id]=S.normalise(m.id,ws.states[m.id]);ws.names[m.id]=typeof ws.names[m.id]==="string"?ws.names[m.id].slice(0,100):m.strategyTitle});
const paramModule=new URLSearchParams(location.search).get("scene");if(S.modules.some(m=>m.id===paramModule))ws.active=paramModule;
const config=()=>S.getModule(ws.active),state=()=>ws.states[ws.active],result=()=>S.compute(ws.active,state());
const icons=()=>{if(window.lucide)lucide.createIcons({attrs:{"stroke-width":1.6,"aria-hidden":"true"}})};
const nr=(v,d=0)=>Number.isFinite(v)?new Intl.NumberFormat("zh-CN",{maximumFractionDigits:d,minimumFractionDigits:d}).format(v):"—";
function fmt(v,m={format:"integer"}){if(!Number.isFinite(v))return"—";if(m.format==="percent")return nr(v,1)+"%";if(m.format==="currency")return (v<0?"−":"")+"¥"+nr(Math.abs(v),m.key==="unitCost"?2:0);return nr(v)}
function currentMeta(){const r=result();return config().metrics.concat(config().tableMetrics).find(m=>m.key===r.chartKey)||{key:r.chartKey,label:r.chartLabel,format:r.chartUnit==="元"?"currency":r.chartUnit==="%"?"percent":"integer",unit:r.chartUnit}}
function persist(){try{localStorage.setItem(STORE,JSON.stringify(ws));$("#saved-status").textContent="设置已自动保存"}catch{$("#saved-status").textContent="浏览器未允许保存，可下载报告保留本次研究"}$("#library-count").textContent=ws.studies.length}
function notify(t){clearTimeout(toastId);$("#toast").textContent=t;$("#toast").classList.add("show");toastId=setTimeout(()=>$("#toast").classList.remove("show"),2300)}
function openDialog(id){const d=$("#"+id);if(!d.open)d.showModal();icons()}
function closeDialogs(){$$("dialog[open]").forEach(d=>d.close())}
function moduleMenu(){$("#module-tabs").innerHTML=S.modules.map(m=>'<button role="tab" aria-selected="'+(m.id===ws.active)+'" data-module="'+m.id+'"><i data-lucide="'+m.icon+'"></i><span><b>'+m.title+'</b><small>'+m.english+'</small></span></button>').join("");icons()}
function controlMarkup(c){
 const value=state().params[c.key],id="param-"+c.key;
 const label='<span>'+safeText(c.label)+(c.type==="range"?'<output for="'+id+'">'+safeText(value)+' <small>'+safeText(c.unit)+'</small></output>':c.unit?'<small class="control-unit">'+safeText(c.unit)+'</small>':"")+'</span>';
 let field="";
 if(c.type==="select")field='<select id="'+id+'" data-param="'+c.key+'" aria-describedby="'+id+'-hint">'+c.options.map(o=>'<option value="'+safeText(o.value)+'"'+(String(o.value)===String(value)?" selected":"")+'>'+safeText(o.label)+'</option>').join("")+'</select>';
 else field='<input id="'+id+'" data-param="'+c.key+'" type="'+(c.type==="range"?"range":"number")+'" min="'+c.min+'" max="'+c.max+'" step="'+c.step+'" value="'+value+'" aria-describedby="'+id+'-hint">';
 return'<label class="field">'+label+field+(c.type==="range"?'<div class="range-extents"><span>'+c.min+'</span><span>'+c.max+' '+safeText(c.unit)+'</span></div>':"")+'<p id="'+id+'-hint" class="'+(c.scheme?"control-hint":"sr-only")+'">'+safeText(c.hint)+'</p></label>';
}
function renderSettings(){
 const c=config(),s=state();
 $("#scheme-options").innerHTML=c.schemes.map(v=>'<button type="button" role="radio" aria-checked="'+(s.scheme===v.id)+'" data-scheme="'+v.id+'"><span class="radio"></span><span class="scheme-copy"><b>'+v.name+'</b><small>'+v.desc+'</small></span><span class="scheme-tag">'+v.tag+'</span></button>').join("");
 const controls=c.controls.filter(x=>x.scheme===s.scheme);
 $("#variant-controls").innerHTML=controls.length?controls.map(controlMarkup).join(""):'<p class="baseline-note">保留现有条件，作为另外两种方案的比较起点。</p>';
 $("#main-controls").innerHTML=c.controls.filter(x=>x.section==="shared"&&["days","budget"].includes(x.key)).map(controlMarkup).join("");
 $("#advanced-controls").innerHTML=c.controls.filter(x=>x.section==="shared"&&!["days","budget"].includes(x.key)).map(controlMarkup).join("");
 $("#objective").innerHTML=c.objectives.map(o=>'<option value="'+o.value+'"'+(o.value===s.objective?" selected":"")+'>'+o.label+'</option>').join("");
 icons();syncControls();
}
function syncControls(){
 $$("[data-param]").forEach(el=>{const c=config().controls.find(c=>c.key===el.dataset.param);el.value=state().params[c.key];const out=el.closest("label").querySelector("output");if(out)out.innerHTML=safeText(el.value)+' <small>'+safeText(c.unit)+'</small>'});
 $("#objective").value=state().objective;$("#period-label").textContent=state().params.days+" 天观察窗口";$("#day-total").textContent=state().params.days+" 天";
 $("#world-location").textContent=config().schemes.find(x=>x.id===state().scheme).short;
}
function renderModule(){
 const c=config();moduleMenu();$("#module-caption").textContent=c.title+" / "+c.english;$("#study-title").textContent=c.strategyTitle;$("#study-decision").textContent=c.decision;$("#world-title").textContent=c.worldTitle;
 $("#audience-title").textContent=c.audienceTitle;$("#audience-definition").textContent=c.audienceNote;$("#visitor-select").innerHTML='<option value="">选择人群代表</option>'+c.segments4.map((s,i)=>'<option value="'+i+'">'+s.name+'</option>').join("");
 $("#world-legend").innerHTML=c.segments4.map(s=>'<span style="--seg:'+s.color+'"><i></i>'+s.name+'</span>').join("");
 $("#audience-cards").innerHTML=c.segments4.map((s,i)=>'<article class="audience-card" style="--seg:'+s.color+';--seg-soft:'+s.color+'20"><div class="audience-head"><div class="audience-avatar"></div><div><h4>'+s.name+'</h4><small>'+s.short+'</small></div></div><strong data-weight-label="'+i+'"></strong><p>'+s.desc+'</p><input data-weight="'+i+'" type="range" min="2" max="94" step="1" aria-label="'+s.name+'占比"></article>').join("");
 resetObserver();renderSettings();renderAll();$("#report-name").value=ws.names[ws.active];icons()
}
function resetObserver(){lastProfile=null;$("#observer-title").textContent="从一个人的选择，看见一类人的反应。";$("#observer-status").textContent="待观察";$("#observer-quote").textContent="点击街区中的人物，查看当前行为与情景反馈。";$("#visitor-select").value="";$("#portrait").style.background="#eaf0ed"}
function renderMix(){
 const c=config(),s=state();
 const marks=s.weights.map((w,i)=>'<span style="width:'+w+'%;background:'+c.segments4[i].color+'"></span>').join("");
 const legend=c.segments4.map((g,i)=>'<span style="--seg:'+g.color+'"><i></i>'+g.name+" "+nr(s.weights[i],Number.isInteger(s.weights[i])?0:1)+'%</span>').join("");
 $("#mini-mix").innerHTML=marks;$("#full-mix").innerHTML=marks;$("#mix-summary").innerHTML=legend;$("#full-mix-legend").innerHTML=legend;$("#mini-mix").setAttribute("aria-label",c.segments4.map((g,i)=>g.name+" "+nr(s.weights[i],1)+"%").join("，"));
 $$("[data-weight]").forEach(el=>{const i=+el.dataset.weight;el.value=s.weights[i];$('[data-weight-label="'+i+'"]').textContent=nr(s.weights[i],Number.isInteger(s.weights[i])?0:1)+"%"});
}
function sceneTick(t){
 if(configuring)return;
 elapsed[ws.active]=t.progress;const playing=scene?scene.playing:false;
 $("#timeline").value=Math.round(t.progress*1000);$("#day-label").textContent="第 "+Math.min(state().params.days,Math.floor(t.progress*state().params.days)+1)+" 天";$("#play-state").textContent=t.progress>=1?"本次预演已结束":playing?"预演中":"已暂停";
 const label=t.progress>=1?"重新播放":playing?"暂停预演":"继续预演";
 if($("#play").getAttribute("aria-label")!==label){$("#play").innerHTML='<i data-lucide="'+(t.progress>=1?"rotate-ccw":playing?"pause":"play")+'"></i>';$("#play").setAttribute("aria-label",label);$("#play").title=label;icons()}
 $(".live-dot").style.background=playing?"#78a68d":"#a4b4ae";
}
function updateScene(){
 if(!window.TownScene){$("#play-state").textContent="场景尚未加载，请刷新页面";return}
 const r=result(),c=config(),s=state(),p=s.params,progress=elapsed[ws.active]||0;
 let playing=scene?scene.playing:!matchMedia("(prefers-reduced-motion: reduce)").matches;
 if(currentView!=="world"){playing=false}else if(resume[ws.active]!==undefined){playing=resume[ws.active];delete resume[ws.active]}
 configuring=true;
 if(!scene){scene=new TownScene({canvas:$("#town"),onSelect:selectPerson,onTick:sceneTick});window.yanceTown=scene}
 scene.setOptions({module:ws.active,segments:c.segments4.map(g=>({id:g.id,name:g.name,color:g.color,quote:g.quote})),scheme:s.scheme,coupon:ws.active==="merchant"?r.selected.d:0,memberTarget:p.memberTarget||"all",coverage:r.selected.coverage,weights:s.weights.slice(),duration:p.days,conversion:(r.selected.rate||r.selected.completion||0)/100,progress});
 scene.setSpeed(speed);scene.setPlaying(playing);configuring=false;sceneTick({progress:scene.progress});
}
function selectPerson(profile){
 if(configuring&&lastProfile==null)return;
 lastProfile=profile;
 const idx=config().segments4.findIndex(s=>s.name===profile.segment||s.id===profile.segment),seg=config().segments4[idx]||config().segments4[0];
 $("#observer-title").textContent=profile.name+" / "+seg.name;$("#observer-status").textContent=profile.status;$("#observer-quote").textContent=profile.quote||seg.quote;$("#portrait").style.background=seg.color+"25";$("#visitor-select").value=idx>=0?String(idx):"";
}
function cards(){
 const r=result(),c=config(),primary=currentMeta();
 const secondary=c.metrics.filter(m=>m.key!==r.chartKey).slice(0,2);
 $("#scenario-cards").innerHTML=r.rows.map(row=>'<button class="scenario-card '+(row.id===r.best.id?"best":"")+'" data-select-scenario="'+row.id+'"><div class="scenario-tag">'+row.tag+'</div><div class="scenario-top"><h4>'+row.name+'</h4>'+(row.id===r.best.id?'<span class="recommend-label">优先验证</span>':"")+'</div><div class="scenario-number">'+fmt(row[r.chartKey],primary)+(primary.format==="integer"?'<small>'+safeText(primary.unit)+'</small>':"")+'</div><div class="scenario-label">'+r.chartLabel+'</div><div class="scenario-bottom">'+secondary.map(m=>'<div><span>'+m.label+'</span><b>'+fmt(row[m.key],m)+'</b></div>').join("")+'</div></button>').join("");
}
function tableMarkup(r){
 const ms=r.tableMetrics;
 return'<thead><tr><th scope="col">策略</th>'+ms.map(m=>'<th scope="col">'+m.label+(m.format==="integer"?" / "+m.unit:"")+'</th>').join("")+'</tr></thead><tbody>'+r.rows.map(row=>'<tr class="'+(row.id===r.best.id?"best":"")+'"><td>'+row.name+(row.id===r.best.id?" · 优先验证":"")+'</td>'+ms.map(m=>'<td>'+fmt(row[m.key],m)+'</td>').join("")+'</tr>').join("")+'</tbody>';
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
function setView(name){
 if(!["world","comparison","audience"].includes(name))return;
 if(currentView==="world"&&name!=="world"&&scene){resume[ws.active]=scene.playing;scene.setPlaying(false)}
 currentView=name;$$(".view").forEach(el=>el.hidden=el.id!=="view-"+name);$$("[data-view]").forEach(el=>{el.classList.toggle("active",el.dataset.view===name);if(el.closest("nav"))el.setAttribute("aria-current",el.dataset.view===name?"page":"false")});
 if(name==="comparison")comparison();
 if(name==="world"){updateScene();requestAnimationFrame(()=>scene&&scene.resize())}
}
function setModule(id){
 if(!S.modules.some(m=>m.id===id))return;if(scene){elapsed[ws.active]=scene.progress;if(currentView==="world")resume[ws.active]=scene.playing}
 ws.active=id;currentView="world";if(elapsed[id]==null)elapsed[id]=0;if(resume[id]===undefined)resume[id]=!matchMedia("(prefers-reduced-motion: reduce)").matches;lastProfile=null;if(scene)scene.selected=null;
 $$("dialog[open]").forEach(d=>d.close());renderModule();setView("world");persist();
 if(scene)scene.resize();try{const url=new URL(location.href);url.searchParams.set("scene",id);history.replaceState(null,"",url)}catch{}
}
function methodContent(){
 const c=config();
 return'<div class="method-source"><b>当前来源：'+c.title+'行业情景样例</b><br>人群基线与策略响应采用预设假设，适合方案比较与研究讨论。真实业务结论需要使用获授权的数据进行校准与验证。</div><h3>'+c.title+'的测算口径</h3><ul>'+c.assumptions.map(a=>'<li>'+safeText(a)+'</li>').join("")+'</ul><h3>动态场景与总体指标</h3><p>小镇中的 32 位人物是行为可视化样本，不与全部触达用户逐一对应。总体指标按完整周期与人群结构计算；人物路径用于呈现当前策略下的可能过程。当前版本未连接后台推理或真实业务数据。</p><h3>保存与隐私</h3><p>设置与研究记录仅保存在当前浏览器，不上传服务器。下载的报告可独立保留；清除浏览器数据会移除本地研究记录。</p><h3>素材与字体</h3><p>像素地形采用 Kenney Tiny Town（CC0），人物与场景交互为原创绘制。中文标题使用 Noto Serif SC，正文使用 Noto Sans SC；英文字体以 Georgia 与系统衬线字体配合。字体与图标许可随网站代码保留。</p>';
}
function reportContent(){
 const r=result(),c=config(),bestContext=S.compute(ws.active,{...state(),scheme:r.best.id});
 return'<div class="report-summary">'+safeText(r.recommendation)+'</div><div class="report-condition"><span>'+c.title+'</span><span>'+state().params.days+' 天</span><span>'+nr(r.reach)+' '+(ws.active==="public"?"人次需求":"人触达")+'</span><span>'+safeText(c.objectives.find(o=>o.value===state().objective).label)+'</span></div><div class="stat-grid">'+r.metrics.map(m=>'<article class="stat"><small>'+m.label+'</small><strong>'+fmt(r.best[m.key],m)+'</strong><em>'+m.unit+'</em></article>').join("")+'</div><h3>三方案完整对照</h3><div class="table-wrap"><table>'+tableMarkup(r)+'</table></div><h3>研究条件</h3><div class="report-condition">'+c.controls.map(ctrl=>{const v=state().params[ctrl.key],label=ctrl.type==="select"?ctrl.options.find(x=>String(x.value)===String(v))?.label:v;return'<span>'+ctrl.label+'：'+safeText(label)+' '+(ctrl.type==="select"?"":safeText(ctrl.unit))+'</span>'}).join("")+'</div><p>'+c.segments4.map((g,i)=>g.name+" "+nr(state().weights[i],1)+"%").join(" / ")+'</p><h3>下一步验证</h3><ol>'+c.validation.map(x=>'<li>'+safeText(x)+'</li>').join("")+'</ol><p class="report-method">数据来源：'+c.title+'行业情景样例。'+safeText(bestContext.notes.join(" "))+' 本报告不构成对真实业务结果的保证。生成时间：'+new Date().toLocaleString("zh-CN")+'</p>';
}
function openReport(){$("#report-name").value=ws.names[ws.active];$("#report-body").innerHTML=reportContent();openDialog("report-dialog")}
function download(content,name,type){
 const href=URL.createObjectURL(new Blob([content],{type})),a=document.createElement("a");a.href=href;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),2000)
}
function exportHTML(){
 const title=ws.names[ws.active],css='body{font:14px/1.85 Georgia,"Microsoft YaHei",serif;color:#294f5c;max-width:1000px;padding:40px;margin:auto;background:#fff}h1{font-size:30px;font-weight:500;margin:12px 0 28px}h2,h3{font-size:19px;margin-top:30px}header{border-bottom:1px solid #ccdce1;padding-bottom:20px}small{color:#829aa4}.report-summary{font-size:21px;margin:25px 0}.report-condition{display:flex;gap:10px 22px;flex-wrap:wrap;color:#8199a3;font:12px/1.8 "Microsoft YaHei",sans-serif}.stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:25px 0}.stat{background:#f2f7f8;padding:15px;border-radius:6px}.stat small,.stat strong,.stat em{display:block}.stat strong{font-size:25px;font-weight:400}.stat em{font-size:11px;color:#859da6;font-style:normal}table{border-collapse:collapse;width:100%;font:12px/1.8 "Microsoft YaHei",sans-serif}th,td{padding:12px 8px;border-bottom:1px solid #deeaed;text-align:right}th:first-child,td:first-child{text-align:left}th{font-weight:400;color:#8aa2ab}.best{background:#f1f6f7}p,li{color:#6d8995;font-size:13px}.report-method{border-top:1px solid #d6e3e7;margin-top:30px;padding-top:18px;font-size:11px}.table-wrap{overflow:auto}@media(max-width:640px){body{padding:20px}.stat-grid{grid-template-columns:1fr 1fr}h1{font-size:25px}}@media print{body{padding:0}.stat, tr{break-inside:avoid}}';
 const page='<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+safeText(title)+' · 演策</title><style>'+css+'</style></head><body><header><small>演策 YANCE / 决策研究</small><h1>'+safeText(title)+'</h1></header>'+reportContent()+'</body></html>';
 download(page,"演策-"+title.replace(/[\\/:*?"<>|]/g,"-")+".html","text/html;charset=utf-8");notify("已下载完整研究报告")
}
function exportCSV(){
 const r=result(),head=["策略",...r.tableMetrics.map(m=>m.label+" ("+m.unit+")")],csvCell=v=>'"'+String(v).replace(/"/g,'""')+'"',rows=[head,...r.rows.map(row=>[row.name,...r.tableMetrics.map(m=>Number.isFinite(row[m.key])?+row[m.key].toFixed(4):"")])];
 rows.push([],["数据来源","行业情景样例，非真实业务预测"]);download("\ufeff"+rows.map(row=>row.map(csvCell).join(",")).join("\r\n"),"演策-"+ws.active+"-方案比较.csv","text/csv;charset=utf-8");notify("已导出完整指标表")
}
function library(){
 $("#library-body").innerHTML=ws.studies.length?ws.studies.slice().reverse().map(item=>'<article class="library-item"><div><h3>'+safeText(item.name)+'</h3><p>'+S.getModule(item.module).title+" / "+safeText(new Date(item.date).toLocaleString("zh-CN"))+'</p></div><button class="button" data-load-study="'+safeText(item.id)+'">继续研究<i data-lucide="arrow-up-right"></i></button><button class="icon-button" data-delete-study="'+safeText(item.id)+'" aria-label="删除'+safeText(item.name)+'" title="删除研究"><i data-lucide="trash-2"></i></button></article>').join(""):'<div class="library-empty"><i data-lucide="bookmark"></i><h3>下一次研究，从这里继续。</h3><p>调整场景后点击「保存研究」，将一组值得讨论的方案保留下来。</p></div>';
 openDialog("library-dialog")
}
function allocate(total,scores){let sum=scores.reduce((a,b)=>a+b,0);if(!sum){scores=scores.map(()=>1);sum=scores.length}const raw=scores.map(x=>total*x/sum),values=raw.map(Math.floor),order=raw.map((v,i)=>i).sort((a,b)=>(raw[b]-values[b])-(raw[a]-values[a]));for(let n=total-values.reduce((a,b)=>a+b,0),j=0;j<n;j++)values[order[j%order.length]]++;return values}
function applyWeight(i,value){const others=[0,1,2,3].filter(j=>j!==i),extras=allocate(100-value-SEGMENT_FLOOR*3,others.map(j=>Math.max(0,state().weights[j]-SEGMENT_FLOOR)));state().weights[i]=value;others.forEach((j,k)=>state().weights[j]=SEGMENT_FLOOR+extras[k]);renderAll()}
document.addEventListener("click",e=>{
 const module=e.target.closest("[data-module]");if(module){setModule(module.dataset.module);return}
 const v=e.target.closest("[data-view]");if(v){setView(v.dataset.view);return}
 const scheme=e.target.closest("[data-scheme]");if(scheme){state().scheme=scheme.dataset.scheme;renderSettings();renderAll();return}
 const card=e.target.closest("[data-select-scenario]");if(card){state().scheme=card.dataset.selectScenario;renderSettings();renderAll();notify("已将「"+result().selected.name+"」应用到场景");return}
 const close=e.target.closest("[data-close]");if(close){close.closest("dialog").close();return}
 const action=e.target.closest("[data-action]");
 if(action){switch(action.dataset.action){case"report":openReport();break;case"method":$("#method-body").innerHTML=methodContent();openDialog("method-dialog");break;case"library":library();break;case"save":$("#study-name").value=ws.names[ws.active];openDialog("save-dialog");break;case"reset":ws.states[ws.active]=S.defaults(ws.active);elapsed[ws.active]=0;renderSettings();renderAll();notify("已恢复当前场景的默认设置");break}return}
 const load=e.target.closest("[data-load-study]");if(load){const item=ws.studies.find(x=>x.id===load.dataset.loadStudy);if(item){ws.states[item.module]=S.normalise(item.module,item.state);ws.names[item.module]=item.name;elapsed[item.module]=0;setModule(item.module);notify("已载入「"+item.name+"」")}return}
 const del=e.target.closest("[data-delete-study]");if(del){const item=ws.studies.find(x=>x.id===del.dataset.deleteStudy);if(item){if(del.dataset.confirm!=="true"){del.dataset.confirm="true";del.title="再次点击确认删除";del.setAttribute("aria-label","确认删除 "+item.name);del.style.color="#ac6d54";del.innerHTML='<i data-lucide="check"></i>';icons();return}ws.studies=ws.studies.filter(x=>x.id!==item.id);persist();library();notify("研究已移除，当前工作台设置仍然保留")}return}
});
document.addEventListener("input",e=>{
 const el=e.target;if(el.matches("[data-param][type=range]")){state().params[el.dataset.param]=+el.value;renderAll()}
 if(el.matches("[data-weight]"))applyWeight(+el.dataset.weight,+el.value);
});
document.addEventListener("change",e=>{const el=e.target;if(el.matches("[data-param]:not([type=range])")){const c=config().controls.find(c=>c.key===el.dataset.param);if(c.type!=="select"&&el.value===""){el.value=state().params[c.key];return}state().params[c.key]=c.type==="select"?el.value:+el.value;renderAll()}});
$("#objective").addEventListener("change",e=>{state().objective=e.target.value;renderAll()});
$("#reset-audience").addEventListener("click",()=>{state().weights=S.defaults(ws.active).weights;renderAll();notify("已恢复当前场景的人群结构")});
$("#play").addEventListener("click",()=>{if(scene.progress>=1){scene.setProgress(0);scene.setPlaying(true)}else scene.setPlaying(!scene.playing);sceneTick({progress:scene.progress})});
$("#replay").addEventListener("click",()=>{scene.reset();scene.setPlaying(true);sceneTick({progress:scene.progress});notify("已从头开始预演")});
$$("[data-speed]").forEach(b=>b.addEventListener("click",()=>{speed=+b.dataset.speed;scene.setSpeed(speed);$$("[data-speed]").forEach(x=>{x.classList.toggle("active",x===b);x.setAttribute("aria-pressed",x===b?"true":"false")})}));
$("#timeline").addEventListener("input",e=>{scene.setProgress(+e.target.value/1000);sceneTick({progress:scene.progress})});
$("#visitor-select").addEventListener("change",e=>{if(e.target.value==="")return;const a=scene.agents.find(a=>a.segmentIndex===+e.target.value);if(a)scene.selectAgent(a.id)});
$("#fullscreen").addEventListener("click",async()=>{const panel=$(".world-panel");if(document.fullscreenElement){await document.exitFullscreen();return}if(panel.requestFullscreen){try{await panel.requestFullscreen();return}catch{}}panel.classList.toggle("expanded");document.body.classList.toggle("scene-expanded",panel.classList.contains("expanded"));requestAnimationFrame(()=>scene.resize())});
document.addEventListener("fullscreenchange",()=>{const expanded=!!document.fullscreenElement;$("#fullscreen").innerHTML='<i data-lucide="'+(expanded?"minimize-2":"maximize-2")+'"></i>';$("#fullscreen").setAttribute("aria-label",expanded?"退出全屏":"展开情景");icons();requestAnimationFrame(()=>scene.resize())});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){$(".world-panel").classList.remove("expanded");document.body.classList.remove("scene-expanded");requestAnimationFrame(()=>scene?.resize())}const b=e.target.closest("[data-module],[data-scheme]");if(b&&["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key)){e.preventDefault();const key=b.dataset.module?"[data-module]":"[data-scheme]",items=$$(key),delta=["ArrowRight","ArrowDown"].includes(e.key)?1:-1,next=items[(items.indexOf(b)+delta+items.length)%items.length];const attr=b.dataset.module?"data-module":"data-scheme",val=next.getAttribute(attr);next.focus();next.click();requestAnimationFrame(()=>$('['+attr+'="'+val+'"]')?.focus())}});
$("#report-name").addEventListener("input",e=>{ws.names[ws.active]=e.target.value.slice(0,100);persist()});
$("#save-form").addEventListener("submit",e=>{e.preventDefault();const name=$("#study-name").value.trim();if(!name)return;ws.studies.push({id:"study-"+Date.now()+"-"+Math.random().toString(16).slice(2,7),module:ws.active,name:name.slice(0,80),date:new Date().toISOString(),state:copy(state())});if(ws.studies.length>40)ws.studies.shift();ws.names[ws.active]=name;persist();$("#save-dialog").close();notify("已保存「"+name+"」")});
$("#html-export").addEventListener("click",exportHTML);$("#csv-export").addEventListener("click",exportCSV);$("#report-print").addEventListener("click",()=>{$("#report-body").innerHTML=reportContent();window.print()});
window.addEventListener("pagehide",persist);
window.YanceApp={getWorkspace:()=>copy(ws),getState:()=>copy(state()),getModule:()=>config(),compute:result,setModule};
renderModule();setView("world");icons();persist();
})();
