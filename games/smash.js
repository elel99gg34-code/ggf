let S;
const FIGHTERS = [
  { n: '냥이', e: '🐱', col: '#f97316', spd: 300, jump: 760, wt: 1.0, proj: '🔥', pd: 6 },
  { n: '멍멍', e: '🐶', col: '#a16207', spd: 270, jump: 720, wt: 1.2, proj: '🦴', pd: 8 },
  { n: '개굴', e: '🐸', col: '#16a34a', spd: 320, jump: 860, wt: 0.85, proj: '💧', pd: 5 },
  { n: '판다', e: '🐼', col: '#64748b', spd: 240, jump: 700, wt: 1.35, proj: '🎋', pd: 9 },
];
const STAGES = [
  { n: '전장', main: [180, 430, 600], soft: [[240, 320, 150], [570, 320, 150], [405, 220, 150]], sky: ['#1e3a8a', '#60a5fa'] },
  { n: '공중 정원', main: [230, 440, 500], soft: [[120, 330, 140], [700, 330, 140], [400, 250, 160]], sky: ['#0e7490', '#a5f3fc'] },
  { n: '화산 섬', main: [150, 450, 660], soft: [[300, 340, 120], [540, 340, 120]], sky: ['#7c2d12', '#fdba74'] },
  { n: '우주 정거장', main: [260, 420, 440], soft: [[100, 320, 130], [730, 320, 130], [410, 200, 140], [410, 320, 140]], sky: ['#0f0a2a', '#4c1d95'] },
  { n: '최종 결전', main: [200, 440, 560], soft: [[300, 300, 120], [540, 300, 120]], sky: ['#111', '#7f1d1d'] },
];
const ATK = {
  jab: { st: 0.05, ac: 0.08, rc: 0.12, dmg: 3, base: 120, grow: 1.2, ang: -0.35, rx: 30, ry: -10, r: 26 },
  side: { st: 0.16, ac: 0.1, rc: 0.3, dmg: 13, base: 260, grow: 7.2, ang: -0.6, rx: 48, ry: -6, r: 32 },
  up: { st: 0.1, ac: 0.12, rc: 0.25, dmg: 10, base: 260, grow: 6.0, ang: -1.45, rx: 8, ry: -44, r: 34 },
  down: { st: 0.1, ac: 0.1, rc: 0.25, dmg: 9, base: 220, grow: 5.0, ang: -0.25, rx: 36, ry: 16, r: 30 },
  nair: { st: 0.05, ac: 0.2, rc: 0.12, dmg: 8, base: 200, grow: 4.5, ang: -0.7, rx: 0, ry: 0, r: 40 },
  fair: { st: 0.08, ac: 0.1, rc: 0.18, dmg: 11, base: 240, grow: 6.0, ang: -0.5, rx: 40, ry: 0, r: 30 },
  uair: { st: 0.06, ac: 0.12, rc: 0.15, dmg: 9, base: 240, grow: 5.5, ang: -1.5, rx: 0, ry: -42, r: 30 },
  dair: { st: 0.12, ac: 0.1, rc: 0.25, dmg: 12, base: 200, grow: 5.5, ang: 1.45, rx: 0, ry: 40, r: 30 },
  upb: { st: 0.04, ac: 0.3, rc: 0.1, dmg: 7, base: 200, grow: 3.5, ang: -1.3, rx: 0, ry: -20, r: 38 },
  dash: { st: 0.08, ac: 0.25, rc: 0.25, dmg: 10, base: 220, grow: 5.0, ang: -0.4, rx: 30, ry: 0, r: 34 },
};
GAME({
  title: '대난투 아레나', w: 960, h: 600, bg: '#1e3a8a', controls: 'dpad+ab', aLabel: '공격', bLabel: '필살',
  help: '←→ 이동 · ↑ 점프 (2단 점프) · ↓ 발판 아래로\nZ/Space 공격: 방향 + 공격 = 옆 스매시 / 위 / 아래 · 공중에서도 방향별 공격\nX/Shift 필살: 그냥 = 발사체 · ↑+X = 복귀기 · ←→+X = 돌진\nC = 실드(막기) · 대미지%가 높을수록 멀리 날아간다! 스톡 3개, 4인 난투 5라운드',
  init(g) { S = { mode: 'select', sel: 0, round: 0, kos: 0 }; },
  update(g, dt) {
    if (S.mode === 'select') {
      if (g.pressed('left')) { S.sel = (S.sel + 3) % 4; g.sfx.move(); }
      if (g.pressed('right')) { S.sel = (S.sel + 1) % 4; g.sfx.move(); }
      for (let i = 0; i < 4; i++) { if (g.mouse.moved && g.inRect(110 + i * 190, 190, 170, 220)) S.sel = i; if (g.clickIn(110 + i * 190, 190, 170, 220)) { S.sel = i; startRound(g); return; } }
      if (g.pressed('a') || g.pressed('b')) startRound(g);
      g.info = '파이터 선택';
      return;
    }
    roundUpdate(g, dt);
  },
  draw(g, c) { if (S.mode === 'select') return selDraw(g, c); drawAll(g, c); },
});
function selDraw(g, c) {
  const grd = c.createLinearGradient(0, 0, 0, g.H); grd.addColorStop(0, '#1e1b4b'); grd.addColorStop(1, '#7c2d12'); c.fillStyle = grd; c.fillRect(0, 0, g.W, g.H);
  g.text('대난투 아레나', g.W / 2, 80, 52, '#facc15'); g.text('파이터를 고르세요 (←→ + Z / 클릭)', g.W / 2, 130, 20, '#e5e7eb', 'center', 'normal');
  for (let i = 0; i < 4; i++) {
    const F = FIGHTERS[i], x = 110 + i * 190, s = S.sel === i;
    g.rrect(x, 190, 170, 220, 16, s ? F.col : 'rgba(0,0,0,.4)', s ? '#fff' : 'rgba(255,255,255,.3)', s ? 4 : 2);
    g.emoji(F.e, x + 85, 270 + (s ? Math.sin(g.time * 6) * 6 : 0), 90);
    g.text(F.n, x + 85, 350, 26, '#fff');
    g.text(`무게 ${F.wt >= 1.2 ? '무거움' : F.wt < 0.9 ? '가벼움' : '보통'} · ${F.proj}`, x + 85, 385, 15, '#fde68a', 'center', 'normal');
  }
}
function startRound(g) {
  S.mode = 'fight';
  if (S.round === 0) S.pc = S.sel;
  const st = STAGES[S.round];
  const others = U.shuffle([0, 1, 2, 3].filter((i) => i !== S.pc));
  const sx = [st.main[0] + 80, st.main[0] + st.main[2] - 80, st.main[0] + st.main[2] * 0.35, st.main[0] + st.main[2] * 0.65];
  S.f = [mkF(S.pc, sx[0], false, 0), ...others.map((k, i) => mkF(k, sx[i + 1], true, i + 1))];
  S.proj = []; S.items = []; S.itemT = 6; S.fx = []; S.intro = 2.2; S.end = 0; S.time = 0;
  g.sfx.power();
}
function mkF(k, x, ai, slot) {
  const st = STAGES[S.round];
  return { k, F: FIGHTERS[k], x, y: st.main[1] - 1, vx: 0, vy: 0, face: slot % 2 ? -1 : 1, dmg: 0, stocks: 3, jumps: 2, ground: true, ai, slot, st: 'idle', atk: null, at: 0, hitstun: 0, inv: 0, shield: 60, shielding: false, drop: 0, upbUsed: false, last: null, out: false, respawn: 0, hammer: 0, bomb: false, cool: 0, aiT: 0, tgt: null, kos: 0, anim: 0 };
}
const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308'];
function roundUpdate(g, dt) {
  S.intro -= dt;
  if (S.intro > 0) return;
  if (S.end) { S.end -= dt; if (S.end <= 0) { if (S.won) { S.round++; g.add(3000 + S.f[0].stocks * 1000); if (S.round >= STAGES.length) return g.win(`5라운드 전승! 총 KO ${S.kos}`); startRound(g); } else return g.over(`${S.round + 1}라운드 탈락 · 총 KO ${S.kos}`); } }
  S.time += dt;
  for (const f of S.f) {
    if (f.out) continue;
    if (f.respawn > 0) { f.respawn -= dt; if (f.respawn <= 0) { const st = STAGES[S.round]; f.x = st.main[0] + st.main[2] / 2 + (f.slot - 1.5) * 60; f.y = 120; f.vx = f.vy = 0; f.inv = 2; f.dmg = 0; f.jumps = 2; f.st = 'idle'; f.atk = null; f.hitstun = 0; f.platWait = 1; } continue; }
    const inp = f.ai ? aiInput(g, f, dt) : playerInput(g);
    fighterUpdate(g, f, inp, dt);
  }
  hits(g);
  updProj(g, dt);
  updItems(g, dt);
  S.fx = S.fx.filter((x) => (x.t -= dt) > 0);
  const alive = S.f.filter((f) => !f.out);
  if (!S.end) {
    if (S.f[0].out) { S.end = 2.5; S.won = false; g.sfx.lose(); }
    else if (alive.length === 1) { S.end = 3; S.won = true; g.sfx.win(); }
  }
  g.info = `라운드 ${S.round + 1}/5 · ${STAGES[S.round].n} · KO ${S.kos}`;
}
function playerInput(g) {
  return { mx: g.right - g.left, up: g.up, down: g.down, jumpP: g.pressed('up'), atkP: g.pressed('a'), spP: g.pressed('b'), shield: g.key('KeyC') || g.key('KeyL'), downP: g.pressed('down') };
}
function stageSurfaces() { const st = STAGES[S.round]; return { main: st.main, soft: st.soft }; }
function fighterUpdate(g, f, I, dt) {
  const F = f.F, st = STAGES[S.round];
  f.inv -= dt; f.cool -= dt; f.hammer -= dt; f.anim += dt;
  if (f.hitstun > 0) { f.hitstun -= dt; f.vy += 1400 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= Math.pow(0.5, dt); if (f.vy > 0) landCheck(f, dt, false); if (Math.random() < 0.6 && Math.hypot(f.vx, f.vy) > 500) S.fx.push({ x: f.x, y: f.y - 20, t: 0.3, smoke: true }); blast(g, f); return; }
  f.shielding = I.shield && f.ground && !f.atk;
  if (f.shielding) { f.shield = Math.max(0, f.shield - 18 * dt); if (f.shield <= 0) { f.hitstun = 1.5; f.shielding = false; f.vy = -400; g.sfx.explode(); } }
  else f.shield = Math.min(60, f.shield + 10 * dt);
  // 공격 진행
  if (f.atk) {
    const A = ATK[f.atk]; f.at += dt;
    if (f.atk === 'upb' && f.at < 0.35) { f.vy = -700; f.vx = I.mx * 200; }
    if (f.atk === 'dash' && f.at > A.st && f.at < A.st + A.ac) f.vx = f.face * 600;
    if (f.at > A.st + A.ac + A.rc) { f.atk = null; f.vx *= 0.3; }
  }
  const move = !f.atk || !f.ground;
  if (!f.shielding && move) {
    if (f.ground) { const tv = I.mx * F.spd; f.vx += (tv - f.vx) * Math.min(1, dt * 12); }
    else { f.vx += I.mx * 1300 * dt; f.vx = U.clamp(f.vx, -F.spd, F.spd); }
    if (I.mx && !f.atk) f.face = I.mx;
  } else if (f.ground) f.vx *= Math.pow(0.001, dt);
  if (I.jumpP && f.jumps > 0 && !f.atk && !f.shielding) { f.vy = -(f.ground ? F.jump : F.jump * 0.85); f.jumps--; f.ground = false; g.sfx.jump(); if (f.jumps === 0) S.fx.push({ x: f.x, y: f.y, t: 0.25, ring: true }); }
  if (I.downP && f.ground && f.onSoft) { f.drop = 0.25; f.ground = false; f.y += 2; }
  if (!f.atk && !f.shielding && f.cool <= 0) {
    if (I.atkP) {
      if (f.bomb) { f.bomb = false; S.proj.push({ x: f.x + f.face * 20, y: f.y - 40, vx: f.face * 420 + f.vx * 0.3, vy: -360, grav: 900, own: f, dmg: 18, e: '💣', bomb: true, life: 3 }); f.cool = 0.3; g.sfx.shoot(); }
      else {
        let a;
        if (f.ground) a = I.up ? 'up' : I.down ? 'down' : I.mx ? 'side' : 'jab';
        else a = I.up ? 'uair' : I.down ? 'dair' : I.mx ? 'fair' : 'nair';
        if (I.mx) f.face = I.mx;
        startAtk(g, f, a);
      }
    } else if (I.spP) {
      if (I.up && !f.upbUsed) { startAtk(g, f, 'upb'); f.upbUsed = !f.ground; f.ground = false; g.sfx.tone(400, 0.25, 'square', 0.05, 1200); }
      else if (I.mx) { f.face = I.mx; startAtk(g, f, 'dash'); }
      else if (!I.up) { S.proj.push({ x: f.x + f.face * 30, y: f.y - 34, vx: f.face * 520, vy: 0, own: f, dmg: F.pd, e: F.proj, life: 1.2 }); f.cool = 0.55; g.sfx.shoot(); }
    }
  }
  f.vy = Math.min(f.vy + (f.atk === 'upb' && f.at < 0.35 ? 0 : 1800) * dt, I.down && !f.ground && f.vy > 0 ? 1100 : 820);
  f.x += f.vx * dt; f.y += f.vy * dt;
  f.drop -= dt;
  landCheck(f, dt, I.down);
  blast(g, f);
}
function landCheck(f, dt, down) {
  const st = STAGES[S.round], m = st.main;
  const prevY = f.y - f.vy * dt;
  f.ground = false; f.onSoft = false;
  if (f.vy >= 0) {
    if (f.x > m[0] && f.x < m[0] + m[2] && prevY <= m[1] + 2 && f.y >= m[1]) { land(f, m[1]); }
    else if (f.drop <= 0) for (const s of st.soft) if (f.x > s[0] && f.x < s[0] + s[2] && prevY <= s[1] + 2 && f.y >= s[1]) { land(f, s[1]); f.onSoft = true; break; }
  }
  // 메인 스테이지 측면/아래
  if (f.y > m[1] + 4 && f.y - 50 < m[1] + 70 && f.x > m[0] - 14 && f.x < m[0] + m[2] + 14) {
    if (f.y - 50 > m[1] + 40 && f.vy < 0) { f.vy = 60; f.y = Math.max(f.y, m[1] + 120); }
    else if (f.x < m[0] + m[2] / 2) { f.x = m[0] - 14; if (f.hitstun > 0) f.vx = -Math.abs(f.vx) * 0.6; else f.vx = Math.min(0, f.vx); }
    else { f.x = m[0] + m[2] + 14; if (f.hitstun > 0) f.vx = Math.abs(f.vx) * 0.6; else f.vx = Math.max(0, f.vx); }
  }
}
function land(f, y) {
  if (f.hitstun > 0 && f.vy > 600) { f.vy = -f.vy * 0.45; f.y = y; return; }
  f.y = y; f.vy = 0; f.ground = true; f.jumps = 2; f.upbUsed = false;
  if (f.atk && ['nair', 'fair', 'uair', 'dair'].includes(f.atk)) f.atk = null;
  if (f.hitstun > 0) f.hitstun = Math.min(f.hitstun, 0.15);
}
function blast(g, f) {
  if (f.x < -180 || f.x > g.W + 180 || f.y > g.H + 180 || f.y < -260) {
    f.stocks--; f.respawn = 1.6; g.sfx.explode(); g.shake(10, 0.4);
    const bx = U.clamp(f.x, 10, g.W - 10), by = U.clamp(f.y, 10, g.H - 10);
    g.burst(bx, by, [COLORS[f.slot], '#fff', '#facc15'], 40, 500, 1, 5);
    S.fx.push({ x: bx, y: by, t: 0.6, ko: true, col: COLORS[f.slot] });
    if (f.last && f.last !== f && !f.last.out) { f.last.kos++; if (f.last.slot === 0) { S.kos++; g.add(1000, bx, by); } }
    if (f.slot === 0) g.float(g.W / 2, 200, f.stocks > 0 ? `남은 스톡 ${f.stocks}` : '탈락...', '#fca5a5', 30);
    if (f.stocks <= 0) { f.out = true; f.respawn = 0; }
    f.last = null;
  }
}
function startAtk(g, f, a) {
  f.atk = a; f.at = 0; f.hitSet = new Set();
  g.sfx.tone(a === 'side' ? 220 : 380, 0.06, 'square', 0.03);
}
function hits(g) {
  for (const f of S.f) {
    if (f.out || f.respawn > 0 || !f.atk) continue;
    const A = ATK[f.atk];
    if (f.at < A.st || f.at > A.st + A.ac) continue;
    const hx = f.x + A.rx * f.face, hy = f.y - 30 + A.ry, ham = f.hammer > 0 ? 1.6 : 1;
    for (const o of S.f) {
      if (o === f || o.out || o.respawn > 0 || o.inv > 0 || f.hitSet.has(o)) continue;
      if (Math.hypot(o.x - hx, o.y - 30 - hy) < A.r * (f.hammer > 0 ? 1.4 : 1) + 22) {
        f.hitSet.add(o);
        const ang = A.ang > 1 ? A.ang : A.ang;
        applyHit(g, o, f, A.dmg * ham, A.base * ham, A.grow * ham, ang, f.face);
      }
    }
  }
}
function applyHit(g, o, src, dmg, base, grow, ang, dir) {
  if (o.shielding) { o.shield -= dmg * 1.5; o.vx = dir * 120; g.sfx.tone(900, 0.06, 'square', 0.04); S.fx.push({ x: o.x, y: o.y - 30, t: 0.15, spark: '#93c5fd' }); return; }
  o.dmg += dmg; o.last = src;
  if (src && src.slot === 0) g.score += Math.round(dmg * 10);
  const kb = (base + o.dmg * grow) / o.F.wt;
  o.vx = Math.cos(ang) * kb * dir; o.vy = Math.sin(ang) * kb;
  if (Math.abs(ang) > 1.3) o.vx = dir * kb * 0.15;
  o.hitstun = Math.min(1.4, kb / 1100); o.atk = null; o.ground = false; o.shielding = false; o.y -= 2;
  g.sfx.hit(); g.shake(Math.min(14, kb / 80), 0.15);
  S.fx.push({ x: o.x, y: o.y - 30, t: 0.2, spark: kb > 700 ? '#fde047' : '#fff' });
  if (kb > 900) { g.sfx.explode(); S.hitstop = 0.08; }
}
function updProj(g, dt) {
  for (const p of S.proj) {
    if (p.grav) p.vy += p.grav * dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
    const m = STAGES[S.round].main;
    if (p.bomb && p.y > m[1] - 6 && p.x > m[0] && p.x < m[0] + m[2] && p.vy > 0) { explodeAt(g, p); p.dead = true; continue; }
    if (p.life <= 0 || p.x < -100 || p.x > g.W + 100 || p.y > g.H + 100) { if (p.bomb) explodeAt(g, p); p.dead = true; continue; }
    for (const o of S.f) {
      if (o === p.own || o.out || o.respawn > 0 || o.inv > 0) continue;
      if (Math.hypot(o.x - p.x, o.y - 30 - p.y) < 34) { if (p.bomb) explodeAt(g, p); else applyHit(g, o, p.own, p.dmg, 120, 2.2, -0.4, Math.sign(p.vx) || 1); p.dead = true; break; }
    }
  }
  S.proj = S.proj.filter((p) => !p.dead);
}
function explodeAt(g, p) {
  g.sfx.explode(); g.shake(10, 0.3); g.burst(p.x, p.y, ['#f97316', '#fde047', '#fff'], 30, 400);
  S.fx.push({ x: p.x, y: p.y, t: 0.35, boom: true });
  for (const o of S.f) { if (o.out || o.respawn > 0 || o.inv > 0) continue; const d = Math.hypot(o.x - p.x, o.y - 30 - p.y); if (d < 90) applyHit(g, o, p.own, p.dmg, 380, 7, -1.0, o.x >= p.x ? 1 : -1); }
}
function updItems(g, dt) {
  S.itemT -= dt;
  if (S.itemT <= 0 && S.items.length < 2) { S.itemT = U.rand(7, 12); const m = STAGES[S.round].main; S.items.push({ k: U.choice(['🔨', '💣', '❤️', '💣', '⭐']), x: U.rand(m[0] + 40, m[0] + m[2] - 40), y: -20, vy: 0, life: 14 }); }
  for (const it of S.items) {
    it.vy = Math.min(it.vy + 900 * dt, 500); it.y += it.vy * dt; it.life -= dt;
    const st = STAGES[S.round];
    for (const s of [st.main, ...st.soft]) if (it.x > s[0] && it.x < s[0] + s[2] && it.y > s[1] - 14 && it.y - it.vy * dt <= s[1] - 14 + 2) { it.y = s[1] - 14; it.vy = 0; }
    if (it.y > g.H + 40 || it.life <= 0) it.gone = true;
    for (const f of S.f) {
      if (f.out || f.respawn > 0 || it.gone) continue;
      if (Math.hypot(f.x - it.x, f.y - 30 - it.y) < 36) {
        it.gone = true; g.sfx.power();
        if (it.k === '🔨') f.hammer = 8; if (it.k === '💣') f.bomb = true; if (it.k === '❤️') f.dmg = Math.max(0, f.dmg - 50); if (it.k === '⭐') f.inv = 7;
        if (f.slot === 0) g.float(f.x, f.y - 80, { '🔨': '해머!', '💣': '폭탄 (공격=던지기)', '❤️': '회복 -50%', '⭐': '무적!' }[it.k], '#fde047');
      }
    }
  }
  S.items = S.items.filter((i) => !i.gone);
}
// ---------- AI ----------
function aiInput(g, f, dt) {
  const I = { mx: 0, up: false, down: false, jumpP: false, atkP: false, spP: false, shield: false, downP: false };
  const st = STAGES[S.round], m = st.main, lvl = S.round;
  const skill = 0.45 + lvl * 0.12;
  // 복귀
  const offL = f.x < m[0] - 5, offR = f.x > m[0] + m[2] + 5;
  if (offL || offR || (f.y > m[1] + 10)) {
    I.mx = offL ? 1 : offR ? -1 : (f.x < m[0] + m[2] / 2 ? 1 : -1);
    if (f.vy > -100 && f.jumps > 0 && f.y > m[1] - 60) I.jumpP = true;
    else if (f.jumps === 0 && !f.upbUsed && f.vy > 0 && f.y > m[1] - 20) { I.up = true; I.spP = true; }
    return I;
  }
  f.aiT -= dt;
  if (f.aiT <= 0 || !f.tgt || f.tgt.out || f.tgt.respawn > 0) {
    f.aiT = U.rand(1.5, 3);
    const cands = S.f.filter((o) => o !== f && !o.out && o.respawn <= 0);
    if (!cands.length) return I;
    cands.sort((a, b) => (Math.abs(a.x - f.x) + Math.abs(a.y - f.y) - (a.slot === 0 ? 150 : 0) - a.dmg) - (Math.abs(b.x - f.x) + Math.abs(b.y - f.y) - (b.slot === 0 ? 150 : 0) - b.dmg));
    f.tgt = cands[0];
  }
  if (f.platWait > 0) { f.platWait -= dt; return I; }
  const t = f.tgt; if (!t) return I;
  const dx = t.x - f.x, dy = (t.y - f.y), adx = Math.abs(dx);
  f.react = (f.react || 0) - dt;
  // 아이템 노리기
  const it = S.items.find((i) => i.vy === 0 && Math.abs(i.x - f.x) < 220);
  if (it && Math.random() < 0.7) { I.mx = Math.sign(it.x - f.x); return I; }
  // 막기
  if (t.atk && adx < 90 && Math.random() < skill * 0.15 && f.ground) { I.shield = true; return I; }
  if (adx > 60) I.mx = Math.sign(dx);
  else if (adx < 25) I.mx = -Math.sign(dx) * (Math.random() < 0.3 ? 1 : 0);
  if (dy < -90 && f.ground && Math.random() < 0.08) I.jumpP = true;
  if (dy > 60 && f.onSoft && Math.random() < 0.05) I.downP = true;
  if (f.react > 0) return I;
  f.react = U.rand(0.15, 0.45) - lvl * 0.04;
  if (f.bomb && adx < 400) { I.atkP = true; f.face = Math.sign(dx) || 1; return I; }
  if (adx > 250 && Math.abs(dy) < 50 && Math.random() < 0.25) { f.face = Math.sign(dx); I.mx = 0; I.spP = true; return I; }
  if (adx > 140 && adx < 260 && Math.abs(dy) < 40 && Math.random() < 0.12) { I.mx = Math.sign(dx); I.spP = true; return I; }
  if (adx < 80 && Math.abs(dy) < 70 && Math.random() < skill) {
    I.atkP = true;
    if (dy < -40) I.up = true;
    else if (dy > 40 && !f.ground) I.down = true;
    else if (t.dmg > 70 || Math.random() < 0.4) I.mx = Math.sign(dx) || 1;
    else I.mx = 0;
  }
  return I;
}
// ---------- 그리기 ----------
function drawAll(g, c) {
  const st = STAGES[S.round];
  const grd = c.createLinearGradient(0, 0, 0, g.H); grd.addColorStop(0, st.sky[0]); grd.addColorStop(1, st.sky[1]); c.fillStyle = grd; c.fillRect(0, 0, g.W, g.H);
  for (let i = 0; i < 30; i++) g.circle((i * 173) % g.W, (i * 97) % 300, 1.5, 'rgba(255,255,255,.4)');
  if (S.round === 2) for (let i = 0; i < 5; i++) g.emoji('🌋', 100 + i * 200, 560, 90);
  if (S.round === 1 || S.round === 0) for (let i = 0; i < 5; i++) g.emoji('☁️', ((i * 230 + g.time * 15) % 1200) - 100, 80 + (i % 2) * 60, 70);
  if (S.round === 3) g.emoji('🪐', 800, 110, 110);
  const m = st.main;
  g.poly([[m[0], m[1]], [m[0] + m[2], m[1]], [m[0] + m[2] - 40, m[1] + 90], [m[0] + 40, m[1] + 90]], '#475569', '#1e293b', 3);
  g.rect(m[0], m[1], m[2], 10, '#94a3b8');
  g.poly([[m[0] + 60, m[1] + 90], [m[0] + m[2] - 60, m[1] + 90], [m[0] + m[2] / 2, m[1] + 180]], '#334155');
  for (const s of st.soft) { g.rrect(s[0], s[1], s[2], 10, 5, 'rgba(226,232,240,.85)', '#64748b', 2); }
  for (const it of S.items) { if (it.life < 3 && Math.floor(g.time * 10) % 2) continue; g.circle(it.x, it.y, 18, 'rgba(255,255,255,.25)'); g.emoji(it.k, it.x, it.y, 30); }
  for (const f of S.f) drawF(g, c, f);
  for (const p of S.proj) { c.save(); c.translate(p.x, p.y); c.rotate(g.time * 12); g.emoji(p.e, 0, 0, 30); c.restore(); }
  for (const x of S.fx) {
    if (x.spark) { c.save(); c.translate(x.x, x.y); for (let i = 0; i < 6; i++) { c.rotate(1.05); g.line(0, 0, 30 * (1.4 - x.t * 4), 0, x.spark, 4); } c.restore(); }
    if (x.ring) g.ring(x.x, x.y, 30 * (1.3 - x.t * 3), 'rgba(255,255,255,.6)', 3);
    if (x.boom) g.circle(x.x, x.y, 90 * (1 - x.t / 0.35) + 10, `rgba(251,146,60,${x.t * 2})`);
    if (x.smoke) g.circle(x.x, x.y, 8, `rgba(255,255,255,${x.t})`);
    if (x.ko) { c.save(); c.globalAlpha = x.t / 0.6; c.translate(x.x, x.y); for (let i = 0; i < 10; i++) { c.rotate(0.628); g.line(0, 0, 220, 0, x.col, 10); } c.restore(); }
  }
  // HUD
  for (const f of S.f) {
    const x = 60 + f.slot * 225, y = g.H - 62;
    g.rrect(x, y, 200, 52, 10, f.out ? 'rgba(0,0,0,.6)' : 'rgba(0,0,0,.45)', COLORS[f.slot], 3);
    g.emoji(f.F.e, x + 28, y + 26, 34);
    const dc = f.dmg < 50 ? '#fff' : f.dmg < 100 ? '#fde047' : f.dmg < 150 ? '#fb923c' : '#ef4444';
    g.text(f.out ? 'OUT' : `${Math.floor(f.dmg)}%`, x + 110, y + 22, 26, f.out ? '#64748b' : dc);
    for (let i = 0; i < f.stocks; i++) g.circle(x + 70 + i * 16, y + 42, 5, COLORS[f.slot]);
    g.text(f.slot === 0 ? 'P1' : 'CPU', x + 182, y + 14, 11, COLORS[f.slot], 'right');
  }
  if (S.intro > 0) { g.text(`ROUND ${S.round + 1} · ${st.n}`, g.W / 2, 200, 44, '#fff'); g.text(S.intro > 0.8 ? 'READY...' : 'GO!', g.W / 2, 270, 60, S.intro > 0.8 ? '#fde047' : '#ef4444'); }
  if (S.end) g.text(S.won ? 'GAME! 승리!' : 'GAME OVER', g.W / 2, 220, 64, S.won ? '#facc15' : '#ef4444');
}
function drawF(g, c, f) {
  if (f.out || f.respawn > 0) { if (f.respawn > 0 && !f.out) { g.rrect(g.W / 2 - 40 + (f.slot - 1.5) * 60, 90, 50, 8, 4, COLORS[f.slot]); } return; }
  if (f.inv > 0 && Math.floor(g.time * 14) % 2) c.globalAlpha = 0.5;
  // 화면 밖 표시
  if (f.y < 0 || f.x < 0 || f.x > g.W) { const ix = U.clamp(f.x, 20, g.W - 20), iy = U.clamp(f.y - 30, 20, g.H - 20); g.circle(ix, iy, 22, COLORS[f.slot]); g.emoji(f.F.e, ix, iy, 26); c.globalAlpha = 1; return; }
  c.save(); c.translate(f.x, f.y - 30);
  if (f.hitstun > 0) c.rotate(g.time * 20);
  c.scale(f.face, 1);
  g.circle(0, 4, 26, COLORS[f.slot]);
  g.circle(0, 4, 21, f.F.col);
  g.emoji(f.F.e, 0, 0, 44);
  if (f.atk) {
    const A = ATK[f.atk];
    if (f.at >= A.st && f.at <= A.st + A.ac + 0.05) { c.globalAlpha = 0.6; g.circle(A.rx, A.ry, A.r * (f.hammer > 0 ? 1.4 : 1), f.hammer > 0 ? '#f59e0b' : 'rgba(255,255,255,.7)'); c.globalAlpha = 1; g.emoji(f.hammer > 0 ? '🔨' : f.atk.includes('d') && f.atk !== 'dash' ? '🦶' : '👊', A.rx, A.ry, 26); }
  } else if (f.hammer > 0) g.emoji('🔨', 22, -18, 26);
  if (f.bomb) g.emoji('💣', -20, -20, 20);
  c.restore();
  if (f.shielding) g.circle(f.x, f.y - 30, 18 + f.shield * 0.4, 'rgba(96,165,250,.45)');
  if (f.inv > 2 && f.inv < 7.5) g.emoji('⭐', f.x + 22, f.y - 62, 18);
  g.text(f.slot === 0 ? 'P1' : 'CPU' + f.slot, f.x, f.y - 72, 12, COLORS[f.slot]);
  c.globalAlpha = 1;
}
