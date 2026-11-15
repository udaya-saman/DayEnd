'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const core=require('../dayend-core.js');
const names=['Dine','Takeaway','Delivery','Aggregator','Total'];
function makeReport(from,to,opts={}){
 const sales=opts.sales||[100,200,300,400,1000];
 const qty=opts.qty||[1,2,3,4,10];
 return {fileName:'example.xlsx',from,to,outlets:[{name:opts.name||'Matara 2',key:core.outletKey(opts.name||'Matara 2'),row:10,
  values:qty.map((n,i)=>[n,sales[i]])}]};
}
test('outlet selection treats Matara 2 and Matara 02 as the same outlet',()=>{
 assert.equal(core.outletKey('Matara 2'),core.outletKey('Matara 02'));
 assert.notEqual(core.outletKey('Matara'),core.outletKey('Matara 2'));
});
test('valid reports produce expected values for all seven metrics',()=>{
 const daily=makeReport('2026-11-02','2026-11-02');
 const mtd=makeReport('2026-11-01','2026-11-02',{sales:[400,500,600,700,2200],qty:[4,5,6,7,22]});
 const r=core.validate(daily,mtd,'Matara 02');
 assert.equal(r.ok,true,JSON.stringify(r.errors));
 assert.deepEqual(core.METRICS.map(m=>core.metricValue(m.key,4,r.daily,r.mtd,r.days)),
 [10,1000,2200,1100,22,11,100]);
});
test('two first-day reports can be supplied explicitly without confusion',()=>{
 const day=makeReport('2026-11-01','2026-11-01');
 const mtd=makeReport('2026-11-01','2026-11-01');
 assert.equal(core.validate(day,mtd,'Matara 02').ok,true);
});
test('accepts Rs. 5 exactly, but rejects differences above Rs. 5',()=>{
 const daily=makeReport('2026-11-02','2026-11-02',{sales:[100,200,300,405,1000]});
 const mtd=makeReport('2026-11-01','2026-11-02',{sales:[400,500,600,705,2200],qty:[4,5,6,7,22]});
 let result=core.validate(daily,mtd,'Matara 2');
 assert.equal(result.ok,true,JSON.stringify(result.errors));
 assert.equal(result.warnings.length,2);
 daily.outlets[0].values[3][1]=405.01;
 result=core.validate(daily,mtd,'Matara 2');
 assert.equal(result.ok,false);
 assert.match(result.errors.join(' '),/Daily sales do not match/);
});
test('refuses an MTD report spanning two calendar months',()=>{
 const daily=makeReport('2026-12-01','2026-12-01');
 const mtd=makeReport('2026-11-01','2026-12-01',{sales:[400,500,600,700,2200],qty:[4,5,6,7,22]});
 const result=core.validate(daily,mtd,'Matara 2');
 assert.equal(result.ok,false);
 assert.match(result.errors.join(' '),/one calendar month/);
});
test('rejects mismatched dates and daily date ranges',()=>{
 const daily=makeReport('2026-11-01','2026-11-02');
 const mtd=makeReport('2026-11-01','2026-11-03',{sales:[400,500,600,700,2200],qty:[4,5,6,7,22]});
 const result=core.validate(daily,mtd,'Matara 2');
 assert.equal(result.ok,false);
 assert.match(result.errors.join(' '),/Daily report must cover just one date/);
 assert.match(result.errors.join(' '),/same date/);
});
test('rejects missing outlet and duplicate outlet rows',()=>{
 const daily=makeReport('2026-11-01','2026-11-01');
 const mtd=makeReport('2026-11-01','2026-11-01');
 assert.equal(core.validate(daily,mtd,'Matara').ok,false);
 daily.outlets.push({...daily.outlets[0]});
 assert.match(core.validate(daily,mtd,'Matara 2').errors.join(' '),/duplicate/i);
});
test('rejects missing and invalid values rather than omitting outlet row',()=>{
 const daily=makeReport('2026-11-01','2026-11-01');
 const mtd=makeReport('2026-11-01','2026-11-01');
 daily.outlets[0].values[2][1]=NaN;
 assert.equal(core.validate(daily,mtd,'Matara 2').ok,false);
});
test('rejects document-count mismatches and MTD below Daily',()=>{
 const daily=makeReport('2026-11-02','2026-11-02');
 const mtd=makeReport('2026-11-01','2026-11-02',{qty:[1,2,2,4,9]});
 const result=core.validate(daily,mtd,'Matara 2');
 assert.equal(result.ok,false);
 assert.match(result.errors.join(' '),/MTD documents are lower/);
});
test('preserves day-first date interpretation and rejects impossible dates',()=>{
 assert.equal(core.parseDateToken('15/11/2026','DMY'),'2026-11-15');
 assert.equal(core.parseDateToken('11/15/2026','MDY'),'2026-11-15');
 assert.equal(core.parseDateToken('31/02/2026','DMY'),'');
 assert.equal(core.parseDateToken('2026-11-15','DMY'),'2026-11-15');
});
test('parses dates in report labels',()=>{
 const range=core.parseDateRange([['From Date','01/11/2026'],['To Date','15/11/2026']],'DMY');
 assert.deepEqual(range,{from:'2026-11-01',to:'2026-11-15'});
});
test('rejects positional guessing when Excel subheaders are missing',()=>{
 const rows=[
  ['Outlet','Dine In','','Take Away','','Delivery','','Aggregator','','Total',''],
  ['', 'Qty','Net Sales','Qty','Net Sales','Qty','Net Sales','Qty','Net Sales','Qty','Net Sales'],
  ['Matara 2',1,100,2,200,3,300,4,400,10,1000]
 ];
 const outlets=core.findTable(rows);
 assert.equal(outlets[0].name,'Matara 2');
 assert.equal(outlets[0].values[4][1],1000);
 rows[1][4]='unknown';
 assert.throws(()=>core.findTable(rows),/columns could not be identified/);
});
test('division by zero displays a missing ticket average instead of Infinity',()=>{
 const report=makeReport('2026-11-01','2026-11-01',{qty:[0,0,0,0,0],sales:[0,0,0,0,0]});
 const row=report.outlets[0];
 assert.equal(core.metricValue('docAvg',4,row,row,1),null);
});

