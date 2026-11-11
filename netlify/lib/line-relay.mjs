// LINE 事件「先存、再回、後送」（GPT 6787473251，11/11）：
//  1. 收到 LINE 的請求：先把原文＋簽章存進 Netlify Blobs（line-events），存成功才回 200 給 LINE。
//     存不進去就回 503，LINE 那邊看得到失敗（若開了重新傳送，LINE 會再送）。
//  2. 回完之後在背景轉給 Apps Script；成功（OK）或已處理過就刪掉暫存。
//  3. 沒送成功的留著，每 5 分鐘由 line-retry 再送一次（Apps Script 用 webhookEventId 去重，不會處理兩次）。
//     12 次（約 1 小時）都沒送成，移到 line-failed，並請 Apps Script 寄信提醒大正核對。
//     簽章被 Apps Script 拒收（REJECTED）不重送，直接移到 line-failed 並提醒（可能是 Channel secret 換了）。
export const DEFAULT_GAS = 'https://script.google.com/macros/s/AKfycbx3aDlFDBayTKgvGtQMrWrpDMx3WuU5Yd3Uh4c6BJK5kmKpZnBsXH7fK97yrkQkgx9fkQ/exec';
export const MAX_TRIES = 12;

export async function forwardToGas(gas, sig, raw, fetchFn) {
  const url = gas + (gas.indexOf('?') >= 0 ? '&' : '?') + 'sig=' + encodeURIComponent(sig);
  try {
    const res = await (fetchFn || fetch)(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: raw, redirect: 'follow' });
    const text = String(await res.text()).trim();
    if (!res.ok) { console.log('轉送到 Apps Script 失敗：HTTP ' + res.status); return 'FAIL'; }
    if (text === 'OK' || text === 'REJECTED') return text;
    console.log('Apps Script 處理出錯：' + text.slice(0, 100)); return 'FAIL';
  } catch (e) { console.log('轉送到 Apps Script 失敗（連線）：' + e.message); return 'FAIL'; }
}

export async function alertOwner(gas, what, n, fetchFn) {
  try { await (fetchFn || fetch)(gas + (gas.indexOf('?') >= 0 ? '&' : '?') + 'page=lineRelayAlert&what=' + encodeURIComponent(what) + '&n=' + n, { redirect: 'follow' }); }
  catch (e) { console.log('提醒寄送失敗：' + e.message); }
}

/** 把一筆暫存送出去，回傳 'done'｜'retry'｜'failed' */
export async function deliver(stores, key, rec, gas, fetchFn) {
  const r = await forwardToGas(gas, rec.sig, Buffer.from(rec.raw, 'base64'), fetchFn);
  if (r === 'OK') { await stores.events.delete(key); return 'done'; }
  const n = (rec.n || 0) + 1;
  if (r === 'REJECTED' || n >= MAX_TRIES) {
    await stores.failed.set(key, JSON.stringify(Object.assign({}, rec, { n, why: r === 'REJECTED' ? 'rejected' : 'gave-up', at: Date.now() })));
    await stores.events.delete(key);
    await alertOwner(gas, r === 'REJECTED' ? 'rejected' : 'gave-up', 1, fetchFn);
    return 'failed';
  }
  await stores.events.set(key, JSON.stringify(Object.assign({}, rec, { n, last: Date.now() })));
  return 'retry';
}

export function makeKey() { return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10); }
