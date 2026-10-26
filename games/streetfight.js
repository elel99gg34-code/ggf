let S;
const GY = 520, W0 = 960;
const CHARS = [
  { n: '류진', e: '😠', col: '#f1f5f9', belt: '#111', skin: '#f5c9a0', spd: 210, pow: 1.0, fb: '🔵', title: '정통파 무도가' },
  { n: '번개', e: '😼', col: '#2563eb', belt: '#facc15', skin: '#f5d0b0', spd: 260, pow: 0.85, fb: '⚡', title: '빠른 발차기' },
  { n: '강철', e: '😤', col: '#7c2d12', belt: '#ef4444', skin: '#c08060', spd: 170, pow: 1.25, fb: '🔥', title: '괴력의 레슬러' },
  { n: '그림자', e: '😶', col: '#312e81', belt: '#a78bfa', skin: '#e0b090', spd: 235, pow: 0.95, fb: '🌀', title: '어둠의 닌자' },
  { n: '마왕', e: '👹', col: '#450a0a', belt: '#a855f7', skin: '#8a5a7a', spd: 225, pow: 1.2, fb: '🟣', title: '최종 보스', boss: true },
];
const MOVES = {
  lp: { st: 0.05, ac: 0.08, rc: 0.13, dmg: 45, rng: 78, y: -115, h: 30, lv: 'high', stun: 0.22, push: 120 },
  lk: { st: 0.09, ac: 0.1, rc: 0.22, dmg: 65, rng: 102, y: -95, h: 34, lv: 'mid', stun: 0.28, push: 160 },
  clp: { st: 0.05, ac: 0.08, rc: 0.12, dmg: 35, rng: 76, y: -70, h: 26, lv: 'low', stun: 0.2, push: 100 },
  clk: { st: 0.1, ac: 0.12, rc: 0.3, dmg: 70, rng: 110, y: -25, h: 26, lv: 'low', stun: 0.3, push: 120, kd: true },
  jp: { st: 0.06, ac: 0.25, rc: 0.05, dmg: 70, rng: 82, y: -70, h: 50, lv: 'over', stun: 0.32, push: 100 },
  jk: { st: 0.08, ac: 0.25, rc: 0.05, dmg: 80, rng: 98, y: -55, h: 44, lv: 'over', stun: 0.34, push: 120 },
  dp: { st: 0.03, ac: 0.3, rc: 0.38, dmg: 130, rng: 70, y: -170, h: 160, lv: 'mid', stun: 0.5, push: 60, kd: true, inv: 0.2, chip: 10 },
  tat: { st: 0.12, ac: 0.6, rc: 0.25, dmg: 45, rng: 90, y: -120, h: 50, lv: 'high', stun: 0.25, push: 40, multi: 3, chip: 6 },
  fb: { st: 0.16, ac: 0.02, rc: 0.35 },
  sup: { st: 0.3, ac: 0.02, rc: 0.5 },
};
GAME({
  title: '스트리트 파이터즈', w: 960, h: 600, bg: '#1b1030', controls: 'dpad+ab', aLabel: '펀치', bLabel: '킥',
  help: '←→ 이동 · ↑ 점프 · ↓ 앉기 · 상대 반대쪽 = 가드 (앉아서 = 하단 가드)\nZ/Space 펀치 · X/Shift 킥\n↓↘→ + 펀치 = 장풍  ·  →↓↘ + 펀치 = 승룡권 (무적)\n↓↙← + 킥 = 회오리 발차기  ·  게이지 MAX에서 ↓↘→↓↘→ + 펀치 (또는 Q) = 초필살기\n약공격 → 강공격 → 필살기로 캔슬해 콤보! 3판 2선승, 4명을 꺾어라',
  init(g) { S = { mode: 'select', sel: 0, ladder: [], stage: 0, msg: null }; },
  update(g, dt) {
    if (S.mode === 'select') return selUpdate(g);
    fightUpdate(g, dt);
  },
  draw(g, c) { if (S.mode === 'select') return selDraw(g, c); fightDraw(g, c); },
});
function selUpdate(g) {
  if (g.pressed('left')) { S.sel = (S.sel + 3) % 4; g.sfx.move(); }
  if (g.pressed('right')) { S.sel = (S.sel + 1) % 4; g.sfx.move(); }
  for (let i = 0; i < 4; i++) { const x = 90 + i * 200; if (g.mouse.moved && g.inRect(x, 160, 180, 280)) S.sel = i; if (g.clickIn(x, 160, 180, 280)) { S.sel = i; return pick(g); } }
  if (g.pressed('a') || g.pressed('b')) pick(g);
  g.info = '캐릭터 선택';
}
function pick(g) {
  S.pc = S.sel; S.ladder = U.shuffle([0, 1, 2, 3].filter((i) => i !== S.pc)); S.ladder.push(4); S.stage = 0; g.sfx.power(); startMatch(g);
}
function selDraw(g, c) {
  const grd = c.createLinearGradient(0, 0, 0, g.H); grd.addColorStop(0, '#2a0a3a'); grd.addColorStop(1, '#0a0a2a'); c.fillStyle = grd; c.fillRect(0, 0, g.W, g.H);
  g.text('SELECT YOUR FIGHTER', g.W / 2, 70, 44, '#facc15'); g.text('←→ 선택 · Z 결정 (또는 클릭)', g.W / 2, 115, 18, '#cbd5e1', 'center', 'normal');
  for (let i = 0; i < 4; i++) {
    const ch = CHARS[i], x = 90 + i * 200, s = S.sel === i;
    g.rrect(x, 160, 180, 280, 14, s ? '#3b1d5a' : '#1e1b3a', s ? '#facc15' : '#4c3f7a', s ? 4 : 2);
    drawFighter(g, c, { x: x + 90, y: 400, face: 1, ch: i, pose: s ? 'win' : 'idle', t: g.time, hitT: 0 }, 0.8);
    g.text(ch.n, x + 90, 465, 24, '#fff');
    g.text(ch.title, x + 90, 495, 15, '#a5b4fc', 'center', 'normal');
  }
  const ch = CHARS[S.sel];
  g.text(`속도 ${'★'.repeat(Math.round(ch.spd / 55))}   파워 ${'★'.repeat(Math.round(ch.pow * 4))}`, g.W / 2, 545, 20, '#fde68a');
}
function mkF(ch, x, face, ai) { return { ch, x, y: GY, vx: 0, vy: 0, face, hp: 1000, shownHp: 1000, meter: 0, st: 'idle', t: 0, mv: null, mt: 0, hit: false, hits: 0, stun: 0, ai, hist: [], lastD: 5, crouch: false, inv: 0, combo: 0, aiT: 0, hitT: 0, kd: 0 }; }
function startMatch(g) {
  S.mode = 'fight'; S.wins = [0, 0]; S.round = 0; S.opp = S.ladder[S.stage]; startRound(g);
}
function startRound(g) {
  S.round++; S.p = mkF(S.pc, 300, 1, false); S.e = mkF(S.opp, 660, -1, true);
  if (S.keepMeter) { S.p.meter = S.keepMeter[0]; S.e.meter = S.keepMeter[1]; }
  S.proj = []; S.timer = 99; S.phase = 'intro'; S.pt = 2.2; S.sparks = []; S.freeze = 0; S.comboShow = null;
  g.sfx.tone(220, 0.3, 'square', 0.06);
}
function fightUpdate(g, dt) {
  if (S.freeze > 0) { S.freeze -= dt; return; }
  S.pt -= dt;
  const P = S.p, E = S.e;
  if (S.phase === 'intro') { if (S.pt <= 0) { S.phase = 'fight'; g.sfx.tone(440, 0.4, 'sawtooth', 0.08, 880); } idleTick(P, dt); idleTick(E, dt); return; }
  if (S.phase === 'ko') {
    for (const f of [P, E]) physics(f, dt);
    if (S.pt <= 0) {
      const w = S.koWinner;
      if (w >= 0) S.wins[w]++;
      if (S.wins[0] >= 2) { S.stage++; g.add(5000 + P.hp * 5 + S.timer * 50); if (S.stage >= S.ladder.length) return g.win(`${CHARS[S.pc].n}, 마왕까지 쓰러뜨렸다! 세계 최강!`); S.keepMeter = null; S.opp = S.ladder[S.stage]; S.wins = [0, 0]; S.round = 0; S.mode = 'fight'; startRound(g); g.sfx.win(); return; }
      if (S.wins[1] >= 2) return g.over(`${CHARS[S.opp].n}에게 패배 · ${S.stage + 1}번째 상대`);
      S.keepMeter = [P.meter, E.meter]; startRound(g);
    }
    return;
  }
  S.timer -= dt;
  readInput(g, P, dt);
  aiThink(g, E, P, dt);
  for (const f of [P, E]) { step(g, f, f === P ? E : P, dt); physics(f, dt); }
  // 밀어내기
  if (Math.abs(P.x - E.x) < 56 && Math.abs(P.y - E.y) < 120) { const d = 56 - Math.abs(P.x - E.x), s = P.x < E.x ? -1 : 1; P.x += s * d / 2; E.x -= s * d / 2; }
  for (const f of [P, E]) f.x = U.clamp(f.x, 40, W0 - 40);
  for (const f of [P, E]) { if (f.y >= GY && !['attack', 'hit', 'knock', 'ko', 'block'].includes(f.st)) f.face = (f === P ? E : P).x > f.x ? 1 : -1; }
  updProj(g, dt);
  S.sparks = S.sparks.filter((s) => (s.t -= dt) > 0);
  if (S.comboShow) { S.comboShow.t -= dt; if (S.comboShow.t <= 0) S.comboShow = null; }
  if (P.hp <= 0 || E.hp <= 0 || S.timer <= 0) {
    S.phase = 'ko'; S.pt = 3.2;
    S.koWinner = P.hp > E.hp ? 0 : E.hp > P.hp ? 1 : -1;
    S.koText = S.timer <= 0 ? 'TIME OVER' : 'K.O.!';
    for (const f of [P, E]) if (f.hp <= 0) { f.st = 'ko'; f.vy = -500; f.vx = -f.face * 220; }
    g.sfx.explode(); g.shake(12, 0.5); S.freeze = 0.4;
  }
  g.info = `${CHARS[S.pc].n} vs ${CHARS[S.opp].n} · 상대 ${S.stage + 1}/${S.ladder.length} · 라운드 ${S.round}`;
}
function idleTick(f, dt) { f.t += dt; f.shownHp = f.hp; }
function readInput(g, P, dt) {
  const fwd = P.face, hx = g.right - g.left, v = g.down ? 1 : g.up ? -1 : 0;
  const rel = hx * fwd;
  const d = v === 1 ? (rel > 0 ? 3 : rel < 0 ? 1 : 2) : v === -1 ? (rel > 0 ? 9 : rel < 0 ? 7 : 8) : (rel > 0 ? 6 : rel < 0 ? 4 : 5);
  P.inp = { d, pa: g.pressed('a'), pb: g.pressed('b'), sup: g.keyp('KeyQ') };
  pushHist(P, d, g.time);
}
function pushHist(f, d, t) { if (d !== f.lastD) { f.hist.push({ d, t }); f.lastD = d; if (f.hist.length > 20) f.hist.shift(); } }
function hasSeq(f, seq, now, win = 0.55) {
  let k = seq.length - 1;
  for (let i = f.hist.length - 1; i >= 0 && k >= 0; i--) { const h = f.hist[i]; if (now - h.t > win) break; if (h.d === seq[k]) k--; }
  return k < 0;
}
function canAct(f) { return f.y >= GY && (f.st === 'idle' || f.st === 'walk' || f.st === 'crouch'); }
function step(g, f, o, dt) {
  f.t += dt; f.inv -= dt; f.hitT -= dt;
  f.shownHp = Math.max(f.hp, f.shownHp - 300 * dt);
  const I = f.inp || { d: 5 }, ch = CHARS[f.ch];
  if (f.st === 'hit' || f.st === 'block') { f.stun -= dt; f.vx *= Math.pow(0.02, dt); if (f.stun <= 0) { f.st = f.y >= GY ? 'idle' : 'jump'; if (o.combo > 1) { S.comboShow = { n: o.combo, t: 1.2, who: o === S.p ? 0 : 1 }; if (o === S.p) g.add(o.combo * 150, g.W / 2, 150); } o.combo = 0; } return; }
  if (f.st === 'knock') { if (f.y >= GY && f.vy >= 0) { f.kd -= dt; f.vx = 0; if (f.kd <= 0) { f.st = 'idle'; f.inv = 0.3; o.combo = 0; } } return; }
  if (f.st === 'ko') return;
  // 공격 진행
  if (f.st === 'attack') {
    const m = MOVES[f.mv]; f.mt += dt;
    if (f.mv === 'dp' && f.mt > m.st && !f.dpUp) { f.dpUp = true; f.vy = -760; f.vx = f.face * 120; g.sfx.tone(300, 0.2, 'sawtooth', 0.06, 900); }
    if (f.mv === 'tat' && f.mt > m.st && f.mt < m.st + m.ac) { f.vx = f.face * 230; f.y = Math.min(f.y, GY - 30); }
    if (f.mv === 'fb' && !f.fired && f.mt > m.st) { f.fired = true; S.proj.push({ x: f.x + f.face * 70, y: f.y - 110, vx: f.face * 430, owner: f, dmg: 90 * ch.pow, e: ch.fb, r: 26, hits: 1 }); g.sfx.tone(180, 0.3, 'sawtooth', 0.07, 500); }
    if (f.mv === 'sup' && !f.fired && f.mt > m.st) { f.fired = true; S.proj.push({ x: f.x + f.face * 80, y: f.y - 110, vx: f.face * 520, owner: f, dmg: 70 * ch.pow, e: ch.fb, r: 52, hits: 5, sup: true }); g.sfx.tone(100, 0.8, 'sawtooth', 0.1, 600); g.shake(8, 0.4); }
    if (m.dmg && f.mt > m.st && f.mt < m.st + m.ac) {
      const hb = hitbox(f, m), hurt = hurtbox(o);
      const multiReady = m.multi && f.hits < m.multi && f.mt > m.st + (m.ac / m.multi) * f.hits;
      if ((!f.hit || multiReady) && U.rectHit(hb, hurt) && o.inv <= 0 && o.st !== 'knock' && o.st !== 'ko') { f.hit = true; f.hits++; land(g, f, o, m); }
    }
    if (f.mt > m.st + m.ac + m.rc || (f.y >= GY && f.air && f.mt > 0.05 && f.vy >= 0)) { f.st = f.y < GY ? 'jump' : 'idle'; f.mv = null; f.dpUp = false; f.air = false; }
    // 캔슬: 맞힌 일반기 → 필살기
    if (f.hit && f.mv && ['lp', 'lk', 'clp', 'clk'].includes(f.mv) && f.mt < m.st + m.ac + 0.15) trySpecial(g, f, I, true);
    if (f.hit && f.mv === 'lp' && I.pa && f.mt > m.st + 0.03) startMove(g, f, 'lp');
    if (f.hit && f.mv === 'lp' && I.pb) startMove(g, f, 'lk');
    if (f.hit && f.mv === 'clp' && I.pb) startMove(g, f, 'clk');
    return;
  }
  if (f.y < GY) { // 공중
    if (I.pa && !f.air) { startMove(g, f, 'jp'); f.air = true; } else if (I.pb && !f.air) { startMove(g, f, 'jk'); f.air = true; }
    return;
  }
  if (trySpecial(g, f, I, false)) return;
  const d = I.d;
  f.crouch = d <= 3;
  if (I.pa) return startMove(g, f, f.crouch ? 'clp' : 'lp');
  if (I.pb) return startMove(g, f, f.crouch ? 'clk' : 'lk');
  if (d >= 7) { f.vy = -820; f.vx = (d === 9 ? 1 : d === 7 ? -1 : 0) * f.face * ch.spd * 1.05; f.st = 'jump'; g.sfx.jump(); return; }
  if (f.crouch) { f.st = 'crouch'; f.vx = 0; }
  else if (d === 6 || d === 4) { f.st = 'walk'; f.vx = (d === 6 ? 1 : -0.75) * f.face * ch.spd; }
  else { f.st = 'idle'; f.vx = 0; }
}
function trySpecial(g, f, I, cancel) {
  if (!I.pa && !I.pb && !I.sup) return false;
  const now = g.time;
  if ((I.sup || (I.pa && hasSeq(f, [2, 3, 6, 2, 3, 6], now, 0.9))) && f.meter >= 100 && !S.proj.some((p) => p.owner === f)) { f.meter = 0; S.freeze = 0.5; startMove(g, f, 'sup'); S.superFlash = 0.6; return true; }
  if (I.pa) {
    const qcf = hasSeq(f, [2, 3, 6], now), dp = hasSeq(f, [6, 2, 3], now);
    if (qcf && (I.d === 6 || !dp) && !S.proj.some((p) => p.owner === f)) { startMove(g, f, 'fb'); return true; }
    if (dp) { startMove(g, f, 'dp'); f.inv = MOVES.dp.inv; return true; }
  }
  if (I.pb && hasSeq(f, [2, 1, 4], now)) { startMove(g, f, 'tat'); return true; }
  return false;
}
function startMove(g, f, mv) {
  f.st = 'attack'; f.mv = mv; f.mt = 0; f.hit = false; f.hits = 0; f.fired = false; f.dpUp = false;
  if (f.y >= GY) f.vx = 0;
  if (mv === 'lp' || mv === 'clp') g.sfx.tone(500, 0.04, 'square', 0.03);
  else if (mv !== 'fb' && mv !== 'sup') g.sfx.tone(350, 0.06, 'square', 0.03);
  if (['fb', 'dp', 'tat', 'sup'].includes(mv)) f.meter = Math.min(100, f.meter + 4);
}
function hitbox(f, m) { const x0 = f.x + f.face * 10, x1 = f.x + f.face * m.rng; return { x: Math.min(x0, x1), y: f.y + m.y, w: Math.abs(x1 - x0), h: m.h }; }
function hurtbox(f) { const h = f.st === 'crouch' || (f.st === 'block' && f.crouch) || (f.st === 'attack' && (f.mv === 'clp' || f.mv === 'clk')) ? 95 : f.st === 'knock' ? 40 : 150; return { x: f.x - 26, y: f.y - h, w: 52, h }; }
function blocking(f, o, lv) {
  if (f.st === 'attack' || f.y < GY || f.st === 'hit' || f.st === 'knock') return false;
  const I = f.inp || { d: 5 };
  const back = I.d === 4 || I.d === 1 || (f.st === 'block');
  if (!back) return false;
  const low = I.d === 1 || (f.st === 'block' && f.crouch && I.d !== 4);
  if (lv === 'low' && !low) return false;
  if (lv === 'over' && low) return false;
  return true;
}
function land(g, f, o, m) {
  const pow = CHARS[f.ch].pow;
  if (blocking(o, f, m.lv)) {
    o.st = 'block'; o.crouch = (o.inp || {}).d === 1; o.stun = m.stun * 0.7; o.vx = f.face * m.push * 1.1; o.hp -= (m.chip || 0) * pow; o.meter = Math.min(100, o.meter + 3);
    g.sfx.tone(800, 0.05, 'square', 0.04); spark(f.x + f.face * m.rng, f.y + m.y + m.h / 2, '#93c5fd'); S.freeze = 0.04; return;
  }
  o.combo = 0; f.combo++;
  const scale = Math.max(0.4, 1 - (f.combo - 1) * 0.12);
  const dmg = Math.round(m.dmg * pow * scale);
  o.hp = Math.max(0, o.hp - dmg); o.hitT = 0.15;
  f.meter = Math.min(100, f.meter + 6); o.meter = Math.min(100, o.meter + 3);
  if (m.kd || o.y < GY) { o.st = 'knock'; o.vy = -420; o.vx = f.face * 200; o.kd = 0.7; o.y = Math.min(o.y, GY - 1); }
  else { o.st = 'hit'; o.stun = m.stun; o.vx = f.face * m.push; }
  o.mv = null;
  if (f === S.p) g.score += dmg;
  g.sfx.hit(); g.shake(dmg > 90 ? 8 : 4, 0.15); S.freeze = dmg > 90 ? 0.12 : 0.06;
  spark(f.x + f.face * m.rng, f.y + m.y + m.h / 2, '#fde047');
  g.burst(f.x + f.face * m.rng, f.y + m.y + m.h / 2, ['#fff', '#fde047', '#f97316'], 10, 260, 0.3);
}
function spark(x, y, c) { S.sparks.push({ x, y, c, t: 0.18 }); }
function physics(f, dt) {
  if (f.y < GY || f.vy < 0) { f.vy += 2000 * dt; f.y += f.vy * dt; if (f.y >= GY) { f.y = GY; f.vy = 0; if (f.st === 'jump') { f.st = 'idle'; f.vx = 0; } if (f.st === 'attack' && (f.mv === 'jp' || f.mv === 'jk')) { f.st = 'idle'; f.mv = null; f.air = false; f.vx = 0; } } }
  f.x += f.vx * dt;
  if (f.st === 'knock' || f.st === 'ko') f.x = U.clamp(f.x, 40, W0 - 40);
}
function updProj(g, dt) {
  for (const p of S.proj) {
    p.x += p.vx * dt; p.t = (p.t || 0) + dt;
    if (p.x < -60 || p.x > W0 + 60) p.dead = true;
    for (const q of S.proj) if (q !== p && q.owner !== p.owner && !q.dead && !p.dead && Math.abs(q.x - p.x) < p.r + q.r) { if (p.sup && !q.sup) { q.dead = true; } else if (q.sup && !p.sup) { p.dead = true; } else { p.dead = q.dead = true; } spark((p.x + q.x) / 2, p.y, '#fff'); g.sfx.explode(); }
    const o = p.owner === S.p ? S.e : S.p;
    if (!p.dead && o.inv <= 0 && o.st !== 'knock' && o.st !== 'ko' && U.circRect({ x: p.x, y: p.y, r: p.r }, hurtbox(o)) && (p.cd || 0) <= 0) {
      const m = { dmg: p.dmg, lv: 'mid', stun: 0.35, push: 140, chip: p.dmg * 0.15, rng: 0, y: 0, h: 0, kd: p.sup && p.hits === 1 };
      const f = p.owner; const fx = f.x; f.x = p.x - f.face * 0; land(g, f, o, m); f.x = fx;
      p.hits--; p.cd = 0.12; if (p.hits <= 0) p.dead = true;
    }
    p.cd = (p.cd || 0) - dt;
  }
  S.proj = S.proj.filter((p) => !p.dead);
}
// ---------- AI ----------
function aiThink(g, E, P, dt) {
  const lvl = Math.min(4, S.stage + (S.round > 2 ? 1 : 0)), skill = 0.35 + lvl * 0.15;
  const dist = Math.abs(P.x - E.x), fwd = E.face;
  E.aiT -= dt;
  const I = E.inp || { d: 5 }; I.pa = false; I.pb = false; I.sup = false;
  const fbIncoming = S.proj.some((p) => p.owner === P && Math.sign(E.x - p.x) === Math.sign(p.vx) && Math.abs(E.x - p.x) < 260);
  const pAttacking = P.st === 'attack' && dist < 160;
  const jumpIn = P.y < GY - 40 && P.vy > -200 && dist < 200 && Math.sign(P.vx || fwd) !== fwd;
  if (E.react === undefined) E.react = 0;
  E.react -= dt;
  // 반응 (확률적으로)
  if (E.react <= 0 && canAct(E)) {
    E.react = 0.18 - lvl * 0.025;
    if (jumpIn && Math.random() < skill * 0.8) { E.hist.push({ d: 6, t: g.time - 0.1 }, { d: 2, t: g.time - 0.06 }, { d: 3, t: g.time - 0.02 }); I.d = 3; I.pa = true; E.inp = I; return; }
    if ((pAttacking || fbIncoming) && Math.random() < skill) { E.guard = 0.35; E.guardLow = P.mv === 'clp' || P.mv === 'clk'; }
    if (fbIncoming && Math.random() < skill * 0.4) { I.d = 9; E.inp = I; return; }
  }
  if (E.guard > 0) { E.guard -= dt; const d = E.guardLow ? 1 : 4; E.inp = { d }; pushHist(E, d, g.time); return; }
  if (E.aiT > 0) { E.inp = { d: E.plan || 5 }; pushHist(E, E.inp.d, g.time); if (E.planAtk) { E.inp[E.planAtk] = true; E.planAtk = null; } return; }
  E.aiT = U.rand(0.12, 0.35) - lvl * 0.02;
  E.plan = 5; E.planAtk = null;
  if (E.meter >= 100 && dist > 200 && Math.random() < 0.4) { E.inp = { d: 5, sup: true }; return; }
  const r = Math.random();
  if (dist > 380) {
    if (r < 0.3 + lvl * 0.06 && !S.proj.some((p) => p.owner === E)) { E.hist.push({ d: 2, t: g.time - 0.12 }, { d: 3, t: g.time - 0.08 }, { d: 6, t: g.time - 0.03 }); E.inp = { d: 6, pa: true }; return; }
    E.plan = r < 0.85 ? 6 : 9;
  } else if (dist > 150) {
    if (r < 0.2) E.plan = 9; else if (r < 0.45 && !S.proj.some((p) => p.owner === E)) { E.hist.push({ d: 2, t: g.time - 0.12 }, { d: 3, t: g.time - 0.08 }, { d: 6, t: g.time - 0.03 }); E.inp = { d: 6, pa: true }; return; }
    else if (r < 0.6) { E.hist.push({ d: 2, t: g.time - 0.12 }, { d: 1, t: g.time - 0.08 }, { d: 4, t: g.time - 0.03 }); E.inp = { d: 4, pb: true }; return; }
    else E.plan = r < 0.9 ? 6 : 4;
  } else {
    if (r < 0.3) { E.inp = { d: 5, pa: true }; E.aiT = 0.1; E.plan = 5; E.planAtk = Math.random() < skill ? 'pb' : null; return; }
    if (r < 0.48) { E.inp = { d: 2, pb: true }; return; }
    if (r < 0.58) { E.inp = { d: 2, pa: true }; E.planAtk = 'pb'; E.plan = 2; E.aiT = 0.12; return; }
    if (r < 0.66 && lvl >= 2) { E.hist.push({ d: 6, t: g.time - 0.1 }, { d: 2, t: g.time - 0.06 }, { d: 3, t: g.time - 0.02 }); E.inp = { d: 3, pa: true }; return; }
    if (r < 0.8) E.plan = 4; else E.plan = r < 0.9 ? 1 : 7;
  }
  E.inp = { d: E.plan }; pushHist(E, E.plan, g.time);
}
// ---------- 그리기 ----------
function fightDraw(g, c) {
  const grd = c.createLinearGradient(0, 0, 0, g.H); grd.addColorStop(0, '#ff9a5a'); grd.addColorStop(0.55, '#7a2a6a'); grd.addColorStop(1, '#1a0a2a'); c.fillStyle = grd; c.fillRect(0, 0, g.W, g.H);
  g.circle(780, 200, 70, 'rgba(255,230,180,.7)');
  for (let i = 0; i < 9; i++) { const x = i * 120 - 20; g.poly([[x, 420], [x + 60, 300 - (i % 3) * 30], [x + 120, 420]], 'rgba(40,10,50,.6)'); }
  for (let i = 0; i < 14; i++) { const x = i * 72 + 10, bob = Math.sin(g.time * 6 + i) * (S.phase === 'ko' ? 6 : 2); g.emoji(['🧍', '🧍‍♂️', '🧍‍♀️'][i % 3], x, 420 + bob, 34); }
  g.rect(0, GY, g.W, g.H - GY, '#5a3a2a'); for (let i = 0; i < 16; i++) g.line(i * 64, GY, i * 64 - 120, g.H, 'rgba(0,0,0,.25)', 2); g.rect(0, GY, g.W, 4, '#8a6a4a');
  for (const f of [S.e, S.p]) { c.globalAlpha = 0.35; c.fillStyle = '#000'; c.beginPath(); c.ellipse(f.x, GY + 4, 40, 8, 0, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1; }
  drawFighter(g, c, poseOf(S.e), 1); drawFighter(g, c, poseOf(S.p), 1);
  for (const p of S.proj) { c.save(); c.translate(p.x, p.y); c.rotate(g.time * 10); g.circle(0, 0, p.r * 1.1, 'rgba(255,255,255,.25)'); g.emoji(p.e, 0, 0, p.r * 2); c.restore(); }
  for (const s of S.sparks) { const k = s.t / 0.18; c.save(); c.translate(s.x, s.y); for (let i = 0; i < 6; i++) { c.rotate(1.05); g.line(0, 0, 30 * (1.4 - k), 0, s.c, 4 * k + 1); } c.restore(); }
  if (S.superFlash > 0) { S.superFlash -= 1 / 60; c.fillStyle = `rgba(255,255,255,${S.superFlash * 0.5})`; c.fillRect(0, 0, g.W, g.H); g.text('SUPER ART!', g.W / 2, 260, 56, '#facc15'); }
  // HUD
  hpBar(g, 30, 30, S.p, false); hpBar(g, g.W - 30 - 380, 30, S.e, true);
  g.rrect(g.W / 2 - 40, 22, 80, 54, 10, '#111', '#facc15', 2); g.text(String(Math.max(0, Math.ceil(S.timer))), g.W / 2, 50, 34, S.timer < 10 ? '#ef4444' : '#fff');
  g.text(CHARS[S.p.ch].n, 34, 84, 18, '#fff', 'left'); g.text(CHARS[S.e.ch].n, g.W - 34, 84, 18, '#fff', 'right');
  for (let i = 0; i < 2; i++) { g.emoji(i < S.wins[0] ? '🏅' : '⚪', 180 + i * 26, 84, 18); g.emoji(i < S.wins[1] ? '🏅' : '⚪', g.W - 180 - i * 26, 84, 18); }
  meterBar(g, 30, g.H - 34, S.p.meter, false); meterBar(g, g.W - 30 - 240, g.H - 34, S.e.meter, true);
  if (S.comboShow) g.text(`${S.comboShow.n} HIT COMBO!`, S.comboShow.who === 0 ? 160 : g.W - 160, 160, 34, '#facc15');
  if (S.phase === 'intro') { g.text(S.pt > 1 ? `ROUND ${S.round}` : 'FIGHT!', g.W / 2, 250, 72, S.pt > 1 ? '#fff' : '#ef4444'); if (S.pt > 1) g.text(`VS ${CHARS[S.opp].n} — ${CHARS[S.opp].title}`, g.W / 2, 310, 22, '#fde68a'); }
  if (S.phase === 'ko') { g.text(S.koText, g.W / 2, 240, 80, '#ef4444'); if (S.pt < 2) g.text(S.koWinner === 0 ? 'YOU WIN' : S.koWinner === 1 ? 'YOU LOSE' : 'DRAW', g.W / 2, 320, 40, '#fff'); }
}
function hpBar(g, x, y, f, flip) {
  g.rect(x - 3, y - 3, 386, 30, '#000');
  g.rect(x, y, 380, 24, '#7f1d1d');
  const w1 = 380 * f.shownHp / 1000, w2 = 380 * f.hp / 1000;
  if (flip) { g.rect(x, y, w1, 24, '#ef4444'); g.rect(x, y, w2, 24, f.hp < 300 ? '#f97316' : '#facc15'); }
  else { g.rect(x + 380 - w1, y, w1, 24, '#ef4444'); g.rect(x + 380 - w2, y, w2, 24, f.hp < 300 ? '#f97316' : '#facc15'); }
}
function meterBar(g, x, y, v, flip) {
  g.rect(x, y, 240, 14, '#111'); const w = 240 * v / 100; g.rect(flip ? x : x + 240 - w, y, w, 14, v >= 100 ? (Math.floor(g.time * 8) % 2 ? '#22d3ee' : '#a78bfa') : '#3b82f6');
  g.text(v >= 100 ? 'SUPER MAX' : 'SUPER', flip ? x + 240 : x, y - 10, 12, '#fff', flip ? 'right' : 'left');
}
function poseOf(f) {
  let pose = f.st === 'walk' ? 'walk' : f.st === 'crouch' ? 'crouch' : f.st;
  if (f.st === 'attack') pose = f.mv;
  if (f.st === 'block' && f.crouch) pose = 'cblock';
  if (f.st === 'idle' && S.phase === 'ko' && S.koWinner >= 0 && (f === S.p) === (S.koWinner === 0)) pose = 'win';
  return { x: f.x, y: f.y, face: f.face, ch: f.ch, pose, t: f.t, mt: f.mt, hitT: f.hitT, vy: f.vy };
}
function drawFighter(g, c, F, sc) {
  const ch = CHARS[F.ch];
  c.save(); c.translate(F.x, F.y); c.scale(F.face * sc, sc);
  const p = F.pose, t = F.t || 0, br = Math.sin(t * 5) * 2;
  let hip = [0, -80], neck = [4, -142], lf = [-20, 0], rf = [22, 0], lh = [26, -110], rh = [34, -128], lean = 0;
  if (p === 'idle' || p === 'win' || p === 'walk') { neck = [4, -142 + br]; lh = [24, -112 + br]; rh = [36, -126 + br]; if (p === 'walk') { const s = Math.sin(t * 10) * 16; lf = [-20 + s, 0]; rf = [22 - s, 0]; } if (p === 'win') { rh = [20, -200]; lh = [-10, -110]; } }
  if (p === 'crouch' || p === 'cblock' || p === 'clp' || p === 'clk') { hip = [0, -45]; neck = [10, -100]; lf = [-30, 0]; rf = [30, 0]; lh = [28, -78]; rh = [36, -90]; }
  if (p === 'cblock') { lh = [26, -95]; rh = [30, -105]; }
  if (p === 'block') { lh = [24, -128]; rh = [28, -140]; neck = [-2, -140]; }
  if (p === 'jump' || p === 'jp' || p === 'jk' || p === 'knock' || p === 'ko') { hip = [0, -95]; lf = [-24, -40]; rf = [20, -50]; }
  const mt = F.mt || 0;
  if (p === 'lp') rh = [mt < 0.15 ? 80 : 40, -122];
  if (p === 'clp') rh = [mt < 0.14 ? 78 : 40, -78];
  if (p === 'lk') { rf = mt < 0.22 ? [100, -100] : [40, -40]; lean = -0.15; }
  if (p === 'clk') rf = mt < 0.24 ? [110, -10] : [40, 0];
  if (p === 'jp') rh = [80, -80];
  if (p === 'jk') rf = [90, -60];
  if (p === 'dp') { rh = [30, -220]; neck = [10, -150]; lf = [-10, 10]; rf = [10, -30]; }
  if (p === 'tat') { c.rotate(0); const a = t * 25; rf = [Math.cos(a) * 90, -100 + Math.sin(a) * 10]; lf = [-Math.cos(a) * 40, -40]; }
  if (p === 'fb' || p === 'sup') { lh = mt > 0.12 ? [72, -110] : [10, -100]; rh = mt > 0.12 ? [72, -100] : [10, -90]; lean = 0.1; }
  if (p === 'hit') { neck = [-14, -136]; lean = -0.2; rh = [10, -100]; lh = [0, -110]; }
  if (p === 'knock' || p === 'ko') { c.rotate(-0.8 * Math.min(1, Math.max(0, F.y < GY ? 1 : 1.6))); }
  c.rotate(lean);
  const leg = ch.col, arm = ch.skin, lw = 14;
  const knee = (a, b, bend) => [(a[0] + b[0]) / 2 + bend, (a[1] + b[1]) / 2];
  for (const ft of [lf, rf]) { const k = knee(hip, ft, ft === rf ? 10 : 6); g.line(hip[0], hip[1], k[0], k[1], leg, lw + 2); g.line(k[0], k[1], ft[0], ft[1], leg, lw); g.circle(ft[0] + 4, ft[1], 8, ch.skin); }
  g.line(hip[0], hip[1], neck[0], neck[1], leg, 34);
  g.line(hip[0] - 16, hip[1] - 4, hip[0] + 16, hip[1] - 4, ch.belt, 7);
  const sh = [neck[0] + 2, neck[1] + 10];
  for (const hd of [lh, rh]) { const el = [(sh[0] + hd[0]) / 2 - 6, (sh[1] + hd[1]) / 2 + 14]; g.line(sh[0], sh[1], el[0], el[1], arm, 12); g.line(el[0], el[1], hd[0], hd[1], arm, 11); g.circle(hd[0], hd[1], 10, F.hitT > 0 ? '#fff' : ch.boss ? '#a855f7' : '#dc2626'); }
  c.save(); c.translate(neck[0] + 4, neck[1] - 18); c.scale(1, 1); g.emoji(F.hitT > 0 ? '😣' : (p === 'ko' || p === 'knock') ? '😵' : p === 'win' ? '😎' : ch.e, 0, 0, 40); c.restore();
  g.line(neck[0] - 16, neck[1] - 26, neck[0] + 18, neck[1] - 30, ch.belt, 5);
  c.restore();
}
