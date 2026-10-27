let S;
const TX = 10, TY = 96, TW = 700, TH = 494, SAND = TY + TH - 42, PX = 720;
const TANKS = [
  { n: '열대 수조', e: '🌴', cost: 0, c1: '#0e7490', c2: '#083344' },
  { n: '냉수 수조', e: '❄️', cost: 1500, c1: '#1e40af', c2: '#0b1640' },
  { n: '심해 수조', e: '🌑', cost: 5000, c1: '#1e1b4b', c2: '#05030f' },
  { n: '대형 수조', e: '🐋', cost: 15000, c1: '#0369a1', c2: '#082f49' },
];
const SP = [
  { k: 'guppy', n: '구피', e: '🐟', t: 0, cost: 20, val: 35, grow: 25, sz: 26, sp: 70 },
  { k: 'clown', n: '흰동가리', e: '🐠', t: 0, cost: 60, val: 95, grow: 35, sz: 30, sp: 60 },
  { k: 'shrimp', n: '새우', e: '🦐', t: 0, cost: 45, val: 60, grow: 30, sz: 22, sp: 40, bottom: 1 },
  { k: 'puffer', n: '복어', e: '🐡', t: 0, cost: 130, val: 200, grow: 45, sz: 34, sp: 35 },
  { k: 'crab', n: '꽃게', e: '🦀', t: 1, cost: 90, val: 130, grow: 40, sz: 30, sp: 35, bottom: 1 },
  { k: 'squid', n: '오징어', e: '🦑', t: 1, cost: 160, val: 240, grow: 45, sz: 36, sp: 55 },
  { k: 'lobster', n: '랍스터', e: '🦞', t: 1, cost: 220, val: 330, grow: 55, sz: 36, sp: 30, bottom: 1 },
  { k: 'turtle', n: '바다거북', e: '🐢', t: 1, cost: 320, val: 480, grow: 70, sz: 42, sp: 30 },
  { k: 'jelly', n: '해파리', e: '🪼', t: 2, cost: 200, val: 290, grow: 45, sz: 34, sp: 18, drift: 1 },
  { k: 'octo', n: '문어', e: '🐙', t: 2, cost: 280, val: 420, grow: 60, sz: 40, sp: 30 },
  { k: 'shark', n: '상어', e: '🦈', t: 2, cost: 650, val: 950, grow: 80, sz: 54, sp: 55, pred: 1 },
  { k: 'seal', n: '물범', e: '🦭', t: 3, cost: 950, val: 1350, grow: 80, sz: 54, sp: 50 },
  { k: 'dolphin', n: '돌고래', e: '🐬', t: 3, cost: 1600, val: 2200, grow: 90, sz: 60, sp: 75 },
  { k: 'whale', n: '고래', e: '🐋', t: 3, cost: 4200, val: 5200, grow: 120, sz: 84, sp: 30 },
];
const SPK = {}; SP.forEach((s) => (SPK[s.k] = s));
const VAR = [
  { k: 'n', n: '일반', m: 1, f: 'none' }, { k: 'g', n: '황금', m: 3, f: 'sepia(1) saturate(5) hue-rotate(-12deg) brightness(1.15)' },
  { k: 'a', n: '알비노', m: 4, f: 'grayscale(1) brightness(1.45)' }, { k: 'r', n: '무지개', m: 8, f: '' },
];
const DECO = [
  { k: 'weed', n: '수초', e: '🌿', cost: 30, ap: 1, clean: 0.02 }, { k: 'coral', n: '산호', e: '🪸', cost: 80, ap: 3 },
  { k: 'shell', n: '조개', e: '🐚', cost: 40, ap: 1.5 }, { k: 'rock', n: '바위', e: '🪨', cost: 50, ap: 1.5 },
  { k: 'castle', n: '성', e: '🏰', cost: 300, ap: 8 }, { k: 'anchor', n: '닻', e: '⚓', cost: 150, ap: 4 },
  { k: 'moai', n: '석상', e: '🗿', cost: 400, ap: 10 }, { k: 'chest', n: '보물상자', e: '🧰', cost: 600, ap: 14 },
];
const UPG = [
  { k: 'filter', n: '여과기', e: '🌀', d: '수질 자동 정화', max: 4, cost: [150, 400, 900, 2000] },
  { k: 'size', n: '수조 확장', e: '📐', d: '수용량 +4', max: 4, cost: [300, 800, 2000, 4500] },
  { k: 'feeder', n: '자동 급식기', e: '🤖', d: '주기적으로 먹이 투입', max: 3, cost: [250, 700, 1600] },
  { k: 'light', n: '번식 조명', e: '💡', d: '번식·돌연변이 확률 ↑', max: 3, cost: [400, 1200, 3000] },
];
const GOALS = [
  { d: '물고기 5마리 키우기', f: () => S.tanks[0].fish.length >= 5, r: 200 },
  { d: '첫 번식 성공', f: () => S.births >= 1, r: 300 },
  { d: '두 번째 수조 개장', f: () => S.owned >= 2, r: 500 },
  { d: '도감 10종 등록', f: () => colCount() >= 10, r: 1000 },
  { d: '희귀 변이(황금/알비노/무지개) 발견', f: () => Object.keys(S.col).some((k) => !k.endsWith('_n')), r: 1500 },
  { d: '심해 수조 개장', f: () => S.owned >= 3, r: 2500 },
  { d: '도감 20종 등록', f: () => colCount() >= 20, r: 4000 },
  { d: '대형 수조 + 도감 28종 → 완성!', f: () => S.owned >= 4 && colCount() >= 28, r: 0 },
];

