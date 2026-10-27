let S;
const GY = 500;
const BOSSES = [
  { n: '흙더미 삼형제', e: '🥔', bg: ['#9bd27a', '#5a8a3a'], ground: '#7a5230', phases: [{ e: '🥔', hp: 450, n: '감자' }, { e: '🧅', hp: 500, n: '양파' }, { e: '🥕', hp: 550, n: '당근' }] },
  { n: '개구리 듀오', e: '🐸', bg: ['#2a1a4a', '#8a3a6a'], ground: '#4a2a3a', phases: [{ e: '🐸', hp: 500, n: '권투 개구리' }, { e: '🐊', hp: 550, n: '불꽃 악어' }, { e: '🎰', hp: 600, n: '슬롯 머신' }] },
  { n: '꽃의 여왕', e: '🌻', bg: ['#7ad0ff', '#c8f0a0'], ground: '#4a8a2a', phases: [{ e: '🌻', hp: 550, n: '해바라기' }, { e: '🌺', hp: 600, n: '분노한 꽃' }, { e: '🥀', hp: 650, n: '덩굴 여왕' }] },
  { n: '주사위 악마', e: '😈', bg: ['#1a0000', '#5a0a1a'], ground: '#2a0a0a', phases: [{ e: '🎲', hp: 600, n: '킹 다이스' }, { e: '👿', hp: 700, n: '악마' }, { e: '😈', hp: 800, n: '최후의 악마' }] },
];
const GUNS = [{ n: '피슈터', rate: 0.11, dmg: 2.2 }, { n: '스프레드', rate: 0.14, dmg: 1.1 }];
GAME({
  title: '런앤건 보스전', w: 960, h: 600, bg: '#1a0a2a', controls: 'dpad+ab', aLabel: '점프', bLabel: '사격',
  help: '←→ 이동 · ↑↓ 조준 (8방향) · ↓ 앉기\nSpace/Z 점프 → 공중에서 💗분홍 물체에 한 번 더 = 패리! (카드 +1)\nX/Shift 꾹 = 사격 · C/L 대시 · E/V = EX샷 (카드 1장) · Q = 슈퍼아츠 (카드 5장)\n1/2 무기 교체 (피슈터/스프레드) · 화면 우하단 버튼 터치도 가능\n보스 4명을 모두 쓰러뜨려라! 체력 3',
  init(g) { S = { mode: 'map', cur: 0, done: {}, grades: {}, lives: 4 }; },
  update(g, dt) {
    if (S.mode === 'map') return mapUpdate(g);
    if (S.mode === 'result') { S.rt -= dt; if (S.rt < 0 && (g.pressed('a') || g.pressed('b') || g.mouse.clicked || S.rt < -5)) { if (Object.keys(S.done).length >= 4) return g.win(`모든 보스 격파! 평균 등급 ${avgGrade()}`); S.mode = 'map'; } return; }
    fight(g, dt);
  },
  draw(g, c) { if (S.mode === 'map') return mapDraw(g, c); if (S.mode === 'result') return resultDraw(g, c); fightDraw(g, c); },
});
const NODES = [[180, 420], [400, 260], [620, 400], [800, 200]];
function mapUpdate(g) {
  if (g.pressed('left') || g.pressed('up')) { S.cur = (S.cur + 3) % 4; g.sfx.move(); }
  if (g.pressed('right') || g.pressed('down')) { S.cur = (S.cur + 1) % 4; g.sfx.move(); }
  for (let i = 0; i < 4; i++) { const [x, y] = NODES[i]; if (g.mouse.moved && U.dist(g.mouse.x, g.mouse.y, x, y) < 60) S.cur = i; if (g.mouse.clicked && U.dist(g.mouse.x, g.mouse.y, x, y) < 60) { S.cur = i; return startFight(g, i); } }
  if (g.pressed('a') || g.pressed('b')) startFight(g, S.cur);
  g.info = `격파 ${Object.keys(S.done).length}/4 · 목숨 ${S.lives}`;
}
function mapDraw(g, c) {
  const grd = c.createLinearGradient(0, 0, 0, g.H); grd.addColorStop(0, '#f6e7c1'); grd.addColorStop(1, '#d9b98a'); c.fillStyle = grd; c.fillRect(0, 0, g.W, g.H);
  for (let i = 0; i < 60; i++) g.circle((i * 97) % g.W, (i * 61) % g.H, 1.5, 'rgba(90,60,30,.2)');
  c.setLineDash([10, 10]); c.strokeStyle = '#8a5a3a'; c.lineWidth = 5; c.beginPath(); NODES.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); c.setLineDash([]);
  g.text('잉크 섬 지도', g.W / 2, 60, 46, '#5a2a1a'); g.text('보스를 고르세요 (방향키 + Z / 클릭)', g.W / 2, 104, 18, '#7a4a2a', 'center', 'normal');
  for (let i = 0; i < 4; i++) {
    const [x, y] = NODES[i], B = BOSSES[i], sel = S.cur === i;
    g.circle(x, y + 10, 58, 'rgba(0,0,0,.2)');
    g.circle(x, y, 56, S.done[i] ? '#a3a3a3' : '#fff7e0'); g.ring(x, y, 56, sel ? '#e11d48' : '#5a2a1a', sel ? 6 : 3);
    g.emoji(B.e, x, y - 4 + (sel ? Math.sin(g.time * 6) * 5 : 0), 64);
    g.text(B.n, x, y + 80, 20, '#3a1a0a');
    if (S.done[i]) g.text(`등급 ${S.grades[i]}`, x, y + 104, 18, '#e11d48');
  }
  g.emoji('☕', NODES[S.cur][0] - 70, NODES[S.cur][1] + 30 + Math.sin(g.time * 8) * 3, 44);
}
function startFight(g, i) {
  S.mode = 'fight'; S.bi = i; S.phase = 0; S.time = 0; S.parries = 0; S.supers = 0; S.intro = 2.2; S.knock = 0;
  const B = BOSSES[i];
  S.boss = { x: 720, y: 300, hp: B.phases[0].hp, max: B.phases[0].hp, t: 2, flash: 0, act: null, at: 0, n: 0, bob: 0 };
  S.p = { x: 160, y: GY, vx: 0, vy: 0, face: 1, ground: true, hp: 3, inv: 0, dashT: 0, dashCd: 0, airDash: true, fireT: 0, cards: 0, meter: 0, parryT: 0, parried: false, crouch: false, gun: 0, superT: 0, anim: 0 };
  S.pb = []; S.eb = []; S.minions = []; S.fx = []; S.wind = 0;
  g.sfx.power();
}
function avgGrade() { const v = Object.values(S.grades); return v.length ? v.sort()[Math.floor(v.length / 2)] : '-'; }
function touchBtn(g, i) { return g.mouse.clicked && g.inRect(g.W - 270 + i * 88, g.H - 70, 80, 56); }
function fight(g, dt) {
  const P = S.p, B = S.boss;
  S.intro -= dt;
  if (S.knock > 0) { S.knock -= dt; if (S.knock <= 0) finish(g); updFx(dt); return; }
  if (S.intro > 0) return;
  S.time += dt;
  if (S.dying) { S.dying -= dt; if (S.dying <= 0) { S.lives--; if (S.lives < 0) return g.over(`${BOSSES[S.bi].n}에게 패배 · 격파 ${Object.keys(S.done).length}/4`); S.mode = 'result'; S.win = false; S.rt = 1; g.sfx.lose(); } return; }
  // 입력
  for (let i = 0; i < 2; i++) if (g.keyp('Digit' + (i + 1))) { P.gun = i; g.sfx.click(); }
  const dir = g.right - g.left;
  P.inv -= dt; P.dashCd -= dt; P.fireT -= dt; P.parryT -= dt; P.superT -= dt;
  if (P.superT > 0) { P.inv = Math.max(P.inv, 0.2); superBeam(g, dt); }
  if (P.dashT > 0) { P.dashT -= dt; P.vx = P.face * 720; P.vy = 0; P.x += P.vx * dt; S.fx.push({ x: P.x, y: P.y - 30, t: 0.2, smoke: true }); }
  else {
    P.crouch = P.ground && g.down && !dir;
    P.vx = P.crouch ? 0 : dir * 290 + S.wind;
    if (dir && !g.b) P.face = dir; else if (dir && g.b && !g.up && !g.down) P.face = dir;
    if (g.pressed('a')) {
      if (P.ground) { P.vy = -760; P.ground = false; P.parried = false; g.sfx.jump(); }
      else if (!P.parried) { P.parryT = 0.18; }
    }
    if (!g.a && P.vy < -300) P.vy = -300;
    if ((g.keyp('KeyC') || g.keyp('KeyL') || touchBtn(g, 0)) && P.dashCd <= 0 && (P.ground || P.airDash)) { P.dashT = 0.2; P.dashCd = 0.5; if (!P.ground) P.airDash = false; if (dir) P.face = dir; g.sfx.tone(300, 0.15, 'sawtooth', 0.04, 100); }
    P.vy = Math.min(P.vy + 2000 * dt, 1000);
    P.x += P.vx * dt; P.y += P.vy * dt;
    if (P.y >= GY) { P.y = GY; P.vy = 0; P.ground = true; P.airDash = true; P.parried = false; } else P.ground = false;
    for (const pl of S.minions) if (pl.plat && P.vy >= 0 && P.x > pl.x - pl.w / 2 && P.x < pl.x + pl.w / 2 && P.y >= pl.y && P.y - P.vy * dt <= pl.y + 4) { P.y = pl.y; P.vy = 0; P.ground = true; P.airDash = true; P.parried = false; P.x += pl.vx * dt; }
  }
  P.x = U.clamp(P.x, 24, g.W - 24);
  P.anim += Math.abs(P.vx) * dt;
  // 조준/사격
  let ax = P.face, ay = 0;
  if (g.up) { ay = -1; ax = dir || 0; } else if (g.down && (!P.ground || dir)) { ay = 1; ax = dir || 0; }
  if (!ax && !ay) ax = P.face; const al = Math.hypot(ax, ay); P.ax = ax / al; P.ay = ay / al;
  if (g.b && P.fireT <= 0 && P.dashT <= 0) shoot(g);
  if ((g.keyp('KeyE') || g.keyp('KeyV') || touchBtn(g, 1)) && P.cards >= 1 && P.dashT <= 0) { P.meter -= 100; recalcCards(); S.pb.push({ x: P.x + P.ax * 30, y: P.y - 34 + P.ay * 30, vx: P.ax * 560, vy: P.ay * 560, r: 26, dmg: 45, ex: true, life: 2 }); g.sfx.tone(160, 0.4, 'sawtooth', 0.08, 500); g.shake(5, 0.2); P.vx -= P.ax * 200; }
  if ((g.keyp('KeyQ') || touchBtn(g, 2)) && P.cards >= 5) { P.meter = 0; recalcCards(); P.superT = 1.6; S.supers++; g.sfx.tone(80, 1.6, 'sawtooth', 0.1, 300); g.shake(10, 1.2); S.fx.push({ t: 0.5, flash: true }); }
  updBoss(g, dt);
  updShots(g, dt);
  updFx(dt);
  S.wind *= Math.pow(0.5, dt);
  g.info = `${BOSSES[S.bi].n} · ${BOSSES[S.bi].phases[S.phase].n} · ${GUNS[P.gun].n} · ⏱️${U.fmtTime(S.time)}`;
}
function recalcCards() { const P = S.p; P.meter = U.clamp(P.meter, 0, 500); P.cards = Math.floor(P.meter / 100); }
function addMeter(n) { const P = S.p; P.meter = Math.min(500, P.meter + n); recalcCards(); }
function shoot(g) {
  const P = S.p, G = GUNS[P.gun];
  P.fireT = G.rate;
  const ox = P.x + P.ax * 34, oy = P.y - (P.crouch ? 18 : 36) + P.ay * 26, a = Math.atan2(P.ay, P.ax);
  if (P.gun === 0) S.pb.push({ x: ox, y: oy + (Math.random() - 0.5) * 8, vx: Math.cos(a) * 900, vy: Math.sin(a) * 900, r: 7, dmg: G.dmg, life: 1.2 });
  else for (const d of [-0.3, -0.12, 0.12, 0.3]) S.pb.push({ x: ox, y: oy, vx: Math.cos(a + d) * 650, vy: Math.sin(a + d) * 650, r: 6, dmg: G.dmg, life: 0.38 });
  if (g.frame % 3 === 0) g.sfx.tone(900, 0.03, 'square', 0.02);
}
function superBeam(g, dt) {
  const P = S.p, B = S.boss;
  const y = P.y - 36;
  S.fx.push({ beam: true, x: P.x, y, f: P.face, t: 0.05 });
  if ((P.face > 0 ? B.x > P.x : B.x < P.x) && Math.abs(B.y - y) < 120) dmgBoss(g, 260 * dt);
  for (const b of S.eb) if (Math.abs(b.y - y) < 60 && (b.x - P.x) * P.face > 0) b.dead = true;
}
function bossBox() { const B = S.boss, top = B.y - 90, bot = B.y >= 250 ? GY - 4 : B.y + 90; return { x: B.x - 85, y: top, w: 170, h: bot - top }; }
function updShots(g, dt) {
  const P = S.p;
  for (const b of S.pb) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (b.life <= 0 || b.x < -40 || b.x > g.W + 40 || b.y < -40 || b.y > g.H) { b.dead = true; continue; }
    if (U.circRect(b, bossBox()) && !S.knock) { if (b.ex) { if (!b.hit) { b.hit = new Set(); } if ((b.cd || 0) <= 0) { dmgBoss(g, b.dmg / 3); b.cd = 0.1; } b.cd -= dt; } else { dmgBoss(g, b.dmg); b.dead = true; addMeter(1.2); S.fx.push({ x: b.x, y: b.y, t: 0.12, pop: true }); } continue; }
    for (const m of S.minions) if (!m.dead && m.hp && U.dist(b.x, b.y, m.x, m.y) < m.r + b.r) { m.hp -= b.dmg; b.dead = !b.ex; if (m.hp <= 0) { m.dead = true; g.burst(m.x, m.y, ['#fff', '#fde047'], 10, 200); g.add(100, m.x, m.y); g.sfx.pop(); } break; }
  }
  S.pb = S.pb.filter((b) => !b.dead);
  for (const b of S.eb) {
    if (b.grav) b.vy += b.grav * dt;
    if (b.home) { const a = Math.atan2(P.y - 30 - b.y, P.x - b.x); const ca = Math.atan2(b.vy, b.vx); let d = a - ca; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; const na = ca + U.clamp(d, -2 * dt, 2 * dt), sp = Math.hypot(b.vx, b.vy); b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp; }
    if (b.bounce && b.y > GY - b.r && b.vy > 0) { b.y = GY - b.r; b.vy = -b.vy * 0.9; }
    if (b.roll) { b.y = GY - b.r; }
    b.x += b.vx * dt; b.y += b.vy * dt; b.t = (b.t || 0) + dt;
    if (b.beam) { b.life -= dt; if (b.life <= 0) b.dead = true; if (b.life < b.act && Math.abs(P.y - 30 - b.y) < b.h / 2 + 10) hurt(g); continue; }
    if (b.x < -100 || b.x > g.W + 100 || b.y > g.H + 60 || b.y < -300 || b.t > 9) b.dead = true;
    if (b.grav && !b.bounce && b.y > GY - 6) { b.dead = true; g.burst(b.x, GY - 6, b.pink ? '#f472b6' : '#a16207', 8, 140, 0.3); if (b.splash) for (const d of [-1, 1]) S.eb.push({ x: b.x, y: GY - 14, vx: d * 260, vy: 0, r: 12, roll: true, e: '💧' }); }
    if (b.dead) continue;
    const hb = { x: P.x - 16, y: P.y - (P.crouch ? 34 : 62), w: 32, h: P.crouch ? 34 : 62 };
    if (b.pink && P.parryT > 0 && U.dist(b.x, b.y, P.x, P.y - 30) < b.r + 44) { parry(g, b); continue; }
    if (U.circRect(b, hb)) { hurt(g); if (!b.keep) b.dead = true; }
  }
  S.eb = S.eb.filter((b) => !b.dead);
  for (const m of S.minions) {
    m.t = (m.t || 0) + dt;
    if (m.plat) { m.x += m.vx * dt; if (m.x < -100 || m.x > g.W + 100) m.dead = true; if (m.pink && P.parryT > 0 && U.dist(m.x, m.y, P.x, P.y - 30) < 60) parry(g, m); continue; }
    if (m.walk) { m.x += m.vx * dt; if (m.x < -40 || m.x > g.W + 40) m.dead = true; }
    if (m.fly) { const a = Math.atan2(P.y - 40 - m.y, P.x - m.x); m.x += Math.cos(a) * 120 * dt; m.y += Math.sin(a) * 120 * dt + Math.sin(m.t * 5) * 30 * dt; }
    if (!m.dead && U.dist(m.x, m.y, P.x, P.y - 30) < m.r + 18) { if (m.pink && P.parryT > 0) parry(g, m); else hurt(g); }
  }
  S.minions = S.minions.filter((m) => !m.dead);
}
function parry(g, b) {
  const P = S.p;
  b.dead = true; P.parried = true; P.parryT = 0; P.vy = -720; P.airDash = true; S.parries++;
  addMeter(100); g.sfx.tone(1400, 0.15, 'square', 0.07, 2000); g.shake(4, 0.15);
  S.fx.push({ x: P.x, y: P.y - 30, t: 0.3, parry: true }); S.hitstop = 0.1;
  g.float(P.x, P.y - 90, 'PARRY!', '#f472b6', 26);
}
function hurt(g) {
  const P = S.p;
  if (P.inv > 0 || P.dashT > 0 && false) return;
  P.hp--; P.inv = 1.6; g.sfx.hit(); g.shake(8, 0.3); S.fx.push({ t: 0.15, flashR: true });
  if (P.hp <= 0) { S.dying = 1.6; g.burst(P.x, P.y - 30, ['#fff', '#ef4444'], 30, 300); }
  else { P.vy = -400; }
}
function dmgBoss(g, d) {
  const B = S.boss;
  B.hp -= d; B.flash = 0.06; g.score += Math.round(d * 10);
  if (B.hp <= 0) {
    const ph = BOSSES[S.bi].phases;
    if (S.phase < ph.length - 1) { S.phase++; B.hp = B.max = ph[S.phase].hp; B.t = 2.2; B.act = null; S.eb = []; S.minions = []; B.trans = 1.5; g.sfx.explode(); g.shake(12, 0.6); g.burst(B.x, B.y, ['#fff', '#fde047', '#f97316'], 40, 400, 1, 5); g.add(2000, B.x, B.y - 100); }
    else { B.hp = 0; S.knock = 2.8; S.eb = []; S.minions = []; g.sfx.explode(); g.shake(14, 1); for (let i = 0; i < 6; i++) g.later(() => { g.burst(B.x + U.rand(-80, 80), B.y + U.rand(-80, 80), ['#fff', '#fde047', '#f97316', '#ef4444'], 30, 300, 1, 5); g.sfx.explode(); }, i * 0.3); }
  }
}
function finish(g) {
  const P = S.p, t = S.time, par = S.parries;
  let pts = 0; pts += t < 90 ? 40 : t < 150 ? 30 : t < 210 ? 20 : 10; pts += P.hp * 15; pts += Math.min(3, par) * 7; pts += Math.min(2, S.supers) * 5;
  const grade = pts >= 95 ? 'S' : pts >= 80 ? 'A+' : pts >= 70 ? 'A' : pts >= 55 ? 'B' : pts >= 40 ? 'C' : 'D';
  const prev = S.grades[S.bi];
  const RK = ['S', 'A+', 'A', 'B', 'C', 'D']; if (!prev || RK.indexOf(grade) < RK.indexOf(prev)) S.grades[S.bi] = grade;
  S.done[S.bi] = true; S.lastGrade = grade; S.lastPts = pts;
  g.add(5000 + pts * 100); g.sfx.win();
  S.mode = 'result'; S.win = true; S.rt = 1.2;
}
function resultDraw(g, c) {
  c.fillStyle = '#2a1a0a'; c.fillRect(0, 0, g.W, g.H);
  for (let i = 0; i < 16; i++) { c.save(); c.translate(g.W / 2, g.H / 2); c.rotate(g.time * 0.3 + i * Math.PI / 8); g.poly([[0, 0], [600, -40], [600, 40]], i % 2 ? '#3a2a1a' : '#4a3a2a'); c.restore(); }
  if (S.win) {
    g.text('A KNOCKOUT!', g.W / 2, 90, 56, '#fde047');
    g.rrect(g.W / 2 - 240, 140, 480, 330, 16, '#f6e7c1', '#5a2a1a', 4);
    const rows = [['시간', U.fmtTime(S.time)], ['남은 체력', '❤️'.repeat(Math.max(0, Math.min(3, S.p.hp)))], ['패리', S.parries], ['슈퍼아츠', S.supers]];
    rows.forEach(([k, v], i) => { g.text(k, g.W / 2 - 200, 185 + i * 48, 24, '#5a2a1a', 'left'); g.text(String(v), g.W / 2 + 200, 185 + i * 48, 24, '#5a2a1a', 'right'); });
    g.text('등급', g.W / 2 - 200, 410, 30, '#5a2a1a', 'left'); g.text(S.lastGrade, g.W / 2 + 160, 410, 64, '#e11d48');
  } else {
    g.text('YOU DIED', g.W / 2, 200, 70, '#ef4444');
    g.text(`진행도 ${Math.round(Math.min(1, Math.max(0, (S.phase + 1 - S.boss.hp / S.boss.max) / BOSSES[S.bi].phases.length)) * 100)}%`, g.W / 2, 290, 30, '#fff');
    g.text(`지도로 돌아가 다시 도전하자! (남은 목숨 ${S.lives})`, g.W / 2, 340, 22, '#fde68a');
  }
  if (S.rt < 0) g.text('Z / 클릭 = 계속', g.W / 2, 530, 22, Math.floor(g.time * 3) % 2 ? '#fff' : '#a8a29e');
}
// ---------- 보스 패턴 ----------
function pinkEvery(B, n) { B.n++; return B.n % n === 0; }
function updBoss(g, dt) {
  const B = S.boss, P = S.p, bi = S.bi, ph = S.phase, hard = 1 + ph * 0.15;
  B.flash -= dt; B.bob += dt;
  if (B.trans > 0) { B.trans -= dt; return; }
  B.t -= dt * hard;
  const pk = () => pinkEvery(B, 4);
  const aim = (sp, ox = B.x - 60, oy = B.y, spread = 0, o = {}) => { const a = Math.atan2(P.y - 34 - oy, P.x - ox) + spread; S.eb.push(Object.assign({ x: ox, y: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 12 }, o)); };
  if (bi === 0) { // 흙더미
    B.y = ph === 0 ? 400 : ph === 1 ? 300 : 200 + Math.sin(B.bob) * 60; B.x = ph === 2 ? 720 + Math.sin(B.bob * 0.7) * 80 : 760;
    if (ph === 0 && B.t <= 0) { B.t = 0.9; const p = pk(); S.eb.push({ x: B.x - 70, y: GY - 20, vx: -380, vy: 0, r: 16, e: p ? '💗' : '🟤', pink: p }); g.sfx.tone(150, 0.1, 'square', 0.04); if (B.n % 6 === 0) { B.t = 1.8; } }
    if (ph === 1 && B.t <= 0) { B.t = 0.22; const x = U.rand(40, 920); const p = pk(); S.eb.push({ x, y: -20, vx: 0, vy: 260, grav: 300, r: 10, e: p ? '💗' : '💧', pink: p }); if (B.n % 25 === 0) { B.t = 1.5; } }
    if (ph === 2 && B.t <= 0) { const r = Math.random(); if (r < 0.5) { B.t = 1.2; for (let i = 0; i < 3; i++) g.later(() => { if (S.phase === 2 && S.boss.hp > 0) S.eb.push({ x: U.rand(100, 860), y: -20, vx: 0, vy: 220, r: 14, e: '🥕', home: true }); }, i * 0.3); } else { B.t = 2; for (let k = 0; k < 4; k++) g.later(() => { if (S.phase === 2 && S.boss.hp > 0) aim(330, B.x, B.y, 0, { r: 18, e: '⭕', keep: false }); g.sfx.tone(600, 0.1, 'sine', 0.04); }, k * 0.25); } }
  }
  if (bi === 1) { // 개구리
    B.x = 760; B.y = ph === 2 ? 320 : 380;
    if (ph === 0 && B.t <= 0) { const r = Math.random(); if (r < 0.6) { B.t = 1.1; for (const dy of [0, -90]) if (Math.random() < 0.7 || dy === 0) S.eb.push({ x: B.x - 60, y: GY - 30 + dy, vx: -480, vy: 0, r: 18, e: '🥊' }); g.sfx.tone(200, 0.1, 'square', 0.05); } else { B.t = 1.6; for (let i = 0; i < 4; i++) { const p = pk(); S.minions.push({ x: B.x - 40, y: B.y - 60 - i * 20, r: 14, hp: 3, fly: true, e: p ? '💗' : '🪲', pink: p }); } } }
    if (ph === 1) { if (B.t <= 0) { const r = Math.random(); if (r < 0.45) { B.t = 1.4; S.eb.push({ x: B.x - 60, y: GY - 22, vx: -320, vy: 0, r: 22, e: '🔥', roll: true, keep: true }); } else if (r < 0.75) { B.t = 2.6; B.fan = 2; } else { B.t = 1.2; for (let i = 0; i < 5; i++) { const p = pk(); S.eb.push({ x: B.x - 40, y: B.y - 40, vx: -U.rand(200, 420), vy: -U.rand(200, 600), grav: 700, r: 12, e: p ? '💗' : '🪙', pink: p }); } } } if (B.fan > 0) { B.fan -= dt; S.wind = -260; if (Math.random() < 0.3) S.fx.push({ x: U.rand(0, 900), y: U.rand(150, 480), t: 0.4, windl: true }); } }
    if (ph === 2 && B.t <= 0) { const r = Math.random(); if (r < 0.5) { B.t = 2.2; S.minions.push({ x: g.W + 60, y: GY - 120, vx: -200, w: 140, plat: true, r: 40, e: U.choice(['🐂', '🐍', '🐦']), pink: false }); for (let i = 0; i < 4; i++) S.eb.push({ x: g.W + 60 + i * 150, y: GY - 100 - (i % 2) * 60, vx: -200, vy: 0, r: 14, e: i === 2 ? '💗' : '🍒', pink: i === 2 }); } else { B.t = 1.3; for (let k = 0; k < 3; k++) aim(300, B.x - 40, B.y - 20, (k - 1) * 0.25, { e: '💰', r: 14 }); g.sfx.coin(); } }
  }
  if (bi === 2) { // 꽃
    B.x = 780; B.y = 300 + Math.sin(B.bob * 0.8) * (ph === 1 ? 120 : 40);
    if (ph === 0 && B.t <= 0) { const r = Math.random(); if (r < 0.4) { B.t = 1.6; for (let i = 0; i < 3; i++) { const p = pk(); S.eb.push({ x: B.x - 40, y: 40, vx: -U.rand(100, 400), vy: 0, grav: 500, r: 12, e: p ? '💗' : '🌰', pink: p, sprout: !p }); } } else { B.t = 1.4; S.eb.push({ x: B.x - 60, y: B.y, vx: -520, vy: 0, r: 20, e: '🌸', boomer: true, keep: true }); g.sfx.shoot(); } }
    if (ph === 1 && B.t <= 0) { const r = Math.random(); if (r < 0.5) { B.t = 1.8; const y = Math.random() < 0.5 ? GY - 40 : GY - 140; S.eb.push({ x: 480, y, vx: 0, vy: 0, r: 0, beam: true, life: 1.2, act: 0.6, h: 70 }); g.sfx.tone(100, 0.8, 'sawtooth', 0.06, 300); } else { B.t = 1.0; for (let k = 0; k < 6; k++) { const a = Math.PI * 0.6 + k * 0.18; S.eb.push({ x: B.x - 40, y: B.y, vx: Math.cos(a) * 280, vy: Math.sin(a) * 280, r: 10, e: '🌼' }); } } }
    if (ph === 2 && B.t <= 0) { const r = Math.random(); if (r < 0.5) { B.t = 1.6; const x = U.clamp(P.x, 60, 900); S.eb.push({ x, y: GY, vx: 0, vy: 0, r: 0, beam: true, vine: true, life: 1.2, act: 0.55, h: 400 }); g.sfx.tone(80, 0.5, 'sawtooth', 0.06, 200); } else { B.t = 1.1; for (let k = 0; k < 4; k++) { const p = pk(); g.later(() => { if (S.phase === 2) aim(240, B.x - 50, B.y, 0, { e: p ? '💗' : '🟡', pink: p, home: !p, r: 12 }); }, k * 0.2); } } }
    for (const b of S.eb) { if (b.boomer) { b.vx += 700 * dt; if (b.vx > 0 && b.x > B.x - 40) b.dead = true; b.y += Math.sin(b.t * 6) * 3; } if (b.sprout && b.y > GY - 10 && !b.dead) { b.dead = true; S.minions.push({ x: b.x, y: GY - 20, r: 18, hp: 4, walk: true, vx: P.x < b.x ? -110 : 110, e: '🌱' }); } }
  }
  if (bi === 3) { // 악마
    B.x = 760 + (ph === 1 ? Math.sin(B.bob * 0.6) * 120 : 0); B.y = ph === 0 ? 300 : 260 + Math.sin(B.bob) * 50;
    if (ph === 0 && B.t <= 0) { const r = Math.random(); if (r < 0.5) { B.t = 1.6; for (let i = 0; i < 3; i++) { const p = pk(); S.eb.push({ x: B.x - 60, y: B.y, vx: -U.rand(220, 380), vy: -U.rand(300, 600), grav: 900, r: 16, e: p ? '💗' : '🎲', pink: p, bounce: true, keep: true }); } } else { B.t = 1.2; S.eb.push({ x: B.x - 60, y: GY - 20, vx: -300, vy: 0, r: 20, e: '🃏', roll: true, keep: true }); S.eb.push({ x: B.x - 60, y: GY - 120, vx: -300, vy: 0, r: 16, e: '♠️' }); } }
    if (ph === 1 && B.t <= 0) { const r = Math.random(); if (r < 0.4) { B.t = 2; const x = U.clamp(P.x, 60, 900); S.eb.push({ x, y: -60, vx: 0, vy: 0, r: 46, e: '🕷️', drop: true, keep: true, wait: 0.7 }); } else if (r < 0.75) { B.t = 1.4; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + B.bob; const p = k === 0; S.eb.push({ x: B.x, y: B.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, r: 14, e: p ? '💗' : '💀', pink: p }); } } else { B.t = 1.2; for (let k = 0; k < 3; k++) aim(380, B.x - 60, B.y, (k - 1) * 0.2, { e: '🔥', r: 14 }); } }
    if (ph === 2 && B.t <= 0) { const r = Math.random(); if (r < 0.35) { B.t = 1.6; const y = U.choice([GY - 30, GY - 130, GY - 230]); S.eb.push({ x: 480, y, vx: 0, vy: 0, r: 0, beam: true, life: 1.1, act: 0.5, h: 60 }); } else if (r < 0.7) { B.t = 1.0; for (let k = 0; k < 3; k++) { const p = pk(); S.eb.push({ x: B.x - 60, y: B.y, vx: -U.rand(260, 420), vy: -U.rand(200, 500), grav: 800, r: 14, e: p ? '💗' : '🔴', pink: p, bounce: true, keep: true }); } } else { B.t = 1.4; for (let k = 0; k < 5; k++) g.later(() => { if (S.phase === 2) aim(420, S.boss.x - 60, S.boss.y, U.rand(-0.15, 0.15), { e: '🔥' }); g.sfx.shoot(); }, k * 0.12); } }
    for (const b of S.eb) if (b.drop) { if (b.wait > 0) { b.wait -= dt; b.vy = 0; b.y = -40; } else { b.vy = 900; if (b.y > GY - 46) { b.y = GY - 46; b.vy = 0; b.t2 = (b.t2 || 0) + dt; if (b.t2 > 0.5) b.dead = true; } } }
  }
  if (U.circRect({ x: P.x, y: P.y - 30, r: 18 }, bossBox())) hurt(g);
}
function updFx(dt) { S.fx = S.fx.filter((f) => (f.t -= dt) > 0); }
// ---------- 그리기 ----------
function fightDraw(g, c) {
  const BD = BOSSES[S.bi], B = S.boss, P = S.p;
  const grd = c.createLinearGradient(0, 0, 0, g.H); grd.addColorStop(0, BD.bg[0]); grd.addColorStop(1, BD.bg[1]); c.fillStyle = grd; c.fillRect(0, 0, g.W, g.H);
  for (let i = 0; i < 6; i++) { c.fillStyle = 'rgba(255,255,255,.08)'; c.beginPath(); c.ellipse(i * 190 + 60, 470, 140, 90 + (i % 2) * 30, 0, Math.PI, 0); c.fill(); }
  if (S.bi === 2) for (let i = 0; i < 4; i++) g.emoji('☁️', (i * 280 + g.time * 20) % 1100 - 80, 70 + (i % 2) * 40, 70);
  if (S.bi === 3) for (let i = 0; i < 8; i++) g.emoji('🕯️', 60 + i * 120, 440, 30);
  if (S.bi === 1) for (let i = 0; i < 10; i++) g.circle(50 + i * 96, 60, 8, Math.floor(g.time * 4 + i) % 2 ? '#fde047' : '#f472b6');
  g.rect(0, GY, g.W, g.H - GY, BD.ground); g.rect(0, GY, g.W, 6, 'rgba(0,0,0,.3)');
  for (let i = 0; i < 20; i++) g.circle(i * 53 + 10, GY + 30 + (i % 3) * 18, 6, 'rgba(0,0,0,.15)');
  // 보스
  const ph = BD.phases[S.phase];
  if (!S.knock || Math.floor(g.time * 10) % 2) {
    c.save(); c.translate(B.x, B.y + Math.sin(B.bob * 3) * 6); if (B.flash > 0) c.globalAlpha = 0.7;
    const sc = 1 + Math.sin(B.bob * 4) * 0.03; c.scale(sc, 1 / sc);
    if (B.trans > 0) c.rotate(Math.sin(g.time * 30) * 0.1);
    g.circle(0, 70, 70, 'rgba(0,0,0,.15)');
    g.emoji(ph.e, 0, 0, 190);
    if (B.flash > 0) { c.globalAlpha = 0.35; g.circle(0, 0, 90, '#fff'); }
    if (S.knock) g.emoji('😵', 0, -20, 60);
    c.restore();
  }
  for (const m of S.minions) { if (m.plat) { g.rrect(m.x - m.w / 2, m.y, m.w, 16, 8, '#fde68a', '#78350f', 3); g.emoji(m.e, m.x, m.y + 40, 50); continue; } g.emoji(m.e, m.x, m.y + Math.sin((m.t || 0) * 8) * 3, m.r * 2.4); }
  for (const b of S.eb) {
    if (b.beam) { const warn = b.life > b.act; if (b.vine) { c.globalAlpha = warn ? 0.35 : 1; g.rect(b.x - 24, warn ? GY - 10 : GY - b.h, 48, warn ? 10 : b.h, warn ? '#86efac' : '#15803d'); if (!warn) for (let k = 0; k < 6; k++) g.emoji('🌿', b.x, GY - k * 65 - 20, 40); c.globalAlpha = 1; } else { c.globalAlpha = warn ? 0.3 : 0.9; g.rect(0, b.y - b.h / 2, g.W, b.h, warn ? '#fde047' : '#f97316'); if (!warn) g.rect(0, b.y - b.h / 4, g.W, b.h / 2, '#fff7ed'); c.globalAlpha = 1; } continue; }
    if (b.pink) g.circle(b.x, b.y, b.r + 6, 'rgba(244,114,182,.35)');
    c.save(); c.translate(b.x, b.y); if (b.roll || b.boomer) c.rotate(b.t * 10); g.emoji(b.e || '🔴', 0, 0, b.r * 2.3); c.restore();
  }
  for (const b of S.pb) { if (b.ex) { g.circle(b.x, b.y, b.r, 'rgba(56,189,248,.5)'); g.circle(b.x, b.y, b.r * 0.6, '#e0f2fe'); } else { g.circle(b.x, b.y, b.r, '#38bdf8'); g.circle(b.x, b.y, b.r * 0.5, '#fff'); } }
  for (const f of S.fx) {
    if (f.beam) { g.rect(f.f > 0 ? f.x : 0, f.y - 60, f.f > 0 ? g.W - f.x : f.x, 120, 'rgba(56,189,248,.45)'); g.rect(f.f > 0 ? f.x : 0, f.y - 30, f.f > 0 ? g.W - f.x : f.x, 60, 'rgba(240,249,255,.9)'); }
    if (f.smoke) g.circle(f.x, f.y, 14 * f.t * 5, `rgba(255,255,255,${f.t * 2})`);
    if (f.pop) g.circle(f.x, f.y, 10, 'rgba(255,255,255,.7)');
    if (f.parry) { g.ring(f.x, f.y, 60 * (1 - f.t / 0.3) + 10, '#f472b6', 5); }
    if (f.windl) g.line(f.x, f.y, f.x + 60, f.y, 'rgba(255,255,255,.5)', 2);
    if (f.flash) { c.fillStyle = `rgba(255,255,255,${f.t})`; c.fillRect(0, 0, g.W, g.H); }
    if (f.flashR) { c.fillStyle = `rgba(239,68,68,${f.t * 2})`; c.fillRect(0, 0, g.W, g.H); }
  }
  drawCup(g, c);
  // HUD
  g.rrect(14, g.H - 56, 80, 40, 8, P.hp === 1 ? (Math.floor(g.time * 6) % 2 ? '#ef4444' : '#7f1d1d') : '#f8fafc', '#111', 3); g.text(`HP ${Math.max(0, P.hp)}`, 54, g.H - 35, 22, P.hp === 1 ? '#fff' : '#111');
  for (let i = 0; i < 5; i++) { const fill = U.clamp(P.meter - i * 100, 0, 100) / 100; const x = 106 + i * 30; g.rrect(x, g.H - 58, 24, 40, 4, '#334155', '#111', 2); if (fill > 0) { g.rect(x + 2, g.H - 20 - 36 * fill, 20, 36 * fill, fill >= 1 ? '#f472b6' : '#94a3b8'); } }
  g.text(GUNS[P.gun].n, 270, g.H - 38, 16, '#fff', 'left');
  const lab = ['대시', 'EX', '슈퍼']; for (let i = 0; i < 3; i++) { const ok = i === 0 || (i === 1 ? P.cards >= 1 : P.cards >= 5); g.rrect(g.W - 270 + i * 88, g.H - 70, 80, 56, 10, ok ? 'rgba(255,255,255,.3)' : 'rgba(0,0,0,.3)', 'rgba(255,255,255,.4)'); g.text(lab[i], g.W - 230 + i * 88, g.H - 42, 18, ok ? '#fff' : '#64748b'); }
  // 진행 바 (보스 체력 숨김 → 상단에 페이즈만)
  g.text(`${ph.n} (${S.phase + 1}/3)`, g.W / 2, 26, 20, '#fff');
  g.rect(g.W / 2 - 150, 42, 300, 8, 'rgba(0,0,0,.4)'); g.rect(g.W / 2 - 150, 42, 300 * Math.max(0, B.hp) / B.max, 8, '#fde047');
  if (S.intro > 0) { c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(0, 0, g.W, g.H); g.text(S.intro > 1 ? 'READY?' : 'WALLOP!', g.W / 2, g.H / 2 - 40, 72, '#fde047'); g.text(BD.n, g.W / 2, g.H / 2 + 30, 28, '#fff'); }
  if (S.knock > 0) g.text('A KNOCKOUT!', g.W / 2, 200, 70, '#fde047');
  if (S.dying) g.text('YOU DIED', g.W / 2, 220, 70, '#ef4444');
  // 필름 그레인
  c.fillStyle = 'rgba(80,60,30,.06)'; c.fillRect(0, 0, g.W, g.H);
  for (let i = 0; i < 6; i++) g.rect((g.frame * 37 + i * 157) % g.W, 0, 1, g.H, 'rgba(0,0,0,.08)');
}
function drawCup(g, c) {
  const P = S.p;
  if (S.dying) { g.emoji('👻', P.x, P.y - 40 - (1.6 - S.dying) * 120, 50); return; }
  if (P.inv > 0 && Math.floor(g.time * 16) % 2 && P.superT <= 0) return;
  c.save(); c.translate(P.x, P.y); c.scale(P.face, 1);
  if (P.dashT > 0) c.scale(1.2, 0.8);
  const cr = P.crouch, run = P.ground && Math.abs(P.vx) > 20, ph = Math.sin(P.anim / 12) * 8;
  if (!P.ground && !P.dashT) { c.rotate(P.parryT > 0 ? g.time * 30 : 0); }
  if (!cr) { g.rect(-10 + (run ? ph : 0), -20, 7, 18, '#111'); g.rect(3 - (run ? ph : 0), -20, 7, 18, '#111'); g.rrect(-14 + (run ? ph : 0), -6, 14, 7, 3, '#7c2d12'); g.rrect(0 - (run ? ph : 0), -6, 14, 7, 3, '#7c2d12'); }
  const by = cr ? -14 : -22;
  g.rrect(-12, by - 22, 24, 24, 6, '#e11d48'); g.rect(-12, by - 4, 24, 5, '#111');
  // 컵 머리
  const hy = by - 42;
  g.rrect(-17, hy - 20, 34, 34, 10, '#f8fafc', '#111', 2); g.ring(19, hy - 4, 7, '#111', 3);
  g.rect(-15, hy - 20, 30, 6, '#7c2d12'); g.line(-2, hy - 20, -6, hy - 34, '#ef4444', 3); g.line(-6, hy - 34, 4, hy - 30, '#fff', 3);
  g.circle(-4, hy - 4, 4, '#111'); g.circle(6, hy - 4, 4, '#111'); g.line(-2, hy + 6, 8, hy + 6, '#111', 2); g.circle(10, hy + 2, 3, '#fca5a5');
  // 손가락 총
  const ang = Math.atan2(P.ay || 0, Math.abs(P.ax || 1));
  c.save(); c.translate(8, by - 12); c.rotate(ang); g.rect(0, -3, 20, 6, '#f8fafc'); g.circle(22, 0, 4, '#f8fafc'); c.restore();
  c.restore();
  if (P.parryT > 0) g.ring(P.x, P.y - 34, 44, 'rgba(244,114,182,.7)', 3);
}
