let S;
const ICONS = ['🐶', '🐱', '🦊', '🐼', '🐸', '🐵', '🦁', '🐯', '🐷', '🐨', '🐰', '🐻', '🦄', '🐙', '🦋', '🐢', '🐬', '🦉'];
const LEVELS = [[4, 3], [4, 4], [5, 4], [6, 5], [6, 6]];
GAME({
  title: '카드 짝 맞추기', w: 900, h: 820, bg: '#0f766e', controls: 'none',
  help: '카드를 두 장씩 뒤집어 같은 그림을 찾으세요\n짝을 맞히면 그대로 열려 있고, 틀리면 다시 덮여요\n연속으로 맞히면 콤보 보너스!\n5단계 · 시도 횟수가 적을수록 고득점',
  init(g) { S = { lvl: 0 }; next(); },
  update(g, dt) {
    for (const cd of S.cards) cd.f += ((cd.up || cd.done ? 1 : 0) - cd.f) * Math.min(1, dt * 12);
    if (S.done > 0) { S.done -= dt; if (S.done <= 0) { if (S.lvl >= LEVELS.length) return g.win(`모든 단계 클리어! 시도 ${S.totalTries}회`); next(); } return; }
    if (S.wait > 0) { S.wait -= dt; if (S.wait <= 0) { S.open.forEach((cd) => (cd.up = false)); S.open = []; } return; }
    S.time += dt;
    if (!g.mouse.clicked) return;
    const cd = S.cards.find((c) => g.inRect(c.x, c.y, S.cw, S.ch));
    if (!cd || cd.up || cd.done) return;
    cd.up = true; S.open.push(cd); g.sfx.tone(600, 0.04, 'sine', 0.05);
    if (S.open.length === 2) {
      S.tries++; S.totalTries++;
      const [a, b] = S.open;
      if (a.v === b.v) { a.done = b.done = true; S.open = []; S.streak++; const pts = 50 + S.streak * 25; g.add(pts); g.float(b.x + S.cw / 2, b.y, `+${pts}` + (S.streak > 1 ? ` 콤보 ${S.streak}` : ''), '#fde047', 24); g.sfx.coin(); if (S.cards.every((c) => c.done)) { const bonus = Math.max(100, S.cards.length * 40 - (S.tries - S.cards.length / 2) * 20); g.add(bonus); g.sfx.win(); S.done = 1.5; } }
      else { S.streak = 0; S.wait = 0.8; g.sfx.hit(); }
    }
    g.info = `단계 ${S.lvl}/${LEVELS.length} · 시도 ${S.tries}`;
  },
  draw(g, c) {
    g.text(`단계 ${S.lvl}`, 450, 36, 26, '#fff');
    for (const cd of S.cards) {
      const s = Math.abs(Math.cos(cd.f * Math.PI)), front = cd.f > 0.5, cx = cd.x + S.cw / 2;
      c.save(); c.translate(cx, cd.y + S.ch / 2); c.scale(Math.max(0.02, s), 1);
      if (front) { g.rrect(-S.cw / 2, -S.ch / 2, S.cw, S.ch, 12, cd.done ? '#fef9c3' : '#fff', cd.done ? '#facc15' : '#99f6e4', 3); g.emoji(ICONS[cd.v], 0, 0, Math.min(S.cw, S.ch) * 0.6); }
      else { g.rrect(-S.cw / 2, -S.ch / 2, S.cw, S.ch, 12, '#7c3aed', '#c4b5fd', 3); g.text('?', 0, 2, S.ch * 0.4, 'rgba(255,255,255,.5)'); }
      c.restore();
    }
    if (S.done > 0) g.text('🎉 완료!', 450, 420, 60, '#fde047');
  },
});
function next() {
  const [cols, rows] = LEVELS[S.lvl]; S.lvl++;
  const n = (cols * rows) - ((cols * rows) % 2);
  const vals = U.shuffle([...Array(ICONS.length).keys()]).slice(0, n / 2);
  const deck = U.shuffle([...vals, ...vals]);
  S.cw = Math.min(130, (840 - (cols - 1) * 12) / cols); S.ch = Math.min(150, (740 - (rows - 1) * 12) / rows);
  const ox = (900 - (cols * S.cw + (cols - 1) * 12)) / 2, oy = 70 + (740 - (rows * S.ch + (rows - 1) * 12)) / 2;
  S.cards = deck.map((v, i) => ({ v, x: ox + (i % cols) * (S.cw + 12), y: oy + Math.floor(i / cols) * (S.ch + 12), up: false, done: false, f: 0 }));
  S.open = []; S.tries = 0; S.streak = 0; S.time = 0; S.done = 0; S.wait = 0; S.totalTries = S.totalTries || 0;
}
