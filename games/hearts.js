let S;
const HS = ['♣', '♦', '♠', '♥'], HSN = ['클로버', '다이아', '스페이드', '하트'];
const HRN = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
const HCW = 70, HCH = 100;
const HNAMES = ['나', '부엉이', '고양이', '여우'], HFACE = ['🙂', '🦉', '🐱', '🦊'];
const HDIRN = { 0: '이번 판은 전달 없음', 1: '왼쪽(부엉이)에게 3장 전달 ←', 2: '맞은편(고양이)에게 3장 전달 ↑', 3: '오른쪽(여우)에게 3장 전달 →' };
const HTRICK = [[500 - HCW / 2, 372], [400, 300], [500 - HCW / 2, 222], [530, 300]];
const HFROM = [[500, 640], [40, 320], [500, 30], [920, 320]];
const HPANEL = [[8, 668], [12, 140], [640, 20], [872, 140]];
const HLIMIT = 100;
GAME({
  title: '하트', w: 1000, h: 780, bg: '#0f4c3a', controls: 'none', noRKey: true,
  help: '♥ 하트(1점)와 ♠Q(13점)를 피하는 트릭 테이킹 · 점수가 낮을수록 좋아요\n카드 클릭(또는 ←→ + Space)으로 내기 · 선 무늬를 반드시 따라야 함\n판 시작 전 3장 전달 (왼쪽→오른쪽→맞은편→없음 순환)\n♣2가 첫 트릭 선 · 하트가 깨지기 전엔 하트로 선 불가 · 첫 트릭엔 점수 카드 금지\n🌙 슛더문: 하트 13장+♠Q 모두 먹으면 상대 모두 +26! · 누군가 100점이면 종료',
  init(g) {
    S = { tot: [0, 0, 0, 0], handNo: 0, t: 0, sel: 0, kbd: false, msg: '', msgT: 0, hist: [], fly: [] };
    newHand(g);
  },
  update(g, dt) {
    S.t += dt; S.msgT -= dt;
    for (const f of S.fly) f.t += dt;
    S.fly = S.fly.filter((f) => f.t < f.d);
    g.info = `${S.handNo + 1}번째 판 · 내 점수 ${S.tot[0]} (+${S.hp[0]})`;
    if (S.phase === 'pass') return passInput(g);
    if (S.phase === 'recv') { S.recvT -= dt; if (S.recvT <= 0 || (S.recvT < 1.6 && (g.mouse.clicked || g.pressed('a')))) startPlay(g); return; }
    if (S.phase === 'handEnd') {
      S.endT -= dt;
      if (S.endT <= 0 && (g.mouse.clicked || g.pressed('a'))) {
        if (Math.max(...S.tot) >= HLIMIT) {
          const lo = Math.min(...S.tot);
          if (S.tot[0] === lo) { g.add(1000); g.win(`우승! 최종 ${S.tot.map((v, i) => HNAMES[i] + ' ' + v).join(' · ')}`); }
          else g.over(`${HNAMES[S.tot.indexOf(lo)]} 우승 · 내 점수 ${S.tot[0]}점`);
          return;
        }
        S.handNo++; newHand(g);
      }
      return;
    }
    if (S.phase === 'collect') {
      S.colT -= dt;
      if (S.colT <= 0) resolveTrick(g);
      return;
    }
    if (S.phase !== 'play' || S.fly.length) return;
    if (S.wait > 0) { S.wait -= dt; return; }
    if (S.turn !== 0) { aiPlay(g, S.turn); return; }
    playInput(g);
  },
  draw(g, c) {
    const grd = c.createRadialGradient(500, 330, 50, 500, 330, 560);
    grd.addColorStop(0, '#1b7a5a'); grd.addColorStop(1, '#0a3326');
    c.fillStyle = grd; c.fillRect(0, 0, g.W, g.H);
    g.ring(500, 330, 190, 'rgba(255,255,255,.06)', 50);
    if (S.broken) g.text('💔 하트 깨짐', 500, 500, 15, '#fca5a5');
    else g.text('♥ 하트 아직 안 깨짐', 500, 500, 14, 'rgba(255,255,255,.4)');
    // AI 손패
    for (let p = 1; p < 4; p++) {
      const n = S.hands[p].length;
      for (let i = 0; i < n; i++) {
        if (p === 2) cardBack(g, 500 - (n * 18 + 26) / 2 + i * 18, 24, 0.62);
        else cardBack(g, p === 1 ? 28 : 928, 222 + i * 16, 0.62);
      }
    }
    // 트릭
    for (const tc of S.trick) {
      const f = S.fly.find((q) => q.c === tc.c);
      const [tx, ty] = HTRICK[tc.p];
      let x = tx, y = ty;
      if (f) { const k = easeOut(f.t / f.d); x = U.lerp(f.x0, tx, k); y = U.lerp(f.y0, ty, k); }
      if (S.phase === 'collect' && S.colT < 0.35) { const k = 1 - S.colT / 0.35, [wx, wy] = HFROM[S.trickWin]; x = U.lerp(x, wx - HCW / 2, k); y = U.lerp(y, wy - HCH / 2, k); }
      drawCard(g, x, y, tc.c, 1, S.phase === 'collect' && tc.p === S.trickWin && S.colT >= 0.35);
    }
    // 패널
    for (let p = 0; p < 4; p++) drawPanel(g, p);
    // 내 손패
    const H = S.hands[0], legalSet = S.phase === 'play' && S.turn === 0 ? legal(0) : null, hov = handHover(g);
    H.forEach((cd, i) => {
      const [x, y] = handPos(i, H.length);
      const sel = S.phase === 'pass' && S.passSel.includes(cd), up = sel || (i === hov && !S.kbd) || (S.kbd && i === S.sel);
      const recv = S.phase === 'recv' && S.recvCards.includes(cd);
      drawCard(g, x, y - (up ? 22 : 0) - (recv ? 26 : 0), cd, 1, sel || recv || (legalSet && legalSet.includes(cd) && up), legalSet && !legalSet.includes(cd));
    });
    if (S.phase === 'pass') {
      g.rrect(300, 470, 400, 120, 16, 'rgba(0,0,0,.6)', '#fde047', 2);
      g.text(HDIRN[S.passDir], 500, 500, 20, '#fde047');
      g.text(`전달할 카드 ${S.passSel.length}/3 선택 (클릭 또는 ←→ + Space)`, 500, 530, 15, '#e5e7eb');
      g.button(420, 548, 160, 34, S.passSel.length === 3 ? '전달하기 (X)' : '3장을 고르세요', S.passSel.length === 3 ? '#b91c1c' : '#4b5563', 16);
    }
    if (S.phase === 'recv') { g.rrect(330, 480, 340, 50, 12, 'rgba(0,0,0,.6)'); g.text(`받은 카드: ${S.recvCards.map(cname).join(' ')}`, 500, 505, 18, '#fde047'); }
    if (S.phase === 'play' && S.turn === 0 && !S.fly.length && S.wait <= 0) g.text('내 차례 — 낼 카드를 고르세요', 500, 570, 17, '#fde047');
    if (S.msgT > 0 && S.msg) { c.globalAlpha = Math.min(1, S.msgT * 2); g.rrect(310, 150, 380, 44, 12, 'rgba(0,0,0,.65)'); g.text(S.msg, 500, 172, 18, '#fde047'); c.globalAlpha = 1; }
    if (S.phase === 'handEnd') drawHandEnd(g);
  },
});
function easeOut(k) { k = Math.min(1, Math.max(0, k)); return 1 - Math.pow(1 - k, 3); }
function say(s, t = 1.8) { S.msg = s; S.msgT = t; }
function cname(c) { return HS[c.s] + (HRN[c.r] || c.r); }
function isQS(c) { return c.s === 2 && c.r === 12; }
function pts(c) { return c.s === 3 ? 1 : isQS(c) ? 13 : 0; }
function sortHand(h) { h.sort((a, b) => a.s - b.s || a.r - b.r); }
function newHand(g) {
  const d = [];
  for (let s = 0; s < 4; s++) for (let r = 2; r <= 14; r++) d.push({ s, r });
  U.shuffle(d);
  S.hands = [0, 1, 2, 3].map((p) => d.slice(p * 13, p * 13 + 13));
  S.hands.forEach(sortHand);
  S.hp = [0, 0, 0, 0]; S.trick = []; S.trickNo = 0; S.broken = false; S.played = new Set(); S.voids = [[], [], [], []].map(() => [false, false, false, false]);
  S.passDir = [1, 3, 2, 0][S.handNo % 4]; S.passSel = []; S.sel = 0; S.wait = 0; S.fly = [];
  S.phase = S.passDir ? 'pass' : 'play';
  if (!S.passDir) startPlay(g); else say(`${S.handNo + 1}번째 판 · ${HDIRN[S.passDir]}`, 2.2);
  g.sfx.power();
}
function startPlay(g) {
  S.phase = 'play'; S.recvCards = [];
  for (let p = 0; p < 4; p++) if (S.hands[p].some((c) => c.s === 0 && c.r === 2)) S.turn = p;
  S.leader = S.turn; S.wait = 0.6;
  say(`${HNAMES[S.turn]}${S.turn === 0 ? '가' : '이(가)'} ♣2로 시작!`);
}
function handPos(i, n) { const sp = Math.min(56, 820 / Math.max(1, n)), w = sp * (n - 1) + HCW; return [500 - w / 2 + i * sp, 640]; }
function handHover(g) {
  const H = S.hands[0];
  for (let i = H.length - 1; i >= 0; i--) { const [x, y] = handPos(i, H.length); if (g.inRect(x, y - 24, HCW, HCH + 24)) return i; }
  return -1;
}
function passInput(g) {
  const H = S.hands[0];
  if (g.pressed('left')) { S.kbd = true; S.sel = (S.sel + H.length - 1) % H.length; g.sfx.click(); }
  if (g.pressed('right')) { S.kbd = true; S.sel = (S.sel + 1) % H.length; g.sfx.click(); }
  if (g.mouse.moved) S.kbd = false;
  let tog = -1;
  if (g.mouse.clicked) tog = handHover(g);
  if (g.pressed('a') && S.kbd) tog = S.sel;
  if (tog >= 0) {
    const cd = H[tog], k = S.passSel.indexOf(cd);
    if (k >= 0) S.passSel.splice(k, 1); else if (S.passSel.length < 3) S.passSel.push(cd); else { S.passSel.shift(); S.passSel.push(cd); }
    g.sfx.click();
  }
  if (S.passSel.length === 3 && (g.clickIn(420, 548, 160, 34) || g.pressed('b'))) doPass(g);
}
function doPass(g) {
  const out = [S.passSel.slice(), aiPassPick(1), aiPassPick(2), aiPassPick(3)];
  for (let p = 0; p < 4; p++) S.hands[p] = S.hands[p].filter((c) => !out[p].includes(c));
  for (let p = 0; p < 4; p++) S.hands[(p + S.passDir) % 4].push(...out[p]);
  S.hands.forEach(sortHand);
  S.recvCards = out[(4 - S.passDir) % 4];
  S.phase = 'recv'; S.recvT = 2.6; S.passSel = [];
  g.sfx.coin();
}
function aiPassPick(p) {
  const H = S.hands[p], cnt = [0, 0, 0, 0];
  H.forEach((c) => cnt[c.s]++);
  const spadesLow = H.filter((c) => c.s === 2 && c.r < 12).length;
  const sc = H.map((c) => {
    let v = c.r;
    if (isQS(c)) v = spadesLow >= 4 ? 8 : 60;
    else if (c.s === 2 && c.r > 12) v = spadesLow >= 4 ? 10 : 45;
    else if (c.s === 2) v = c.r * 0.3;
    if (c.s === 3) v += 4;
    if (c.s !== 2 && cnt[c.s] <= 2) v += 6;
    if (c.s === 0 && c.r === 2) v -= 5;
    return { c, v: v + Math.random() };
  });
  sc.sort((a, b) => b.v - a.v);
  return sc.slice(0, 3).map((x) => x.c);
}
function legal(p) {
  const H = S.hands[p];
  if (!S.trick.length) {
    if (S.trickNo === 0) { const c2 = H.find((c) => c.s === 0 && c.r === 2); if (c2) return [c2]; }
    if (!S.broken) { const nh = H.filter((c) => c.s !== 3); if (nh.length) return nh; }
    return H.slice();
  }
  const led = S.trick[0].c.s, f = H.filter((c) => c.s === led);
  if (f.length) return f;
  if (S.trickNo === 0) { const safe = H.filter((c) => !pts(c)); if (safe.length) return safe; }
  return H.slice();
}
function playInput(g) {
  const H = S.hands[0];
  if (g.pressed('left')) { S.kbd = true; S.sel = (S.sel + H.length - 1) % H.length; g.sfx.click(); }
  if (g.pressed('right')) { S.kbd = true; S.sel = (S.sel + 1) % H.length; g.sfx.click(); }
  if (g.mouse.moved) S.kbd = false;
  if (S.sel >= H.length) S.sel = H.length - 1;
  let pick = -1;
  if (g.mouse.clicked) pick = handHover(g);
  if (g.pressed('a')) { if (S.kbd) pick = S.sel; else { S.kbd = true; const L = legal(0); S.sel = H.indexOf(L[0]); g.sfx.click(); return; } }
  if (pick < 0) return;
  const cd = H[pick], L = legal(0);
  if (!L.includes(cd)) {
    g.sfx.beep(180, 0.12); g.shake(2, 0.1);
    if (S.trick.length) say(S.trickNo === 0 && H.some((c) => c.s === S.trick[0].c.s) === false ? '첫 트릭엔 점수 카드를 낼 수 없어요' : `${HSN[S.trick[0].c.s]}를 따라 내야 해요`);
    else if (S.trickNo === 0) say('첫 트릭은 ♣2로 시작!');
    else say('하트가 깨지기 전엔 하트로 시작할 수 없어요');
    return;
  }
  playCard(g, 0, cd);
}
function playCard(g, p, cd) {
  const H = S.hands[p], idx = H.indexOf(cd);
  let x0, y0;
  if (p === 0) [x0, y0] = handPos(idx, H.length); else { x0 = HFROM[p][0] - HCW / 2; y0 = HFROM[p][1] - HCH / 2; }
  H.splice(idx, 1);
  if (S.trick.length && cd.s !== S.trick[0].c.s) S.voids[p][S.trick[0].c.s] = true;
  S.trick.push({ p, c: cd });
  S.played.add(cd.s * 100 + cd.r);
  S.fly.push({ c: cd, x0, y0, t: 0, d: 0.28 });
  g.sfx.tone(320 + cd.r * 12, 0.06, 'triangle', 0.08);
  if (cd.s === 3 && !S.broken) { S.broken = true; say('💔 하트가 깨졌다!'); g.sfx.hit(); }
  if (isQS(cd)) { say(`😱 ${HNAMES[p]}: 스페이드 퀸!`); g.shake(7, 0.35); g.sfx.explode(); }
  S.turn = (p + 1) % 4;
  if (S.trick.length === 4) {
    const led = S.trick[0].c.s;
    let w = S.trick[0];
    for (const t of S.trick) if (t.c.s === led && t.c.r > w.c.r) w = t;
    S.trickWin = w.p; S.phase = 'collect'; S.colT = 1.25;
  } else S.wait = p === 0 ? 0.35 : 0.5;
}
function resolveTrick(g) {
  const w = S.trickWin, got = S.trick.reduce((a, t) => a + pts(t.c), 0);
  S.hp[w] += got;
  if (got) { const [x, y] = HFROM[w]; g.float(x, y + (w === 2 ? 40 : -40), `+${got}`, got >= 13 ? '#f87171' : '#fca5a5', 24); if (w === 0) g.sfx.hit(); }
  else g.sfx.drop();
  S.trick = []; S.trickNo++; S.turn = S.leader = w; S.phase = 'play'; S.wait = 0.3;
  if (S.trickNo === 13) endHand(g);
}
function endHand(g) {
  const moon = S.hp.indexOf(26);
  let add = S.hp.slice(), note = '';
  if (moon >= 0) { add = [0, 1, 2, 3].map((p) => (p === moon ? 0 : 26)); note = `🌙 ${HNAMES[moon]} 슛더문! 상대 모두 +26`; g.shake(10, 0.5); }
  for (let p = 0; p < 4; p++) S.tot[p] += add[p];
  S.hist.push(add);
  const gain = moon === 0 ? 260 + 300 : Math.max(0, 26 - add[0]) * 10;
  g.add(gain);
  S.lastGain = gain; S.lastNote = note; S.lastAdd = add;
  S.phase = 'handEnd'; S.endT = 0.8;
  if (add[0] === 0 || moon === 0) { g.sfx.win(); g.burst(500, 300, ['#f87171', '#fde047', '#fff'], 50, 320, 1, 4); } else g.sfx.coin();
}
// ---------- AI ----------
function higherOut(p, c) {
  let n = 0;
  for (let r = c.r + 1; r <= 14; r++) if (!S.played.has(c.s * 100 + r) && !S.hands[p].some((h) => h.s === c.s && h.r === r)) n++;
  return n;
}
function aiPlay(g, p) {
  const H = S.hands[p], L = legal(p), qsOut = S.played.has(212), holdQS = H.some(isQS);
  let pick;
  if (L.length === 1) pick = L[0];
  else if (!S.trick.length) {
    let best = null, bv = 1e9;
    const cnt = [0, 0, 0, 0]; H.forEach((c) => cnt[c.s]++);
    for (const c of L) {
      let v = c.r + Math.random() * 1.5;
      if (c.s === 3) v += 3;
      if (c.s === 2 && c.r >= 13 && !qsOut && !holdQS) v += 25;
      if (isQS(c)) v += 40;
      if (c.s === 2 && holdQS) v += 6;
      if (c.s === 2 && !holdQS && !qsOut && c.r < 12) v -= 3; // 스페이드 낮은 카드로 퀸 사냥
      if (higherOut(p, c) === 0) v += 12;
      v += cnt[c.s] * 0.4;
      if (v < bv) { bv = v; best = c; }
    }
    pick = best;
  } else {
    const led = S.trick[0].c.s, follow = L.filter((c) => c.s === led);
    const trickPts = S.trick.reduce((a, t) => a + pts(t.c), 0);
    const winR = Math.max(...S.trick.filter((t) => t.c.s === led).map((t) => t.c.r));
    const last = S.trick.length === 3;
    if (follow.length) {
      const under = follow.filter((c) => c.r < winR).sort((a, b) => b.r - a.r);
      const desc = follow.slice().sort((a, b) => b.r - a.r), noQ = desc.filter((c) => !isQS(c));
      if (S.trickNo === 0) pick = desc[0];
      else if (last && trickPts === 0 && !(led === 2 && !qsOut && noQ.length === 0)) pick = (noQ.length ? noQ : desc)[0];
      else if (under.length) pick = under[0];
      else if (last) pick = (noQ.length ? noQ : desc)[0];
      else { const asc = follow.slice().sort((a, b) => a.r - b.r), aq = asc.filter((c) => !isQS(c)); pick = (aq.length ? aq : asc)[0]; if (led === 2 && !qsOut && pick.r > 12 && aq.some((c) => c.r < 12)) pick = aq.find((c) => c.r < 12); }
    } else {
      const qs = L.find(isQS);
      const bigSp = L.filter((c) => c.s === 2 && c.r > 12 && !qsOut).sort((a, b) => b.r - a.r);
      const hearts = L.filter((c) => c.s === 3).sort((a, b) => b.r - a.r);
      const cnt = [0, 0, 0, 0]; H.forEach((c) => cnt[c.s]++);
      if (qs) pick = qs;
      else if (bigSp.length) pick = bigSp[0];
      else if (hearts.length && hearts[0].r >= 8) pick = hearts[0];
      else pick = L.slice().sort((a, b) => b.r - a.r + (cnt[a.s] - cnt[b.s]) * 0.8)[0];
    }
  }
  playCard(g, p, pick);
}
// ---------- 그리기 ----------
function cardBack(g, x, y, s) {
  const w = HCW * s, h = HCH * s;
  g.rrect(x + 2, y + 2, w, h, 6 * s, 'rgba(0,0,0,.3)');
  g.rrect(x, y, w, h, 6 * s, '#7f1d1d', '#fff', 2);
  g.rrect(x + 4 * s, y + 4 * s, w - 8 * s, h - 8 * s, 4 * s, '#b91c1c', 'rgba(255,255,255,.35)', 1);
  g.text('♥', x + w / 2, y + h / 2, 22 * s, 'rgba(255,255,255,.45)');
}
function drawCard(g, x, y, c, s = 1, hl = false, dim = false) {
  const w = HCW * s, h = HCH * s, red = c.s === 1 || c.s === 3, col = red ? '#dc2626' : '#111827';
  g.rrect(x + 2, y + 3, w, h, 7 * s, 'rgba(0,0,0,.3)');
  g.rrect(x, y, w, h, 7 * s, '#fdfdfb', hl ? '#facc15' : '#94a3b8', hl ? 3 : 1);
  const rk = HRN[c.r] || String(c.r);
  g.text(rk, x + 12 * s, y + 14 * s, 17 * s, col);
  g.text(HS[c.s], x + 12 * s, y + 31 * s, 15 * s, col);
  if (c.r >= 11 && c.r <= 13) { g.emoji(['💂', '👸', '🤴'][c.r - 11], x + w / 2 + 4 * s, y + h / 2 + 6 * s, 34 * s); g.text(HS[c.s], x + w - 12 * s, y + h - 14 * s, 14 * s, col); }
  else g.text(HS[c.s], x + w / 2 + 4 * s, y + h / 2 + 8 * s, (c.r === 14 ? 46 : 36) * s, col);
  if (isQS(c)) g.rrect(x + 2, y + 2, w - 4, h - 4, 6 * s, null, '#7c3aed', 2);
  if (dim) g.rrect(x, y, w, h, 7 * s, 'rgba(0,0,0,.35)');
}
function drawPanel(g, p) {
  const [x, y] = HPANEL[p], me = S.turn === p && S.phase === 'play';
  const w = 112, h = 54;
  g.rrect(x, y, w, h, 12, me ? '#fde047' : 'rgba(0,0,0,.45)', me ? '#fff' : null, 2);
  g.emoji(HFACE[p], x + 22, y + 27, 28);
  g.text(HNAMES[p], x + 72, y + 16, 15, me ? '#111' : '#fff');
  g.text(`${S.tot[p]}점`, x + 72, y + 36, 14, me ? '#333' : '#fde047');
  if (S.hp[p]) g.text(`이번 판 +${S.hp[p]}`, x + w / 2, y + h + 12, 13, '#fca5a5');
}
function drawHandEnd(g) {
  g.rect(0, 0, g.W, g.H, 'rgba(0,0,0,.62)');
  g.rrect(230, 120, 540, 470, 22, '#111827', '#fde047', 3);
  g.text(`${S.handNo + 1}번째 판 결과`, 500, 160, 28, '#fde047');
  if (S.lastNote) g.text(S.lastNote, 500, 194, 17, '#c4b5fd');
  for (let p = 0; p < 4; p++) {
    const x = 300 + p * 130;
    g.emoji(HFACE[p], x, 232, 28); g.text(HNAMES[p], x, 260, 15, '#fff');
  }
  const rows = S.hist.slice(-7), base = S.hist.length - rows.length;
  rows.forEach((r, k) => {
    const y = 292 + k * 26;
    g.text(`#${base + k + 1}`, 245, y, 12, '#9ca3af', 'left');
    r.forEach((v, p) => g.text(v ? `+${v}` : '0', 300 + p * 130, y, 15, v >= 13 ? '#f87171' : v ? '#fca5a5' : '#86efac'));
  });
  g.line(260, 486, 740, 486, '#374151', 2);
  const lo = Math.min(...S.tot);
  S.tot.forEach((v, p) => g.text(`${v}${v === lo ? ' 👑' : ''}`, 300 + p * 130, 510, 20, v === lo ? '#fde047' : '#fff'));
  g.text(`허브 점수 +${S.lastGain}`, 500, 540, 15, '#86efac');
  if (S.endT <= 0) g.text(Math.max(...S.tot) >= HLIMIT ? '클릭/Space — 최종 결과' : '클릭/Space — 다음 판', 500, 568, 15, '#a7f3d0');
}
