#!/usr/bin/env node
/*
 * 文章自動檢查（2026-10-28）：照 docs/writing-guide.md 能用程式量的規則檢查部落格文章。
 * 用法：
 *   node scripts/check-articles.js content/blog/xxx.md …   檢查指定文章
 *   node scripts/check-articles.js --changed origin/main      檢查跟 main 比有改到的文章（PR 用）
 *   node scripts/check-articles.js --all                      全部文章（只看報告，舊文章不擋）
 * 「錯誤」會讓檢查失敗（PR 上顯示紅叉）；「提醒」只列出來，給 GPT／Claude 審文時參考。
 * 命理內容對不對、語氣好不好，程式判斷不了，還是要人（大正）和 AI 審。
 */
'use strict';
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const TOPICS = ['love', 'family', 'career', 'basics', 'notes'];

function parseFront(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return null;
  const fm = {}, lines = m[1].split(/\r?\n/);
  let key = null, item = null;
  for (const raw of lines) {
    if (!raw.trim() || /^\s*#/.test(raw)) continue;
    let mm;
    if ((mm = raw.match(/^([A-Za-z][\w-]*):\s*(.*)$/))) {
      key = mm[1]; item = null; const v = mm[2].replace(/\s+#.*$/, '').trim();
      fm[key] = v === '' ? [] : unq(v);
    } else if ((mm = raw.match(/^\s+-\s+([A-Za-z]\w*):\s*(.*)$/)) && key) {   // faq 的 - q: …
      item = {}; item[mm[1]] = unq(mm[2].trim()); if (!Array.isArray(fm[key])) fm[key] = []; fm[key].push(item);
    } else if ((mm = raw.match(/^\s+([A-Za-z]\w*):\s*(.*)$/)) && key) {
      if (item) item[mm[1]] = unq(mm[2].trim());
      else { if (typeof fm[key] !== 'object' || Array.isArray(fm[key])) fm[key] = {}; fm[key][mm[1]] = unq(mm[2].trim()); }
    } else if ((mm = raw.match(/^\s+-\s+(.*)$/)) && key) {
      if (!Array.isArray(fm[key])) fm[key] = []; fm[key].push(unq(mm[1].trim()));
    }
  }
  return { fm, body: m[2] };
}
function unq(v) { const m = String(v).match(/^"(.*)"$|^'(.*)'$/); return m ? (m[1] !== undefined ? m[1].replace(/\\"/g, '"') : m[2]) : v; }
const len = s => [...String(s || '')].length;

function checkFile(file) {
  const errs = [], warns = [], text = fs.readFileSync(file, 'utf8'), p = parseFront(text);
  if (!p) return { errs: ['開頭沒有 --- 包起來的欄位區'], warns };
  const f = p.fm, body = p.body;
  if (String(f.draft) === 'true') warns.push('draft: true（這篇不會出現在網站上）');
  // 欄位
  if (!f.title) errs.push('缺 title'); else if (len(f.title) > 32) warns.push('title ' + len(f.title) + ' 字，建議 32 字以內');
  if (!f.slug) errs.push('缺 slug'); else if (!/^[a-z0-9]+(-[a-z0-9]+){2,5}$/.test(f.slug)) errs.push('slug「' + f.slug + '」要是小寫英文、數字，用 - 連接 3～6 個單字');
  if (!/^\d{4}-\d{2}-\d{2}/.test(String(f.date || ''))) errs.push('date 要是 YYYY-MM-DD');
  const tp = [].concat(f.topics || []), st = [].concat(f.subtopics || []);
  if (tp.length !== 1 || !TOPICS.includes(tp[0])) errs.push('topics 要剛好 1 個，從 ' + TOPICS.join('／') + ' 選');
  if (st.length !== 1) errs.push('subtopics 要剛好 1 個');
  else if (tp[0] && !String(st[0]).startsWith(tp[0] + '-')) warns.push('subtopics「' + st[0] + '」看起來不屬於主題「' + tp[0] + '」');
  if (!f.description) errs.push('缺 description（搜尋結果與文章開頭的快速解答）');
  else if (len(f.description) < 60 || len(f.description) > 160) warns.push('description ' + len(f.description) + ' 字，建議 80～120 字');
  if (!f.image || Array.isArray(f.image)) warns.push('沒有封面 image（分享到 LINE、FB 會沒有圖）');
  else {
    const img = path.join(ROOT, 'static', String(f.image).replace(/^\//, ''));
    if (!fs.existsSync(img)) errs.push('封面圖找不到：' + f.image);
    else { const kb = Math.round(fs.statSync(img).size / 1024); if (kb > 800) warns.push('封面圖 ' + kb + ' KB，網站會自動壓縮，但原檔建議 800 KB 以內'); }
    if (!f.imageAlt || Array.isArray(f.imageAlt)) warns.push('封面沒有 imageAlt（寫圖片在畫什麼）');
  }
  const tags = [].concat(f.tags || []); if (tags.length < 3 || tags.length > 6) warns.push('tags ' + tags.length + ' 個，建議 3～6 個');
  const faq = Array.isArray(f.faq) ? f.faq.filter(x => x && typeof x === 'object') : [];
  if (faq.length > 5) warns.push('faq ' + faq.length + ' 題，建議 2～5 題');
  faq.forEach((x, i) => { if (!x.q || !x.a) errs.push('faq 第 ' + (i + 1) + ' 題缺問題或回答'); });
  // 內文
  const lines = body.split(/\r?\n/);
  let lastLevel = 1, bold = (body.match(/\*\*[^*]+\*\*/g) || []).length;
  lines.forEach((l, i) => {
    const h = l.match(/^(#{1,6})\s/);
    if (h) {
      const lv = h[1].length;
      if (lv === 1) errs.push('第 ' + (i + 1) + ' 行用了 #（一級標題），內文從 ## 開始');
      else if (lv > lastLevel + 1) warns.push('第 ' + (i + 1) + ' 行標題跳級（' + '#'.repeat(lastLevel) + ' 下面直接 ' + h[1] + '）');
      lastLevel = lv;
    }
    if (/^(　|\s{2,})\S/.test(l) && !/^\s*[-*]|^\s*\d+\./.test(l)) warns.push('第 ' + (i + 1) + ' 行段首有空白／全形空格（網站會自動排版，不用空）');
  });
  const h2 = lines.filter(l => /^##\s/.test(l)).length;
  if (h2 < 3 || h2 > 6) warns.push('大標題（##）有 ' + h2 + ' 個，建議 3～6 個');
  if (bold > 5) warns.push('粗體 ' + bold + ' 處，建議 5 處以內');
  // 段落：一句一段最多 2 處
  const paras = body.split(/\n\s*\n/).map(s => s.trim()).filter(s => s && !/^(#|[-*] |\d+\.|!\[|>|\||<)/.test(s));
  const oneLiners = paras.filter(s => (s.match(/[。！？]/g) || []).length <= 1 && len(s) < 60);
  if (oneLiners.length > 2) warns.push('一句一段有 ' + oneLiners.length + ' 處（規範最多 2 處）：「' + oneLiners.slice(0, 3).map(s => s.slice(0, 18)).join('」「') + '」…');
  // 用詞
  if (/財庫/.test(body + (f.description || ''))) errs.push('用了「財庫」（大正的寫法不用這個說法，田宅宮講存款與資產）');
  [['注定', '不說「注定」'], ['一定會', '不說「一定會」'], ['開運', '不寫開運'], ['改運', '不寫改運']].forEach(([w, why]) => { if (body.includes(w)) warns.push('出現「' + w + '」：' + why + '（引用或否定句可以忽略）'); });
  if (/點這裡|按這裡|click here/i.test(body)) warns.push('連結文字寫「點這裡」，要寫清楚連去哪');
  if (/<!--|display\s*:\s*none|visibility\s*:\s*hidden/i.test(body)) errs.push('內文有隱藏文字或註解（不要放給 AI／搜尋引擎看的隱藏內容）');
  const internal = (body.match(/\]\((\/blog\/|\/topics\/|https:\/\/dazhen-site\.netlify\.app\/)/g) || []).length;
  if (internal < 1) warns.push('沒有內部連結（至少連 1 篇同主題文章或總綱）');
  if (/\d\s*(分鐘|小時|天|歲|元)/.test(body) && /[一-鿿]\d|\d[一-鿿]/.test(body.replace(/NT\$\d[\d,]*/g, ''))) warns.push('中文和數字之間建議留一個半形空格（例：60 分鐘）');
  faq.forEach(x => { if (x.q && body.includes(String(x.q).slice(0, 12))) warns.push('常見問題「' + String(x.q).slice(0, 16) + '…」也寫進內文了（faq 欄位就好）'); });
  return { errs, warns, title: f.title };
}

function listFiles() {
  const a = process.argv.slice(2);
  const isPost = f => /^content\/blog\/.+\.md$/.test(f) && !/_index\.md$/.test(f);
  if (a[0] === '--all') return fs.readdirSync(path.join(ROOT, 'content/blog')).filter(f => f.endsWith('.md') && f !== '_index.md').map(f => 'content/blog/' + f);
  if (a[0] === '--changed') {
    const base = a[1] || 'origin/main';
    const out = execSync('git diff -z --name-only --diff-filter=AMR ' + base + '...HEAD', { cwd: ROOT }).toString().split('\0');   // -z：中文檔名不會被加引號跳脫（Codex #18）
    return out.filter(isPost);
  }
  return a.map(f => path.relative(ROOT, path.resolve(f)));
}

const files = listFiles(), all = process.argv[2] === '--all';
if (!files.length) { console.log('沒有要檢查的文章'); process.exit(0); }
let bad = 0;
for (const f of files) {
  const r = checkFile(path.join(ROOT, f));
  console.log('\n■ ' + f + (r.title ? '（' + r.title + '）' : ''));
  if (!r.errs.length && !r.warns.length) console.log('  ✓ 全部符合');
  r.errs.forEach(e => console.log('  ✗ ' + e));
  r.warns.forEach(w => console.log('  △ ' + w));
  if (r.errs.length) bad++;
}
console.log('\n' + (bad ? bad + ' 篇有錯誤要修' : '沒有錯誤') + '（✗ 錯誤會擋上線、△ 提醒給審文參考）');
process.exit(bad && !all ? 1 : 0);
