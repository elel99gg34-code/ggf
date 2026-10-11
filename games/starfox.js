let S;
const FL = 520, CX = 480, CY = 270, SPD = 820, PZ = 140;
const SF = [
  { n: '코네리아 평원', sky: ['#1e3a8a', '#60a5fa'], ground: '#166534', line: '#22c55e', obs: 'tower', len: 55, boss: '🦂' },
  { n: '소행성 지대', sky: ['#020617', '#1e1b4b'], ground: null, line: null, obs: 'rock', len: 60, boss: '🐙' },
  { n: '우주 요새', sky: ['#1a0b1e', '#4a044e'], ground: '#27272a', line: '#a855f7', obs: 'gate', len: 65, boss: '👁️' },
];
GAME({
  title: '스타 비행대', w: 960, h: 600, bg: '#000', controls: 'dpad+ab', aLabel: '레이저', bLabel: '롤',
  help: '방향키/WASD 또는 마우스로 기체 조종 · Space/Z 레이저\nSpace 길게 누르면 차지샷 → 조준선 근처 적 록온 유도탄\nX/Shift 배럴 롤: 적 탄을 튕겨냄\n🟡 링 통과: 실드 회복 · 🔵 링 3연속: 레이저 강화\n3개 스테이지 보스를 격파하라!',
  init(g) {
    S = { cam: 0, cx: 0, cy: 0, p: { x: 0, y: 0, vx: 0, vy: 0, bank: 0, roll: 0, rollCd: 0, inv: 1, sh: 100 },
      stage: 0, dist: 0, objs: [], shots: [], eshots: [], charge: 0, lock: null, waveT: 1, ringT: 3, obsT: 1, boss: null,
      hits: 0, ringCombo: 0, laser: 1, banner: 3, clear: 0, stars: [], fireCd: 0, hold: 0 };
    for (let i = 0; i < 120; i++) S.stars.push({ x: U.rand(-3000, 3000), y: U.rand(-2000, 2000), z: U.rand(0, 4000) });
  },
  update(g, dt) {
    const P = S.p, st = SF[S.stage];
    S.banner -= dt;
    S.cam += SPD * dt;
    if (S.clear > 0) { S.clear -= dt; if (S.clear <= 0) { if (S.stage >= SF.length - 1) { g.add(Math.round(P.sh) * 100 + S.hits * 50); return g.win(`전 스테이지 클리어! 격추 ${S.hits}`); } S.stage++; S.dist = 0; S.banner = 3; S.objs.length = 0; S.eshots.length = 0; P.sh = Math.min(100, P.sh + 40); } }
    else if (!S.boss) S.dist += dt;
    // 조종
    let ax = g.right - g.left, ay = g.down - g.up;
    if (g.mouse.moved || g.mouse.down) S.mouseCtl = true;
    if (ax || ay) S.mouseCtl = false;
    if (S.mouseCtl) { const tx = ((g.mouse.x - CX) / 440) * 330, ty = ((g.mouse.y - CY) / 260) * 220; ax = U.clamp((tx - P.x) / 60, -1, 1); ay = U.clamp((ty - P.y) / 60, -1, 1); }
    P.vx = U.lerp(P.vx, ax * 420, dt * 6); P.vy = U.lerp(P.vy, ay * 360, dt * 6);
    P.x = U.clamp(P.x + P.vx * dt, -330, 330); P.y = U.clamp(P.y + P.vy * dt, -220, st.ground ? 170 : 220);
    P.bank = U.lerp(P.bank, -P.vx / 900, dt * 8);
    S.cx = U.lerp(S.cx, P.x * 0.55, dt * 5); S.cy = U.lerp(S.cy, P.y * 0.5, dt * 5);
    P.inv -= dt; P.rollCd -= dt;
    if (P.roll > 0) P.roll -= dt;
    if ((g.pressed('b') || g.mouse.rclick) && P.rollCd <= 0) { P.roll = 0.6; P.rollCd = 1.1; g.sfx.tone(300, 0.4, 'triangle', 0.05, 900); }
    // 사격 / 차지
    S.fireCd -= dt;
    const firing = g.a || g.mouse.down;
    if (firing) {
      S.hold += dt;
      if (g.pressed('a') || g.mouse.clicked) shoot(g);
      if (S.hold > 0.35) { S.charge = Math.min(1, S.charge + dt * 1.5); if (S.charge >= 1 && !S.lock) S.lock = findLock(); }
    } else {
      if (S.charge >= 1) bombShot(g);
      S.charge = 0; S.hold = 0; S.lock = null;
    }
    if (S.lock && (S.lock.dead || S.lock.z < S.cam)) S.lock = null;
    // 스폰
    const pz = S.cam + PZ;
    if (!S.boss && S.clear <= 0) {
      S.waveT -= dt; S.ringT -= dt; S.obsT -= dt;
      if (S.dist < st.len) {
        if (S.waveT <= 0) wave(g);
        if (S.ringT <= 0) { S.ringT = U.rand(3, 5); const blue = Math.random() < 0.35; S.objs.push({ k: 'ring', x: U.rand(-250, 250), y: U.rand(-160, st.ground ? 120 : 160), z: S.cam + 4200, r: 90, blue }); }
        if (S.obsT <= 0) obstacle(g, st);
      } else if (!S.objs.some((o) => o.k === 'foe')) spawnBoss(g);
    }
    // 오브젝트
    const lvl = S.stage;
    for (const o of S.objs) {
      o.t = (o.t || 0) + dt;
      if (o.k === 'foe') {
        o.z += o.vz * dt;
        if (o.pat === 'sine') { o.x = o.x0 + Math.sin(o.t * 2 + o.ph) * 160; o.y = o.y0 + Math.cos(o.t * 1.6 + o.ph) * 60; }
        else if (o.pat === 'cross') { o.x += o.vx * dt; }
        else if (o.pat === 'dive') { o.x = U.lerp(o.x, P.x, dt * 0.6); o.y = U.lerp(o.y, P.y, dt * 0.6); }
        o.cd -= dt; o.fl -= dt;
        const dz = o.z - pz;
        if (o.cd <= 0 && dz > 300 && dz < 2600) { o.cd = U.rand(1.6, 3) - lvl * 0.3; enemyShot(o, 1000 + lvl * 120); }
      }
      if (o.k === 'rock') { o.x += o.vx * dt; o.y += o.vy * dt; o.rot += dt * o.spin; }
      if (o.k === 'gate') { o.ph += dt * 1.6; }
      // 플레이어 충돌
      if (!o.done && o.z < pz + 30 && o.z > pz - 60) {
        if (o.k === 'ring') { o.done = true; if (Math.hypot(o.x - P.x, o.y - P.y) < o.r) passRing(g, o); else S.ringCombo = 0; }
        else if (o.k === 'tower') { o.done = true; if (Math.abs(o.x - P.x) < o.w / 2 + 24 && P.y > 260 - o.h - 14) damage(g, 20); }
        else if (o.k === 'rock') { if (!o.dead && Math.hypot(o.x - P.x, o.y - P.y) < o.r + 20) { o.done = true; damage(g, 15); o.dead = true; g.burst(CX, CY, '#a8a29e', 20, 300, 0.6); } }
        else if (o.k === 'gate') { o.done = true; const bar = o.y0 + Math.sin(o.ph) * 150; if (Math.abs(P.y - bar) < 34) damage(g, 20); }
        else if (o.k === 'foe' && !o.dead && Math.abs(o.x - P.x) < 50 && Math.abs(o.y - P.y) < 40) { o.done = true; damage(g, 15); kill(g, o); }
      }
    }
    S.objs = S.objs.filter((o) => !o.dead && o.z > S.cam - 50);
    // 탄
    for (const s of S.shots) {
      const oz = s.z;
      if (s.home && !s.home.dead) { const t = s.home, k = dt * 5; s.x = U.lerp(s.x, t.x, k); s.y = U.lerp(s.y, t.y, k); }
      s.z += s.vz * dt; s.life -= dt;
      for (const o of S.objs) {
        if (o.dead || (o.k !== 'foe' && o.k !== 'rock')) continue;
        if (o.z >= oz - 40 && o.z <= s.z + 40 && Math.abs(o.x - s.x) < o.r + s.r && Math.abs(o.y - s.y) < o.r + s.r) {
          if (s.big) { blast(g, s); s.life = 0; break; }
          o.hp -= s.dmg; o.fl = 0.08; s.life = 0;
          if (o.hp <= 0) kill(g, o); else g.sfx.tone(500, 0.03, 'square', 0.03);
          break;
        }
      }
      if (S.boss && s.life > 0) bossHit(g, s, oz);
      if (s.big && s.life <= 0 && !s.blasted) blast(g, s);
    }
    S.shots = S.shots.filter((s) => s.life > 0);
    for (const e of S.eshots) {
      const oz = e.z;
      e.x += e.vx * dt; e.y += e.vy * dt; e.z += e.vz * dt; e.life -= dt;
      if (e.z <= pz + 20 && oz >= pz - 40 && Math.abs(e.x - P.x) < 38 && Math.abs(e.y - P.y) < 26) {
        e.life = 0;
        if (P.roll > 0) { g.sfx.tone(1500, 0.05, 'square', 0.04); S.shots.push({ x: e.x, y: e.y, z: e.z, vz: 2600, life: 1, r: 20, dmg: 2 }); g.float(CX, CY - 60, '튕겨냄!', '#93c5fd', 18); }
        else damage(g, 8 + lvl * 2);
      }
    }
    S.eshots = S.eshots.filter((e) => e.life > 0 && e.z > S.cam);
    if (S.boss) updBoss(g, dt);
    if (P.sh <= 0) { g.burst(CX, CY + 60, ['#fff', '#f97316', '#fde047'], 60, 400, 1, 5); return g.over(`${st.n}에서 격추됨 · 격추 수 ${S.hits}`); }
    g.info = `${st.n} · 격추 ${S.hits}`;
  },
  draw(g, c) {
    const st = SF[S.stage], P = S.p;
    const gr = c.createLinearGradient(0, 0, 0, 600); gr.addColorStop(0, st.sky[0]); gr.addColorStop(1, st.sky[1]);
    c.fillStyle = gr; c.fillRect(0, 0, 960, 600);
    for (const s of S.stars) { let dz = ((s.z - S.cam) % 4000 + 4000) % 4000 + 50; const sx = CX + (s.x - S.cx) * FL / dz, sy = CY + (s.y - S.cy) * FL / dz; if (sx > 0 && sx < 960 && sy > 0 && sy < 600) g.rect(sx, sy, 2 + 200 / dz, 2 + 200 / dz, 'rgba(255,255,255,.8)'); }
    if (st.ground) {
      const gy = 260, hy = CY;
      g.rect(0, hy, 960, 600 - hy, st.ground);
      c.strokeStyle = st.line; c.lineWidth = 1.5; c.globalAlpha = 0.6;
      for (let z = 200 - (S.cam % 200); z < 6000; z += 200) { const dz = z + 30, y = CY + (gy - S.cy) * FL / dz; if (y > 600) continue; c.beginPath(); c.moveTo(0, y); c.lineTo(960, y); c.stroke(); }
      for (let x = -3000; x <= 3000; x += 300) { const x1 = CX + (x - S.cx) * FL / 60, y1 = CY + (gy - S.cy) * FL / 60, x2 = CX + (x - S.cx) * FL / 6000; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, hy); c.stroke(); }
      c.globalAlpha = 1;
      const fog = c.createLinearGradient(0, hy, 0, hy + 60); fog.addColorStop(0, st.sky[1]); fog.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = fog; c.fillRect(0, hy, 960, 60);
    }
    // 정렬해서 그리기
    const list = S.objs.slice();
    if (S.boss) list.push(S.boss);
    for (const s of S.shots) list.push(s);
    for (const e of S.eshots) list.push(e);
    list.sort((a, b) => b.z - a.z);
    for (const o of list) drawObj(g, c, o);
    // 플레이어
    const sx = CX + (P.x - S.cx) * FL / PZ * 0.42, sy = CY + (P.y - S.cy) * FL / PZ * 0.42 + 40;
    S.psx = sx; S.psy = sy;
    c.save(); c.translate(sx, sy); c.rotate(P.bank + (P.roll > 0 ? (0.6 - P.roll) / 0.6 * Math.PI * 2 : 0));
    if (P.inv > 0 && Math.floor(g.time * 14) % 2) c.globalAlpha = 0.4;
    g.poly([[0, -12], [70, 14], [64, 20], [12, 10], [0, 16], [-12, 10], [-64, 20], [-70, 14]], '#e2e8f0', '#1e3a8a', 2);
    g.poly([[0, -30], [14, 8], [0, 14], [-14, 8]], '#cbd5e1', '#1e3a8a', 2);
    g.poly([[40, 4], [52, -24], [56, 12]], '#2563eb'); g.poly([[-40, 4], [-52, -24], [-56, 12]], '#2563eb');
    g.circle(0, -4, 6, '#38bdf8');
    g.circle(0, 18, 6 + Math.random() * 4, '#60a5fa'); g.circle(0, 18, 3, '#fff');
    if (P.roll > 0) { c.globalAlpha = 0.4; g.ring(0, 0, 80, '#93c5fd', 4); }
    c.restore();
    // 조준선
    const ax = CX + (P.x - S.cx) * FL / 900, ay = CY + (P.y - S.cy) * FL / 900;
    g.stroke(ax - 14, ay - 14, 28, 28, S.charge >= 1 ? '#ef4444' : '#4ade80', 2);
    const bx = CX + (P.x - S.cx) * FL / 500, by = CY + (P.y - S.cy) * FL / 500 + 15;
    g.stroke(bx - 20, by - 20, 40, 40, 'rgba(74,222,128,.6)', 2);
    if (S.charge > 0) g.ring(ax, ay, 24, `rgba(239,68,68,${S.charge})`, 3);
    if (S.lock) { const q = proj(S.lock); if (q) { g.ring(q.x, q.y, 30 + Math.sin(g.time * 20) * 4, '#ef4444', 3); g.text('LOCK', q.x, q.y - 42, 14, '#ef4444'); } }
    // HUD
    g.rrect(20, 548, 240, 32, 8, 'rgba(0,0,0,.5)');
    g.text('실드', 46, 564, 14, '#fff');
    g.rect(74, 556, 176, 16, '#334155'); g.rect(74, 556, 176 * P.sh / 100, 16, P.sh > 30 ? '#22c55e' : '#ef4444');
    g.text(`레이저 Lv${S.laser}`, 860, 564, 16, '#93c5fd');
    g.text(`격추 ${S.hits}`, 860, 540, 18, '#fde047');
    if (S.ringCombo) g.text(`링 콤보 ×${S.ringCombo}`, 480, 570, 16, '#fde047');
    if (!S.boss) { g.rect(330, 16, 300, 6, 'rgba(255,255,255,.2)'); g.rect(330, 16, 300 * Math.min(1, S.dist / st.len), 6, '#fde047'); }
    if (S.banner > 0) { c.globalAlpha = Math.min(1, S.banner); g.text(`STAGE ${S.stage + 1}`, 480, 180, 46, '#fde047'); g.text(st.n, 480, 228, 24, '#fff'); c.globalAlpha = 1; }
    if (S.clear > 0) g.text('미션 완료!', 480, 200, 46, '#4ade80');
  },
});
function proj(o) { const dz = o.z - S.cam; if (dz < 70) return null; return { x: CX + (o.x - S.cx) * FL / dz, y: CY + (o.y - S.cy) * FL / dz, s: FL / dz }; }
function shoot(g) {
  if (S.fireCd > 0) return;
  S.fireCd = 0.09;
  const P = S.p, pz = S.cam + PZ;
  const offs = S.laser >= 2 ? [-36, 36] : [0];
  for (const o of offs) S.shots.push({ x: P.x + o, y: P.y, z: pz, vz: 3000, life: 1.3, r: S.laser >= 3 ? 34 : 22, dmg: S.laser >= 3 ? 2 : 1 });
  g.sfx.tone(1200, 0.07, 'square', 0.03, 500);
}
function bombShot(g) {
  const P = S.p;
  S.shots.push({ x: P.x, y: P.y, z: S.cam + PZ, vz: 1800, life: 1.6, r: 30, dmg: 8, big: true, home: S.lock });
  g.sfx.tone(200, 0.4, 'sawtooth', 0.06, 900);
  S.charge = 0;
}
function blast(g, s) {
  if (s.blasted) return;
  s.blasted = true;
  for (const o of S.objs) if ((o.k === 'foe' || o.k === 'rock') && !o.dead && Math.abs(o.z - s.z) < 500 && Math.hypot(o.x - s.x, o.y - s.y) < 320) { o.hp -= 8; if (o.hp <= 0) kill(g, o); }
  if (S.boss && !S.boss.dying && Math.abs(S.boss.z - s.z) < 500) { for (const pt of S.boss.parts) if (pt.hp > 0) { pt.hp -= 6; } checkBoss(g); }
  const q = proj(s); if (q) { g.burst(q.x, q.y, ['#fde047', '#f97316', '#fff'], 40, 400, 0.8, 5); }
  g.shake(8, 0.4); g.sfx.explode();
}
function findLock() {
  let best = null, bd = 140;
  const cands = S.objs.filter((o) => o.k === 'foe' && !o.dead && o.z > S.cam + 300);
  if (S.boss && !S.boss.dying) cands.push(S.boss);
  for (const o of cands) { const q = proj(o); if (!q) continue; const ax = CX + (S.p.x - S.cx) * FL / 900, ay = CY + (S.p.y - S.cy) * FL / 900; const d = Math.hypot(q.x - ax, q.y - ay); if (d < bd) { bd = d; best = o; } }
  return best;
}
function enemyShot(o, sp) {
  const P = S.p, pz = S.cam + PZ;
  const d = Math.hypot(o.x - P.x, o.y - P.y, o.z - pz), t = Math.max(0.4, d / sp);
  const tz = pz + SPD * t;
  S.eshots.push({ k: 'eb', x: o.x, y: o.y, z: o.z, vx: (P.x - o.x) / t, vy: (P.y - o.y) / t, vz: (tz - o.z) / t, life: t + 1 });
}
function wave(g) {
  const lvl = S.stage, st = SF[S.stage];
  S.waveT = U.rand(2.2, 3.4) - lvl * 0.3;
  const z = S.cam + 4000, r = Math.random(), hp = 1 + lvl;
  const e = ['🛸', '🦇', '👾'][lvl];
  if (r < 0.4) { const x0 = U.rand(-200, 200), y0 = U.rand(-150, 80); for (let i = 0; i < 5; i++) S.objs.push(foe(x0 + (i - 2) * 70, y0 - Math.abs(i - 2) * 30, z + Math.abs(i - 2) * 150, { pat: 'sine', x0: x0 + (i - 2) * 70, y0: y0 - Math.abs(i - 2) * 30, ph: i * 0.4, hp, e, vz: SPD * 0.55 })); }
  else if (r < 0.65) { const L = Math.random() < 0.5 ? -1 : 1; for (let i = 0; i < 4; i++) S.objs.push(foe(L * (600 + i * 120), U.rand(-140, 100), S.cam + 1500 + i * 120, { pat: 'cross', vx: -L * 420, hp, e, vz: SPD * 0.9 })); }
  else if (r < 0.85) { for (let i = 0; i < 3; i++) S.objs.push(foe(U.rand(-300, 300), U.rand(-200, 100), z + i * 300, { pat: 'dive', hp: hp + 1, e: '☄️', vz: SPD * 0.2, r: 40 })); }
  else S.objs.push(foe(0, -40, z, { pat: 'sine', x0: U.rand(-150, 150), y0: -40, hp: 10 + lvl * 5, e: '🛰️', r: 80, vz: SPD * 0.85, big: true }));
  if (st.ground && Math.random() < 0.5) S.objs.push(foe(U.rand(-400, 400), 230, z, { pat: 'none', hp: 3, e: '🛡️', r: 40, vz: 0, turret: true }));
}
function foe(x, y, z, o) { return Object.assign({ k: 'foe', x, y, z, hp: 1, r: 46, cd: U.rand(0.8, 2.5), fl: 0, vx: 0, ph: 0, x0: x, y0: y }, o); }
function obstacle(g, st) {
  const z = S.cam + 4200;
  if (st.obs === 'tower') { S.obsT = U.rand(0.8, 1.6); S.objs.push({ k: 'tower', x: U.rand(-500, 500), y: 260, z, w: U.rand(60, 120), h: U.rand(150, 420) }); }
  else if (st.obs === 'rock') { S.obsT = U.rand(0.3, 0.7); S.objs.push({ k: 'rock', x: U.rand(-500, 500), y: U.rand(-300, 300), z, r: U.rand(30, 90), vx: U.rand(-40, 40), vy: U.rand(-30, 30), rot: 0, spin: U.rand(-2, 2), hp: 3 }); }
  else { S.obsT = U.rand(1.5, 2.5); if (Math.random() < 0.5) S.objs.push({ k: 'gate', x: 0, y: 0, y0: U.rand(-80, 80), z, ph: U.rand(6) }); else S.objs.push({ k: 'tower', x: U.rand(-400, 400), y: 260, z, w: 90, h: 480 }); }
}
function passRing(g, o) {
  S.ringCombo++;
  const P = S.p;
  if (o.blue) { if (S.ringCombo >= 3 && S.laser < 3) { S.laser++; S.ringCombo = 0; g.float(CX, CY - 80, `레이저 Lv${S.laser}!`, '#60a5fa', 30); g.sfx.power(); } else g.sfx.coin(); g.add(300 * S.ringCombo, CX, CY - 40); }
  else { P.sh = Math.min(100, P.sh + 15); g.add(200 * S.ringCombo, CX, CY - 40); g.float(CX, CY - 80, '실드 +15', '#4ade80', 22); g.sfx.coin(); }
}
function damage(g, d) {
  const P = S.p;
  if (P.inv > 0) return;
  P.sh -= d; P.inv = 0.6; g.shake(10, 0.35); g.sfx.hit();
  g.burst(S.psx || CX, S.psy || CY, ['#fca5a5', '#fff'], 16, 240, 0.5);
  S.ringCombo = 0;
}
function kill(g, o) {
  if (o.dead) return;
  o.dead = true;
  if (o.k === 'foe') { S.hits++; g.add(o.big ? 1000 : o.turret ? 300 : 100); }
  else g.add(50);
  const q = proj(o);
  if (q) { g.burst(q.x, q.y, ['#fde047', '#f97316', '#fff'], o.big ? 40 : 18, 300 * Math.min(2, q.s * 3), 0.6, 4); if (o.big) g.float(q.x, q.y - 30, '대형 격추!', '#fde047', 22); }
  g.sfx.tone(120, 0.2, 'sawtooth', 0.05, 40);
  if (o.big) S.objs.push({ k: 'ring', x: o.x, y: o.y, z: o.z + 600, r: 110, blue: false });
}
function spawnBoss(g) {
  const lvl = S.stage, hp = 14 + lvl * 8;
  S.boss = { k: 'boss', x: 0, y: -40, z: S.cam + 5000, rel: 1300, t: 0, cd: 2, e: SF[lvl].boss, dying: 0, lvl,
    parts: [{ dx: -220, dy: 0, hp, max: hp, e: '⚙️' }, { dx: 220, dy: 0, hp, max: hp, e: '⚙️' }, { dx: 0, dy: 20, hp: hp * 2, max: hp * 2, core: true }] };
  g.sfx.tone(70, 1.5, 'sawtooth', 0.09);
  g.float(CX, 140, '⚠ 보스 접근 ⚠', '#ef4444', 36);
}
function updBoss(g, dt) {
  const B = S.boss;
  B.t += dt;
  const want = S.cam + B.rel;
  B.z = Math.max(want, B.z - 1800 * dt) ;
  if (B.dying) { B.dying -= dt; const q = proj(B); if (q && Math.random() < 0.5) g.burst(q.x + U.rand(-120, 120), q.y + U.rand(-80, 80), ['#fde047', '#f97316', '#fff'], 10, 300, 0.5); if (B.dying <= 0) { S.boss = null; S.clear = 3.5; g.add(10000 * (S.stage + 1)); } return; }
  B.x = Math.sin(B.t * 0.7) * 220; B.y = -40 + Math.sin(B.t * 1.1) * 90;
  B.rel = 1300 + Math.sin(B.t * 0.4) * 400;
  B.cd -= dt;
  if (B.cd <= 0 && B.z - S.cam < 2000) {
    const coreOnly = B.parts[0].hp <= 0 && B.parts[1].hp <= 0;
    B.cd = (coreOnly ? 0.7 : 1.2) - B.lvl * 0.15;
    for (const pt of B.parts) if (pt.hp > 0) { const o = { x: B.x + pt.dx, y: B.y + pt.dy, z: B.z }; enemyShot(o, 1100 + B.lvl * 150); if (coreOnly) for (const s of [-1, 1]) { enemyShot(o, 900); const e = S.eshots[S.eshots.length - 1]; e.vx += s * 160; } }
    g.sfx.tone(400, 0.1, 'sawtooth', 0.03, 200);
  }
}
function bossHit(g, s, oz) {
  const B = S.boss;
  if (B.dying || !(B.z >= oz - 60 && B.z <= s.z + 60)) return;
  for (const pt of B.parts) {
    if (pt.hp <= 0) continue;
    if (pt.core && (B.parts[0].hp > 0 || B.parts[1].hp > 0)) { if (Math.abs(s.x - B.x) < 80 && Math.abs(s.y - B.y - pt.dy) < 70) { s.life = 0; g.sfx.tone(1600, 0.02, 'square', 0.02); return; } continue; }
    if (Math.abs(s.x - (B.x + pt.dx)) < 80 + s.r && Math.abs(s.y - (B.y + pt.dy)) < 70 + s.r) {
      if (s.big) { blast(g, s); s.life = 0; return; }
      pt.hp -= s.dmg; pt.fl = 0.08; s.life = 0; g.sfx.tone(700, 0.03, 'square', 0.03);
      if (pt.hp <= 0) { g.add(2000); g.sfx.explode(); g.shake(8, 0.4); const q = proj({ x: B.x + pt.dx, y: B.y + pt.dy, z: B.z }); if (q) g.burst(q.x, q.y, ['#fde047', '#f97316'], 30, 300, 0.7, 5); }
      checkBoss(g);
      return;
    }
  }
}
function checkBoss(g) { const B = S.boss; if (B && !B.dying && B.parts.every((p) => p.hp <= 0)) { B.dying = 2.5; S.eshots.length = 0; g.shake(14, 2); g.sfx.explode(); S.hits += 10; } }
function drawObj(g, c, o) {
  const q = proj(o); if (!q) return;
  const s = q.s;
  if (q.x < -400 || q.x > 1360) return;
  if (o.k === 'ring') { c.globalAlpha = o.done ? 0.3 : 0.9; g.ring(q.x, q.y, o.r * s, o.blue ? '#60a5fa' : '#facc15', Math.max(2, 14 * s)); g.ring(q.x, q.y, o.r * s, '#fff', Math.max(1, 3 * s)); c.globalAlpha = 1; }
  else if (o.k === 'tower') { const gy = CY + (260 - S.cy) * s, top = CY + (260 - o.h - S.cy) * s, w = o.w * s; g.rect(q.x - w / 2, top, w, gy - top, '#64748b'); g.rect(q.x - w / 2, top, w * 0.3, gy - top, '#94a3b8'); g.rect(q.x - w / 2, top, w, Math.max(2, 8 * s), '#f59e0b'); }
  else if (o.k === 'rock') { c.save(); c.translate(q.x, q.y); c.rotate(o.rot); const r = o.r * s; g.poly([[r, 0], [r * 0.5, r * 0.8], [-r * 0.4, r * 0.9], [-r, r * 0.1], [-r * 0.6, -r * 0.8], [r * 0.4, -r * 0.9]], '#78716c', '#44403c', 2); g.circle(r * 0.2, -r * 0.2, r * 0.25, '#57534e'); c.restore(); }
  else if (o.k === 'gate') { const w = 700 * s, h = 300 * s; g.stroke(q.x - w / 2, q.y - h / 2 - 40 * s, w, h + 80 * s, '#a855f7', Math.max(2, 10 * s)); const by = CY + (o.y0 + Math.sin(o.ph) * 150 - S.cy) * s; g.rect(q.x - w / 2, by - 12 * s, w, 24 * s, '#f0abfc'); g.rect(q.x - w / 2, by - 4 * s, w, 8 * s, '#fff'); }
  else if (o.k === 'foe') { c.save(); if (o.fl > 0) c.globalAlpha = 0.5; g.emoji(o.e, q.x, q.y, o.r * 2 * s); c.restore(); if (S.lock === o) g.ring(q.x, q.y, o.r * s + 6, '#ef4444', 2); }
  else if (o.k === 'eb') { g.circle(q.x, q.y, U.clamp(16 * s, 3, 22), '#f43f5e'); g.circle(q.x, q.y, U.clamp(8 * s, 1.5, 11), '#fff'); }
  else if (o.k === 'boss') {
    const B = o;
    g.circle(q.x, q.y + 20 * s, 200 * s, 'rgba(30,27,75,.85)'); g.ring(q.x, q.y + 20 * s, 200 * s, '#818cf8', Math.max(2, 8 * s));
    for (const pt of B.parts) {
      const px = q.x + pt.dx * s, py = q.y + pt.dy * s;
      if (pt.hp <= 0) { g.circle(px, py, 40 * s, '#111'); continue; }
      if (pt.core) g.emoji(B.e, px, py, 240 * s); else { c.save(); c.translate(px, py); c.rotate(g.time * 3); g.emoji(pt.e, 0, 0, 130 * s); c.restore(); }
      g.rect(px - 50 * s, py - 90 * s, 100 * s, 8 * s, '#450a0a'); g.rect(px - 50 * s, py - 90 * s, (100 * s * pt.hp) / pt.max, 8 * s, pt.core ? '#f43f5e' : '#facc15');
    }
  }
  else if (o.vz) { // 내 탄
    if (o.big) { g.circle(q.x, q.y, Math.max(6, 40 * s), 'rgba(239,68,68,.6)'); g.circle(q.x, q.y, Math.max(3, 20 * s), '#fff'); }
    else { const q2 = proj({ x: o.x, y: o.y, z: o.z - 120 }); if (q2) g.line(q.x, q.y, q2.x, q2.y, S.laser >= 3 ? '#4ade80' : '#22d3ee', Math.max(2, 14 * s)); }
  }
}
