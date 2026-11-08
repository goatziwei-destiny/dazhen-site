// 預約送出後要跳去哪：手機 LINE 流程只跳綁定連結；沒有可用連結就留在成功頁；電腦、已綁、Google Meet 不跳（要先 hugo -d 並在 8768 開靜態伺服器）
const { chromium, devices } = require('/opt/npm-tools/node_modules/playwright');
async function run(label, extra, ua) {
  const b = await chromium.launch(); const ctx = await b.newContext(ua === 'mobile' ? devices['iPhone 13'] : {}); const p = await ctx.newPage(); let went = '';
  await p.route('**/*', async r => {
    const u = r.request().url(), t = r.request().resourceType();
    if (u.startsWith('http://localhost:8768')) return r.continue();
    if (t === 'document' && r.request().frame() === p.mainFrame()) { went = u; return r.fulfill({ contentType: 'text/html', body: 'x' }); }
    if (t !== 'document') return r.abort();
    if (/script\.google\.com/.test(u)) { const n = new URL(u).searchParams.get('bridge'); return r.fulfill({ contentType: 'text/html', body: '<script>location.replace("https://n-test.script.googleusercontent.com/x?bridge=' + n + '")</script>' }); }
    const n = new URL(u).searchParams.get('bridge');
    const msg = Object.assign({ type: 'dazhen-booking-success', nonce: n, batchId: 'GR26110801-00', basicId: '@abc', flow: 'line' }, extra);
    return r.fulfill({ contentType: 'text/html', body: '<script>setTimeout(function(){top.postMessage(' + JSON.stringify(msg) + ',"*")},300)</script>' });
  });
  await p.goto('http://localhost:8768/booking/'); await p.waitForTimeout(4000);
  console.log(label, '→', went || '(留在本頁)'); await b.close();
}
(async () => {
  const good = 'https://liff.line.me/2007939639-SJWD7dDI?bind=GR26110801-00&bt=0123456789abcdef01234567';
  await run('手機 LINE 流程、有綁定連結', { bindUrl: good }, 'mobile');
  await run('手機 LINE 流程、舊表單沒帶', {}, 'mobile');
  await run('手機、綁定連結是別筆訂單', { bindUrl: good.replace('GR26110801-00', 'GR26110899-00') }, 'mobile');
  await run('手機、網址不是 LINE', { bindUrl: 'https://evil.example/?bind=GR26110801-00&bt=0123456789abcdef01234567' }, 'mobile');
  await run('電腦 LINE 流程', { bindUrl: good }, 'desktop');
  await run('手機、已綁定（bound）', { bindUrl: good, flow: 'bound' }, 'mobile');
  await run('手機、Google Meet（email）', { bindUrl: good, flow: 'email' }, 'mobile');
})();
