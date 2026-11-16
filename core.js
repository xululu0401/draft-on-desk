/* 桌上那份初稿 · 计算核心（core.js）
 * 问题：一件反复要做的活（周报、方案初稿、对账……），交给新人做，他的初稿总不如你自己写的。
 *       是忍住只给意见让他改，还是看不顺眼就自己重写？还是干脆别交、一直自己做？
 * 模型（设计选择，页面「怎么算的」里写明；只算「你自己」花的分钟）：
 *   - 自己做：每次 T 分钟。
 *   - 交出去：先教一次 teach 分钟（第 1 次时付）。之后每次他先交初稿。
 *     他已经练了 c 次（c 以 0.1 次为单位），这次初稿要你改 r = round( r∞ + (r1 − r∞)·(1 − k)^c ) 分钟
 *     （r1 = 第一次交上来要你改多久，r∞ = 练熟以后还要你看多久，k = 每自己改完一次，差距缩小几成）。
 *   - 放手线 X：r > X 时你忍不住自己重写，花 W 分钟，他只「看你改」学到 g 成（c += g/10）；
 *     否则你给意见让他改，花 r 分钟，他完整练一次（c += 1）。X 留空 = 从不重写。
 *   - 对比：自己做到底、照你现在的放手线、一次都不重写、逐分钟枚举出来的最省放手线。
 * 精确性：每次的分钟数取整后都是整数，累计、比较都是整数运算；只有 (1−k)^c 这一步是浮点，
 *         取整前加 1e-9 防止 x.4999999 这种表示误差把半分钟舍错（独立 Python 50 位小数对拍）。 */