GAME({
  title: '수족관 키우기', w: 960, h: 600, bg: '#04121c', controls: 'none',
  help: '수조 클릭 → 먹이 투하 (1코인) · 물고기 클릭 → 정보/판매\n배부르고 건강한 ♂♀ 성체가 있으면 알을 낳아요 → 희귀 변이(황금·알비노·무지개)!\n수질 관리: 여과기·수초·물갈이 · 남은 먹이와 배설물은 수질을 떨어뜨려요\n관람객 수입은 물고기 가치와 장식에 비례 · 새 수조를 열어 새 종을 들이세요\n🦈 상어는 배고프면 작은 물고기를 잡아먹어요! · 자동 저장',
  init(g) {
    newGame();
    const sv = g.load('aq', null);
    if (sv && sv.v === 1) { try { loadGame(sv); } catch (e) { newGame(); } }
    S.g = g;
  },
  update(g, dt) {
    S.g = g;
    const m = g.mouse;
    for (let k = 1; k <= 4; k++) if (g.keyp('Digit' + k) && S.tanks[k - 1].owned) { S.cur = k - 1; S.sel = null; }
    if (m.clicked && !uiClick(g)) tankClick(g);
    if (m.rclick) { S.deco = null; S.sel = null; }
    for (let i = 0; i < S.tanks.length; i++) if (S.tanks[i].owned) tankTick(g, S.tanks[i], dt, i === S.cur);
    // 관람 수입
    S.attr = 0; for (const t of S.tanks) if (t.owned) S.attr += tankAttr(t);
    S.incT += dt;
    if (S.incT >= 1) { S.incT -= 1; const inc = S.attr / 60; S.coins += inc; S.earned += inc; }
    S.saveT -= dt; if (S.saveT <= 0) { S.saveT = 15; saveGame(); }
    S.goalT -= dt; if (S.goalT <= 0) { S.goalT = 0.5; checkGoal(g); }
    for (const t of S.toasts) t.t -= dt;
    S.toasts = S.toasts.filter((t) => t.t > 0);
    let alive = 0; for (const t of S.tanks) alive += t.fish.length + t.eggs.length;
    if (!alive && S.coins < 21) { g.save('aq', null); return g.over('물고기가 모두 사라지고 돈도 없어요… 수족관 폐업'); }
    g.score = Math.round(S.earned);
    g.info = `💰${Math.floor(S.coins)} · 📖${colCount()}/${SP.length * 4}`;
  },
  draw(g, c) {
    S.ui = [];
    drawTank(g, c);
    drawTop(g);
    drawPanel(g, c);
  },
});

