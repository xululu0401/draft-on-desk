'use strict';
/* 注入测试：对 core.js 做一处小改动，看核心测试能不能抓到。跑完自动还原。 */
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
const F=path.join(__dirname,'../core.js'),src=fs.readFileSync(F,'utf8');
const M=[
["var v = P.rInf + (P.r1 - P.rInf) * Math.pow(1 - P.k / 100, c10 / 10);","var v = P.rInf + (P.r1 - P.rInf) * Math.pow(1 - P.k / 100, c10);"],
["var v = P.rInf + (P.r1 - P.rInf) * Math.pow(1 - P.k / 100, c10 / 10);","var v = P.r1 * Math.pow(1 - P.k / 100, c10 / 10);"],
["return Math.floor(v + 0.5 + 1e-9);","return Math.floor(v + 0.5);"],
["return Math.floor(v + 0.5 + 1e-9);","return Math.floor(v + 1e-9);"],
["return Math.floor(v + 0.5 + 1e-9);","return Math.ceil(v - 1e-9);"],
["var c10 = 0, cum = P.teach, steps = [];","var c10 = 0, cum = 0, steps = [];"],
["re = X != null && r > X,","re = X != null && r >= X,"],
["cost = re ? P.W : r;","cost = re ? P.W : r + 0;cost = re ? r : cost;"],
["c10 += re ? P.g : 10;","c10 += re ? 0 : 10;"],
["c10 += re ? P.g : 10;","c10 += 10;"],
["cost: cost + (i === 1 ? P.teach : 0)","cost: cost"],
["if (s.cum >= s.i * P.T) last = s.i;","if (s.cum > s.i * P.T) last = s.i;"],
["return last >= sim.steps.length ? null : last + 1;","return last + 1;"],
["for (var X = 0; X <= P.r1; X++) {\n      var s = simulate(P, X >= P.r1 ? null : X, P.n);","for (var X = 1; X <= P.r1; X++) {\n      var s = simulate(P, X >= P.r1 ? null : X, P.n);"],
["if (!best || s.total <= best.total) best = s;","if (!best || s.total < best.total) best = s;"],
["for (var m = 1; m <= MAX_N; m++) if (mn[m - 1] < m * P.T) return m;","for (var m = 1; m <= MAX_N; m++) if (mn[m - 1] <= m * P.T) return m;"],
["if (mn[i] == null || x.cum < mn[i]) mn[i] = x.cum;","if (mn[i] == null) mn[i] = x.cum;"],
["o.winner = best.total < o.selfTotal ? 'delegate' : 'self';","o.winner = best.total <= o.selfTotal ? 'delegate' : 'self';"],
["o.selfTotal = P.T * P.n;","o.selfTotal = P.T * (P.n + 1);"],
["if (o.winner === 'delegate' && !o.mineIsBest) acts.push","if (o.winner === 'delegate') acts.push"],
["if (o.winner === 'self' && o.need != null) acts.push","if (o.winner === 'self') acts.push"],
["var T = intIn('self', 1, MAX_MIN,","var T = intIn('self', 0, MAX_MIN,"],
["var n = intIn('n', 1, MAX_N,","var n = intIn('n', 1, MAX_N + 1,"],
["if (r1 != null && rInf != null && rInf > r1) err","if (false) err"],
["if (W != null && T != null && W > T) err","if (W != null && T != null && W > T + 1) err"],
["var k = intIn('k', 0, 100,","var k = intIn('k', 0, 99,"],
["var g = intIn('g', 0, 10,","var g = intIn('g', 0, 11,"],
["function isInt(v) { return isFinite(v) && Math.floor(v) === v; }","function isInt(v) { return isFinite(v); }"],
["if (!blank(st.X)) X = intIn('X', 0, MAX_MIN,","if (!blank(st.X)) X = intIn('X', 1, MAX_MIN,"],
["replace(/，/g, ',')","replace(/，/g, '')+'' ? s : s"],
["if (a >= 60) { var h","if (a > 60) { var h"],
["s += '（' + th(h) + ' 小时' + (r ? ' ' + r + ' 分' : '') + '）';","s += '（' + th(h) + ' 小时 ' + r + ' 分）';"],
["return (neg ? '−' : '') + s;","return s;"],
["return /[\",\\n]/.test(s) ? '\"' + s.replace(/\"/g, '\"\"') + '\"' : s;","return s;"],
["function actName(a) { return a === 'rewrite' ? '自己重写' : '给意见他改'; }","function actName(a) { return a === 'review' ? '自己重写' : '给意见他改'; }"],
["s.be = breakeven(P, s); s.saved = o.selfTotal - s.total;","s.be = breakeven(P, s); s.saved = s.total - o.selfTotal;"],
["endR: draftMin(P, c10)","endR: draftMin(P, c10 - 10)"],
];
let caught=0,missed=[],nomatch=[];
try{
M.forEach(([a,b],i)=>{
  if(src.indexOf(a)<0){nomatch.push(i);return;}
  fs.writeFileSync(F,src.replace(a,b));
  let fail=false;try{execFileSync(process.execPath,['--test',path.join(__dirname,'core.test.cjs')],{stdio:'pipe',timeout:180000});}catch(e){fail=true;}
  if(fail)caught++;else missed.push(i+': '+b.slice(0,90));
});
}finally{fs.writeFileSync(F,src);}
console.log('注入 '+M.length+' 处，抓到 '+caught+'，漏 '+missed.length+(nomatch.length?'，未匹配 '+nomatch.join(','):''));
missed.forEach(m=>console.log('  漏：'+m));
