let S;
const SIZES = [9, 13];
GAME({
  title: '바둑', w: 1000, h: 760, bg: '#2a1f12', controls: 'none',
  help: '흑(나)이 먼저 · 교차점을 클릭해서 착수\n상대 돌을 둘러싸 활로를 없애면 따냄 · 패(즉시 되따기) 금지 · 자충수 금지\n둘 다 패스하면 종료 → 집 + 따낸 돌 + 덤(6.5) 으로 계가\nAI는 몬테카를로 탐색으로 둬요 (9줄 / 13줄 선택)',
  init(g) { S = { n: S?.n ?? 9 }; setup(); },
  update(g, dt) {
    SIZES.forEach((n, i) => { if (g.clickIn(790 + i * 100, 600, 90, 40) && n !== S.n) { S.n = n; setup(); g.sfx.click(); } });
    if (S.end) return;
    if (g.clickIn(790, 500, 190, 44) && S.turn === 1) { pass(g); return; }
    if (S.turn === -1) { S.think -= dt; if (S.think <= 0) aiMove(g); return; }
    if (!g.mouse.clicked) return;
    const { cs, ox, oy, n } = S;
    const x = Math.round((g.mouse.x - ox) / cs), y = Math.round((g.mouse.y - oy) / cs);
    if (x < 0 || y < 0 || x >= n || y >= n) return;
    const r = tryPlay(S.b, x, y, 1, S.ko);
    if (!r) { g.sfx.hit(); return; }
    commit(g, x, y, 1, r);
  },
  draw(g, c) {
    const { cs, ox, oy, n } = S;
    g.rrect(ox - cs * 0.8, oy - cs * 0.8, cs * (n - 1) + cs * 1.6, cs * (n - 1) + cs * 1.6, 8, '#dcb35c', '#8a6420', 3);
    for (let i = 0; i < n; i++) { g.line(ox, oy + i * cs, ox + (n - 1) * cs, oy + i * cs, '#3d2a0c', 1.3); g.line(ox + i * cs, oy, ox + i * cs, oy + (n - 1) * cs, '#3d2a0c', 1.3); }
    const hosh = n === 9 ? [2, 4, 6] : [3, 6, 9];
    for (const a of hosh) for (const b of hosh) if (n === 13 || a === 4 || b === 4 || (a !== 4 && b !== 4)) g.circle(ox + a * cs, oy + b * cs, 4, '#3d2a0c');
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const v = S.b[y * n + x]; if (!v) { if (S.terr && S.terr[y * n + x]) g.rect(ox + x * cs - 6, oy + y * cs - 6, 12, 12, S.terr[y * n + x] > 0 ? '#111' : '#fff'); continue; }
      const px = ox + x * cs, py = oy + y * cs, r = cs * 0.47;
      g.circle(px + 2, py + 3, r, 'rgba(0,0,0,.35)');
      const grd = c.createRadialGradient(px - r / 3, py - r / 3, 1, px, py, r); grd.addColorStop(0, v > 0 ? '#555' : '#fff'); grd.addColorStop(1, v > 0 ? '#000' : '#cfcac2'); c.fillStyle = grd; c.beginPath(); c.arc(px, py, r, 0, 7); c.fill();
      if (S.last === y * n + x) g.ring(px, py, r * 0.45, v > 0 ? '#fff' : '#111', 2);
    }
    if (!S.end && S.turn === 1) { const x = Math.round((g.mouse.x - ox) / cs), y = Math.round((g.mouse.y - oy) / cs); if (x >= 0 && y >= 0 && x < n && y < n && !S.b[y * n + x]) { c.globalAlpha = 0.35; g.circle(ox + x * cs, oy + y * cs, cs * 0.47, '#000'); c.globalAlpha = 1; } }
    g.text('⚫ 바둑', 885, 60, 32, '#fde68a');
    g.text(S.end ? S.msg : S.turn === 1 ? '흑(나) 차례' : '백(AI) 생각 중...', 885, 115, 19, S.end ? '#fde047' : '#fef3c7');
    g.text(`따낸 돌  흑 ${S.cap[0]} · 백 ${S.cap[1]}`, 885, 170, 16, '#e7d3a7');
    g.text(`수: ${S.moveN}`, 885, 200, 16, '#e7d3a7');
    if (S.info) g.text(S.info, 885, 240, 15, '#fca5a5');
    if (S.score) { g.text(`흑 ${S.score[0]}집`, 885, 300, 22, '#fff'); g.text(`백 ${S.score[1]}집 (덤 6.5)`, 885, 335, 22, '#fff'); }
    if (!S.end) g.button(790, 500, 190, 44, '패스', '#4a3216', 18);
    g.text('판 크기 (새 게임)', 885, 585, 14, '#d6a86b');
    SIZES.forEach((sz, i) => g.button(790 + i * 100, 600, 90, 40, `${sz}줄`, S.n === sz ? '#b45309' : '#4a3216', 16));
  },
});
function setup() {
  const n = S.n; S.b = new Int8Array(n * n); S.turn = 1; S.ko = -1; S.cap = [0, 0]; S.passes = 0; S.end = false; S.last = -1; S.moveN = 0; S.terr = null; S.score = null; S.info = '';
  S.cs = Math.floor(660 / (n - 1 + 1.6)); S.ox = 40 + S.cs * 0.8 + 20; S.oy = 40 + S.cs * 0.8;
}
function nbrs(n, i) { const x = i % n, y = (i / n) | 0, r = []; if (x > 0) r.push(i - 1); if (x < n - 1) r.push(i + 1); if (y > 0) r.push(i - n); if (y < n - 1) r.push(i + n); return r; }
function group(b, n, i) { const c = b[i], st = [i], seen = new Set([i]); let libs = 0; const libSet = new Set(); while (st.length) { const k = st.pop(); for (const j of nbrs(n, k)) { if (b[j] === 0) libSet.add(j); else if (b[j] === c && !seen.has(j)) { seen.add(j); st.push(j); } } } return { stones: [...seen], libs: libSet.size }; }
function tryPlay(b, x, y, c, ko) {
  const n = S.n, i = y * n + x;
  if (b[i] || i === ko) return null;
  const nb = b.slice(); nb[i] = c; let capd = [];
  for (const j of nbrs(n, i)) if (nb[j] === -c) { const gr = group(nb, n, j); if (!gr.libs) { gr.stones.forEach((k) => (nb[k] = 0)); capd = capd.concat(gr.stones); } }
  if (!group(nb, n, i).libs) return null;
  const newKo = capd.length === 1 && group(nb, n, i).stones.length === 1 && group(nb, n, i).libs === 1 ? capd[0] : -1;
  return { b: nb, cap: capd.length, ko: newKo };
}
function commit(g, x, y, c, r) {
  S.b = r.b; S.ko = r.ko; S.last = y * S.n + x; S.passes = 0; S.moveN++; S.info = '';
  if (r.cap) { S.cap[c > 0 ? 0 : 1] += r.cap; g.sfx.hit(); if (c > 0) g.add(r.cap * 30); } else g.sfx.tone(c > 0 ? 300 : 360, 0.05, 'triangle', 0.1);
  S.turn = -c; if (S.turn === -1) S.think = 0.3;
}
function pass(g) {
  S.passes++; S.info = (S.turn === 1 ? '흑' : '백') + ' 패스'; g.sfx.click();
  if (S.passes >= 2) return finish(g);
  S.turn = -S.turn; if (S.turn === -1) S.think = 0.4;
}
function territory(b) {
  const n = S.n, t = new Int8Array(n * n), seen = new Uint8Array(n * n); let bs = 0, ws = 0;
  for (let i = 0; i < n * n; i++) { if (b[i] || seen[i]) continue; const st = [i], reg = []; seen[i] = 1; let touch = 0; while (st.length) { const k = st.pop(); reg.push(k); for (const j of nbrs(n, k)) { if (b[j]) touch |= b[j] > 0 ? 1 : 2; else if (!seen[j]) { seen[j] = 1; st.push(j); } } } const owner = touch === 1 ? 1 : touch === 2 ? -1 : 0; reg.forEach((k) => (t[k] = owner)); if (owner > 0) bs += reg.length; if (owner < 0) ws += reg.length; }
  return { t, bs, ws };
}
function finish(g) {
  S.end = true;
  // 아타리 상태로 고립된 돌은 죽은 돌로 간주(간이)
  const n = S.n;
  for (let i = 0; i < n * n; i++) if (S.b[i]) { const gr = group(S.b, n, i); if (gr.libs === 1 && gr.stones.length <= 2) { const c = S.b[i]; gr.stones.forEach((k) => (S.b[k] = 0)); S.cap[c > 0 ? 1 : 0] += gr.stones.length; } }
  const { t, bs, ws } = territory(S.b); S.terr = t;
  let bStones = 0, wStones = 0; for (const v of S.b) { if (v > 0) bStones++; if (v < 0) wStones++; }
  const black = bs + bStones, white = ws + wStones + 6.5;
  S.score = [black, white];
  if (black > white) { S.msg = `흑 ${(black - white).toFixed(1)}집 승!`; g.add(Math.round((black - white) * 100) + 1000 * (n === 13 ? 2 : 1)); g.later(() => g.win(S.msg), 2); }
  else { S.msg = `백 ${(white - black).toFixed(1)}집 승`; g.later(() => g.over(S.msg), 2); }
}
// ---- AI: 휴리스틱 필터 + 몬테카를로 플레이아웃
function eyeLike(b, i, c) { return nbrs(S.n, i).every((j) => b[j] === c); }
function candidates(b, c) {
  const n = S.n, out = [];
  for (let i = 0; i < n * n; i++) { if (b[i] || i === S.ko || eyeLike(b, i, c)) continue; out.push(i); }
  return out;
}
function heur(b, i, c) {
  const n = S.n; let s = 0; const x = i % n, y = (i / n) | 0;
  const nb = b.slice(); nb[i] = c;
  for (const j of nbrs(n, i)) { if (b[j] === -c) { const gr = group(nb, n, j); if (!gr.libs) s += 50 * gr.stones.length; else if (gr.libs === 1) s += 8; } if (b[j] === c) { const gr = group(b, n, j); if (gr.libs === 1) s += 30 * gr.stones.length; } }
  const me = group(nb, n, i); if (me.libs === 1) s -= 25; if (!me.libs) s -= 999;
  const edge = Math.min(x, y, n - 1 - x, n - 1 - y); s += edge === 0 ? -6 : edge === 1 ? -1 : edge === 2 ? 3 : 2;
  let near = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const v = b[(y + dy) * n + x + dx]; if (x + dx >= 0 && x + dx < n && y + dy >= 0 && y + dy < n && v) near++; }
  s += near ? 2 : 0;
  return s;
}
function playout(b, c, ko) {
  const n = S.n; b = b.slice(); let pass = 0;
  for (let step = 0; step < n * n * 2 && pass < 2; step++) {
    const cand = []; for (let i = 0; i < n * n; i++) if (!b[i] && !eyeLike(b, i, c)) cand.push(i);
    let played = false;
    while (cand.length) {
      const k = (Math.random() * cand.length) | 0, i = cand[k]; cand[k] = cand[cand.length - 1]; cand.pop();
      b[i] = c; let ok = true;
      for (const j of nbrs(n, i)) if (b[j] === -c) { const gr = group(b, n, j); if (!gr.libs) gr.stones.forEach((s) => (b[s] = 0)); }
      if (!group(b, n, i).libs) { b[i] = 0; ok = false; }
      if (ok) { played = true; break; }
    }
    pass = played ? 0 : pass + 1; c = -c;
  }
  let sc = -6.5; const seen = new Uint8Array(n * n);
  for (let i = 0; i < n * n; i++) { if (b[i]) { sc += b[i]; continue; } const t = nbrs(n, i).map((j) => b[j]); if (t.every((v) => v > 0)) sc++; else if (t.every((v) => v < 0)) sc--; }
  return sc;
}
function aiMove(g) {
  const n = S.n, cand = candidates(S.b, -1).map((i) => ({ i, h: heur(S.b, i, -1) })).filter((o) => o.h > -500).sort((a, b) => b.h - a.h).slice(0, n === 9 ? 18 : 22);
  if (!cand.length) return pass(g);
  const t0 = performance.now(), budget = 420;
  for (const o of cand) { o.w = 0; o.v = 0; o.r = tryPlay(S.b, o.i % n, (o.i / n) | 0, -1, S.ko); }
  const live = cand.filter((o) => o.r);
  if (!live.length) return pass(g);
  let it = 0;
  while (performance.now() - t0 < budget) { const o = live[it++ % live.length]; const sc = playout(o.r.b, 1, o.r.ko); o.v++; if (sc < 0) o.w++; }
  live.forEach((o) => (o.score = o.w / Math.max(1, o.v) + o.h * 0.004));
  live.sort((a, b) => b.score - a.score);
  const best = live[0];
  if (best.score < 0.08 && S.moveN > n * 3) return pass(g);
  commit(g, best.i % n, (best.i / n) | 0, -1, best.r);
}
