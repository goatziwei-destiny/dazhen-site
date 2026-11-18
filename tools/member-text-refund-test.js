// 會員中心「申請退款」（2026-11-18）：假 LIFF、假 Apps Script；不需要 hugo（自己把樣板的變數換掉再開）
// 用法：node tools/member-text-refund-test.js [截圖檔名]
const { chromium, devices } = require('/opt/npm-tools/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
let fails = 0; const ok = (c, m) => { console.log(c ? '✓' : '✗', m); if (!c) fails++; };

const tpl = fs.readFileSync(path.join(root, 'layouts/member/single.html'), 'utf8');
const head = tpl.split('{{ define "head" }}')[1].split('{{ end }}')[0];
const main = tpl.split('{{ define "main" }}')[1].replace(/\{\{ end \}\}\s*$/, '');
const fill = s => s.replace(/\{\{ \.Site\.Params\.bookingFormUrl \}\}/g, '"https://script.google.com/macros/s/X/exec"')
  .replace(/\{\{ \.Site\.Params\.liffMemberId \| default "" \}\}/g, '"L1"').replace(/\{\{ \.Site\.Params\.googleLoginClientId \| default "" \}\}/g, '""')
  .replace(/\{\{ \.Site\.Params\.lineUrl \| default "[^"]*" \}\}/g, '"https://lin.ee/x"');
const page = '<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' + fill(head) + '</head><body>' + fill(main) + '</body></html>';
if (/\{\{/.test(page)) { console.log('✗ 樣板還有沒換掉的變數'); process.exit(1); }
const server = http.createServer((q, r) => {
  if (q.url.startsWith('/js/dz-api.js')) { r.setHeader('content-type', 'application/javascript'); return r.end(fs.readFileSync(path.join(root, 'static/js/dz-api.js'))); }
  r.setHeader('content-type', 'text/html; charset=utf-8'); r.end(page);
});

const FAKE_LIFF = 'window.liff={init:()=>Promise.resolve(),isLoggedIn:()=>true,getIDToken:()=>"tok",login(){},logout(){},getFriendship:()=>Promise.resolve({friendFlag:true}),isInClient:()=>true,closeWindow(){},openWindow(){},getProfile:()=>Promise.resolve({displayName:"王小明"})};';
const O = (id, refund, extra) => Object.assign({ id, title: '文字版諮詢', when: '2029/1/1 送出', amount: 990, status: '已收款', reply: 'writing', replyDue: '1/15', refund }, extra || {});
let orders = [
  O('GRW29010101-00', { can: true, state: 'open', text: '可申請退款，期限到 1/8', until: '1/8' }),
  O('GRW29010202-00', { can: false, state: 'started', text: '大正已開始撰寫，無法退款' }),
  O('GRW29010303-00', { can: true, state: 'late', text: '已超過預計時間，可申請退款' }),
  O('GRW29010404-00', { can: false, state: 'requested', text: '已送出申請，等待大正確認' }),
  O('GRW29010505-00', { can: false, state: 'sent', text: '已完成' }, { reply: 'ready', replyKeep: '2032/1/10' }),
  O('GRW29010606-00', { can: false, state: 'expired', text: '已超過退款期限（付款後 7 天內、而且大正還沒開始撰寫）' }),
  { id: 'GR29010707-00', title: '一對一論命（LINE 語音）', when: '2029/1/4（四）14:00', amount: 3600, status: '已完成', reply: '', refund: null }];
const member = () => ({ ok: true, member: { name: '王小明', joined: false, kind: 'line' }, upcoming: null, rb: '', rules: { payHours: 24, reschedHours: 24 }, orders });

(async () => {
  await new Promise(r => server.listen(8769, r));
  const b = await chromium.launch(); const ctx = await b.newContext(devices['iPhone 13']); const p = await ctx.newPage();
  const reqs = []; let refundReply = { ok: true, message: '已送出申請，大正確認後會通知你' }, confirms = [], accept = true;
  p.on('dialog', d => { confirms.push(d.message()); accept ? d.accept() : d.dismiss(); });
  await p.route('**/*', async r => {
    const u = r.request().url();
    if (u.startsWith('http://localhost:8769')) return r.continue();
    if (/liff\/edge\/2\/sdk\.js/.test(u)) return r.fulfill({ contentType: 'application/javascript', body: FAKE_LIFF });
    if (/script\.google\.com/.test(u)) {
      const q = new URL(u).searchParams; const cb = q.get('callback');
      if (q.get('refund')) {
        reqs.push(q.get('refund') + '|' + q.get('lt'));
        if (refundReply.ok) orders = orders.map(o => o.id === q.get('refund') ? Object.assign({}, o, { refund: { can: false, state: 'requested', text: '已送出申請，等待大正確認' } }) : o);
        return r.fulfill({ contentType: 'application/javascript', body: cb + '(' + JSON.stringify(refundReply) + ')' });
      }
      return r.fulfill({ contentType: 'application/javascript', body: cb + '(' + JSON.stringify(member()) + ')' });
    }
    return r.abort();
  });
  await p.goto('http://localhost:8769/member/'); await p.waitForTimeout(2000);
  const txt = () => p.evaluate(() => document.getElementById('appBottom').innerText);
  let t = await txt();
  ok(/可申請退款，期限到 1\/8/.test(t), '7 天內還沒開始：顯示期限');
  ok(/大正已開始撰寫，無法退款/.test(t), '已開始撰寫：寫明不能退款的原因');
  ok(/已超過預計時間，可申請退款/.test(t), '逾期未寄出：可申請');
  ok(/已送出申請，等待大正確認/.test(t), '已申請：顯示等待確認');
  ok(/已超過退款期限/.test(t), '超過 7 天：寫明已超過期限');
  ok(await p.locator('[data-refund]').count() === 2, '只有可申請的兩筆有按鈕（已開始、已申請、已超過、已寄出、一對一都沒有）');
  ok(!/申請退款/.test(await p.locator('.order').nth(4).innerText()) && !/申請退款/.test(await p.locator('.order').nth(6).innerText()), '已寄出的與一對一訂單：沒有退款字樣');
  if (process.argv[2]) await p.screenshot({ path: process.argv[2], fullPage: true });
  accept = false; await p.locator('[data-refund]').first().click(); await p.waitForTimeout(500);
  ok(confirms.length === 1 && /確定要申請退款/.test(confirms[0]) && reqs.length === 0, '按了先問一次；按取消：不送出');
  accept = true; await p.locator('[data-refund]').first().click(); await p.waitForTimeout(1800);
  ok(reqs.length === 1 && reqs[0] === 'GRW29010101-00|tok', '按確定：帶著登入身分送出申請');
  t = await txt();
  ok(await p.locator('[data-refund]').count() === 1, '申請成功後重新讀資料：那筆按鈕消失');
  ok((t.match(/已送出申請，等待大正確認/g) || []).length === 2, '那筆改顯示等待確認');
  refundReply = { ok: false, message: '大正已開始撰寫，無法退款' };
  await p.locator('[data-refund]').first().click(); await p.waitForTimeout(800);
  ok(/大正已開始撰寫，無法退款/.test(await p.evaluate(() => { const t = document.querySelectorAll('.toast'); return t.length ? t[t.length - 1].textContent : ''; })) && await p.locator('[data-refund]').count() === 1, '後台說不行：顯示原因，按鈕還在可以再看');
  await b.close(); server.close();
  console.log(fails ? '有 ' + fails + ' 項沒過' : '全部通過'); if (fails) process.exitCode = 1;
})();
