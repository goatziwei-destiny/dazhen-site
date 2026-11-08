// 預約頁三種情況（要先 hugo -d <dir> 並在 8768 開靜態伺服器）：表單載不到／框載完但只是錯誤頁／表單正常回報
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
async function run(mode) {
  const b = await chromium.launch(); const p = await b.newPage(); await p.clock.install();
  await p.route('**/*', async r => {
    const u = r.request().url(), t = r.request().resourceType();
    if (u.startsWith('http://localhost:8768')) return r.continue();
    if (t !== 'document') return r.abort();
    if (mode === 'hang') return;   // 表單一直載不到
    if (/script\.google\.com/.test(u)) { const n = new URL(u).searchParams.get('bridge'); return r.fulfill({ contentType: 'text/html', body: '<script>location.replace("https://n-test.script.googleusercontent.com/x?bridge=' + n + '")</script>' }); }
    if (mode === 'error') return r.fulfill({ contentType: 'text/html', body: '<p>抱歉，目前無法開啟這個檔案。</p>' });
    const n = new URL(u).searchParams.get('bridge');
    return r.fulfill({ contentType: 'text/html', body: '<p>表單</p><script>top.postMessage({type:"dazhen-booking-height",nonce:"' + n + '",height:900},"*")</script>' });
  });
  await p.goto('http://localhost:8768/booking/', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500); const pre = await p.evaluate(() => bkLoaded); await p.clock.runFor(41000); await p.waitForTimeout(300); console.log('preLoaded', pre);
  const r = await p.evaluate(() => ({ load: (document.getElementById('bkLoading') || {}).innerText, help: (document.getElementById('bkHelp') || {}).innerText, ready: !!window.dazhenBookingReady }));
  await b.close(); return r;
}
(async () => { for (const m of ['hang', 'error', 'ok']) console.log(m, JSON.stringify(await run(m))); })();