function newTank(i) { return { i, owned: i === 0, fish: [], food: [], poop: [], eggs: [], decos: [], water: 100, filter: 0, size: 0, feeder: 0, light: 0, feedT: 0, breedT: 6, dead: [] }; }
function newGame() {
  S = { coins: 300, earned: 0, cur: 0, tanks: [0, 1, 2, 3].map(newTank), col: {}, births: 0, owned: 1, tab: 0, sel: null, deco: null, ui: [], toasts: [], incT: 0, saveT: 15, goalT: 1, goal: 0, attr: 0, confirm: 0, bub: [] };
  const t = S.tanks[0];
  for (let k = 0; k < 2; k++) addFish(t, 'guppy', 'n', 1, k ? 'M' : 'F');
  t.decos.push({ k: 'weed', x: 120 }, { k: 'rock', x: 560 });
  for (let i = 0; i < 18; i++) S.bub.push({ x: U.rand(TX, TX + TW), y: U.rand(TY, SAND), s: U.rand(20, 60), r: U.rand(1.5, 4) });
}
function saveGame() {
  const g = S.g; if (!g) return;
  g.save('aq', { v: 1, coins: S.coins, earned: S.earned, col: S.col, births: S.births, owned: S.owned, goal: S.goal,
    tanks: S.tanks.map((t) => ({ o: t.owned, w: t.water, f: t.filter, s: t.size, fd: t.feeder, l: t.light, d: t.decos, fish: t.fish.map((f) => [f.sp, f.v, Math.round(f.size * 100) / 100, f.sex, Math.round(f.hunger), Math.round(f.health)]) })) });
}
function loadGame(sv) {
  Object.assign(S, { coins: sv.coins, earned: sv.earned, col: sv.col || {}, births: sv.births || 0, owned: sv.owned || 1, goal: sv.goal || 0 });
  sv.tanks.forEach((o, i) => {
    const t = S.tanks[i] = newTank(i);
    Object.assign(t, { owned: o.o, water: o.w, filter: o.f, size: o.s, feeder: o.fd, light: o.l, decos: o.d || [] });
    for (const f of o.fish) if (SPK[f[0]]) { const F = addFish(t, f[0], f[1], f[2], f[3]); F.hunger = f[4]; F.health = f[5]; }
  });
}
function addFish(t, sp, v, size, sex) {
  const s = SPK[sp];
  const f = { sp, v: v || 'n', size: size === undefined ? 0.35 : size, sex: sex || (Math.random() < 0.5 ? 'M' : 'F'), hunger: 20, health: 100, x: U.rand(TX + 60, TX + TW - 60), y: s.bottom ? SAND + 6 : U.rand(TY + 60, SAND - 40), tx: 0, ty: 0, vx: 0, vy: 0, t: 0, fl: false, cd: 0, ph: U.rand(0, 6) };
  f.tx = f.x; f.ty = f.y;
  t.fish.push(f);
  regCol(sp, f.v);
  return f;
}
function regCol(sp, v) {
  const k = sp + '_' + v;
  if (S.col[k]) return;
  S.col[k] = 1;
  if (S.g && S.g.frame > 0) {
    const bonus = Math.round(SPK[sp].val * VAR.find((x) => x.k === v).m * 0.3);
    S.coins += bonus; S.earned += bonus;
    toast(`📖 도감 등록! ${VAR.find((x) => x.k === v).n} ${SPK[sp].n} (+${bonus})`, v === 'n' ? '#93c5fd' : '#fde047');
    S.g.sfx.power();
  }
}
function colCount() { return Object.keys(S.col).length; }
function cap(t) { return 8 + t.size * 4; }
function toast(s, col) { S.toasts.push({ s, col: col || '#fff', t: 4 }); if (S.toasts.length > 5) S.toasts.shift(); }
function fishVal(f) { return Math.round(SPK[f.sp].val * (0.25 + Math.min(1, f.size) * 0.75) * VAR.find((x) => x.k === f.v).m * (0.5 + f.health / 200)); }
function tankAttr(t) {
  let a = 0;
  for (const f of t.fish) a += SPK[f.sp].val * Math.min(1, f.size) * VAR.find((x) => x.k === f.v).m * (f.health / 100) * 0.06;
  let d = 0; for (const o of t.decos) d += DECO.find((x) => x.k === o.k).ap;
  return (a + d) * (0.5 + t.water / 200);
}
function spend(c) {
  if (S.coins < c) { toast('💰 코인이 부족해요', '#fca5a5'); S.g.sfx.hit(); return false; }
  S.coins -= c; return true;
}

