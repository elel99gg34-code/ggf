let S;
const UC = ['#e53935', '#fbc02d', '#43a047', '#1e88e5'];
const UCD = ['#8e1c1a', '#a37b0a', '#1f6b24', '#0d4f94'];
const UCN = ['빨강', '노랑', '초록', '파랑'];
const UW = 66, UH = 98;
const UTARGET = 300;
const UNAMES = ['나', '토끼 🐰', '여우 🦊', '곰 🐻'];
const UFACE = ['🙂', '🐰', '🦊', '🐻'];
GAME({
  title: '우노', w: 1000, h: 720, bg: '#0b3d2c', controls: 'none', noRKey: true,
  help: '같은 색 또는 같은 숫자·기호의 카드를 내세요 (클릭 또는 ←→ 선택 + Space)\n낼 카드가 없으면 더미 클릭(또는 X)으로 1장 뽑기 · 뽑은 카드가 맞으면 바로 낼 수 있어요\n⊘ 스킵 · ⇄ 리버스 · +2 · 🌈 와일드(색 지정) · +4 (현재 색 카드가 없을 때만)\n카드가 2장일 때 U키/UNO 버튼으로 "우노!" 외치기 — 안 외치면 걸려서 2장 벌칙!\nAI가 우노를 깜빡하면 🚨 버튼으로 잡아내세요 · 300점 먼저 달성하면 우승',
  init(g) {
    S = { g, tot: [0, 0, 0, 0], round: 0, fly: [], log: [], t: 0, sel: 0 };
    newRound(g);
  },
  update(g, dt) {
    S.t += dt;
    for (const f of S.fly) { f.t += dt; if (f.t >= f.d) { f.card.flying = false; f.done = true; } }
    if (S.fly.length) S.fly = S.fly.filter((f) => !f.done);
    S.msgT -= dt;
    if (S.unoWatch) {
      const W = S.unoWatch;
      W.t -= dt;
      if (W.p === 0 && (g.keyp('KeyU') || g.clickIn(UNO_BTN.x, UNO_BTN.y, UNO_BTN.w, UNO_BTN.h))) { S.unoWatch = null; shout(g, 0); }
      else if (W.p !== 0 && (g.keyp('KeyC') || g.clickIn(catchRect(W.p).x, catchRect(W.p).y, 120, 40))) { S.unoWatch = null; penalty(g, W.p, '내가 잡았다! 🚨'); }
      else if (W.t <= 0) {
        S.unoWatch = null;
        if (W.p === 0) penalty(g, 0, `${UNAMES[1 + U.randi(0, 2)]}에게 걸렸다!`);
        else if (Math.random() < 0.5) penalty(g, W.p, '다른 AI가 잡아냈다!');
      }
    }
    if (S.phase === 'roundEnd') {
      if (S.endT > 0) { S.endT -= dt; return; }
      if (g.mouse.clicked || g.pressed('a')) {
        const best = S.tot.indexOf(Math.max(...S.tot));
        if (S.tot[best] >= UTARGET) { if (best === 0) { g.add(500); g.win(`${S.round}라운드 만에 ${S.tot[0]}점으로 우승!`); } else g.over(`${UNAMES[best]} 우승 (${S.tot[best]}점) · 내 점수 ${S.tot[0]}`); return; }
        newRound(g);
      }
      return;
    }
    if (S.fly.length) return;
    if (S.wait > 0) { S.wait -= dt; return; }
    if (S.turn !== 0) return aiTurn(g);
    myTurn(g);
  },
  draw(g, c) {
    // 테이블
    c.save();
    const grd = c.createRadialGradient(500, 360, 60, 500, 360, 520);
    grd.addColorStop(0, '#13704d'); grd.addColorStop(1, '#0a3324');
    c.fillStyle = grd; c.fillRect(0, 0, g.W, g.H); c.restore();
    g.ring(500, 340, 150, 'rgba(255,255,255,.07)', 40);
    // 방향 표시
    const ad = S.dir;
    for (let i = 0; i < 6; i++) {
      const a = S.t * 0.6 * ad + (i * Math.PI) / 3, x = 500 + Math.cos(a) * 150, y = 340 + Math.sin(a) * 150;
      c.save(); c.translate(x, y); c.rotate(a + (ad > 0 ? Math.PI / 2 : -Math.PI / 2)); g.poly([[0, -10], [9, 6], [-9, 6]], UC[S.color] + '88'); c.restore();
    }
    // 더미
    for (let i = 0; i < 4; i++) cardBack(g, 380 - i * 2, 290 - i * 2, 1);
    const canDrawHint = S.turn === 0 && S.phase === 'play' && !S.fly.length && !playableIdx().length;
    if (canDrawHint) g.rrect(372, 282, UW + 16, UH + 16, 10, null, '#fde047', 3 + Math.sin(S.t * 8) * 1.5);
    g.text(`${S.deck.length}장`, 380 + UW / 2 - 4, 402, 14, '#bbf7d0');
    // 버림 더미
    const vis = S.discard.filter((cd) => !cd.flying).slice(-4);
    vis.forEach((cd, i) => { c.save(); c.translate(560 + UW / 2, 290 + UH / 2); c.rotate(cd.rot || 0); drawCard(g, -UW / 2, -UH / 2, cd, 1, false, true); c.restore(); });
    // 현재 색
    g.circle(640 + UW, 340, 20, UC[S.color]); g.ring(640 + UW, 340, 20, '#fff', 3);
    g.text(UCN[S.color], 640 + UW, 372, 13, '#fff');
    // AI 손패
    for (let p = 1; p < 4; p++) drawAIHand(g, c, p);
    // 내 손패
    const H = S.hands[0], pl = S.turn === 0 && (S.phase === 'play' || S.phase === 'drawn') ? playableIdx() : [];
    const hov = handHover(g);
    H.forEach((cd, i) => {
      if (cd.flying) return;
      const [x, y] = handPos(i, H.length), ok = pl.includes(i), up = (i === hov || i === S.sel && S.kbd) && S.turn === 0;
      drawCard(g, x, y - (up ? 22 : ok ? 8 : 0), cd, 1, ok, false, S.turn === 0 && S.phase === 'play' && !ok);
    });
    // 플레이어 패널
    for (let p = 0; p < 4; p++) drawPanel(g, p);
    // UNO 버튼
    const B = UNO_BTN, act = (H.length === 2 && S.turn === 0 && !S.unoCalled) || (S.unoWatch && S.unoWatch.p === 0);
    g.rrect(B.x, B.y, B.w, B.h, 14, act ? '#dc2626' : '#4b5563', act ? '#fde047' : '#6b7280', act ? 4 : 2);
    g.text('UNO!', B.x + B.w / 2, B.y + B.h / 2, 26, act ? '#fde047' : '#d1d5db');
    if (S.unoCalled && S.turn === 0) g.text('✔ 외침', B.x + B.w / 2, B.y - 12, 14, '#4ade80');
    if (S.unoWatch && S.unoWatch.p !== 0) {
      const r = catchRect(S.unoWatch.p);
      g.rrect(r.x, r.y, 120, 40, 10, '#b91c1c', '#fde047', 3);
      g.text('🚨 잡기! (C)', r.x + 60, r.y + 20, 16, '#fff');
    }
    // 뽑은 카드 선택
    if (S.phase === 'drawn' && S.turn === 0 && !S.fly.length) {
      g.rrect(330, 440, 340, 60, 14, 'rgba(0,0,0,.6)');
      g.button(345, 450, 150, 40, '▶ 낼래요 (Space)', '#15803d', 15);
      g.button(505, 450, 150, 40, '⏭ 넘기기 (X)', '#475569', 15);
    }
    // 색 선택
    if (S.phase === 'color') {
      g.rect(0, 0, g.W, g.H, 'rgba(0,0,0,.55)');
      g.rrect(300, 220, 400, 230, 20, '#111827', '#fde047', 3);
      g.text('🌈 색을 고르세요 (1~4)', 500, 255, 24, '#fff');
      for (let i = 0; i < 4; i++) { const x = 320 + i * 92; g.rrect(x, 290, 82, 120, 12, UC[i], g.inRect(x, 290, 82, 120) ? '#fff' : UCD[i], 4); g.text(UCN[i], x + 41, 350, 18, '#fff'); g.text(i + 1, x + 41, 390, 14, '#fff'); }
    }
    // 메시지
    if (S.msgT > 0 && S.msg) { c.globalAlpha = Math.min(1, S.msgT * 2); g.rrect(300, 205, 400, 44, 12, 'rgba(0,0,0,.65)'); g.text(S.msg, 500, 227, 19, '#fde047'); c.globalAlpha = 1; }
    // 날아가는 카드
    for (const f of S.fly) {
      const k = Math.min(1, f.t / f.d), e = 1 - Math.pow(1 - k, 3), x = U.lerp(f.x0, f.x1, e), y = U.lerp(f.y0, f.y1, e);
      if (f.face) drawCard(g, x, y, f.card, 1); else cardBack(g, x, y, 1);
    }
    // 라운드 결과
    if (S.phase === 'roundEnd') {
      g.rect(0, 0, g.W, g.H, 'rgba(0,0,0,.6)');
      g.rrect(250, 170, 500, 340, 22, '#111827', '#fde047', 3);
      g.text(`${S.round}라운드 — ${UNAMES[S.winner]} 승리!`, 500, 215, 28, S.winner === 0 ? '#fde047' : '#fca5a5');
      g.text(`+${S.gain}점`, 500, 255, 22, '#4ade80');
      for (let p = 0; p < 4; p++) {
        const y = 300 + p * 40;
        g.text(UFACE[p] + ' ' + UNAMES[p].split(' ')[0], 300, y, 20, '#fff', 'left');
        g.rect(420, y - 9, 240, 18, '#1f2937'); g.rect(420, y - 9, 240 * Math.min(1, S.tot[p] / UTARGET), 18, p === 0 ? '#facc15' : '#60a5fa');
        g.text(S.tot[p], 690, y, 18, '#fff', 'left');
      }
      if (S.endT <= 0) g.text(`클릭/Space — ${Math.max(...S.tot) >= UTARGET ? '최종 결과' : '다음 라운드'} (목표 ${UTARGET}점)`, 500, 478, 16, '#a7f3d0');
    }
  },
});
const UNO_BTN = { x: 860, y: 520, w: 110, h: 56 };
function catchRect(p) { return p === 1 ? { x: 20, y: 500 } : p === 2 ? { x: 440, y: 150 } : { x: 860, y: 450 }; }
function say(s) { S.msg = s; S.msgT = 1.8; }
function mkDeck() {
  const d = [];
  for (let c = 0; c < 4; c++) {
    d.push({ c, v: 0 });
    for (let k = 0; k < 2; k++) { for (let v = 1; v <= 9; v++) d.push({ c, v }); d.push({ c, v: 'S' }, { c, v: 'R' }, { c, v: 'D2' }); }
  }
  for (let k = 0; k < 4; k++) d.push({ c: 4, v: 'W' }, { c: 4, v: 'W4' });
  return U.shuffle(d);
}
function newRound(g) {
  S.round++;
  S.deck = mkDeck(); S.discard = []; S.hands = [[], [], [], []];
  for (let k = 0; k < 7; k++) for (let p = 0; p < 4; p++) S.hands[p].push(S.deck.pop());
  let first;
  do { first = S.deck.pop(); if (typeof first.v !== 'number') { S.deck.unshift(first); first = null; } } while (!first);
  first.rot = U.rand(-0.2, 0.2);
  S.discard.push(first); S.color = first.c;
  S.aiDrew = false; S.dir = 1; S.turn = (S.round - 1) % 4; S.phase = 'play'; S.wait = 0.8; S.unoCalled = false; S.unoWatch = null; S.sel = 0; S.kbd = false;
  S.drawnCard = null; S.fly = [];
  sortHand();
  say(`${S.round}라운드 시작! ${UNAMES[S.turn]} 먼저`);
  g.sfx.power();
}
function topCard() { return S.discard[S.discard.length - 1]; }
function canPlay(cd, hand) {
  const t = topCard();
  if (cd.v === 'W') return true;
  if (cd.v === 'W4') return !hand.some((h) => h.c === S.color);
  return cd.c === S.color || cd.v === t.v;
}
function playableIdx() {
  const H = S.hands[0];
  if (S.phase === 'drawn') { const i = H.indexOf(S.drawnCard); return i >= 0 ? [i] : []; }
  const r = [];
  H.forEach((cd, i) => canPlay(cd, H) && r.push(i));
  return r;
}
function sortHand() {
  const ord = (cd) => cd.c * 100 + (typeof cd.v === 'number' ? cd.v : { S: 10, R: 11, D2: 12, W: 13, W4: 14 }[cd.v]);
  S.hands[0].sort((a, b) => ord(a) - ord(b));
}
function handPos(i, n) {
  const sp = Math.min(UW + 6, 600 / Math.max(1, n)), w = sp * (n - 1) + UW;
  return [500 - w / 2 + i * sp, 600];
}
function aiPos(p, i, n) {
  const sp = Math.min(26, 300 / Math.max(1, n));
  if (p === 2) return [500 - (sp * (n - 1) + UW * 0.6) / 2 + i * sp, 30];
  const y = 150 + i * Math.min(20, 280 / Math.max(1, n));
  return [p === 1 ? 40 : g_W() - 40 - UH * 0.6, y];
}
function g_W() { return 1000; }
function handHover(g) {
  const H = S.hands[0];
  for (let i = H.length - 1; i >= 0; i--) { const [x, y] = handPos(i, H.length); if (g.inRect(x, y - 22, UW, UH + 22)) return i; }
  return -1;
}
function seatXY(p) { return p === 0 ? [500, 640] : p === 1 ? [70, 300] : p === 2 ? [500, 60] : [930, 300]; }
function fly(card, x0, y0, x1, y1, face, d = 0.32) { card.flying = true; S.fly.push({ card, x0, y0, x1, y1, face, t: 0, d }); }
function drawCards(g, p, n) {
  const got = [];
  for (let k = 0; k < n; k++) {
    if (!S.deck.length) {
      const t = S.discard.pop();
      S.deck = U.shuffle(S.discard.map((cd) => (cd.c === 4 || cd.wild ? { c: 4, v: cd.v } : cd)));
      S.discard = [t];
      if (!S.deck.length) break;
      say('🔄 더미를 섞었습니다');
    }
    const cd = S.deck.pop();
    S.hands[p].push(cd); got.push(cd);
    const [sx, sy] = seatXY(p);
    fly(cd, 380, 290, sx - UW / 2, sy - UH / 2, p === 0, 0.25 + k * 0.08);
  }
  if (p === 0) sortHand();
  if (S.hands[p].length > 1 && S.unoWatch && S.unoWatch.p === p) S.unoWatch = null;
  g.sfx.move();
  return got;
}
function penalty(g, p, why) {
  drawCards(g, p, 2);
  say(`${UNAMES[p]} 우노 실패! +2장 (${why})`);
  g.sfx.hit(); g.shake(5);
}
function shout(g, p) {
  const [x, y] = seatXY(p);
  g.float(x, y - 60, '우노!', '#fde047', 34);
  g.sfx.power();
}
function nextOf(p, step = 1) { return (((p + S.dir * step) % 4) + 4) % 4; }
function playCard(g, p, idx, col) {
  const H = S.hands[p], cd = H.splice(idx, 1)[0];
  cd.rot = U.rand(-0.25, 0.25);
  let x0, y0;
  if (p === 0) [x0, y0] = handPos(idx, H.length + 1); else [x0, y0] = aiPos(p, idx, H.length + 1);
  S.discard.push(cd);
  fly(cd, x0, y0, 560, 290, true, 0.3);
  if (cd.c === 4) { cd.wild = true; S.color = col; } else S.color = cd.c;
  g.sfx.drop();
  S.drawnCard = null;
  // 우노 체크
  if (H.length === 1) {
    if (p === 0) { if (S.unoCalled) shout(g, 0); else S.unoWatch = { p: 0, t: 2.2 }; }
    else if (Math.random() < 0.82) shout(g, p);
    else S.unoWatch = { p, t: 2.2 };
  }
  S.unoCalled = false;
  if (H.length === 0) return endRound(g, p, cd);
  let skip = false;
  const nx = nextOf(p);
  if (cd.v === 'S') { skip = true; say(`⊘ ${UNAMES[nx]} 건너뜀!`); g.sfx.beep(300, 0.2); }
  if (cd.v === 'R') { S.dir *= -1; say('⇄ 방향 반대로!'); g.sfx.bounce(); }
  if (cd.v === 'D2') { skip = true; drawCards(g, nx, 2); say(`+2! ${UNAMES[nx]} 2장 뽑고 건너뜀`); g.shake(4); }
  if (cd.v === 'W4') { skip = true; drawCards(g, nx, 4); say(`+4! ${UNAMES[nx]} 4장 뽑고 건너뜀 · 색: ${UCN[col]}`); g.shake(8); g.sfx.explode(); }
  else if (cd.v === 'W') say(`🌈 색 변경: ${UCN[col]}`);
  S.turn = nextOf(p, skip ? 2 : 1);
  S.phase = 'play';
  S.wait = 0.45;
}
function endRound(g, p, last) {
  let pts = 0;
  for (let q = 0; q < 4; q++) for (const cd of S.hands[q]) pts += typeof cd.v === 'number' ? cd.v : cd.c === 4 ? 50 : 20;
  // 마지막 카드가 +2/+4면 다음 사람이 뽑음 (점수에 포함)
  if (last.v === 'D2' || last.v === 'W4') { const nx = nextOf(p), n = last.v === 'D2' ? 2 : 4; for (let k = 0; k < n && S.deck.length; k++) { const cd = S.deck.pop(); S.hands[nx].push(cd); pts += typeof cd.v === 'number' ? cd.v : cd.c === 4 ? 50 : 20; } }
  S.tot[p] += pts; S.gain = pts; S.winner = p;
  S.phase = 'roundEnd'; S.endT = 1.0; S.unoWatch = null;
  if (p === 0) { g.sfx.win(); g.burst(500, 300, UC, 60, 400, 1.2, 5); } else g.sfx.lose();
  g.score = S.tot[0] * 10;
}
function myTurn(g) {
  const H = S.hands[0];
  if (g.keyp('KeyU') || g.clickIn(UNO_BTN.x, UNO_BTN.y, UNO_BTN.w, UNO_BTN.h)) {
    if (H.length === 2 && !S.unoCalled) { S.unoCalled = true; g.sfx.coin(); say('우노 준비! 다음 카드를 내세요'); }
  }
  if (S.phase === 'color') {
    let pick = -1;
    for (let i = 0; i < 4; i++) { if (g.keyp('Digit' + (i + 1))) pick = i; if (g.clickIn(320 + i * 92, 290, 82, 120)) pick = i; }
    if (pick >= 0) playCard(g, 0, S.pendIdx, pick);
    return;
  }
  const pl = playableIdx();
  if (g.pressed('left')) { S.kbd = true; S.sel = (S.sel + H.length - 1) % H.length; g.sfx.click(); }
  if (g.pressed('right')) { S.kbd = true; S.sel = (S.sel + 1) % H.length; g.sfx.click(); }
  if (g.mouse.moved) S.kbd = false;
  if (S.sel >= H.length) S.sel = H.length - 1;
  if (S.phase === 'drawn') {
    if (g.clickIn(345, 450, 150, 40) || g.pressed('a')) { tryPlay(g, H.indexOf(S.drawnCard)); return; }
    if (g.clickIn(505, 450, 150, 40) || g.pressed('b') || g.pressed('down')) { S.phase = 'play'; S.drawnCard = null; S.turn = nextOf(0); S.wait = 0.3; say('턴을 넘겼어요'); return; }
    const hv = handHover(g);
    if (g.mouse.clicked && hv >= 0 && H[hv] === S.drawnCard) tryPlay(g, hv);
    return;
  }
  // 카드 클릭
  if (g.mouse.clicked) {
    const hv = handHover(g);
    if (hv >= 0) { if (pl.includes(hv)) tryPlay(g, hv); else { g.sfx.beep(180, 0.1); say(H[hv].v === 'W4' ? '+4는 현재 색 카드가 없을 때만!' : '낼 수 없는 카드예요'); } return; }
    if (g.inRect(370, 280, UW + 20, UH + 20)) return drawOne(g);
  }
  if (g.pressed('a') && S.kbd) { if (pl.includes(S.sel)) tryPlay(g, S.sel); else g.sfx.beep(180, 0.1); return; }
  if (g.pressed('a') && !S.kbd) { S.kbd = true; S.sel = pl.length ? pl[0] : 0; g.sfx.click(); return; }
  if (g.pressed('b') || g.pressed('down')) drawOne(g);
}
function tryPlay(g, i) {
  const cd = S.hands[0][i];
  if (!cd) return;
  if (cd.c === 4) { S.phase = 'color'; S.pendIdx = i; g.sfx.click(); return; }
  playCard(g, 0, i);
}
function drawOne(g) {
  const real = drawCards(g, 0, 1)[0];
  if (!real) { S.turn = nextOf(0); S.wait = 0.4; return; }
  S.drawnCard = real;
  if (canPlay(real, S.hands[0])) { S.phase = 'drawn'; say('뽑은 카드를 낼 수 있어요!'); }
  else { S.turn = nextOf(0); S.wait = 0.5; S.drawnCard = null; say('낼 카드가 없어 턴 종료'); }
  sortHand();
}
function aiTurn(g) {
  const p = S.turn, H = S.hands[p];
  const opts = [];
  H.forEach((cd, i) => canPlay(cd, H) && opts.push(i));
  if (!opts.length) {
    if (!S.aiDrew) {
      S.aiDrew = true; drawCards(g, p, 1);
      S.wait = 0.5; return;
    }
    S.aiDrew = false;
    const last = H.length - 1;
    // 방금 뽑은 카드는 위에서 처리 (opts 비었음 → 패스)
    S.turn = nextOf(p); S.wait = 0.35;
    return;
  }
  // 방금 뽑아서 낼 수 있게 된 경우는 그 카드만
  let pickFrom = opts;
  if (S.aiDrew) { S.aiDrew = false; const li = H.length - 1; pickFrom = opts.includes(li) ? [li] : opts; }
  const nx = nextOf(p), nCnt = S.hands[nx].length, danger = Math.min(...[0, 1, 2, 3].filter((q) => q !== p).map((q) => S.hands[q].length));
  let best = -1, bs = -1e9;
  for (const i of pickFrom) {
    const cd = H[i];
    let s = Math.random() * 4;
    if (typeof cd.v === 'number') s += cd.v * 1.2;
    if (cd.c === S.color) s += 6;
    if (cd.v === 'S' || cd.v === 'D2') s += nCnt <= 2 ? 40 : 8;
    if (cd.v === 'R') s += nCnt <= 2 ? 30 : 5;
    if (cd.v === 'W') s -= H.length > 3 ? 25 : -5;
    if (cd.v === 'W4') s += nCnt <= 2 ? 45 : H.length > 3 ? -20 : 10;
    if (cd.v === 'D2' && danger <= 1 && nCnt === danger) s += 30;
    // 같은 색 카드를 많이 들고 있으면 그 색 유지
    if (cd.c < 4) s += H.filter((h) => h.c === cd.c).length * 2;
    if (s > bs) { bs = s; best = i; }
  }
  const cd = H[best];
  let col;
  if (cd.c === 4) {
    const cnt = [0, 0, 0, 0];
    H.forEach((h, i) => i !== best && h.c < 4 && (cnt[h.c] += 1 + (typeof h.v === 'number' ? 0 : 0.5)));
    col = cnt.indexOf(Math.max(...cnt));
    if (Math.max(...cnt) === 0) col = U.randi(0, 3);
  }
  playCard(g, p, best, col);
  S.wait = 0.7;
}
// ---------- 그리기 ----------
function cardBack(g, x, y, s) {
  const w = UW * s, h = UH * s;
  g.rrect(x + 2, y + 3, w, h, 8 * s, 'rgba(0,0,0,.35)');
  g.rrect(x, y, w, h, 8 * s, '#111', '#fff', 3 * s);
  const c = g.ctx; c.save(); c.translate(x + w / 2, y + h / 2); c.rotate(-0.5);
  c.fillStyle = '#e53935'; c.beginPath(); c.ellipse(0, 0, w * 0.36, h * 0.38, 0, 0, Math.PI * 2); c.fill(); c.restore();
  g.text('UNO', x + w / 2, y + h / 2, 17 * s, '#fde047');
}
function label(v) { return typeof v === 'number' ? String(v) : { S: '⊘', R: '⇄', D2: '+2', W: '', W4: '+4' }[v]; }
function drawCard(g, x, y, cd, s, glow, onPile, dim) {
  const c = g.ctx, w = UW * s, h = UH * s;
  g.rrect(x + 2, y + 3, w, h, 8, 'rgba(0,0,0,.35)');
  if (glow) g.rrect(x - 3, y - 3, w + 6, h + 6, 10, null, '#fde047', 3);
  g.rrect(x, y, w, h, 8, '#fff');
  const isW = cd.c === 4;
  const bg = isW ? (onPile && cd.wild ? UC[S.color] : '#1f1f1f') : UC[cd.c];
  g.rrect(x + 4, y + 4, w - 8, h - 8, 6, bg);
  c.save(); c.translate(x + w / 2, y + h / 2); c.rotate(0.55);
  if (isW) {
    for (let q = 0; q < 4; q++) { c.fillStyle = UC[q]; c.beginPath(); c.moveTo(0, 0); c.ellipse(0, 0, w * 0.3, h * 0.33, 0, (q * Math.PI) / 2, ((q + 1) * Math.PI) / 2); c.closePath(); c.fill(); }
  } else { c.fillStyle = '#fff'; c.beginPath(); c.ellipse(0, 0, w * 0.32, h * 0.36, 0, 0, Math.PI * 2); c.fill(); }
  c.restore();
  const L = label(cd.v), col = isW ? '#fff' : UC[cd.c];
  if (cd.v === 'W') g.emoji('🌈', x + w / 2, y + h / 2, 26 * s);
  else { c.lineWidth = 4; c.strokeStyle = isW ? '#000' : 'rgba(0,0,0,.35)'; c.font = `900 ${30 * s}px system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.strokeText(L, x + w / 2, y + h / 2 + 1); g.text(L, x + w / 2, y + h / 2 + 1, 30 * s, col, 'center', '900'); }
  const sm = cd.v === 'W' ? 'W' : L;
  g.text(sm, x + 11 * s, y + 15 * s, 14 * s, '#fff');
  g.text(sm, x + w - 11 * s, y + h - 15 * s, 14 * s, '#fff');
  if (dim) g.rrect(x, y, w, h, 8, 'rgba(0,0,0,.38)');
}
function drawAIHand(g, c, p) {
  const H = S.hands[p], n = H.length;
  H.forEach((cd, i) => {
    if (cd.flying) return;
    const [x, y] = aiPos(p, i, n);
    if (p === 2) cardBack(g, x, y, 0.6);
    else { c.save(); c.translate(x + UH * 0.3, y + UW * 0.3); c.rotate(Math.PI / 2); cardBack(g, -UW * 0.3, -UH * 0.3, 0.6); c.restore(); }
  });
}
function drawPanel(g, p) {
  const pos = p === 0 ? [20, 620] : p === 1 ? [20, 90] : p === 2 ? [180, 30] : [872, 90];
  const [x, y] = pos, me = S.turn === p && S.phase !== 'roundEnd';
  g.rrect(x, y, 108, 52, 12, me ? '#fde047' : 'rgba(0,0,0,.45)', me ? '#fff' : null, 2);
  g.emoji(UFACE[p], x + 22, y + 26, 28);
  g.text(UNAMES[p].split(' ')[0], x + 68, y + 16, 15, me ? '#111' : '#fff');
  g.text(`🂠${S.hands[p].length} · ${S.tot[p]}점`, x + 68, y + 36, 12, me ? '#333' : '#a7f3d0');
  if (me && p !== 0) g.text('생각 중' + '.'.repeat(1 + (Math.floor(S.t * 3) % 3)), x + 54, y + 66, 13, '#fde047');
  if (me && p === 0) g.text('내 차례!', x + 54, y - 12, 15, '#fde047');
}
