let S;
const WN = { R: '벌컨', B: '레이저', P: '호밍' }, WC = { R: '#ef4444', B: '#3b82f6', P: '#a855f7' };
const RSTG = [
  { n: '평원 기지', base: '#3f6212', alt: '#456f12', deco: ['🌲', '🌳', '🏠'], len: 55 },
  { n: '해안 요새', base: '#0e4a6e', alt: '#0f5370', deco: ['🪨', '🚢', '🏝️'], len: 60 },
  { n: '사막 공장', base: '#a16207', alt: '#a8650a', deco: ['🌵', '🏭', '🪨'], len: 65 },
  { n: '적 본진', base: '#27272a', alt: '#303034', deco: ['🏢', '🏗️', '🛢️'], len: 70 },
];
GAME({
  title: '라이덴 파이터', w: 600, h: 800, bg: '#000', controls: 'dpad+ab', aLabel: '발사', bLabel: '폭탄',
  help: '방향키/WASD 또는 드래그로 이동 · Space/Z 발사\nX/Shift 폭탄 (화면 전체 공격 + 탄 소거)\n아이템 색: 🔴 벌컨(확산) 🔵 레이저(관통) 🟣 호밍 미사일\n같은 색을 먹으면 레벨업(최대 8), 다른 색이면 무기 교체\n🅱️ 폭탄 추가 · 🏅 메달 보너스 · 4개 스테이지 보스 격파!',
  init(g) {
    S = { p: { x: 300, y: 700, inv: 2, dead: 0 }, lives: 3, bombs: 3, wep: 'R', lv: 1, cd: 0, hcd: 0, stage: 0, dist: 0, scroll: 0,
      bul: [], eb: [], foes: [], items: [], deco: [], waveT: 1.5, boss: null, bombFx: 0, clear: 0, banner: 3, medal: 500, drag: null, grazeT: 0 };
    genDeco();
  },
  update(g, dt) {
    const P = S.p, st = RSTG[S.stage];
    S.banner -= dt; S.bombFx -= dt;
    S.scroll += 60 * dt;
    for (const d of S.deco) { d.y += 60 * dt; if (d.y > 840) { d.y -= 900; d.x = U.rand(20, 580); d.e = U.choice(st.deco); } }
    if (S.clear > 0) { S.clear -= dt; if (S.clear <= 0) { if (S.stage >= RSTG.length - 1) { g.add(30000 + S.lives * 10000 + S.bombs * 3000); return g.win(`적 본진 괴멸! 무기 ${WN[S.wep]} Lv${S.lv}`); } S.stage++; S.dist = 0; S.banner = 3; genDeco(); } }
    else if (!S.boss) S.dist += dt;
    // 플레이어
    if (P.dead > 0) {
      P.dead -= dt;
      if (P.dead <= 0) { if (S.lives < 0) return g.over(`스테이지 ${S.stage + 1} · ${st.n}`); P.x = 300; P.y = 700; P.inv = 3; S.bombs = Math.max(S.bombs, 2); }
    } else {
      let mx = g.right - g.left, my = g.down - g.up;
      const m = Math.hypot(mx, my) || 1;
      P.x += (mx / m) * 300 * dt; P.y += (my / m) * 300 * dt;
      if (g.mouse.down) { if (!S.drag) S.drag = { mx: g.mouse.x, my: g.mouse.y, px: P.x, py: P.y }; P.x = S.drag.px + (g.mouse.x - S.drag.mx) * 1.2; P.y = S.drag.py + (g.mouse.y - S.drag.my) * 1.2; } else S.drag = null;
      P.x = U.clamp(P.x, 16, 584); P.y = U.clamp(P.y, 30, 780);
      P.inv -= dt; S.cd -= dt; S.hcd -= dt;
      if ((g.a || g.mouse.down) && S.cd <= 0) fire(g);
      if (g.pressed('b') || g.mouse.rclick) bomb(g);
    }
    // 웨이브
    S.waveT -= dt;
    if (!S.boss && S.clear <= 0) {
      if (S.dist < st.len && S.waveT <= 0) wave(g);
      if (S.dist >= st.len && S.foes.every((f) => f.ground)) spawnBoss(g);
    }
    const lv = S.stage;
    for (const f of S.foes) {
      f.t += dt; f.fl -= dt;
      if (f.k === 'dive') { f.y += f.sp * dt; f.x += Math.sin(f.t * 2 + f.ph) * 80 * dt; }
      else if (f.k === 'swoop') { f.x += f.vx * dt; f.y += f.vy * dt; f.vy -= 80 * dt; }
      else if (f.k === 'tank') { f.y += 60 * dt + f.vy * dt; f.x += f.vx * dt; if (f.x < 30 || f.x > 570) f.vx *= -1; }
      else if (f.k === 'heli') { f.y = Math.min(f.y + 120 * dt, f.ty); f.x += Math.sin(f.t) * 60 * dt; if (f.t > 9) f.y += 200 * dt * 2; }
      else if (f.k === 'bomber') { f.y += 40 * dt; }
      f.cd -= dt;
      if (f.cd <= 0 && f.y > 20 && f.y < 600 && P.dead <= 0) {
        if (f.k === 'bomber') { f.cd = 1.4 - lv * 0.1; ringShot(f.x, f.y, 10 + lv * 2, 150, g.time); }
        else if (f.k === 'heli') { f.cd = 1.6; for (let i = -1; i <= 1; i++) aimShot(f.x, f.y, 210 + lv * 15, i * 0.2); }
        else if (f.k === 'tank') { f.cd = 2.2 - lv * 0.2; aimShot(f.x, f.y, 190 + lv * 15, 0); }
        else { f.cd = U.rand(1.5, 3); if (Math.random() < 0.5 + lv * 0.1) aimShot(f.x, f.y, 200 + lv * 20, 0); }
      }
      if (f.y > 860 || f.y < -200 || f.x < -100 || f.x > 700) f.gone = true;
      if (!f.ground && P.dead <= 0 && P.inv <= 0 && U.dist(f.x, f.y, P.x, P.y) < f.r + 6) { hurt(g, f, 50); die(g); }
    }
    if (S.boss) updBoss(g, dt);
    // 내 탄
    for (const b of S.bul) {
      if (b.home) {
        const tgt = nearest(b.x, b.y);
        if (tgt) { const a = U.angle(b.x, b.y, tgt.x, tgt.y), cur = Math.atan2(b.vy, b.vx); let d = a - cur; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; const na = cur + U.clamp(d, -6 * dt, 6 * dt); b.vx = Math.cos(na) * 520; b.vy = Math.sin(na) * 520; }
      }
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.y < -40 || b.x < -20 || b.x > 620) b.life = 0;
      for (const f of S.foes) if (!f.dead && Math.abs(b.x - f.x) < f.r + b.w && Math.abs(b.y - f.y) < f.r + b.h) {
        if (b.pierce) { if (!b.hit) b.hit = new Set(); if (b.hit.has(f)) continue; b.hit.add(f); hurt(g, f, b.dmg); }
        else { hurt(g, f, b.dmg); b.life = 0; break; }
      }
      if (b.life > 0 && S.boss && !S.boss.dying && S.boss.y > 60) {
        const B = S.boss;
        if (Math.abs(b.x - B.x) < B.w / 2 && Math.abs(b.y - B.y) < B.h / 2) { B.hp -= b.dmg; B.fl = 0.05; if (!b.pierce) b.life = 0; else b.life -= 0.15; if (B.hp <= 0) bossDie(g); }
      }
    }
    S.bul = S.bul.filter((b) => b.life > 0);
    S.foes = S.foes.filter((f) => !f.dead && !f.gone);
    // 적 탄
    for (const b of S.eb) {
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.acc) { b.vx *= 1 + b.acc * dt; b.vy *= 1 + b.acc * dt; }
      if (P.dead <= 0) {
        const d = U.dist(b.x, b.y, P.x, P.y);
        if (P.inv <= 0 && d < 4 + b.r) { b.gone = true; die(g); }
        else if (d < 22 && !b.grazed) { b.grazed = true; g.score += 10; S.grazeT = 0.3; }
      }
      if (b.x < -20 || b.x > 620 || b.y < -20 || b.y > 820) b.gone = true;
    }
    S.eb = S.eb.filter((b) => !b.gone);
    S.grazeT -= dt;
    // 아이템
    for (const it of S.items) {
      it.t += dt;
      if (it.k === 'wep') { it.x += it.vx * dt; it.y += it.vy * dt; if (it.x < 20 || it.x > 580) it.vx *= -1; if (it.y < 20 && it.vy < 0) it.vy *= -1; if (it.t % 3 < dt) it.c = { R: 'B', B: 'P', P: 'R' }[it.c]; }
      else it.y += 90 * dt;
      if (P.dead <= 0 && U.dist(it.x, it.y, P.x, P.y) < 30) {
        it.got = true;
        if (it.k === 'wep') { if (it.c === S.wep) { if (S.lv < 8) S.lv++; else g.add(5000, it.x, it.y); } else { S.wep = it.c; } g.float(P.x, P.y - 40, `${WN[S.wep]} Lv${S.lv}`, WC[S.wep], 22); g.sfx.power(); }
        else if (it.k === 'bomb') { S.bombs = Math.min(7, S.bombs + 1); g.sfx.coin(); g.float(P.x, P.y - 40, '+폭탄', '#fde047'); }
        else { g.add(S.medal, it.x, it.y); S.medal = Math.min(10000, S.medal + 500); g.sfx.coin(); }
      }
    }
    S.items = S.items.filter((i) => !i.got && i.y < 840 && i.t < 14);
    g.info = `스테이지 ${S.stage + 1}/${RSTG.length} · ✈️×${Math.max(0, S.lives)} · 💣×${S.bombs}`;
  },
  draw(g, c) {
    const st = RSTG[S.stage];
    g.rect(0, 0, 600, 800, st.base);
    const off = S.scroll % 100;
    for (let y = -100 + off; y < 800; y += 100) for (let x = 0; x < 600; x += 100) if ((((x / 100) + Math.floor((y - S.scroll) / 100)) & 1) === 0) g.rect(x, y, 100, 100, st.alt);
    const ro = S.scroll % 80;
    g.rect(270, 0, 60, 800, 'rgba(0,0,0,.25)');
    for (let y = -80 + ro; y < 800; y += 80) g.rect(297, y, 6, 40, 'rgba(255,255,255,.35)');
    for (const d of S.deco) g.emoji(d.e, d.x, d.y, 34);
    for (const f of S.foes) if (f.ground) drawFoe(g, c, f);
    c.fillStyle = 'rgba(0,0,0,.25)';
    for (const f of S.foes) if (!f.ground) drawFoe(g, c, f);
    if (S.boss) drawBoss(g, c);
    for (const it of S.items) {
      if (it.k === 'wep') { g.rrect(it.x - 15, it.y - 15, 30, 30, 8, WC[it.c], '#fff', 2); g.text(it.c === 'R' ? 'V' : it.c === 'B' ? 'L' : 'H', it.x, it.y + 1, 18, '#fff'); }
      else if (it.k === 'bomb') { g.circle(it.x, it.y, 14, '#facc15'); g.text('B', it.x, it.y + 1, 16, '#111'); }
      else g.emoji('🏅', it.x, it.y + Math.sin(it.t * 6) * 3, 26);
    }
    for (const b of S.bul) {
      if (b.home) { c.save(); c.translate(b.x, b.y); c.rotate(Math.atan2(b.vy, b.vx)); g.rect(-8, -3, 16, 6, '#d8b4fe'); g.rect(-12, -2, 5, 4, '#f97316'); c.restore(); }
      else if (b.pierce) { g.rect(b.x - b.w, b.y - 22, b.w * 2, 44, 'rgba(59,130,246,.6)'); g.rect(b.x - b.w / 3, b.y - 22, (b.w * 2) / 3, 44, '#e0f2fe'); }
      else { g.rect(b.x - 3, b.y - 9, 6, 18, '#fca5a5'); g.rect(b.x - 1.5, b.y - 7, 3, 14, '#fff'); }
    }
    for (const b of S.eb) { g.circle(b.x, b.y, b.r + 2, b.col || '#f43f5e'); g.circle(b.x, b.y, b.r - 1, '#fff'); }
    const P = S.p;
    if (P.dead <= 0 && !(P.inv > 0 && Math.floor(g.time * 14) % 2)) {
      c.save(); c.translate(P.x, P.y);
      g.poly([[0, -26], [6, -10], [24, 6], [24, 12], [6, 8], [5, 18], [12, 24], [-12, 24], [-5, 18], [-6, 8], [-24, 12], [-24, 6], [-6, -10]], '#cbd5e1', '#334155', 1.5);
      g.poly([[0, -18], [3, -8], [-3, -8]], '#38bdf8');
      g.circle(0, 28, 4 + Math.random() * 3, '#fb923c');
      g.circle(0, 0, 3, WC[S.wep]);
      c.restore();
      if (S.grazeT > 0) g.ring(P.x, P.y, 22, 'rgba(255,255,255,.4)', 1);
    }
    if (S.bombFx > 0) { c.globalAlpha = Math.min(1, S.bombFx); g.circle(S.bx, S.by, (1.5 - S.bombFx) * 700, 'rgba(255,237,160,.45)'); c.globalAlpha = 1; }
    // HUD
    g.rrect(8, 744, 160, 48, 8, 'rgba(0,0,0,.5)');
    g.text(`${WN[S.wep]} Lv${S.lv}`, 88, 760, 16, WC[S.wep]);
    for (let i = 0; i < S.bombs; i++) g.emoji('💣', 24 + i * 20, 780, 16);
    for (let i = 0; i < Math.max(0, S.lives); i++) g.emoji('✈️', 580 - i * 24, 776, 18);
    if (S.banner > 0) { c.globalAlpha = Math.min(1, S.banner); g.text(`STAGE ${S.stage + 1}`, 300, 330, 46, '#fde047'); g.text(st.n, 300, 380, 24, '#fff'); c.globalAlpha = 1; }
    if (S.clear > 0) g.text('보스 격파!', 300, 360, 44, '#4ade80');
    if (S.boss && S.boss.y < 60) g.text('⚠ 거대 병기 접근 ⚠', 300, 300, 30, Math.floor(g.time * 6) % 2 ? '#ef4444' : '#fff');
  },
});
function genDeco() { const st = RSTG[S.stage]; S.deco = []; for (let i = 0; i < 16; i++) S.deco.push({ x: U.rand(20, 580), y: U.rand(-100, 800), e: U.choice(st.deco) }); }
function fire(g) {
  const P = S.p, L = S.lv;
  if (S.wep === 'R') {
    S.cd = 0.09;
    const n = 1 + Math.min(4, Math.floor((L + 1) / 2)), spread = 0.08 + L * 0.03;
    for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (n === 1 ? 0 : (i / (n - 1) - 0.5) * spread * 2); S.bul.push({ x: P.x + (i - (n - 1) / 2) * 6, y: P.y - 20, vx: Math.cos(a) * 820, vy: Math.sin(a) * 820, dmg: 1, w: 4, h: 10, life: 1.2 }); }
    g.sfx.tone(700, 0.03, 'square', 0.015, 300);
  } else if (S.wep === 'B') {
    S.cd = 0.05;
    const w = 4 + L * 2.2;
    S.bul.push({ x: P.x, y: P.y - 30, vx: 0, vy: -1100, dmg: 0.45 + L * 0.12, w, h: 22, life: 1, pierce: true });
    if (g.frame % 4 === 0) g.sfx.tone(1400, 0.03, 'sine', 0.012);
  } else {
    S.cd = 0.13;
    S.bul.push({ x: P.x, y: P.y - 20, vx: 0, vy: -820, dmg: 1, w: 4, h: 10, life: 1.2 });
    if (S.hcd <= 0) { S.hcd = Math.max(0.25, 0.75 - L * 0.06); const n = Math.min(6, 1 + Math.floor(L / 1.5)); for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (i % 2 ? 1 : -1) * (0.6 + i * 0.15); S.bul.push({ x: P.x + (i % 2 ? 14 : -14), y: P.y, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, dmg: 1.6, w: 6, h: 6, life: 2.5, home: true }); } g.sfx.tone(300, 0.06, 'sawtooth', 0.02, 600); }
  }
}
function nearest(x, y) {
  let best = null, bd = 1e9;
  for (const f of S.foes) { if (f.dead || f.y < 0) continue; const d = U.dist(x, y, f.x, f.y); if (d < bd) { bd = d; best = f; } }
  if (S.boss && !S.boss.dying && S.boss.y > 60) { const d = U.dist(x, y, S.boss.x, S.boss.y); if (d < bd) best = S.boss; }
  return best;
}
function bomb(g) {
  if (S.bombs <= 0 || S.p.dead > 0 || S.bombFx > 0) return;
  S.bombs--; S.bombFx = 1.5; S.bx = S.p.x; S.by = S.p.y - 100; S.p.inv = Math.max(S.p.inv, 2);
  g.shake(14, 1); g.sfx.explode(); g.sfx.tone(60, 1, 'sawtooth', 0.1, 30);
  for (const b of S.eb) g.burst(b.x, b.y, '#fde047', 1, 60, 0.4);
  S.eb.length = 0;
  for (const f of S.foes) hurt(g, f, 30);
  if (S.boss && !S.boss.dying && S.boss.y > 60) { S.boss.hp -= 40; if (S.boss.hp <= 0) bossDie(g); }
  g.burst(300, 400, ['#fde047', '#fb923c', '#fff'], 60, 500, 1.2, 5);
}
function aimShot(x, y, sp, da, col) { const a = U.angle(x, y, S.p.x, S.p.y) + da; S.eb.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 4, col }); }
function ringShot(x, y, n, sp, rot, col) { for (let i = 0; i < n; i++) { const a = rot + (i / n) * Math.PI * 2; S.eb.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 4, col }); } }
function F(k, x, y, o) { return Object.assign({ k, x, y, t: 0, hp: 2, r: 16, cd: U.rand(0.6, 2), fl: 0, sp: 160, ph: 0, vx: 0, vy: 0 }, o); }
function wave(g) {
  const lv = S.stage;
  S.waveT = Math.max(1, 2.4 - lv * 0.25) + U.rand(0, 1);
  const r = Math.random();
  if (r < 0.3) { const x = U.rand(80, 520); for (let i = 0; i < 5; i++) S.foes.push(F('dive', x + (i - 2) * 40, -30 - Math.abs(i - 2) * 30, { hp: 2 + lv, sp: 170 + lv * 15, ph: i, e: '🛩️' })); }
  else if (r < 0.5) { const L = Math.random() < 0.5; for (let i = 0; i < 6; i++) S.foes.push(F('swoop', L ? -30 - i * 40 : 630 + i * 40, 80 + i * 10, { vx: L ? 220 : -220, vy: 240, hp: 2 + lv, e: '🛩️' })); }
  else if (r < 0.68) { for (let i = 0; i < 2; i++) S.foes.push(F('tank', U.rand(60, 540), -40, { ground: true, vx: U.rand(-40, 40), hp: 6 + lv * 2, r: 18, med: true })); }
  else if (r < 0.84) { S.foes.push(F('heli', U.rand(100, 500), -40, { ty: U.rand(120, 260), hp: 10 + lv * 3, r: 22, drop: Math.random() < 0.5 ? 'wep' : 'bomb' })); }
  else { S.foes.push(F('bomber', U.rand(150, 450), -60, { hp: 30 + lv * 8, r: 36, drop: 'wep', cd: 1.5 })); }
}
function hurt(g, f, d) {
  if (f.dead) return;
  f.hp -= d; f.fl = 0.05;
  if (f.hp > 0) return;
  f.dead = true;
  const pts = { dive: 200, swoop: 200, tank: 500, heli: 1500, bomber: 4000 }[f.k];
  g.add(pts, f.x, f.y);
  g.burst(f.x, f.y, ['#fde047', '#f97316', '#ef4444', '#fff'], f.r > 30 ? 40 : 16, f.r * 10, 0.6, 4);
  g.sfx.tone(140, 0.15, 'sawtooth', 0.05, 40);
  if (f.r > 30) { g.shake(8, 0.4); g.sfx.explode(); }
  if (f.drop === 'wep') S.items.push({ k: 'wep', x: f.x, y: f.y, vx: 70, vy: 60, t: 0, c: U.choice(['R', 'B', 'P']) });
  else if (f.drop === 'bomb') S.items.push({ k: 'bomb', x: f.x, y: f.y, t: 0 });
  else if (f.med || Math.random() < 0.06) S.items.push({ k: 'med', x: f.x, y: f.y, t: 0 });
}
function die(g) {
  const P = S.p;
  if (P.dead > 0 || P.inv > 0) return;
  g.burst(P.x, P.y, ['#fff', '#fde047', '#fb923c'], 50, 350, 1, 5); g.shake(14, 0.6); g.sfx.explode();
  S.lives--; P.dead = 2; S.medal = 500;
  S.items.push({ k: 'wep', x: P.x, y: P.y - 40, vx: 80, vy: -60, t: 0, c: S.wep });
  S.lv = Math.max(1, S.lv - 2); S.eb.length = 0;
}
function spawnBoss(g) {
  const lv = S.stage;
  const kinds = [{ e: '🚢', w: 220, h: 120 }, { e: '🛳️', w: 240, h: 130 }, { e: '🏭', w: 220, h: 140 }, { e: '👾', w: 260, h: 160 }];
  S.boss = { x: 300, y: -120, w: kinds[lv].w, h: kinds[lv].h, hp: 280 + lv * 140, max: 280 + lv * 140, t: 0, fl: 0, cd: 1, pat: 0, patT: 5, lv, vx: 60 };
  g.sfx.tone(80, 1.5, 'sawtooth', 0.09);
}
function updBoss(g, dt) {
  const B = S.boss, P = S.p;
  B.t += dt; B.fl -= dt;
  if (B.dying) { B.dying -= dt; B.y += 20 * dt; if (Math.random() < 0.5) g.burst(B.x + U.rand(-B.w / 2, B.w / 2), B.y + U.rand(-B.h / 2, B.h / 2), ['#fde047', '#f97316', '#fff'], 8, 200, 0.5); if (B.dying <= 0) { S.boss = null; S.clear = 3; } return; }
  if (B.y < 160) { B.y += 60 * dt; return; }
  B.x += B.vx * dt; if (B.x < 150 || B.x > 450) B.vx *= -1;
  const rage = B.hp < B.max * 0.4 ? 1 : 0;
  B.patT -= dt; if (B.patT <= 0) { B.pat = (B.pat + 1) % 4; B.patT = 5; }
  B.cd -= dt;
  if (B.cd > 0 || P.dead > 0) return;
  const sp = 150 + B.lv * 20;
  if (B.pat === 0) { B.cd = 0.9 - rage * 0.3; ringShot(B.x, B.y, 16 + B.lv * 4, sp, B.t, '#fb7185'); }
  else if (B.pat === 1) { B.cd = 0.12; const a = B.t * 4; for (const s of [-1, 1]) S.eb.push({ x: B.x + s * 60, y: B.y + 30, vx: Math.cos(Math.PI / 2 + s * Math.sin(a) * 0.9) * sp * 1.3, vy: Math.sin(Math.PI / 2 + s * Math.sin(a) * 0.9) * sp * 1.3, r: 4, col: '#c084fc' }); }
  else if (B.pat === 2) { B.cd = 0.6 - rage * 0.2; for (let i = -3; i <= 3; i++) aimShot(B.x, B.y + 40, sp + 40, i * 0.13, '#fbbf24'); }
  else { B.cd = 1.2; for (const s of [-1, 1]) S.foes.push(F('dive', B.x + s * 90, B.y, { hp: 2, sp: 220, e: '🛩️' })); ringShot(B.x, B.y, 8, sp * 0.8, -B.t, '#38bdf8'); }
  if (g.frame % 3 === 0) g.sfx.tone(240, 0.04, 'square', 0.015);
}
function bossDie(g) {
  const B = S.boss;
  if (B.dying) return;
  B.dying = 2.5; S.eb.length = 0; g.shake(16, 2.5); g.sfx.explode();
  g.add(20000 * (B.lv + 1), B.x, B.y);
  S.items.push({ k: 'wep', x: B.x, y: B.y, vx: 60, vy: 80, t: 0, c: U.choice(['R', 'B', 'P']) }, { k: 'bomb', x: B.x - 40, y: B.y, t: 0 }, { k: 'med', x: B.x + 40, y: B.y, t: 0 });
}
function drawBoss(g, c) {
  const B = S.boss;
  c.save(); c.translate(B.x, B.y);
  if (B.dying) c.translate(U.rand(-5, 5), U.rand(-5, 5));
  g.rrect(-B.w / 2, -B.h / 2, B.w, B.h, 20, B.fl > 0 ? '#fff' : '#3f3f46', '#a1a1aa', 3);
  g.rrect(-B.w / 2 + 14, -B.h / 2 + 14, B.w - 28, B.h - 28, 14, '#52525b');
  for (const s of [-1, 1]) { g.circle(s * 70, 20, 18, '#71717a'); g.rect(s * 70 - 4, 20, 8, 30, '#18181b'); }
  g.emoji(['🚢', '🛳️', '🏭', '👾'][B.lv], 0, -6, 70);
  g.circle(0, 34, 12 + Math.sin(g.time * 9) * 3, '#ef4444');
  c.restore();
  g.rect(100, 14, 400, 10, '#450a0a'); g.rect(100, 14, (400 * Math.max(0, B.hp)) / B.max, 10, '#f43f5e'); g.stroke(100, 14, 400, 10, '#fff', 1);
}
function drawFoe(g, c, f) {
  c.save(); c.translate(f.x, f.y);
  if (f.fl > 0) c.globalAlpha = 0.5;
  if (f.k === 'tank') { g.rrect(-16, -18, 32, 36, 6, '#57534e', '#1c1917', 2); g.rect(-20, -18, 5, 36, '#292524'); g.rect(15, -18, 5, 36, '#292524'); c.rotate(U.angle(f.x, f.y, S.p.x, S.p.y) - Math.PI / 2); g.circle(0, 0, 9, '#78716c'); g.rect(-3, 0, 6, 24, '#44403c'); }
  else if (f.k === 'heli') { g.emoji('🚁', 0, 0, 48); g.line(-30 * Math.cos(f.t * 30), -30 * Math.sin(f.t * 30) * 0.3 - 14, 30 * Math.cos(f.t * 30), 30 * Math.sin(f.t * 30) * 0.3 - 14, 'rgba(255,255,255,.6)', 3); }
  else if (f.k === 'bomber') { c.rotate(Math.PI); g.poly([[0, -40], [10, -10], [50, 6], [50, 16], [10, 14], [8, 34], [-8, 34], [-10, 14], [-50, 16], [-50, 6], [-10, -10]], '#475569', '#0f172a', 2); g.circle(0, -4, 8, '#ef4444'); }
  else { c.rotate(f.k === 'swoop' ? Math.atan2(f.vy, f.vx) - Math.PI / 4 : Math.PI * 0.75); g.emoji('🛩️', 0, 0, 34); }
  c.restore();
}
