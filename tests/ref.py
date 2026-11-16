#!/usr/bin/env python3
"""桌上那份初稿 · 独立参考实现（不复用 core.js 的写法）。
   - 学习曲线用 Decimal 50 位精度算 (1-k)^c：c 以「十分之一次」为整数单位，(1-k)^(c/10) = exp(ln(1-k)·c/10)；
     k = 100% 时 0^0 = 1、0^正数 = 0 单独处理。四舍五入用 ROUND_HALF_UP。
   - 最省放手线：不信「只看 0…r1」这个缩减，直接对 X ∈ {0…r1+5} ∪ {从不重写} 全部模拟，取总分钟最少、并列取更放手的。
   - 「最少要做满几次」：对每个 m 单独重新从头模拟（不复用 200 次那条轨迹）。
   生成 300 组随机场景 → tests/ref.json。"""
import json, random
from decimal import Decimal as D, getcontext, ROUND_HALF_UP
from pathlib import Path
getcontext().prec = 50

def draft(c, r1, rinf, k10):  # c10 = 练了几个「十分之一次」
    base = D(100 - k10) / D(100)
    if base == 0:
        f = D(1) if c == 0 else D(0)
    else:
        f = (base.ln() * D(c) / D(10)).exp()
    v = D(rinf) + D(r1 - rinf) * f
    return int(v.quantize(D(1), rounding=ROUND_HALF_UP))

def run(cs, X, m):
    c = 0; total = cs['teach']; seq = []
    for i in range(m):
        r = draft(c, cs['r1'], cs['rInf'], cs['k'])
        if X is not None and r > X:
            total += cs['W']; c += cs['g']; seq.append('R')
        else:
            total += r; c += 10; seq.append('V')
    return total, seq

def solve(cs):
    n, T = cs['n'], cs['T']
    cands = list(range(0, cs['r1'] + 6)) + [None]
    res = [(X, run(cs, X, n)) for X in cands]
    bt = min(t for _, (t, _) in res)
    # 并列取更放手：从不重写 > 大 X > 小 X；X ≥ r1 都等价于从不重写
    def rank(X): return 10**9 if X is None or X >= cs['r1'] else X
    bx = max((X for X, (t, _) in res if t == bt), key=rank)
    bx = None if bx is None or bx >= cs['r1'] else bx
    need = None
    for m in range(1, 201):
        if min(run(cs, X, m)[0] for X in cands) < m * T:
            need = m; break
    mine = run(cs, cs['X'], n); never = run(cs, None, n)
    return {'self': n * T, 'mine': mine[0], 'mineSeq': ''.join(mine[1]), 'never': never[0], 'neverSeq': ''.join(never[1]),
            'best': bt, 'bestX': bx, 'need': need}

random.seed(20261116)
cases = []
for _ in range(300):
    T = random.choice([random.randint(5, 60), random.randint(30, 240)])
    r1 = random.randint(0, T + 30); rinf = random.randint(0, r1)
    W = random.randint(1, T)
    cs = {'T': T, 'n': random.choice([1, 2, 3, random.randint(1, 15), random.randint(10, 40)]),
          'teach': random.choice([0, random.randint(0, 3 * T)]), 'r1': r1, 'rInf': rinf,
          'k': random.choice([0, 100, random.randint(1, 99), random.randint(1, 99)]), 'W': W,
          'g': random.randint(0, 10), 'X': random.choice([None, random.randint(0, r1 + 5), random.randint(0, r1 + 5)])}
    cs['out'] = solve(cs)
    cases.append(cs)
Path(__file__).with_name('ref.json').write_text(json.dumps(cases, ensure_ascii=False))
w = sum(1 for c in cases if c['out']['best'] < c['out']['self'])
print('cases', len(cases), '交出去更省', w, '自己做更省或打平', len(cases) - w,
      '最省是从不重写', sum(1 for c in cases if c['out']['bestX'] is None),
      '需要次数为 None', sum(1 for c in cases if c['out']['need'] is None))
