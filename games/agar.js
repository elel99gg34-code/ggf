let S;
const WORLD = 3000;
const NAMES = ['꼬물이', '세포왕', '먹보', 'Blob', '아메바', '젤리', '푸딩', '방울이', 'Nom', '단세포', '미토콘', '핵심', 'Cellz', '말랑이', '구슬'];
GAME({
  title: '세포 키우기', w: 1000, h: 680, bg: '#f2f5f9', controls: 'ab', aLabel: '✂️', bLabel: '💨',
  help: '마우스 방향으로 이동 (터치: 드래그)\nSpace = 분열 (반으로 나뉘어 돌진) · W/X = 질량 발사\n나보다 10% 이상 작은 세포를 먹을 수 있어요\n🌵 바이러스는 큰 세포를 터뜨려요! 순위 1위를 노려라',
  init(g) {
    S = { cells: [], food: [], virus: [], ejects: [], bots: [], cam: { x: WORLD / 2, y: WORLD / 2, z: 1 }, t: 0, rank: [] };
    S.me = [{ x: WORLD / 2, y: WORLD / 2, m: 20, vx: 0, vy: 0, merge: 0 }];
    for (let i = 0; i < 900; i++) addFood();
    for (let i = 0; i < 18; i++) S.virus.push({ x: U.rand(100, WORLD - 100), y: U.rand(100, WORLD - 100), m: 100 });
    for (let i = 0; i < 14; i++) addBot(i);
  },
  update(g, dt) {
    S.t += dt;
    const tx = (g.mouse.x - g.W / 2) / S.cam.z + S.cam.x, ty = (g.mouse.y - g.H / 2) / S.cam.z + S.cam.y;
    steer(S.me, tx, ty, dt);
    if ((g.pressed('a')) && S.me.length < 16) split(S.me, tx, ty, g);
    if ((g.pressed('b') || g.keyp('KeyW'))) eject(S.me, tx, ty);
    for (const b of S.bots) { if (!b.cells.length) continue; botAI(b, dt); }
    const groups = [{ cells: S.me, me: true }, ...S.bots];
    for (const G of groups) for (const c of G.cells) physics(c, dt);
    for (const G of groups) merge(G.cells, dt);
    // 먹이
    for (const G of groups) for (const c of G.cells) {
      const r = rad(c.m);
      for (const f of S.food) if (!f.dead && Math.abs(f.x - c.x) < r && Math.abs(f.y - c.y) < r && U.dist(f.x, f.y, c.x, c.y) < r) { f.dead = true; c.m += 1; }
      for (const e of S.ejects) if (!e.dead && e.age > 0.3 && U.dist(e.x, e.y, c.x, c.y) < r) { e.dead = true; c.m += 12; }
    }
    S.food = S.food.filter((f) => !f.dead); while (S.food.length < 900) addFood();
    S.ejects.forEach((e) => { e.x += e.vx * dt; e.y += e.vy * dt; e.vx *= Math.pow(0.02, dt); e.vy *= Math.pow(0.02, dt); e.age += dt; e.x = U.clamp(e.x, 0, WORLD); e.y = U.clamp(e.y, 0, WORLD); });
    S.ejects = S.ejects.filter((e) => !e.dead);
    // 세포끼리 먹기
    const all = []; groups.forEach((G, gi) => G.cells.forEach((c) => all.push({ c, gi, G })));
    for (const A of all) for (const B of all) {
      if (A === B || A.gi === B.gi || A.c.dead || B.c.dead) continue;
      if (A.c.m > B.c.m * 1.15 && U.dist(A.c.x, A.c.y, B.c.x, B.c.y) < rad(A.c.m) - rad(B.c.m) * 0.4) {
        B.c.dead = true; A.c.m += B.c.m;
        if (A.G.me) { g.add(Math.round(B.c.m)); g.sfx.pop(); if (!B.G.cells.some((c) => !c.dead)) { g.float(g.W / 2, g.H / 2 - 80, `${B.G.name} 처치!`, '#ef4444', 26); S.kills = (S.kills || 0) + 1; } }
        if (B.G.me) g.sfx.hit();
      }
    }
    for (const G of groups) G.cells = G.cells.filter((c) => !c.dead);
    S.me = groups[0].cells;
    // 바이러스
    for (const v of S.virus) {
      for (const e of S.ejects) if (!e.dead && U.dist(e.x, e.y, v.x, v.y) < rad(v.m)) { e.dead = true; v.m += 12; if (v.m > 180) { v.m = 100; const a = Math.atan2(e.vy, e.vx); S.virus.push({ x: v.x, y: v.y, m: 100, vx: Math.cos(a) * 500, vy: Math.sin(a) * 500 }); } }
      if (v.vx) { v.x += v.vx * dt; v.y += v.vy * dt; v.vx *= Math.pow(0.05, dt); v.vy *= Math.pow(0.05, dt); if (Math.abs(v.vx) < 1) v.vx = v.vy = 0; v.x = U.clamp(v.x, 50, WORLD - 50); v.y = U.clamp(v.y, 50, WORLD - 50); }
      for (const G of groups) for (const c of [...G.cells]) if (c.m > 130 && U.dist(c.x, c.y, v.x, v.y) < rad(c.m) - rad(v.m) * 0.3) {
        v.dead = true; c.m += 50;
        const n = Math.min(16 - G.cells.length + 1, 8);
        if (n > 1) { const piece = c.m / n; c.m = piece; c.merge = 12; for (let i = 1; i < n; i++) { const a = (i / n) * Math.PI * 2; G.cells.push({ x: c.x, y: c.y, m: piece, vx: Math.cos(a) * 600, vy: Math.sin(a) * 600, merge: 12 }); } }
        if (G.me) { g.sfx.explode(); g.shake(8); }
      }
    }
    S.virus = S.virus.filter((v) => !v.dead); while (S.virus.length < 18) S.virus.push({ x: U.rand(100, WORLD - 100), y: U.rand(100, WORLD - 100), m: 100 });
    S.bots.forEach((b, i) => { if (!b.cells.length) { b.respawn = (b.respawn || 3) - dt; if (b.respawn <= 0) { S.bots[i] = mkBot(i); } } });
    if (!S.me.length) return g.over(`최대 질량 ${Math.round(S.best || 0)} · 처치 ${S.kills || 0}`);
    const mass = S.me.reduce((s, c) => s + c.m, 0);
    S.best = Math.max(S.best || 0, mass);
    g.score = Math.round(S.best);
    const cx = S.me.reduce((s, c) => s + c.x * c.m, 0) / mass, cy = S.me.reduce((s, c) => s + c.y * c.m, 0) / mass;
    S.cam.x += (cx - S.cam.x) * Math.min(1, dt * 6); S.cam.y += (cy - S.cam.y) * Math.min(1, dt * 6);
    const tz = Math.max(0.25, Math.min(1.2, 1.3 / Math.pow(mass / 20, 0.32)));
    S.cam.z += (tz - S.cam.z) * Math.min(1, dt * 2);
    const rank = [{ name: '나', m: mass, me: true }, ...S.bots.filter((b) => b.cells.length).map((b) => ({ name: b.name, m: b.cells.reduce((s, c) => s + c.m, 0) }))].sort((a, b) => b.m - a.m);
    S.rank = rank;
    g.info = `질량 ${Math.round(mass)} · 순위 ${rank.findIndex((r) => r.me) + 1}/${rank.length}`;
  },
  draw(g, c) {
    const z = S.cam.z;
    c.save(); c.translate(g.W / 2, g.H / 2); c.scale(z, z); c.translate(-S.cam.x, -S.cam.y);
    const x0 = S.cam.x - g.W / 2 / z, x1 = S.cam.x + g.W / 2 / z, y0 = S.cam.y - g.H / 2 / z, y1 = S.cam.y + g.H / 2 / z;
    c.strokeStyle = '#dde3ea'; c.lineWidth = 1 / z;
    c.beginPath(); for (let x = Math.floor(Math.max(0, x0) / 50) * 50; x <= Math.min(WORLD, x1); x += 50) { c.moveTo(x, Math.max(0, y0)); c.lineTo(x, Math.min(WORLD, y1)); } for (let y = Math.floor(Math.max(0, y0) / 50) * 50; y <= Math.min(WORLD, y1); y += 50) { c.moveTo(Math.max(0, x0), y); c.lineTo(Math.min(WORLD, x1), y); } c.stroke();
    g.stroke(0, 0, WORLD, WORLD, '#94a3b8', 6);
    for (const f of S.food) if (f.x > x0 && f.x < x1 && f.y > y0 && f.y < y1) g.circle(f.x, f.y, 5, f.c);
    for (const e of S.ejects) g.circle(e.x, e.y, 10, e.c);
    const draws = [];
    S.me.forEach((cl) => draws.push({ cl, col: '#3b82f6', name: '나' }));
    S.bots.forEach((b) => b.cells.forEach((cl) => draws.push({ cl, col: b.col, name: b.name })));
    draws.sort((a, b) => a.cl.m - b.cl.m);
    const vir = (v) => { const r = rad(v.m); c.fillStyle = '#4ade80'; c.strokeStyle = '#16a34a'; c.lineWidth = 4; c.beginPath(); for (let i = 0; i <= 40; i++) { const a = (i / 40) * Math.PI * 2, rr = r + (i % 2 ? 6 : -2); c.lineTo(v.x + Math.cos(a) * rr, v.y + Math.sin(a) * rr); } c.fill(); c.stroke(); };
    for (const v of S.virus) if (v.m < 150) vir(v);
    for (const { cl, col, name } of draws) {
      const r = rad(cl.m);
      if (cl.x + r < x0 || cl.x - r > x1 || cl.y + r < y0 || cl.y - r > y1) continue;
      g.circle(cl.x, cl.y, r, col); g.ring(cl.x, cl.y, r - 2, 'rgba(0,0,0,.18)', 5);
      if (r > 18) { g.text(name, cl.x, cl.y - r * 0.08, Math.max(12, r * 0.35), '#fff'); c.lineWidth = 1; if (r > 30) g.text(Math.round(cl.m), cl.x, cl.y + r * 0.3, Math.max(10, r * 0.2), 'rgba(255,255,255,.8)'); }
    }
    c.restore();
    g.rrect(g.W - 200, 10, 190, 26 + Math.min(10, S.rank.length) * 20, 10, 'rgba(0,0,0,.45)');
    g.text('🏆 리더보드', g.W - 105, 26, 15, '#fff');
    S.rank.slice(0, 10).forEach((r, i) => g.text(`${i + 1}. ${r.name}  ${Math.round(r.m)}`, g.W - 190, 48 + i * 20, 14, r.me ? '#fde047' : '#e2e8f0', 'left', r.me ? 'bold' : 'normal'));
    const mm = 120, ms = mm / WORLD;
    g.rrect(10, g.H - mm - 10, mm, mm, 6, 'rgba(0,0,0,.25)');
    S.me.forEach((cl) => g.circle(10 + cl.x * ms, g.H - mm - 10 + cl.y * ms, 3, '#3b82f6'));
  },
});
const COLS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6', '#ec4899', '#14b8a6', '#a855f7', '#f43f5e'];
function rad(m) { return Math.sqrt(m) * 4.5; }
function addFood() { S.food.push({ x: U.rand(WORLD), y: U.rand(WORLD), c: U.choice(COLS) }); }
function mkBot(i) { const m = U.rand(15, 80); return { name: NAMES[i % NAMES.length], col: COLS[i % COLS.length], cells: [{ x: U.rand(200, WORLD - 200), y: U.rand(200, WORLD - 200), m, vx: 0, vy: 0, merge: 0 }], tx: 0, ty: 0, think: 0, aggro: U.rand(0.3, 1) }; }
function addBot(i) { S.bots.push(mkBot(i)); }
function speed(m) { return 260 * Math.pow(m, -0.22) * 2.2; }
function steer(cells, tx, ty, dt) {
  for (const c of cells) {
    const a = U.angle(c.x, c.y, tx, ty), d = U.dist(c.x, c.y, tx, ty), sp = speed(c.m) * Math.min(1, d / 60);
    c.x += Math.cos(a) * sp * dt; c.y += Math.sin(a) * sp * dt;
  }
}
function physics(c, dt) {
  c.x += c.vx * dt; c.y += c.vy * dt; c.vx *= Math.pow(0.03, dt); c.vy *= Math.pow(0.03, dt);
  const r = rad(c.m); c.x = U.clamp(c.x, r * 0.5, WORLD - r * 0.5); c.y = U.clamp(c.y, r * 0.5, WORLD - r * 0.5);
  c.merge -= dt;
  if (c.m > 30) c.m -= c.m * 0.002 * dt;
}
function merge(cells, dt) {
  for (let i = 0; i < cells.length; i++) for (let j = i + 1; j < cells.length; j++) {
    const a = cells[i], b = cells[j]; if (a.dead || b.dead) continue;
    const d = U.dist(a.x, a.y, b.x, b.y), ra = rad(a.m), rb = rad(b.m);
    if (a.merge <= 0 && b.merge <= 0 && d < Math.max(ra, rb) * 0.7) { a.m += b.m; b.dead = true; continue; }
    if (d < ra + rb && d > 0 && (a.merge > 0 || b.merge > 0)) { const push = (ra + rb - d) * 0.5, nx = (a.x - b.x) / d, ny = (a.y - b.y) / d; if (a.merge < 11 && b.merge < 11) { a.x += nx * push * 0.5; a.y += ny * push * 0.5; b.x -= nx * push * 0.5; b.y -= ny * push * 0.5; } }
  }
  for (let i = cells.length - 1; i >= 0; i--) if (cells[i].dead) cells.splice(i, 1);
}
function split(cells, tx, ty, g) {
  const add = [];
  for (const c of cells) if (c.m >= 36 && cells.length + add.length < 16) {
    c.m /= 2; const a = U.angle(c.x, c.y, tx, ty), sp = 700 + Math.sqrt(c.m) * 10;
    add.push({ x: c.x + Math.cos(a) * rad(c.m), y: c.y + Math.sin(a) * rad(c.m), m: c.m, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, merge: 10 + c.m * 0.02 });
    c.merge = 10 + c.m * 0.02;
  }
  cells.push(...add);
  if (add.length && g) g.sfx.tone(400, 0.08, 'sine', 0.05, 800);
}
function eject(cells, tx, ty) {
  for (const c of cells) if (c.m > 35) { c.m -= 14; const a = U.angle(c.x, c.y, tx, ty) + U.rand(-0.1, 0.1), r = rad(c.m); S.ejects.push({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r, vx: Math.cos(a) * 900, vy: Math.sin(a) * 900, c: '#3b82f6', age: 0 }); }
}
function botAI(b, dt) {
  b.think -= dt;
  const main = b.cells.reduce((a, c) => (c.m > a.m ? c : a));
  if (b.think <= 0) {
    b.think = U.rand(0.2, 0.5);
    let best = null, bs = -1e9;
    const threats = [];
    const others = [{ cells: S.me }, ...S.bots.filter((o) => o !== b)];
    for (const o of others) for (const c of o.cells) {
      const d = U.dist(c.x, c.y, main.x, main.y);
      if (d > 700) continue;
      if (c.m > main.m * 1.15) threats.push({ c, d });
      else if (main.m > c.m * 1.15) { const s = (c.m / (d + 50)) * 40 * b.aggro; if (s > bs) { bs = s; best = c; } }
    }
    if (threats.length) { let fx = 0, fy = 0; threats.forEach(({ c, d }) => { fx += (main.x - c.x) / (d * d + 1); fy += (main.y - c.y) / (d * d + 1); }); b.tx = main.x + fx * 1e5; b.ty = main.y + fy * 1e5; }
    else if (best) { b.tx = best.x; b.ty = best.y; if (main.m > best.m * 2.6 && U.dist(best.x, best.y, main.x, main.y) < rad(main.m) * 3 && Math.random() < 0.3 * b.aggro && b.cells.length < 4) split(b.cells, best.x, best.y); }
    else { let fb = null, fd = 1e9; for (let i = 0; i < 40; i++) { const f = S.food[(Math.random() * S.food.length) | 0]; const d = U.dist(f.x, f.y, main.x, main.y); if (d < fd) { fd = d; fb = f; } } if (fb) { b.tx = fb.x; b.ty = fb.y; } }
    for (const v of S.virus) if (main.m > 130 && U.dist(v.x, v.y, main.x, main.y) < rad(main.m) + 120) { b.tx = main.x + (main.x - v.x) * 3; b.ty = main.y + (main.y - v.y) * 3; }
  }
  steer(b.cells, b.tx, b.ty, dt);
}
