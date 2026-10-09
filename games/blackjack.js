let S;
const SU = ['♠', '♥', '♦', '♣'], RK = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
GAME({
  title: '블랙잭', w: 1000, h: 760, bg: '#14532d', controls: 'none',
  help: '칩을 클릭해서 베팅 → 🃏 딜\n히트 = 한 장 더 · 스탠드 = 멈춤 · 더블 = 베팅 2배 + 한 장만\n21에 가깝게! 21 초과는 버스트 · 블랙잭은 1.5배 지급\n딜러는 17 이상에서 멈춤 · 💰 칩이 바닥나면 끝 (캐시아웃 가능)',
  init(g) { S = { chips: 1000, bet: 0, phase: 'bet', deck: [], ph: [], dh: [], msg: '', t: 0, hands: 0 }; g.score = 1000; shuffle(); },
  update(g, dt) {
    S.t -= dt;
    g.score = S.chips + (S.phase === 'bet' ? S.bet : 0);
    if (S.phase === 'bet') {
      [10, 50, 100, 500].forEach((v, i) => { if (g.clickIn(240 + i * 120, 600, 100, 100) && S.chips >= v) { S.bet += v; S.chips -= v; g.sfx.coin(); } });
      if (g.clickIn(740, 610, 110, 40) && S.bet) { S.chips += S.bet; S.bet = 0; g.sfx.click(); }
      if (g.clickIn(400, 500, 200, 56) && S.bet) deal(g);
      if (g.clickIn(840, 20, 140, 44)) { g.win(`💰 ${S.chips} 칩으로 캐시아웃!`); }
    } else if (S.phase === 'play') {
      if (g.clickIn(250, 520, 150, 56) || g.keyp('KeyH')) hit(g);
      if (g.clickIn(420, 520, 150, 56) || g.keyp('KeyS')) stand(g);
      if (S.ph.length === 2 && S.chips >= S.bet && (g.clickIn(590, 520, 150, 56) || g.keyp('KeyD'))) { S.chips -= S.bet; S.bet *= 2; S.ph.push(draw()); g.sfx.coin(); if (val(S.ph) > 21) end(g, 'bust'); else stand(g); }
    } else if (S.phase === 'dealer') {
      if (S.t <= 0) { if (val(S.dh) < 17) { S.dh.push(draw()); g.sfx.tone(600, 0.05, 'triangle', 0.06); S.t = 0.6; } else settle(g); }
    } else if (S.phase === 'done') {
      if (S.t <= 0 && (g.mouse.clicked || g.pressed('a'))) { if (S.chips < 10) return g.over('칩을 모두 잃었다...'); S.phase = 'bet'; S.ph = []; S.dh = []; S.msg = ''; S.bet = 0; }
    }
  },
  draw(g, c) {
    g.rrect(60, 40, 880, 440, 220, '#166534', '#713f12', 14);
    g.text('BLACKJACK PAYS 3 TO 2', 500, 250, 20, 'rgba(253,224,71,.5)');
    g.text('딜러는 17 이상에서 스탠드', 500, 280, 14, 'rgba(255,255,255,.35)');
    g.text('딜러', 500, 70, 18, '#bbf7d0');
    S.dh.forEach((cd, i) => card(g, 500 - (S.dh.length * 70) / 2 + i * 70, 90, i === 1 && S.phase === 'play' ? null : cd));
    if (S.dh.length && S.phase !== 'play') g.text(val(S.dh), 500 + (S.dh.length * 70) / 2 + 50, 160, 26, '#fff');
    S.ph.forEach((cd, i) => card(g, 500 - (S.ph.length * 70) / 2 + i * 70, 310, cd));
    if (S.ph.length) g.text(val(S.ph), 500 + (S.ph.length * 70) / 2 + 50, 380, 26, val(S.ph) > 21 ? '#f87171' : '#fff');
    g.text(`💰 ${S.chips.toLocaleString()}`, 30, 40, 26, '#fde047', 'left');
    g.text(`베팅: ${S.bet}`, 30, 80, 20, '#fff', 'left');
    if (S.phase === 'bet') {
      [10, 50, 100, 500].forEach((v, i) => { const x = 290 + i * 120, col = ['#e5e7eb', '#ef4444', '#3b82f6', '#111827'][i]; c.globalAlpha = S.chips >= v ? 1 : 0.35; g.circle(x, 650, 46, col); g.ring(x, 650, 38, '#fff', 4); c.setLineDash([8, 8]); g.ring(x, 650, 44, '#fff', 4); c.setLineDash([]); g.text(v, x, 652, 22, i === 0 ? '#111' : '#fff'); c.globalAlpha = 1; });
      g.button(400, 500, 200, 56, S.bet ? '🃏 딜!' : '칩을 걸어주세요', S.bet ? '#ca8a04' : '#374151', 22);
      if (S.bet) g.button(740, 610, 110, 40, '베팅 취소', '#7f1d1d', 15);
      g.button(840, 20, 140, 44, '💵 캐시아웃', '#0f766e', 16);
    }
    if (S.phase === 'play') { g.button(250, 520, 150, 56, '히트 (H)', '#2563eb', 20); g.button(420, 520, 150, 56, '스탠드 (S)', '#dc2626', 20); if (S.ph.length === 2 && S.chips >= S.bet) g.button(590, 520, 150, 56, '더블 (D)', '#7c3aed', 20); }
    if (S.msg) { g.rrect(300, 420, 400, 70, 16, 'rgba(0,0,0,.6)'); g.text(S.msg, 500, 455, 30, S.msgCol); }
    if (S.phase === 'done' && S.t <= 0) g.text('클릭해서 계속', 500, 520, 18, '#d1fae5');
  },
});
function shuffle() { S.deck = []; for (let k = 0; k < 4; k++) for (let s = 0; s < 4; s++) for (let r = 0; r < 13; r++) S.deck.push({ s, r }); U.shuffle(S.deck); }
function draw() { if (S.deck.length < 20) shuffle(); return S.deck.pop(); }
function val(h) { let v = 0, a = 0; for (const c of h) { v += c.r === 0 ? 11 : Math.min(10, c.r + 1); if (c.r === 0) a++; } while (v > 21 && a) { v -= 10; a--; } return v; }
function card(g, x, y, cd) {
  if (!cd) { g.rrect(x, y, 90, 126, 10, '#991b1b', '#fff', 3); g.text('🂠', x + 45, y + 63, 50, 'rgba(255,255,255,.4)'); return; }
  const col = cd.s === 1 || cd.s === 2 ? '#dc2626' : '#111';
  g.rrect(x + 3, y + 5, 90, 126, 10, 'rgba(0,0,0,.3)'); g.rrect(x, y, 90, 126, 10, '#fff', '#d1d5db');
  g.text(RK[cd.r], x + 10, y + 18, 22, col, 'left'); g.text(SU[cd.s], x + 10, y + 42, 20, col, 'left'); g.text(SU[cd.s], x + 45, y + 75, 46, col);
}
function deal(g) { S.ph = [draw(), draw()]; S.dh = [draw(), draw()]; S.phase = 'play'; S.hands++; g.sfx.tone(500, 0.08, 'triangle', 0.06); if (val(S.ph) === 21) { if (val(S.dh) === 21) end(g, 'push'); else end(g, 'bj'); } }
function hit(g) { S.ph.push(draw()); g.sfx.tone(600, 0.05, 'triangle', 0.06); if (val(S.ph) > 21) end(g, 'bust'); else if (val(S.ph) === 21) stand(g); }
function stand(g) { S.phase = 'dealer'; S.t = 0.6; }
function settle(g) { const p = val(S.ph), d = val(S.dh); end(g, d > 21 || p > d ? 'win' : p === d ? 'push' : 'lose'); }
function end(g, r) {
  const b = S.bet;
  const R = { bj: [b * 2.5, '🃏 블랙잭!', '#fde047'], win: [b * 2, `승리! +${b}`, '#4ade80'], push: [b, '무승부 (푸시)', '#e5e7eb'], lose: [0, `패배 -${b}`, '#f87171'], bust: [0, `버스트! -${b}`, '#f87171'] }[r];
  S.chips += Math.floor(R[0]); S.msg = R[1]; S.msgCol = R[2]; S.bet = 0; S.phase = 'done'; S.t = 0.8;
  r === 'bj' || r === 'win' ? g.sfx.win() : r === 'push' ? g.sfx.click() : g.sfx.lose();
}
