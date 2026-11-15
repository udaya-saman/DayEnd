'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const root=join(__dirname,'..');
const html=readFileSync(join(root,'index.html'),'utf8');
const app=readFileSync(join(root,'dayend-app.js'),'utf8');
const sw=readFileSync(join(root,'sw.js'),'utf8');
function inSection(id) {
 const start=html.indexOf('<section id="'+id+'"');
 if(start<0)return '';
 return html.slice(start,html.indexOf('</section>',start));
}
test('upload page starts with the requested upload panel and no intro or duplicate outlet controls',()=>{
 const screen=inSection('uploadScreen');
 assert.match(screen,/<h1 id="uploadTitle">[\s\S]*?Upload Excel Reports<\/h1>/);
 assert.doesNotMatch(screen,/class="intro"|class="steps"|id="outletSelect"|id="saveOutlet"/);
 assert.ok(screen.indexOf('Upload Excel Reports')<screen.indexOf('dailyCard'));
 assert.match(html,/<button class="outlet-button"[^>]*id="openSettings"/);
});
test('results contain no summary banner or redundant cumulative value',()=>{
 const screen=inSection('resultScreen');
 assert.match(screen,/for="metric">Report Category/);
 assert.doesNotMatch(screen,/class="summary"|id="totalValue"|id="metricUnit"|id="resultPeriod"|id="resultDate"|id="sourceFiles"/);
 assert.match(screen,/id="previousMetric"/);
 assert.match(screen,/id="nextMetric"/);
 assert.match(screen,/id="newReports"/);
 assert.match(screen,/id="backToUpload"/);
 assert.match(screen,/id="resultRows"/);
 assert.match(screen,/Designed and developed by Udaya Saman \| 071 969 8799/);
 assert.doesNotMatch(screen,/Calculated from the original report figures/);
});
test('every DOM element accessed through the app selector exists in HTML',()=>{
 const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]));
 const accessed=[...app.matchAll(/\$\('([^']+)'\)/g)].map(match=>match[1]);
 const missing=accessed.filter(id=>!ids.has(id));
 assert.deepEqual([...new Set(missing)],[]);
});
test('all element IDs are unique',()=>{
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
 assert.equal(ids.length,new Set(ids).size);
});
test('cached release uses exact versioned source URLs from HTML',()=>{
 const resources=[...html.matchAll(/<(?:script|link)[^>]+(?:src|href)="(\.\/(?:dayend-|manifest)[^"]+)"/g)].map(m=>m[1]);
 assert.ok(resources.length>=3);
 for(const resource of resources)assert.ok(sw.includes("'"+resource+"'"),resource+' is missing from the offline cache');
 assert.match(sw,/const CACHE='day-end-4\.3\.0'/);
 assert.doesNotMatch(sw,/cache\.put\('\.\/index\.html'/);
});
test('dialog provides keyboard focus management and a top-right outlet settings button',()=>{
 assert.match(html,/aria-modal="true"/);
 assert.match(html,/id="settingsOutlet"/);
 assert.match(app,/event\.key!=='Tab'/);
 assert.match(app,/event\.key==='Escape'/);
 assert.match(app,/sharedOutlets\(\)/);
});
test('new report sets reset the metric and navigation remains available',()=>{
 assert.match(app,/function firstMetric\(\)/);
 assert.match(app,/function resetReports\(\)[\s\S]*?firstMetric\(\)/);
 assert.match(app,/\$\('previousMetric'\)\.addEventListener/);
 assert.match(app,/\$\('nextMetric'\)\.addEventListener/);
});

test('hero wordmark is a PNG and PWA installation links stay intact',()=>{
 assert.match(html,/<img class="hero-wordmark" src="\.\/icons\/hero-dayend-logo\.png\?v=4\.3\.0"/);
 assert.match(html,/<link rel="icon" type="image\/png" sizes="192x192"/);
 assert.match(html,/<link rel="apple-touch-icon" sizes="180x180"/);
 assert.ok(!html.includes('<svg class="brand-mark"'));
 assert.match(html,/id="openGear"/);
});

test('reference styling and the faster Excel reader are included in the release',()=>{
 assert.match(html,/main::after/);
 assert.match(html,/main::before/);
 assert.match(html,/\.top\{[^}]*background:linear-gradient/);
 assert.match(html,/<th scope="col">Value \(Rs\.\)<\/th>/);
 assert.match(sw,/excel-unpack-worker\.js\?v=4\.3\.0/);
 assert.match(readFileSync(join(root,'dayend-core.js'),'utf8'),/new Worker\('\.\/excel-unpack-worker\.js\?v=4\.3\.0'\)/);
});

test('full-height screens, smooth scalable footer curves, and accessible brand icon',()=>{
 assert.match(html,/height:100dvh/);
 assert.match(html,/overflow:hidden/);
 assert.match(html,/<svg class="footer-waves" viewBox="0 0 600 112"/);
 assert.match(html,/<path fill="url\(#waveBack\)" d="M0 31 C120/);
 assert.match(html,/<path fill="url\(#waveFront\)" d="M0 54 C135/);
 assert.doesNotMatch(html,/clip-path:polygon/);
 assert.match(html,/<img class="hero-wordmark"[^>]*alt="DAY END"/);
 assert.match(app,/\$\('openGear'\)\.addEventListener\('click',openOutletDialog\)/);
});
test('previous and next navigation have matching grid columns and decorative arrows',()=>{
 assert.match(html,/grid-template-columns:minmax\(0,1fr\) auto minmax\(0,1fr\)/);
 assert.match(html,/id="previousMetric" type="button"><span class="nav-arrow"/);
 assert.match(html,/id="nextMetric" type="button"><span>Next<\/span><span class="nav-arrow"/);
 assert.match(html,/font-size:clamp\(14px,2vw,16px\)/);
});

test('hero PNG and version-matched Excel worker are cached for offline use',()=>{
 assert.match(html,/src="\.\/icons\/hero-dayend-logo\.png\?v=4\.3\.0"/);
 assert.match(sw,/'\.\/icons\/hero-dayend-logo\.png\?v=4\.3\.0'/);
 assert.match(sw,/'\.\/excel-unpack-worker\.js\?v=4\.3\.0'/);
 assert.match(readFileSync(join(root,'dayend-core.js'),'utf8'),/new Worker\('\.\/excel-unpack-worker\.js\?v=4\.3\.0'\)/);
});
