let S;
const PX = 720, DAYLEN = 60, RW = 119, RH = 186, RX0 = 104, TOPY = 58, BOTY = 344, CY = 294;
const ROOMS = {
  gp: { n: '일반진료실', e: '🩺', cost: 500, staff: 'doc', lv: 1, col: '#1e3a5f', d: '모든 환자 진단' },
  pharm: { n: '약국', e: '💊', cost: 600, staff: 'nurse', lv: 1, col: '#14532d', d: '감기·배탈·두통·열병' },
  treat: { n: '처치실', e: '🩹', cost: 700, staff: 'nurse', lv: 1, col: '#7c2d12', d: '찰과상·화상' },
  staffr: { n: '휴게실', e: '☕', cost: 400, staff: null, lv: 1, col: '#3f3f46', d: '직원 피로 회복 ×2' },
  vend: { n: '자판기 코너', e: '🥤', cost: 300, staff: null, lv: 1, col: '#4c1d95', d: '대기 인내심↑ · 판매 수입' },
  xray: { n: '영상의학실', e: '🩻', cost: 1000, staff: 'doc', lv: 2, col: '#164e63', d: '100% 정확한 진단' },
  dent: { n: '치과', e: '🦷', cost: 900, staff: 'doc', lv: 2, col: '#0f766e', d: '치통' },
  ortho: { n: '정형외과', e: '🦴', cost: 1200, staff: 'doc', lv: 2, col: '#713f12', d: '골절' },
  psych: { n: '정신과', e: '🛋️', cost: 1500, staff: 'doc', lv: 3, col: '#581c87', d: '우울증·불면증' },
  surg: { n: '수술실', e: '🔪', cost: 2500, staff: 'doc', lv: 4, col: '#7f1d1d', d: '맹장염·심장병 (의사 숙련 3+)', min: 3 },
};
const RK = Object.keys(ROOMS);
const DIS = [
  { k: 'cold', n: '감기', e: '🤧', room: 'pharm', fee: 180, sev: 0.5, lv: 1, t: 4 },
  { k: 'stom', n: '배탈', e: '🤢', room: 'pharm', fee: 220, sev: 0.6, lv: 1, t: 4 },
  { k: 'head', n: '두통', e: '🤕', room: 'pharm', fee: 200, sev: 0.4, lv: 1, t: 4 },
  { k: 'cut', n: '찰과상', e: '🩸', room: 'treat', fee: 280, sev: 0.7, lv: 1, t: 5 },
  { k: 'burn', n: '화상', e: '🔥', room: 'treat', fee: 380, sev: 0.9, lv: 1, t: 6 },
  { k: 'tooth', n: '치통', e: '🦷', room: 'dent', fee: 450, sev: 0.5, lv: 2, t: 6 },
  { k: 'frac', n: '골절', e: '🦴', room: 'ortho', fee: 650, sev: 0.8, lv: 2, t: 8 },
  { k: 'fever', n: '열병', e: '🥵', room: 'pharm', fee: 300, sev: 0.9, lv: 2, t: 5 },
  { k: 'dep', n: '우울증', e: '😞', room: 'psych', fee: 800, sev: 0.35, lv: 3, t: 9 },
  { k: 'insom', n: '불면증', e: '😵', room: 'psych', fee: 600, sev: 0.35, lv: 3, t: 7 },
  { k: 'app', n: '맹장염', e: '😖', room: 'surg', fee: 1400, sev: 1.4, lv: 4, t: 10, risky: 1 },
  { k: 'heart', n: '심장병', e: '💔', room: 'surg', fee: 2000, sev: 1.6, lv: 4, t: 12, risky: 1 },
];
const LEVELS = [
  { n: '동네 의원', cure: 12, rep: 50, money: 0 },
  { n: '소형 병원', cure: 35, rep: 58, money: 4000 },
  { n: '종합 병원', cure: 70, rep: 64, money: 6000 },
  { n: '대학 병원', cure: 115, rep: 70, money: 9000 },
  { n: '최고의 메디컬 센터', cure: 170, rep: 78, money: 15000 },
];
const PE = ['🧑', '👩', '👨', '👵', '👴', '👦', '👧', '🧔', '👱', '👩‍🦰', '🧑‍🦱', '👨‍🦳'];
const NAMES = ['김민준', '이서연', '박지호', '최하은', '정우진', '강수아', '조현우', '윤지민', '장예준', '임채원', '한도윤', '오시우', '서지안', '신유나', '권태윤', '황소율', '안재민', '송다인', '류하준', '전서윤'];
const STYPE = { doc: { n: '의사', e: ['👨‍⚕️', '👩‍⚕️'], base: 120 }, nurse: { n: '간호사', e: ['🧑‍⚕️'], base: 70 } };

