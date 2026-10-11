let S;
const HR = 24, HW = HR * Math.sqrt(3), MC = 18, MR = 16, HOX = 22, HOY = 56, MAXT = 200;
const TER = {
  sea: { n: '바다', c: '#1d4ed8', f: 1, p: 0, g: 1, mv: 99 },
  grass: { n: '초원', c: '#4d9a1e', f: 3, p: 0, g: 0, mv: 1 },
  plain: { n: '평원', c: '#9aa63a', f: 2, p: 1, g: 0, mv: 1 },
  forest: { n: '숲', c: '#1f6b34', f: 1, p: 2, g: 0, mv: 2, def: 0.25, e: '🌲' },
  hill: { n: '언덕', c: '#a1702a', f: 0, p: 2, g: 1, mv: 2, def: 0.5 },
  desert: { n: '사막', c: '#e8c66a', f: 0, p: 1, g: 1, mv: 1 },
  mount: { n: '산', c: '#6b6460', f: 0, p: 0, g: 0, mv: 99, e: '🏔️' },
};
const BON = { wheat: { e: '🌾', f: 1 }, horse: { e: '🐎', p: 1 }, gem: { e: '💎', g: 2 }, fish: { e: '🐟', f: 2 }, deer: { e: '🦌', f: 1, p: 1 }, stone: { e: '🪨', p: 1 } };
const UN = {
  warrior: { n: '전사', e: '🪓', str: 8, mv: 2, cost: 20 },
  settler: { n: '개척자', e: '🧑‍🌾', str: 0, mv: 2, cost: 45, civ: 1 },
  archer: { n: '궁수', e: '🏹', str: 5, rs: 8, rng: 2, mv: 2, cost: 30, tech: 'archery' },
  spear: { n: '창병', e: '🔱', str: 11, mv: 2, cost: 35, tech: 'bronze', anti: 1 },
  horse: { n: '기마병', e: '🐎', str: 12, mv: 4, cost: 40, tech: 'horse', mount: 1 },
  sword: { n: '검사', e: '⚔️', str: 15, mv: 2, cost: 50, tech: 'iron' },
  cata: { n: '투석기', e: '🪨', str: 6, rs: 14, rng: 2, mv: 2, cost: 60, tech: 'math', siege: 1 },
  knight: { n: '기사', e: '🏇', str: 22, mv: 4, cost: 80, tech: 'chivalry', mount: 1 },
  musket: { n: '머스킷병', e: '💂', str: 28, mv: 2, cost: 100, tech: 'gunpowder' },
  cannon: { n: '대포', e: '🧨', str: 10, rs: 26, rng: 2, mv: 2, cost: 110, tech: 'gunpowder', siege: 1 },
};
const BLD = {
  granary: { n: '곡창', e: '🌾', cost: 40, tech: 'pottery', d: '식량 +2' },
  walls: { n: '성벽', e: '🧱', cost: 50, tech: 'masonry', d: '도시 방어 +8' },
  library: { n: '도서관', e: '📚', cost: 60, tech: 'writing', d: '과학 +50%' },
  market: { n: '시장', e: '🏪', cost: 60, tech: 'currency', d: '골드 +50%' },
  forge: { n: '대장간', e: '⚒️', cost: 70, tech: 'iron', d: '생산 +25%' },
  univ: { n: '대학', e: '🎓', cost: 110, tech: 'education', d: '과학 +50%' },
};
const TECH = {
  pottery: { n: '도기', e: '🏺', cost: 53, req: [] }, archery: { n: '궁술', e: '🏹', cost: 62, req: [] }, masonry: { n: '석공술', e: '🧱', cost: 62, req: [] }, bronze: { n: '청동기', e: '🔔', cost: 77, req: [] },
  horse: { n: '승마', e: '🐎', cost: 101, req: [] }, writing: { n: '문자', e: '📜', cost: 101, req: ['pottery'] }, iron: { n: '철기', e: '⚒️', cost: 156, req: ['bronze'] }, currency: { n: '화폐', e: '🪙', cost: 156, req: ['bronze'] },
  math: { n: '수학', e: '📐', cost: 180, req: ['writing'] }, chivalry: { n: '기사도', e: '🛡️', cost: 288, req: ['horse', 'iron'] }, education: { n: '교육', e: '🎓', cost: 312, req: ['math', 'currency'] }, gunpowder: { n: '화약', e: '🧨', cost: 504, req: ['chivalry', 'education'] },
};
const CIVS = [
  { n: '고려', c: '#3b82f6', l: '#93c5fd', cities: ['개경', '서경', '동경', '남경', '양주', '광주', '충주', '청주', '공주', '진주', '상주', '전주'] },
  { n: '로마', c: '#dc2626', l: '#fca5a5', cities: ['로마', '안티움', '쿠마이', '네아폴리스', '라벤나', '아퀼레이아', '밀라노', '피사'] },
  { n: '몽골', c: '#eab308', l: '#fde68a', cities: ['카라코룸', '베쉬발릭', '알말리크', '코브도', '울란바토르', '하르호린', '사라이'] },
  { n: '이집트', c: '#a855f7', l: '#d8b4fe', cities: ['테베', '멤피스', '헬리오폴리스', '기자', '아비도스', '엘레판티네', '알렉산드리아'] },
];
GAME({
  title: '문명 정복', w: 1000, h: 640, bg: '#0b1d3a', controls: 'none',
  help: '유닛 클릭 → 파란 칸 이동 · 빨간 표시 적 공격 (원거리 유닛은 2칸)\n🧑‍🌾 개척자로 도시 건설(B) · 도시 클릭 → 생산할 유닛/건물 선택\n🔬 연구(T)로 새 유닛·건물 해금 · 💰 골드로 즉시 구매\nSpace 다음 유닛 · Enter 턴 종료 · 숲/언덕은 방어 보너스\n근접 유닛으로 체력 0인 적 도시를 점령! 모든 문명을 정복하면 승리 (200턴)',
  init(g) {
    S = { g, turn: 1, sel: null, selCity: null, techOpen: false, log: [], anim: [], kills: 0, conq: 0, nid: 1, over: false, hover: null };
    genMap();
    placeCivs();
    for (const c of S.civs) startTurnCiv(c);
    updateVis();
    selectNext();
    addLog('🌍 개척자로 첫 도시 건설 (B)');
  },
  update(g, dt) {
    S.g = g; if (S.over) return;
    for (const a of S.anim) a.t -= dt; S.anim = S.anim.filter((a) => a.t > 0);
    const m = g.mouse, me = S.civs[0];
    S.hover = m.x < 780 ? pixHex(m.x, m.y) : null;
    if (g.keyp('KeyT')) { S.techOpen = !S.techOpen; g.sfx.click(); }
    if (S.techOpen) { techInput(g); return; }
    if (g.keyp('Enter') || g.clickIn(790, 594, 200, 40)) { endTurn(g); return; }
    if (g.keyp('Space')) { if (S.sel) S.sel.skip = true; selectNext(); }
    if (g.keyp('KeyB') && S.sel && S.sel.k === 'settler') found(g, S.sel);
    if (m.clicked && m.x >= 780) { panelClick(g); return; }
    if (m.clicked && S.hover) mapClick(g, S.hover);
    if (m.rclick) { S.sel = null; S.selCity = null; }
    g.info = `${S.turn}턴 · 도시 ${me.cityList().length} · 💰${Math.floor(me.gold)} · 🔬${me.res ? TECH[me.res].n : '-'}`;
  },
  draw(g, c) {
    const me = S.civs[0];
    const reach = S.sel && S.sel.civ === 0 ? S.reach : null;
    for (let r = 0; r < MR; r++) for (let q = 0; q < MC; q++) {
      const t = S.map[r][q], [x, y] = hexXY(q, r);
      if (!t.exp) { hexPath(c, x, y, HR); c.fillStyle = '#0a0f1c'; c.fill(); continue; }
      const T = TER[t.t];
      hexPath(c, x, y, HR - 0.5); c.fillStyle = T.c; c.fill();
      if (t.t === 'hill') { g.poly([[x - 12, y + 6], [x - 4, y - 6], [x + 4, y + 6]], 'rgba(0,0,0,.18)'); g.poly([[x, y + 8], [x + 8, y - 3], [x + 15, y + 8]], 'rgba(0,0,0,.15)'); }
      if (T.e) g.emoji(T.e, x, y, t.t === 'mount' ? 30 : 22);
      if (t.t === 'sea') { g.line(x - 8, y - 4, x - 2, y - 6, 'rgba(255,255,255,.25)', 1.5); g.line(x + 2, y + 5, x + 9, y + 3, 'rgba(255,255,255,.25)', 1.5); }
      if (t.bon && !t.city) g.emoji(BON[t.bon].e, x + 10, y + 10, 13);
      if (t.own >= 0) { hexPath(c, x, y, HR - 3); c.strokeStyle = CIVS[t.own].c; c.globalAlpha = 0.65; c.lineWidth = 2; c.stroke(); c.globalAlpha = 1; }
      if (!t.vis) { hexPath(c, x, y, HR); c.fillStyle = 'rgba(5,10,25,.5)'; c.fill(); }
      if (reach && reach.has(r * MC + q) && !(q === S.sel.q && r === S.sel.r)) { hexPath(c, x, y, HR - 4); c.fillStyle = 'rgba(96,165,250,.32)'; c.fill(); }
    }
    if (S.hover) { const [x, y] = hexXY(S.hover.q, S.hover.r); hexPath(c, x, y, HR - 1); c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke(); }
    // 도시
    for (const city of S.cities) {
      const t = S.map[city.r][city.q]; if (!t.exp) continue;
      const [x, y] = hexXY(city.q, city.r), C = CIVS[city.civ];
      g.emoji(city.pop >= 6 ? '🏙️' : city.pop >= 3 ? '🏘️' : '🛖', x, y - 2, 30);
      if (city.blds.walls) g.ring(x, y, HR - 4, '#a8a29e', 3);
      const nm = `${city.cap ? '★' : ''}${city.name} ${city.pop}`; const w = nm.length * 9 + 10;
      g.rrect(x - w / 2, y - 30, w, 15, 6, C.c, S.selCity === city ? '#fff' : null, 2); g.text(nm, x, y - 22, 11, '#fff');
      if (city.hp < city.max) { g.rect(x - 16, y + 14, 32, 4, '#111'); g.rect(x - 16, y + 14, 32 * city.hp / city.max, 4, '#f87171'); }
      if (city.civ === 0 && !city.prod) g.emoji('❗', x + 16, y - 10, 14);
    }
    // 유닛
    for (const u of S.units) {
      const t = S.map[u.r][u.q]; if (!t.vis && u.civ !== 0) continue;
      const [x, y] = hexXY(u.q, u.r), C = CIVS[u.civ], sel = S.sel === u;
      const oy = S.map[u.r][u.q].city ? 10 : 0;
      g.circle(x, y + oy, 14, sel ? '#fff' : C.c); g.circle(x, y + oy, 11.5, sel ? C.c : 'rgba(0,0,0,.45)');
      g.emoji(UN[u.k].e, x, y + oy, 18);
      if (u.hp < 100) { g.rect(x - 12, y + oy + 13, 24, 3, '#111'); g.rect(x - 12, y + oy + 13, 24 * u.hp / 100, 3, u.hp > 50 ? '#4ade80' : '#f87171'); }
      if (u.civ === 0 && u.mv > 0 && !u.fort && !u.skip) g.circle(x + 11, y + oy - 11, 3.5, '#4ade80');
      if (u.fort) g.emoji('🛡️', x - 12, y + oy - 11, 10);
    }
    // 공격 가능 표시
    if (S.sel && S.sel.civ === 0 && S.sel.mv > 0) for (const tg of S.targets) { const [x, y] = hexXY(tg.q, tg.r); g.ring(x, y, HR - 6, '#ef4444', 3); }
    for (const a of S.anim) { const [x, y] = hexXY(a.q, a.r); c.globalAlpha = Math.min(1, a.t * 2); g.text(a.s, x, y - 18 - (1 - a.t) * 20, 16, a.c); c.globalAlpha = 1; }
    if (S.shot) { S.shot.t -= 1 / 60; if (S.shot.t > 0) { const [x1, y1] = hexXY(S.shot.a.q, S.shot.a.r), [x2, y2] = hexXY(S.shot.b.q, S.shot.b.r); const k = 1 - S.shot.t / 0.4; g.circle(U.lerp(x1, x2, k), U.lerp(y1, y2, k) - Math.sin(k * Math.PI) * 30, 4, '#fde047'); } }
    drawPanel(g, c);
    if (S.techOpen) drawTech(g, c);
  },
});
/* ---------- 헥스 ---------- */
function hexXY(q, r) { return [HOX + HW * (q + 0.5 * (r & 1)), HOY + HR * 1.5 * r]; }
function hexPath(c, x, y, R) { c.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 180 * (60 * i - 30); i ? c.lineTo(x + R * Math.cos(a), y + R * Math.sin(a)) : c.moveTo(x + R * Math.cos(a), y + R * Math.sin(a)); } c.closePath(); }
function pixHex(px, py) { let best = null, bd = 1e9; for (let r = 0; r < MR; r++) for (let q = 0; q < MC; q++) { const [x, y] = hexXY(q, r), d = (x - px) ** 2 + (y - py) ** 2; if (d < bd) { bd = d; best = { q, r }; } } return bd < HR * HR ? best : null; }
const NB = [[[1, 0], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]], [[1, 0], [1, -1], [0, -1], [-1, 0], [0, 1], [1, 1]]];
function nbrs(q, r) { const out = []; for (const [dq, dr] of NB[r & 1]) { const Q = q + dq, R = r + dr; if (Q >= 0 && Q < MC && R >= 0 && R < MR) out.push([Q, R]); } return out; }
function cube(q, r) { const x = q - (r - (r & 1)) / 2; return [x, r, -x - r]; }
function hd(a, b, c2, d) { const A = cube(a, b), B = cube(c2, d); return Math.max(Math.abs(A[0] - B[0]), Math.abs(A[1] - B[1]), Math.abs(A[2] - B[2])); }
function tile(q, r) { return S.map[r] && S.map[r][q]; }
/* ---------- 맵 ---------- */
function genMap() {
  S.map = U.grid(MC, MR, () => ({ t: 'sea', own: -1, exp: false, vis: false, bon: null, city: null }));
  for (let r = 0; r < MR; r++) for (let q = 0; q < MC; q++) { S.map[r][q].q = q; S.map[r][q].r = r; }
  let land = 0; const target = MC * MR * 0.6;
  const seeds = [[4, 4], [13, 4], [4, 11], [13, 11], [9, 8]];
  const front = seeds.map(([q, r]) => [q + U.randi(-1, 1), r + U.randi(-1, 1)]);
  for (const [q, r] of front) { S.map[r][q].t = 'grass'; land++; }
  let guard = 0;
  while (land < target && guard++ < 5000) {
    const [q, r] = U.choice(front); const nb = U.choice(nbrs(q, r)); const t = S.map[nb[1]][nb[0]];
    if (nb[0] === 0 || nb[1] === 0 || nb[0] === MC - 1 || nb[1] === MR - 1) { if (Math.random() < 0.8) continue; }
    if (t.t === 'sea') { t.t = 'grass'; land++; front.push(nb); }
  }
  const pool = ['grass', 'grass', 'plain', 'plain', 'plain', 'forest', 'forest', 'hill', 'desert'];
  for (let r = 0; r < MR; r++) for (let q = 0; q < MC; q++) { const t = S.map[r][q]; if (t.t === 'sea') continue; t.t = U.choice(pool); if (Math.random() < 0.06) t.t = 'mount'; }
  for (let k = 0; k < 2; k++) for (let r = 0; r < MR; r++) for (let q = 0; q < MC; q++) { const t = S.map[r][q]; if (t.t === 'sea' || t.t === 'mount') continue; if (Math.random() < 0.4) { const nb = U.choice(nbrs(q, r)); const n = S.map[nb[1]][nb[0]]; if (n.t !== 'sea' && n.t !== 'mount') t.t = n.t; } }
  for (let r = 0; r < MR; r++) for (let q = 0; q < MC; q++) {
    const t = S.map[r][q]; if (Math.random() > 0.13) continue;
    if (t.t === 'sea') { if (nbrs(q, r).some(([a, b]) => S.map[b][a].t !== 'sea')) t.bon = 'fish'; }
    else if (t.t === 'grass' || t.t === 'plain') t.bon = U.choice(['wheat', 'horse', 'wheat']);
    else if (t.t === 'forest') t.bon = 'deer';
    else if (t.t === 'hill' || t.t === 'desert') t.bon = U.choice(['gem', 'stone']);
  }
}
function placeCivs() {
  S.civs = []; S.units = []; S.cities = [];
  const corners = U.shuffle([[3, 3], [14, 3], [3, 12], [14, 12]]);
  corners.unshift(corners.splice(U.randi(0, 3), 1)[0]);
  for (let i = 0; i < 4; i++) {
    const civ = { i, ai: i > 0, gold: 10, rp: 0, res: null, techs: new Set(), alive: true, ci: 0, kills: 0 };
    civ.cityList = () => S.cities.filter((c) => c.civ === i);
    S.civs.push(civ);
    let best = null, bd = 1e9;
    for (let r = 1; r < MR - 1; r++) for (let q = 1; q < MC - 1; q++) { const t = S.map[r][q]; if (t.t === 'sea' || t.t === 'mount' || S.units.some((u) => hd(u.q, u.r, q, r) < 6)) continue; const d = hd(q, r, corners[i][0], corners[i][1]) + (t.t === 'grass' || t.t === 'plain' ? 0 : 1.5) + Math.random(); if (d < bd) { bd = d; best = [q, r]; } }
    if (!best) continue;
    addUnit(i, 'settler', best[0], best[1]);
    const nb = nbrs(best[0], best[1]).find(([q, r]) => passable(q, r) && !unitAt(q, r));
    if (nb) addUnit(i, 'warrior', nb[0], nb[1]);
  }
}
function addUnit(civ, k, q, r) { const u = { id: S.nid++, civ, k, q, r, hp: 100, mv: UN[k].mv, fort: false, skip: false, acted: false }; S.units.push(u); return u; }
function passable(q, r) { const t = tile(q, r); return t && TER[t.t].mv < 99; }
function unitAt(q, r) { return S.units.find((u) => u.q === q && u.r === r); }
function cityAt(q, r) { const t = tile(q, r); return t && t.city; }
/* ---------- 도시 ---------- */
function found(g, u) {
  const t = tile(u.q, u.r), civ = S.civs[u.civ];
  if (t.city || S.cities.some((c) => hd(c.q, c.r, u.q, u.r) < 3)) { if (u.civ === 0) { addLog('다른 도시와 너무 가까워요 (3칸 이상)'); g.sfx.beep(150, 0.1); } return false; }
  if (t.own >= 0 && t.own !== u.civ) { if (u.civ === 0) addLog('다른 문명의 영토에는 건설할 수 없어요'); return false; }
  const names = CIVS[u.civ].cities;
  const city = { id: S.nid++, civ: u.civ, q: u.q, r: u.r, name: names[civ.ci++ % names.length] + (civ.ci > names.length ? '2' : ''), pop: 1, food: 0, ps: 0, prod: null, blds: {}, hp: 150, max: 150, cap: !civ.cityList().length, rad: 1, fired: false };
  S.cities.push(city); t.city = city;
  claim(city);
  S.units.splice(S.units.indexOf(u), 1);
  city.prod = civ.ai ? null : 'warrior';
  if (u.civ === 0) { g.sfx.power(); g.add(50); addLog(`🏙️ ${city.name} 건설!`); S.sel = null; S.selCity = city; updateVis(); }
  return true;
}
function claim(city) { for (let r = 0; r < MR; r++) for (let q = 0; q < MC; q++) { const t = S.map[r][q]; const d = hd(q, r, city.q, city.r); if (d === 0 || (d <= city.rad && t.own < 0)) t.own = city.civ; } }
function cityTiles(city) { const out = []; for (let r = Math.max(0, city.r - 3); r < Math.min(MR, city.r + 4); r++) for (let q = Math.max(0, city.q - 3); q < Math.min(MC, city.q + 4); q++) { const d = hd(q, r, city.q, city.r); if (d >= 1 && d <= city.rad && S.map[r][q].own === city.civ) out.push(S.map[r][q]); } return out; }
function ty(t) { const T = TER[t.t], B = t.bon ? BON[t.bon] : {}; return { f: T.f + (B.f || 0), p: T.p + (B.p || 0), g: T.g + (B.g || 0) }; }
function yields(city) {
  const ct = ty(tile(city.q, city.r)); let f = Math.max(2, ct.f) + 1, p = Math.max(1, ct.p) + 1, gd = ct.g + 1;
  const ts = cityTiles(city).map(ty).sort((a, b) => (b.f * 2 + b.p * 1.6 + b.g) - (a.f * 2 + a.p * 1.6 + a.g)).slice(0, city.pop);
  for (const y of ts) { f += y.f; p += y.p; gd += y.g; }
  if (city.blds.granary) f += 2;
  if (city.blds.forge) p = Math.floor(p * 1.25);
  if (city.blds.market) gd = Math.floor(gd * 1.5);
  let sci = 2 + city.pop; if (city.blds.library) sci *= 1.5; if (city.blds.univ) sci *= 1.5;
  if (S.civs[city.civ].ai) { p = Math.ceil(p * 1.1); }
  return { f, p, g: gd, s: Math.floor(sci), need: city.pop * 2 };
}
function growNeed(city) { return 12 + city.pop * 7; }
function cityStr(city) { return 6 + city.pop * 1.4 + (city.blds.walls ? 7 : 0) + S.civs[city.civ].techs.size * 0.5; }
function prodCost(k) { return UN[k] ? UN[k].cost : BLD[k].cost; }
function canBuild(city, k) {
  const civ = S.civs[city.civ];
  if (UN[k]) { if (UN[k].tech && !civ.techs.has(UN[k].tech)) return false; if (k === 'settler' && city.pop < 2) return false; return true; }
  return !city.blds[k] && civ.techs.has(BLD[k].tech);
}
function cityTurn(g, city) {
  const civ = S.civs[city.civ], y = yields(city);
  city.hp = Math.min(city.max, city.hp + 12);
  city.food += y.f - y.need;
  if (city.food >= growNeed(city)) { city.food = city.blds.granary ? Math.floor(growNeed(city) * 0.3) : 0; city.pop++; if (city.civ === 0) addLog(`👶 ${city.name} 인구 ${city.pop}`); if (city.pop >= 3 && city.rad < 2) { city.rad = 2; claim(city); } }
  if (city.food < 0) { if (city.pop > 1) { city.pop--; city.food = 0; if (city.civ === 0) addLog(`😢 ${city.name} 기근!`); } else city.food = 0; }
  civ.gold += y.g; civ.rp += y.s;
  if (civ.ai && !city.prod) city.prod = aiChooseProd(city);
  if (city.prod && !canBuild(city, city.prod) && !(city.prod === 'settler' && city.pop >= 2)) city.prod = civ.ai ? aiChooseProd(city) : null;
  city.ps += y.p;
  if (city.prod && city.ps >= prodCost(city.prod)) complete(g, city);
  // 도시 포격
  const tg = S.units.filter((u) => u.civ !== city.civ && hd(u.q, u.r, city.q, city.r) <= 2).sort((a, b) => a.hp - b.hp)[0];
  if (tg) { const dmg = Math.round(22 * Math.pow(cityStr(city) / effStr(tg, null), 0.85) * U.rand(0.8, 1.2)); hurtUnit(g, tg, U.clamp(dmg, 4, 60), city.civ); if (tile(tg.q, tg.r).vis) S.shot = { a: city, b: { q: tg.q, r: tg.r }, t: 0.4 }; }
}
function complete(g, city) {
  const k = city.prod;
  if (UN[k]) {
    let spot = !unitAt(city.q, city.r) ? [city.q, city.r] : nbrs(city.q, city.r).find(([q, r]) => passable(q, r) && !unitAt(q, r) && (!cityAt(q, r) || cityAt(q, r).civ === city.civ));
    if (!spot) return;
    city.ps -= prodCost(k);
    if (k === 'settler') city.pop--;
    addUnit(city.civ, k, spot[0], spot[1]);
    if (city.civ === 0) { addLog(`${UN[k].e} ${city.name}: ${UN[k].n} 완성`); if (k === 'settler') city.prod = 'warrior'; } else city.prod = null;
  } else {
    city.ps -= prodCost(k); city.blds[k] = 1; if (k === 'walls') { city.max += 75; city.hp += 75; }
    if (city.civ === 0) { addLog(`${BLD[k].e} ${city.name}: ${BLD[k].n} 완공`); g.sfx.coin(); }
    city.prod = null;
  }
}
/* ---------- 이동·전투 ---------- */
function moveCost(q, r) { return TER[tile(q, r).t].mv; }
function hostileAt(civ, q, r) { const u = unitAt(q, r); if (u && u.civ !== civ) return u; const c = cityAt(q, r); if (c && c.civ !== civ) return c; return null; }
function calcReach(u) {
  const best = new Map(); best.set(u.r * MC + u.q, u.mv);
  const queue = [[u.q, u.r, u.mv]];
  while (queue.length) {
    queue.sort((a, b) => b[2] - a[2]);
    const [q, r, m] = queue.shift(); if (m <= 0) continue;
    for (const [Q, R] of nbrs(q, r)) {
      if (!passable(Q, R) || hostileAt(u.civ, Q, R)) continue;
      const occ = unitAt(Q, R);
      const cost = Math.min(m, moveCost(Q, R)); const left = m - cost;
      const key = R * MC + Q;
      if ((best.get(key) ?? -1) >= left) continue;
      best.set(key, left);
      if (!occ) queue.push([Q, R, left]); else queue.push([Q, R, left]);
    }
  }
  for (const k of [...best.keys()]) { const q = k % MC, r = (k / MC) | 0; const o = unitAt(q, r); if (o && o !== u) best.delete(k); }
  return best;
}
function calcTargets(u, reach) {
  const T = UN[u.k], out = [];
  if (T.civ || u.mv <= 0) return out;
  const seen = new Set();
  const push = (q, r) => { const k = r * MC + q; if (seen.has(k)) return; seen.add(k); if (tile(q, r).vis || u.civ !== 0) out.push({ q, r }); };
  if (T.rs) { for (const o of S.units) if (o.civ !== u.civ && hd(o.q, o.r, u.q, u.r) <= T.rng) push(o.q, o.r); for (const c of S.cities) if (c.civ !== u.civ && hd(c.q, c.r, u.q, u.r) <= T.rng) push(c.q, c.r); return out; }
  for (const [k, left] of reach) { if (left <= 0 && k !== u.r * MC + u.q) continue; const q = k % MC, r = (k / MC) | 0; for (const [Q, R] of nbrs(q, r)) if (hostileAt(u.civ, Q, R)) push(Q, R); }
  return out;
}
function effStr(u, att) {
  const T = UN[u.k]; let s = Math.max(1, T.str) * (0.5 + 0.5 * u.hp / 100);
  const t = tile(u.q, u.r); s *= 1 + (TER[t.t].def || 0) + (u.fort ? 0.25 : 0) + (t.city && t.city.civ === u.civ ? 0.25 : 0);
  if (att && T.anti && UN[att.k].mount) s *= 1.5;
  return s;
}
function attack(g, u, q, r) {
  const T = UN[u.k], def = hostileAt(u.civ, q, r); if (!def) return;
  const ranged = !!T.rs, isCity = !!def.pop;
  // 도시에 유닛이 있으면 유닛과 먼저 싸움
  let target = def; if (isCity) { const gu = unitAt(q, r); if (gu && gu.civ !== u.civ) target = gu; }
  let A = (ranged ? T.rs : T.str) * (0.5 + 0.5 * u.hp / 100);
  if (T.siege && target.pop) A *= 2;
  if (T.anti && !target.pop && UN[target.k].mount) A *= 1.5;
  const D = target.pop ? cityStr(target) : effStr(target, u);
  const ratio = A / D;
  const dD = U.clamp(Math.round(28 * Math.pow(ratio, 0.9) * U.rand(0.8, 1.2)), 3, 100);
  const dA = ranged ? 0 : U.clamp(Math.round(26 / Math.pow(ratio, 0.9) * U.rand(0.8, 1.2)), 1, 100);
  u.mv = 0; u.fort = false;
  if (ranged) S.shot = { a: { q: u.q, r: u.r }, b: { q, r }, t: 0.4 };
  if (u.civ === 0 || target.civ === 0) { g.sfx.hit(); g.shake(4); }
  if (target.pop) {
    target.hp -= dD; anim(q, r, '-' + dD, '#f87171');
    if (target.hp <= 0) { if (ranged) target.hp = 1; else capture(g, target, u); }
  } else { hurtUnit(g, target, dD, u.civ); }
  if (dA) hurtUnit(g, u, dA, target.civ);
  if (!ranged && u.hp > 0 && !target.pop && target.hp <= 0 && !unitAt(q, r) && !cityAt(q, r)) { u.q = q; u.r = r; }
}
function hurtUnit(g, u, d, by) {
  u.hp -= d; anim(u.q, u.r, '-' + d, '#f87171');
  if (u.hp <= 0) {
    S.units.splice(S.units.indexOf(u), 1);
    if (tile(u.q, u.r).vis) { const [x, y] = hexXY(u.q, u.r); g.burst(x, y, CIVS[u.civ].c, 14, 120, 0.5); }
    if (by === 0) { S.kills++; g.add(15); }
    if (u.civ === 0) addLog(`💀 ${UN[u.k].n}을(를) 잃었다`);
    if (S.sel === u) S.sel = null;
  }
}
function capture(g, city, u) {
  const old = city.civ, wasCap = city.cap;
  city.civ = u.civ; city.hp = 60; city.pop = Math.max(1, city.pop - 1); city.prod = S.civs[u.civ].ai ? null : 'warrior'; city.ps = 0; city.cap = false; delete city.blds.walls; city.max = 150;
  u.q = city.q; u.r = city.r;
  for (let r = 0; r < MR; r++) for (let q = 0; q < MC; q++) { const t = S.map[r][q]; if (t.own === old && hd(q, r, city.q, city.r) <= city.rad) t.own = u.civ; }
  if (tile(city.q, city.r).vis) { const [x, y] = hexXY(city.q, city.r); g.burst(x, y, [CIVS[u.civ].c, '#fde047'], 30, 200, 0.8); g.shake(8); }
  addLog(`⚔️ ${CIVS[u.civ].n}이(가) ${city.name}${wasCap ? '(수도)' : ''} 점령!`);
  if (u.civ === 0) { S.conq++; g.add(200 + city.pop * 20); g.sfx.win(); }
  else if (old === 0) g.sfx.lose();
  checkElim(g);
}
function checkElim(g) {
  for (const civ of S.civs) {
    if (!civ.alive) continue;
    if (!civ.cityList().length && !S.units.some((u) => u.civ === civ.i && u.k === 'settler')) {
      civ.alive = false; S.units = S.units.filter((u) => u.civ !== civ.i);
      for (const row of S.map) for (const t of row) if (t.own === civ.i) t.own = -1;
      addLog(`☠️ ${CIVS[civ.i].n} 문명 멸망!`);
      if (civ.i !== 0) g.add(500);
    }
  }
  if (!S.civs[0].alive) { S.over = true; g.over(`${S.turn}턴에 고려 멸망...`); return; }
  if (S.civs.every((c) => c.i === 0 || !c.alive)) { S.over = true; g.add(Math.max(0, MAXT - S.turn) * 25); g.win(`${S.turn}턴 만에 세계 정복!`); }
}
function anim(q, r, s, c) { if (!tile(q, r).vis) return; S.anim.push({ q, r, s, c, t: 1 }); }
function moveUnit(u, q, r, reach) { const left = reach.get(r * MC + q); if (left === undefined) return false; u.q = q; u.r = r; u.mv = left; u.fort = false; return true; }
/* ---------- 플레이어 입력 ---------- */
function selectUnit(u) { S.sel = u; S.selCity = null; S.reach = calcReach(u); S.targets = calcTargets(u, S.reach); }
function selectNext() {
  const list = S.units.filter((u) => u.civ === 0 && u.mv > 0 && !u.fort && !u.skip);
  if (!list.length) { S.sel = null; return; }
  const i = S.sel ? (list.indexOf(S.sel) + 1) % list.length : 0;
  selectUnit(list[i] || list[0]);
}
function mapClick(g, h) {
  const { q, r } = h, t = tile(q, r);
  const u = S.sel;
  if (u && u.civ === 0 && u.mv > 0) {
    if (S.targets.some((tg) => tg.q === q && tg.r === r)) {
      if (!UN[u.k].rs && hd(u.q, u.r, q, r) > 1) {
        let best = null, bl = -1; for (const [k, left] of S.reach) { const Q = k % MC, R = (k / MC) | 0; if (hd(Q, R, q, r) === 1 && left > bl && (left > 0)) { bl = left; best = [Q, R]; } }
        if (best) moveUnit(u, best[0], best[1], S.reach);
      }
      attack(g, u, q, r); checkElim(g); updateVis(); if (S.units.includes(u)) selectUnit(u); else S.sel = null; return;
    }
    if (S.reach.has(r * MC + q) && !(u.q === q && u.r === r)) { moveUnit(u, q, r, S.reach); g.sfx.move(); updateVis(); selectUnit(u); if (u.mv <= 0) selectNext(); return; }
  }
  const own = S.units.find((o) => o.q === q && o.r === r && o.civ === 0);
  if (t.city && t.city.civ === 0 && (!own || S.sel === own)) { S.selCity = t.city; S.sel = null; g.sfx.click(); return; }
  if (own) { selectUnit(own); g.sfx.click(); return; }
  S.sel = null; S.selCity = t.city && t.vis ? t.city : null;
}
function panelClick(g) {
  const m = g.mouse, me = S.civs[0];
  if (g.inRect(790, 84, 200, 44)) { S.techOpen = true; g.sfx.click(); return; }
  if (S.sel && S.sel.civ === 0) {
    const u = S.sel;
    if (u.k === 'settler' && g.inRect(790, 250, 200, 34)) { found(g, u); return; }
    if (g.inRect(790, 290, 98, 34)) { u.fort = true; u.mv = 0; g.sfx.click(); selectNext(); return; }
    if (g.inRect(892, 290, 98, 34)) { u.skip = true; selectNext(); return; }
  }
  const c = S.selCity;
  if (c && c.civ === 0) {
    const opts = prodOptions(c);
    opts.forEach((k, i) => { if (g.inRect(790, 268 + i * 21, 200, 20)) { c.prod = k; g.sfx.click(); } });
    if (c.prod && g.inRect(790, 236, 200, 26)) { const cost = buyCost(c); if (me.gold >= cost) { me.gold -= cost; c.ps = prodCost(c.prod); complete(g, c); g.sfx.coin(); } else g.sfx.beep(150, 0.1); }
  }
}
function prodOptions(c) { return [...Object.keys(UN), ...Object.keys(BLD)].filter((k) => canBuild(c, k)); }
function buyCost(c) { return Math.max(10, Math.ceil((prodCost(c.prod) - c.ps) * 2.2)); }
function techInput(g) {
  const me = S.civs[0];
  Object.keys(TECH).forEach((k, i) => { const x = 60 + (i % 4) * 230, y = 120 + Math.floor(i / 4) * 140; if (g.clickIn(x, y, 210, 120) && techAvail(me, k)) { me.res = k; g.sfx.click(); S.techOpen = false; } });
  if (g.clickIn(420, 560, 160, 40)) S.techOpen = false;
}
function techAvail(civ, k) { return !civ.techs.has(k) && TECH[k].req.every((r) => civ.techs.has(r)); }
/* ---------- 턴 ---------- */
function startTurnCiv(civ) { for (const u of S.units) if (u.civ === civ.i) { u.mv = UN[u.k].mv; u.skip = false; u.acted = false; } }
function endTurn(g) {
  g.sfx.click();
  for (const civ of S.civs) {
    if (!civ.alive) continue;
    if (civ.ai) aiTurn(g, civ);
    if (S.over) return;
    for (const city of civ.cityList()) cityTurn(g, city);
    if (!civ.res) { const av = Object.keys(TECH).filter((k) => techAvail(civ, k)).sort((a, b) => TECH[a].cost - TECH[b].cost); if (av.length) civ.res = civ.ai ? U.choice(av.slice(0, 2)) : av[0]; }
    if (civ.res && civ.rp >= TECH[civ.res].cost) { civ.rp -= TECH[civ.res].cost; civ.techs.add(civ.res); if (civ.i === 0) { addLog(`🔬 ${TECH[civ.res].n} 연구 완료!`); g.add(30); g.sfx.power(); } civ.res = null; }
    // 회복
    for (const u of S.units) if (u.civ === civ.i) { if (u.mv === UN[u.k].mv && u.hp < 100) { const t = tile(u.q, u.r); u.hp = Math.min(100, u.hp + (t.own === civ.i ? 20 : 10)); } }
    startTurnCiv(civ);
    checkElim(g); if (S.over) return;
  }
  S.turn++;
  const me = S.civs[0];
  g.score = Math.max(g.score, me.cityList().reduce((s, c) => s + c.pop * 10, 0) + me.techs.size * 20 + S.conq * 200 + S.kills * 15);
  if (S.turn > MAXT) {
    S.over = true; const rank = S.civs.filter((c) => c.alive).sort((a, b) => b.cityList().length - a.cityList().length);
    if (rank[0].i === 0) g.win(`${MAXT}턴 종료 — 가장 강대한 문명!`); else g.over(`${MAXT}턴 종료 — ${CIVS[rank[0].i].n}이(가) 더 강했다`);
    return;
  }
  for (const c of me.cityList()) if (!c.prod) { addLog(`❗ ${c.name}: 생산할 것을 고르세요`); break; }
  updateVis(); S.sel = null; selectNext();
}
function updateVis() {
  for (const row of S.map) for (const t of row) t.vis = false;
  const see = (q0, r0, rad) => { for (let r = Math.max(0, r0 - rad - 1); r < Math.min(MR, r0 + rad + 2); r++) for (let q = Math.max(0, q0 - rad - 1); q < Math.min(MC, q0 + rad + 2); q++) if (hd(q, r, q0, r0) <= rad) { S.map[r][q].vis = true; S.map[r][q].exp = true; } };
  for (const u of S.units) if (u.civ === 0) see(u.q, u.r, 2);
  for (const c of S.cities) if (c.civ === 0) see(c.q, c.r, c.rad + 1);
}
function addLog(s) { S.log.unshift(s); S.log.length = Math.min(S.log.length, 6); }
/* ---------- AI ---------- */
function aiChooseProd(city) {
  const civ = S.civs[city.civ], cities = civ.cityList().length;
  const mil = S.units.filter((u) => u.civ === civ.i && !UN[u.k].civ).length;
  const settlers = S.units.filter((u) => u.civ === civ.i && u.k === 'settler').length + civ.cityList().filter((c) => c.prod === 'settler').length;
  if (cities < 5 && settlers < 1 && city.pop >= 2 && mil >= cities) return 'settler';
  const units = Object.keys(UN).filter((k) => !UN[k].civ && canBuild(city, k));
  const bestU = (pref) => units.filter((k) => (pref ? UN[k].rs : !UN[k].rs)).sort((a, b) => (UN[b].str + (UN[b].rs || 0)) - (UN[a].str + (UN[a].rs || 0)))[0];
  if (mil < cities * 2 + Math.floor(S.turn / 25) || (Math.random() < 0.35 && mil < cities * 4)) { const r = Math.random() < 0.3 && bestU(true); return r || bestU(false) || 'warrior'; }
  const b = Object.keys(BLD).filter((k) => canBuild(city, k));
  if (b.length) return U.choice(b);
  return bestU(false) || 'warrior';
}
function aiTurn(g, civ) {
  const mine = S.units.filter((u) => u.civ === civ.i);
  const myCities = civ.cityList();
  const enemyCities = S.cities.filter((c) => c.civ !== civ.i);
  for (const u of mine) {
    if (!S.units.includes(u)) continue;
    const T = UN[u.k];
    if (u.k === 'settler') { aiSettler(g, u); continue; }
    // 수비대
    const here = cityAt(u.q, u.r);
    if (here && here.civ === civ.i && !u.attacker) {
      const garrisoned = S.units.filter((o) => o.civ === civ.i && o.q === here.q && o.r === here.r).length;
      if (garrisoned && mine.filter((o) => !UN[o.k].civ).length <= myCities.length * 1.5) { aiAttackAdj(g, u, 0.9); u.fort = true; continue; }
    }
    // 공격 가능한 대상
    if (aiAttackAdj(g, u, T.rs ? 0 : 0.75)) continue;
    // 목표
    const army = mine.filter((o) => !UN[o.k].civ).length;
    let goal = null;
    const threat = S.units.find((o) => o.civ !== civ.i && myCities.some((c) => hd(c.q, c.r, o.q, o.r) <= 3));
    if (threat) goal = threat;
    else if (army >= myCities.length + 2 || S.turn > 40) { goal = enemyCities.sort((a, b) => hd(a.q, a.r, u.q, u.r) - hd(b.q, b.r, u.q, u.r))[0]; u.attacker = true; }
    if (!goal) { if (u.hp < 100) continue; const c = myCities.sort((a, b) => hd(a.q, a.r, u.q, u.r) - hd(b.q, b.r, u.q, u.r))[0]; if (c && hd(c.q, c.r, u.q, u.r) > 2) goal = c; else { u.fort = true; continue; } }
    if (u.hp < 45 && !threat) { const c = myCities[0]; if (c) goal = c; }
    aiStep(u, goal.q, goal.r);
    aiAttackAdj(g, u, T.rs ? 0 : 0.75);
  }
}
function aiAttackAdj(g, u, minOdds) {
  if (u.mv <= 0 || UN[u.k].civ) return false;
  const reach = new Map([[u.r * MC + u.q, u.mv]]);
  const tg = calcTargets(u, reach); if (!tg.length) return false;
  let best = null, bs = -1;
  for (const t of tg) {
    const d = hostileAt(u.civ, t.q, t.r); if (!d) continue;
    const D = d.pop ? cityStr(d) : effStr(d, u); const A = (UN[u.k].rs || UN[u.k].str) * (0.5 + 0.5 * u.hp / 100) * (UN[u.k].siege && d.pop ? 2 : 1);
    const odds = A / D; if (d.pop && odds < minOdds * 0.7 && minOdds > 0) continue; const sc = odds + (d.pop ? 0.3 : 0) + (d.hp < 40 ? 0.5 : 0);
    if ((odds >= minOdds || (d.pop && odds >= minOdds * 0.7)) && sc > bs) { bs = sc; best = t; }
  }
  if (!best) return false;
  attack(g, u, best.q, best.r); checkElim(g);
  return true;
}
function aiStep(u, gq, gr) {
  const reach = calcReach(u); let best = null, bd = hd(u.q, u.r, gq, gr) * 10;
  for (const [k, left] of reach) { const q = k % MC, r = (k / MC) | 0; const t = tile(q, r); const d = hd(q, r, gq, gr) * 10 - (TER[t.t].def || 0) * 4 - left * 0.5; if (d < bd) { bd = d; best = [q, r]; } }
  if (best) moveUnit(u, best[0], best[1], reach);
}
function aiSettler(g, u) {
  let best = null, bs = -1e9;
  for (let r = 1; r < MR - 1; r++) for (let q = 1; q < MC - 1; q++) {
    const t = S.map[r][q]; if (!passable(q, r) || t.city || (t.own >= 0 && t.own !== u.civ)) continue;
    if (S.cities.some((c) => hd(c.q, c.r, q, r) < 3)) continue;
    const d = hd(q, r, u.q, u.r); if (d > 7) continue;
    let sc = 0; for (const [Q, R] of nbrs(q, r)) { const y = ty(S.map[R][Q]); sc += y.f * 1.5 + y.p + y.g * 0.5; }
    sc -= d * 1.6; if (S.units.some((o) => o.civ !== u.civ && hd(o.q, o.r, q, r) <= 2)) sc -= 10;
    if (sc > bs) { bs = sc; best = [q, r]; }
  }
  if (!best) { if (!S.cities.some((c) => hd(c.q, c.r, u.q, u.r) < 3)) found(g, u); return; }
  if (best[0] === u.q && best[1] === u.r) { found(g, u); return; }
  aiStep(u, best[0], best[1]);
  if (u.q === best[0] && u.r === best[1]) found(g, u);
}
/* ---------- 그리기: 패널·기술 ---------- */
function drawPanel(g, c) {
  const me = S.civs[0];
  g.rect(780, 0, 220, 640, '#111827'); g.line(780, 0, 780, 640, '#374151', 2);
  g.rect(0, 0, 780, 30, 'rgba(0,0,0,.6)');
  let x = 10; for (const civ of S.civs) { const n = civ.cityList().length; g.circle(x + 6, 15, 6, civ.alive ? CIVS[civ.i].c : '#444'); g.text(`${CIVS[civ.i].n} ${civ.alive ? '🏙' + n + ' 🔬' + civ.techs.size : '멸망'}`, x + 16, 15, 13, civ.alive ? '#e5e7eb' : '#6b7280', 'left'); x += 150; }
  g.text(`턴 ${S.turn}/${MAXT}`, 890, 20, 18, '#fff');
  const ty2 = me.cityList().reduce((a, c) => { const y = yields(c); a.g += y.g; a.s += y.s; return a; }, { g: 0, s: 0 });
  g.text(`💰 ${Math.floor(me.gold)} (+${ty2.g})   🔬 +${ty2.s}`, 890, 48, 14, '#fde68a');
  g.rrect(790, 84, 200, 44, 8, me.res ? '#1e3a8a' : '#7f1d1d', '#60a5fa', 1);
  if (me.res) { g.text(`${TECH[me.res].e} ${TECH[me.res].n}`, 800, 98, 14, '#fff', 'left'); g.rect(800, 112, 180, 8, '#1f2937'); g.rect(800, 112, 180 * Math.min(1, me.rp / TECH[me.res].cost), 8, '#60a5fa'); g.text(`${Math.floor(me.rp)}/${TECH[me.res].cost}`, 980, 98, 11, '#bfdbfe', 'right'); }
  else g.text('🔬 연구 선택 (T)', 890, 106, 15, '#fecaca');
  const u = S.sel, ct = S.selCity;
  if (u) {
    const T = UN[u.k];
    g.text(`${T.e} ${T.n}`, 800, 150, 18, CIVS[u.civ].l, 'left');
    g.text(`❤️ ${u.hp}/100   👣 ${u.mv}/${T.mv}`, 800, 176, 14, '#e5e7eb', 'left');
    g.text(`⚔️ 근접 ${T.str}` + (T.rs ? `  🏹 원거리 ${T.rs} (사거리 ${T.rng})` : ''), 800, 198, 13, '#d1d5db', 'left');
    const t = tile(u.q, u.r); g.text(`지형: ${TER[t.t].n}${TER[t.t].def ? ` (방어 +${TER[t.t].def * 100}%)` : ''}`, 800, 220, 12, '#9ca3af', 'left');
    if (u.civ === 0) {
      if (u.k === 'settler') g.button(790, 250, 200, 34, '🏙️ 도시 건설 (B)', '#15803d', 15);
      g.button(790, 290, 98, 34, '🛡️ 요새화', '#374151', 13); g.button(892, 290, 98, 34, '⏭ 다음', '#374151', 13);
    }
  } else if (ct) {
    const y = yields(ct), C = CIVS[ct.civ];
    g.text(`${ct.cap ? '★ ' : ''}${ct.name}`, 800, 148, 18, C.l, 'left'); g.text(`인구 ${ct.pop}`, 980, 148, 14, '#fff', 'right');
    g.text(`🍞 ${ct.food}/${growNeed(ct)} (${y.f - y.need >= 0 ? '+' : ''}${y.f - y.need})  🔨 +${y.p}`, 800, 172, 13, '#e5e7eb', 'left');
    g.text(`💰 +${y.g}  🔬 +${y.s}  🛡️ ${Math.round(cityStr(ct))}  ❤️${ct.hp}`, 800, 192, 13, '#e5e7eb', 'left');
    g.text(Object.keys(ct.blds).map((k) => BLD[k].e).join(' ') || '건물 없음', 800, 212, 13, '#9ca3af', 'left');
    if (ct.civ === 0) {
      if (ct.prod) { const left = prodCost(ct.prod) - ct.ps, turns = Math.max(1, Math.ceil(left / Math.max(1, y.p))); g.rrect(790, 236, 200, 26, 6, '#065f46', '#34d399', 1); g.text(`${(UN[ct.prod] || BLD[ct.prod]).e} ${turns}턴 · 💰${buyCost(ct)} 구매`, 890, 249, 13, '#fff'); }
      else g.text('❗ 생산할 것을 고르세요', 890, 249, 14, '#fca5a5');
      prodOptions(ct).forEach((k, i) => { const D = UN[k] || BLD[k], yy = 268 + i * 21, on = ct.prod === k; g.rrect(790, yy, 200, 20, 4, on ? '#1d4ed8' : g.inRect(790, yy, 200, 20) ? '#374151' : '#1f2937'); g.text(`${D.e} ${D.n}`, 798, yy + 10, 12, '#fff', 'left'); g.text(`🔨${prodCost(k)}` + (UN[k] && !UN[k].civ ? ` ⚔️${UN[k].rs || UN[k].str}` : ''), 984, yy + 10, 11, '#9ca3af', 'right'); });
    }
  } else if (S.hover) {
    const t = tile(S.hover.q, S.hover.r);
    if (t.exp) { const y = ty(t); g.text(`${TER[t.t].n}${t.bon ? ' ' + BON[t.bon].e : ''}`, 800, 150, 16, '#fff', 'left'); g.text(`🍞${y.f} 🔨${y.p} 💰${y.g}` + (t.own >= 0 ? ` · ${CIVS[t.own].n} 영토` : ''), 800, 174, 13, '#d1d5db', 'left'); }
  }
  S.log.forEach((l, i) => g.text(l.length > 19 ? l.slice(0, 18) + '…' : l, 790, 470 + i * 19, 12, i ? '#9ca3af' : '#fde68a', 'left', '600'));
  const left = S.units.filter((o) => o.civ === 0 && o.mv > 0 && !o.fort && !o.skip).length;
  g.button(790, 594, 200, 40, left ? `턴 종료 (남은 유닛 ${left})` : '턴 종료 ⏎', left ? '#4b5563' : '#b45309', 15);
}
function drawTech(g, c) {
  const me = S.civs[0];
  g.rect(0, 0, 1000, 640, 'rgba(3,7,18,.92)');
  g.text('🔬 기술 연구', 500, 60, 30, '#93c5fd'); g.text('연구할 기술을 클릭하세요 (선행 기술 필요)', 500, 92, 14, '#9ca3af');
  Object.keys(TECH).forEach((k, i) => {
    const T = TECH[k], x = 60 + (i % 4) * 230, y = 120 + Math.floor(i / 4) * 140, done = me.techs.has(k), av = techAvail(me, k), cur = me.res === k;
    g.rrect(x, y, 210, 120, 12, done ? '#14532d' : cur ? '#1d4ed8' : av ? (g.inRect(x, y, 210, 120) ? '#374151' : '#1f2937') : '#111827', av ? '#60a5fa' : '#374151', 2);
    g.emoji(T.e, x + 30, y + 32, 32); g.text(T.n, x + 60, y + 24, 18, done ? '#86efac' : av ? '#fff' : '#6b7280', 'left'); g.text(done ? '완료' : `🔬 ${T.cost}`, x + 60, y + 46, 13, '#9ca3af', 'left');
    const un = [...Object.keys(UN).filter((u) => UN[u].tech === k).map((u) => UN[u].e + UN[u].n), ...Object.keys(BLD).filter((b) => BLD[b].tech === k).map((b) => BLD[b].e + BLD[b].n)].join(' ');
    g.text(un, x + 105, y + 78, 12, '#e5e7eb');
    if (T.req.length) g.text('필요: ' + T.req.map((r) => TECH[r].n).join(', '), x + 105, y + 102, 11, '#6b7280');
  });
  g.button(420, 560, 160, 40, '닫기 (T)', '#374151', 16);
}
