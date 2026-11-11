// 每 5 分鐘把沒送成功的 LINE 事件再送一次（流程見 netlify/lib/line-relay.mjs）
import { DEFAULT_GAS, deliver } from '../lib/line-relay.mjs';

export async function runRetry(stores, gas, fetchFn, now) {
  now = now || Date.now();
  const { blobs } = await stores.events.list();
  const out = { done: 0, retry: 0, failed: 0, skipped: 0 };
  for (const b of blobs) {
    const rec = await stores.events.get(b.key, { type: 'json' });
    if (!rec) continue;
    if (now - (rec.last || rec.t || 0) < 60 * 1000) { out.skipped++; continue; }   // 剛收到或剛試過的：先讓背景那一次跑完
    out[await deliver(stores, b.key, rec, gas, fetchFn)]++;
  }
  return out;
}

export default async () => {
  const { getStore } = await import('@netlify/blobs');
  const r = await runRetry({ events: getStore('line-events'), failed: getStore('line-failed') }, process.env.LINE_GAS_URL || DEFAULT_GAS);
  console.log('LINE 重送：' + JSON.stringify(r));
};
export const config = { schedule: '*/5 * * * *' };
