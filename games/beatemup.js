let S;
const ZMIN = 360, ZMAX = 575;
const STAGES = [
  { n: '1 뒷골목', sky: ['#1a1030', '#4a2a50'], floor: '#4b4453', line: '#2b2433', len: 3600, boss: 'hammer', wall: '#3a2f4a' },
  { n: '2 지하철역', sky: ['#0a1a2a', '#2a3a4a'], floor: '#5a5a62', line: '#3a3a42', len: 4000, boss: 'twin', wall: '#2a3440' },
  { n: '3 보스의 빌딩', sky: ['#200a0a', '#5a1a1a'], floor: '#6a4a3a', line: '#4a2a1a', len: 4200, boss: 'big', wall: '#3a1a1a' },
];
const FOES = {
  thug: { n: '깡패', head: '🧔', body: '#7c3aed', hp: 40, spd: 90, dmg: 8, reach: 62, cd: 1.4, pts: 200 },
  punk: { n: '펑크', head: '😝', body: '#db2777', hp: 34, spd: 135, dmg: 7, reach: 70, cd: 1.0, pts: 250, kick: true },
  knife: { n: '칼잡이', head: '😈', body: '#0f766e', hp: 38, spd: 120, dmg: 12, reach: 66, cd: 1.6, pts: 300, throws: true },
  fat: { n: '뚱보', head: '🐷', body: '#b45309', hp: 80, spd: 70, dmg: 14, reach: 70, cd: 2.0, pts: 400, charge: true, big: 1.3 },
  hammer: { n: '망치 대장', head: '👺', body: '#991b1b', hp: 260, spd: 80, dmg: 18, reach: 100, cd: 1.6, pts: 5000, boss: true, big: 1.4 },
  twin: { n: '쌍칼 자객', head: '🥷', body: '#111827', hp: 300, spd: 170, dmg: 14, reach: 80, cd: 1.0, pts: 7000, boss: true, throws: true, big: 1.2 },
  big: { n: '보스 빅', head: '🤵', body: '#1f2937', hp: 420, spd: 95, dmg: 20, reach: 90, cd: 1.4, pts: 10000, boss: true, charge: true, gun: true, big: 1.5 },
};
const ITEMS = { meat: { e: '🍗', heal: 50 }, apple: { e: '🍎', heal: 20 }, cash: { e: '💰', pts: 1000 }, pipe: { e: '🔧', w: true, dmg: 20, uses: 14, reach: 92 }, bat: { e: '🏏', w: true, dmg: 24, uses: 10, reach: 100 }, knife: { e: '🔪', w: true, dmg: 30, throw: true } };
GAME({
  title: '파이널 브롤', w: 960, h: 600, bg: '#1a1030', controls: 'dpad+ab', aLabel: '공격', bLabel: '점프',
  help: '방향키/WASD 이동 (위아래 = 앞뒤)\nZ/Space 공격 (연타 = 3단 콤보) · X/Shift 점프 → 공중 Z = 점프킥\nZ+X 동시 또는 C = 필살 회전 공격 (체력 소모)\n적에게 붙어 걸어가면 잡기 → Z 무릎차기, 3번째는 던지기\n바닥의 🔧🏏🔪 위에서 Z = 줍기 (🔪는 던짐) · 🛢️ 부수면 음식!',
  init(g) { S = { lvl: 0, lives: 3, kills: 0 }; load(g); },
  update(g, dt) {
    const P = S.p;
    S.intro -= dt;
    if (S.clear) { S.clear -= dt; P.x += 160 * dt; P.anim += dt; if (S.clear <= 0) { S.lvl++; if (S.lvl >= STAGES.length) return g.win(`도시를 정화했다! 처치 ${S.kills}`); const keep = P.hp; load(g); S.p.hp = Math.min(100, keep + 40); } return; }
    if (P.dead) { P.deadT -= dt; if (P.deadT <= 0) { S.lives--; if (S.lives < 0) return g.over(`${STAGES[S.lvl].n} · 처치 ${S.kills}`); Object.assign(P, { hp: 100, dead: false, st: 'idle', inv: 2.5, h: 300, vh: 0, wep: null }); for (const e of S.ens) if (Math.abs(e.x - P.x) < 220) { e.st = 'down'; e.t = 0.8; e.vh = 300; e.vx = Math.sign(e.x - P.x) * 250; } g.sfx.power(); } updEnemies(g, dt); return; }
    playerUpdate(g, dt);
    updEnemies(g, dt);
    updProps(g, dt);
    waves(g, dt);
    const tgt = S.lock !== null ? S.lock : U.clamp(P.x - 380, S.cam, STAGES[S.lvl].len - g.W);
    S.cam = S.lock !== null ? U.lerp(S.cam, S.lock, Math.min(1, dt * 4)) : Math.max(S.cam, tgt);
    g.info = `${STAGES[S.lvl].n} · 👊×${S.lives} · 처치 ${S.kills}${P.wep ? ' · ' + ITEMS[P.wep.k].e + (P.wep.uses ? P.wep.uses : '') : ''}`;
  },
  draw(g, c) { drawAll(g, c); },
});
function load(g) {
  const st = STAGES[S.lvl];
  S.p = { x: 150, z: 470, h: 0, vh: 0, vx: 0, vz: 0, face: 1, hp: 100, st: 'idle', t: 0, combo: 0, comboT: 0, inv: 1, anim: 0, wep: null, grab: null, knees: 0, hitSet: null, dead: false };
  S.ens = []; S.props = []; S.items = []; S.shots = []; S.cam = 0; S.lock = null; S.go = 0; S.clear = 0; S.intro = 2; S.spawned = 0; S.bossT = 0;
  const n = 4;
  S.waves = [];
  for (let i = 0; i < n; i++) {
    const x = Math.round(st.len * (i + 1) / (n + 1)) - 400;
    const pool = S.lvl === 0 ? ['thug', 'thug', 'punk'] : S.lvl === 1 ? ['thug', 'punk', 'knife', 'fat'] : ['punk', 'knife', 'fat', 'thug', 'knife'];
    const list = []; const cnt = 3 + i + S.lvl;
    for (let k = 0; k < cnt; k++) list.push(U.choice(pool));
    S.waves.push({ x, list, done: false, started: false });
  }
  S.waves.push({ x: st.len - 960, list: [st.boss, S.lvl ? 'punk' : 'thug', 'thug'], boss: true, done: false, started: false });
  for (let i = 0; i < 9 + S.lvl * 2; i++) {
    const x = 500 + i * (st.len - 800) / (9 + S.lvl * 2) + U.rand(-60, 60);
    S.props.push({ x, z: U.rand(ZMIN + 20, ZMAX - 20), hp: 2, k: Math.random() < 0.6 ? '🛢️' : '📦', drop: U.choice(['meat', 'apple', 'apple', 'cash', 'pipe', 'bat', 'knife']) });
  }
  for (let i = 0; i < 2; i++) S.items.push({ k: U.choice(['pipe', 'bat', 'knife']), x: 700 + i * 1300, z: U.rand(ZMIN + 40, ZMAX - 30) });
}
function waves(g, dt) {
  const P = S.p;
  if (S.lock === null) {
    const w = S.waves.find((w) => !w.done);
    if (w && !w.started && S.cam >= w.x - 4) {
      w.started = true; S.lock = w.x; S.cam = Math.min(S.cam, w.x);
      w.list.forEach((k, i) => g.later(() => spawn(g, k, i), i * (w.boss ? 0.6 : 0.9)));
      if (w.boss) { g.sfx.tone(90, 1, 'sawtooth', 0.08, 45); S.bossName = FOES[w.list[0]].n; S.bossT = 2.5; }
      S.cur = w;
    }
    if (!w && P.x > STAGES[S.lvl].len - 200 && !S.clear) { S.clear = 3; g.sfx.win(); g.add(3000 + P.hp * 20, g.W / 2, 200); }
  } else {
    const w = S.cur, alive = S.ens.some((e) => !e.dead);
    if (w.started && !alive && S.spawned >= w.list.length) {
      w.done = true; S.lock = null; S.go = 3; S.spawned = 0; g.sfx.coin();
      if (w.boss) { S.clear = 3.5; g.sfx.win(); g.add(3000 + P.hp * 20, g.W / 2, 200); }
    }
  }
  S.go -= dt; S.bossT = (S.bossT || 0) - dt;
}
function spawn(g, k, i) {
  if (S.lock === null) return;
  const F = FOES[k], side = i % 2 ? -1 : 1;
  const x = S.lock + (side > 0 ? 960 + 60 : -60);
  S.ens.push({ k, F, x, z: U.rand(ZMIN + 10, ZMAX - 10), h: 0, vh: 0, vx: 0, hp: F.hp * (1 + S.lvl * 0.15), max: F.hp * (1 + S.lvl * 0.15), face: -side, st: 'walk', t: 0, cd: U.rand(0.5, 1.5), dead: false, anim: 0, inv: 0, hitT: 0, ox: U.rand(-20, 20), knife: F.throws ? 1 : 0 });
  S.spawned = (S.spawned || 0) + 1;
}
function playerUpdate(g, dt) {
  const P = S.p;
  P.t += dt; P.inv -= dt; P.comboT -= dt; P.hitT = (P.hitT || 0) - dt;
  if (P.st === 'hurt') { P.x += P.vx * dt; P.vx *= Math.pow(0.02, dt); if (P.t > 0.3) P.st = 'idle'; return; }
  if (P.st === 'down') { P.vh -= 1500 * dt; P.h += P.vh * dt; P.x += P.vx * dt; if (P.h <= 0) { P.h = 0; P.vh = 0; P.vx = 0; } if (P.t > 1.2) { P.st = 'idle'; P.inv = 1.2; if (P.hp <= 0) { P.dead = true; P.deadT = 1.5; g.sfx.lose(); } } clampP(); return; }
  const special = (g.pressed('a') && g.b) || (g.pressed('b') && g.a) || g.keyp('KeyC');
  if (special && P.st !== 'special' && P.hp > 8 && P.h <= 0) { P.st = 'special'; P.t = 0; P.hp -= 6; P.hitSet = new Set(); P.grab = null; g.sfx.tone(300, 0.4, 'sawtooth', 0.07, 900); return; }
  if (P.st === 'special') { P.face = Math.floor(P.t * 12) % 2 ? 1 : -1; for (const e of S.ens) if (!e.dead && !P.hitSet.has(e) && Math.abs(e.x - P.x) < 110 && Math.abs(e.z - P.z) < 40 && e.h < 60) { P.hitSet.add(e); hitEnemy(g, e, 22, Math.sign(e.x - P.x) || 1, true); } if (P.t > 0.5) P.st = 'idle'; return; }
  if (P.st === 'grab') {
    const e = P.grab;
    if (!e || e.dead || e.st !== 'grabbed') { P.st = 'idle'; P.grab = null; return; }
    e.x = P.x + P.face * 46; e.z = P.z;
    if (g.pressed('a')) {
      P.knees++; P.at = 0.18;
      if (P.knees >= 3) { e.st = 'idle'; P.grab = null; P.st = 'idle'; hitEnemy(g, e, 26, P.face, true, 520); e.thrown = true; g.sfx.explode(); g.shake(6, 0.2); }
      else { hitEnemy(g, e, 10, P.face, false, 0); e.st = 'grabbed'; }
    }
    P.at -= dt;
    if (P.t > 1.6) { e.st = 'idle'; P.grab = null; P.st = 'idle'; }
    return;
  }
  if (P.st === 'atk') { P.t2 = (P.t2 || 0) + dt; if (P.t2 > 0.08 && !P.did) { P.did = true; meleeHit(g); } if (P.t2 > (P.combo >= 3 ? 0.36 : 0.24)) P.st = 'idle'; if (P.h > 0) airPhys(P, dt); return; }
  const mx = g.right - g.left, mz = g.down - g.up;
  if (P.h <= 0) {
    P.vx = mx * 210; P.vz = mz * 140;
    if (mx) P.face = mx;
    P.x += P.vx * dt; P.z += P.vz * dt;
    P.anim += (mx || mz) ? dt : 0;
    P.st = (mx || mz) ? 'walk' : 'idle';
    if (g.pressed('b')) { P.vh = 620; P.h = 1; P.jx = mx * 230; P.st = 'jump'; P.jk = false; g.sfx.jump(); }
    else if (g.pressed('a')) attackPress(g);
    else if (mx) { // 잡기
      for (const e of S.ens) if (!e.dead && !e.F.boss && e.st !== 'down' && e.st !== 'atk' && e.h <= 0 && Math.abs(e.z - P.z) < 18 && Math.sign(e.x - P.x) === mx && Math.abs(e.x - P.x) < 50) { P.st = 'grab'; P.grab = e; P.t = 0; P.knees = 0; e.st = 'grabbed'; e.t = 0; g.sfx.click(); break; }
    }
  } else {
    airPhys(P, dt);
    if (g.pressed('a') && !P.jk) { P.jk = true; P.st = 'atk'; P.combo = 9; P.t2 = 0; P.did = false; g.sfx.tone(350, 0.06, 'square', 0.03); }
  }
  clampP();
  // 아이템 줍기는 attackPress에서
}
function airPhys(P, dt) { P.vh -= 1500 * dt; P.h += P.vh * dt; P.x += (P.jx || 0) * dt; if (P.h <= 0) { P.h = 0; P.vh = 0; if (P.st === 'jump' || (P.st === 'atk' && P.combo === 9)) P.st = 'idle'; } }
function clampP() { const P = S.p; P.z = U.clamp(P.z, ZMIN, ZMAX); P.x = U.clamp(P.x, S.cam + 30, S.lock !== null ? S.cam + 930 : STAGES[S.lvl].len - 30); }
function attackPress(g) {
  const P = S.p;
  const near = S.ens.some((e) => !e.dead && Math.abs(e.x - P.x) < 90 && Math.abs(e.z - P.z) < 30);
  if (!near) { const it = S.items.find((i) => Math.abs(i.x - P.x) < 40 && Math.abs(i.z - P.z) < 30); if (it) { pickup(g, it); return; } }
  if (P.wep && ITEMS[P.wep.k].throw) { S.shots.push({ x: P.x + P.face * 30, z: P.z, h: 70, vx: P.face * 620, own: 'p', dmg: 30, e: '🔪', life: 1.2 }); P.wep = null; P.st = 'atk'; P.t2 = 0.1; P.did = true; P.combo = 1; g.sfx.shoot(); return; }
  P.combo = P.comboT > 0 ? (P.combo % 3) + 1 : 1;
  P.comboT = 0.45; P.st = 'atk'; P.t2 = 0; P.did = false;
  g.sfx.tone(P.combo === 3 ? 250 : 450, 0.05, 'square', 0.03);
}
function pickup(g, it) {
  const P = S.p, I = ITEMS[it.k];
  it.gone = true;
  if (I.heal) { P.hp = Math.min(100, P.hp + I.heal); g.sfx.power(); g.float(it.x - S.cam, it.z - 60, `+${I.heal} HP`, '#4ade80'); }
  else if (I.pts) { g.add(I.pts, it.x - S.cam, it.z - 60); g.sfx.coin(); }
  else { if (P.wep) S.items.push({ k: P.wep.k, x: P.x - P.face * 30, z: P.z }); P.wep = { k: it.k, uses: I.uses || 0 }; g.sfx.click(); g.float(it.x - S.cam, it.z - 60, I.e + ' 획득', '#fde047'); }
  S.items = S.items.filter((i) => !i.gone);
}
function meleeHit(g) {
  const P = S.p, W = P.wep && !ITEMS[P.wep.k].throw ? ITEMS[P.wep.k] : null;
  const reach = W ? W.reach : P.combo === 9 ? 80 : 72;
  let dmg = W ? W.dmg : P.combo === 3 ? 16 : P.combo === 9 ? 18 : 9;
  const kd = P.combo === 3 || P.combo === 9 || (W && P.combo === 3);
  let any = false;
  for (const e of S.ens) {
    if (e.dead || e.st === 'down' || e.inv > 0) continue;
    const dx = (e.x - P.x) * P.face;
    if (dx > -10 && dx < reach && Math.abs(e.z - P.z) < 30 && Math.abs(e.h - P.h) < 90) { hitEnemy(g, e, dmg, P.face, kd); any = true; }
  }
  for (const pr of S.props) if (!pr.gone && (pr.x - P.x) * P.face > -10 && (pr.x - P.x) * P.face < reach + 10 && Math.abs(pr.z - P.z) < 34) { pr.hp--; g.sfx.hit(); pr.shk = 0.2; if (pr.hp <= 0) { pr.gone = true; S.items.push({ k: pr.drop, x: pr.x, z: pr.z }); g.burst(pr.x - S.cam, pr.z - 30, ['#92400e', '#a16207', '#78716c'], 16, 220); g.sfx.explode(); g.add(100); } any = true; }
  if (any && W) { P.wep.uses--; if (P.wep.uses <= 0) { P.wep = null; g.float(P.x - S.cam, P.z - 120, '무기 파손!', '#f87171'); } }
}
function hitEnemy(g, e, dmg, dir, kd, fly = 300) {
  e.hp -= dmg; e.hitT = 0.12; e.face = -dir;
  g.sfx.hit(); g.shake(kd ? 6 : 3, 0.12);
  g.burst(e.x - S.cam, e.z - 80 - e.h, ['#fff', '#fde047'], 8, 200, 0.3);
  g.score += dmg * 5;
  if (e.hp <= 0 || kd || e.F.boss && false) { e.st = 'down'; e.t = 0; e.vh = 360; e.vx = dir * fly; e.h = Math.max(e.h, 1); }
  else if (e.st !== 'grabbed') { e.st = 'hurt'; e.t = 0; e.vx = dir * 90; }
  if (e.F.boss && e.st === 'down' && e.hp > 0 && Math.random() < 0.5) { e.st = 'hurt'; e.t = 0; e.vx = dir * 120; }
}
function updEnemies(g, dt) {
  const P = S.p;
  const attackers = S.ens.filter((e) => !e.dead && (e.st === 'atk' || e.st === 'approach')).length;
  for (const e of S.ens) {
    if (e.dead) { e.dt -= dt; continue; }
    const F = e.F; e.t += dt; e.cd -= dt; e.hitT -= dt; e.inv -= dt;
    if (e.st === 'grabbed') { if (e.t > 1.8) e.st = 'idle'; continue; }
    if (e.st === 'down') {
      e.vh -= 1500 * dt; e.h += e.vh * dt; e.x += e.vx * dt;
      if (e.thrown) for (const o of S.ens) if (o !== e && !o.dead && o.st !== 'down' && Math.abs(o.x - e.x) < 40 && Math.abs(o.z - e.z) < 30) hitEnemy(g, o, 15, Math.sign(e.vx) || 1, true);
      if (e.h <= 0) { e.h = 0; e.vh = 0; e.vx *= Math.pow(0.001, dt); e.thrown = false; }
      if (e.t > 1.3) {
        if (e.hp <= 0) { e.dead = true; e.dt = 1; S.kills++; g.add(F.pts, e.x - S.cam, e.z - 100); if (F.boss) { g.sfx.explode(); g.shake(10, 0.5); } else if (Math.random() < 0.15) S.items.push({ k: U.choice(['apple', 'cash', 'knife']), x: e.x, z: e.z }); }
        else { e.st = 'idle'; e.inv = 0.6; e.t = 0; }
      }
      continue;
    }
    if (e.st === 'hurt') { e.x += e.vx * dt; e.vx *= Math.pow(0.05, dt); if (e.t > 0.32) { e.st = 'idle'; e.t = 0; } continue; }
    if (e.st === 'atk') {
      if (e.charging) { e.x += e.face * 420 * dt; if (Math.abs(e.x - P.x) < 50 && Math.abs(e.z - P.z) < 30 && !e.did) { e.did = true; hurtP(g, F.dmg, e.face, true); } if (e.t > 0.7) { e.st = 'idle'; e.charging = false; e.t = 0; } e.x = U.clamp(e.x, S.cam - 40, S.cam + 1000); continue; }
      if (e.t > 0.35 && !e.did) { e.did = true; const dx = (P.x - e.x) * e.face; if (dx > -10 && dx < F.reach && Math.abs(P.z - e.z) < 28 && P.h < 60) hurtP(g, F.dmg, e.face, F.boss && Math.random() < 0.4); }
      if (e.t > 0.7) { e.st = 'idle'; e.t = 0; e.cd = F.cd * U.rand(0.8, 1.3) - S.lvl * 0.1; }
      continue;
    }
    // 이동 AI
    const dx = P.x - e.x, dz = P.z - e.z, dist = Math.abs(dx);
    e.face = dx > 0 ? 1 : -1;
    const isAtk = e.st === 'approach' || F.boss;
    if (!isAtk && attackers < 2 + S.lvl && e.cd <= 0) e.st = 'approach';
    let tx, tz;
    if (e.st === 'approach' || F.boss) { tx = P.x - e.face * (F.reach * 0.7); tz = P.z; }
    else { tx = P.x + (e.x < P.x ? -1 : 1) * (200 + Math.abs(e.ox) * 3); tz = P.z + e.ox * 4; }
    const mx = tx - e.x, mz = tz - e.z, sp = F.spd * (1 + S.lvl * 0.1);
    if (Math.abs(mx) > 8) e.x += Math.sign(mx) * Math.min(Math.abs(mx), sp * dt);
    if (Math.abs(mz) > 4) e.z += Math.sign(mz) * Math.min(Math.abs(mz), sp * 0.7 * dt);
    e.z = U.clamp(e.z, ZMIN, ZMAX);
    e.anim += dt;
    e.st = e.st === 'approach' ? 'approach' : 'walk';
    if (e.cd <= 0 && P.h < 60 && !P.dead) {
      if (F.throws && e.knife && dist > 200 && dist < 500 && Math.abs(dz) < 25 && Math.random() < dt * 2) { e.knife = F.boss ? 1 : 0; S.shots.push({ x: e.x + e.face * 30, z: e.z, h: 70, vx: e.face * 420, own: 'e', dmg: F.dmg, e: '🔪', life: 2 }); e.cd = F.cd; g.sfx.shoot(); }
      else if (F.gun && dist > 220 && Math.abs(dz) < 30 && Math.random() < dt * 1.5) { for (let k = 0; k < 3; k++) g.later(() => { if (!e.dead && e.st !== 'down') S.shots.push({ x: e.x + e.face * 40, z: e.z, h: 80, vx: e.face * 600, own: 'e', dmg: 8, bullet: true, life: 2 }); g.sfx.shoot(); }, k * 0.15); e.cd = F.cd * 1.5; }
      else if (F.charge && dist > 150 && dist < 450 && Math.abs(dz) < 20 && Math.random() < dt * 1.2) { e.st = 'atk'; e.t = 0; e.charging = true; e.did = false; g.sfx.tone(150, 0.3, 'sawtooth', 0.06); }
      else if (dist < F.reach && Math.abs(dz) < 22) { e.st = 'atk'; e.t = 0; e.did = false; }
    }
  }
  S.ens = S.ens.filter((e) => !e.dead || e.dt > 0);
  // 투사체
  for (const s of S.shots) {
    s.x += s.vx * dt; s.life -= dt;
    if (s.life <= 0 || s.x < S.cam - 60 || s.x > S.cam + 1020) { s.dead = true; continue; }
    if (s.own === 'p') { for (const e of S.ens) if (!e.dead && e.st !== 'down' && Math.abs(e.x - s.x) < 30 && Math.abs(e.z - s.z) < 30) { hitEnemy(g, e, s.dmg, Math.sign(s.vx), true); s.dead = true; break; } }
    else if (Math.abs(P.x - s.x) < 26 && Math.abs(P.z - s.z) < 26 && P.h < 50 && !P.dead) { hurtP(g, s.dmg, Math.sign(s.vx), false); s.dead = true; }
  }
  S.shots = S.shots.filter((s) => !s.dead);
}
function hurtP(g, dmg, dir, kd) {
  const P = S.p;
  if (P.inv > 0 || P.st === 'down' || P.dead || P.st === 'special') return;
  P.hp -= dmg; P.hitT = 0.15; g.sfx.hit(); g.shake(5, 0.15);
  if (P.grab) { P.grab.st = 'idle'; P.grab = null; }
  if (P.hp <= 0 || kd) { P.st = 'down'; P.t = 0; P.vh = 380; P.vx = dir * 260; P.h = 1; }
  else { P.st = 'hurt'; P.t = 0; P.vx = dir * 120; }
}
function updProps(g, dt) { for (const p of S.props) p.shk = Math.max(0, (p.shk || 0) - dt); }
// ---------- 그리기 ----------
function drawAll(g, c) {
  const st = STAGES[S.lvl], cam = S.cam;
  const grd = c.createLinearGradient(0, 0, 0, ZMIN); grd.addColorStop(0, st.sky[0]); grd.addColorStop(1, st.sky[1]); c.fillStyle = grd; c.fillRect(0, 0, g.W, ZMIN);
  // 배경 건물
  for (let i = 0; i < 12; i++) { const bw = 180, x = ((i * bw - cam * 0.4) % (bw * 8) + bw * 8) % (bw * 8) - bw; const h = 140 + (i * 53) % 120; g.rect(x, ZMIN - 60 - h, bw - 12, h + 60, 'rgba(0,0,0,.35)'); for (let k = 0; k < 6; k++) g.rect(x + 18 + (k % 3) * 50, ZMIN - 40 - h + Math.floor(k / 3) * 50, 24, 30, (i + k) % 4 ? 'rgba(250,204,21,.35)' : 'rgba(0,0,0,.3)'); }
  // 근경 벽
  for (let i = -1; i < 7; i++) { const bw = 240, x = Math.floor(cam / bw) * bw + i * bw - cam; g.rect(x, ZMIN - 120, bw - 6, 120, st.wall); g.rect(x, ZMIN - 120, bw - 6, 8, 'rgba(255,255,255,.08)'); if ((Math.floor(cam / bw) + i) % 3 === 0) { g.rrect(x + 70, ZMIN - 100, 90, 90, 6, '#111', '#555'); } else if ((Math.floor(cam / bw) + i) % 3 === 1) g.text(['🍺 BAR', '24H', 'PUNK', 'NO.1'][(Math.floor(cam / bw) + i + 8) % 4], x + 110, ZMIN - 70, 22, ['#f472b6', '#22d3ee', '#facc15', '#a3e635'][(Math.floor(cam / bw) + i + 8) % 4]); }
  g.rect(0, ZMIN - 10, g.W, g.H - ZMIN + 10, st.floor);
  for (let i = -1; i < 12; i++) { const x = Math.floor(cam / 100) * 100 + i * 100 - cam; g.line(x, ZMIN - 10, x - 60, g.H, st.line, 2); }
  g.line(0, ZMIN + 60, g.W, ZMIN + 60, st.line, 1); g.line(0, ZMIN + 150, g.W, ZMIN + 150, st.line, 1);
  // 깊이 정렬
  const list = [];
  for (const p of S.props) if (!p.gone) list.push({ z: p.z, f: () => { const sx = p.x - cam + (p.shk ? Math.sin(g.time * 80) * 4 : 0); g.emoji(p.k, sx, p.z - 30, 60); } });
  for (const it of S.items) list.push({ z: it.z - 1, f: () => { g.circle(it.x - cam, it.z, 16, 'rgba(0,0,0,.25)'); g.emoji(ITEMS[it.k].e, it.x - cam, it.z - 14 + Math.sin(g.time * 4) * 3, 34); } });
  for (const e of S.ens) list.push({ z: e.z, f: () => drawEnemy(g, c, e) });
  if (!S.p.dead || Math.floor(g.time * 10) % 2) list.push({ z: S.p.z, f: () => drawPlayer(g, c) });
  for (const s of S.shots) list.push({ z: s.z, f: () => { if (s.bullet) g.circle(s.x - cam, s.z - s.h, 5, '#fde047'); else { c.save(); c.translate(s.x - cam, s.z - s.h); c.rotate(g.time * 20); g.emoji(s.e, 0, 0, 28); c.restore(); } } });
  list.sort((a, b) => a.z - b.z).forEach((o) => o.f());
  // HUD
  const P = S.p;
  g.rrect(14, 12, 300, 54, 10, 'rgba(0,0,0,.55)'); g.emoji('😎', 40, 39, 34); g.text('브롤러', 66, 26, 14, '#fde047', 'left');
  g.rect(66, 38, 230, 16, '#3f1d1d'); g.rect(66, 38, 230 * Math.max(0, P.hp) / 100, 16, P.hp < 30 ? '#ef4444' : '#22c55e'); g.stroke(66, 38, 230, 16, '#000', 2);
  g.text(`×${S.lives}`, 290, 26, 14, '#fff', 'right');
  const target = S.ens.filter((e) => !e.dead && e.F.boss)[0] || S.lastHit;
  const boss = S.ens.find((e) => !e.dead && e.F.boss);
  if (boss) { g.rrect(g.W - 334, 12, 320, 54, 10, 'rgba(0,0,0,.55)'); g.emoji(boss.F.head, g.W - 308, 39, 34); g.text(boss.F.n, g.W - 284, 26, 14, '#fca5a5', 'left'); g.rect(g.W - 284, 38, 256, 16, '#3f1d1d'); g.rect(g.W - 284, 38, 256 * Math.max(0, boss.hp) / boss.max, 16, '#ef4444'); }
  if (S.go > 0 && Math.floor(g.time * 4) % 2) g.text('GO ▶▶', g.W - 120, 200, 44, '#facc15');
  if (S.bossT > 0) { c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(0, 230, g.W, 90); g.text(`⚠ ${S.bossName} 등장! ⚠`, g.W / 2, 275, 40, '#ef4444'); }
  if (S.intro > 0) { c.fillStyle = `rgba(0,0,0,${Math.min(0.8, S.intro)})`; c.fillRect(0, 0, g.W, g.H); g.text('STAGE ' + st.n, g.W / 2, g.H / 2 - 20, 50, '#fff'); g.text('적을 모두 쓰러뜨려라!', g.W / 2, g.H / 2 + 34, 22, '#fde047'); }
  if (S.clear) g.text('STAGE CLEAR!', g.W / 2, 200, 54, '#facc15');
}
function person(g, c, x, z, h, face, o) {
  // o: body, head, pose, t, scale, hit, wep
  const s = o.scale || 1;
  c.save(); c.globalAlpha = 0.35; c.fillStyle = '#000'; c.beginPath(); c.ellipse(x, z, 30 * s, 9 * s, 0, 0, Math.PI * 2); c.fill(); c.restore();
  c.save(); c.translate(x, z - h); c.scale(face * s, s);
  const p = o.pose;
  if (p === 'down') { c.rotate(-1.45); c.translate(-30, -10); }
  const wk = p === 'walk' ? Math.sin(o.t * 12) * 12 : 0;
  // 다리
  const legC = o.pants || '#1f2937';
  if (p === 'kick' || p === 'jkick') { g.line(-6, -50, -14, 0, legC, 13); g.line(6, -50, 56, -60, legC, 13); g.circle(58, -60, 8, '#111'); }
  else if (p === 'jump') { g.line(-6, -50, -18, -20, legC, 13); g.line(6, -50, 18, -24, legC, 13); }
  else { g.line(-6, -50, -8 + wk, 0, legC, 13); g.line(6, -50, 8 - wk, 0, legC, 13); g.rect(-16 + wk, -4, 16, 6, '#111'); g.rect(0 - wk, -4, 16, 6, '#111'); }
  // 몸
  g.rrect(-17, -102, 34, 58, 8, o.hit ? '#fff' : o.body);
  // 팔
  const skin = o.skin || '#f1c27d';
  if (p === 'punch') { g.line(8, -90, 60, -86, skin, 11); g.circle(62, -86, 9, skin); }
  else if (p === 'upper') { g.line(8, -90, 34, -130, skin, 11); g.circle(34, -134, 10, skin); }
  else if (p === 'grab') { g.line(8, -88, 44, -84, skin, 11); g.line(-8, -88, 40, -76, skin, 11); }
  else if (p === 'special') { g.line(-10, -88, -56, -92, skin, 11); g.line(10, -88, 56, -92, skin, 11); }
  else if (p === 'hurt') { g.line(8, -90, -10, -120, skin, 10); g.line(-8, -90, -26, -110, skin, 10); }
  else { const sw = p === 'walk' ? Math.sin(o.t * 12) * 10 : 0; g.line(8, -90, 16 + sw, -56, skin, 10); g.line(-8, -90, -14 - sw, -58, skin, 10); }
  if (o.wep) { const hx = p === 'punch' ? 64 : 18, hy = p === 'punch' ? -86 : -56; c.save(); c.translate(hx, hy); c.rotate(p === 'punch' ? 0.6 : -0.6); g.emoji(o.wep, 10, -10, 34); c.restore(); }
  g.emoji(o.head, 0, -122, 42 * (o.headS || 1));
  c.restore();
}
function drawPlayer(g, c) {
  const P = S.p;
  if (P.inv > 0 && Math.floor(g.time * 16) % 2 && P.st !== 'down') return;
  let pose = P.st;
  if (P.st === 'atk') pose = P.combo === 9 ? 'jkick' : P.combo === 3 ? 'upper' : P.combo === 2 ? 'kick' : 'punch';
  if (P.st === 'grab') pose = P.at > 0 ? 'kick' : 'grab';
  if (P.st === 'jump' || (P.h > 0 && P.st !== 'atk' && P.st !== 'down')) pose = 'jump';
  if (P.st === 'special') { c.save(); g.ring(P.x - S.cam, P.z - 70, 80, 'rgba(250,204,21,.6)', 6); c.restore(); }
  person(g, c, P.x - S.cam, P.z, P.h, P.face, { body: '#2563eb', pants: '#1e3a8a', head: P.hitT > 0 ? '😖' : P.st === 'down' ? '😵' : '😎', pose, t: P.anim, hit: P.hitT > 0, wep: P.wep ? ITEMS[P.wep.k].e : null, scale: 1.05 });
}
function drawEnemy(g, c, e) {
  if (e.dead && Math.floor(g.time * 12) % 2) return;
  const F = e.F;
  let pose = e.st === 'walk' || e.st === 'approach' ? 'walk' : e.st === 'atk' ? (e.charging ? 'grab' : F.kick ? 'kick' : 'punch') : e.st === 'hurt' || e.st === 'grabbed' ? 'hurt' : e.st === 'down' || e.dead ? 'down' : 'idle';
  if (e.st === 'atk' && !e.charging && e.t < 0.3) pose = 'idle';
  person(g, c, e.x - S.cam, e.z, e.h, e.face, { body: F.body, head: e.hitT > 0 ? '😫' : F.head, pose, t: e.anim, hit: e.hitT > 0, scale: F.big || 1, wep: e.k === 'hammer' ? '🔨' : e.k === 'twin' || (e.k === 'knife' && e.knife) ? '🔪' : e.k === 'big' ? '🔫' : null, pants: '#27272a' });
  if (!F.boss && !e.dead && e.hp < e.max) { g.rect(e.x - S.cam - 25, e.z - 160 * (F.big || 1) - e.h, 50, 5, '#000'); g.rect(e.x - S.cam - 25, e.z - 160 * (F.big || 1) - e.h, 50 * Math.max(0, e.hp) / e.max, 5, '#f87171'); }
}
