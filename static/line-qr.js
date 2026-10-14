// 「加入 LINE」按鈕：手機直接開 LINE；電腦跳出 QR Code 讓客人用手機掃（大正 2026-10-11 決定，不經 LINE 的網頁轉導）
// 用法：<a href="https://lin.ee/vlvPoMa" data-line> 任何加了 data-line 的連結都會套用
(function () {
  'use strict';
  var QR = '/images/line-qr.png', ID = '@159cibme', modal = null;
  function isPhone() { return window.matchMedia('(max-width: 767px), (pointer: coarse)').matches && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent); }
  function build() {
    if (modal) return modal;
    var css = document.createElement('style');
    css.textContent = '.lq-ov{position:fixed;inset:0;z-index:1000;background:rgba(15,22,40,.6);display:flex;align-items:center;justify-content:center;padding:16px}.lq-ov[hidden]{display:none}' +
      '.lq-box{background:#fff;border-radius:16px;padding:26px 26px 20px;max-width:340px;width:100%;text-align:center;color:#1b2845;font-family:inherit}' +
      '.lq-box h3{font-size:19px;margin:0}.lq-box img{width:200px;height:200px;margin:12px auto;display:block}.lq-box p{font-size:14px;color:#57534e;line-height:1.8;margin:0}' +
      '.lq-id{display:flex;gap:8px;justify-content:center;align-items:center;margin:10px 0 14px;font-size:14px}.lq-id code{background:#f5f3ef;padding:4px 10px;border-radius:6px;font-family:inherit}' +
      '.lq-id button,.lq-close{font-family:inherit;border:1px solid #e5e8ec;background:#fff;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:13px;color:#1b2845}.lq-close{width:100%;padding:9px;font-size:14px}';
    document.head.appendChild(css);
    modal = document.createElement('div'); modal.className = 'lq-ov'; modal.hidden = true;
    modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.setAttribute('aria-label', '加入大正的 LINE');
    modal.innerHTML = '<div class="lq-box"><h3>用手機掃描，加入大正的 LINE</h3><img src="' + QR + '" alt="大正官方 LINE 加好友 QR Code" width="200" height="200">' +
      '<p>打開手機 LINE 的「加入好友」→「行動條碼」掃描。</p><div class="lq-id">LINE ID <code>' + ID + '</code><button type="button" class="lq-copy">複製</button></div>' +
      '<button type="button" class="lq-close">關閉</button></div>';
    document.body.appendChild(modal);
    modal.addEventListener('click', function (e) { if (e.target === modal || e.target.classList.contains('lq-close')) modal.hidden = true; });
    modal.querySelector('.lq-copy').addEventListener('click', function () {
      var b = this; try { navigator.clipboard.writeText(ID).then(function () { b.textContent = '已複製'; }); } catch (err) {}
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') modal.hidden = true; });
    return modal;
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-line]'); if (!a || isPhone()) return;
    e.preventDefault(); build().hidden = false; modal.querySelector('.lq-close').focus();
  });
})();
