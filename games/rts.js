let S;
const MH = 560;
const UT = {
  worker: { n: '일꾼', e: '👷', hp: 45, dmg: 4, rate: 1, range: 6, spd: 62, r: 10, sight: 90, cost: { g: 50, w: 0 }, t: 9, pop: 1, from: 'hall' },
  soldier: { n: '검사', e: '🤺', hp: 100, dmg: 11, rate: 1, range: 6, spd: 56, r: 11, sight: 130, cost: { g: 60, w: 25 }, t: 11, pop: 1, from: 'barracks', arm: 1 },
  archer: { n: '궁수', e: '🧝', hp: 60, dmg: 9, rate: 1.2, range: 115, spd: 56, r: 10, sight: 150, cost: { g: 50, w: 45 }, t: 13, pop: 1, from: 'barracks', proj: '#fde047' },
  knight: { n: '기사', e: '🏇', hp: 180, dmg: 17, rate: 1.1, range: 8, spd: 88, r: 13, sight: 140, cost: { g: 120, w: 60 }, t: 18, pop: 2, from: 'barracks', arm: 2 },
  catapult: { n: '투석기', e: '💣', hp: 90, dmg: 45, rate: 3, range: 170, spd: 34, r: 13, sight: 180, cost: { g: 150, w: 120 }, t: 24, pop: 2, from: 'workshop', proj: '#78716c', splash: 40, siege: 1 },
};
const BT = {
  hall: { n: '본진', e: '🏰', hp: 1600, r: 34, cost: { g: 350, w: 150 }, t: 45, sup: 6 },
  house: { n: '집', e: '🏠', hp: 320, r: 20, cost: { g: 0, w: 70 }, t: 14, sup: 6 },
  barracks: { n: '병영', e: '🏟️', hp: 750, r: 28, cost: { g: 150, w: 100 }, t: 24 },
  tower: { n: '방어탑', e: '🗼', hp: 550, r: 18, cost: { g: 100, w: 90 }, t: 20, dmg: 13, range: 150, rate: 1.1, arm: 2 },
  workshop: { n: '공방', e: '🏭', hp: 650, r: 28, cost: { g: 150, w: 150 }, t: 28, req: 'barracks' },
};
const UPG = { atk: { n: '무기 강화', e: '⚔️', cost: (l) => ({ g: 100 + l * 75, w: 80 + l * 60 }), t: 25 }, def: { n: '갑옷 강화', e: '🛡️', cost: (l) => ({ g: 100 + l * 75, w: 80 + l * 60 }), t: 25 } };
const COL = ['#3b82f6', '#ef4444'];
GAME({
  title: '미니 RTS', w: 1000, h: 640, bg: '#3f6212', controls: 'none',
  help: '클릭: 선택 · 드래그: 범위 선택 · 선택 후 땅/적/자원 클릭(또는 우클릭): 명령\n👷 일꾼을 💰금광/🌲나무에 보내 자원 채집 → 본진에 자동 운반\n아래 패널에서 건물 짓기·유닛 훈련 (1~6 단축키) · 건물 선택 후 땅 클릭: 집결지\nQ 전체 군대 선택 · E 노는 일꾼 선택 · 🏠 집으로 인구 수 늘리기\n적 🏰본진을 파괴하면 승리! (3 스테이지)',
  init(g) { S = { stage: 0, g }; newStage(g); },
  update(g, dt) {
    if (S.msgT > 0) { S.msgT -= dt; if (S.msgT <= 0 && S.after) { const f = S.after; S.after = null; f(); return; } }
    if (S.done) return;
    S.time += dt;
    input(g);
    for (const e of S.ents) step(g, e, dt);
    for (const p of S.proj) projStep(g, p, dt);
    S.proj = S.proj.filter((p) => !p.dead);
    for (const e of S.ents) if (e.hp <= 0 && !e.dead) die(g, e);
    S.ents = S.ents.filter((e) => !e.dead);
    S.sel = S.sel.filter((e) => !e.dead);
    S.res = S.res.filter((r) => r.amt > 0);
    separate(dt);
    ai(g, dt);
    checkEnd(g);
    const p = pop(0);
    g.info = `스테이지 ${S.stage}/3 · 💰${Math.floor(S.gold[0])} 🌲${Math.floor(S.wood[0])} · 👥${p.used}/${p.cap}`;
  },
  draw(g, c) {
    for (let x = 0; x < 20; x++) for (let y = 0; y < 12; y++) g.rect(x * 50, y * 50, 50, 50, (x * 7 + y * 3) % 5 ? '#4d7c0f' : '#4a7a10');
    for (const d of S.deco) g.emoji(d.e, d.x, d.y, 14);
    for (const r of S.res) {
      if (r.t === 'g') { g.circle(r.x, r.y + 6, r.r, '#57534e'); g.emoji('⛰️', r.x, r.y - 4, 50); g.emoji('💰', r.x + 14, r.y + 10, 22); if (g.inRect(r.x - 30, r.y - 30, 60, 60)) g.text(Math.floor(r.amt), r.x, r.y - 34, 13, '#fde047'); }
      else g.emoji('🌲', r.x, r.y - 6, 30);
    }
    // 건물
    for (const e of S.ents) if (e.b) {
      const B = BT[e.k], sel = S.sel.includes(e);
      g.rrect(e.x - B.r, e.y - B.r, B.r * 2, B.r * 2, 8, e.flash > 0 ? '#fff' : e.side ? 'rgba(127,29,29,.75)' : 'rgba(30,58,138,.75)', sel ? '#4ade80' : COL[e.side], sel ? 3 : 2);
      c.globalAlpha = e.built ? 1 : 0.45; g.emoji(B.e, e.x, e.y, B.r * 1.7); c.globalAlpha = 1;
      if (!e.built) { g.rect(e.x - B.r, e.y + B.r - 6, B.r * 2 * e.prog / B.t, 5, '#fbbf24'); g.emoji('🚧', e.x + B.r - 6, e.y - B.r + 6, 14); }
      if (e.hp < e.max || sel) bar(g, e.x, e.y - B.r - 7, B.r * 2, e.hp / e.max, e.side);
      if (e.q && e.q.length) { g.rect(e.x - B.r, e.y + B.r + 2, B.r * 2, 4, '#111'); g.rect(e.x - B.r, e.y + B.r + 2, B.r * 2 * (1 - e.qt / qTime(e.q[0])), 4, '#a3e635'); }
      if (sel && e.rally) { g.line(e.x, e.y, e.rally.x, e.rally.y, 'rgba(74,222,128,.5)', 1); g.emoji('🚩', e.rally.x, e.rally.y - 8, 18); }
    }
    // 유닛
    for (const e of S.ents) if (!e.b) {
      const T = UT[e.k], sel = S.sel.includes(e);
      c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(e.x, e.y + T.r * 0.7, T.r, T.r * 0.4, 0, 0, Math.PI * 2); c.fill();
      g.ring(e.x, e.y + T.r * 0.7, T.r * 0.95, sel ? '#4ade80' : COL[e.side], sel ? 3 : 2);
      c.save(); c.translate(e.x + (e.atk > 0 ? e.face * 3 : 0), e.y); if (e.face < 0) c.scale(-1, 1); if (e.flash > 0) c.filter = 'brightness(2.4)';
      g.emoji(T.e, 0, 0, T.r * 2.3); c.restore();
      if (e.carry && e.carry.n) g.emoji(e.carry.t === 'g' ? '💰' : '🪵', e.x + 8, e.y - 10, 11);
      if (e.hp < e.max || sel) bar(g, e.x, e.y - T.r - 6, T.r * 2, e.hp / e.max, e.side);
    }
    for (const p of S.proj) g.circle(p.x, p.y, p.splash ? 5 : 2.5, p.c);
    for (const f of S.fx) { f.t -= 1 / 60; c.globalAlpha = Math.max(0, f.t * 2); g.ring(f.x, f.y, f.r * (1.2 - f.t), f.c, 2); c.globalAlpha = 1; }
    S.fx = S.fx.filter((f) => f.t > 0);
    // 드래그 박스
    if (S.drag && g.mouse.down && Math.hypot(g.mouse.x - S.drag.x, g.mouse.y - S.drag.y) > 8) { c.fillStyle = 'rgba(74,222,128,.15)'; const x = Math.min(S.drag.x, g.mouse.x), y = Math.min(S.drag.y, g.mouse.y); c.fillRect(x, y, Math.abs(g.mouse.x - S.drag.x), Math.abs(g.mouse.y - S.drag.y)); g.stroke(x, y, Math.abs(g.mouse.x - S.drag.x), Math.abs(g.mouse.y - S.drag.y), '#4ade80', 1); }
    // 배치 고스트
    if (S.place) { const B = BT[S.place], ok = canPlace(S.place, g.mouse.x, g.mouse.y, 0); c.globalAlpha = 0.6; g.rrect(g.mouse.x - B.r, g.mouse.y - B.r, B.r * 2, B.r * 2, 8, ok ? 'rgba(74,222,128,.4)' : 'rgba(239,68,68,.4)', ok ? '#4ade80' : '#ef4444'); g.emoji(B.e, g.mouse.x, g.mouse.y, B.r * 1.7); c.globalAlpha = 1; }
    for (const m of S.marks) { m.t -= 1 / 60; g.ring(m.x, m.y, 12 * m.t + 3, m.c, 2); }
    S.marks = S.marks.filter((m) => m.t > 0);
    drawPanel(g, c);
    if (S.msgT > 0) { g.rrect(250, 220, 500, 110, 16, 'rgba(0,0,0,.8)', '#fde047', 3); g.text(S.msg, 500, 260, 30, '#fde047'); g.text(S.msg2 || '', 500, 300, 16, '#e5e7eb'); }
    if (S.alertT > 0) { S.alertT -= 1 / 60; g.text('⚠️ 기지가 공격받고 있다!', 500, 24, 20, '#f87171'); }
  },
});
function bar(g, x, y, w, k, side) { g.rect(x - w / 2, y, w, 4, '#111'); g.rect(x - w / 2, y, w * Math.max(0, k), 4, side ? '#ef4444' : '#22c55e'); }
function newStage(g) {
  S.stage++;
  S.ents = []; S.proj = []; S.fx = []; S.marks = []; S.sel = []; S.res = []; S.deco = [];
  S.gold = [300, 300 + S.stage * 120]; S.wood = [150, 150 + S.stage * 80]; S.lvl = [{ atk: 0, def: 0 }, { atk: Math.max(0, S.stage - 2), def: Math.max(0, S.stage - 2) }];
  S.time = 0; S.place = null; S.drag = null; S.done = false; S.nid = 1; S.alertT = 0;
  const flip = (x, y) => [1000 - x, MH - y];
  const mines = [[250, 465], [120, 300], [420, 300]];
  for (const [x, y] of mines) { S.res.push({ t: 'g', x, y, r: 24, amt: 2200 }); const [fx, fy] = flip(x, y); S.res.push({ t: 'g', x: fx, y: fy, r: 24, amt: 2200 }); }
  S.res.push({ t: 'g', x: 500, y: 280, r: 24, amt: 3000 });
  const woods = [[40, 380, 6], [300, 530, 5], [60, 190, 5], [520, 450, 4], [330, 180, 4]];
  for (const [x, y, n] of woods) for (let i = 0; i < n * 3; i++) {
    const tx = x + U.rand(-45, 45), ty = y + U.rand(-30, 30);
    for (const [px, py] of [[tx, ty], flip(tx, ty)]) if (px > 15 && px < 985 && py > 15 && py < MH - 15) S.res.push({ t: 'w', x: px, y: py, r: 11, amt: 120 });
  }
  for (let i = 0; i < 50; i++) S.deco.push({ x: U.rand(0, 1000), y: U.rand(0, MH), e: U.choice(['🌼', '🌱', '🪨', '🌾']) });
  mk(0, 'hall', 120, 460, true); mk(1, 'hall', 880, 100, true);
  for (let i = 0; i < 4; i++) { mk(0, 'worker', 170 + i * 16, 410); mk(1, 'worker', 830 - i * 16, 150); }
  // 자원과 겹치는 것 정리
  S.res = S.res.filter((r) => !S.ents.some((e) => e.b && Math.hypot(e.x - r.x, e.y - r.y) < BT[e.k].r + r.r + 14));
  for (const w of S.ents) if (w.k === 'worker' && w.side === 0) gatherNearest(w, 'g');
  S.ai = { t: 2, wave: 0, attackT: 150 - S.stage * 25, builder: null };
  S.msg = `스테이지 ${S.stage}`; S.msg2 = ['적 영주가 영토를 넘보고 있다', '강해진 적 — 방어탑을 활용하라', '최종전! 적은 공성 병기까지 동원한다'][S.stage - 1]; S.msgT = 2.2; S.after = null;
}
function mk(side, k, x, y, built) {
  const isB = !!BT[k], D = isB ? BT[k] : UT[k];
  const e = { id: S.nid++, side, k, x, y, b: isB, hp: built || !isB ? D.hp : D.hp * 0.1, max: D.hp, built: !isB || !!built, prog: 0, q: [], qt: 0, task: null, cd: 0, carry: null, flash: 0, atk: 0, face: 1, rally: null, r: D.r };
  if (!isB && S.lvl) e.max = e.hp = D.hp;
  S.ents.push(e); return e;
}
function pop(side) {
  let used = 0, cap = 0;
  for (const e of S.ents) { if (e.side !== side) continue; if (e.b) { if (e.built && BT[e.k].sup) cap += BT[e.k].sup; for (const q of e.q) if (UT[q]) used += UT[q].pop; } else used += UT[e.k].pop; }
  return { used, cap: Math.min(cap, 60) };
}
function afford(side, c) { return S.gold[side] >= c.g && S.wood[side] >= c.w; }
function pay(side, c) { S.gold[side] -= c.g; S.wood[side] -= c.w; }
function qTime(k) { return UT[k] ? UT[k].t : UPG[k].t; }
function canPlace(k, x, y, side) {
  const r = BT[k].r;
  if (x - r < 4 || x + r > 996 || y - r < 4 || y + r > MH - 4) return false;
  for (const e of S.ents) if (e.b && Math.abs(e.x - x) < r + BT[e.k].r + 6 && Math.abs(e.y - y) < r + BT[e.k].r + 6) return false;
  for (const rs of S.res) if (Math.hypot(rs.x - x, rs.y - y) < r + rs.r + 4) return false;
  if (BT[k].req && !S.ents.some((e) => e.side === side && e.k === BT[k].req && e.built)) return false;
  return true;
}
function train(g, b, k) {
  const side = b.side, c = UT[k] ? UT[k].cost : UPG[k].cost(S.lvl[side][k]);
  if (b.q.length >= 5 || !afford(side, c)) { if (side === 0) { g.sfx.beep(150, 0.1); flash('자원이 부족합니다'); } return false; }
  if (UT[k] && pop(side).used + UT[k].pop > pop(side).cap) { if (side === 0) { g.sfx.beep(150, 0.1); flash('인구 부족 — 🏠 집을 지으세요'); } return false; }
  if (UPG[k] && (S.lvl[side][k] >= 3 || b.q.includes(k) || S.ents.some((e) => e !== b && e.side === side && e.q.includes(k)))) return false;
  pay(side, c); if (!b.q.length) b.qt = qTime(k); b.q.push(k); if (side === 0) g.sfx.click(); return true;
}
function flash(m) { S.note = m; S.noteT = 2; }
/* ---------- 입력 ---------- */
function myUnits() { return S.ents.filter((e) => e.side === 0 && !e.b); }
function input(g) {
  const m = g.mouse;
  if (g.keyp('KeyQ')) { S.sel = myUnits().filter((e) => e.k !== 'worker'); g.sfx.click(); }
  if (g.keyp('KeyE')) { const w = myUnits().find((e) => e.k === 'worker' && !e.task); if (w) { S.sel = [w]; g.sfx.click(); } }
  const btns = panelButtons();
  for (let i = 0; i < btns.length; i++) if (g.keyp('Digit' + (i + 1))) btns[i].fn();
  if (m.y > MH) {
    if (m.clicked) { for (const b of btns) if (g.inRect(b.x, b.y, b.w, b.h)) { b.fn(); return; } if (g.inRect(800, 600, 90, 30)) { S.sel = myUnits().filter((e) => e.k !== 'worker'); } }
    return;
  }
  if (m.rclick) { if (S.place) { S.place = null; return; } command(g, m.x, m.y); return; }
  if (S.place) {
    if (m.clicked) {
      const k = S.place, B = BT[k];
      if (!canPlace(k, m.x, m.y, 0)) { g.sfx.beep(150, 0.1); return; }
      if (!afford(0, B.cost)) { g.sfx.beep(150, 0.1); flash('자원이 부족합니다'); S.place = null; return; }
      pay(0, B.cost); const b = mk(0, k, m.x, m.y, false); g.sfx.drop();
      const ws = S.sel.filter((e) => e.k === 'worker');
      for (const w of ws) w.task = { t: 'build', b };
      S.place = null;
    }
    return;
  }
  if (m.clicked) S.drag = { x: m.x, y: m.y };
  if (m.released && S.drag) {
    const d = S.drag; S.drag = null;
    if (Math.hypot(m.x - d.x, m.y - d.y) > 8) {
      const x0 = Math.min(d.x, m.x), x1 = Math.max(d.x, m.x), y0 = Math.min(d.y, m.y), y1 = Math.max(d.y, m.y);
      let s = myUnits().filter((e) => e.x >= x0 && e.x <= x1 && e.y >= y0 && e.y <= y1);
      if (s.some((e) => e.k !== 'worker') && s.some((e) => e.k === 'worker')) s = s.filter((e) => e.k !== 'worker');
      S.sel = s; if (s.length) g.sfx.click();
      return;
    }
    const own = pick(m.x, m.y, (e) => e.side === 0);
    if (own) {
      if (S.sel.length && !S.sel.includes(own) && own.b && !own.built && S.sel.some((e) => e.k === 'worker')) { command(g, m.x, m.y); return; }
      S.sel = [own]; g.sfx.click(); return;
    }
    if (S.sel.length) command(g, m.x, m.y);
  }
}
function pick(x, y, f) {
  let best = null, bd = 1e9;
  for (const e of S.ents) { if (!f(e)) continue; const d = Math.hypot(e.x - x, e.y - y); if (d < e.r + 6 && d < bd) { bd = d; best = e; } }
  return best;
}
function command(g, x, y) {
  const units = S.sel.filter((e) => !e.b), blds = S.sel.filter((e) => e.b);
  if (!units.length) { for (const b of blds) b.rally = { x, y }; if (blds.length) S.marks.push({ x, y, t: 1, c: '#4ade80' }); return; }
  const enemy = pick(x, y, (e) => e.side === 1);
  const res = S.res.find((r) => Math.hypot(r.x - x, r.y - y) < r.r + 6);
  const site = pick(x, y, (e) => e.side === 0 && e.b && (!e.built || e.hp < e.max));
  let i = 0; const n = units.length, cols = Math.ceil(Math.sqrt(n));
  for (const u of units) {
    if (enemy) u.task = { t: 'attack', tg: enemy };
    else if (res && u.k === 'worker') u.task = { t: 'gather', res, rt: res.t, ph: 'go' };
    else if (site && u.k === 'worker') u.task = { t: 'build', b: site };
    else { const ox = ((i % cols) - (cols - 1) / 2) * 24, oy = (Math.floor(i / cols) - (cols - 1) / 2) * 24; u.task = { t: 'move', x: x + ox, y: y + oy, am: u.k !== 'worker' }; }
    i++;
  }
  S.marks.push({ x, y, t: 1, c: enemy ? '#ef4444' : '#4ade80' });
  g.sfx.tone(enemy ? 300 : 600, 0.06, 'triangle', 0.05);
}
/* ---------- 시뮬레이션 ---------- */
function moveTo(e, x, y, dt, stop) {
  const dx = x - e.x, dy = y - e.y, d = Math.hypot(dx, dy);
  if (d <= (stop || 2)) return true;
  const sp = UT[e.k].spd * dt, s = Math.min(sp, d - (stop || 0) + 0.1);
  let vx = dx / d, vy = dy / d;
  // 장애물 회피 (건물·금광)
  for (const o of S.ents) if (o.b) avoid(e, o.x, o.y, BT[o.k].r * 1.25, (a, b) => { vx += a; vy += b; }, vx, vy, x, y);
  for (const r of S.res) if (r.t === 'g') avoid(e, r.x, r.y, r.r + 6, (a, b) => { vx += a; vy += b; }, vx, vy, x, y);
  const m = Math.hypot(vx, vy) || 1;
  e.x += vx / m * s; e.y += vy / m * s; if (Math.abs(vx) > 0.1) e.face = vx > 0 ? 1 : -1;
  return false;
}
function avoid(e, ox, oy, rr, add, vx, vy, tx, ty) {
  const dx = ox - e.x, dy = oy - e.y, d = Math.hypot(dx, dy);
  if (d > rr + 30 || Math.hypot(tx - ox, ty - oy) < rr + 8) return;
  const ahead = dx * vx + dy * vy; if (ahead <= 0) return;
  const side = dx * vy - dy * vx >= 0 ? 1 : -1;
  const k = (rr + 30 - d) / 30;
  add(-dy / d * side * k * 1.5, dx / d * side * k * 1.5);
}
function distTo(e, t) { return Math.hypot(t.x - e.x, t.y - e.y) - (t.r || 10) - e.r; }
function nearestEnemy(e, range) {
  let best = null, bd = range, bb = null, bbd = range;
  for (const o of S.ents) { if (o.side === e.side || o.dead) continue; const d = distTo(e, o); if (!o.b) { if (d < bd) { bd = d; best = o; } } else if (d < bbd) { bbd = d; bb = o; } }
  return best || bb;
}
function ownHall(e) { let b = null, bd = 1e9; for (const o of S.ents) if (o.side === e.side && o.k === 'hall' && o.built) { const d = Math.hypot(o.x - e.x, o.y - e.y); if (d < bd) { bd = d; b = o; } } return b; }
function gatherNearest(w, t) { let b = null, bd = 1e9; for (const r of S.res) if (r.t === t) { const d = Math.hypot(r.x - w.x, r.y - w.y); if (d < bd) { bd = d; b = r; } } if (b) w.task = { t: 'gather', res: b, rt: t, ph: 'go' }; else w.task = null; }
function step(g, e, dt) {
  e.flash -= dt; e.atk -= dt; e.cd -= dt;
  if (e.b) return bldStep(g, e, dt);
  const T = UT[e.k], tk = e.task;
  // 자동 교전
  if ((!tk || (tk.t === 'move' && tk.am)) && e.k !== 'worker') { const en = nearestEnemy(e, T.sight); if (en) { e.task = { t: 'attack', tg: en, auto: 1, back: tk }; } }
  if (!e.task && e.k === 'worker' && e.side === 0) { const en = nearestEnemy(e, 40); if (en && !en.b) e.task = { t: 'attack', tg: en, auto: 1 }; }
  const t = e.task; if (!t) return;
  if (t.t === 'move') { if (moveTo(e, t.x, t.y, dt, 3)) e.task = null; return; }
  if (t.t === 'attack') {
    const tg = t.tg;
    if (!tg || tg.dead || tg.hp <= 0) { e.task = t.back && t.back.t === 'move' ? t.back : null; return; }
    if (t.auto && distTo(e, tg) > T.sight * 1.6) { e.task = t.back || null; return; }
    if (distTo(e, tg) <= T.range) {
      e.face = tg.x > e.x ? 1 : -1;
      if (e.cd <= 0) {
        e.cd = T.rate; e.atk = 0.15;
        const dmg = T.dmg + S.lvl[e.side].atk * (T.siege ? 6 : 2);
        if (T.proj) S.proj.push({ x: e.x, y: e.y - 6, tg, dmg, c: T.proj, splash: T.splash || 0, side: e.side, lx: tg.x, ly: tg.y, siege: T.siege, sp: T.siege ? 220 : 380 });
        else { hurt(g, tg, dmg, e.side); if (e.side === 0 || tg.side === 0) g.sfx.tone(180 + Math.random() * 80, 0.03, 'square', 0.02); }
      }
    } else moveTo(e, tg.x, tg.y, dt);
    return;
  }
  if (t.t === 'build') {
    const b = t.b;
    if (!b || b.dead || (b.built && b.hp >= b.max)) { e.task = null; if (ownHall(e)) gatherNearest(e, Math.random() < 0.6 ? 'g' : 'w'); return; }
    if (distTo(e, b) <= 6) {
      e.atk = Math.sin(g.time * 12) > 0 ? 0.1 : 0;
      if (!b.built) { b.prog += dt; b.hp = Math.min(b.max, b.hp + b.max * 0.9 * dt / BT[b.k].t); if (b.prog >= BT[b.k].t) { b.built = true; if (b.side === 0) { g.sfx.power(); g.float(b.x, b.y - 40, BT[b.k].n + ' 완공!', '#4ade80', 18); } } }
      else { b.hp = Math.min(b.max, b.hp + 25 * dt); }
      if (e.side === 0 && Math.random() < dt * 4) g.sfx.tone(400 + Math.random() * 200, 0.02, 'square', 0.015);
    } else moveTo(e, b.x, b.y, dt);
    return;
  }
  if (t.t === 'gather') {
    if (t.ph === 'go') {
      if (!t.res || t.res.amt <= 0) { if (e.carry && e.carry.n) t.ph = 'ret'; else { gatherNearest(e, t.rt); } return; }
      if (distTo(e, t.res) <= 4) { t.ph = 'work'; t.wt = t.rt === 'g' ? 2.2 : 2.8; }
      else moveTo(e, t.res.x, t.res.y, dt);
    } else if (t.ph === 'work') {
      t.wt -= dt * (e.side === 1 ? 1 + (S.stage - 1) * 0.18 : 1); e.atk = Math.sin(g.time * 10) > 0 ? 0.1 : 0;
      if (!t.res || t.res.amt <= 0) { t.ph = 'go'; return; }
      if (t.wt <= 0) { const n = Math.min(10, t.res.amt); t.res.amt -= n; e.carry = { t: t.rt, n }; t.ph = 'ret'; }
    } else {
      const h = ownHall(e); if (!h) { e.task = null; return; }
      if (distTo(e, h) <= 6) { if (e.carry) { if (e.carry.t === 'g') S.gold[e.side] += e.carry.n; else S.wood[e.side] += e.carry.n; if (e.side === 0) g.score += 1; } e.carry = null; t.ph = 'go'; if (!t.res || t.res.amt <= 0) gatherNearest(e, t.rt); }
      else moveTo(e, h.x, h.y, dt);
    }
  }
}
function bldStep(g, b, dt) {
  if (!b.built) return;
  const B = BT[b.k];
  if (B.dmg && b.cd <= 0) { const en = nearestEnemy(b, B.range); if (en) { b.cd = B.rate; S.proj.push({ x: b.x, y: b.y - 20, tg: en, dmg: B.dmg + S.lvl[b.side].atk * 2, c: '#fde68a', splash: 0, side: b.side, lx: en.x, ly: en.y, sp: 420 }); } }
  if (b.q.length) {
    b.qt -= dt;
    if (b.qt <= 0) {
      const k = b.q.shift();
      if (UT[k]) {
        const a = Math.random() * 6.28, u = mk(b.side, k, b.x + Math.cos(a) * (B.r + 14), b.y + Math.sin(a) * (B.r + 14));
        if (b.rally) { const res = S.res.find((r) => Math.hypot(r.x - b.rally.x, r.y - b.rally.y) < r.r + 6); if (res && k === 'worker') u.task = { t: 'gather', res, rt: res.t, ph: 'go' }; else u.task = { t: 'move', x: b.rally.x + U.rand(-15, 15), y: b.rally.y + U.rand(-15, 15), am: k !== 'worker' }; }
        else if (k === 'worker') gatherNearest(u, b.side === 1 ? (S.gold[1] < S.wood[1] * 1.3 ? 'g' : 'w') : 'g');
        if (b.side === 0) g.sfx.pop();
      } else { S.lvl[b.side][k]++; if (b.side === 0) { g.sfx.power(); g.float(b.x, b.y - 40, `${UPG[k].n} Lv${S.lvl[0][k]}`, '#fde047', 18); } }
      if (b.q.length) b.qt = qTime(b.q[0]);
    }
  }
}
function hurt(g, t, dmg, side) {
  if (!t || t.dead) return;
  const arm = t.b ? (BT[t.k].arm || 1) : (UT[t.k].arm || 0) + S.lvl[t.side].def;
  t.hp -= Math.max(1, dmg - arm); t.flash = 0.08;
  if (t.side === 0 && t.b) S.alertT = 2;
  if (!t.task && !t.b && t.side !== side && UT[t.k].dmg > 4) { const src = nearestEnemy(t, 250); if (src) t.task = { t: 'attack', tg: src, auto: 1 }; }
}
function projStep(g, p, dt) {
  if (p.tg && !p.tg.dead) { p.lx = p.tg.x; p.ly = p.tg.y; }
  const dx = p.lx - p.x, dy = p.ly - p.y, d = Math.hypot(dx, dy), s = p.sp * dt;
  if (d <= s + 3) {
    p.dead = true;
    if (p.splash) {
      S.fx.push({ x: p.lx, y: p.ly, r: p.splash, t: 0.5, c: '#f97316' }); g.burst(p.lx, p.ly, ['#78716c', '#f97316'], 10, 120, 0.4);
      for (const e of S.ents) if (e.side !== p.side && Math.hypot(e.x - p.lx, e.y - p.ly) < p.splash + e.r) hurt(g, e, e.b ? p.dmg * 2.2 : p.dmg, p.side);
      if (p.side === 0 || Math.hypot(p.lx - 120, p.ly - 460) < 300) g.sfx.explode();
    } else if (p.tg && !p.tg.dead) hurt(g, p.tg, p.dmg, p.side);
    return;
  }
  p.x += dx / d * s; p.y += dy / d * s;
}
function die(g, e) {
  e.dead = true;
  const big = e.b;
  g.burst(e.x, e.y, big ? ['#78716c', '#f97316', '#fde047'] : e.side ? ['#fca5a5', '#7f1d1d'] : ['#93c5fd', '#1e3a8a'], big ? 40 : 10, big ? 260 : 140, big ? 0.9 : 0.4, big ? 4 : 3);
  if (big) { g.shake(8, 0.3); g.sfx.explode(); }
  if (e.side === 1) { const c = big ? BT[e.k].cost : UT[e.k].cost; g.add(Math.round((c.g + c.w) / 5) + (big ? 50 : 0), e.x, e.y - 20); }
  for (const o of S.ents) if (o.task && o.task.t === 'build' && o.task.b === e) o.task = null;
}
function separate(dt) {
  const us = S.ents;
  for (let i = 0; i < us.length; i++) {
    const a = us[i]; if (a.b) continue;
    for (let j = i + 1; j < us.length; j++) {
      const b = us[j]; if (b.b) continue;
      const dx = b.x - a.x, dy = b.y - a.y; if (Math.abs(dx) > 30 || Math.abs(dy) > 30) continue;
      const d = Math.hypot(dx, dy) || 0.01, m = (a.r + b.r) * 0.8;
      if (d < m) { const p = (m - d) / 2, nx = dx / d, ny = dy / d; a.x -= nx * p; a.y -= ny * p; b.x += nx * p; b.y += ny * p; }
    }
    for (const o of us) if (o.b) { const r = BT[o.k].r + a.r * 0.5; const dx = a.x - o.x, dy = a.y - o.y; if (Math.abs(dx) < r && Math.abs(dy) < r) { if (r - Math.abs(dx) < r - Math.abs(dy)) a.x = o.x + Math.sign(dx || 1) * r; else a.y = o.y + Math.sign(dy || 1) * r; } }
    for (const rs of S.res) if (rs.t === 'g') { const dx = a.x - rs.x, dy = a.y - rs.y, d = Math.hypot(dx, dy) || 0.01, m = rs.r + a.r * 0.5; if (d < m) { a.x = rs.x + dx / d * m; a.y = rs.y + dy / d * m; } }
    a.x = U.clamp(a.x, 8, 992); a.y = U.clamp(a.y, 8, MH - 8);
  }
}
/* ---------- AI ---------- */
function ai(g, dt) {
  const A = S.ai; A.t -= dt; A.attackT -= dt; if (A.t > 0) return; A.t = 1;
  const mine = S.ents.filter((e) => e.side === 1), hall = mine.find((e) => e.k === 'hall'); if (!hall) return;
  const workers = mine.filter((e) => e.k === 'worker'), army = mine.filter((e) => !e.b && e.k !== 'worker');
  const has = (k, built) => mine.filter((e) => e.k === k && (!built || e.built)).length;
  const P = pop(1);
  // 일꾼
  for (const w of workers) if (!w.task) gatherNearest(w, S.gold[1] < S.wood[1] * 1.4 ? 'g' : 'w');
  if (workers.length < 8 + S.stage * 2 && hall.q.length < 2) train(g, hall, 'worker');
  // 건설
  const buildOrder = () => {
    if (P.cap - P.used <= 3 && !mine.some((e) => e.k === 'house' && !e.built) && P.cap < 60) return 'house';
    if (!has('barracks')) return 'barracks';
    if (S.stage >= 2 && !has('tower') && S.time > 90) return 'tower';
    if (S.stage >= 2 && has('barracks') < 2 && S.time > 150) return 'barracks';
    if (S.stage >= 3 && !has('workshop') && has('barracks', true)) return 'workshop';
    if (S.time > 240 && has('tower') < S.stage) return 'tower';
    return null;
  };
  const want = buildOrder();
  if (want && afford(1, BT[want].cost) && workers.length > 2 && !mine.some((e) => e.b && !e.built && e.k === want)) {
    for (let tries = 0; tries < 25; tries++) {
      const a = Math.random() * 6.28, rr = U.rand(80, 170), x = hall.x + Math.cos(a) * rr, y = hall.y + Math.abs(Math.sin(a)) * rr;
      if (canPlace(want, x, y, 1)) { pay(1, BT[want].cost); const b = mk(1, want, x, y, false); const w = workers.find((w) => !w.carry) || workers[0]; w.task = { t: 'build', b }; break; }
    }
  }
  // 짓다 만 건물 계속 짓기
  for (const b of mine) if (b.b && !b.built && !workers.some((w) => w.task && w.task.b === b)) { const w = workers[0]; if (w) w.task = { t: 'build', b }; }
  // 군대 훈련
  for (const b of mine) if (b.built && b.q.length < 2) {
    if (b.k === 'barracks') {
      if (S.stage >= 2 && S.lvl[1].atk < S.stage && S.time > 200 && Math.random() < 0.15) train(g, b, 'atk');
      const r = Math.random(); train(g, b, r < 0.45 ? 'soldier' : r < 0.8 ? 'archer' : 'knight');
    }
    if (b.k === 'workshop' && Math.random() < 0.5) train(g, b, 'catapult');
  }
  // 방어
  const intruder = S.ents.find((e) => e.side === 0 && !e.b && Math.hypot(e.x - hall.x, e.y - hall.y) < 280);
  if (intruder) { for (const u of army) if (!u.task || u.task.t !== 'attack') u.task = { t: 'attack', tg: intruder }; return; }
  // 공격 웨이브
  const need = 4 + A.wave * 2 + S.stage;
  if (army.length >= need || (A.attackT <= 0 && army.length >= 3)) {
    const targets = S.ents.filter((e) => e.side === 0 && e.b);
    if (targets.length) {
      A.wave++; A.attackT = 140 - S.stage * 15;
      const tg = targets.reduce((a, b) => (Math.hypot(a.x - hall.x, a.y - hall.y) < Math.hypot(b.x - hall.x, b.y - hall.y) ? a : b));
      for (const u of army) u.task = { t: 'move', x: tg.x + U.rand(-30, 30), y: tg.y + U.rand(-30, 30), am: 1 };
      flash(`⚔️ 적의 ${A.wave}차 공격이 시작됐다!`); g.sfx.tone(110, 0.8, 'sawtooth', 0.06, 70);
    }
  }
}
function checkEnd(g) {
  const ph = S.ents.some((e) => e.side === 0 && e.k === 'hall'), eh = S.ents.some((e) => e.side === 1 && e.k === 'hall');
  if (!eh) {
    S.done = true; g.add(2000 * S.stage + Math.max(0, 600 - Math.floor(S.time)) * 2);
    if (S.stage >= 3) { S.msg = '🏆 전쟁 승리!'; S.msg2 = '모든 적 영주를 무찔렀다'; S.msgT = 1.5; S.after = () => g.win(`3개 스테이지 정복! 플레이 ${U.fmtTime(S.time)}`); }
    else { S.msg = '🏰 적 본진 함락!'; S.msg2 = '다음 전장으로...'; S.msgT = 2.5; S.after = () => newStage(g); }
    g.sfx.win();
  } else if (!ph) { S.done = true; S.msg = '본진이 무너졌다...'; S.msg2 = ''; S.msgT = 1.2; S.after = () => g.over(`스테이지 ${S.stage}에서 패배`); }
}
/* ---------- 패널 ---------- */
function panelButtons() {
  const out = [], sel = S.sel; let x = 330;
  const add = (label, e, cost, fn, sub) => { out.push({ x, y: 570, w: 80, h: 62, label, e, cost, fn, sub }); x += 86; };
  const fmt = (c) => (c.g ? '💰' + c.g : '') + (c.w ? ' 🌲' + c.w : '');
  if (sel.length === 1 && sel[0].b && sel[0].built) {
    const b = sel[0];
    if (b.k === 'hall') add('일꾼', '👷', fmt(UT.worker.cost), () => train(S.g, b, 'worker'));
    if (b.k === 'barracks') { for (const k of ['soldier', 'archer', 'knight']) add(UT[k].n, UT[k].e, fmt(UT[k].cost), () => train(S.g, b, k)); for (const k of ['atk', 'def']) add(UPG[k].n, UPG[k].e, S.lvl[0][k] >= 3 ? 'MAX' : fmt(UPG[k].cost(S.lvl[0][k])), () => train(S.g, b, k), 'Lv' + S.lvl[0][k]); }
    if (b.k === 'workshop') add('투석기', UT.catapult.e, fmt(UT.catapult.cost), () => train(S.g, b, 'catapult'));
  } else if (sel.some((e) => e.k === 'worker')) {
    for (const k of ['house', 'barracks', 'tower', 'workshop', 'hall']) add(BT[k].n, BT[k].e, fmt(BT[k].cost), () => { if (BT[k].req && !S.ents.some((e) => e.side === 0 && e.k === BT[k].req && e.built)) { flash('병영이 먼저 필요합니다'); return; } S.place = S.place === k ? null : k; S.g.sfx.click(); });
  }
  return out;
}
function drawPanel(g, c) {
  S.g = g;
  g.rect(0, MH, 1000, 80, '#1c1917'); g.line(0, MH, 1000, MH, '#a16207', 3);
  const sel = S.sel;
  if (sel.length === 1) {
    const e = sel[0], D = e.b ? BT[e.k] : UT[e.k];
    g.emoji(D.e, 40, 600, 44); g.text(D.n + (e.b && !e.built ? ' (건설 중)' : ''), 75, 582, 16, '#fff', 'left');
    g.text(`❤️ ${Math.ceil(e.hp)}/${e.max}`, 75, 604, 13, '#fca5a5', 'left');
    if (!e.b) g.text(`⚔️${D.dmg + S.lvl[0].atk * (D.siege ? 6 : 2)} 🛡️${(D.arm || 0) + S.lvl[0].def}` + (e.carry ? ` · ${e.carry.t === 'g' ? '💰' : '🪵'}${e.carry.n}` : ''), 75, 624, 13, '#d6d3d1', 'left');
    if (e.b && e.q.length) g.text('대기열: ' + e.q.map((k) => (UT[k] ? UT[k].e : UPG[k].e)).join(''), 75, 624, 14, '#a3e635', 'left');
  } else if (sel.length > 1) {
    const cnt = {}; sel.forEach((e) => (cnt[e.k] = (cnt[e.k] || 0) + 1));
    Object.entries(cnt).forEach(([k, n], i) => { g.emoji(UT[k].e, 30 + i * 60, 590, 28); g.text('×' + n, 52 + i * 60, 615, 14, '#fff'); });
  } else g.text('유닛이나 건물을 선택하세요', 160, 600, 15, '#a8a29e');
  for (const [i, b] of panelButtons().entries()) {
    const hov = g.inRect(b.x, b.y, b.w, b.h), on = S.place && b.label === BT[S.place]?.n;
    g.rrect(b.x, b.y, b.w, b.h, 8, on ? '#a16207' : hov ? '#57534e' : '#44403c', '#a8a29e', 1);
    g.emoji(b.e, b.x + 22, b.y + 20, 24); g.text(b.label, b.x + 56, b.y + 14, 11, '#fff'); if (b.sub) g.text(b.sub, b.x + 56, b.y + 30, 11, '#fde047');
    g.text(b.cost, b.x + 40, b.y + 50, 10, '#fde68a', 'center', '600'); g.text(i + 1, b.x + 6, b.y + 8, 9, '#a8a29e');
  }
  const p = pop(0);
  g.text(`💰 ${Math.floor(S.gold[0])}`, 900, 572, 17, '#fde047', 'left'); g.text(`🌲 ${Math.floor(S.wood[0])}`, 900, 592, 17, '#86efac', 'left');
  g.text(`👥 ${p.used}/${p.cap}`, 820, 582, 16, p.used >= p.cap ? '#f87171' : '#fff', 'left');
  g.rrect(800, 600, 90, 30, 6, '#7f1d1d'); g.text('Q 전체 군대', 845, 615, 12, '#fff');
  if (S.noteT > 0) { S.noteT -= 1 / 60; g.text(S.note, 500, 540, 17, '#fde047'); }
  if (S.place) g.text(`${BT[S.place].n} 배치할 곳을 클릭 (우클릭 취소)`, 500, 540, 16, '#fde047');
}
