/* 閱讀頁「下載 PDF」（大正 11/25：客人按一下就下載，版面和閱讀頁一樣，不用瀏覽器列印）。
 * 做法：把閱讀頁的內容複製到看不見的地方，排成一張張 A4 書頁（每一頁都有紙張底紋），
 *       只在「一個條列、一段話、一張問題卡」之間換頁，所以不會把字切一半；最後每頁拍成圖片放進 PDF。
 *       字型、印章、底紋都跟著圖片進去，客人的手機有沒有粉圓都一樣。
 * 用到的兩個程式庫放在 /js/vendor/（html2canvas 1.4.1、jsPDF 2.5.2，MIT），按下按鈕才載入。 */
(function () {
  var W = 560, H = Math.round(W * 297 / 210);   // A4 直式，用閱讀頁同樣的寬度排版
  var ATOM = 'li,p,.q,.ch-h,.dv,h1,.who,.run,img.head,.sign,.fine,.voice,.msg,.hint';
  var loaded = null;
  // 載入一個程式庫；已經載好就不再載。失敗時把那個 <script> 拿掉，下一次按按鈕會重新載
  function load(src, ready) {
    if (ready()) return Promise.resolve();
    return new Promise(function (ok, no) {
      var s = document.createElement('script'); s.src = src;
      s.onload = function () { ready() ? ok() : (s.remove(), no(new Error('載入失敗'))); };
      s.onerror = function () { s.remove(); no(new Error('載入失敗')); };
      document.head.appendChild(s);
    });
  }
  function libs() {
    if (!loaded) loaded = Promise.all([
      load('/js/vendor/html2canvas.min.js?v=1.4.1', function () { return typeof window.html2canvas === 'function'; }),
      load('/js/vendor/jspdf.umd.min.js?v=2.5.2', function () { return !!(window.jspdf && window.jspdf.jsPDF); })
    ]).catch(function (e) { loaded = null; throw e; });   // 失敗不留快取，客人再按一次會重新載入
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
      '.dzpdf-pg .dzpdf-cont::before{display:none}.dzpdf-pg .dzpdf-cont{margin-top:0}' +
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
  // 把 el 從第一個「底部超過 limit 的字」那一行切成兩塊：前半留在原地，後半是新的一塊接在後面（字一個都不少）
  function splitAtLine(el, limit) {
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), tn, r = document.createRange(), at = null;
    var lh = parseFloat(getComputedStyle(el.querySelector('.qt') || el).lineHeight) || 0;   // 行高比字高，字的下面還有半行空白要算進去
    var cs = getComputedStyle(el), pad = (parseFloat(cs.paddingBottom) || 0) + (parseFloat(cs.borderBottomWidth) || 0);   // 問題卡下面還有內距
    while (!at && (tn = walker.nextNode())) {
      for (var i = 0; i < tn.data.length; i++) {
        r.setStart(tn, i); r.setEnd(tn, i + 1);
        var rc = r.getClientRects(); if (!rc.length || !rc[0].height) continue;   // 換行字元這類沒有位置的字跳過
        if (rc[0].bottom + Math.max(0, (lh - rc[0].height) / 2) + pad > limit - 0.5) { at = { node: tn, off: i }; break; }
      }
    }
    if (!at) return null;
    var tail = document.createRange(); tail.setStart(at.node, at.off); tail.setEnd(el, el.childNodes.length);
    if (tail.toString() === el.textContent) return null;   // 第一行就放不下：整塊搬到下一頁就好
    var frag = tail.extractContents(), rest = el.cloneNode(false);
    rest.appendChild(frag); rest.classList.add('dzpdf-cont');
    // 前半段結尾、後半段開頭的換行和空白拿掉，不然會多一行空的
    var q = el.querySelector('.qt') || el; if (q.lastChild && q.lastChild.nodeType === 3) q.lastChild.data = q.lastChild.data.replace(/\s+$/, '');
    var q2 = rest.querySelector('.qt') || rest; if (q2.firstChild && q2.firstChild.nodeType === 3) q2.firstChild.data = q2.firstChild.data.replace(/^\s+/, '');
    el.parentNode.insertBefore(rest, el.nextSibling);
    return rest;
  }
  function paginate(host, inner) {
    var pages = [inner];
    var contentH = inner.clientHeight - parseFloat(getComputedStyle(inner).paddingTop) - parseFloat(getComputedStyle(inner).paddingBottom);
    for (var guard = 0; guard < 400; guard++) {
      var limit = inner.getBoundingClientRect().bottom - parseFloat(getComputedStyle(inner).paddingBottom);
      var list = atoms(inner), cut = -1;
      for (var i = 0; i < list.length; i++) if (list[i].getBoundingClientRect().bottom > limit + 0.5) { cut = i; break; }
      if (cut < 0) break;
      var big = list[cut], bt = big.getBoundingClientRect();
      // 這一塊比一整頁還高（很長的一段話、一個條列、一題）：不能整塊搬，照行切開，放得下的留在這頁
      if (bt.height > contentH - 2 || cut === 0) {
        var lh = parseFloat(getComputedStyle(big).lineHeight) || 30;
        if (limit - Math.max(bt.top, inner.getBoundingClientRect().top) >= lh * 2 || cut === 0) {
          if (splitAtLine(big, limit)) { list = atoms(inner); cut = list.indexOf(big) + 1; }
          else if (cut === 0) throw new Error('排版失敗');   // 連一行都放不下（不應該發生）：不做出缺字的 PDF
        }
      }
      while (cut > 1 && list[cut - 1].matches('.ch-h,.dv')) cut--;   // 小標、分隔線不要單獨留在頁尾
      if (cut >= list.length) break;
      if (cut === 0) throw new Error('排版失敗');
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
  // 做成圖片之前最後檢查：每一頁的內容都在頁面範圍內，而且所有頁面的字加起來和原頁面一樣（PDF 是圖片，事後沒辦法補）
  function check(pgs, src) {
    var norm = function (t) { return t.replace(/\s+/g, ''); }, all = '';
    var skip = '.acts,audio,.qmore,button,.dzpdf-no,.voice .t span';
    pgs.forEach(function (pg) {
      var inner = pg.querySelector('.page'), lim = inner.getBoundingClientRect().bottom - parseFloat(getComputedStyle(inner).paddingBottom) + 1;
      atoms(inner).forEach(function (a) { if (!a.closest(skip) && a.getBoundingClientRect().bottom > lim) throw new Error('排版超出頁面：' + (a.className || a.tagName)); });
      all += textOf(inner, skip);
    });
    if (norm(all) !== norm(textOf(src, skip))) throw new Error('排版後內容不一致');
  }
  function textOf(root, skip) { var c = root.cloneNode(true); [].slice.call(c.querySelectorAll(skip)).forEach(function (x) { x.remove(); }); return c.textContent; }
  /** 把閱讀頁（.page 元素）做成 PDF，回傳 Blob */
  window.DZ_PDF = {
    make: function (pageEl, opt) {
      opt = opt || {};
      return libs().then(function () { return document.fonts && document.fonts.ready; }).then(function () {
        css();
        var host = document.createElement('div'); host.className = 'dzpdf-host'; host.setAttribute('aria-hidden', 'true'); document.body.appendChild(host);
        var first = newPage(host); first.innerHTML = pageEl.innerHTML;
        var pgs;
        return waitImages(host).then(function () { return document.fonts && document.fonts.ready; }).then(function () {
          try { splitTallCards(first); pgs = paginate(host, first); check(pgs, pageEl); } catch (e) { host.remove(); throw e; }
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
