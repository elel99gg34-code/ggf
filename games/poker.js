let S;
const SU = ['♠', '♥', '♦', '♣'], RK = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const PAY = [['로열 플러시', 250], ['스트레이트 플러시', 50], ['포카드', 25], ['풀하우스', 9], ['플러시', 6], ['스트레이트', 4], ['트리플', 3], ['투페어', 2], ['잭스 이상 원페어', 1]];
GAME({
  title: '비디오 포커', w: 1000, h: 760, bg: '#1e1b4b', controls: 'none',
  help: '잭스 오어 베터 룰 · 베팅(1~5) 후 딜\n남길 카드를 클릭해서 HOLD → 드로우로 나머지 교체\n족보에 따라 배당 (5배팅 로열 플러시는 4000!)\n크레딧이 바닥나면 끝 · 캐시아웃 가능',
  init(g) { S = { cr: 200, bet: 1, hand: [], hold: [0, 0, 0, 0, 0], phase: 'bet', deck: [], res: null, flip: 0 }; },
  update(g, dt) {
    S.flip = Math.min(5, S.flip + dt * 12);
    g.score = S.cr;
    if (S.phase !== 'draw') {
      for (let b = 1; b <= 5; b++) if (g.clickIn(120 + (b - 1) * 70, 620, 60, 50) || g.keyp('Digit' + b)) { S.bet = b; g.sfx.click(); }
      if (g.clickIn(820, 20, 150, 44)) return g.win(`💰 ${S.cr} 크레딧 캐시아웃!`);
      if ((g.clickIn(560, 610, 200, 70) || g.keyp('Space')) && S.cr >= S.bet) { S.cr -= S.bet; newDeck(); S.hand = S.deck.splice(0, 5); S.hold = [0, 0, 0, 0, 0]; S.phase = 'draw'; S.res = null; S.flip = 0; g.sfx.tone(500, 0.1, 'triangle', 0.06); }
      else if (S.cr < 1 && S.phase === 'done') return g.over('크레딧이 바닥났다');
    } else {
      for (let i = 0; i < 5; i++) if (g.clickIn(110 + i * 160, 300, 140, 200) || g.keyp('Digit' + (i + 1))) { S.hold[i] ^= 1; g.sfx.click(); }
      if (g.clickIn(560, 610, 200, 70) || g.keyp('Space')) {
        for (let i = 0; i < 5; i++) if (!S.hold[i]) S.hand[i] = S.deck.pop();
        S.flip = 0; const r = rank(S.hand); S.res = r; S.phase = 'done';
        if (r >= 0) { const mult = PAY[r][1] * S.bet * (r === 0 && S.bet === 5 ? 3.2 : 1); S.cr += Math.round(mult); g.sfx.win(); S.won = Math.round(mult); if (r <= 3) g.shake(8); } else { S.won = 0; g.sfx.lose(); }
        if (S.cr <= 0) g.later(() => g.over('크레딧이 바닥났다'), 1.2);
      }
    }
  },
  draw(g, c) {
    g.rrect(100, 20, 620, 250, 14, '#0f0a3c', '#facc15', 2);
    PAY.forEach(([n, p], i) => { const y = 42 + i * 25, hl = S.res === i; if (hl) g.rect(104, y - 12, 612, 24, 'rgba(250,204,21,.3)'); g.text(n, 120, y, 16, hl ? '#fde047' : '#e0e7ff', 'left'); for (let b = 1; b <= 5; b++) g.text(i === 0 && b === 5 ? 4000 : p * b, 400 + b * 60, y, 15, b === S.bet ? '#fde047' : '#818cf8', 'right'); });
    for (let i = 0; i < 5; i++) {
      const x = 110 + i * 160, y = 300, cd = S.hand[i], show = cd && (S.flip > i * 0.5 || S.hold[i]);
      if (!cd) { g.rrect(x, y, 140, 200, 12, '#312e81', '#6366f1', 2); continue; }
      if (show) { const col = cd.s === 1 || cd.s === 2 ? '#dc2626' : '#111'; g.rrect(x, y, 140, 200, 12, '#fff', S.hold[i] ? '#facc15' : '#c7d2fe', S.hold[i] ? 5 : 2); g.text(RK[cd.r], x + 14, y + 24, 28, col, 'left'); g.text(SU[cd.s], x + 14, y + 54, 24, col, 'left'); g.text(SU[cd.s], x + 70, y + 115, 70, col); }
      else g.rrect(x, y, 140, 200, 12, '#7c3aed', '#fff', 3);
      if (S.hold[i]) g.text('HOLD', x + 70, y + 222, 20, '#fde047');
    }
    g.text(`💰 크레딧 ${S.cr}`, 750, 120, 26, '#fde047', 'left');
    g.text('베팅', 60, 645, 18, '#c7d2fe', 'left');
    for (let b = 1; b <= 5; b++) g.button(120 + (b - 1) * 70, 620, 60, 50, String(b), S.bet === b ? '#ca8a04' : '#3730a3', 20);
    g.button(560, 610, 200, 70, S.phase === 'draw' ? '🔄 드로우' : '🃏 딜', S.phase === 'draw' ? '#16a34a' : '#ca8a04', 24);
    g.button(820, 20, 150, 44, '💵 캐시아웃', '#0f766e', 16);
    if (S.phase === 'done') g.text(S.res >= 0 ? `${PAY[S.res][0]}! +${S.won}` : '아쉽게도 꽝', 500, 560, 30, S.res >= 0 ? '#4ade80' : '#a5b4fc');
    if (S.phase === 'draw') g.text('남길 카드를 클릭 (1~5키) → 드로우', 500, 560, 18, '#c7d2fe');
  },
});
function newDeck() { S.deck = []; for (let s = 0; s < 4; s++) for (let r = 0; r < 13; r++) S.deck.push({ s, r }); U.shuffle(S.deck); }
function rank(h) {
  const rs = h.map((c) => c.r).sort((a, b) => a - b), cnt = {}; rs.forEach((r) => (cnt[r] = (cnt[r] || 0) + 1));
  const vals = Object.values(cnt).sort((a, b) => b - a), flush = h.every((c) => c.s === h[0].s);
  const uniq = [...new Set(rs)], straight = uniq.length === 5 && (rs[4] - rs[0] === 4 || rs.join() === '0,1,2,3,12');
  if (straight && flush) return rs[0] === 8 ? 0 : 1;
  if (vals[0] === 4) return 2; if (vals[0] === 3 && vals[1] === 2) return 3; if (flush) return 4; if (straight) return 5; if (vals[0] === 3) return 6; if (vals[0] === 2 && vals[1] === 2) return 7;
  if (vals[0] === 2) { const pr = +Object.keys(cnt).find((k) => cnt[k] === 2); if (pr >= 9) return 8; }
  return -1;
}
