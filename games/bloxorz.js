let S;
// 블록 굴리기 (블록소리즘): 1×1×2 블록을 굴려 구멍에 세워 넣기
// 타일: 0 허공, 1 바닥, 2 약한 바닥(세우면 부서짐), 3 목표 구멍, 4 원형 스위치(닿으면), 5 X 스위치(세워야), 6 다리(스위치로 열림)
const BX_W = 16, BX_H = 11, BX_T = 50, BX_LEVELS = 15;
const BX_MV = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
const BX_DIRS = ['left', 'right', 'up', 'down'];
GAME({
  title: '블록 굴리기', w: 960, h: 680, bg: '#0f172a', controls: 'dpad+ab', aLabel: '힌트', bLabel: '되돌리기',
  help: '방향키(또는 스와이프)로 직육면체 블록을 굴려요\n블록을 세운 상태로 구멍 🕳️ 에 넣으면 클리어\n주황 타일은 약해서 세우면 무너져요 · 원형 스위치 ⚪는 닿기만 해도, ✖ 스위치는 세워서 눌러야 다리가 열려요\n떨어지면 그 판을 처음부터 · Z/Space = 힌트, X/U = 되돌리기',
  init(g) {
    S = { lvl: 0, unlocked: g.load('unlocked', 1), mode: 'select', msg: '', msgT: 0, falls: 0, total: 0 };
  },
  update(g, dt) {
    const m = g.mouse;
    if (S.msgT > 0) S.msgT -= dt;
    if (S.mode === 'select') {
      for (let i = 0; i < BX_LEVELS; i++) {
        const x = 150 + (i % 5) * 136, y = 210 + Math.floor(i / 5) * 120;
        if (i < S.unlocked && g.clickIn(x, y, 120, 96)) { S.lvl = i; loadLevel(g); g.sfx.click(); }
      }
      if (g.pressed('a')) { S.lvl = Math.min(S.unlocked, BX_LEVELS) - 1; loadLevel(g); }
      g.info = '스테이지를 고르세요';
      return;
    }
    if (S.anim) {
      S.anim.t += dt / S.anim.dur;
      if (S.anim.t >= 1) { const a = S.anim; S.anim = null; a.done(); }
      return;
    }
    if (S.fall) {
      S.fall.t += dt; S.fall.z -= S.fall.vz * dt; S.fall.vz += 25 * dt;
      if (S.fall.t > 1) { S.fall = null; resetLevel(g); }
      return;
    }
    if (S.sink) {
      S.sink.t += dt;
      if (S.sink.t > 1.2) { S.sink = null; nextLevel(g); }
      return;
    }
    S.time += dt;
    for (const d of BX_DIRS) if (g.pressed(d)) { tryMove(g, d); break; }
    if (g.pressed('a') || g.keyp('KeyH')) hint(g);
    if (g.pressed('b') || g.keyp('KeyU')) undo(g);
    if (m.clicked) {
      if (g.inRect(20, 615, 120, 48)) undo(g);
      if (g.inRect(150, 615, 120, 48)) hint(g);
      if (g.inRect(280, 615, 120, 48)) { S.falls++; resetLevel(g); }
      if (g.inRect(410, 615, 120, 48)) S.mode = 'select';
      // 화면 탭: 블록 기준 방향으로 이동
      if (m.y < 600 && !S.anim) {
        const [bx, by] = blockCenter();
        const dx = m.x - bx, dy = m.y - by;
        if (Math.hypot(dx, dy) > 30) tryMove(g, Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
      }
    }
    g.info = `스테이지 ${S.lvl + 1}/${BX_LEVELS} · 이동 ${S.moves} (최소 ${S.par}) · 낙하 ${S.falls}`;
  },
  draw(g, c) {
    if (S.mode === 'select') {
      g.text('🟫 블록 굴리기', 480, 80, 46, '#f8fafc');
      g.text('블록을 굴려 구멍에 꼿꼿이 세워 넣으세요', 480, 135, 18, '#94a3b8', 'center', '600');
      for (let i = 0; i < BX_LEVELS; i++) {
        const x = 150 + (i % 5) * 136, y = 210 + Math.floor(i / 5) * 120, open = i < S.unlocked;
        g.rrect(x, y, 120, 96, 14, open ? (g.inRect(x, y, 120, 96) ? '#475569' : '#334155') : '#1e293b', open ? '#94a3b8' : '#334155');
        g.text(open ? String(i + 1) : '🔒', x + 60, y + 42, 34, open ? '#f8fafc' : '#475569');
        if (open) g.text(i < 3 ? '기초' : i < 7 ? '약한 바닥' : i < 11 ? '스위치' : '마스터', x + 60, y + 78, 13, '#94a3b8', 'center', '600');
      }
      return;
    }
    const L = S.L;
    // 타일
    for (let y = 0; y < BX_H; y++) for (let x = 0; x < BX_W; x++) {
      const t = L.t[y][x];
      if (!t) continue;
      if (t === 6 && !bridgeOpen(x, y)) { const [sx, sy] = P(x, y, 0); g.stroke(sx + 6, sy + 4, BX_T - 12, BX_T * 0.8 - 8, 'rgba(148,163,184,.25)', 1); continue; }
      drawTile(g, x, y, t);
    }
    // 블록
    let box = null;
    if (S.anim) {
      const a = S.anim, k = a.t < 0 ? 0 : a.t, e = k * k * (3 - 2 * k);
      const A = boxOf(a.from), B = boxOf(a.to);
      box = A.map((v, i) => v + (B[i] - v) * e);
      box[5] += Math.sin(Math.PI * k) * 0.35;
      box[2] += Math.sin(Math.PI * k) * 0.35;
    } else box = boxOf(S.b);
    if (S.fall) { box[2] += S.fall.z; box[5] += S.fall.z; c.globalAlpha = Math.max(0, 1 - S.fall.t); }
    if (S.sink) { const s = Math.min(2, S.sink.t * 2.2); box[2] -= s; box[5] -= s; c.globalAlpha = Math.max(0, 1 - S.sink.t / 1.2); }
    drawBox(g, c, box);
    c.globalAlpha = 1;
    // HUD
    g.button(20, 615, 120, 48, '↶ 되돌리기', '#475569', 16);
    g.button(150, 615, 120, 48, '💡 힌트', '#15803d', 16);
    g.button(280, 615, 120, 48, '⟲ 다시', '#64748b', 16);
    g.button(410, 615, 120, 48, '스테이지', '#334155', 16);
    g.text(`스테이지 ${S.lvl + 1}`, 940, 628, 22, '#f8fafc', 'right');
    g.text(`이동 ${S.moves} · 최소 ${S.par}`, 940, 656, 16, '#94a3b8', 'right', '600');
    if (S.hintDir && S.hintT > 0) {
      S.hintT -= 1 / 60;
      const [bx, by] = blockCenter(); const [dx, dy] = BX_MV[S.hintDir];
      g.text(['⬅️', '➡️', '⬆️', '⬇️'][BX_DIRS.indexOf(S.hintDir)], bx + dx * 70, by + dy * 70 - 20, 40);
    }
    if (S.msgT > 0) { g.rrect(300, 20, 360, 46, 12, 'rgba(15,23,42,.9)', '#475569'); g.text(S.msg, 480, 43, 18, '#fff'); }
    if (S.lvl === 0 && S.moves < 2) g.text('방향키로 굴려 보세요!', 480, 40, 20, '#facc15');
  },
});

// 화면 투영: 위에서 비스듬히 본 시점
function P(x, y, z) {
  return [S.ox + x * BX_T + y * 8, S.oy + y * BX_T * 0.8 - z * BX_T * 0.55];
}
function drawTile(g, x, y, t) {
  let [sx, sy] = P(x, y, 0);
  const w = BX_T, h = BX_T * 0.8;
  const top = { 1: '#cbd5e1', 2: '#fb923c', 3: '#0f172a', 4: '#cbd5e1', 5: '#cbd5e1', 6: '#a16207' }[t];
  const side = { 1: '#64748b', 2: '#c2410c', 3: '#334155', 4: '#64748b', 5: '#64748b', 6: '#713f12' }[t];
  g.poly([[sx + 8, sy + h], [sx + w + 8, sy + h], [sx + w + 8, sy + h + 12], [sx + 8, sy + h + 12]], side);
  g.poly([[sx + w, sy], [sx + w + 8, sy + h], [sx + w + 8, sy + h + 12], [sx + w, sy + 12]], side);
  g.poly([[sx, sy], [sx + w, sy], [sx + w + 8, sy + h], [sx + 8, sy + h]], top, 'rgba(15,23,42,.35)', 1);
  sx += 4;
  if (t === 3) { g.circle(sx + w / 2, sy + h / 2, 14, '#000'); g.ring(sx + w / 2, sy + h / 2, 17 + Math.sin(g.time * 4) * 2, '#22d3ee', 2); }
  if (t === 4) { g.ring(sx + w / 2, sy + h / 2, 12, '#475569', 4); }
  if (t === 5) { g.line(sx + 14, sy + 8, sx + w - 14, sy + h - 8, '#475569', 5); g.line(sx + w - 14, sy + 8, sx + 14, sy + h - 8, '#475569', 5); }
  if (t === 6) { for (let i = 1; i < 4; i++) g.line(sx + 2, sy + (h * i) / 4, sx + w - 2, sy + (h * i) / 4, '#92400e', 2); }
}
// 블록 박스 [x0,y0,z0,x1,y1,z1]
function boxOf(b) {
  if (b.o === 0) return [b.x, b.y, 0, b.x + 1, b.y + 1, 2];
  if (b.o === 1) return [b.x, b.y, 0, b.x + 2, b.y + 1, 1];
  return [b.x, b.y, 0, b.x + 1, b.y + 2, 1];
}
function drawBox(g, c, [x0, y0, z0, x1, y1, z1]) {
  const p = (x, y, z) => { const [a, b] = P(x, y, z); return [a, b]; };
  // 그림자
  if (z0 >= -0.01) g.poly([p(x0, y0, 0), p(x1, y0, 0), p(x1, y1, 0), p(x0, y1, 0)].map(([a, b]) => [a + 4, b + 6]), 'rgba(0,0,0,.35)');
  // 오른쪽 면
  g.poly([p(x1, y0, z1), p(x1, y1, z1), p(x1, y1, z0), p(x1, y0, z0)], '#7c2d12', 'rgba(0,0,0,.4)', 1);
  // 앞면
  g.poly([p(x0, y1, z1), p(x1, y1, z1), p(x1, y1, z0), p(x0, y1, z0)], '#9a3412', 'rgba(0,0,0,.4)', 1);
  // 윗면
  g.poly([p(x0, y0, z1), p(x1, y0, z1), p(x1, y1, z1), p(x0, y1, z1)], '#b45309', '#fde68a', 2);
  const [cx, cy] = p((x0 + x1) / 2, (y0 + y1) / 2, z1);
  g.circle(cx, cy, 4, 'rgba(253,230,138,.6)');
}
function blockCenter() {
  const b = boxOf(S.b);
  return P((b[0] + b[3]) / 2, (b[1] + b[4]) / 2, b[5]);
}
function cells(b) {
  if (b.o === 0) return [[b.x, b.y]];
  if (b.o === 1) return [[b.x, b.y], [b.x + 1, b.y]];
  return [[b.x, b.y], [b.x, b.y + 1]];
}
function step(b, d) {
  const { x, y, o } = b;
  if (o === 0) return { left: { x: x - 2, y, o: 1 }, right: { x: x + 1, y, o: 1 }, up: { x, y: y - 2, o: 2 }, down: { x, y: y + 1, o: 2 } }[d];
  if (o === 1) return { left: { x: x - 1, y, o: 0 }, right: { x: x + 2, y, o: 0 }, up: { x, y: y - 1, o: 1 }, down: { x, y: y + 1, o: 1 } }[d];
  return { left: { x: x - 1, y, o: 2 }, right: { x: x + 1, y, o: 2 }, up: { x, y: y - 1, o: 0 }, down: { x, y: y + 2, o: 0 } }[d];
}
function tileAt(L, x, y) { return x < 0 || y < 0 || x >= BX_W || y >= BX_H ? 0 : L.t[y][x]; }
// 상태 적용: 반환 {ok, bridges, win}
function landing(L, b, br) {
  let nbr = br, ok = true;
  for (const [x, y] of cells(b)) {
    const t = tileAt(L, x, y);
    if (!t) ok = false;
    else if (t === 6 && !((br >> L.bg[y][x]) & 1)) ok = false;
    else if (t === 2 && b.o === 0) ok = false;
  }
  if (!ok) return { ok: false, bridges: br };
  for (const [x, y] of cells(b)) {
    const t = L.t[y][x];
    if (t === 4 || (t === 5 && b.o === 0)) nbr ^= 1 << L.sw[y][x];
  }
  const win = b.o === 0 && L.t[b.y][b.x] === 3;
  return { ok: true, bridges: nbr, win };
}
function bfs(L, b0, br0) {
  const key = (b, br) => ((b.y * 32 + b.x + 2) * 3 + b.o) * 16 + br;
  const prev = new Map([[key(b0, br0), null]]);
  let q = [[b0, br0]];
  while (q.length) {
    const nq = [];
    for (const [b, br] of q) {
      for (const d of BX_DIRS) {
        const nb = step(b, d);
        const r = landing(L, nb, br);
        if (!r.ok) continue;
        const k = key(nb, r.bridges);
        if (prev.has(k)) continue;
        prev.set(k, { from: key(b, br), d });
        if (r.win) {
          const seq = [];
          let kk = k;
          while (prev.get(kk)) { seq.unshift(prev.get(kk).d); kk = prev.get(kk).from; }
          return seq;
        }
        nq.push([nb, r.bridges]);
      }
    }
    q = nq;
  }
  return null;
}
// 랜덤 워크로 해답이 보장되는 레벨 생성
function genLevel(lvl) {
  const len = 8 + lvl * 3;
  const useFragile = lvl >= 3, useSwitch = lvl >= 7;
  let best = null;
  for (let att = 0; att < 300; att++) {
    const t = U.grid(BX_W, BX_H, 0);
    let b = { x: U.randi(1, 4), y: U.randi(2, BX_H - 3), o: 0 };
    const start = { ...b };
    const walk = [b];
    let lastD = null;
    for (let i = 0; i < len * 3 && (walk.length < len || b.o !== 0); i++) {
      const opts = BX_DIRS.filter((d) => {
        const nb = step(b, d);
        if (lastD && ((d === 'left' && lastD === 'right') || (d === 'right' && lastD === 'left') || (d === 'up' && lastD === 'down') || (d === 'down' && lastD === 'up'))) return false;
        return cells(nb).every(([x, y]) => x >= 0 && y >= 0 && x < BX_W && y < BX_H);
      });
      if (!opts.length) break;
      // 오른쪽으로 진행하는 경향
      const d = Math.random() < 0.3 && opts.includes('right') ? 'right' : U.choice(opts);
      b = step(b, d); lastD = d; walk.push(b);
    }
    if (b.o !== 0 || walk.length < len) continue;
    if (b.x === start.x && b.y === start.y) continue;
    const cover = U.grid(BX_W, BX_H, 0), upright = U.grid(BX_W, BX_H, 0);
    walk.forEach((s) => cells(s).forEach(([x, y]) => { t[y][x] = 1; cover[y][x]++; if (s.o === 0) upright[y][x]++; }));
    // 주변 장식 바닥 (지름길이 생길 수 있지만 BFS가 최소 수를 계산)
    const extra = Math.floor(len * (lvl < 3 ? 0.8 : 0.4));
    for (let i = 0; i < extra; i++) {
      const s = U.choice(walk), [cx, cy] = U.choice(cells(s));
      const nx = cx + U.randi(-1, 1), ny = cy + U.randi(-1, 1);
      if (nx >= 0 && ny >= 0 && nx < BX_W && ny < BX_H && !t[ny][nx]) t[ny][nx] = 1;
    }
    if (useFragile) for (let y = 0; y < BX_H; y++) for (let x = 0; x < BX_W; x++) if (cover[y][x] && !upright[y][x] && Math.random() < 0.6) t[y][x] = 2;
    const L = { t, sw: U.grid(BX_W, BX_H, 0), bg: U.grid(BX_W, BX_H, 0), start, bridges0: 0 };
    if (useSwitch) {
      // 워크 중간의 한 상태를 스위치로, 그 뒤에만 지나는 칸들을 다리로
      const firstIdx = U.grid(BX_W, BX_H, -1);
      walk.forEach((s, i) => cells(s).forEach(([x, y]) => { if (firstIdx[y][x] < 0) firstIdx[y][x] = i; }));
      const k = U.randi(Math.floor(walk.length * 0.2), Math.floor(walk.length * 0.5));
      const sc = cells(walk[k]).filter(([x, y]) => cover[y][x] === 1 && t[y][x] !== 3);
      if (sc.length) {
        const [sx, sy] = sc[0];
        t[sy][sx] = walk[k].o === 0 && lvl >= 10 ? 5 : 4;
        let made = 0;
        for (let i = walk.length - 3; i > k + 2 && made < 3; i--) for (const [x, y] of cells(walk[i])) if (firstIdx[y][x] > k && t[y][x] && made < 3 && upright[y][x] === 0) { t[y][x] = 6; made++; }
      }
    }
    t[b.y][b.x] = 3;
    t[start.y][start.x] = 1;
    const sol = bfs(L, start, 0);
    if (!sol) continue;
    const score = sol.length;
    if (!best || score > best.par) best = { L, par: score };
    if (score >= len * 0.7) break;
  }
  return best;
}
function bridgeOpen(x, y) { return (S.br >> S.L.bg[y][x]) & 1; }
function loadLevel(g) {
  const lv = genLevel(S.lvl);
  S.L = lv.L; S.par = lv.par; S.mode = 'play'; S.falls = S.falls || 0;
  // 화면 중앙 정렬
  let minx = 99, maxx = 0, miny = 99, maxy = 0;
  for (let y = 0; y < BX_H; y++) for (let x = 0; x < BX_W; x++) if (S.L.t[y][x]) { minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y); }
  S.ox = 480 - ((minx + maxx + 1) / 2) * BX_T - ((miny + maxy) / 2) * 8;
  S.oy = 330 - ((miny + maxy + 1) / 2) * BX_T * 0.8;
  S.levelStart = S.time || 0;
  resetLevel(g);
  S.time = 0; S.hintsUsed = 0;
  say(`스테이지 ${S.lvl + 1} — 최소 ${S.par}수`);
}
function resetLevel(g) {
  S.b = { ...S.L.start }; S.br = S.L.bridges0; S.moves = 0; S.hist = []; S.anim = null; S.fall = null; S.sink = null;
}
function say(t) { S.msg = t; S.msgT = 2.2; }
function tryMove(g, d) {
  const nb = step(S.b, d);
  const r = landing(S.L, nb, S.br);
  S.hist.push({ b: S.b, br: S.br });
  S.moves++;
  const from = S.b;
  S.anim = {
    from, to: nb, t: 0, dur: 0.16,
    done: () => {
      S.b = nb;
      if (!r.ok) {
        S.fall = { t: 0, z: 0, vz: 2 }; S.falls++;
        g.sfx.tone(400, 0.6, 'sawtooth', 0.05, 60); g.shake(6, 0.3);
        const broke = cells(nb).some(([x, y]) => tileAt(S.L, x, y) === 2);
        if (broke) { const [bx, by] = blockCenter(); g.burst(bx, by, ['#fb923c', '#c2410c'], 20, 200, 0.8, 5); say('약한 바닥이 무너졌어요!'); }
        else say('떨어졌어요! 다시 도전');
        return;
      }
      if (r.bridges !== S.br) { g.sfx.power(); say('찰칵! 다리가 움직였어요'); const [bx, by] = blockCenter(); g.burst(bx, by, '#facc15', 16, 180, 0.6); }
      S.br = r.bridges;
      g.sfx.tone(nb.o === 0 ? 180 : 140, 0.08, 'triangle', 0.08);
      if (r.win) {
        S.sink = { t: 0 };
        g.sfx.tone(300, 0.6, 'sine', 0.07, 1200); g.later(() => g.sfx.win(), 0.5);
        const [bx, by] = blockCenter(); g.burst(bx, by, ['#22d3ee', '#fde68a', '#fff'], 40, 260, 1);
      }
    },
  };
}
function undo(g) {
  const h = S.hist.pop();
  if (!h) return;
  S.b = h.b; S.br = h.br; S.moves = Math.max(0, S.moves - 1);
  g.sfx.tone(300, 0.05, 'sine', 0.05);
}
function hint(g) {
  const sol = bfs(S.L, S.b, S.br);
  if (!sol) { say('여기선 길이 없어요. 되돌리기!'); return; }
  S.hintDir = sol[0]; S.hintT = 1.2; S.hintsUsed++;
  say(`남은 최소 ${sol.length}수`);
  g.sfx.beep(660, 0.08);
}
function nextLevel(g) {
  const extra = Math.max(0, S.moves - S.par);
  const pts = Math.max(50, 200 + S.lvl * 60 + (extra === 0 ? 200 : 0) - extra * 10 - S.hintsUsed * 40);
  g.add(pts); g.float(480, 300, extra === 0 ? `완벽! +${pts}` : `+${pts}`, '#fde68a', 34);
  S.lvl++;
  if (S.lvl >= BX_LEVELS) return g.win(`모든 스테이지 클리어! 낙하 ${S.falls}회`);
  S.unlocked = Math.max(S.unlocked, S.lvl + 1); g.save('unlocked', S.unlocked);
  loadLevel(g);
}
