'use strict';
let S;
const CR_G = 1300, CR_SEG = 16, CR_IT = 18;
// level: c candy [x,y], m monster [x,y], r ropes [[ax,ay,slack]], h hooks [[x,y,radius]], b bubbles [[x,y]], k spikes [[x,y,w,h]], w blowers [[x,y,angleDeg]], s stars
const CR_LV = [
  { c: [300, 260], m: [300, 680], r: [[300, 90, 0]], s: [[300, 380], [300, 470], [300, 560]] },
  { c: [300, 300], m: [300, 690], r: [[160, 100, 0], [440, 100, 0]], s: [[300, 420], [300, 520], [300, 610]] },
  { c: [180, 320], m: [440, 690], r: [[300, 100, 0]], s: [[300, 320], [400, 420], [430, 560]] },
  { c: [440, 240], m: [120, 690], r: [[300, 80, 0], [520, 160, 0]], s: [[300, 300], [180, 260], [120, 520]] },
  { c: [300, 300], m: [300, 140], r: [[300, 180, 0]], b: [[300, 560]], s: [[300, 460], [300, 360], [300, 240]] },
  { c: [140, 260], m: [470, 690], r: [[300, 80, 0]], k: [[60, 600, 300, 30]], s: [[300, 330], [420, 400], [460, 560]] },
  { c: [300, 120], m: [300, 700], r: [[300, 40, 0]], h: [[460, 380, 160]], s: [[420, 300], [520, 480], [380, 580]] },
  { c: [300, 280], m: [520, 680], r: [[300, 120, 0]], w: [[80, 300, 0]], s: [[400, 300], [480, 420], [520, 560]] },
  { c: [120, 200], m: [480, 200], r: [[120, 80, 0]], b: [[300, 650]], s: [[160, 420], [300, 560], [420, 380]] },
  { c: [300, 250], m: [300, 700], r: [[180, 80, 0], [420, 80, 0], [300, 60, 0]], k: [[0, 500, 220, 30], [380, 500, 220, 30]], s: [[300, 360], [300, 470], [300, 600]] },
  { c: [150, 180], m: [470, 700], r: [[150, 60, 0]], h: [[330, 300, 120], [450, 480, 110]], s: [[250, 350], [420, 420], [480, 600]] },
  { c: [460, 300], m: [120, 690], r: [[460, 120, 0]], w: [[560, 300, 180]], k: [[220, 560, 380, 30]], s: [[340, 330], [220, 450], [120, 590]] },
  { c: [300, 520], m: [480, 120], r: [[150, 400, 0], [450, 400, 0]], b: [[300, 650]], w: [[80, 200, 0]], s: [[300, 380], [380, 260], [470, 230]] },
  { c: [300, 200], m: [300, 700], r: [[100, 100, 0], [500, 100, 0]], k: [[200, 450, 200, 30]], s: [[180, 380], [300, 300], [420, 520]] },
  { c: [100, 120], m: [500, 700], r: [[100, 40, 0]], h: [[260, 260, 120], [420, 400, 120]], k: [[0, 560, 340, 30]], s: [[230, 260], [400, 420], [500, 560]] },
  { c: [300, 150], m: [300, 160], r: [[300, 60, 0]], b: [[300, 520]], k: [[100, 760, 400, 30]], h: [[300, 380, 80]], s: [[300, 300], [300, 450], [300, 600]] },
  { c: [200, 220], m: [460, 690], r: [[200, 80, 0], [380, 120, 30]], w: [[60, 420, 0]], s: [[300, 300], [420, 400], [460, 560]] },
  { c: [300, 220], m: [120, 120], r: [[300, 80, 0]], b: [[300, 560]], w: [[560, 300, 180]], k: [[0, 700, 600, 30]], s: [[300, 420], [200, 260], [150, 180]] },
  { c: [480, 160], m: [120, 700], r: [[480, 60, 0]], h: [[300, 300, 110], [160, 460, 110]], k: [[360, 600, 240, 30]], s: [[380, 300], [230, 420], [140, 600]] },
  { c: [300, 300], m: [300, 700], r: [[120, 120, 0], [480, 120, 0], [300, 520, 0]], k: [[0, 560, 240, 30], [360, 560, 240, 30]], s: [[220, 380], [380, 380], [300, 620]] },
  { c: [200, 560], m: [480, 120], r: [[80, 470, 0]], b: [[80, 650]], h: [[300, 380, 90]], s: [] },
  { c: [300, 160], m: [520, 700], r: [[300, 60, 0]], w: [[60, 320, 0], [540, 520, 180]], k: [[150, 620, 260, 30]], s: [[380, 320], [500, 460], [500, 600]] },
  { c: [150, 250], m: [300, 700], r: [[60, 100, 0], [240, 100, 0]], h: [[430, 330, 130]], k: [[0, 560, 220, 30], [400, 600, 200, 30]], s: [[300, 300], [430, 470], [300, 620]] },
  { c: [300, 380], m: [300, 120], r: [[160, 300, 0], [440, 300, 0]], b: [[300, 560]], k: [[0, 250, 200, 25], [400, 250, 200, 25]], s: [] },
  { c: [500, 140], m: [100, 700], r: [[500, 50, 0]], h: [[350, 260, 110], [220, 400, 110], [360, 560, 90]], k: [[420, 700, 180, 30]], s: [[360, 330], [230, 480], [150, 620]] },
  { c: [300, 280], m: [480, 140], r: [[300, 160, 0]], b: [[300, 600]], w: [[60, 450, 0]], k: [[0, 60, 380, 25], [560, 300, 40, 300]], s: [[340, 450], [420, 320], [480, 230]] },
  { c: [140, 300], m: [460, 700], r: [[140, 120, 0], [300, 80, 40]], h: [[460, 300, 100]], w: [[60, 560, 0]], k: [[100, 640, 220, 30]], s: [[300, 280], [460, 440], [400, 600]] },
  { c: [300, 200], m: [300, 700], r: [[100, 100, 0], [500, 100, 0], [300, 60, 20]], k: [[0, 400, 240, 25], [360, 400, 240, 25], [0, 560, 200, 25], [400, 560, 200, 25]], s: [[300, 320], [300, 480], [300, 620]] },
  { c: [180, 560], m: [500, 160], r: [[80, 470, 0]], b: [[80, 650]], w: [[40, 300, 0]], h: [[420, 360, 100]], k: [[0, 160, 300, 25]], s: [] },
  { c: [300, 120], m: [300, 720], r: [[300, 40, 0]], h: [[140, 260, 100], [460, 400, 100]], k: [[220, 330, 380, 25], [0, 500, 300, 25]], s: [] },
];
GAME({
  title: '사탕 줄 자르기', w: 600, h: 800, bg: '#c8a46e', controls: 'none',
  help: '마우스/손가락으로 줄을 그어서 자르기 ✂️\n사탕 🍬을 괴물 🐸 입에 넣으면 클리어 · ⭐을 모으면 보너스\n🫧 거품: 사탕이 떠오름 — 사탕을 클릭(Space)하면 터짐\n⭕ 고리: 사탕이 범위에 들어오면 자동으로 줄이 연결 · 💨 송풍기: 클릭하면 바람\n🌵 가시에 닿거나 화면 밖으로 나가면 다시 · Shift/X = 레벨 재시작 · 30단계',
  init(g) {
    const saved = g.load('stars', []);
    S = { mode: 'select', stars: Array.isArray(saved) ? saved : [], lvl: 0, t: 0, cutTrail: [] };
  },
  update(g, dt) {
    S.t += dt;
    if (S.mode === 'select') return updSelect(g);
    if (S.mode === 'done') { S.timer -= dt; if (S.timer <= 0 || (S.timer < 1.2 && (g.mouse.clicked || g.pressed('a')))) { if (S.lvl >= 29) return g.win(`30단계 완주! ⭐ ${totalStars()}/90`); loadLevel(g, S.lvl + 1); } return; }
    if (S.mode === 'fail') { S.timer -= dt; if (S.timer <= 0) loadLevel(g, S.lvl); return; }
    if (g.pressed('b')) return loadLevel(g, S.lvl);
    if (g.clickIn(10, 10, 80, 36)) { S.mode = 'select'; return; }
    // cutting
    const m = g.mouse;
    if (m.down) {
      if (S.lastM) { cutLine(g, S.lastM[0], S.lastM[1], m.x, m.y); }
      S.lastM = [m.x, m.y];
      S.cutTrail.push({ x: m.x, y: m.y, t: 0.25 });
    } else S.lastM = null;
    if (m.clicked) {
      const C = S.candy;
      if (C.bub && Math.hypot(m.x - C.x, m.y - C.y) < 45) popBubble(g);
      S.blowers.forEach((w, i) => { if (Math.hypot(m.x - w.x, m.y - w.y) < 36) blow(g, i); });
    }
    if (g.pressed('a') && S.candy.bub) popBubble(g);
    for (const p of S.cutTrail) p.t -= dt;
    S.cutTrail = S.cutTrail.filter((p) => p.t > 0);
    step(g, dt);
    g.info = `${S.lvl + 1}단계 · ⭐${S.got}/3`;
  },
  draw(g, c) {
    if (S.mode === 'select') return drawSelect(g, c);
    drawLevel(g, c);
  },
});
function totalStars() { let n = 0; for (const s of S.stars) n += s || 0; return n; }
function unlocked() { let i = 0; while (i < 30 && S.stars[i] !== undefined && S.stars[i] !== null) i++; return Math.min(29, i); }
function updSelect(g) {
  const u = unlocked();
  for (let i = 0; i < 30; i++) {
    const x = 60 + (i % 5) * 100, y = 170 + Math.floor(i / 5) * 95;
    if (i <= u && g.clickIn(x, y, 80, 76)) { g.sfx.click(); return loadLevel(g, i); }
  }
  if (g.pressed('a')) loadLevel(g, u);
}
function drawSelect(g) {
  wood(g);
  g.text('🍬 사탕 줄 자르기', 300, 70, 36, '#5b3410');
  g.text(`모은 별 ⭐ ${totalStars()} / 90 · Space = 이어하기`, 300, 120, 18, '#5b3410');
  const u = unlocked();
  for (let i = 0; i < 30; i++) {
    const x = 60 + (i % 5) * 100, y = 170 + Math.floor(i / 5) * 95;
    const open = i <= u;
    g.rrect(x, y, 80, 76, 14, open ? (g.inRect(x, y, 80, 76) ? '#fde68a' : '#fef3c7') : '#a1856a', '#7c4a1e', 3);
    g.text(open ? String(i + 1) : '🔒', x + 40, y + 30, open ? 26 : 22, '#5b3410');
    const st = S.stars[i] || 0;
    if (open) for (let k = 0; k < 3; k++) g.text(k < st ? '★' : '☆', x + 20 + k * 20, y + 60, 16, k < st ? '#f59e0b' : '#a8a29e');
  }
}
function loadLevel(g, i) {
  const L = CR_LV[i];
  S.lvl = i; S.mode = 'play'; S.t = 0; S.got = 0; S.lastM = null; S.cutTrail = [];
  S.candy = { x: L.c[0], y: L.c[1], px: L.c[0], py: L.c[1], bub: false };
  S.monster = { x: L.m[0], y: L.m[1], open: 0, sad: 0 };
  S.ropes = []; for (const r of L.r || []) addRope(r[0], r[1], Math.hypot(r[0] - L.c[0], r[1] - L.c[1]) + (r[2] || 0));
  S.hooks = (L.h || []).map(([x, y, r]) => ({ x, y, r, used: false }));
  S.bubbles = (L.b || []).map(([x, y]) => ({ x, y, used: false }));
  S.spikes = (L.k || []).map(([x, y, w, h]) => ({ x, y, w, h }));
  S.blowers = (L.w || []).map(([x, y, a]) => ({ x, y, a: a * Math.PI / 180, puff: 0 }));
  S.starsL = (L.s || []).map(([x, y]) => ({ x, y, got: false }));
  S.dangle = [];
}
function addRope(ax, ay, len) {
  const C = S.candy;
  const n = Math.max(3, Math.round(len / CR_SEG));
  const nodes = [];
  for (let i = 0; i <= n; i++) { const k = i / n; const x = U.lerp(ax, C.x, k), y = U.lerp(ay, C.y, k); nodes.push({ x, y, px: x, py: y }); }
  nodes.pop(); // last attaches to candy
  S.ropes.push({ ax, ay, len, seg: len / n, nodes, cut: false });
}
function cutRope(g, i, k) {
  const r = S.ropes[i]; if (!r || r.cut) return;
  r.cut = true;
  S.dangle.push({ nodes: r.nodes.slice(0, Math.max(1, k + 1)), seg: r.seg, life: 3 });
  if (g) { g.sfx.tone(900, 0.06, 'sawtooth', 0.05, 300); }
}
function popBubble(g) { const C = S.candy; if (!C.bub) return; C.bub = false; if (g) { g.sfx.pop(); g.burst(C.x, C.y, ['#e0f2fe', '#fff'], 14, 200); } }
function blow(g, i) {
  const w = S.blowers[i]; if (!w) return;
  w.puff = 0.4;
  const C = S.candy, dx = C.x - w.x, dy = C.y - w.y, d = Math.hypot(dx, dy);
  const dirx = Math.cos(w.a), diry = Math.sin(w.a);
  const along = dx * dirx + dy * diry, perp = Math.abs(-dx * diry + dy * dirx);
  if (along > 0 && along < 520 && perp < 90) { const f = 520 * (1 - along / 700) / 120; C.px -= dirx * f; C.py -= diry * f; }
  if (g) g.sfx.noise(0.15, 0.06);
}
function segX(ax, ay, bx, by, cx, cy, dx, dy) {
  const d = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx); if (Math.abs(d) < 1e-6) return false;
  const t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / d, u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / d;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}
