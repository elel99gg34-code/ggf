let S;
const FOC = 2000, HOR = 200, CAMH = 20, VEL = 600, GRAV = 9.8;
const MIS = [
  { n: '훈련장 표적', tg: 1, civ: 0, d: [150, 250], w: 0, mv: 0, t: 90, brief: '고정 표적 1개. 탄도 낙차를 익혀라.' },
  { n: '부두 감시', tg: 2, civ: 2, d: [200, 350], w: 2, mv: 0, t: 90, brief: '민간인을 피해 표적 2명 제거.' },
  { n: '바람 부는 언덕', tg: 2, civ: 2, d: [250, 400], w: 5, mv: 0, t: 90, brief: '강풍! 풍속 1m/s = 1밀 보정.' },
  { n: '움직이는 표적', tg: 2, civ: 3, d: [200, 400], w: 3, mv: 1, t: 90, brief: '걷는 표적. 비행시간만큼 앞을 겨눠라.' },
  { n: '시장 잠입', tg: 3, civ: 6, d: [250, 450], w: 4, mv: 1, t: 100, brief: '사람이 많다. 오인 사격 금지.' },
  { n: '창문 너머', tg: 3, civ: 3, d: [350, 550], w: 4, mv: 0, win: true, t: 100, brief: '건물 창문 안 표적. 먼 거리 주의.' },
  { n: '호송 차량', tg: 3, civ: 4, d: [300, 500], w: 6, mv: 2, t: 90, brief: '빠르게 이동하는 표적들.' },
  { n: '장거리 저격', tg: 3, civ: 3, d: [450, 650], w: 6, mv: 1, t: 110, brief: '600m 이상. 낙차가 크다.' },
  { n: '폭풍 속 작전', tg: 4, civ: 5, d: [300, 600], w: 9, mv: 1, gust: true, t: 110, brief: '돌풍으로 바람이 계속 변한다.' },
  { n: '최종 임무', tg: 5, civ: 6, d: [300, 700], w: 8, mv: 2, gust: true, win: true, t: 120, brief: '적 수뇌부 전원 제거.' },
];
GAME({
  title: '스나이퍼 엘리트', w: 960, h: 600, bg: '#0b1220', controls: 'dpad+ab', aLabel: '발사', bLabel: '숨참기',
  help: '마우스/방향키로 조준 · 클릭/Space 발사\nX/Shift 누르고 있으면 숨 참기(흔들림 감소, 4초)\n1/2 키: 스코프 배율 4배/8배\n🎯 낙차: 100m당 약 1.4밀 위로 · 바람: 1m/s당 1밀 바람 방향으로\n(스코프 눈금 1칸 = 1밀) · 민간인 사격 시 임무 실패',
  init(g) {
    S = { mi: 0, lives: 3, aim: { x: 480, y: 260 }, sway: 0, breath: 4, holding: false, zoom: 6, ents: [], fx: [], shots: [], blds: [], wind: 0, windT: 0,
      phase: 'brief', pt: 0, ammo: 0, killed: 0, timeL: 0, msg: '', stats: { shots: 0, hits: 0, heads: 0 } };
    setup(g);
  },
  update(g, dt) {
    const A = S.aim, M = MIS[S.mi];
    if (S.phase === 'brief') { if (g.pressed('a') || g.mouse.clicked) { S.phase = 'play'; g.sfx.click(); } return; }
    if (S.phase === 'done') { S.pt -= dt; if (S.pt <= 0) after(g); return; }
    if (g.mouse.moved) { A.x = g.mouse.x; A.y = g.mouse.y; }
    A.x = U.clamp(A.x + (g.right - g.left) * 220 * dt, 0, 960); A.y = U.clamp(A.y + (g.down - g.up) * 220 * dt, 0, 600);
    if (g.keyp('Digit1')) S.zoom = 4; if (g.keyp('Digit2')) S.zoom = 8;
    S.holding = g.b && S.breath > 0;
    if (S.holding) S.breath = Math.max(0, S.breath - dt); else S.breath = Math.min(4, S.breath + dt * (g.b ? 0.3 : 0.8));
    S.sway += dt;
    // 바람
    S.windT -= dt;
    if (M.gust && S.windT <= 0) { S.windT = U.rand(3, 6); S.windTarget = U.randi(-M.w, M.w); }
    if (M.gust) S.wind = U.lerp(S.wind, S.windTarget, dt * 0.8);
    S.timeL -= dt;
    // 엔티티 이동
    for (const e of S.ents) {
      if (!e.alive) { e.dt = (e.dt || 0) + dt; continue; }
      e.wait -= dt;
      if (e.panic) { e.wx += e.dir * e.sp * 2.6 * dt; if (Math.abs(e.wx) > halfW(e.d) + 5) { e.escaped = true; e.alive = false; } }
      else if (e.sp > 0 && e.wait <= 0) {
        e.wx += e.dir * e.sp * dt;
        if (Math.abs(e.wx) > halfW(e.d) * 0.8) { e.dir = -Math.sign(e.wx); e.wait = U.rand(0.5, 2); }
        if (Math.random() < dt * 0.15) { e.wait = U.rand(1, 3); if (Math.random() < 0.5) e.dir *= -1; }
      }
    }
    if (S.ents.some((e) => e.escaped && e.tg && !e.counted)) { S.ents.forEach((e) => e.escaped && (e.counted = true)); return fail(g, '표적이 도주했다!'); }
    // 사격
    const sw = sway();
    if ((g.pressed('a') || g.mouse.clicked) && S.ammo > 0 && !S.reload) fire(g, A.x + sw.x, A.y + sw.y);
    if (S.reload > 0) { S.reload -= dt; if (S.reload <= 0) { S.reload = 0; g.sfx.tone(300, 0.05, 'square', 0.05); g.sfx.tone(500, 0.05, 'square', 0.05, null, 0.12); } }
    for (const f of S.fx) f.t -= dt;
    S.fx = S.fx.filter((f) => f.t > 0);
    const left = S.ents.filter((e) => e.tg && e.alive).length;
    if (!left) { S.phase = 'done'; S.pt = 2.5; S.result = true; const tb = Math.max(0, Math.round(S.timeL)) * 50, ab = S.ammo * 300; g.add(2000 + tb + ab, 480, 300); S.msg = `임무 완료! 시간 보너스 ${tb} · 탄약 보너스 ${ab}`; g.sfx.win(); return; }
    if (S.timeL <= 0) return fail(g, '시간 초과!');
    if (S.ammo <= 0 && !S.shots.length && !S.reload) return fail(g, '탄약 소진!');
    g.info = `임무 ${S.mi + 1}/${MIS.length} · ${M.n} · 신뢰도 ${'★'.repeat(S.lives)}`;
  },
  draw(g, c) {
    const A = S.aim, sw = sway(), ax = A.x + sw.x, ay = A.y + sw.y;
    scene(g, c, false);
    c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(0, 0, 960, 600);
    // 스코프
    const R = 170;
    c.save(); c.beginPath(); c.arc(ax, ay, R, 0, Math.PI * 2); c.clip();
    c.translate(ax, ay); c.scale(S.zoom, S.zoom); c.translate(-ax, -ay);
    scene(g, c, true);
    c.restore();
    c.save(); c.beginPath(); c.arc(ax, ay, R, 0, Math.PI * 2); c.clip();
    const mil = (FOC / 1000) * S.zoom;
    g.line(ax - R, ay, ax + R, ay, '#000', 1.5); g.line(ax, ay - R, ax, ay + R, '#000', 1.5);
    for (let i = -12; i <= 12; i++) { if (!i) continue; const L = i % 5 === 0 ? 9 : 4; g.line(ax + i * mil, ay - L, ax + i * mil, ay + L, '#000', 1.5); g.line(ax - L, ay + i * mil, ax + L, ay + i * mil, '#000', 1.5); if (i % 5 === 0 && i > 0) { g.text(i, ax + 12, ay + i * mil, 10, '#111', 'left'); } }
    g.circle(ax, ay, 2, '#ef4444');
    c.restore();
    g.ring(ax, ay, R, '#111', 10); g.ring(ax, ay, R + 6, '#374151', 3);
    // 거리 측정
    const rd = rangeAt(ax, ay);
    g.text(rd ? `${Math.round(rd)}m` : '---', ax + R - 30, ay - R + 18, 16, '#4ade80');
    g.text(`×${S.zoom}`, ax - R + 26, ay - R + 18, 14, '#a3e635');
    // HUD
    const M = MIS[S.mi];
    g.rrect(10, 10, 220, 110, 10, 'rgba(0,0,0,.6)');
    g.text('🌬️ 바람', 30, 30, 14, '#cbd5e1', 'left');
    const w = S.wind;
    g.text(`${Math.abs(w).toFixed(1)} m/s ${w > 0.2 ? '→' : w < -0.2 ? '←' : ''}`, 120, 30, 16, Math.abs(w) > 5 ? '#f87171' : '#fde047', 'left');
    g.rect(30, 46, 180, 6, '#334155'); g.rect(120, 46, (w / 10) * 90, 6, '#fde047');
    g.text(`탄약 ${'▮'.repeat(S.ammo)}${S.reload ? ' (장전중)' : ''}`, 30, 70, 14, '#fbbf24', 'left');
    g.text(`표적 ${S.ents.filter((e) => e.tg && !e.alive).length}/${M.tg}`, 30, 92, 14, '#f87171', 'left');
    g.text(`⏱ ${Math.max(0, Math.ceil(S.timeL))}s`, 150, 92, 14, '#fff', 'left');
    g.rrect(740, 10, 210, 50, 10, 'rgba(0,0,0,.6)');
    g.text('숨', 760, 35, 14, '#93c5fd', 'left');
    g.rect(790, 28, 150, 14, '#1e293b'); g.rect(790, 28, (150 * S.breath) / 4, 14, S.holding ? '#60a5fa' : '#3b82f6');
    g.rrect(740, 66, 210, 64, 10, 'rgba(0,0,0,.6)');
    g.text('보정표 (밀)', 845, 80, 12, '#cbd5e1');
    g.text('200m↑2.7 400m↑5.4 600m↑8.2', 845, 100, 11, '#a7f3d0');
    g.text(`바람 ${w.toFixed(1)} → ${w > 0 ? '←' : '→'}${Math.abs(w).toFixed(1)}밀`, 845, 118, 11, '#fde68a');
    if (S.phase === 'brief') {
      g.rrect(230, 150, 500, 280, 16, 'rgba(2,6,23,.92)', '#4ade80', 2);
      g.text(`임무 ${S.mi + 1} — ${M.n}`, 480, 195, 28, '#4ade80');
      g.text(M.brief, 480, 245, 18, '#fff');
      g.text(`표적 ${M.tg}명 · 민간인 ${M.civ}명 · 거리 ${M.d[0]}~${M.d[1]}m`, 480, 285, 16, '#cbd5e1');
      g.text(`최대 풍속 ${M.w}m/s · 제한시간 ${M.t}초 · 탄약 ${S.ammo}발`, 480, 315, 16, '#cbd5e1');
      g.text('빨간 띠를 두른 🎯 표적만 쏘세요', 480, 350, 15, '#fca5a5');
      g.text('클릭 / Space 로 시작', 480, 395, 18, '#fde047');
    }
    if (S.phase === 'done') { g.rrect(220, 250, 520, 80, 14, 'rgba(0,0,0,.8)'); g.text(S.msg, 480, 290, 20, S.result ? '#4ade80' : '#f87171'); }
  },
});
function ppm(d) { return FOC / d; }
function halfW(d) { return (480 / ppm(d)); }
function groundY(d) { return HOR + CAMH * ppm(d); }
function sway() {
  const k = S.holding ? 0.15 : 1 + (S.breath <= 0 ? 1.5 : 0);
  const t = S.sway;
  return { x: (Math.sin(t * 1.3) * 5 + Math.sin(t * 3.1) * 2) * k / S.zoom * 3, y: (Math.cos(t * 1.7) * 4 + Math.sin(t * 2.3) * 2) * k / S.zoom * 3 };
}
function setup(g) {
  const M = MIS[S.mi];
  S.ents = []; S.fx = []; S.shots = []; S.reload = 0; S.sid = (S.sid || 0) + 1;
  S.wind = M.w ? U.randi(-M.w, M.w) * (Math.random() < 0.5 ? 1 : 0.6) : 0; S.windTarget = S.wind; S.windT = 3;
  S.ammo = M.tg + 3; S.timeL = M.t; S.phase = 'brief';
  S.blds = [];
  for (let i = 0; i < 9; i++) { const d = U.rand(M.d[0] + 30, 900); S.blds.push({ d, wx: U.rand(-halfW(d), halfW(d)), w: U.rand(14, 30), h: U.rand(12, 40), col: U.hsl(U.randi(200, 240), 10, U.randi(25, 45)) }); }
  S.blds.sort((a, b) => b.d - a.d);
  const mk = (tg) => {
    const d = U.rand(M.d[0], M.d[1]), hw = halfW(d) * 0.7;
    const e = { tg, d, wx: U.rand(-hw, hw), alive: true, e: tg ? U.choice(['🕴️', '🧔', '🥷']) : U.choice(['🧍', '🚶', '🧍‍♀️', '👩', '👴']), dir: U.choice([-1, 1]), wait: U.rand(0, 2), sp: 0, panic: false };
    if (M.mv) e.sp = (tg || Math.random() < 0.6) ? U.rand(1, 1.6) * M.mv : 0;
    if (M.win && tg && Math.random() < 0.6) { const b = S.blds.find((b) => b.d < d + 200 && b.d > d - 200) || S.blds[S.blds.length - 1]; e.d = b.d - 1; e.wx = b.wx + U.rand(-b.w / 3, b.w / 3); e.win = U.rand(4, b.h - 4); e.sp = 0; }
    S.ents.push(e);
  };
  for (let i = 0; i < M.tg; i++) mk(true);
  for (let i = 0; i < M.civ; i++) mk(false);
}
function rangeAt(x, y) {
  let best = null;
  for (const e of S.ents) { const p = ePos(e); if (Math.abs(x - p.x) < 6 && y > p.top - 6 && y < p.feet + 2) if (!best || e.d < best) best = e.d; }
  if (best) return best;
  for (const b of S.blds) { const s = ppm(b.d), bx = 480 + b.wx * s, gy = groundY(b.d); if (Math.abs(x - bx) < (b.w * s) / 2 && y < gy && y > gy - b.h * s) best = b.d; }
  if (best) return best;
  if (y > HOR + 2) return (CAMH * FOC) / (y - HOR);
  return null;
}
function ePos(e) { const s = ppm(e.d), gy = groundY(e.d) - (e.win || 0) * s; return { x: 480 + e.wx * s, feet: gy, top: gy - 1.8 * s, head: gy - 1.5 * s, s }; }
function fire(g, x, y) {
  S.ammo--; S.stats.shots++; S.reload = 1.1;
  g.sfx.noise(0.25, 0.25); g.sfx.tone(90, 0.3, 'sawtooth', 0.08, 40);
  g.shake(5, 0.15);
  const d0 = rangeAt(x, y) || 800;
  S.shots.push(1);
  const sid = S.sid;
  g.later(() => S.sid === sid && impact(g, x, y), d0 / VEL);
  // 주변 사람 놀람
  g.later(() => { if (S.sid !== sid || S.phase !== 'play') return; for (const e of S.ents) if (e.alive && !e.win && Math.random() < 0.5) { e.panic = e.tg ? Math.random() < 0.6 : true; if (e.panic) { e.dir = Math.sign(e.wx) || 1; e.sp = Math.max(e.sp, 1.5); } } }, d0 / VEL + 0.3);
}
function impact(g, x, y) {
  S.shots.pop();
  if (S.phase !== 'play') return;
  let hit = null, hp = null;
  for (const e of S.ents) {
    if (!e.alive) continue;
    const t = e.d / VEL, drop = 0.5 * GRAV * t * t, drift = S.wind * t * 0.6, s = ppm(e.d);
    const ix = x + drift * s, iy = y + drop * s;
    const p = ePos(e);
    const hw = Math.max(1.5, 0.28 * s);
    if (Math.abs(ix - p.x) < hw && iy > p.top && iy < p.feet) { if (!hit || e.d < hit.d) { hit = e; hp = { ix, iy, head: iy < p.head }; } }
  }
  const dd = hit ? hit.d : rangeAt(x, y) || 800, t = dd / VEL, s = ppm(dd);
  const ix = hp ? hp.ix : x + S.wind * t * 0.6 * s, iy = hp ? hp.iy : y + 0.5 * GRAV * t * t * s;
  S.fx.push({ x: ix, y: iy, t: 1.5, k: hit ? 'blood' : 'dust', s });
  if (!hit) { g.sfx.tone(1800, 0.05, 'sine', 0.02, 600); return; }
  hit.alive = false; hit.dt = 0;
  if (!hit.tg) { g.sfx.lose(); return fail(g, '민간인 피격! 임무 실패'); }
  S.stats.hits++;
  let pts = 1000 + Math.round(hit.d * 2);
  if (hp.head) { pts += 1500; S.stats.heads++; g.float(480, 160, '💀 헤드샷!', '#f87171', 30); }
  else g.float(480, 160, '표적 제거', '#4ade80', 26);
  if (hit.sp > 0 || hit.panic) { pts += 500; g.float(480, 195, '이동 표적 보너스', '#fde047', 18); }
  g.add(pts); g.sfx.hit(); g.sfx.tone(200, 0.2, 'square', 0.04, 80, 0.05);
}
function fail(g, msg) {
  if (S.phase !== 'play') return;
  S.lives--; S.phase = 'done'; S.pt = 2.5; S.result = false; S.msg = msg + (S.lives > 0 ? ` (재도전 ${S.lives}회 남음)` : '');
  g.shake(6, 0.3);
}
function after(g) {
  if (S.result) {
    S.mi++;
    if (S.mi >= MIS.length) { g.add(S.lives * 5000); return g.win(`모든 임무 완수! 명중 ${S.stats.hits}/${S.stats.shots} · 헤드샷 ${S.stats.heads}`); }
  } else if (S.lives <= 0) return g.over(`임무 ${S.mi + 1}에서 작전 종료 · 헤드샷 ${S.stats.heads}`);
  setup(g);
}
function scene(g, c, zoomed) {
  const M = MIS[S.mi];
  const gr = c.createLinearGradient(0, 0, 0, HOR);
  gr.addColorStop(0, S.mi >= 8 ? '#334155' : '#7dd3fc'); gr.addColorStop(1, S.mi >= 8 ? '#64748b' : '#e0f2fe');
  c.fillStyle = gr; c.fillRect(0, 0, 960, HOR);
  g.poly([[0, HOR], [120, 140], [260, 175], [420, 120], [600, 170], [760, 130], [960, 165], [960, HOR]], '#94a3b8');
  const gg = c.createLinearGradient(0, HOR, 0, 600); gg.addColorStop(0, '#a3a380'); gg.addColorStop(1, '#4d5d2a');
  c.fillStyle = gg; c.fillRect(0, HOR, 960, 400);
  for (const d of [100, 150, 200, 300, 400, 500, 600, 800]) { const y = groundY(d); g.line(0, y, 960, y, 'rgba(0,0,0,.08)', 1); if (zoomed) g.text(d + 'm', 6, y - 1, 2.5, 'rgba(0,0,0,.4)', 'left'); }
  // 건물 + 사람을 깊이순
  const items = [];
  for (const b of S.blds) items.push({ d: b.d, b });
  for (const e of S.ents) items.push({ d: e.d - 0.5, e });
  items.sort((a, b) => b.d - a.d);
  for (const it of items) {
    if (it.b) {
      const b = it.b, s = ppm(b.d), bx = 480 + b.wx * s, gy = groundY(b.d), w = b.w * s, h = b.h * s;
      g.rect(bx - w / 2, gy - h, w, h, b.col);
      for (let fy = 4; fy < b.h - 2; fy += 4) for (let fx = -b.w / 2 + 2; fx < b.w / 2 - 2; fx += 4) g.rect(bx + fx * s, gy - fy * s - 2 * s, 2 * s, 2 * s, 'rgba(250,240,180,.35)');
    } else {
      const e = it.e, p = ePos(e);
      if (!e.alive && !e.escaped) { c.save(); c.translate(p.x, p.feet); c.rotate(Math.min(1.5, e.dt * 4) * (e.dir || 1)); c.globalAlpha = Math.max(0.3, 1 - e.dt * 0.2); em(g, c, e.e, 0, -0.9 * p.s, 2 * p.s, zoomed); c.restore(); continue; }
      if (!e.alive) continue;
      if (e.win) g.rect(p.x - 0.8 * p.s, p.top - 0.3 * p.s, 1.6 * p.s, 2.1 * p.s, '#1e293b');
      c.save(); c.translate(p.x, p.feet); if (e.dir > 0) c.scale(-1, 1); em(g, c, e.panic ? '🏃' : e.e, 0, -0.9 * p.s, 2 * p.s, zoomed); c.restore();
      if (e.tg) { g.rect(p.x - 0.35 * p.s, p.top + 0.55 * p.s, 0.7 * p.s, 0.18 * p.s, '#ef4444'); if (!zoomed) g.circle(p.x, p.top - 3, 1.5, '#ef4444'); }
    }
  }
  // 깃발 (바람 표시)
  const fx = 880, fy = groundY(160);
  g.line(fx, fy, fx, fy - 30, '#e5e7eb', 2);
  const wv = S.wind, fl = Math.min(1, Math.abs(wv) / 8);
  g.poly([[fx, fy - 30], [fx + Math.sign(wv || 1) * (6 + fl * 18), fy - 27 + (1 - fl) * 8 + Math.sin(g.time * (4 + Math.abs(wv))) * 2], [fx, fy - 22]], '#ef4444');
  for (const f of S.fx) {
    c.globalAlpha = Math.min(1, f.t);
    if (f.k === 'dust') { g.circle(f.x, f.y, 0.6 + (1.5 - f.t) * 1.2, 'rgba(214,211,209,.8)'); g.circle(f.x, f.y, 0.4, '#fde047'); }
    else { g.circle(f.x, f.y, 0.3 * f.s + (1.5 - f.t), 'rgba(185,28,28,.7)'); }
    c.globalAlpha = 1;
  }
}
function em(g, c, ch, x, y, size, zoomed) {
  if (!zoomed) return g.emoji(ch, x, y, size);
  const Z = S.zoom;
  c.save(); c.translate(x, y); c.scale(1 / Z, 1 / Z); g.emoji(ch, 0, 0, size * Z); c.restore();
}