(function (root) {
  'use strict';
  var MAX_MIN = 1440, MAX_N = 200, MAX_TEACH = 10000;

  function defaultState() {
    return { self: '90', n: '12', teach: '120', r1: '75', rInf: '15', k: '25', rewrite: '60', g: '2', X: '50' };
  }

  function blank(s) { return String(s == null ? '' : s).trim() === ''; }
  function num(s) { s = String(s == null ? '' : s).trim().replace(/，/g, ',').replace(/,/g, ''); if (s === '') return NaN; if (!/^-?\d+(\.\d+)?$/.test(s)) return NaN; return Number(s); }
  function isInt(v) { return isFinite(v) && Math.floor(v) === v; }

  function parse(st) {
    var E = [];
    function err(f, m) { E.push({ field: f, message: m }); }
    function intIn(f, lo, hi, msg) { var v = num(st[f]); if (!(isInt(v) && v >= lo && v <= hi)) { err(f, msg); return null; } return v; }
    var T = intIn('self', 1, MAX_MIN, '你自己做一次要填 1 到 1,440 分钟的整数。');
    var n = intIn('n', 1, MAX_N, '一共还要做几次填 1 到 200 的整数。');
    var teach = intIn('teach', 0, MAX_TEACH, '教一次要填 0 到 10,000 分钟的整数。');
    var r1 = intIn('r1', 0, MAX_MIN, '第一次交上来要你改多久，填 0 到 1,440 分钟的整数。');
    var rInf = intIn('rInf', 0, MAX_MIN, '练熟以后还要你看多久，填 0 到 1,440 分钟的整数。');
    if (r1 != null && rInf != null && rInf > r1) err('rInf', '练熟以后要改的时间不能比第一次还长（' + rInf + ' > ' + r1 + ' 分钟）。');
    var k = intIn('k', 0, 100, '每练一次差距缩小几成，填 0 到 100（%）的整数。');
    var W = intIn('rewrite', 1, MAX_MIN, '自己重写一次要填 1 到 1,440 分钟的整数。');
    if (W != null && T != null && W > T) err('rewrite', '在他初稿上重写不该比从头自己做还久（' + W + ' > ' + T + ' 分钟）；真这么久就直接自己做。');
    var g = intIn('g', 0, 10, '看你重写能学到几成，填 0 到 10 的整数。');
    var X = null;
    if (!blank(st.X)) X = intIn('X', 0, MAX_MIN, '放手线填 0 到 1,440 分钟的整数，或者留空（从不重写）。');
    if (E.length) return { ok: false, errors: E };
    return { ok: true, T: T, n: n, teach: teach, r1: r1, rInf: rInf, k: k, W: W, g: g, X: X };
  }

  /* 练了 c10/10 次后，初稿要你改几分钟（整数） */
  function draftMin(P, c10) {
    var v = P.rInf + (P.r1 - P.rInf) * Math.pow(1 - P.k / 100, c10 / 10);
    return Math.floor(v + 0.5 + 1e-9);
  }
  /* 放手线 X（null = 从不重写）下逐次模拟 m 次 */
  function simulate(P, X, m) {
    var c10 = 0, cum = P.teach, steps = [];
    for (var i = 1; i <= m; i++) {
      var r = draftMin(P, c10), re = X != null && r > X, cost = re ? P.W : r;
      cum += cost;
      steps.push({ i: i, r: r, act: re ? 'rewrite' : 'review', cost: cost + (i === 1 ? P.teach : 0), cum: cum, practiced: c10 / 10 });
      c10 += re ? P.g : 10;
    }
    return { X: X, steps: steps, total: cum, rewrites: steps.filter(function (s) { return s.act === 'rewrite'; }).length, endR: draftMin(P, c10) };
  }
  /* 累计从哪一次起比自己做省（严格少于），并且到最后一次都不再反超；null = 这几次内都没省下 */
  function breakeven(P, sim) {
    var last = 0;
    sim.steps.forEach(function (s) { if (s.cum >= s.i * P.T) last = s.i; });
    return last >= sim.steps.length ? null : last + 1;
  }
  /* 对每个做的次数 m（1…200），所有放手线里最少的累计分钟 → 最少要做满几次，交出去才比自己做省 */
  function minNeed(P) {
    var mn = [];
    for (var X = 0; X <= P.r1; X++) {
      var s = simulate(P, X >= P.r1 ? null : X, MAX_N);
      s.steps.forEach(function (x, i) { if (mn[i] == null || x.cum < mn[i]) mn[i] = x.cum; });
    }
    for (var m = 1; m <= MAX_N; m++) if (mn[m - 1] < m * P.T) return m;
    return null;
  }

  function compute(st) {
    var P = parse(st);
    if (!P.ok) return P;
    var o = { ok: true, P: P };
    o.selfTotal = P.T * P.n;
    var never = simulate(P, null, P.n), mine = simulate(P, P.X, P.n);
    /* 枚举放手线 0…r1（X ≥ r1 与从不重写等价）；总分钟最少，并列取更大的 X（更放手、他练得更多） */
    var best = null;
    for (var X = 0; X <= P.r1; X++) {
      var s = simulate(P, X >= P.r1 ? null : X, P.n);
      if (!best || s.total <= best.total) best = s;
    }
    o.never = never; o.mine = mine; o.best = best;
    [never, mine, best].forEach(function (s) { s.be = breakeven(P, s); s.saved = o.selfTotal - s.total; });
    o.need = minNeed(P); /* 换任何放手线，最少要做满几次才比自己做省（看到 200 次） */
    o.winner = best.total < o.selfTotal ? 'delegate' : 'self'; /* 并列算自己做：省下 0 分钟不值得教 */
    /* 多一种对照：当下最省事的放手线（重写比改快就重写，即 X = W） */
    o.myopic = simulate(P, P.W, P.n); o.myopic.be = breakeven(P, o.myopic); o.myopic.saved = o.selfTotal - o.myopic.total;
    o.mineIsBest = mine.total === best.total;
    /* 改法：每条都能一键填回输入 */
    var acts = [];
    if (o.winner === 'delegate' && !o.mineIsBest) acts.push({ id: 'actBest', text: '把放手线改成' + xLabel(best.X) + '（这 ' + P.n + ' 次少花 ' + mins(mine.total - best.total) + '）', set: { X: best.X == null ? '' : String(best.X) } });
    if (o.winner === 'self' && o.need != null) acts.push({ id: 'actN', text: '这活要是还得做满 ' + o.need + ' 次，交出去才开始省：改成 ' + o.need + ' 次看看', set: { n: String(o.need) } });
    o.actions = acts;
    return o;
  }

  /* ── 格式 ── */
  function th(v) { return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function mins(m) { /* 整数分钟 → 「95 分钟（1 小时 35 分）」 */
    var neg = m < 0, a = Math.abs(m), s = th(a) + ' 分钟';
    if (a >= 60) { var h = Math.floor(a / 60), r = a % 60; s += '（' + th(h) + ' 小时' + (r ? ' ' + r + ' 分' : '') + '）'; }
    return (neg ? '−' : '') + s;
  }
  function xLabel(X) { return X == null ? '「从不重写」' : '「改起来超过 ' + X + ' 分钟才自己重写」'; }
  function xShort(X) { return X == null ? '从不重写' : '超过 ' + X + ' 分钟就重写'; }

  function csvCell(s) { s = String(s); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  function toCSV(o, stamp) {
    if (!o.ok) return '';
    var P = o.P, L = [];
    L.push(['桌上那份初稿', '导出 ' + stamp].map(csvCell).join(','));
    L.push(['自己做一次(分钟)', P.T, '一共几次', P.n, '教一次(分钟)', P.teach, '第一次要改(分钟)', P.r1, '练熟后要看(分钟)', P.rInf, '每练一次差距缩小(%)', P.k, '重写一次(分钟)', P.W, '看重写学到(成)', P.g, '你的放手线', xShort(P.X)].map(csvCell).join(','));
    L.push('');
    L.push(['第几次', '他的初稿要改(分钟)', '你的放手线·做法', '你的放手线·累计(分钟)', '从不重写·做法', '从不重写·累计(分钟)', '最省放手线·做法', '最省放手线·累计(分钟)', '自己做·累计(分钟)'].map(csvCell).join(','));
    for (var i = 0; i < P.n; i++) {
      var a = o.mine.steps[i], b = o.never.steps[i], c = o.best.steps[i];
      L.push([i + 1, a.r, actName(a.act), a.cum, actName(b.act), b.cum, actName(c.act), c.cum, (i + 1) * P.T].map(csvCell).join(','));
    }
    return L.join('\n') + '\n';
  }
  function actName(a) { return a === 'rewrite' ? '自己重写' : '给意见他改'; }
  function toMD(o, stamp) {
    if (!o.ok) return '';
    var P = o.P, L = ['# 桌上那份初稿', '', '导出时间：' + stamp, ''];
    L.push('自己做一次 ' + P.T + ' 分钟，一共还要做 ' + P.n + ' 次；教一次 ' + P.teach + ' 分钟；他第一次交上来要你改 ' + P.r1 + ' 分钟，练熟后 ' + P.rInf + ' 分钟，每自己改完一次差距缩小 ' + P.k + '%；你重写一次 ' + P.W + ' 分钟，他看你重写学到 ' + P.g + ' 成。', '');
    L.push('| 做法 | 这 ' + P.n + ' 次你一共花 | 比自己做省 | 重写几次 | 第 ' + P.n + ' 次后他的初稿还要改 |', '|---|---|---|---|---|');
    L.push('| 自己做到底 | ' + mins(o.selfTotal) + ' | — | — | — |');
    [['你现在：' + xShort(P.X), o.mine], ['一次都不重写', o.never], ['最省：' + xShort(o.best.X), o.best]].forEach(function (x) {
      L.push('| ' + x[0] + ' | ' + mins(x[1].total) + ' | ' + mins(x[1].saved) + ' | ' + x[1].rewrites + ' | ' + x[1].endR + ' 分钟 |');
    });
    L.push('', o.winner === 'delegate' ? '**结论：交出去，放手线' + xLabel(o.best.X) + '最省。**' : '**结论：这 ' + P.n + ' 次自己做更省' + (o.need ? '；要做满 ' + o.need + ' 次交出去才开始省' : '；做到 200 次交出去也省不下来') + '。**');
    L.push('', '_只算你自己花的分钟，不算他的时间、成长和出错的后果；学习快慢是你自己的估计，默认数字为虚构示例。_');
    return L.join('\n') + '\n';
  }

  var api = { MAX_N: MAX_N, defaultState: defaultState, parse: parse, draftMin: draftMin, simulate: simulate, breakeven: breakeven, compute: compute, mins: mins, th: th, xLabel: xLabel, xShort: xShort, actName: actName, toCSV: toCSV, toMD: toMD };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AppCore = api;
})(typeof window !== 'undefined' ? window : this);
