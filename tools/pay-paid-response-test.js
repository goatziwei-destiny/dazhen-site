// 網頁付款回報：送出時伺服器回 paid（大正剛好確認收款）→ 收起回報框、顯示「已確認收款」（要先 hugo -d 並在 8768 開靜態伺服器）
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage();
  await p.route('**/*', r => { const u = r.request().url(); if (u.startsWith('http://localhost:8768')) return r.continue();
    if (/script\.google\.com/.test(u)) { const q = new URL(u).searchParams; const d = q.get('action') === 'info' ? { ok: true, orderId: 'GR26110801-00', name: '王小明', amount: 3600, method: 'Google Meet', slot: '11/20 10:00', paid: false, cancelled: false } : { ok: false, paid: true, message: '這筆訂單已經確認收款了，不需要再回報末五碼。' };
      return r.fulfill({ contentType: 'application/javascript', body: q.get('callback') + '(' + JSON.stringify(d) + ')' }); }
    return r.abort(); });
  await p.goto('http://localhost:8768/pay/?o=GR26110801-00&t=abc'); await p.waitForTimeout(1500);
  const before = await p.evaluate(() => ({ form: document.getElementById('formBox').offsetParent !== null }));
  await p.fill('#last5', '12345'); await p.click('#btnGo'); await p.waitForTimeout(800);
  const after = await p.evaluate(() => ({ form: document.getElementById('formBox').offsetParent !== null, note: document.getElementById('stateNote').innerText, noteVis: document.getElementById('stateNote').offsetParent !== null, err: document.getElementById('err').innerText, done: document.getElementById('done').offsetParent !== null }));
  console.log(JSON.stringify({ before, after })); await b.close(); })();
