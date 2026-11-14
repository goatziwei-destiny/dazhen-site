// 網站 /reply/：把預約系統的閱讀頁包進來（大正 11/15，客人不會看到 Apps Script 提示列）。要先 hugo -d 並在 8768 開靜態伺服器
const { chromium, devices } = require('/opt/npm-tools/node_modules/playwright');
let fails = 0; const ok = (c, m) => { console.log(c ? '✓' : '✗', m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext(devices['iPhone 13'])).newPage(); const asked = [];
  await p.route('**/*', r => { const u = r.request().url(); if (u.startsWith('http://localhost:8768')) return r.continue();
    if (/script\.google\.com/.test(u)) { asked.push(u); return r.fulfill({ contentType: 'text/html', body: '<meta charset="utf-8"><h1>閱讀頁</h1>' }); } return r.abort(); });
  const T = 'a'.repeat(32), go = async q => { asked.length = 0; await p.goto('http://localhost:8768/reply/' + q); await p.waitForTimeout(800); };
  await go('?b=GRW26110401-00&t=' + T);
  ok(asked.length === 1 && /\?page=reply&b=GRW26110401-00&t=a{32}$/.test(asked[0]) && await p.frameLocator('#f').locator('h1').innerText() === '閱讀頁', 'Email／LINE 的連結：帶簽章包進閱讀頁');
  await go('?b=GRW26110401-00&k=' + T);
  ok(asked.length === 1 && /&k=a{32}$/.test(asked[0]) && !/&t=/.test(asked[0]), '會員中心的通行證：帶 k');
  await go('?b=GRW26110401-00&t=zz');
  ok(asked.length === 0 && /這個連結打不開/.test(await p.textContent('body')), '簽章格式不對：不去問預約系統，顯示打不開');
  await go('?b=../x&t=' + T);
  ok(asked.length === 0 && /這個連結打不開/.test(await p.textContent('body')), '訂單編號格式不對：同上');
  await b.close(); console.log(fails ? '有 ' + fails + ' 項沒過' : '全部通過'); if (fails) process.exitCode = 1;
})();
