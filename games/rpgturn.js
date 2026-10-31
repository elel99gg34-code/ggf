let S;
const TS = 40, VW = 24, VH = 15;
const CLS = {
  hero: { n: '용사', e: '🤴', hp: [32, 9], mp: [4, 2], atk: [11, 3.1], def: [8, 2.1], agi: [8, 2], sp: [[3, 'heal'], [6, 'zap'], [9, 'slash'], [14, 'gigazap'], [18, 'fullheal']] },
  mage: { n: '마법사', e: '🧙', hp: [21, 5.6], mp: [14, 5], atk: [6, 1.6], def: [5, 1.4], agi: [10, 2.2], sp: [[1, 'fire'], [3, 'ice'], [5, 'sleep'], [8, 'firestorm'], [12, 'boom'], [17, 'meteor']] },
  cleric: { n: '성직자', e: '🧕', hp: [25, 6.6], mp: [12, 4.2], atk: [8, 2.2], def: [7, 1.8], agi: [7, 1.6], sp: [[1, 'heal'], [4, 'shield'], [7, 'healall'], [9, 'weaken'], [11, 'revive'], [15, 'fullheal']] },
};
const SPELLS = {
  heal: { n: '치유', mp: 3, tg: 'ally', k: 'heal', p: 40 }, healall: { n: '대치유', mp: 9, tg: 'allies', k: 'heal', p: 75 },
  fullheal: { n: '완전회복', mp: 14, tg: 'ally', k: 'heal', p: 9999 }, revive: { n: '부활', mp: 12, tg: 'dead', k: 'revive' },
  shield: { n: '방어막', mp: 4, tg: 'allies', k: 'buff' }, weaken: { n: '약화', mp: 4, tg: 'enemies', k: 'debuff' },
  sleep: { n: '수면', mp: 3, tg: 'enemies', k: 'sleep' },
  fire: { n: '화염', mp: 2, tg: 'enemy', k: 'dmg', p: [14, 20], c: ['#f97316', '#facc15'] }, ice: { n: '빙결', mp: 4, tg: 'enemy', k: 'dmg', p: [32, 42], c: ['#67e8f9', '#fff'] },
  firestorm: { n: '화염폭풍', mp: 8, tg: 'enemies', k: 'dmg', p: [30, 40], c: ['#f97316', '#ef4444'] }, boom: { n: '대폭발', mp: 15, tg: 'enemies', k: 'dmg', p: [72, 92], c: ['#fde047', '#fb923c', '#fff'] },
  meteor: { n: '메테오', mp: 24, tg: 'enemies', k: 'dmg', p: [135, 165], c: ['#a855f7', '#f97316', '#fff'] },
  zap: { n: '번개', mp: 6, tg: 'enemy', k: 'dmg', p: [45, 58], c: ['#fef08a', '#fff'] }, gigazap: { n: '기가썬더', mp: 14, tg: 'enemies', k: 'dmg', p: [85, 105], c: ['#fef08a', '#60a5fa'] },
  slash: { n: '회심베기', mp: 5, tg: 'enemy', k: 'slash' },
};
const ITEMS = {
  herb: { n: '약초', e: '🌿', price: 10, k: 'heal', p: 35, tg: 'ally' }, herb2: { n: '상급약초', e: '🍀', price: 45, k: 'heal', p: 110, tg: 'ally' },
  ether: { n: '마나 물약', e: '🧪', price: 70, k: 'mp', p: 25, tg: 'ally' }, leaf: { n: '세계수의 잎', e: '🍃', price: 220, k: 'revive', tg: 'dead' },
  wing: { n: '귀환의 날개', e: '🪶', price: 25, k: 'warp', tg: 'none' },
};
const ALL = ['hero', 'mage', 'cleric'];
const EQUIP = {
  stick: { n: '나무 막대', s: 'w', who: ALL, v: 2, price: 10 }, csword: { n: '동검', s: 'w', who: ['hero'], v: 7, price: 60 },
  isword: { n: '철검', s: 'w', who: ['hero'], v: 14, price: 220 }, ssword: { n: '강철검', s: 'w', who: ['hero'], v: 24, price: 700 },
  fsword: { n: '불꽃의 검', s: 'w', who: ['hero'], v: 34, price: 1800 }, rsword: { n: '로토의 검', s: 'w', who: ['hero'], v: 48, price: 4000 },
  ostaff: { n: '참나무 지팡이', s: 'w', who: ['mage', 'cleric'], v: 4, price: 40 }, mstaff: { n: '마도사의 지팡이', s: 'w', who: ['mage'], v: 10, price: 480 },
  sstaff: { n: '현자의 지팡이', s: 'w', who: ['mage', 'cleric'], v: 20, price: 3000 }, mace: { n: '철퇴', s: 'w', who: ['cleric'], v: 8, price: 70 },
  star: { n: '모닝스타', s: 'w', who: ['cleric', 'hero'], v: 18, price: 520 },
  cloth: { n: '여행자의 옷', s: 'a', who: ALL, v: 2, price: 10 }, leather: { n: '가죽 갑옷', s: 'a', who: ALL, v: 5, price: 60 },
  chain: { n: '사슬 갑옷', s: 'a', who: ['hero', 'cleric'], v: 11, price: 240 }, robe: { n: '마법 로브', s: 'a', who: ['mage', 'cleric'], v: 8, price: 180 },
  steel: { n: '강철 갑옷', s: 'a', who: ['hero'], v: 20, price: 800 }, srobe: { n: '현자의 로브', s: 'a', who: ['mage', 'cleric'], v: 16, price: 650 },
  dmail: { n: '용비늘 갑옷', s: 'a', who: ['hero', 'cleric'], v: 30, price: 2500 },
};
const MON = {
  slime: { n: '슬라임', col: '#3b82f6', hp: 8, atk: 9, def: 3, agi: 4, xp: 2, gold: 3 },
  bat: { n: '드라키', e: '🦇', hp: 11, atk: 11, def: 4, agi: 10, xp: 3, gold: 4 },
  shroom: { n: '독버섯', e: '🍄', hp: 15, atk: 12, def: 6, agi: 3, xp: 4, gold: 5, act: [['spore', 0.2]] },
  snake: { n: '독사', e: '🐍', hp: 19, atk: 16, def: 7, agi: 8, xp: 6, gold: 7 },
  ghost: { n: '유령', e: '👻', hp: 21, atk: 17, def: 9, agi: 11, xp: 8, gold: 8, act: [['fire', 0.3]] },
  bslime: { n: '버블슬라임', col: '#22c55e', hp: 23, atk: 19, def: 9, agi: 6, xp: 9, gold: 10 },
  mslime: { n: '메탈슬라임', col: '#cbd5e1', hp: 5, atk: 14, def: 999, agi: 60, xp: 420, gold: 20, metal: 1 },
  skel: { n: '해골병사', e: '💀', hp: 30, atk: 24, def: 13, agi: 8, xp: 13, gold: 12 },
  wolf: { n: '늑대', e: '🐺', hp: 34, atk: 28, def: 12, agi: 15, xp: 22, gold: 12, act: [['double', 0.2]] },
  scorp: { n: '전갈', e: '🦂', hp: 40, atk: 32, def: 21, agi: 9, xp: 28, gold: 18 },
  orc: { n: '오크', e: '👹', hp: 58, atk: 38, def: 17, agi: 8, xp: 38, gold: 26, act: [['smash', 0.2]] },
  dmage: { n: '암흑술사', e: '🦹', hp: 46, atk: 30, def: 15, agi: 13, xp: 45, gold: 32, act: [['firestorm', 0.35], ['healself', 0.1]] },
  zombie: { n: '구울', e: '🧟', hp: 66, atk: 42, def: 19, agi: 5, xp: 46, gold: 22 },
  raptor: { n: '랩터', e: '🦖', hp: 76, atk: 52, def: 25, agi: 16, xp: 72, gold: 36, act: [['double', 0.25]] },
  troll: { n: '트롤', e: '🧌', hp: 110, atk: 58, def: 27, agi: 6, xp: 92, gold: 48, act: [['smash', 0.3]] },
  knight: { n: '암흑기사', e: '🤺', hp: 118, atk: 68, def: 35, agi: 14, xp: 125, gold: 70, act: [['double', 0.25]] },
  demon: { n: '데몬', e: '😈', hp: 126, atk: 70, def: 31, agi: 15, xp: 140, gold: 80, act: [['boom', 0.3]] },
  rdragon: { n: '레드드래곤', e: '🐲', hp: 170, atk: 80, def: 37, agi: 12, xp: 200, gold: 110, act: [['breath', 0.35]] },
  golem: { n: '거대 골렘', e: '🗿', hp: 300, atk: 40, def: 18, agi: 4, xp: 300, gold: 300, boss: 1, act: [['quake', 0.3], ['smash', 0.25]] },
  chimera: { n: '키메라', e: '🦁', hp: 620, atk: 62, def: 28, agi: 18, xp: 900, gold: 800, boss: 1, act: [['breath', 0.35], ['double', 0.25]] },
  lord: { n: '용왕', e: '🧛', hp: 760, atk: 72, def: 34, agi: 20, xp: 0, gold: 0, boss: 1, act: [['boom', 0.35], ['sleepall', 0.12], ['healself', 0.08]] },
  lord2: { n: '용왕 (진의 모습)', e: '🐉', hp: 1600, atk: 92, def: 40, agi: 22, xp: 6000, gold: 0, boss: 1, act: [['breath2', 0.38], ['double', 0.22]] },
};
const ZONES = {
  w1: { m: ['slime', 'slime', 'bat', 'shroom'], n: 2, rare: 0.01 }, w2: { m: ['bat', 'snake', 'shroom', 'bslime', 'ghost'], n: 3, rare: 0.02 },
  cave: { m: ['snake', 'ghost', 'skel', 'bslime', 'bat'], n: 3, rare: 0.03 }, e1: { m: ['wolf', 'scorp', 'orc', 'skel', 'bslime'], n: 3, rare: 0.03 },
  tower: { m: ['orc', 'dmage', 'zombie', 'wolf', 'scorp'], n: 3, rare: 0.04 }, isle: { m: ['troll', 'raptor', 'dmage', 'zombie'], n: 3, rare: 0.03 },
  castle: { m: ['knight', 'demon', 'rdragon', 'troll', 'raptor'], n: 3, rare: 0.04 },
};
const DUNS = {
  cave: { n: '북쪽 동굴', floors: 2, seed: 100, wall: '#5b4030', floor: '#2b211b', light: 170, boss: 'golem', at: 'cave', loot: [['herb', 'g80', 'wing'], ['chain', 'ether', 'g150']] },
  tower: { n: '바람의 탑', floors: 3, seed: 200, wall: '#56657a', floor: '#2a3140', light: 230, boss: 'chimera', at: 'tower', loot: [['herb2', 'g300', 'ether'], ['fsword', 'leaf', 'g400'], ['srobe', 'herb2', 'ether']] },
  castle: { n: '용왕의 성', floors: 3, seed: 300, wall: '#5a1a2a', floor: '#1f1418', light: 200, boss: 'lord', at: 'castle', loot: [['dmail', 'leaf', 'herb2'], ['rsword', 'ether', 'g800'], ['sstaff', 'leaf', 'herb2']] },
};
const TOWN1 = [
  'TTTTTTTTTTTTTTTTTTTTTTTT', 'T~~~.....##########...fT', 'T~~~.....#________#....T', 'T~~.....f#________#..f.T',
  'T........####__####....T', 'T.HHH.........PP...HHH.T', 'T.HHH.........PP...HHH.T', 'T.............PP.......T',
  'T.HHH....PPPPPPPPP.HHH.T', 'T.HHH....P.......P.HHH.T', 'T........P..f.f..P.....T', 'T.f......P.......P..f..T',
  'T.....HHHPPPPPPPPPHHH..T', 'T.....HHH...PP...HHH...T', 'TTTTTTTTTTTTEETTTTTTTTTT',
];
const TOWN2 = [
  'TTTTTTTTTTTTTTTTTTTTTTTT', 'T.....f.........~~~~~~~T', 'T.HHH.....HHH...~~~~~~~T', 'T.HHH.....HHH...======~T',
  'T...........P...~~~~~~~T', 'T.PPPPPPPPPPPPP.~~~~~~~T', 'T.P....f...f..P...~~~~~T', 'T.P.HHH...HHH.P....~~~~T',
  'T.P.HHH...HHH.P.....~~~T', 'T.P...........P.HHH..~~T', 'T.PPPPPPPPPPPPP.HHH...~T', 'T.......PP.............T',
  'T.f.....PP.......f.....T', 'T........PP..........f.T', 'TTTTTTTTEETTTTTTTTTTTTTT',
];
const KP = { t1: [7, 23], cave: [6, 6], gate: [20, 13], t2: [30, 6], tower: [35, 16], cape: [28, 20], castle: [33, 26] };
const MAPS = {};
const WALK = new Set(['.', 'T', ',', 'P', '=', '_', '1', '2', 'c', 't', 'K', '*', 'E', '<', '>', '$', '@', 'f', 'B', 'o']);

