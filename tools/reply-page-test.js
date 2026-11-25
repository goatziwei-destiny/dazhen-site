// 網站 /reply/（11/18 改版）：書和開場網站自己畫，內容用 JSONP 向預約系統 page=replyData 拿。要先 hugo -d 並在 8768 開靜態伺服器
const { chromium, devices } = require('/opt/npm-tools/node_modules/playwright');
let fails = 0; const ok = (c, m) => { console.log(c ? '✓' : '✗', m); if (!c) fails++; };
const BODY = '<div class="ch"><div class="q"><span class="qt">【測試】問題一</span></div><p>回覆內容測試</p></div><div class="acts"><a class="s" href="#">LINE</a></div>';
(async () => {
  const b = await chromium.launch(); const T = 'a'.repeat(32);
  const run = async (q, reply, opts = {}) => {
    const ctx = await b.newContext(devices['iPhone 13']); const p = await ctx.newPage(); const asked = []; const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    if (opts.seen) await ctx.addInitScript(id => localStorage.setItem('ms-seen-' + id, '1'), opts.seen);
    await p.route('**/*', async r => { const u = r.request().url();
      if (u.startsWith('http://localhost:8768')) return r.continue();
      if (/script\.google\.com/.test(u)) { asked.push(u); if (reply === 'fail') return r.abort(); const cb = new URL(u).searchParams.get('callback');
        if (opts.delay) await new Promise(res => setTimeout(res, opts.delay));
        return r.fulfill({ contentType: 'application/javascript', body: cb + '(' + JSON.stringify(reply) + ')' }); }
      return r.abort(); });
    const t0 = Date.now(); await p.goto('http://localhost:8768/reply/' + q, { waitUntil: 'commit' }); return { p, ctx, asked, errs, t0 };
  };
  // 1. 正常：書立刻出現（不用等預約系統），點書翻開看到內容
  let r = await run('?b=GRW26111800-00&t=' + T, { ok: true, intro: true, seenKey: 'ms-seen-GRW26111800-00', name: '測試羊', pageTitle: '測試羊 的紫微斗數文字諮詢', body: BODY }, { delay: 3000 });
  await r.p.waitForSelector('#intro.go', { timeout: 1500 }); const fast = Date.now() - r.t0;
  ok(fast < 1500, '書在預約系統回來前就出現（' + fast + ' ms）');
  ok(/page=replyData&callback=\w+&b=GRW26111800-00&t=a{32}$/.test(r.asked[0]), '帶簽章向 page=replyData 拿內容');
  await r.p.waitForTimeout(900); await r.p.click('#bk'); ok(/內容準備中/.test(await r.p.textContent('#ttlHint')), '還沒拿到就點：提示「內容準備中」');
  await r.p.waitForTimeout(3000); await r.p.waitForSelector('.stage.done', { timeout: 6000 });
  ok(/回覆內容測試/.test(await r.p.textContent('#page')) && /測試羊/.test(await r.p.textContent('#ttlName')) && (await r.p.title()) === '測試羊 的紫微斗數文字諮詢', '拿到後自動翻開、顯示內容、姓名和分頁標題');
  ok(await r.p.evaluate(() => localStorage.getItem('ms-seen-GRW26111800-00')) === '1', '看完記住，下次不再播開場');
  ok(!r.errs.length, '沒有頁面錯誤 ' + r.errs.join(';')); await r.ctx.close();
  // 2. 看過的：不播開場，直接內容
  r = await run('?b=GRW26111800-00&t=' + T, { ok: true, intro: true, seenKey: 'ms-seen-GRW26111800-00', name: '測試羊', body: BODY }, { seen: 'GRW26111800-00' });
  await r.p.waitForTimeout(800); ok(await r.p.isVisible('.stage.done') && /回覆內容測試/.test(await r.p.textContent('#page')), '看過的：直接顯示內容'); await r.ctx.close();
  // 3. 會員中心通行證帶 k
  r = await run('?b=GRW26111800-00&k=' + T, { ok: true, intro: false, body: '<div class="msg"><h1>這份文字諮詢已經取消</h1></div>' });
  await r.p.waitForTimeout(800); ok(/&k=a{32}$/.test(r.asked[0]) && !/&t=/.test(r.asked[0]), '會員中心通行證：帶 k');
  ok(/已經取消/.test(await r.p.textContent('#page')) && !(await r.p.isVisible('#intro')), '預約系統說不能看：直接顯示說明，不播開場'); await r.ctx.close();
  // 4. 格式不對：不去問預約系統
  r = await run('?b=../x&t=' + T, {}); await r.p.waitForTimeout(500);
  ok(!r.asked.length && /這個連結打不開/.test(await r.p.textContent('#page')), '訂單編號格式不對：不問預約系統、顯示打不開'); await r.ctx.close();
  r = await run('?b=GRW26111800-00&t=zz', {}); await r.p.waitForTimeout(500);
  ok(!r.asked.length && /這個連結打不開/.test(await r.p.textContent('#page')), '簽章格式不對：同上'); await r.ctx.close();
  // 5. 連不上：顯示再試一次
  r = await run('?b=GRW26111800-00&t=' + T, 'fail'); await r.p.waitForTimeout(1000);
  ok(/再試一次/.test(await r.p.textContent('#page')), '連不上預約系統：顯示「再試一次」'); await r.ctx.close();
  // 6. 下載 PDF：內容有開才有按鈕；手機按一下做 PDF、做好再按一下存；LINE 裡改成「用瀏覽器打開」
  r = await run('?b=GR26112500-00&t=' + T, { ok: true, intro: true, name: '測試羊', book: '諮詢重點', body: BODY }, { seen: 'GR26112500-00' });
  await r.p.waitForSelector('.acts button', { timeout: 5000 }); ok(/下載 PDF/.test(await r.p.textContent('.acts button')), '有內容：出現「下載 PDF 備份」');
  await r.p.click('.acts button'); await r.p.waitForFunction(() => /做好了/.test(document.querySelector('.acts button').textContent), null, { timeout: 30000 });
  ok(!(await r.p.$('.dzpdf-host')), '手機：PDF 做好，提示再按一下儲存，暫存的排版已清掉'); ok(!r.errs.length, '沒有頁面錯誤 ' + r.errs.join(';')); await r.ctx.close();
  r = await run('?b=GR26112500-00&t=' + T, { ok: true, intro: false, body: '<div class="msg"><h1>內容已經刪除</h1></div><div class="acts"></div>' });
  await r.p.waitForTimeout(800); ok(!(await r.p.$('.acts button')), '已刪除／還在寫：沒有下載按鈕'); await r.ctx.close();
  { const ctx = await b.newContext({ ...devices['iPhone 13'], userAgent: devices['iPhone 13'].userAgent + ' Line/14.0.0' }); const p = await ctx.newPage();
    await p.route('**/*', async rr => { const u = rr.request().url(); if (u.startsWith('http://localhost:8768')) return rr.continue(); const cb = new URL(u).searchParams.get('callback'); return rr.fulfill({ contentType: 'application/javascript', body: cb + '(' + JSON.stringify({ ok: true, intro: true, name: '測試羊', body: BODY }) + ')' }); });
    await p.addInitScript(() => localStorage.setItem('ms-seen-GR26112500-00', '1'));
    await p.goto('http://localhost:8768/reply/?b=GR26112500-00&t=' + T); await p.waitForSelector('.acts a', { timeout: 5000 });
    ok(/openExternalBrowser=1/.test(await p.getAttribute('.acts a', 'href')), 'LINE 內建瀏覽器：按鈕改成用瀏覽器打開'); await ctx.close(); }
  await b.close(); console.log(fails ? '有 ' + fails + ' 項沒過' : '全部通過'); if (fails) process.exitCode = 1;
})();
