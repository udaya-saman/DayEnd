/* DAY END v4.0.0. Pure calculations and Excel report reader. */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DayEndCore = api;
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  var VERSION = '4.0.0';
  var TOLERANCE_CENTS = 500;
  var CHANNELS = [
    {key:'dine', label:'Dine'}, {key:'takeaway',label:'T/Away'},
    {key:'delivery',label:'Delivery'}, {key:'aggregator',label:'Aggregator'},
    {key:'total',label:'DAY SALE'}
  ];
  var METRICS = [
    {key:'noDoc',label:'No. Doc'}, {key:'netSales',label:'Net Sales'},
    {key:'cumulativeSales',label:'Cumulative Sales'}, {key:'avgChannel',label:'Avg. Channel'},
    {key:'cumDoc',label:'Cum. Doc'}, {key:'avgDoc',label:'Avg. Doc'},
    {key:'docAvg',label:'Doc Avg.'}
  ];
  function clean(value) {return String(value == null ? '' : value).replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();}
  function normalise(value) {return clean(value).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
  function outletKey(value) {return normalise(value).replace(/\b0+([1-9][0-9]*)\b/g, function (_,n) {return String(Number(n));});}
  function iso(y,m,d) {
    if (!Number.isInteger(y)||!Number.isInteger(m)||!Number.isInteger(d)) return '';
    var dt = new Date(Date.UTC(y,m-1,d));
    return dt.getUTCFullYear()===y && dt.getUTCMonth()===m-1 && dt.getUTCDate()===d ?
      String(y).padStart(4,'0')+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0') : '';
  }
  function parseDateToken(value, order) {
    var s = clean(value), match = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (match) return iso(+match[1],+match[2],+match[3]);
    match = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
    if (!match) return '';
    return (order === 'MDY') ? iso(+match[3],+match[1],+match[2]) : iso(+match[3],+match[2],+match[1]);
  }
  function parseDateRange(rows, order) {
    var text = rows.flat().map(clean).filter(Boolean).join(' ');
    var token = '([0-9]{4}-[0-9]{1,2}-[0-9]{1,2}|[0-9]{1,2}[/.\\-][0-9]{1,2}[/.\\-][0-9]{4})';
    var from = text.match(new RegExp('From\\s*Date\\s*[:：]?\\s*'+token,'i'));
    var to = text.match(new RegExp('To\\s*Date\\s*[:：]?\\s*'+token,'i'));
    return {from: from?parseDateToken(from[1],order):'', to:to?parseDateToken(to[1],order):''};
  }
  function dayCount(a,b) {
    if (!a || !b) return NaN;
    var x = Date.parse(a+'T00:00:00Z'), y = Date.parse(b+'T00:00:00Z');
    return (y-x)/86400000+1;
  }
  function cents(value) {return Math.round((value+Number.EPSILON)*100);}
  function formatNumber(value) {return Number.isFinite(value)?Math.round(value).toLocaleString('en-US'):'—';}
  function formatMoney(value) {return Number.isFinite(value)?value.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}):'—';}
  function toNumber(value) {
    if(typeof value==='number') return Number.isFinite(value)?value:NaN;
    var s=clean(value); if(!s||s==='-'||s==='—')return NaN;
    var neg=false;
    if(/^\(.*\)$/.test(s)){neg=true;s=s.slice(1,-1);}
    s=s.replace(/(?:LKR|Rs\.?|රු\.?)/gi,'').replace(/[\s,]/g,'');
    if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s))return NaN;
    var n=Number(s);return Number.isFinite(n)?(neg?-n:n):NaN;
  }
  function headerCategory(value) {
    var n=normalise(value);
    if(n==='dine in'||n==='dine')return 'dine';
    if(n==='take away'||n==='takeaway'||n==='t away'||n==='t a')return 'takeaway';
    if(n==='delivery')return 'delivery';
    if(n==='aggregator'||n==='aggregators')return 'aggregator';
    if(n==='total'||n==='grand total')return 'total';
    return '';
  }
  function colIndex(ref) {
    var match=String(ref).match(/^([A-Z]+)[0-9]+$/i);if(!match)return -1;
    var n=0;
    for(var i=0;i<match[1].length;i++)n=n*26+match[1].toUpperCase().charCodeAt(i)-64;
    return n-1;
  }
  function xmlDoc(source) {
    var doc=new DOMParser().parseFromString(source,'application/xml');
    if(doc.getElementsByTagName('parsererror').length)throw Error('This Excel file could not be read. Please export it again.');
    return doc;
  }
  function elems(node,name) {return Array.prototype.slice.call(node.getElementsByTagNameNS('*',name));}
  function parseSharedStrings(source) {
    if(!source)return [];
    var doc=xmlDoc(source);
    return elems(doc,'si').map(function(si){return elems(si,'t').map(function(t){return t.textContent||'';}).join('');});
  }
  function parseSheetRows(source,shared) {
    var doc=xmlDoc(source), data=elems(doc,'sheetData')[0];
    if(!data)throw Error('The worksheet has no readable data.');
    var result=[], rows=elems(data,'row');
    if(rows.length>30000)throw Error('The report has too many rows to process safely.');
    rows.forEach(function(rowEl) {
      var rowNo=Number(rowEl.getAttribute('r'))||result.length+1;
      if(!Number.isInteger(rowNo)||rowNo<1||rowNo>30000)throw Error('The worksheet has an invalid row number.');
      var row=[];
      elems(rowEl,'c').forEach(function(cell) {
        var ci=colIndex(cell.getAttribute('r')||'');
        if(ci<0)return;
        if(ci>=300)throw Error('The report has too many columns to process safely.');
        var type=cell.getAttribute('t')||'', value='';
        if(type==='inlineStr')value=elems(cell,'t').map(function(t){return t.textContent||'';}).join('');
        else {
          var val=elems(cell,'v')[0], raw=val?val.textContent:'';
          if(type==='s'){var index=Number(raw);value=Number.isInteger(index)&&index>=0?(shared[index]??''):'';}
          else if(type==='e')value=NaN;
          else if(type==='b')value=(raw==='1');
          else if(type==='str'||type==='d')value=raw;
          else if(raw!==''){var n=Number(raw);value=Number.isFinite(n)?n:raw;}
        }
        row[ci]=value;
      });
      result[rowNo-1]=row;
    });
    return Array.from({length:result.length},function(_,i){return result[i]||[];});
  }
  function findTable(rows) {
    var header=-1, outletCol=-1, start={}, keys=['dine','takeaway','delivery','aggregator','total'];
    for(var ri=0;ri<rows.length;ri++){
      var row=rows[ri]||[], oi=row.findIndex(function(v){return normalise(v)==='outlet';});
      var found={};
      row.forEach(function(v,ci){var k=headerCategory(v);if(k&&found[k]===undefined)found[k]=ci;});
      if(oi>=0&&keys.every(function(k){return Number.isInteger(found[k]);})){
        header=ri;outletCol=oi;start=found;break;
      }
    }
    if(header<0)throw Error('The expected sales table was not found. Check the report layout.');
    var sub=rows[header+1]||[], columns={};
    keys.forEach(function(key,i) {
      var from=start[key],end=i+1<keys.length?start[keys[i+1]]:Math.max(sub.length,from+2);
      if(end<=from)throw Error('The report columns are in an unexpected order.');
      var qty=-1,sales=-1;
      for(var c=from;c<end;c++){
        var n=normalise(sub[c]);
        if(qty<0&&/^(qty|quantity|count|docs|documents)$/.test(n))qty=c;
        if(sales<0&&/^(net sales|sales amount|amount|value)$/.test(n))sales=c;
      }
      if(qty<0||sales<0||qty===sales)throw Error('The '+CHANNELS[i].label+' columns could not be identified. Please check the original report.');
      columns[key]={qty:qty,sales:sales};
    });
    var outlets=[];
    for(var r=header+2;r<rows.length;r++){
      var vals=rows[r]||[],name=clean(vals[outletCol]);
      if(!name)continue;
      if(/^(grand total|total)$/i.test(name))break;
      if(outlets.length>=1000)throw Error('This report has too many outlet rows.');
      if(!keys.some(function(k){return vals[columns[k].qty]!==undefined||vals[columns[k].sales]!==undefined;}))continue;
      outlets.push({name:name,key:outletKey(name),values:keys.map(function(k){return [toNumber(vals[columns[k].qty]),toNumber(vals[columns[k].sales])];}),row:r+1});
    }
    if(!outlets.length)throw Error('No outlet figures were found in the sales table.');
    return outlets;
  }
  function pathFor(target) {
    if(!target || /:|\\/.test(target))throw Error('This Excel file contains an unsupported worksheet link.');
    var parts=[], source=target.charAt(0)==='/'?target.slice(1):'xl/'+target;
    source.split('/').forEach(function(part){
      if(!part||part==='.')return;
      if(part==='..'){if(!parts.length)throw Error('This Excel file contains an unsafe worksheet link.');parts.pop();}
      else parts.push(part);
    });
    var path=parts.join('/');
    if(!path.startsWith('xl/'))throw Error('This Excel file contains an unsafe worksheet link.');
    return path;
  }
  async function readWorkbook(file,order) {
    if(!file||!/\.(xlsx|xlsm)$/i.test(file.name||''))throw Error('Choose an Excel report ending in .xlsx or .xlsm.');
    if(!file.size||file.size>25*1024*1024)throw Error('The report is empty or larger than 25 MB.');
    if(typeof JSZip==='undefined')throw Error('The Excel reader is unavailable. Reopen the app after connecting to the internet once.');
    var zip;
    try {zip=await JSZip.loadAsync(await file.arrayBuffer());}
    catch(_) {throw Error('This Excel file could not be opened. Save a new .xlsx copy and try again.');}
    var files=Object.values(zip.files).filter(function(item){return !item.dir;});
    if(files.length>4000)throw Error('This Excel file contains too many items.');
    var total=0;
    files.forEach(function(item){
      var size=item._data && item._data.uncompressedSize;
      if(Number.isFinite(size)){total+=size;if(size>25*1024*1024||total>60*1024*1024)throw Error('This Excel file is too large to process safely.');}
    });
    async function read(path,max) {
      var entry=zip.file(path);if(!entry)return null;
      var value=await entry.async('string');
      if(value.length>max)throw Error('The Excel report contains too much data.');
      return value;
    }
    var wb=await read('xl/workbook.xml',1000000),rels=await read('xl/_rels/workbook.xml.rels',1000000);
    if(!wb||!rels)throw Error('This workbook is missing its report details. Export it again.');
    var wbDoc=xmlDoc(wb),relDoc=xmlDoc(rels),relMap=new Map();
    elems(relDoc,'Relationship').forEach(function(node){
      if((node.getAttribute('Type')||'').endsWith('/worksheet') && node.getAttribute('TargetMode')!=='External')
        relMap.set(node.getAttribute('Id'),node.getAttribute('Target'));
    });
    var sheets=elems(wbDoc,'sheet');
    if(!sheets.length||sheets.length>50)throw Error('The workbook has an unsupported number of worksheets.');
    var shared=parseSharedStrings(await read('xl/sharedStrings.xml',12*1024*1024));
    var lastError;
    for(var i=0;i<sheets.length;i++){
      var sheet=sheets[i],rid=sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id')||sheet.getAttribute('r:id');
      var target=relMap.get(rid);if(!target)continue;
      var xml=await read(pathFor(target),25*1024*1024);if(!xml)continue;
      try {
        var rows=parseSheetRows(xml,shared),outlets=findTable(rows),dates=parseDateRange(rows,order||'DMY');
        if(!dates.from||!dates.to)throw Error('The report dates could not be read. Check the date format in the file.');
        return {fileName:file.name,sheet:sheet.getAttribute('name')||'Worksheet',from:dates.from,to:dates.to,outlets:outlets};
      } catch(err){lastError=err;}
    }
    throw lastError||Error('No worksheet contains the expected sales report.');
  }
  function lookup(report,name){
    if(!report||!report.outlets)return null;
    var matches=report.outlets.filter(function(r){return r.key===outletKey(name);});
    if(matches.length>1)throw Error('This report contains duplicate rows for '+clean(name)+'.');
    return matches[0]||null;
  }
  function validate(daily,mtd,outlet) {
    var errors=[],warnings=[],d=null,m=null, label=clean(outlet);
    if(!daily||!mtd)return {ok:false,errors:['Add both the Daily and MTD reports.'],warnings:[]};
    if(!label)errors.push('Select an outlet first.');
    try {d=lookup(daily,label);m=lookup(mtd,label);} catch(err){errors.push(err.message);}
    if(!d||!m)errors.push('The selected outlet was not found in both reports. Choose a matching outlet.');
    if(daily.from!==daily.to)errors.push('The Daily report must cover just one date.');
    if(!mtd.from||mtd.from.slice(8,10)!=='01')errors.push('The MTD report must begin on the first day of the month.');
    if(mtd.from&&mtd.to&&mtd.from.slice(0,7)!==mtd.to.slice(0,7))errors.push('The MTD report must stay within one calendar month.');
    if(daily.to!==mtd.to)errors.push('The Daily and MTD reports must end on the same date.');
    var days=dayCount(mtd.from,mtd.to);
    if(!Number.isInteger(days)||days<1||days>31)errors.push('The MTD reporting dates are invalid.');
    if(daily.to&&mtd.from&&daily.to<mtd.from)errors.push('The Daily report is outside the MTD period.');
    function valid(row){return row&&Array.isArray(row.values)&&row.values.length===5&&row.values.every(function(v){
      return Array.isArray(v)&&v.length===2&&Number.isInteger(v[0])&&v[0]>=0&&Number.isFinite(v[1])&&v[1]>=0;
    });}
    if(d&&m&&!valid(d))errors.push('The Daily report has a missing or incorrect value for this outlet.');
    if(d&&m&&!valid(m))errors.push('The MTD report has a missing or incorrect value for this outlet.');
    if(valid(d)&&valid(m)){
      [{name:'Daily',row:d},{name:'MTD',row:m}].forEach(function(item){
        var v=item.row.values,qty=v.slice(0,4).reduce(function(sum,p){return sum+p[0];},0);
        if(qty!==v[4][0])errors.push(item.name+' document counts do not match the Total.');
        var diff=v.slice(0,4).reduce(function(sum,p){return sum+cents(p[1]);},0)-cents(v[4][1]);
        if(Math.abs(diff)>TOLERANCE_CENTS)errors.push(item.name+' sales do not match the Total (Rs. '+formatMoney(Math.abs(diff)/100)+' difference).');
        else if(diff!==0)warnings.push(item.name+' sales have a Rs. '+formatMoney(Math.abs(diff)/100)+' difference, accepted within the Rs. 5.00 limit.');
      });
      for(var i=0;i<5;i++){
        if(m.values[i][0]<d.values[i][0])errors.push(CHANNELS[i].label+' MTD documents are lower than Daily documents.');
        if(cents(m.values[i][1])<cents(d.values[i][1]))errors.push(CHANNELS[i].label+' MTD sales are lower than Daily sales.');
      }
    }
    return {ok:errors.length===0,errors:Array.from(new Set(errors)),warnings:Array.from(new Set(warnings)),daily:d,mtd:m,days:days};
  }
  function metricValue(key,index,daily,mtd,days) {
    var d=daily.values[index],m=mtd.values[index];
    switch(key){
      case 'noDoc':return d[0];case 'netSales':return d[1];
      case 'cumulativeSales':return m[1];case 'avgChannel':return m[1]/days;
      case 'cumDoc':return m[0];case 'avgDoc':return m[0]/days;
      case 'docAvg':return m[0]===0?null:m[1]/m[0];
      default:return null;
    }
  }
  return {VERSION:VERSION,CHANNELS:CHANNELS,METRICS:METRICS,TOLERANCE_CENTS:TOLERANCE_CENTS,
    clean:clean,outletKey:outletKey,iso:iso,parseDateToken:parseDateToken,parseDateRange:parseDateRange,dayCount:dayCount,
    cents:cents,formatNumber:formatNumber,formatMoney:formatMoney,toNumber:toNumber,
    findTable:findTable,parseSheetRows:parseSheetRows,readWorkbook:readWorkbook,lookup:lookup,validate:validate,metricValue:metricValue};
});
