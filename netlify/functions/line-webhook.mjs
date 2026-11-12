// LINE Webhook 轉送（Codex #7；11/11 GPT 6787473251 改成先存再回）
// 流程寫在 netlify/lib/line-relay.mjs 開頭。Netlify 的環境變數見下面。
//   LINE_CHANNEL_SECRET：11/12 已在 Netlify 設定（21:52 換成 Messaging API 頻道的 Channel secret），門口先驗一次簽章，不對直接 401。
//   （選用）LINE_GAS_URL：改轉送目標。
// Apps Script 已開啟必驗（LINE_SIG_REQUIRED），直接打 Apps Script、沒有簽章的請求一律不處理。
// 要退回直連：Apps Script 指令碼屬性刪掉 LINE_SIG_REQUIRED，再把 LINE Webhook URL 改回 Apps Script 網址。
import crypto from 'node:crypto';
import { DEFAULT_GAS, deliver, makeKey } from '../lib/line-relay.mjs';

export function makeHandler(getStores, fetchFn) {
  return async (req, context) => {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    const gas = process.env.LINE_GAS_URL || DEFAULT_GAS, secret = process.env.LINE_CHANNEL_SECRET || '';
    const raw = Buffer.from(await req.arrayBuffer());
    const sig = String(req.headers.get('x-line-signature') || '');
    if (!sig) return new Response('no signature', { status: 401 });
    if (secret) {
      const a = Buffer.from(sig), b = Buffer.from(crypto.createHmac('sha256', secret).update(raw).digest('base64'));
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return new Response('bad signature', { status: 401 });
    }
    let stores, key = makeKey(), rec = { sig, raw: raw.toString('base64'), n: 0, t: Date.now() };
    try { stores = await getStores(); await stores.events.set(key, JSON.stringify(rec)); }
    catch (e) { console.log('LINE 事件暫存失敗：' + e.message); return new Response('store failed', { status: 503 }); }   // 沒存到就不回成功
    const job = deliver(stores, key, rec, gas, fetchFn).catch(e => console.log('轉送例外（暫存還在，稍後重送）：' + e.message));
    if (context && typeof context.waitUntil === 'function') { context.waitUntil(job); return new Response('OK'); }
    await job; return new Response('OK');
  };
}

async function realStores() {
  const { getStore } = await import('@netlify/blobs');
  return { events: getStore('line-events'), failed: getStore('line-failed') };
}
export default makeHandler(realStores);
