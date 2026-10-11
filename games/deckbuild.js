let S;
const CD = {
  strike: { n: '타격', e: '🗡️', c: 1, ty: 'atk', tg: 1, v: [{ d: 6 }, { d: 9 }], tx: (v) => `피해 ${v.d}`, fx: (v, t) => hitE(t, v.d) },
  defend: { n: '수비', e: '🛡️', c: 1, ty: 'skl', v: [{ b: 5 }, { b: 8 }], tx: (v) => `방어도 ${v.b}`, fx: (v) => block(v.b) },
  bash: { n: '강타', e: '🔨', c: 2, ty: 'atk', tg: 1, v: [{ d: 8, x: 2 }, { d: 10, x: 3 }], tx: (v) => `피해 ${v.d}\n취약 ${v.x}`, fx: (v, t) => { hitE(t, v.d); stat(t, 'vuln', v.x); } },
  cleave: { n: '휩쓸기', e: '🌪️', c: 1, ty: 'atk', v: [{ d: 8 }, { d: 11 }], tx: (v) => `모든 적에게\n피해 ${v.d}`, fx: (v) => hitAll(v.d) },
  twin: { n: '연속 베기', e: '⚔️', c: 1, ty: 'atk', tg: 1, v: [{ d: 5 }, { d: 7 }], tx: (v) => `피해 ${v.d} ×2`, fx: (v, t) => hitE(t, v.d, 2) },
  ironwall: { n: '철벽', e: '🧱', c: 2, ty: 'skl', v: [{ b: 13 }, { b: 18 }], tx: (v) => `방어도 ${v.b}`, fx: (v) => block(v.b) },
  inflame: { n: '분노', e: '🔥', c: 1, ty: 'pow', v: [{ s: 2 }, { s: 3 }], tx: (v) => `힘 +${v.s}`, fx: (v) => { S.f.p.str += v.s; } },
  stab: { n: '독칼', e: '🧪', c: 1, ty: 'atk', tg: 1, v: [{ d: 4, p: 3 }, { d: 5, p: 5 }], tx: (v) => `피해 ${v.d}\n독 ${v.p}`, fx: (v, t) => { hitE(t, v.d); stat(t, 'poison', v.p); } },
  cloud: { n: '독안개', e: '☁️', c: 1, ty: 'skl', v: [{ p: 4 }, { p: 6 }], tx: (v) => `모든 적에게\n독 ${v.p}`, fx: (v) => alive().forEach((e) => stat(e, 'poison', v.p)) },
  focus: { n: '집중', e: '🧠', c: 0, ty: 'skl', v: [{ n: 2 }, { n: 3 }], tx: (v) => `카드 ${v.n}장 뽑기`, fx: (v) => draw(v.n) },
  adren: { n: '아드레날린', e: '💉', c: 0, ty: 'skl', ex: 1, v: [{ e: 1 }, { e: 2 }], tx: (v) => `에너지 +${v.e}\n2장 뽑기\n소멸`, fx: (v) => { S.f.en += v.e; draw(2); } },
  slam: { n: '몸통 박치기', e: '🏋️', c: 1, ty: 'atk', tg: 1, v: [{}, { c: 0 }], tx: () => `방어도만큼\n피해`, fx: (v, t) => hitE(t, S.f.p.block) },
  bandage: { n: '붕대', e: '🩹', c: 0, ty: 'skl', ex: 1, v: [{ h: 4 }, { h: 7 }], tx: (v) => `체력 ${v.h} 회복\n소멸`, fx: (v) => heal(v.h) },
  weaken: { n: '약화 가루', e: '🌫️', c: 1, ty: 'skl', v: [{ w: 2 }, { w: 3 }], tx: (v) => `모든 적\n약화 ${v.w}·취약 1`, fx: (v) => alive().forEach((e) => { stat(e, 'weak', v.w); stat(e, 'vuln', 1); }) },
  thorns: { n: '가시 갑옷', e: '🌵', c: 1, ty: 'pow', v: [{ t: 3 }, { t: 5 }], tx: (v) => `가시 +${v.t}\n(맞으면 반사)`, fx: (v) => { S.f.p.thorns += v.t; } },
  execute: { n: '처형', e: '🪓', c: 2, ty: 'atk', tg: 1, v: [{ d: 15, m: 3 }, { d: 20, m: 4 }], tx: (v) => `피해 ${v.d}\n처치 시\n최대체력 +${v.m}`, fx: (v, t) => { hitE(t, v.d); if (t.dead) { S.maxhp += v.m; S.hp += v.m; S.g.float(200, 250, `최대 체력 +${v.m}`, '#4ade80'); } } },
  blood: { n: '피의 일격', e: '🩸', c: 1, ty: 'atk', tg: 1, v: [{ d: 15 }, { d: 20 }], tx: (v) => `체력 2 잃음\n피해 ${v.d}`, fx: (v, t) => { hurtP(2, true); hitE(t, v.d); } },
  whirl: { n: '회전 베기', e: '🌀', c: 2, ty: 'atk', v: [{ d: 4 }, { d: 6 }], tx: (v) => `모든 적에게\n피해 ${v.d} ×3`, fx: (v) => hitAll(v.d, 3) },
  metal: { n: '강철 피부', e: '⚙️', c: 1, ty: 'pow', v: [{ m: 3 }, { m: 4 }], tx: (v) => `매 턴 시작\n방어도 +${v.m}`, fx: (v) => { S.f.p.metal += v.m; } },
  awaken: { n: '각성', e: '⚡', c: 2, ty: 'pow', v: [{}, { c: 1 }], tx: () => `매 턴\n에너지 +1`, fx: () => { S.f.p.eUp++; } },
  shrug: { n: '받아넘기기', e: '🤸', c: 1, ty: 'skl', v: [{ b: 8 }, { b: 11 }], tx: (v) => `방어도 ${v.b}\n1장 뽑기`, fx: (v) => { block(v.b); draw(1); } },
  heavy: { n: '대검 휘두르기', e: '🗡', c: 2, ty: 'atk', tg: 1, v: [{ d: 14, k: 3 }, { d: 14, k: 5 }], tx: (v) => `피해 ${v.d}\n힘 효과 ×${v.k}`, fx: (v, t) => hitE(t, v.d + S.f.p.str * (v.k - 1)) },
  dagger: { n: '단검 투척', e: '🔪', c: 0, ty: 'atk', tg: 1, v: [{ d: 4 }, { d: 6 }], tx: (v) => `피해 ${v.d}\n1장 뽑기`, fx: (v, t) => { hitE(t, v.d); draw(1); } },
  catal: { n: '촉매', e: '⚗️', c: 1, ty: 'skl', tg: 1, ex: 1, v: [{ k: 2 }, { k: 3 }], tx: (v) => `대상의 독\n×${v.k}\n소멸`, fx: (v, t) => { t.poison *= v.k; } },
  rally: { n: '전투 함성', e: '📯', c: 1, ty: 'skl', v: [{ b: 6, s: 1 }, { b: 9, s: 1 }], tx: (v) => `방어도 ${v.b}\n힘 +${v.s}`, fx: (v) => { block(v.b); S.f.p.str += v.s; } },
  feint: { n: '견제', e: '👊', c: 1, ty: 'atk', tg: 1, v: [{ d: 7, w: 2 }, { d: 9, w: 3 }], tx: (v) => `피해 ${v.d}\n약화 ${v.w}`, fx: (v, t) => { hitE(t, v.d); stat(t, 'weak', v.w); } },
};
const POOL = Object.keys(CD).filter((k) => !['strike', 'defend', 'bash'].includes(k));
const RELICS = {
  blood: { n: '피의 병', e: '🩸', d: '전투 승리 후 체력 6 회복' },
  anchor: { n: '닻', e: '⚓', d: '전투 시작 시 방어도 10' },
  ring: { n: '힘의 반지', e: '💍', d: '전투 시작 시 힘 +1' },
  lantern: { n: '등불', e: '🏮', d: '첫 턴 에너지 +1' },
  cactus: { n: '선인장 갑옷', e: '🌵', d: '가시 3으로 전투 시작' },
  vial: { n: '독병', e: '🧪', d: '전투 시작 시 모든 적에게 독 3' },
  heart: { n: '거인의 심장', e: '❤️', d: '획득 시 최대 체력 +12' },
  book: { n: '고서', e: '📕', d: '매 턴 카드 1장 추가로 뽑기' },
  orich: { n: '오리할콘', e: '🔷', d: '턴 종료 시 방어도가 0이면 방어도 6' },
  dagger: { n: '투척 단검', e: '🗡️', d: '전투 시작 시 모든 적에게 피해 6' },
  feather: { n: '깃털 베개', e: '🪶', d: '휴식 회복량 +15' },
  clover: { n: '네잎클로버', e: '🍀', d: '카드 보상이 강화된 상태로 등장' },
  purse: { n: '금화 주머니', e: '💰', d: '획득 시 골드 +120' },
  core: { n: '에너지 핵', e: '🔮', d: '매 턴 에너지 +1 (보스 유물)', boss: 1 },
  crown: { n: '왕의 관', e: '👑', d: '매 턴 에너지 +1, 최대 체력 +10 (보스 유물)', boss: 1 },
  hydra: { n: '히드라 송곳니', e: '🐍', d: '매 턴 카드 +1장, 방어도 +3 (보스 유물)', boss: 1 },
};
// 적: m = 행동 패턴 {a 공격, h 횟수, b 방어, s 힘, weak/vuln/poison 디버프, ls 흡혈}
const EN = {
  slime: { n: '슬라임', e: '🟢', hp: [26, 32], m: [{ a: 8 }, { a: 5, weak: 1 }] },
  goblin: { n: '고블린', e: '👺', hp: [19, 24], m: [{ a: 6 }, { a: 4, h: 2 }] },
  cultist: { n: '광신도', e: '🧙‍♂️', hp: [46, 52], m: [{ s: 3 }, { a: 6 }], fixed: 1 },
  worm: { n: '턱벌레', e: '🐛', hp: [38, 44], m: [{ a: 11 }, { a: 7, b: 5 }, { s: 3, b: 6 }] },
  shroom: { n: '독버섯', e: '🍄', hp: [16, 20], m: [{ poison: 3 }, { a: 5 }] },
  bat: { n: '박쥐', e: '🦇', hp: [12, 15], m: [{ a: 3, h: 2 }, { a: 5 }] },
  skel: { n: '해골 병사', e: '💀', hp: [30, 34], m: [{ a: 9 }, { b: 9 }, { a: 4, vuln: 1 }] },
  wolf: { n: '늑대', e: '🐺', hp: [34, 38], m: [{ a: 10 }, { a: 3, h: 3 }] },
  knight: { n: '타락 기사', e: '🤺', hp: [80, 86], m: [{ a: 14 }, { b: 12, s: 2 }, { a: 6, h: 3 }], elite: 1 },
  golem: { n: '바위 골렘', e: '🗿', hp: [98, 104], m: [{ b: 15 }, { a: 8 }, { a: 22 }], elite: 1, fixed: 1 },
  witch: { n: '마녀', e: '🧝‍♀️', hp: [70, 74], m: [{ weak: 2, vuln: 2 }, { a: 10, h: 2 }, { poison: 5 }], elite: 1 },
  bslime: { n: '거대 슬라임', e: '🦠', hp: [140, 140], m: [{ a: 16 }, { weak: 2, b: 10 }, { a: 7, h: 3 }, { s: 2, b: 8 }], boss: 1, fixed: 1 },
  vamp: { n: '흡혈귀 백작', e: '🧛', hp: [190, 190], m: [{ a: 9, h: 2, ls: 1 }, { vuln: 2, b: 15 }, { a: 22 }, { s: 3 }], boss: 1, fixed: 1 },
  dragon: { n: '고대 용', e: '🐉', hp: [270, 270], m: [{ a: 7, h: 4 }, { b: 20, s: 2 }, { a: 30 }, { poison: 6, weak: 2 }], boss: 1, fixed: 1 },
};
const ENC = [['slime'], ['goblin', 'goblin'], ['cultist'], ['worm'], ['shroom', 'bat', 'bat'], ['skel', 'bat'], ['wolf'], ['slime', 'shroom'], ['skel', 'goblin'], ['wolf', 'bat']];
const BOSS = ['bslime', 'vamp', 'dragon'];
const NODE = { fight: ['⚔️', '전투'], elite: ['😈', '정예'], rest: ['🔥', '휴식'], shop: ['🛒', '상점'], event: ['❓', '이벤트'], treasure: ['💎', '보물'], boss: ['☠️', '보스'] };
const EVENTS = [
  { e: '⛲', t: '신비한 샘', d: '맑은 물이 반짝인다.', o: [['체력 20 회복', () => heal(20)], ['최대 체력 +6 (체력 -6)', () => { S.maxhp += 6; S.hp = Math.max(1, S.hp - 6); }]] },
  { e: '🧙', t: '수상한 상인', d: '"피를 조금 주면 귀한 물건을 주지..."', o: [['체력 12 잃고 유물 획득', () => { S.hp = Math.max(1, S.hp - 12); gainRelic(randRelic()); }], ['떠나기', () => {}]] },
  { e: '📕', t: '저주받은 책', d: '책장에서 지식이 흘러나온다.', o: [['무작위 카드 2장 강화', () => { const c = U.shuffle(S.deck.filter((x) => !x.up)).slice(0, 2); c.forEach((x) => (x.up = 1)); }], ['골드 60 얻기', () => { S.gold += 60; }]] },
  { e: '🎲', t: '도박꾼', d: '"골드 40을 걸고 동전 던지기 한 판?"', o: [['도박 (50%로 골드 +120)', () => { if (S.gold >= 40) { S.gold -= 40; if (Math.random() < 0.5) { S.gold += 120; S.g.float(500, 400, '대박!', '#fde047', 30); } else S.g.float(500, 400, '꽝...', '#f87171', 30); } }], ['떠나기', () => {}]] },
  { e: '⚒️', t: '버려진 대장간', d: '아직 불씨가 남아 있다.', o: [['카드 1장 강화', () => openPick('up')], ['카드 1장 제거', () => openPick('rm')]] },
  { e: '🧚', t: '요정의 축복', d: '요정이 카드를 건넨다.', o: [['무작위 카드 2장 획득', () => { for (let i = 0; i < 2; i++) S.deck.push({ k: U.choice(POOL), up: 0 }); }], ['체력 전부 회복 (최대체력 -5)', () => { S.maxhp -= 5; S.hp = S.maxhp; }]] },
];
GAME({
  title: '카드 던전', w: 1000, h: 640, bg: '#1c1426', controls: 'none',
  help: '지도에서 다음 방을 클릭해 3막(보스 3)을 돌파하세요\n전투: 카드 클릭 → (공격이면) 적 클릭 · 1~9 카드 선택 · ←→ 대상 · Space 사용 · E 턴 종료\n적 머리 위 의도(⚔️공격 🛡️방어 💪강화 🌀약화)를 보고 대응!\n💪힘 🛡️방어 🔻취약(+50%) 💧약화(-25%) ☠️독 🌵가시\n전투 보상으로 덱 강화 · 🔥휴식/강화 · 🛒상점 · 💎유물',
  init(g) {
    S = { g, hp: 75, maxhp: 75, gold: 99, act: 1, floor: 0, relics: [], scr: 'map', kills: 0, hov: null, msg: '' };
    S.deck = [...Array(5).fill('strike'), ...Array(4).fill('defend'), 'bash'].map((k) => ({ k, up: 0 }));
    newAct();
  },
  update(g, dt) {
    S.g = g; S.hov = null;
    const fn = { map: updMap, fight: updFight, reward: updReward, shop: updShop, rest: updRest, event: updEvent, pick: updPick, bossrelic: updBossRelic }[S.scr];
    fn(g, dt);
    g.info = `${S.act}막 ${S.floor}층 · ❤️${S.hp}/${S.maxhp} · 💰${S.gold} · 덱 ${S.deck.length}장`;
  },
  draw(g, c) {
    const bgc = ['#1c1426', '#14202a', '#2a1414'][S.act - 1];
    g.rect(0, 0, 1000, 640, bgc);
    ({ map: drMap, fight: drFight, reward: drReward, shop: drShop, rest: drRest, event: drEvent, pick: drPick, bossrelic: drBossRelic }[S.scr])(g, c);
    drTop(g);
    if (S.hov) { const w = Math.max(220, S.hov.length * 13); const x = U.clamp(g.mouse.x + 12, 0, 1000 - w), y = U.clamp(g.mouse.y + 14, 0, 600); g.rrect(x, y, w, 34, 8, 'rgba(0,0,0,.9)', '#fbbf24', 1); g.text(S.hov, x + 10, y + 17, 14, '#fde68a', 'left'); }
  },
});
/* ---------- 공통 ---------- */
function cv(card) { const D = CD[card.k]; return D.v[card.up ? 1 : 0]; }
function cost(card) { const v = cv(card); return v.c !== undefined ? v.c : CD[card.k].c; }
function has(r) { return S.relics.includes(r); }
function randRelic() { const o = Object.keys(RELICS).filter((k) => !RELICS[k].boss && !has(k)); return o.length ? U.choice(o) : null; }
function gainRelic(k) {
  if (!k) { S.gold += 50; return; }
  S.relics.push(k); S.g.sfx.power(); S.g.float(500, 300, `${RELICS[k].e} ${RELICS[k].n} 획득!`, '#fde047', 26);
  if (k === 'heart') { S.maxhp += 12; S.hp += 12; }
  if (k === 'purse') S.gold += 120;
  if (k === 'crown') { S.maxhp += 10; S.hp += 10; }
}
function heal(n) { S.hp = Math.min(S.maxhp, S.hp + n); S.g.float(200, 280, '+' + n, '#4ade80', 24); }
function drawCard(g, card, x, y, w, h, hl, dim) {
  const D = CD[card.k], v = cv(card), col = { atk: '#7f1d1d', skl: '#1e3a8a', pow: '#581c87' }[D.ty];
  g.rrect(x, y, w, h, 10, dim ? '#3f3f46' : col, hl ? '#fde047' : card.up ? '#4ade80' : '#d6d3d1', hl ? 4 : 2);
  g.rrect(x + 6, y + 26, w - 12, h * 0.36, 6, 'rgba(0,0,0,.3)');
  g.emoji(D.e, x + w / 2, y + 26 + h * 0.18, h * 0.24);
  g.text(D.n + (card.up ? '+' : ''), x + w / 2 + 6, y + 15, D.n.length > 4 ? 12 : 14, card.up ? '#86efac' : '#fff');
  g.circle(x + 4, y + 4, 13, '#f59e0b'); g.text(cost(card), x + 4, y + 5, 16, '#1c1917');
  const lines = D.tx(v).split('\n');
  lines.forEach((l, i) => g.text(l, x + w / 2, y + h * 0.66 + i * 15, 12, '#f5f5f4', 'center', '600'));
  g.text({ atk: '공격', skl: '스킬', pow: '파워' }[D.ty], x + w / 2, y + h - 9, 10, 'rgba(255,255,255,.5)');
}
function drTop(g) {
  g.rect(0, 0, 1000, 36, 'rgba(0,0,0,.55)');
  g.text(`❤️ ${S.hp}/${S.maxhp}`, 16, 18, 18, '#fca5a5', 'left');
  g.text(`💰 ${S.gold}`, 160, 18, 18, '#fde047', 'left');
  g.text(`${S.act}막 · ${S.floor}층`, 270, 18, 16, '#e9d5ff', 'left');
  S.relics.forEach((k, i) => { const x = 400 + i * 34; g.emoji(RELICS[k].e, x, 18, 26); if (g.inRect(x - 15, 2, 30, 32)) S.hov = `${RELICS[k].n}: ${RELICS[k].d}`; });
}
/* ---------- 지도 ---------- */
function newAct() {
  S.map = [];
  for (let r = 0; r < 7; r++) {
    const row = [];
    for (let c = 0; c < 3; c++) {
      let t;
      if (r === 0) t = 'fight'; else if (r === 6) t = 'rest'; else if (r === 3) t = c === 1 ? 'treasure' : U.choice(['fight', 'event']);
      else { const x = Math.random(); t = x < 0.42 ? 'fight' : x < 0.58 ? (r >= 2 ? 'elite' : 'fight') : x < 0.74 ? 'event' : x < 0.87 ? 'shop' : 'rest'; }
      row.push(t);
    }
    S.map.push(row);
  }
  S.pos = { r: -1, c: 1 }; S.scr = 'map';
}
const MX = (c) => 330 + c * 170, MY = (r) => 575 - r * 66;
function canGo(r, c) { if (r !== S.pos.r + 1) return false; if (r === 7) return true; return S.pos.r < 0 || Math.abs(c - S.pos.c) <= 1; }
function updMap(g) {
  for (let r = 0; r < 8; r++) for (let c = 0; c < (r === 7 ? 1 : 3); c++) {
    const x = r === 7 ? MX(1) : MX(c), y = MY(r);
    if (g.inRect(x - 26, y - 26, 52, 52)) { const t = r === 7 ? 'boss' : S.map[r][c]; S.hov = NODE[t][1]; if (g.mouse.clicked && canGo(r, c)) { enter(g, r, c, t); return; } }
  }
}
function enter(g, r, c, t) {
  S.pos = { r, c }; S.floor++; g.sfx.click(); g.add(20);
  if (t === 'fight') startFight(g, U.choice(ENC.slice(0, S.floor < 3 ? 4 : ENC.length)), 0);
  else if (t === 'elite') startFight(g, [U.choice(['knight', 'golem', 'witch'])], 1);
  else if (t === 'boss') startFight(g, [BOSS[S.act - 1]], 2);
  else if (t === 'rest') S.scr = 'rest';
  else if (t === 'treasure') { gainRelic(randRelic()); S.gold += U.randi(20, 40); }
  else if (t === 'event') { S.ev = U.choice(EVENTS); S.scr = 'event'; }
  else if (t === 'shop') openShop();
}
function drMap(g, c) {
  g.text(`${S.act}막 지도`, 120, 80, 30, '#e9d5ff');
  g.text(['어둠의 숲', '망자의 성채', '용의 둥지'][S.act - 1], 120, 115, 18, '#a78bfa');
  for (let r = 0; r < 6; r++) for (let c = 0; c < 3; c++) for (let d = -1; d <= 1; d++) { const c2 = c + d; if (c2 < 0 || c2 > 2) continue; g.line(MX(c), MY(r), MX(c2), MY(r + 1), 'rgba(167,139,250,.25)', 2); }
  for (let c = 0; c < 3; c++) g.line(MX(c), MY(6), MX(1), MY(7), 'rgba(248,113,113,.35)', 3);
  for (let r = 0; r < 8; r++) for (let c = 0; c < (r === 7 ? 1 : 3); c++) {
    const x = r === 7 ? MX(1) : MX(c), y = MY(r), t = r === 7 ? 'boss' : S.map[r][c];
    const here = S.pos.r === r && S.pos.c === c, go = canGo(r, c), past = r <= S.pos.r && !here;
    const R = r === 7 ? 34 : 24;
    g.circle(x, y, R, here ? '#fbbf24' : go ? '#4c1d95' : '#27272a');
    if (go) g.ring(x, y, R + 4 + Math.sin(g.time * 5) * 2, '#fde047', 3);
    if (past) c.globalAlpha = 0.35;
    g.emoji(NODE[t][0], x, y, r === 7 ? 40 : 28); c.globalAlpha = 1;
  }
  g.text('덱', 880, 70, 20, '#e9d5ff');
  const cnt = {}; S.deck.forEach((d) => { const k = CD[d.k].n + (d.up ? '+' : ''); cnt[k] = (cnt[k] || 0) + 1; });
  Object.entries(cnt).slice(0, 26).forEach(([k, n], i) => g.text(`${k} ×${n}`, 880, 96 + i * 20, 13, '#d4d4d8'));
  g.text('범례', 110, 180, 16, '#a78bfa');
  Object.values(NODE).forEach((n, i) => { g.emoji(n[0], 70, 210 + i * 34, 22); g.text(n[1], 95, 210 + i * 34, 15, '#e4e4e7', 'left'); });
}
/* ---------- 전투 ---------- */
function startFight(g, list, tier) {
  const sc = 1 + 0.45 * (S.act - 1);
  const en = list.map((k, i) => {
    const E = EN[k], hp = Math.round(U.randi(E.hp[0], E.hp[1]) * (E.boss ? 1 : sc));
    return { k, n: E.n, e: E.e, hp, max: hp, block: 0, str: E.boss ? 0 : Math.floor((S.act - 1) * 1.5), vuln: 0, weak: 0, poison: 0, mi: E.fixed ? 0 : U.randi(0, E.m.length - 1), x: 0, y: 0, flash: 0, dead: false, tier };
  });
  const n = en.length; en.forEach((e, i) => { e.x = n === 1 ? 700 : 560 + i * (300 / (n - 1)); e.y = 260; });
  S.f = { enemies: en, energy: 0, tier, hand: [], drawp: U.shuffle(S.deck.map((d) => ({ ...d }))), disc: [], exh: [], p: { block: 0, str: 0, vuln: 0, weak: 0, poison: 0, thorns: 0, metal: 0, eUp: 0 }, sel: -1, tgt: 0, phase: 'player', eq: [], et: 0, turn: 0, won: 0, lunge: 0, hovC: -1 };
  const P = S.f.p;
  if (has('anchor')) P.block = 10;
  if (has('ring')) P.str += 1;
  if (has('cactus')) P.thorns += 3;
  if (has('vial')) en.forEach((e) => (e.poison += 3));
  if (has('dagger')) en.forEach((e) => hurtE(e, 6));
  S.scr = 'fight';
  startTurn(g);
  if (tier === 2) { g.shake(10, 0.6); g.sfx.tone(80, 1, 'sawtooth', 0.08, 40); }
}
function alive() { return S.f.enemies.filter((e) => !e.dead); }
function maxE() { return 3 + S.f.p.eUp + (has('core') ? 1 : 0) + (has('crown') ? 1 : 0); }
function startTurn(g) {
  const F = S.f, P = F.p; F.turn++;
  F.phase = 'player';
  P.block = 0;
  if (P.poison > 0) { hurtP(P.poison, true); P.poison--; }
  if (P.metal) block(P.metal);
  if (has('hydra')) block(3);
  F.energy = maxE() + (F.turn === 1 && has('lantern') ? 1 : 0);
  draw(5 + (has('book') ? 1 : 0) + (has('hydra') ? 1 : 0));
}
function draw(n) {
  const F = S.f;
  for (let i = 0; i < n; i++) {
    if (!F.drawp.length) { if (!F.disc.length) break; F.drawp = U.shuffle(F.disc); F.disc = []; }
    if (F.hand.length >= 10) break;
    F.hand.push(F.drawp.pop());
  }
}
function block(n) { S.f.p.block += n; S.g.float(200, 300, '🛡️+' + n, '#93c5fd', 20); }
function stat(t, k, n) { t[k] += n; }
function dmgCalc(base, atk, def) { let d = base + (atk.str || 0); if (atk.weak > 0) d *= 0.75; if (def.vuln > 0) d *= 1.5; return Math.max(0, Math.floor(d)); }
function hitE(t, base, hits = 1) { for (let i = 0; i < hits; i++) { if (t.dead) return; hurtE(t, dmgCalc(base, S.f.p, t)); } S.f.lunge = 0.15; }
function hitAll(base, hits = 1) { for (let i = 0; i < hits; i++) alive().forEach((e) => hurtE(e, dmgCalc(base, S.f.p, e))); S.f.lunge = 0.15; }
function hurtE(e, d) {
  const g = S.g; const ab = Math.min(e.block, d); e.block -= ab; d -= ab;
  e.hp -= d; e.flash = 0.15;
  g.float(e.x + U.rand(-20, 20), e.y - 60, d > 0 ? '-' + d : '막음', d > 0 ? '#f87171' : '#93c5fd', 26);
  g.burst(e.x, e.y, '#fca5a5', 6 + Math.min(20, d), 180, 0.4);
  g.sfx.hit(); if (d >= 12) g.shake(5);
  if (e.hp <= 0 && !e.dead) { e.dead = true; e.hp = 0; S.kills++; g.add(e.tier === 2 ? 300 : e.tier ? 60 : 15, e.x, e.y); g.burst(e.x, e.y, ['#a855f7', '#f0abfc', '#fff'], 30, 250, 0.8, 4); g.sfx.explode(); }
}
function hurtP(d, direct) {
  const g = S.g, P = S.f.p;
  if (!direct) { const ab = Math.min(P.block, d); P.block -= ab; d -= ab; }
  S.hp -= d; if (d > 0) { g.float(200 + U.rand(-20, 20), 210, '-' + d, '#ef4444', 28); g.shake(Math.min(12, 3 + d / 2)); g.sfx.hit(); g.burst(200, 280, '#ef4444', 8 + d, 160, 0.4); }
  if (S.hp <= 0) { S.hp = 0; g.over(`${S.act}막 ${S.floor}층에서 쓰러졌다...`); }
}
function needT(card) { return CD[card.k].tg; }
function tryPlay(g, i, tgt) {
  const F = S.f, card = F.hand[i]; if (!card) return false;
  const D = CD[card.k], cst = cost(card);
  if (cst > F.energy) { g.sfx.beep(160, 0.1); g.float(500, 440, '에너지 부족!', '#fbbf24', 22); return false; }
  if (D.tg && (!tgt || tgt.dead)) return false;
  F.energy -= cst; F.hand.splice(i, 1);
  D.fx(cv(card), tgt);
  if (D.ty === 'pow') { g.sfx.power(); } else if (D.ex) F.exh.push(card); else F.disc.push(card);
  if (D.ty === 'skl') g.sfx.tone(520, 0.08, 'triangle', 0.06);
  F.sel = -1;
  return true;
}
function endTurn(g) {
  const F = S.f, P = F.p;
  F.disc.push(...F.hand); F.hand = []; F.sel = -1;
  if (P.block === 0 && has('orich')) block(6);
  if (P.vuln > 0) P.vuln--; if (P.weak > 0) P.weak--;
  F.phase = 'enemy'; F.eq = alive().slice(); F.et = 0.45;
  g.sfx.click();
}
function enemyAct(g, e) {
  const F = S.f, P = F.p, E = EN[e.k], m = E.m[e.mi % E.m.length];
  e.block = 0;
  if (e.poison > 0) { hurtE(e, e.poison); e.poison--; if (e.dead) return; }
  if (m.b) e.block += m.b;
  if (m.s) { e.str += m.s; g.float(e.x, e.y - 80, '💪+' + m.s, '#fbbf24', 22); }
  if (m.a) {
    for (let h = 0; h < (m.h || 1); h++) {
      const d = dmgCalc(m.a, e, P), before = S.hp; hurtP(d); if (S.hp <= 0) return;
      if (m.ls) { e.hp = Math.min(e.max, e.hp + (before - S.hp)); }
      if (P.thorns) hurtE(e, P.thorns);
      if (e.dead) break;
    }
    e.lunge = 0.2;
  }
  if (m.weak) P.weak += m.weak; if (m.vuln) P.vuln += m.vuln; if (m.poison) P.poison += m.poison;
  if (e.vuln > 0) e.vuln--; if (e.weak > 0) e.weak--;
  e.mi++;
}
function intentOf(e) {
  const m = EN[e.k].m[e.mi % EN[e.k].m.length]; const parts = [];
  if (m.a) parts.push('⚔️' + dmgCalc(m.a, e, S.f.p) + (m.h > 1 ? '×' + m.h : ''));
  if (m.b) parts.push('🛡️'); if (m.s) parts.push('💪'); if (m.weak || m.vuln || m.poison) parts.push('🌀');
  return parts.join(' ');
}
function updFight(g, dt) {
  const F = S.f;
  F.lunge -= dt; for (const e of F.enemies) { e.flash -= dt; e.lunge = (e.lunge || 0) - dt; }
  if (F.won > 0) { F.won -= dt; if (F.won <= 0) winFight(g); return; }
  if (!alive().length) { F.won = 0.9; return; }
  if (F.phase === 'enemy') {
    F.et -= dt; if (F.et > 0) return;
    const e = F.eq.shift(); if (e && !e.dead) enemyAct(g, e);
    F.et = 0.55;
    if (!F.eq.length && S.hp > 0) { F.phase = 'pdelay'; F.et = 0.35; }
    return;
  }
  if (F.phase === 'pdelay') { F.et -= dt; if (F.et <= 0) startTurn(g); return; }
  const al = alive(); F.tgt = U.clamp(F.tgt, 0, al.length - 1);
  // 키보드
  for (let i = 0; i < 9; i++) if (g.keyp('Digit' + (i + 1)) && i < F.hand.length) { F.sel = F.sel === i ? -1 : i; g.sfx.click(); }
  if (g.pressed('left')) F.tgt = (F.tgt + al.length - 1) % al.length;
  if (g.pressed('right')) F.tgt = (F.tgt + 1) % al.length;
  if (g.pressed('a') && F.sel >= 0) { tryPlay(g, F.sel, al[F.tgt]); return; }
  if (g.keyp('KeyE') || g.clickIn(860, 400, 120, 50)) { endTurn(g); return; }
  // 마우스
  const n = F.hand.length;
  for (let i = n - 1; i >= 0; i--) {
    const { x, y } = handPos(i, n);
    if (g.inRect(x, y, 110, 150)) { F.hovC = i; if (g.mouse.clicked) { if (F.sel === i) { if (!needT(F.hand[i])) tryPlay(g, i, al[F.tgt]); else F.sel = -1; } else { F.sel = i; g.sfx.click(); } } return; }
  }
  F.hovC = -1;
  for (const e of al) if (g.inRect(e.x - 60, e.y - 80, 120, 160)) {
    S.hov = `${e.n}: ${e.hp}/${e.max}` + (e.poison ? ` · 독 ${e.poison}` : '') + (e.str ? ` · 힘 ${e.str}` : '');
    if (g.mouse.clicked && F.sel >= 0) { tryPlay(g, F.sel, e); return; }
  }
  if (g.mouse.clicked && F.sel >= 0 && !needT(F.hand[F.sel]) && g.mouse.y < 430) tryPlay(g, F.sel, al[0]);
}
function handPos(i, n) { const sp = Math.min(118, 700 / Math.max(1, n)); const x0 = 470 - (sp * (n - 1)) / 2 - 55; return { x: x0 + i * sp, y: 476 - (S.f.sel === i ? 24 : S.f.hovC === i ? 12 : 0) }; }
function drStats(g, x, y, o) {
  const st = [['block', '🛡️'], ['str', '💪'], ['vuln', '🔻'], ['weak', '💧'], ['poison', '☠️'], ['thorns', '🌵'], ['metal', '⚙️']];
  let i = 0; for (const [k, ic] of st) if (o[k]) { g.text(ic + o[k], x + i * 44, y, 15, '#fff'); i++; }
}
function drFight(g, c) {
  const F = S.f, P = F.p;
  g.rect(0, 360, 1000, 4, 'rgba(255,255,255,.08)');
  // 플레이어
  const px = 200 + (F.lunge > 0 ? 30 : 0);
  c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(px, 340, 60, 14, 0, 0, Math.PI * 2); c.fill();
  g.emoji('🦸', px, 270, 110);
  g.rect(130, 352, 140, 12, '#450a0a'); g.rect(130, 352, 140 * S.hp / S.maxhp, 12, '#ef4444');
  if (P.block) { g.rrect(118, 348, 24, 20, 5, '#3b82f6'); g.text(P.block, 130, 358, 13, '#fff'); }
  g.text(`${S.hp}/${S.maxhp}`, 200, 378, 14, '#fecaca');
  drStats(g, 120, 400, { str: P.str, vuln: P.vuln, weak: P.weak, poison: P.poison, thorns: P.thorns, metal: P.metal });
  // 적
  const al = alive();
  for (const e of F.enemies) {
    if (e.dead) continue;
    const isT = F.sel >= 0 && needT(F.hand[F.sel] || { k: 'defend' }) && al[F.tgt] === e;
    const ex = e.x - (e.lunge > 0 ? 30 : 0), big = e.tier === 2 ? 140 : e.tier ? 105 : 85;
    c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(ex, 340, big * 0.5, 14, 0, 0, Math.PI * 2); c.fill();
    c.save(); if (e.flash > 0) c.filter = 'brightness(2.5)'; g.emoji(e.e, ex, 340 - big * 0.55 + Math.sin(g.time * 2 + e.x) * 3, big); c.restore();
    if (isT || (F.sel >= 0 && g.inRect(e.x - 60, e.y - 80, 120, 160))) g.ring(e.x, 340 - big * 0.55, big * 0.62, '#fde047', 3);
    g.rect(e.x - 60, 352, 120, 12, '#450a0a'); g.rect(e.x - 60, 352, 120 * e.hp / e.max, 12, '#dc2626');
    if (e.block) { g.rrect(e.x - 72, 348, 24, 20, 5, '#3b82f6'); g.text(e.block, e.x - 60, 358, 13, '#fff'); }
    g.text(`${e.n} ${e.hp}/${e.max}`, e.x, 378, 13, '#fecaca');
    g.rrect(e.x - 50, 340 - big * 1.15 - 14, 100, 28, 10, 'rgba(0,0,0,.6)');
    g.text(intentOf(e), e.x, 340 - big * 1.15, 16, '#fde68a');
    drStats(g, e.x - 60, 400, { str: e.str, vuln: e.vuln, weak: e.weak, poison: e.poison });
  }
  // 에너지 / 더미
  g.circle(60, 560, 38, '#b45309'); g.ring(60, 560, 38, '#fde047', 3); g.text(`${F.energy}/${maxE()}`, 60, 562, 22, '#fff');
  g.text(`📚 ${F.drawp.length}`, 40, 618, 15, '#d4d4d8', 'left');
  g.text(`🗑️ ${F.disc.length}  ✖${F.exh.length}`, 940, 618, 15, '#d4d4d8', 'right');
  // 턴 종료
  if (F.phase === 'player') g.button(860, 400, 120, 50, '턴 종료 (E)', '#9a3412', 17);
  else g.text('적의 턴...', 920, 425, 18, '#fca5a5');
  // 손패
  const n = F.hand.length;
  F.hand.forEach((card, i) => { const { x, y } = handPos(i, n); drawCard(g, card, x, y, 110, 150, F.sel === i, cost(card) > F.energy); });
  if (F.sel >= 0 && F.hand[F.sel]) g.text(needT(F.hand[F.sel]) ? '대상 적을 클릭 (←→ · Space)' : '다시 클릭하거나 위쪽을 클릭해 사용', 500, 450, 15, '#fde047');
  if (F.turn === 1 && F.phase === 'player' && F.tier === 2) g.text('☠️ 보스 전투!', 500, 70, 30, '#f87171');
}
function rewardCards() {
  const up = has('clover');
  return U.shuffle(POOL.slice()).slice(0, 3).map((k) => ({ k, up: up ? 1 : 0 }));
}
function winFight(g) {
  const F = S.f;
  const gold = F.tier === 2 ? 90 : F.tier ? U.randi(28, 40) : U.randi(11, 20);
  S.gold += gold;
  if (has('blood')) heal(6);
  S.rw = { gold, cards: rewardCards(), relic: null, tier: F.tier };
  if (F.tier === 1) { S.rw.relic = randRelic(); gainRelic(S.rw.relic); }
  S.scr = 'reward'; g.sfx.win();
}
function updReward(g) {
  S.rw.cards.forEach((cd, i) => { const x = 270 + i * 160; if (g.inRect(x, 220, 130, 180)) { if (g.mouse.clicked) { S.deck.push(cd); g.sfx.coin(); afterReward(g); } } });
  if (g.clickIn(420, 450, 160, 46)) afterReward(g);
}
function afterReward(g) {
  if (S.rw.tier === 2) {
    g.add(500 * S.act);
    if (S.act >= 3) { g.add(S.hp * 10); g.win(`3막의 고대 용을 쓰러뜨렸다! 덱 ${S.deck.length}장`); return; }
    const opts = Object.keys(RELICS).filter((k) => RELICS[k].boss && !has(k));
    S.bossOpts = opts.length ? opts : [randRelic()];
    S.scr = 'bossrelic'; return;
  }
  S.scr = 'map';
}
function drReward(g) {
  g.text(S.rw.tier === 2 ? '보스 처치!' : '승리!', 500, 80, 40, '#fde047');
  g.text(`💰 골드 +${S.rw.gold}` + (S.rw.relic ? `   ${RELICS[S.rw.relic].e} ${RELICS[S.rw.relic].n} 획득` : ''), 500, 130, 20, '#fde68a');
  g.text('카드 1장을 골라 덱에 추가', 500, 190, 20, '#e9d5ff');
  S.rw.cards.forEach((cd, i) => drawCard(g, cd, 270 + i * 160, 220 + (g.inRect(270 + i * 160, 220, 130, 180) ? -8 : 0), 130, 180, g.inRect(270 + i * 160, 220, 130, 180)));
  g.button(420, 450, 160, 46, '건너뛰기', '#3f3f46', 18);
}
function updBossRelic(g) {
  S.bossOpts.forEach((k, i) => { if (g.clickIn(250 + i * 180, 250, 140, 140)) { gainRelic(k); S.act++; S.hp = Math.min(S.maxhp, S.hp + Math.ceil((S.maxhp - S.hp) * 0.6)); newAct(); } if (k && g.inRect(250 + i * 180, 250, 140, 140)) S.hov = RELICS[k].d; });
}
function drBossRelic(g) {
  g.text('보스 유물을 하나 고르세요', 500, 160, 30, '#fde047');
  S.bossOpts.forEach((k, i) => { if (!k) return; const x = 250 + i * 180; g.rrect(x, 250, 140, 140, 16, g.inRect(x, 250, 140, 140) ? '#7c3aed' : '#4c1d95', '#fde047'); g.emoji(RELICS[k].e, x + 70, 300, 56); g.text(RELICS[k].n, x + 70, 365, 16, '#fff'); });
  g.text('다음 막으로 가면 잃은 체력의 60%를 회복합니다', 500, 460, 16, '#d4d4d8');
}
/* ---------- 상점·휴식·이벤트·선택 ---------- */
function openShop() {
  S.shop = { cards: U.shuffle(POOL.slice()).slice(0, 5).map((k) => ({ k, up: 0, price: U.randi(45, 80) })), relics: [randRelic(), randRelic()].filter((v, i, a) => v && a.indexOf(v) === i).map((k) => ({ k, price: U.randi(130, 170) })), rm: 75 };
  S.scr = 'shop';
}
function updShop(g) {
  const SH = S.shop;
  SH.cards.forEach((cd, i) => { const x = 90 + i * 165; if (!cd.sold && g.clickIn(x, 110, 130, 180)) { if (S.gold >= cd.price) { S.gold -= cd.price; cd.sold = 1; S.deck.push({ k: cd.k, up: 0 }); g.sfx.coin(); } else g.sfx.beep(150, 0.1); } });
  SH.relics.forEach((r, i) => { const x = 180 + i * 170; if (g.inRect(x, 360, 120, 120)) { S.hov = RELICS[r.k].d; if (g.mouse.clicked && !r.sold) { if (S.gold >= r.price) { S.gold -= r.price; r.sold = 1; gainRelic(r.k); } else g.sfx.beep(150, 0.1); } } });
  if (g.clickIn(560, 380, 180, 80) && SH.rm && S.gold >= SH.rm) { S.gold -= SH.rm; SH.rm = 0; openPick('rm', 'shop'); }
  if (g.clickIn(800, 560, 160, 50)) { S.scr = 'map'; g.sfx.click(); }
}
function drShop(g) {
  const SH = S.shop;
  g.text('🛒 떠돌이 상인', 500, 70, 30, '#fde047');
  SH.cards.forEach((cd, i) => { const x = 90 + i * 165; if (cd.sold) { g.text('판매 완료', x + 65, 200, 16, '#71717a'); return; } drawCard(g, cd, x, 110, 130, 180, g.inRect(x, 110, 130, 180), S.gold < cd.price); g.text(`💰${cd.price}`, x + 65, 310, 18, S.gold >= cd.price ? '#fde047' : '#71717a'); });
  SH.relics.forEach((r, i) => { const x = 180 + i * 170; g.rrect(x, 360, 120, 120, 14, r.sold ? '#27272a' : '#4c1d95', '#a78bfa'); if (!r.sold) { g.emoji(RELICS[r.k].e, x + 60, 400, 46); g.text(RELICS[r.k].n, x + 60, 445, 13, '#fff'); g.text(`💰${r.price}`, x + 60, 466, 15, '#fde047'); } else g.text('판매 완료', x + 60, 420, 14, '#71717a'); });
  g.rrect(560, 380, 180, 80, 14, SH.rm ? '#7f1d1d' : '#27272a', '#fca5a5'); g.text(SH.rm ? '카드 제거' : '사용함', 650, 405, 18, '#fff'); if (SH.rm) g.text(`💰${SH.rm}`, 650, 435, 16, '#fde047');
  g.button(800, 560, 160, 50, '떠나기 ▶', '#3f3f46', 18);
}
function restHeal() { return Math.round(S.maxhp * 0.3) + (has('feather') ? 15 : 0); }
function updRest(g) {
  if (g.clickIn(250, 260, 220, 160)) { heal(restHeal()); g.sfx.power(); S.scr = 'map'; }
  if (g.clickIn(530, 260, 220, 160)) openPick('up');
}
function drRest(g) {
  g.text('🔥 모닥불', 500, 120, 36, '#fdba74');
  g.emoji('🔥', 500, 190, 60 + Math.sin(g.time * 8) * 4);
  g.rrect(250, 260, 220, 160, 16, g.inRect(250, 260, 220, 160) ? '#166534' : '#14532d', '#4ade80'); g.emoji('😴', 360, 315, 50); g.text(`휴식: 체력 +${restHeal()}`, 360, 385, 18, '#fff');
  g.rrect(530, 260, 220, 160, 16, g.inRect(530, 260, 220, 160) ? '#1e40af' : '#1e3a8a', '#93c5fd'); g.emoji('⚒️', 640, 315, 50); g.text('카드 1장 강화', 640, 385, 18, '#fff');
}
function updEvent(g) {
  S.ev.o.forEach((o, i) => { if (g.clickIn(300, 330 + i * 70, 400, 54)) { S.scr = 'map'; g.sfx.click(); o[1](); } });
}
function drEvent(g) {
  g.emoji(S.ev.e, 500, 150, 90);
  g.text(S.ev.t, 500, 230, 30, '#fde047');
  g.text(S.ev.d, 500, 275, 18, '#e4e4e7');
  S.ev.o.forEach((o, i) => g.button(300, 330 + i * 70, 400, 54, o[0], '#4c1d95', 18));
}
function openPick(mode, back) {
  S.pick = { mode, back: back || 'map', list: S.deck.filter((c) => mode === 'rm' || !c.up), page: 0 };
  if (!S.pick.list.length) { S.scr = S.pick.back; return; }
  S.scr = 'pick';
}
function updPick(g) {
  const P = S.pick;
  P.list.slice(P.page * 14, P.page * 14 + 14).forEach((cd, i) => {
    const x = 60 + (i % 7) * 130, y = 110 + Math.floor(i / 7) * 200;
    if (g.clickIn(x, y, 115, 160)) {
      if (P.mode === 'up') { cd.up = 1; g.sfx.power(); g.float(x + 55, y + 80, '강화!', '#4ade80', 26); }
      else { S.deck.splice(S.deck.indexOf(cd), 1); g.sfx.drop(); }
      S.scr = P.back;
    }
  });
  if (P.list.length > 14 && g.clickIn(420, 540, 160, 44)) P.page = (P.page + 1) % Math.ceil(P.list.length / 14);
}
function drPick(g) {
  const P = S.pick;
  g.text(P.mode === 'up' ? '강화할 카드를 고르세요' : '제거할 카드를 고르세요', 500, 70, 28, '#fde047');
  P.list.slice(P.page * 14, P.page * 14 + 14).forEach((cd, i) => {
    const x = 60 + (i % 7) * 130, y = 110 + Math.floor(i / 7) * 200, hov = g.inRect(x, y, 115, 160);
    drawCard(g, P.mode === 'up' && hov ? { k: cd.k, up: 1 } : cd, x, y, 115, 160, hov);
  });
  if (P.list.length > 14) g.button(420, 540, 160, 44, `다음 쪽 (${P.page + 1}/${Math.ceil(P.list.length / 14)})`, '#3f3f46', 16);
}
