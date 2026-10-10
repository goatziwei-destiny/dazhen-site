(function () {
  'use strict';
  var nonce = '', redirected = false, started = false;
  function track(name, params, done) {
    if (window.dzTrack) window.dzTrack(name, params, done); else if (done) done();
  }
  // 把網頁捲到表單頂端（扣掉固定在上方的導覽列）。立即捲、之後再補捲兩次：表單高度變動會讓第一次捲動被「吃掉」，客人就得自己再滑一下
  function scrollFrame_() {
    var go = function () {
      try {
        var fr = document.querySelector('iframe[data-booking-frame]'); if (!fr) return;
        var hd = document.querySelector('.site-nav, header, nav'), off = 0;
        if (hd) { var cs = getComputedStyle(hd); if (cs.position === 'fixed' || cs.position === 'sticky') off = hd.offsetHeight || 0; }
        window.scrollTo(0, Math.max(0, fr.getBoundingClientRect().top + (window.pageYOffset || 0) - off - 8));
      } catch (_) {}
    };
    go(); setTimeout(go, 300); setTimeout(go, 900);
  }
  window.dazhenBookingUrl = function (raw) {
    var url = new URL(raw);
    var bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    nonce = Array.from(bytes, function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    redirected = false;
    track('booking_view', { page: location.pathname });
    url.searchParams.set('bridge', nonce);
    var tf = new URLSearchParams(location.search).get('testfill'); if (tf) url.searchParams.set('testfill', tf);
    return url.href;
  };
  // 表單回報自己的高度 → 把外框撐到剛好，整頁只剩一條捲軸
  window.addEventListener('message', function (event) {
    var d = event.data;
    if (!d || d.type !== 'dazhen-booking-height' || !nonce || d.nonce !== nonce) return;
    var o; try { o = new URL(event.origin); } catch (_) { return; }
    if (o.protocol !== 'https:' || !/^(?:[a-z0-9-]+\.)*googleusercontent\.com$/.test(o.hostname)) return;
    var ld = document.getElementById('bkLoading'); if (ld) ld.remove();
    var h = Math.max(600, Math.min(20000, Number(d.height) || 0));
    document.querySelectorAll('iframe[data-booking-frame], .booking-iframe-wrap iframe').forEach(function (f) { f.style.height = (h + 24) + 'px'; });
  });
  // 表單回報「客人開始填寫」→ 記錄漏斗第 ③ 步（每次打開只記一次）
  window.addEventListener('message', function (event) {
    var d = event.data;
    if (started || !d || d.type !== 'dazhen-booking-start' || !nonce || d.nonce !== nonce) return;
    var o; try { o = new URL(event.origin); } catch (_) { return; }
    if (o.protocol !== 'https:' || !/^(?:[a-z0-9-]+\.)*googleusercontent\.com$/.test(o.hostname)) return;
    started = true;
    track('booking_form_start', { page: location.pathname });
  });
  // 「處理中」畫面：由網站顯示，固定在螢幕正中間（表單在框框裡，自己顯示會跑到畫面外，客人要滑才看得到）
  function busyOv_(on, title, text) {
    var o = document.getElementById('dzBusyOv');
    if (!on) { if (o) o.style.display = 'none'; return; }
    if (!o) {
      o = document.createElement('div'); o.id = 'dzBusyOv';
      o.setAttribute('role', 'status'); o.setAttribute('aria-live', 'polite');
      o.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:rgba(255,255,255,.94);display:flex;align-items:center;justify-content:center;padding:24px;text-align:center';
      o.innerHTML = '<div style="max-width:320px"><div class="dz-sp" style="width:44px;height:44px;margin:0 auto 16px;border:4px solid #e5e7eb;border-top-color:#8b5e3c;border-radius:50%;animation:dzspin .9s linear infinite"></div><b style="display:block;font-size:17px;margin-bottom:8px;color:#1f2937"></b><span style="font-size:13.5px;color:#6b7280;line-height:1.7"></span></div>';
      var st = document.createElement('style'); st.textContent = '@keyframes dzspin{to{transform:rotate(360deg)}}'; document.head.appendChild(st);
      document.body.appendChild(o);
    }
    o.querySelector('b').textContent = String(title || '處理中，請稍候…').slice(0, 40);
    // 只接受表單送來的固定文字，換行用 <br>；其他一律當純文字
    var sp = o.querySelector('span'); sp.textContent = '';
    String(text || '').split(/<br\s*\/?>/i).slice(0, 4).forEach(function (line, i) { if (i) sp.appendChild(document.createElement('br')); sp.appendChild(document.createTextNode(line.slice(0, 120))); });
    o.style.display = 'flex';
  }
  window.addEventListener('message', function (event) {
    var d = event.data;
    if (!d || d.type !== 'dazhen-booking-busy' || !nonce || d.nonce !== nonce) return;
    var o; try { o = new URL(event.origin); } catch (_) { return; }
    if (o.protocol !== 'https:' || !/^(?:[a-z0-9-]+\.)*googleusercontent\.com$/.test(o.hostname)) return;
    busyOv_(!!d.on, d.title, d.text);
  });
  // 客人按下送出：把網頁捲到表單頂端，才看得到「預約處理中」
  window.addEventListener('message', function (event) {
    var d = event.data;
    if (!d || d.type !== 'dazhen-booking-scroll' || !nonce || d.nonce !== nonce) return;
    var o; try { o = new URL(event.origin); } catch (_) { return; }
    if (o.protocol !== 'https:' || !/^(?:[a-z0-9-]+\.)*googleusercontent\.com$/.test(o.hostname)) return;
    scrollFrame_();
  });
  // 客人回報完匯款：把網頁捲回成功頁頂端，才看得到「已收到您的匯款回報」
  window.addEventListener('message', function (event) {
    var d = event.data;
    if (!d || d.type !== 'dazhen-booking-reported' || !nonce || d.nonce !== nonce) return;
    var o; try { o = new URL(event.origin); } catch (_) { return; }
    if (o.protocol !== 'https:' || !/^(?:[a-z0-9-]+\.)*googleusercontent\.com$/.test(o.hostname)) return;
    busyOv_(false);
    scrollFrame_();
    // 頁首那句「填好出生資料…」已經不適用 → 換成可以關閉的提示
    try { var ld = document.querySelector('.bk-lead'); if (ld) { ld.textContent = '✅ 已完成所有步驟，您現在可以關閉此頁面。'; ld.style.color = '#166534'; ld.style.fontWeight = '700'; } } catch (_) {}
  });
  window.addEventListener('message', function (event) {
    var data = event.data;
    if (redirected || !nonce || !data || data.type !== 'dazhen-booking-success' || data.nonce !== nonce) return;
    // The Apps Script UI is a nested googleusercontent iframe; its WindowProxy differs from the outer frame.
    var origin;
    try { origin = new URL(event.origin); } catch (_) { return; }
    if (origin.protocol !== 'https:' || !/^(?:[a-z0-9-]+\.)*googleusercontent\.com$/.test(origin.hostname)) return;
    if (!/^GR\d{8}-\d{2}$/.test(data.batchId) || !/^@[a-zA-Z0-9._-]+$/.test(data.basicId)) return;
    redirected = true;
    busyOv_(false);
    // 送出後表單會縮短、成功頁出現在最上面；把網頁捲回表單頂端，避免手機畫面還停在原本很下面的位置而看不到成功頁
    scrollFrame_();
    var text = '大正，我的訂單編號是' + data.batchId;
    var mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    // 選 Google Meet／文字版（flow=email）：客人留在預約成功頁，在網頁回報匯款，不用加 LINE。
    // 選 LINE 語音：手機直接開啟 LINE 並帶入訂單編號；電腦不跳轉，成功頁上就有 QR Code。
    var go = (data.flow === 'line' && mobile) ? 'https://line.me/R/oaMessage/' + encodeURIComponent(data.basicId) + '/?' + encodeURIComponent(text) : '';
    // 先把「送出成功」送到 GA（最多等 1.3 秒）；需要跳轉才跳轉，沒有 GA 就立刻跳
    track('booking_submit', { page: location.pathname, device: mobile ? 'mobile' : 'desktop', flow: data.flow === 'email' ? 'email' : (data.flow === 'bound' ? 'bound' : 'line') }, function () { if (go) window.location.assign(go); });
  });
})();