/* ---------- 시뮬 ---------- */
function tankTick(g, t, dt, vis) {
  // 수질
  let dirt = t.fish.length * 0.025 + t.poop.length * 0.04;
  for (const p of t.food) if (p.rot > 0) dirt += 0.12;
  let clean = t.filter * 0.18;
  for (const o of t.decos) if (o.k === 'weed') clean += 0.03;
  t.water = U.clamp(t.water - (dirt - clean) * dt, 0, 100);
  // 자동 급식
  if (t.feeder && t.fish.length) { t.feedT -= dt; if (t.feedT <= 0) { t.feedT = 14 / t.feeder; const hungry = t.fish.filter((f) => f.hunger > 40).length; for (let k = 0; k < Math.min(6, Math.ceil(hungry * 0.8)); k++) dropFood(t, U.rand(TX + 60, TX + TW - 60)); } }
  // 먹이 이동
  for (let i = t.food.length - 1; i >= 0; i--) {
    const p = t.food[i];
    if (p.y < SAND + 8) { p.y += 34 * dt; p.x += Math.sin(g.time * 3 + p.ph) * 8 * dt; }
    else { p.rot += dt; if (p.rot > 16) { t.food.splice(i, 1); t.water = Math.max(0, t.water - 3); } }
  }
  for (let i = t.poop.length - 1; i >= 0; i--) { const p = t.poop[i]; if (p.y < SAND + 10) p.y += 12 * dt; p.t += dt; if (p.t > 40) { t.poop.splice(i, 1); } }
  // 물고기
  for (let i = t.fish.length - 1; i >= 0; i--) {
    const f = t.fish[i], s = SPK[f.sp];
    f.hunger = Math.min(100, f.hunger + dt * (s.pred ? 1.4 : 1.1));
    f.cd = Math.max(0, f.cd - dt);
    let dh = 0;
    if (f.hunger > 80) dh -= 1.2; if (t.water < 40) dh -= (40 - t.water) * 0.05; if (f.hunger < 60 && t.water > 55) dh += 1.5;
    f.health = U.clamp(f.health + dh * dt, 0, 100);
    if (f.hunger < 60 && f.health > 40 && f.size < 1.25) f.size = Math.min(1.25, f.size + dt / s.grow * (f.size < 1 ? 1 : 0.15));
    if (Math.random() < dt * 0.04 * f.size) t.poop.push({ x: f.x, y: f.y, t: 0 });
    if (f.health <= 0) {
      t.fish.splice(i, 1); t.water = Math.max(0, t.water - 5);
      t.dead.push({ e: s.e, x: f.x, y: f.y, t: 3 });
      toast(`💀 ${s.n}이(가) 죽었어요… (배고픔/수질 확인!)`, '#fca5a5'); if (vis) g.sfx.lose();
      if (S.sel === f) S.sel = null;
      continue;
    }
    moveFish(g, t, f, s, dt);
  }
  for (const d of t.dead) { d.t -= dt; d.y -= 25 * dt; }
  t.dead = t.dead.filter((d) => d.t > 0);
  // 알
  for (let i = t.eggs.length - 1; i >= 0; i--) {
    const e = t.eggs[i]; e.t -= dt;
    if (e.t <= 0) {
      t.eggs.splice(i, 1);
      if (t.fish.length < cap(t)) { const f = addFish(t, e.sp, e.v, 0.3); f.x = e.x; f.y = SPK[e.sp].bottom ? SAND + 6 : e.y - 20; S.births++; if (vis) { g.burst(e.x, e.y, ['#fde68a', '#fff'], 14, 120); g.sfx.pop(); } }
    }
  }
  // 번식
  t.breedT -= dt;
  if (t.breedT <= 0) { t.breedT = 8; breed(g, t); }
}
function moveFish(g, t, f, s, dt) {
  const spd = s.sp * (0.6 + Math.min(1, f.size) * 0.4) * (f.health < 30 ? 0.5 : 1);
  let tx = f.tx, ty = f.ty, fast = 1;
  // 먹이 추적
  if (f.hunger > 25 && t.food.length) {
    let best = null, bd = 1e9;
    for (const p of t.food) { if (s.bottom && p.y < SAND - 10) continue; const d = Math.abs(p.x - f.x) + Math.abs(p.y - f.y); if (d < bd) { bd = d; best = p; } }
    if (best) {
      tx = best.x; ty = s.bottom ? SAND + 6 : best.y; fast = 1.6;
      if (Math.abs(best.x - f.x) < 14 && Math.abs(best.y - f.y) < (s.bottom ? 30 : 14)) { t.food.splice(t.food.indexOf(best), 1); f.hunger = Math.max(0, f.hunger - 30); if (S.cur === t.i) g.sfx.tone(700 + Math.random() * 300, 0.04, 'sine', 0.03); }
    }
  } else if (s.pred && f.hunger > 70 && f.size >= 0.8) {
    // 상어 사냥
    let prey = null, bd = 1e9;
    for (const o of t.fish) { if (o === f || SPK[o.sp].pred || SPK[o.sp].sz * o.size > 32) continue; const d = Math.hypot(o.x - f.x, o.y - f.y); if (d < bd) { bd = d; prey = o; } }
    if (prey) {
      tx = prey.x; ty = prey.y; fast = 1.4;
      if (bd < 18) { t.fish.splice(t.fish.indexOf(prey), 1); f.hunger = 0; if (S.sel === prey) S.sel = null; toast(`🦈 배고픈 상어가 ${SPK[prey.sp].n}을(를) 잡아먹었어요!`, '#f87171'); if (S.cur === t.i) { g.shake(5); g.sfx.hit(); g.burst(f.x, f.y, '#ef4444', 12, 120); } }
    }
  }
  if (tx === f.tx && ty === f.ty) {
    f.t -= dt;
    const dd = Math.hypot(f.tx - f.x, f.ty - f.y);
    if (f.t <= 0 || dd < 6) {
      f.t = U.rand(2, 6);
      f.tx = U.rand(TX + 40, TX + TW - 40);
      f.ty = s.bottom ? SAND + 6 : s.drift ? U.rand(TY + 50, SAND - 60) : U.rand(TY + 40, SAND - 30);
    }
  }
  const dx = tx - f.x, dy = ty - f.y, d = Math.hypot(dx, dy) || 1;
  const want = spd * fast;
  f.vx += ((dx / d) * want - f.vx) * Math.min(1, dt * 2.5);
  f.vy += ((dy / d) * want - f.vy) * Math.min(1, dt * 2.5);
  if (s.drift) f.vy = Math.sin(g.time * 1.5 + f.ph) * 20 + (dy / d) * 10;
  if (d > 3) { f.x += f.vx * dt; f.y += f.vy * dt; }
  f.x = U.clamp(f.x, TX + 20, TX + TW - 20); f.y = U.clamp(f.y, TY + 24, SAND + 8);
  if (Math.abs(f.vx) > 4) f.fl = f.vx > 0;
}
function breed(g, t) {
  if (t.fish.length + t.eggs.length >= cap(t) || t.water < 55) return;
  const by = {};
  for (const f of t.fish) if (f.size >= 1 && f.hunger < 55 && f.health > 70 && f.cd <= 0) (by[f.sp] = by[f.sp] || []).push(f);
  for (const k in by) {
    const L = by[k], m = L.find((f) => f.sex === 'M'), fe = L.find((f) => f.sex === 'F');
    if (!m || !fe) continue;
    if (Math.random() > 0.3 + t.light * 0.12) continue;
    m.cd = fe.cd = 35;
    const n = SPK[k].val > 1000 ? 1 : U.randi(1, 3);
    for (let j = 0; j < n && t.fish.length + t.eggs.length < cap(t); j++) {
      let v = 'n';
      const pv = [m.v, fe.v].filter((x) => x !== 'n');
      if (pv.length && Math.random() < 0.45) v = U.choice(pv);
      else { const r = Math.random(), b = 1 + t.light * 0.6; if (r < 0.006 * b) v = 'r'; else if (r < 0.03 * b) v = 'a'; else if (r < 0.08 * b) v = 'g'; }
      t.eggs.push({ sp: k, v, x: fe.x + U.rand(-20, 20), y: SAND + 14, t: 12 });
    }
    if (S.cur === t.i) { toast(`🥚 ${SPK[k].n}이(가) 알을 낳았어요!`, '#fde68a'); g.sfx.pop(); }
    return;
  }
}
function checkGoal(g) {
  const G = GOALS[S.goal]; if (!G || !G.f()) return;
  if (S.goal === GOALS.length - 1) { g.score = Math.round(S.earned) + 10000; g.save('aq', null); g.win(`꿈의 수족관 완성! 도감 ${colCount()}종`); return; }
  S.coins += G.r; S.earned += G.r; S.goal++;
  toast(`🏆 목표 달성: ${G.d} (+${G.r})`, '#fde047'); g.sfx.win(); g.burst(360, 300, ['#fde047', '#67e8f9', '#f0abfc'], 40, 300);
}
function dropFood(t, x) { for (let k = 0; k < 3; k++) t.food.push({ x: x + U.rand(-10, 10), y: TY + 8 + U.rand(0, 8), rot: 0, ph: U.rand(0, 6) }); }

