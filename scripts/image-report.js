#!/usr/bin/env node
/*
 * 文章配圖總覽（2026-10-28，試行）— 只在本機或審查時手動產生，**不放進正式網站建置**（GPT #9：/admin/ 不是登入保護，草稿與未用素材會被看到）
 * 用法：node scripts/image-report.js <輸出檔.html> [--base https://網站網址]
 *   --base：圖片改用完整網址（例如給 Claude 做成只有大正看得到的私人頁面時）。草稿或還沒上線的圖，正式網址上看不到，會顯示空白。
 * 列出文章用到的圖：縮圖、哪篇文章、封面或內文、替代文字、檔案大小、尺寸；標出找不到檔案、沒有替代文字、檔案太大、
 *   封面比例、寬度、同一張用在多處、uploads 裡沒被任何文章用到的圖。草稿、未來日期的文章會標出來。
 * 掃得到的寫法：front matter 的 image／imageAlt、Markdown 的 ![替代文字](網址)、HTML 的 <img src="…" alt="…">。
 *   其他寫法（Hugo shortcode、CSS 背景圖、版型裡寫死的圖）掃不到，不能保證「不漏圖」。
 * 頁面上可以逐張勾「要改」＋選原因，按「複製清單」貼給 GPT 或 Claude；勾選只存在那台裝置，不改任何檔案。
 * 圖畫得對不對（手腳、持物、角色）程式看不出來，要人看。
 */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), ARGS = process.argv.slice(2);
const OUT = ARGS.find(a => !a.startsWith('--') && ARGS[ARGS.indexOf(a) - 1] !== '--base');
const BASE = ARGS.includes('--base') ? String(ARGS[ARGS.indexOf('--base') + 1] || '').replace(/\/+$/, '') : '';
if (!OUT) { console.error('用法：node scripts/image-report.js <輸出檔.html> [--base https://網站網址]'); process.exit(1); }
const BIG_KB = 800;

