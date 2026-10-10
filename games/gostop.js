let S;
const MON = ['', '🌲', '🌺', '🌸', '🌿', '🪻', '🌹', '🍂', '🌕', '🌼', '🍁', '🌳', '☔'];
const MCOL = ['', '#166534', '#be185d', '#db2777', '#3f6212', '#6d28d9', '#b91c1c', '#c2410c', '#1e3a8a', '#ca8a04', '#c2410c', '#4b5563', '#0e7490'];
// 타입: K=광 Y=열끗 T=띠 P=피 (v=피 가치)
const DEF = { 1: ['K', 'T홍', 'P', 'P'], 2: ['Y고', 'T홍', 'P', 'P'], 3: ['K', 'T홍', 'P', 'P'], 4: ['Y고', 'T초', 'P', 'P'], 5: ['Y', 'T초', 'P', 'P'], 6: ['Y', 'T청', 'P', 'P'], 7: ['Y', 'T초', 'P', 'P'], 8: ['K', 'Y고', 'P', 'P'], 9: ['Y', 'T청', 'P', 'P'], 10: ['Y', 'T청', 'P', 'P'], 11: ['K', 'P2', 'P', 'P'], 12: ['K비', 'Y', 'T', 'P2'] };
const ANIM = { 2: '🐦', 4: '🐦', 5: '🌉', 6: '🦋', 7: '🐗', 8: '🦢', 9: '🍶', 10: '🦌', 12: '🐦‍⬛' };
const KANIM = { 1: '🕊️', 3: '⛺', 8: '🌕', 11: '🦚', 12: '🧑‍🦯' };
const CW = 58, CH = 88;
GAME({
  title: '고스톱 (맞고)', w: 1100, h: 780, bg: '#14532d', controls: 'none',
  help: '손패를 클릭해서 내기 → 바닥의 같은 월 패를 먹어요. 그다음 더미에서 한 장 뒤집기\n광·열끗·띠·피를 모아 7점 이상이면 "고" 또는 "스톱" 선택!\n홍단·청단·초단 3점 · 고도리 5점 · 3광 3점(비광 포함 2점) · 피 10장부터 점수\n스톱 시 점수 × 100원 획득 (피박·광박 2배) · 돈이 바닥나면 끝',
  init(g) { S = { money: S?.money > 0 ? S.money : 10000 }; g.score = S.money; deal(); },
  update(g, dt) {
    g.score = S.money;
    S.flip = Math.max(0, S.flip - dt);
    if (S.wait > 0) { S.wait -= dt; if (S.wait <= 0 && S.next) { const f = S.next; S.next = null; f(); } return; }
    if (S.phase === 'over') { if (g.mouse.clicked || g.pressed('a')) { if (S.money <= 0) return g.over('돈을 모두 잃었다...'); deal(); } return; }
    if (S.phase === 'gostop' && S.turn === 0) { if (g.clickIn(380, 360, 150, 70)) go(g, 0); if (g.clickIn(570, 360, 150, 70)) stop(g, 0); return; }
    if (S.turn === 1) { S.aiT -= dt; if (S.aiT <= 0) { const i = aiPick(); play(g, 1, i); } return; }
    if (!g.mouse.clicked) return;
    S.hand[0].forEach((cd, i) => { if (g.inRect(handX(i, S.hand[0].length), 670, CW, CH)) play(g, 0, i); });
  },
  draw(g, c) {
    g.text(`💰 ${S.money.toLocaleString()}원`, 20, 30, 22, '#fde047', 'left');
    // AI 손패(뒷면)
    S.hand[1].forEach((cd, i) => back(g, handX(i, S.hand[1].length), 16, 0.7));
    // 바닥
    const months = [...new Set(S.floor.map((cd) => cd.m))];
    months.forEach((m, k) => { const cards = S.floor.filter((cd) => cd.m === m); const x = 200 + (k % 6) * 120, y = 220 + Math.floor(k / 6) * 150; cards.forEach((cd, j) => card(g, x + j * 14, y + j * 6, cd, S.hl && S.hl.includes(cd))); });
    // 더미
    for (let i = 0; i < Math.min(5, S.pile.length); i++) back(g, 60 + i * 2, 300 - i * 2, 1);
    g.text(S.pile.length, 89, 410, 16, '#bbf7d0');
    if (S.flipped) card(g, 60, 440, S.flipped, true);
    // 획득 패
    [1, 0].forEach((o) => {
      const y = o ? 110 : 560, groups = { K: [], Y: [], T: [], P: [] };
      S.cap[o].forEach((cd) => groups[cd.t[0]].push(cd));
      let x = 940 - 0;
      ['K', 'Y', 'T', 'P'].forEach((t, gi) => { const arr = groups[t]; arr.forEach((cd, j) => card(g, 300 + gi * 170 + j * 9 - (o ? 0 : 0) + 0, y - 0 + (o ? -0 : 0), cd, false, 0.55)); });
      const sc = score(S.cap[o]);
      g.rrect(940, o ? 90 : 540, 150, 60, 10, 'rgba(0,0,0,.35)');
      g.text(`${o ? 'AI' : '나'} ${sc.total}점` + (S.goes[o] ? ` · ${S.goes[o]}고` : ''), 1015, (o ? 90 : 540) + 20, 18, '#fff');
      g.text(`광${groups.K.length} 열${groups.Y.length} 띠${groups.T.length} 피${piCount(S.cap[o])}`, 1015, (o ? 90 : 540) + 44, 12, '#bbf7d0');
    });
    // 내 손패
    S.hand[0].forEach((cd, i) => { const x = handX(i, S.hand[0].length), hov = g.inRect(x, 670, CW, CH) && S.turn === 0 && S.phase === 'play', match = S.floor.some((f) => f.m === cd.m); card(g, x, 670 - (hov ? 14 : 0), cd, match && S.turn === 0); });
    if (S.msg) { g.rrect(330, 470, 440, 50, 12, 'rgba(0,0,0,.55)'); g.text(S.msg, 550, 495, 22, '#fde047'); }
    if (S.phase === 'gostop' && S.turn === 0) { g.rrect(300, 270, 500, 190, 20, 'rgba(0,0,0,.8)', '#fde047', 3); g.text(`${score(S.cap[0]).total}점! 고? 스톱?`, 550, 315, 28, '#fff'); g.button(380, 360, 150, 70, '🔥 고!', '#dc2626', 26); g.button(570, 360, 150, 70, '✋ 스톱', '#2563eb', 26); }
    if (S.phase === 'over') { g.rrect(250, 250, 600, 220, 20, 'rgba(0,0,0,.85)', '#fde047', 3); g.text(S.result, 550, 320, 30, '#fde047'); g.text(S.detail || '', 550, 370, 17, '#fff'); g.text('클릭해서 다음 판', 550, 430, 16, '#bbf7d0'); }
    if (S.turn === 1 && S.phase === 'play') g.text('AI 차례...', 550, 160, 18, '#fca5a5');
  },
});
function handX(i, n) { return 550 - (n * (CW + 6)) / 2 + i * (CW + 6); }
function back(g, x, y, s) { g.rrect(x, y, CW * s, CH * s, 6, '#b91c1c', '#7f1d1d', 2); g.rrect(x + 5 * s, y + 5 * s, CW * s - 10 * s, CH * s - 10 * s, 4, '#dc2626'); }
function card(g, x, y, cd, hl, s = 1) {
  const w = CW * s, h = CH * s, c = g.ctx;
  g.rrect(x + 2, y + 3, w, h, 6, 'rgba(0,0,0,.3)');
  g.rrect(x, y, w, h, 6, '#fefce8', hl ? '#facc15' : '#a8a29e', hl ? 3 : 1);
  g.rect(x + 3, y + 3, w - 6, h * 0.42, MCOL[cd.m]);
  g.emoji(MON[cd.m], x + w / 2, y + h * 0.24, 26 * s);
  const t = cd.t;
  if (t[0] === 'K') { g.circle(x + 11 * s, y + 11 * s, 9 * s, '#dc2626'); g.text('光', x + 11 * s, y + 12 * s, 11 * s, '#fff'); g.emoji(KANIM[cd.m] || '✨', x + w / 2, y + h * 0.68, 26 * s); }
  else if (t[0] === 'Y') g.emoji(ANIM[cd.m] || '🐾', x + w / 2, y + h * 0.68, 26 * s);
  else if (t[0] === 'T') { const col = t[1] === '홍' ? '#dc2626' : t[1] === '청' ? '#2563eb' : t[1] === '초' ? '#16a34a' : '#78716c'; g.rect(x + w * 0.3, y + h * 0.48, w * 0.4, h * 0.42, col); if (t[1]) g.text(t[1] === '초' ? '초' : t[1] === '홍' ? '홍' : '청', x + w / 2, y + h * 0.69, 13 * s, '#fff'); }
  else { if (t === 'P2') { g.text('쌍피', x + w / 2, y + h * 0.7, 14 * s, '#7c2d12'); } else g.text(cd.m + '월', x + w / 2, y + h * 0.7, 12 * s, '#78716c'); }
}
function deal() {
  const d = []; for (let m = 1; m <= 12; m++) DEF[m].forEach((t, i) => d.push({ m, t, id: m * 10 + i }));
  U.shuffle(d);
  S.hand = [d.splice(0, 10), d.splice(0, 10)]; S.floor = d.splice(0, 8); S.pile = d;
  S.hand.forEach((h) => h.sort((a, b) => a.m - b.m));
  S.cap = [[], []]; S.goes = [0, 0]; S.lastScore = [0, 0]; S.turn = 0; S.phase = 'play'; S.msg = ''; S.wait = 0; S.flipped = null; S.flip = 0; S.hl = null; S.aiT = 0;
}
function val(cd) { const t = cd.t; return t[0] === 'K' ? 20 : t === 'Y고' ? 14 : t[0] === 'Y' ? 10 : t[0] === 'T' && t[1] ? 9 : t[0] === 'T' ? 6 : t === 'P2' ? 5 : 3; }
function take(o, cards, g) { S.cap[o].push(...cards); S.floor = S.floor.filter((f) => !cards.includes(f)); }
function steal(o) { const opp = S.cap[1 - o], i = opp.findIndex((cd) => cd.t === 'P') >= 0 ? opp.findIndex((cd) => cd.t === 'P') : opp.findIndex((cd) => cd.t === 'P2'); if (i >= 0) S.cap[o].push(opp.splice(i, 1)[0]); }
function play(g, o, i) {
  if (S.phase !== 'play') return;
  const cd = S.hand[o].splice(i, 1)[0];
  const m1 = S.floor.filter((f) => f.m === cd.m);
  let got = [], special = '';
  if (m1.length === 3) { got = [cd, ...m1]; special = '따닥!'; }
  else if (m1.length >= 1) got = [cd, m1.sort((a, b) => val(b) - val(a))[0]];
  else S.floor.push(cd);
  if (got.length) take(o, got.slice(1), g), S.cap[o].push(got[0]);
  g.sfx.tone(300, 0.06, 'square', 0.08);
  // 더미 뒤집기
  const fl = S.pile.shift(); S.flipped = fl; S.flip = 0.4;
  if (fl) {
    const m2 = S.floor.filter((f) => f.m === fl.m);
    if (got.length === 2 && fl.m === cd.m) { // 뻑: 낸 패, 먹은 패, 뒤집은 패가 같은 월
      S.cap[o] = S.cap[o].filter((x) => !got.includes(x)); S.floor.push(...got, fl); special = '뻑!'; got = [];
    } else if (m2.length === 3) { take(o, m2, g); S.cap[o].push(fl); special = special || '싹쓸이 월!'; }
    else if (m2.length >= 1) { const pick = m2.sort((a, b) => val(b) - val(a))[0]; take(o, [pick], g); S.cap[o].push(fl); if (!got.length && m2.length === 1 && fl.m === cd.m) special = '쪽!'; }
    else S.floor.push(fl);
  }
  if (special === '쪽!' || special === '따닥!') steal(o);
  if (!S.floor.length && S.pile.length) { special = '싹쓸이!'; steal(o); }
  S.msg = special ? (o ? 'AI: ' : '') + special : '';
  if (special) g.sfx.coin();
  // 점수 체크
  const sc = score(S.cap[o]).total;
  if (sc >= 7 && sc > S.lastScore[o]) {
    S.lastScore[o] = sc;
    if (!S.hand[o].length) return stop(g, o);
    if (o === 0) { S.phase = 'gostop'; return; }
    if (sc >= 10 || S.goes[1] >= 2 || score(S.cap[0]).total >= 5) return stop(g, 1);
    return go(g, 1);
  }
  next(g, o);
}
function next(g, o) {
  if (!S.hand[0].length && !S.hand[1].length) { S.phase = 'over'; S.result = '나가리 (무승부)'; S.detail = '다음 판은 그대로 진행'; return; }
  S.turn = 1 - o; if (S.turn === 1) S.aiT = 0.9;
}
function go(g, o) { S.goes[o]++; S.msg = `${o ? 'AI' : '나'}: ${S.goes[o]}고!`; g.sfx.power(); S.phase = 'play'; next(g, o); }
function stop(g, o) {
  const sc = score(S.cap[o]), opp = S.cap[1 - o];
  let mult = 1, notes = [];
  let pts = sc.total + S.goes[o];
  if (S.goes[o] >= 3) { mult *= Math.pow(2, S.goes[o] - 2); notes.push(`${S.goes[o]}고 ×${Math.pow(2, S.goes[o] - 2)}`); }
  if (sc.pi > 0 && piCount(opp) < 6) { mult *= 2; notes.push('피박 ×2'); }
  if (sc.kwang > 0 && !opp.some((cd) => cd.t[0] === 'K')) { mult *= 2; notes.push('광박 ×2'); }
  if (S.goes[1 - o] > 0) { mult *= 2; notes.push('고박 ×2'); }
  const won = pts * mult * 100;
  S.phase = 'over';
  if (o === 0) { S.money += won; g.sfx.win(); S.result = `🎉 승리! +${won.toLocaleString()}원`; }
  else { S.money -= won; g.sfx.lose(); S.result = `AI 승리 -${won.toLocaleString()}원`; }
  S.detail = `${pts}점` + (notes.length ? ' · ' + notes.join(' · ') : '') + ` · ${sc.desc}`;
}
function piCount(cap) { return cap.reduce((s, cd) => s + (cd.t === 'P' ? 1 : cd.t === 'P2' ? 2 : 0), 0); }
function score(cap) {
  const K = cap.filter((c) => c.t[0] === 'K'), Y = cap.filter((c) => c.t[0] === 'Y'), T = cap.filter((c) => c.t[0] === 'T');
  let kwang = 0, desc = [];
  if (K.length === 5) kwang = 15; else if (K.length === 4) kwang = 4; else if (K.length === 3) kwang = K.some((c) => c.t === 'K비') ? 2 : 3;
  if (kwang) desc.push(`광 ${kwang}`);
  let yeol = Y.length >= 5 ? Y.length - 4 : 0; if (Y.filter((c) => c.t === 'Y고').length === 3) { yeol += 5; desc.push('고도리'); }
  let tti = T.length >= 5 ? T.length - 4 : 0;
  for (const [k, n] of [['홍', '홍단'], ['청', '청단'], ['초', '초단']]) if (T.filter((c) => c.t[1] === k).length === 3) { tti += 3; desc.push(n); }
  const pc = piCount(cap), pi = pc >= 10 ? pc - 9 : 0;
  return { total: kwang + yeol + tti + pi, kwang, pi, desc: desc.join(' ') || '' };
}
function aiPick() {
  let best = 0, bv = -1e9;
  S.hand[1].forEach((cd, i) => { const m = S.floor.filter((f) => f.m === cd.m); let v = m.length ? val(cd) + Math.max(...m.map(val)) + (m.length === 3 ? 30 : 0) : -val(cd) * 0.5; v += Math.random(); if (v > bv) { bv = v; best = i; } });
  return best;
}
