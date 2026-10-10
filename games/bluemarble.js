let S;
const SQ = [
  ['출발', 'start'], ['타이베이', 5], ['황금열쇠', 'key'], ['베이징', 8], ['마닐라', 8], ['제주도', 20], ['싱가포르', 10],
  ['무인도', 'island'], ['카이로', 12], ['황금열쇠', 'key'], ['이스탄불', 12], ['아테네', 14], ['코펜하겐', 16], ['스톡홀름', 16],
  ['사회복지기금', 'fund'], ['베른', 18], ['황금열쇠', 'key'], ['베를린', 20], ['오타와', 20], ['부에노스아이레스', 22], ['상파울루', 24],
  ['우주여행', 'space'], ['시드니', 26], ['하와이', 28], ['리스본', 28], ['기금 납부', 'tax'], ['마드리드', 30], ['서울', 40],
];
const FLAG = ['🏁', '🇹🇼', '🔑', '🇨🇳', '🇵🇭', '🏝️', '🇸🇬', '🏝️', '🇪🇬', '🔑', '🇹🇷', '🇬🇷', '🇩🇰', '🇸🇪', '💰', '🇨🇭', '🔑', '🇩🇪', '🇨🇦', '🇦🇷', '🇧🇷', '🚀', '🇦🇺', '🌺', '🇵🇹', '💸', '🇪🇸', '🇰🇷'];
const PC = ['#2563eb', '#dc2626', '#16a34a', '#ca8a04'], PN = ['나', '철수', '영희', '민수'], PT = ['🚗', '🚕', '🚙', '🛻'];
const RENT = [0.2, 0.7, 1.4, 2.4, 3.6], BOARD = 700, BX = 30, BY = 30, N = 28;
GAME({
  title: '부루마블', w: 1100, h: 760, bg: '#0c4a6e', controls: 'none',
  help: '🎲 주사위를 굴려 세계 도시를 사고 건물을 지어 통행료를 받으세요\n더블이 나오면 한 번 더 · 세 번 연속 더블이면 무인도행\n🔑 황금열쇠 · 🏝️ 무인도(3턴) · 🚀 우주여행(원하는 칸으로) · 💰 사회복지기금\n20바퀴(라운드) 뒤 자산 1위 또는 마지막까지 살아남으면 승리!',
  init(g) {
    S = { pl: PN.map((n, i) => ({ i, n, pos: 0, money: 300, alive: true, island: 0, space: false })), own: Array(N).fill(-1), lvl: Array(N).fill(0), turn: 0, phase: 'roll', dice: [1, 1], rollT: 0, moveLeft: 0, doubles: 0, fund: 0, round: 1, log: ['게임 시작! 각자 300만원'], prompt: null, aiT: 0, anim: 0 };
  },
  update(g, dt) {
    const P = S.pl[S.turn];
    g.score = Math.max(0, Math.round(assets(0) * 10));
    if (S.rollT > 0) { S.rollT -= dt; S.dice = [U.randi(1, 6), U.randi(1, 6)]; if (S.rollT <= 0) { S.rollT = 0; afterRoll(g); } return; }
    if (S.moveLeft) { S.anim -= dt; if (S.anim <= 0) { S.anim = 0.13; step(g, P); } return; }
    if (S.turn !== 0) { S.aiT -= dt; if (S.aiT <= 0) aiAct(g); return; }
    if (S.phase === 'roll' && (g.clickIn(820, 600, 240, 64) || g.pressed('a'))) roll(g);
    if (S.phase === 'prompt' && S.prompt) { if (g.clickIn(780, 470, 150, 54)) answer(g, true); if (g.clickIn(940, 470, 150, 54)) answer(g, false); }
    if (S.phase === 'space' && g.mouse.clicked) { for (let k = 0; k < N; k++) { const [x, y, w, h] = cell(k); if (g.inRect(x, y, w, h) && k !== 21) { travel(g, P, k); break; } } }
  },
  draw(g, c) {
    g.rect(BX, BY, BOARD, BOARD, '#e0f2fe');
    for (let k = 0; k < N; k++) {
      const [x, y, w, h] = cell(k), sq = SQ[k], o = S.own[k];
      g.rect(x + 1, y + 1, w - 2, h - 2, typeof sq[1] === 'number' ? '#fff' : '#fef3c7');
      if (typeof sq[1] === 'number') g.rect(x + 1, y + 1, w - 2, 12, o >= 0 ? PC[o] : '#94a3b8');
      g.emoji(FLAG[k], x + w / 2, y + h * 0.42, Math.min(w, h) * 0.34);
      g.text(sq[0].length > 5 ? sq[0].slice(0, 4) + '…' : sq[0], x + w / 2, y + h * 0.72, 11, '#0f172a');
      if (typeof sq[1] === 'number') g.text(`${sq[1]}만`, x + w / 2, y + h * 0.88, 10, '#64748b');
      if (S.lvl[k]) g.text(S.lvl[k] === 4 ? '🏨' : '🏠'.repeat(S.lvl[k]), x + w / 2, y + 22, 11, '#000');
      if (S.phase === 'space' && S.turn === 0 && k !== 21 && g.inRect(x, y, w, h)) g.stroke(x + 2, y + 2, w - 4, h - 4, '#f59e0b', 4);
    }
    // 중앙
    g.rect(BX + 100, BY + 100, BOARD - 200, BOARD - 200, '#0369a1');
    g.text('부루마블', BX + BOARD / 2, BY + 200, 54, '#fff');
    g.text(`라운드 ${S.round} / 20`, BX + BOARD / 2, BY + 255, 20, '#bae6fd');
    g.text(`💰 사회복지기금 ${S.fund}만`, BX + BOARD / 2, BY + 290, 16, '#fde68a');
    S.dice.forEach((d, i) => { const x = BX + BOARD / 2 - 70 + i * 80, y = BY + 330; g.rrect(x, y, 60, 60, 10, '#fff', '#334155', 2); g.text('⚀⚁⚂⚃⚄⚅'[d - 1], x + 30, y + 31, 52, '#111'); });
    S.log.slice(-5).forEach((l, i, a) => g.text(l, BX + BOARD / 2, BY + 430 + i * 24, 14, i === a.length - 1 ? '#fde047' : '#bae6fd'));
    // 말
    S.pl.forEach((p, i) => { if (!p.alive) return; const [x, y, w, h] = cell(p.pos); g.circle(x + 16 + (i % 2) * 28, y + h - 18 - Math.floor(i / 2) * 22, 12, PC[i]); g.emoji(PT[i], x + 16 + (i % 2) * 28, y + h - 18 - Math.floor(i / 2) * 22, 18); });
    // 사이드
    S.pl.forEach((p, i) => { const y = 30 + i * 90; g.rrect(760, y, 320, 80, 12, i === S.turn ? '#075985' : '#0c4a6e', PC[i], i === S.turn ? 4 : 2); g.text(`${PT[i]} ${p.n}${p.alive ? '' : ' (파산)'}`, 780, y + 24, 20, '#fff', 'left'); g.text(`현금 ${p.money}만 · 자산 ${assets(i)}만`, 780, y + 56, 15, '#bae6fd', 'left'); if (p.island) g.text(`🏝️${p.island}`, 1060, y + 24, 16, '#fde68a', 'right'); });
    if (S.turn === 0 && S.phase === 'roll' && !S.rollT && !S.moveLeft) g.button(820, 600, 240, 64, '🎲 주사위 굴리기', '#16a34a', 22);
    if (S.phase === 'prompt' && S.prompt && S.turn === 0) { g.rrect(760, 400, 330, 140, 14, '#0f172a', '#fde047', 3); g.text(S.prompt.q, 925, 435, 16, '#fff'); g.button(780, 470, 150, 54, S.prompt.yes, '#16a34a', 18); g.button(940, 470, 140, 54, '패스', '#475569', 18); }
    if (S.phase === 'space' && S.turn === 0) g.text('🚀 이동할 칸을 클릭!', 925, 700, 20, '#fde047');
    if (S.turn !== 0) g.text(`${PN[S.turn]} 차례...`, 925, 700, 18, '#bae6fd');
  },
});
function cell(k) {
  const cs = BOARD / 8; // 코너 포함 한 변 8칸 (코너 크기 = cs)
  if (k <= 7) return [BX + BOARD - cs - k * cs, BY + BOARD - cs, cs, cs];
  if (k <= 14) return [BX, BY + BOARD - cs - (k - 7) * cs, cs, cs];
  if (k <= 21) return [BX + (k - 14) * cs, BY, cs, cs];
  return [BX + BOARD - cs, BY + (k - 21) * cs, cs, cs];
}
function assets(i) { const p = S.pl[i]; if (!p.alive) return 0; let a = p.money; for (let k = 0; k < N; k++) if (S.own[k] === i) a += SQ[k][1] * (1 + S.lvl[k] * 0.5); return Math.round(a); }
function log(t) { S.log.push(t); if (S.log.length > 30) S.log.shift(); }
function roll(g) {
  const P = S.pl[S.turn];
  S.rollT = 0.6; S.phase = 'rolling'; g.sfx.noise(0.3, 0.06);
}
function afterRoll(g) {
  const P = S.pl[S.turn], [a, b] = S.dice, dbl = a === b;
  if (P.island) { if (dbl) { P.island = 0; log(`${P.n}: 더블! 무인도 탈출`); } else { P.island--; log(`${P.n}: 무인도에 갇힘 (${P.island}턴 남음)`); return endTurn(g, false); } }
  if (dbl) { S.doubles++; if (S.doubles >= 3) { log(`${P.n}: 더블 3번! 무인도행`); P.pos = 7; P.island = 3; S.doubles = 0; return endTurn(g, false); } }
  else S.doubles = 0;
  S.moveLeft = a + b; S.anim = 0; S.lastDbl = dbl;
  g.sfx.tone(400, 0.1, 'triangle', 0.08);
}
function step(g, P) {
  P.pos = (P.pos + 1) % N; S.moveLeft--;
  g.sfx.tone(600, 0.03, 'sine', 0.04);
  if (P.pos === 0) { P.money += 20; log(`${P.n}: 출발 통과 +20만`); if (P.i === 0) g.sfx.coin(); }
  if (!S.moveLeft) land(g, P);
}
function land(g, P) {
  const k = P.pos, sq = SQ[k];
  if (typeof sq[1] === 'number') {
    const o = S.own[k];
    if (o < 0) return ask(g, P, `${sq[0]} 구매? (${sq[1]}만)`, '구매', () => buy(g, P, k), sq[1] <= P.money - 30);
    if (o === P.i) { const cost = Math.round(sq[1] * 0.5); if (S.lvl[k] < 4) return ask(g, P, `${sq[0]}에 ${S.lvl[k] === 3 ? '호텔' : '집'} 짓기? (${cost}만)`, '건설', () => { P.money -= cost; S.lvl[k]++; log(`${P.n}: ${sq[0]} 건설 Lv${S.lvl[k]}`); g.sfx.power(); }, cost <= P.money - 50); return endTurn(g, S.lastDbl); }
    const rent = Math.round(sq[1] * RENT[S.lvl[k]]);
    pay(g, P, S.pl[o], rent, `${sq[0]} 통행료`);
    return endTurn(g, S.lastDbl);
  }
  if (sq[1] === 'key') return goldenKey(g, P);
  if (sq[1] === 'island') { P.island = 3; log(`${P.n}: 무인도 도착! 3턴 휴식`); S.lastDbl = false; return endTurn(g, false); }
  if (sq[1] === 'fund') { P.money += S.fund; log(`${P.n}: 사회복지기금 ${S.fund}만 획득!`); if (S.fund && P.i === 0) g.sfx.win(); S.fund = 0; return endTurn(g, S.lastDbl); }
  if (sq[1] === 'tax') { const t = 15; P.money -= t; S.fund += t; log(`${P.n}: 기금 납부 -${t}만`); checkBankrupt(g, P); return endTurn(g, S.lastDbl); }
  if (sq[1] === 'space') { P.space = true; log(`${P.n}: 우주여행! 다음 턴에 원하는 곳으로`); return endTurn(g, S.lastDbl); }
  endTurn(g, S.lastDbl);
}
function goldenKey(g, P) {
  const r = U.randi(0, 7);
  const ev = [
    () => { P.money += 30; return '복권 당첨! +30만'; }, () => { P.money -= 20; S.fund += 20; return '과속 벌금 -20만'; },
    () => { P.pos = 0; P.money += 20; return '출발지로 이동! +20만'; }, () => { P.pos = 7; P.island = 3; return '무인도로 표류...'; },
    () => { let t = 0; S.pl.forEach((q) => { if (q !== P && q.alive) { q.money -= 10; t += 10; } }); P.money += t; return `생일 축하금 +${t}만`; },
    () => { let t = 0; S.pl.forEach((q) => { if (q !== P && q.alive) { q.money += 10; t += 10; } }); P.money -= t; return `한턱 쏘기 -${t}만`; },
    () => { let t = 0; for (let k = 0; k < N; k++) if (S.own[k] === P.i) t += S.lvl[k] * 5; P.money -= t; S.fund += t; return `건물 수리비 -${t}만`; },
    () => { P.space = true; return '우주여행 초대권! 다음 턴 원하는 곳으로'; },
  ];
  const msg = ev[r]();
  log(`🔑 ${P.n}: ${msg}`); P.i === 0 ? g.sfx.power() : 0;
  checkBankrupt(g, P);
  endTurn(g, S.lastDbl);
}
function ask(g, P, q, yes, fn, aiYes) {
  if (P.i !== 0) { if (aiYes) fn(); return endTurn(g, S.lastDbl); }
  S.prompt = { q, yes, fn }; S.phase = 'prompt';
}
function answer(g, y) { const p = S.prompt; S.prompt = null; S.phase = 'roll'; if (y) p.fn(); else g.sfx.click(); endTurn(g, S.lastDbl); }
function buy(g, P, k) { if (P.money < SQ[k][1]) { log(`${P.n}: 돈이 부족해요`); return; } P.money -= SQ[k][1]; S.own[k] = P.i; log(`${P.n}: ${SQ[k][0]} 구매!`); if (P.i === 0) { g.sfx.coin(); g.add(0); } }
function pay(g, P, to, amt, why) {
  P.money -= amt; to.money += amt; log(`${P.n} → ${to.n}: ${why} ${amt}만`);
  if (P.i === 0) g.sfx.hit(); if (to.i === 0) g.sfx.coin();
  checkBankrupt(g, P);
}
function checkBankrupt(g, P) {
  if (P.money >= 0 || !P.alive) return;
  // 건물 매각
  for (let k = 0; k < N && P.money < 0; k++) if (S.own[k] === P.i) { P.money += Math.round(SQ[k][1] * (1 + S.lvl[k] * 0.5) * 0.6); S.own[k] = -1; S.lvl[k] = 0; }
  if (P.money < 0) { P.alive = false; log(`💀 ${P.n} 파산!`); if (P.i === 0) { g.sfx.lose(); g.later(() => g.over('파산했다...'), 1.2); } }
}
function travel(g, P, k) { P.space = false; const passStart = k < P.pos; P.pos = k; if (passStart) { P.money += 20; } log(`🚀 ${P.n}: ${SQ[k][0]}(으)로 이동`); S.phase = 'roll'; land(g, P); }
function endTurn(g, again) {
  if (S.over) return;
  const alive = S.pl.filter((p) => p.alive);
  if (!S.pl[0].alive) return;
  if (alive.length === 1) { S.over = true; g.add(5000); return g.later(() => g.win('모든 상대가 파산! 부루마블 정복'), 1); }
  S.phase = 'roll';
  if (!again || !S.pl[S.turn].alive) { S.doubles = 0; do { S.turn = (S.turn + 1) % 4; if (S.turn === 0) { S.round++; if (S.round > 20) return finish(g); } } while (!S.pl[S.turn].alive); }
  const P = S.pl[S.turn];
  if (P.space) { if (P.i === 0) { S.phase = 'space'; return; } const tgt = [27, 26, 24, 23, 22].find((k) => S.own[k] < 0 || S.own[k] === P.i) ?? 0; S.aiT = 0.8; return travel(g, P, tgt); }
  S.aiT = 0.8;
}
function finish(g) {
  S.over = true;
  const rank = S.pl.map((p, i) => ({ i, a: assets(i) })).sort((a, b) => b.a - a.a);
  const me = rank.findIndex((r) => r.i === 0) + 1;
  g.add(me === 1 ? 3000 : 0);
  me === 1 ? g.win(`20라운드 종료! 자산 1위 (${assets(0)}만)`) : g.over(`20라운드 종료 · ${me}위 (${assets(0)}만)`);
}
function aiAct(g) { if (S.phase === 'roll') roll(g); }
