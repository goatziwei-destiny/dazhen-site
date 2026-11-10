// LINE Webhook 驗簽轉送（Codex #7，2026-11-10）
// Apps Script 的 doPost 讀不到 LINE 的 X-Line-Signature 標頭，所以由這裡先驗簽：
//   簽章對 → 原封不動轉送到 Apps Script（網址帶 pk 密鑰）；簽章不對 → 直接回 401，不轉送。
// 要在 Netlify 設定三個環境變數（Site settings → Environment variables）：
//   LINE_CHANNEL_SECRET  LINE Developers → Messaging API 的 Channel secret
//   LINE_PROXY_KEY       自己產生的一串亂碼，Apps Script 指令碼屬性 LINE_PROXY_KEY 要設一樣的值
//   LINE_GAS_URL         Apps Script 公開部署的 /exec 網址
// 設好之後，把 LINE Developers 的 Webhook URL 改成 https://dazhen-site.netlify.app/.netlify/functions/line-webhook
const crypto = require('crypto');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  const secret = process.env.LINE_CHANNEL_SECRET, key = process.env.LINE_PROXY_KEY, gas = process.env.LINE_GAS_URL;
  if (!secret || !key || !gas) return { statusCode: 500, body: 'not configured' };
  const raw = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64') : Buffer.from(event.body || '', 'utf8');
  const sig = event.headers['x-line-signature'] || event.headers['X-Line-Signature'] || '';
  const expect = crypto.createHmac('sha256', secret).update(raw).digest('base64');
  const a = Buffer.from(String(sig)), b = Buffer.from(expect);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { statusCode: 401, body: 'bad signature' };
  try {
    const url = gas + (gas.indexOf('?') >= 0 ? '&' : '?') + 'pk=' + encodeURIComponent(key);
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: raw, redirect: 'follow' });
  } catch (e) {
    console.log('轉送到 Apps Script 失敗：' + e.message);   // LINE 會照自己的規則重送；這裡仍回 200，避免 LINE 停用 webhook
  }
  return { statusCode: 200, body: 'OK' };
};
