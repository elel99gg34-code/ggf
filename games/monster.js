let S;
const T32 = 32, MW = 50, MH = 40;
const TY = ['노말', '불', '물', '풀', '전기', '땅', '비행', '얼음'];
const TYC = { 노말: '#a8a29e', 불: '#f97316', 물: '#3b82f6', 풀: '#22c55e', 전기: '#eab308', 땅: '#a16207', 비행: '#818cf8', 얼음: '#67e8f9' };
const CHART = {
  불: { 풀: 2, 얼음: 2, 물: 0.5, 불: 0.5 }, 물: { 불: 2, 땅: 2, 물: 0.5, 풀: 0.5 }, 풀: { 물: 2, 땅: 2, 불: 0.5, 풀: 0.5, 비행: 0.5 },
  전기: { 물: 2, 비행: 2, 풀: 0.5, 전기: 0.5, 땅: 0 }, 땅: { 불: 2, 전기: 2, 풀: 0.5, 비행: 0 }, 비행: { 풀: 2, 전기: 0.5 },
  얼음: { 풀: 2, 땅: 2, 비행: 2, 불: 0.5, 물: 0.5, 얼음: 0.5 }, 노말: {},
};
const MV = {
  몸통박치기: { t: '노말', p: 40, a: 100 }, 할퀴기: { t: '노말', p: 45, a: 100 }, 전광석화: { t: '노말', p: 40, a: 100, pri: 1 }, 필살앞니: { t: '노말', p: 80, a: 90 },
  울음소리: { t: '노말', p: 0, a: 100, fx: 'atkdown' }, 회복: { t: '노말', p: 0, a: 100, fx: 'heal' },
  불꽃세례: { t: '불', p: 40, a: 100 }, 화염방사: { t: '불', p: 90, a: 95 }, 물대포: { t: '물', p: 40, a: 100 }, 하이드로펌프: { t: '물', p: 110, a: 80 },
  덩굴채찍: { t: '풀', p: 45, a: 100 }, 잎날가르기: { t: '풀', p: 70, a: 95, crit: 1 }, 전기쇼크: { t: '전기', p: 40, a: 100 }, '10만볼트': { t: '전기', p: 90, a: 100 },
  진흙뿌리기: { t: '땅', p: 40, a: 100 }, 지진: { t: '땅', p: 100, a: 100 }, 쪼기: { t: '비행', p: 35, a: 100 }, 날개치기: { t: '비행', p: 60, a: 100 },
  얼음뭉치: { t: '얼음', p: 40, a: 100, pri: 1 }, 냉동빔: { t: '얼음', p: 90, a: 100 },
};
// [이름, 이모지, 타입, hp, atk, def, spd, 포획률, 기술[[lv,기술]], [진화lv, 키]]
const SP = {
  fire1: ['불도마', '🦎', '불', 45, 60, 45, 65, 0.3, [[1, '할퀴기'], [1, '울음소리'], [7, '불꽃세례'], [13, '전광석화'], [20, '화염방사'], [28, '지진']], [16, 'fire2']],
  fire2: ['화룡', '🐉', '불', 78, 90, 75, 90, 0.2, [[20, '화염방사'], [28, '지진'], [34, '날개치기']]],
  water1: ['꼬북', '🐢', '물', 50, 50, 65, 45, 0.3, [[1, '몸통박치기'], [1, '울음소리'], [7, '물대포'], [13, '회복'], [20, '하이드로펌프'], [26, '냉동빔']], [16, 'water2']],
  water2: ['아쿠아', '🐳', '물', 85, 80, 90, 70, 0.2, [[20, '하이드로펌프'], [26, '냉동빔'], [32, '지진']]],
  grass1: ['새싹이', '🌱', '풀', 50, 55, 55, 50, 0.3, [[1, '몸통박치기'], [1, '울음소리'], [7, '덩굴채찍'], [13, '회복'], [20, '잎날가르기'], [26, '지진']], [16, 'grass2']],
  grass2: ['숲거인', '🌳', '풀', 85, 85, 85, 60, 0.2, [[20, '잎날가르기'], [26, '지진'], [32, '필살앞니']]],
  rat: ['쥐돌이', '🐀', '노말', 30, 56, 35, 72, 0.8, [[1, '몸통박치기'], [3, '전광석화'], [9, '할퀴기'], [15, '필살앞니']], [14, 'cat']],
  cat: ['도둑냥', '🐈', '노말', 60, 80, 60, 100, 0.4, [[15, '필살앞니'], [22, '날개치기']]],
  bird: ['꼬꼬새', '🐦', '비행', 40, 45, 40, 56, 0.8, [[1, '쪼기'], [1, '울음소리'], [12, '날개치기'], [18, '전광석화']], [16, 'eagle']],
  eagle: ['독수리', '🦅', '비행', 75, 80, 70, 90, 0.35, [[18, '전광석화'], [24, '필살앞니']]],
  bug: ['애벌레', '🐛', '풀', 45, 30, 35, 45, 0.9, [[1, '몸통박치기'], [5, '덩굴채찍']], [7, 'fly']],
  fly: ['나비', '🦋', '비행', 60, 55, 50, 70, 0.5, [[7, '날개치기'], [12, '회복'], [18, '잎날가르기']]],
  mouse: ['찌릿쥐', '🐭', '전기', 35, 55, 40, 90, 0.45, [[1, '전기쇼크'], [1, '전광석화'], [15, '10만볼트']], [18, 'leo']],
  leo: ['번개표범', '🐆', '전기', 65, 85, 60, 110, 0.25, [[18, '10만볼트'], [24, '필살앞니']]],
  fish: ['붕어', '🐟', '물', 40, 45, 45, 60, 0.7, [[1, '물대포'], [1, '몸통박치기'], [16, '하이드로펌프']], [18, 'shark']],
  shark: ['상어', '🦈', '물', 75, 95, 65, 80, 0.3, [[18, '하이드로펌프'], [24, '필살앞니']]],
  hog: ['모래두지', '🦔', '땅', 50, 70, 80, 40, 0.6, [[1, '할퀴기'], [1, '진흙뿌리기'], [18, '지진']], [20, 'rhino']],
  rhino: ['땅코뿔', '🦏', '땅', 80, 100, 100, 45, 0.25, [[20, '지진'], [26, '필살앞니']]],
  dog: ['불독', '🐕', '불', 55, 70, 45, 60, 0.6, [[1, '몸통박치기'], [1, '불꽃세례'], [17, '화염방사']], [20, 'lion']],
  lion: ['화염사자', '🦁', '불', 85, 105, 70, 90, 0.25, [[20, '화염방사'], [26, '필살앞니']]],
  peng: ['펭귄', '🐧', '얼음', 55, 50, 55, 50, 0.55, [[1, '얼음뭉치'], [1, '몸통박치기'], [18, '냉동빔']], [22, 'seal']],
  seal: ['바다사자', '🦭', '얼음', 90, 75, 80, 65, 0.25, [[22, '냉동빔'], [26, '하이드로펌프']]],
  shroom: ['버섯돌이', '🍄', '풀', 60, 60, 70, 30, 0.6, [[1, '덩굴채찍'], [1, '회복'], [16, '잎날가르기']]],
};
const ZONES = {
  r1: { lv: [2, 6], p: [['rat', 35], ['bird', 30], ['bug', 28], ['mouse', 7]] },
  r2: { lv: [8, 14], p: [['fish', 22], ['hog', 22], ['bird', 18], ['dog', 20], ['mouse', 10], ['rat', 8]] },
  r3: { lv: [14, 21], p: [['peng', 25], ['hog', 15], ['shroom', 20], ['dog', 15], ['fish', 15], ['mouse', 10]] },
};
const GYMS = [
  { n: '숲지기 초록', need: 0, team: [['bug', 8], ['shroom', 10]], money: 1200, say: '풀의 힘을 보여주마!' },
  { n: '파도의 마린', need: 1, team: [['fish', 13], ['mouse', 14], ['water2', 16]], money: 2400, say: '파도처럼 밀어붙이겠어!' },
  { n: '화산의 불꽃', need: 2, team: [['rhino', 21], ['dog', 20], ['lion', 22], ['fire2', 24]], money: 5000, say: '마지막 관장이다. 타올라라!' },
];
GAME({
  title: '몬스터 배틀 RPG', w: 960, h: 600, bg: '#1e293b', controls: 'dpad+ab', aLabel: '확인', bLabel: '취소', noRKey: true,
  help: '방향키/WASD 이동 · Space/Enter 확인 · X/Shift 취소·메뉴\n🌿 풀숲을 걸으면 야생 몬스터 등장 → 싸워서 키우거나 몬스터볼로 포획\n속성 상성: 불>풀>물>불 · 전기>물/비행 · 땅>불/전기 · 얼음>풀/땅/비행\n🏥 센터에서 회복·쇼핑 · 🏟️ 체육관 관장 3명을 모두 꺾으면 승리! (마우스 클릭도 가능)',
  init(g) {
    S = { mode: 'starter', cur: 0, px: 9, py: 35, dir: 'd', mv: null, party: [], money: 1500, bag: { potion: 3, super: 0, ball: 5 }, badges: 0, lives: 3,
      q: [], qT: 0, bt: null, npcs: [], last: { x: 7, y: 31 }, seen: {}, caught: {}, steps: 0, menuT: 0, t: 0 };
    buildMap();
  },
  update(g, dt) {
    S.t += dt; S.qT += dt;
    if (S.q.length) { runQueue(g); return; }
    if (S.mode === 'starter') return starterUpd(g);
    if (S.mode === 'battle') return battleUpd(g, dt);
    if (S.mode === 'shop') return shopUpd(g);
    if (S.mode === 'party') return partyUpd(g);
    worldUpd(g, dt);
  },
  draw(g, c) {
    if (S.mode === 'battle') drawBattle(g, c); else drawWorld(g, c);
    if (S.mode === 'starter') drawStarter(g);
    if (S.mode === 'shop') drawShop(g);
    if (S.mode === 'party') drawParty(g);
    if (S.q.length && S.q[0].t === 'msg' && S.mode !== 'battle') { g.rrect(30, g.H - 110, g.W - 60, 90, 12, '#fff', '#334155', 4); g.text(S.q[0].s, 60, g.H - 65, 21, '#111', 'left'); if (Math.floor(S.t * 3) % 2) g.text('▼', g.W - 60, g.H - 38, 16, '#334155'); }
  },
});
// ---------- 공통 ----------
function msg(s) { return { t: 'msg', s }; }
function fn(f) { return { t: 'fn', f }; }
function push(...a) { S.q.push(...a); }
function front(a) { S.q.unshift(...a); }
function runQueue(g) {
  let guard = 0;
  while (S.q.length && S.q[0].t === 'fn' && guard++ < 50) { const it = S.q.shift(); it.f(g); S.qT = 0; }
  if (!S.q.length) return;
  if ((g.pressed('a') || g.mouse.clicked || g.pressed('b')) && S.qT > 0.18) { S.q.shift(); S.qT = 0; g.sfx.click(); }
}
function nav(g, n, cols) {
  cols = cols || 1;
  if (g.pressed('down')) S.cur = Math.min(n - 1, S.cur + cols);
  if (g.pressed('up')) S.cur = Math.max(0, S.cur - cols);
  if (cols > 1 && g.pressed('right')) S.cur = Math.min(n - 1, S.cur + 1);
  if (cols > 1 && g.pressed('left')) S.cur = Math.max(0, S.cur - 1);
}
function mkMon(k, lv) {
  const m = { k, lv, exp: Math.floor(Math.pow(lv, 3) * 0.8), moves: [], stg: 0 };
  calc(m); m.hp = m.max; m.dhp = m.hp;
  for (const [l, mv] of SP[k][8]) if (l <= lv && !m.moves.includes(mv)) { m.moves.push(mv); if (m.moves.length > 4) m.moves.shift(); }
  if (!m.moves.length) m.moves.push('몸통박치기');
  return m;
}
function calc(m) {
  const b = SP[m.k], old = m.max || 0;
  m.max = Math.floor(b[3] * 2 * m.lv / 100) + m.lv + 10;
  m.atk = Math.floor(b[4] * 2 * m.lv / 100) + 5; m.def = Math.floor(b[5] * 2 * m.lv / 100) + 5; m.spd = Math.floor(b[6] * 2 * m.lv / 100) + 5;
  if (old && m.hp !== undefined) m.hp += m.max - old;
}
function nm(m) { return SP[m.k][0]; }
function needExp(lv) { return Math.floor(Math.pow(lv, 3) * 0.8); }
// ---------- 맵 ----------
function buildMap() {
  const M = U.grid(MW, MH, 1);
  const fill = (x, y, w, h, t) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (M[j] && M[j][i] !== undefined) M[j][i] = t; };
  fill(3, 27, 17, 11, 0); fill(20, 29, 14, 8, 0); fill(34, 26, 13, 12, 0); fill(36, 12, 10, 13, 0); fill(26, 2, 20, 10, 0); fill(4, 3, 22, 8, 0);
  fill(3, 33, 44, 1, 4); fill(40, 12, 1, 22, 4); fill(26, 7, 20, 1, 4); fill(40, 25, 1, 1, 4);
  fill(21, 30, 5, 3, 2); fill(27, 34, 6, 2, 2); fill(29, 30, 4, 2, 2);
  fill(41, 14, 4, 10, 2); fill(37, 15, 3, 6, 3); fill(36, 22, 3, 2, 2);
  fill(5, 4, 19, 3, 2); fill(5, 8, 8, 2, 2); fill(15, 8, 9, 2, 2); fill(10, 4, 2, 2, 3);
  fill(14, 35, 4, 2, 3);
  for (const [x, y] of [[4, 36], [5, 36], [18, 28], [19, 28], [45, 36], [44, 36], [33, 9], [34, 9], [44, 10]]) M[y][x] = 8;
  S.map = M;
  S.blds = [];
  const bld = (x, y, w, h, k, gi) => { S.blds.push({ x, y, w, h, k, gi }); fill(x, y, w, h, 5); M[y + h - 1][x + Math.floor(w / 2)] = k === 'c' ? 6 : 7; };
  bld(5, 28, 4, 3, 'c'); bld(12, 28, 5, 3, 'g', 0); bld(35, 27, 4, 3, 'c'); bld(41, 27, 5, 3, 'g', 1); bld(28, 3, 4, 3, 'c'); bld(38, 3, 6, 3, 'g', 2);
  S.npcs = [
    { x: 30, y: 33, dir: 'l', n: '반바지 철수', e: '🧒', team: [['rat', 4], ['bird', 5]], money: 300, say: '눈이 마주쳤으니 승부다!' },
    { x: 38, y: 22, dir: 'r', n: '낚시꾼 영호', e: '🎣', team: [['fish', 10], ['fish', 11]], money: 600, say: '오늘은 대어를 낚았지!' },
    { x: 44, y: 18, dir: 'l', n: '캠퍼 지수', e: '🏕️', team: [['hog', 12], ['dog', 12], ['bird', 13]], money: 700, say: '캠핑의 힘을 보여줄게!' },
    { x: 15, y: 10, dir: 'u', n: '스키어 한별', e: '⛷️', team: [['peng', 17], ['peng', 18], ['shroom', 18]], money: 1000, say: '차갑게 얼려주지!' },
    { x: 20, y: 7, dir: 'r', n: '엘리트 도윤', e: '🥷', team: [['leo', 20], ['eagle', 20], ['shark', 21]], money: 1500, say: '여기까지 오다니 제법이군.' },
    { x: 40, y: 25, dir: 'd', n: '경비원', e: '👮', guard: 1, say: '배지가 1개 이상 있어야 지나갈 수 있다!' },
  ];
}
function tileAt(x, y) { return S.map[y] && S.map[y][x] !== undefined ? S.map[y][x] : 1; }
function npcAt(x, y) { return S.npcs.find((n) => n.x === x && n.y === y && !n.gone); }
function zoneAt(x, y) { if (x >= 20 && x <= 33 && y >= 29) return 'r1'; if (x >= 36 && y >= 12 && y <= 24) return 'r2'; if (x <= 25 && y <= 10) return 'r3'; return null; }
// ---------- 시작 ----------
function starterUpd(g) {
  if (g.pressed('left')) S.cur = (S.cur + 2) % 3; if (g.pressed('right')) S.cur = (S.cur + 1) % 3;
  for (let i = 0; i < 3; i++) if (g.clickIn(150 + i * 230, 200, 200, 230)) { S.cur = i; pickStarter(g); return; }
  if (g.pressed('a')) pickStarter(g);
}
function pickStarter(g) {
  const k = ['fire1', 'water1', 'grass1'][S.cur];
  S.party.push(mkMon(k, 5)); S.caught[k] = 1; S.mode = 'world'; g.sfx.win();
  push(msg(`${SP[k][0]}${SP[k][1]}을(를) 파트너로 선택했다!`), msg('🏟️ 체육관 관장 3명을 꺾고 챔피언이 되자!'), msg('오른쪽 풀숲(🌿)에서 몬스터를 잡아 팀을 키우자. X키 = 파티 메뉴'));
}
function drawStarter(g) {
  g.rect(0, 0, g.W, g.H, 'rgba(15,23,42,.92)');
  g.text('파트너 몬스터를 고르세요', g.W / 2, 120, 34, '#fff');
  ['fire1', 'water1', 'grass1'].forEach((k, i) => {
    const x = 150 + i * 230, sel = S.cur === i;
    g.rrect(x, 200, 200, 230, 16, sel ? '#334155' : '#1e293b', sel ? TYC[SP[k][2]] : '#475569', sel ? 5 : 2);
    g.emoji(SP[k][1], x + 100, 290 + (sel ? Math.sin(S.t * 6) * 5 : 0), 100);
    g.text(SP[k][0], x + 100, 375, 24, '#fff'); g.text(SP[k][2] + ' 타입', x + 100, 405, 17, TYC[SP[k][2]]);
  });
  g.text('←→ 선택 · Space 결정 (또는 클릭)', g.W / 2, 480, 18, '#94a3b8');
}
// ---------- 월드 ----------
function worldUpd(g, dt) {
  if (S.mv) {
    S.mv.t += dt / 0.15;
    if (S.mv.t >= 1) { S.px = S.mv.x; S.py = S.mv.y; S.mv = null; stepDone(g); }
    return;
  }
  if (g.pressed('b')) { S.mode = 'party'; S.cur = 0; g.sfx.click(); return; }
  let dx = 0, dy = 0;
  if (g.held('left')) dx = -1; else if (g.held('right')) dx = 1; else if (g.held('up')) dy = -1; else if (g.held('down')) dy = 1;
  if (!dx && !dy && g.mouse.down) { const mx = g.mouse.x - g.W / 2, my = g.mouse.y - g.H / 2; if (Math.hypot(mx, my) > 20) { if (Math.abs(mx) > Math.abs(my)) dx = Math.sign(mx); else dy = Math.sign(my); } }
  if (!dx && !dy) return;
  S.dir = dx < 0 ? 'l' : dx > 0 ? 'r' : dy < 0 ? 'u' : 'd';
  const nx = S.px + dx, ny = S.py + dy, t = tileAt(nx, ny), n = npcAt(nx, ny);
  if (n) { talk(g, n); return; }
  if (t === 6) { centerVisit(g, nx, ny); return; }
  if (t === 7) { const b = S.blds.find((b) => b.k === 'g' && nx >= b.x && nx < b.x + b.w && ny >= b.y && ny < b.y + b.h); gymVisit(g, b.gi); return; }
  if (t === 1 || t === 3 || t === 5) { if (S.bump !== nx + ',' + ny) { g.sfx.tone(120, 0.05, 'square', 0.03); S.bump = nx + ',' + ny; } return; }
  S.bump = null;
  S.mv = { x: nx, y: ny, t: 0 };
}
function stepDone(g) {
  S.steps++;
  // 트레이너 시야
  for (const n of S.npcs) {
    if (n.gone || n.beaten || n.guard) continue;
    const v = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] }[n.dir];
    for (let i = 1; i <= 4; i++) {
      const x = n.x + v[0] * i, y = n.y + v[1] * i;
      if (tileAt(x, y) === 1 || tileAt(x, y) === 5) break;
      if (x === S.px && y === S.py) { trainerBattle(g, n); return; }
    }
  }
  const z = zoneAt(S.px, S.py);
  if (tileAt(S.px, S.py) === 2 && z && Math.random() < 0.13) {
    const Z = ZONES[z]; let r = Math.random() * 100, k = Z.p[0][0];
    for (const [kk, w] of Z.p) { if (r < w) { k = kk; break; } r -= w; }
    const lv = U.randi(Z.lv[0], Z.lv[1]);
    const m = mkMon(k, lv);
    S.seen[k] = 1;
    startBattle(g, 'wild', [m], null);
  }
}
function talk(g, n) {
  if (n.guard) {
    if (S.badges >= 1) { push(msg('👮 배지를 확인했다. 지나가도 좋다!'), fn(() => { n.gone = true; })); }
    else push(msg('👮 ' + n.say));
    return;
  }
  if (n.beaten) { push(msg(`${n.e} ${n.n}: 너 정말 강하구나!`)); return; }
  trainerBattle(g, n);
}
function trainerBattle(g, n) {
  g.sfx.tone(660, 0.12, 'square', 0.05); g.sfx.tone(880, 0.12, 'square', 0.05, null, 0.12);
  push(msg(`${n.e} ${n.n}: ${n.say}`), fn((g) => startBattle(g, 'trainer', n.team.map(([k, l]) => mkMon(k, l)), n)));
}
function centerVisit(g, x, y) {
  S.last = { x, y: y + 1 };
  for (const m of S.party) { m.hp = m.max; m.dhp = m.max; }
  g.sfx.tone(523, 0.12, 'sine', 0.05); g.sfx.tone(659, 0.12, 'sine', 0.05, null, 0.13); g.sfx.tone(784, 0.25, 'sine', 0.05, null, 0.26);
  push(msg('🏥 몬스터들이 모두 건강해졌다!'), fn(() => { S.mode = 'shop'; S.cur = 0; }));
}
function gymVisit(g, gi) {
  const G = GYMS[gi];
  if (S.badges > gi) { push(msg(`🏟️ ${G.n}: 넌 이미 내 배지를 가져갔잖아!`)); return; }
  if (S.badges < G.need) { push(msg(`🏟️ 문이 잠겨 있다. 배지 ${G.need}개가 필요하다.`)); return; }
  push(msg(`🏟️ ${gi + 1}번째 체육관! 관장 ${G.n}`), msg(`${G.n}: ${G.say}`), fn((g) => startBattle(g, 'trainer', G.team.map(([k, l]) => mkMon(k, l)), { n: '관장 ' + G.n, e: '🏅', money: G.money, gym: gi })));
}
const SHOP = [['potion', '상처약 (+20)', 300, '🧪'], ['super', '좋은상처약 (+60)', 700, '💉'], ['ball', '몬스터볼', 200, '🔴'], [null, '나가기', 0, '🚪']];
function shopUpd(g) {
  nav(g, SHOP.length);
  for (let i = 0; i < SHOP.length; i++) if (g.clickIn(g.W / 2 - 220, 170 + i * 66, 440, 56)) { S.cur = i; buy(g); return; }
  if (g.pressed('a')) buy(g);
  if (g.pressed('b')) S.mode = 'world';
}
function buy(g) {
  const it = SHOP[S.cur];
  if (!it[0]) { S.mode = 'world'; return; }
  if (S.money < it[2]) { g.sfx.tone(150, 0.15, 'square', 0.04); return; }
  S.money -= it[2]; S.bag[it[0]]++; g.sfx.coin();
}
function drawShop(g) {
  g.rect(0, 0, g.W, g.H, 'rgba(15,23,42,.85)');
  g.text('🏥 몬스터 센터 상점', g.W / 2, 100, 30, '#fff');
  g.text(`💰 ${S.money}원`, g.W / 2, 140, 20, '#fde047');
  SHOP.forEach((it, i) => {
    const y = 170 + i * 66, sel = S.cur === i;
    g.rrect(g.W / 2 - 220, y, 440, 56, 10, sel ? '#334155' : '#1e293b', sel ? '#fde047' : '#475569', 3);
    g.emoji(it[3], g.W / 2 - 185, y + 28, 30);
    g.text(it[1], g.W / 2 - 150, y + 28, 20, '#fff', 'left');
    if (it[0]) g.text(`${it[2]}원  (보유 ${S.bag[it[0]]})`, g.W / 2 + 200, y + 28, 16, '#cbd5e1', 'right');
  });
  g.text('↑↓ 선택 · Space 구입 · X 나가기', g.W / 2, 460, 16, '#94a3b8');
}
function partyUpd(g) {
  nav(g, S.party.length);
  for (let i = 0; i < S.party.length; i++) if (g.clickIn(g.W / 2 - 300, 110 + i * 70, 600, 62)) { S.cur = i; leadSwap(g); return; }
  if (g.pressed('a')) leadSwap(g);
  if (g.pressed('b')) S.mode = 'world';
}
function leadSwap(g) { if (S.cur > 0) { const m = S.party.splice(S.cur, 1)[0]; S.party.unshift(m); S.cur = 0; g.sfx.click(); } }
function drawParty(g) {
  g.rect(0, 0, g.W, g.H, 'rgba(15,23,42,.9)');
  g.text(`파티  ·  🏅 배지 ${S.badges}/3  ·  💰 ${S.money}원  ·  🧪${S.bag.potion} 💉${S.bag.super} 🔴${S.bag.ball}  ·  도감 ${Object.keys(S.caught).length}`, g.W / 2, 70, 18, '#fff');
  S.party.forEach((m, i) => drawMonRow(g, m, g.W / 2 - 300, 110 + i * 70, S.cur === i, i === 0));
  g.text('Space/클릭 = 선두로 보내기 · X 닫기', g.W / 2, g.H - 40, 16, '#94a3b8');
}
function drawMonRow(g, m, x, y, sel, lead) {
  g.rrect(x, y, 600, 62, 10, sel ? '#334155' : '#1e293b', sel ? '#fde047' : m.hp <= 0 ? '#7f1d1d' : '#475569', 3);
  g.emoji(SP[m.k][1], x + 36, y + 31, 40);
  g.text(`${nm(m)}  Lv${m.lv}${lead ? '  ⭐' : ''}`, x + 70, y + 20, 18, '#fff', 'left');
  g.text(SP[m.k][2], x + 70, y + 44, 14, TYC[SP[m.k][2]], 'left');
  hpBar(g, x + 300, y + 16, 200, m.hp / m.max);
  g.text(`${Math.max(0, Math.ceil(m.hp))}/${m.max}`, x + 520, y + 20, 14, '#fff', 'left');
  g.text(m.moves.join(' · '), x + 300, y + 46, 12, '#94a3b8', 'left');
}
function hpBar(g, x, y, w, f) {
  f = U.clamp(f, 0, 1);
  g.rrect(x, y, w, 10, 5, '#334155');
  g.rrect(x, y, w * f, 10, 5, f > 0.5 ? '#22c55e' : f > 0.2 ? '#eab308' : '#ef4444');
}
function drawWorld(g, c) {
  let px = S.px, py = S.py;
  if (S.mv) { px = U.lerp(S.px, S.mv.x, S.mv.t); py = U.lerp(S.py, S.mv.y, S.mv.t); }
  const cx = px * T32 + 16 - g.W / 2, cy = py * T32 + 16 - g.H / 2;
  c.save(); c.translate(-Math.round(cx), -Math.round(cy));
  const x0 = Math.max(0, Math.floor(cx / T32)), y0 = Math.max(0, Math.floor(cy / T32)), x1 = Math.min(MW - 1, x0 + 31), y1 = Math.min(MH - 1, y0 + 20);
  g.rect(cx, cy, g.W, g.H, '#14532d');
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const t = S.map[y][x], X = x * T32, Y = y * T32;
    g.rect(X, Y, T32, T32, t === 4 ? '#e7d29a' : '#86c96a');
    if (t === 0 && (x * 7 + y * 13) % 9 === 0) g.rect(X + 10, Y + 12, 3, 5, '#6aa84f');
    if (t === 1) { g.circle(X + 16, Y + 15, 16, '#1f5f2a'); g.circle(X + 12, Y + 11, 8, '#2f7d3a'); }
    else if (t === 2) { g.rect(X, Y, T32, T32, '#4f9a3a'); for (let k = 0; k < 3; k++) { const sw = Math.sin(S.t * 3 + x + k) * 2; g.line(X + 6 + k * 10, Y + 28, X + 8 + k * 10 + sw, Y + 10, '#2e6b22', 3); } }
    else if (t === 3) { g.rect(X, Y, T32, T32, '#3b82f6'); g.line(X + 6, Y + 12 + Math.sin(S.t * 2 + x) * 2, X + 18, Y + 12 + Math.sin(S.t * 2 + x) * 2, '#93c5fd', 2); }
    else if (t === 8) g.emoji('🌼', X + 16, Y + 16, 18);
  }
  for (const b of S.blds) {
    const X = b.x * T32, Y = b.y * T32, w = b.w * T32, h = b.h * T32;
    const roof = b.k === 'c' ? '#dc2626' : ['#16a34a', '#2563eb', '#ea580c'][b.gi];
    g.rect(X, Y + h * 0.4, w, h * 0.6, '#f5f5f4'); g.stroke(X, Y + h * 0.4, w, h * 0.6, '#57534e', 2);
    g.poly([[X - 6, Y + h * 0.45], [X + w / 2, Y - 8], [X + w + 6, Y + h * 0.45]], roof, '#44403c', 2);
    const dx = (b.x + Math.floor(b.w / 2)) * T32;
    g.rect(dx + 4, Y + h - 28, 24, 28, '#78350f');
    g.emoji(b.k === 'c' ? '🏥' : '🏟️', X + w / 2, Y + h * 0.28, 26);
    if (b.k === 'g') g.text(`${b.gi + 1}`, X + 14, Y + h * 0.62, 16, roof);
  }
  for (const n of S.npcs) if (!n.gone) { g.emoji(n.e, n.x * T32 + 16, n.y * T32 + 14, 28); if (!n.beaten && !n.guard) g.text('!', n.x * T32 + 16, n.y * T32 - 8, 12, '#ef4444'); }
  const bob = S.mv ? Math.abs(Math.sin(S.mv.t * Math.PI)) * -3 : 0;
  c.save(); c.translate(px * T32 + 16, py * T32 + 14 + bob); if (S.dir === 'r') c.scale(-1, 1);
  g.circle(0, 14, 9, 'rgba(0,0,0,.2)'); g.emoji(S.dir === 'u' ? '🎒' : '🧑', 0, 0, 30); c.restore();
  if (S.party[0] && S.mode === 'world') { const m = S.party[0]; g.emoji(SP[m.k][1], px * T32 + 16 + (S.dir === 'l' ? 26 : S.dir === 'r' ? -26 : 0), py * T32 + 18 + (S.dir === 'u' ? 26 : S.dir === 'd' ? -26 : 0), 20); }
  c.restore();
  // HUD
  g.rrect(10, 10, 360, 44, 10, 'rgba(15,23,42,.75)');
  g.text(`🏅 ${S.badges}/3   💰 ${S.money}   ❤️ x${S.lives}   🔴 ${S.bag.ball}`, 24, 32, 17, '#fff', 'left');
  S.party.forEach((m, i) => { g.rrect(g.W - 60 - i * 50, 10, 44, 44, 8, 'rgba(15,23,42,.75)'); g.emoji(SP[m.k][1], g.W - 38 - i * 50, 28, 26); hpBar(g, g.W - 56 - i * 50, 44, 36, m.hp / m.max); });
  const z = zoneAt(S.px, S.py);
  g.text(z ? { r1: '1번 도로', r2: '2번 도로', r3: '설원 길' }[z] : S.py > 25 && S.px < 20 ? '새싹 마을' : S.py > 25 ? '파도 마을' : '화산 도시', 24, 72, 15, '#fff', 'left');
}
// ---------- 배틀 ----------
function startBattle(g, kind, foes, tr) {
  const mi = S.party.findIndex((m) => m.hp > 0);
  if (mi < 0) return;
  if (mi > 0) { const m = S.party.splice(mi, 1)[0]; S.party.unshift(m); }
  S.party.forEach((m) => { m.stg = 0; m.dhp = m.hp; });
  foes.forEach((m) => { m.stg = 0; });
  S.bt = { kind, foes, fi: 0, mi: 0, menu: null, tr, end: false, runs: 0, anim: { side: null, t: 0 }, part: new Set([S.party[0]]), intro: 1 };
  S.mode = 'battle'; S.cur = 0;
  g.sfx.tone(300, 0.1, 'square', 0.05, 600);
  if (kind === 'wild') push(msg(`앗! 야생의 ${nm(foes[0])}(이)가 튀어나왔다!`));
  else push(msg(`${tr.e} ${tr.n}이(가) 승부를 걸어왔다!`), msg(`${tr.n}은(는) ${nm(foes[0])}을(를) 내보냈다!`));
  push(msg(`가랏! ${nm(S.party[0])}!`), fn(() => { S.bt.intro = 0; S.bt.menu = 'main'; S.cur = 0; }));
}
function me() { return S.party[S.bt.mi]; }
function foe() { return S.bt.foes[S.bt.fi]; }
const MAINM = ['싸운다', '가방', '몬스터', '도망'];
function battleUpd(g, dt) {
  const B = S.bt;
  for (const m of [...S.party, ...B.foes]) { if (m.dhp === undefined) m.dhp = m.hp; m.dhp += (m.hp - m.dhp) * Math.min(1, dt * 6); if (Math.abs(m.dhp - m.hp) < 0.3) m.dhp = m.hp; }
  if (B.anim.t > 0) B.anim.t -= dt;
  if (!B.menu || B.end) return;
  if (B.menu === 'main') {
    nav(g, 4, 2);
    for (let i = 0; i < 4; i++) { const [x, y, w, h] = mainRect(i); if (g.clickIn(x, y, w, h)) { S.cur = i; mainPick(g); return; } }
    if (g.pressed('a')) mainPick(g);
  } else if (B.menu === 'fight') {
    const n = me().moves.length;
    nav(g, n, 2);
    for (let i = 0; i < n; i++) { const [x, y, w, h] = moveRect(i); if (g.clickIn(x, y, w, h)) { S.cur = i; turn(g, { k: 'move', mv: me().moves[i] }); return; } }
    if (g.clickIn(870, 470, 80, 40) || g.pressed('b')) { B.menu = 'main'; S.cur = 0; return; }
    if (g.pressed('a')) turn(g, { k: 'move', mv: me().moves[S.cur] });
  } else if (B.menu === 'bag') {
    const items = bagList();
    nav(g, items.length);
    for (let i = 0; i < items.length; i++) if (g.clickIn(620, 462 + i * 34, 320, 30)) { S.cur = i; useBag(g, items[i]); return; }
    if (g.pressed('a')) useBag(g, items[S.cur]);
    if (g.pressed('b')) { B.menu = 'main'; S.cur = 1; }
  } else if (B.menu === 'switch') {
    nav(g, S.party.length);
    for (let i = 0; i < S.party.length; i++) if (g.clickIn(g.W / 2 - 300, 60 + i * 66, 600, 60)) { S.cur = i; doSwitch(g, i); return; }
    if (g.pressed('a')) doSwitch(g, S.cur);
    if (g.pressed('b') && !B.forced) { B.menu = 'main'; S.cur = 2; }
  }
}
function mainRect(i) { return [620 + (i % 2) * 165, 465 + Math.floor(i / 2) * 62, 155, 54]; }
function moveRect(i) { return [20 + (i % 2) * 420, 465 + Math.floor(i / 2) * 62, 410, 54]; }
function bagList() { return [['potion', '🧪 상처약', S.bag.potion], ['super', '💉 좋은상처약', S.bag.super], ['ball', '🔴 몬스터볼', S.bag.ball]]; }
function mainPick(g) {
  const B = S.bt; g.sfx.click();
  if (S.cur === 0) { B.menu = 'fight'; S.cur = 0; }
  else if (S.cur === 1) { B.menu = 'bag'; S.cur = 0; }
  else if (S.cur === 2) { B.menu = 'switch'; S.cur = 0; B.forced = false; }
  else turn(g, { k: 'run' });
}
function useBag(g, it) {
  const B = S.bt;
  if (!it || it[2] <= 0) { g.sfx.tone(150, 0.1, 'square', 0.04); return; }
  if (it[0] === 'ball' && B.kind !== 'wild') { B.menu = null; push(msg('남의 몬스터는 잡을 수 없다!'), fn(() => { B.menu = 'main'; S.cur = 0; })); return; }
  if (it[0] !== 'ball' && me().hp >= me().max) { B.menu = null; push(msg('체력이 이미 가득하다!'), fn(() => { B.menu = 'main'; S.cur = 0; })); return; }
  turn(g, { k: 'item', it: it[0] });
}
function doSwitch(g, i) {
  const B = S.bt, m = S.party[i];
  if (!m || m.hp <= 0 || i === B.mi) { g.sfx.tone(150, 0.1, 'square', 0.04); return; }
  if (B.forced) {
    B.forced = false; B.menu = null; B.mi = i; m.stg = 0; B.part.add(m);
    push(msg(`가랏! ${nm(m)}!`), fn(() => { B.menu = 'main'; S.cur = 0; }));
    return;
  }
  turn(g, { k: 'switch', i });
}
function stageMul(s) { return s >= 0 ? (2 + s) / 2 : 2 / (2 - s); }
function eff(mt, dt) { const r = CHART[mt] && CHART[mt][dt]; return r === undefined ? 1 : r; }
function foeChoice(f, m) {
  if (Math.random() < 0.25) return U.choice(f.moves);
  let best = f.moves[0], bv = -1;
  for (const mv of f.moves) {
    const M = MV[mv]; let v = M.p * eff(M.t, SP[m.k][2]) * (M.t === SP[f.k][2] ? 1.5 : 1) * M.a / 100;
    if (M.fx === 'heal') v = f.hp < f.max * 0.4 ? 90 : 0;
    if (M.fx === 'atkdown') v = m.stg > -2 ? 25 : 0;
    if (v > bv) { bv = v; best = mv; }
  }
  return best;
}
function turn(g, act) {
  const B = S.bt; B.menu = null;
  const m = me(), f = foe(), fmv = foeChoice(f, m);
  const steps = [];
  if (act.k === 'run') {
    if (B.kind !== 'wild') { push(msg('트레이너와의 승부에서 도망칠 수 없다!'), fn(() => { B.menu = 'main'; })); return; }
    B.runs++;
    if (m.spd >= f.spd || Math.random() < 0.4 + B.runs * 0.15) { push(msg('무사히 도망쳤다!'), fn(endBattle)); g.sfx.tone(500, 0.2, 'triangle', 0.04, 900); return; }
    steps.push(fn(() => front([msg('도망칠 수 없었다!')])));
    steps.push(fn((g) => attack(g, f, m, fmv, 'foe')));
  } else if (act.k === 'item') {
    if (act.it === 'ball') { S.bag.ball--; steps.push(fn((g) => throwBall(g, f))); }
    else { S.bag[act.it]--; const amt = act.it === 'potion' ? 20 : 60; steps.push(fn((g) => { m.hp = Math.min(m.max, m.hp + amt); g.sfx.power(); front([msg(`${nm(m)}의 체력이 회복되었다!`)]); })); }
    steps.push(fn((g) => { if (!B.end && !B.caught) attack(g, f, me(), fmv, 'foe'); }));
  } else if (act.k === 'switch') {
    const nmn = S.party[act.i];
    steps.push(fn(() => { B.mi = act.i; nmn.stg = 0; B.part.add(nmn); front([msg(`돌아와, ${nm(m)}! 가랏, ${nm(nmn)}!`)]); }));
    steps.push(fn((g) => attack(g, f, nmn, fmv, 'foe')));
  } else {
    const pm = MV[act.mv].pri || 0, pf = MV[fmv].pri || 0;
    const meFirst = pm !== pf ? pm > pf : m.spd !== f.spd ? m.spd > f.spd : Math.random() < 0.5;
    const a1 = fn((g) => attack(g, m, f, act.mv, 'me')), a2 = fn((g) => attack(g, f, m, fmv, 'foe'));
    if (meFirst) steps.push(a1, a2); else steps.push(a2, a1);
  }
  steps.push(fn(() => { if (!B.end && !B.forced && !B.waitNext) { B.menu = 'main'; S.cur = 0; } }));
  push(...steps);
}
function attack(g, a, d, mv, side) {
  const B = S.bt;
  if (B.end || a.hp <= 0 || d.hp <= 0) return;
  const M = MV[mv], out = [msg(`${side === 'foe' ? (B.kind === 'wild' ? '야생 ' : '상대 ') : ''}${nm(a)}의 ${mv}!`)];
  if (Math.random() * 100 >= M.a) { out.push(msg('그러나 공격이 빗나갔다!')); front(out); return; }
  if (M.fx === 'heal') { out.push(fn((g) => { a.hp = Math.min(a.max, a.hp + Math.ceil(a.max / 2)); g.sfx.power(); }), msg(`${nm(a)}의 체력이 회복되었다!`)); front(out); return; }
  if (M.fx === 'atkdown') { out.push(fn((g) => { d.stg = Math.max(-4, d.stg - 1); g.sfx.tone(300, 0.2, 'sine', 0.04, 150); }), msg(`${nm(d)}의 공격이 떨어졌다!`)); front(out); return; }
  const e = eff(M.t, SP[d.k][2]), stab = M.t === SP[a.k][2] ? 1.5 : 1, crit = Math.random() < (M.crit ? 0.15 : 0.0625) ? 1.5 : 1;
  const A = a.atk * stageMul(a.stg), D = d.def;
  let dmg = Math.floor(((2 * a.lv / 5 + 2) * M.p * A / D / 50 + 2) * stab * e * crit * U.rand(0.85, 1));
  if (e > 0) dmg = Math.max(1, dmg);
  out.push(fn((g) => {
    d.hp = Math.max(0, d.hp - dmg);
    B.anim = { side: side === 'me' ? 'foe' : 'me', t: 0.45, atk: side };
    if (e > 1) g.sfx.explode(); else g.sfx.hit();
    g.shake(e > 1 ? 8 : 4, 0.2);
    const [x, y] = side === 'me' ? [700, 170] : [250, 340];
    g.burst(x, y, TYC[M.t], 18, 200, 0.5, 5);
  }));
  if (crit > 1 && e > 0) out.push(msg('급소에 맞았다!'));
  if (e > 1) out.push(msg('효과가 굉장했다!')); else if (e === 0) out.push(msg(`${nm(d)}에게는 효과가 없는 것 같다...`)); else if (e < 1) out.push(msg('효과가 별로인 듯하다...'));
  out.push(fn((g) => { if (d.hp <= 0) faint(g, d, side === 'me' ? 'foe' : 'me'); }));
  front(out);
}
function faint(g, d, side) {
  const B = S.bt, out = [];
  g.sfx.tone(400, 0.5, 'sawtooth', 0.04, 80);
  if (side === 'foe') {
    out.push(msg(`${B.kind === 'wild' ? '야생 ' : '상대 '}${nm(d)}은(는) 쓰러졌다!`));
    const base = (SP[d.k][3] + SP[d.k][4] + SP[d.k][5] + SP[d.k][6]) / 4;
    const xp = Math.floor(base * d.lv / 5 * (B.kind === 'trainer' ? 1.5 : 1));
    const alive = [...B.part].filter((m) => m.hp > 0 && S.party.includes(m));
    for (const m of alive) { const share = Math.floor(xp / alive.length); out.push(msg(`${nm(m)}은(는) ${share} 경험치를 얻었다!`)); out.push(fn((g) => gainExp(g, m, share))); }
    for (const m of S.party) if (!alive.includes(m) && m.hp > 0) m.exp += Math.floor(xp * 0.25);
    g.add(d.lv * 10);
    if (B.kind === 'trainer' && B.fi < B.foes.length - 1) {
      B.waitNext = true;
      out.push(fn(() => { B.fi++; B.part = new Set([me()]); B.waitNext = false; front([msg(`${B.tr.n}은(는) ${nm(foe())}을(를) 내보냈다!`), fn(() => { B.menu = 'main'; S.cur = 0; })]); }));
    } else out.push(fn((g) => winBattle(g)));
    B.endPending = B.kind !== 'trainer' || B.fi >= B.foes.length - 1;
  } else {
    out.push(msg(`${nm(d)}은(는) 쓰러졌다!`));
    if (S.party.some((m) => m.hp > 0)) out.push(fn(() => { B.forced = true; B.menu = 'switch'; S.cur = S.party.findIndex((m) => m.hp > 0); }));
    else { B.end = true; out.push(msg('눈앞이 캄캄해졌다...'), fn((g) => blackout(g))); }
    B.forced = S.party.some((m) => m.hp > 0);
  }
  if (B.endPending && side === 'foe') B.end = true;
  front(out);
}
function gainExp(g, m, n) {
  m.exp += n;
  const out = [];
  while (m.lv < 60 && m.exp >= needExp(m.lv + 1)) {
    m.lv++; calc(m);
    out.push(fn((g) => g.sfx.tone(784, 0.3, 'square', 0.04, 1046)), msg(`${nm(m)}의 레벨이 ${m.lv}(으)로 올랐다!`));
    for (const [l, mv] of SP[m.k][8]) if (l === m.lv && !m.moves.includes(mv)) learn(m, mv, out);
    const ev = SP[m.k][9];
    if (ev && m.lv >= ev[0]) {
      const old = nm(m);
      out.push(msg(`어라...? ${old}의 모습이...!`), fn((g) => { m.k = ev[1]; calc(m); S.caught[m.k] = 1; g.sfx.win(); g.burst(250, 340, ['#fff', '#fde047'], 50, 260, 0.9, 6); }), msg(`축하합니다! ${old}은(는) ${SP[ev[1]][0]}(으)로 진화했다!`));
      for (const [l, mv] of SP[ev[1]][8]) if (l <= m.lv && !m.moves.includes(mv)) learn(m, mv, out);
    }
  }
  front(out);
}
function learn(m, mv, out) {
  if (m.moves.length < 4) { m.moves.push(mv); out.push(msg(`${nm(m)}은(는) ${mv}을(를) 배웠다!`)); return; }
  let wi = 0, wv = 1e9;
  m.moves.forEach((x, i) => { const v = MV[x].p + (MV[x].fx ? 30 : 0) + (MV[x].t === SP[m.k][2] ? 20 : 0); if (v < wv) { wv = v; wi = i; } });
  const old = m.moves[wi];
  if (MV[mv].p + 20 <= wv) return;
  m.moves[wi] = mv; out.push(msg(`${nm(m)}은(는) ${old}을(를) 잊고 ${mv}을(를) 배웠다!`));
}
function throwBall(g, f) {
  const B = S.bt;
  const rate = SP[f.k][7], ch = U.clamp(rate * (1 - 0.7 * f.hp / f.max) + 0.08 + (f.lv < 6 ? 0.1 : 0), 0.03, 0.97);
  const ok = Math.random() < ch, shakes = ok ? 3 : Math.random() < ch * 2 ? 2 : Math.random() < 0.5 ? 1 : 0;
  const out = [fn(() => { B.ball = { t: 0 }; g.sfx.tone(600, 0.2, 'sine', 0.04, 300); }), msg('가랏, 몬스터볼!')];
  for (let i = 0; i < shakes; i++) out.push(fn((g) => g.sfx.tone(300, 0.08, 'square', 0.04)), msg('흔들... 흔들...'));
  if (ok) {
    out.push(fn((g) => { g.sfx.win(); B.caught = true; B.end = true; S.caught[f.k] = 1; g.add(100); }), msg(`신난다! ${nm(f)}을(를) 잡았다!`));
    out.push(fn(() => { f.stg = 0; if (S.party.length < 6) S.party.push(f); else front([msg('파티가 가득 차서 박사님께 보냈다.')]); }));
    out.push(fn(endBattle));
  } else out.push(fn(() => { B.ball = null; }), msg(U.choice(['앗! 몬스터가 볼에서 나와 버렸다!', '아깝다! 조금만 더 하면 잡을 수 있었는데!'])));
  front(out);
}
function winBattle(g) {
  const B = S.bt; B.end = true;
  const out = [];
  if (B.kind === 'trainer') {
    const tr = B.tr;
    out.push(msg(`${tr.n}과(와)의 승부에서 이겼다!`), fn(() => { S.money += tr.money; }), msg(`상금으로 ${tr.money}원을 받았다!`));
    if (tr.gym !== undefined) {
      out.push(fn((g) => { S.badges = Math.max(S.badges, tr.gym + 1); g.sfx.win(); g.add(1000); }), msg(`🏅 ${GYMS[tr.gym].n}에게서 배지를 받았다! (${tr.gym + 1}/3)`));
      if (tr.gym === 2) out.push(msg('모든 관장을 꺾었다! 당신이 새로운 챔피언이다! 🏆'), fn((g) => { endBattle(); g.later(() => g.win(`배지 3개 · 도감 ${Object.keys(S.caught).length}종 · 에이스 ${nm(S.party[0])} Lv${S.party[0].lv}`), 0.3); }));
    } else { tr.beaten = true; g.add(150); }
  }
  out.push(fn(endBattle));
  front(out);
}
function endBattle() { if (S.mode !== 'battle') return; S.mode = 'world'; S.bt = null; S.cur = 0; }
function blackout(g) {
  S.lives--;
  S.money = Math.floor(S.money / 2);
  for (const m of S.party) { m.hp = m.max; m.dhp = m.max; }
  S.px = S.last.x; S.py = S.last.y; S.mv = null;
  endBattle();
  if (S.lives <= 0) { g.over(`배지 ${S.badges}/3 · 도감 ${Object.keys(S.caught).length}종`); return; }
  push(msg(`정신을 차려보니 몬스터 센터였다... (남은 기회 ${S.lives})`));
}
function drawBattle(g, c) {
  const B = S.bt; if (!B) return;
  const grd = c.createLinearGradient(0, 0, 0, 450); grd.addColorStop(0, '#bae6fd'); grd.addColorStop(1, '#dcfce7');
  c.fillStyle = grd; c.fillRect(0, 0, g.W, 450);
  c.fillStyle = '#86efac'; c.beginPath(); c.ellipse(700, 225, 150, 34, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(250, 415, 170, 38, 0, 0, Math.PI * 2); c.fill();
  const f = foe(), m = me(), A = B.anim;
  if (f) {
    let ox = 0, alpha = 1;
    if (A.t > 0 && A.side === 'foe') { ox = Math.sin(A.t * 60) * 8; alpha = Math.floor(A.t * 20) % 2 ? 0.3 : 1; }
    if (A.t > 0.25 && A.atk === 'foe') ox = -(A.t - 0.25) * 200;
    c.globalAlpha = f.hp <= 0 && f.dhp < 1 ? 0 : alpha;
    if (!B.ball) g.emoji(SP[f.k][1], 700 + ox, 165 + Math.sin(S.t * 2) * 3, 120); else g.emoji('🔴', 700 + Math.sin(S.t * 14) * 6, 205, 40);
    c.globalAlpha = 1;
    infoBox(g, f, 40, 40, false);
  }
  if (m) {
    let ox = 0, alpha = 1;
    if (A.t > 0 && A.side === 'me') { ox = Math.sin(A.t * 60) * 8; alpha = Math.floor(A.t * 20) % 2 ? 0.3 : 1; }
    if (A.t > 0.25 && A.atk === 'me') ox = (A.t - 0.25) * 200;
    c.save(); c.globalAlpha = m.hp <= 0 && m.dhp < 1 ? 0 : alpha; c.translate(250 + ox, 345 + Math.sin(S.t * 2 + 1) * 3); c.scale(-1, 1); g.emoji(SP[m.k][1], 0, 0, 150); c.restore();
    infoBox(g, m, 560, 300, true);
  }
  // 하단 패널
  g.rect(0, 450, g.W, 150, '#1e293b'); g.rect(0, 450, g.W, 4, '#fde047');
  const showMsg = S.q.length && S.q[0].t === 'msg';
  if (B.menu === 'fight') {
    m.moves.forEach((mv, i) => {
      const [x, y, w, h] = moveRect(i), M = MV[mv], sel = S.cur === i, e = eff(M.t, SP[f.k][2]);
      g.rrect(x, y, w, h, 10, sel ? '#334155' : '#0f172a', TYC[M.t], sel ? 4 : 2);
      g.text(mv, x + 16, y + 20, 19, '#fff', 'left');
      g.text(`${M.t} · ${M.p ? '위력 ' + M.p : M.fx === 'heal' ? '회복' : '능력 저하'}${M.a < 100 ? ' · 명중 ' + M.a : ''}`, x + 16, y + 41, 13, TYC[M.t], 'left');
      if (M.p) g.text(e > 1 ? '효과 굉장!' : e === 0 ? '효과 없음' : e < 1 ? '효과 별로' : '', x + w - 14, y + 27, 14, e > 1 ? '#4ade80' : '#f87171', 'right');
    });
    g.rrect(870, 470, 80, 40, 8, '#475569'); g.text('뒤로', 910, 490, 15, '#fff');
  } else {
    g.rrect(16, 466, B.menu ? 580 : g.W - 32, 118, 12, '#f8fafc', '#475569', 3);
    if (showMsg) { g.text(S.q[0].s, 40, 525, 21, '#111', 'left'); if (Math.floor(S.t * 3) % 2) g.text('▼', B.menu ? 570 : g.W - 50, 565, 14, '#475569'); }
    else if (B.menu === 'main') g.text(`${nm(m)}은(는) 무엇을 할까?`, 40, 525, 21, '#111', 'left');
    else if (B.menu === 'bag') g.text('어떤 도구를 쓸까?', 40, 525, 21, '#111', 'left');
    if (B.menu === 'main') MAINM.forEach((s, i) => { const [x, y, w, h] = mainRect(i), sel = S.cur === i; g.rrect(x, y, w, h, 10, sel ? '#fde047' : '#334155', '#94a3b8', 2); g.text(s, x + w / 2, y + h / 2, 20, sel ? '#111' : '#fff'); });
    if (B.menu === 'bag') bagList().forEach((it, i) => { const sel = S.cur === i; g.rrect(620, 462 + i * 34, 320, 30, 8, sel ? '#fde047' : '#334155'); g.text(`${it[1]}  x${it[2]}`, 640, 477 + i * 34, 16, sel ? '#111' : '#fff', 'left'); });
  }
  if (B.menu === 'switch') {
    g.rect(0, 0, g.W, g.H, 'rgba(15,23,42,.92)');
    g.text(B.forced ? '다음 몬스터를 고르세요' : '교체할 몬스터 (X 취소)', g.W / 2, 32, 22, '#fff');
    S.party.forEach((p, i) => drawMonRow(g, p, g.W / 2 - 300, 60 + i * 66, S.cur === i, i === B.mi));
  }
}
function infoBox(g, m, x, y, mine) {
  g.rrect(x, y, 350, mine ? 104 : 78, 12, 'rgba(248,250,252,.95)', '#334155', 3);
  g.text(nm(m), x + 18, y + 22, 21, '#111', 'left');
  g.text('Lv' + m.lv, x + 330, y + 22, 18, '#111', 'right');
  g.rrect(x + 18, y + 38, 54, 18, 6, TYC[SP[m.k][2]]); g.text(SP[m.k][2], x + 45, y + 47, 12, '#fff');
  if (!mine && S.caught[m.k]) g.text('🔴', x + 92, y + 47, 12, '#111');
  g.text('HP', x + 110, y + 47, 13, '#f59e0b', 'left');
  hpBar(g, x + 136, y + 42, 196, m.dhp / m.max);
  if (mine) {
    g.text(`${Math.ceil(Math.max(0, m.dhp))} / ${m.max}`, x + 330, y + 70, 16, '#111', 'right');
    const lo = needExp(m.lv), hi = needExp(m.lv + 1);
    g.rrect(x + 18, y + 88, 314, 6, 3, '#cbd5e1'); g.rrect(x + 18, y + 88, 314 * U.clamp((m.exp - lo) / (hi - lo), 0, 1), 6, 3, '#3b82f6');
  }
}
