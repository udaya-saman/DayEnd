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
 assert.match(html,/<div class="outlet-display" aria-live="polite"/);
 assert.doesNotMatch(html,/id="openSettings"|id="openGear"|id="settingsOverlay"/);
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
 assert.match(sw,/const CACHE='day-end-4\.4\.1'/);
 assert.doesNotMatch(sw,/cache\.put\('\.\/index\.html'/);
});
test('outlet display uses sheet-derived data without manual settings',()=>{
 assert.match(html,/class="outlet-display"[^>]*hidden><span id="outletName"><\/span>/);
 assert.match(app,/\$\(\x27outletName\x27\)\.textContent=found\.name\|\|\x27\x27/);
 assert.match(app,/\$\(\x27outletName\x27\)\.parentElement\.hidden=!found\.name/);
 assert.doesNotMatch(html,/Awaiting outlet/);
 assert.match(html,/\.outlet-display span\{[^}]*font-size:19\.5px/);
 assert.match(html,/\.outlet-display span\{font-size:16\.5px/);
 assert.match(app,/core\.detectOutlet\(state\.daily,state\.mtd,state\.preferredOutlet\)/);
 assert.doesNotMatch(app,/openOutletDialog|openSettings|openGear|settingsOverlay/);
 assert.match(app,/localStorage.getItem\('dayend.outlet.v4'\)/);
});
test('new report sets reset the metric and navigation remains available',()=>{
 assert.match(app,/function firstMetric\(\)/);
 assert.match(app,/function resetReports\(\)[\s\S]*?firstMetric\(\)/);
 assert.match(app,/\$\('previousMetric'\)\.addEventListener/);
 assert.match(app,/\$\('nextMetric'\)\.addEventListener/);
});

test('hero wordmark is a PNG and PWA installation links stay intact',()=>{
 assert.match(html,/<img class="hero-wordmark" src="\.\/icons\/hero-dayend-logo\.png\?v=4\.4\.0"/);
 assert.match(html,/<link rel="icon" type="image\/png" sizes="192x192"/);
 assert.match(html,/<link rel="apple-touch-icon" sizes="180x180"/);
 assert.ok(!html.includes('<svg class="brand-mark"'));
 assert.doesNotMatch(html,/id="openGear"/);
});

test('reference styling and the faster Excel reader are included in the release',()=>{
 assert.match(html,/main::after/);
 assert.match(html,/main::before/);
 assert.match(html,/\.top\{[^}]*background:linear-gradient/);
 assert.match(html,/<th scope="col">Value \(Rs\.\)<\/th>/);
 assert.match(sw,/excel-unpack-worker\.js\?v=4\.4\.0/);
 assert.match(readFileSync(join(root,'dayend-core.js'),'utf8'),/new Worker\('\.\/excel-unpack-worker\.js\?v=4\.4\.0'\)/);
});

test('full-height screens, smooth scalable footer curves, and accessible brand icon',()=>{
 assert.match(html,/height:100dvh/);
 assert.match(html,/overflow:hidden/);
 assert.match(html,/<svg class="footer-waves" viewBox="0 0 600 112"/);
 assert.match(html,/<path fill="url\(#waveBack\)" d="M0 31 C120/);
 assert.match(html,/<path fill="url\(#waveFront\)" d="M0 54 C135/);
 assert.doesNotMatch(html,/clip-path:polygon/);
 assert.match(html,/<img class="hero-wordmark"[^>]*alt="DAY END"/);
 assert.doesNotMatch(app,/openOutletDialog/);
});
test('previous and next navigation have matching grid columns and decorative arrows',()=>{
 assert.match(html,/grid-template-columns:minmax\(0,1fr\) auto minmax\(0,1fr\)/);
 assert.match(html,/id="previousMetric" type="button"><span class="nav-arrow"/);
 assert.match(html,/id="nextMetric" type="button"><span>Next<\/span><span class="nav-arrow"/);
 assert.match(html,/font-size:clamp\(14px,2vw,16px\)/);
});

test('hero PNG and version-matched Excel worker are cached for offline use',()=>{
 assert.match(html,/src="\.\/icons\/hero-dayend-logo\.png\?v=4\.4\.0"/);
 assert.match(sw,/'\.\/icons\/hero-dayend-logo\.png\?v=4\.4\.0'/);
 assert.match(sw,/'\.\/excel-unpack-worker\.js\?v=4\.4\.0'/);
 assert.match(readFileSync(join(root,'dayend-core.js'),'utf8'),/new Worker\('\.\/excel-unpack-worker\.js\?v=4\.4\.0'\)/);
});

test('balanced upload and result panels retain safe internal scrolling',()=>{
 assert.match(html,/#uploadScreen\{justify-content:center;padding-bottom:clamp/);
 assert.match(html,/#uploadScreen \.panel\{margin-top:0;padding:clamp/);
 assert.match(html,/#resultScreen\{justify-content:center;padding-bottom:clamp/);
 assert.match(html,/#resultScreen \.panel\{padding:clamp/);
 assert.match(html,/max-height:100%;overflow-y:auto/);
});

test('accepted sales differences are silent on both screens, without changing validation',()=>{
 assert.doesNotMatch(app,/Sales difference accepted|Accepted with a small difference/);
 assert.doesNotMatch(app,/result\.warnings\.length/);
 assert.doesNotMatch(html,/id="resultWarnings"/);
 const core=readFileSync(join(root,'dayend-core.js'),'utf8');
 assert.match(core,/TOLERANCE_CENTS = 500/);
 assert.match(core,/Math\.abs\(diff\)>TOLERANCE_CENTS/);
 assert.match(core,/warnings\.push\(item\.name\+' sales have a Rs\./);
});
