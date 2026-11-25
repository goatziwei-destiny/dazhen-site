/* 閱讀頁「下載 PDF」（大正 11/25：客人按一下就下載，版面和閱讀頁一樣，不用瀏覽器列印）。
 * 做法：把閱讀頁的內容複製到看不見的地方，排成一張張 A4 書頁（每一頁都有紙張底紋），
 *       只在「一個條列、一段話、一張問題卡」之間換頁，所以不會把字切一半；最後每頁拍成圖片放進 PDF。
 *       字型、印章、底紋都跟著圖片進去，客人的手機有沒有粉圓都一樣。
 * 用到的兩個程式庫放在 /js/vendor/（html2canvas 1.4.1、jsPDF 2.5.2，MIT），按下按鈕才載入。 */
(function () {
  var W = 560, H = Math.round(W * 297 / 210);   // A4 直式，用閱讀頁同樣的寬度排版
  var ATOM = 'li,p,.q,.ch-h,.dv,h1,.who,.run,img.head,.sign,.fine,.voice,.msg,.hint';
  var loaded = null;
  function load(src) { return new Promise(function (ok, no) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = function () { no(new Error('載入失敗')); }; document.head.appendChild(s); }); }
  function libs() {
    if (!loaded) loaded = Promise.all([load('/js/vendor/html2canvas.min.js?v=1.4.1'), load('/js/vendor/jspdf.umd.min.js?v=2.5.2')]);
    return loaded;
  }
  function css() {
    if (document.getElementById('dzPdfCss')) return;
    var st = document.createElement('style'); st.id = 'dzPdfCss';
    st.textContent = '.dzpdf-host{position:fixed;left:-20000px;top:0;width:' + W + 'px;pointer-events:none}' +
      '.dzpdf-pg{width:' + W + 'px;height:' + H + 'px;min-height:0;overflow:hidden;position:relative;margin:0 0 20px}' +
      '.dzpdf-pg .page{max-width:none;height:100%;margin:0;padding:34px 36px 46px;overflow:hidden}' +
      '.dzpdf-pg .acts,.dzpdf-pg audio,.dzpdf-pg .qmore,.dzpdf-pg button{display:none!important}' +
      '.dzpdf-pg .voice .t span{display:none}' +
      '.dzpdf-pg .q.fold .qt{max-height:none;-webkit-mask-image:none;mask-image:none}' +
      // html2canvas 不支援 border-image：問題卡的橘色水彩改成拉伸的底圖，看起來一樣
      '.dzpdf-pg .q{border:0;padding:26px 30px 24px 44px;background:url("/images/mingshu/qwash.webp") center/100% 100% no-repeat}' +
      '.dzpdf-pg .q::before{left:2px;top:-6px}' +
      '.dzpdf-pg .sign .tx{z-index:0}.dzpdf-pg .seal{mix-blend-mode:normal;z-index:-1}' +
      '.dzpdf-pg .dzpdf-no{position:absolute;left:0;right:0;bottom:16px;text-align:center;font-size:11px;letter-spacing:2px;color:#6a6256}';
    document.head.appendChild(st);
  }
  function newPage(host) {
    var pg = document.createElement('main'); pg.className = 'book dzpdf-pg';
    var inner = document.createElement('div'); inner.className = 'page'; pg.appendChild(inner); host.appendChild(pg);
    return inner;
  }
  // 依文件順序列出所有「不能切開」的小塊
  function atoms(root) { return [].slice.call(root.querySelectorAll(ATOM)).filter(function (el) { return !el.parentElement.closest(ATOM) || el.parentElement === root; }); }
  // 從 node 開始（含）把後面的內容整個搬到 dest；中間的外框（section、ul、.take）在新頁複製一個空殼接著放
  function moveFrom(node, inner, dest) {
    var chain = [], n = node;
    while (n && n !== inner) { chain.unshift(n); n = n.parentElement; }
    var target = dest;
    for (var i = 0; i < chain.length; i++) {
      var el = chain[i], after = [], s = el.nextElementSibling;
      while (s) { after.push(s); s = s.nextElementSibling; }
      if (i < chain.length - 1) {   // 外框：新頁放一個空殼裝 el 的後半段，el 後面的兄弟排在空殼後面
        var shell = el.cloneNode(false); target.appendChild(shell);
        after.forEach(function (m) { target.appendChild(m); });
        target = shell;
      } else {
        target.appendChild(el);
        after.forEach(function (m) { target.appendChild(m); });
      }
    }
  }
  // 問題卡比三分之一頁還高（題目很多）：照行拆成好幾張卡，才能在卡和卡之間換頁
  function splitTallCards(inner) {
    var max = (H - 34 - 46) * 0.3;
    [].slice.call(inner.querySelectorAll('.q')).forEach(function (q) {
      var qt = q.querySelector('.qt'); if (!qt || q.offsetHeight <= max) return;
      var lines = qt.textContent.split('\n'), cur = null;
      lines.forEach(function (ln) {
        if (!cur) { cur = q.cloneNode(false); cur.innerHTML = '<span class="qt"></span>'; q.parentNode.insertBefore(cur, q); }
        var t = cur.firstChild, before = t.textContent; t.textContent = before ? before + '\n' + ln : ln;
        if (cur.offsetHeight > max && before) { t.textContent = before;
          cur = q.cloneNode(false); cur.innerHTML = '<span class="qt"></span>'; q.parentNode.insertBefore(cur, q); cur.firstChild.textContent = ln; }
      });
      q.remove();
    });
  }
  function paginate(src, host) {
    var pages = [], inner = newPage(host);
    inner.innerHTML = src.innerHTML; pages.push(inner);
    splitTallCards(inner);
    for (var guard = 0; guard < 200; guard++) {
      var limit = inner.getBoundingClientRect().bottom - parseFloat(getComputedStyle(inner).paddingBottom);
      var list = atoms(inner), cut = -1;
      for (var i = 0; i < list.length; i++) if (list[i].getBoundingClientRect().bottom > limit + 0.5) { cut = i; break; }
      if (cut < 0) break;
      if (cut === 0) cut = 1;   // 一塊就比一頁高（很少見）：讓它自己一頁，超出的部分會被裁掉
      while (cut > 1 && list[cut - 1].matches('.ch-h,.dv')) cut--;   // 小標、分隔線不要單獨留在頁尾
      if (cut >= list.length) break;
      var next = newPage(host);
      moveFrom(list[cut], inner, next);
      // 新頁開頭的分隔線拿掉；搬空的外框拿掉
      var f = atoms(next)[0]; if (f && f.matches('.dv')) f.remove();
      [].slice.call(inner.querySelectorAll('section,ul,.take')).forEach(function (el) { if (!el.querySelector(ATOM)) el.remove(); });
      inner = next; pages.push(inner);
    }
    pages.forEach(function (p, i) { var no = document.createElement('div'); no.className = 'dzpdf-no'; no.textContent = (i + 1) + ' / ' + pages.length; p.parentElement.appendChild(no); });
    return pages.map(function (p) { return p.parentElement; });
  }
  function waitImages(host) {
    return Promise.all([].slice.call(host.querySelectorAll('img')).map(function (im) { return im.complete ? 0 : new Promise(function (ok) { im.onload = im.onerror = ok; }); }));
  }
  /** 把閱讀頁（.page 元素）做成 PDF，回傳 Blob */
  window.DZ_PDF = {
    make: function (pageEl, opt) {
      opt = opt || {};
      return libs().then(function () { return document.fonts && document.fonts.ready; }).then(function () {
        css();
        var host = document.createElement('div'); host.className = 'dzpdf-host'; host.setAttribute('aria-hidden', 'true'); document.body.appendChild(host);
        var pgs = paginate(pageEl, host);
        return waitImages(host).then(function () { return document.fonts && document.fonts.ready; }).then(function () {
          var JsPDF = window.jspdf.jsPDF, doc = new JsPDF({ unit: 'mm', format: 'a4', compress: true });
          var chain = Promise.resolve();
          pgs.forEach(function (pg, i) {
            chain = chain.then(function () {
              return window.html2canvas(pg, { scale: opt.scale || 2, backgroundColor: '#f6f2ea', useCORS: true, logging: false, width: W, height: H, windowWidth: W }).then(function (cv) {
                if (i) doc.addPage();
                doc.addImage(cv.toDataURL('image/jpeg', 0.86), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
              });
            });
          });
          return chain.then(function () {
            if (opt.title) doc.setProperties({ title: opt.title, author: '大正命理諮詢' });
            host.remove();
            return doc.output('blob');
          }, function (e) { host.remove(); throw e; });
        });
      });
    },
    // 存檔：iPhone、iPad 用分享面板（可選「儲存到檔案」）；其他（電腦、Android）直接下載
    save: function (blob, name) {
      var file = null; try { file = new File([blob], name, { type: 'application/pdf' }); } catch (e) { }
      var ios = /iPhone|iPad|iPod/i.test(navigator.userAgent || '') || (/Macintosh/.test(navigator.userAgent || '') && navigator.maxTouchPoints > 1);
      if (ios && file && navigator.canShare && navigator.canShare({ files: [file] })) return navigator.share({ files: [file], title: name }).catch(function (e) { if (e && e.name === 'AbortError') return; return dl(); });
      return Promise.resolve(dl());
      function dl() { var u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 60000); }
    }
  };
})();
