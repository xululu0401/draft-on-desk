/* 封面 cover.svg（1200×1200），读数来自 core.js 同一次 compute；再用浏览器截成 cover.png。 */
const fs = require('node:fs');
const A = require('./core.js');
const o = A.compute(A.defaultState()), P = o.P;
if (!o.ok || o.selfTotal !== 1080 || o.mine.total !== 809 || o.best.total !== 533 || o.best.X !== null) throw new Error('默认场景不对');
const F = "-apple-system,'PingFang SC','Microsoft YaHei',sans-serif";
const W = [['自己做到底', '#8a6d1f', null], ['看不顺眼就重写', '#2f5b8a', o.mine], ['一次都不重写', '#2f7a4a', o.never]];
const cL = 200, cR = 1040, cT = 520, cB = 930, hi = o.selfTotal;
const X = (i) => cL + (cR - cL) * i / P.n, Y = (v) => cB - (cB - cT) * v / hi;
const pts = (s) => [s ? P.teach : 0].concat(Array.from({ length: P.n }, (_, i) => s ? s.steps[i].cum : (i + 1) * P.T));
const lines = W.map(([, c, s]) => `<polyline fill="none" stroke="${c}" stroke-width="8" stroke-linejoin="round"${s ? '' : ' stroke-dasharray="18 12"'} points="${pts(s).map((v, i) => X(i).toFixed(1) + ',' + Y(v).toFixed(1)).join(' ')}"/>`).join('');
const ends = W.map(([n, c, s], k) => { const v = pts(s)[P.n]; return `<text x="${cR - 8}" y="${Y(v) + (k === 1 ? -22 : k === 2 ? 66 : -18)}" font-family="${F}" font-size="30" font-weight="800" fill="${c}" stroke="#fff" stroke-width="10" paint-order="stroke" stroke-linejoin="round" text-anchor="end">${n} ${A.th(v)} 分钟</text>`; }).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
  <rect width="1200" height="1200" fill="#f4f3ef"/>
  <rect x="70" y="60" width="1060" height="1080" rx="18" fill="#fff" stroke="#dcdbd2" stroke-width="3"/>
  <text x="140" y="200" font-family="${F}" font-size="104" font-weight="800" fill="#22231f">桌上那份初稿</text>
  <text x="140" y="268" font-family="${F}" font-size="38" fill="#53554d">交给新人做，他的初稿不如你，要不要自己重写</text>
  <rect x="140" y="298" width="920" height="5" fill="#22231f"/>
  <text x="140" y="378" font-family="${F}" font-size="42" font-weight="800" fill="#22231f">每周一份、做 ${P.n} 次：忍住只给意见 <tspan fill="#a3473a">${A.th(o.never.total)} 分钟</tspan></text>
  <text x="140" y="436" font-family="${F}" font-size="32" fill="#53554d">看不顺眼就重写 ${A.th(o.mine.total)} 分钟 · 自己做 ${A.th(o.selfTotal)} 分钟 · 第 ${o.never.be} 次起省</text>
  <line x1="${cL}" x2="${cR}" y1="${cB}" y2="${cB}" stroke="#53554d" stroke-width="2"/>
  ${lines}${ends}
  <text x="${cL}" y="${cB + 46}" font-family="${F}" font-size="26" fill="#878a80">开始</text>
  <text x="${cR}" y="${cB + 46}" font-family="${F}" font-size="26" fill="#878a80" text-anchor="end">第 ${P.n} 次</text>
  <text x="140" y="1050" font-family="${F}" font-size="28" font-weight="700" fill="#22231f">纵轴 = 累计花你多少分钟（越低越省）</text>
  <text x="140" y="1100" font-family="${F}" font-size="22" fill="#878a80">只算你自己花的分钟 · 学得多快是你自己的估计 · 数字均为虚构示例</text>
</svg>`;
fs.writeFileSync('cover.svg', svg);
console.log('cover.svg', svg.length);
