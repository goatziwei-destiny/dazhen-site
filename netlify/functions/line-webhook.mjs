// LINE Webhook 轉送（Codex #7）
// LINE 等待回應的時間很短，Apps Script 常常要好幾秒才回（11/10 按 Verify 逾時）。
// 所以這裡「先回 200 給 LINE」，再在背景（context.waitUntil）把原文和簽章（網址 sig=）轉給 Apps Script，
// Apps Script 用它自己的 LINE_CHANNEL_SECRET 驗簽；驗過的才處理。Netlify 不用設任何東西。
//   （選用）Netlify 若設了 LINE_CHANNEL_SECRET，這裡也會先驗一次，簽章不對直接回 401、不轉送。
//   （選用）LINE_GAS_URL 可以改轉送目標；沒設就用下面的正式網址。
// Apps Script 第一次收到驗過的請求就自動開啟「一定要驗簽」，之後直接打 Apps Script 的請求一律不處理。
// 要退回直連：Apps Script 指令碼屬性刪掉 LINE_SIG_REQUIRED，再把 LINE Webhook URL 改回 Apps Script 網址。
import crypto from 'node:crypto';
const DEFAULT_GAS = 'https://script.google.com/macros/s/AKfycbx3aDlFDBayTKgvGtQMrWrpDMx3WuU5Yd3Uh4c6BJK5kmKpZnBsXH7fK97yrkQkgx9fkQ/exec';

export async function forwardToGas(gas, sig, raw) {
  const url = gas + (gas.indexOf('?') >= 0 ? '&' : '?') + 'sig=' + encodeURIComponent(sig);
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: raw, redirect: 'follow' });
    const text = String(await res.text()).trim();
    if (!res.ok) console.log('轉送到 Apps Script 失敗：HTTP ' + res.status);
    else if (text === 'REJECTED') console.log('Apps Script 拒收：簽章不對');
    else if (text !== 'OK') console.log('Apps Script 處理出錯：' + text.slice(0, 100));
    return text;
  } catch (e) { console.log('轉送到 Apps Script 失敗（連線）：' + e.message); return 'FAIL'; }
}

export default async (req, context) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  const gas = process.env.LINE_GAS_URL || DEFAULT_GAS, secret = process.env.LINE_CHANNEL_SECRET || '';
  const raw = Buffer.from(await req.arrayBuffer());
  const sig = String(req.headers.get('x-line-signature') || '');
  if (!sig) return new Response('no signature', { status: 401 });
  if (secret) {
    const a = Buffer.from(sig), b = Buffer.from(crypto.createHmac('sha256', secret).update(raw).digest('base64'));
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return new Response('bad signature', { status: 401 });
  }
  const job = forwardToGas(gas, sig, raw);
  if (context && typeof context.waitUntil === 'function') { context.waitUntil(job); return new Response('OK'); }
  await job; return new Response('OK');
};