GAME({
  title: '드래곤 퀘스트', w: 960, h: 600, bg: '#000', controls: 'dpad+ab', aLabel: '확인', bLabel: '메뉴', noRKey: true,
  help: '방향키/WASD 이동 · Space/Enter 조사·대화·결정 · X/Shift 메뉴·취소\n마을: 왕(저장)·여관(회복·저장)·교회(부활·저장)·상점에서 장비 구입\n필드·던전을 걸으면 몬스터 출현 → 공격·주문·방어·도구·도망\n동굴의 골렘 → 동쪽 관문 → 탑의 키메라 → 무지개 다리 → 용왕을 물리쳐라!',
  init(g) {
    S = { mode: 'title', menus: [], msg: null, t: 0, bt: null, pos: [], prev: [], mvT: 1, dir: 'down', steps: 0, grace: 3, fade: 0, endT: 0 };
    newGame();
    titleMenu(g);
  },
  update(g, dt) {
    S.t += dt;
    if (S.fade > 0) S.fade -= dt;
    if (S.mode === 'end') { S.endT += dt; if (S.endT > 3 && (g.pressed('a') || g.mouse.clicked)) g.win(`용왕을 쓰러뜨렸다! 용사 Lv ${S.party[0].lv}`); return; }
    if (S.msg) return msgUpdate(g, dt);
    if (S.mode === 'battle') return battleUpdate(g, dt);
    if (S.menus.length) return menuUpdate(g);
    if (S.mode === 'map') mapUpdate(g, dt);
    const M = curMap();
    g.info = `${M ? M.name : ''} · 💰${S.gold}G`;
    g.score = S.score;
  },
  draw(g, c) {
    if (S.mode === 'title') drawTitle(g, c);
    else if (S.mode === 'battle') drawBattle(g, c);
    else if (S.mode === 'end') drawEnding(g, c);
    else drawMap(g, c);
    if (S.mode === 'map' && !S.menus.length && !S.msg) drawMiniStatus(g);
    for (const m of S.menus) drawMenu(g, m);
    if (S.msg) drawMsg(g);
    if (S.fade > 0) { c.globalAlpha = Math.min(1, S.fade / 0.3); g.rect(0, 0, g.W, g.H, '#000'); c.globalAlpha = 1; }
  },
});

