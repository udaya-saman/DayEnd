/* DAY END v4.2.0 — background Excel ZIP extraction. Runs off the UI thread. */
'use strict';
importScripts('./vendor/jszip.min.js');
self.onmessage=async function(event) {
 try {
  const buffer=event.data&&event.data.buffer;
  if(!(buffer instanceof ArrayBuffer)||!buffer.byteLength||buffer.byteLength>25*1024*1024)
    throw Error('The report is empty or larger than 25 MB.');
  const zip=await JSZip.loadAsync(buffer);
  const entries=Object.values(zip.files).filter(x=>!x.dir);
  if(entries.length>4000)throw Error('This Excel file contains too many items.');
  let total=0;
  for(const entry of entries){
   const size=entry._data&&entry._data.uncompressedSize;
   if(Number.isFinite(size)){
    total+=size;
    if(size>25*1024*1024||total>60*1024*1024)throw Error('This Excel file is too large to process safely.');
   }
  }
  const sources={};
  for(const entry of entries){
   const path=entry.name.replace(/\\/g,'/');
   if(!/^xl\/(?:workbook\.xml|sharedStrings\.xml|_rels\/workbook\.xml\.rels|worksheets\/[^/]+\.xml)$/i.test(path))continue;
   const max=path.endsWith('sharedStrings.xml')?12*1024*1024:
    path.endsWith('workbook.xml')||path.endsWith('workbook.xml.rels')?1024*1024:25*1024*1024;
   const xml=await entry.async('string');
   if(xml.length>max)throw Error('The Excel report contains too much data.');
   sources[path]=xml;
  }
  self.postMessage({ok:true,sources:sources});
 } catch(error){
  self.postMessage({ok:false,error:error&&error.message||'The Excel report could not be opened.'});
 }
};
