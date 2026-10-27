let S;
const ID_ORES = [
  { n: '석탄', e: '🪨', c: '#3f3f46', w: '#27272a' }, { n: '구리', e: '🟠', c: '#9a3412', w: '#431407' },
  { n: '철', e: '⚙️', c: '#64748b', w: '#1e293b' }, { n: '은', e: '🥈', c: '#94a3b8', w: '#334155' },
  { n: '금', e: '🪙', c: '#ca8a04', w: '#422006' }, { n: '루비', e: '🔴', c: '#be123c', w: '#4c0519' },
  { n: '사파이어', e: '🔷', c: '#1d4ed8', w: '#172554' }, { n: '에메랄드', e: '💚', c: '#047857', w: '#022c22' },
  { n: '다이아몬드', e: '💎', c: '#0891b2', w: '#083344' }, { n: '운석', e: '☄️', c: '#7c3aed', w: '#2e1065' },
];
const ID_GOAL = 1e8;
const ID_SURF = 150, ID_SH = 104, ID_TOP = 52;
const ID_WHEEL = { d: 0 };
try { window.addEventListener('wheel', (e) => { ID_WHEEL.d += e.deltaY; }, { passive: true }); } catch (e) {}
function idRate(i, L) { return 2.5 * 7 ** i * L * 2 ** Math.floor(L / 25); }
function idShaftCost(i, L) { return 9 * 7 ** i * 1.14 ** (L - 1); }
function idUnlock(i) { return i === 0 ? 0 : 120 * 9.5 ** i; }
function idCap(L) { return 30 * L * 1.13 ** (L - 1); }
function idUpCost(L) { return 25 * 1.17 ** (L - 1) * (1 + L * 0.05); }
function idMgrCost(kind, i) { return kind === 'shaft' ? Math.max(60, idUnlock(i) * 0.6 + 60 * 7 ** i) : kind === 'elev' ? 150 : 120; }
function fmt(n) {
  n = Math.floor(n);
  if (n < 1e4) return n.toLocaleString();
  const u = [[1e12, '조'], [1e8, '억'], [1e4, '만']];
  for (const [v, s] of u) if (n >= v) { const x = n / v; return (x >= 100 ? Math.floor(x) : x.toFixed(x >= 10 ? 1 : 2)) + s; }
  return String(n);
}
GAME({
  title: '방치형 광산', w: 960, h: 640, bg: '#1c1208', controls: 'none', noAutoPause: true,
  help: '광부가 캔 광석 → 🛗 엘리베이터가 지상으로 → 🛻 운반차가 창고로 옮기면 돈!\n매니저가 없으면 갱도·엘리베이터·운반차를 클릭해서 일을 시켜요\n⬆ 버튼으로 레벨업 (10레벨마다 광부 추가, 25레벨마다 생산 2배)\n👷 매니저를 고용하면 자동 운영 + ⚡스킬(20초 2배) 사용 가능\n✨ 반짝이는 광맥을 클릭하면 보너스 · ↑↓/휠로 스크롤 · 1억 원을 벌면 승리!',
  init(g) {
    S = {
      money: 30, earned: 0, buyN: 1, scroll: 0, scrollT: 0, surface: 0, t: 0,
      shafts: [newShaft(0)],
      elev: { L: 1, mgr: false, y: 0, state: 'idle', load: 0, target: 0, wait: 0, boost: 0, cd: 0, stops: [] },
      wh: { L: 1, mgr: false, x: 0, state: 'idle', load: 0, wait: 0, boost: 0, cd: 0 },
      nugget: null, nuggetT: 30, lastReal: 0, msg: '', msgT: 0, rateEst: 0, lastEarn: [], dragY: null,
    };
    S.elev.y = ID_SURF - 20;
    say('갱도를 클릭해서 광부에게 일을 시키세요!');
  },
  update(g, dt) {
    S.t += dt; S.msgT = Math.max(0, S.msgT - dt);
    // 방치 보상: 탭이 꺼져 있던 시간만큼 시뮬레이션 (최대 30분)
    const now = performance.now(), gap = S.lastReal ? (now - S.lastReal) / 1000 : 0;
    S.lastReal = now;
    if (gap > 3) {
      const before = S.earned, steps = Math.min(7200, Math.floor(gap / 0.25));
      for (let k = 0; k < steps; k++) { autoNoMgr(); tick(0.25, null); }
      const got = S.earned - before;
      if (got > 0) { say(`💤 방치 보상 +${fmt(got)}원 (${Math.round(steps * 0.25)}초)`); g.sfx.coin(); }
    }
    tick(dt, g);
    // 스크롤
    const maxS = Math.max(0, ID_SURF + S.shafts.length * ID_SH + 170 - (640 - ID_TOP));
    let sc = 0;
    if (g.held('up')) sc -= 500 * dt;
    if (g.held('down')) sc += 500 * dt;
    if (ID_WHEEL.d) { sc += ID_WHEEL.d * 0.6; ID_WHEEL.d = 0; }
    if (g.swiped === 'up') sc += 200; if (g.swiped === 'down') sc -= 200;
    if (g.clickIn(916, 560, 36, 36)) sc += 150;
    if (g.clickIn(916, 516, 36, 36)) sc -= 150;
    S.scroll = U.clamp(S.scroll + sc, 0, maxS);
    // 구매 배수
    if (g.clickIn(720, 6, 110, 34) || g.keyp('KeyB')) { S.buyN = S.buyN === 1 ? 10 : S.buyN === 10 ? 0 : 1; g.sfx.click(); }
    for (let i = 0; i < Math.min(9, S.shafts.length); i++) if (g.keyp('Digit' + (i + 1))) buyShaft(g, i);
    if (g.keyp('KeyE')) buyElev(g);
    if (g.keyp('KeyQ')) buyWh(g);
    if (g.mouse.clicked) handleClick(g, g.mouse.x, g.mouse.y);
    g.score = Math.floor(S.earned);
    g.info = `초당 ≈ ${fmt(S.rateEst)}원 · 목표 ${Math.min(100, (S.earned / ID_GOAL) * 100).toFixed(1)}%`;
    if (S.earned >= ID_GOAL) g.win(`1억 원 달성! ${U.fmtTime(S.t)} 걸림 · 갱도 ${S.shafts.length}개`);
  },
  draw(g, c) {
    const sy = ID_TOP - S.scroll;
    c.save(); c.beginPath(); c.rect(0, ID_TOP, 960, 640 - ID_TOP); c.clip();
    c.translate(0, sy);
    // 지상
    g.rect(0, -400, 960, ID_SURF + 400, '#7dd3fc');
    g.rect(0, ID_SURF - 70, 960, 70, '#86efac');
    g.rect(0, ID_SURF - 12, 960, 12, '#65a30d');
    g.emoji('☁️', 300 + Math.sin(S.t * 0.1) * 40, 20, 40); g.emoji('☁️', 620 + Math.cos(S.t * 0.08) * 50, 10, 30);
    g.emoji('☀️', 880, 10, 44);
    // 창고
    g.rrect(700, ID_SURF - 110, 170, 100, 8, '#b45309', '#78350f', 3);
    g.poly([[690, ID_SURF - 108], [785, ID_SURF - 150], [880, ID_SURF - 108]], '#7c2d12');
    g.text('창고', 785, ID_SURF - 88, 18, '#fff7ed');
    g.text(`Lv.${S.wh.L}`, 785, ID_SURF - 64, 14, '#fde68a');
    g.text(`용량 ${fmt(idCap(S.wh.L))}`, 785, ID_SURF - 42, 12, '#fed7aa', 'center', '500');
    // 지상 적재함
    g.rrect(150, ID_SURF - 50, 70, 38, 6, '#57534e', '#292524', 2);
    g.text(fmt(S.surface), 185, ID_SURF - 31, 14, '#fde68a');
    // 운반차
    const wx = 240 + S.wh.x * 400;
    g.emoji('🛻', wx, ID_SURF - 30, 46);
    if (S.wh.load > 0) g.text(fmt(S.wh.load), wx, ID_SURF - 64, 13, '#fff');
    if (!S.wh.mgr && S.wh.state === 'idle' && S.surface > 0) bounceHint(g, wx, ID_SURF - 80);
    // 땅속
    g.rect(0, ID_SURF, 960, S.shafts.length * ID_SH + 400, '#3b2416');
    // 엘리베이터 통로
    const eb = ID_SURF + S.shafts.length * ID_SH;
    g.rect(40, ID_SURF - 90, 80, eb - ID_SURF + 90, '#1c1917');
    g.line(50, ID_SURF - 90, 50, eb, '#57534e', 3); g.line(110, ID_SURF - 90, 110, eb, '#57534e', 3);
    g.rect(30, ID_SURF - 100, 100, 14, '#44403c');
    // 갱도
    S.shafts.forEach((sh, i) => drawShaft(g, sh, i));
    // 다음 갱도 해금
    const ni = S.shafts.length;
    if (ni < ID_ORES.length) {
      const y = ID_SURF + ni * ID_SH + 10, cost = idUnlock(ni), can = S.money >= cost;
      g.rrect(150, y + 8, 560, ID_SH - 24, 14, can ? '#365314' : '#292524', can ? '#84cc16' : '#57534e', 2);
      g.emoji(ID_ORES[ni].e, 200, y + 48, 36);
      g.text(`새 갱도: ${ID_ORES[ni].n} 광산`, 240, y + 36, 20, '#fff', 'left');
      g.text(`해금 비용 ${fmt(cost)}원 ${can ? '— 클릭!' : ''}`, 240, y + 64, 15, can ? '#bef264' : '#a8a29e', 'left', '500');
    }
    // 엘리베이터 칸
    const ey = S.elev.y;
    g.rrect(46, ey - 22, 68, 44, 6, '#a8a29e', '#44403c', 3);
    g.emoji('🛗', 80, ey - 2, 30);
    if (S.elev.load > 0) { g.rrect(52, ey + 24, 56, 18, 5, 'rgba(0,0,0,.7)'); g.text(fmt(S.elev.load), 80, ey + 33, 12, '#fde68a'); }
    if (!S.elev.mgr && S.elev.state === 'idle' && S.shafts.some((s) => s.stock > 0)) bounceHint(g, 80, ey - 44);
    // 광맥 보너스
    if (S.nugget) { const n = S.nugget, y = ID_SURF + n.i * ID_SH + 52; const p = 1 + Math.sin(S.t * 8) * 0.12; g.emoji('✨', n.x, y - 6, 40 * p); g.emoji('💰', n.x, y + 6, 28); }
    c.restore();
    // 상단 바
    g.rect(0, 0, 960, ID_TOP, '#1c1208');
    g.text(`💰 ${fmt(S.money)}원`, 16, 26, 24, '#fde047', 'left');
    g.text(`누적 ${fmt(S.earned)} / 1억`, 260, 18, 13, '#d6d3d1', 'left', '500');
    g.rrect(260, 30, 200, 10, 5, '#44403c'); g.rrect(260, 30, Math.max(4, 200 * Math.min(1, S.earned / ID_GOAL)), 10, 5, '#facc15');
    g.text(`⏱ ${U.fmtTime(S.t)}`, 480, 26, 15, '#a8a29e', 'left');
    g.button(720, 6, 110, 38, `구매 ×${S.buyN || 'MAX'}`, '#57534e', 16);
    g.button(840, 6, 110, 38, '⬇ 아래로', '#44403c', 14);
    // 스크롤 버튼
    g.button(916, 516, 36, 36, '▲', '#44403c', 16); g.button(916, 560, 36, 36, '▼', '#44403c', 16);
    // 엘리베이터 / 창고 패널 (화면 고정 위치에 표시)
    const ep = { x: 150, y: 596 };
    drawPanel(g, 140, 598, '🛗 엘리베이터', S.elev, idUpCost(S.elev.L), 'elev');
    drawPanel(g, 520, 598, '🛻 운반', S.wh, idUpCost(S.wh.L), 'wh');
    if (S.msgT > 0) { c.globalAlpha = Math.min(1, S.msgT); g.rrect(250, 60, 460, 38, 12, 'rgba(0,0,0,.8)'); g.text(S.msg, 480, 79, 16, '#fde68a'); c.globalAlpha = 1; }
  },
});
function autoNoMgr() { /* 방치 중에는 매니저가 있는 곳만 일한다 */ }
function newShaft(i) { return { i, L: 1, mgr: false, stock: 0, boost: 0, cd: 0, active: 0, miners: [mk(0)] }; }
function mk(k) { return { x: 0, ph: 'idle', t: 0, carry: 0, k, off: k * 0.13 }; }
function say(m) { S.msg = m; S.msgT = 3; }
function bounceHint(g, x, y) { g.emoji('👆', x, y + Math.sin(S.t * 8) * 5, 24); }
function minersFor(L) { return Math.min(6, 1 + Math.floor(L / 10)); }
// ───── 경제 시뮬레이션 ─────
function tick(dt, g) {
  let inc = 0;
  for (const sh of S.shafts) {
    sh.boost = Math.max(0, sh.boost - dt); sh.cd = Math.max(0, sh.cd - dt);
    const need = minersFor(sh.L);
    while (sh.miners.length < need) sh.miners.push(mk(sh.miners.length));
    const spd = sh.boost > 0 ? 2 : 1, cycle = 9;
    const per = (idRate(sh.i, sh.L) * cycle) / sh.miners.length;
    for (const m of sh.miners) {
      if (m.ph === 'idle') { if (sh.mgr || sh.active > 0) { m.ph = 'go'; m.t = 0; } continue; }
      m.t += dt * spd;
      if (m.ph === 'go') { m.x = Math.min(1, m.t / 3.5); if (m.t >= 3.5) { m.ph = 'dig'; m.t = 0; } }
      else if (m.ph === 'dig') { if (m.t >= 2) { m.ph = 'back'; m.t = 0; m.carry = per; } }
      else if (m.ph === 'back') { m.x = Math.max(0, 1 - m.t / 3.5); if (m.t >= 3.5) { sh.stock += m.carry; m.carry = 0; m.ph = 'idle'; m.x = 0; } }
    }
    if (sh.active > 0) sh.active = Math.max(0, sh.active - dt);
    inc += idRate(sh.i, sh.L) * (sh.boost > 0 ? 2 : 1);
  }
  // 엘리베이터
  const E = S.elev;
  E.boost = Math.max(0, E.boost - dt); E.cd = Math.max(0, E.cd - dt);
  const espd = (160 + E.L * 6) * (E.boost > 0 ? 2 : 1), ecap = idCap(E.L) * (E.boost > 0 ? 2 : 1);
  const topY = ID_SURF - 20;
  if (E.state === 'idle' && E.mgr && S.shafts.some((s) => s.stock > 0)) E.state = 'down', E.target = 0;
  if (E.state === 'down') {
    const ty = ID_SURF + E.target * ID_SH + 52;
    E.y = Math.min(ty, E.y + espd * dt);
    if (E.y >= ty) { E.state = 'load'; E.wait = 0.4; }
  } else if (E.state === 'load') {
    E.wait -= dt;
    if (E.wait <= 0) {
      const sh = S.shafts[E.target], take = Math.min(sh.stock, ecap - E.load);
      sh.stock -= take; E.load += take;
      const deeper = S.shafts.findIndex((s, k) => k > E.target && s.stock > 0);
      if (E.load < ecap - 1e-6 && deeper >= 0) { E.target = deeper; E.state = 'down'; }
      else E.state = 'up';
    }
  } else if (E.state === 'up') {
    E.y = Math.max(topY, E.y - espd * dt);
    if (E.y <= topY) { S.surface += E.load; E.load = 0; E.state = 'idle'; }
  }
  // 운반차
  const W = S.wh;
  W.boost = Math.max(0, W.boost - dt); W.cd = Math.max(0, W.cd - dt);
  const wspd = (0.35 + W.L * 0.004) * (W.boost > 0 ? 2 : 1), wcap = idCap(W.L) * (W.boost > 0 ? 2 : 1);
  if (W.state === 'idle' && W.mgr && S.surface > 0) W.state = 'load', W.wait = 0.3;
  if (W.state === 'load') { W.wait -= dt; if (W.wait <= 0) { const take = Math.min(S.surface, wcap); S.surface -= take; W.load = take; W.state = 'go'; } }
  else if (W.state === 'go') { W.x = Math.min(1, W.x + wspd * dt); if (W.x >= 1) { const v = W.load; W.load = 0; S.money += v; S.earned += v; if (g && v > 0) { g.float(785, ID_TOP - S.scroll + ID_SURF - 120, '+' + fmt(v), '#fde047', 18); g.sfx.coin(); } W.state = 'back'; } }
  else if (W.state === 'back') { W.x = Math.max(0, W.x - wspd * dt); if (W.x <= 0) W.state = 'idle'; }
  // 수입 추정 (병목 고려)
  const etrip = ((ID_SURF + S.shafts.length * ID_SH) / espd) * 2 + S.shafts.length * 0.4;
  const wtrip = 2 / wspd + 0.3;
  S.rateEst = Math.min(inc, ecap / etrip, wcap / wtrip);
  // 광맥 이벤트
  if (g) {
    if (S.nugget) { S.nugget.t -= dt; if (S.nugget.t <= 0) S.nugget = null; }
    else { S.nuggetT -= dt; if (S.nuggetT <= 0) { S.nuggetT = U.rand(35, 70); S.nugget = { i: U.randi(0, S.shafts.length - 1), x: U.rand(260, 640), t: 10 }; g.sfx.beep(1200, 0.1); } }
  }
}
function handleClick(g, mx, my) {
  if (my < ID_TOP) { if (g.inRect(840, 6, 110, 38, g.mouse)) { S.scroll = 1e9; g.sfx.click(); } return; }
  // 하단 패널
  if (my >= 598) {
    if (g.inRect(400, 602, 110, 34)) buyElev(g);
    else if (g.inRect(780, 602, 110, 34)) buyWh(g);
    else if (g.inRect(300, 602, 96, 34)) mgrAct(g, 'elev');
    else if (g.inRect(680, 602, 96, 34)) mgrAct(g, 'wh');
    return;
  }
  const wy = my - ID_TOP + S.scroll;
  // 광맥
  if (S.nugget) {
    const n = S.nugget, y = ID_SURF + n.i * ID_SH + 52;
    if (Math.hypot(mx - n.x, wy - y) < 34) {
      const bonus = Math.max(50, S.rateEst * 45);
      S.money += bonus; S.earned += bonus; S.nugget = null;
      g.float(mx, my, `✨ +${fmt(bonus)}`, '#fde047', 26); g.burst(mx, my, ['#fde047', '#facc15', '#fff'], 30, 260, 0.8, 4); g.sfx.power();
      return;
    }
  }
  // 운반차 / 엘리베이터
  if (wy < ID_SURF && wy > ID_SURF - 80 && mx > 200 && mx < 680) { if (S.wh.state === 'idle' && S.surface > 0) { S.wh.state = 'load'; S.wh.wait = 0.3; g.sfx.click(); } return; }
  if (mx >= 40 && mx <= 120 && wy > ID_SURF - 100) { if (S.elev.state === 'idle' && S.shafts.some((s) => s.stock > 0)) { S.elev.state = 'down'; S.elev.target = S.shafts.findIndex((s) => s.stock > 0); g.sfx.click(); } return; }
  // 갱도
  const i = Math.floor((wy - ID_SURF) / ID_SH);
  if (wy < ID_SURF || i < 0) return;
  if (i === S.shafts.length) {
    if (i < ID_ORES.length && mx > 150 && mx < 710) {
      const cost = idUnlock(i);
      if (S.money >= cost) { S.money -= cost; S.shafts.push(newShaft(i)); g.sfx.power(); g.burst(430, my, ['#a3e635', '#fde047'], 30, 260, 0.8, 4); say(`⛏️ ${ID_ORES[i].n} 광산 개장!`); }
      else { g.sfx.beep(200, 0.1); say(`돈이 부족해요 (${fmt(cost)}원 필요)`); }
    }
    return;
  }
  if (i >= S.shafts.length) return;
  const sh = S.shafts[i], ry = ID_SURF + i * ID_SH;
  if (mx >= 770 && mx <= 900 && wy >= ry + 14 && wy <= ry + 50) { buyShaft(g, i); return; }
  if (mx >= 770 && mx <= 900 && wy >= ry + 56 && wy <= ry + 92) { mgrAct(g, 'shaft', i); return; }
  if (mx >= 130 && mx <= 760) { if (!sh.mgr) { sh.active = 0.2; g.sfx.tone(300 + i * 40, 0.06, 'square', 0.05); g.burst(mx, my, '#a8a29e', 6, 100, 0.3, 3); } }
}
function bulk(costFn, L) {
  let n = S.buyN || 999, total = 0, k = 0;
  while (k < n) { const cst = costFn(L + k); if (total + cst > S.money) break; total += cst; k++; }
  if (S.buyN && k < S.buyN) return { k: 0, total: 0 };
  return { k, total };
}
function nextCost(costFn, L) { let n = S.buyN || 1, t = 0; for (let k = 0; k < n; k++) t += costFn(L + k); return t; }
function buyShaft(g, i) {
  const sh = S.shafts[i]; if (!sh) return;
  const b = bulk((L) => idShaftCost(i, L), sh.L);
  if (!b.k) { g.sfx.beep(200, 0.08); return; }
  const before = minersFor(sh.L), mb = Math.floor(sh.L / 25);
  S.money -= b.total; sh.L += b.k; g.sfx.coin();
  if (minersFor(sh.L) > before) say(`👷 ${ID_ORES[i].n} 광산에 광부 추가!`);
  if (Math.floor(sh.L / 25) > mb) { say(`🎉 ${ID_ORES[i].n} 광산 Lv.${sh.L} — 생산량 2배!`); g.sfx.power(); }
}
function buyElev(g) { const b = bulk(idUpCost, S.elev.L); if (!b.k) { g.sfx.beep(200, 0.08); return; } S.money -= b.total; S.elev.L += b.k; g.sfx.coin(); }
function buyWh(g) { const b = bulk(idUpCost, S.wh.L); if (!b.k) { g.sfx.beep(200, 0.08); return; } S.money -= b.total; S.wh.L += b.k; g.sfx.coin(); }
function mgrAct(g, kind, i) {
  const o = kind === 'shaft' ? S.shafts[i] : kind === 'elev' ? S.elev : S.wh;
  if (!o.mgr) {
    const cost = idMgrCost(kind, i);
    if (S.money < cost) { g.sfx.beep(200, 0.08); say(`매니저 고용에 ${fmt(cost)}원 필요`); return; }
    S.money -= cost; o.mgr = true; g.sfx.power(); say('👷 매니저 고용! 이제 자동으로 일해요'); return;
  }
  if (o.cd > 0) { g.sfx.beep(220, 0.06); return; }
  o.boost = 20; o.cd = 90; g.sfx.power(); say('⚡ 스킬 발동! 20초간 2배 속도');
}
// ───── 그리기 ─────
function drawShaft(g, sh, i) {
  const y = ID_SURF + i * ID_SH, ore = ID_ORES[i], c = g.ctx;
  g.rect(120, y + 6, 650, ID_SH - 12, ore.w);
  g.rect(120, y + 72, 650, 14, '#57534e');
  for (let k = 0; k < 6; k++) g.rect(160 + k * 105, y + 10, 8, 62, '#78350f');
  g.rect(150, y + 10, 600, 6, '#92400e');
  // 광맥 벽
  g.rect(720, y + 6, 50, ID_SH - 12, ore.c);
  for (let k = 0; k < 3; k++) g.emoji(ore.e, 735 + (k % 2) * 16, y + 26 + k * 20, 20);
  // 적재함
  g.rrect(128, y + 42, 54, 30, 5, '#57534e', '#292524', 2);
  g.text(fmt(sh.stock), 155, y + 57, 12, '#fde68a');
  // 광부
  sh.miners.forEach((m, k) => {
    const x = 200 + m.x * 480 + k * 6, yy = y + 56 - (k % 2) * 6;
    const dig = m.ph === 'dig';
    g.emoji(dig ? '⛏️' : '👷', x + (dig ? 18 : 0), yy - (dig ? 8 + Math.abs(Math.sin(S.t * 12 + k)) * 6 : Math.abs(Math.sin(S.t * 10 + k)) * 3), dig ? 22 : 26);
    if (dig) g.emoji('👷', x, yy, 26);
    if (m.carry > 0) g.emoji(ore.e, x - 14, yy - 14, 14);
    if (dig && Math.random() < 0.1) g.burst(x + 30, yy - 4, ore.c, 2, 80, 0.3, 3);
  });
  if (!sh.mgr && sh.miners.every((m) => m.ph === 'idle')) bounceHint(g, 420, y + 40);
  g.text(`${ore.n} 광산`, 140, y + 20, 13, '#e7e5e4', 'left');
  g.text(`${fmt(idRate(i, sh.L))}/초`, 640, y + 20, 12, '#fde68a', 'right', '500');
  if (sh.boost > 0) g.text(`⚡${Math.ceil(sh.boost)}`, 700, y + 20, 13, '#facc15', 'right');
  // 오른쪽 패널
  g.rect(770, y + 6, 190, ID_SH - 12, '#292524');
  const cost = nextCost((L) => idShaftCost(i, L), sh.L), can = S.money >= cost;
  g.rrect(776, y + 14, 124, 36, 8, can ? '#15803d' : '#44403c');
  g.text(`Lv.${sh.L} ⬆ ${fmt(cost)}`, 838, y + 32, 13, '#fff');
  mgrBtn(g, 776, y + 56, sh, idMgrCost('shaft', i));
  g.text(`👷×${sh.miners.length}`, 930, y + 32, 13, '#d6d3d1');
  g.text(`${i + 1}`, 930, y + 74, 12, '#78716c');
}
function mgrBtn(g, x, y, o, cost) {
  if (!o.mgr) { const can = S.money >= cost; g.rrect(x, y, 124, 36, 8, can ? '#1d4ed8' : '#3f3f46'); g.text(`👔 매니저 ${fmt(cost)}`, x + 62, y + 18, 12, '#fff'); return; }
  const ready = o.cd <= 0;
  g.rrect(x, y, 124, 36, 8, o.boost > 0 ? '#ca8a04' : ready ? '#7c3aed' : '#3f3f46');
  g.text(o.boost > 0 ? `⚡ 발동 ${Math.ceil(o.boost)}초` : ready ? '🧑‍💼 ⚡스킬' : `🧑‍💼 대기 ${Math.ceil(o.cd)}`, x + 62, y + 18, 12, '#fff');
}
function drawPanel(g, x, y, name, o, cost, kind) {
  g.rrect(x - 4, y - 4, 384, 46, 10, 'rgba(28,25,23,.95)', '#57534e', 2);
  g.text(`${name} Lv.${o.L}`, x + 6, y + 10, 13, '#fff', 'left');
  g.text(`용량 ${fmt(idCap(o.L))}`, x + 6, y + 28, 11, '#a8a29e', 'left', '500');
  // 매니저 버튼 (x+160) & 업그레이드 (x+260)
  const mx = x + 160;
  if (!o.mgr) { const mc = idMgrCost(kind), can = S.money >= mc; g.rrect(mx, y, 96, 34, 8, can ? '#1d4ed8' : '#3f3f46'); g.text(`👔 ${fmt(mc)}`, mx + 48, y + 17, 12, '#fff'); }
  else { const ready = o.cd <= 0; g.rrect(mx, y, 96, 34, 8, o.boost > 0 ? '#ca8a04' : ready ? '#7c3aed' : '#3f3f46'); g.text(o.boost > 0 ? `⚡${Math.ceil(o.boost)}초` : ready ? '⚡스킬' : `대기 ${Math.ceil(o.cd)}`, mx + 48, y + 17, 12, '#fff'); }
  const c2 = nextCost(idUpCost, o.L), can = S.money >= c2;
  g.rrect(x + 260, y, 110, 34, 8, can ? '#15803d' : '#44403c');
  g.text(`⬆ ${fmt(c2)}`, x + 315, y + 17, 13, '#fff');
}
