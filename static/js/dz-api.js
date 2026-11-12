// 預約系統的公開網址＋呼叫方式（精簡 C，2026-11-12）：付款回報、補傳照片、會員中心共用這一份。
// 預約系統換部署網址時，改這裡和 config.toml 的 bookingFormUrl 兩處就好（Hugo 頁面讀 config，獨立的靜態頁讀這裡）。
(function () {
  'use strict';
  var URL_ = 'https://script.google.com/macros/s/AKfycbx3aDlFDBayTKgvGtQMrWrpDMx3WuU5Yd3Uh4c6BJK5kmKpZnBsXH7fK97yrkQkgx9fkQ/exec';
  /** 用 JSONP 叫預約系統：page＝doGet 的 page，params 另外帶的參數，ms 逾時毫秒。回傳 Promise（逾時 timeout、連不上 network） */
  function jsonp(page, params, ms) {
    return new Promise(function (resolve, reject) {
      var cb = '__dz' + Date.now() + Math.floor(Math.random() * 100000), s = document.createElement('script');
      var timer = setTimeout(function () { clean(); reject(new Error('timeout')); }, ms || 60000);
      function clean() { clearTimeout(timer); try { delete window[cb]; } catch (e) { window[cb] = undefined; } if (s.parentNode) s.parentNode.removeChild(s); }
      window[cb] = function (d) { clean(); resolve(d); };
      s.onerror = function () { clean(); reject(new Error('network')); };
      var q = Object.keys(params || {}).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); }).join('&');
      s.src = URL_ + '?page=' + encodeURIComponent(page) + '&callback=' + cb + (q ? '&' + q : '');
      document.body.appendChild(s);
    });
  }
  window.DZ_API = { url: URL_, jsonp: jsonp };
})();
