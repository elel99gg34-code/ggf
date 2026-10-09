let S;
const CATS = [['에이스', '⚀'], ['듀스', '⚁'], ['트리플', '⚂'], ['쿼드', '⚃'], ['펜타', '⚄'], ['헥사', '⚅'], ['초이스', '🎲'], ['포카드', '4️⃣'], ['풀하우스', '🏠'], ['S.스트레이트', '📏'], ['L.스트레이트', '📐'], ['요트', '⛵']];
GAME({
  title: '요트 다이스', w: 1000, h: 760, bg: '#064e3b', controls: 'none',
  help: '🎲 굴리기 (한 턴에 최대 3번) · 주사위 클릭 = 고정/해제\n점수판에서 원하는 족보를 클릭해 기록 (예상 점수가 표시돼요)\n상단 6칸 합계 63점 이상이면 보너스 +35\n12라운드 후 AI보다 점수가 높으면 승리!',
  init(g) { S = { dice: [1, 2, 3, 4, 5], hold: [0, 0, 0, 0, 0], rolls: 0, sc: [Array(12).fill(null), Array(12).fill(null)], turn: 0, round: 1, anim: 0, think: 0, end: false, aiStep: 0 }; },
  update(g, dt) {
    if (S.anim > 0) { S.anim -= dt; for (let i = 0; i < 5; i++) if (!S.hold[i]) S.dice[i] = U.randi(1, 6); if (S.anim <= 0) { for (let i = 0; i < 5; i++) if (!S.hold[i]) S.dice[i] = S.final[i]; } return; }
    if (S.end) return;
    if (S.turn === 1) { S.think -= dt; if (S.think <= 0) aiStep(g); return; }
    if (g.clickIn(560, 560, 200, 70) && S.rolls < 3) roll(g);
    if (g.keyp('Space') && S.rolls < 3) roll(g);
    if (S.rolls > 0) for (let i = 0; i < 5; i++) if (g.clickIn(420 + i * 110 - 45, 400, 90, 90) || g.keyp('Digit' + (i + 1))) { S.hold[i] ^= 1; g.sfx.click(); }
    if (S.rolls > 0) for (let k = 0; k < 12; k++) if (g.clickIn(30, rowY(k) - 18, 300, 36) && S.sc[0][k] === null) { commit(g, 0, k); break; }
  },
  draw(g, c) {
    g.rrect(20, 20, 330, 720, 14, '#022c22');
    g.text('족보', 40, 46, 16, '#a7f3d0', 'left'); g.text('나', 250, 46, 16, '#a7f3d0'); g.text('AI', 310, 46, 16, '#a7f3d0');
    for (let k = 0; k < 12; k++) {
      const y = rowY(k), mine = S.sc[0][k], ai = S.sc[1][k], can = S.turn === 0 && S.rolls > 0 && mine === null && !S.end;
      if (can && g.inRect(30, y - 18, 300, 36)) g.rrect(30, y - 18, 310, 36, 6, 'rgba(250,204,21,.2)');
      g.text(`${CATS[k][1]} ${CATS[k][0]}`, 40, y, 16, '#ecfdf5', 'left');
      g.text(mine !== null ? mine : can ? score(S.dice, k) : '', 250, y, 18, mine !== null ? '#fff' : '#fde047');
      g.text(ai !== null ? ai : '', 310, y, 18, '#fff');
      if (k === 5) { const y2 = y + 30; g.line(30, y2 - 15, 340, y2 - 15, '#065f46', 1); g.text(`보너스 (${upper(0)}/63)`, 40, y2, 13, '#6ee7b7', 'left'); g.text(upper(0) >= 63 ? 35 : 0, 250, y2, 15, '#6ee7b7'); g.text(upper(1) >= 63 ? 35 : 0, 310, y2, 15, '#6ee7b7'); }
    }
    g.line(30, 690, 340, 690, '#10b981', 2);
    g.text('합계', 40, 712, 20, '#fff', 'left'); g.text(total(0), 250, 712, 22, '#fde047'); g.text(total(1), 310, 712, 22, '#fde047');
    g.text(`라운드 ${Math.min(12, S.round)} / 12`, 640, 60, 28, '#fff');
    g.text(S.end ? S.msg : S.turn === 0 ? `당신 차례 · 남은 굴리기 ${3 - S.rolls}` : 'AI 차례...', 640, 110, 22, S.end ? '#fde047' : '#a7f3d0');
    g.rrect(380, 300, 520, 220, 30, '#065f46', '#047857', 4);
    for (let i = 0; i < 5; i++) die(g, 420 + i * 110, 445, S.dice[i], S.hold[i], S.anim > 0 && !S.hold[i]);
    if (S.turn === 0 && S.rolls > 0 && !S.end) g.text('주사위를 클릭해서 고정', 640, 330, 15, '#a7f3d0');
    if (S.turn === 0 && !S.end) g.button(560, 560, 200, 70, S.rolls < 3 ? `🎲 굴리기 (${3 - S.rolls})` : '족보를 선택하세요', S.rolls < 3 ? '#16a34a' : '#374151', 20);
  },
});
function rowY(k) { return 84 + k * 46 + (k > 5 ? 30 : 0); }
function die(g, x, y, v, hold, spin) {
  const c = g.ctx; c.save(); c.translate(x, y - (hold ? 12 : 0)); if (spin) c.rotate(Math.random() - 0.5);
  g.rrect(-42, -42, 84, 84, 14, hold ? '#fde68a' : '#fff', hold ? '#f59e0b' : '#d1d5db', 4);
  const P = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] }[v];
  for (const [a, b] of P) g.circle(a * 22, b * 22, 8, v === 1 ? '#dc2626' : '#111');
  c.restore();
  if (hold) g.text('고정', x, y + 50, 13, '#fde68a');
}
function counts(d) { const c = [0, 0, 0, 0, 0, 0, 0]; d.forEach((v) => c[v]++); return c; }
function score(d, k) {
  const c = counts(d), sum = d.reduce((a, b) => a + b, 0);
  if (k < 6) return c[k + 1] * (k + 1);
  if (k === 6) return sum;
  if (k === 7) return c.some((n) => n >= 4) ? sum : 0;
  if (k === 8) return c.includes(3) && c.includes(2) ? sum : 0;
  const s = new Set(d);
  if (k === 9) return [[1, 2, 3, 4], [2, 3, 4, 5], [3, 4, 5, 6]].some((r) => r.every((v) => s.has(v))) ? 15 : 0;
  if (k === 10) return [[1, 2, 3, 4, 5], [2, 3, 4, 5, 6]].some((r) => r.every((v) => s.has(v))) ? 30 : 0;
  return c.some((n) => n === 5) ? 50 : 0;
}
function upper(p) { return S.sc[p].slice(0, 6).reduce((a, b) => a + (b || 0), 0); }
function total(p) { return S.sc[p].reduce((a, b) => a + (b || 0), 0) + (upper(p) >= 63 ? 35 : 0); }
function roll(g) { S.rolls++; S.final = S.dice.map((v, i) => (S.hold[i] ? v : U.randi(1, 6))); S.anim = 0.5; g.sfx.tone(200, 0.3, 'square', 0.03, 600); g.sfx.noise(0.25, 0.08); }
function commit(g, p, k) {
  S.sc[p][k] = score(S.dice, k);
  if (p === 0) { g.add(S.sc[0][k] * 5); S.sc[0][k] >= 30 ? g.sfx.win() : g.sfx.coin(); if (k === 11 && S.sc[0][k]) g.float(640, 250, '⛵ YACHT!!', '#fde047', 50); }
  S.hold = [0, 0, 0, 0, 0]; S.rolls = 0;
  if (p === 1) S.round++;
  if (S.round > 12) { S.end = true; const a = total(0), b = total(1); if (a > b) { S.msg = `🏆 ${a} : ${b} 승리!`; g.add(1000); g.later(() => g.win(S.msg), 1); } else { S.msg = a === b ? `무승부 ${a}:${b}` : `${a} : ${b} 패배`; g.later(() => g.over(S.msg), 1); } return; }
  S.turn = 1 - p; S.think = 0.8; S.aiStep = 0;
}
function aiStep(g) {
  if (S.rolls === 0) { roll(g); S.think = 1; return; }
  const open = [...Array(12).keys()].filter((k) => S.sc[1][k] === null);
  const best = open.reduce((b, k) => { const v = score(S.dice, k) * (k < 6 ? 1.3 : 1) + (k === 11 && score(S.dice, 11) ? 100 : 0) - (k === 6 ? 8 : 0); return v > b[0] ? [v, k] : b; }, [-1, open[0]]);
  if (S.rolls < 3 && !(best[1] >= 8 && score(S.dice, best[1]) >= 25)) {
    const c = counts(S.dice); let keep = c.indexOf(Math.max(...c));
    const s = [...new Set(S.dice)].sort();
    const straightish = s.length >= 4 && (open.includes(9) || open.includes(10));
    S.hold = S.dice.map((v, i) => (straightish ? (S.dice.indexOf(v) === i && s.includes(v) ? 1 : 0) : v === keep ? 1 : 0));
    roll(g); S.think = 1; return;
  }
  const pick = best[0] <= 0 ? open.reduce((b, k) => ([0, 1, 7, 11].includes(k) && score(S.dice, k) === 0 ? k : b), open[0]) : best[1];
  commit(g, 1, pick);
}
