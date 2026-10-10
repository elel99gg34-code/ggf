let S;
const PW = ['스피드', '미사일', '더블', '레이저', '옵션', '실드'];
const STAGES = [
  { n: '1 — 화산 행성', sky: '#0b0820', ter: '#7c2d12', ter2: '#c2410c', len: 70, moai: false },
  { n: '2 — 얼음 동굴', sky: '#06142a', ter: '#155e75', ter2: '#67e8f9', len: 75, moai: false },
  { n: '3 — 모아이 섬', sky: '#0f0a1a', ter: '#3f3f46', ter2: '#a1a1aa', len: 80, moai: true },
  { n: '4 — 요새 코어', sky: '#140612', ter: '#4c1d95', ter2: '#c084fc', len: 85, moai: true },
];
GAME({
  title: '우주 전투기', w: 960, h: 600, bg: '#050510', controls: 'dpad+ab', aLabel: '발사', bLabel: '파워업',
  help: '방향키/WASD 이동 · Space/Z 발사(누르고 있기)\nX/Shift: 파워업 게이지 선택 확정\n🔴 빨간 캡슐을 먹으면 게이지 커서가 한 칸 이동\n스피드→미사일→더블→레이저→옵션→실드 순서\n옵션 기체는 내 궤적을 따라오며 같이 쏩니다 (최대 4)\n지형과 탄에 닿으면 파괴! 4스테이지 보스를 모두 격파하면 클리어',
  init(g) {
    S = {
      p: { x: 140, y: 300, inv: 2, dead: 0 }, lives: 3, stage: 0, loop: 0, cam: 0, dist: 0,
      gauge: -1, spd: 0, missile: false, shot: 0, opts: 0, shield: 0, trail: [], cd: 0, mcd: 0,
      bul: [], eb: [], foes: [], caps: [], stars: [], waveT: 2, boss: null, groupId: 0, groups: {}, banner: 3, next1up: 20000, clear: 0,
    };
    for (let i = 0; i < 90; i++) S.stars.push({ x: U.rand(960), y: U.rand(600), z: U.rand(0.2, 1) });
    for (let i = 0; i < 80; i++) S.trail.push({ x: 140, y: 300 });
  },
  update(g, dt) {
    const P = S.p, st = STAGES[S.stage];
    S.banner -= dt;
    if (S.clear > 0) { S.clear -= dt; if (S.clear <= 0) nextStage(g); }
    const scroll = S.boss ? 0 : 70;
    S.cam += scroll * dt; if (!S.boss && S.clear <= 0) S.dist += dt;
    for (const s of S.stars) { s.x -= (40 + s.z * 160) * dt; if (s.x < 0) { s.x += 960; s.y = U.rand(600); } }
    // 플레이어
    if (P.dead > 0) {
      P.dead -= dt;
      if (P.dead <= 0) { if (S.lives <= 0) return g.over(`스테이지 ${S.stage + 1} · 루프 ${S.loop + 1}`); P.x = 140; P.y = 300; P.inv = 2.5; S.trail.forEach((t) => { t.x = 140; t.y = 300; }); }
    } else {
      const sp = 170 + S.spd * 55;
      let mx = g.right - g.left, my = g.down - g.up;
      if (g.mouse.down) { const dx = g.mouse.x - P.x, dy = g.mouse.y - P.y, d = Math.hypot(dx, dy); if (d > 8) { mx = dx / d; my = dy / d; } }
      const m = Math.hypot(mx, my) || 1;
      const ox = P.x, oy = P.y;
      P.x = U.clamp(P.x + (mx / m) * sp * dt, 20, 900); P.y = U.clamp(P.y + (my / m) * sp * dt, 20, 580);
      if (P.x !== ox || P.y !== oy) { S.trail.unshift({ x: P.x, y: P.y }); S.trail.length = 80; }
      P.inv -= dt;
      if (g.pressed('b') || g.mouse.rclick) activate(g);
      S.cd -= dt; S.mcd -= dt;
      if ((g.a || g.mouse.down) && S.cd <= 0) fire(g);
      const t = terr(S.cam + P.x);
      if (P.inv <= 0 && (P.y - 8 < t.top || P.y + 8 > t.bot)) kill(g);
    }
    // 내 탄
    for (const b of S.bul) {
      b.life -= dt;
      if (b.k === 'mis') {
        const t = terr(S.cam + b.x);
        if (b.y + 6 >= t.bot) { b.y = t.bot - 6; b.vy = 0; b.vx = 300; } else { b.vy = Math.min(380, b.vy + 900 * dt); b.vx = 150; }
      }
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.x > 980 || b.y < -20 || b.y > 620) b.life = 0;
      if (b.k !== 'mis' && b.k !== 'las') { const t = terr(S.cam + b.x); if (b.y < t.top || b.y > t.bot) b.life = 0; }
    }
    // 적
    S.waveT -= dt;
    if (!S.boss && S.clear <= 0) {
      if (S.dist < st.len && S.waveT <= 0) spawnWave(g);
      if (S.dist >= st.len && !S.foes.length) spawnBoss(g);
    }
    const lvl = S.stage + S.loop * 4;
    for (const f of S.foes) {
      f.t += dt; f.flash -= dt;
      if (f.k === 'fan') { f.x -= f.sp * dt; f.y = f.y0 + Math.sin(f.t * 3 + f.ph) * 90; }
      else if (f.k === 'rush') { if (f.t < 0.8) f.x -= 260 * dt; else { const a = U.angle(f.x, f.y, P.x, P.y); f.vx = U.lerp(f.vx, Math.cos(a) * 260, dt * 1.5); f.vy = U.lerp(f.vy, Math.sin(a) * 260, dt * 1.5); f.x += f.vx * dt; f.y += f.vy * dt; } }
      else if (f.k === 'red') { f.x -= 180 * dt; f.y = f.y0 + Math.sin(f.t * 5) * 40; }
      else if (f.k === 'turret' || f.k === 'hatch' || f.k === 'moai') {
        f.x -= 70 * dt;
        f.cd -= dt;
        if (f.cd <= 0 && f.x < 940 && P.dead <= 0) {
          if (f.k === 'turret') { f.cd = Math.max(0.8, 2.4 - lvl * 0.2); aim(f.x, f.y, 200 + lvl * 15); }
          else if (f.k === 'hatch') { f.cd = 2.2; for (let i = 0; i < 2; i++) S.foes.push(mk('rush', f.x, f.y + (f.up ? 20 : -20), { hp: 1 })); }
          else { f.cd = 1.8; for (let i = 0; i < 3; i++) g.later(() => !f.dead && aim(f.x - 20, f.y, 160, true), i * 0.15); }
        }
      }
      else if (f.k === 'zig') { f.x -= 150 * dt; f.y += f.vy * dt; if (f.y < 60 || f.y > 540) f.vy *= -1; f.cd -= dt; if (f.cd <= 0) { f.cd = 2; aim(f.x, f.y, 220); } }
      if (f.x < -60 || f.x > 1200) f.gone = true;
      if (P.dead <= 0 && P.inv <= 0 && Math.abs(f.x - P.x) < f.r + 10 && Math.abs(f.y - P.y) < f.r + 8) { if (!hitShield(g)) kill(g); if (f.k !== 'moai') hurt(g, f, 99); }
    }
    for (const b of S.bul) {
      if (b.life <= 0) continue;
      for (const f of S.foes) if (!f.dead && !(b.hit && b.hit.has(f)) && Math.abs(b.x - f.x) < f.r + (b.k === 'las' ? 40 : 6) && Math.abs(b.y - f.y) < f.r + 4) {
        if (f.k === 'moai' && b.x > f.x - 10 && !f.open) { b.life = 0; g.sfx.tone(1400, 0.02, 'square', 0.02); break; }
        hurt(g, f, b.k === 'las' ? 1.5 : 1);
        if (b.k === 'las') { b.hit = b.hit || new Set(); b.hit.add(f); } else { b.life = 0; break; }
      }
      if (S.boss && b.life > 0) bossHit(g, b);
    }
    S.bul = S.bul.filter((b) => b.life > 0);
    S.foes = S.foes.filter((f) => !f.dead && !f.gone);
    if (S.boss) updBoss(g, dt);
    // 적 탄
    for (const b of S.eb) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.beam) continue;
      if (P.dead <= 0 && P.inv <= 0 && Math.abs(b.x - P.x) < (b.w || 4) + 10 && Math.abs(b.y - P.y) < (b.h || 4) + 5) { b.life = 0; if (!hitShield(g)) kill(g); }
    }
    S.eb = S.eb.filter((b) => b.life > 0 && b.x > -100 && b.x < 1100 && b.y > -40 && b.y < 640);
    // 캡슐
    for (const c of S.caps) {
      c.x -= 70 * dt; c.t += dt;
      if (P.dead <= 0 && U.dist(c.x, c.y, P.x, P.y) < 26) {
        c.got = true; g.sfx.coin();
        if (c.blue) { for (const f of S.foes) if (f.x < 960) hurt(g, f, 99); S.eb.length = 0; g.shake(8); g.burst(c.x, c.y, '#60a5fa', 40, 400, 0.8); }
        else { S.gauge = (S.gauge + 1) % PW.length; g.add(500, c.x, c.y - 20); }
      }
    }
    S.caps = S.caps.filter((c) => !c.got && c.x > -30);
    // 옵션 위치
    if (g.score >= S.next1up) { S.next1up += 30000; S.lives++; g.float(480, 260, '1UP!', '#4ade80', 34); g.sfx.power(); }
    g.info = `스테이지 ${S.stage + 1}${S.loop ? '+' + S.loop : ''} · ❤️×${S.lives}`;
  },
  draw(g, c) {
    const st = STAGES[S.stage];
    g.rect(0, 0, 960, 600, st.sky);
    for (const s of S.stars) g.rect(s.x, s.y, s.z * 2.5, s.z * 2.5, `rgba(255,255,255,${0.3 + s.z * 0.6})`);
    // 지형
    c.fillStyle = st.ter; c.beginPath(); c.moveTo(0, 0);
    for (let x = 0; x <= 960; x += 16) c.lineTo(x, terr(S.cam + x).top);
    c.lineTo(960, 0); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(0, 600);
    for (let x = 0; x <= 960; x += 16) c.lineTo(x, terr(S.cam + x).bot);
    c.lineTo(960, 600); c.closePath(); c.fill();
    c.strokeStyle = st.ter2; c.lineWidth = 3;
    c.beginPath(); for (let x = 0; x <= 960; x += 16) { const y = terr(S.cam + x).top; x ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
    c.beginPath(); for (let x = 0; x <= 960; x += 16) { const y = terr(S.cam + x).bot; x ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
    // 캡슐
    for (const k of S.caps) { g.circle(k.x, k.y, 11, k.blue ? '#2563eb' : '#dc2626'); g.ring(k.x, k.y, 11 + Math.sin(k.t * 8) * 2, '#fff', 2); g.circle(k.x - 3, k.y - 3, 3, 'rgba(255,255,255,.7)'); }
    // 적
    for (const f of S.foes) drawFoe(g, c, f);
    if (S.boss) drawBoss(g, c);
    // 내 탄
    for (const b of S.bul) {
      if (b.k === 'las') g.rect(b.x - 40, b.y - 2, 80, 4, '#67e8f9');
      else if (b.k === 'mis') g.poly([[b.x + 8, b.y], [b.x - 6, b.y - 4], [b.x - 6, b.y + 4]], '#fbbf24');
      else g.rect(b.x - 6, b.y - 2, 12, 4, '#fde68a');
    }
    for (const b of S.eb) {
      if (b.beam) { g.rect(b.x - b.w, b.y - b.h, b.w * 2, b.h * 2, '#f472b6'); g.rect(b.x - b.w, b.y - 1, b.w * 2, 2, '#fff'); }
      else if (b.ring) { g.ring(b.x, b.y, 7, '#f97316', 3); }
      else { g.circle(b.x, b.y, 5, '#fb7185'); g.circle(b.x, b.y, 2, '#fff'); }
    }
    // 옵션
    for (let i = 0; i < S.opts; i++) { const o = optPos(i); g.circle(o.x, o.y, 9, '#ea580c'); g.circle(o.x, o.y, 6 + Math.sin(g.time * 10 + i) * 1.5, '#fdba74'); }
    // 플레이어
    const P = S.p;
    if (P.dead <= 0 && !(P.inv > 0 && Math.floor(g.time * 12) % 2)) {
      c.save(); c.translate(P.x, P.y);
      g.poly([[-18, -4], [-6, -12], [16, -3], [22, 0], [16, 4], [-6, 10], [-18, 6]], '#e5e7eb', '#94a3b8', 1);
      g.poly([[-12, -10], [-2, -20], [4, -20], [-2, -8]], '#93c5fd');
      g.poly([[-12, 8], [-2, 18], [4, 18], [-2, 6]], '#93c5fd');
      g.rect(-2, -3, 10, 5, '#2563eb');
      g.circle(-21, 1, 4 + Math.random() * 3, '#fb923c');
      if (S.shield > 0) { c.globalAlpha = 0.35 + S.shield * 0.08; g.ring(4, 0, 26, '#38bdf8', 4); c.globalAlpha = 1; }
      c.restore();
    }
    // HUD 게이지
    const gx = 150, gy = 574;
    for (let i = 0; i < PW.length; i++) {
      const on = i === S.gauge, done = isMaxed(i);
      g.rrect(gx + i * 112, gy - 14, 106, 26, 4, on ? '#f59e0b' : 'rgba(30,41,59,.85)', '#fbbf24', 1);
      g.text(done ? '—' : PW[i], gx + i * 112 + 53, gy, 14, on ? '#111' : '#fde68a');
    }
    g.text(`❤️ ${S.lives}`, 60, 574, 18, '#fff');
    if (S.banner > 0) { c.globalAlpha = Math.min(1, S.banner); g.text(`STAGE ${st.n}`, 480, 260, 40, '#fde047'); g.text(S.loop ? `루프 ${S.loop + 1} — 적이 더 강해졌다!` : '빨간 캡슐을 모아 파워업!', 480, 305, 18, '#fff'); c.globalAlpha = 1; }
    if (S.clear > 0) g.text('스테이지 클리어!', 480, 280, 44, '#4ade80');
    if (S.boss && S.boss.intro > 0) g.text('⚠ WARNING ⚠', 480, 200, 44, Math.floor(g.time * 6) % 2 ? '#ef4444' : '#fff');
  },
});
function terr(wx) {
  const s = S.stage + 1;
  const e1 = U.clamp(Math.sin(wx * 0.0011 + s) * 2.2 - 0.3, 0, 1), e2 = U.clamp(Math.sin(wx * 0.0009 + s * 1.7) * 2.2 + 0.2, 0, 1);
  const top = e1 * (45 + 35 * Math.sin(wx * 0.006 * s * 0.6 + s) + 25 * Math.sin(wx * 0.017 + s * 3));
  const bot = 600 - (14 + e2 * (50 + 40 * Math.sin(wx * 0.005 + s * 2) + 22 * Math.sin(wx * 0.021 + s)));
  return { top: Math.max(0, top), bot: Math.min(600, bot) };
}
function isMaxed(i) {
  return (i === 0 && S.spd >= 4) || (i === 1 && S.missile) || (i === 2 && S.shot === 1) || (i === 3 && S.shot === 2) || (i === 4 && S.opts >= 4) || (i === 5 && S.shield > 0);
}
function activate(g) {
  const i = S.gauge;
  if (i < 0 || isMaxed(i)) { g.sfx.beep(200, 0.08); return; }
  if (i === 0) S.spd++;
  if (i === 1) S.missile = true;
  if (i === 2) S.shot = 1;
  if (i === 3) S.shot = 2;
  if (i === 4) S.opts++;
  if (i === 5) S.shield = 5;
  g.float(S.p.x, S.p.y - 30, PW[i] + '!', '#fde047', 22);
  g.sfx.power(); S.gauge = -1;
}
function optPos(i) { return S.trail[Math.min(S.trail.length - 1, (i + 1) * 15)]; }
function fire(g) {
  S.cd = S.shot === 2 ? 0.16 : 0.11;
  const srcs = [S.p]; for (let i = 0; i < S.opts; i++) srcs.push(optPos(i));
  const mine = S.bul.filter((b) => b.k !== 'mis').length;
  if (mine > 14 + S.opts * 6) return;
  for (const s of srcs) {
    if (S.shot === 2) S.bul.push({ k: 'las', x: s.x + 50, y: s.y, vx: 900, vy: 0, life: 1.2 });
    else {
      S.bul.push({ k: 'n', x: s.x + 16, y: s.y, vx: 720, vy: 0, life: 1.5 });
      if (S.shot === 1) S.bul.push({ k: 'n', x: s.x + 10, y: s.y - 4, vx: 500, vy: -500, life: 1.5 });
    }
    if (S.missile && S.mcd <= 0) S.bul.push({ k: 'mis', x: s.x, y: s.y + 8, vx: 150, vy: 60, life: 4 });
  }
  if (S.missile && S.mcd <= 0) S.mcd = 0.7;
  g.sfx.tone(S.shot === 2 ? 1200 : 900, 0.05, S.shot === 2 ? 'sine' : 'square', 0.025, 400);
}
function mk(k, x, y, o = {}) { return Object.assign({ k, x, y, y0: y, t: 0, hp: 1, r: 14, flash: 0, cd: U.rand(0.5, 2), vx: -200, vy: 0, ph: 0, sp: 200 }, o); }
function spawnWave(g) {
  const lvl = S.stage + S.loop * 4, P = S.p;
  S.waveT = Math.max(0.9, 2.6 - lvl * 0.2) + U.rand(0, 0.8);
  const r = Math.random(), wx = S.cam + 1000, t = terr(wx);
  const hpK = 1 + Math.floor(lvl / 3);
  if (r < 0.3) {
    const id = ++S.groupId, y0 = U.rand(Math.max(140, t.top + 100), Math.min(460, t.bot - 100)), n = 5;
    S.groups[id] = n;
    for (let i = 0; i < n; i++) S.foes.push(mk('fan', 1000 + i * 45, y0, { y0, ph: -i * 0.5, group: id, sp: 210 + lvl * 10, hp: hpK }));
  } else if (r < 0.45) {
    S.foes.push(mk('red', 1000, U.rand(Math.max(120, t.top + 60), Math.min(480, t.bot - 60)), { cap: true, hp: hpK, r: 15 }));
  } else if (r < 0.62) {
    const up = Math.random() < 0.5 && t.top > 30;
    S.foes.push(mk(Math.random() < 0.3 ? 'hatch' : 'turret', 1000, up ? t.top + 12 : t.bot - 12, { up, hp: 2 * hpK, r: 16 }));
  } else if (r < 0.75 && STAGES[S.stage].moai) {
    const up = t.top > 60 && Math.random() < 0.4;
    S.foes.push(mk('moai', 1000, up ? t.top + 34 : t.bot - 34, { up, hp: 8 * hpK, r: 30, cd: 1 }));
  } else if (r < 0.88) {
    for (let i = 0; i < 3; i++) S.foes.push(mk('zig', 1000 + i * 60, U.rand(120, 480), { vy: U.choice([-120, 120]), hp: hpK, r: 14 }));
  } else {
    for (let i = 0; i < 4; i++) S.foes.push(mk('rush', 1000 + i * 30, P.y + U.rand(-120, 120), { hp: 1, r: 12, vx: -260 }));
  }
}
function aim(x, y, sp, ring) {
  const a = U.angle(x, y, S.p.x, S.p.y);
  S.eb.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 6, ring });
}
function hurt(g, f, d) {
  if (f.dead) return;
  f.hp -= d; f.flash = 0.08;
  if (f.hp > 0) { g.sfx.tone(300, 0.03, 'square', 0.02); return; }
  f.dead = true;
  const pts = { fan: 100, red: 300, turret: 200, hatch: 500, moai: 1000, zig: 150, rush: 80 }[f.k] || 100;
  g.add(pts * (1 + S.loop), f.x, f.y - 16);
  g.burst(f.x, f.y, ['#fde047', '#f97316', '#fff'], f.k === 'moai' ? 30 : 14, 220, 0.5, 3);
  g.sfx.tone(160, 0.12, 'sawtooth', 0.04, 50);
  if (f.cap) dropCap(f.x, f.y);
  if (f.group && --S.groups[f.group] === 0) { dropCap(f.x, f.y); g.float(f.x, f.y - 40, '편대 전멸!', '#fca5a5', 18); }
  if (f.k === 'moai') g.shake(5, 0.2);
}
function dropCap(x, y) { S.caps.push({ x, y, t: 0, blue: Math.random() < 0.08 }); }
function hitShield(g) {
  if (S.shield <= 0) return false;
  S.shield--; S.p.inv = 0.6; g.sfx.tone(600, 0.1, 'sine', 0.06, 200); g.burst(S.p.x + 20, S.p.y, '#38bdf8', 10, 180, 0.4);
  return true;
}
function kill(g) {
  const P = S.p;
  if (P.dead > 0 || P.inv > 0) return;
  g.burst(P.x, P.y, ['#fff', '#fb923c', '#fde047'], 50, 360, 1, 4);
  g.shake(12, 0.5); g.sfx.explode();
  S.lives--; P.dead = 2;
  S.spd = Math.max(0, S.spd - 2); S.missile = false; S.shot = 0; S.opts = Math.max(0, S.opts - 2); S.shield = 0; S.gauge = -1;
  S.eb.length = 0;
}
function spawnBoss(g) {
  const lvl = S.stage + S.loop * 4;
  S.boss = { x: 1100, y: 300, tx: 760, t: 0, intro: 2.5, walls: [6 + lvl, 6 + lvl, 6 + lvl], core: 12 + lvl * 3, flash: 0, fireT: 2, vy: 90, lvl, kind: S.stage % 2 };
  g.sfx.tone(90, 1.2, 'sawtooth', 0.08);
}
function updBoss(g, dt) {
  const B = S.boss, P = S.p;
  B.t += dt; B.flash -= dt; B.intro -= dt;
  B.x = U.lerp(B.x, B.tx, dt * 1.2);
  if (B.dying) {
    B.dying -= dt;
    if (Math.random() < 0.4) g.burst(B.x + U.rand(-60, 60), B.y + U.rand(-50, 50), ['#fde047', '#f97316', '#fff'], 10, 200, 0.5);
    if (B.dying <= 0) { S.boss = null; S.clear = 3; g.add(5000 * (S.stage + 1) * (1 + S.loop), 480, 240); g.sfx.win(); }
    return;
  }
  if (B.intro > 0) return;
  B.y += B.vy * dt; if (B.y < 120 || B.y > 480) { B.vy *= -1; B.y = U.clamp(B.y, 120, 480); }
  if (B.kind === 1) B.vy = U.lerp(B.vy, Math.sign(P.y - B.y) * (90 + B.lvl * 10), dt);
  B.fireT -= dt;
  if (B.fireT <= 0 && P.dead <= 0) {
    B.fireT = Math.max(0.7, 1.8 - B.lvl * 0.12);
    for (const oy of [-70, -30, 30, 70]) S.eb.push({ x: B.x - 40, y: B.y + oy, vx: -520, vy: 0, life: 4, w: 26, h: 3, beam: false });
    if (B.lvl >= 2) for (let i = -2; i <= 2; i++) { const a = Math.PI + i * 0.25; S.eb.push({ x: B.x - 60, y: B.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 6 }); }
    g.sfx.tone(500, 0.15, 'sawtooth', 0.04, 1500);
  }
  if (P.dead <= 0 && P.inv <= 0 && Math.abs(P.x - B.x) < 70 && Math.abs(P.y - B.y) < 80) { if (!hitShield(g)) kill(g); }
}
function bossHit(g, b) {
  const B = S.boss;
  if (!B || B.dying || B.intro > 0) return;
  if (b.x < B.x - 90 || b.x > B.x + 70 || Math.abs(b.y - B.y) > 85) return;
  b.life = 0;
  const dmg = b.k === 'las' ? 1.5 : 1;
  if (Math.abs(b.y - B.y) < 16 && b.x < B.x + 10) {
    const wi = B.walls.findIndex((w) => w > 0);
    if (wi >= 0) { B.walls[wi] -= dmg; g.sfx.tone(700, 0.03, 'square', 0.03); if (B.walls[wi] <= 0) { g.burst(B.x - 60 + wi * 14, B.y, '#c084fc', 16, 200, 0.4); g.sfx.drop(); g.add(300, B.x - 60, B.y - 30); } }
    else { B.core -= dmg; B.flash = 0.06; g.sfx.tone(1000, 0.03, 'square', 0.03); if (B.core <= 0) { B.dying = 2.2; g.shake(14, 2); g.sfx.explode(); S.eb.length = 0; } }
  } else g.sfx.tone(1500, 0.015, 'square', 0.015);
}
function drawBoss(g, c) {
  const B = S.boss, st = STAGES[S.stage];
  c.save(); c.translate(B.x, B.y);
  if (B.dying) c.translate(U.rand(-4, 4), U.rand(-4, 4));
  g.poly([[-40, -20], [60, -80], [80, -80], [40, -10], [40, 10], [80, 80], [60, 80], [-40, 20]], '#334155', '#94a3b8', 2);
  for (const oy of [-70, -30, 30, 70]) g.rect(-50, oy - 4, 60, 8, '#475569');
  g.rrect(-30, -30, 80, 60, 10, '#1e293b', st.ter2, 2);
  for (let i = 0; i < 3; i++) if (B.walls[i] > 0) g.rect(-60 + i * 14, -14, 9, 28, '#a78bfa');
  const pulse = 0.6 + Math.sin(g.time * 8) * 0.4;
  g.circle(8, 0, 14, B.flash > 0 ? '#fff' : `rgba(56,189,248,${pulse})`);
  g.ring(8, 0, 16, '#e0f2fe', 2);
  c.restore();
  const tot = 3 * (6 + B.lvl) + 12 + B.lvl * 3, now = B.walls.reduce((a, w) => a + Math.max(0, w), 0) + Math.max(0, B.core);
  g.rect(330, 16, 300, 8, '#3f0f1f'); g.rect(330, 16, (300 * now) / tot, 8, '#f43f5e'); g.text('빅 코어', 480, 34, 13, '#fecdd3');
}
function drawFoe(g, c, f) {
  c.save(); c.translate(f.x, f.y);
  if (f.flash > 0) c.globalAlpha = 0.5;
  if (f.k === 'fan') { c.rotate(f.t * 6); g.poly([[0, -12], [5, 0], [0, 12], [-5, 0]], '#60a5fa'); g.poly([[-12, 0], [0, -5], [12, 0], [0, 5]], '#93c5fd'); }
  else if (f.k === 'red') { g.circle(0, 0, 14, '#dc2626'); g.ring(0, 0, 14, '#fecaca', 2); g.circle(-4, -2, 4, '#fff'); }
  else if (f.k === 'rush') { g.poly([[-12, 0], [10, -9], [4, 0], [10, 9]], '#f472b6', '#fff', 1); }
  else if (f.k === 'zig') { g.emoji('👾', 0, 0, 30); }
  else if (f.k === 'turret') { const a = U.angle(f.x, f.y, S.p.x, S.p.y); if (f.up) c.scale(1, -1); g.rrect(-14, -4, 28, 16, 4, '#65a30d'); c.rotate(f.up ? -a : a); g.rect(0, -3, 20, 6, '#a3e635'); }
  else if (f.k === 'hatch') { if (f.up) c.scale(1, -1); g.rrect(-18, -10, 36, 22, 6, '#92400e', '#fbbf24', 2); g.rect(-10, -14, 20, 4 + Math.abs(Math.sin(f.t * 3)) * 6, '#fbbf24'); }
  else if (f.k === 'moai') { if (f.up) c.scale(1, -1); g.emoji('🗿', 0, 0, 64); f.open = f.cd < 0.6; if (f.open) g.circle(-12, 14, 6, '#f97316'); }
  c.restore();
}
function nextStage(g) {
  S.stage++;
  if (S.stage >= STAGES.length) {
    g.add(20000 + S.lives * 5000); S.stage = STAGES.length - 1; return g.win(`4개 행성의 빅 코어 전멸! 남은 목숨 ${S.lives}`);
  }
  S.dist = 0; S.cam = 0; S.banner = 3; S.waveT = 2; S.foes.length = 0; S.eb.length = 0; S.caps.length = 0;
  S.p.inv = 2;
}
