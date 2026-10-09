let S;
const LV = [{ n: '초급', w: 9, h: 9, m: 10 }, { n: '중급', w: 16, h: 16, m: 40 }, { n: '고급', w: 30, h: 16, m: 99 }];
const NC = ['', '#2563eb', '#16a34a', '#dc2626', '#1e3a8a', '#7f1d1d', '#0e7490', '#111', '#6b7280'];
GAME({
  title: '지뢰찾기', w: 960, h: 680, bg: '#cbd5e1', controls: 'none',
  help: '좌클릭 = 열기 · 우클릭(또는 🚩모드에서 클릭) = 깃발\n숫자를 클릭하면 주변 깃발 수가 맞을 때 한 번에 열기 (코딩)\n첫 클릭은 절대 지뢰가 아니에요\n난이도 버튼으로 변경 · 빨리 깰수록 고득점',
  init(g) { S = S && S.lv !== undefined ? { lv: S.lv } : { lv: 0 }; setup(); },
  update(g, dt) {
    if (S.started && !S.done) S.time += dt;
    for (let i = 0; i < 3; i++) if (g.clickIn(20 + i * 110, 14, 100, 40)) { S.lv = i; setup(); g.sfx.click(); return; }
    if (g.clickIn(360, 14, 110, 40)) { S.flagMode = !S.flagMode; g.sfx.click(); return; }
    const { cs, ox, oy } = S;
    const cx = Math.floor((g.mouse.x - ox) / cs), cy = Math.floor((g.mouse.y - oy) / cs);
    const inB = cx >= 0 && cy >= 0 && cx < S.w && cy < S.h;
    if (S.done || !inB) return;
    if (g.mouse.rclick || (g.mouse.clicked && S.flagMode)) { const c = S.cells[cy][cx]; if (!c.open) { c.flag = !c.flag; g.sfx.tone(c.flag ? 700 : 400, 0.05, 'square', 0.04); } return; }
    if (g.mouse.clicked) {
      if (!S.started) { place(cx, cy); S.started = true; }
      const c = S.cells[cy][cx];
      if (c.open && c.n) chord(g, cx, cy);
      else if (!c.flag) open(g, cx, cy);
      checkWin(g);
    }
    g.info = `${LV[S.lv].n} · 🚩${S.m - S.cells.flat().filter((c) => c.flag).length} · ⏱️${Math.floor(S.time)}`;
  },
  draw(g, c) {
    LV.forEach((L, i) => g.button(20 + i * 110, 14, 100, 40, L.n, i === S.lv ? '#2563eb' : '#64748b', 18));
    g.button(360, 14, 110, 40, S.flagMode ? '🚩 깃발 모드' : '⛏️ 열기 모드', S.flagMode ? '#dc2626' : '#475569', 15);
    g.text(`💣 ${S.m - S.cells.flat().filter((c) => c.flag).length}`, 640, 34, 24, '#111');
    g.text(`⏱️ ${Math.floor(S.time)}`, 800, 34, 24, '#111');
    const { cs, ox, oy } = S;
    for (let y = 0; y < S.h; y++) for (let x = 0; x < S.w; x++) {
      const cl = S.cells[y][x], px = ox + x * cs, py = oy + y * cs;
      if (!cl.open) {
        g.rect(px, py, cs, cs, '#94a3b8'); g.rect(px, py, cs - 2, cs - 2, '#e2e8f0'); g.rect(px + 2, py + 2, cs - 4, cs - 4, '#cbd5e1');
        if (cl.flag) g.emoji('🚩', px + cs / 2, py + cs / 2, cs * 0.7);
        if (S.done && cl.mine && !cl.flag) g.emoji('💣', px + cs / 2, py + cs / 2, cs * 0.7);
        if (S.done && cl.flag && !cl.mine) g.text('✕', px + cs / 2, py + cs / 2, cs * 0.8, '#dc2626');
      } else {
        g.rect(px, py, cs, cs, cl.boom ? '#ef4444' : '#f1f5f9'); g.stroke(px, py, cs, cs, '#cbd5e1', 1);
        if (cl.mine) g.emoji('💣', px + cs / 2, py + cs / 2, cs * 0.7);
        else if (cl.n) g.text(cl.n, px + cs / 2, py + cs / 2 + 1, cs * 0.62, NC[cl.n]);
      }
    }
    if (!S.started) g.text('아무 칸이나 클릭해서 시작!', 480, 660, 16, '#334155');
  },
});
function setup() {
  const L = LV[S.lv];
  S.w = L.w; S.h = L.h; S.m = L.m;
  S.cs = Math.floor(Math.min(920 / L.w, 590 / L.h));
  S.ox = (960 - S.cs * L.w) / 2; S.oy = 70 + (600 - S.cs * L.h) / 2;
  S.cells = U.grid(L.w, L.h, () => ({ mine: false, open: false, flag: false, n: 0 }));
  S.started = false; S.done = false; S.time = 0; S.flagMode = S.flagMode || false;
}
function nb(x, y) { const r = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && S.cells[y + dy]?.[x + dx]) r.push([x + dx, y + dy]); return r; }
function place(sx, sy) {
  const safe = new Set([sx + ',' + sy, ...nb(sx, sy).map(([a, b]) => a + ',' + b)]);
  let k = 0;
  while (k < S.m) { const x = U.randi(S.w), y = U.randi(S.h); if (safe.has(x + ',' + y) || S.cells[y][x].mine) continue; S.cells[y][x].mine = true; k++; }
  for (let y = 0; y < S.h; y++) for (let x = 0; x < S.w; x++) S.cells[y][x].n = nb(x, y).filter(([a, b]) => S.cells[b][a].mine).length;
}
function open(g, x, y) {
  const c = S.cells[y][x];
  if (c.open || c.flag) return;
  if (c.mine) { c.open = true; c.boom = true; S.done = true; g.sfx.explode(); g.shake(12); for (const row of S.cells) for (const cl of row) if (cl.mine && !cl.flag) cl.open = true; return g.later(() => g.over(`${LV[S.lv].n} · 💥 지뢰를 밟았다!`), 1.2); }
  const st = [[x, y]]; let n = 0;
  while (st.length) { const [a, b] = st.pop(), cl = S.cells[b][a]; if (cl.open || cl.flag) continue; cl.open = true; n++; if (!cl.n) for (const p of nb(a, b)) st.push(p); }
  g.sfx.tone(300 + Math.min(n, 40) * 15, 0.05, 'triangle', 0.05);
}
function chord(g, x, y) {
  const c = S.cells[y][x], ns = nb(x, y);
  if (ns.filter(([a, b]) => S.cells[b][a].flag).length !== c.n) return;
  for (const [a, b] of ns) if (!S.done) open(g, a, b);
}
function checkWin(g) {
  if (S.done) return;
  if (S.cells.flat().every((c) => c.open || c.mine)) {
    S.done = true; S.cells.flat().forEach((c) => c.mine && (c.flag = true));
    const base = [1000, 5000, 15000][S.lv];
    g.add(Math.max(base / 5, Math.round(base - S.time * [10, 15, 20][S.lv])));
    g.later(() => g.win(`${LV[S.lv].n} 클리어! ${Math.floor(S.time)}초`), 0.5);
  }
}
