/* 桌上那份初稿 · 界面（ui.js）
 * 读 state → AppCore.compute → 把同一次输出画出来。页面自己不做分钟计算。 */
(function () {
  'use strict';
  var A = window.AppCore;
  var KEY = 'draft-on-desk:v1';
  var $ = function (id) { return document.getElementById(id); };
  var Mn = A.mins, TH = A.th;
  var FIELDS = ['self', 'n', 'teach', 'r1', 'rInf', 'k', 'rewrite', 'g', 'X'];
  var WAYS = [
    { key: 'self', name: '自己做到底', color: '#8a6d1f' },
    { key: 'mine', name: '照你的放手线', color: '#2f5b8a' },
    { key: 'never', name: '一次都不重写', color: '#2f7a4a' },
    { key: 'best', name: '最省的放手线', color: '#a3473a' }
  ];
  var PRESETS = [
    { key: 'base', name: '每周一份周报（默认）', note: '虚构示例：你自己写一份 90 分钟，这季度还有 12 份；先花 120 分钟教他；他第一份要你改 75 分钟，练熟后还要看 15 分钟，每自己改完一次差距缩小 25%；你在他稿上重写要 60 分钟，他看你重写只学到 2 成；你现在的习惯是改起来超过 50 分钟就自己重写。', s: {} },
    { key: 'short', name: '就剩三次了', note: '虚构示例：同一件活，只剩 3 次就结束，其余同默认。', s: { n: '3' } },
    { key: 'slow', name: '他学得慢', note: '虚构示例：每自己改完一次差距只缩小 10%，其余同默认。', s: { k: '10' } },
    { key: 'quick', name: '你重写很快', note: '虚构示例：你在他稿上重写只要 20 分钟，其余同默认。', s: { rewrite: '20' } }
  ];
  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function presetState(k) { var s = A.defaultState(), p = PRESETS.filter(function (q) { return q.key === k; })[0]; Object.keys(p.s).forEach(function (f) { s[f] = p.s[f]; }); return s; }
  function presetKey(s) { var j = JSON.stringify(pick(s)); for (var i = 0; i < PRESETS.length; i++) if (JSON.stringify(presetState(PRESETS[i].key)) === j) return PRESETS[i].key; return null; }
  function pick(s) { var d = {}; FIELDS.forEach(function (k) { d[k] = s[k]; }); return d; }

  function str(v, n) { return v == null || typeof v === 'object' ? '' : String(v).slice(0, n); }
  function sanitize(s) {
    if (!s || typeof s !== 'object') return null;
    var d = A.defaultState(), any = false;
    FIELDS.forEach(function (k) { if (k in s) { d[k] = str(s[k], 12); any = true; } });
    return any ? d : null;
  }
  var VIEWS = ['self', 'mine', 'never', 'best'];
  function load() { try { var t = localStorage.getItem(KEY); if (!t) return null; var j = JSON.parse(t); var s = sanitize(j && j.state); if (s && VIEWS.indexOf(j.view) >= 0) view = j.view; return s; } catch (e) { return null; } }
  var view = 'mine';
  var state = load() || A.defaultState();
  var out = null;
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ state: state, view: view })); $('saveTag').textContent = '· 已存到本机'; }
    catch (e) { $('saveTag').textContent = '· 没能存到本机'; }
  }
  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function sim(k) { return k === 'self' ? null : out[k]; }
  function cmp(d) { return d > 0 ? '省 ' + Mn(d) : d < 0 ? '多花 ' + Mn(-d) : '打平'; }

  function renderPresets() {
    var key = presetKey(state);
    $('presets').innerHTML = PRESETS.map(function (p) { return '<button type="button" class="chip" id="preset_' + p.key + '" data-p="' + p.key + '" aria-pressed="' + (key === p.key) + '">' + esc(p.name) + '</button>'; }).join('');
    var cur = PRESETS.filter(function (p) { return p.key === key; })[0];
    $('presetNote').textContent = cur ? cur.note : '你改过的（按你填的算）。';
  }
  $('presets').addEventListener('click', function (e) { var b = e.target.closest('[data-p]'); if (!b) return; state = presetState(b.getAttribute('data-p')); fill(); update(); });
  FIELDS.forEach(function (k) { $(k).addEventListener('input', function () { state[k] = this.value; update(); }); });
  function fill() { FIELDS.forEach(function (k) { $(k).value = state[k]; }); }
  $('acts').addEventListener('click', function (e) { var b = e.target.closest('[data-act]'); if (!b) return; var a = out.actions.filter(function (x) { return x.id === b.getAttribute('data-act'); })[0]; if (!a) return; Object.keys(a.set).forEach(function (k) { state[k] = a.set[k]; }); fill(); update(); });
  $('ways').addEventListener('click', function (e) { var b = e.target.closest('[data-w]'); if (!b) return; view = b.getAttribute('data-w'); render(); save(); });

  function markErrors() {
    document.querySelectorAll('input.bad').forEach(function (e) { e.classList.remove('bad'); });
    if (out.ok) return;
    out.errors.forEach(function (er) { var el = $(er.field); if (el) el.classList.add('bad'); });
  }

  function headline(o) {
    var P = o.P;
    if (o.winner === 'self') return '这 ' + P.n + ' 次<b>自己做更省</b>：交出去最好也要花你 ' + esc(Mn(o.best.total)) + '，自己做 ' + esc(Mn(o.selfTotal)) + '。';
    var h = '交出去，放手线<b>「' + esc(A.xShort(o.best.X)) + '」</b>最省：这 ' + P.n + ' 次花你 ' + esc(Mn(o.best.total)) + '，比自己做省 ' + esc(Mn(o.best.saved)) + '。';
    return h;
  }
  function why(o) {
    var P = o.P, m = o.mine, t = [];
    if (o.mineIsBest) t.push('你现在的放手线（' + A.xShort(P.X) + '）已经是最省的。');
    else t.push('照你现在的放手线（' + A.xShort(P.X) + '），' + P.n + ' 次里有 ' + m.rewrites + ' 次你会自己重写，一共花 ' + Mn(m.total) + '，' + cmp(m.saved) + '（跟自己做比）。');
    if (m.rewrites > 0 && P.g < 10) t.push('每重写一次他只学到 ' + P.g + ' 成，第 ' + P.n + ' 次后他的初稿还要你改 ' + m.endR + ' 分钟；一次都不重写的话是 ' + o.never.endR + ' 分钟。');
    if (o.winner === 'delegate') t.push(o.best.be === 1 ? '第 1 次就开始省。' : '最省的做法从第 ' + o.best.be + ' 次开始比自己做省，之前多花的是教他、改他的稿。');
    else t.push(o.need ? '换哪种放手线都要做满 ' + o.need + ' 次才开始省。' : '按这些数，做到 200 次交出去也省不下来：他练熟后要你看的时间不比你自己做少多少。');
    return t.join('');
  }

  function render() {
    var o = out;
    $('errBox').classList.toggle('hide', o.ok);
    ['okBox', 'tlPanel', 'chartPanel', 'tblPanel'].forEach(function (id) { $(id).classList.toggle('hide', !o.ok); });
    if (!o.ok) { $('errBox').innerHTML = '先改好标红的格子：<ul>' + o.errors.map(function (e) { return '<li>' + esc(e.message) + '</li>'; }).join('') + '</ul>'; return; }
    var P = o.P;
    $('headline').innerHTML = headline(o);
    $('why').textContent = why(o);
    $('acts').innerHTML = o.actions.map(function (a) { return '<button type="button" class="act" id="' + a.id + '" data-act="' + a.id + '">→ ' + esc(a.text) + '</button>'; }).join('');
    var winKey = o.winner === 'self' ? 'self' : 'best';
    $('ways').innerHTML = WAYS.map(function (w) {
      var s = sim(w.key), tot = s ? s.total : o.selfTotal, d;
      if (!s) d = '每次 ' + TH(P.T) + ' 分钟';
      else d = (w.key === 'best' || w.key === 'mine' ? A.xShort(s.X) + ' · ' : '') + (s.be ? '第 ' + s.be + ' 次起省' : '这 ' + P.n + ' 次没省下') + ' · 重写 ' + s.rewrites + ' 次';
      return '<button type="button" class="way' + (w.key === winKey ? ' win' : '') + '" id="way_' + w.key + '" data-w="' + w.key + '" aria-pressed="' + (view === w.key) + '"><span class="t"><i style="background:' + w.color + '"></i>' + w.name + '</span><span class="v">' + TH(tot) + ' 分钟</span><span class="d">' + esc(d) + '</span></button>';
    }).join('');
    renderTimeline();
    drawChart();
    renderTable();
  }

  function renderTimeline() {
    var o = out, P = o.P, s = sim(view), w = WAYS.filter(function (x) { return x.key === view; })[0];
    $('tlNote').textContent = '正在看：' + w.name + (s && (view === 'mine' || view === 'best') ? '（' + A.xShort(s.X) + '）' : '') + ' · 点上面四张卡换着看';
    var mx = P.T; if (s) s.steps.forEach(function (x) { if (x.cost > mx) mx = x.cost; });
    var pct = function (v) { return (100 * v / mx).toFixed(2) + '%'; }, h = '';
    for (var i = 0; i < P.n; i++) {
      var selfCum = (i + 1) * P.T, row;
      if (!s) {
        row = '<div class="st" id="st' + (i + 1) + '"><span class="n">第 ' + (i + 1) + ' 次</span><span class="bar"><span class="teach" style="width:' + pct(P.T) + ';background:#8a6d1f"></span></span><span class="cum">累计 ' + TH(selfCum) + '</span><span class="what">你自己做，' + P.T + ' 分钟</span></div>';
      } else {
        var x = s.steps[i], cost = x.cost - (i === 0 ? P.teach : 0), d = selfCum - x.cum, bars = '';
        if (i === 0 && P.teach) bars += '<span class="teach" style="width:' + pct(P.teach) + '"></span>';
        bars += '<span class="' + x.act + '" style="left:' + pct(i === 0 ? P.teach : 0) + ';width:' + pct(cost) + '"></span><em style="left:calc(' + pct(P.T) + ' - 1px)"></em>';
        var wh = (i === 0 && P.teach ? '先教 ' + P.teach + ' 分钟；' : '') + '他交初稿（已练 ' + fmt1(x.practiced) + ' 次），要改 ' + x.r + ' 分钟' + (x.act === 'rewrite' ? ' → 超过放手线，你自己重写 ' + P.W + ' 分钟，他看着学 ' + P.g + ' 成' : ' → 你给意见，他自己改');
        row = '<div class="st' + (s.be === i + 1 ? ' be' : '') + '" id="st' + (i + 1) + '"><span class="n">第 ' + (i + 1) + ' 次</span><span class="bar">' + bars + '</span><span class="cum">累计 ' + TH(x.cum) + '<br><b class="' + (d > 0 ? 'pos' : d < 0 ? 'neg' : '') + '">' + (d > 0 ? '省 ' + TH(d) : d < 0 ? '多 ' + TH(-d) : '打平') + '</b></span><span class="what">' + esc(wh) + '</span></div>';
      }
      h += row;
    }
    $('tl').innerHTML = h;
  }
  function fmt1(v) { return (Math.round(v * 10) / 10).toFixed(1).replace(/\.0$/, ''); }

  function curves() {
    var o = out, P = o.P;
    return WAYS.map(function (w) {
      var s = sim(w.key), pts = [s ? P.teach : 0];
      for (var i = 0; i < P.n; i++) pts.push(s ? s.steps[i].cum : (i + 1) * P.T);
      return { w: w, pts: pts };
    });
  }
  function drawChart() {
    var o = out, P = o.P, cwid = $('chart').getBoundingClientRect().width || 900, Wd = Math.round(Math.max(340, Math.min(900, cwid))), Ht = Math.round(Wd < 600 ? Wd * 0.7 : 340);
    $('chart').setAttribute('viewBox', '0 0 ' + Wd + ' ' + Ht);
    var fs = Wd < 600 ? 12 : 14, l = Wd < 600 ? 46 : 60, rt = 14, tp = 14, bt = 34, cw = Wd - l - rt, ch = Ht - tp - bt;
    var C = curves(), hi = 0; C.forEach(function (c) { c.pts.forEach(function (v) { if (v > hi) hi = v; }); }); hi = Math.max(hi, 1);
    var X = function (i) { return l + cw * i / P.n; }, Y = function (v) { return tp + ch * (1 - v / hi); };
    var step = Math.pow(10, Math.floor(Math.log(hi / 4) / Math.LN10)) || 1; [1, 2, 5, 10].some(function (m) { if (hi / (step * m) <= 5) { step *= m; return true; } return false; }); step = Math.max(1, step);
    var g = '';
    for (var v = 0; v <= hi + 1e-9; v += step) g += '<line x1="' + l + '" x2="' + (Wd - rt) + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) + '" stroke="' + (v === 0 ? '#53554d' : '#ebeae3') + '"/><text x="' + (l - 6) + '" y="' + (Y(v) + 4).toFixed(1) + '" font-size="' + fs + '" text-anchor="end" fill="#878a80">' + TH(v) + '</text>';
    var xs = Math.max(1, Math.ceil(P.n / (Wd < 600 ? 5 : 10)));
    for (var i = 0; i <= P.n; i += xs) g += '<text x="' + X(i).toFixed(1) + '" y="' + (Ht - 12) + '" font-size="' + fs + '" text-anchor="' + (i === 0 ? 'start' : X(i) > Wd - rt - 30 ? 'end' : 'middle') + '" fill="#878a80">' + (i === 0 ? '开始' : '第 ' + i + ' 次') + '</text>';
    if ((P.n % xs) !== 0 || P.n === 0) g += '<text x="' + X(P.n).toFixed(1) + '" y="' + (Ht - 12) + '" font-size="' + fs + '" text-anchor="end" fill="#878a80">第 ' + P.n + ' 次</text>';
    /* 重合的线：后画的那条改成虚线，图例里写明 */
    var same = {}; C.forEach(function (c, i) { for (var j = 0; j < i; j++) if (JSON.stringify(C[j].pts) === JSON.stringify(c.pts)) { same[c.w.key] = C[j].w.name; break; } });
    $('chartLegend').innerHTML = C.map(function (c) { return '<span><i style="background:' + c.w.color + '"></i>' + c.w.name + (same[c.w.key] ? '（与「' + c.w.name.replace(/.*/, same[c.w.key]) + '」重合，画成虚线）' : '') + '</span>'; }).join('');
    C.forEach(function (c) {
      var on = c.w.key === view;
      g += '<polyline fill="none" stroke="' + c.w.color + '" stroke-width="' + (on ? 3.5 : 2) + '" stroke-opacity="' + (on ? 1 : 0.55) + '"' + (c.w.key === 'self' ? ' stroke-dasharray="7 5"' : same[c.w.key] ? ' stroke-dasharray="3 7" stroke-linecap="round"' : '') + ' points="' + c.pts.map(function (v, i) { return X(i).toFixed(1) + ',' + Y(v).toFixed(1); }).join(' ') + '"/>';
    });
    var s = sim(view);
    if (s && s.be) g += '<circle cx="' + X(s.be).toFixed(1) + '" cy="' + Y(s.steps[s.be - 1].cum).toFixed(1) + '" r="5" fill="#fff" stroke="#22231f" stroke-width="2"/><text x="' + Math.min(Wd - rt - 2, X(s.be) + 8).toFixed(1) + '" y="' + (Y(s.steps[s.be - 1].cum) + (Y(s.steps[s.be - 1].cum) > tp + ch - 30 ? -12 : 24)).toFixed(1) + '" font-size="' + fs + '" font-weight="700" fill="#22231f" text-anchor="' + (X(s.be) > Wd * 0.75 ? 'end' : 'start') + '">第 ' + s.be + ' 次起省</text>';
    $('chart').innerHTML = g;
  }

  function renderTable() {
    var o = out, P = o.P;
    var h = '<tr><th>做法</th><th class="n">一共花你</th><th class="n">跟自己做比</th><th class="n">第几次起省</th><th class="n">重写几次</th><th class="n">最后他的稿还要改</th></tr>';
    WAYS.forEach(function (w) {
      var s = sim(w.key), nm = w.name + (s && (w.key === 'mine' || w.key === 'best') ? '<br><span class="muted">' + esc(A.xShort(s.X)) + '</span>' : '');
      if (!s) h += '<tr id="row_self"><td>' + nm + '</td><td class="n">' + esc(Mn(o.selfTotal)) + '</td><td class="n">—</td><td class="n">—</td><td class="n">—</td><td class="n">—</td></tr>';
      else h += '<tr id="row_' + w.key + '"><td>' + nm + '</td><td class="n">' + esc(Mn(s.total)) + '</td><td class="n ' + (s.saved > 0 ? 'pos' : s.saved < 0 ? 'neg' : '') + '">' + esc(cmp(s.saved)) + '</td><td class="n">' + (s.be ? '第 ' + s.be + ' 次' : '没省下') + '</td><td class="n">' + s.rewrites + '</td><td class="n">' + s.endR + ' 分钟</td></tr>';
    });
    $('tbl').innerHTML = h;
  }

  function update() { out = A.compute(state); markErrors(); renderPresets(); render(); save(); }

  /* 导出 */
  function stamp() { var d = new Date(), p = function (x) { return (x < 10 ? '0' : '') + x; }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()); }
  function download(name, blob) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }
  function tag() { return out.ok ? out.P.n + '次' : '待改'; }
  $('dlCsv').addEventListener('click', function () { if (out.ok) download('桌上那份初稿-逐次.csv', new Blob(['\ufeff' + A.toCSV(out, stamp())], { type: 'text/csv;charset=utf-8' })); });
  $('dlMd').addEventListener('click', function () { if (out.ok) download('桌上那份初稿-' + tag() + '.md', new Blob([A.toMD(out, stamp())], { type: 'text/markdown;charset=utf-8' })); });
  $('dlJson').addEventListener('click', function () { download('桌上那份初稿-备份.json', new Blob([JSON.stringify({ app: '桌上那份初稿', slug: 'draft-on-desk', version: 1, exported_at: stamp(), state: state }, null, 2)], { type: 'application/json' })); });
  $('impJson').addEventListener('click', function () { $('impFile').click(); });
  $('impFile').addEventListener('change', function () { var f = this.files && this.files[0]; if (!f) return; var rd = new FileReader(); rd.onload = function () { importText(String(rd.result)); }; rd.readAsText(f); this.value = ''; });
  function importText(t) {
    var s = null;
    try { var j = JSON.parse(t); s = sanitize(j && j.state ? j.state : j); } catch (e) { s = null; }
    if (!s) { $('saveTag').textContent = '· 这个文件读不出来，没改动'; return false; }
    state = s; fill(); update(); return true;
  }
  $('reset').addEventListener('click', function () { state = A.defaultState(); view = 'mine'; fill(); update(); });

  /* 结果卡 PNG 1080×1350：文字取自同一次 out */
  function drawCard() {
    var W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var g = cv.getContext('2d'), FF = '-apple-system,"PingFang SC","Microsoft YaHei",sans-serif';
    g.fillStyle = '#f4f3ef'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#fff'; g.fillRect(60, 50, W - 120, H - 100);
    g.strokeStyle = '#dcdbd2'; g.lineWidth = 2; g.strokeRect(60, 50, W - 120, H - 100);
    var L = 110, Rr = W - 110, maxW = Rr - L, y = 150;
    function font(size, bold) { g.font = (bold ? '700 ' : '') + size + 'px ' + FF; }
    function clip(t, w) { t = String(t); if (g.measureText(t).width <= w) return t; while (t.length > 1 && g.measureText(t + '…').width > w) t = t.slice(0, -1); return t + '…'; }
    function wrap(t, size, color, bold, lim) {
      font(size, bold); g.fillStyle = color; var cur = '', n = 0;
      var toks = String(t).match(/[−0-9.,]+ ?(?:分钟|小时|次|成|%)[）)。，、；：]?|[（(「]?[0-9A-Za-z.,%]+[）)」。，、；：]?|[（(「]?[^\s（(「][）)」。，、；：]?|\s/g) || [];
      for (var i = 0; i < toks.length; i++) { var ch = toks[i]; if (g.measureText(cur + ch).width > maxW && cur) { if (lim && ++n >= lim) { g.fillText(clip(cur + '…', maxW), L, y); y += size * 1.5; return; } g.fillText(cur, L, y); y += size * 1.5; cur = ch.trim() ? ch : ''; } else cur += ch; }
      if (cur) { g.fillText(cur, L, y); y += size * 1.5; }
    }
    font(52, true); g.fillStyle = '#22231f'; g.fillText('桌上那份初稿', L, y); y += 22;
    g.fillStyle = '#22231f'; g.fillRect(L, y, maxW, 4); y += 60;
    if (!out.ok) { y += 30; font(48, true); g.fillStyle = '#b3261e'; g.fillText('还算不了', L, y); y += 70; out.errors.slice(0, 6).forEach(function (e) { wrap('· ' + e.message, 28, '#53554d', false, 2); y += 8; }); y += 30; wrap('改好标红的格子，结果会自动重算。', 26, '#878a80'); y += 40; wrap('这张卡算的是：一件反复要做的活交给新人，忍住给意见、看不顺眼就重写、一直自己做，各花你多少分钟。', 26, '#878a80'); return cv; }
    var o = out, P = o.P;
    wrap(o.winner === 'self' ? '这 ' + P.n + ' 次自己做更省' : '交出去，' + A.xShort(o.best.X) + '最省', 46, '#a3473a', true, 2); y += 4;
    wrap(o.winner === 'self' ? '交出去最好也要 ' + Mn(o.best.total) + '，自己做 ' + Mn(o.selfTotal) + (o.need ? '；做满 ' + o.need + ' 次才开始省' : '') : '这 ' + P.n + ' 次花你 ' + Mn(o.best.total) + '，比自己做省 ' + Mn(o.best.saved) + (o.best.be ? '，第 ' + o.best.be + ' 次起省' : ''), 28, '#53554d', false, 3); y += 10;
    wrap('自己做一次 ' + TH(P.T) + ' 分钟 · 先教 ' + TH(P.teach) + ' 分钟 · 他第一次要改 ' + TH(P.r1) + ' 分钟、练熟后 ' + TH(P.rInf) + ' 分钟 · 每练一次差距缩小 ' + P.k + '% · 重写 ' + TH(P.W) + ' 分钟、他学 ' + P.g + ' 成', 23, '#878a80', false, 3); y += 22;
    WAYS.forEach(function (w) {
      var s = sim(w.key), tot = s ? s.total : o.selfTotal, top = y - 38;
      g.fillStyle = '#fdfdfb'; g.fillRect(L, top, maxW, 84); g.fillStyle = w.color; g.fillRect(L, top, 8, 84);
      var vt = TH(tot) + ' 分钟'; font(34, true); var vw = g.measureText(vt).width;
      g.fillStyle = '#22231f'; g.textAlign = 'right'; g.fillText(vt, Rr - 18, y + 4); g.textAlign = 'left';
      font(28, true); g.fillText(clip(w.name, maxW - vw - 70), L + 30, y);
      font(21); g.fillStyle = '#878a80';
      g.fillText(clip(s ? (w.key === 'mine' || w.key === 'best' ? A.xShort(s.X) + ' · ' : '') + cmp(s.saved) + ' · 重写 ' + s.rewrites + ' 次' : '每次 ' + TH(P.T) + ' 分钟', maxW - vw - 70), L + 30, y + 32);
      y += 98;
    });
    /* 下半：累计分钟小图（与页面同一组数） */
    var cT = y + 20, cB = H - 205, cL = L + 80, cR = Rr - 10;
    if (cB - cT > 160) {
      var C = curves(), hi = 1; C.forEach(function (c) { c.pts.forEach(function (v) { if (v > hi) hi = v; }); });
      var cx = function (i) { return cL + (cR - cL) * i / P.n; }, cy = function (v) { return cT + (cB - cT) * (1 - v / hi); };
      font(21); g.fillStyle = '#878a80'; g.fillText('累计花你多少分钟（越低越省）', L, cT - 14);
      var sameC = {}; C.forEach(function (c, i) { for (var j = 0; j < i; j++) if (JSON.stringify(C[j].pts) === JSON.stringify(c.pts)) { sameC[c.w.key] = true; break; } });
      var lx = L; font(19); g.textAlign = 'left'; C.forEach(function (c) { g.fillStyle = c.w.color; g.fillRect(lx, cB + 44, 22, 6); g.fillStyle = '#53554d'; var t = c.w.name + (sameC[c.w.key] ? '（重合）' : ''); g.fillText(t, lx + 28, cB + 54); lx += 28 + g.measureText(t).width + 22; });
      g.strokeStyle = '#53554d'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cL, cB); g.lineTo(cR, cB); g.stroke();
      g.textAlign = 'right'; font(20); g.fillText('0', cL - 8, cB + 6); g.fillText(TH(hi), cL - 8, cT + 14); g.textAlign = 'left';
      C.forEach(function (c) { g.strokeStyle = c.w.color; g.lineWidth = 4; g.setLineDash(c.w.key === 'self' ? [12, 9] : sameC[c.w.key] ? [4, 12] : []); g.lineCap = sameC[c.w.key] ? 'round' : 'butt'; g.beginPath(); c.pts.forEach(function (v, i) { if (i) g.lineTo(cx(i), cy(v)); else g.moveTo(cx(i), cy(v)); }); g.stroke(); });
      g.setLineDash([]);
      font(20); g.fillStyle = '#878a80'; g.fillText('开始', cL, cB + 30); g.textAlign = 'right'; g.fillText('第 ' + P.n + ' 次', cR, cB + 30); g.textAlign = 'left';
    }
    font(21); g.fillStyle = '#878a80';
    g.fillText(clip('只算你自己花的分钟；学得多快是你自己的估计，默认数字为虚构示例', maxW), L, H - 92);
    return cv;
  }
  $('dlPng').addEventListener('click', function () { drawCard().toBlob(function (b) { if (b) download('桌上那份初稿-' + tag() + '-1080x1350.png', b); }, 'image/png'); });

  var rz = null; window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { if (out && out.ok) drawChart(); }, 120); });
  window.__ddUi = { state: function () { return JSON.parse(JSON.stringify(state)); }, out: function () { return out; }, view: function () { return view; }, importText: importText, drawCard: drawCard, storageKey: KEY };
  fill(); update();
})();
