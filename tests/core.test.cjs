/* 桌上那份初稿 · 核心测试：node --test tests/core.test.cjs
 * 锚点：tests/ref.json（独立 Python Decimal 50 位、放手线放宽到 r1+5 全枚举、逐 m 重算「最少几次」，300 组）、
 *       默认场景手算、常识性质（不信引擎自报）。 */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const A = require(path.join(__dirname, '..', 'core.js'));
const REF = JSON.parse(fs.readFileSync(path.join(__dirname, 'ref.json'), 'utf8'));
const S = (o) => Object.assign(A.defaultState(), o);
const seq = (s) => s.steps.map((x) => (x.act === 'rewrite' ? 'R' : 'V')).join('');
const fromCase = (c) => ({ self: '' + c.T, n: '' + c.n, teach: '' + c.teach, r1: '' + c.r1, rInf: '' + c.rInf, k: '' + c.k, rewrite: '' + c.W, g: '' + c.g, X: c.X == null ? '' : '' + c.X });

test('默认场景：四种做法的总分钟、重写次数与回本次数（手算核对）', () => {
  const o = A.compute(A.defaultState());
  assert.ok(o.ok);
  assert.equal(o.selfTotal, 1080);
  /* 手算「从不重写」：r = round(15 + 60·0.75^c)，c = 0…11 */
  const never = []; for (let c = 0; c < 12; c++) never.push(Math.round(15 + 60 * Math.pow(0.75, c)));
  assert.deepEqual(o.never.steps.map((s) => s.r), never);
  assert.deepEqual(never, [75, 60, 49, 40, 34, 29, 26, 23, 21, 20, 18, 18]);
  assert.equal(o.never.total, 120 + never.reduce((a, b) => a + b, 0));
  assert.equal(o.never.total, 533); assert.equal(o.never.be, 4); assert.equal(o.never.endR, 17);
  /* 你的放手线 50：前 10 次都 > 50 → 重写，每次他只学到 0.2 次 */
  assert.equal(seq(o.mine), 'RRRRRRRRRRVV');
  assert.deepEqual(o.mine.steps.map((s) => s.r), [75, 72, 68, 65, 63, 60, 57, 55, 53, 51, 49, 40]);
  assert.equal(o.mine.total, 120 + 60 * 10 + 49 + 40); assert.equal(o.mine.total, 809);
  assert.equal(o.mine.rewrites, 10); assert.equal(o.mine.endR, 34); assert.equal(o.mine.be, 5); assert.equal(o.mine.saved, 271);
  assert.equal(o.best.X, null); assert.equal(o.best.total, 533); assert.equal(o.best.saved, 547);
  assert.equal(o.myopic.total, 681);
  assert.equal(o.need, 4); assert.equal(o.winner, 'delegate'); assert.equal(o.mineIsBest, false);
  assert.deepEqual(o.actions.map((a) => a.id), ['actBest']);
  assert.deepEqual(o.actions[0].set, { X: '' });
  assert.equal(A.mins(o.mine.total - o.best.total), '276 分钟（4 小时 36 分）');
  /* 第 1 次的花费含教的 120 分钟 */
  assert.equal(o.never.steps[0].cost, 195); assert.equal(o.mine.steps[0].cost, 180);
});

test('300 组独立参考实现对拍：总分钟、每次做法序列、最省放手线、最少几次', () => {
  let n = 0;
  for (const c of REF) {
    const o = A.compute(fromCase(c));
    assert.ok(o.ok, JSON.stringify(c));
    const got = { self: o.selfTotal, mine: o.mine.total, mineSeq: seq(o.mine), never: o.never.total, neverSeq: seq(o.never), best: o.best.total, bestX: o.best.X, need: o.need };
    assert.deepEqual(got, c.out, JSON.stringify(fromCase(c)));
    n++;
  }
  assert.equal(n, 300);
  /* 生成器要两边都有：交出去更省 / 自己做更省都覆盖到 */
  const win = REF.filter((c) => c.out.best < c.out.self).length;
  assert.ok(win > 50 && REF.length - win > 30, '分布 ' + win);
});

test('最优性：最省放手线不比任何其他放手线（0…r1+20 和从不重写）多花', () => {
  for (const st of [{}, { rewrite: '20' }, { k: '5' }, { g: '10', rewrite: '30' }, { n: '3' }, { k: '0' }, { k: '100' }]) {
    const o = A.compute(S(st)), P = o.P;
    for (let X = 0; X <= P.r1 + 20; X++) assert.ok(A.simulate(P, X, P.n).total >= o.best.total, JSON.stringify(st) + ' X=' + X);
    assert.ok(o.never.total >= o.best.total);
  }
});