/* ---------- 입력 ---------- */
function uiClick(g) {
  for (let i = S.ui.length - 1; i >= 0; i--) { const b = S.ui[i]; if (g.inRect(b.x, b.y, b.w, b.h)) { b.fn(); g.sfx.click(); return true; } }
  return !g.inRect(TX, TY, TW, TH);
}
function tankClick(g) {
  const t = S.tanks[S.cur], m = g.mouse;
  if (S.deco) {
    const D = DECO.find((x) => x.k === S.deco);
    if (t.decos.length >= 16) { toast('장식은 수조당 16개까지', '#fca5a5'); return; }
    if (spend(D.cost)) { t.decos.push({ k: D.k, x: Math.round(m.x) }); g.sfx.drop(); g.burst(m.x, SAND, '#fde68a', 10, 100); }
    return;
  }
  let hit = null, bd = 1e9;
  for (const f of t.fish) { const r = SPK[f.sp].sz * (0.5 + Math.min(1.25, f.size) * 0.5) * 0.6; const d = Math.hypot(f.x - m.x, f.y - m.y); if (d < r && d < bd) { bd = d; hit = f; } }
  if (hit) { S.sel = hit; S.tab = 0; g.sfx.pop(); return; }
  if (!t.fish.length) return;
  if (spend(1)) { dropFood(t, m.x); g.sfx.tone(500, 0.05, 'sine', 0.05, 300); }
}

