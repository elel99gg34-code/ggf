let S;
GAME({
  title: '탄막 슈팅', w: 600, h: 800, bg: '#07031a', controls: 'dpad+ab', aLabel: '💣', bLabel: '🐢',
  help: '방향키 이동 · 자동 사격 (Z/Space 꾹 = 집중 사격)\nShift/X = 저속 이동 (판정점 표시)\nC = 💣 봄 (탄 전부 제거) · 적 탄을 아슬아슬 스치면 그레이즈 점수\n⭐ 파워 아이템으로 화력 강화 · 스테이지마다 보스',
  init(g) {
    S = { p: { x: 300, y: 700, inv: 2 }, pb: [], eb: [], foes: [], items: [], power: 1, lives: 3, bombs: 2, stage: 1, t: 0, boss: null, graze: 0, script: 0, flash: 0, stars: Array.from({ length: 80 }, () => [U.rand(600), U.rand(800), U.rand(1, 3)]) };
  },
  update(g, dt) {
    const P = S.p, slow = g.b;
    const sp = slow ? 170 : 360;
    let mx = g.right - g.left, my = g.down - g.up;
    if (g.mouse.down) { const dx = g.mouse.x - P.x, dy = g.mouse.y - 60 - P.y; if (Math.hypot(dx, dy) > 4) { mx = U.clamp(dx / 30, -1, 1); my = U.clamp(dy / 30, -1, 1); } }
    P.x = U.clamp(P.x + mx * sp * dt, 10, 590); P.y = U.clamp(P.y + my * sp * dt, 20, 780);
    P.inv -= dt; S.t += dt; S.flash -= dt;
    S.stars.forEach((s) => { s[1] += s[2] * 60 * dt; if (s[1] > 800) s[1] = 0; });
    if (g.frame % (g.a ? 3 : 5) === 0) {
      const n = Math.min(5, Math.floor(S.power));
      for (let i = 0; i < n; i++) { const o = (i - (n - 1) / 2); S.pb.push({ x: P.x + o * 10, y: P.y - 16, vx: slow ? 0 : o * 60, vy: -900, dmg: 1 }); }
      if (S.power >= 3) { const t = nearest(P); if (t) { const a = U.angle(P.x, P.y, t.x, t.y); [-1, 1].forEach((s) => S.pb.push({ x: P.x + s * 20, y: P.y, vx: Math.cos(a) * 700, vy: Math.sin(a) * 700, dmg: 0.6, homing: true })); } }
    }
    if ((g.keyp('KeyC') || (g.pressed('a') && !g.keyp('KeyZ') && !g.keyp('Space') && !g.keyp('Enter') && !g.keyp('KeyJ'))) && S.bombs > 0 && S.flash <= 0) bomb(g);
    script(g, dt);
    for (const b of S.pb) {
      b.x += b.vx * dt; b.y += b.vy * dt;
      const targets = S.boss ? [...S.foes, S.boss] : S.foes;
      for (const f of targets) if (!f.dead && Math.abs(b.x - f.x) < f.r && Math.abs(b.y - f.y) < f.r) { b.dead = true; f.hp -= b.dmg; f.flash = 0.05; g.add(1); if (f.hp <= 0) killFoe(g, f); break; }
    }
    S.pb = S.pb.filter((b) => !b.dead && b.y > -20 && b.x > -20 && b.x < 620);
    for (const f of S.foes) { f.t += dt; f.path(f, dt); f.flash -= dt; if (f.fire) f.fire(f, dt); }
    S.foes = S.foes.filter((f) => !f.dead && f.y < 860 && f.y > -200 && f.x > -100 && f.x < 700);
    if (S.boss) { const B = S.boss; B.t += dt; B.flash -= dt; B.x += (B.tx - B.x) * dt * 1.5; B.y += (B.ty - B.y) * dt * 1.5; bossPattern(g, B, dt); }
    for (const b of S.eb) {
      b.x += b.vx * dt; b.y += b.vy * dt; if (b.acc) { b.vx *= 1 + b.acc * dt; b.vy *= 1 + b.acc * dt; } if (b.curve) { const a = Math.atan2(b.vy, b.vx) + b.curve * dt, s = Math.hypot(b.vx, b.vy); b.vx = Math.cos(a) * s; b.vy = Math.sin(a) * s; }
      const d = U.dist(b.x, b.y, P.x, P.y);
      if (d < b.r + 3 && P.inv <= 0) { hit(g); break; }
      if (d < b.r + 18 && !b.grazed) { b.grazed = true; S.graze++; g.add(20); g.sfx.tone(1800, 0.02, 'sine', 0.02); }
    }
    S.eb = S.eb.filter((b) => b.x > -30 && b.x < 630 && b.y > -30 && b.y < 830);
    for (const it of S.items) { it.vy = Math.min(it.vy + 300 * dt, 160); if (P.y < 250 || U.dist(it.x, it.y, P.x, P.y) < 70) { const a = U.angle(it.x, it.y, P.x, P.y); it.x += Math.cos(a) * 600 * dt; it.y += Math.sin(a) * 600 * dt; } else it.y += it.vy * dt; if (U.dist(it.x, it.y, P.x, P.y) < 20) { it.got = true; if (it.k === 'p') { S.power = Math.min(5, S.power + 0.1); g.sfx.tone(900, 0.03, 'square', 0.02); } else { g.add(100); g.sfx.tone(1300, 0.03, 'square', 0.02); } } }
    S.items = S.items.filter((i) => !i.got && i.y < 820);
    g.info = `스테이지 ${S.stage} · ❤️${S.lives} · 💣${S.bombs} · ⭐${S.power.toFixed(1)}`;
  },
  draw(g, c) {
    S.stars.forEach(([x, y, s]) => g.rect(x, y, s, s, '#6366f1'));
    S.items.forEach((it) => g.rrect(it.x - 7, it.y - 7, 14, 14, 3, it.k === 'p' ? '#ef4444' : '#3b82f6', '#fff', 1.5) || g.text(it.k === 'p' ? 'P' : '点', it.x, it.y + 1, 10, '#fff'));
    for (const f of S.foes) { c.save(); if (f.flash > 0) c.filter = 'brightness(3)'; g.emoji(f.e, f.x, f.y, f.r * 2.2); c.restore(); }
    if (S.boss) {
      const B = S.boss;
      g.ring(B.x, B.y, 60 + Math.sin(g.time * 4) * 6, `hsla(${g.time * 100 % 360},90%,60%,.6)`, 3);
      c.save(); if (B.flash > 0) c.filter = 'brightness(2)'; g.emoji(B.e, B.x, B.y, 90); c.restore();
      g.rect(20, 14, 560, 8, '#3b0764'); g.rect(20, 14, (560 * Math.max(0, B.hp)) / B.max, 8, '#e879f9');
      g.text(B.name + (B.phase ? ' ★' + B.phase : ''), 20, 34, 14, '#f5d0fe', 'left');
    }
    c.globalCompositeOperation = 'lighter';
    S.pb.forEach((b) => g.rect(b.x - 2, b.y - 8, 4, 14, b.homing ? 'rgba(96,165,250,.8)' : 'rgba(253,224,71,.8)'));
    c.globalCompositeOperation = 'source-over';
    for (const b of S.eb) { g.circle(b.x, b.y, b.r + 2, b.c); g.circle(b.x, b.y, b.r * 0.55, '#fff'); }
    const P = S.p;
    if (P.inv <= 0 || Math.floor(g.time * 12) % 2) { g.emoji('🛩️', P.x, P.y, 40); if (g.b) { g.circle(P.x, P.y, 5, '#fff'); g.ring(P.x, P.y, 5, '#ef4444', 2); } }
    if (S.flash > 0) { c.fillStyle = `rgba(255,255,255,${S.flash * 0.6})`; c.fillRect(0, 0, g.W, g.H); }
    g.text(`GRAZE ${S.graze}`, 590, 790, 13, '#a5b4fc', 'right');
    if (S.banner > 0) { S.banner -= 1 / 60; g.text(S.bannerText, 300, 380, 40, `rgba(255,255,255,${Math.min(1, S.banner)})`); }
  },
});
function nearest(P) { let best = null, bd = 1e9; for (const f of [...S.foes, ...(S.boss ? [S.boss] : [])]) { const d = U.dist(f.x, f.y, P.x, P.y); if (d < bd) { bd = d; best = f; } } return best; }
function ring(x, y, n, sp, c = '#f472b6', off = 0, r = 6, extra = {}) { for (let i = 0; i < n; i++) { const a = off + (i / n) * Math.PI * 2; S.eb.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r, c, ...extra }); } }
function aimed(x, y, n, sp, spread, c = '#fb923c', r = 5) { const a = U.angle(x, y, S.p.x, S.p.y); for (let i = 0; i < n; i++) { const b = a + (i - (n - 1) / 2) * spread; S.eb.push({ x, y, vx: Math.cos(b) * sp, vy: Math.sin(b) * sp, r, c }); } }
function foe(e, x, y, hp, path, fire, r = 16) { S.foes.push({ e, x, y, hp, r, t: 0, path, fire, flash: 0 }); }
const PATHS = {
  down: (sp) => (f, dt) => (f.y += sp * dt),
  sine: (sp, amp) => (f, dt) => { f.y += sp * dt; f.x = f.x0 + Math.sin(f.t * 2) * amp; },
  swoop: (dir) => (f, dt) => { f.y += (220 - f.t * 120) * dt; f.x += dir * 150 * dt; },
};
function script(g, dt) {
  if (S.boss) return;
  S.script += dt;
  const k = S.stage, T = S.script;
  const rate = 1 + k * 0.25;
  if (T < 32) {
    if (Math.random() < dt * 1.5 * rate) { const x = U.rand(50, 550); S.foes.push({ e: '👾', x, x0: x, y: -20, hp: 3 + k, r: 16, t: 0, flash: 0, path: PATHS.sine(110, 60), fire: (f, d) => { f.ft = (f.ft || 0.8) - d; if (f.ft <= 0) { f.ft = 1.6 / rate; aimed(f.x, f.y, 1 + (k > 1 ? 2 : 0), 200, 0.25); } } }); }
    if (Math.random() < dt * 0.8 * rate) { const dir = U.choice([-1, 1]); foe('🦇', dir < 0 ? 620 : -20, U.rand(60, 200), 2, PATHS.swoop(-dir === 1 ? -1 : dir === -1 ? -1 : 1), null, 14); S.foes[S.foes.length - 1].path = PATHS.swoop(dir < 0 ? -1 : 1); }
    if (T > 10 && Math.random() < dt * 0.25 * rate) foe('🛸', U.rand(80, 520), -30, 25 + k * 8, (f, d) => { if (f.y < 160) f.y += 120 * d; else if (f.t > 6) f.y -= 80 * d; }, (f, d) => { f.ft = (f.ft || 0.5) - d; if (f.ft <= 0 && f.y >= 150) { f.ft = 0.9; ring(f.x, f.y, 10 + k * 3, 150, '#a78bfa', f.t); } }, 26);
  } else if (!S.foes.length || T > 40) {
    const names = ['🐉 붉은 용', '👹 오니 대장', '🤖 메카 코어', '👁️ 심연의 눈', '🌌 은하 마왕'];
    const em = ['🐉', '👹', '🤖', '👁️', '🌌'];
    const i = (k - 1) % 5;
    S.boss = { e: em[i], name: names[i], x: 300, y: -80, tx: 300, ty: 160, hp: 400 + k * 250, max: 400 + k * 250, r: 45, t: 0, flash: 0, phase: 1, pt: 0, isBoss: true };
    S.banner = 2; S.bannerText = '⚠️ WARNING ⚠️'; g.sfx.tone(100, 1.2, 'sawtooth', 0.06);
  }
}
function bossPattern(g, B, dt) {
  if (B.y < 120) return;
  const k = S.stage;
  B.pt -= dt;
  if (B.hp < B.max * 0.5 && B.phase === 1) { B.phase = 2; S.eb = []; g.sfx.power(); S.flash = 0.3; }
  if (B.t % 4 < dt) { B.tx = U.rand(120, 480); B.ty = U.rand(100, 220); }
  if (B.pt > 0) return;
  const mode = Math.floor(B.t / 5) % 4;
  if (B.phase === 1) {
    if (mode === 0) { B.pt = 0.12; ring(B.x, B.y, 4, 180, '#f472b6', B.t * 3); ring(B.x, B.y, 4, 180, '#60a5fa', -B.t * 3); }
    else if (mode === 1) { B.pt = 0.7; aimed(B.x, B.y, 5 + k, 260, 0.15); }
    else if (mode === 2) { B.pt = 0.5; ring(B.x, B.y, 18 + k * 2, 140, '#4ade80', U.rand(1)); }
    else { B.pt = 0.08; S.eb.push({ x: U.rand(600), y: -10, vx: 0, vy: U.rand(150, 250), r: 5, c: '#facc15' }); }
  } else {
    if (mode === 0) { B.pt = 0.06; ring(B.x, B.y, 3, 220, '#e879f9', B.t * 5, 5, { curve: 0.6 }); }
    else if (mode === 1) { B.pt = 0.9; ring(B.x, B.y, 24 + k * 2, 90, '#f87171', 0, 7, { acc: 0.8 }); aimed(B.x, B.y, 3, 300, 0.1); }
    else if (mode === 2) { B.pt = 0.25; ring(B.x, B.y, 12, 200, '#22d3ee', B.t, 5, { curve: -0.8 }); ring(B.x, B.y, 12, 200, '#fde047', -B.t, 5, { curve: 0.8 }); }
    else { B.pt = 0.15; aimed(B.x, B.y, 1, 420, 0, '#fff', 8); ring(B.x, B.y, 6, 120, '#a78bfa', B.t * 2); }
  }
}
function killFoe(g, f) {
  f.dead = true;
  g.burst(f.x, f.y, ['#fde047', '#f97316', '#fff'], f.isBoss ? 120 : 16, f.isBoss ? 500 : 220, f.isBoss ? 1.5 : 0.6);
  g.sfx.explode();
  const n = f.isBoss ? 40 : U.randi(1, 3);
  for (let i = 0; i < n; i++) S.items.push({ x: f.x + U.rand(-40, 40), y: f.y + U.rand(-40, 40), vy: -150, k: Math.random() < 0.5 ? 'p' : 's' });
  if (f.isBoss) {
    g.add(10000 * S.stage); g.shake(20, 1); S.eb = []; S.boss = null; g.sfx.win();
    S.stage++; S.script = 0; S.bombs = Math.max(S.bombs, 2);
    if (S.stage > 5) return g.win(`그레이즈 ${S.graze} · 전 보스 격파!`);
    S.banner = 2.5; S.bannerText = `STAGE ${S.stage}`;
  } else g.add(100);
}
function bomb(g) {
  S.bombs--; S.flash = 1; S.p.inv = 2.5; g.sfx.explode(); g.shake(12, 0.6);
  S.eb.forEach((b) => S.items.push({ x: b.x, y: b.y, vy: -50, k: 's' })); S.eb = [];
  S.foes.forEach((f) => { f.hp -= 30; if (f.hp <= 0) killFoe(g, f); });
  if (S.boss) { S.boss.hp -= 60; if (S.boss.hp <= 0) killFoe(g, S.boss); }
}
function hit(g) {
  S.lives--; S.p.inv = 3; S.power = Math.max(1, S.power - 1); g.sfx.explode(); g.shake(14); g.burst(S.p.x, S.p.y, ['#fff', '#60a5fa', '#f472b6'], 60, 400, 1);
  S.eb = []; S.bombs = Math.max(S.bombs, 2);
  if (S.lives < 0) g.over(`스테이지 ${S.stage} · 그레이즈 ${S.graze}`);
}
