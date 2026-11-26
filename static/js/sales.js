/* 銷售頁（/voice/、/text/）
 * 2026-11-26 從對話裡的預覽搬過來（交接：claude/handoff/銷售頁_語音與文字版定案交接_2026-11-26.md）。
 * - 頁面上的字（data-k）預設寫在 data/sales.json，後台「設定 → 網站 → 銷售頁」改過的會蓋掉（?page=siteConfig）。
 * - 動畫裡的示範內容（小安、表單範例、STEP 動畫）固定寫在這裡，不開放後台改（大正 11/26：改了容易跑版）。
 * - 價格讀後台的實際費用（feeVoice／feeText）。
 * - 後台預覽（?dzpreview=1）：用還沒存的草稿畫頁面，點字會跳到那一格（跟首頁同一套做法）。
 */
(function () {
'use strict';
var CFG = window.SALES || {}, KIND = CFG.kind === 'text' ? 'text' : 'voice';
var V = Object.assign({}, CFG.defaults || {}), FEE = CFG.fee;
var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
var cl = function (x, a, b) { a = a == null ? 0 : a; b = b == null ? 1 : b; return Math.max(a, Math.min(b, x)); }, eo = function (x) { return 1 - Math.pow(1 - cl(x), 3); };
var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
var br = function (s) { return esc(s).replace(/\r?\n/g, '<br>'); };
/* 後台可改的字：外面包一層 data-k，後台預覽點得到 */
var T = function (k, tag) { tag = tag || 'span'; return '<' + tag + ' data-k="' + k + '">' + br(V[k]) + '</' + tag + '>'; };
var lines = function (k) { return String(V[k] || '').split(/\r?\n/).map(function (x) { return x.trim(); }).filter(Boolean); };
var price = function () { return 'NT$' + Number(FEE || 0).toLocaleString('en-US'); };
var AV = '/images/avatar-goat.webp', QR = '/images/line-qr.png', IM = function (n) { return '/images/mingshu/' + n + '.webp'; };
var LINE = function (cls, k) { return '<a class="' + cls + '" href="' + esc(CFG.lineUrl || '') + '" target="_blank" rel="noopener" data-line>' + T(k) + '</a>'; };
var BOOK = function (cls, k) { return '<a class="' + cls + '" href="' + esc(CFG.bookUrl || '/booking/') + '">' + T(k) + '</a>'; };
var P = KIND === 'text' ? 'tx' : 'sv';
var CHEV = '<svg class="chev" viewBox="0 0 26 28" aria-hidden="true"><path d="M5 5l8 8 8-8"/><path d="M5 14l8 8 8-8"/></svg>';
var ICON = {
 call: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg>',
 chart: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>',
 face: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M9 10h.01M15 10h.01M8.5 14.5c1 1.2 2.1 1.8 3.5 1.8s2.5-.6 3.5-1.8"/></svg>',
 doc: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l4 4v14H6z"/><path d="M9 12h7M9 16h7"/></svg>',
 msg: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4z"/></svg>',
 dl: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
 nocal: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16M6 4l12 17"/></svg>',
 nophone: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h4l2 5-2.5 1.5a11 11 0 0 0 5 5L16 12l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2zM3 3l18 18"/></svg>',
 line: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/></svg>'
};
var card = function (icon, kt, kd, cls) { return '<div class="card gcard' + (cls ? ' ' + cls : '') + '"><i>' + ICON[icon] + '</i><div>' + T(kt, 'b') + T(kd) + '</div></div>'; };
var title = function (k) { return '<h2 class="sec-title"><span class="hl">' + T(k) + '</span></h2>'; };
var lead = function (k) { return T(k, 'p').replace('<p ', '<p class="lead" '); };
var steps = function (pre) { return '<ol class="steps hsteps">' + [1, 2, 3, 4].map(function (n) { return '<li><div class="sn"><small>STEP</small><b>' + n + '</b></div><div class="bx">' + T(pre + n + 'T', 'b') + T(pre + n + 'D') + '</div></li>'; }).join('') + '</ol>'; };
var NOTES = (CFG.rules || []).map(function (r, i) { return { t: r[0], d: r[1], n: i + 1 }; });   // 語音頁完整預約規則（後台「預約須知」note1~6）
var rules = function () {
 var list = NOTES.map(function (r) { return '<li><b data-k="note' + r.n + 'Title">' + esc(r.t) + '</b><span data-k="note' + r.n + 'Desc">' + br(r.d) + '</span></li>'; });
 return '<ul class="rules" style="margin-top:18px;max-width:760px">' + list.join('') + '</ul><a class="more" href="/services/#faq" style="display:inline-block;margin-top:16px;font-weight:700;color:var(--clay);border-bottom:2px solid currentColor">還有其他問題？看常見問題 →</a>';
};
var memtip = function (kt, kd) { return '<div class="memtip">' + T(kt, 'b') + T(kd) + '</div>'; };
var ctaBand = function () { return '<section class="cta-band"><div class="wrap">' + T(P + 'CtaTitle', 'h2') + '<p>' + T(P + 'CtaName') + '　' + price() + '／' + (KIND === 'text' ? T('txPriceUnit') : '60 分鐘') + '</p><div class="cta-row">' + BOOK('btn btn-brass', P + 'BookBtn') + '<div class="qr"><img src="' + QR + '" alt="LINE QR Code" width="84" height="84"><div><small>或掃 QR Code 加 LINE</small><small>LINE 搜尋 ID</small><b>' + esc(CFG.lineId || '') + '</b></div></div></div></div></section>'; };
var ctaBtns = function () { return '<div class="cta-btns">' + BOOK('btn btn-brass', P + 'BookBtn') + LINE('btn btn-navy', P + 'LineBtn') + '</div>'; };

/* ================= 語音版：手機動畫（字固定，不開放後台改） ================= */
var CH_V = [
 { tab: '你會得到', title: '陪你把命盤看清楚', short: '60 分鐘語音，面相不另收費', dur: 9 },
 { tab: '要準備的', title: '出生資料和想問的事', short: '性別、西元生日、出生時間、想問的事', dur: 8 },
 { tab: '怎麼進行', title: '60 分鐘這樣聊', short: '先定盤，確認完才開始計時', dur: 9 },
 { tab: '定盤與退費', title: '無法定盤，全額退費', short: '若無法定盤，即結束論命並全額退費', dur: 6.5 },
 { tab: '預約', title: '想好好聊一次？', dur: 3 }];
var STEPS_V = [['先定盤', '核對幾件過去的事，確認完才計時'], ['聽你說近況', '最想弄清楚的是什麼'], ['一起看盤', '一問一答，互相討論'], ['整理重點', '今天的結論和下一步']];
function sceneV(i) {
 if (i == 0) return '<div class="sc"><div class="call"><img src="' + AV + '" alt=""><div class="nm">大正命理諮詢</div><div class="st" data-timer>語音通話中　00:00</div><div class="wave">' + Array.from({ length: 15 }, function (_, k) { return '<b data-wv="' + k + '"></b>'; }).join('') + '</div></div>' +
  '<div class="cds"><div class="cd" data-in="0.5"><i>' + ICON.call + '</i><div><b>60 分鐘一對一</b><span>語音通話，不開鏡頭</span></div></div><div class="cd" data-in="1.3"><i>' + ICON.chart + '</i><div><b>一起看你的命盤</b><span>聽不懂隨時問，一問一答</span></div></div><div class="cd" data-in="2.1"><i>' + ICON.face + '</i><div><b>加看面相</b><span>不另收費</span></div></div></div></div>';
 if (i == 1) return '<div class="sc"><div class="fh">預約表單</div><div class="fb">' +
  '<div class="lbl">性別</div><div class="seg"><div data-on="0.6">男</div><div>女</div></div>' +
  '<div class="lbl">西元出生日期</div><div class="fld" data-type="1.0,2.0" data-ok="2.1">1990 年 5 月 12 日</div>' +
  '<div class="lbl">出生時間</div><div class="fld" data-type="2.3,3.0" data-ok="3.1">早上 8:30</div>' +
  '<div class="lbl">想問的事（想不清楚也沒關係）</div><div class="fld ta" data-type="3.5,6.0">最近在考慮換工作，想知道方向對不對。</div></div></div>';
 if (i == 2) return '<div class="sc"><div class="chip" data-in="0.2">⏱ 60 分鐘</div><div class="tl">' + STEPS_V.map(function (s, k) { return '<div class="st4" data-st="' + (0.6 + k * 1.6) + '"><div class="dot">' + (k + 1) + '</div>' + (k < 3 ? '<div class="ln"></div>' : '') + '<b>' + s[0] + '</b><span>' + s[1] + '</span></div>'; }).join('') + '</div></div>';
 if (i == 3) return '<div class="sc"><div class="rf-top" data-in="0.1"><span class="pill">放心預約</span></div>' +
  '<div class="rf-step" data-in="0.5"><div class="dot"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.5"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/></svg></div><div><b>先定盤</b><span>核對幾件過去的事</span></div></div>' +
  '<div class="rf-br"><div class="rf-b ok" data-in="1.5"><i>✓</i><div><b>定盤成功</b><span>開始計時，進入 60 分鐘</span></div></div><div class="rf-b no" data-in="2.6"><i>✗</i><div><b>若無法定盤<br>即結束論命<br>並全額退費</b></div></div></div></div>';
 return '<div class="sc cta-sc"><img src="' + AV + '" alt="" data-pop><div class="t" data-in="0.3">想好好聊一次？</div><div class="s" data-in="0.6">一對一語音諮詢</div><a class="b1" href="' + esc(CFG.bookUrl) + '" data-in="0.9">預約一對一語音諮詢</a><a class="b2" href="' + esc(CFG.lineUrl) + '" target="_blank" rel="noopener" data-line data-in="1.3">加 LINE 先問問題</a></div>';
}
function phoneHTML(only, bare, scene, count) { scene = scene || sceneV; var n = only == null ? Array.from({ length: count || 5 }, function (_, k) { return k; }) : [only]; return '<div class="phone' + (bare ? ' bare' : '') + '"><div class="scr"><div class="notch"></div>' + n.map(function (k) { return scene(k); }).join('') + '</div></div>'; }

function Stage(root, o) {
 var self = this; this.root = root; this.o = Object.assign({ advance: true, only: null, autostart: true, pw: 300 }, o || {});
 root.style.setProperty('--pw', this.o.pw + 'px'); this.chs = this.o.chs || CH_V; root.innerHTML = phoneHTML(this.o.only, this.o.bare, this.o.scene, this.chs.length);
 this.scenes = $$('.sc', root).map(function (el, k) {
  return { el: el, ch: self.o.only == null ? k : self.o.only, types: $$('[data-type]', el).map(function (t) { var ab = t.dataset.type.split(','); return { el: t, txt: t.textContent, a: +ab[0], b: +ab[1] }; }), ins: $$('[data-in]', el), oks: $$('[data-ok]', el), ons: $$('[data-on]', el), sts: $$('[data-st]', el), wv: $$('[data-wv]', el), timer: $('[data-timer]', el), pop: $('[data-pop]', el) };
 });
 this.cur = -1; this.lt = 0; this.playing = true; this.vis = false; this.listeners = [];
 this.io = new IntersectionObserver(function (e) { var v = e[0].isIntersecting; if (v && !self.vis && self.o.restartOnView && self.cur >= 0) self.go(self.cur); self.vis = v; if (v && self.cur < 0 && self.o.autostart) self.go(self.o.only == null ? 0 : self.o.only); }, { threshold: .35 });
 this.io.observe(root); this.alive = true; this.last = performance.now(); requestAnimationFrame(function (t) { self.tick(t); });
}
Stage.prototype.on = function (fn) { this.listeners.push(fn); };
Stage.prototype.emit = function () { var s = this; this.listeners.forEach(function (f) { f(s.cur); }); };
Stage.prototype.go = function (i) { var s = this; this.cur = i; this.lt = RM ? 99 : 0; this.scenes.forEach(function (x) { x.el.classList.toggle('on', x.ch === i); }); this.render(); this.emit(); };
Stage.prototype.tick = function (now) {
 var s = this; if (!this.alive || !this.root.isConnected) { this.alive = false; this.io.disconnect(); return; }
 var dt = Math.min(.1, (now - this.last) / 1000); this.last = now;
 if (this.cur >= 0 && this.vis && this.playing && !RM && !document.hidden) { var d = this.chs[this.cur].dur; if (this.lt < d + .6) { this.lt += dt; this.render(); } else if (this.o.advance && this.cur < this.chs.length - 1) this.go(this.cur + 1); }
 requestAnimationFrame(function (t) { s.tick(t); });
};
Stage.prototype.render = function () {
 var cur = this.cur, s = this.scenes.filter(function (x) { return x.ch === cur; })[0]; if (!s) return; var lt = this.lt;
 s.ins.forEach(function (el) { var k = eo((lt - (+el.dataset.in)) / .45); el.style.opacity = k; el.style.transform = 'translateY(calc(var(--u) * ' + ((1 - k) * 18) + '))'; });
 s.types.forEach(function (t) { var n = Math.round(cl((lt - t.a) / (t.b - t.a)) * t.txt.length); t.el.textContent = t.txt.slice(0, n) + (lt >= t.a && lt < t.b + .2 && Math.floor(lt * 3) % 2 == 0 ? '｜' : ''); });
 s.oks.forEach(function (e) { e.classList.toggle('ok', lt >= +e.dataset.ok); }); s.ons.forEach(function (e) { e.classList.toggle('on', lt >= +e.dataset.on); }); s.sts.forEach(function (e) { e.classList.toggle('on', lt >= +e.dataset.st); });
 s.wv.forEach(function (b, k) { b.style.height = 'calc(var(--u) * ' + (10 + 46 * Math.abs(Math.sin(lt * 6 + k * .8) * Math.sin(lt * 2.3 + k * .3))) + ')'; });
 if (s.timer) { var x = Math.floor(Math.max(0, lt) * 7 + 754); s.timer.textContent = '語音通話中　' + String(Math.floor(x / 60)).padStart(2, '0') + ':' + String(x % 60).padStart(2, '0'); }
 if (s.pop) { var k = eo((lt - .1) / .4); s.pop.style.opacity = k; s.pop.style.transform = 'scale(' + (.6 + .4 * k) + ')'; }
};

/* ================= 語音版：頁面 ================= */
var SV = {
 get: function () { return '<section class="sec"><div class="wrap">' + title('svGetTitle') + lead('svGetLead') + '<div class="stack">' + card('call', 'svGet1T', 'svGet1D') + card('chart', 'svGet2T', 'svGet2D') + card('face', 'svGet3T', 'svGet3D') + '</div></div></section>'; },
 prep: function () { return '<section class="sec paper"><div class="wrap">' + title('svPrepTitle') + lead('svPrepLead') + '<div class="grid2"><div class="card"><ul class="prep" data-k="svPrepList">' + lines('svPrepList').map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div><div class="card"><ul class="note" style="list-style:disc" data-k="svPrepNotes">' + lines('svPrepNotes').map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div></div></div></section>'; },
 call: function () { return '<section class="sec"><div class="wrap">' + title('svCallTitle') + lead('svCallLead') + '<div class="stack">' + card('call', 'svCall1T', 'svCall1D') + card('line', 'svCall2T', 'svCall2D') + '</div></div></section>'; },
 how: function () { return '<section class="sec"><div class="wrap">' + title('svHowTitle') + lead('svHowLead') + '<ol class="steps flow">' + [1, 2, 3, 4, 5].map(function (n) { return V['svFlow' + n + 'T'] ? '<li><div class="sn"><small>STEP</small><b>' + n + '</b></div><div class="bx">' + T('svFlow' + n + 'W', 'small') + T('svFlow' + n + 'T', 'b') + T('svFlow' + n + 'D') + '</div></li>' : ''; }).join('') + '</ol>' + memtip('svFlowTipT', 'svFlowTipD') + '</div></section>'; },
 refund: function () { return '<section class="sec paper"><div class="wrap">' + title('svRefundTitle') + '<div class="refund" style="margin-top:18px">' + T('svRefundBadge', 'div').replace('<div ', '<div class="badge" ') + '<div class="card"><p style="font-size:16.5px;color:var(--body)" data-k="svRefundBody">' + br(V.svRefundBody) + '</p></div></div></div></section>'; },
 rules: function () { return '<section class="sec srules" id="rules"><div class="wrap">' + title('svRulesTitle') + rules() + '</div></section>'; },
 cta: ctaBand
};
var heroV = function (mob) {
 return '<section class="hero"><div class="wrap">' + T('svEyebrow', 'div').replace('<div ', '<div class="eyebrow" ') + '<h1>' + T('svTitle') + '<span class="hl">' + T('svTitleHl') + '</span></h1>' + T('svLead', 'p') +
  (mob ? '<div class="hint"><b>往下慢慢滑，30 秒看完這趟諮詢會怎麼聊</b><ol class="chips">' + CH_V.slice(0, 4).map(function (c, i) { return '<li><span>' + (i + 1) + '</span>' + c.tab + '</li>'; }).join('') + '</ol>' + CHEV + '</div>'
   : '<p style="font-size:15px;color:var(--muted);margin-top:4px">請捲動滑鼠，左邊的動畫會跟著播。</p><div class="cta-mini" style="margin-top:20px"><div class="price">' + price() + '<small>' + T('svPriceUnit') + '</small></div>' + ctaBtns() + '</div>') +
  '</div></section>';
};
function renderVM() {
 var D = function (i) { return '<span class="dts">' + [0, 1, 2, 3].map(function (k) { return '<i class="' + (k === i ? 'on' : '') + '"></i>'; }).join('') + '</span>'; };
 return heroV(true) + [0, 1, 2, 3].map(function (i) { return '<section class="sm" data-ch="' + i + '"><div class="smtop"><span>' + (i + 1) + '／4</span>' + D(i) + '</div><h2>' + CH_V[i].title + '</h2><p class="sh">' + CH_V[i].short + '</p><div class="mini" data-mini="' + i + '"></div><div class="nxt">繼續往下滑<span style="font-weight:400">下一段：' + CH_V[i + 1].tab + '</span>' + CHEV + '</div></section>'; }).join('') +
  '<section class="sm" data-ch="4"><div class="smtop"><span>準備好了</span></div><h2>' + CH_V[4].title + '</h2><p class="sh">' + price() + '／60 分鐘</p><div class="mini" data-mini="4"></div><div class="nxt" style="margin-top:12px">想看完整的文字說明，繼續往下' + CHEV + '</div></section><div class="sm-end"></div>' +
  '<div class="divider">完整說明</div>' + ['get', 'call', 'prep', 'how', 'refund', 'rules', 'cta'].map(function (k) { return SV[k](); }).join('');
}
var strip = function (h) { return h.replace(/^<section[^>]*>/, '').replace(/<\/section>$/, '').replace('<div class="wrap">', '').replace(/<\/div>$/, ''); };
var SS = function (ch, html, noMini) { return '<div class="ssec" data-ch="' + ch + '">' + (noMini ? '' : '<div class="mini" data-mini="' + ch + '"></div>') + html + '</div>'; };
/* 邊捲邊播的段落（電腦：左邊手機跟著換；手機：每段上面一支小動畫）。首頁「第一次諮詢怎麼進行」也用這一份 */
function storyCols(withReady) {
 return SS(0, strip(SV.get())) + SS(0, strip(SV.call()), true) + SS(1, strip(SV.prep())) + SS(2, strip(SV.how())) + SS(3, strip(SV.refund())) +
  (withReady ? SS(4, '<h2 class="sec-title"><span class="hl">' + T('svReadyTitle') + '</span></h2><p class="lead">' + price() + '／60 分鐘</p><div class="cta-mini" style="margin-top:18px"><div class="price">' + price() + '<small>' + T('svPriceUnit') + '</small></div>' + ctaBtns() + '</div>') : '');
}
var storyHTML = function (withReady) { return '<div class="wrap"><div class="story"><div class="stick" id="stC"><div class="ph"></div><div class="cap2"></div></div><div class="col">' + storyCols(withReady) + '</div></div></div>'; };
function renderVD() {
 return heroV(false) + storyHTML(true) + ['rules', 'cta'].map(function (k) { return SV[k](); }).join('');
}
var stages = [];
/* 掛上動畫：scope＝畫面上的那一塊；sm＝銷售頁手機版（一段一個畫面），否則是邊捲邊播的段落 */
function mountV(mob, scope, so) {
 scope = scope || document; so = so || {}; var chs = so.chs || CH_V;
 if (!mob) {
  var root = $('#stC', scope); if (!root) return;
  var st = new Stage($('.ph', root), Object.assign({ pw: 320, advance: false }, so)); stages.push(st);
  st.on(function (ch) { var c = $('.cap2', root); if (c.dataset.cur != ch) { c.dataset.cur = ch; c.innerHTML = '<b>' + chs[ch].title + '</b>' + (so.stack ? '' : '<div class="pbar pbar2"><div class="pseg">' + chs.map(function (_, i) { return '<i class="' + (i <= ch ? 'on' : '') + '"></i>'; }).join('') + '</div><b class="pnum">' + (ch + 1) + '／' + chs.length + '</b></div><span class="ptip">請捲動滑鼠往下看</span>'); } });   /* 語音頁：動畫標題下面加進度條（11/26 大正） */
  /* 動畫永遠對準「最靠近畫面中間」的那一段字（捲太快也不會錯位；不用 IntersectionObserver 的入場事件） */
  var ss = $$('.ssec', scope), raf = 0;
  /* 首頁預約流程（2026-11-26 大正）：四步像疊積木，一步滑上來定在原本的位置，下一步再疊上去；捲動距離短一點 */
  var col = so.stack && $('.pcol', scope), pin = col && $('.pin', col);
  if (col) {
   var seg = 0, fit = function () { seg = Math.round(innerHeight * .22); col.style.height = (pin.offsetHeight + seg * 3.6) + 'px'; };
   fit();
   var pickS = function () {
    raf = 0; if (!st.alive) return; var r = col.getBoundingClientRect(), top = parseFloat(getComputedStyle(pin).top) || 0;
    var y = top - r.top, ch = y < 0 ? 0 : Math.min(ss.length - 1, Math.floor(y / seg)), shown = r.top < innerHeight * .78;
    ss.forEach(function (e, i) { e.classList.toggle('in', shown && i <= ch); e.classList.toggle('act', shown && i === ch); });
    $$('.pseg i', col).forEach(function (e, i) { e.classList.toggle('on', i <= ch); }); var pn = $('.pnum', col); if (pn) pn.textContent = (ch + 1) + '／' + ss.length;
    if (st.cur !== ch) st.go(ch);
   };
   var onS2 = function () { if (!raf) raf = requestAnimationFrame(pickS); }, onR2 = function () { fit(); onS2(); };
   addEventListener('scroll', onS2, { passive: true }); addEventListener('resize', onR2);
   stages.push({ set alive(v) { if (!v) { removeEventListener('scroll', onS2); removeEventListener('resize', onR2); } } }); pickS();
   return;
  }
  var pick = function () {
   raf = 0; if (!st.alive) return; var m = innerHeight * .5, best = null, bd = 1e9;
   ss.forEach(function (e) { var r = e.getBoundingClientRect(), c = (r.top + r.bottom) / 2, d = (r.top <= m && r.bottom >= m) ? 0 : Math.min(Math.abs(r.top - m), Math.abs(r.bottom - m)), dd = d * 1000 + Math.abs(c - m); if (dd < bd) { bd = dd; best = e; } });
   if (!best) return; var ch = +best.dataset.ch; ss.forEach(function (s) { s.classList.toggle('act', s === best); }); if (st.cur !== ch) st.go(ch);
  };
  var onS = function () { if (!raf) raf = requestAnimationFrame(pick); };
  addEventListener('scroll', onS, { passive: true }); addEventListener('resize', onS);
  stages.push({ set alive(v) { if (!v) { removeEventListener('scroll', onS); removeEventListener('resize', onS); } } }); pick();
 } else {
  $$('.sm .mini, .ssec .mini', scope).forEach(function (m) { stages.push(new Stage(m, Object.assign({ pw: 290, bare: true, advance: false, only: +m.dataset.mini, restartOnView: true }, so))); });
  if (so.stack) {   /* 手機：每一步滑進畫面時往上浮到定位，之後就停在那裡 */
   var ms = $$('.ssec', scope), rr = 0, upd = function () { rr = 0; ms.forEach(function (e) { if (e.getBoundingClientRect().top < innerHeight * .88) e.classList.add('in'); }); };
   var onM = function () { if (!rr) rr = requestAnimationFrame(upd); };
   addEventListener('scroll', onM, { passive: true }); stages.push({ set alive(v) { if (!v) removeEventListener('scroll', onM); } }); upd();
  }
 }
}

/* ================= 文字版：真實閱讀頁的三個動畫（示範內容固定） ================= */
var NM = '小安', DT = '二〇二六年十一月二十六日';
var chH = function (n, sub, t) { return '<div class="ch-h"><div class="ch-n">' + n + '</div><div class="ch-t">' + sub + '<b>' + t + '</b></div></div>'; };
var CH1 = '<section class="ch">' + chH('壹', '你問的第一件事', '換工作的方向') + '<div class="q"><span class="qt">最近在考慮換工作，想知道現在這個方向對不對？</span></div><p>先說結論：方向沒有錯，只是時間還沒到。</p><p>你的命盤官祿宮很穩，適合在原本的領域往上走，不適合大幅轉行。今年上半年的運勢偏收斂，下半年才開始打開。</p></section>';
var CH2 = '<section class="ch">' + chH('貳', '你問的第二件事', '感情的進展') + '<div class="q"><span class="qt">今年感情有機會往前走嗎？</span></div><p>有機會，但要等到下半年。</p><p>你的夫妻宮今年被點亮，會遇到談得來的人，重點是先把工作的事放一放。</p></section>';
var CH3 = '<section class="ch">' + chH('參', '命盤裡的你', '三個重點') + '<ul class="keys"><li class="fade"><b>命宮：</b>做事穩，想清楚才動，缺點是想太久，機會容易從旁邊溜走。</li><li class="fade"><b>官祿宮：</b>適合在原本的領域往上走，有人帶的環境最能發揮。</li><li class="fade"><b>今年流年：</b>下半年工作和感情，都有一個明顯的轉折點。</li></ul></section>';
var CH4 = '<section class="ch fade">' + chH('肆', '帶走一件事', '給你的建議') + '<div class="take"><p>先把手上的案子收尾，年中前不急著遞辭呈。</p><p>下半年再動，成功率比現在高很多。</p></div></section>';
var HEADP = '<div class="run">' + NM + '文字諮詢</div><img class="head" alt="" src="' + IM('emblem2') + '"><h1>紫微斗數文字諮詢</h1><div class="who">' + NM + '　' + DT + '</div><span class="dv" aria-hidden="true"></span><p class="greet">' + NM + ' 你好：<br>謝謝你的耐心等待。你問的事，我都對著你的命盤看過了，下面一題一題跟你說。</p>';
var SIGN = '<div class="sign"><div class="tx"><b>大正</b><span class="dt">' + DT + '</span><img class="seal pre" alt="" src="' + IM('seal-goat') + '"></div></div>';
var TSC = {
 A: function () { return '<div class="rise"><main class="book"><div class="scroll"><div class="page">' + HEADP + CH1 + '<span class="dv small"></span>' + CH2 + '</div></div></main></div>' +
  '<section class="intro"><div class="bw">' + ['closed', 'half', 'open', 't1', 't2', 't3'].map(function (n, i) { return '<img alt="" class="' + (i > 2 ? 'fast ' : '') + (i == 0 ? 'on' : '') + '" src="' + IM('book2-' + n) + '">'; }).join('') + '</div><div class="ttl"><b>' + NM + '<br>紫微斗數文字諮詢</b><span>點一下，翻開</span></div></section><div class="tap"></div>'; },
 B: function () { return '<div class="rise under" style="transition:none"><main class="book"><div class="scroll"><div class="page" style="padding-top:34px">' + CH3 + '<span class="dv small"></span>' + CH4 + SIGN + '</div></div></main></div>'; },
 C: function () { return '<div class="chat" style="opacity:1"><div class="bar"><img src="' + AV + '" alt="" style="width:30px;height:30px;border-radius:50%"> 大正命理諮詢</div><div class="msgs"><div class="wait fade"><small>確認收款後</small><b>7–10 個工作天</b><span>寫好就通知你</span></div><div class="bub fade" style="margin-top:20px"><img src="' + AV + '" alt=""><div class="bb"><b>LINE 通知</b>你的紫微斗數文字諮詢寫好了，點開就能讀。<span class="go">打開你的紫微斗數文字諮詢</span></div></div><div class="mail fade"><div class="mh">✉ Email 也會收到</div><b>你的紫微斗數文字諮詢寫好了</b><span>寄件人：大正命理諮詢</span></div><div class="mnote fade">到 LINE、Email 收信，或打開手機的會員中心</div></div></div>'; }
};
function mountScene(box) {
 var k = box.dataset.sc; box.innerHTML = '<div class="rp">' + TSC[k]() + '</div>'; var rp = $('.rp', box), T2 = [];
 var at = function (ms, fn) { T2.push(setTimeout(fn, ms)); }, sc = $('.scroll', rp);
 var fit = function () { var s = box.clientWidth / 390; rp.style.setProperty('--s', s); rp.style.height = (box.clientHeight / s) + 'px'; };
 new ResizeObserver(fit).observe(box); fit();
 var goY = function (y) { if (sc) sc.style.transform = 'translateY(' + (-y) + 'px)'; };
 var yOf = function (i) { return Math.max(0, $$('.ch', rp)[i].offsetTop - 28); };
 var reset = function () {
  T2.forEach(clearTimeout); T2 = []; if (sc) { sc.style.transition = 'none'; goY(0); void sc.offsetWidth; sc.style.transition = ''; }
  $$('.fade', rp).forEach(function (e) { e.classList.remove('in'); }); var sl = $('.seal', rp); if (sl) { sl.classList.remove('in'); sl.classList.add('pre'); }
  if (k === 'A') { $('.intro', rp).classList.remove('go', 'opened'); $('.rise', rp).classList.remove('under'); $$('.bw img', rp).forEach(function (m, i) { m.classList.toggle('on', i == 0); }); }
 };
 var play = function () {
  reset();
  if (k === 'A') {
   var it = $('.intro', rp), ru = $('.rise', rp), fr = $$('.bw img', rp), show = function (l) { fr.forEach(function (m, i) { m.classList.toggle('on', l.indexOf(i) >= 0); }); };
   at(60, function () { it.classList.add('go'); });
   at(1500, function () { var tp = $('.tap', rp); tp.classList.remove('go'); void rp.offsetWidth; tp.classList.add('go'); });
   at(1700, function () { it.classList.add('opened'); show([1]); at(500, function () { show([2]); }); at(1250, function () { show([2, 3]); }); at(1500, function () { show([2, 4]); }); at(1760, function () { show([2, 5]); }); at(2040, function () { show([2]); }); at(1350, function () { ru.classList.add('under'); }); });
   at(5600, function () { goY(yOf(0)); }); at(9200, function () { goY(yOf(1)); });
  }
  if (k === 'B') { $$('.keys li', rp).forEach(function (e, i) { at(500 + i * 1100, function () { e.classList.add('in'); }); }); at(4300, function () { goY($('.take', rp).closest('.ch').offsetTop - 30); }); at(5000, function () { $('.ch.fade', rp).classList.add('in'); }); at(7000, function () { goY($('.sign', rp).offsetTop - 330); }); at(8300, function () { var sl = $('.seal', rp); sl.classList.remove('pre'); sl.classList.add('in'); }); }
  if (k === 'C') { at(300, function () { $('.wait', rp).classList.add('in'); }); at(1700, function () { $('.bub', rp).classList.add('in'); }); at(3300, function () { $('.mail', rp).classList.add('in'); }); at(4800, function () { $('.mnote', rp).classList.add('in'); }); }
 };
 if (RM) { play(); T2.forEach(clearTimeout); $$('.fade', rp).forEach(function (e) { e.classList.add('in'); }); return { play: function () {}, reset: function () {}, dur: 0 }; }
 return { play: play, reset: reset, dur: { A: 14500, B: 10500, C: 7000 }[k] };
}
var TP = function (n, t, s, k, nx) { return '<section class="tp" data-pg="' + k + '"><div class="tpin"><div class="tx"><div class="step">' + n + '／3</div><h2>' + t + '</h2><p>' + s + '</p><div class="nxt">' + CHEV.replace('class="chev"', 'class="chev" style="width:20px;height:22px"') + nx + '</div></div><div class="tcol"><div class="tfw"><div class="tfs" data-sc="' + k + '"></div></div><div class="tpg"><div class="tpb"><i></i></div><span>動畫播放中…</span></div></div></div></section>'; };
var ST = {
 how: function () { return '<section class="sec"><div class="wrap">' + title('txHowTitle') + lead('txHowLead') + steps('txStep') + '</div></section>'; },
 /* 2026-11-26 大正：金框取代「到會員中心回看」標題；LINE 會員那張卡重複拿掉；「預約前先知道」整段拿掉（付款期限併進 STEP 1，保存 3 年在這裡） */
 notes: function () { return '<section class="sec paper tnotes"><div class="wrap"><div class="memtip membox">' + T('txMemTitle', 'b') + T('txMemLead') + '<div class="mrows">' + [['msg', 1], ['dl', 2]].map(function (x) { return '<div class="mrow"><i>' + ICON[x[0]] + '</i><div>' + T('txMem' + x[1] + 'T', 'b') + T('txMem' + x[1] + 'D') + '</div></div>'; }).join('') + '</div></div></div></section>'; },
 refund: function () { return '<section class="sec paper tref"><div class="wrap">' + title('txRefundTitle') + '<div class="refund" style="margin-top:18px">' + [1, 2].map(function (n) { return '<div class="card"><b style="font-size:19px" data-k="txRefund' + n + 'T">' + br(V['txRefund' + n + 'T']) + '</b><p style="font-size:16.5px;color:var(--body);margin-top:6px" data-k="txRefund' + n + 'D">' + br(V['txRefund' + n + 'D']) + '</p></div>'; }).join('') + '</div><p class="lead" style="margin:18px 0 0" data-k="txRefundHow">' + br(V.txRefundHow) + '</p></div></section>'; },
 cta: ctaBand
};
function renderT() {
 return '<section class="thero"><div class="wrap">' + T('txEyebrow', 'div').replace('<div ', '<div class="eyebrow" ') +
  '<div class="pr"><b>' + price() + '</b><small data-k="txPriceUnit">' + br(V.txPriceUnit) + '</small>' + (V.txPriceTag ? '<em data-k="txPriceTag">' + br(V.txPriceTag) + '</em>' : '') + '</div><h1>' + T('txTitle') + '<span class="hl">' + T('txTitleHl') + '</span></h1>' +
  '<div class="cta-mini">' + ctaBtns() + '</div>' +
  '<div class="feat">' + card('nocal', 'txFeat1T', 'txFeat1D', 'star') + card('nophone', 'txFeat2T', 'txFeat2D') + card('line', 'txFeat3T', 'txFeat3D') + '</div></div></section>' +
  TP(1, '你的問題、我的回覆', '你寫下兩個問題，我對著你的命盤，一題一題寫給你。', 'A', '下一頁：重點整理') +
  TP(2, '重點整理', '命盤裡的你、給你的建議，整理成幾個重點，一眼就看懂。', 'B', '下一頁：多久會收到') +
  TP(3, '多久會收到看盤', '確認收款後 7–10 個工作天，寫好會通知你，到 LINE 或 Email 收信就能讀。', 'C', '下面是完整說明') + '<div class="sm-end"></div>' +
  ['how', 'notes', 'refund', 'cta'].map(function (k) { return ST[k](); }).join('');
}
function mountT() {
 var ms = new Map(), tm = new Map();
 $$('.tfs[data-sc]').forEach(function (b) { ms.set(b.closest('.tp'), mountScene(b)); });
 var bar = function (el, on) {
  var pg = $('.tpg', el), i = $('i', pg), sp = $('span', pg), m = ms.get(el); clearTimeout(tm.get(el)); pg.classList.remove('done'); i.style.transition = 'none'; i.style.width = '0'; void i.offsetWidth; sp.textContent = '動畫播放中…';
  if (on) { i.style.transition = 'width ' + m.dur + 'ms linear'; i.style.width = '100%'; tm.set(el, setTimeout(function () { pg.classList.add('done'); sp.textContent = el.dataset.pg === 'C' ? '看完了，往下滑看完整說明 ↓' : '看完了，往下滑 ↓'; }, m.dur + 300)); }
 };
 var io = new IntersectionObserver(function (es) { es.forEach(function (e) { var m = ms.get(e.target); if (!m) return; if (e.isIntersecting && e.intersectionRatio >= .55) { if (!e.target._on) { e.target._on = 1; m.play(); bar(e.target, 1); } } else if (e.intersectionRatio < .15) { if (e.target._on) { e.target._on = 0; m.reset(); bar(e.target, 0); } } }); }, { threshold: [0, .15, .55, .8] });
 ms.forEach(function (m, el) { io.observe(el); });
 stages.push({ set alive(v) { if (!v) io.disconnect(); } });
}

/* ================= 畫頁面 ================= */
var KEYS = Object.keys(CFG.defaults || {});
function apply(d) {
 var ch = false;
 KEYS.forEach(function (k) { if (typeof d[k] === 'string' && d[k].trim() && d[k] !== V[k]) { V[k] = d[k]; ch = true; } });
 var f = Number(KIND === 'text' ? d.feeText : d.feeVoice); if (f > 0 && f !== FEE) { FEE = f; ch = true; }
 if (KIND === 'voice' && CFG.mode !== 'home') {   // 語音頁的完整預約規則：後台「預約須知」note1~6，標題留空的那格不顯示
  var nl = []; for (var i = 1; i <= 6; i++) { var t = d['note' + i + 'Title']; if (typeof t === 'string' && t.trim()) nl.push({ t: t, d: String(d['note' + i + 'Desc'] || ''), n: i }); }
  if (nl.length && JSON.stringify(nl) !== JSON.stringify(NOTES)) { NOTES = nl; ch = true; }
 }
 return ch;
}
var mq = matchMedia('(max-width: 900px)'), lastMob = null;

/* ===== 首頁模式：只畫「第一次諮詢怎麼進行」那一段（首頁的程式畫完首頁後呼叫 DZStory.mount）===== */
/* ===== 首頁模式：「預約流程」四步動畫（2026-11-26 大正：首頁的第一次諮詢拿掉，改成預約流程動畫；字在後台「首頁：預約流程」）===== */
var CH_P = [{ title: '填寫預約表單', dur: 7 }, { title: '完成匯款', dur: 5 }, { title: '回報末五碼', dur: 5.5 }, { title: '準時上線', dur: 6 }];
function sceneP(i) {
 if (i == 0) return sceneV(1);
 if (i == 1) return '<div class="sc"><div class="fh">轉帳</div><div class="fb"><div class="lbl">轉入</div><div class="fld ok">大正命理諮詢</div>' +
  '<div class="lbl">金額</div><div class="fld" data-type="0.5,1.4" data-ok="1.5">' + price() + '</div>' +
  '<div class="chip inl" data-in="1.9">⏱ 預約成立後 24 小時內</div>' +
  '<div class="okbig" data-in="3.1"><i>✓</i>轉帳完成</div></div></div>';
 if (i == 2) return '<div class="sc"><div class="fh">回報末五碼</div><div class="fb"><div class="lbl">帳號末五碼</div><div class="fld five" data-type="0.4,1.8" data-ok="1.9">81206</div>' +
  '<div class="pbub" data-in="2.8"><img src="' + AV + '" alt=""><div class="bb"><b>LINE 通知</b>收到你的匯款，預約成功！到時候見。</div></div></div></div>';
 return '<div class="sc"><div class="call"><img src="' + AV + '" alt=""><div class="nm">大正命理諮詢</div><div class="st" data-timer>語音通話中　00:00</div><div class="wave">' + Array.from({ length: 15 }, function (_, k) { return '<b data-wv="' + k + '"></b>'; }).join('') + '</div></div>' +
  '<div class="cds"><div class="cd" data-in="0.5"><i>' + ICON.msg + '</i><div><b>前一天會收到提醒</b><span>Email 或 LINE</span></div></div><div class="cd" data-in="1.2"><i>' + ICON.call + '</i><div><b>時間到，開始通話</b><span>Google Meet 或 LINE 語音</span></div></div>' +
  '<div class="cd" data-in="1.9"><i>' + ICON.msg + '</i><div><b>文字版諮詢</b><span>請等待，7–10 個工作天內收件</span></div></div></div></div>';
}
if (CFG.mode === 'home') {
 var homeMount = function () {
  var el = document.getElementById('dzProcess'); if (!el) return;
  stages.forEach(function (s) { s.alive = false; }); stages = [];
  var mob = mq.matches; lastMob = mob;
  if (mob) {   /* 手機（11/26 大正）：只放一支手機動畫，四步從頭播到尾，不放文字說明卡 */
   el.innerHTML = '<div class="sp sp-home sp-proc"><div class="wrap">' + '<h2 class="section-title"><span class="hl">' + T('hpProcTitle') + '</span></h2>' + T('hpProcLead', 'p').replace('<p ', '<p class="lead" ') + '</div>' +
    '<div class="wrap mph"><div class="mphone"></div><div class="mcap"></div></div>' +
    '<div class="wrap pgo"><a class="btn btn-brass" href="/services/">立即預約服務諮詢</a></div></div>';
   var mst = new Stage($('.mphone', el), { pw: 270, advance: true, scene: sceneP, chs: CH_P }); stages.push(mst);
   mst.on(function (ch) { $('.mcap', el).innerHTML = '<b>' + CH_P[ch].title + '</b><div class="pbar pbar2"><div class="pseg">' + CH_P.map(function (_, i) { return '<i class="' + (i <= ch ? 'on' : '') + '"></i>'; }).join('') + '</div><b class="pnum">' + (ch + 1) + '／' + CH_P.length + '</b></div>'; });
   return;
  }
  el.innerHTML = '<div class="sp sp-home sp-proc"><div class="wrap">' + '<h2 class="section-title"><span class="hl">' + T('hpProcTitle') + '</span></h2>' + T('hpProcLead', 'p').replace('<p ', '<p class="lead" ') + '</div>' +
   '<div class="wrap"><div class="story"><div class="stick" id="stC"><div class="ph"></div><div class="cap2"></div></div><div class="col pcol"><div class="pin">' + (mob ? '' : '<div class="pbar"><span>請捲動滑鼠</span><div class="pseg">' + [0, 1, 2, 3].map(function () { return '<i></i>'; }).join('') + '</div><b class="pnum">1／4</b></div>') +
   [1, 2, 3, 4].map(function (n) { return '<div class="ssec" data-ch="' + (n - 1) + '"><div class="mini" data-mini="' + (n - 1) + '"></div><ol class="steps pstep"><li><div class="sn"><small>STEP</small><b>' + n + '</b></div><div class="bx">' + T('hpStep' + n + 'T', 'b') + T('hpStep' + n + 'D') + '</div></li></ol></div>'; }).join('') +
   '</div></div></div></div>' +
   '<div class="wrap pgo"><a class="btn btn-brass" href="/services/">立即預約服務諮詢</a></div></div>';
  mountV(mob, el, { scene: sceneP, chs: CH_P, stack: true });
 };
 window.DZStory = {
  mount: homeMount,
  /* 首頁拿到後台資料時先呼叫這個，再重畫首頁（首頁畫完會呼叫 mount） */
  apply: function (d) { if (d && typeof d === 'object') apply(d); },
  preview: function (d) { V = Object.assign({}, CFG.defaults); FEE = CFG.fee; if (d && typeof d === 'object') apply(d); }
 };
 var onHomeMq = function () { if (mq.matches !== lastMob) homeMount(); };
 if (mq.addEventListener) mq.addEventListener('change', onHomeMq); else mq.addListener(onHomeMq);
 return;
}

var app = $('#sp'), sbar = $('#sbar');
if (KIND === 'text') document.documentElement.classList.add('pg');   // 文字版：整頁吸附，一頁一頁滑
function render() {
 stages.forEach(function (s) { s.alive = false; }); stages = [];
 var mob = mq.matches; lastMob = mob;
 app.innerHTML = KIND === 'text' ? renderT() : (mob ? renderVM() : renderVD());
 if (KIND === 'text') mountT(); else mountV(mob);
 sbar.innerHTML = '<div class="p">' + price() + '<small>' + esc(KIND === 'text' ? V.txPriceUnit : V.svPriceUnit) + '</small></div>' + BOOK('btn btn-brass', P + 'BookBtn');
 onScroll();
}
function onScroll() { var e = $('.sm-end'); sbar.classList.toggle('show', e ? e.getBoundingClientRect().top < innerHeight * .5 : scrollY > 420); }
addEventListener('scroll', onScroll, { passive: true });
var onMq = function () { if (KIND !== 'text' && mq.matches !== lastMob) render(); };
if (mq.addEventListener) mq.addEventListener('change', onMq); else mq.addListener(onMq);

render();

var DZ_PREVIEW = /[?&]dzpreview=1(&|$)/.test(location.search) && window.parent !== window;
if (DZ_PREVIEW) {
 /* 後台預覽：只接受大正預約系統後台的網頁來源（跟首頁同一個）；本機測試另外允許 127.0.0.1／localhost */
 document.documentElement.classList.add('dz-preview');
 var ORIGINS = ['https://n-zsa5kblf6utdjampxzvdtwmrj3x3y4uiblx5uwq-0lu-script.googleusercontent.com'];
 var trusted = function (o) { return ORIGINS.indexOf(o) >= 0 || (/^(127\.0\.0\.1|localhost)$/.test(location.hostname) && /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(o)); };
 var parentO = null;
 addEventListener('message', function (e) {
  if (e.source !== window.parent || !trusted(e.origin)) return;
  var m = e.data; if (!m || typeof m !== 'object' || m.type !== 'dz-preview') return;
  parentO = e.origin;
  if (m.data && typeof m.data === 'object' && !Array.isArray(m.data)) {
   var d = {}; KEYS.concat(['feeVoice', 'feeText'], [1, 2, 3, 4, 5, 6].reduce(function (a, i) { return a.concat(['note' + i + 'Title', 'note' + i + 'Desc']); }, [])).forEach(function (k) { var v = m.data[k]; if ((typeof v === 'string' && v.length <= 4000) || typeof v === 'number') d[k] = v; });
   V = Object.assign({}, CFG.defaults); NOTES = (CFG.rules || []).map(function (r, i) { return { t: r[0], d: r[1], n: i + 1 }; }); apply(d); render();
  }
  if (typeof m.lit === 'string') {
   $$('.dz-lit').forEach(function (x) { x.classList.remove('dz-lit'); });
   var t = $('[data-k="' + m.lit.replace(/[^\w]/g, '') + '"]');
   if (t) { var dt = t.closest('details'); if (dt) dt.open = true; t.classList.add('dz-lit'); if (m.scroll) t.scrollIntoView({ block: 'center' }); }
  }
 });
 document.addEventListener('click', function (e) {
  var a = e.target.closest && e.target.closest('a'); if (a) e.preventDefault();
  var el = e.target.closest && e.target.closest('[data-k]');
  if (el && parentO) { e.preventDefault(); window.parent.postMessage({ type: 'dz-pick', k: el.getAttribute('data-k') }, parentO); }
 }, true);
 window.parent.postMessage({ type: 'dz-ready' }, '*');
} else if (CFG.api) {
 /* 讀後台存的文字和價格；有不一樣才重畫 */
 var s = document.createElement('script');
 window._salesCfgCb = function (d) { if (d && typeof d === 'object' && apply(d)) render(); };
 s.src = CFG.api + '?page=siteConfig&callback=_salesCfgCb';
 document.body.appendChild(s);
}
})();
