'use strict';
/* Cache a complete release atomically. All app routes and scripts read from the same version. */
const CACHE='day-end-4.1.0';
const CORE=[
 './','./index.html','./dayend-core.js?v=4.1.0','./dayend-app.js?v=4.1.0',
 './manifest.json?v=4.1.0','./vendor/jszip.min.js',
 './icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png','./icons/maskable-512.png'
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
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  if(request.mode==='navigate'){
   const hit=await cache.match('./index.html');
   if(hit)return hit;
   try{return await fetch(request);}catch(_){return Response.error();}
  }
  const hit=await cache.match(request);
  if(hit)return hit;
  return fetch(request);
 })());
});