GAME({
  title: '병원 타이쿤', w: 960, h: 600, bg: '#0b1220', controls: 'none',
  help: '빈 방을 클릭 → 진료실 건설 · 직원 탭에서 의사·간호사 고용 (빈 방에 자동 배치)\n환자: 접수 → 🩺진료실 진단 → 병에 맞는 치료실 → 완치 시 진료비 수입\n치료실이 없거나 대기가 길면 환자가 화나서 떠나고, 너무 오래 방치하면 위험해요!\n🩻 영상의학실은 오진을 막고, ☕ 휴게실은 피로 회복, 🥤 자판기는 인내심 UP\n1/2/3 속도 · Space 일시정지 · 목표를 달성해 병원 등급을 올리세요 (5단계 → 승리)',
  init(g) {
    newGame();
    const sv = g.load('hosp', null);
    if (sv && sv.v === 1) { try { loadGame(sv); } catch (e) { newGame(); } }
    S.g = g;
  },
  update(g, dt) {
    S.g = g;
    if (g.keyp('Digit1')) { S.speed = 1; S.paused = false; }
    if (g.keyp('Digit2')) { S.speed = 2; S.paused = false; }
    if (g.keyp('Digit3')) { S.speed = 3; S.paused = false; }
    if (g.keyp('Space')) S.paused = !S.paused;
    if (g.mouse.rclick) S.sel = -1;
    if (g.mouse.clicked && !uiClick(g)) mapClick(g);
    if (!S.paused) { let t = dt * S.speed; while (t > 0.0001) { const s = Math.min(0.05, t); sim(g, s); t -= s; if (g.ended) return; } }
    for (const t of S.toasts) t.t -= dt;
    S.toasts = S.toasts.filter((t) => t.t > 0);
    g.score = S.cured * 100 + S.lvl * 1000;
    g.info = `${LEVELS[S.lvl].n} · ${S.day}일차 · 💰${Math.floor(S.money).toLocaleString()} · 완치 ${S.cured}`;
  },
  draw(g, c) {
    S.ui = [];
    drawHosp(g, c);
    drawTop(g);
    drawPanel(g);
  },
});

function newGame() {
  S = { money: 3000, day: 1, dayT: 0, speed: 1, paused: false, ui: [], toasts: [], sel: -1, tab: 0, slots: Array(10).fill(null), staff: [], pats: [], cands: [], rep: 50, lvl: 0, cured: 0, died: 0, angry: 0, feeMul: 1,
    todayIn: 0, todayOut: 0, hist: [], lastProfit: 0, spawnT: 3, debt: 0, confirm: 0, ghosts: [], sid: 1 };
  genCands();
}
function saveGame() {
  const g = S.g; if (!g) return;
  g.save('hosp', { v: 1, money: S.money, day: S.day, rep: S.rep, lvl: S.lvl, cured: S.cured, died: S.died, angry: S.angry, feeMul: S.feeMul, hist: S.hist, debt: S.debt,
    slots: S.slots.map((r) => (r ? { k: r.k, eq: r.eq, n: r.n } : null)), staff: S.staff.map((s) => ({ t: s.t, n: s.n, sk: s.sk, e: s.e, sal: s.sal, room: s.room ? S.slots.indexOf(s.room) : -1 })) });
}
function loadGame(sv) {
  Object.assign(S, { money: sv.money, day: sv.day, rep: sv.rep, lvl: sv.lvl, cured: sv.cured, died: sv.died || 0, angry: sv.angry || 0, feeMul: sv.feeMul || 1, hist: sv.hist || [], debt: sv.debt || 0 });
  S.slots = sv.slots.map((o, i) => (o ? mkRoom(o.k, i, o.eq, o.n) : null));
  for (const o of sv.staff) { const s = mkStaff(o.t, o.sk, o.n, o.e, o.sal); S.staff.push(s); if (o.room >= 0 && S.slots[o.room]) { S.slots[o.room].staff = s; s.room = S.slots[o.room]; } }
}
function mkRoom(k, i, eq, n) { return { k, i, d: ROOMS[k], eq: eq || 0, n: n || 0, q: [], cur: null, t: 0, staff: null }; }
function mkStaff(t, sk, n, e, sal) { return { id: S.sid++, t, sk, n, e, sal, room: null, en: 100 }; }
function genCands() {
  S.cands = [];
  for (let i = 0; i < 4; i++) {
    const t = i < 2 ? 'doc' : 'nurse', sk = Math.min(5, 1 + (Math.random() < 0.5 ? 0 : Math.random() < 0.6 ? 1 : Math.random() < 0.6 ? 2 : 3));
    S.cands.push({ t, sk, n: U.choice(NAMES), e: U.choice(STYPE[t].e), sal: Math.round(STYPE[t].base * (0.7 + sk * 0.35)) });
  }
}
function roomPos(i) { const col = i % 5, row = (i / 5) | 0; return { x: RX0 + col * 123, y: row ? BOTY : TOPY, row }; }
function door(i) { const p = roomPos(i); return [p.x + RW / 2, p.row ? BOTY : TOPY + RH]; }
function qPos(i, k) { const [x] = door(i), p = roomPos(i); return [x - 44 + (k % 6) * 17, p.row ? 326 - Math.floor(k / 6) * 10 : 262 + Math.floor(k / 6) * 10]; }
function toast(s, col) { S.toasts.push({ s, col: col || '#fff', t: 4.5 }); if (S.toasts.length > 5) S.toasts.shift(); }
function has(k) { return S.slots.some((r) => r && r.k === k); }
function spend(c) {
  if (S.money < c) { toast('💰 돈이 부족해요', '#fca5a5'); S.g.sfx.hit(); return false; }
  S.money -= c; S.todayOut += c; return true;
}
function goTo(p, x, y) {
  const pts = [];
  if (Math.abs(p.y - CY) > 4 && p.x > 100) pts.push([p.x, CY]);
  if (p.x <= 100 && Math.abs(x - p.x) > 4) pts.push([p.x, CY]);
  pts.push([x, CY], [x, y]);
  p.path = pts;
}

