// LINE Webhook 轉送（Codex #7）
// Apps Script 的 doPost 讀不到 LINE 的 X-Line-Signature 標頭，所以由這裡把簽章放進網址（sig=）、原文照轉，
// Apps Script 用它自己的 LINE_CHANNEL_SECRET 驗簽。Netlify 不用設任何東西。
//   （選用）Netlify 若設了 LINE_CHANNEL_SECRET，這裡也會先驗一次，簽章不對直接回 401、不轉送。
//   （選用）LINE_GAS_URL 可以改轉送目標；沒設就用下面的正式網址。
// 切換：大正把 LINE Developers 的 Webhook URL 改成 https://dazhen-site.netlify.app/.netlify/functions/line-webhook、按 Verify。
//   Apps Script 第一次收到驗過的請求就自動開啟「一定要驗簽」，之後直接打 Apps Script 的請求一律不處理。
//   要退回：Apps Script 指令碼屬性刪掉 LINE_SIG_REQUIRED，再把 Webhook URL 改回 Apps Script 網址。
const crypto = require('crypto');
const DEFAULT_GAS = 'https://script.google.com/macros/s/AKfycbx3aDlFDBayTKgvGtQMrWrpDMx3WuU5Yd3Uh4c6BJK5kmKpZnBsXH7fK97yrkQkgx9fkQ/exec';

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  const gas = process.env.LINE_GAS_URL || DEFAULT_GAS, secret = process.env.LINE_CHANNEL_SECRET || '';
  const raw = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64') : Buffer.from(event.body || '', 'utf8');
  const h = event.headers || {}, sig = String(h['x-line-signature'] || h['X-Line-Signature'] || '');
  if (!sig) return { statusCode: 401, body: 'no signature' };
  if (secret) {
    const a = Buffer.from(sig), b = Buffer.from(crypto.createHmac('sha256', secret).update(raw).digest('base64'));
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { statusCode: 401, body: 'bad signature' };
  }
  // Apps Script 回的字：OK＝收到並處理；REJECTED＝簽章不對；ERROR＝處理出錯。只有 OK 才回 200 給 LINE（Apps Script 用 webhookEventId 去重）。
  const url = gas + (gas.indexOf('?') >= 0 ? '&' : '?') + 'sig=' + encodeURIComponent(sig);
  let res, text = '';
  try {
    res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: raw, redirect: 'follow' });
    text = String(await res.text()).trim();
  } catch (e) {
    console.log('轉送到 Apps Script 失敗（連線）：' + e.message);
    return { statusCode: 502, body: 'forward failed' };
  }
  if (!res.ok) { console.log('轉送到 Apps Script 失敗：HTTP ' + res.status); return { statusCode: 502, body: 'forward failed' }; }
  if (text === 'REJECTED') { console.log('Apps Script 拒收：簽章不對'); return { statusCode: 401, body: 'rejected' }; }
  if (text !== 'OK') { console.log('Apps Script 處理出錯：' + text.slice(0, 100)); return { statusCode: 500, body: 'error' }; }
  return { statusCode: 200, body: 'OK' };
};