test('Previous and Next visit all seven metrics in the original order',()=>{
  let current=core.METRICS[0].key;
  for(let i=1;i<core.METRICS.length;i++){
    current=core.adjacentMetric(current,1);
    assert.equal(current,core.METRICS[i].key);
  }
  for(let i=core.METRICS.length-2;i>=0;i--){
    current=core.adjacentMetric(current,-1);
    assert.equal(current,core.METRICS[i].key);
  }
});
test('Previous and Next wrap correctly at the first and last metrics',()=>{
  const first=core.METRICS[0].key,last=core.METRICS.at(-1).key;
  assert.equal(core.adjacentMetric(first,-1),last);
  assert.equal(core.adjacentMetric(last,1),first);
  assert.equal(core.adjacentMetric(first,0),first);
});

test('combines outlets across worksheets from the same reporting period',()=>{
 const a=makeReport('2026-11-01','2026-11-02');
 const b=makeReport('2026-11-01','2026-11-02',{name:'Tangalle'});
 const combined=core.combineSheets([
  {sheet:'South A',from:a.from,to:a.to,outlets:a.outlets},
  {sheet:'South B',from:b.from,to:b.to,outlets:b.outlets}
 ],'sample.xlsx');
 assert.equal(combined.outlets.length,2);
 assert.equal(combined.sheet,'South A, South B');
 assert.equal(core.lookup(combined,'Tangalle').name,'Tangalle');
});
test('rejects ambiguous worksheets with conflicting periods',()=>{
 const first=makeReport('2026-11-01','2026-11-02');
 const second=makeReport('2026-10-01','2026-10-31',{name:'Tangalle'});
 assert.throws(()=>core.combineSheets([
  {sheet:'Old',from:second.from,to:second.to,outlets:second.outlets},
  {sheet:'Current',from:first.from,to:first.to,outlets:first.outlets}
 ],'mixed.xlsx'),/different dates/);
});
test('rejects duplicate outlets across worksheets',()=>{
 const sheet=makeReport('2026-11-01','2026-11-02');
 assert.throws(()=>core.combineSheets([
  {sheet:'First',from:sheet.from,to:sheet.to,outlets:sheet.outlets},
  {sheet:'Second',from:sheet.from,to:sheet.to,outlets:sheet.outlets}
 ],'duplicate.xlsx'),/more than one report sheet/);
});

test('date parsing avoids traversing every row when report dates are at the top',()=>{
 const rows=[['From Date','01/11/2026','To Date','15/11/2026']];
 for(let i=0;i<20000;i++)rows.push([]);
 rows[19999]=new Proxy([], {get(){throw Error('Scanned unnecessary distant cells');}});
 assert.deepEqual(core.parseDateRange(rows,'DMY'),{from:'2026-11-01',to:'2026-11-15'});
});

test('automatically detect a single outlet from one report',()=>{
 const report=makeReport('2026-11-01','2026-11-01',{name:'Tangalle'});
 assert.deepEqual(core.detectOutlet(report,null),{name:'Tangalle',error:''});
});
test('automatically resolve a unique shared outlet across two reports',()=>{
 const daily=makeReport('2026-11-02','2026-11-02',{name:'Matara 2'});
 const mtd=makeReport('2026-11-01','2026-11-02',{name:'Matara 02'});
 daily.outlets.push({...daily.outlets[0],name:'Galle',key:'galle'});
 assert.equal(core.detectOutlet(daily,mtd).name,'Matara 2');
});
test('reject mismatched or ambiguous multi-outlet reports without guessing',()=>{
 const daily=makeReport('2026-11-02','2026-11-02',{name:'Matara 2'});
 const mtd=makeReport('2026-11-01','2026-11-02',{name:'Tangalle'});
 const unmatched=core.detectOutlet(daily,mtd);
 assert.equal(unmatched.name,'');
 assert.match(unmatched.error,/do not contain the same outlet/);
 mtd.outlets=[{...daily.outlets[0]}];
 daily.outlets.push({...daily.outlets[0],name:'Galle',key:'galle'});
 mtd.outlets.push({...daily.outlets[1]});
 const ambiguous=core.detectOutlet(daily,mtd);
 assert.equal(ambiguous.name,'');
 assert.match(ambiguous.error,/more than one matching outlet/);
});

test('a previously selected outlet is used only when the new report contains it',()=>{
 const daily=makeReport('2026-11-02','2026-11-02',{name:'Matara 2'});
 daily.outlets.push({...daily.outlets[0],name:'Galle',key:'galle'});
 const mtd=makeReport('2026-11-01','2026-11-02',{name:'Matara 02'});
 mtd.outlets.push({...mtd.outlets[0],name:'Galle',key:'galle'});
 const matched=core.detectOutlet(daily,mtd,'Matara 02');
 assert.equal(core.outletKey(matched.name),'matara 2');
 const unknown=core.detectOutlet(daily,mtd,'Akuressa');
 assert.equal(unknown.name,'');
 assert.match(unknown.error,/more than one matching outlet/);
});