/* ---------- 시뮬 ---------- */
function sim(g, dt) {
  S.dayT += dt;
  if (S.dayT >= DAYLEN) { endDay(g); if (g.ended) return; }
  S.spawnT -= dt;
  if (S.spawnT <= 0) { S.spawnT = spawnIv(); spawn(g); }
  autoAssign();
  const sr = has('staffr');
  for (const s of S.staff) {
    const busy = s.room && s.room.cur && s.room.t > 0;
    s.en = U.clamp(s.en + (busy ? -0.9 * (sr ? 0.55 : 1) : 0.7 * (sr ? 2.2 : 1)) * dt, 0, 100);
  }
  for (const r of S.slots) if (r) roomTick(g, r, dt);
  for (let i = S.pats.length - 1; i >= 0; i--) if (patTick(g, S.pats[i], dt)) S.pats.splice(i, 1);
  for (const gh of S.ghosts) { gh.t -= dt; gh.y -= 30 * dt; }
  S.ghosts = S.ghosts.filter((x) => x.t > 0);
  checkLevel(g);
}
function spawnIv() {
  let iv = 7 - S.rep / 22 - S.lvl * 0.5;
  if (S.feeMul > 1) iv *= 1 + (S.feeMul - 1) * 1.6; else iv *= 0.6 + S.feeMul * 0.4;
  if (S.dayT / DAYLEN > 0.85) iv *= 2;
  return Math.max(1.1, iv) * U.rand(0.7, 1.3);
}
function spawn(g) {
  if (S.pats.length >= 36) return;
  const pool = DIS.filter((d) => d.lv <= S.lvl + 1);
  const d = U.choice(pool), emer = S.lvl >= 1 && Math.random() < 0.06 + S.lvl * 0.02;
  const p = { e: U.choice(PE), d, x: 50, y: 610, path: [[50, 228]], st: 'enter', need: 'recep', diag: false, hp: 100, pat: 100, room: null, t: 0, emer, fl: false, th: null };
  if (emer) { p.hp = 60; toast(`🚑 응급 환자 도착! (${d.n}) 우선 처리됩니다`, '#fca5a5'); g.sfx.tone(880, 0.25, 'square', 0.04); g.sfx.tone(660, 0.25, 'square', 0.04, null, 0.25); }
  S.pats.push(p);
}
function autoAssign() {
  for (const r of S.slots) {
    if (!r || !r.d.staff || r.staff) continue;
    const s = S.staff.filter((x) => !x.room && x.t === r.d.staff && (!r.d.min || x.sk >= r.d.min)).sort((a, b) => b.sk - a.sk)[0];
    if (s) { r.staff = s; s.room = r; }
  }
}
function roomWorks(r) { return r.d.staff ? !!r.staff : false; }
function findRoom(k) {
  let best = null, bq = 1e9;
  for (const r of S.slots) if (r && r.k === k && roomWorks(r)) { const q = r.q.length + (r.cur ? 1 : 0); if (q < bq) { bq = q; best = r; } }
  return best;
}
function roomTick(g, r, dt) {
  if (!r.d.staff) return;
  if (!r.staff) { if (r.cur) { r.cur.st = 'route'; r.cur = null; } return; }
  if (!r.cur && r.q.length) {
    let idx = r.q.findIndex((p) => p.emer); if (idx < 0) idx = 0;
    const p = r.q.splice(idx, 1)[0];
    r.cur = p; p.st = 'in';
    const pp = roomPos(r.i); p.path = [door(r.i), [pp.x + RW / 2 - 14, pp.y + RH / 2 + 12]];
    const base = r.k === 'gp' ? 5 : r.k === 'xray' ? 4 : p.d.t;
    r.t = base * (1.25 - r.staff.sk * 0.09 - r.eq * 0.1) * (r.staff.en < 25 ? 1.6 : 1);
    r.q.forEach((q, k) => { q.path = [qPos(r.i, k)]; });
  }
  if (r.cur && r.cur.path.length === 0) {
    r.t -= dt;
    if (r.t <= 0) finishTreat(g, r, r.cur);
  }
}
function finishTreat(g, r, p) {
  r.cur = null; r.n++;
  const [dx, dy] = door(r.i);
  p.path = [[dx, dy]];
  if (r.k === 'gp' || r.k === 'xray') {
    const acc = r.k === 'xray' ? 1 : 0.55 + r.staff.sk * 0.08 + r.eq * 0.05;
    if (Math.random() < acc) { p.diag = true; p.need = p.d.room; p.th = p.d.e; }
    else { p.need = has('xray') ? 'xray' : 'gp'; p.th = '❓'; p.pat = Math.max(10, p.pat - 15); }
    p.st = 'route';
    return;
  }
  const sk = r.staff.sk, ok = Math.random() < Math.min(0.99, 0.82 + sk * 0.035 + r.eq * 0.03 + (p.hp > 50 ? 0.03 : -0.1));
  const [x, y] = door(r.i);
  if (ok) {
    const fee = Math.round(p.d.fee * S.feeMul * (p.emer ? 1.6 : 1));
    S.money += fee; S.todayIn += fee; S.cured++;
    S.rep = Math.min(100, S.rep + (S.feeMul > 1.4 ? 0.4 : S.feeMul > 1.15 ? 0.8 : 1.3) * (p.emer ? 2 : 1));
    g.float(x, y - 10, '+' + fee, '#86efac', 15); g.sfx.coin(); g.burst(x, y, ['#86efac', '#fff'], 10, 120);
    p.th = '😊'; p.st = 'leave'; p.happy = true;
  } else if (p.d.risky && Math.random() < 0.5) {
    die(g, p, x, y); p.gone = true;
  } else {
    S.rep = Math.max(0, S.rep - 2); p.th = '😠'; p.st = 'leave';
    g.float(x, y - 10, '치료 실패', '#fca5a5', 14);
  }
}
function die(g, p, x, y) {
  S.died++; S.rep = Math.max(0, S.rep - 6);
  S.ghosts.push({ x, y, t: 3 });
  toast(`💀 ${p.d.n} 환자가 사망했어요… 평판 크게 하락`, '#f87171'); g.sfx.lose(); g.shake(5);
}
function walk(p, dt, sp) {
  if (!p.path.length) return true;
  const [tx, ty] = p.path[0], dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy), st = sp * dt;
  if (Math.abs(dx) > 1) p.fl = dx > 0;
  if (d <= st) { p.x = tx; p.y = ty; p.path.shift(); return !p.path.length; }
  p.x += (dx / d) * st; p.y += (dy / d) * st;
  return false;
}
function patTick(g, p, dt) {
  if (p.gone) return true;
  const waiting = p.st === 'queue' || p.st === 'wait' || p.st === 'recep';
  p.hp -= p.d.sev * (p.emer ? 2.2 : 1) * 0.55 * dt * (p.st === 'in' ? 0.3 : 1);
  if (waiting) p.pat -= (p.st === 'wait' ? 1.7 : 0.9) * (has('vend') ? 0.65 : 1) * dt;
  if (has('vend') && waiting && Math.random() < dt * 0.02) { S.money += 5; S.todayIn += 5; }
  if (p.hp <= 0 && p.st !== 'leave') { die(g, p, p.x, p.y); removeFromRooms(p); return true; }
  if (p.pat <= 0 && p.st !== 'leave' && p.st !== 'in') {
    removeFromRooms(p); p.st = 'leave'; p.th = '😡'; S.angry++; S.rep = Math.max(0, S.rep - 2.5);
    p.path = []; goExit(p);
  }
  const done = walk(p, dt, p.st === 'leave' ? 80 : 70);
  switch (p.st) {
    case 'enter': if (done) { p.st = 'recep'; p.t = 1.2; } break;
    case 'recep': p.t -= dt; if (p.t <= 0) { p.need = 'gp'; p.th = '❓'; p.st = 'route'; } break;
    case 'route': {
      if (!done) break;
      const r = findRoom(p.need);
      if (r) { p.room = r; r.q.push(p); p.st = 'walkq'; const [qx, qy] = qPos(r.i, r.q.length - 1); goTo(p, qx, qy); }
      else { p.st = 'wait'; p.t = 1; const k = S.pats.indexOf(p) % 12; p.path = [[50, CY], [18 + (k % 4) * 22, 380 + Math.floor(k / 4) * 44]]; }
      break;
    }
    case 'walkq': if (done) p.st = 'queue'; if (!S.slots.includes(p.room) || !roomWorks(p.room)) { removeFromRooms(p); p.st = 'route'; p.path = []; } break;
    case 'queue': if (!S.slots.includes(p.room) || !roomWorks(p.room)) { removeFromRooms(p); p.st = 'route'; p.path = []; } break;
    case 'wait': p.t -= dt; if (p.t <= 0 && done) { p.t = 1; if (findRoom(p.need)) { p.st = 'route'; p.path = []; } else p.th = ROOMS[p.need].e; } break;
    case 'in': break;
    case 'leave': if (done) { if (p.y > 590) return true; goExit(p); } break;
  }
  return false;
}
function goExit(p) { p.path = p.x > 100 ? [[p.x, CY], [50, CY], [50, 615]] : [[50, p.y], [50, 615]]; }
function removeFromRooms(p) { for (const r of S.slots) if (r) { const i = r.q.indexOf(p); if (i >= 0) r.q.splice(i, 1); if (r.cur === p) r.cur = null; } }
function checkLevel(g) {
  const L = LEVELS[S.lvl];
  if (S.cured >= L.cure && S.rep >= L.rep && S.money >= L.money) {
    if (S.lvl === LEVELS.length - 1) { g.score = S.cured * 100 + 10000; g.save('hosp', null); g.win(`${L.n} 달성! 완치 ${S.cured}명 · ${S.day}일`); return; }
    S.lvl++; const bonus = 1000 * S.lvl; S.money += bonus;
    toast(`🏆 병원 승급! "${LEVELS[S.lvl].n}" (+${bonus}) 새 진료과·질병 등장`, '#fde047'); g.sfx.win(); g.burst(360, 300, ['#fde047', '#93c5fd', '#86efac'], 50, 320);
    saveGame();
  }
}
function endDay(g) {
  S.dayT = 0;
  let sal = 0; for (const s of S.staff) sal += s.sal;
  let up = 0; for (const r of S.slots) if (r) up += 20 + r.eq * 10;
  S.money -= sal + up; S.todayOut += sal + up;
  const profit = Math.round(S.todayIn - S.todayOut);
  S.lastProfit = profit; S.hist.push(profit); if (S.hist.length > 10) S.hist.shift();
  toast(`📅 ${S.day}일차 결산: 수입 ${Math.round(S.todayIn)} · 지출 ${Math.round(S.todayOut)} → ${profit >= 0 ? '+' : ''}${profit}`, profit >= 0 ? '#86efac' : '#fca5a5');
  S.todayIn = 0; S.todayOut = 0;
  genCands();
  if (S.money < 0) {
    S.debt++; toast(`⚠️ 적자 ${S.debt}/3일 — 계속되면 파산!`, '#f87171'); g.sfx.lose();
    if (S.debt >= 3) { g.save('hosp', null); g.over(`병원이 파산했습니다… 완치 ${S.cured}명`); return; }
  } else S.debt = 0;
  S.day++;
  saveGame();
}