function cutLine(g, x1, y1, x2, y2) {
  S.ropes.forEach((r, i) => {
    if (r.cut) return;
    const pts = [{ x: r.ax, y: r.ay }].concat(r.nodes.slice(1), [S.candy]);
    for (let k = 0; k < pts.length - 1; k++) if (segX(x1, y1, x2, y2, pts[k].x, pts[k].y, pts[k + 1].x, pts[k + 1].y)) { cutRope(g, i, k); break; }
  });
}
function step(g, dt) {
  const C = S.candy;
  const sub = 2, h = dt / sub;
  for (let s = 0; s < sub; s++) {
    // integrate candy
    const ay = C.bub ? -260 : CR_G;
    let vx = (C.x - C.px) * (C.bub ? 0.975 : 0.995), vy = (C.y - C.py) * (C.bub ? 0.975 : 0.995);
    C.px = C.x; C.py = C.y; C.x += vx; C.y += vy + ay * h * h;
    for (const r of S.ropes) if (!r.cut) for (const n of r.nodes) { const nvx = (n.x - n.px) * 0.98, nvy = (n.y - n.py) * 0.98; n.px = n.x; n.py = n.y; n.x += nvx; n.y += nvy + CR_G * h * h; }
    for (const d of S.dangle) for (let i = 1; i < d.nodes.length; i++) { const n = d.nodes[i]; const nvx = (n.x - n.px) * 0.98, nvy = (n.y - n.py) * 0.98; n.px = n.x; n.py = n.y; n.x += nvx; n.y += nvy + CR_G * h * h; }
    for (let it = 0; it < CR_IT; it++) {
      for (const r of S.ropes) {
        if (r.cut) continue;
        r.nodes[0].x = r.ax; r.nodes[0].y = r.ay;
        const arr = r.nodes;
        for (let i = 0; i < arr.length; i++) {
          const a = arr[i], b = i + 1 < arr.length ? arr[i + 1] : C;
          const wa = i === 0 ? 0 : 1, wb = b === C ? 0.15 : 1;
          const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.001;
          const diff = (d - r.seg) / d / (wa + wb);
          a.x += dx * diff * wa; a.y += dy * diff * wa; b.x -= dx * diff * wb; b.y -= dy * diff * wb;
        }
      }
      for (const d of S.dangle) { d.nodes[0].px = d.nodes[0].x; for (let i = 0; i < d.nodes.length - 1; i++) { const a = d.nodes[i], b = d.nodes[i + 1]; const dx = b.x - a.x, dy = b.y - a.y, dd = Math.hypot(dx, dy) || 0.001; const diff = (dd - d.seg) / dd; if (i === 0) { b.x -= dx * diff; b.y -= dy * diff; } else { a.x += dx * diff * 0.5; a.y += dy * diff * 0.5; b.x -= dx * diff * 0.5; b.y -= dy * diff * 0.5; } } }
    }
    // hard length limit
    for (const r of S.ropes) {
      if (r.cut) continue;
      const dx = C.x - r.ax, dy = C.y - r.ay, d = Math.hypot(dx, dy);
      if (d > r.len) { C.x = r.ax + dx / d * r.len; C.y = r.ay + dy / d * r.len; }
    }
  }
  for (const d of S.dangle) d.life -= dt;
  S.dangle = S.dangle.filter((d) => d.life > 0);
  // hooks
  for (const hk of S.hooks) if (!hk.used && Math.hypot(C.x - hk.x, C.y - hk.y) < hk.r) { hk.used = true; addRope(hk.x, hk.y, Math.hypot(C.x - hk.x, C.y - hk.y)); if (g) g.sfx.tone(600, 0.08, 'triangle', 0.06); }
  // bubbles
  for (const b of S.bubbles) if (!b.used && Math.hypot(C.x - b.x, C.y - b.y) < 36) { b.used = true; C.bub = true; C.py = C.y + 1; C.px = C.x; if (g) g.sfx.tone(400, 0.1, 'sine', 0.06, 700); }
  // stars
  for (const st of S.starsL) if (!st.got && Math.hypot(C.x - st.x, C.y - st.y) < 34) { st.got = true; S.got++; if (g) { g.sfx.coin(); g.burst(st.x, st.y, ['#fde047', '#fff'], 16, 220); g.add(100 * S.got, st.x, st.y); } }
  for (const w of S.blowers) w.puff = Math.max(0, w.puff - dt);
  // monster
  const M = S.monster, md = Math.hypot(C.x - M.x, C.y - M.y);
  M.open = U.clamp(1 - (md - 40) / 160, 0, 1);
  if (md < 44) return win(g);
  for (const k of S.spikes) if (U.circRect({ x: C.x, y: C.y, r: 16 }, k)) return fail(g, '가시에 찔렸어요!');
  if (C.y > 860 || C.x < -60 || C.x > 660 || C.y < -80) return fail(g, '사탕을 놓쳤어요…');
}
function win(g) {
  S.mode = 'done'; S.timer = 2.4;
  const prev = S.stars[S.lvl] || 0; S.stars[S.lvl] = Math.max(prev, S.got);
  if (g) {
    g.save('stars', S.stars);
    g.add(500 + S.got * 300, S.monster.x, S.monster.y - 60);
    g.sfx.win(); g.burst(S.monster.x, S.monster.y, ['#f472b6', '#fde047', '#4ade80'], 40, 300, 1);
  }
}
function fail(g, msg) {
  S.mode = 'fail'; S.timer = 1.4; S.failMsg = msg; S.monster.sad = 1;
  if (g) { g.sfx.lose(); g.shake(6, 0.3); }
}
function wood(g) {
  g.rect(0, 0, 600, 800, '#c8a46e');
  for (let y = 0; y < 800; y += 80) { g.rect(0, y, 600, 78, y % 160 ? '#c39b62' : '#ccaa74'); g.line(0, y + 79, 600, y + 79, '#a37b45', 2); }
}
function drawLevel(g, c) {
  wood(g);
  const C = S.candy, M = S.monster;
  // spikes
  for (const k of S.spikes) { g.rect(k.x, k.y, k.w, k.h, '#475569'); const hz = k.w >= k.h; const n = Math.floor((hz ? k.w : k.h) / 14); for (let i = 0; i < n; i++) { if (hz) { g.poly([[k.x + i * 14, k.y], [k.x + i * 14 + 7, k.y - 10], [k.x + i * 14 + 14, k.y]], '#cbd5e1'); g.poly([[k.x + i * 14, k.y + k.h], [k.x + i * 14 + 7, k.y + k.h + 10], [k.x + i * 14 + 14, k.y + k.h]], '#cbd5e1'); } else { g.poly([[k.x, k.y + i * 14], [k.x - 10, k.y + i * 14 + 7], [k.x, k.y + i * 14 + 14]], '#cbd5e1'); g.poly([[k.x + k.w, k.y + i * 14], [k.x + k.w + 10, k.y + i * 14 + 7], [k.x + k.w, k.y + i * 14 + 14]], '#cbd5e1'); } } }
  // hooks
  for (const hk of S.hooks) { if (!hk.used) { c.setLineDash([6, 6]); g.ring(hk.x, hk.y, hk.r, 'rgba(91,52,16,.45)', 2); c.setLineDash([]); } g.circle(hk.x, hk.y, 10, '#78350f'); g.circle(hk.x, hk.y, 5, '#fbbf24'); }
  // bubbles
  for (const b of S.bubbles) if (!b.used) { g.circle(b.x, b.y + Math.sin(S.t * 3) * 4, 32, 'rgba(186,230,253,.35)'); g.ring(b.x, b.y + Math.sin(S.t * 3) * 4, 32, 'rgba(255,255,255,.8)', 2); }
  // blowers
  for (const w of S.blowers) { c.save(); c.translate(w.x, w.y); c.rotate(w.a); g.rrect(-26, -20, 40, 40, 8, '#64748b', '#1e293b', 2); g.poly([[14, -14], [30, -22], [30, 22], [14, 14]], '#94a3b8'); c.restore(); if (w.puff > 0) for (let i = 0; i < 5; i++) { const d = (0.4 - w.puff) * 600 + i * 20; g.circle(w.x + Math.cos(w.a) * d, w.y + Math.sin(w.a) * d + (i - 2) * 10, 10 * w.puff * 2, 'rgba(255,255,255,.5)'); } g.emoji('💨', w.x, w.y - 32, 18); }
  // stars
  for (const st of S.starsL) if (!st.got) { g.emoji('⭐', st.x, st.y, 34 + Math.sin(S.t * 4 + st.x) * 3); }
  // monster
  g.rrect(M.x - 50, M.y + 26, 100, 40, 10, '#a16207', '#78350f', 3);
  g.circle(M.x, M.y, 38, '#4ade80'); g.circle(M.x, M.y + 4, 34, '#22c55e');
  g.circle(M.x - 14, M.y - 14, 9, '#fff'); g.circle(M.x + 14, M.y - 14, 9, '#fff');
  const ex = U.clamp((C.x - M.x) / 200, -1, 1) * 3, ey = U.clamp((C.y - M.y) / 200, -1, 1) * 3;
  g.circle(M.x - 14 + ex, M.y - 14 + ey, 4.5, '#111'); g.circle(M.x + 14 + ex, M.y - 14 + ey, 4.5, '#111');
  const mo = S.mode === 'done' ? 0.2 + Math.abs(Math.sin(S.t * 10)) * 0.4 : M.open;
  if (M.sad) g.line(M.x - 12, M.y + 16, M.x + 12, M.y + 12, '#14532d', 4);
  else { c.fillStyle = '#7f1d1d'; c.beginPath(); c.ellipse(M.x, M.y + 12, 16, 3 + mo * 14, 0, 0, Math.PI * 2); c.fill(); }
  // dangling ropes
  for (const d of S.dangle) { c.globalAlpha = Math.min(1, d.life); drawRopePts(g, c, d.nodes); c.globalAlpha = 1; }
  // ropes
  for (const r of S.ropes) {
    if (r.cut) continue;
    drawRopePts(g, c, r.nodes.concat([C]));
  }
  for (const r of S.ropes) { g.circle(r.ax, r.ay, 9, '#78350f'); g.circle(r.ax, r.ay, 4, '#e7e5e4'); }
  // candy
  if (S.mode !== 'done') {
    c.save(); c.translate(C.x, C.y); c.rotate(Math.sin(S.t * 2) * 0.3);
    g.emoji('🍬', 0, 0, 40); c.restore();
    if (C.bub) { g.circle(C.x, C.y, 30, 'rgba(186,230,253,.35)'); g.ring(C.x, C.y, 30, '#fff', 2); }
  }
  // cut trail
  for (let i = 1; i < S.cutTrail.length; i++) { const a = S.cutTrail[i - 1], b = S.cutTrail[i]; g.line(a.x, a.y, b.x, b.y, `rgba(255,255,255,${b.t * 3})`, 4); }
  // hud
  g.rrect(10, 10, 80, 36, 10, '#7c4a1e'); g.text('☰ 목록', 50, 28, 15, '#fef3c7');
  g.text(`${S.lvl + 1} / 30`, 300, 28, 22, '#5b3410');
  for (let k = 0; k < 3; k++) g.text(k < S.got ? '★' : '☆', 500 + k * 28, 28, 26, k < S.got ? '#f59e0b' : '#7c5b3a');
  if (S.mode === 'done') { g.rrect(130, 330, 340, 140, 18, 'rgba(255,251,235,.95)', '#7c4a1e', 4); g.text('냠냠! 클리어 🎉', 300, 370, 30, '#15803d'); g.text('★'.repeat(S.got) + '☆'.repeat(3 - S.got), 300, 420, 36, '#f59e0b'); }
  if (S.mode === 'fail') { g.rrect(130, 340, 340, 100, 18, 'rgba(255,251,235,.95)', '#7c4a1e', 4); g.text(S.failMsg, 300, 375, 24, '#b91c1c'); g.text('다시 시도…', 300, 410, 16, '#78350f'); }
  if (S.t < 2 && S.lvl < 3 && S.mode === 'play') g.text('✂️ 줄을 가로질러 그어 보세요!', 300, 760, 20, '#5b3410');
}
function drawRopePts(g, c, pts) {
  c.lineCap = 'round';
  c.strokeStyle = '#78350f'; c.lineWidth = 6; c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.stroke();
  c.strokeStyle = '#d6a466'; c.lineWidth = 3; c.setLineDash([6, 6]); c.stroke(); c.setLineDash([]);
}
