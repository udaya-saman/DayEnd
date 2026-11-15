/* DAY END v4.1.0. Local-only reporting and accessible interface. */
(function () {
'use strict';
const core=window.DayEndCore;
const $=id=>document.getElementById(id);
const DEFAULT_OUTLETS=['Akuressa','Embilipitiya','Monaragala','Matara','Matara 02','Tangalle'];
const STORE_KEY='dayend.outlet.v4';
const state={daily:null,mtd:null,busy:false,revision:0,view:'upload',metric:'noDoc',error:[],dateOrder:'DMY',outlet:null};
const previouslyFocused={element:null};
function storedOutlet(){
 try{return String(localStorage.getItem(STORE_KEY)||'Matara 2');}
 catch(_){return 'Matara 2';}
}
function persistOutlet(value){
 try{localStorage.setItem(STORE_KEY,value);return true;}
 catch(_){return false;}
}
state.outlet=storedOutlet();
function presentOutlet(value){return core.outletKey(value)==='matara 2'?'Matara 02':value;}
function allOutlets() {
 const names=new Map();
 DEFAULT_OUTLETS.forEach(name=>{if(!names.has(core.outletKey(name)))names.set(core.outletKey(name),presentOutlet(name));});
 [state.daily,state.mtd].forEach(report=>{
  (report?.outlets||[]).forEach(row=>{
   if(!names.has(row.key))names.set(row.key,row.name);
  });
 });
 if(!names.has(core.outletKey(state.outlet)))names.set(core.outletKey(state.outlet),state.outlet);
 return [...names.values()].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
}
function sharedOutlets(){
 if(!state.daily||!state.mtd)return null;
 const mtdKeys=new Set(state.mtd.outlets.map(row=>row.key));
 return new Set(state.daily.outlets.filter(row=>mtdKeys.has(row.key)).map(row=>row.key));
}
function fillSelect(select,chosen) {
 const list=allOutlets(),shared=sharedOutlets(),selectedKey=core.outletKey(chosen);
 select.replaceChildren(...list.map(name=>{
  const option=document.createElement('option'),key=core.outletKey(name);
  option.value=name;option.disabled=!!shared&&!shared.has(key);
  option.textContent=option.disabled?name+' (not in both reports)':name;
  return option;
 }));
 const saved=list.find(name=>core.outletKey(name)===selectedKey);
 if(saved)select.value=saved;
}
function message(host,kind,title,items){
 const box=document.createElement('div');box.className='notice '+kind;
 const strong=document.createElement('strong');strong.textContent=title;box.append(strong);
 if(items?.length){
  const ul=document.createElement('ul');
  items.forEach(item=>{const li=document.createElement('li');li.textContent=item;ul.append(li);});
  box.append(ul);
 }
 host.append(box);
}
function selectionResult(){
 if(!state.daily||!state.mtd)return null;
 return core.validate(state.daily,state.mtd,state.outlet);
}
function setView(name) {
 state.view=name;
 $('uploadScreen').hidden=name!=='upload';
 $('resultScreen').hidden=name!=='result';
 window.scrollTo(0,0);
 if(name==='result')renderResult();
}
function renderUpload(){
 $('outletName').textContent=presentOutlet(state.outlet);
 for(const [kind,cardId,fileId] of [['daily','dailyCard','dailyFile'],['mtd','mtdCard','mtdFile']]){
  const report=state[kind];
  $(cardId).classList.toggle('ready',!!report);
  $(fileId).textContent=report?'✓ '+report.fileName:'No file selected';
 }
 const result=selectionResult(),messages=$('uploadMessages');
 messages.replaceChildren();
 if(state.error.length)message(messages,'error','Check your reports',state.error);
 if(result&&!result.ok)message(messages,'error','Please check these details',result.errors);
 if(result?.ok&&result.warnings.length)message(messages,'warning','Accepted with a small difference',result.warnings);
 $('showReport').disabled=state.busy||!result?.ok;
 $('showReport').textContent=state.busy?'Reading reports…':'View Report →';
 $('dailyInput').disabled=state.busy;
 $('mtdInput').disabled=state.busy;
 $('openSettings').disabled=state.busy;
 if(state.view==='result'&&!result?.ok)setView('upload');
}
function renderResult(){
 const result=selectionResult();
 if(!result?.ok)return;
 $('metric').value=state.metric;
 $('metricPosition').textContent=(core.METRICS.findIndex(x=>x.key===state.metric)+1)+' of '+core.METRICS.length;
 const body=$('resultRows');body.replaceChildren();
 core.CHANNELS.forEach((channel,index)=>{
  const row=document.createElement('tr');
  if(index===4)row.className='total';
  const name=document.createElement('td'),value=document.createElement('td');
  name.textContent=channel.label;
  const amount=core.metricValue(state.metric,index,result.daily,result.mtd,result.days);
  value.textContent=amount===null||!Number.isFinite(amount)?'—':core.formatNumber(amount);
  row.append(name,value);body.append(row);
 });
 const warnings=$('resultWarnings');warnings.replaceChildren();
 if(result.warnings.length)message(warnings,'warning','Sales difference accepted',result.warnings);
}
function render(){renderUpload();if(state.view==='result')renderResult();}
function firstMetric(){state.metric=core.METRICS[0].key;}
async function upload(kind,file){
 if(!file||state.busy)return;
 const revision=++state.revision;
 state.busy=true;state.error=[];
 state[kind]=null;setView('upload');render();
 try {
  const parsed=await core.readWorkbook(file,state.dateOrder);
  if(revision!==state.revision)return;
  if(kind==='daily'&&parsed.from!==parsed.to)throw Error('This is not a one-day Daily report. Choose the Daily report.');
  if(kind==='mtd'&&(!parsed.from.endsWith('-01')||parsed.from.slice(0,7)!==parsed.to.slice(0,7)))throw Error('This is not a valid Month-to-Date report. Choose the MTD report.');
  state[kind]=parsed;
 } catch(error) {
  if(revision===state.revision)state.error=[error?.message||'This Excel file could not be read. Choose another copy.'];
 } finally {
  if(revision===state.revision){
   state.busy=false;render();
   if(selectionResult()?.ok){firstMetric();setView('result');}
  }
 }
}
function changeOutlet(value){
 if(!value||state.busy)return;
 state.outlet=value;
 state.error=persistOutlet(value)?[]:['Your outlet was changed, but this browser could not save it.'];
 if(state.daily&&state.mtd&&!selectionResult()?.ok){
  state.error.push('The selected outlet must appear in both reports. Choose another outlet or replace your files.');
 }
 setView('upload');render();
}
function resetReports(){
 if(state.busy)return;
 state.revision++;state.daily=null;state.mtd=null;state.error=[];
 firstMetric();
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
 box.addEventListener('dragover',event=>{
  event.preventDefault();if(!state.busy)box.classList.add('drag');
 });
 box.addEventListener('dragleave',()=>box.classList.remove('drag'));
 box.addEventListener('drop',event=>{
  event.preventDefault();box.classList.remove('drag');
  if(state.busy)return;
  const files=[...event.dataTransfer.files];
  if(files.length!==1){state.error=['Drop only one Excel file into each area.'];render();return;}
  upload(kind,files[0]);
 });
}
for(const metric of core.METRICS){
 const option=document.createElement('option');option.value=metric.key;option.textContent=metric.label;
 $('metric').append(option);
}
$('metric').addEventListener('change',event=>{state.metric=event.target.value;renderResult();});
$('previousMetric').addEventListener('click',()=>{state.metric=core.adjacentMetric(state.metric,-1);renderResult();});
$('nextMetric').addEventListener('click',()=>{state.metric=core.adjacentMetric(state.metric,1);renderResult();});
$('showReport').addEventListener('click',()=>{if(selectionResult()?.ok)setView('result');});
$('clearFiles').addEventListener('click',resetReports);
$('newReports').addEventListener('click',resetReports);
$('backToUpload').addEventListener('click',()=>setView('upload'));
function closeSettings(){
 $('settingsOverlay').hidden=true;
 const target=previouslyFocused.element;
 previouslyFocused.element=null;
 if(target?.isConnected)target.focus();
 else $('openSettings').focus();
}
$('openSettings').addEventListener('click',()=>{
 previouslyFocused.element=document.activeElement;
 fillSelect($('settingsOutlet'),state.outlet);
 $('settingsNote').textContent=sharedOutlets()?'Only outlets found in both uploaded reports can be chosen.':'You can change the outlet at any time.';
 $('settingsOverlay').hidden=false;
 $('settingsOutlet').focus();
});
$('closeSettings').addEventListener('click',closeSettings);
$('confirmSettings').addEventListener('click',()=>{
 if($('settingsOutlet').selectedOptions[0]?.disabled)return;
 changeOutlet($('settingsOutlet').value);
 closeSettings();
});
$('settingsOverlay').addEventListener('click',event=>{
 if(event.target===$('settingsOverlay'))closeSettings();
});
document.addEventListener('keydown',event=>{
 if($('settingsOverlay').hidden)return;
 if(event.key==='Escape'){event.preventDefault();closeSettings();return;}
 if(event.key!=='Tab')return;
 const focusables=[...$('settingsOverlay').querySelectorAll('select,button')].filter(el=>!el.disabled);
 const first=focusables[0],last=focusables.at(-1);
 if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
 else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
});
render();
if('serviceWorker'in navigator&&/^https?:$/.test(location.protocol)){
 window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}
})();
