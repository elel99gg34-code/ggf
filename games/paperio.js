let S;
const N = 80, C = 18;
const PCOL = [['#3b82f6', '#93c5fd'], ['#ef4444', '#fca5a5'], ['#22c55e', '#86efac'], ['#f59e0b', '#fcd34d'], ['#a855f7', '#d8b4fe'], ['#ec4899', '#f9a8d4'], ['#14b8a6', '#5eead4']];
const BN = ['나', '빨강이', '초록이', '노랑이', '보라', '분홍', '청록'];
GAME({
  title: '땅따먹기', w: 1000, h: 680, bg: '#e2e8f0', controls: 'dpad',
  help: '방향키/WASD/스와이프로 방향 전환\n내 땅 밖으로 나가면 꼬리가 생기고, 다시 돌아오면 감싼 영역을 차지!\n다른 플레이어의 꼬리를 밟으면 처치 · 내 꼬리가 밟히면 사망\n점수 = 최대 점유율 × 100 + 처치 × 500',
  init(g) {
    S = { own: U.grid(N, N, 0), trail: U.grid(N, N, 0), ents: [], kills: 0, best: 0, cam: { x: 0, y: 0 } };
    for (let i = 0; i < 7; i++) spawn(i);
    S.cam.x = S.ents[0].x * C; S.cam.y = S.ents[0].y * C;
  },
  update(g, dt) {
    const me = S.ents[0];
    if (me.alive) {
      const D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
      for (const k in D) if (g.pressed(k)) { const [x, y] = D[k]; if (x !== -me.dir[0] || y !== -me.dir[1]) me.q = [x, y]; }
      if (g.mouse.down && !g.swiped) { const dx = g.mouse.x - g.W / 2, dy = g.mouse.y - g.H / 2; if (Math.hypot(dx, dy) > 40) { const d = Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)]; if (d[0] !== -me.dir[0] || d[1] !== -me.dir[1]) me.q = d; } }
    }
    for (const e of S.ents) {
      if (!e.alive) { if (e.id) { e.resp -= dt; if (e.resp <= 0) spawn(e.id); } continue; }
      e.t += dt * (e.id ? 7.2 : 8);
      while (e.t >= 1 && e.alive) { e.t -= 1; if (e.id) ai(e); stepEnt(g, e); }
    }
    if (!me.alive) { if (!S.ended) { S.ended = true; g.later(() => g.over(`최대 점유율 ${S.best.toFixed(1)}% · 처치 ${S.kills}`), 1.2); } return; }
    let cnt = 0; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (S.own[y][x] === 1) cnt++;
    const pct = (cnt / (N * N)) * 100;
    S.best = Math.max(S.best, pct);
    g.score = Math.round(S.best * 100) + S.kills * 500;
    if (pct >= 60) { g.add(5000); return g.win(`점유율 ${pct.toFixed(1)}% 달성!`); }
    S.cam.x += (me.x * C + me.dir[0] * me.t * C - S.cam.x) * Math.min(1, dt * 8);
    S.cam.y += (me.y * C + me.dir[1] * me.t * C - S.cam.y) * Math.min(1, dt * 8);
    S.pct = pct;
    g.info = `점유율 ${pct.toFixed(1)}% · 처치 ${S.kills} · 목표 60%`;
  },
  draw(g, c) {
    c.save(); c.translate(g.W / 2 - S.cam.x, g.H / 2 - S.cam.y);
    g.rect(-2000, -2000, 6000, 6000, '#94a3b8');
    g.rect(0, 0, N * C, N * C, '#f8fafc');
    const x0 = Math.max(0, Math.floor((S.cam.x - g.W / 2) / C)), x1 = Math.min(N - 1, Math.ceil((S.cam.x + g.W / 2) / C)), y0 = Math.max(0, Math.floor((S.cam.y - g.H / 2) / C)), y1 = Math.min(N - 1, Math.ceil((S.cam.y + g.H / 2) / C));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const o = S.own[y][x], t = S.trail[y][x];
      if (o) { g.rect(x * C, y * C, C, C, PCOL[o - 1][0]); g.rect(x * C, y * C + C - 3, C, 3, 'rgba(0,0,0,.12)'); }
      else if ((x + y) % 2) g.rect(x * C, y * C, C, C, '#f1f5f9');
      if (t) { c.globalAlpha = 0.75; g.rect(x * C + 2, y * C + 2, C - 4, C - 4, PCOL[t - 1][1]); c.globalAlpha = 1; }
    }
    for (const e of S.ents) {
      if (!e.alive) continue;
      const px = (e.x + e.dir[0] * e.t) * C + C / 2, py = (e.y + e.dir[1] * e.t) * C + C / 2;
      g.rrect(px - C * 0.7, py - C * 0.7 + 3, C * 1.4, C * 1.4, 5, 'rgba(0,0,0,.2)');
      g.rrect(px - C * 0.7, py - C * 0.7, C * 1.4, C * 1.4, 5, PCOL[e.id][0], '#fff', 2);
      g.text(BN[e.id], px, py - C - 6, 13, '#334155');
    }
    c.restore();
    const rank = S.ents.map((e) => ({ e, n: countOwn(e.id + 1) })).sort((a, b) => b.n - a.n);
    g.rrect(g.W - 180, 10, 170, 30 + rank.length * 20, 10, 'rgba(15,23,42,.6)');
    g.text('🏆 점유율', g.W - 95, 26, 14, '#fff');
    rank.forEach((r, i) => g.text(`${i + 1}. ${BN[r.e.id]} ${((r.n / (N * N)) * 100).toFixed(1)}%`, g.W - 170, 48 + i * 20, 14, r.e.id === 0 ? '#fde047' : PCOL[r.e.id][1], 'left'));
  },
});
function countOwn(v) { let n = 0; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (S.own[y][x] === v) n++; return n; }
function spawn(id) {
  let x, y;
  for (let k = 0; k < 200; k++) { x = U.randi(4, N - 5); y = U.randi(4, N - 5); let ok = true; for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (S.own[y + dy][x + dx] || S.trail[y + dy][x + dx]) ok = false; if (ok) break; }
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) S.own[y + dy][x + dx] = id + 1;
  const e = { id, x, y, dir: U.choice([[1, 0], [-1, 0], [0, 1], [0, -1]]), t: 0, alive: true, q: null, trailCells: [], plan: [], resp: 3 };
  S.ents[id] = e;
}
function die(g, e, killer) {
  if (!e.alive) return;
  e.alive = false; e.resp = 3;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if (S.own[y][x] === e.id + 1) S.own[y][x] = 0; if (S.trail[y][x] === e.id + 1) S.trail[y][x] = 0; }
  g.burst(g.W / 2 + (e.x * C - S.cam.x), g.H / 2 + (e.y * C - S.cam.y), PCOL[e.id][0], 30, 250);
  if (killer && killer.id === 0 && e.id !== 0) { S.kills++; g.sfx.explode(); g.float(g.W / 2, g.H / 2 - 60, `${BN[e.id]} 처치!`, '#ef4444', 26); }
  if (e.id === 0) { g.sfx.lose(); g.shake(10); }
}
function stepEnt(g, e) {
  if (e.q) { e.dir = e.q; e.q = null; }
  const nx = e.x + e.dir[0], ny = e.y + e.dir[1];
  if (nx < 0 || ny < 0 || nx >= N || ny >= N) return die(g, e, null);
  const tr = S.trail[ny][nx];
  if (tr === e.id + 1) return die(g, e, null);
  if (tr) die(g, S.ents[tr - 1], e);
  for (const o of S.ents) if (o !== e && o.alive && o.x === nx && o.y === ny) { if (S.own[ny][nx] === o.id + 1) die(g, e, o); else die(g, o, e); }
  if (!e.alive) return;
  e.x = nx; e.y = ny;
  if (S.own[ny][nx] === e.id + 1) { if (e.trailCells.length) capture(g, e); }
  else { S.trail[ny][nx] = e.id + 1; e.trailCells.push([nx, ny]); }
}
function capture(g, e) {
  const v = e.id + 1;
  for (const [x, y] of e.trailCells) { S.trail[y][x] = 0; S.own[y][x] = v; }
  e.trailCells = [];
  const out = U.grid(N, N, false), st = [];
  for (let i = 0; i < N; i++) for (const [x, y] of [[i, 0], [i, N - 1], [0, i], [N - 1, i]]) if (S.own[y][x] !== v && !out[y][x]) { out[y][x] = true; st.push([x, y]); }
  while (st.length) { const [x, y] = st.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = x + dx, b = y + dy; if (a >= 0 && b >= 0 && a < N && b < N && !out[b][a] && S.own[b][a] !== v) { out[b][a] = true; st.push([a, b]); } } }
  let gained = 0;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!out[y][x] && S.own[y][x] !== v) {
    const prev = S.own[y][x]; S.own[y][x] = v; gained++;
    if (S.trail[y][x] && S.trail[y][x] !== v) die(g, S.ents[S.trail[y][x] - 1], e);
    for (const o of S.ents) if (o.alive && o !== e && o.x === x && o.y === y && prev !== o.id + 1) {}
  }
  if (e.id === 0 && gained >= 0) { g.sfx.coin(); if (gained > 20) g.float(g.W / 2, g.H / 2 - 40, `+${gained}칸`, '#2563eb', 22); }
}
function ai(e) {
  const v = e.id + 1, home = S.own[e.y][e.x] === v;
  const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => !(dx === -e.dir[0] && dy === -e.dir[1]));
  const safe = (d) => { const nx = e.x + d[0], ny = e.y + d[1]; return nx >= 1 && ny >= 1 && nx < N - 1 && ny < N - 1 && S.trail[ny][nx] !== v; };
  const me = S.ents[0];
  // 위협: 플레이어가 내 꼬리 근처면 귀환
  const threat = e.trailCells.length && me.alive && e.trailCells.some(([x, y]) => Math.abs(x - me.x) + Math.abs(y - me.y) < 6);
  if (!home && (threat || e.trailCells.length > 14 + e.id * 2)) e.plan = [];
  if (e.plan.length) { const d = e.plan[0]; if (safe(d)) { e.plan[0].n--; if (e.plan[0].n <= 0) e.plan.shift(); e.q = [d[0], d[1]]; return; } e.plan = []; }
  if (home) {
    if (Math.random() < 0.25) {
      const d1 = U.choice(opts.filter(safe)) || opts[0]; const side = Math.random() < 0.5 ? 1 : -1; const d2 = [-d1[1] * side, d1[0] * side];
      const a = U.randi(3, 8), b = U.randi(3, 8);
      const p1 = Object.assign([d1[0], d1[1]], { n: a }), p2 = Object.assign([d2[0], d2[1]], { n: b }), p3 = Object.assign([-d1[0], -d1[1]], { n: a + 2 });
      e.plan = [p1, p2, p3];
      e.q = [d1[0], d1[1]];
      return;
    }
    const s = opts.filter(safe); if (!safe(e.dir) && s.length) e.q = U.choice(s); else if (Math.random() < 0.1 && s.length) e.q = U.choice(s);
    return;
  }
  // 집으로: 가장 가까운 내 땅 방향
  let best = null, bd = 1e9;
  for (let y = 0; y < N; y += 1) for (let x = 0; x < N; x += 1) if (S.own[y][x] === v) { const d = Math.abs(x - e.x) + Math.abs(y - e.y); if (d < bd) { bd = d; best = [x, y]; } }
  if (!best) return;
  const cand = opts.filter(safe).sort((a, b) => Math.abs(e.x + a[0] - best[0]) + Math.abs(e.y + a[1] - best[1]) - (Math.abs(e.x + b[0] - best[0]) + Math.abs(e.y + b[1] - best[1])));
  if (cand.length) e.q = [cand[0][0], cand[0][1]];
}
