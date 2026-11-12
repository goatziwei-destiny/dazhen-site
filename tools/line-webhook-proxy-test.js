// LINE 轉送（先存、再回、後送）的單元測試：node tools/line-webhook-proxy-test.js
const crypto = require('crypto');
(async () => {
  const { makeHandler } = await import('../netlify/functions/line-webhook.mjs');
  const { runRetry } = await import('../netlify/functions/line-retry.mjs');
  const { MAX_TRIES } = await import('../netlify/lib/line-relay.mjs');
  delete process.env.LINE_CHANNEL_SECRET; delete process.env.LINE_GAS_URL;
  let f = 0; const t = (c, m) => { console.log(c ? '✓' : '✗', m); if (!c) f++; };
  const mkStore = () => { const m = new Map(); return { m, set: async (k, v) => { m.set(k, v); }, get: async (k) => m.has(k) ? JSON.parse(m.get(k)) : null, delete: async k => { m.delete(k); }, list: async () => ({ blobs: [...m.keys()].map(key => ({ key })) }) }; };
  let stores = { events: mkStore(), failed: mkStore() }, sent = [], alerts = [], reply = { status: 200, text: 'OK' }, alertReply = { status: 200, text: 'OK' };
  const fetchFn = async (u, o) => { if (/relay=gave-up/.test(u)) { alerts.push([u, Buffer.from(o.body).toString(), o.method]); return { ok: alertReply.status < 300, status: alertReply.status, text: async () => alertReply.text }; } sent.push([u, Buffer.from(o.body).toString()]); if (reply.throw) throw new Error('ECONNRESET'); return { status: reply.status, ok: reply.status < 300, text: async () => reply.text }; };
  const body = JSON.stringify({ events: [{ type: 'message', replyToken: 'r', webhookEventId: 'E1', source: { userId: 'U1' }, message: { type: 'text', text: '你好 😀' } }] });
  const good = crypto.createHmac('sha256', 's3cret').update(body).digest('base64');
  const mk = (sig, method) => new Request('https://x/.netlify/functions/line-webhook', { method: method || 'POST', headers: sig === null ? {} : { 'x-line-signature': sig === undefined ? good : sig }, body: method === 'GET' ? undefined : body });
  let waits = []; const ctx = { waitUntil: p => waits.push(p) };
  let h = makeHandler(async () => stores, fetchFn);

  let r = await h(mk(), ctx);
  t(r.status === 200 && stores.events.m.size === 1, '先存進暫存才回 200');
  await waits[0];
  t(sent.length === 1 && sent[0][0].endsWith('/exec?sig=' + encodeURIComponent(good)) && sent[0][1] === body && stores.events.m.size === 0, '背景送到 Apps Script（原文、簽章），成功後刪掉暫存');

  const h2 = makeHandler(async () => { throw new Error('blobs down'); }, fetchFn);
  r = await h2(mk(), ctx); t(r.status === 503, '暫存存不進去：回 503，不假裝成功');

  reply = { status: 503, text: 'x' }; waits = [];
  r = await h(mk(), ctx); await waits[0];
  const k = [...stores.events.m.keys()][0];
  t(r.status === 200 && stores.events.m.size === 1 && JSON.parse(stores.events.m.get(k)).n === 1, 'Apps Script 503：暫存留著（記第 1 次）');
  let o = await runRetry(stores, 'https://script.google.com/macros/s/X/exec', fetchFn, Date.now() + 120000);
  t(o.retry === 1 && JSON.parse(stores.events.m.get(k)).n === 2, '每 5 分鐘重送：還是失敗就再記一次');
  o = await runRetry(stores, 'https://script.google.com/macros/s/X/exec', fetchFn, Date.now());
  t(o.skipped === 1, '剛試過的（1 分鐘內）先跳過');
  reply = { status: 200, text: 'OK' };
  o = await runRetry(stores, 'https://script.google.com/macros/s/X/exec', fetchFn, Date.now() + 120000);
  t(o.done === 1 && stores.events.m.size === 0 && stores.failed.m.size === 0, 'Apps Script 恢復：重送成功、刪掉暫存');

  reply = { throw: true }; waits = []; await h(mk(), ctx); await waits[0];
  const k2 = [...stores.events.m.keys()][0]; const rec = JSON.parse(stores.events.m.get(k2)); rec.n = MAX_TRIES - 1; stores.events.m.set(k2, JSON.stringify(rec));
  o = await runRetry(stores, 'https://script.google.com/macros/s/X/exec', fetchFn, Date.now() + 120000);
  t(o.failed === 1 && stores.events.m.size === 0 && stores.failed.m.size === 1 && alerts.length === 1 && alerts[0][2] === 'POST' && alerts[0][1] === body && alerts[0][0].includes('sig=' + encodeURIComponent(good)) && JSON.parse(stores.failed.m.get(k2)).alerted === true, `重試 ${MAX_TRIES} 次還不行：移到 line-failed，帶原文＋簽章 POST 提醒，記下提醒成功`);

  // GPT 6787629598：提醒本身失敗要留著再試
  alertReply = { status: 503, text: 'x' }; waits = []; await h(mk(), ctx); await waits[0];
  const k3 = [...stores.events.m.keys()][0]; const r3 = JSON.parse(stores.events.m.get(k3)); r3.n = MAX_TRIES - 1; stores.events.m.set(k3, JSON.stringify(r3));
  await runRetry(stores, 'https://script.google.com/macros/s/X/exec', fetchFn, Date.now() + 120000);
  t(JSON.parse(stores.failed.m.get(k3)).alerted === false && JSON.parse(stores.failed.m.get(k3)).alertTries === 1, '放棄時提醒回 503：失敗區記「還沒提醒成功」');
  o = await runRetry(stores, 'https://script.google.com/macros/s/X/exec', fetchFn, Date.now() + 120000);
  t(o.alertPending === 1 && JSON.parse(stores.failed.m.get(k3)).alertTries === 2, '下一次排程：再提醒一次，還是失敗就繼續留著');
  alertReply = { status: 200, text: 'OK' }; const na = alerts.length;
  o = await runRetry(stores, 'https://script.google.com/macros/s/X/exec', fetchFn, Date.now() + 240000);
  t(o.alerted === 1 && JSON.parse(stores.failed.m.get(k3)).alerted === true && alerts.length === na + 1, 'Apps Script 恢復：提醒送成功，記下來');
  o = await runRetry(stores, 'https://script.google.com/macros/s/X/exec', fetchFn, Date.now() + 360000);
  t(o.alerted === 0 && alerts.length === na + 1, '提醒成功過的：不再提醒');

  reply = { status: 200, text: 'REJECTED' }; waits = []; const nb = alerts.length; await h(mk(), ctx); await waits[0];
  t(stores.events.m.size === 0 && stores.failed.m.size === 3 && alerts.length === nb, 'Apps Script 拒收簽章：不重送，移到 line-failed（提醒信 Apps Script 驗簽當下已寄）');

  reply = { status: 200, text: 'ERROR' }; waits = []; await h(mk(), ctx); await waits[0];
  t(stores.events.m.size === 1, 'Apps Script 回 ERROR（有一則暫時失敗）：暫存留著重送');
  stores.events.m.clear();

  reply = { status: 200, text: 'OK' }; const n0 = sent.length;
  r = await h(mk(null), ctx); t(r.status === 401 && sent.length === n0, '沒簽章：401、不存、不送');
  { const st2 = { events: mkStore(), failed: mkStore() }, old = Date.now() - 31 * 86400000;
    await st2.failed.set('old-ok', JSON.stringify({ why: 'rejected', alerted: true, at: old }));
    await st2.failed.set('old-unalerted', JSON.stringify({ why: 'gave-up', alerted: false, at: old, sig: 's', raw: '' }));
    await st2.failed.set('new', JSON.stringify({ why: 'rejected', alerted: true, at: Date.now() }));
    const o2 = await runRetry(st2, 'https://script.google.com/macros/s/X/exec', async () => ({ status: 500, text: async () => 'ERR' }), Date.now());
    const left = (await st2.failed.list()).blobs.map(b => b.key).sort().join(',');
    t(o2.purged === 1 && left === 'new,old-unalerted', '失敗區超過 30 天、已提醒過的刪掉；還沒提醒成功的留著（' + left + '）'); }
  r = await h(mk(undefined, 'GET'), ctx); t(r.status === 405, 'GET：405');
  process.env.LINE_CHANNEL_SECRET = 's3cret'; r = await h(mk('bad'), ctx); t(r.status === 401, '有設 secret：簽章錯直接擋');
  delete process.env.LINE_CHANNEL_SECRET;
  console.log(f ? '有 ' + f + ' 項沒過' : '全部通過'); process.exitCode = f ? 1 : 0;
})();
