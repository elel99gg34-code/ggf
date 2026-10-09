let S;
GAME({
  title: '만칼라', w: 1000, h: 600, bg: '#422006', controls: 'none',
  help: '아래쪽 내 구멍 6개 중 하나를 클릭 → 씨앗을 반시계 방향으로 한 개씩 뿌려요\n마지막 씨앗이 내 창고(오른쪽)에 들어가면 한 번 더!\n마지막 씨앗이 내 빈 구멍에 떨어지면 맞은편 씨앗까지 몽땅 획득\n한쪽 줄이 비면 끝 · 창고에 씨앗이 더 많으면 승리',
  init(g) { S = { p: [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0], turn: 0, anim: [], end: false, think: 0, hl: -1 }; },
  update(g, dt) {
    if (S.anim.length) { S.animT -= dt; if (S.animT <= 0) { const a = S.anim.shift(); a(); S.animT = 0.12; } return; }
    if (S.end) return;
    if (S.turn === 1) { S.think -= dt; if (S.think <= 0) sow(g, aiPick(), 1); return; }
    S.hl = -1;
    for (let i = 0; i < 6; i++) { const [x, y] = pit(i); if (U.dist(g.mouse.x, g.mouse.y, x, y) < 52 && S.p[i]) { S.hl = i; if (g.mouse.clicked) sow(g, i, 0); } }
  },
  draw(g, c) {
    g.rrect(40, 120, 920, 360, 180, '#92400e', '#451a03', 6);
    g.rrect(60, 140, 880, 320, 160, '#b45309');
    for (let i = 0; i < 14; i++) {
      const [x, y] = pit(i), store = i === 6 || i === 13;
      if (store) g.rrect(x - 50, y - 120, 100, 240, 50, '#78350f'); else g.circle(x, y, 50, i === S.hl ? '#a16207' : '#78350f');
      const n = S.p[i];
      for (let k = 0; k < Math.min(n, 30); k++) { const a = k * 2.4, r = store ? 6 + (k % 6) * 6 : 6 + Math.sqrt(k) * 8; g.circle(x + Math.cos(a) * Math.min(r, store ? 34 : 34), y + Math.sin(a) * Math.min(r * (store ? 2.6 : 1), store ? 95 : 34), 8, `hsl(${(k * 47 + i * 30) % 360},70%,60%)`); }
      g.text(n, x, store ? y + 150 : i < 6 ? y + 72 : y - 72, 22, '#fef3c7');
    }
    g.text('AI 창고', 905, 100, 16, '#fde68a'); g.text('', 95, 100, 16, '#fde68a');
    g.text('🥣 만칼라', 500, 40, 30, '#fff');
    g.text(S.end ? S.msg : S.turn === 0 ? '당신 차례 (아래 줄)' : 'AI 차례...', 500, 80, 20, S.end ? '#fde047' : '#fde68a');
    g.text(`나 ${S.p[6]}  :  AI ${S.p[13]}`, 500, 560, 26, '#fff');
    g.text('내 창고 →', 830, 520, 14, '#fde68a'); g.text('← AI 창고', 170, 80, 14, '#fde68a');
  },
});
function pit(i) { if (i < 6) return [210 + i * 116, 380]; if (i === 6) return [880, 300]; if (i < 13) return [210 + (12 - i) * 116, 220]; return [120, 300]; }
function sim(p, i, side) {
  p = p.slice(); let n = p[i]; p[i] = 0; let k = i;
  const skip = side === 0 ? 13 : 6;
  while (n) { k = (k + 1) % 14; if (k === skip) continue; p[k]++; n--; }
  let extra = (side === 0 && k === 6) || (side === 1 && k === 13);
  const mine = side === 0 ? k < 6 : k > 6 && k < 13;
  if (!extra && mine && p[k] === 1 && p[12 - k] > 0) { const st = side === 0 ? 6 : 13; p[st] += p[12 - k] + 1; p[12 - k] = 0; p[k] = 0; }
  const e0 = p.slice(0, 6).every((v) => !v), e1 = p.slice(7, 13).every((v) => !v);
  if (e0 || e1) { for (let j = 0; j < 6; j++) { p[6] += p[j]; p[j] = 0; p[13] += p[7 + j]; p[7 + j] = 0; } }
  return { p, extra, last: k, over: e0 || e1 };
}
function sow(g, i, side) {
  const r = sim(S.p, i, side);
  // 애니메이션: 한 알씩
  let n = S.p[i], k = i; const skip = side === 0 ? 13 : 6; const steps = [];
  S.p[i] = 0;
  while (n) { k = (k + 1) % 14; if (k === skip) continue; const kk = k; steps.push(() => { S.p[kk]++; g.sfx.tone(500 + kk * 20, 0.04, 'sine', 0.05); }); n--; }
  steps.push(() => {
    const gain = side === 0 ? r.p[6] - S.p[6] : 0;
    S.p = r.p; if (side === 0 && gain > 0) g.add(gain * 10);
    if (r.over) { S.end = true; const a = S.p[6], b = S.p[13]; if (a > b) { S.msg = `🏆 ${a} : ${b} 승리!`; g.add(1000 + (a - b) * 50); g.later(() => g.win(S.msg), 1); } else { S.msg = a === b ? `무승부 ${a}:${b}` : `${a} : ${b} 패배`; g.later(() => g.over(S.msg), 1); } return; }
    if (r.extra) { g.float(500, 300, side === 0 ? '한 번 더!' : 'AI 한 번 더!', '#fde047', 30); g.sfx.coin(); } else S.turn = 1 - side;
    if (S.turn === 1) S.think = 0.6;
  });
  S.anim = steps; S.animT = 0; S.turn = -1;
}
function mm(p, d, side, a, b) {
  const moves = [...Array(6).keys()].map((j) => (side === 0 ? j : 7 + j)).filter((j) => p[j]);
  if (!d || !moves.length) return p[13] - p[6];
  let best = side === 1 ? -1e9 : 1e9;
  for (const j of moves) { const r = sim(p, j, side); const v = r.over ? (r.p[13] - r.p[6]) * 100 : mm(r.p, d - 1, r.extra ? side : 1 - side, a, b); if (side === 1) { best = Math.max(best, v); a = Math.max(a, v); } else { best = Math.min(best, v); b = Math.min(b, v); } if (a >= b) break; }
  return best;
}
function aiPick() { let best = 7, bv = -1e9; for (let j = 7; j < 13; j++) if (S.p[j]) { const r = sim(S.p, j, 1); const v = r.over ? (r.p[13] - r.p[6]) * 100 : mm(r.p, 7, r.extra ? 1 : 0, -1e9, 1e9) + (r.extra ? 0.5 : 0); if (v > bv) { bv = v; best = j; } } return best; }
