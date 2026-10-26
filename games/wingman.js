let S;
const WAVES = 10;
GAME({
  title: '공중전 에이스', w: 960, h: 640, bg: '#38bdf8', controls: 'dpad+ab', aLabel: '기관포', bLabel: '미사일',
  help: '←→ 선회 · ↑ 가속 · ↓ 감속(급선회) · Space/Z 기관포\n적을 기수 앞 원뿔 안에 두면 록온 → X/Shift 미사일 발사\nQ/E: 플레어 살포 (록온 안 된 상태에서 X도 플레어)\n적 미사일 경보가 울리면 플레어로 유도를 끊어라!\n마우스: 커서 방향으로 선회, 클릭 기관포, 우클릭 미사일 · 10웨이브 생존',
  init(g) {
    S = { p: { x: 0, y: 0, a: -Math.PI / 2, v: 280, hp: 100, inv: 2, cd: 0, mis: 6, fl: 12, flCd: 0, lockT: 0, lock: null, heat: 0 },
      foes: [], bul: [], mis: [], flares: [], items: [], clouds: [], wave: 0, waveT: 2, banner: 0, kills: 0, warn: 0, trail: [] };
    for (let i = 0; i < 40; i++) S.clouds.push({ x: U.rand(-1500, 1500), y: U.rand(-1500, 1500), s: U.rand(0.6, 1.8), z: U.rand(0.5, 1) });
  },
  update(g, dt) {
    const P = S.p;
    S.banner -= dt;
    // 조종
    let turn = g.right - g.left;
    if (g.mouse.down || g.mouse.moved) S.mouseCtl = true;
    if (turn || g.up || g.down) S.mouseCtl = false;
    if (S.mouseCtl) { const ta = Math.atan2(g.mouse.y - 320, g.mouse.x - 480); let d = ta - P.a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; turn = U.clamp(d * 3, -1, 1); }
    const target = g.up ? 440 : g.down ? 190 : 290;
    P.v = U.lerp(P.v, target, dt * 1.5);
    const tr = 2.9 - (P.v - 190) / 250 * 1.1;
    P.a += turn * tr * dt; P.bank = U.lerp(P.bank || 0, turn, dt * 6);
    P.x += Math.cos(P.a) * P.v * dt; P.y += Math.sin(P.a) * P.v * dt;
    P.inv -= dt; P.cd -= dt; P.flCd -= dt;
    if (g.frame % 3 === 0) { S.trail.push({ x: P.x - Math.cos(P.a) * 20, y: P.y - Math.sin(P.a) * 20, t: 0.6 }); }
    for (const t of S.trail) t.t -= dt;
    S.trail = S.trail.filter((t) => t.t > 0);
    if ((g.a || g.mouse.down) && P.cd <= 0) {
      P.cd = 0.07; P.heat = Math.min(1, P.heat + 0.03);
      for (const s of [-1, 1]) { const ox = Math.cos(P.a + Math.PI / 2) * 9 * s, oy = Math.sin(P.a + Math.PI / 2) * 9 * s, sp = U.rand(-0.03, 0.03); S.bul.push({ x: P.x + ox, y: P.y + oy, vx: Math.cos(P.a + sp) * (P.v + 700), vy: Math.sin(P.a + sp) * (P.v + 700), life: 0.8, mine: true }); }
      g.sfx.tone(180, 0.03, 'square', 0.025, 90);
    }
    // 록온
    let best = null, bd = 1e9;
    for (const f of S.foes) { const d = U.dist(P.x, P.y, f.x, f.y); if (d > 800) continue; let da = Math.atan2(f.y - P.y, f.x - P.x) - P.a; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2; if (Math.abs(da) < 0.35 && d < bd) { bd = d; best = f; } }
    if (best && best === S.lockCand) S.lockT += dt; else { S.lockCand = best; S.lockT = 0; }
    P.lock = S.lockT > 0.8 ? best : null;
    if (best && S.lockT < 0.8 && g.frame % 8 === 0) g.sfx.beep(900, 0.03);
    if (P.lock && g.frame % 4 === 0) g.sfx.beep(1400, 0.03);
    if (g.pressed('b') || g.mouse.rclick) { if (P.lock && P.mis > 0) { P.mis--; S.mis.push({ x: P.x, y: P.y, a: P.a, v: P.v + 100, tgt: P.lock, mine: true, life: 6 }); g.sfx.tone(300, 0.4, 'sawtooth', 0.05, 1200); S.lockT = 0.4; } else flare(g, P, true); }
    if (g.keyp('KeyQ') || g.keyp('KeyE')) flare(g, P, true);
    // 웨이브
    if (!S.foes.length) { S.waveT -= dt; if (S.waveT <= 0) { if (S.wave >= WAVES) { g.add(Math.round(P.hp) * 100); return g.win(`10웨이브 제압! 격추 ${S.kills}`); } spawnWave(g); } }
    // 적
    S.warn -= dt;
    for (const f of S.foes) {
      f.cd -= dt; f.mcd -= dt; f.flCd -= dt; f.fl -= dt;
      const d = U.dist(f.x, f.y, P.x, P.y);
      let want = Math.atan2(P.y - f.y, P.x - f.x);
      if (f.k === 'bomber') want = f.head;
      if (f.evade > 0) { f.evade -= dt; want = f.a + f.evDir * 1.5; }
      else if (d < 120 && f.k !== 'bomber') { f.evade = 1; f.evDir = Math.random() < 0.5 ? -1 : 1; }
      let da = want - f.a; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
      f.a += U.clamp(da, -f.tr * dt, f.tr * dt);
      f.x += Math.cos(f.a) * f.v * dt; f.y += Math.sin(f.a) * f.v * dt;
      if (f.k === 'bomber') { if (d > 1400) { f.head = Math.atan2(P.y - f.y, P.x - f.x) + U.rand(-0.5, 0.5); } if (f.cd <= 0 && d < 500) { f.cd = 0.25; const a = Math.atan2(P.y - f.y, P.x - f.x) + U.rand(-0.15, 0.15); S.bul.push({ x: f.x, y: f.y, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, life: 1.2 }); } continue; }
      if (Math.abs(da) < 0.2 && d < 520 && f.cd <= 0) { f.cd = f.ace ? 0.09 : 0.14; f.burst = (f.burst || 0) + 1; if (f.burst > 8) { f.cd = 1.2; f.burst = 0; } const sp = U.rand(-0.06, 0.06); S.bul.push({ x: f.x, y: f.y, vx: Math.cos(f.a + sp) * (f.v + 620), vy: Math.sin(f.a + sp) * (f.v + 620), life: 0.9 }); }
      if (f.mis && f.mcd <= 0 && Math.abs(da) < 0.5 && d < 800 && d > 200) { f.mcd = U.rand(5, 8) - S.wave * 0.2; S.mis.push({ x: f.x, y: f.y, a: f.a, v: f.v + 80, tgt: P, life: 7 }); S.warn = 3; g.sfx.tone(1200, 0.5, 'square', 0.04, 600); }
      if (f.flCd <= 0 && S.wave >= 2 && S.mis.some((m) => m.mine && m.tgt === f && U.dist(m.x, m.y, f.x, f.y) < 300)) { f.flCd = f.ace ? 3 : 6; if (Math.random() < (f.ace ? 0.9 : 0.25 + S.wave * 0.04)) { flare(g, f, false); f.evade = 1; f.evDir = Math.random() < 0.5 ? -1 : 1; } }
      if (d < 30 && P.inv <= 0) { hurtP(g, 30); hitF(g, f, 99); }
    }
    // 탄
    for (const b of S.bul) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.mine) { for (const f of S.foes) if (!f.dead && Math.abs(f.x - b.x) < f.r && Math.abs(f.y - b.y) < f.r) { b.life = 0; hitF(g, f, 1); break; } }
      else if (Math.abs(P.x - b.x) < 16 && Math.abs(P.y - b.y) < 16) { b.life = 0; hurtP(g, 4 + S.wave * 0.3); }
    }
    S.bul = S.bul.filter((b) => b.life > 0);
    // 미사일
    for (const m of S.mis) {
      m.life -= dt;
      if (m.tgt && (m.tgt.dead || (m.tgt.hp !== undefined && m.tgt.hp <= 0 && m.tgt !== P))) m.tgt = null;
      // 플레어 유혹
      for (const fl of S.flares) if (fl.mine !== m.mine && !fl.used && U.dist(fl.x, fl.y, m.x, m.y) < 260 && Math.random() < (m.mine ? 0.5 : 0.85) * dt * 8) { m.tgt = fl; fl.used = true; }
      if (m.tgt) { const ta = Math.atan2(m.tgt.y - m.y, m.tgt.x - m.x); let d = ta - m.a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; m.a += U.clamp(d, -(m.mine ? 3.4 : 2.3) * dt, (m.mine ? 3.4 : 2.3) * dt); }
      m.v = Math.min(m.mine ? 720 : 600, m.v + 300 * dt);
      m.x += Math.cos(m.a) * m.v * dt; m.y += Math.sin(m.a) * m.v * dt;
      if (g.frame % 2 === 0) S.trail.push({ x: m.x, y: m.y, t: 0.5, s: 1 });
      if (m.mine) { for (const f of S.foes) if (!f.dead && U.dist(f.x, f.y, m.x, m.y) < f.r + 10) { m.life = 0; hitF(g, f, 14); boom(g, m.x, m.y); break; } }
      else if (U.dist(P.x, P.y, m.x, m.y) < 20) { m.life = 0; hurtP(g, 34); boom(g, m.x, m.y); }
      if (m.tgt && m.tgt.flare && U.dist(m.x, m.y, m.tgt.x, m.tgt.y) < 20) { m.life = 0; boom(g, m.x, m.y); }
      if (m.life <= 0 && !m.boomed) { m.boomed = true; }
    }
    S.mis = S.mis.filter((m) => m.life > 0);
    for (const fl of S.flares) { fl.x += fl.vx * dt; fl.y += fl.vy * dt; fl.vx *= 0.97; fl.vy *= 0.97; fl.life -= dt; }
    S.flares = S.flares.filter((f) => f.life > 0);
    for (const it of S.items) { it.t += dt; if (U.dist(it.x, it.y, P.x, P.y) < 40) { it.got = true; if (it.k === '🔧') { P.hp = Math.min(100, P.hp + 35); g.float(480, 260, '수리 +35', '#4ade80'); } else { P.mis = Math.min(10, P.mis + 3); P.fl = Math.min(20, P.fl + 5); g.float(480, 260, '미사일 +3 플레어 +5', '#93c5fd'); } g.sfx.power(); } }
    S.items = S.items.filter((i) => !i.got && i.t < 25);
    for (const c of S.clouds) { if (c.x - P.x * c.z < -1500) c.x += 3000; if (c.x - P.x * c.z > 1500) c.x -= 3000; if (c.y - P.y * c.z < -1500) c.y += 3000; if (c.y - P.y * c.z > 1500) c.y -= 3000; }
    if (P.hp <= 0) { g.burst(480, 320, ['#fff', '#f97316', '#fde047', '#1f2937'], 70, 400, 1.2, 5); return g.over(`웨이브 ${S.wave}에서 격추 · 격추 수 ${S.kills}`); }
    S.foes = S.foes.filter((f) => !f.dead);
    g.info = `웨이브 ${S.wave}/${WAVES} · 적 ${S.foes.length} · 격추 ${S.kills}`;
  },
  draw(g, c) {
    const P = S.p, ox = 480 - P.x, oy = 320 - P.y;
    g.rect(0, 0, 960, 640, '#3b9be0');
    const gs = 160, gx = ((ox * 0.5) % gs + gs) % gs, gy = ((oy * 0.5) % gs + gs) % gs;
    for (let x = gx - gs; x < 960; x += gs) for (let y = gy - gs; y < 640; y += gs) { g.rect(x, y, gs / 2, gs / 2, 'rgba(255,255,255,.04)'); g.rect(x + gs / 2, y + gs / 2, gs / 2, gs / 2, 'rgba(255,255,255,.04)'); }
    for (const cl of S.clouds) if (cl.z < 0.8) drawCloud(g, cl.x - P.x * cl.z + 480, cl.y - P.y * cl.z + 320, cl.s, 0.35);
    c.save(); c.translate(ox, oy);
    for (const t of S.trail) { c.globalAlpha = t.t; g.circle(t.x, t.y, t.s ? 4 : 3, '#f1f5f9'); }
    c.globalAlpha = 1;
    for (const it of S.items) g.emoji(it.k, it.x, it.y + Math.sin(it.t * 4) * 4, 32);
    for (const fl of S.flares) { g.circle(fl.x, fl.y, 6 + Math.random() * 4, '#fde047'); g.circle(fl.x, fl.y, 14, 'rgba(253,224,71,.3)'); }
    for (const b of S.bul) g.line(b.x, b.y, b.x - b.vx * 0.02, b.y - b.vy * 0.02, b.mine ? '#fef08a' : '#fb7185', 2);
    for (const m of S.mis) { c.save(); c.translate(m.x, m.y); c.rotate(m.a); g.rect(-9, -2.5, 18, 5, m.mine ? '#e5e7eb' : '#fca5a5'); g.poly([[9, -2.5], [14, 0], [9, 2.5]], '#ef4444'); g.circle(-11, 0, 3 + Math.random() * 2, '#f97316'); c.restore(); }
    for (const f of S.foes) {
      c.save(); c.translate(f.x, f.y); c.rotate(f.a);
      if (f.fl > 0) c.globalAlpha = 0.5;
      plane(g, f.k === 'bomber' ? 1.8 : f.ace ? 1.15 : 1, f.k === 'bomber' ? '#57534e' : f.ace ? '#111827' : '#b91c1c', f.ace ? '#facc15' : '#fecaca');
      c.restore();
      if (f.hp < f.max) { g.rect(f.x - 20, f.y - f.r - 10, 40, 4, '#450a0a'); g.rect(f.x - 20, f.y - f.r - 10, 40 * f.hp / f.max, 4, '#ef4444'); }
      if (P.lock === f) { c.save(); c.translate(f.x, f.y); c.rotate(g.time * 2); g.stroke(-26, -26, 52, 52, '#ef4444', 3); c.restore(); g.text('LOCK', f.x, f.y - 40, 13, '#ef4444'); }
      else if (S.lockCand === f) g.ring(f.x, f.y, 34 - S.lockT * 20, '#fde047', 2);
    }
    c.save(); c.translate(P.x, P.y); c.rotate(P.a); c.scale(1, 1 - Math.abs(P.bank) * 0.25);
    if (P.inv > 0 && Math.floor(g.time * 12) % 2) c.globalAlpha = 0.5;
    plane(g, 1.1, '#e2e8f0', '#2563eb');
    if (g.up) g.poly([[-22, -4], [-34 - Math.random() * 10, 0], [-22, 4]], '#fb923c');
    c.restore();
    c.restore();
    for (const cl of S.clouds) if (cl.z >= 0.8) drawCloud(g, cl.x - P.x * cl.z + 480, cl.y - P.y * cl.z + 320, cl.s * 1.3, 0.5);
    // 화면 밖 적 표시
    for (const f of S.foes) { const sx = f.x + ox, sy = f.y + oy; if (sx > 0 && sx < 960 && sy > 0 && sy < 640) continue; const a = Math.atan2(sy - 320, sx - 480), r = 290; const ex = U.clamp(480 + Math.cos(a) * 900, 20, 940), ey = U.clamp(320 + Math.sin(a) * 900, 20, 620); c.save(); c.translate(ex, ey); c.rotate(a); g.poly([[10, 0], [-6, -7], [-6, 7]], f.ace ? '#facc15' : '#ef4444'); c.restore(); }
    for (const m of S.mis) if (!m.mine) { const sx = m.x + ox, sy = m.y + oy; if (sx < 0 || sx > 960 || sy < 0 || sy > 640) { const a = Math.atan2(sy - 320, sx - 480); g.text('🚀', U.clamp(480 + Math.cos(a) * 900, 30, 930), U.clamp(320 + Math.sin(a) * 900, 30, 610), 18); } }
    // HUD
    g.rrect(10, 560, 260, 70, 10, 'rgba(15,23,42,.6)');
    g.text('기체', 34, 580, 13, '#fff'); g.rect(60, 573, 196, 12, '#450a0a'); g.rect(60, 573, 196 * Math.max(0, P.hp) / 100, 12, P.hp > 35 ? '#4ade80' : '#ef4444');
    g.text(`🚀 ${P.mis}   ✨ ${P.fl}   속도 ${Math.round(P.v * 3)}km/h`, 140, 610, 14, '#e0f2fe');
    // 레이더
    const rx = 880, ry = 560, rr = 66;
    g.circle(rx, ry, rr, 'rgba(6,78,59,.65)'); g.ring(rx, ry, rr, '#4ade80', 2); g.ring(rx, ry, rr / 2, 'rgba(74,222,128,.3)', 1);
    for (const f of S.foes) { const dx = (f.x - P.x) / 2000 * rr, dy = (f.y - P.y) / 2000 * rr, d = Math.hypot(dx, dy), k = d > rr - 4 ? (rr - 4) / d : 1; g.circle(rx + dx * k, ry + dy * k, f.ace ? 4 : 3, f.ace ? '#facc15' : '#f87171'); }
    for (const it of S.items) { const dx = (it.x - P.x) / 2000 * rr, dy = (it.y - P.y) / 2000 * rr; if (Math.hypot(dx, dy) < rr) g.circle(rx + dx, ry + dy, 2.5, '#60a5fa'); }
    g.poly([[rx + Math.cos(P.a) * 8, ry + Math.sin(P.a) * 8], [rx + Math.cos(P.a + 2.5) * 6, ry + Math.sin(P.a + 2.5) * 6], [rx + Math.cos(P.a - 2.5) * 6, ry + Math.sin(P.a - 2.5) * 6]], '#fff');
    if (S.warn > 0 && S.mis.some((m) => !m.mine && m.tgt === P)) { if (Math.floor(g.time * 6) % 2) g.text('⚠ 미사일 경보 — 플레어! (Q/E)', 480, 90, 26, '#ef4444'); }
    if (S.banner > 0) { c.globalAlpha = Math.min(1, S.banner); g.text(`WAVE ${S.wave}`, 480, 200, 48, '#fff'); g.text(S.bannerT, 480, 250, 22, '#fde047'); c.globalAlpha = 1; }
    if (!S.foes.length && S.wave > 0 && S.waveT > 0) g.text(`웨이브 클리어! 다음까지 ${Math.ceil(S.waveT)}`, 480, 160, 26, '#fff');
    if (S.mouseCtl) g.ring(g.mouse.x, g.mouse.y, 8, 'rgba(255,255,255,.6)', 2);
    g.ring(480 + Math.cos(P.a) * 160, 320 + Math.sin(P.a) * 160, 8, 'rgba(254,240,138,.7)', 2);
  },
});
function plane(g, s, body, accent) {
  g.poly([[24 * s, 0], [8 * s, -4 * s], [2 * s, -22 * s], [-6 * s, -22 * s], [-4 * s, -4 * s], [-18 * s, -3 * s], [-22 * s, -10 * s], [-26 * s, -10 * s], [-24 * s, 0], [-26 * s, 10 * s], [-22 * s, 10 * s], [-18 * s, 3 * s], [-4 * s, 4 * s], [-6 * s, 22 * s], [2 * s, 22 * s], [8 * s, 4 * s]], body, 'rgba(0,0,0,.4)', 1.5);
  g.poly([[14 * s, 0], [6 * s, -2.5 * s], [6 * s, 2.5 * s]], '#0ea5e9');
  g.rect(-2 * s, -20 * s, 4 * s, 6 * s, accent); g.rect(-2 * s, 14 * s, 4 * s, 6 * s, accent);
}
function drawCloud(g, x, y, s, a) {
  if (x < -200 || x > 1160 || y < -200 || y > 840) return;
  const col = `rgba(255,255,255,${a})`;
  g.circle(x, y, 50 * s, col); g.circle(x + 50 * s, y + 10 * s, 40 * s, col); g.circle(x - 50 * s, y + 12 * s, 36 * s, col); g.circle(x + 10 * s, y - 25 * s, 36 * s, col);
}
function spawnWave(g) {
  S.wave++; S.waveT = 4; S.banner = 2.5;
  const P = S.p, w = S.wave;
  P.mis = Math.min(10, P.mis + 4); P.fl = Math.min(20, P.fl + 6);
  const n = 2 + Math.floor(w * 0.8);
  S.bannerT = w % 5 === 0 ? '에이스 편대 출현!' : w >= 3 && w % 3 === 0 ? '폭격기 요격!' : `적기 ${n}기 접근`;
  for (let i = 0; i < n; i++) { const a = U.rand(Math.PI * 2), d = U.rand(900, 1300); S.foes.push(F('fighter', P.x + Math.cos(a) * d, P.y + Math.sin(a) * d, { mis: w >= 3 && Math.random() < 0.3 + w * 0.05 })); }
  if (w >= 3 && w % 3 === 0) for (let i = 0; i < 2; i++) { const a = U.rand(Math.PI * 2); S.foes.push(F('bomber', P.x + Math.cos(a) * 1200, P.y + Math.sin(a) * 1200, { hp: 30, r: 34, v: 150, tr: 0.4 })); }
  if (w % 5 === 0) { const a = U.rand(Math.PI * 2); S.foes.push(F('fighter', P.x + Math.cos(a) * 1100, P.y + Math.sin(a) * 1100, { ace: true, hp: 30 + w * 2, v: 320, tr: 2.6, mis: true, r: 24 })); }
  g.sfx.tone(440, 0.2, 'square', 0.05); g.sfx.tone(660, 0.3, 'square', 0.05, null, 0.2);
}
function F(k, x, y, o) {
  const w = S.wave;
  const f = Object.assign({ k, x, y, a: U.rand(Math.PI * 2), v: 230 + w * 6 + U.rand(-20, 20), tr: 1.4 + w * 0.07, hp: 5 + Math.floor(w / 2), r: 20, cd: U.rand(1, 2), mcd: U.rand(3, 6), flCd: 0, fl: 0, evade: 0, head: 0 }, o);
  f.max = f.hp; f.head = Math.atan2(S.p.y - y, S.p.x - x);
  return f;
}
function flare(g, who, isP) {
  if (isP) { if (who.fl <= 0 || who.flCd > 0) return; who.fl--; who.flCd = 0.6; }
  for (let i = 0; i < 4; i++) { const a = who.a + Math.PI + U.rand(-1, 1); S.flares.push({ x: who.x, y: who.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 2.5, mine: !!isP, flare: true }); }
  g.sfx.tone(2000, 0.15, 'sine', 0.03, 800);
}
function boom(g, x, y) { const P = S.p; g.burst(x - P.x + 480, y - P.y + 320, ['#f97316', '#fde047', '#fff'], 18, 220, 0.5, 4); g.sfx.tone(100, 0.2, 'sawtooth', 0.05, 40); }
function hitF(g, f, d) {
  if (f.dead) return;
  f.hp -= d; f.fl = 0.06;
  // 미사일 접근 시 회피 플레어
  if (f.hp > 0) { if (d >= 10 && Math.random() < 0.5) f.evade = 1.2; return; }
  f.dead = true; S.kills++;
  const P = S.p, sx = f.x - P.x + 480, sy = f.y - P.y + 320;
  g.add(f.ace ? 3000 : f.k === 'bomber' ? 1500 : 500, sx, sy - 20);
  g.burst(sx, sy, ['#f97316', '#fde047', '#1f2937', '#fff'], f.ace ? 50 : 26, 300, 0.9, 5); g.sfx.explode(); g.shake(5, 0.25);
  if (Math.random() < (f.ace || f.k === 'bomber' ? 1 : 0.18)) S.items.push({ x: f.x, y: f.y, k: Math.random() < 0.5 ? '🔧' : '📦', t: 0 });
}
function hurtP(g, d) {
  const P = S.p;
  if (P.inv > 0) return;
  P.hp -= d; P.inv = 0.15; g.shake(Math.min(14, d / 2), 0.25); g.sfx.hit();
}
