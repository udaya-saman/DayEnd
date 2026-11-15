/* DAY END v4.4.1. Local-only reporting and accessible interface. */
(function () {
'use strict';
const core=window.DayEndCore;
const $=id=>document.getElementById(id);
function previouslySelectedOutlet() {
 try{return localStorage.getItem('dayend.outlet.v4')||'';}catch(_){return '';}
}
const state={daily:null,mtd:null,busy:false,revision:0,view:'upload',metric:'noDoc',error:[],dateOrder:'DMY',outlet:'',preferredOutlet:previouslySelectedOutlet()};
function resolveOutlet() {
 const detected=core.detectOutlet(state.daily,state.mtd,state.preferredOutlet);
 state.outlet=detected.name;
 return detected;
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
 if(!state.outlet)return null;
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
 const found=resolveOutlet();
 $('outletName').textContent=found.name||'';
 $('outletName').parentElement.hidden=!found.name;
 for(const [kind,cardId,fileId] of [['daily','dailyCard','dailyFile'],['mtd','mtdCard','mtdFile']]){
  const report=state[kind];
  $(cardId).classList.toggle('ready',!!report);
  $(fileId).textContent=report?'✓ '+report.fileName:(state.busy&&!report?'Reading file…':'No file selected');
 }
 const result=selectionResult(),messages=$('uploadMessages');
 messages.replaceChildren();
 if(state.error.length)message(messages,'error','Check your reports',state.error);
 if(found.error)message(messages,state.daily&&state.mtd?'error':'warning','Outlet detection', [found.error]);
 if(result&&!result.ok)message(messages,'error','Please check these details',result.errors);
 $('showReport').disabled=state.busy||!result?.ok;
 $('showReport').textContent=state.busy?'Reading reports…':'View Report →';
 $('dailyInput').disabled=state.busy;
 $('mtdInput').disabled=state.busy;

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
function resetReports(){
 if(state.busy)return;
 state.revision++;state.daily=null;state.mtd=null;state.outlet='';state.error=[];
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
render();
if('serviceWorker'in navigator&&/^https?:$/.test(location.protocol)){
 window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}
})();
