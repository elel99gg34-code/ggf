let S;
const N = 10, CS = 40, MX = 40, EX = 520, GY = 140;
const SHIPS = [5, 4, 3, 3, 2];
const SN = { 5: '항공모함', 4: '전함', 3: '순양함', 2: '구축함' };
GAME({
  title: '배틀십', w: 960, h: 640, bg: '#082f49', controls: 'none',
  help: '오른쪽 적 해역을 클릭해서 포격!\n💥 명중하면 한 번 더 · 🌊 빗나가면 AI 차례\n배치 단계: 🎲 버튼으로 내 함대 재배치 후 ▶ 시작\n적 함대 5척을 먼저 모두 격침하면 승리',
  init(g) { S = { phase: 'place', me: fleet(), ai: fleet(), myShots: U.grid(N, N, 0), aiShots: U.grid(N, N, 0), turn: 0, think: 0, end: false, targets: [], shots: 0, msg: '' }; },
  update(g, dt) {
    if (S.phase === 'place') { if (g.clickIn(40, 570, 180, 50)) { S.me = fleet(); g.sfx.click(); } if (g.clickIn(240, 570, 180, 50)) { S.phase = 'play'; g.sfx.power(); } return; }
    if (S.end) return;
    if (S.turn === 1) { S.think -= dt; if (S.think <= 0) aiShoot(g); return; }
    if (!g.mouse.clicked) return;
    const x = Math.floor((g.mouse.x - EX) / CS), y = Math.floor((g.mouse.y - GY) / CS);
    if (x < 0 || y < 0 || x >= N || y >= N || S.myShots[y][x]) return;
    S.shots++;
    const hit = shipAt(S.ai, x, y);
    if (hit) { S.myShots[y][x] = 2; hit.hits++; g.sfx.explode(); g.shake(5); g.burst(EX + x * CS + CS / 2, GY + y * CS + CS / 2, ['#f97316', '#fde047'], 18); g.add(50);
      if (hit.hits === hit.len) { hit.sunk = true; g.add(300); S.msg = `적 ${SN[hit.len]} 격침!`; g.sfx.win(); if (S.ai.every((s) => s.sunk)) { S.end = true; g.add(Math.max(500, 3000 - S.shots * 25)); return g.later(() => g.win(`${S.shots}발 만에 적 함대 전멸!`), 1); } } else S.msg = '명중! 한 번 더'; }
    else { S.myShots[y][x] = 1; g.sfx.drop(); S.msg = '빗나감...'; S.turn = 1; S.think = 0.8; }
  },
  draw(g, c) {
    grid(g, MX, '내 해역', true); grid(g, EX, '적 해역', false);
    g.text(S.phase === 'place' ? '함대를 배치하세요' : S.end ? '' : S.turn === 0 ? '🎯 당신 차례 — 적 해역을 클릭' : 'AI가 조준 중...', 480, 40, 22, '#e0f2fe');
    if (S.msg && S.phase === 'play') g.text(S.msg, 480, 80, 20, '#fde047');
    if (S.phase === 'place') { g.button(40, 570, 180, 50, '🎲 다시 배치', '#0369a1', 18); g.button(240, 570, 180, 50, '▶ 전투 시작', '#16a34a', 18); }
    else { g.text(`남은 적 함선: ${S.ai.filter((s) => !s.sunk).map((s) => SN[s.len]).join(', ') || '없음'}`, 720, 600, 15, '#bae6fd'); g.text(`내 함선: ${S.me.filter((s) => !s.sunk).length}척`, 240, 600, 15, '#bae6fd'); }
  },
});
function grid(g, ox, title, mine) {
  g.text(title, ox + 200, GY - 24, 20, '#fff');
  g.rect(ox, GY, N * CS, N * CS, '#0c4a6e');
  for (let i = 0; i <= N; i++) { g.line(ox + i * CS, GY, ox + i * CS, GY + N * CS, '#0369a1', 1); g.line(ox, GY + i * CS, ox + N * CS, GY + i * CS, '#0369a1', 1); }
  for (let i = 0; i < N; i++) { g.text('ABCDEFGHIJ'[i], ox + i * CS + CS / 2, GY - 8, 12, '#7dd3fc'); g.text(i + 1, ox - 12, GY + i * CS + CS / 2, 12, '#7dd3fc'); }
  const fl = mine ? S.me : S.ai, shots = mine ? S.aiShots : S.myShots;
  for (const s of fl) if (mine || s.sunk || S.end) { const w = s.h ? s.len * CS : CS, h = s.h ? CS : s.len * CS; g.rrect(ox + s.x * CS + 4, GY + s.y * CS + 4, w - 8, h - 8, 14, s.sunk ? '#7f1d1d' : '#64748b', '#cbd5e1', 2); }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const v = shots[y][x], px = ox + x * CS + CS / 2, py = GY + y * CS + CS / 2; if (v === 1) g.circle(px, py, 6, '#e0f2fe'); if (v === 2) g.emoji('💥', px, py, 30); }
  if (!mine && S.phase === 'play' && S.turn === 0 && !S.end) { const x = Math.floor((g.mouse.x - EX) / CS), y = Math.floor((g.mouse.y - GY) / CS); if (x >= 0 && y >= 0 && x < N && y < N && !S.myShots[y][x]) { g.ring(EX + x * CS + CS / 2, GY + y * CS + CS / 2, 16, '#f87171', 3); } }
}
function fleet() {
  const f = [], occ = U.grid(N, N, false);
  for (const len of SHIPS) for (let t = 0; t < 500; t++) {
    const h = Math.random() < 0.5, x = U.randi(0, h ? N - len : N - 1), y = U.randi(0, h ? N - 1 : N - len);
    let ok = true; for (let k = 0; k < len; k++) { const cx = x + (h ? k : 0), cy = y + (h ? 0 : k); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (occ[cy + dy]?.[cx + dx]) ok = false; }
    if (!ok) continue;
    for (let k = 0; k < len; k++) occ[y + (h ? 0 : k)][x + (h ? k : 0)] = true;
    f.push({ x, y, h, len, hits: 0, sunk: false }); break;
  }
  return f;
}
function shipAt(fl, x, y) { return fl.find((s) => (s.h ? y === s.y && x >= s.x && x < s.x + s.len : x === s.x && y >= s.y && y < s.y + s.len)); }
function aiShoot(g) {
  const sh = S.aiShots;
  let pick = null;
  // 타겟 모드: 맞았지만 침몰하지 않은 칸 주변
  const hits = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (sh[y][x] === 2) { const s = shipAt(S.me, x, y); if (s && !s.sunk) hits.push([x, y]); }
  if (hits.length) {
    const cands = [];
    if (hits.length >= 2) { const horiz = hits.every(([, y]) => y === hits[0][1]); const xs = hits.map((h) => h[0]), ys = hits.map((h) => h[1]); if (horiz) cands.push([Math.min(...xs) - 1, hits[0][1]], [Math.max(...xs) + 1, hits[0][1]]); else cands.push([hits[0][0], Math.min(...ys) - 1], [hits[0][0], Math.max(...ys) + 1]); }
    for (const [x, y] of hits) cands.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    pick = cands.find(([x, y]) => x >= 0 && y >= 0 && x < N && y < N && !sh[y][x]);
  }
  if (!pick) {
    // 확률 밀도: 남은 함선이 들어갈 수 있는 배치 수
    const alive = S.me.filter((s) => !s.sunk).map((s) => s.len), dens = U.grid(N, N, 0);
    for (const len of alive) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) for (const h of [true, false]) { let ok = true; for (let k = 0; k < len; k++) { const cx = x + (h ? k : 0), cy = y + (h ? 0 : k); if (cx >= N || cy >= N || sh[cy][cx]) { ok = false; break; } } if (ok) for (let k = 0; k < len; k++) dens[y + (h ? 0 : k)][x + (h ? k : 0)]++; }
    let bv = -1; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!sh[y][x] && dens[y][x] + Math.random() > bv) { bv = dens[y][x] + Math.random(); pick = [x, y]; }
  }
  const [x, y] = pick, s = shipAt(S.me, x, y);
  if (s) { sh[y][x] = 2; s.hits++; g.sfx.hit(); g.shake(6); g.burst(MX + x * CS + CS / 2, GY + y * CS + CS / 2, '#f97316', 14); if (s.hits === s.len) { s.sunk = true; S.msg = `내 ${SN[s.len]}이(가) 격침당했다!`; if (S.me.every((q) => q.sunk)) { S.end = true; return g.later(() => g.over('내 함대가 전멸했다'), 1); } } S.think = 0.7; }
  else { sh[y][x] = 1; g.sfx.drop(); S.turn = 0; }
}