test('并列：总分钟相同取更放手的放手线；打平自己做算「自己做」', () => {
  /* k=0：他永远交 75 分钟的稿，重写 60 更省 → 任何 X < 60… 都一样总分钟；取最大的那个（74） */
  const o = A.compute(S({ k: '0' }));
  assert.equal(o.best.X, 74); assert.equal(o.best.total, 120 + 60 * 12);
  /* 交出去恰好打平：T=10、n=1、teach=0、r1=10 → 10 = 10，不算省 */
  const t = A.compute(S({ self: '10', n: '1', teach: '0', r1: '10', rInf: '0', rewrite: '10', X: '' }));
  assert.equal(t.best.total, 10); assert.equal(t.selfTotal, 10); assert.equal(t.winner, 'self');
  assert.equal(t.never.be, null);
  /* 再少 1 分钟就算省 */
  const u = A.compute(S({ self: '10', n: '1', teach: '0', r1: '9', rInf: '0', rewrite: '10', X: '' }));
  assert.equal(u.winner, 'delegate'); assert.equal(u.never.be, 1); assert.equal(u.need, 1);
});

test('放手线阈值两侧：r > X 才重写，r = X 给意见', () => {
  const P = A.compute(S()).P;
  assert.equal(A.simulate(P, 75, 1).steps[0].act, 'review');
  assert.equal(A.simulate(P, 74, 1).steps[0].act, 'rewrite');
  /* X = 0、rInf = 0 时练熟了也一直重写（r=0 不重写） */
  const Q = A.compute(S({ rInf: '0', k: '100', g: '10', X: '0' })).P;
  assert.equal(seq(A.simulate(Q, 0, 3)), 'RVV'); /* 看你重写学到 10 成 = 完整练一次 → 第 2 次 r=0 */
});

test('学习曲线：单调不增、落在 [r∞, r1]，k=100 第二次起就是 r∞，g=0 永远学不到', () => {
  for (const st of [{}, { k: '1' }, { k: '99' }, { r1: '1440', rInf: '0' }]) {
    const P = A.compute(S(st)).P; let prev = Infinity;
    for (let c = 0; c <= 2000; c++) { const r = A.draftMin(P, c); assert.ok(r <= prev && r >= P.rInf && r <= P.r1, JSON.stringify(st) + c); prev = r; }
  }
  const P = A.compute(S({ k: '100' })).P;
  assert.equal(A.draftMin(P, 0), 75); assert.equal(A.draftMin(P, 1), 15); assert.equal(A.draftMin(P, 10), 15);
  const o = A.compute(S({ g: '0' }));
  assert.ok(o.mine.steps.every((s) => s.r === 75));
});

test('取整：半分钟向上（不被浮点表示误差舍下去）', () => {
  /* r∞=0、r1=1、k=50、c=1 次 → 0.5 → 1；c=2 → 0.25 → 0 */
  const P = A.compute(S({ r1: '1', rInf: '0', k: '50', X: '' , rewrite: '1'})).P;
  assert.equal(A.draftMin(P, 10), 1); assert.equal(A.draftMin(P, 20), 0);
  /* 15 + 60·0.75^2 = 48.75 → 49；15 + 60·0.75^4 = 33.984375 → 34 */
  const Q = A.compute(S()).P;
  assert.equal(A.draftMin(Q, 20), 49); assert.equal(A.draftMin(Q, 40), 34);
  /* 2.5 这种 .5：r∞=2、r1=3、k=50、c=1 → 2.5 → 3 */
  const R = A.compute(S({ r1: '3', rInf: '2', k: '50', rewrite: '3' })).P;
  assert.equal(A.draftMin(R, 10), 3);
  /* 浮点表示误差：45·0.7 在 JS 里是 31.499999999999996，精确值 31.5 → 应是 32（Python 分数穷举找到的样本） */
  const F = A.compute(S({ r1: '45', rInf: '0', k: '30', rewrite: '45', self: '90' })).P;
  assert.equal(45 * Math.pow(0.7, 1) < 31.5, true); assert.equal(A.draftMin(F, 10), 32);
  const G = A.compute(S({ r1: '50', rInf: '0', k: '30', self: '90' })).P; /* 50·0.49 = 24.499999999999996 → 精确 24.5 → 25 */
  assert.equal(A.draftMin(G, 20), 25);
});

test('回本次数：严格少于自己做、且之后不再反超才算', () => {
  const o = A.compute(A.defaultState());
  const c = o.never.steps.map((s) => s.cum), selfc = o.never.steps.map((s) => s.i * 90);
  assert.deepEqual([c[2], selfc[2], c[3], selfc[3]], [304, 270, 344, 360]); /* 第 3 次还多花，第 4 次起省 */
  for (let i = 3; i < 12; i++) assert.ok(c[i] < selfc[i]);
  /* 中途反超再回来：只认最后一次反超之后（直接喂给引擎的 breakeven） */
  assert.equal(A.breakeven({ T: 10 }, { steps: [{ i: 1, cum: 5 }, { i: 2, cum: 30 }, { i: 3, cum: 10 }] }), 3);
  assert.equal(A.breakeven({ T: 10 }, { steps: [{ i: 1, cum: 5 }, { i: 2, cum: 20 }] }), null); /* 最后打平不算省 */
});

