# 產生 static/reply/index.html：python3 tools/gen-reply-page.py <dazhen-booking>/src/Mingshu.html static/reply/index.html
import re,sys
src=open(sys.argv[1]).read()
css=src[src.index('<style>')+7:src.index('</style>')]
css=css.replace('<?!= A ?>','/images/mingshu/').replace('<?!= SITE ?>','')
assert '<?' not in css
bk=re.search(r'<button class="bookwrap".*?</button>',src).group(0).replace('<?!= A ?>','/images/mingshu/')
assert '<?' not in bk
js=src[src.index('// 問題太長就先摺起來'):src.rindex('})();')]
html='''<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="referrer" content="no-referrer">
<title>紫微斗數文字諮詢｜大正命理諮詢</title>
<!-- 大正 11/18：文字諮詢閱讀頁改成網站自己畫。書和開場在這裡立刻出現，回覆內容在背景向預約系統拿（page=replyData，檢查跟以前一樣）。
     樣式與內頁照預約系統 src/Mingshu.html（tools/gen-reply-page.py 產生，改 Mingshu.html 後要重跑）。 -->
<link rel="preload" as="image" href="/images/mingshu/book2-closed.webp">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@300;400;600;900&display=swap">
<style>'''+css+'''
.ttl span.wait{opacity:.75}
.ld{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;min-height:60vh;font:15px/1.8 sans-serif;color:var(--ink-2)}
.ld i{width:30px;height:30px;border:3px solid #d9d2c3;border-top-color:var(--teal);border-radius:50%;animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.retry{margin-top:6px;font:600 15px sans-serif;color:var(--teal);background:rgba(255,255,255,.7);border:1px solid rgba(27,77,68,.35);border-radius:999px;padding:10px 22px;cursor:pointer}
</style>
</head>
<body>
<div class="stage" id="stage">
<section class="intro" id="intro" aria-label="打開你的紫微斗數文字諮詢">
  '''+bk+'''
  <div class="ttl"><b id="ttlName">紫微斗數文字諮詢</b><span id="ttlHint">點一下，翻開</span></div>
  <button class="skip" id="skip" type="button">略過</button>
</section>
<div class="rise">
<main class="book" id="book"><div class="page" id="page"><div class="ld"><i></i>載入中，請稍候…</div></div></main>
</div></div>
<script src="/js/dz-api.js"></script>
<script>
(function () {
  var q = new URLSearchParams(location.search), b = q.get('b') || '', t = q.get('t') || '', k = q.get('k') || '';
  var stage = document.getElementById('stage'), intro = document.getElementById('intro'), bk = document.getElementById('bk'), fr = bk.querySelectorAll(':scope > img'), page = document.getElementById('page');
  var hint = document.getElementById('ttlHint'), timers = [], data = null, wantOpen = false, key = '';
  var show = function (list) { for (var j = 0; j < fr.length; j++) fr[j].classList.toggle('on', list.indexOf(j) > -1); };
  var at = function (ms, fn) { timers.push(setTimeout(fn, ms)); };
  var done = function () { stage.classList.add('under', 'up', 'done'); try { if (key) localStorage.setItem(key, '1'); } catch (e) { } };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var msg = function (title, text, retry) {
    page.innerHTML = '<img class="head" alt="" src="/images/mingshu/emblem2.webp"><div class="msg"><h1 style="font-size:30px;letter-spacing:6px;text-indent:6px">' + title + '</h1><p>' + text + '</p>' + (retry ? '<button class="retry" type="button" id="retry">再試一次</button>' : '') + '</div>';
    if (retry) document.getElementById('retry').onclick = function () { location.reload(); };
    timers.forEach(clearTimeout); key = ''; done();
  };
  var play = function () {
    if (intro.classList.contains('opened')) return; intro.classList.add('opened');
    at(0, function () { show([1]); }); at(500, function () { show([2]); });
    at(1250, function () { show([2, 3]); }); at(1500, function () { show([2, 4]); }); at(1760, function () { show([2, 5]); }); at(2040, function () { show([2]); });
    at(1350, function () { stage.classList.add('under'); at(2000, done); });   // 翻頁的同時，內容直接淡入
  };
  if (!/^GRW?\\d{8}-\\d{2}$/.test(b) || !/^[0-9a-f]{32}$/.test(k || t)) { msg('這個連結打不開', '連結可能不完整。請回到 LINE、Email 或會員中心，重新按一次打開的按鈕。<br>還是打不開的話，直接在 LINE 跟大正說一聲。'); return; }
  var seen = false; try { seen = localStorage.getItem('ms-seen-' + b) === '1'; } catch (e) { }
  if (seen) done();   // 看過的：不再播開場，內容拿到就直接顯示
  else {
    at(60, function () { intro.classList.add('go'); });
    bk.onclick = function () { if (data) play(); else { wantOpen = true; hint.textContent = '內容準備中，馬上好…'; hint.classList.add('wait'); } };
    document.getElementById('skip').onclick = function () { timers.forEach(clearTimeout); done(); };
  }
  var params = { b: b }; if (k) params.k = k; else params.t = t;
  DZ_API.jsonp('replyData', params, 45000).then(function (d) {
    if (!d || !d.ok || typeof d.body !== 'string') { msg('目前無法開啟內容', '請稍後再試一次。還是打不開的話，直接在 LINE 跟大正說一聲。', true); return; }
    data = d; document.title = d.pageTitle || document.title;
    page.innerHTML = d.body;   // 預約系統產生、已跳脫的內頁
    afterBody();
    if (!d.intro) { timers.forEach(clearTimeout); done(); return; }   // 連結不對、已取消、已刪除、還在寫：直接顯示說明
    key = d.seenKey || '';
    if (d.name) document.getElementById('ttlName').innerHTML = esc(d.name) + '<br>' + esc(d.book || '紫微斗數文字諮詢');   // 一對一的「諮詢重點」書名不同（預約系統給）
    if (wantOpen) play(); else if (hint.classList.contains('wait')) { hint.textContent = '點一下，翻開'; hint.classList.remove('wait'); }
  }).catch(function () { msg('網路有點慢', '內容沒有載入成功，請按下面的按鈕再試一次。', true); });

  function afterBody() {
  '''+js+'''
  }
})();
</script>
</body>
</html>
'''
open(sys.argv[2],'w').write(html)
