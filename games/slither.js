let S;
const WR = 2200;
const SN = ['지렁이왕', '꿈틀이', 'Noodle', '스파게티', 'Wormy', '뱀뱀', '라면', '젤리빈', '국수', 'Slinky', '무지개', '꼬리꼬리'];
GAME({
  title: '지렁이 대작전', w: 1000, h: 680, bg: '#10131c', controls: 'ab', aLabel: '⚡',
  help: '마우스 방향으로 이동 (터치: 드래그 방향)\n클릭 꾹 / Space = 부스트 (몸이 줄어들어요)\n다른 지렁이 몸통에 머리가 닿으면 사망!\n상대를 내 몸에 박게 만들면 먹이가 폭발적으로 생겨요',
  init(g) {
    S = { food: [], snakes: [], cam: { x: 0, y: 0, z: 1 }, kills: 0 };
    S.me = mkSnake(0, 0, '나', 200, true);
    S.snakes.push(S.me);
    for (let i = 0; i < 12; i++) { const a = U.rand(Math.PI * 2), r = U.rand(400, WR - 200); S.snakes.push(mkSnake(Math.cos(a) * r, Math.sin(a) * r, SN[i], U.rand(10, 300) * 1.0 + 60)); }
    for (let i = 0; i < 1100; i++) addFood();
  },
  update(g, dt) {
    const me = S.me;
    if (!me.dead) {
      const tx = (g.mouse.x - g.W / 2) / S.cam.z + me.x, ty = (g.mouse.y - g.H / 2) / S.cam.z + me.y;
      if (g.mouse.moved || matchMedia('(pointer: coarse)').matches) me.ta = U.angle(me.x, me.y, tx, ty);
      if (g.left) me.ta = me.a - 0.5; if (g.right) me.ta = me.a + 0.5;
      me.boost = (g.a || (g.mouse.down && !matchMedia('(pointer: coarse)').matches)) && me.len > 40;
    }
    for (const s of S.snakes) { if (s.dead) continue; if (!s.me) ai(s, dt); move(s, dt); }
    // 충돌
    for (const s of S.snakes) {
      if (s.dead) continue;
      if (Math.hypot(s.x, s.y) > WR) { kill(g, s, null); continue; }
      const hr = width(s);
      for (const o of S.snakes) {
        if (o === s || o.dead) continue;
        if (Math.abs(o.x - s.x) > 1500 || Math.abs(o.y - s.y) > 1500) continue;
        const ow = width(o);
        for (let i = 0; i < o.pts.length; i += 2) { const p = o.pts[i]; if (Math.abs(p.x - s.x) < hr + ow && U.dist(p.x, p.y, s.x, s.y) < hr * 0.6 + ow * 0.8) { kill(g, s, o); break; } }
        if (s.dead) break;
      }
    }
    // 먹이
    for (const s of S.snakes) {
      if (s.dead) continue;
      const r = width(s) + 14;
      for (const f of S.food) if (!f.dead && Math.abs(f.x - s.x) < r && Math.abs(f.y - s.y) < r) { f.dead = true; s.len += f.v; if (s.me) { if (g.frame % 2) g.sfx.tone(900 + Math.random() * 300, 0.03, 'sine', 0.02); } }
      if (s.boost && Math.random() < dt * 8) { s.len -= 1.5; const t = s.pts[s.pts.length - 1]; if (t) S.food.push({ x: t.x, y: t.y, v: 1, c: s.col, r: 5 }); }
    }
    S.food = S.food.filter((f) => !f.dead);
    while (S.food.length < 1100) addFood();
    if (S.food.length > 2200) S.food.splice(0, S.food.length - 2200);
    S.snakes.forEach((s, i) => { if (s.dead && !s.me) { s.respawn = (s.respawn ?? 4) - dt; if (s.respawn <= 0) { const a = U.rand(Math.PI * 2), r = U.rand(600, WR - 200); S.snakes[i] = mkSnake(Math.cos(a) * r, Math.sin(a) * r, s.name, U.rand(60, 250)); } } });
    if (me.dead) { if (!S.ended) { S.ended = true; g.later(() => g.over(`길이 ${Math.round(S.maxLen)} · 처치 ${S.kills}`), 1); } }
    else {
      S.maxLen = Math.max(S.maxLen || 0, me.len);
      g.score = Math.round(S.maxLen) + S.kills * 100;
      S.cam.x += (me.x - S.cam.x) * Math.min(1, dt * 8); S.cam.y += (me.y - S.cam.y) * Math.min(1, dt * 8);
      const tz = U.clamp(1.1 - me.len / 3000, 0.45, 1); S.cam.z += (tz - S.cam.z) * dt;
      const rank = S.snakes.filter((s) => !s.dead).sort((a, b) => b.len - a.len);
      S.rank = rank;
      g.info = `길이 ${Math.round(me.len)} · ${rank.indexOf(me) + 1}위 · 처치 ${S.kills}`;
    }
  },
  draw(g, c) {
    const z = S.cam.z;
    c.save(); c.translate(g.W / 2, g.H / 2); c.scale(z, z); c.translate(-S.cam.x, -S.cam.y);
    const vx0 = S.cam.x - g.W / 2 / z - 50, vx1 = S.cam.x + g.W / 2 / z + 50, vy0 = S.cam.y - g.H / 2 / z - 50, vy1 = S.cam.y + g.H / 2 / z + 50;
    // 육각 배경
    c.strokeStyle = '#1b2030'; c.lineWidth = 2;
    for (let y = Math.floor(vy0 / 52) * 52; y < vy1; y += 52) for (let x = Math.floor(vx0 / 60) * 60; x < vx1; x += 60) { const ox = (Math.round(y / 52) % 2) * 30; c.beginPath(); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + Math.PI / 6; c.lineTo(x + ox + Math.cos(a) * 30, y + Math.sin(a) * 30); } c.closePath(); c.stroke(); }
    g.ring(0, 0, WR, '#ef4444', 8);
    for (const f of S.food) if (f.x > vx0 && f.x < vx1 && f.y > vy0 && f.y < vy1) { c.globalAlpha = 0.25; g.circle(f.x, f.y, f.r * 2, f.c); c.globalAlpha = 1; g.circle(f.x, f.y, f.r, f.c); }
    for (const s of S.snakes) {
      if (s.dead) continue;
      const w = width(s);
      for (let i = s.pts.length - 1; i >= 0; i -= 1) {
        const p = s.pts[i]; if (p.x < vx0 || p.x > vx1 || p.y < vy0 || p.y > vy1) continue;
        g.circle(p.x, p.y, w, i % 6 < 3 ? s.col : s.col2);
      }
      if (s.boost) { c.globalAlpha = 0.3; g.circle(s.x, s.y, w * 1.8, s.col); c.globalAlpha = 1; }
      g.circle(s.x, s.y, w * 1.05, s.col);
      const ea = s.a;
      for (const sd of [-1, 1]) { const ex = s.x + Math.cos(ea + sd * 0.6) * w * 0.6, ey = s.y + Math.sin(ea + sd * 0.6) * w * 0.6; g.circle(ex, ey, w * 0.38, '#fff'); g.circle(ex + Math.cos(ea) * w * 0.15, ey + Math.sin(ea) * w * 0.15, w * 0.2, '#111'); }
      if (!s.me) g.text(s.name, s.x, s.y - w - 14, 14, 'rgba(255,255,255,.7)');
    }
    c.restore();
    if (S.rank) { g.rrect(g.W - 190, 10, 180, 30 + Math.min(10, S.rank.length) * 20, 10, 'rgba(0,0,0,.5)'); g.text('🏆 순위', g.W - 100, 26, 15, '#fff'); S.rank.slice(0, 10).forEach((s, i) => g.text(`${i + 1}. ${s.name} ${Math.round(s.len)}`, g.W - 180, 50 + i * 20, 14, s.me ? '#fde047' : '#cbd5e1', 'left', s.me ? 'bold' : 'normal')); }
    const mm = 110; g.circle(70, g.H - 70, mm / 2, 'rgba(255,255,255,.08)'); g.ring(70, g.H - 70, mm / 2, 'rgba(255,255,255,.3)', 1);
    if (!S.me.dead) g.circle(70 + (S.me.x / WR) * mm / 2, g.H - 70 + (S.me.y / WR) * mm / 2, 3, '#fde047');
  },
});
const SCOL = [['#f43f5e', '#fb7185'], ['#f97316', '#fdba74'], ['#eab308', '#fde047'], ['#22c55e', '#86efac'], ['#06b6d4', '#67e8f9'], ['#8b5cf6', '#c4b5fd'], ['#ec4899', '#f9a8d4'], ['#14b8a6', '#5eead4']];
function mkSnake(x, y, name, len, me) {
  const [col, col2] = me ? ['#3b82f6', '#93c5fd'] : U.choice(SCOL);
  const s = { x, y, a: U.rand(Math.PI * 2), ta: 0, len, pts: [], col, col2, name, me, boost: false, think: 0 };
  s.ta = s.a;
  for (let i = 0; i < 20; i++) s.pts.push({ x: x - Math.cos(s.a) * i * 6, y: y - Math.sin(s.a) * i * 6 });
  return s;
}
function width(s) { return 8 + Math.min(22, Math.sqrt(s.len) * 0.6); }
function addFood() { const a = U.rand(Math.PI * 2), r = Math.sqrt(Math.random()) * (WR - 30); S.food.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, v: U.choice([1, 1, 1, 2, 3]), c: U.choice(['#f43f5e', '#f97316', '#facc15', '#4ade80', '#22d3ee', '#a78bfa', '#f472b6']), r: U.rand(4, 7) }); }
function move(s, dt) {
  let d = ((s.ta - s.a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  const turn = 4.2 / (1 + s.len / 1500);
  s.a += U.clamp(d, -turn * dt, turn * dt);
  const sp = s.boost ? 380 : 190;
  s.x += Math.cos(s.a) * sp * dt; s.y += Math.sin(s.a) * sp * dt;
  const seg = 6, last = s.pts[0];
  if (U.dist(last.x, last.y, s.x, s.y) >= seg) s.pts.unshift({ x: s.x, y: s.y });
  const n = Math.floor(10 + s.len / 3);
  while (s.pts.length > n) s.pts.pop();
}
function kill(g, s, by) {
  s.dead = true;
  for (let i = 0; i < s.pts.length; i += 2) { const p = s.pts[i]; S.food.push({ x: p.x + U.rand(-8, 8), y: p.y + U.rand(-8, 8), v: Math.max(1, Math.round(s.len / s.pts.length * 1.6)), c: s.col, r: 7 + Math.random() * 3 }); }
  if (by && by.me) { S.kills++; g.sfx.explode(); g.float(g.W / 2, g.H / 2 - 100, `${s.name} 처치!`, '#fde047', 28); }
  if (s.me) { g.sfx.lose(); g.shake(12); }
}
function ai(s, dt) {
  s.think -= dt;
  if (s.think > 0) return;
  s.think = U.rand(0.1, 0.3);
  const look = width(s) * 4 + 60;
  // 위험 회피: 앞쪽 3방향 샘플
  const danger = (a) => { const px = s.x + Math.cos(a) * look, py = s.y + Math.sin(a) * look; if (Math.hypot(px, py) > WR - 60) return 1; for (const o of S.snakes) { if (o === s || o.dead || Math.abs(o.x - s.x) > 600 || Math.abs(o.y - s.y) > 600) continue; for (let i = 0; i < o.pts.length; i += 3) if (U.dist(o.pts[i].x, o.pts[i].y, px, py) < width(o) + width(s) + 10) return 1; } return 0; };
  if (danger(s.a)) { const l = danger(s.a - 0.8), r = danger(s.a + 0.8); s.ta = s.a + (l && !r ? 1.2 : !l && r ? -1.2 : U.choice([-1.5, 1.5])); s.boost = false; return; }
  let best = null, bs = 0;
  for (let k = 0; k < 30; k++) { const f = S.food[(Math.random() * S.food.length) | 0]; const d = U.dist(f.x, f.y, s.x, s.y); const sc = f.v / (d + 30); if (d < 500 && sc > bs) { bs = sc; best = f; } }
  const me = S.me;
  if (!me.dead && s.len > me.len * 0.8 && U.dist(s.x, s.y, me.x, me.y) < 400 && Math.random() < 0.4) { s.ta = U.angle(s.x, s.y, me.x + Math.cos(me.a) * 120, me.y + Math.sin(me.a) * 120); s.boost = s.len > 80 && Math.random() < 0.5; return; }
  s.boost = false;
  if (best) s.ta = U.angle(s.x, s.y, best.x, best.y); else s.ta = s.a + U.rand(-0.5, 0.5);
}
