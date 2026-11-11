// LINE 事件「先存、再回、後送」（GPT 6787473251，11/11）：
//  1. 收到 LINE 的請求：先把原文＋簽章存進 Netlify Blobs（line-events），存成功才回 200 給 LINE。
//     存不進去就回 503，LINE 那邊看得到失敗（若開了重新傳送，LINE 會再送）。
//  2. 回完之後在背景轉給 Apps Script；成功（OK）或已處理過就刪掉暫存。
//  3. 沒送成功的留著，每 5 分鐘由 line-retry 再送一次（Apps Script 用 webhookEventId 去重，不會處理兩次）。
//     Apps Script 只在「每一則都處理完」才回 OK；有一則暫時失敗就回 ERROR，重送時已完成的會跳過（GPT 6787629598）。
//     12 次（約 1 小時）都沒送成，移到 line-failed，再把原文＋簽章 POST 給 Apps Script（relay=gave-up）：
//     Apps Script 驗過簽章才把每則列進後台「LINE 待核對」、寄提醒。這個提醒沒成功（alerted:false）就每 5 分鐘再試。
//     簽章被 Apps Script 拒收（REJECTED）不重送，移到 line-failed；提醒信 Apps Script 驗簽失敗當下已經寄了。
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

/** 放棄重送時請 Apps Script 列待核對＋提醒：帶原文和 LINE 簽章，Apps Script 驗過才收（不是任何人都能叫） */
export async function alertGaveUp(gas, rec, fetchFn) {
  const url = gas + (gas.indexOf('?') >= 0 ? '&' : '?') + 'relay=gave-up&sig=' + encodeURIComponent(rec.sig);
  try {
    const res = await (fetchFn || fetch)(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: Buffer.from(rec.raw, 'base64'), redirect: 'follow' });
    const text = String(await res.text()).trim();
    if (res.ok && text === 'OK') return true;
    console.log('放棄提醒沒成功：HTTP ' + res.status + ' ' + text.slice(0, 60));
  } catch (e) { console.log('放棄提醒沒成功（連線）：' + e.message); }
  return false;
}

/** 把一筆暫存送出去，回傳 'done'｜'retry'｜'failed' */
export async function deliver(stores, key, rec, gas, fetchFn) {
  const r = await forwardToGas(gas, rec.sig, Buffer.from(rec.raw, 'base64'), fetchFn);
  if (r === 'OK') { await stores.events.delete(key); return 'done'; }
  const n = (rec.n || 0) + 1;
  if (r === 'REJECTED' || n >= MAX_TRIES) {
    const why = r === 'REJECTED' ? 'rejected' : 'gave-up';
    const f = Object.assign({}, rec, { n, why, at: Date.now(), alerted: why === 'rejected', alertTries: 0 });
    await stores.failed.set(key, JSON.stringify(f));   // 先存進失敗區，再從待送刪掉：中間斷掉最多重複一筆，不會不見
    await stores.events.delete(key);
    if (why === 'gave-up') await retryAlert(stores, key, f, gas, fetchFn);
    return 'failed';
  }
  await stores.events.set(key, JSON.stringify(Object.assign({}, rec, { n, last: Date.now() })));
  return 'retry';
}

/** 失敗區裡還沒提醒成功的：再提醒一次，結果存回去 */
export async function retryAlert(stores, key, f, gas, fetchFn) {
  const okd = await alertGaveUp(gas, f, fetchFn);
  await stores.failed.set(key, JSON.stringify(Object.assign({}, f, { alerted: okd, alertTries: (f.alertTries || 0) + 1, alertLast: Date.now() })));
  return okd;
}

export function makeKey() { return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10); }
