let S;
const MS = 25;
const WALLC = [[180, 70, 60], [70, 110, 180], [90, 150, 80], [160, 130, 60], [120, 80, 160]];
const FOES = [{ e: '👹', hp: 30, sp: 1.6, dmg: 8, pts: 100 }, { e: '👻', hp: 20, sp: 2.4, dmg: 6, pts: 120 }, { e: '💀', hp: 50, sp: 1.3, dmg: 12, pts: 200 }, { e: '🧟', hp: 70, sp: 1.0, dmg: 15, pts: 250 }, { e: '😈', hp: 120, sp: 1.5, dmg: 20, pts: 500 }];
GAME({
  title: '미궁 3D 슈터', w: 960, h: 600, bg: '#000', controls: 'dpad+ab', aLabel: '🔫', bLabel: '🔄', noAutoPause: false,
  help: 'W/S 전진·후진 · A/D 좌우 이동 · ←→ 회전\n화면 클릭 시 마우스로 시야 회전 (Esc로 해제) · 클릭/Space 사격\n🚪 출구를 찾아 다음 층으로 · ❤️ 체력 · 📦 탄약\n층이 깊어질수록 괴물이 강해져요',
  init(g) {
    S = { floor: 0, hp: 100, ammo: 40, kills: 0, x: 1.5, y: 1.5, a: 0, shootT: 0, hurt: 0, bob: 0 };
    newFloor();
    if (!window.__fpsMouse) {
      window.__fpsMouse = true;
      document.addEventListener('mousemove', (e) => { if (document.pointerLockElement && S) S.a += e.movementX * 0.0028; });
    }
  },
  update(g, dt) {
    const cv = document.getElementById('cv');
    if (g.mouse.clicked && !document.pointerLockElement && !matchMedia('(pointer: coarse)').matches) { try { cv.requestPointerLock(); } catch (e) {} }
    const turn = (g.key('ArrowRight') - g.key('ArrowLeft')) * 2.6 * dt;
    S.a += turn;
    let fw = g.key('KeyW') - g.key('KeyS') + (matchMedia('(pointer: coarse)').matches ? g.up - g.down : g.key('ArrowUp') - g.key('ArrowDown'));
    let st = g.key('KeyD') - g.key('KeyA');
    if (matchMedia('(pointer: coarse)').matches) { S.a += (g.right - g.left) * 2.4 * dt; }
    const sp = 3.2 * dt, ca = Math.cos(S.a), sa = Math.sin(S.a);
    const mx = (ca * fw - sa * st) * sp, my = (sa * fw + ca * st) * sp;
    if (fw || st) S.bob += dt * 10;
    const free = (x, y) => S.map[Math.floor(y)]?.[Math.floor(x)] === 0 || S.map[Math.floor(y)]?.[Math.floor(x)] === 9;
    const r = 0.2;
    if (free(S.x + mx + Math.sign(mx) * r, S.y)) S.x += mx;
    if (free(S.x, S.y + my + Math.sign(my) * r)) S.y += my;
    if (S.map[Math.floor(S.y)][Math.floor(S.x)] === 9) { g.add(1000 * S.floor); g.sfx.win(); newFloor(); return; }
    S.shootT -= dt;
    if ((g.mouse.down || g.a) && S.shootT <= 0) {
      if (S.ammo > 0) {
        S.ammo--; S.shootT = 0.28; S.flash = 0.06; g.sfx.tone(140, 0.12, 'sawtooth', 0.07, 40); g.shake(3, 0.08);
        let best = null, bd = 1e9;
        for (const m of S.mons) {
          if (m.dead) continue;
          const dx = m.x - S.x, dy = m.y - S.y, d = Math.hypot(dx, dy);
          let ang = Math.atan2(dy, dx) - S.a; ang = ((ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
          if (Math.abs(ang) < Math.atan2(0.35, d) && d < castDist(Math.atan2(dy, dx)) + 0.2 && d < bd) { bd = d; best = m; }
        }
        if (best) { best.hp -= U.randi(14, 22); best.hit = 0.15; best.awake = true; g.sfx.hit(); if (best.hp <= 0) { best.dead = true; S.kills++; g.add(best.pts); g.float(480, 260, '+' + best.pts, '#fde047', 26); if (Math.random() < 0.4) S.items.push({ x: best.x, y: best.y, k: Math.random() < 0.5 ? '📦' : '❤️' }); } }
      } else { S.shootT = 0.3; g.sfx.click(); }
    }
    for (const m of S.mons) {
      if (m.dead) continue;
      m.hit -= dt;
      const d = U.dist(m.x, m.y, S.x, S.y);
      if (!m.awake && d < 7 && castDist(Math.atan2(m.y - S.y, m.x - S.x)) > d) m.awake = true;
      if (!m.awake) continue;
      if (d > 0.8) {
        const a = Math.atan2(S.y - m.y, S.x - m.x), s = m.sp * dt * (1 + S.floor * 0.05);
        const nx = m.x + Math.cos(a) * s, ny = m.y + Math.sin(a) * s;
        if (free(nx, m.y)) m.x = nx; else if (free(m.x, m.y + Math.sign(Math.sin(a)) * s * 2)) m.y += Math.sign(Math.sin(a)) * s;
        if (free(m.x, ny)) m.y = ny; else if (free(m.x + Math.sign(Math.cos(a)) * s * 2, m.y)) m.x += Math.sign(Math.cos(a)) * s;
      } else { m.atk -= dt; if (m.atk <= 0) { m.atk = 1; S.hp -= m.dmg; S.hurt = 0.4; g.sfx.hit(); g.shake(6); } }
    }
    for (const it of S.items) if (!it.got && U.dist(it.x, it.y, S.x, S.y) < 0.5) { it.got = true; g.sfx.power(); if (it.k === '❤️') S.hp = Math.min(100, S.hp + 30); else S.ammo += 15; }
    S.items = S.items.filter((i) => !i.got);
    S.hurt -= dt; S.flash -= dt;
    if (S.hp <= 0) { if (document.pointerLockElement) document.exitPointerLock(); return g.over(`지하 ${S.floor}층 · 처치 ${S.kills}`); }
    g.info = `${S.floor}층 · ❤️${S.hp} · 🔫${S.ammo} · 💀${S.kills}`;
  },
  draw(g, c) {
    const W = g.W, H = g.H, hor = H / 2 + Math.sin(S.bob) * 4;
    let grd = c.createLinearGradient(0, 0, 0, hor); grd.addColorStop(0, '#0b0b1a'); grd.addColorStop(1, '#2b2140'); c.fillStyle = grd; c.fillRect(0, 0, W, hor);
    grd = c.createLinearGradient(0, hor, 0, H); grd.addColorStop(0, '#1a1410'); grd.addColorStop(1, '#4a3a2a'); c.fillStyle = grd; c.fillRect(0, hor, W, H - hor);
    const cols = 240, cw = W / cols, fov = Math.PI / 3, zbuf = new Float32Array(cols);
    for (let i = 0; i < cols; i++) {
      const ra = S.a - fov / 2 + (fov * i) / cols;
      const h = cast(ra);
      const d = h.d * Math.cos(ra - S.a); zbuf[i] = h.d;
      const lh = Math.min(H * 3, H / d);
      const [r0, g0, b0] = h.v === 9 ? [40, 200, 90] : WALLC[(h.v - 1) % WALLC.length];
      const shade = Math.max(0.15, 1 - d / 12) * (h.side ? 0.75 : 1);
      const stripe = Math.floor(h.u * 8) % 2 ? 1 : 0.88;
      c.fillStyle = `rgb(${r0 * shade * stripe | 0},${g0 * shade * stripe | 0},${b0 * shade * stripe | 0})`;
      c.fillRect(i * cw, hor - lh / 2, cw + 1, lh);
      if (h.v !== 9) { c.fillStyle = `rgba(0,0,0,${0.25 * shade})`; for (let k = 1; k < 6; k++) c.fillRect(i * cw, hor - lh / 2 + (lh * k) / 6, cw + 1, Math.max(1, lh * 0.012)); }
      if (h.v === 9 && Math.abs(h.u - 0.5) < 0.25) { c.fillStyle = `rgba(250,250,150,${shade * 0.5})`; c.fillRect(i * cw, hor - lh * 0.3, cw + 1, lh * 0.8); }
    }
    const sprites = [...S.mons.filter((m) => !m.dead).map((m) => ({ ...m, s: 1 })), ...S.items.map((i) => ({ ...i, e: i.k, s: 0.45, item: true }))];
    sprites.forEach((s) => (s.d = U.dist(s.x, s.y, S.x, S.y)));
    sprites.sort((a, b) => b.d - a.d);
    for (const s of sprites) {
      let ang = Math.atan2(s.y - S.y, s.x - S.x) - S.a; ang = ((ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      if (Math.abs(ang) > fov / 2 + 0.3 || s.d < 0.2) continue;
      const sx = W / 2 + (ang / (fov / 2)) * (W / 2), size = (H / (s.d * Math.cos(ang))) * s.s;
      const col = Math.floor(sx / cw);
      if (col >= 0 && col < cols && zbuf[col] < s.d) continue;
      c.save(); if (s.hit > 0) c.filter = 'brightness(3)'; c.globalAlpha = Math.max(0.3, 1 - s.d / 14);
      g.emoji(s.e, sx, hor + (s.item ? size * 0.9 : size * 0.1), size); c.restore();
    }
    // 무기
    const gx = W / 2 + 120 + Math.cos(S.bob) * 8, gy = H - 90 + Math.abs(Math.sin(S.bob)) * 8 + (S.flash > 0 ? 12 : 0);
    if (S.flash > 0) g.emoji('💥', W / 2 + 40, H - 200, 90);
    g.emoji('🔫', gx, gy, 150);
    g.line(W / 2 - 12, H / 2, W / 2 + 12, H / 2, 'rgba(255,255,255,.8)', 2); g.line(W / 2, H / 2 - 12, W / 2, H / 2 + 12, 'rgba(255,255,255,.8)', 2);
    // 미니맵
    const ms = 6; c.globalAlpha = 0.75;
    for (let y = 0; y < MS; y++) for (let x = 0; x < MS; x++) if (S.seen[y][x]) g.rect(10 + x * ms, 10 + y * ms, ms, ms, S.map[y][x] === 9 ? '#22c55e' : S.map[y][x] ? '#64748b' : '#1e293b');
    g.circle(10 + S.x * ms, 10 + S.y * ms, 3, '#fde047'); g.line(10 + S.x * ms, 10 + S.y * ms, 10 + (S.x + Math.cos(S.a) * 2) * ms, 10 + (S.y + Math.sin(S.a) * 2) * ms, '#fde047', 1.5);
    c.globalAlpha = 1;
    g.rrect(W - 260, H - 60, 250, 50, 10, 'rgba(0,0,0,.55)');
    g.text(`❤️ ${S.hp}`, W - 245, H - 35, 24, S.hp < 30 ? '#f87171' : '#fff', 'left');
    g.text(`🔫 ${S.ammo}`, W - 120, H - 35, 24, S.ammo < 8 ? '#f87171' : '#fff', 'left');
    if (S.hurt > 0) { c.fillStyle = `rgba(220,0,0,${S.hurt * 0.6})`; c.fillRect(0, 0, W, H); }
    if (S.banner > 0) { S.banner -= 1 / 60; g.text(`지하 ${S.floor}층`, W / 2, 140, 48, '#fde047'); }
    if (!document.pointerLockElement && !matchMedia('(pointer: coarse)').matches) g.text('클릭하면 마우스로 시야 회전', W / 2, H - 20, 14, 'rgba(255,255,255,.5)');
  },
});
function cast(a) {
  const dx = Math.cos(a), dy = Math.sin(a);
  let mx = Math.floor(S.x), my = Math.floor(S.y);
  const ddx = Math.abs(1 / dx), ddy = Math.abs(1 / dy);
  let sx, sy, sdx, sdy;
  if (dx < 0) { sx = -1; sdx = (S.x - mx) * ddx; } else { sx = 1; sdx = (mx + 1 - S.x) * ddx; }
  if (dy < 0) { sy = -1; sdy = (S.y - my) * ddy; } else { sy = 1; sdy = (my + 1 - S.y) * ddy; }
  let side = 0;
  for (let i = 0; i < 64; i++) {
    if (sdx < sdy) { sdx += ddx; mx += sx; side = 0; } else { sdy += ddy; my += sy; side = 1; }
    const v = S.map[my]?.[mx];
    if (S.seen[my]) S.seen[my][mx] = true;
    if (v === undefined) return { d: 30, v: 1, side, u: 0 };
    if (v > 0) {
      const d = side ? sdy - ddy : sdx - ddx;
      let u = side ? S.x + d * dx : S.y + d * dy; u -= Math.floor(u);
      return { d: Math.max(0.05, d), v, side, u };
    }
  }
  return { d: 30, v: 1, side, u: 0 };
}
function castDist(a) { return cast(a).d; }
function newFloor() {
  S.floor++; S.banner = 2;
  const M = U.grid(MS, MS, 1), cells = 12;
  const vis = U.grid(cells, cells, false), st = [[0, 0]]; vis[0][0] = true; M[1][1] = 0;
  while (st.length) {
    const [cx, cy] = st[st.length - 1];
    const n = U.shuffle([[1, 0], [-1, 0], [0, 1], [0, -1]]).find(([dx, dy]) => vis[cy + dy]?.[cx + dx] === false);
    if (!n) { st.pop(); continue; }
    const nx = cx + n[0], ny = cy + n[1]; vis[ny][nx] = true;
    M[cy * 2 + 1 + n[1]][cx * 2 + 1 + n[0]] = 0; M[ny * 2 + 1][nx * 2 + 1] = 0; st.push([nx, ny]);
  }
  for (let i = 0; i < 40; i++) { const x = U.randi(1, MS - 2), y = U.randi(1, MS - 2); if ((x % 2) !== (y % 2)) M[y][x] = 0; }
  for (let y = 0; y < MS; y++) for (let x = 0; x < MS; x++) if (M[y][x]) M[y][x] = 1 + ((S.floor + Math.floor(x / 6) + Math.floor(y / 6)) % 5);
  // 출구: 가장 먼 칸
  const dist = U.grid(MS, MS, -1), q = [[1, 1]]; dist[1][1] = 0; let far = [1, 1];
  while (q.length) { const [x, y] = q.shift(); if (dist[y][x] > dist[far[1]][far[0]]) far = [x, y]; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (M[y + dy][x + dx] === 0 && dist[y + dy][x + dx] < 0) { dist[y + dy][x + dx] = dist[y][x] + 1; q.push([x + dx, y + dy]); } }
  const [ex, ey] = far;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (M[ey + dy][ex + dx] > 0) { M[ey + dy][ex + dx] = 9; break; }
  S.map = M; S.x = 1.5; S.y = 1.5; S.a = M[1][2] === 0 ? 0 : Math.PI / 2;
  S.seen = U.grid(MS, MS, false);
  S.mons = []; S.items = [];
  const open = []; for (let y = 1; y < MS - 1; y++) for (let x = 1; x < MS - 1; x++) if (M[y][x] === 0 && dist[y][x] > 6) open.push([x, y]);
  U.shuffle(open);
  const nm = 6 + S.floor * 2;
  for (let i = 0; i < nm && i < open.length; i++) { const t = FOES[Math.min(FOES.length - 1, U.randi(0, Math.min(4, Math.floor(S.floor / 2) + 1)))]; S.mons.push({ ...t, x: open[i][0] + 0.5, y: open[i][1] + 0.5, hp: t.hp * (1 + S.floor * 0.1), awake: false, atk: 0, hit: 0 }); }
  for (let i = nm; i < nm + 5 && i < open.length; i++) S.items.push({ x: open[i][0] + 0.5, y: open[i][1] + 0.5, k: i % 2 ? '❤️' : '📦' });
}
