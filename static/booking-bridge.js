(function () {
  'use strict';
  var nonce = '', redirected = false;
  window.dazhenBookingUrl = function (raw) {
    var url = new URL(raw);
    var bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    nonce = Array.from(bytes, function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    redirected = false;
    url.searchParams.set('bridge', nonce);
    return url.href;
  };
  // 表單回報自己的高度 → 把外框撐到剛好，整頁只剩一條捲軸
  window.addEventListener('message', function (event) {
    var d = event.data;
    if (!d || d.type !== 'dazhen-booking-height' || !nonce || d.nonce !== nonce) return;
    var o; try { o = new URL(event.origin); } catch (_) { return; }
    if (o.protocol !== 'https:' || !/^(?:[a-z0-9-]+\.)*googleusercontent\.com$/.test(o.hostname)) return;
    var h = Math.max(600, Math.min(20000, Number(d.height) || 0));
    document.querySelectorAll('iframe[data-booking-frame], .booking-iframe-wrap iframe').forEach(function (f) { f.style.height = (h + 24) + 'px'; });
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
    var text = '大正，我的訂單編號是「' + data.batchId + '」';
    var mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (mobile) {
      window.location.assign('https://line.me/R/oaMessage/' + encodeURIComponent(data.basicId) + '/?' + encodeURIComponent(text));
    } else {
      window.location.assign('/line-redirect/?batch=' + encodeURIComponent(data.batchId));
    }
  });
})();