// ---------- 공통 ----------
function rng(seed) { return function () { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function G() { return window.__game; }
function josa(w, a, b) { const c = w.charCodeAt(w.length - 1); if (c < 0xac00 || c > 0xd7a3) return w + b; return w + ((c - 0xac00) % 28 ? a : b); }
function newGame() {
  S.party = ALL.map((c) => mkMem(c));
  S.gold = 60; S.inv = { herb: 3, wing: 1 }; S.gear = []; S.score = 0;
  S.flags = { key: 0, drop: 0, bridge: 0, golem: 0, chimera: 0, king: 0, chests: {} };
  S.loc = { map: 'town1', x: 12, y: 13 }; S.lastTown = 'town1';
  resetPos();
}
function mkMem(c) { const m = { c, lv: 1, xp: 0, w: c === 'hero' ? 'stick' : c === 'mage' ? 'ostaff' : 'stick', a: 'cloth', sleep: 0 }; m.hp = maxHp(m); m.mp = maxMp(m); return m; }
function stat(m, k) { const b = CLS[m.c][k]; return Math.round(b[0] + b[1] * (m.lv - 1)); }
function maxHp(m) { return stat(m, 'hp'); }
function maxMp(m) { return stat(m, 'mp'); }
function atkOf(m) { return stat(m, 'atk') + EQUIP[m.w].v; }
function defOf(m) { return stat(m, 'def') + EQUIP[m.a].v; }
function agiOf(m) { return stat(m, 'agi'); }
function mname(m) { return CLS[m.c].n; }
function needXp(lv) { return Math.round(9 * Math.pow(lv, 2.2)); }
function spellsOf(m) { return CLS[m.c].sp.filter((s) => s[0] <= m.lv).map((s) => s[1]); }
function alive() { return S.party.filter((m) => m.hp > 0); }
function saveGame(g) {
  g.save('save', { party: S.party, gold: S.gold, inv: S.inv, gear: S.gear, flags: S.flags, loc: S.loc, lastTown: S.lastTown, score: S.score });
}
function loadGame(g) {
  const d = g.load('save', null);
  if (!d) return false;
  Object.assign(S, JSON.parse(JSON.stringify(d)));
  S.party.forEach((m) => (m.sleep = 0));
  resetPos();
  return true;
}
function resetPos() { S.pos = [0, 1, 2].map(() => ({ x: S.loc.x, y: S.loc.y })); S.prev = S.pos.map((p) => ({ ...p })); S.mvT = 1; }
function say(lines, then) { S.msg = { lines: Array.isArray(lines) ? lines : [lines], i: 0, ch: 0, then }; }
function msgUpdate(g, dt) {
  const M = S.msg, line = M.lines[M.i];
  M.ch += dt * 60;
  if (g.pressed('a') || g.pressed('b') || g.mouse.clicked) {
    if (M.ch < line.length) M.ch = line.length;
    else { M.i++; M.ch = 0; g.sfx.click(); if (M.i >= M.lines.length) { S.msg = null; if (M.then) M.then(g); } }
  }
}
function drawMsg(g) {
  const M = S.msg, line = M.lines[M.i] || '';
  box(g, 40, g.H - 150, g.W - 80, 130);
  line.slice(0, Math.floor(M.ch)).split('\n').forEach((l, k) => g.text(l, 70, g.H - 118 + k * 32, 22, '#fff', 'left', '600'));
  if (M.ch >= line.length && Math.floor(S.t * 3) % 2) g.text('▼', g.W - 70, g.H - 40, 16, '#fff');
}
function box(g, x, y, w, h) { g.rrect(x, y, w, h, 10, 'rgba(0,0,12,.9)', '#f1f5f9', 3); }
// ---------- 메뉴 스택 ----------
function pushMenu(m) { m.cur = m.cur || 0; m.cols = m.cols || 1; m.lh = m.lh || 34; S.menus.push(m); }
function popMenu() { S.menus.pop(); }
function clearMenus() { S.menus.length = 0; }
function itemRect(m, i) { const cw = (m.w - 24) / m.cols; return [m.x + 12 + (i % m.cols) * cw, m.y + (m.title ? 44 : 14) + Math.floor(i / m.cols) * m.lh, cw, m.lh]; }
function menuH(m) { return (m.title ? 44 : 14) + Math.ceil(m.items.length / m.cols) * m.lh + 12; }
function menuUpdate(g) {
  const m = S.menus[S.menus.length - 1], n = m.items.length;
  if (!n) { if (g.pressed('b') || g.pressed('a') || g.mouse.clicked) { popMenu(); if (m.onCancel) m.onCancel(g); } return; }
  if (g.pressed('down')) { m.cur = (m.cur + m.cols) % n; g.sfx.move(); }
  if (g.pressed('up')) { m.cur = (m.cur - m.cols + n * 4) % n; g.sfx.move(); }
  if (m.cols > 1 && g.pressed('right')) { m.cur = (m.cur + 1) % n; g.sfx.move(); }
  if (m.cols > 1 && g.pressed('left')) { m.cur = (m.cur - 1 + n) % n; g.sfx.move(); }
  for (let i = 0; i < n; i++) {
    const [x, y, w, h] = itemRect(m, i);
    if (g.mouse.moved && g.inRect(x, y, w, h)) m.cur = i;
    if (g.mouse.clicked && g.inRect(x, y, w, h)) { m.cur = i; return pick(g, m); }
  }
  if (m.onHover) m.onHover(m.items[m.cur]);
  if (g.mouse.clicked && m.target && S.mode === 'battle') {
    const hit = battleClickTarget(g, m.target);
    if (hit >= 0) { const ix = m.items.findIndex((it) => it.v === hit); if (ix >= 0) { m.cur = ix; return pick(g, m); } }
  }
  if (g.pressed('a')) return pick(g, m);
  if (g.pressed('b') || g.mouse.rclick) { if (m.noCancel) return; g.sfx.click(); popMenu(); if (m.onCancel) m.onCancel(g); }
}
function pick(g, m) {
  const it = m.items[m.cur];
  if (it.dis) { g.sfx.beep(180, 0.08); if (it.why) say(it.why); return; }
  g.sfx.click();
  m.onPick(g, it, m.cur);
}
function drawMenu(g, m) {
  const h = menuH(m);
  box(g, m.x, m.y, m.w, h);
  if (m.title) g.text(m.title, m.x + m.w / 2, m.y + 24, 18, '#fde68a');
  m.items.forEach((it, i) => {
    const [x, y, w, hh] = itemRect(m, i);
    if (i === m.cur && S.menus[S.menus.length - 1] === m) { g.rrect(x - 4, y + 2, w, hh - 4, 6, 'rgba(255,255,255,.12)'); g.text('▶', x + 6, y + hh / 2, 14, '#fff'); }
    g.text(it.l, x + 20, y + hh / 2 + 1, m.fs || 18, it.dis ? '#64748b' : it.col || '#fff', 'left', '600');
    if (it.r) g.text(it.r, x + w - 10, y + hh / 2 + 1, (m.fs || 18) - 2, it.dis ? '#64748b' : '#cbd5e1', 'right', '600');
  });
  if (m.info) { const s = m.info(m.items[m.cur]); if (s) { box(g, m.x, m.y + h + 6, m.w, 40); g.text(s, m.x + 14, m.y + h + 26, 15, '#e2e8f0', 'left', '600'); } }
}
// ---------- 타이틀 ----------
function titleMenu(g) {
  const has = !!g.load('save', null);
  const items = [];
  if (has) items.push({ l: '모험의 서 이어하기', v: 'load' });
  items.push({ l: '처음부터 시작', v: 'new' });
  pushMenu({ x: 330, y: 380, w: 300, items, noCancel: true, onPick(g, it) {
    clearMenus();
    if (it.v === 'load' && loadGame(g)) { S.mode = 'map'; S.fade = 0.5; say(['모험의 서를 불러왔다.', `${mapOf(S.loc.map).name}에서 모험을 이어간다!`]); return; }
    newGame(); S.mode = 'map'; S.fade = 0.5;
    say(['여기는 아리아한 마을.', '용왕이 빛의 구슬을 빼앗아 세상이 어둠에 잠기려 한다…', '용사여, 먼저 북쪽 성의 임금님을 찾아가 보자.\n(X: 메뉴 · Space: 대화/조사)']);
  } });
}
function drawTitle(g, c) {
  const gr = c.createLinearGradient(0, 0, 0, g.H); gr.addColorStop(0, '#0f172a'); gr.addColorStop(1, '#3b0764'); c.fillStyle = gr; c.fillRect(0, 0, g.W, g.H);
  for (let i = 0; i < 60; i++) g.circle((i * 157) % g.W, (i * 97) % 300, 1 + (i % 3) * 0.5, `rgba(255,255,255,${0.3 + 0.4 * Math.abs(Math.sin(S.t + i))})`);
  g.emoji('🐉', g.W / 2, 160 + Math.sin(S.t * 2) * 8, 140);
  g.text('드래곤 퀘스트', g.W / 2, 290, 56, '#fde68a');
  g.text('~ 빛의 구슬과 용왕 ~', g.W / 2, 336, 22, '#e9d5ff');
  const d = window.__game.load('save', null);
  if (d) g.text(`기록: 용사 Lv ${d.party[0].lv} · ${d.gold}G`, g.W / 2, 560, 16, '#cbd5e1');
}
// ---------- 맵 ----------
function curMap() { return S.mode === 'title' ? null : mapOf(S.loc.map); }
function mapOf(id) {
  if (MAPS[id]) return MAPS[id];
  let M;
  if (id === 'world') M = buildWorld();
  else if (id === 'town1') M = buildTown(id, '아리아한 마을', TOWN1, 'E', [12, 13]);
  else if (id === 'town2') M = buildTown(id, '리무르달 항구', TOWN2, 'E', [8, 13]);
  else { const k = id.replace(/\d+$/, ''), f = +id.match(/\d+$/)[0]; M = buildDungeon(k, f); }
  return (MAPS[id] = M);
}
function buildTown(id, name, rows, ex, entry) {
  const t = rows.map((r) => r.split(''));
  const M = { id, name, kind: 'town', w: 24, h: 15, t, entry, npcs: [] };
  const N = (x, y, e, n, f) => M.npcs.push({ x, y, e, n, f });
  if (id === 'town1') {
    N(13, 2, '🤴🏻', '임금님', kingTalk); N(11, 3, '💂', '병사', () => say(S.flags.key ? '대지의 열쇠로 동쪽 관문을 열 수 있습니다!' : '북쪽 동굴은 마을 북서쪽 숲 너머에 있습니다.'));
    N(16, 3, '💂', '병사', () => say('숲에서는 몬스터가 자주 나타나니 조심하십시오.'));
    N(3, 7, '🧔', '무기상', () => shopOpen(['csword', 'ostaff', 'mace', 'isword'])); N(20, 7, '👨‍🔧', '방어구상', () => shopOpen(['leather', 'robe', 'chain']));
    N(3, 10, '👩‍🌾', '도구상', () => shopOpen(['herb', 'wing'])); N(20, 10, '👵', '여관 주인', () => innTalk(8)); N(7, 11, '⛪', '신부', churchTalk);
    N(12, 10, '👧', '소녀', () => say(['메탈슬라임을 쓰러뜨리면 엄청난 경험치를 얻는대!', '근데 너무 단단하고 금방 도망가… 회심의 일격이 아니면 힘들걸?']));
    N(21, 11, '👴', '노인', () => say(['마법사의 수면 주문은 강한 적에게도 통한단다.', '성직자의 방어막을 걸면 피해가 줄어들지.']));
    N(4, 2, '🎣', '낚시꾼', () => say('오늘은 한 마리도 못 잡았어… 동쪽 바다엔 큰 놈이 있다던데.'));
  } else {
    N(3, 4, '🧔🏽', '무기상', () => shopOpen(['isword', 'ssword', 'mstaff', 'star'])); N(11, 4, '👷', '방어구상', () => shopOpen(['chain', 'robe', 'steel', 'srobe']));
    N(5, 9, '👩‍🍳', '도구상', () => shopOpen(['herb', 'herb2', 'ether', 'leaf', 'wing'])); N(11, 9, '👴🏻', '여관 주인', () => innTalk(25)); N(17, 11, '⛪', '신부', churchTalk);
    N(21, 3, '🧑‍✈️', '선장', () => say(S.flags.bridge ? '무지개 다리라니… 살다 보니 별일이 다 있군!' : ['남쪽 바다 건너엔 용왕의 섬이 있지.', '동쪽 바람의 탑 꼭대기의 키메라가 무지개 물방울을 지키고 있다더군.', '그걸 남쪽 곶(✨)에서 쓰면 다리가 놓인다나.']));
    N(7, 12, '🧒', '소년', () => say('바람의 탑은 3층까지 있대. 꼭대기에 무시무시한 키메라가!'));
    N(20, 12, '👩', '여인', () => say(['세계수의 잎은 쓰러진 동료를 되살려 준대요.', '용왕은 쓰러뜨려도 진짜 모습을 드러낸다는 소문이…']));
  }
  return M;
}
function buildWorld() {
  const W = 40, H = 30, t = U.grid(W, H, '~'), R = rng(777);
  const fill = (x0, y0, w, h, c) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (t[y] && t[y][x] !== undefined) t[y][x] = c; };
  fill(1, 1, 18, 28, '.'); fill(19, 1, 3, 28, '^'); fill(22, 1, 17, 20, '.'); fill(23, 23, 15, 6, '.');
  for (let k = 0; k < 120; k++) { const x = Math.floor(R() * W), y = Math.floor(R() * H); if (t[y][x] === '.' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => (t[y + dy] || [])[x + dx] === '~')) t[y][x] = '~'; }
  const blob = (cx, cy, r, c) => { for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) if (t[y] && t[y][x] === '.' && (x - cx) ** 2 + (y - cy) ** 2 <= r * r) t[y][x] = c; };
  for (let k = 0; k < 36; k++) blob(R() * W, R() * H, 1 + R() * 2.2, 'T');
  for (let k = 0; k < 16; k++) blob(R() * W, R() * H, 0.8 + R() * 1.3, '^');
  for (let k = 0; k < 9; k++) blob(23 + R() * 14, 9 + R() * 10, 1.4 + R() * 2, ',');
  for (let k = 0; k < 5; k++) blob(24 + R() * 13, 23 + R() * 5, 1 + R() * 1.5, ',');
  for (const [x, y] of Object.values(KP)) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (t[y + dy] && t[y + dy][x + dx] !== '~' && t[y + dy][x + dx] !== undefined && !(x === 20)) t[y + dy][x + dx] = '.';
  const carve = (x0, y0, x1, y1) => { let x = x0, y = y0; const set = () => { if (!'12ctK*X'.includes(t[y][x])) t[y][x] = 'P'; }; set(); while (x !== x1) { x += Math.sign(x1 - x); set(); } while (y !== y1) { y += Math.sign(y1 - y); set(); } };
  carve(7, 22, 7, 13); carve(7, 13, 18, 13); carve(7, 13, 7, 7); carve(7, 7, 6, 7);
  t[13][19] = 'P'; t[13][20] = 'X'; t[13][21] = 'P';
  carve(22, 13, 30, 13); carve(30, 13, 30, 7); carve(30, 13, 35, 13); carve(35, 13, 35, 15); carve(28, 13, 28, 19);
  carve(28, 23, 33, 23); carve(33, 23, 33, 25);
  t[21][28] = '~'; t[22][28] = '~';
  t[23][7] = '1'; t[6][6] = 'c'; t[6][30] = '2'; t[16][35] = 't'; t[20][28] = '*'; t[26][33] = 'K';
  t[24][7] = t[24][7] === '~' ? 'P' : t[24][7]; t[17][35] = t[17][35] === '~' ? 'P' : t[17][35]; t[27][33] = t[27][33] === '~' ? 'P' : t[27][33];
  return { id: 'world', name: '필드', kind: 'world', w: W, h: H, t, npcs: [] };
}
function buildDungeon(k, f) {
  const D = DUNS[k], R = rng(D.seed + f * 7), W = 25, H = 19, t = U.grid(W, H, '#');
  const stack = [[1, 1]]; t[1][1] = '_';
  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const dirs = [[2, 0], [-2, 0], [0, 2], [0, -2]].filter(([dx, dy]) => x + dx > 0 && x + dx < W - 1 && y + dy > 0 && y + dy < H - 1 && t[y + dy][x + dx] === '#');
    if (!dirs.length) { stack.pop(); continue; }
    const [dx, dy] = dirs[Math.floor(R() * dirs.length)];
    t[y + dy / 2][x + dx / 2] = '_'; t[y + dy][x + dx] = '_'; stack.push([x + dx, y + dy]);
  }
  for (let i = 0; i < 26; i++) { const x = 1 + Math.floor(R() * (W - 2)), y = 1 + Math.floor(R() * (H - 2)); if (t[y][x] === '#' && ((t[y][x - 1] === '_' && t[y][x + 1] === '_') || (t[y - 1][x] === '_' && t[y + 1][x] === '_'))) t[y][x] = '_'; }
  for (let i = 0; i < 3; i++) { const cx = 3 + 2 * Math.floor(R() * 10), cy = 3 + 2 * Math.floor(R() * 6); for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 1; x <= cx + 1; x++) if (x > 0 && y > 0 && x < W - 1 && y < H - 1) t[y][x] = '_'; }
  const dist = U.grid(W, H, -1), q = [[1, 1]]; dist[1][1] = 0; let far = [1, 1];
  while (q.length) { const [x, y] = q.shift(); if (dist[y][x] > dist[far[1]][far[0]]) far = [x, y]; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (t[ny][nx] !== '#' && dist[ny][nx] < 0) { dist[ny][nx] = dist[y][x] + 1; q.push([nx, ny]); } } }
  t[1][1] = '<';
  const last = f === D.floors;
  t[far[1]][far[0]] = last ? 'B' : '>';
  const ends = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (t[y][x] === '_' && [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => t[y + dy][x + dx] !== '#').length === 1 && dist[y][x] > 4) ends.push([x, y]);
  for (let i = ends.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [ends[i], ends[j]] = [ends[j], ends[i]]; }
  const chests = {};
  ends.slice(0, 3).forEach(([x, y], i) => { t[y][x] = '$'; chests[x + ',' + y] = D.loot[f - 1][i] || 'g100'; });
  const up = [1, 1], down = far;
  return { id: k + f, name: `${D.n} ${f}층`, kind: 'dun', dun: k, floor: f, w: W, h: H, t, chests, up, down, npcs: [], D };
}
function tileAt(M, x, y) {
  if (x < 0 || y < 0 || x >= M.w || y >= M.h) return M.kind === 'world' ? '~' : '#';
  let c = M.t[y][x];
  if (M.kind === 'world') { if (S.flags.bridge && x === 28 && (y === 21 || y === 22)) c = '='; if (c === 'X' && S.flags.key) c = 'P'; }
  if (M.kind === 'dun') { if (c === '$' && S.flags.chests[M.id + x + ',' + y]) c = 'o'; if (c === 'B' && S.flags[M.D.boss === 'lord' ? 'lord' : M.D.boss]) c = '@'; }
  return c;
}
function walkable(M, x, y) {
  const c = tileAt(M, x, y);
  if (!WALK.has(c) || (M.kind === 'town' && c === 'T')) return false;
  return !M.npcs.some((n) => n.x === x && n.y === y);
}
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
function mapUpdate(g, dt) {
  const M = curMap();
  if (S.mvT < 1) {
    S.mvT = Math.min(1, S.mvT + dt / 0.16);
    if (S.mvT >= 1) arrive(g, M);
    return;
  }
  if (g.pressed('b')) { g.sfx.click(); return fieldMenu(g); }
  if (g.pressed('a')) return interact(g, M);
  let d = null;
  for (const k of ['up', 'down', 'left', 'right']) if (g.held(k)) d = k;
  if (!d && g.mouse.down) {
    const P = S.pos[0], cam = camera(M), mx = g.mouse.x + cam[0], my = g.mouse.y + cam[1], dx = mx - (P.x * TS + TS / 2), dy = my - (P.y * TS + TS / 2);
    if (Math.abs(dx) > TS * 0.6 || Math.abs(dy) > TS * 0.6) d = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
    else if (g.mouse.clicked) return interact(g, M);
  }
  if (!d) return;
  S.dir = d;
  const [dx, dy] = DIRS[d], P = S.pos[0], nx = P.x + dx, ny = P.y + dy;
  if (M.kind === 'world' && tileAt(M, nx, ny) === 'X') { if (g.pressed(d) || g.mouse.clicked) say(['단단한 철문이 길을 막고 있다.', '대지의 열쇠가 필요할 것 같다.']); return; }
  if (!walkable(M, nx, ny)) { if (g.pressed(d)) g.sfx.tone(120, 0.05, 'square', 0.03); return; }
  S.prev = S.pos.map((p) => ({ ...p }));
  for (let i = S.pos.length - 1; i > 0; i--) S.pos[i] = { ...S.pos[i - 1] };
  S.pos[0] = { x: nx, y: ny };
  S.mvT = 0;
}
function arrive(g, M) {
  const P = S.pos[0], c = tileAt(M, P.x, P.y);
  S.loc.x = P.x; S.loc.y = P.y;
  if (M.kind === 'world') {
    if (c === '1') return goMap(g, 'town1', 12, 13);
    if (c === '2') return goMap(g, 'town2', 8, 13);
    if (c === 'c') return goMap(g, 'cave1', 1, 1);
    if (c === 't') return goMap(g, 'tower1', 1, 1);
    if (c === 'K') return goMap(g, 'castle1', 1, 1);
    if (c === '*' && S.flags.drop && !S.flags.bridge) return makeBridge(g);
  }
  if (M.kind === 'town' && c === 'E') { const k = M.id === 'town1' ? KP.t1 : KP.t2; return goMap(g, 'world', k[0], k[1] + 1); }
  if (M.kind === 'dun') {
    if (c === '<') { if (M.floor === 1) { const k = KP[M.D.at]; return goMap(g, 'world', k[0], k[1] + 1); } const U2 = mapOf(M.dun + (M.floor - 1)); return goMap(g, U2.id, U2.down[0], U2.down[1]); }
    if (c === '>') return goMap(g, M.dun + (M.floor + 1), 1, 1);
    if (c === '$') return openChest(g, M, P.x, P.y);
    if (c === 'B') return bossEvent(g, M);
    if (c === '@') { say('마법진이 빛난다… 바깥으로 이동했다!', () => { const k = KP[M.D.at]; goMap(g, 'world', k[0], k[1] + 1); }); return; }
  }
  S.steps++;
  encounterCheck(g, M, c);
}
function goMap(g, id, x, y) {
  S.loc = { map: id, x, y }; resetPos(); S.fade = 0.35; S.grace = 3;
  const M = mapOf(id);
  if (M.kind === 'town') S.lastTown = id;
  g.sfx.tone(300, 0.12, 'triangle', 0.05, 600);
}
function encounterCheck(g, M, c) {
  if (M.kind === 'town') return;
  if (S.grace > 0) { S.grace--; return; }
  let rate = M.kind === 'dun' ? 1 / 11 : c === 'T' ? 1 / 8 : c === ',' ? 1 / 10 : c === 'P' || c === '=' ? 1 / 32 : 1 / 13;
  if (Math.random() >= rate) return;
  let zone;
  if (M.kind === 'dun') zone = M.dun;
  else { const { x, y } = S.loc; zone = y >= 22 ? 'isle' : x >= 22 ? 'e1' : y >= 15 ? 'w1' : 'w2'; }
  const Z = ZONES[zone], n = U.randi(1, Z.n), keys = [];
  if (Math.random() < Z.rare) keys.push('mslime');
  else { const base = U.choice(Z.m); for (let i = 0; i < n; i++) keys.push(Math.random() < 0.6 ? base : U.choice(Z.m)); }
  S.grace = 4;
  startBattle(g, keys, { bg: M.kind === 'dun' ? M.D.floor : zone === 'isle' ? '#3f2d2d' : null });
}
function interact(g, M) {
  const P = S.pos[0], [dx, dy] = DIRS[S.dir], fx = P.x + dx, fy = P.y + dy;
  const n = M.npcs.find((q) => q.x === fx && q.y === fy);
  if (n) { g.sfx.click(); return n.f(g, n); }
  const c = tileAt(M, P.x, P.y);
  if (c === '*' && S.flags.drop && !S.flags.bridge) return makeBridge(g);
  if (c === '*') return say(S.flags.bridge ? '무지개 다리가 남쪽 섬으로 이어져 있다.' : ['바다 건너 남쪽에 검은 성이 보인다…', '무언가 신비한 힘이 있으면 건널 수 있을 것 같다.']);
  const ft = tileAt(M, fx, fy);
  if (ft === 'X') return say('단단한 철문이다. 대지의 열쇠가 필요하다.');
  if (ft === 'H') return say('굳게 닫힌 집이다.');
}
function makeBridge(g) {
  S.flags.bridge = 1; S.score += 500;
  g.sfx.power(); g.shake(4, 0.4);
  say(['무지개 물방울을 하늘 높이 들어 올렸다!', '🌈 바다 위에 무지개 다리가 놓였다!']);
}
function openChest(g, M, x, y) {
  const key = M.id + x + ',' + y;
  if (S.flags.chests[key]) return;
  S.flags.chests[key] = 1;
  const it = M.chests[x + ',' + y];
  g.sfx.coin();
  if (it[0] === 'g' && !ITEMS[it] && !EQUIP[it]) { const v = +it.slice(1); S.gold += v; return say(`보물상자를 열었다! ${v} 골드를 얻었다.`); }
  if (ITEMS[it]) { S.inv[it] = (S.inv[it] || 0) + 1; return say(`보물상자를 열었다! ${ITEMS[it].e} ${josa(ITEMS[it].n, '을', '를')} 얻었다.`); }
  S.gear.push(it); say([`보물상자를 열었다! ⚔️ ${josa(EQUIP[it].n, '을', '를')} 얻었다!`, '메뉴(X) → 장비에서 장착할 수 있다.']);
}
function bossEvent(g, M) {
  const b = M.D.boss;
  if (b === 'golem') say(['쿠구구구… 거대한 바위 덩어리가 움직인다!', '거대 골렘이 앞을 가로막았다!'], () => startBattle(g, ['golem'], { boss: 1, bg: M.D.floor, onWin: () => { S.flags.golem = 1; S.flags.key = 1; S.score += 2000; say(['골렘이 무너져 내렸다!', '🗝️ 대지의 열쇠를 손에 넣었다!', '동쪽 관문을 열 수 있게 되었다. 마법진이 나타났다.']); } }));
  else if (b === 'chimera') say(['바람이 휘몰아친다…', '키메라가 날개를 펼쳤다!'], () => startBattle(g, ['chimera'], { boss: 1, bg: M.D.floor, onWin: () => { S.flags.chimera = 1; S.flags.drop = 1; S.score += 5000; say(['키메라를 쓰러뜨렸다!', '💧 무지개 물방울을 손에 넣었다!', '남쪽 곶(✨)에서 사용하면 다리가 놓인다고 했지…']); } }));
  else say(['용왕: 잘 왔다, 용사여.', '용왕: 세계의 절반을 줄 테니 내 편이 되지 않겠느냐?', '…용사는 단호하게 검을 뽑았다!', '용왕: 어리석은 놈! 죽어라!'], () => startBattle(g, ['lord'], { boss: 1, bg: M.D.floor, onWin: () => {
    say(['용왕: 크윽… 이것으로 끝이라 생각하느냐!', '용왕의 몸이 거대한 용으로 변해 간다!!'], () => startBattle(g, ['lord2'], { boss: 1, bg: '#1a0505', keepHp: 1, onWin: () => {
      S.flags.lord = 1; S.score += 20000; saveGame(g);
      say(['용왕은 비명과 함께 사라졌다…', '✨ 빛의 구슬을 되찾았다! 세상에 빛이 돌아온다!'], () => { S.mode = 'end'; S.endT = 0; g.sfx.win(); });
    } }));
  } }));
}
// ---------- NPC ----------
function kingTalk(g) {
  const lines = !S.flags.king ? ['임금님: 오오, 용사여! 잘 와 주었다.', '용왕이 빛의 구슬을 빼앗아 세상에 몬스터가 들끓고 있다.', '북쪽 동굴의 거대 골렘이 동쪽 관문의 열쇠를 지키고 있다고 한다.', '얼마 안 되지만 여비로 쓰거라. (100G 획득)']
    : !S.flags.key ? ['임금님: 북쪽 동굴의 골렘을 쓰러뜨리고 대지의 열쇠를 얻거라.'] : !S.flags.drop ? ['임금님: 관문 너머 리무르달 항구에서 정보를 모으거라.'] : ['임금님: 무지개 다리를 건너 용왕을 물리쳐 다오!'];
  if (!S.flags.king) { S.flags.king = 1; S.gold += 100; }
  say(lines, () => askYN(g, '모험의 서에 지금까지의 기록을 남기겠느냐?', () => { saveGame(g); g.sfx.coin(); say('기록했다. 용사여, 무사하길 빈다.'); }));
}
function askYN(g, q, yes, no) {
  say(q, () => pushMenu({ x: 700, y: 300, w: 160, items: [{ l: '예', v: 1 }, { l: '아니오', v: 0 }], onPick(g, it) { popMenu(); it.v ? yes(g) : no && no(g); }, onCancel: () => no && no(g) }));
}
function innTalk(g, price) {
  const p = price * (1 + Math.floor(S.party[0].lv / 6));
  askYN(g, `여관에 어서 오세요. 하룻밤 ${p}G 입니다. 묵으시겠어요?`, () => {
    if (S.gold < p) return say('돈이 부족하시네요…');
    S.gold -= p; S.fade = 1.2; g.sfx.tone(392, 0.4, 'triangle', 0.06); g.sfx.tone(523, 0.6, 'triangle', 0.06, null, 0.4);
    S.party.forEach((m) => { if (m.hp > 0) { m.hp = maxHp(m); m.mp = maxMp(m); } });
    saveGame(g);
    say(['편히 쉬셨나요? HP와 MP가 회복되었다!', '(모험의 서에 기록되었다)' + (S.party.some((m) => m.hp <= 0) ? '\n쓰러진 동료는 교회에서 되살릴 수 있어요.' : '')]);
  });
}
function churchTalk(g) {
  const dead = S.party.filter((m) => m.hp <= 0);
  const doSave = () => askYN(g, '모험의 서에 기록하겠습니까?', () => { saveGame(g); g.sfx.coin(); say('기록했습니다. 신의 가호가 있기를.'); });
  if (!dead.length) return say('신부: 어린 양이여, 무엇을 도와드릴까요?', doSave);
  const p = dead.reduce((s, m) => s + m.lv * 10, 0);
  askYN(g, `쓰러진 동료를 되살리려면 ${p}G의 헌금이 필요합니다.`, () => {
    if (S.gold < p) return say('헌금이 부족합니다…', doSave);
    S.gold -= p; dead.forEach((m) => { m.hp = maxHp(m); m.mp = Math.floor(maxMp(m) / 2); }); g.sfx.power();
    say('오오… 신이시여! 동료가 되살아났습니다!', doSave);
  }, doSave);
}
// ---------- 상점 ----------
function shopOpen(list) {
  pushMenu({ x: 60, y: 60, w: 240, title: '어서 오세요!', items: [{ l: '사기', v: 'buy' }, { l: '팔기', v: 'sell' }, { l: '그만두기', v: 'x' }], onPick(g, it) {
    if (it.v === 'x') return popMenu();
    if (it.v === 'buy') buyMenu(list); else sellMenu();
  } });
}
function buyMenu(list) {
  pushMenu({ x: 320, y: 60, w: 400, title: `무엇을 사시겠어요? (💰${S.gold}G)`, items: list.map((k) => ({ l: (ITEMS[k] ? ITEMS[k].e + ' ' : '') + (ITEMS[k] || EQUIP[k]).n, r: (ITEMS[k] || EQUIP[k]).price + 'G', v: k })),
    info: (it) => { const e = EQUIP[it.v]; if (!e) return ITEMS[it.v].k === 'heal' ? `HP ${ITEMS[it.v].p} 회복 · 보유 ${S.inv[it.v] || 0}` : ITEMS[it.v].k === 'mp' ? 'MP 25 회복' : ITEMS[it.v].k === 'revive' ? '쓰러진 동료 부활' : '마지막 마을로 귀환'; return `${e.s === 'w' ? '공격' : '방어'} +${e.v} · ` + e.who.map((w) => CLS[w].n).join('/'); },
    onPick(g, it) {
      const k = it.v, pr = (ITEMS[k] || EQUIP[k]).price;
      if (S.gold < pr) { g.sfx.beep(180, 0.1); return say('돈이 부족하시네요.'); }
      if (ITEMS[k]) { S.gold -= pr; S.inv[k] = (S.inv[k] || 0) + 1; g.sfx.coin(); S.menus[S.menus.length - 1].title = `감사합니다! (💰${S.gold}G)`; return; }
      const e = EQUIP[k], cand = S.party.filter((m) => e.who.includes(m.c));
      pushMenu({ x: 560, y: 260, w: 340, title: '누가 장비할까요?', items: cand.map((m) => { const cur = EQUIP[e.s === 'w' ? m.w : m.a]; return { l: mname(m), r: `${cur.v} → ${e.v}`, v: m, col: e.v > cur.v ? '#86efac' : '#fca5a5' }; }).concat([{ l: '가방에 넣기', v: null }]),
        onPick(g, it2) {
          popMenu(); S.gold -= pr; g.sfx.coin();
          if (it2.v) { const slot = e.s === 'w' ? 'w' : 'a'; S.gear.push(it2.v[slot]); it2.v[slot] = k; say(`${mname(it2.v)}의 ${e.s === 'w' ? '무기' : '방어구'}: ${e.n} 장착!`); }
          else S.gear.push(k);
          S.menus[S.menus.length - 1].title = `감사합니다! (💰${S.gold}G)`;
        } });
    } });
}
function sellMenu() {
  const items = [];
  S.gear.forEach((k, i) => items.push({ l: EQUIP[k].n, r: Math.floor(EQUIP[k].price / 2) + 'G', v: { gear: i } }));
  for (const k in S.inv) if (S.inv[k] > 0) items.push({ l: `${ITEMS[k].e} ${ITEMS[k].n} x${S.inv[k]}`, r: Math.floor(ITEMS[k].price / 2) + 'G', v: { item: k } });
  pushMenu({ x: 320, y: 60, w: 400, title: items.length ? '무엇을 파시겠어요?' : '팔 물건이 없네요', items, onPick(g, it) {
    if (it.v.gear !== undefined) { const k = S.gear.splice(it.v.gear, 1)[0]; S.gold += Math.floor(EQUIP[k].price / 2); }
    else { S.inv[it.v.item]--; S.gold += Math.floor(ITEMS[it.v.item].price / 2); if (!S.inv[it.v.item]) delete S.inv[it.v.item]; }
    g.sfx.coin(); popMenu(); sellMenu();
  } });
}
// ---------- 필드 메뉴 ----------
function fieldMenu(g) {
  pushMenu({ x: 30, y: 30, w: 200, items: [{ l: '상태', v: 'st' }, { l: '주문', v: 'sp' }, { l: '도구', v: 'it' }, { l: '장비', v: 'eq' }, { l: '닫기', v: 'x' }], onPick(g, it) {
    if (it.v === 'x') return popMenu();
    if (it.v === 'st') return pushMenu({ x: 250, y: 30, w: 680, title: `파티 상태 · 💰${S.gold}G`, lh: 44, fs: 16, items: S.party.map((m) => ({ l: statusLine(m), r: `다음 Lv까지 ${needXp(m.lv) - m.xp}`, v: m })), info: (it) => `${mname(it.v)}: ${EQUIP[it.v.w].n} · ${EQUIP[it.v.a].n} · 주문 ${spellsOf(it.v).map((k) => SPELLS[k].n).join(', ') || '없음'}`, onPick: () => popMenu() });
    if (it.v === 'it') return itemMenu(g, false);
    if (it.v === 'sp') return pushMenu({ x: 250, y: 30, w: 220, title: '누가?', items: S.party.map((m) => ({ l: mname(m), v: m, dis: m.hp <= 0 })), onPick(g, it2) { fieldSpell(g, it2.v); } });
    if (it.v === 'eq') return pushMenu({ x: 250, y: 30, w: 220, title: '누구의 장비?', items: S.party.map((m) => ({ l: mname(m), v: m })), onPick(g, it2) { equipMenu(g, it2.v); } });
  } });
}
function statusLine(m) { return `${CLS[m.c].e} ${mname(m)} Lv${m.lv}  HP ${m.hp}/${maxHp(m)}  MP ${m.mp}/${maxMp(m)}  공${atkOf(m)} 방${defOf(m)} 민${agiOf(m)}`; }
function fieldSpell(g, m) {
  const sp = spellsOf(m).filter((k) => ['heal', 'healall', 'fullheal', 'revive'].includes(k));
  if (!sp.length) return say(`${mname(m)}은(는) 필드에서 쓸 수 있는 주문이 없다.`);
  pushMenu({ x: 490, y: 30, w: 260, title: `MP ${m.mp}`, items: sp.map((k) => ({ l: SPELLS[k].n, r: SPELLS[k].mp + '', v: k, dis: m.mp < SPELLS[k].mp, why: 'MP가 부족하다.' })), onPick(g, it) {
    const s = SPELLS[it.v];
    const apply = (t) => { m.mp -= s.mp; g.sfx.power(); const r = applyHealLike(s.k, s.p, t); clearMenus(); say(`${mname(m)}은(는) ${s.n}을(를) 외웠다! ${r}`); };
    if (s.tg === 'allies') return apply(null);
    pickAlly(g, s.tg === 'dead', apply);
  } });
}
function applyHealLike(k, p, t) {
  if (k === 'revive') { t.hp = Math.ceil(maxHp(t) / 2); return `${mname(t)}이(가) 되살아났다!`; }
  if (k === 'mp') { const v = Math.min(maxMp(t) - t.mp, p); t.mp += v; return `${mname(t)}의 MP ${v} 회복!`; }
  const tg = t ? [t] : alive();
  tg.forEach((x) => (x.hp = Math.min(maxHp(x), x.hp + p)));
  return t ? `${mname(t)}의 HP 회복!` : '모두의 HP가 회복되었다!';
}
function pickAlly(g, dead, cb) {
  pushMenu({ x: 560, y: 220, w: 300, title: '누구에게?', items: S.party.map((m, i) => ({ l: mname(m), r: `${m.hp}/${maxHp(m)}`, v: i, dis: dead ? m.hp > 0 : m.hp <= 0, why: dead ? '쓰러지지 않았다.' : '쓰러져 있다.' })), target: 'ally',
    onPick(g, it) { popMenu(); cb(S.party[it.v]); } });
}
function itemMenu(g, inBattle, cb) {
  const ks = Object.keys(S.inv).filter((k) => S.inv[k] > 0 && (!inBattle || ITEMS[k].k !== 'warp'));
  pushMenu({ x: inBattle ? 240 : 250, y: inBattle ? 200 : 30, w: 320, title: ks.length ? '도구' : '도구가 없다', items: ks.map((k) => ({ l: `${ITEMS[k].e} ${ITEMS[k].n}`, r: 'x' + S.inv[k], v: k })), onPick(g, it) {
    const I = ITEMS[it.v];
    if (I.k === 'warp') { clearMenus(); S.inv[it.v]--; const k = S.lastTown === 'town1' ? KP.t1 : KP.t2; g.sfx.jump(); return say('귀환의 날개를 하늘로 던졌다!', () => goMap(g, 'world', k[0], k[1] + 1)); }
    pickAlly(g, I.k === 'revive', (t) => {
      if (inBattle) { popMenu(); return cb(it.v, t); }
      S.inv[it.v]--; if (!S.inv[it.v]) delete S.inv[it.v];
      g.sfx.power(); const r = applyHealLike(I.k, I.p, t); clearMenus(); say(`${I.n}을(를) 사용했다. ${r}`);
    });
  } });
}
function equipMenu(g, m) {
  pushMenu({ x: 490, y: 30, w: 400, title: `${mname(m)}의 장비`, items: [{ l: '무기: ' + EQUIP[m.w].n, r: '+' + EQUIP[m.w].v, v: 'w' }, { l: '방어구: ' + EQUIP[m.a].n, r: '+' + EQUIP[m.a].v, v: 'a' }], onPick(g, it) {
    const slot = it.v, opts = S.gear.map((k, i) => ({ k, i })).filter((o) => EQUIP[o.k].s === slot && EQUIP[o.k].who.includes(m.c));
    pushMenu({ x: 490, y: 190, w: 400, title: opts.length ? '무엇으로 바꿀까?' : '바꿀 장비가 없다', items: opts.map((o) => ({ l: EQUIP[o.k].n, r: `${EQUIP[m[slot]].v} → ${EQUIP[o.k].v}`, v: o, col: EQUIP[o.k].v > EQUIP[m[slot]].v ? '#86efac' : '#fca5a5' })), onPick(g, it2) {
      const old = m[slot]; m[slot] = it2.v.k; S.gear.splice(it2.v.i, 1); S.gear.push(old); g.sfx.coin();
      popMenu(); popMenu(); equipMenu(g, m);
    } });
  } });
}
// ---------- 전투 ----------
function mkFoe(k) { const b = MON[k]; return { k, ...b, max: b.hp, hp: b.hp, sleep: 0, weak: 0, flash: 0, dead: 0, fade: 1, act: b.act || [] }; }
function startBattle(g, keys, o = {}) {
  const foes = keys.map(mkFoe), cnt = {};
  keys.forEach((k) => (cnt[k] = (cnt[k] || 0) + 1));
  const idx = {};
  foes.forEach((f) => { if (cnt[f.k] > 1) { idx[f.k] = (idx[f.k] || 0) + 1; f.name = f.n + ' ' + 'ABC'[idx[f.k] - 1]; } else f.name = f.n; });
  S.mode = 'battle';
  S.bt = { foes, boss: !!o.boss, onWin: o.onWin, bg: o.bg, phase: 'msg', q: [], log: [], wait: 0, cmds: [], who: 0, shield: 0, intro: 0.5, xp: 0, gold: 0, fx: [] };
  clearMenus();
  g.sfx.tone(160, 0.25, 'sawtooth', 0.06, 420);
  if (o.boss) g.shake(8, 0.5);
  S.party.forEach((m) => (m.def = 0));
  S.bt.q.push(foes.length === 1 ? `${josa(foes[0].name, '이', '가')} 나타났다!` : `${foes[0].n} 무리가 나타났다!`, () => { beginRound(g); });
}
function blog(s) { const L = S.bt.log; L.push(s); while (L.length > 4) L.shift(); }
function battleUpdate(g, dt) {
  const B = S.bt;
  B.intro = Math.max(0, B.intro - dt);
  for (const f of B.foes) { f.flash = Math.max(0, f.flash - dt); if (f.dead) f.fade = Math.max(0, f.fade - dt * 2); }
  B.fx = B.fx.filter((x) => (x.t -= dt) > 0);
  for (const m of S.party) m.hit = Math.max(0, (m.hit || 0) - dt);
  if (B.phase === 'cmd') { if (S.menus.length) menuUpdate(g); return; }
  if (B.wait > 0) { B.wait -= dt; if (g.pressed('a') || g.mouse.clicked) B.wait = Math.min(B.wait, 0.05); return; }
  let guard = 0;
  while (B.q.length && guard++ < 30) {
    const s = B.q.shift();
    if (typeof s === 'string') { blog(s); B.wait = 0.62; g.sfx.tone(700, 0.02, 'square', 0.015); return; }
    const r = s(g);
    if (S.bt !== B || S.mode !== 'battle') return;
    if (typeof r === 'string') { blog(r); B.wait = 0.7; return; }
    if (Array.isArray(r)) B.q.unshift(...r);
    if (B.phase === 'cmd') return;
  }
}
function beginRound(g) {
  const B = S.bt;
  B.cmds = []; B.who = -1; B.phase = 'cmd';
  S.party.forEach((m) => (m.def = 0));
  nextCommander(g);
}
function nextCommander(g) {
  const B = S.bt;
  do B.who++; while (B.who < 3 && (S.party[B.who].hp <= 0 || S.party[B.who].sleep > 0));
  if (B.who >= 3) return execRound(g);
  cmdMenu(g);
}
function prevCommander(g) {
  const B = S.bt;
  let w = B.who;
  do w--; while (w >= 0 && (S.party[w].hp <= 0 || S.party[w].sleep > 0));
  if (w < 0) return cmdMenu(g);
  B.who = w; B.cmds = B.cmds.filter((c) => c.m !== S.party[w]);
  cmdMenu(g);
}
function cmdMenu(g) {
  const B = S.bt, m = S.party[B.who];
  clearMenus();
  const first = S.party.findIndex((p) => p.hp > 0 && p.sleep <= 0) === B.who;
  pushMenu({ x: 20, y: 400, w: 200, title: CLS[m.c].e + ' ' + mname(m), lh: 30, fs: 17, noCancel: !B.cmds.length, items: [{ l: '공격', v: 'atk' }, { l: '주문', v: 'sp', dis: !spellsOf(m).length, why: '주문을 모른다.' }, { l: '방어', v: 'def' }, { l: '도구', v: 'it' }, { l: '도망', v: 'run', dis: !first || B.boss, why: B.boss ? '도망칠 수 없다!' : '선두만 지시할 수 있다.' }],
    onPick(g, it) {
      if (it.v === 'atk') return targetFoe(g, (t) => setCmd(g, { k: 'atk', t }));
      if (it.v === 'def') return setCmd(g, { k: 'def' });
      if (it.v === 'run') { clearMenus(); B.cmds = [{ k: 'run', m }]; return execRound(g); }
      if (it.v === 'it') return itemMenu(g, true, (k, t) => setCmd(g, { k: 'item', it: k, t }));
      if (it.v === 'sp') return pushMenu({ x: 240, y: 200, w: 300, title: `MP ${m.mp}/${maxMp(m)}`, lh: 30, fs: 17, items: spellsOf(m).map((k) => ({ l: SPELLS[k].n, r: SPELLS[k].mp + '', v: k, dis: m.mp < SPELLS[k].mp, why: 'MP가 부족하다.' })), onPick(g, it2) {
        const s = SPELLS[it2.v];
        if (s.tg === 'enemy') return targetFoe(g, (t) => setCmd(g, { k: 'sp', s: it2.v, t }));
        if (s.tg === 'ally' || s.tg === 'dead') return pickAlly(g, s.tg === 'dead', (t) => setCmd(g, { k: 'sp', s: it2.v, t }));
        setCmd(g, { k: 'sp', s: it2.v });
      } });
    },
    onCancel(g) { prevCommander(g); } });
}
function targetFoe(g, cb) {
  const B = S.bt, list = B.foes.map((f, i) => ({ f, i })).filter((o) => !o.f.dead);
  if (list.length === 1) return cb(list[0].i);
  pushMenu({ x: 240, y: 200, w: 280, title: '누구를?', lh: 30, fs: 17, target: 'foe', items: list.map((o) => ({ l: o.f.name, v: o.i })), onPick(g, it) { popMenu(); cb(it.v); } });
}
function battleClickTarget(g, kind) {
  if (kind === 'foe') { const B = S.bt; for (let i = 0; i < B.foes.length; i++) { const f = B.foes[i]; if (f.dead) continue; const [x, y, s] = foePos(i); if (U.dist(g.mouse.x, g.mouse.y, x, y) < s * 0.6) return i; } }
  if (kind === 'ally') for (let i = 0; i < 3; i++) if (g.inRect(20 + i * 312, 12, 296, 92)) return i;
  return -1;
}
function setCmd(g, c) {
  const B = S.bt; c.m = S.party[B.who];
  if (c.k === 'def') c.m.def = 1;
  B.cmds.push(c); clearMenus(); nextCommander(g);
}
function execRound(g) {
  const B = S.bt;
  B.phase = 'exec';
  const acts = B.cmds.map((c) => ({ ...c, spd: (c.k === 'def' ? 999 : agiOf(c.m)) * U.rand(0.6, 1) }));
  if (acts.length && acts[0].k === 'run') {
    const ok = Math.random() < (B.foes.some((f) => f.k === 'mslime') ? 0.9 : 0.6);
    B.q.push(`${mname(acts[0].m)}은(는) 도망쳤다!`, () => { if (ok) { g.sfx.jump(); return endBattle(g, true); } return '그러나 돌아서 막혀 버렸다!'; });
  }
  B.foes.forEach((f) => { if (!f.dead) acts.push({ foe: f, spd: f.agi * U.rand(0.6, 1) }); });
  if (acts.length && acts[0].k === 'run') acts.shift();
  acts.sort((a, b) => b.spd - a.spd);
  for (const a of acts) B.q.push(() => (a.foe ? foeAct(g, a.foe) : memberAct(g, a)), () => checkEnd(g));
  B.q.push(() => endRound(g));
}
function endRound(g) {
  const B = S.bt;
  if (B.shield > 0) { B.shield--; if (!B.shield) B.q.push('방어막의 효과가 사라졌다.'); }
  B.q.push(() => beginRound(g));
}
function liveFoes() { return S.bt.foes.filter((f) => !f.dead); }
function foePos(i) { const B = S.bt, n = B.foes.length, f = B.foes[i]; const s = f.boss ? 170 : f.col ? 90 : 100; return [480 + (i - (n - 1) / 2) * 220, f.boss ? 230 : 250, s]; }
function dmgFoe(g, f, d, col) {
  const B = S.bt, i = B.foes.indexOf(f), [x, y] = foePos(i);
  d = Math.max(0, Math.round(d));
  f.hp -= d; f.flash = 0.35;
  g.float(x, y - 40, String(d), col || '#fff', 28);
  g.burst(x, y, col || '#fff', 10, 180, 0.4, 4);
  g.sfx.hit();
  let s = `${f.name}에게 ${d}의 데미지!`;
  if (f.hp <= 0) { f.dead = 1; f.hp = 0; B.xp += f.xp; B.gold += f.gold; s += `\n${josa(f.name, '을', '를')} 쓰러뜨렸다!`; g.sfx.explode(); g.burst(x, y, ['#fff', '#fde047', col || '#94a3b8'], 24, 260, 0.7, 5); }
  return s;
}
function dmgMem(g, m, d) {
  d = Math.max(0, Math.round(d * (m.def ? 0.5 : 1) * (S.bt.shield ? 0.65 : 1)));
  m.hp = Math.max(0, m.hp - d); m.hit = 0.4;
  const i = S.party.indexOf(m);
  g.float(20 + i * 312 + 148, 70, '-' + d, '#f87171', 24);
  g.shake(d > 30 ? 8 : 4, 0.2); g.sfx.hit();
  if (m.hp <= 0) { m.sleep = 0; return `${mname(m)}에게 ${d}의 데미지!\n${mname(m)}은(는) 쓰러졌다…`; }
  return `${mname(m)}에게 ${d}의 데미지!`;
}
function physDmg(atk, def) { return Math.max(U.randi(0, 2), (atk - def / 2) * U.rand(0.85, 1.15)); }
function memberAct(g, a) {
  const B = S.bt, m = a.m;
  if (m.hp <= 0) return null;
  if (m.sleep > 0) { if (Math.random() < 0.45) { m.sleep = 0; return `${mname(m)}은(는) 잠에서 깨어났다!`; } return `${mname(m)}은(는) 잠들어 있다…`; }
  if (a.k === 'def') return `${mname(m)}은(는) 몸을 지키고 있다.`;
  const retarget = (t) => { const f = B.foes[t]; return f && !f.dead ? f : liveFoes()[0]; };
  if (a.k === 'atk') {
    const f = retarget(a.t); if (!f) return null;
    return [`${mname(m)}의 공격!`, () => {
      if (f.dead) return null;
      const crit = Math.random() < (m.c === 'hero' ? 1 / 12 : 1 / 32);
      if (f.metal) { if (crit) return '회심의 일격!!\n' + dmgFoe(g, f, f.hp, '#fde047'); return Math.random() < 0.5 ? dmgFoe(g, f, 1) : `미스! ${f.name}에게 데미지를 줄 수 없다!`; }
      if (!crit && Math.random() < 0.04) { g.sfx.tone(200, 0.08, 'sine', 0.04); return `미스! ${josa(f.name, '이', '가')} 재빨리 피했다!`; }
      const d = crit ? atkOf(m) * U.rand(1.4, 1.6) : physDmg(atkOf(m), f.def * (f.weak ? 0.5 : 1));
      if (crit) g.shake(6, 0.2);
      return (crit ? '회심의 일격!!\n' : '') + dmgFoe(g, f, d, crit ? '#fde047' : '#fff');
    }];
  }
  if (a.k === 'item') {
    const I = ITEMS[a.it];
    if (!S.inv[a.it]) return `${mname(m)}은(는) ${I.n}을(를) 찾지 못했다.`;
    S.inv[a.it]--; if (!S.inv[a.it]) delete S.inv[a.it];
    const t = a.t;
    if (I.k === 'revive' && t.hp > 0) return `${mname(m)}은(는) ${I.n}을(를) 썼지만 효과가 없었다.`;
    if (I.k !== 'revive' && t.hp <= 0) return `${mname(m)}의 ${I.n}… 그러나 ${mname(t)}은(는) 쓰러져 있다.`;
    g.sfx.power(); g.burst(20 + S.party.indexOf(t) * 312 + 148, 60, '#86efac', 14, 120, 0.6, 4);
    return `${mname(m)}은(는) ${I.n}을(를) 사용했다! ` + applyHealLike(I.k, I.p, t);
  }
  if (a.k === 'sp') {
    const s = SPELLS[a.s];
    if (m.mp < s.mp) return `${mname(m)}은(는) ${s.n}을(를) 외우려 했지만 MP가 부족하다!`;
    m.mp -= s.mp;
    const head = `${mname(m)}은(는) ${s.n}을(를) 외웠다!`;
    return [head, () => {
      g.sfx.tone(500, 0.25, 'sine', 0.05, 1200);
      if (s.k === 'dmg' || s.k === 'slash') {
        const tg = s.tg === 'enemies' ? liveFoes() : [retarget(a.t)].filter(Boolean);
        const out = tg.map((f) => {
          if (f.metal) return `${f.name}에게는 주문이 통하지 않는다!`;
          if (s.k === 'slash') { g.shake(6, 0.2); return dmgFoe(g, f, atkOf(m) * U.rand(1.5, 1.8), '#fde047'); }
          const [x, y] = foePos(S.bt.foes.indexOf(f)); g.burst(x, y, s.c, 26, 240, 0.7, 5);
          return dmgFoe(g, f, U.rand(s.p[0], s.p[1]) * (f.boss ? 0.85 : 1), s.c[0]);
        });
        if (s.tg === 'enemies') g.shake(5, 0.3);
        return out;
      }
      if (s.k === 'heal' || s.k === 'revive') { const t = a.t; if (s.k === 'revive' && t && t.hp > 0) return '그러나 효과가 없었다.'; if (t && s.k === 'heal' && t.hp <= 0) return `그러나 ${mname(t)}은(는) 쓰러져 있다.`; g.sfx.power(); return applyHealLike(s.k, s.p, t); }
      if (s.k === 'buff') { S.bt.shield = 4; g.sfx.power(); return '빛의 방어막이 파티를 감쌌다! (받는 피해 감소)'; }
      if (s.k === 'debuff') { liveFoes().forEach((f) => (f.weak = 1)); return '적들의 방어력이 떨어졌다!'; }
      if (s.k === 'sleep') return liveFoes().map((f) => (Math.random() < (f.boss ? 0.25 : f.metal ? 0.3 : 0.7) ? ((f.sleep = 1), `${josa(f.name, '은', '는')} 잠들었다!`) : `${f.name}에게는 효과가 없었다.`));
      return null;
    }];
  }
  return null;
}
function pickMem() { const a = alive(); if (!a.length) return null; return Math.random() < 0.4 && a.includes(S.party[0]) ? S.party[0] : U.choice(a); }
function foeAct(g, f) {
  if (f.dead) return null;
  const B = S.bt;
  if (f.sleep) { if (Math.random() < 0.35) { f.sleep = 0; return `${josa(f.name, '은', '는')} 잠에서 깨어났다!`; } return `${josa(f.name, '은', '는')} 잠들어 있다.`; }
  if (f.metal && Math.random() < 0.45) { f.dead = 1; return `${josa(f.name, '은', '는')} 도망쳤다!`; }
  let act = 'atk';
  for (const [k, p] of f.act) if (Math.random() < p) { act = k; break; }
  const [fx, fy] = foePos(B.foes.indexOf(f));
  const lunge = () => B.fx.push({ k: 'lunge', f, t: 0.25 });
  if (act === 'healself') { const v = Math.round(f.max * 0.22); f.hp = Math.min(f.max, f.hp + v); g.burst(fx, fy, '#86efac', 14, 140, 0.6, 4); return `${josa(f.name, '은', '는')} 회복 주문을 외웠다! HP ${v} 회복`; }
  const all = (lo, hi, msg, col) => [msg, () => { g.burst(480, 140, col, 40, 400, 0.8, 5); g.shake(8, 0.4); g.sfx.explode(); return alive().map((m) => dmgMem(g, m, U.rand(lo, hi))); }];
  if (act === 'firestorm') return all(18, 26, `${josa(f.name, '은', '는')} 화염폭풍을 외웠다!`, ['#f97316', '#ef4444']);
  if (act === 'boom') return all(f.boss ? 50 : 34, f.boss ? 64 : 44, `${josa(f.name, '은', '는')} 대폭발을 외웠다!`, ['#fde047', '#fb923c']);
  if (act === 'breath') return all(f.atk * 0.55, f.atk * 0.65, `${josa(f.name, '은', '는')} 불꽃을 내뿜었다!`, ['#f97316', '#fde047']);
  if (act === 'breath2') return all(64, 78, `${josa(f.name, '은', '는')} 지옥의 업화를 내뿜었다!!`, ['#ef4444', '#7f1d1d', '#fde047']);
  if (act === 'quake') return all(f.atk * 0.45, f.atk * 0.6, `${josa(f.name, '은', '는')} 땅을 내리쳤다! 대지진!`, ['#a16207', '#78716c']);
  if (act === 'sleepall' || act === 'spore') {
    const tg = act === 'spore' ? [pickMem()].filter(Boolean) : alive();
    return [`${josa(f.name, '은', '는')} ${act === 'spore' ? '수면 포자를 뿌렸다!' : '잠의 주문을 외웠다!'}`, () => tg.map((m) => (Math.random() < 0.5 ? ((m.sleep = 1), `${mname(m)}은(는) 잠들어 버렸다!`) : `${mname(m)}은(는) 잠들지 않았다.`))];
  }
  if (act === 'fire') { const m = pickMem(); if (!m) return null; return [`${josa(f.name, '은', '는')} 화염을 외웠다!`, () => dmgMem(g, m, U.rand(10, 15))]; }
  const hits = act === 'double' ? 2 : 1, mult = act === 'smash' ? 1.6 : 1;
  const out = [act === 'smash' ? `${josa(f.name, '은', '는')} 힘을 모아 내리쳤다!` : act === 'double' ? `${josa(f.name, '은', '는')} 연속 공격을 했다!` : `${f.name}의 공격!`];
  for (let h = 0; h < hits; h++) out.push(() => { const m = pickMem(); if (!m) return null; lunge(); if (Math.random() < 0.05) return `${mname(m)}은(는) 재빨리 피했다!`; return dmgMem(g, m, physDmg(f.atk * mult, defOf(m))); });
  return out;
}
function checkEnd(g) {
  const B = S.bt;
  if (!liveFoes().length) {
    B.q.length = 0;
    const live = alive();
    const out = [];
    if (B.xp || B.gold) out.push(`몬스터들을 물리쳤다! 경험치 ${B.xp} · ${B.gold} 골드 획득`);
    else out.push('전투가 끝났다.');
    S.gold += B.gold; S.score += B.xp;
    g.sfx.win();
    for (const m of live) {
      m.xp += B.xp;
      while (m.xp >= needXp(m.lv) && m.lv < 40) {
        const oldSp = spellsOf(m), oh = maxHp(m), om = maxMp(m);
        m.lv++; m.hp += maxHp(m) - oh; m.mp += maxMp(m) - om;
        out.push(`🎉 ${mname(m)}의 레벨이 ${m.lv}(으)로 올랐다!`);
        S.score += 50;
        const ns = spellsOf(m).filter((k) => !oldSp.includes(k));
        ns.forEach((k) => out.push(`✨ ${mname(m)}은(는) ${SPELLS[k].n}을(를) 배웠다!`));
      }
    }
    out.push(() => endBattle(g, false));
    B.q.push(...out);
    return null;
  }
  if (!alive().length) {
    B.q.length = 0;
    B.q.push('파티는 전멸했다…', () => { S.mode = 'map'; S.bt = null; wipe(g); return null; });
    g.sfx.lose();
  }
  return null;
}
function wipe(g) {
  S.gold = Math.floor(S.gold / 2);
  S.party.forEach((m) => { m.hp = maxHp(m); m.mp = maxMp(m); m.sleep = 0; });
  const t = S.lastTown;
  goMap(g, t, t === 'town1' ? 7 : 17, t === 'town1' ? 10 : 12);
  S.fade = 1.5;
  say(['…눈을 떠 보니 교회였다.', '신부: 오오, 용사여! 죽어 버리다니 한심하구나.', `(소지금이 절반이 되었다: ${S.gold}G)`]);
}
function endBattle(g, fled) {
  const B = S.bt;
  S.mode = 'map'; S.bt = null; clearMenus();
  S.party.forEach((m) => { m.sleep = 0; m.def = 0; });
  S.fade = 0.3;
  if (!fled && B.onWin) B.onWin(g);
  return null;
}
// ---------- 그리기 ----------
function camera(M) {
  const P = S.pos[0], Q = S.prev[0], t = S.mvT;
  const px = U.lerp(Q.x, P.x, t) * TS + TS / 2, py = U.lerp(Q.y, P.y, t) * TS + TS / 2;
  return [U.clamp(px - 480, 0, Math.max(0, M.w * TS - 960)), U.clamp(py - 300, 0, Math.max(0, M.h * TS - 600))];
}
function drawMap(g, c) {
  const M = curMap();
  if (!M) return;
  const [cx, cy] = camera(M);
  c.save(); c.translate(-Math.round(cx), -Math.round(cy));
  const x0 = Math.floor(cx / TS), y0 = Math.floor(cy / TS);
  for (let y = y0; y <= y0 + VH + 1; y++) for (let x = x0; x <= x0 + VW + 1; x++) drawTile(g, c, M, x, y);
  for (const n of M.npcs) { g.circle(n.x * TS + 20, n.y * TS + 34, 12, 'rgba(0,0,0,.25)'); g.emoji(n.e, n.x * TS + 20, n.y * TS + 19 + Math.sin(S.t * 3 + n.x) * 1.5, 32); }
  for (let i = S.pos.length - 1; i >= 0; i--) {
    const P = S.pos[i], Q = S.prev[i] || P, x = U.lerp(Q.x, P.x, S.mvT) * TS + 20, y = U.lerp(Q.y, P.y, S.mvT) * TS + 20;
    const m = S.party[i], bob = S.mvT < 1 ? Math.abs(Math.sin(S.mvT * Math.PI)) * 3 : 0;
    g.circle(x, y + 14, 12, 'rgba(0,0,0,.3)');
    g.emoji(m.hp > 0 ? CLS[m.c].e : '⚰️', x, y - bob, i === 0 ? 34 : 30);
  }
  if (M.kind === 'dun') {
    const P = S.pos[0], Q = S.prev[0], px = U.lerp(Q.x, P.x, S.mvT) * TS + 20, py = U.lerp(Q.y, P.y, S.mvT) * TS + 20, r = M.D.light + Math.sin(S.t * 6) * 4;
    const gr = c.createRadialGradient(px, py, r * 0.3, px, py, r);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.94)');
    c.fillStyle = gr; c.fillRect(cx - 10, cy - 10, 980, 620);
  }
  c.restore();
  const nm = M.name;
  g.rrect(g.W - 20 - nm.length * 16 - 20, 12, nm.length * 16 + 20, 32, 8, 'rgba(0,0,0,.55)');
  g.text(nm, g.W - 30, 28, 16, '#fff', 'right');
}
function hash(x, y) { return ((x * 73856093) ^ (y * 19349663)) >>> 0; }
function drawTile(g, c, M, x, y) {
  const px = x * TS, py = y * TS, ch = tileAt(M, x, y), h = hash(x, y);
  if (M.kind === 'dun') {
    const D = M.D;
    if (ch === '#') { g.rect(px, py, TS, TS, D.wall); g.rect(px, py + 30, TS, 10, 'rgba(0,0,0,.35)'); g.rect(px + (h % 20), py + 8, 12, 4, 'rgba(255,255,255,.08)'); return; }
    g.rect(px, py, TS, TS, D.floor); if (h % 5 === 0) g.rect(px + (h % 30), py + ((h >> 3) % 30), 4, 4, 'rgba(255,255,255,.05)');
    if (ch === '<' || ch === '>') { for (let k = 0; k < 4; k++) g.rect(px + 6, py + 6 + k * 8, 28 - (ch === '>' ? k * 5 : (3 - k) * 5), 6, '#a8a29e'); g.text(ch === '>' ? '▼' : '▲', px + 20, py + 20, 14, '#fde68a'); }
    if (ch === '$') g.emoji('🧰', px + 20, py + 20, 30);
    if (ch === 'o') g.rect(px + 8, py + 18, 24, 14, '#78350f');
    if (ch === 'B') { const k = M.D.boss; g.emoji(MON[k].e, px + 20, py + 16 + Math.sin(S.t * 3) * 2, 46); }
    if (ch === '@') { g.ring(px + 20, py + 20, 14 + Math.sin(S.t * 4) * 3, '#a78bfa', 3); g.ring(px + 20, py + 20, 8, '#e9d5ff', 2); }
    return;
  }
  const grass = M.kind === 'town' ? '#5fae4f' : '#4f9a3f';
  const base = () => { g.rect(px, py, TS, TS, grass); if (h % 7 === 0) { g.rect(px + (h % 28) + 4, py + ((h >> 4) % 26) + 6, 3, 6, 'rgba(0,60,0,.35)'); } };
  switch (ch) {
    case '.': base(); break;
    case 'T': base(); g.emoji(M.kind === 'town' ? '🌳' : '🌲', px + 20, py + 18, 36); break;
    case 'f': base(); g.emoji(h % 2 ? '🌷' : '🌼', px + 20, py + 22, 20); break;
    case '^': g.rect(px, py, TS, TS, '#5d7f43'); g.poly([[px + 2, py + 38], [px + 20, py + 4], [px + 38, py + 38]], '#7c7368'); g.poly([[px + 14, py + 15], [px + 20, py + 4], [px + 26, py + 15]], '#f1f5f9'); break;
    case '~': case '=': {
      g.rect(px, py, TS, TS, '#2563eb');
      const w = Math.sin(S.t * 2 + x * 0.7 + y) * 4;
      g.rect(px + 6 + w, py + 12 + (h % 12), 12, 2, 'rgba(255,255,255,.35)');
      if (ch === '=') { g.rect(px, py + 2, TS, 36, '#92633a'); for (let k = 0; k < 5; k++) g.rect(px, py + 4 + k * 7, TS, 2, '#5b3a1e'); if (M.kind === 'world') { c.globalAlpha = 0.45; ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7'].forEach((cl, k) => g.rect(px + k * 8, py, 8, TS, cl)); c.globalAlpha = 1; } }
      break;
    }
    case ',': g.rect(px, py, TS, TS, '#d8b56e'); if (h % 3 === 0) g.circle(px + (h % 30) + 5, py + ((h >> 5) % 30) + 5, 2, '#b8954e'); if (h % 23 === 0) g.emoji('🌵', px + 20, py + 18, 26); break;
    case 'P': case 'E': g.rect(px, py, TS, TS, '#b48b58'); g.rect(px + (h % 30), py + ((h >> 3) % 32), 5, 3, 'rgba(0,0,0,.12)'); break;
    case '_': g.rect(px, py, TS, TS, '#a8a29e'); g.stroke(px, py, TS, TS, 'rgba(0,0,0,.15)', 1); break;
    case '#': g.rect(px, py, TS, TS, '#57534e'); g.rect(px, py + 18, TS, 2, '#44403c'); g.rect(px + 18, py, 2, 18, '#44403c'); break;
    case 'H': { const roof = ['#b91c1c', '#1d4ed8', '#7c2d12', '#15803d'][(Math.floor(x / 3) + y) % 4]; g.rect(px, py, TS, TS, roof); g.rect(px, py + 34, TS, 6, 'rgba(0,0,0,.3)'); for (let k = 0; k < 4; k++) g.rect(px, py + k * 10, TS, 1, 'rgba(0,0,0,.25)'); break; }
    case '1': case '2': base(); g.emoji('🏘️', px + 20, py + 18, 38); break;
    case 'c': g.rect(px, py, TS, TS, '#5d7f43'); g.emoji('🕳️', px + 20, py + 22, 34); break;
    case 't': base(); g.emoji('🗼', px + 20, py + 14, 44); break;
    case 'K': g.rect(px, py, TS, TS, '#3f2d2d'); g.emoji('🏯', px + 20, py + 14, 44); break;
    case 'X': g.rect(px, py, TS, TS, '#7c7368'); for (let k = 0; k < 5; k++) g.rect(px + 4 + k * 8, py + 2, 3, 36, '#1f2937'); g.rect(px, py + 16, TS, 4, '#1f2937'); break;
    case '*': base(); if (!S.flags.bridge) g.emoji('✨', px + 20, py + 20, 22 + Math.sin(S.t * 4) * 4); break;
    default: base();
  }
  if (M.kind === 'world' && y >= 22 && ch !== '~' && ch !== '=') { c.globalAlpha = 0.25; g.rect(px, py, TS, TS, '#450a0a'); c.globalAlpha = 1; }
  if (M.kind === 'town' && ch === 'H') {
    const signs = M.id === 'town1' ? { '3,6': '⚔️', '20,6': '🛡️', '3,9': '🧪', '20,9': '🛏️', '7,13': '⛪' } : { '3,3': '⚔️', '11,3': '🛡️', '5,8': '🧪', '11,8': '🛏️', '17,10': '⛪' };
    if (signs[x + ',' + y]) g.emoji(signs[x + ',' + y], px + 20, py + 20, 28);
  }
}
function drawMiniStatus(g) {
  S.party.forEach((m, i) => {
    const x = 12 + i * 150, y = 12;
    g.rrect(x, y, 140, 50, 8, 'rgba(0,0,12,.75)', 'rgba(255,255,255,.5)', 2);
    g.text(`${CLS[m.c].e} ${mname(m)} Lv${m.lv}`, x + 8, y + 15, 13, m.hp > 0 ? '#fff' : '#f87171', 'left');
    g.text(`HP ${m.hp}  MP ${m.mp}`, x + 8, y + 35, 13, m.hp < maxHp(m) / 4 ? '#fca5a5' : '#cbd5e1', 'left');
  });
}
function drawSlime(g, c, x, y, s, col) {
  c.save(); c.translate(x, y);
  const sq = 1 + Math.sin(S.t * 5) * 0.05;
  c.scale(1 / sq, sq);
  c.beginPath(); c.moveTo(0, -s * 0.55);
  c.bezierCurveTo(s * 0.18, -s * 0.3, s * 0.55, -s * 0.05, s * 0.5, s * 0.25);
  c.quadraticCurveTo(s * 0.45, s * 0.42, 0, s * 0.42);
  c.quadraticCurveTo(-s * 0.45, s * 0.42, -s * 0.5, s * 0.25);
  c.bezierCurveTo(-s * 0.55, -s * 0.05, -s * 0.18, -s * 0.3, 0, -s * 0.55);
  c.fillStyle = col; c.fill(); c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = 2; c.stroke();
  g.circle(-s * 0.18, -s * 0.15, s * 0.06, 'rgba(255,255,255,.6)');
  g.circle(-s * 0.15, s * 0.08, s * 0.09, '#fff'); g.circle(s * 0.15, s * 0.08, s * 0.09, '#fff');
  g.circle(-s * 0.13, s * 0.09, s * 0.045, '#111'); g.circle(s * 0.17, s * 0.09, s * 0.045, '#111');
  c.beginPath(); c.arc(0, s * 0.2, s * 0.12, 0.2, Math.PI - 0.2); c.strokeStyle = '#7f1d1d'; c.lineWidth = 3; c.stroke();
  c.restore();
}
function drawBattle(g, c) {
  const B = S.bt;
  if (!B) return;
  const gr = c.createLinearGradient(0, 0, 0, g.H);
  if (B.bg) { gr.addColorStop(0, '#000'); gr.addColorStop(1, B.bg); } else { gr.addColorStop(0, '#60a5fa'); gr.addColorStop(0.55, '#bfdbfe'); gr.addColorStop(0.56, '#4d7c0f'); gr.addColorStop(1, '#365314'); }
  c.fillStyle = gr; c.fillRect(0, 0, g.W, g.H);
  g.rrect(140, 120, 680, 260, 20, 'rgba(0,0,0,.25)');
  B.foes.forEach((f, i) => {
    if (f.dead && f.fade <= 0) return;
    const [x, y0, s] = foePos(i);
    const lunge = B.fx.find((e) => e.k === 'lunge' && e.f === f);
    const y = y0 + (lunge ? Math.sin((lunge.t / 0.25) * Math.PI) * 18 : 0) + Math.sin(S.t * 2 + i) * 3;
    c.globalAlpha = f.dead ? f.fade : f.flash > 0 && Math.floor(f.flash * 20) % 2 ? 0.3 : 1;
    g.circle(x, y0 + s * 0.48, s * 0.4, 'rgba(0,0,0,.3)');
    if (f.col) drawSlime(g, c, x, y, s * 1.3, f.col); else g.emoji(f.e, x, y, s);
    c.globalAlpha = 1;
    if (!f.dead) {
      if (f.sleep) g.text('💤', x + s * 0.4, y - s * 0.45, 22);
      if (f.boss || B.intro <= 0) { g.rect(x - 50, y0 + s * 0.55 + 6, 100, 6, '#3f0d0d'); g.rect(x - 50, y0 + s * 0.55 + 6, (100 * f.hp) / f.max, 6, '#ef4444'); }
      const tm = S.menus.length && S.menus[S.menus.length - 1].target === 'foe' && S.menus[S.menus.length - 1].items[S.menus[S.menus.length - 1].cur];
      if (tm && tm.v === i) g.text('▼', x, y - s * 0.65 + Math.sin(S.t * 8) * 4, 26, '#fde047');
    }
  });
  S.party.forEach((m, i) => {
    const x = 20 + i * 312, y = 12, cur = B.phase === 'cmd' && B.who === i;
    const col = m.hp <= 0 ? '#7f1d1d' : m.hp < maxHp(m) / 4 ? '#b45309' : '#f1f5f9';
    g.rrect(x, y + (m.hit > 0 ? Math.sin(m.hit * 60) * 3 : 0), 296, 92, 10, cur ? 'rgba(30,41,90,.95)' : 'rgba(0,0,12,.88)', cur ? '#fde047' : col, 3);
    g.emoji(m.hp > 0 ? CLS[m.c].e : '⚰️', x + 30, y + 46, 40);
    g.text(`${mname(m)}  Lv ${m.lv}${m.sleep ? ' 💤' : ''}${m.def ? ' 🛡️' : ''}`, x + 60, y + 22, 17, m.hp > 0 ? '#fff' : '#f87171', 'left');
    g.text(`HP ${m.hp}/${maxHp(m)}`, x + 60, y + 48, 15, m.hp < maxHp(m) / 4 ? '#fca5a5' : '#e2e8f0', 'left');
    g.rect(x + 60, y + 58, 210, 5, '#3f0d0d'); g.rect(x + 60, y + 58, (210 * m.hp) / maxHp(m), 5, '#22c55e');
    g.text(`MP ${m.mp}/${maxMp(m)}`, x + 60, y + 76, 15, '#93c5fd', 'left');
  });
  if (B.shield) g.text(`🛡️ 방어막 ${B.shield}턴`, g.W - 24, 120, 15, '#93c5fd', 'right');
  const inCmd = B.phase === 'cmd';
  const lx = inCmd ? 240 : 20, lw = inCmd ? 700 : 920;
  box(g, lx, 400, lw, 186);
  B.log.forEach((l, k) => { const parts = l.split('\n'); parts.forEach((p, j) => g.text(p, lx + 24, 428 + (k * 2 + j) * 0 + k * 40 + j * 20, parts.length > 1 ? 16 : 19, '#fff', 'left', '600')); });
  if (inCmd && !S.menus.some((m) => m.title === '누구를?')) g.text(`${mname(S.party[B.who])}은(는) 어떻게 할까?`, lx + lw - 20, 570, 15, '#fde68a', 'right');
}
function drawEnding(g, c) {
  const t = S.endT;
  const gr = c.createLinearGradient(0, 0, 0, g.H); gr.addColorStop(0, '#fde68a'); gr.addColorStop(1, '#60a5fa'); c.fillStyle = gr; c.fillRect(0, 0, g.W, g.H);
  g.emoji('🌅', g.W / 2, 140, 120);
  const lines = ['용왕은 쓰러지고, 빛의 구슬은 아리아한으로 돌아왔다.', '세상에 다시 평화가 찾아왔다.', `용사 Lv ${S.party[0].lv} · 마법사 Lv ${S.party[1].lv} · 성직자 Lv ${S.party[2].lv}`, '— 전설은 계속된다 —'];
  lines.forEach((l, i) => { c.globalAlpha = U.clamp(t - i * 0.7, 0, 1); g.text(l, g.W / 2, 280 + i * 50, i === 3 ? 30 : 22, '#1e293b'); });
  c.globalAlpha = 1;
  if (t > 3) g.text('Space / 클릭', g.W / 2, 560, 16, '#334155');
}