/* ---------- 그리기 ---------- */
function B(g, x, y, w, h, label, col, fn, o) {
  o = o || {};
  const hov = !o.dis && g.inRect(x, y, w, h);
  g.rrect(x, y, w, h, 7, o.dis ? '#1a2230' : o.on ? '#0e7490' : hov ? '#2b4a63' : col || '#1c2c40', o.on ? '#67e8f9' : 'rgba(255,255,255,.15)', 1.5);
  if (label) g.text(label, x + w / 2, y + h / 2 + 1, o.size || 13, o.dis ? '#5b6472' : '#fff');
  if (!o.dis && fn) S.ui.push({ x, y, w, h, fn });
}
function drawFish(g, c, f, x, y, scale) {
  const s = SPK[f.sp], V = VAR.find((v) => v.k === f.v);
  const size = s.sz * (0.45 + Math.min(1.25, f.size) * 0.55) * (scale || 1);
  c.save(); c.translate(x, y);
  if (f.fl) c.scale(-1, 1);
  if (s.drift) c.scale(1, 1 + Math.sin(g.time * 3 + f.ph) * 0.08);
  else c.rotate(U.clamp(f.vy / 200, -0.4, 0.4) * (f.fl ? -1 : 1));
  if (f.v === 'r') c.filter = `hue-rotate(${(g.time * 120) % 360}deg) saturate(2)`;
  else if (V.f !== 'none') c.filter = V.f;
  if (f.health < 30) c.globalAlpha = 0.6;
  g.emoji(s.e, 0, 0, size);
  c.restore();
  if (f.v !== 'n' && Math.random() < 0.05) g.burst(x, y, f.v === 'g' ? '#fde047' : '#fff', 1, 20, 0.5, 2);
}
function drawTank(g, c) {
  const t = S.tanks[S.cur], T = TANKS[S.cur];
  const gr = c.createLinearGradient(0, TY, 0, TY + TH);
  gr.addColorStop(0, T.c1); gr.addColorStop(1, T.c2);
  c.fillStyle = gr; c.fillRect(TX, TY, TW, TH);
  // 빛줄기
  c.globalAlpha = 0.07;
  for (let k = 0; k < 5; k++) { const x = TX + 80 + k * 140 + Math.sin(g.time * 0.5 + k) * 20; g.poly([[x, TY], [x + 40, TY], [x + 120, SAND], [x + 40, SAND]], '#fff'); }
  c.globalAlpha = 1;
  // 수질 탁함
  if (t.water < 70) { c.fillStyle = `rgba(90,110,40,${(70 - t.water) / 70 * 0.45})`; c.fillRect(TX, TY, TW, TH); }
  // 모래
  g.rect(TX, SAND + 14, TW, TY + TH - SAND - 14, '#d6b77a');
  for (let k = 0; k < 40; k++) g.circle(TX + ((k * 89) % TW), SAND + 20 + ((k * 37) % 24), 2, '#c29d5c');
  for (const o of t.decos) { const D = DECO.find((x) => x.k === o.k); c.save(); c.translate(o.x, SAND + 4); if (o.k === 'weed') c.rotate(Math.sin(g.time * 1.5 + o.x) * 0.12); g.emoji(D.e, 0, -10, o.k === 'castle' || o.k === 'moai' ? 64 : o.k === 'weed' || o.k === 'coral' ? 44 : 36); c.restore(); }
  // 기포
  for (const b of S.bub) { b.y -= b.s * (1 / 60); if (b.y < TY) { b.y = SAND; b.x = U.rand(TX + 10, TX + TW - 10); } g.ring(b.x + Math.sin(b.y / 20) * 3, b.y, b.r, 'rgba(255,255,255,.35)', 1); }
  if (t.filter) { g.rect(TX + TW - 34, TY, 22, 80, '#475569'); g.emoji('🌀', TX + TW - 23, TY + 92, 18); }
  for (const p of t.poop) g.circle(p.x, p.y, 2.2, '#5b4636');
  for (const p of t.food) g.circle(p.x, p.y, 3.2, p.rot > 8 ? '#6b5b2a' : '#d97706');
  for (const e of t.eggs) { g.circle(e.x, e.y, 6, '#fef9c3'); g.ring(e.x, e.y, 6, '#fde047', 1); g.text(Math.ceil(e.t), e.x, e.y - 12, 9, '#fef9c3'); }
  for (const f of t.fish) drawFish(g, c, f, f.x, f.y);
  if (S.sel && t.fish.indexOf(S.sel) >= 0) { const f = S.sel; g.ring(f.x, f.y, SPK[f.sp].sz * 0.6, '#fde047', 2); }
  for (const d of t.dead) { c.globalAlpha = d.t / 3; c.save(); c.translate(d.x, d.y); c.rotate(Math.PI); g.emoji(d.e, 0, 0, 28); c.restore(); c.globalAlpha = 1; }
  // 테두리
  g.stroke(TX, TY, TW, TH, '#94a3b8', 4);
  g.rect(TX - 4, TY - 6, TW + 8, 8, '#334155');
  // 수조 탭
  TANKS.forEach((T2, i) => {
    const tk = S.tanks[i], x = TX + i * 176;
    B(g, x, 58, 170, 32, tk.owned ? `${T2.e} ${T2.n} (${tk.fish.length}/${cap(tk)})` : `🔒 ${T2.n} ${T2.cost}`, '#1c2c40', () => {
      if (tk.owned) { S.cur = i; S.sel = null; } else if (i === S.owned && spend(T2.cost)) { tk.owned = true; S.owned++; S.cur = i; toast(`🎉 ${T2.n} 개장!`, '#86efac'); S.g.sfx.win(); saveGame(); } else if (i !== S.owned) toast('이전 수조를 먼저 열어야 해요', '#fca5a5');
    }, { on: S.cur === i, size: 12, dis: !tk.owned && i !== S.owned });
  });
  // 상태
  g.rrect(TX + 8, TY + 8, 170, 22, 6, 'rgba(0,0,0,.45)');
  g.text('💧 수질', TX + 16, TY + 19, 12, '#fff', 'left');
  g.rrect(TX + 70, TY + 13, 100, 12, 4, '#1e293b'); g.rrect(TX + 70, TY + 13, t.water, 12, 4, t.water > 60 ? '#22d3ee' : t.water > 35 ? '#eab308' : '#ef4444');
  if (t.water < 40 && Math.sin(g.time * 6) > 0) g.text('⚠️ 물갈이 필요!', TX + 190, TY + 19, 13, '#fca5a5', 'left');
  if (S.deco) g.text(`${DECO.find((x) => x.k === S.deco).e} 바닥을 클릭해 장식 배치 (우클릭 취소)`, TX + TW / 2, TY + TH - 14, 14, '#fde047');
  else if (!t.fish.length) g.text('오른쪽 상점에서 물고기를 들여오세요', TX + TW / 2, TY + TH / 2, 18, 'rgba(255,255,255,.6)');
  let ty = TY + 44;
  for (const o of S.toasts) { c.globalAlpha = Math.min(1, o.t); c.font = 'bold 13px sans-serif'; const w = c.measureText(o.s).width + 20; g.rrect(TX + 8, ty - 11, w, 22, 6, 'rgba(0,0,0,.7)'); g.text(o.s, TX + 18, ty, 13, o.col, 'left'); ty += 26; }
  c.globalAlpha = 1;
}
function drawTop(g) {
  g.rect(0, 0, 960, 52, '#0b1e2c'); g.rect(0, 51, 960, 1, '#1f3b52');
  g.text('💰 ' + Math.floor(S.coins).toLocaleString(), 14, 18, 19, '#fde047', 'left');
  g.text(`관람 수입 ${(S.attr / 60).toFixed(1)}/초`, 14, 39, 11, '#93c5fd', 'left');
  g.text(`📖 도감 ${colCount()}/${SP.length * 4}`, 190, 18, 14, '#e0f2fe', 'left');
  g.text(`🥚 번식 ${S.births}회`, 190, 39, 11, '#cbd5e1', 'left');
  const G = GOALS[S.goal];
  g.text('🎯 목표 ' + (S.goal + 1) + '/' + GOALS.length, 330, 18, 12, '#fcd34d', 'left');
  g.text(G ? G.d + (G.r ? ` (+${G.r})` : '') : '', 330, 38, 13, '#fff', 'left');
}
function drawPanel(g, c) {
  g.rect(PX, 52, 240, 548, '#0b1622');
  const tabs = ['🐟 상점', '🪸 장식', '📖 도감', '⚙️ 설비'];
  tabs.forEach((s, i) => B(g, PX + 4 + i * 59, 58, 55, 28, s, '#1c2c40', () => { S.tab = i; if (i !== 1) S.deco = null; }, { on: S.tab === i, size: 11 }));
  const x = PX + 8, t = S.tanks[S.cur];
  let y = 96;
  if (S.tab === 0) {
    if (S.sel && t.fish.indexOf(S.sel) >= 0) {
      const f = S.sel, s = SPK[f.sp], V = VAR.find((v) => v.k === f.v);
      g.rrect(x - 2, y, 228, 150, 8, '#13283b');
      drawFish(g, c, { ...f, fl: false, vy: 0 }, x + 34, y + 36, 1.2 * 44 / s.sz);
      g.text(`${V.n} ${s.n} ${f.sex === 'M' ? '♂' : '♀'}`, x + 70, y + 22, 14, f.v === 'n' ? '#fff' : '#fde047', 'left');
      g.text(f.size >= 1 ? '성체' : `성장 ${Math.round(f.size * 100)}%`, x + 70, y + 42, 11, '#cbd5e1', 'left');
      bar(g, x + 4, y + 72, 214, 100 - f.hunger, '#f59e0b', '포만');
      bar(g, x + 4, y + 90, 214, f.health, '#22c55e', '건강');
      const val = fishVal(f);
      B(g, x + 4, y + 108, 214, 32, `💰 판매 +${val}`, '#7f1d1d', () => { t.fish.splice(t.fish.indexOf(f), 1); S.coins += val; S.earned += val; S.sel = null; S.g.sfx.coin(); }, { size: 13 });
      y += 158;
    }
    g.text(`${TANKS[S.cur].e} ${TANKS[S.cur].n} 입양 가능 종`, x, y + 6, 12, '#cbd5e1', 'left'); y += 18;
    SP.filter((s) => s.t === S.cur).forEach((s) => {
      const full = t.fish.length >= cap(t);
      B(g, x, y, 224, 44, '', '#13283b', () => { if (spend(s.cost)) { const f = addFish(t, s.k, 'n', 0.4); f.y = TY + 30; S.g.sfx.coin(); S.g.burst(f.x, f.y, '#67e8f9', 10, 120); } }, { dis: full });
      g.emoji(s.e, x + 22, y + 22, 28);
      g.text(s.n, x + 44, y + 14, 13, '#fff', 'left');
      g.text(`성체가치 ${s.val} · ${s.bottom ? '바닥형' : s.pred ? '포식자!' : s.drift ? '부유형' : '유영형'}`, x + 44, y + 31, 10, '#94a3b8', 'left');
      g.text(s.cost, x + 216, y + 22, 13, S.coins >= s.cost ? '#fde047' : '#f87171', 'right');
      y += 48;
    });
    if (t.fish.length >= cap(t)) g.text('수조가 가득 찼어요 (설비 → 확장)', x, y + 8, 11, '#fca5a5', 'left');
  } else if (S.tab === 1) {
    g.text('장식을 고르고 수조 바닥을 클릭', x, y + 4, 12, '#cbd5e1', 'left'); y += 18;
    DECO.forEach((D, i) => {
      const bx = x + (i % 2) * 114, by = y + Math.floor(i / 2) * 64;
      B(g, bx, by, 110, 60, '', '#13283b', () => (S.deco = S.deco === D.k ? null : D.k), { on: S.deco === D.k });
      g.emoji(D.e, bx + 26, by + 26, 28); g.text(D.n, bx + 70, by + 18, 12, '#fff'); g.text(D.cost, bx + 70, by + 36, 12, S.coins >= D.cost ? '#fde047' : '#f87171');
      g.text(D.clean ? '수질+' : '매력+' + D.ap, bx + 55, by + 52, 9, '#94a3b8');
    });
    y += 4 * 64 + 6;
    g.text(`이 수조 장식 ${t.decos.length}/16`, x, y, 11, '#94a3b8', 'left');
    B(g, x, y + 12, 224, 26, '🧹 마지막 장식 치우기', '#334155', () => { t.decos.pop(); }, { dis: !t.decos.length, size: 12 });
  } else if (S.tab === 2) {
    g.text(`도감 ${colCount()}/${SP.length * 4} · 변이: 일반/황금/알비노/무지개`, x, y + 4, 10, '#cbd5e1', 'left'); y += 16;
    SP.forEach((s, i) => {
      const yy = y + i * 34;
      g.text(TANKS[s.t].e, x + 6, yy + 16, 11, '#fff');
      VAR.forEach((V, j) => {
        const bx = x + 20 + j * 50, has = S.col[s.k + '_' + V.k];
        g.rrect(bx, yy + 2, 46, 30, 6, has ? '#164e63' : '#111827');
        if (has) { c.save(); c.translate(bx + 23, yy + 17); if (V.k === 'r') c.filter = `hue-rotate(${(g.time * 120) % 360}deg) saturate(2)`; else if (V.f !== 'none') c.filter = V.f; g.emoji(s.e, 0, 0, 22); c.restore(); }
        else g.text('?', bx + 23, yy + 17, 14, '#374151');
      });
    });
  } else {
    g.text(`${TANKS[S.cur].e} ${TANKS[S.cur].n} 설비`, x, y + 4, 13, '#fff', 'left'); y += 20;
    UPG.forEach((u) => {
      const lv = t[u.k], c2 = u.cost[lv];
      g.rrect(x - 2, y, 228, 50, 8, '#13283b');
      g.emoji(u.e, x + 18, y + 25, 22);
      g.text(`${u.n} Lv${lv}/${u.max}`, x + 38, y + 16, 13, '#fff', 'left'); g.text(u.d, x + 38, y + 34, 10, '#94a3b8', 'left');
      B(g, x + 150, y + 11, 72, 28, lv >= u.max ? 'MAX' : '' + c2, '#155e75', () => { if (spend(c2)) { t[u.k]++; S.g.sfx.power(); saveGame(); } }, { dis: lv >= u.max, size: 12 });
      y += 56;
    });
    const wc = 20 + t.fish.length * 3;
    B(g, x, y + 4, 224, 32, `🚿 물갈이 (${wc}) — 수질 100`, '#0c4a6e', () => { if (spend(wc)) { t.water = 100; t.food = []; t.poop = []; for (const f of t.fish) f.health = Math.max(5, f.health - 5); S.g.sfx.noise(0.5, 0.1); } }, { dis: t.water > 97, size: 12 });
    y += 46;
    g.text(`수용량 ${t.fish.length + t.eggs.length}/${cap(t)} · 매력 ${tankAttr(t).toFixed(0)}`, x, y, 11, '#cbd5e1', 'left');
    B(g, x, 562, 224, 28, S.confirm > 0 ? '정말? 한 번 더 클릭' : '🗑️ 처음부터 (저장 삭제)', '#3f1d1d', () => {
      if (S.confirm > 0) { const g2 = S.g; g2.save('aq', null); newGame(); S.g = g2; toast('🐠 새 수족관을 시작합니다'); } else { S.confirm = 1; S.g.later(() => { if (S) S.confirm = 0; }, 3); }
    }, { size: 12 });
  }
}
function bar(g, x, y, w, v, col, label) {
  g.text(label, x, y, 11, '#cbd5e1', 'left');
  g.rrect(x + 34, y - 6, w - 34, 12, 4, '#1e293b'); g.rrect(x + 34, y - 6, (w - 34) * U.clamp(v, 0, 100) / 100, 12, 4, col);
}
