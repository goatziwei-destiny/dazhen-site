// LINE Webhook 驗簽轉送（Codex #7，2026-11-10）
// Apps Script 的 doPost 讀不到 LINE 的 X-Line-Signature 標頭，所以由這裡先驗簽：
//   簽章對 → 原封不動轉送到 Apps Script（網址帶 pk 密鑰）；簽章不對 → 直接回 401，不轉送。
// 要在 Netlify 設定三個環境變數（Site settings → Environment variables）：
//   LINE_CHANNEL_SECRET  LINE Developers → Messaging API 的 Channel secret
//   LINE_PROXY_KEY       自己產生的一串亂碼，Apps Script 指令碼屬性 LINE_PROXY_KEY 要設一樣的值
//   LINE_GAS_URL         Apps Script 公開部署的 /exec 網址
// 切換順序（大正決定時間後照做，Codex #7 第二輪）：
//   1. Netlify 設好三個環境變數（Apps Script 這時還沒設 LINE_PROXY_KEY，舊網址照常收）
//   2. LINE Developers 的 Webhook URL 改成 https://dazhen-site.netlify.app/.netlify/functions/line-webhook，按 Verify 要成功，
//      再用手機傳一則訊息給官方帳號，確認有正常回覆
//   3. 最後才在 Apps Script 指令碼屬性設 LINE_PROXY_KEY（和 Netlify 同一串）。從這一步起，直接打 Apps Script 的請求一律不處理
//   要退回：先刪掉 Apps Script 的 LINE_PROXY_KEY，再把 LINE 的 Webhook URL 改回 Apps Script 網址
//   第 3 步做完之前，Apps Script 仍會收未驗簽的請求（等於 #7 還沒完成）
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
  // Apps Script 回的字：OK＝收到並處理；REJECTED＝密鑰不對（設定沒對齊）；ERROR＝處理出錯。
  // 只有 OK 才回 200 給 LINE；其他都回錯誤碼，LINE 後台的錯誤統計看得到，開了「重新傳送」的話 LINE 會再送（Apps Script 用 webhookEventId 去重）。
  const url = gas + (gas.indexOf('?') >= 0 ? '&' : '?') + 'pk=' + encodeURIComponent(key);
  let res, text = '';
  try {
    res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: raw, redirect: 'follow' });
    text = String(await res.text()).trim();
  } catch (e) {
    console.log('轉送到 Apps Script 失敗（連線）：' + e.message);
    return { statusCode: 502, body: 'forward failed' };
  }
  if (!res.ok) { console.log('轉送到 Apps Script 失敗：HTTP ' + res.status); return { statusCode: 502, body: 'forward failed' }; }
  if (text === 'REJECTED') { console.log('Apps Script 拒收：LINE_PROXY_KEY 兩邊不一樣'); return { statusCode: 500, body: 'rejected' }; }
  if (text !== 'OK') { console.log('Apps Script 處理出錯：' + text.slice(0, 100)); return { statusCode: 500, body: 'error' }; }
  return { statusCode: 200, body: 'OK' };
};
