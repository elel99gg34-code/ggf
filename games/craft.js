let S;
const TS = 24, WW = 240, WH = 90, GRAV = 1500, DAY = 200;
// 블록: k 키, n 이름, c 색, o 광석 점 색, h 경도(초), t 필요 곡괭이 등급, d 드롭, ns 통과 가능
const BL = [
  { k: 'air', ns: 1 },
  { k: 'grass', n: '잔디', c: '#8b5a2b', top: '#4ade80', h: 0.45, t: 0, d: 'dirt' },
  { k: 'dirt', n: '흙', c: '#8b5a2b', h: 0.45, t: 0, d: 'dirt' },
  { k: 'stone', n: '돌', c: '#78716c', h: 1.5, t: 1, d: 'stone' },
  { k: 'log', n: '원목', c: '#92400e', h: 0.9, t: 0, d: 'log', ns: 1 },
  { k: 'leaves', n: '나뭇잎', c: '#166534', h: 0.2, t: 0, d: 'leaves', ns: 1 },
  { k: 'coalore', n: '석탄 광석', c: '#78716c', o: '#111', h: 1.7, t: 1, d: 'coal' },
  { k: 'ironore', n: '철 광석', c: '#78716c', o: '#e7b98a', h: 2.3, t: 2, d: 'iron' },
  { k: 'goldore', n: '금 광석', c: '#78716c', o: '#facc15', h: 2.5, t: 3, d: 'gold' },
  { k: 'diaore', n: '다이아 광석', c: '#78716c', o: '#67e8f9', h: 3.2, t: 3, d: 'diamond' },
  { k: 'plank', n: '판자', c: '#d4a056', h: 0.8, t: 0, d: 'plank' },
  { k: 'sand', n: '모래', c: '#fde68a', h: 0.4, t: 0, d: 'sand' },
  { k: 'brick', n: '돌 벽돌', c: '#a16207', h: 2, t: 1, d: 'brick' },
  { k: 'glass', n: '유리', c: 'rgba(186,230,253,.35)', h: 0.3, t: 0, d: 'glass' },
  { k: 'torch', n: '횃불', h: 0.05, t: 0, d: 'torch', ns: 1 },
  { k: 'bedrock', n: '기반암', c: '#1c1917', h: 1e9, t: 9 },
  { k: 'cactus', n: '선인장', c: '#15803d', h: 0.4, t: 0, d: 'cactus', ns: 1, hurt: 1 },
];
const BID = {}; BL.forEach((b, i) => (BID[b.k] = i));
const IT = {
  dirt: { n: '흙', b: 1 }, stone: { n: '돌', b: 1 }, log: { n: '원목', b: 1 }, leaves: { n: '나뭇잎', b: 1 }, plank: { n: '판자', b: 1 }, sand: { n: '모래', b: 1 },
  brick: { n: '돌 벽돌', b: 1 }, glass: { n: '유리', b: 1 }, torch: { n: '횃불', e: '🔥', b: 1 }, cactus: { n: '선인장', e: '🌵', b: 1 },
  stick: { n: '막대기', e: '🥢' }, coal: { n: '석탄', e: '⚫' }, iron: { n: '철', e: '🔩' }, gold: { n: '금', e: '🪙' }, diamond: { n: '다이아', e: '💎' },
  apple: { n: '사과', e: '🍎', food: 4 }, meat: { n: '고기', e: '🍖', food: 3 }, gapple: { n: '황금 사과', e: '🍏', food: 14 }, stew: { n: '버섯 스튜', e: '🥣', food: 8 },
  pick1: { n: '나무 곡괭이', e: '⛏️', tool: 1 }, pick2: { n: '돌 곡괭이', e: '⛏️', tool: 2 }, pick3: { n: '철 곡괭이', e: '⛏️', tool: 3 }, pick4: { n: '다이아 곡괭이', e: '⛏️', tool: 4 },
  sword1: { n: '나무 검', e: '🗡️', sw: 4 }, sword2: { n: '돌 검', e: '🗡️', sw: 6 }, sword3: { n: '철 검', e: '🗡️', sw: 9 }, sword4: { n: '다이아 검', e: '🗡️', sw: 14 },
  armor1: { n: '철 갑옷', e: '🦺', ar: 0.35 }, armor2: { n: '다이아 갑옷', e: '🥋', ar: 0.6 },
};
const TOOLSP = [1, 2, 3.2, 5, 8];
const RECIPES = [
  ['plank', 4, { log: 1 }], ['stick', 4, { plank: 2 }], ['torch', 4, { stick: 1, coal: 1 }],
  ['pick1', 1, { plank: 3, stick: 2 }], ['sword1', 1, { plank: 2, stick: 1 }],
  ['pick2', 1, { stone: 3, stick: 2 }], ['sword2', 1, { stone: 2, stick: 1 }],
  ['pick3', 1, { iron: 3, stick: 2 }], ['sword3', 1, { iron: 2, stick: 1 }], ['armor1', 1, { iron: 6 }],
  ['pick4', 1, { diamond: 3, stick: 2 }], ['sword4', 1, { diamond: 2, stick: 1 }], ['armor2', 1, { diamond: 6 }],
  ['brick', 2, { stone: 2 }], ['glass', 2, { sand: 2, coal: 1 }], ['gapple', 1, { apple: 1, gold: 2 }], ['stew', 1, { meat: 2, apple: 1 }],
];
const ORESC = { coal: 5, iron: 15, gold: 25, diamond: 60 };
const MOB = {
  zombie: { e: '🧟', hp: 22, dmg: 3, sp: 55, sc: 25, burn: 1 },
  skel: { e: '💀', hp: 16, dmg: 2, sp: 50, sc: 30, burn: 1, shoot: 1 },
  spider: { e: '🕷️', hp: 14, dmg: 2, sp: 105, sc: 20 },
  slime: { e: '🟢', hp: 12, dmg: 2, sp: 70, sc: 15, hop: 1 },
};
GAME({
  title: '픽셀 크래프트', w: 960, h: 600, bg: '#7dd3fc', controls: 'dpad+ab', aLabel: '점프', bLabel: '모드',
  help: 'A/D·←→ 이동 · W/Space 점프\n마우스 누르고 있기: 블록 채굴 / 몬스터 공격 · 우클릭: 블록 설치\nX: 채굴⇄건축 모드 전환 (건축 모드에서는 클릭으로 설치)\n1~9 핫바 선택 · E 음식 먹기 · C 제작 창\n원목→판자→막대기→곡괭이! 돌·철·다이아로 도구를 강화하고\n🌙 밤의 몬스터를 막으며 7번째 밤을 버텨라 (횃불로 빛을 밝히기)',
  init(g) {
    S = { inv: { }, sel: 0, mode: 'mine', craft: false, clock: 20, day: 1, mobs: [], arrows: [], mine: null, kills: 0, hurtT: 0, regen: 0, msg: '', msgT: 0, swingT: 0, atkCd: 0 };
    genWorld();
    const px = WW >> 1; S.p = { x: px * TS + 4, y: (S.top[px] - 3) * TS, w: 16, h: 40, vx: 0, vy: 0, hp: 20, onG: false, face: 1, inv: 0, fallV: 0 };
    say('🌳 나무를 캐서(누르고 있기) 판자와 곡괭이를 만들자! (C: 제작)', 6);
  },
  update(g, dt) {
    const P = S.p;
    S.clock += dt; if (S.clock >= DAY) { S.clock -= DAY; S.day++; g.add(300 * (S.day - 1)); say(`☀️ ${S.day}일째 아침! 밤을 버텼다`, 4); g.sfx.win(); if (S.day >= 8) return g.win(`7번의 밤을 버텼다! 처치 ${S.kills}`); }
    S.msgT -= dt; S.atkCd -= dt; S.swingT -= dt; P.inv -= dt; S.hurtT += dt;
    // 입력
    if (g.keyp('KeyC')) { S.craft = !S.craft; g.sfx.click(); }
    if (g.pressed('b')) { S.mode = S.mode === 'mine' ? 'build' : 'mine'; g.sfx.click(); }
    const hb = hotbar();
    for (let i = 0; i < 9; i++) if (g.keyp('Digit' + (i + 1))) S.sel = i;
    if (g.keyp('KeyE')) eat(g, hb[S.sel]);
    // UI 클릭
    let ui = false;
    if (g.mouse.clicked || g.mouse.down) {
      if (g.inRect(250, 548, 460, 48)) { ui = true; if (g.mouse.clicked) { const i = Math.floor((g.mouse.x - 250) / 51); if (i >= 0 && i < 9) { if (S.sel === i && hb[i] && IT[hb[i]].food) eat(g, hb[i]); S.sel = i; g.sfx.click(); } } }
      if (g.inRect(870, 548, 80, 46)) { ui = true; if (g.mouse.clicked) { S.craft = !S.craft; g.sfx.click(); } }
      if (g.inRect(780, 548, 80, 46)) { ui = true; if (g.mouse.clicked) { S.mode = S.mode === 'mine' ? 'build' : 'mine'; g.sfx.click(); } }
      if (S.craft && g.inRect(130, 70, 700, 440)) { ui = true; if (g.mouse.clicked) craftClick(g); }
    }
    // 이동
    const acc = P.onG ? 1400 : 800, maxv = 150;
    if (g.left) { P.vx = Math.max(-maxv, P.vx - acc * dt); P.face = -1; } else if (g.right) { P.vx = Math.min(maxv, P.vx + acc * dt); P.face = 1; } else P.vx *= P.onG ? 0.75 : 0.95;
    if ((g.pressed('a') || g.pressed('up')) && P.onG) { P.vy = -470; g.sfx.jump(); }
    const vyBefore = P.vy;
    moveEnt(P, dt);
    if (P.landed && vyBefore > 720) { const d = Math.floor((vyBefore - 700) / 60) + 1; hurtP(g, d, 0); say('낙하 피해!', 1.2); }
    if (P.y > WH * TS) hurtP(g, 99, 0);
    // 선인장
    if (touches(P, 'cactus') && P.inv <= 0) hurtP(g, 1, -P.face * 120);
    // 회복
    S.regen += dt; if (S.hurtT > 5 && S.regen > 3 && P.hp < 20) { S.regen = 0; P.hp++; }
    // 카메라
    const cx = U.clamp(P.x + P.w / 2 - 480, 0, WW * TS - 960), cy = U.clamp(P.y + P.h / 2 - 280, 0, WH * TS - 600);
    S.cx = S.cx === undefined ? cx : U.lerp(S.cx, cx, Math.min(1, dt * 8)); S.cy = S.cy === undefined ? cy : U.lerp(S.cy, cy, Math.min(1, dt * 8));
    // 마우스 → 월드
    const wx = g.mouse.x + S.cx, wy = g.mouse.y + S.cy, tx = Math.floor(wx / TS), ty = Math.floor(wy / TS);
    const pcx = P.x + P.w / 2, pcy = P.y + 12;
    const inReach = Math.hypot(tx * TS + 12 - pcx, ty * TS + 12 - pcy) <= TS * 5.5;
    S.hover = !S.craft && !ui && inReach ? { tx, ty } : null;
    if (!S.craft && !ui) {
      const placing = g.mouse.rclick || (S.mode === 'build' && g.mouse.clicked);
      const mob = S.mobs.find((m) => wx > m.x - 6 && wx < m.x + m.w + 6 && wy > m.y - 6 && wy < m.y + m.h + 6);
      if (g.mouse.down && mob && Math.hypot(mob.x + mob.w / 2 - pcx, mob.y + mob.h / 2 - pcy) < TS * 4.5) { if (S.atkCd <= 0) attack(g, mob); S.mine = null; }
      else if (placing && inReach) place(g, tx, ty, hb[S.sel]);
      else if (g.mouse.down && S.mode === 'mine' && inReach) mineStep(g, tx, ty, dt);
      else S.mine = null;
    } else S.mine = null;
    // 몹
    spawnMobs(g, dt);
    for (const m of S.mobs) mobStep(g, m, dt);
    S.mobs = S.mobs.filter((m) => !m.dead);
    for (const a of S.arrows) {
      a.x += a.vx * dt; a.y += a.vy * dt; a.vy += 200 * dt; a.t -= dt;
      if (solidAt(Math.floor(a.x / TS), Math.floor(a.y / TS)) || a.t <= 0) a.dead = true;
      else if (a.x > P.x && a.x < P.x + P.w && a.y > P.y && a.y < P.y + P.h) { a.dead = true; hurtP(g, 2, Math.sign(a.vx) * 160); }
    }
    S.arrows = S.arrows.filter((a) => !a.dead);
    // 정보
    const night = isNight();
    g.info = `${S.day}일째 ${night ? '🌙 밤' : '☀️ 낮'} · ❤️${P.hp} · 처치 ${S.kills} · 몬스터 ${S.mobs.length}`;
  },
  draw(g, c) {
    const L = daylight();
    const sky = `rgb(${Math.round(20 + 105 * L)},${Math.round(25 + 186 * L)},${Math.round(60 + 192 * L)})`;
    g.rect(0, 0, 960, 600, sky);
    // 해·달
    const ang = (S.clock / DAY) * Math.PI * 2 - Math.PI / 2;
    g.emoji(L > 0.4 ? '☀️' : '🌙', 480 + Math.cos(ang - Math.PI / 2) * 380, 280 + Math.sin(ang - Math.PI / 2) * 240, 50);
    if (L < 0.5) for (let i = 0; i < 40; i++) g.circle((i * 97) % 960, (i * 53) % 260, 1.2, `rgba(255,255,255,${(0.5 - L) * 1.6})`);
    const cx = Math.round(S.cx), cy = Math.round(S.cy);
    // 산 배경
    for (let i = 0; i < 12; i++) { const bx = ((i * 180 - cx * 0.3) % 2160 + 2160) % 2160 - 200; g.poly([[bx, 420 - cy * 0.3 + 200], [bx + 140, 220 - cy * 0.3 + 200 - (i % 3) * 40], [bx + 280, 420 - cy * 0.3 + 200]], `rgba(30,64,90,${0.35 + L * 0.2})`); }
    const x0 = Math.floor(cx / TS), y0 = Math.floor(cy / TS), x1 = Math.min(WW - 1, x0 + 41), y1 = Math.min(WH - 1, y0 + 26);
    // 동굴 배경 (지하 공기)
    for (let x = x0; x <= x1; x++) { const t = S.top[x]; const sy = Math.max(y0, t + 3); if (sy <= y1) g.rect(x * TS - cx, sy * TS - cy, TS, (y1 - sy + 1) * TS, '#3b2f2a'); }
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const id = S.w[y][x]; if (!id) continue; drawTile(g, c, id, x * TS - cx, y * TS - cy, x, y);
    }
    // 채굴 진행
    if (S.mine) { const k = S.mine.p; const sx = S.mine.tx * TS - cx, sy = S.mine.ty * TS - cy; c.fillStyle = `rgba(0,0,0,${0.15 + k * 0.5})`; c.fillRect(sx, sy, TS, TS); g.line(sx + 4, sy + 4, sx + 4 + 16 * k, sy + 4 + 16 * k, '#000', 2); g.line(sx + 20, sy + 6, sx + 20 - 14 * k, sy + 6 + 12 * k, '#000', 2); }
    if (S.hover) g.stroke(S.hover.tx * TS - cx, S.hover.ty * TS - cy, TS, TS, S.mode === 'build' ? '#60a5fa' : '#fff', 2);
    // 몹
    for (const m of S.mobs) {
      c.save(); c.translate(m.x + m.w / 2 - cx, m.y + m.h / 2 - cy); if (m.vx < 0) c.scale(-1, 1); if (m.flash > 0) c.filter = 'brightness(2.5)';
      g.emoji(MOB[m.k].e, 0, m.hop ? 4 : 0, m.k === 'spider' ? 30 : m.k === 'slime' ? 26 : 38); c.restore();
      if (m.burning) g.emoji('🔥', m.x + m.w / 2 - cx, m.y - 4 - cy, 16);
      if (m.hp < m.max) { g.rect(m.x - cx - 2, m.y - cy - 10, m.w + 4, 4, '#000'); g.rect(m.x - cx - 2, m.y - cy - 10, (m.w + 4) * m.hp / m.max, 4, '#ef4444'); }
    }
    for (const a of S.arrows) g.line(a.x - cx, a.y - cy, a.x - cx - a.vx * 0.04, a.y - cy - a.vy * 0.04, '#e7e5e4', 2);
    // 플레이어
    const P = S.p;
    if (!(P.inv > 0 && Math.floor(g.time * 20) % 2)) {
      c.save(); c.translate(P.x + P.w / 2 - cx, P.y + P.h / 2 - cy); if (P.face < 0) c.scale(-1, 1);
      g.rect(-7, -20, 14, 14, '#f5c99b'); g.rect(-8, -22, 16, 5, '#5b3a1a'); g.rect(2, -16, 3, 3, '#1e3a8a');
      g.rect(-7, -6, 14, 14, armor() ? (armor() > 0.5 ? '#67e8f9' : '#d6d3d1') : '#0ea5e9'); g.rect(-6, 8, 5, 12, '#1e3a8a'); g.rect(1, 8, 5, 12, '#1e3a8a');
      const sw = S.swingT > 0 ? -1.2 + (0.25 - S.swingT) * 8 : Math.sin(g.time * 10) * (Math.abs(P.vx) > 20 ? 0.6 : 0);
      c.save(); c.translate(4, -2); c.rotate(sw); g.rect(0, -2, 4, 12, '#f5c99b'); const tool = S.mode === 'build' ? null : (S.mine || S.swingT > 0) ? 1 : null; if (tool) g.emoji(S.swingT > 0 ? '🗡️' : '⛏️', 4, 14, 16); c.restore();
      c.restore();
    }
    // 빛 (어둠 오버레이)
    const lights = [];
    for (let y = Math.max(0, y0 - 7); y <= Math.min(WH - 1, y1 + 7); y++) for (let x = Math.max(0, x0 - 7); x <= Math.min(WW - 1, x1 + 7); x++) if (S.w[y][x] === BID.torch) lights.push(x, y);
    const ptx = (P.x + P.w / 2) / TS, pty = (P.y + 14) / TS;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const depth = y - S.top[x]; let l = depth < 0 ? L : L * Math.max(0, 1 - depth / 5);
      const dp = Math.hypot(x + 0.5 - ptx, y + 0.5 - pty); l = Math.max(l, 0.75 - dp / 7);
      for (let i = 0; i < lights.length; i += 2) { const d = Math.hypot(x - lights[i], y - lights[i + 1]); if (d < 8) l = Math.max(l, 1 - d / 8); }
      if (l < 0.97) { c.fillStyle = `rgba(0,0,8,${(1 - Math.max(0, l)) * 0.94})`; c.fillRect(x * TS - cx, y * TS - cy, TS, TS); }
    }
    // HUD
    for (let i = 0; i < 10; i++) g.emoji(P.hp >= (i + 1) * 2 ? '❤️' : P.hp >= i * 2 + 1 ? '💔' : '🖤', 20 + i * 24, 20, 20);
    if (armor()) g.text(`🛡️ ${Math.round(armor() * 100)}%`, 270, 20, 15, '#e5e7eb', 'left');
    g.rrect(780, 8, 170, 30, 8, 'rgba(0,0,0,.45)');
    g.text(`${isNight() ? '🌙' : '☀️'} ${S.day}일째 · 밤까지 ${isNight() ? '-' : Math.max(0, Math.ceil(128 - S.clock)) + '초'}`, 865, 23, 14, '#fff');
    g.text(`⛏ 곡괭이 ${['맨손', '나무', '돌', '철', '다이아'][pickTier()]} · 🗡 ${swordDmg()}`, 865, 52, 13, '#fde68a');
    const hb = hotbar();
    g.rrect(244, 544, 472, 54, 10, 'rgba(0,0,0,.5)');
    for (let i = 0; i < 9; i++) {
      const x = 250 + i * 51, k = hb[i];
      g.rrect(x, 548, 46, 46, 6, S.sel === i ? 'rgba(253,224,71,.35)' : 'rgba(255,255,255,.12)', S.sel === i ? '#fde047' : '#555', 2);
      if (k) { drawItem(g, c, k, x + 23, 569, 26); g.text(S.inv[k], x + 40, 586, 12, '#fff', 'right'); }
      g.text(i + 1, x + 6, 556, 9, '#aaa');
    }
    if (hb[S.sel]) g.text(IT[hb[S.sel]].n + (IT[hb[S.sel]].food ? ' (E/다시 클릭: 먹기)' : ''), 480, 534, 13, '#fff');
    g.rrect(780, 548, 80, 46, 8, S.mode === 'build' ? '#2563eb' : '#57534e', '#fff', 1); g.text(S.mode === 'build' ? '🧱 건축' : '⛏ 채굴', 820, 571, 15, '#fff');
    g.rrect(870, 548, 80, 46, 8, S.craft ? '#ca8a04' : '#57534e', '#fff', 1); g.text('🛠 제작', 910, 571, 15, '#fff');
    if (S.msgT > 0) { c.globalAlpha = Math.min(1, S.msgT); g.rrect(180, 70, 600, 36, 10, 'rgba(0,0,0,.6)'); g.text(S.msg, 480, 88, 16, '#fde68a'); c.globalAlpha = 1; }
    if (S.craft) drawCraft(g, c);
    if (P.inv > 0.3) { c.fillStyle = `rgba(220,38,38,${(P.inv - 0.3) * 0.5})`; c.fillRect(0, 0, 960, 600); }
  },
});
function say(m, t) { S.msg = m; S.msgT = t || 3; }
function daylight() { const t = S.clock; if (t < 120) return 1; if (t < 135) return U.lerp(1, 0.08, (t - 120) / 15); if (t < 185) return 0.08; return U.lerp(0.08, 1, (t - 185) / 15); }
function isNight() { return S.clock >= 128 && S.clock < 192; }
function genWorld() {
  S.w = U.grid(WW, WH, 0); S.top = new Array(WW).fill(0);
  const p = [U.rand(0, 6), U.rand(0, 6), U.rand(0, 6), U.rand(0, 6)];
  for (let x = 0; x < WW; x++) {
    const h = Math.round(32 + 6 * Math.sin(x * 0.045 + p[0]) + 3 * Math.sin(x * 0.12 + p[1]) + 1.4 * Math.sin(x * 0.29 + p[2]));
    const desert = Math.sin(x * 0.025 + p[3]) > 0.62, dd = 3 + (x * 7 % 3);
    for (let y = h; y < WH; y++) {
      let b = y === h ? (desert ? 'sand' : 'grass') : y < h + dd + 1 ? (desert ? 'sand' : 'dirt') : 'stone';
      if (y >= WH - 1 || (y >= WH - 3 && Math.random() < 0.5)) b = 'bedrock';
      S.w[y][x] = BID[b];
    }
    if (desert && Math.random() < 0.08 && x > 2) for (let k = 1; k <= U.randi(1, 3); k++) S.w[h - k][x] = BID.cactus;
  }
  // 동굴
  for (let i = 0; i < 34; i++) {
    let x = U.rand(5, WW - 5), y = U.rand(42, WH - 6), a = U.rand(0, 6.28); const len = U.randi(40, 130), r0 = U.rand(1, 2.3);
    if (i < 4) y = 36; // 지표 근처 입구
    for (let s = 0; s < len; s++) {
      a += U.rand(-0.5, 0.5); x += Math.cos(a); y += Math.sin(a) * 0.6; const r = r0 + Math.sin(s * 0.2);
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const X = Math.round(x + dx), Y = Math.round(y + dy); if (X < 1 || X >= WW - 1 || Y < 30 || Y >= WH - 3) continue; if (dx * dx + dy * dy <= r * r && S.w[Y][X] !== BID.bedrock) S.w[Y][X] = 0; }
    }
  }
  // 광석
  const ore = (k, n, ymin, size) => { for (let i = 0; i < n; i++) { let x = U.randi(1, WW - 2), y = U.randi(ymin, WH - 4); for (let s = 0; s < size; s++) { if (S.w[y] && S.w[y][x] === BID.stone) S.w[y][x] = BID[k]; x += U.randi(-1, 1); y += U.randi(-1, 1); x = U.clamp(x, 1, WW - 2); y = U.clamp(y, 1, WH - 4); } } };
  ore('coalore', 150, 34, 6); ore('ironore', 90, 44, 5); ore('goldore', 45, 58, 4); ore('diaore', 30, 70, 3);
  for (let x = 0; x < WW; x++) calcTop(x);
  // 나무
  let last = -5;
  for (let x = 3; x < WW - 3; x++) {
    const t = S.top[x];
    if (S.w[t][x] === BID.grass && x - last > 4 && Math.random() < 0.18) {
      last = x; const hh = U.randi(4, 6);
      for (let k = 1; k <= hh; k++) S.w[t - k][x] = BID.log;
      for (let dy = -2; dy <= 1; dy++) for (let dx = -2; dx <= 2; dx++) { if (Math.abs(dx) + Math.abs(dy) > 3) continue; const Y = t - hh + dy, X = x + dx; if (!S.w[Y][X]) S.w[Y][X] = BID.leaves; }
    }
  }
  for (let x = 0; x < WW; x++) calcTop(x);
}
function calcTop(x) { let y = 0; while (y < WH - 1 && BL[S.w[y][x]].ns) y++; S.top[x] = y; }
function solidAt(x, y) { if (x < 0 || x >= WW || y >= WH) return true; if (y < 0) return false; return !BL[S.w[y][x]].ns; }
function collide(e) {
  const x0 = Math.floor(e.x / TS), x1 = Math.floor((e.x + e.w - 0.01) / TS), y0 = Math.floor(e.y / TS), y1 = Math.floor((e.y + e.h - 0.01) / TS);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (solidAt(x, y)) return true;
  return false;
}
function touches(e, k) {
  const x0 = Math.floor(e.x / TS), x1 = Math.floor((e.x + e.w) / TS), y0 = Math.floor(e.y / TS), y1 = Math.floor((e.y + e.h) / TS);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (y >= 0 && y < WH && x >= 0 && x < WW && S.w[y][x] === BID[k]) return true;
  return false;
}
function moveEnt(e, dt) {
  e.vy = Math.min(e.vy + GRAV * dt, 900); e.landed = false; e.wall = false;
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(e.vx), Math.abs(e.vy)) * dt / 8)), h = dt / n;
  const was = e.onG; e.onG = false;
  for (let i = 0; i < n; i++) {
    e.x += e.vx * h;
    if (collide(e)) { if (e.vx > 0) e.x = Math.floor((e.x + e.w) / TS) * TS - e.w - 0.01; else e.x = (Math.floor(e.x / TS) + 1) * TS + 0.01; e.vx = 0; e.wall = true; }
    e.y += e.vy * h;
    if (collide(e)) { if (e.vy > 0) { e.y = Math.floor((e.y + e.h) / TS) * TS - e.h - 0.01; e.onG = true; if (!was) e.landed = true; } else e.y = (Math.floor(e.y / TS) + 1) * TS + 0.01; e.vy = 0; }
  }
  e.x = U.clamp(e.x, 0, WW * TS - e.w);
}
function hotbar() {
  const order = ['torch', 'plank', 'dirt', 'stone', 'brick', 'log', 'sand', 'glass', 'leaves', 'cactus', 'apple', 'meat', 'stew', 'gapple'];
  return order.filter((k) => S.inv[k] > 0).slice(0, 9);
}
function pickTier() { for (let t = 4; t >= 1; t--) if (S.inv['pick' + t]) return t; return 0; }
function swordDmg() { for (let t = 4; t >= 1; t--) if (S.inv['sword' + t]) return IT['sword' + t].sw; return 2; }
function armor() { return S.inv.armor2 ? IT.armor2.ar : S.inv.armor1 ? IT.armor1.ar : 0; }
function give(k, n) { S.inv[k] = (S.inv[k] || 0) + n; }
function eat(g, k) {
  if (!k || !IT[k].food) return;
  if (S.p.hp >= 20) { say('배가 부르다 (체력 가득)', 1.5); return; }
  S.inv[k]--; S.p.hp = Math.min(20, S.p.hp + IT[k].food); g.sfx.coin(); g.float(480, 300, '❤️+' + IT[k].food, '#4ade80');
}
function mineStep(g, tx, ty, dt) {
  if (tx < 0 || ty < 0 || tx >= WW || ty >= WH) return;
  const id = S.w[ty][tx]; if (!id) { S.mine = null; return; }
  const B = BL[id], tier = pickTier();
  if (B.t > tier) { if (!S.mine || S.mine.tx !== tx || S.mine.ty !== ty) say(B.t > 4 ? '기반암은 부술 수 없다!' : `${B.n}: 더 좋은 곡괭이가 필요해! (${['', '나무', '돌', '철'][B.t]} 곡괭이 이상)`, 2); S.mine = { tx, ty, p: 0 }; return; }
  if (!S.mine || S.mine.tx !== tx || S.mine.ty !== ty) S.mine = { tx, ty, p: 0, snd: 0 };
  const sp = B.t === 0 && (id === BID.log || id === BID.plank) ? Math.max(1, TOOLSP[tier] * 0.7) : TOOLSP[tier];
  S.mine.p += dt * sp / B.h; S.mine.snd -= dt;
  if (S.mine.snd <= 0) { S.mine.snd = 0.22; g.sfx.tone(140 + Math.random() * 60, 0.04, 'square', 0.03); S.swing = 1; }
  if (S.mine.p >= 1) {
    S.w[ty][tx] = 0; calcTop(tx);
    const px = tx * TS + 12 - S.cx, py = ty * TS + 12 - S.cy;
    g.burst(px, py, B.c && B.c.startsWith('#') ? B.c : '#d6d3d1', 10, 120, 0.4);
    g.sfx.pop();
    let d = B.d;
    if (id === BID.leaves) { d = Math.random() < 0.15 ? 'apple' : Math.random() < 0.3 ? 'leaves' : null; }
    if (d) { give(d, 1); g.float(px, py - 10, `+1 ${IT[d].n}`, '#fff', 14); }
    if (ORESC[d]) g.add(ORESC[d]);
    if (d === 'log' && !S.inv.pick1 && S.inv.log === 1) say('C를 눌러 제작 창 → 판자 → 막대기 → 나무 곡괭이!', 6);
    if (d === 'diamond' && !S.saidDia) { S.saidDia = 1; say('💎 다이아몬드 발견!', 3); }
    // 위의 나무/선인장 연쇄 붕괴
    if (id === BID.log || id === BID.cactus) for (let y = ty - 1; y >= 0 && S.w[y][tx] === id; y--) { S.w[y][tx] = 0; give(BL[id].d, 1); }
    calcTop(tx);
    S.mine = null;
  }
}
function place(g, tx, ty, k) {
  if (!k || !IT[k].b || !S.inv[k]) { if (k && IT[k].food) eat(g, k); return; }
  if (tx < 0 || ty < 0 || tx >= WW || ty >= WH || S.w[ty][tx]) return;
  const id = BID[k], r = { x: tx * TS, y: ty * TS, w: TS, h: TS }, P = S.p;
  if (!BL[id].ns && (U.rectHit(r, P) || S.mobs.some((m) => U.rectHit(r, m)))) return;
  const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => ty + dy >= 0 && ty + dy < WH && tx + dx >= 0 && tx + dx < WW && S.w[ty + dy][tx + dx]);
  if (!nb) { say('다른 블록 옆에만 놓을 수 있어', 1.2); return; }
  S.w[ty][tx] = id; S.inv[k]--; calcTop(tx); g.sfx.drop();
}
function attack(g, m) {
  S.atkCd = 0.38; S.swingT = 0.25;
  const d = swordDmg(); m.hp -= d; m.flash = 0.12; m.vx = Math.sign(m.x - S.p.x) * 260; m.vy = -220;
  g.sfx.hit(); g.float(m.x + m.w / 2 - S.cx, m.y - S.cy - 6, '-' + d, '#fca5a5', 16);
  if (m.hp <= 0) killMob(g, m);
}
function killMob(g, m) {
  m.dead = true; S.kills++; g.add(MOB[m.k].sc, m.x - S.cx, m.y - S.cy);
  g.burst(m.x + m.w / 2 - S.cx, m.y + m.h / 2 - S.cy, ['#a3a3a3', '#ef4444'], 14, 160, 0.5);
  if (m.k === 'zombie' && Math.random() < 0.6) give('meat', 1);
  if (m.k === 'spider' && Math.random() < 0.4) give('stick', 2);
  if (m.k === 'skel' && Math.random() < 0.5) give('coal', 1);
  if (m.k === 'slime' && Math.random() < 0.3) give('apple', 1);
}
function hurtP(g, d, kb) {
  const P = S.p; if (P.inv > 0 && d < 50) return;
  d = Math.max(1, Math.round(d * (1 - armor()))); P.hp -= d; P.inv = 0.7; S.hurtT = 0;
  P.vx = kb; if (kb) P.vy = -260;
  g.shake(5, 0.2); g.sfx.hit();
  if (P.hp <= 0) { P.hp = 0; g.over(`${S.day}일째에 쓰러졌다... 처치 ${S.kills}`); }
}
function spawnMobs(g, dt) {
  S.spawnT = (S.spawnT || 2) - dt; if (S.spawnT > 0) return;
  const night = isNight(), P = S.p, ptx = Math.floor(P.x / TS), pty = Math.floor(P.y / TS);
  S.spawnT = night ? U.rand(1.5, 3.2) / (1 + S.day * 0.12) : U.rand(4, 7);
  const cap = night ? 5 + S.day * 2 : 4;
  if (S.mobs.length >= cap) return;
  const side = Math.random() < 0.5 ? -1 : 1;
  const underground = pty > S.top[U.clamp(ptx, 0, WW - 1)] + 6;
  if (night && !underground) {
    const x = U.clamp(ptx + side * U.randi(22, 30), 1, WW - 2), y = S.top[x] - 2;
    const k = Math.random() < 0.5 ? 'zombie' : Math.random() < 0.55 ? 'skel' : 'spider';
    addMob(k, x, y);
  } else if (underground) {
    for (let tries = 0; tries < 12; tries++) {
      const x = U.clamp(ptx + side * U.randi(14, 24), 1, WW - 2), y = U.clamp(pty + U.randi(-8, 8), 2, WH - 3);
      if (!S.w[y][x] && !S.w[y - 1][x] && solidAt(x, y + 1) && y > S.top[x] + 4) { addMob(Math.random() < 0.5 ? 'slime' : U.choice(['zombie', 'skel', 'spider']), x, y - 1); break; }
    }
  } else if (Math.random() < 0.3) { const x = U.clamp(ptx + side * U.randi(20, 30), 1, WW - 2); addMob('slime', x, S.top[x] - 2); }
}
function addMob(k, tx, ty) { const M = MOB[k], hpS = 1 + (S.day - 1) * 0.15; S.mobs.push({ k, x: tx * TS + 2, y: ty * TS - 8, w: k === 'spider' ? 24 : 18, h: k === 'spider' ? 16 : k === 'slime' ? 18 : 38, vx: 0, vy: 0, hp: Math.round(M.hp * hpS), max: Math.round(M.hp * hpS), cd: 1, flash: 0, onG: false, shootT: 2, hopT: 1 }); }
function mobStep(g, m, dt) {
  const M = MOB[m.k], P = S.p;
  m.flash -= dt; m.cd -= dt;
  const dx = P.x + P.w / 2 - (m.x + m.w / 2), dy = P.y - m.y, dist = Math.hypot(dx, dy);
  if (dist > 60 * TS) { m.dead = true; return; }
  let want = Math.sign(dx) * M.sp;
  if (M.shoot && dist < TS * 7) want = dist < TS * 4 ? -Math.sign(dx) * M.sp * 0.7 : 0;
  if (m.onG) {
    if (M.hop) { m.hopT -= dt; m.vx *= 0.8; if (m.hopT <= 0) { m.hopT = U.rand(0.6, 1.2); m.vy = -380; m.vx = Math.sign(dx) * M.sp * 1.6; } }
    else { m.vx += (want - m.vx) * Math.min(1, dt * 6); if (m.wall || (m.k === 'spider' && m.wall)) m.vy = m.k === 'spider' ? -360 : -440; }
  }
  if (m.k === 'spider' && m.wall) m.vy = -260;
  moveEnt(m, dt); m.hop = !m.onG;
  if (M.shoot && dist < TS * 10) { m.shootT -= dt; if (m.shootT <= 0) { m.shootT = U.rand(1.6, 2.6); const a = Math.atan2(P.y + 14 - (m.y + 10), dx); S.arrows.push({ x: m.x + m.w / 2, y: m.y + 10, vx: Math.cos(a) * 380, vy: Math.sin(a) * 380 - 40, t: 3 }); g.sfx.tone(700, 0.05, 'triangle', 0.02); } }
  if (U.rectHit(m, P) && m.cd <= 0) { m.cd = 0.9; hurtP(g, Math.round(M.dmg * (1 + (S.day - 1) * 0.1)), Math.sign(dx) * 220); }
  // 햇빛에 탐
  const tx = Math.floor((m.x + m.w / 2) / TS), ty = Math.floor(m.y / TS);
  m.burning = M.burn && !isNight() && daylight() > 0.6 && ty <= S.top[U.clamp(tx, 0, WW - 1)];
  if (m.burning) { m.hp -= 5 * dt; if (m.hp <= 0) { m.dead = true; g.burst(m.x - S.cx, m.y - S.cy, '#f97316', 10); } }
}
function drawTile(g, c, id, sx, sy, x, y) {
  const B = BL[id];
  if (id === BID.torch) { g.rect(sx + 10, sy + 9, 4, 13, '#92400e'); g.circle(sx + 12, sy + 8, 4 + Math.sin(g.time * 12 + x) * 0.8, '#fbbf24'); g.circle(sx + 12, sy + 8, 2, '#fff7ed'); return; }
  if (id === BID.leaves) { g.rect(sx, sy, TS, TS, '#166534'); g.rect(sx + 3, sy + 4, 6, 6, '#15803d'); g.rect(sx + 13, sy + 12, 7, 6, '#14532d'); return; }
  if (id === BID.log) { g.rect(sx + 3, sy, TS - 6, TS, '#92400e'); g.rect(sx + 8, sy, 3, TS, '#78350f'); return; }
  if (id === BID.cactus) { g.rect(sx + 5, sy, 14, TS, '#16a34a'); g.rect(sx + 8, sy + 4, 2, 2, '#fff'); g.rect(sx + 14, sy + 14, 2, 2, '#fff'); return; }
  g.rect(sx, sy, TS, TS, B.c);
  const n = (x * 7 + y * 13) % 5;
  if (id === BID.grass) g.rect(sx, sy, TS, 6, B.top);
  if (B.o) { g.rect(sx + 4 + n, sy + 5, 5, 5, B.o); g.rect(sx + 14 - n, sy + 13, 5, 5, B.o); g.rect(sx + 7, sy + 16 - n, 3, 3, B.o); }
  else if (id === BID.stone || id === BID.dirt || id === BID.sand) { c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(sx + 3 + n * 3, sy + 4 + n, 4, 3); c.fillRect(sx + 15 - n, sy + 15, 4, 3); }
  else if (id === BID.plank) { g.line(sx, sy + 8, sx + TS, sy + 8, '#a16207', 1); g.line(sx, sy + 16, sx + TS, sy + 16, '#a16207', 1); }
  else if (id === BID.brick) { g.line(sx, sy + 12, sx + TS, sy + 12, '#78350f', 1); g.line(sx + 12, sy, sx + 12, sy + 12, '#78350f', 1); g.line(sx + 6, sy + 12, sx + 6, sy + 24, '#78350f', 1); }
  else if (id === BID.glass) { g.stroke(sx + 1, sy + 1, TS - 2, TS - 2, 'rgba(255,255,255,.6)', 1); g.line(sx + 5, sy + 15, sx + 15, sy + 5, 'rgba(255,255,255,.6)', 1); }
  if (id !== BID.glass) { c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(sx, sy + TS - 2, TS, 2); }
}
function drawItem(g, c, k, x, y, s) {
  const I = IT[k];
  if (I.e) { g.emoji(I.e, x, y, s); if (I.tool || I.sw) { const col = ['', '#d4a056', '#a8a29e', '#e5e7eb', '#67e8f9'][I.tool || [0, 4, 6, 9, 14].indexOf(I.sw)]; g.circle(x + s * 0.4, y + s * 0.4, 4, col); } return; }
  const B = BL[BID[k]]; const h = s * 0.8;
  if (k === 'log') { g.rect(x - h / 2, y - h / 2, h, h, '#92400e'); g.rect(x - 2, y - h / 2, 3, h, '#78350f'); return; }
  if (k === 'leaves') { g.rect(x - h / 2, y - h / 2, h, h, '#166534'); return; }
  g.rect(x - h / 2, y - h / 2, h, h, B.c); if (B.top) g.rect(x - h / 2, y - h / 2, h, 5, B.top); g.stroke(x - h / 2, y - h / 2, h, h, 'rgba(0,0,0,.35)', 1);
}
function canCraft(r) { return Object.entries(r[2]).every(([k, n]) => (S.inv[k] || 0) >= n); }
function craftClick(g) {
  RECIPES.forEach((r, i) => {
    const x = 150 + (i % 2) * 340, y = 120 + Math.floor(i / 2) * 42;
    if (g.inRect(x, y, 330, 38)) {
      if (!canCraft(r)) { g.sfx.beep(150, 0.08); return; }
      if (IT[r[0]].tool || IT[r[0]].sw || IT[r[0]].ar) { if (S.inv[r[0]]) { say('이미 가지고 있어!', 1.2); return; } }
      Object.entries(r[2]).forEach(([k, n]) => (S.inv[k] -= n)); give(r[0], r[1]); g.sfx.power();
      say(`${IT[r[0]].n} ×${r[1]} 제작!`, 1.5);
      if (r[0] === 'pick1') say('이제 돌과 석탄을 캘 수 있다! 밤이 오기 전에 은신처를 만들자', 5);
    }
  });
}
function drawCraft(g, c) {
  g.rrect(130, 70, 700, 440, 16, 'rgba(28,25,23,.94)', '#ca8a04', 3);
  g.text('🛠 제작 (클릭해서 만들기 · C로 닫기)', 480, 96, 18, '#fde68a');
  RECIPES.forEach((r, i) => {
    const x = 150 + (i % 2) * 340, y = 120 + Math.floor(i / 2) * 42, ok = canCraft(r), own = (IT[r[0]].tool || IT[r[0]].sw || IT[r[0]].ar) && S.inv[r[0]];
    g.rrect(x, y, 330, 38, 8, own ? '#14532d' : ok ? (g.inRect(x, y, 330, 38) ? '#a16207' : '#78350f') : '#292524', ok ? '#fbbf24' : '#44403c', 1);
    drawItem(g, c, r[0], x + 20, y + 19, 24);
    g.text(`${IT[r[0]].n}${r[1] > 1 ? ' ×' + r[1] : ''}`, x + 40, y + 19, 14, ok || own ? '#fff' : '#78716c', 'left');
    g.text(own ? '보유 중' : Object.entries(r[2]).map(([k, n]) => `${IT[k].n} ${S.inv[k] || 0}/${n}`).join(' · '), x + 320, y + 19, 11, ok ? '#fde68a' : '#a8a29e', 'right', '600');
  });
  const inv = Object.entries(S.inv).filter(([k, n]) => n > 0 && !IT[k].b && !IT[k].food && !IT[k].tool && !IT[k].sw && !IT[k].ar);
  g.text('재료: ' + (inv.map(([k, n]) => `${IT[k].e}${n}`).join('  ') || '없음'), 480, 490, 14, '#e7e5e4');
}