test('最少要做几次：与逐次重算一致；做不到 200 次给 null 并且不出改法', () => {
  const o = A.compute(S({ n: '3' }));
  assert.equal(o.winner, 'self'); assert.equal(o.need, 4);
  assert.deepEqual(o.actions.map((a) => [a.id, a.set.n]), [['actN', '4']]);
  const o2 = A.compute(S(o.actions[0].set.n ? { n: o.actions[0].set.n } : {}));
  assert.equal(o2.winner, 'delegate'); /* 点了改法真的翻过来 */
  /* 他交上来比你自己做还慢、学不会：永远回不了本 */
  const z = A.compute(S({ self: '30', r1: '60', rInf: '40', rewrite: '30', g: '0', X: '' }));
  assert.equal(z.need, null); assert.equal(z.winner, 'self'); assert.deepEqual(z.actions, []);
});

test('改法会作用于输入：点「最省放手线」后你的做法就是最省', () => {
  for (const st of [{}, { rewrite: '20' }, { g: '10', rewrite: '30' }]) {
    const o = A.compute(S(st));
    if (!o.actions.length) continue;
    const o2 = A.compute(S(Object.assign({}, st, o.actions[0].set)));
    assert.equal(o2.mine.total, o.best.total, JSON.stringify(st)); assert.equal(o2.mineIsBest, true); assert.deepEqual(o2.actions, []);
  }
});

test('非法输入：逐项报错，字段对得上', () => {
  const bad = (st, field) => { const o = A.compute(S(st)); assert.equal(o.ok, false, JSON.stringify(st)); assert.ok(o.errors.some((e) => e.field === field), JSON.stringify(o.errors)); };
  bad({ self: '0' }, 'self'); bad({ self: '1441' }, 'self'); bad({ self: '9.5' }, 'self'); bad({ self: 'abc' }, 'self'); bad({ self: '' }, 'self');
  bad({ n: '0' }, 'n'); bad({ n: '201' }, 'n');
  bad({ teach: '-1' }, 'teach'); bad({ teach: '10001' }, 'teach');
  bad({ r1: '1441' }, 'r1'); bad({ rInf: '80' }, 'rInf');
  bad({ k: '101' }, 'k'); bad({ k: '2.5' }, 'k');
  bad({ rewrite: '0' }, 'rewrite'); bad({ rewrite: '91' }, 'rewrite');
  bad({ g: '11' }, 'g'); bad({ X: '-3' }, 'X'); bad({ X: '1441' }, 'X');
  const m = A.compute(S({ self: '0', n: '0', X: 'x' }));
  assert.deepEqual(m.errors.map((e) => e.field), ['self', 'n', 'X']);
  /* 合法边界 */
  for (const st of [{ teach: '0' }, { k: '0' }, { k: '100' }, { g: '0' }, { r1: '0', rInf: '0' }, { X: '0' }, { X: '' }, { rewrite: '90' }, { n: '200' }, { teach: '10,000' }, { self: '1,440', rewrite: '1440', r1: '1440' }]) assert.ok(A.compute(S(st)).ok, JSON.stringify(st));
  /* 全角逗号千分位 */
  assert.equal(A.compute(S({ teach: '1，000' })).P.teach, 1000);
});

test('格式：分钟带小时、千分位、负数', () => {
  assert.equal(A.mins(0), '0 分钟'); assert.equal(A.mins(59), '59 分钟'); assert.equal(A.mins(60), '60 分钟（1 小时）');
  assert.equal(A.mins(95), '95 分钟（1 小时 35 分）'); assert.equal(A.mins(-125), '−125 分钟（2 小时 5 分）');
  assert.equal(A.mins(288000), '288,000 分钟（4,800 小时）');
  assert.equal(A.xShort(null), '从不重写'); assert.equal(A.xShort(50), '超过 50 分钟就重写');
});

test('导出：CSV 行数、转义、MD 结论与表格', () => {
  const o = A.compute(A.defaultState());
  const csv = A.toCSV(o, 'X').trim().split('\n');
  assert.equal(csv.length, 3 + 1 + 12);
  assert.equal(csv[4], '1,75,自己重写,180,给意见他改,195,给意见他改,195,90');
  assert.equal(csv[15], '12,40,给意见他改,809,给意见他改,533,给意见他改,533,1080');
  assert.equal(csv[1].split(',')[1], '90'); /* 输入行：原始数，不带千分位 */
  const md = A.toMD(o, 'X');
  assert.ok(md.indexOf('| 自己做到底 | 1,080 分钟（18 小时） | — | — | — |') >= 0, md);
  assert.ok(md.indexOf('| 你现在：超过 50 分钟就重写 | 809 分钟（13 小时 29 分） | 271 分钟（4 小时 31 分） | 10 | 34 分钟 |') >= 0, md);
  assert.ok(md.indexOf('**结论：交出去，放手线「从不重写」最省。**') >= 0);
  const s = A.compute(S({ n: '3' }));
  assert.ok(A.toMD(s, 'X').indexOf('**结论：这 3 次自己做更省；要做满 4 次交出去才开始省。**') >= 0);
  assert.equal(A.toCSV({ ok: false }, 'X'), ''); assert.equal(A.toMD({ ok: false }, 'X'), '');
  assert.equal(A.toCSV(o, 'a,"b"').split('\n')[0], '桌上那份初稿,"导出 a,""b"""');
});
