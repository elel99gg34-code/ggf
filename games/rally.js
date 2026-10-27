'use strict';
let S;
const VW = 960, VH = 600, RW = 62, STEP = 12;
const SURF = {
  asphalt: { n: '아스팔트', road: '#4b5563', edge: '#e5e7eb', ground: '#4d7c0f', grip: 7.5, top: 1, dust: '#9ca3af' },
  gravel: { n: '자갈', road: '#a8a29e', edge: '#78716c', ground: '#65a30d', grip: 3.6, top: 0.92, dust: '#d6d3d1' },
  dirt: { n: '흙길', road: '#b45309', edge: '#78350f', ground: '#3f6212', grip: 3.2, top: 0.9, dust: '#d97706' },
  mud: { n: '진흙', road: '#57534e', edge: '#292524', ground: '#365314', grip: 2.6, top: 0.7, dust: '#44403c' },
  snow: { n: '눈길', road: '#e2e8f0', edge: '#94a3b8', ground: '#f8fafc', grip: 2.0, top: 0.84, dust: '#ffffff' },
  ice: { n: '빙판', road: '#bae6fd', edge: '#7dd3fc', ground: '#f1f5f9', grip: 0.95, top: 0.86, dust: '#e0f2fe' },
};
const STAGES = [
  { n: '포르투갈 · 숲길', s: ['gravel', 'dirt', 'gravel'], len: 700, tree: '🌲', seed: 11 },
  { n: '웨일스 · 진흙 계곡', s: ['dirt', 'mud', 'dirt', 'gravel'], len: 760, tree: '🌳', seed: 23 },
  { n: '스웨덴 · 설원', s: ['snow', 'snow', 'ice', 'snow'], len: 780, tree: '🌲', seed: 37 },
  { n: '코르시카 · 해안 도로', s: ['asphalt', 'asphalt', 'gravel', 'asphalt'], len: 820, tree: '🌴', seed: 41 },
  { n: '핀란드 · 호수 숲', s: ['gravel', 'dirt', 'gravel', 'mud', 'gravel'], len: 860, tree: '🌲', seed: 53 },
  { n: '몬테카를로 · 알프스', s: ['asphalt', 'snow', 'ice', 'asphalt', 'snow'], len: 900, tree: '🌲', seed: 67 },
];
const RIVALS = ['오지에', '뢰브', '타낙', '에반스', '뇌빌'];
GAME({
  title: '랠리 챔피언', w: VW, h: VH, bg: '#3f6212', controls: 'dpad+ab', aLabel: '사이드', bLabel: '브레이크',
  help: '↑ 가속 · ↓ 브레이크 · ←→ 조향 · Space/Shift 사이드브레이크\n노면마다 접지력이 달라요: 아스팔트 > 자갈·흙 > 진흙 > 눈 > 빙판\n코드라이버의 페이스노트(왼쪽 3, 오른쪽 헤어핀…)를 보고 미리 감속!\n나무·바위에 부딪히면 차가 손상 · 손상 100% = 리타이어\n6개 스테이지 종합 기록으로 챔피언을 노려라',
  init(g) { S = { st: 0, total: 0, rivals: RIVALS.map((n) => ({ n, t: 0 })), dmg: 0 }; loadStage(g); },
  update(g, dt) {
    if (S.msgT > 0) S.msgT -= dt;
    if (S.res) { S.res.t -= dt; if (S.res.t < 3 && (g.pressed('a') || g.mouse.clicked || S.res.t <= 0)) next(g); return; }
    if (S.count > 0) { S.count -= dt; if (Math.ceil(S.count) !== S.cb) { S.cb = Math.ceil(S.count); g.sfx.beep(S.count < 0.05 ? 880 : 520, 0.12); } return; }
    S.t += dt;
    const c = S.car, N = S.path.length;
    const n = near(c), seg = n.i;
    c.wp = seg;
    const sf = SURF[S.surf[seg]];
    const fx = Math.cos(c.a), fy = Math.sin(c.a), rx = -fy, ry = fx;
    let vf = c.vx * fx + c.vy * fy, vr = c.vx * rx + c.vy * ry;
    const off = n.d > RW, dm = 1 - S.dmg * 0.35;
    const top = 400 * sf.top * dm * (off ? 0.55 : 1);
    const steer = (g.right ? 1 : 0) - (g.left ? 1 : 0), hand = g.a;
    if (g.up) vf += 330 * (1 - Math.max(0, vf) / top) * dt * (sf.grip < 2 ? 0.7 : 1);
    else if (g.down || g.b) vf -= (vf > 0 ? 480 * Math.min(1, 0.5 + sf.grip / 8) : 180) * dt;
    else vf *= Math.pow(0.7, dt);
    if (off) vf *= Math.pow(0.4, dt);
    vf = U.clamp(vf, -120, top + 30);
    const sp = Math.hypot(vf, vr);
    c.sv = U.lerp(c.sv, steer, Math.min(1, dt * 9));
    c.a += c.sv * 2.5 * (hand ? 1.4 : 1) * U.clamp(sp / 130, 0, 1) * Math.sign(vf || 1) * dt;
    let grip = sf.grip * (off ? 0.8 : 1);
    if (hand) grip *= 0.25;
    vr *= Math.exp(-grip * dt);
    c.vx = fx * vf + rx * vr; c.vy = fy * vf + ry * vr;
    c.x += c.vx * dt; c.y += c.vy * dt;
    c.slip = sp > 90 ? Math.atan2(Math.abs(vr), Math.abs(vf)) : 0;
    // 먼지
    if (sp > 120 && g.frame % 2 === 0) { const p = scr(c.x - fx * 18, c.y - fy * 18); g.burst(p[0], p[1], off ? '#65a30d' : sf.dust, c.slip > 0.25 ? 3 : 1, 70, 0.6, 6); }
    if (c.slip > 0.25 && g.frame % 6 === 0) g.sfx.noise(0.05, 0.015);
    // 장애물
    for (const o of S.obs) {
      if (Math.abs(o.x - c.x) > 40 || Math.abs(o.y - c.y) > 40) continue;
      const d = U.dist(c.x, c.y, o.x, o.y), m = o.r + 14;
      if (d < m && d > 0) {
        const nx = (c.x - o.x) / d, ny = (c.y - o.y) / d, vn = c.vx * nx + c.vy * ny;
        c.x = o.x + nx * m; c.y = o.y + ny * m;
        if (vn < 0) {
          c.vx -= vn * nx * 1.4; c.vy -= vn * ny * 1.4; c.vx *= 0.5; c.vy *= 0.5;
          const hit = -vn;
          if (hit > 60) { S.dmg = Math.min(1, S.dmg + hit / 1600); g.sfx.hit(); g.shake(Math.min(12, hit / 25), 0.3); const p = scr(c.x, c.y); g.burst(p[0], p[1], ['#78350f', '#fde047', '#fff', '#94a3b8'], 14, 240, 0.5, 4); S.hits++; flash(`쾅! 손상 ${Math.round(S.dmg * 100)}%`, '#ef4444'); }
        }
      }
    }
    if (S.dmg >= 1) { S.dmg = 1; g.sfx.explode(); return g.over(`${STAGES[S.st].n}에서 리타이어 (차량 손상)`); }
    // 체크포인트
    if (S.cpi < S.cps.length && seg >= S.cps[S.cpi]) {
      const split = S.t, ref = S.gold * (S.cps[S.cpi] / N);
      flash(`스플릿 ${S.cpi + 1}: ${split.toFixed(2)}s (${split <= ref ? '-' : '+'}${Math.abs(split - ref).toFixed(2)})`, split <= ref ? '#22c55e' : '#fca5a5');
      S.cpi++; g.sfx.coin(); g.add(100);
    }
    // 노면 변화 알림
    if (S.surf[seg] !== S.lastSurf) { S.lastSurf = S.surf[seg]; flash(`노면: ${sf.n}`, '#fde047'); g.sfx.beep(660, 0.1); }
    // 페이스노트
    paceNotes(g, seg);
    // 골
    if (seg >= N - 6) finish(g);
    // 카메라 회전
    let da = (c.a + Math.PI / 2) - S.camA; da = ((da + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    S.camA += da * Math.min(1, dt * 3.5);
    g.info = `스테이지 ${S.st + 1}/${STAGES.length} · ${S.t.toFixed(1)}s · 손상 ${Math.round(S.dmg * 100)}%`;
  },
  draw(g, cx) {
    const c = S.car, St = STAGES[S.st];
    const sf = SURF[S.surf[c.wp || 0]];
    g.rect(0, 0, VW, VH, sf.ground);
    cx.save(); cx.translate(VW / 2, VH * 0.68); cx.rotate(-S.camA); cx.translate(-c.x, -c.y);
    // 지면 패턴
    const gx = Math.floor(c.x / 120) * 120, gy = Math.floor(c.y / 120) * 120;
    cx.fillStyle = 'rgba(0,0,0,.05)';
    for (let x = gx - 720; x < gx + 720; x += 120) for (let y = gy - 720; y < gy + 720; y += 120) if (((x + y) / 120) % 2 === 0) cx.fillRect(x, y, 120, 120);
    // 도로
    const i0 = Math.max(0, (c.wp || 0) - 70), i1 = Math.min(S.path.length - 1, (c.wp || 0) + 90);
    cx.lineCap = cx.lineJoin = 'round';
    for (const pass of [0, 1]) {
      let i = i0;
      while (i < i1) {
        const s = S.surf[i]; let j = i;
        while (j < i1 && S.surf[j] === s) j++;
        cx.beginPath(); cx.moveTo(S.path[i][0], S.path[i][1]); for (let k = i + 1; k <= j; k++) cx.lineTo(S.path[k][0], S.path[k][1]);
        cx.strokeStyle = pass ? SURF[s].road : SURF[s].edge; cx.lineWidth = pass ? RW * 2 : RW * 2 + 12; cx.stroke();
        i = j;
      }
    }
    // 바퀴자국
    cx.strokeStyle = 'rgba(0,0,0,.18)'; cx.lineWidth = 4; cx.beginPath();
    for (const m of S.skid) { cx.moveTo(m[0], m[1]); cx.lineTo(m[2], m[3]); }
    cx.stroke();
    // 체크/골
    for (let k = S.cpi; k < S.cps.length; k++) gateLine(g, cx, S.cps[k], '#22d3ee');
    gateLine(g, cx, S.path.length - 6, '#fde047');
    // 장애물
    for (const o of S.obs) if (Math.abs(o.x - c.x) < 700 && Math.abs(o.y - c.y) < 700) { cx.save(); cx.translate(o.x, o.y); cx.rotate(S.camA); g.emoji(o.e, 0, -o.r * 0.3, o.r * 2.4); cx.restore(); }
    for (const sp of S.fans) if (Math.abs(sp.x - c.x) < 700 && Math.abs(sp.y - c.y) < 700) { cx.save(); cx.translate(sp.x, sp.y); cx.rotate(S.camA); g.emoji(sp.e, 0, Math.sin(g.time * 8 + sp.x) * 2, 22); cx.restore(); }
    // 차
    cx.save(); cx.translate(c.x, c.y); cx.rotate(c.a);
    g.rrect(-22, -12, 46, 26, 6, 'rgba(0,0,0,.3)');
    cx.fillStyle = '#111'; cx.fillRect(-17, -14, 10, 5); cx.fillRect(-17, 9, 10, 5); cx.fillRect(8, -14, 10, 5); cx.fillRect(8, 9, 10, 5);
    g.rrect(-22, -11, 44, 22, 5, '#1d4ed8', '#0008', 1.5);
    cx.fillStyle = '#facc15'; cx.fillRect(-22, -3, 44, 6);
    g.rrect(-6, -9, 15, 18, 3, '#0f172a');
    cx.fillStyle = '#fff'; cx.fillRect(18, -9, 4, 5); cx.fillRect(18, 4, 4, 5);
    cx.fillStyle = '#fef9c3'; cx.globalAlpha = 0.18; cx.beginPath(); cx.moveTo(22, -8); cx.lineTo(140, -50); cx.lineTo(140, 50); cx.lineTo(22, 8); cx.fill(); cx.globalAlpha = 1;
    if (S.dmg > 0.4) { cx.fillStyle = 'rgba(30,30,30,.5)'; cx.beginPath(); cx.arc(10, 0, 8, 0, 7); cx.fill(); }
    cx.restore();
    cx.restore();
    if (St.s.includes('snow') || St.s.includes('ice')) for (let i = 0; i < 40; i++) { const x = (i * 97 + g.time * 40 * (1 + i % 3)) % VW, y = (i * 53 + g.time * 90 * (1 + (i % 4) * 0.3)) % VH; g.circle(x, y, 1.5 + (i % 3), 'rgba(255,255,255,.8)'); }
    if (S.dmg > 0.5 && g.frame % 5 === 0) g.burst(VW / 2, VH * 0.68 - 10, 'rgba(60,60,60,.6)', 1, 40, 0.8, 8);
    hud(g, cx);
  },
});
function rng(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
function loadStage(g) {
  const St = STAGES[S.st], R = rng(St.seed);
  S.path = []; S.surf = [];
  let x = 0, y = 0, h = -Math.PI / 2, turn = 0, len = 0;
  const base = -Math.PI / 2;
  for (let i = 0; i < St.len; i++) {
    if (len <= 0) {
      len = 15 + Math.floor(R() * 40);
      const r = R();
      turn = r < 0.3 ? 0 : (R() < 0.5 ? -1 : 1) * (r < 0.6 ? 0.012 : r < 0.85 ? 0.03 : 0.055) * (1 + S.st * 0.08);
      if (i < 25) turn = 0;
    }
    len--;
    h += turn;
    if (h < base - 1.35) { h = base - 1.35; turn = Math.abs(turn); }
    if (h > base + 1.35) { h = base + 1.35; turn = -Math.abs(turn); }
    x += Math.cos(h) * STEP; y += Math.sin(h) * STEP;
    S.path.push([x, y]);
    S.surf.push(St.s[Math.min(St.s.length - 1, Math.floor((i / St.len) * St.s.length))]);
  }
  S.tan = S.path.map((p, i) => { const q = S.path[Math.min(S.path.length - 1, i + 1)], o = S.path[Math.max(0, i - 1)]; return Math.atan2(q[1] - o[1], q[0] - o[0]); });
  // 장애물 (나무/바위) & 관중
  S.obs = []; S.fans = [];
  for (let i = 10; i < S.path.length; i += 3) {
    for (const side of [-1, 1]) {
      if (R() < 0.55) {
        const o = RW + 40 + R() * 160, [px, py] = S.path[i], a = S.tan[i];
        const ox = px - Math.sin(a) * o * side, oy = py + Math.cos(a) * o * side;
        if (minDist(ox, oy, i) > RW + 30) S.obs.push({ x: ox, y: oy, r: 14 + R() * 6, e: R() < 0.8 ? St.tree : U.choice(['🪨', '🪵', '🌾']) });
      }
    }
    if (i % 45 === 0) { const [px, py] = S.path[i], a = S.tan[i], side = R() < 0.5 ? -1 : 1; for (let k = 0; k < 4; k++) S.fans.push({ x: px - Math.sin(a) * (RW + 22) * side + Math.cos(a) * k * 20, y: py + Math.cos(a) * (RW + 22) * side + Math.sin(a) * k * 20, e: U.choice(['🙋', '🙋‍♂️', '📸', '🧑‍🦱', '🇰🇷']) }); }
  }
  // 몇 개의 도로 위 장애물(바위)
  for (let i = 120; i < S.path.length - 40; i += 170 + Math.floor(R() * 80)) { const [px, py] = S.path[i], a = S.tan[i], o = (R() - 0.5) * RW * 1.2; S.obs.push({ x: px - Math.sin(a) * o, y: py + Math.cos(a) * o, r: 11, e: '🪨' }); }
  const N = S.path.length;
  S.cps = [Math.floor(N * 0.33), Math.floor(N * 0.66)];
  // 목표 시간 (노면별 추정)
  let est = 0; for (let i = 0; i < N; i++) { const sf = SURF[S.surf[i]]; const k = Math.abs(S.tan[Math.min(N - 1, i + 6)] - S.tan[i]); est += STEP / (330 * sf.top * (1 - Math.min(0.5, k * 1.6)) * (0.75 + Math.min(1, sf.grip / 7) * 0.25)); }
  S.gold = Math.round(est * 10) / 10; S.silver = Math.round(est * 1.1 * 10) / 10; S.bronze = Math.round(est * 1.22 * 10) / 10;
  const [x0, y0] = S.path[0];
  S.car = { x: x0, y: y0 + 40, a: -Math.PI / 2, vx: 0, vy: 0, sv: 0, slip: 0, wp: 0 };
  Object.assign(S, { t: 0, cpi: 0, count: 3.5, cb: 4, camA: 0, res: null, skid: [], hits: 0, note: null, noteAt: -1, lastSurf: null, msg: '', msgT: 0 });
}
function minDist(x, y, i) { let b = 1e9; for (let k = Math.max(0, i - 25); k < Math.min(S.path.length, i + 25); k++) b = Math.min(b, Math.hypot(S.path[k][0] - x, S.path[k][1] - y)); return b; }
function near(c) { let b = 1e12, bi = c.wp || 0; for (let k = Math.max(0, (c.wp || 0) - 30); k < Math.min(S.path.length, (c.wp || 0) + 30); k++) { const d = (S.path[k][0] - c.x) ** 2 + (S.path[k][1] - c.y) ** 2; if (d < b) { b = d; bi = k; } } if (S.car === c && c.slip > 0.25 && g_frame() % 2 === 0) skid(c); return { i: bi, d: Math.sqrt(b) }; }
function g_frame() { return (S.fr = (S.fr || 0) + 1); }
function skid(c) {
  const fx = Math.cos(c.a), fy = Math.sin(c.a);
  for (const s of [-1, 1]) { const bx = c.x - fx * 14 - fy * 9 * s, by = c.y - fy * 14 + fx * 9 * s, k = 'l' + s; if (c[k] && Math.hypot(c[k][0] - bx, c[k][1] - by) < 40) S.skid.push([c[k][0], c[k][1], bx, by]); c[k] = [bx, by]; }
  if (S.skid.length > 700) S.skid.splice(0, 50);
}
function paceNotes(g, i) {
  const N = S.path.length, ahead = Math.min(N - 1, i + 22);
  if (ahead <= S.noteAt) return;
  // ahead 이후 구간의 회전량
  const end = Math.min(N - 1, ahead + 20);
  let d = S.tan[end] - S.tan[ahead]; d = ((d + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  const a = Math.abs(d);
  if (a < 0.25) return;
  const dir = d < 0 ? '왼쪽' : '오른쪽', sev = a > 0.9 ? '헤어핀' : a > 0.65 ? '2' : a > 0.45 ? '3' : '5';
  S.note = { t: `${dir} ${sev}`, dir: d < 0 ? -1 : 1, sev, life: 2.2 };
  S.noteAt = end;
  g.sfx.tone(sev === '헤어핀' ? 300 : 600, 0.08, 'triangle', 0.05); g.sfx.tone(sev === '헤어핀' ? 250 : 500, 0.08, 'triangle', 0.05, null, 0.1);
}
function gateLine(g, cx, i, col) {
  const [px, py] = S.path[i], a = S.tan[i];
  cx.save(); cx.translate(px, py); cx.rotate(a); cx.fillStyle = col; cx.globalAlpha = 0.8; cx.fillRect(-4, -RW, 8, RW * 2); cx.globalAlpha = 1;
  g.circle(0, -RW - 8, 6, col); g.circle(0, RW + 8, 6, col); cx.restore();
}
function finish(g) {
  const t = S.t, medal = t <= S.gold ? '🥇' : t <= S.silver ? '🥈' : t <= S.bronze ? '🥉' : '';
  S.total += t;
  const rows = S.rivals.map((r, k) => { const rt = S.gold * (0.97 + k * 0.035 + Math.random() * 0.05 + S.st * 0.002); r.t += rt; return { n: r.n, t: rt }; });
  rows.push({ n: '나', t, me: true }); rows.sort((a, b) => a.t - b.t);
  const pos = rows.findIndex((r) => r.me) + 1;
  const pts = medal === '🥇' ? 3000 : medal === '🥈' ? 2000 : medal === '🥉' ? 1200 : 300;
  const gain = pts + Math.max(0, Math.round((S.bronze - t) * 50)) + (S.hits === 0 ? 500 : 0);
  g.add(gain);
  S.res = { t, medal, rows, pos, gain, clean: S.hits === 0, time: 0 };
  S.res.t = 7;
  medal ? g.sfx.win() : g.sfx.lose();
  if (medal) g.burst(VW / 2, 200, ['#fde047', '#fff', '#60a5fa'], 40, 350, 1, 5);
  S.dmg = Math.max(0, S.dmg - 0.3);
}
function next(g) {
  if (!S.res.medal) return g.over(`${STAGES[S.st].n}: 제한 시간 초과 (브론즈 ${S.bronze}s)`);
  S.st++;
  if (S.st >= STAGES.length) {
    const st = S.rivals.map((r) => r.t).concat([S.total]).sort((a, b) => a - b), pos = st.indexOf(S.total) + 1;
    g.add([5000, 3000, 2000, 1000, 500, 0][pos - 1]);
    return pos === 1 ? g.win(`🏆 랠리 챔피언! 종합 ${S.total.toFixed(1)}s`) : g.win(`종합 ${pos}위 완주 · ${S.total.toFixed(1)}s`);
  }
  loadStage(g);
}
function scr(x, y) { const dx = x - S.car.x, dy = y - S.car.y, ca = Math.cos(-S.camA), sa = Math.sin(-S.camA); return [VW / 2 + dx * ca - dy * sa, VH * 0.68 + dx * sa + dy * ca]; }
function flash(t, c) { S.msg = t; S.msgC = c; S.msgT = 2.2; }
function hud(g, c) {
  const car = S.car, sp = Math.hypot(car.vx, car.vy), sf = SURF[S.surf[car.wp || 0]];
  g.rrect(12, 12, 230, 96, 14, 'rgba(0,0,0,.55)');
  g.text(STAGES[S.st].n, 127, 32, 15, '#fde047');
  g.text(S.t.toFixed(2) + 's', 127, 64, 30, '#fff');
  g.text(`🥇${S.gold} 🥈${S.silver} 🥉${S.bronze}`, 127, 94, 12, '#e2e8f0');
  g.rrect(VW - 200, VH - 104, 188, 92, 14, 'rgba(0,0,0,.55)');
  g.text(Math.round(sp * 0.55) + ' km/h', VW - 106, VH - 78, 24, '#fff');
  g.text(`노면: ${sf.n}`, VW - 106, VH - 50, 14, '#fde047');
  g.rect(VW - 180, VH - 32, 150, 10, '#334155'); g.rect(VW - 180, VH - 32, 150 * S.dmg, 10, S.dmg > 0.6 ? '#ef4444' : '#f97316'); g.text('손상', VW - 196, VH - 27, 11, '#cbd5e1');
  // 진행
  const N = S.path.length, pr = (car.wp || 0) / N;
  g.rect(VW - 26, 130, 10, 300, 'rgba(0,0,0,.4)'); g.rect(VW - 26, 430 - 300 * pr, 10, 300 * pr, '#22c55e');
  for (const cp of S.cps) g.rect(VW - 30, 430 - 300 * cp / N, 18, 3, '#22d3ee');
  g.emoji('🏁', VW - 21, 118, 18);
  // 페이스노트
  if (S.note && S.note.life > 0) {
    const nowT = performance.now(); S.note.life -= Math.min(0.05, (nowT - (S.note.lastT || nowT)) / 1000); S.note.lastT = nowT;
    const n = S.note, hp = n.sev === '헤어핀';
    g.rrect(VW / 2 - 130, 16, 260, 74, 14, hp ? 'rgba(220,38,38,.85)' : 'rgba(0,0,0,.65)', '#fff', 2);
    c.save(); c.translate(VW / 2 - 85, 53); c.scale(n.dir, 1);
    c.strokeStyle = '#fff'; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); c.moveTo(-14, 20); c.lineTo(-14, -2);
    c.quadraticCurveTo(-14, -18, hp ? -2 : 6, -18); if (hp) c.quadraticCurveTo(14, -18, 14, 4); c.stroke();
    c.restore();
    g.text(`🗣️ ${n.t}`, VW / 2 + 20, 53, 26, '#fff');
  }
  if (S.msgT > 0) { c.globalAlpha = Math.min(1, S.msgT); g.text(S.msg, VW / 2, 130, 22, S.msgC); c.globalAlpha = 1; }
  if (S.count > 0) { g.text(Math.ceil(S.count), VW / 2, VH / 2 - 60, 100, '#fff'); g.text(STAGES[S.st].n, VW / 2, VH / 2 + 20, 26, '#fde047'); }
  if (S.res) {
    const R = S.res;
    g.rrect(250, 70, 460, 460, 20, 'rgba(15,23,42,.94)', '#fde047', 3);
    g.text(`${R.medal || '❌'} ${R.t.toFixed(2)}s`, VW / 2, 115, 34, R.medal ? '#fde047' : '#ef4444');
    g.text(`스테이지 ${R.pos}위 · +${R.gain}점${R.clean ? ' · 무사고 보너스!' : ''}`, VW / 2, 155, 16, '#e2e8f0');
    R.rows.forEach((r, i) => { const y = 195 + i * 32; if (r.me) g.rect(270, y - 14, 420, 28, 'rgba(37,99,235,.4)'); g.text(`${i + 1}. ${r.n}`, 300, y, 17, '#fff', 'left'); g.text(r.t.toFixed(2) + 's', 660, y, 17, '#cbd5e1', 'right'); });
    const st = S.rivals.map((r) => ({ n: r.n, t: r.t })).concat([{ n: '나', t: S.total }]).sort((a, b) => a.t - b.t);
    g.text(`종합 순위: ${st.findIndex((s) => s.n === '나') + 1}위 / 6`, VW / 2, 410, 20, '#22d3ee');
    g.text(R.medal ? 'Space: 다음 스테이지' : '브론즈 기록 실패…', VW / 2, 470, 16, '#94a3b8');
  }
}