function walk(dir, out) { if (!fs.existsSync(dir)) return out; for (const f of fs.readdirSync(dir)) { const p = path.join(dir, f); if (fs.statSync(p).isDirectory()) walk(p, out); else out.push(p); } return out; }
function dims(file) {   // 讀 PNG／JPEG／WebP 的寬高，不用外部套件
  try {
    const b = fs.readFileSync(file);
    if (b.slice(1, 4).toString() === 'PNG') return [b.readUInt32BE(16), b.readUInt32BE(20)];
    if (b[0] === 0xff && b[1] === 0xd8) { let i = 2; while (i < b.length) { if (b[i] !== 0xff) { i++; continue; } const m = b[i + 1], L = b.readUInt16BE(i + 2); if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)]; i += 2 + L; } }
    if (b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP') {
      const t = b.slice(12, 16).toString();
      if (t === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
      if (t === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
      if (t === 'VP8L') { const n = b.readUInt32LE(21); return [1 + (n & 0x3fff), 1 + ((n >> 14) & 0x3fff)]; }
    }
  } catch (e) { /* 讀不到就不顯示尺寸 */ }
  return null;
}
// 圖片網址：有 --base 用正式網址；沒有就指向本機 repo 的 static 資料夾（相對於輸出檔），直接打開報表也看得到縮圖（Codex #18）
const LOCAL_STATIC = path.relative(path.dirname(path.resolve(OUT)), path.join(ROOT, 'static')).split(path.sep).join('/') || '.';
const img = s => (!/^\//.test(s) ? s : BASE ? BASE + s : encodeURI(LOCAL_STATIC + s));
// 文章連結一律用網站網址（--base，沒有就用 config.toml 的 baseURL），本機打開報表也點得到原文（Codex #18）
const SITE = BASE || ((fs.readFileSync(path.join(ROOT, 'config.toml'), 'utf8').match(/^baseURL\s*=\s*"([^"]+)"/m) || [, ''])[1]).replace(/\/+$/, '');
const pageUrl = u => (u && SITE ? SITE + u : '');
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const unq = v => String(v || '').trim().replace(/^["']|["']$/g, '');

// 1. 文章裡用到的圖
const uses = [];
for (const file of walk(path.join(ROOT, 'content'), []).filter(f => f.endsWith('.md'))) {
  const text = fs.readFileSync(file, 'utf8'), fm = (text.match(/^---\r?\n([\s\S]*?)\r?\n---/) || [, ''])[1], body = text.slice(fm.length);
  const title = unq((fm.match(/^title:\s*(.+)$/m) || [, path.basename(file, '.md')])[1]);
  const slug = unq((fm.match(/^slug:\s*(.+)$/m) || [, ''])[1]);
  const section = path.relative(path.join(ROOT, 'content'), path.dirname(file)).split(path.sep)[0] || '';
  const url = section === 'blog' && slug ? '/blog/' + slug + '/' : '';
  const draft = /^draft:\s*true/m.test(fm), date = unq((fm.match(/^date:\s*(.+)$/m) || [, ''])[1]), future = date && new Date(date.slice(0, 10)) > new Date();
  const state = draft ? '草稿' : future ? '未來日期' : '';
  const src = path.relative(ROOT, file);
  const cover = unq((fm.match(/^image:\s*(.+)$/m) || [, ''])[1]);
  if (cover) uses.push({ src: cover, alt: unq((fm.match(/^imageAlt:\s*(.+)$/m) || [, ''])[1]), title, url, file: src, kind: '封面', state });
  for (const m of body.matchAll(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g)) uses.push({ src: m[2], alt: m[1], title, url, file: src, kind: '內文', state });
  for (const m of body.matchAll(/<img[^>]*src="([^"]+)"[^>]*>/g)) { const a = (m[0].match(/alt="([^"]*)"/) || [, ''])[1]; uses.push({ src: m[1], alt: a, title, url, file: src, kind: '內文', state }); }
}
// 2. 圖片資料夾（LINE 選單圖另外管理，不列）
const files = walk(path.join(ROOT, 'static', 'images'), []).filter(f => /\.(png|jpe?g|webp|gif)$/i.test(f) && !/[\\/]images[\\/]line[\\/]/.test(f));
const byPath = {};
for (const f of files) { const rel = '/' + path.relative(path.join(ROOT, 'static'), f).split(path.sep).join('/'); byPath[rel] = { kb: Math.round(fs.statSync(f).size / 1024), dim: dims(f) }; }
// 「沒有文章用到」只看 /images/uploads/（social／ 是社群貼文用的圖，不算）
const usedCount = {}; uses.forEach(u => { usedCount[u.src] = (usedCount[u.src] || 0) + 1; });

const rows = uses.map(u => {
  const info = /^\//.test(u.src) ? byPath[u.src] : null, flags = [];
  if (/^\//.test(u.src) && !info) flags.push('找不到檔案');
  if (!u.alt) flags.push('沒有替代文字');
  if (info && info.kb > BIG_KB) flags.push('檔案太大');
  if (info && info.dim && u.kind === '封面') { const r = info.dim[0] / info.dim[1]; if (r < 1.2 || r > 2.1) flags.push('封面比例不像橫式'); if (info.dim[0] < 1200) flags.push('封面寬度不到 1200'); }
  if (usedCount[u.src] > 1) flags.push('同一張用在多處');
  if (u.state) flags.push(u.state);
  return Object.assign({}, u, info || {}, { flags });
});
Object.keys(byPath).filter(p => !usedCount[p] && /^\/images\/uploads\//.test(p)).forEach(p => rows.push({ src: p, title: '（沒有文章用到）', file: '', kind: '未使用', alt: '', kb: byPath[p].kb, dim: byPath[p].dim, flags: ['沒有文章用到'] }));

const ALL_FLAGS = ['草稿', '未來日期', '找不到檔案', '沒有替代文字', '檔案太大', '封面比例不像橫式', '封面寬度不到 1200', '同一張用在多處', '沒有文章用到'];
const REASONS = ['角色不對', '比例／透視怪', '手腳或手指錯', '持物沒拿好', '服飾紋樣錯', '跟文章不搭', '文字或錯字', '其他'];
const html = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>文章配圖總覽</title>
<style>
:root{--ink:#1b2845;--bg:#f5f3ef;--card:#fff;--line:#e5e1da;--warn:#b45309;--bad:#b91c1c;--ok:#15803d}
*{box-sizing:border-box}body{margin:0;font:15px/1.6 system-ui,"PingFang TC","Noto Sans TC",sans-serif;background:var(--bg);color:#292524;padding:16px max(16px,env(safe-area-inset-left))}
h1{font-size:20px;color:var(--ink);margin:0 0 4px}.sub{color:#78716c;font-size:13px;margin-bottom:12px}
.bar{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;position:sticky;top:0;background:var(--bg);padding:8px 0;z-index:2}
.bar button{border:1px solid var(--line);background:#fff;border-radius:999px;padding:6px 12px;font:inherit;font-size:13px;cursor:pointer}.bar button[aria-pressed=true]{background:var(--ink);color:#fff;border-color:var(--ink)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;overflow:hidden;display:flex;flex-direction:column}
.card.marked{outline:3px solid var(--bad)}.card[hidden]{display:none}
.thumb{aspect-ratio:3/2;background:#eee center/contain no-repeat;cursor:zoom-in;border:0;width:100%}
.meta{padding:8px 10px;font-size:13px;display:flex;flex-direction:column;gap:4px;min-width:0}
.meta b{font-size:14px;color:var(--ink);overflow-wrap:anywhere}.meta .p{color:#78716c;overflow-wrap:anywhere;font-size:12px}
.tags{display:flex;flex-wrap:wrap;gap:4px}.tag{font-size:12px;border-radius:6px;padding:1px 6px;background:#fef3c7;color:var(--warn)}.tag.bad{background:#fee2e2;color:var(--bad)}.tag.ok{background:#dcfce7;color:var(--ok)}
.mark{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.mark select{font:inherit;font-size:13px;max-width:100%}
dialog{max-width:96vw;max-height:96vh;padding:0;border:0;border-radius:12px}dialog img{max-width:96vw;max-height:86vh;display:block}dialog .cap{padding:8px 12px;font-size:13px}
.out{width:100%;min-height:90px;font:13px/1.5 ui-monospace,monospace;margin-top:8px}
</style></head><body>
<h1>文章配圖總覽</h1>
<div class="sub">共 ${rows.length} 筆（${new Date().toISOString().slice(0, 10)} 產生，只給審圖用，不是公開頁面）。掃得到 front matter 的 image、Markdown 圖片、HTML img；其他寫法掃不到。點縮圖放大；勾「要改」並選原因，最後按「複製清單」貼給 GPT 或 Claude。勾選只存在這台裝置。</div>
<div class="bar" id="bar"><button data-f="" aria-pressed="true">全部</button>${ALL_FLAGS.map(f => `<button data-f="${esc(f)}" aria-pressed="false">${esc(f)}</button>`).join('')}<button data-f="__marked" aria-pressed="false">我勾的</button><button id="copy">複製清單</button></div>
<div class="grid" id="grid">${rows.map((r, i) => `<div class="card" data-i="${i}" data-flags="${esc(r.flags.join('|'))}">
<button class="thumb" style="background-image:url('${esc(img(r.src))}')" data-big="${esc(img(r.src))}" aria-label="放大 ${esc(r.title)}"></button>
<div class="meta"><b>${pageUrl(r.url) ? `<a href="${esc(pageUrl(r.url))}" target="_blank" rel="noopener">${esc(r.title)}</a>` : esc(r.title)}</b>
<span class="p">${esc(r.kind)}｜${esc(r.src)}</span>
<span class="p">${r.dim ? r.dim[0] + '×' + r.dim[1] : '尺寸不明'}｜${r.kb != null ? r.kb + ' KB' : '—'}${r.file ? '｜' + esc(r.file) : ''}</span>
<span class="p">替代文字：${r.alt ? esc(r.alt) : '（沒有）'}</span>
<div class="tags">${r.flags.length ? r.flags.map(f => `<span class="tag${/找不到|沒有文章/.test(f) ? ' bad' : ''}">${esc(f)}</span>`).join('') : '<span class="tag ok">自動檢查沒問題</span>'}</div>
<label class="mark"><input type="checkbox" class="mk"> 要改：<select class="why">${REASONS.map(x => `<option>${esc(x)}</option>`).join('')}</select></label>
</div></div>`).join('')}</div>
<textarea class="out" id="out" readonly hidden></textarea>
<dialog id="dlg"><img id="dimg" alt=""><div class="cap" id="dcap"></div></dialog>
<script>
var ROWS=${JSON.stringify(rows.map(r => ({ src: r.src, title: r.title, file: r.file, kind: r.kind }))).replace(/</g, '\\u003c')}, KEY='dz_img_marks', marks={};
try{marks=JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){marks={}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(marks))}catch(e){}}
document.querySelectorAll('.card').forEach(function(c){var r=ROWS[c.dataset.i],m=marks[r.src+'|'+r.file],cb=c.querySelector('.mk'),sel=c.querySelector('.why');if(m){cb.checked=true;sel.value=m;c.classList.add('marked')}
 function upd(){var k=r.src+'|'+r.file;if(cb.checked){marks[k]=sel.value;c.classList.add('marked')}else{delete marks[k];c.classList.remove('marked')}save()}cb.addEventListener('change',upd);sel.addEventListener('change',function(){if(cb.checked)upd()})});
document.getElementById('bar').addEventListener('click',function(e){var b=e.target.closest('button[data-f]');if(!b)return;document.querySelectorAll('#bar button[data-f]').forEach(function(x){x.setAttribute('aria-pressed',x===b)});var f=b.dataset.f;
 document.querySelectorAll('.card').forEach(function(c){var r=ROWS[c.dataset.i];c.hidden=f==='__marked'?!marks[r.src+'|'+r.file]:(f&&c.dataset.flags.split('|').indexOf(f)<0)})});
document.getElementById('grid').addEventListener('click',function(e){var t=e.target.closest('[data-big]');if(!t)return;var r=ROWS[t.closest('.card').dataset.i];document.getElementById('dimg').src=t.dataset.big;document.getElementById('dcap').textContent=r.title+'｜'+r.src;document.getElementById('dlg').showModal()});
document.getElementById('dlg').addEventListener('click',function(){this.close()});
document.getElementById('copy').addEventListener('click',function(){var lines=Object.keys(marks).map(function(k){var p=k.split('|');return '- '+p[0]+(p[1]?'（'+p[1]+'）':'')+'：'+marks[k]});var t=lines.length?'要改的圖（'+lines.length+' 張）：\\n'+lines.join('\\n'):'還沒有勾任何圖';var o=document.getElementById('out');o.hidden=false;o.value=t;o.select();try{navigator.clipboard.writeText(t).catch(function(){})}catch(e){}});
</script></body></html>`;
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html);
console.log('[image-report] ' + rows.length + ' 筆，有標記 ' + rows.filter(r => r.flags.length).length + ' 筆 → ' + OUT);
