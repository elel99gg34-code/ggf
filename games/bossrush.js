let S;
const BOSSES = [
  { e: '🟢', n: '슬라임 킹', hp: 300, r: 50, sp: 0 }, { e: '🗿', n: '바위 골렘', hp: 450, r: 46, sp: 0 },
  { e: '🧙‍♂️', n: '암흑 마법사', hp: 420, r: 34, sp: 0 }, { e: '🐉', n: '화염 드래곤', hp: 650, r: 52, sp: 0 },
  { e: '👤', n: '그림자 군주', hp: 800, r: 36, sp: 0 },
];
GAME({
  title: '보스 러시', w: 1000, h: 680, bg: '#120c1c', controls: 'dpad+ab', aLabel: '⚔️', bLabel: '💨',
  help: 'WASD 이동 · 마우스 조준 + 클릭 / Space = 마법탄 연사\nShift/X/우클릭 = 대시 (무적 시간!)\n보스 5마리를 연속 격파하라. 보스 사이 체력 1칸 회복\n보스 체력이 절반 이하가 되면 패턴이 격해져요',
  init(g) { S = { p: { x: 500, y: 560, hp: 6, max: 6, inv: 0, dash: 0, dcd: 0, vx: 0, vy: 0 }, idx: -1, shots: [], eb: [], adds: [], cool: 0, t: 0 }; nextBoss(g); },
  update(g, dt) {
    const P = S.p, B = S.boss, touch = matchMedia('(pointer: coarse)').matches;
    if (S.intro > 0) { S.intro -= dt; return; }
    S.t += dt;
    let mx = g.right - g.left, my = g.down - g.up; const ml = Math.hypot(mx, my) || 1; mx /= ml; my /= ml;
    P.dcd -= dt; P.inv -= dt;
    if ((g.pressed('b') || g.mouse.rclick) && P.dcd <= 0) { const a = mx || my ? Math.atan2(my, mx) : U.angle(P.x, P.y, g.mouse.x, g.mouse.y); P.dash = 0.18; P.dcd = 0.7; P.vx = Math.cos(a) * 900; P.vy = Math.sin(a) * 900; P.inv = Math.max(P.inv, 0.3); g.sfx.tone(500, 0.12, 'sine', 0.05, 1200); }
    if (P.dash > 0) { P.dash -= dt; P.x += P.vx * dt; P.y += P.vy * dt; if (g.frame % 2 === 0) g.burst(P.x, P.y, '#a5b4fc', 3, 50, 0.3); }
    else { P.x += mx * 270 * dt; P.y += my * 270 * dt; }
    P.x = U.clamp(P.x, 20, g.W - 20); P.y = U.clamp(P.y, 20, g.H - 20);
    S.cool -= dt;
    const aim = touch ? U.angle(P.x, P.y, B.x, B.y) : U.angle(P.x, P.y, g.mouse.x, g.mouse.y);
    if ((g.mouse.down || g.a || touch) && S.cool <= 0) { S.cool = 0.12; S.shots.push({ x: P.x, y: P.y, vx: Math.cos(aim) * 750, vy: Math.sin(aim) * 750 }); g.sfx.tone(800, 0.03, 'triangle', 0.02); }
    for (const s of S.shots) {
      s.x += s.vx * dt; s.y += s.vy * dt;
      if (!B.dead && U.dist(s.x, s.y, B.x, B.y) < B.r && !B.shield) { s.dead = true; B.hp -= 6; B.flash = 0.05; g.add(6); }
      for (const a of S.adds) if (!a.dead && U.dist(s.x, s.y, a.x, a.y) < a.r) { s.dead = true; a.hp -= 6; if (a.hp <= 0) { a.dead = true; g.add(50); g.burst(a.x, a.y, a.c || '#4ade80', 12); } }
    }
    S.shots = S.shots.filter((s) => !s.dead && s.x > 0 && s.x < g.W && s.y > 0 && s.y < g.H);
    if (!B.dead) { bossAI(g, B, dt); B.flash -= dt; if (B.hp <= 0) bossDie(g, B); }
    for (const b of S.eb) { b.x += b.vx * dt; b.y += b.vy * dt; b.life = (b.life ?? 6) - dt; if (b.home) { const a = U.angle(b.x, b.y, P.x, P.y), cur = Math.atan2(b.vy, b.vx), d = ((a - cur + Math.PI * 3) % (Math.PI * 2)) - Math.PI, sp = Math.hypot(b.vx, b.vy), n = cur + U.clamp(d, -1.8 * dt, 1.8 * dt); b.vx = Math.cos(n) * sp; b.vy = Math.sin(n) * sp; } if (U.dist(b.x, b.y, P.x, P.y) < b.r + 8) { b.life = 0; hurt(g); } }
    S.eb = S.eb.filter((b) => b.life > 0 && b.x > -50 && b.x < g.W + 50 && b.y > -50 && b.y < g.H + 50);
    for (const a of S.adds) { const an = U.angle(a.x, a.y, P.x, P.y); a.x += Math.cos(an) * a.sp * dt; a.y += Math.sin(an) * a.sp * dt; if (U.dist(a.x, a.y, P.x, P.y) < a.r + 10) hurt(g); }
    S.adds = S.adds.filter((a) => !a.dead);
    if (!B.dead && U.dist(B.x, B.y, P.x, P.y) < B.r + 10) hurt(g);
    if (S.next > 0) { S.next -= dt; if (S.next <= 0) nextBoss(g); }
    g.info = `보스 ${S.idx + 1}/5 · ${'❤️'.repeat(Math.max(0, P.hp))}`;
  },
  draw(g, c) {
    for (let x = 0; x < g.W; x += 50) for (let y = 0; y < g.H; y += 50) g.rect(x + 1, y + 1, 48, 48, (x / 50 + y / 50) % 2 ? '#1a1228' : '#171024');
    const B = S.boss, P = S.p;
    if (B.tele) { c.globalAlpha = 0.35; if (B.tele.k === 'line') { c.save(); c.translate(B.x, B.y); c.rotate(B.tele.a); g.rect(0, -B.r, 1200, B.r * 2, '#ef4444'); c.restore(); } if (B.tele.k === 'circle') g.circle(B.tele.x, B.tele.y, B.tele.r, '#ef4444'); if (B.tele.k === 'cone') { c.fillStyle = '#f97316'; c.beginPath(); c.moveTo(B.x, B.y); c.arc(B.x, B.y, 600, B.tele.a - 0.5, B.tele.a + 0.5); c.fill(); } c.globalAlpha = 1; }
    for (const a of S.adds) g.emoji(a.e, a.x, a.y, a.r * 2.4);
    if (!B.dead) {
      c.save(); c.translate(B.x, B.y); if (B.flash > 0) c.filter = 'brightness(2.5)'; if (B.shield) c.globalAlpha = 0.5;
      const sq = B.squash || 1; c.scale(1 / sq, sq); g.emoji(B.e, 0, 0, B.r * 2.3); c.restore();
      if (B.shield) g.ring(B.x, B.y, B.r + 10, '#a78bfa', 4);
      g.rect(200, 16, 600, 14, '#2e1065'); g.rect(200, 16, (600 * Math.max(0, B.hp)) / B.max, 14, B.hp < B.max / 2 ? '#f43f5e' : '#c084fc');
      g.text(B.n, 500, 44, 18, '#f5d0fe');
    }
    for (const b of S.eb) { g.circle(b.x, b.y, b.r + 3, b.c || '#f472b6'); g.circle(b.x, b.y, b.r * 0.5, '#fff'); }
    for (const s of S.shots) g.circle(s.x, s.y, 5, '#a5f3fc');
    if (P.inv <= 0 || Math.floor(g.time * 14) % 2) g.emoji('🧝‍♀️', P.x, P.y, 36);
    g.rect(P.x - 16, P.y + 22, 32, 4, '#312e81'); g.rect(P.x - 16, P.y + 22, 32 * (1 - Math.max(0, P.dcd) / 0.7), 4, '#a5b4fc');
    if (S.intro > 0) { g.text(`BOSS ${S.idx + 1}`, 500, 300, 40, '#fff'); g.text(B.n, 500, 360, 56, '#f0abfc'); }
  },
});
function nextBoss(g) {
  S.idx++;
  if (S.idx >= BOSSES.length) { g.add(Math.max(0, 20000 - Math.floor(S.t) * 20)); return g.win(`클리어 타임 ${U.fmtTime(S.t)}`); }
  const d = BOSSES[S.idx];
  S.boss = { ...d, x: 500, y: 200, max: d.hp, t: 0, st: 0, phase: 0, flash: 0 };
  S.eb = []; S.adds = []; S.intro = 2; S.next = 0;
  if (S.idx > 0) S.p.hp = Math.min(S.p.max, S.p.hp + 1);
  g.sfx.tone(90, 1, 'sawtooth', 0.07);
}
function bossDie(g, B) { B.dead = true; g.add(2000 * (S.idx + 1)); g.sfx.explode(); g.shake(20, 1); g.burst(B.x, B.y, ['#f0abfc', '#fde047', '#fff'], 120, 500, 1.5); S.eb = []; S.adds.forEach((a) => (a.dead = true)); S.next = 2.5; }
function hurt(g) {
  const P = S.p;
  if (P.inv > 0) return;
  P.hp--; P.inv = 1.2; g.sfx.hit(); g.shake(10);
  if (P.hp <= 0) g.over(`${S.boss.n}에게 패배 · ${U.fmtTime(S.t)}`);
}
function ring(x, y, n, sp, c, off = 0, r = 7, extra = {}) { for (let i = 0; i < n; i++) { const a = off + (i / n) * Math.PI * 2; S.eb.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r, c, ...extra }); } }
function bossAI(g, B, dt) {
  const P = S.p, rage = B.hp < B.max / 2;
  B.t += dt; B.st -= dt;
  const to = (x, y, sp) => { const a = U.angle(B.x, B.y, x, y), d = U.dist(B.x, B.y, x, y); if (d > 5) { B.x += Math.cos(a) * Math.min(d, sp * dt); B.y += Math.sin(a) * Math.min(d, sp * dt); } };
  if (S.idx === 0) { // 슬라임: 점프 → 착지 충격파 + 분열
    if (B.phase === 0 && B.st <= 0) { B.phase = 1; B.st = 0.7; B.tx = P.x; B.ty = P.y; B.tele = { k: 'circle', x: P.x, y: P.y, r: 90 }; B.sx = B.x; B.sy = B.y; }
    if (B.phase === 1) { const k = 1 - B.st / 0.7; B.x = U.lerp(B.sx, B.tx, k); B.y = U.lerp(B.sy, B.ty, k) - Math.sin(k * Math.PI) * 150; B.squash = 1 + Math.sin(k * Math.PI) * 0.2; if (B.st <= 0) { B.phase = 0; B.st = rage ? 0.9 : 1.6; B.tele = null; B.squash = 0.7; g.shake(10); g.sfx.drop(); ring(B.x, B.y, rage ? 20 : 12, 220, '#4ade80', U.rand(1)); if (U.dist(B.x, B.y, P.x, P.y) < 90) hurt(g); if (S.adds.length < 6 && Math.random() < 0.6) S.adds.push({ e: '🟩', x: B.x, y: B.y, r: 14, hp: 18, sp: 90, c: '#4ade80' }); } }
    if (B.phase === 0) B.squash = U.lerp(B.squash || 1, 1, dt * 5);
  } else if (S.idx === 1) { // 골렘: 돌진 + 바위 투척
    if (B.phase === 0) { to(P.x, P.y, 50); if (B.st <= 0) { B.phase = Math.random() < 0.5 ? 1 : 3; B.st = 0.8; B.ca = U.angle(B.x, B.y, P.x, P.y); if (B.phase === 1) B.tele = { k: 'line', a: B.ca }; } }
    else if (B.phase === 1) { if (B.st <= 0) { B.phase = 2; B.st = 0.7; B.tele = null; g.sfx.tone(80, 0.5, 'sawtooth', 0.06); } }
    else if (B.phase === 2) { B.x += Math.cos(B.ca) * 900 * dt; B.y += Math.sin(B.ca) * 900 * dt; if (B.x < B.r || B.x > 1000 - B.r || B.y < B.r || B.y > 680 - B.r || B.st <= 0) { B.x = U.clamp(B.x, B.r, 1000 - B.r); B.y = U.clamp(B.y, B.r, 680 - B.r); g.shake(14); g.sfx.explode(); ring(B.x, B.y, rage ? 16 : 10, 200, '#a8a29e', 0, 10); B.phase = 0; B.st = rage ? 1 : 1.8; } }
    else if (B.phase === 3) { if (B.st <= 0) { for (let i = 0; i < (rage ? 5 : 3); i++) { const a = U.angle(B.x, B.y, P.x, P.y) + (i - 1) * 0.3; S.eb.push({ x: B.x, y: B.y, vx: Math.cos(a) * 320, vy: Math.sin(a) * 320, r: 14, c: '#78716c' }); } B.phase = 0; B.st = 1.5; g.sfx.shoot(); } }
  } else if (S.idx === 2) { // 마법사: 순간이동 + 링 + 유도탄 + 보호막
    B.shield = B.phase === 3;
    if (B.st <= 0) {
      B.phase = (B.phase + 1) % 4;
      if (B.phase === 0) { B.x = U.rand(100, 900); B.y = U.rand(80, 350); g.sfx.power(); g.burst(B.x, B.y, '#a78bfa', 30); B.st = 0.6; }
      else if (B.phase === 1) { for (let k = 0; k < (rage ? 4 : 3); k++) g.later(() => !B.dead && ring(B.x, B.y, 16, 160, '#c084fc', k * 0.2), k * 0.25); B.st = 1.2; }
      else if (B.phase === 2) { for (let i = 0; i < (rage ? 5 : 3); i++) { const a = U.rand(Math.PI * 2); S.eb.push({ x: B.x, y: B.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, r: 9, c: '#f472b6', home: true, life: 4 }); } B.st = 1.5; }
      else { B.st = 1.5; for (let i = 0; i < 2; i++) S.adds.push({ e: '💀', x: B.x + U.rand(-60, 60), y: B.y + U.rand(-60, 60), r: 15, hp: 24, sp: 110, c: '#e5e7eb' }); }
    }
  } else if (S.idx === 3) { // 드래곤: 화염 브레스 + 화염구 비
    to(500 + Math.sin(B.t * 0.6) * 300, 150, 120);
    if (B.phase === 0 && B.st <= 0) { B.phase = Math.random() < 0.5 ? 1 : 3; B.st = 0.9; if (B.phase === 1) { B.ba = U.angle(B.x, B.y, P.x, P.y); B.tele = { k: 'cone', a: B.ba }; } }
    if (B.phase === 1 && B.st <= 0) { B.phase = 2; B.st = 1.2; B.tele = null; }
    if (B.phase === 2) { for (let i = 0; i < 3; i++) { const a = B.ba + U.rand(-0.5, 0.5); S.eb.push({ x: B.x, y: B.y + 20, vx: Math.cos(a) * U.rand(300, 450), vy: Math.sin(a) * U.rand(300, 450), r: 9, c: '#f97316', life: 1.6 }); } if (g.frame % 4 === 0) g.sfx.noise(0.1, 0.05); if (B.st <= 0) { B.phase = 0; B.st = rage ? 0.8 : 1.5; } }
    if (B.phase === 3) { if (g.frame % (rage ? 3 : 5) === 0) S.eb.push({ x: U.rand(1000), y: -10, vx: U.rand(-40, 40), vy: U.rand(250, 380), r: 11, c: '#ef4444' }); if (B.st <= 0 && B.st > -2) {} if (B.st <= -2) { B.phase = 0; B.st = 1; } }
  } else { // 그림자 군주: 모든 패턴 혼합 + 분신
    if (B.st <= 0) {
      const m = U.randi(0, rage ? 4 : 3);
      if (m === 0) { B.x = U.rand(100, 900); B.y = U.rand(80, 400); ring(B.x, B.y, 24, 180, '#6b7280', U.rand(1)); B.st = 1; }
      if (m === 1) { for (let k = 0; k < 12; k++) g.later(() => { if (!B.dead) { const a = U.angle(B.x, B.y, S.p.x, S.p.y); S.eb.push({ x: B.x, y: B.y, vx: Math.cos(a) * 450, vy: Math.sin(a) * 450, r: 6, c: '#111827' }); } }, k * 0.08); B.st = 1.4; }
      if (m === 2) { for (let k = 0; k < 3; k++) S.adds.push({ e: '👤', x: B.x + U.rand(-80, 80), y: B.y + U.rand(-80, 80), r: 18, hp: 30, sp: 130, c: '#9ca3af' }); B.st = 1.6; }
      if (m === 3) { for (let k = 0; k < 6; k++) g.later(() => !B.dead && ring(B.x, B.y, 8, 200, k % 2 ? '#a78bfa' : '#f43f5e', k * 0.3, 7, { home: false }), k * 0.15); B.st = 1.5; }
      if (m === 4) { for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; S.eb.push({ x: B.x, y: B.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, r: 10, c: '#fbbf24', home: true, life: 3.5 }); } B.st = 1.8; }
    }
  }
}
