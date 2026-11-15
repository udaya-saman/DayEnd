/* DAY END v4.0.0 application controller. No report content is stored or transmitted. */
(function(){
'use strict';
const core=window.DayEndCore;
const $=id=>document.getElementById(id);
const DEFAULT_OUTLETS=['Akuressa','Embilipitiya','Monaragala','Matara','Matara 02','Matara 2','Tangalle'];
const STORE_KEY='dayend.outlet.v4';
const state={daily:null,mtd:null,busy:false,revision:0,view:'upload',metric:'noDoc',error:[],dateOrder:'DMY'};
function savedOutlet(){
 try{return String(localStorage.getItem(STORE_KEY)||'Matara 2');}
 catch(_){return 'Matara 2';}
}
function persistOutlet(value){
 try{localStorage.setItem(STORE_KEY,value);return true;}
 catch(_){return false;}
}
state.outlet=savedOutlet();
function presentOutlet(name){
 return core.outletKey(name)==='matara 2'?'Matara 02':name;
}
function allOutlets(){
 const names=new Map();
 DEFAULT_OUTLETS.forEach(name=>{if(!names.has(core.outletKey(name)))names.set(core.outletKey(name),presentOutlet(name));});
 [state.daily,state.mtd].forEach(report=>{
  (report?.outlets||[]).forEach(entry=>{if(!names.has(entry.key))names.set(entry.key,entry.name);});
 });
 if(!names.has(core.outletKey(state.outlet)))names.set(core.outletKey(state.outlet),state.outlet);
 return Array.from(names.values()).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
}
function fillSelect(select,selected){
 const key=core.outletKey(selected),items=allOutlets();
 select.replaceChildren(...items.map(name=>{
  const option=document.createElement('option');
  option.value=name;option.textContent=name;return option;
 }));
 const exact=items.find(name=>core.outletKey(name)===key);
 select.value=exact||items[0]||'';
}
function message(target,kind,title,items){
 const div=document.createElement('div');div.className='notice '+kind;
 const strong=document.createElement('strong');strong.textContent=title;div.append(strong);
 if(items?.length){
  const list=document.createElement('ul');
  items.forEach(item=>{const li=document.createElement('li');li.textContent=item;list.append(li);});
  div.append(list);
 }
 target.append(div);
}
function selectionResult(){
 if(!state.daily||!state.mtd)return null;
 return core.validate(state.daily,state.mtd,state.outlet);
}
function setView(name){
 state.view=name;
 $('uploadScreen').hidden=name!=='upload';
 $('resultScreen').hidden=name!=='result';
 document.documentElement.scrollTop=0;
 window.scrollTo(0,0);
 if(name==='result')renderResult();
}
function renderUpload(){
 $('outletName').textContent=presentOutlet(state.outlet);
 fillSelect($('outletSelect'),state.outlet);
 [['daily','dailyCard','dailyFile'],['mtd','mtdCard','mtdFile']].forEach(([kind,card,file])=>{
  const report=state[kind];
  $(card).classList.toggle('ready',!!report);
  $(file).textContent=report?('✓ '+report.fileName):'No file selected';
 });
 const result=selectionResult();
 const container=$('uploadMessages');container.replaceChildren();
 if(state.error.length)message(container,'error','Check your reports',state.error);
 if(result&&!result.ok)message(container,'error','Some figures need attention',result.errors);
 if(result?.ok&&result.warnings.length)message(container,'warning','Checked with a small difference',result.warnings);
 $('showReport').disabled=state.busy||!result?.ok;
 $('showReport').textContent=state.busy?'Reading reports…':'View report →';
 $('dailyInput').disabled=state.busy;$('mtdInput').disabled=state.busy;
 $('saveOutlet').disabled=state.busy;
 if(state.view==='result'){
  if(!result?.ok)setView('upload');
  else renderResult();
 }
}
function dateLabel(date){
 if(!date)return '—';
 const dt=new Date(date+'T00:00:00Z');
 return new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',day:'2-digit',month:'short',year:'numeric'}).format(dt);
}
function formatValue(value,key){
 if(value==null||!Number.isFinite(value))return '—';
 return core.formatNumber(value);
}
function currentMetricLabel(){
 return core.METRICS.find(x=>x.key===state.metric)?.label||'No. Doc';
}
function renderResult(){
 const result=selectionResult();if(!result?.ok)return;
 $('resultOutlet').textContent=presentOutlet(state.outlet);
 $('resultDate').textContent=dateLabel(state.daily.to);
 $('resultPeriod').textContent=dateLabel(state.mtd.from)+' – '+dateLabel(state.mtd.to);
 $('metric').value=state.metric;
 $('metricPosition').textContent=(core.METRICS.findIndex(metric=>metric.key===state.metric)+1)+' of '+core.METRICS.length;
 const values=core.CHANNELS.map((channel,index)=>({
   label:channel.label,value:core.metricValue(state.metric,index,result.daily,result.mtd,result.days)
 }));
 $('totalValue').textContent=formatValue(values[4].value,state.metric);
 $('metricUnit').textContent=currentMetricLabel();
 const body=$('resultRows');body.replaceChildren();
 values.forEach((entry,index)=>{
  const tr=document.createElement('tr');if(index===4)tr.className='total';
  const label=document.createElement('td'),value=document.createElement('td');
  label.textContent=entry.label;value.textContent=formatValue(entry.value,state.metric);
  tr.append(label,value);body.append(tr);
 });
 const warnings=$('resultWarnings');warnings.replaceChildren();
 if(result.warnings.length)message(warnings,'warning','Report accepted with a small difference',result.warnings);
 $('sourceFiles').textContent='Sources: Daily · '+state.daily.fileName+' | MTD · '+state.mtd.fileName;
}
function render(){
 renderUpload();
 if(state.view==='result')renderResult();
}
async function upload(kind,file){
 if(!file||state.busy)return;
 const revision=++state.revision;
 state.busy=true;state.error=[];
 // Never keep the previous report after a replacement attempt.
 state[kind]=null;setView('upload');render();
 try{
  const parsed=await core.readWorkbook(file,state.dateOrder);
  if(revision!==state.revision)return;
  if(kind==='daily'&&parsed.from!==parsed.to)throw Error('This is not a one-day Daily report. Choose the Daily report instead.');
  if(kind==='mtd'&&(!parsed.from.endsWith('-01')||parsed.from.slice(0,7)!==parsed.to.slice(0,7)))throw Error('This is not a valid Month-to-Date report. Choose the MTD report instead.');
  state[kind]=parsed;
 }catch(err){
  if(revision===state.revision)state.error=[err?.message||'This Excel file could not be read. Try another copy.'];
 }finally{
  if(revision===state.revision){
   state.busy=false;render();
   const result=selectionResult();
   if(result?.ok){setView('result');}
  }
 }
}
function chooseOutlet(value){
 if(!value||state.busy)return;
 state.outlet=value;
 const persisted=persistOutlet(value);
 state.error=persisted?[]:['Your outlet was changed but could not be saved on this device.'];
 setView('upload');render();
}
function resetReports(){
 if(state.busy)return;
 state.revision++;state.daily=null;state.mtd=null;state.error=[];
 $('dailyInput').value='';$('mtdInput').value='';
 setView('upload');render();
}
for(const [kind,id] of [['daily','dailyInput'],['mtd','mtdInput']]){
 $(id).addEventListener('change',event=>{
  const files=[...event.target.files];event.target.value='';
  if(files.length!==1){state.error=['Choose exactly one Excel file for this report.'];render();return;}
  upload(kind,files[0]);
 });
 const box=$(kind+'Card');
 box.addEventListener('dragover',event=>{event.preventDefault();box.classList.add('drag');});
 box.addEventListener('dragleave',()=>box.classList.remove('drag'));
 box.addEventListener('drop',event=>{
  event.preventDefault();box.classList.remove('drag');
  if(state.busy)return;
  const files=[...event.dataTransfer.files];
  if(files.length!==1){state.error=['Drop one Excel file into each report area.'];render();return;}
  upload(kind,files[0]);
 });
}
core.METRICS.forEach(metric=>{
 const option=document.createElement('option');option.value=metric.key;option.textContent=metric.label;$('metric').append(option);
});
$('metric').addEventListener('change',event=>{state.metric=event.target.value;renderResult();});
$('previousMetric').addEventListener('click',()=>{state.metric=core.adjacentMetric(state.metric,-1);renderResult();});
$('nextMetric').addEventListener('click',()=>{state.metric=core.adjacentMetric(state.metric,1);renderResult();});
$('showReport').addEventListener('click',()=>{if(selectionResult()?.ok)setView('result');});
$('saveOutlet').addEventListener('click',()=>chooseOutlet($('outletSelect').value));
$('clearFiles').addEventListener('click',resetReports);
$('newReports').addEventListener('click',resetReports);
$('backToUpload').addEventListener('click',()=>setView('upload'));
$('openSettings').addEventListener('click',()=>{
 fillSelect($('settingsOutlet'),state.outlet);
 $('settingsNote').textContent='Changing your outlet does not delete the original Excel files.';
 $('settingsOverlay').hidden=false;$('settingsOutlet').focus();
});
$('closeSettings').addEventListener('click',()=>{$('settingsOverlay').hidden=true;$('openSettings').focus();});
$('confirmSettings').addEventListener('click',()=>{
 chooseOutlet($('settingsOutlet').value);
 $('settingsOverlay').hidden=true;$('openSettings').focus();
});
$('settingsOverlay').addEventListener('click',event=>{
 if(event.target===$('settingsOverlay'))$('closeSettings').click();
});
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&!$('settingsOverlay').hidden)$('closeSettings').click();
});
render();
if('serviceWorker'in navigator&&/^https?:$/.test(location.protocol)){
 window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}
})();