/* ---------- 입력 ---------- */
function uiClick(g) {
  for (let i = S.ui.length - 1; i >= 0; i--) { const b = S.ui[i]; if (g.inRect(b.x, b.y, b.w, b.h)) { b.fn(); g.sfx.click(); return true; } }
  return g.mouse.x >= PX || g.mouse.y < 52;
}
function mapClick(g) {
  for (let i = 0; i < 10; i++) { const p = roomPos(i); if (g.inRect(p.x, p.y, RW, RH)) { S.sel = i; S.tab = 0; return; } }
  S.sel = -1;
}

/* ---------- 그리기 ---------- */
function B(g, x, y, w, h, label, col, fn, o) {
  o = o || {};
  const hov = !o.dis && g.inRect(x, y, w, h);
  g.rrect(x, y, w, h, 7, o.dis ? '#1a2130' : o.on ? '#1d4ed8' : hov ? '#334866' : col || '#1e2b40', o.on ? '#93c5fd' : 'rgba(255,255,255,.15)', 1.5);
  if (label) g.text(label, x + w / 2, y + h / 2 + 1, o.size || 13, o.dis ? '#5b6472' : '#fff');
  if (!o.dis && fn) S.ui.push({ x, y, w, h, fn });
}
function drawHosp(g, c) {
  g.rect(0, 52, PX, 548, '#d9dee6');
  // 복도
  g.rect(100, 248, PX - 100, 92, '#eef2f7');
  for (let x = 110; x < PX; x += 40) g.rect(x, CY - 1, 20, 2, '#cbd5e1');
  // 로비
  g.rect(0, 52, 100, 548, '#e7e2d6');
  g.rrect(14, 196, 72, 28, 6, '#92400e'); g.emoji('💁', 50, 184, 26); g.text('접수', 50, 210, 11, '#fff');
  g.text('대기실', 50, 360, 11, '#64748b');
  for (let k = 0; k < 12; k++) g.rrect(8 + (k % 4) * 22, 390 + Math.floor(k / 4) * 44, 18, 8, 3, '#94a3b8');
  g.rect(20, 588, 60, 12, '#65a30d'); g.text('🚪 입구', 50, 576, 11, '#334155');
  g.emoji('🏥', 50, 90, 40); g.text(LEVELS[S.lvl].n, 50, 128, 10, '#1e293b');
  // 방
  for (let i = 0; i < 10; i++) {
    const p = roomPos(i), r = S.slots[i], sel = S.sel === i;
    if (!r) {
      g.rrect(p.x, p.y, RW, RH, 6, '#c7ced8', sel ? '#f59e0b' : '#94a3b8', sel ? 3 : 1.5);
      c.setLineDash([5, 5]); g.rrect(p.x + 8, p.y + 8, RW - 16, RH - 16, 6, null, '#94a3b8', 1.5); c.setLineDash([]);
      g.text('＋ 빈 방', p.x + RW / 2, p.y + RH / 2, 14, '#64748b');
      continue;
    }
    g.rrect(p.x, p.y, RW, RH, 6, '#f8fafc', sel ? '#f59e0b' : r.d.col, sel ? 4 : 3);
    g.rect(p.x + 3, p.y + 3, RW - 6, 24, r.d.col);
    g.text(r.d.e + ' ' + r.d.n, p.x + RW / 2, p.y + 15, 12, '#fff');
    const [dx, dy] = door(i); g.rect(dx - 14, dy - 3, 28, 6, '#a16207');
    if (r.k === 'staffr') { g.emoji('🛋️', p.x + 40, p.y + 90, 34); g.emoji('☕', p.x + 85, p.y + 70, 22); g.emoji('🪴', p.x + 90, p.y + 140, 26); continue; }
    if (r.k === 'vend') { g.emoji('🥤', p.x + 35, p.y + 80, 34); g.emoji('🍫', p.x + 80, p.y + 80, 30); g.emoji('🪴', p.x + 60, p.y + 145, 26); continue; }
    g.rrect(p.x + RW / 2 - 34, p.y + RH / 2, 46, 26, 6, '#bfdbfe', '#60a5fa', 1.5);
    g.emoji(r.d.e, p.x + 22, p.y + 46, 22);
    if (r.eq) g.text('장비 Lv' + r.eq, p.x + RW - 8, p.y + 40, 9, '#475569', 'right');
    if (r.staff) {
      const s = r.staff;
      g.emoji(s.e, p.x + RW / 2 + 30, p.y + RH / 2 - 10 + (r.cur ? Math.sin(g.time * 6) * 2 : 0), 28);
      g.text('★'.repeat(s.sk), p.x + RW / 2 + 30, p.y + RH / 2 - 32, 9, '#d97706');
      g.rect(p.x + 10, p.y + RH - 14, RW - 20, 5, '#e2e8f0'); g.rect(p.x + 10, p.y + RH - 14, (RW - 20) * s.en / 100, 5, s.en > 40 ? '#22c55e' : '#ef4444');
      if (s.en < 25) g.emoji('😫', p.x + RW / 2 + 48, p.y + RH / 2 - 26, 14);
    } else if (r.d.staff) { g.text(`⚠️ ${STYPE[r.d.staff].n} 필요`, p.x + RW / 2, p.y + RH - 24, 11, '#dc2626'); }
    if (r.cur && !r.cur.path.length && r.t > 0) { g.rrect(p.x + 10, p.y + 34, RW - 20, 6, 3, '#e2e8f0'); }
    if (r.q.length > 3) g.text('대기 ' + r.q.length, p.x + RW - 8, p.y + 58, 10, '#b91c1c', 'right');
  }
  for (const p of S.pats) {
    const bob = p.path.length ? Math.abs(Math.sin(g.time * 9 + p.x)) * 2 : 0;
    if (p.emer) g.circle(p.x, p.y - 6, 13, `rgba(239,68,68,${0.25 + Math.sin(g.time * 8) * 0.15})`);
    g.emoji(p.e, p.x, p.y - 6 - bob, 20);
    if (p.th) { g.circle(p.x + 12, p.y - 24, 9, 'rgba(255,255,255,.95)'); g.emoji(p.th, p.x + 12, p.y - 24, 12); }
    if (p.st !== 'leave' && p.st !== 'enter') {
      g.rect(p.x - 10, p.y + 7, 20, 3, '#475569'); g.rect(p.x - 10, p.y + 7, 20 * p.hp / 100, 3, p.hp > 50 ? '#22c55e' : '#ef4444');
      if (p.st === 'queue' || p.st === 'wait') { g.rect(p.x - 10, p.y + 11, 20, 2, '#475569'); g.rect(p.x - 10, p.y + 11, 20 * Math.max(0, p.pat) / 100, 2, '#facc15'); }
    }
  }
  for (const r of S.slots) if (r && r.cur && !r.cur.path.length && r.t > 0) { const p = roomPos(r.i); const base = r.k === 'gp' ? 5 : r.k === 'xray' ? 4 : r.cur.d.t; g.rect(p.x + 10, p.y + 34, (RW - 20) * U.clamp(1 - r.t / (base * 1.3), 0, 1), 6, '#3b82f6'); }
  for (const gh of S.ghosts) { c.globalAlpha = gh.t / 3; g.emoji('👻', gh.x, gh.y, 30); c.globalAlpha = 1; }
  // 하단 상태
  g.rect(100, 534, PX - 100, 66, '#1e293b');
  const waitBy = {};
  for (const p of S.pats) if (p.st === 'wait') waitBy[p.need] = (waitBy[p.need] || 0) + 1;
  const ks = Object.keys(waitBy);
  g.text(ks.length ? '🚨 치료실 없음/직원 없음 대기:' : '✅ 모든 환자가 진료 흐름에 있어요', 112, 552, 12, ks.length ? '#fca5a5' : '#86efac', 'left');
  ks.forEach((k, i) => g.text(`${ROOMS[k].e}${ROOMS[k].n}×${waitBy[k]}`, 112 + i * 110, 576, 12, '#fde68a', 'left'));
  g.text(`완치 ${S.cured} · 사망 ${S.died} · 불만 퇴원 ${S.angry}`, PX - 10, 552, 11, '#cbd5e1', 'right');
  const t = S.dayT / DAYLEN; if (t > 0.85) { c.fillStyle = `rgba(10,15,50,${(t - 0.85) / 0.15 * 0.3})`; c.fillRect(0, 52, PX, 548); }
  let ty = 266;
  for (const o of S.toasts) { c.globalAlpha = Math.min(1, o.t); c.font = 'bold 13px sans-serif'; const w = c.measureText(o.s).width + 20; g.rrect(PX / 2 - w / 2 + 50, ty - 11, w, 22, 6, 'rgba(15,23,42,.85)'); g.text(o.s, PX / 2 + 50, ty, 13, o.col); ty += 25; }
  c.globalAlpha = 1;
  if (S.paused) { g.rrect(PX / 2 - 20, 62, 140, 30, 8, 'rgba(0,0,0,.6)'); g.text('⏸ 일시정지', PX / 2 + 50, 77, 16, '#fde047'); }
}
function drawTop(g) {
  g.rect(0, 0, 960, 52, '#0f1a2e'); g.rect(0, 51, 960, 1, '#25406a');
  g.text('💰 ' + Math.floor(S.money).toLocaleString(), 14, 17, 18, S.money < 0 ? '#f87171' : '#fde047', 'left');
  g.text(`🏥 ${LEVELS[S.lvl].n} (${S.lvl + 1}/5)`, 14, 38, 12, '#93c5fd', 'left');
  g.text('평판', 190, 17, 12, '#e2e8f0', 'left');
  g.rrect(222, 10, 90, 13, 5, '#1e293b'); g.rrect(222, 10, 90 * S.rep / 100, 13, 5, S.rep > 65 ? '#22c55e' : S.rep > 40 ? '#eab308' : '#ef4444'); g.text(Math.round(S.rep), 267, 17, 10, '#fff');
  g.text(`📅 ${S.day}일차`, 190, 38, 12, '#e2e8f0', 'left'); g.rrect(250, 33, 62, 9, 4, '#1e293b'); g.rrect(250, 33, 62 * S.dayT / DAYLEN, 9, 4, '#60a5fa');
  const L = LEVELS[S.lvl];
  g.text('🎯 승급 조건', 330, 17, 12, '#fcd34d', 'left');
  const ok = (v) => (v ? '#86efac' : '#fff');
  g.text(`완치 ${S.cured}/${L.cure}`, 330, 38, 12, ok(S.cured >= L.cure), 'left');
  g.text(`평판 ${Math.round(S.rep)}/${L.rep}`, 430, 38, 12, ok(S.rep >= L.rep), 'left');
  g.text(L.money ? `자금 ${L.money}+` : '', 530, 38, 12, ok(S.money >= L.money), 'left');
  B(g, 790, 12, 34, 28, '⏸', '#1e2b40', () => (S.paused = !S.paused), { on: S.paused });
  [1, 2, 3].forEach((s, k) => B(g, 828 + k * 44, 12, 40, 28, '▶'.repeat(s), '#1e2b40', () => { S.speed = s; S.paused = false; }, { on: !S.paused && S.speed === s, size: 10 }));
}
function drawPanel(g) {
  g.rect(PX, 52, 240, 548, '#0d1626');
  ['🏗️ 방', '👨‍⚕️ 직원', '📋 운영'].forEach((s, i) => B(g, PX + 4 + i * 78, 58, 74, 28, s, '#1e2b40', () => (S.tab = i), { on: S.tab === i, size: 12 }));
  const x = PX + 8;
  if (S.tab === 0) {
    if (S.sel < 0) { g.text('왼쪽의 방을 클릭하세요', x, 110, 13, '#cbd5e1', 'left'); g.text('빈 방 → 진료실 건설', x, 134, 12, '#94a3b8', 'left'); g.text('지어진 방 → 정보·장비 업그레이드', x, 154, 12, '#94a3b8', 'left'); return; }
    const r = S.slots[S.sel];
    if (!r) {
      g.text('🏗️ 건설할 방 선택', x, 104, 14, '#fff', 'left');
      RK.forEach((k, i) => {
        const R = ROOMS[k], y = 118 + i * 46, lock = R.lv > S.lvl + 1;
        B(g, x, y, 224, 42, '', '#16233a', () => { if (spend(R.cost)) { S.slots[S.sel] = mkRoom(k, S.sel); S.g.sfx.drop(); const p = roomPos(S.sel); S.g.burst(p.x + RW / 2, p.y + RH / 2, ['#fde047', '#fff'], 18, 180); } }, { dis: lock });
        g.emoji(lock ? '🔒' : R.e, x + 18, y + 21, 20);
        g.text(R.n, x + 36, y + 13, 13, lock ? '#64748b' : '#fff', 'left');
        g.text(lock ? `병원 ${R.lv}단계 필요` : R.d, x + 36, y + 30, 9, '#94a3b8', 'left');
        g.text(R.cost, x + 218, y + 21, 12, S.money >= R.cost ? '#fde047' : '#f87171', 'right');
      });
      return;
    }
    g.text(`${r.d.e} ${r.d.n}`, x, 104, 15, '#fff', 'left');
    g.text(r.d.d, x, 124, 11, '#94a3b8', 'left');
    g.text(`처리 ${r.n}명 · 대기 ${r.q.length}명`, x, 144, 12, '#cbd5e1', 'left');
    let y = 164;
    if (r.d.staff) {
      if (r.staff) {
        const s = r.staff;
        g.rrect(x, y, 224, 52, 8, '#16233a'); g.emoji(s.e, x + 22, y + 26, 26);
        g.text(`${s.n} (${STYPE[s.t].n})`, x + 42, y + 16, 12, '#fff', 'left'); g.text('★'.repeat(s.sk) + '☆'.repeat(5 - s.sk) + ` · 피로 ${Math.round(100 - s.en)}%`, x + 42, y + 34, 11, '#fbbf24', 'left');
        y += 58;
        B(g, x, y, 224, 26, '배치 해제 (대기 직원으로)', '#334155', () => { s.room = null; r.staff = null; }, { size: 11 });
        y += 32;
      } else {
        g.text(`⚠️ ${STYPE[r.d.staff].n}${r.d.min ? ` (★${r.d.min}+)` : ''} 고용 필요 → 직원 탭`, x, y + 8, 11, '#fca5a5', 'left'); y += 24;
        const free = S.staff.filter((s) => !s.room && s.t === r.d.staff && (!r.d.min || s.sk >= r.d.min));
        free.slice(0, 4).forEach((s) => { B(g, x, y, 224, 26, `${s.e} ${s.n} ${'★'.repeat(s.sk)} 배치`, '#1e3a5f', () => { r.staff = s; s.room = r; }, { size: 11 }); y += 30; });
      }
      const ec = 600 * (r.eq + 1);
      B(g, x, y, 224, 30, r.eq >= 3 ? '장비 최고 등급' : `🔧 장비 업그레이드 Lv${r.eq + 1} (${ec})`, '#14532d', () => { if (spend(ec)) { r.eq++; S.g.sfx.power(); } }, { dis: r.eq >= 3, size: 12 });
      g.text('장비: 속도↑ · 성공률/진단 정확도↑', x, y + 42, 10, '#94a3b8', 'left');
      y += 56;
    }
    B(g, x, Math.max(y, 380), 224, 28, `철거 (+${Math.floor(r.d.cost / 2)})`, '#7f1d1d', () => {
      for (const p of r.q.concat(r.cur ? [r.cur] : [])) { p.st = 'route'; p.path = []; p.room = null; }
      if (r.staff) r.staff.room = null;
      S.money += Math.floor(r.d.cost / 2); S.slots[S.sel] = null; S.g.sfx.explode();
    }, { size: 12 });
  } else if (S.tab === 1) {
    g.text('📝 지원자 (매일 갱신)', x, 102, 13, '#fff', 'left');
    S.cands.forEach((cd, i) => {
      const y = 114 + i * 48;
      g.rrect(x, y, 224, 44, 8, '#16233a'); g.emoji(cd.e, x + 20, y + 22, 24);
      g.text(`${cd.n} ${STYPE[cd.t].n}`, x + 40, y + 14, 12, '#fff', 'left'); g.text('★'.repeat(cd.sk) + ` · 급여 ${cd.sal}/일`, x + 40, y + 31, 10, '#fbbf24', 'left');
      B(g, x + 170, y + 9, 50, 26, '고용', '#1d4ed8', () => { if (S.staff.length >= 14) return toast('직원은 최대 14명', '#fca5a5'); S.staff.push(mkStaff(cd.t, cd.sk, cd.n, cd.e, cd.sal)); S.cands.splice(i, 1); S.g.sfx.coin(); toast(`👋 ${cd.n} ${STYPE[cd.t].n} 입사!`, '#93c5fd'); }, { size: 12 });
    });
    let y = 114 + S.cands.length * 48 + 4;
    B(g, x, y, 224, 24, '🔄 지원자 새로 받기 (80)', '#334155', () => { if (spend(80)) genCands(); }, { size: 11 });
    y += 34; g.text(`👥 직원 ${S.staff.length}명`, x, y, 13, '#fff', 'left'); y += 10;
    S.staff.forEach((s) => {
      if (y > 560) return;
      const tc = 250 * s.sk;
      g.emoji(s.e, x + 10, y + 13, 16);
      g.text(`${s.n} ${'★'.repeat(s.sk)}`, x + 22, y + 8, 11, '#fff', 'left'); g.text(s.room ? s.room.d.e + s.room.d.n : '대기 중', x + 22, y + 21, 9, s.room ? '#93c5fd' : '#fca5a5', 'left');
      B(g, x + 120, y + 2, 58, 22, s.sk >= 5 ? 'MAX' : `교육 ${tc}`, '#14532d', () => { if (spend(tc)) { s.sk++; s.sal = Math.round(s.sal * 1.2); S.g.sfx.power(); } }, { dis: s.sk >= 5, size: 10 });
      B(g, x + 182, y + 2, 42, 22, '해고', '#7f1d1d', () => { if (s.room) s.room.staff = null; S.staff.splice(S.staff.indexOf(s), 1); }, { size: 10 });
      y += 27;
    });
  } else {
    let y = 104;
    g.text('💵 진료비 배율', x, y, 13, '#fff', 'left');
    B(g, PX + 120, y - 12, 28, 24, '−', '#334155', () => (S.feeMul = Math.max(0.5, Math.round((S.feeMul - 0.1) * 10) / 10)));
    g.text(Math.round(S.feeMul * 100) + '%', PX + 172, y, 14, '#fde047');
    B(g, PX + 196, y - 12, 28, 24, '+', '#334155', () => (S.feeMul = Math.min(2, Math.round((S.feeMul + 0.1) * 10) / 10)));
    y += 18; g.text('비싸면 환자↓ 평판 상승↓, 싸면 환자↑', x, y, 10, '#94a3b8', 'left');
    y += 26; g.text('🦠 질병 목록 (치료실)', x, y, 13, '#fff', 'left'); y += 6;
    DIS.forEach((d) => {
      y += 19; const lock = d.lv > S.lvl + 1, R = ROOMS[d.room];
      g.text(`${lock ? '🔒' : d.e} ${d.n}`, x, y, 11, lock ? '#475569' : '#e2e8f0', 'left');
      g.text(`${R.e}${R.n}`, x + 90, y, 10, lock ? '#475569' : has(d.room) ? '#86efac' : '#fca5a5', 'left');
      g.text(d.fee, x + 222, y, 10, '#fde047', 'right');
    });
    y += 26; g.text('📊 일일 순이익', x, y, 12, '#fff', 'left'); y += 6;
    const mx = Math.max(100, ...S.hist.map((v) => Math.abs(v)));
    g.rect(x, y + 24, 220, 1, '#475569');
    S.hist.forEach((v, i) => { const hh = (Math.abs(v) / mx) * 22; g.rect(x + 2 + i * 22, v >= 0 ? y + 24 - hh : y + 24, 18, hh, v >= 0 ? '#22c55e' : '#ef4444'); });
    B(g, x, 566, 224, 26, S.confirm > 0 ? '정말? 한 번 더 클릭' : '🗑️ 새 병원 시작 (저장 삭제)', '#3f1d1d', () => {
      if (S.confirm > 0) { const g2 = S.g; g2.save('hosp', null); newGame(); S.g = g2; toast('🏥 새 병원을 시작합니다'); } else { S.confirm = 1; S.g.later(() => { if (S) S.confirm = 0; }, 3); }
    }, { size: 12 });
  }
}
