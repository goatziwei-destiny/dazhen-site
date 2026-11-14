// 會員中心「查看文字回覆」（2026-11-15）：假 LIFF、假 Apps Script
// 要先 hugo -d 並在 8768 開靜態伺服器。用法：node tools/member-text-reply-test.js [截圖檔名]
const { chromium, devices } = require('/opt/npm-tools/node_modules/playwright');
const FAKE_LIFF = 'window.liff={init:()=>Promise.resolve(),isLoggedIn:()=>true,getIDToken:()=>"tok",login(){},logout(){},getFriendship:()=>Promise.resolve({friendFlag:true}),isInClient:()=>true,closeWindow(){}};';
let fails = 0; const ok = (c, m) => { console.log(c ? '✓' : '✗', m); if (!c) fails++; };
const member = { ok: true, member: { name: '王小明', joined: false, kind: 'line' }, upcoming: null, rb: '', rules: { payHours: 24, reschedHours: 24 }, orders: [
  { id: 'GRW29010101-00', title: '文字版諮詢', when: '2029/1/1 送出', amount: 990, status: '已收款', reply: 'ready', replyKeep: '2032/1/10' },
  { id: 'GRW29010202-00', title: '文字版諮詢', when: '2029/1/2 送出', amount: 990, status: '已收款', reply: 'writing', replyDue: '1/15' },
  { id: 'GRW26010303-00', title: '文字版諮詢', when: '2026/1/3 送出', amount: 990, status: '已收款', reply: 'gone' },
  { id: 'GR29010404-00', title: '一對一論命（LINE 語音）', when: '2029/1/4（四）14:00', amount: 3600, status: '已完成', reply: '' }] };
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext(devices['iPhone 13']); const p = await ctx.newPage(); const opens = []; let openReply = { ok: true, url: 'https://script.google.com/macros/s/X/exec?page=reply&b=GRW29010101-00&k=' + 'a'.repeat(32) };
  await p.route('**/*', async r => {
    const u = r.request().url();
    if (u.startsWith('http://localhost:8768')) return r.continue();
    if (/liff\/edge\/2\/sdk\.js/.test(u)) return r.fulfill({ contentType: 'application/javascript', body: FAKE_LIFF });
    if (/[?&]page=reply/.test(u)) return r.fulfill({ contentType: 'text/html', body: '<title>reply</title><h1>閱讀頁</h1>' });
    if (/script\.google\.com/.test(u)) {
      const q = new URL(u).searchParams; if (q.get('open')) opens.push(q.get('open') + '|' + q.get('lt'));
      return r.fulfill({ contentType: 'application/javascript', body: q.get('callback') + '(' + JSON.stringify(q.get('open') ? openReply : member) + ')' });
    }
    return r.abort();
  });
  await p.goto('http://localhost:8768/member/'); await p.waitForTimeout(2000);
  const txt = await p.evaluate(() => document.getElementById('appBottom').innerText);
  ok(/查看文字回覆/.test(txt) && /保存到 2032\/1\/10/.test(txt), '已寄出：有「查看文字回覆」和保存期限');
  ok(/大正撰寫中，預計 1\/15 前回覆/.test(txt), '還沒寄出：撰寫中＋預計日期');
  ok(/已過保存期限/.test(txt), '過期：顯示已刪除');
  ok(await p.locator('[data-reply]').count() === 1, '只有已寄出那一筆有按鈕（一對一、撰寫中、過期都沒有）');
  ok(!/page=reply/.test(await p.content()), '清單裡沒有任何回覆連結');
  if (process.argv[2]) await p.screenshot({ path: process.argv[2], fullPage: true });
  openReply = { ok: false, reason: 'notfound' };
  await p.click('[data-reply]'); await p.waitForTimeout(800);
  ok(opens[0] === 'GRW29010101-00|tok' && /暫時打不開/.test(await p.evaluate(() => (document.querySelector('.toast') || {}).textContent || '')) && /查看文字回覆/.test(await p.locator('[data-reply]').innerText()), '後台不給：提示、按鈕恢復，頁面不跳走');
  openReply = { ok: true, url: 'https://script.google.com/macros/s/X/exec?page=reply&b=GRW29010101-00&k=' + 'a'.repeat(32) };
  await p.click('[data-reply]'); await p.waitForTimeout(1200);
  ok(/page=reply&b=GRW29010101-00&k=a{32}/.test(p.url()), '按下去：帶著登入身分問後台，拿到通行證網址就打開閱讀頁');
  await b.close();
  console.log(fails ? '有 ' + fails + ' 項沒過' : '全部通過'); if (fails) process.exitCode = 1;
})();
