/*
 * 首頁預先寫入（Netlify 建置時在 hugo 之後執行）
 * 首頁原本是瀏覽器打開後才用程式畫出內容，搜尋引擎與 AI 工具讀到的原始 HTML 幾乎是空的。
 * 這支程式在建置時把首頁「先畫好」寫進 public/index.html：
 *   1. 跑首頁裡同一段 renderSite 程式（用簡單的假 document，不需要瀏覽器）
 *   2. 試著抓後台「網站內容」（siteConfig），抓得到就用後台最新文字；抓不到就用頁面內建的預設文字
 *   3. 把畫好的 HTML、標題、描述寫回 index.html
 * 客人打開網頁後，頁面一樣會再抓一次後台最新內容並更新，所以後台改字不用重新部署。
 * 任何一步失敗都只印警告、保留原本的 index.html，不會讓網站建置失敗。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const FILE = path.join(__dirname, '..', 'public', 'index.html');

function escHtml(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escAttr(s) { return escHtml(s).replace(/"/g, '&quot;'); }
function plain(s) { return String(s == null ? '' : s).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim(); }

function makeSandbox() {
  const app = { innerHTML: '' };
  const metaDesc = { content: '' }, canonical = { href: '' };
  const document = {
    title: '',
    getElementById: (id) => (id === 'app' ? app : null),
    querySelector: (sel) => (/description/.test(sel) ? metaDesc : /canonical/.test(sel) ? canonical : null),
    querySelectorAll: () => [],
    createElement: () => {
      const el = { _t: '' };
      Object.defineProperty(el, 'textContent', { set(v) { el._t = String(v == null ? '' : v); }, get() { return el._t; } });
      Object.defineProperty(el, 'innerHTML', { get() { return escHtml(el._t); } });
      return el;
    },
    body: { appendChild: () => {} },
  };
  const window = { addEventListener: () => {} };
  // 首頁程式會讀 navigator（判斷是不是在 LINE 裡）、location.search、localStorage（看過命運書庫沒）；沒有的話整段會失敗、首頁變成空白給搜尋引擎
  const sandbox = { document, window, console, setTimeout: () => 0, location: { pathname: '/', search: '' }, navigator: { userAgent: '' }, localStorage: { getItem: () => null, setItem: () => {} } };
  sandbox.window = sandbox;  // 頁面程式把 window._siteConfigCb 掛在 window 上
  sandbox.window.document = document;
  return { sandbox, app, metaDesc };
}

async function fetchSiteConfig(url) {
  if (typeof fetch !== 'function') return null;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 20000);
  try {
    const res = await fetch(url + (url.includes('?') ? '&' : '?') + 'page=siteConfig', { signal: ctl.signal, redirect: 'follow' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = (await res.text()).trim();
    const json = text.replace(/^[\w$.]+\(([\s\S]*)\);?$/, '$1');  // 萬一回傳的是 JSONP
    return JSON.parse(json);
  } finally { clearTimeout(timer); }
}

(async () => {
  let html;
  try { html = fs.readFileSync(FILE, 'utf8'); } catch (e) { console.warn('[prerender] 找不到 public/index.html，略過'); return; }
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const code = scripts.find((s) => s.includes('const SITE = {') && s.includes('function renderSite'));
  if (!code) { console.warn('[prerender] 找不到首頁程式，略過'); return; }

  const { sandbox, app, metaDesc } = makeSandbox();
  try {
    vm.createContext(sandbox);
    // const/function 宣告留在 context 裡，最後把 SITE 交出來
    vm.runInContext(code + '\n;this.__SITE = SITE; var __rs = renderSite; renderSite = function (S) { globalThis.__lastS = S; return __rs(S); };', sandbox, { timeout: 5000 });   // 記下最後一次畫面用的內容（含後台 FAQ），給結構化資料用
  } catch (e) { console.warn('[prerender] 執行首頁程式失敗，保留原檔：' + e.message); return; }

  let source = '預設文字';
  try {
    const url = sandbox.__SITE && sandbox.__SITE.bookingFormUrl;
    if (url && typeof sandbox._siteConfigCb === 'function') {
      const data = await fetchSiteConfig(url);
      if (data && typeof data === 'object') { sandbox._siteConfigCb(data); source = '後台網站內容'; }
    }
  } catch (e) { console.warn('[prerender] 抓不到後台網站內容，改用預設文字：' + e.message); }

  if (!app.innerHTML || app.innerHTML.length < 500) { console.warn('[prerender] 畫出來的內容太少，保留原檔'); return; }

  let out = html.replace('<div id="app"></div>', '<div id="app">' + app.innerHTML + '</div>');
  if (sandbox.document.title) out = out.replace(/<title>[\s\S]*?<\/title>/, '<title>' + escHtml(sandbox.document.title) + '</title>');
  if (metaDesc.content) {
    out = out.replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="' + escAttr(metaDesc.content) + '">');
    out = out.replace(/<meta property="og:description" content="[^"]*">/, '<meta property="og:description" content="' + escAttr(metaDesc.content) + '">');
  }
  if (sandbox.document.title) out = out.replace(/<meta property="og:title" content="[^"]*">/, '<meta property="og:title" content="' + escAttr(sandbox.document.title) + '">');
  // 常見問題的結構化資料（FAQPage）：用跟畫面同一份問答，搜尋引擎與 AI 工具不跑 JS 也讀得到。
  // 後台改了 FAQ，要等下次網站重新建置才會更新這段（畫面本身是即時的）。
  try {
    const S = sandbox.__lastS || sandbox.__SITE || {};
    const faqs = (S.faqItems || []).filter((f) => f && f.q && f.a).map((f) => ({ '@type': 'Question', name: plain(f.q), acceptedAnswer: { '@type': 'Answer', text: plain(f.a) } }));
    if (faqs.length && !out.includes('"FAQPage"')) {
      const ld = JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs }).replace(/</g, '\\u003c');
      out = out.replace('</head>', () => '<script type="application/ld+json">' + ld + '</script>\n</head>');   // 用函式回傳，問答裡的 $& 之類不會被當成取代指令（Codex #17）
    }
  } catch (e) { console.warn('[prerender] 常見問題結構化資料略過：' + e.message); }
  fs.writeFileSync(FILE, out);
  console.log('[prerender] 首頁已預先寫入（' + source + '），' + app.innerHTML.length + ' 字元');
})().catch((e) => console.warn('[prerender] 未預期的錯誤，保留原檔：' + e.message));
