// 每 5 分鐘把沒送成功的 LINE 事件再送一次（流程見 netlify/lib/line-relay.mjs）
import { DEFAULT_GAS, deliver, retryAlert } from '../lib/line-relay.mjs';

export async function runRetry(stores, gas, fetchFn, now) {
  now = now || Date.now();
  const { blobs } = await stores.events.list();
  const out = { done: 0, retry: 0, failed: 0, skipped: 0 }, justMoved = new Set();
  for (const b of blobs) {
    const rec = await stores.events.get(b.key, { type: 'json' });
    if (!rec) continue;
    if (now - (rec.last || rec.t || 0) < 60 * 1000) { out.skipped++; continue; }   // 剛收到或剛試過的：先讓背景那一次跑完
    const d = await deliver(stores, b.key, rec, gas, fetchFn); out[d]++; if (d === 'failed') justMoved.add(b.key);
  }
  // 放棄重送、但提醒還沒成功的（GPT 6787629598）：每次排程都再提醒，直到 Apps Script 收下
  out.alerted = 0; out.alertPending = 0; out.purged = 0;
  const failed = await stores.failed.list();
  for (const b of failed.blobs) {
    const f = await stores.failed.get(b.key, { type: 'json' });
    // 失敗區只留 30 天（Fable P2：LINE 訊息內容不要永久放在 Netlify）。提醒還沒成功的照樣留著，等大正收到
    if (f && (f.alerted || f.why !== 'gave-up') && now - (f.at || 0) > 30 * 86400000) { await stores.failed.delete(b.key); out.purged++; continue; }
    if (!f || f.alerted || f.why !== 'gave-up' || justMoved.has(b.key)) continue;   // 這次剛移過去的已經提醒過一次
    if (now - (f.alertLast || 0) < 60 * 1000) { out.alertPending++; continue; }
    if (await retryAlert(stores, b.key, f, gas, fetchFn)) out.alerted++; else out.alertPending++;
  }
  return out;
}

export default async () => {
  const { getStore } = await import('@netlify/blobs');
  const r = await runRetry({ events: getStore('line-events'), failed: getStore('line-failed') }, process.env.LINE_GAS_URL || DEFAULT_GAS);
  console.log('LINE 重送：' + JSON.stringify(r));
};
export const config = { schedule: '*/5 * * * *' };
