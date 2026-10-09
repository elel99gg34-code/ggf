let S;
const T = 48, GW = 15, GH = 13;
const PE = ['🧑', '🤖', '👽', '🤡'];
const PC = ['#60a5fa', '#f87171', '#4ade80', '#facc15'];
GAME({
  title: '봄버맨', w: GW * T, h: GH * T, bg: '#1f6f3a', controls: 'dpad+ab', aLabel: '💣',
  help: '방향키/WASD 이동 · Space/Z 폭탄 설치\n폭탄은 십자 방향으로 폭발, 다른 폭탄도 연쇄 폭발\n아이템: 💣 폭탄 수 +1 · 🔥 화력 +1 · 👟 속도 업\nAI 봄버 3명을 모두 쓰러뜨리면 라운드 승리! (5라운드)',
  init(g) { S = { round: 0, wins: 0 }; newRound(); },
  update(g, dt) {
    if (S.end > 0) { S.end -= dt; if (S.end <= 0) { if (!S.ents[0].alive) return g.over(`라운드 ${S.round} 패배`); if (S.round >= 5) return g.win('5라운드 모두 승리! 폭탄의 달인'); newRound(); } return; }
    const me = S.ents[0];
    if (me.alive) {
      const D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
      me.want = null;
      for (const k in D) if (g.held(k)) me.want = D[k];
      if (g.pressed('a')) placeBomb(g, me);
    }
    for (const e of S.ents) if (e.alive) { if (e.ai) think(e); step(e, dt); }
    for (const b of S.bombs) { b.t -= dt; if (b.t <= 0) explode(g, b); }
    S.bombs = S.bombs.filter((b) => !b.done);
    for (const f of S.flames) f.t -= dt;
    S.flames = S.flames.filter((f) => f.t > 0);
    for (const e of S.ents) {
      if (!e.alive) continue;
      const tx = Math.round(e.x), ty = Math.round(e.y);
      if (S.flames.some((f) => f.x === tx && f.y === ty)) { e.alive = false; g.sfx.lose(); g.burst(e.x * T + T / 2, e.y * T + T / 2, PC[e.i], 40); if (e.i) g.add(1000, e.x * T, e.y * T); }
      const pu = S.pups.find((p) => p.x === tx && p.y === ty);
      if (pu) { S.pups.splice(S.pups.indexOf(pu), 1); if (pu.k === '💣') e.max++; if (pu.k === '🔥') e.range++; if (pu.k === '👟') e.speed += 0.6; if (!e.ai) { g.sfx.power(); g.add(50); } }
    }
    const alive = S.ents.filter((e) => e.alive);
    if (!me.alive || alive.length <= 1) { S.end = 2; if (me.alive) { S.wins++; g.add(2000 * S.round); g.sfx.win(); S.msg = '🏆 라운드 승리!'; } else S.msg = '💀 패배...'; }
    g.info = `라운드 ${S.round}/5 · 💣${me.max} 🔥${me.range} 👟${me.speed.toFixed(1)}`;
  },
  draw(g, c) {
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
      const v = S.map[y][x], px = x * T, py = y * T;
      g.rect(px, py, T, T, (x + y) % 2 ? '#2f8f4e' : '#2a8447');
      if (v === 1) { g.rect(px, py, T, T, '#64748b'); g.rect(px + 4, py + 4, T - 8, T - 8, '#94a3b8'); g.rect(px + 8, py + 8, T - 16, 6, '#cbd5e1'); }
      if (v === 2) { g.rect(px + 2, py + 2, T - 4, T - 4, '#b45309'); g.line(px + 2, py + T / 2, px + T - 2, py + T / 2, '#78350f', 2); g.line(px + T / 2, py + 2, px + T / 2, py + T / 2, '#78350f', 2); g.line(px + T / 4, py + T / 2, px + T / 4, py + T - 2, '#78350f', 2); }
    }
    for (const p of S.pups) { g.rrect(p.x * T + 6, p.y * T + 6, T - 12, T - 12, 8, '#1e293b'); g.emoji(p.k, p.x * T + T / 2, p.y * T + T / 2, 28); }
    for (const b of S.bombs) { const s = 1 + Math.sin(b.t * 12) * 0.08; g.emoji('💣', b.x * T + T / 2, b.y * T + T / 2, 38 * s); }
    for (const f of S.flames) { c.globalAlpha = Math.min(1, f.t * 3); g.rect(f.x * T + 2, f.y * T + 2, T - 4, T - 4, '#f97316'); g.rect(f.x * T + 10, f.y * T + 10, T - 20, T - 20, '#fde047'); c.globalAlpha = 1; }
    for (const e of S.ents) if (e.alive) { g.circle(e.x * T + T / 2, e.y * T + T - 6, 14, 'rgba(0,0,0,.25)'); g.emoji(PE[e.i], e.x * T + T / 2, e.y * T + T / 2 - 4, 40); g.ring(e.x * T + T / 2, e.y * T + T / 2 - 4, 22, PC[e.i], 2); }
    if (S.end > 0) g.text(S.msg, g.W / 2, g.H / 2, 48, '#fff');
    if (S.intro > 0) { S.intro -= 1 / 60; g.text(`ROUND ${S.round}`, g.W / 2, g.H / 2, 56, '#fff'); }
  },
});
function newRound() {
  S.round++;
  S.map = U.grid(GW, GH, 0);
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    if (x === 0 || y === 0 || x === GW - 1 || y === GH - 1 || (x % 2 === 0 && y % 2 === 0)) S.map[y][x] = 1;
    else if (Math.random() < 0.7) S.map[y][x] = 2;
  }
  const starts = [[1, 1], [GW - 2, GH - 2], [GW - 2, 1], [1, GH - 2]];
  for (const [sx, sy] of starts) for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) if (S.map[sy + dy][sx + dx] === 2) S.map[sy + dy][sx + dx] = 0;
  S.ents = starts.map(([x, y], i) => ({ i, x, y, tx: x, ty: y, alive: true, ai: i > 0, max: 1, range: 2, speed: 3.5 + (i ? S.round * 0.15 : 0), want: null, plan: null, cool: U.rand(0.5, 1.5) }));
  S.bombs = []; S.flames = []; S.pups = []; S.end = 0; S.intro = 1.4;
}
const free = (x, y, e) => S.map[y]?.[x] === 0 && !S.bombs.some((b) => b.x === x && b.y === y && !(e && b.owner === e && Math.round(e.x) === x && Math.round(e.y) === y));
function step(e, dt) {
  const atCenter = e.x === e.tx && e.y === e.ty;
  if (atCenter && e.want) { const nx = e.tx + e.want[0], ny = e.ty + e.want[1]; if (free(nx, ny, e)) { e.fx = e.tx; e.fy = e.ty; e.tx = nx; e.ty = ny; } }
  else if (!atCenter && e.want && e.fx !== undefined && e.want[0] === Math.sign(e.fx - e.tx) && e.want[1] === Math.sign(e.fy - e.ty)) { [e.tx, e.fx] = [e.fx, e.tx]; [e.ty, e.fy] = [e.fy, e.ty]; }
  const sp = e.speed * dt;
  const dx = e.tx - e.x, dy = e.ty - e.y, d = Math.hypot(dx, dy);
  if (d <= sp) { e.x = e.tx; e.y = e.ty; } else { e.x += (dx / d) * sp; e.y += (dy / d) * sp; }
}
function placeBomb(g, e) {
  const x = Math.round(e.x), y = Math.round(e.y);
  if (S.bombs.filter((b) => b.owner === e).length >= e.max || S.bombs.some((b) => b.x === x && b.y === y)) return false;
  S.bombs.push({ x, y, t: 2.5, owner: e, range: e.range });
  if (!e.ai) g.sfx.drop();
  return true;
}
function blast(b) {
  const out = [[b.x, b.y]];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let i = 1; i <= b.range; i++) { const x = b.x + dx * i, y = b.y + dy * i, v = S.map[y][x]; if (v === 1) break; out.push([x, y]); if (v === 2) break; }
  return out;
}
function explode(g, b) {
  if (b.done) return;
  b.done = true;
  g.sfx.explode(); g.shake(5, 0.15);
  for (const [x, y] of blast(b)) {
    S.flames.push({ x, y, t: 0.5 });
    if (S.map[y][x] === 2) { S.map[y][x] = 0; if (b.owner.i === 0) g.add(10); if (Math.random() < 0.3) S.pups.push({ x, y, k: U.choice(['💣', '🔥', '👟']) }); }
    else { const pi = S.pups.findIndex((p) => p.x === x && p.y === y); if (pi >= 0 && !S.flames.some((f) => f.x === x && f.y === y && f.t < 0.5)) {} }
    for (const o of S.bombs) if (!o.done && o.x === x && o.y === y) explode(g, o);
  }
}
function danger() {
  const D = U.grid(GW, GH, 99);
  for (const b of S.bombs) for (const [x, y] of blast(b)) D[y][x] = Math.min(D[y][x], b.t);
  for (const f of S.flames) D[f.y][f.x] = 0;
  return D;
}
function bfs(sx, sy, e, goal, D, maxSteps = 30) {
  const prev = new Map(), q = [[sx, sy, 0]], key = (x, y) => x + y * 100;
  prev.set(key(sx, sy), null);
  while (q.length) {
    const [x, y, d] = q.shift();
    if (goal(x, y, d)) { let k = key(x, y), path = []; while (prev.get(k) !== null) { path.unshift([k % 100, Math.floor(k / 100)]); k = prev.get(k); } return path; }
    if (d >= maxSteps) continue;
    for (const [dx, dy] of U.shuffle([[1, 0], [-1, 0], [0, 1], [0, -1]])) {
      const nx = x + dx, ny = y + dy, k = key(nx, ny);
      if (prev.has(k) || !free(nx, ny, e)) continue;
      const arrive = (d + 1) / e.speed;
      if (D[ny][nx] < 99 && D[ny][nx] - arrive < 0.6 && D[ny][nx] - arrive > -0.6) continue;
      if (D[ny][nx] === 0) continue;
      prev.set(k, key(x, y)); q.push([nx, ny, d + 1]);
    }
  }
  return null;
}
function think(e) {
  if (e.x !== e.tx || e.y !== e.ty) return;
  const x = e.tx, y = e.ty, D = danger();
  e.want = null;
  if (D[y][x] < 99) { const p = bfs(x, y, e, (a, b) => D[b][a] >= 99, D); if (p && p.length) e.want = [p[0][0] - x, p[0][1] - y]; return; }
  e.cool -= 1 / 60 * 6;
  const foes = S.ents.filter((o) => o !== e && o.alive);
  const nearSoft = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => S.map[y + dy][x + dx] === 2);
  const enemyInLine = foes.some((o) => { const ox = Math.round(o.x), oy = Math.round(o.y); return (ox === x && Math.abs(oy - y) <= e.range) || (oy === y && Math.abs(ox - x) <= e.range); });
  if ((nearSoft || enemyInLine) && e.cool <= 0 && Math.random() < 0.6) {
    const fake = { x, y, t: 2.5, range: e.range, owner: e };
    S.bombs.push(fake);
    const D2 = danger();
    const esc = bfs(x, y, e, (a, b) => D2[b][a] >= 99, D2, 8);
    S.bombs.pop();
    if (esc && placeBomb(null, e)) { e.cool = U.rand(1, 2.5); if (esc.length) e.want = [esc[0][0] - x, esc[0][1] - y]; return; }
  }
  const pu = S.pups.length ? bfs(x, y, e, (a, b) => S.pups.some((p) => p.x === a && p.y === b), D, 12) : null;
  let path = pu;
  if (!path) {
    const hunt = Math.random() < 0.35 + S.round * 0.05;
    path = hunt ? bfs(x, y, e, (a, b) => foes.some((o) => Math.abs(Math.round(o.x) - a) + Math.abs(Math.round(o.y) - b) <= 1 && (a !== x || b !== y)), D, 40)
      : bfs(x, y, e, (a, b) => (a !== x || b !== y) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => S.map[b + dy]?.[a + dx] === 2), D, 20);
  }
  if (path && path.length) { const [nx, ny] = path[0]; if (D[ny][nx] >= 99) e.want = [nx - x, ny - y]; }
  else if (Math.random() < 0.3) { const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => free(x + dx, y + dy, e) && D[y + dy][x + dx] >= 99); if (dirs.length) e.want = U.choice(dirs); }
}
