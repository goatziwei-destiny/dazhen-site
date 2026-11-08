// 會員中心綁定：快速綁定失敗後的退路（假 LIFF、假 Apps Script）
// 要先 hugo -d 並在 8768 開靜態伺服器
const { chromium, devices } = require('/opt/npm-tools/node_modules/playwright');
const FAKE_LIFF = 'window.liff={init:()=>Promise.resolve(),isLoggedIn:()=>true,getIDToken:()=>"tok",login(){},logout(){},getFriendship:()=>Promise.resolve({friendFlag:true}),isInClient:()=>true,closeWindow(){}};';
async function run(label, fast, full) {
  const b = await chromium.launch(); const ctx = await b.newContext(devices['iPhone 13']); const p = await ctx.newPage(); const calls = [];
  await p.route('**/*', async r => {
    const u = r.request().url();
    if (u.startsWith('http://localhost:8768')) return r.continue();
    if (/liff\/edge\/2\/sdk\.js/.test(u)) return r.fulfill({ contentType: 'application/javascript', body: FAKE_LIFF });
    if (/script\.google\.com/.test(u)) {
      const q = new URL(u).searchParams, page = q.get('lineBind') ? 'x' : q.get('page'); const kind = q.get('page') === 'lineBind' ? 'fast' : 'full'; calls.push(kind + (q.get('bind') ? '+bind' : ''));
      const d = kind === 'fast' ? fast : full; if (d === 'abort') return r.abort();
      return r.fulfill({ contentType: 'application/javascript', body: q.get('callback') + '(' + JSON.stringify(d) + ')' });
    }
    return r.abort();
  });
  await p.goto('http://localhost:8768/member/?bind=GR26110801-00&bt=0123456789abcdef01234567'); await p.waitForTimeout(2500);
  const note = await p.evaluate(() => (document.getElementById('bindNote') || {}).textContent || '');
  const body = await p.evaluate(() => { const h = document.querySelector('#app h1'); return (h ? '標題「' + h.innerText.replace(/\s+/g, ' ') + '」 ' : '') + document.getElementById('app').innerText.replace(/\s+/g, ' ').slice(0, 120); });
  console.log(label, '| 呼叫:', calls.join(','), '| 提示:', note || '(無)', '| 畫面:', body); await b.close();
}
const member = { ok: true, member: { name: '測', joined: true }, orders: [] };
(async () => {
  await run('A 快速沒回應→完整那趟回 already', 'abort', Object.assign({}, member, { bound: { id: 'GR26110801-00', status: 'already' } }));
  await run('B 兩趟都沒回應', 'abort', 'abort');
  await run('C 快速沒回應→完整回 ok:false', 'abort', { ok: false });
  await run('E 快速回 retry（系統忙碌）', { ok: true, bound: { id: 'GR26110801-00', status: 'retry' } }, 'abort');
  await run('F 快速回 other（已綁別人）', { ok: true, bound: { id: 'GR26110801-00', status: 'other' } }, 'abort');
  await run('D 快速 ok:false→完整回 bound', { ok: false }, Object.assign({}, member, { bound: { id: 'GR26110801-00', status: 'bound' } }));
})();
