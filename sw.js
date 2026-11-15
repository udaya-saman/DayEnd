'use strict';
/* DAY END v4.4.2: fetch the latest page when online; preserve an atomic offline release. */
const CACHE='day-end-4.4.2';
const CORE=[
  './','./index.html','./dayend-core.js?v=4.4.2','./dayend-app.js?v=4.4.2',
  './manifest.json?v=4.4.0','./vendor/jszip.min.js','./excel-unpack-worker.js?v=4.4.2',
  './icons/hero-dayend-logo.png?v=4.4.0','./icons/icon-192.png',
  './icons/icon-192.png?v=4.4.0','./icons/icon-512.png',
  './icons/apple-touch-icon.png','./icons/apple-touch-icon.png?v=4.4.0',
  './icons/maskable-512.png'
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
  const request=event.request;
  if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
  if(request.mode==='navigate'){
    event.respondWith((async()=>{
      // Cache-first navigation previously pinned older UI and its acceptance banner.
      // Online pages always load current HTML. The versioned static files from that
      // HTML are fetched from network when absent in the active offline cache.
      try {
        const response=await fetch(request,{cache:'no-store'});
        if(response.ok)return response;
        throw Error('Navigation unavailable');
      } catch (_) {
        return await caches.match('./index.html')||await caches.match('./')||Response.error();
      }
    })());
    return;
  }
  event.respondWith(caches.match(request).then(hit=>hit||fetch(request)));
});
