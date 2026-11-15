'use strict';
const CACHE='day-end-4.0.1';
const CORE=[
  './','./index.html','./dayend-core.js','./dayend-app.js','./manifest.json',
  './vendor/jszip.min.js','./icons/icon-192.png','./icons/icon-512.png',
  './icons/apple-touch-icon.png','./icons/maskable-512.png'
];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(
  keys.filter(key=>key.startsWith('day-end-')&&key!==CACHE).map(key=>caches.delete(key))
 )).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
 if(req.mode==='navigate'){
  event.respondWith(fetch(req).then(response=>{
   if(response.ok){
    const copy=response.clone();
    event.waitUntil(caches.open(CACHE).then(cache=>cache.put('./index.html',copy)));
   }
   return response;
  }).catch(()=>caches.match('./index.html').then(hit=>hit||caches.match('./'))));
  return;
 }
 event.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(response=>{
  if(response.ok&&response.type==='basic'){
   const copy=response.clone();
   event.waitUntil(caches.open(CACHE).then(cache=>cache.put(req,copy)));
  }
  return response;
 })));
});
