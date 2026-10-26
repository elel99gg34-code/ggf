let S;
const SP_W = 440, SP_H = 440, SP_Y = 120, SP_X = [30, 490];
const SP_THEMES = [
  { n: '공원', sky: ['#7dd3fc', '#e0f2fe'], ground: '#86efac', gy: 260, sun: '#fde047', clouds: true, pool: ['🌳', '🌲', '🌷', '🌻', '🐕', '🐈', '🐦', '🦋', '🐝', '🏠', '⛲', '🚲', '🎈', '🪁', '🐿️', '🍄', '🐞', '🌼', '🧺', '🪨', '🐇', '🦆', '🌸', '🛝'] },
  { n: '바닷속', sky: ['#0369a1', '#38bdf8'], ground: '#fcd34d', gy: 380, bubbles: true, pool: ['🐠', '🐟', '🐡', '🦀', '🐙', '🦑', '🐚', '🐬', '🐳', '🪸', '🌿', '⚓', '🦈', '🐢', '🪼', '💎', '🦐', '🦞', '🧜', '🏴‍☠️'] },
  { n: '우주', sky: ['#020617', '#312e81'], ground: null, stars: true, pool: ['🪐', '🌙', '⭐', '🚀', '🛸', '👽', '☄️', '🌍', '🛰️', '👾', '🌟', '💫', '🔭', '🌕', '👨‍🚀', '🌑', '🌞'] },
  { n: '도시', sky: ['#fda4af', '#fef3c7'], ground: '#94a3b8', gy: 300, sun: '#fb923c', clouds: true, pool: ['🏢', '🏠', '🚗', '🚕', '🚌', '🚲', '🚦', '🌳', '🏪', '⛪', '🏥', '🚓', '🏫', '🐦', '🎈', '🛵', '🚒', '🏬', '🗼', '🚑'] },
  { n: '식탁', sky: ['#fef3c7', '#fde68a'], ground: '#b45309', gy: 200, table: true, pool: ['🍎', '🍌', '🍇', '🍓', '🍕', '🍔', '🍩', '🧁', '🍰', '☕', '🥛', '🍪', '🍉', '🥕', '🍞', '🧀', '🍳', '🥄', '🍋', '🍒', '🥐', '🍦'] },
  { n: '농장', sky: ['#a5f3fc', '#ecfeff'], ground: '#bef264', gy: 230, sun: '#facc15', clouds: true, pool: ['🐄', '🐖', '🐑', '🐔', '🐓', '🐴', '🚜', '🌾', '🌽', '🥕', '🏡', '🐐', '🦆', '🐕', '🪵', '🌻', '🐇', '🍎', '🧑‍🌾'] },
];
const SP_SHAPECOL = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316', '#ec4899', '#14b8a6'];
GAME({
  title: '틀린그림 찾기', w: 960, h: 640, bg: '#fff7ed', controls: 'dpad+ab', aLabel: '확인', bLabel: '힌트',
  help: '왼쪽과 오른쪽 그림에서 다른 곳 5개를 찾아 클릭하세요 (어느 쪽을 눌러도 OK)\n잘못 누르면 시간 -5초 · 💡힌트(X/버튼)는 한 곳을 깜빡여줘요\n방향키로 조준 + Space로 확인도 가능\n빨리 찾을수록 보너스 · 스테이지가 오를수록 그림이 복잡하고 차이가 미묘해져요',
  init(g) {
    S = { stage: 1, time: 0, hints: 3, combo: 0, miss: [], cur: { x: 220, y: 220 }, reveal: 0, clear: 0, hintT: 0, hintD: null, total: 0 };
    newStage(g);
  },
  update(g, dt) {
    S.hintT = Math.max(0, S.hintT - dt);
    for (const m of S.miss) m.t -= dt; S.miss = S.miss.filter((m) => m.t > 0);
    for (const d of S.diffs) if (d.found) d.anim = Math.min(1, d.anim + dt * 4);
    if (S.reveal > 0) { S.reveal -= dt; if (S.reveal <= 0) g.over(`스테이지 ${S.stage} · 총 ${S.total}개 발견`); return; }
    if (S.clear > 0) { S.clear -= dt; if (S.clear <= 0) { S.stage++; newStage(g); } return; }
    S.time -= dt;
    if (S.time <= 0) { S.time = 0; S.reveal = 2.5; g.sfx.lose(); return; }
    if (S.time < 10 && Math.floor(S.time) !== Math.floor(S.time + dt)) g.sfx.beep(700, 0.05);
    // 키보드 조준
    const sp = 260 * dt;
    if (g.left) S.cur.x -= sp; if (g.right) S.cur.x += sp; if (g.up) S.cur.y -= sp; if (g.down) S.cur.y += sp;
    S.cur.x = U.clamp(S.cur.x, 0, SP_W); S.cur.y = U.clamp(S.cur.y, 0, SP_H);
    if (g.pressed('a')) tryAt(g, S.cur.x, S.cur.y, 0);
    if (g.pressed('b') || g.clickIn(800, 580, 140, 48)) hint(g);
    if (g.mouse.clicked) {
      for (let p = 0; p < 2; p++) {
        const lx = g.mouse.x - SP_X[p], ly = g.mouse.y - SP_Y;
        if (lx >= 0 && lx <= SP_W && ly >= 0 && ly <= SP_H) { tryAt(g, lx, ly, p); S.cur.x = lx; S.cur.y = ly; }
      }
    }
    g.info = `스테이지 ${S.stage} · ${S.found}/5 · 💡${S.hints}`;
  },
  draw(g, c) {
    const th = S.theme;
    g.text(`STAGE ${S.stage}  ·  ${th.n}`, 30, 32, 26, '#9a3412', 'left');
    // 찾은 개수
    for (let i = 0; i < 5; i++) { const f = i < S.found; g.circle(400 + i * 40, 32, 15, f ? '#22c55e' : '#fed7aa'); g.text(f ? '✔' : '?', 400 + i * 40, 33, 16, f ? '#fff' : '#c2410c'); }
    if (S.combo >= 2) g.text(`🔥 연속 ${S.combo}`, 930, 32, 20, '#ea580c', 'right');
    // 시간 바
    const tr = S.time / S.tmax;
    g.rrect(30, 70, 900, 18, 9, '#fed7aa');
    g.rrect(30, 70, Math.max(18, 900 * tr), 18, 9, S.time < 10 ? (g.time % 0.4 < 0.2 ? '#dc2626' : '#f87171') : '#f97316');
    g.text(`${Math.ceil(S.time)}초`, 480, 80, 13, '#7c2d12');
    for (let p = 0; p < 2; p++) {
      const ox = SP_X[p];
      g.rrect(ox - 6, SP_Y - 6, SP_W + 12, SP_H + 12, 14, '#fdba74');
      c.save();
      c.beginPath(); c.rect(ox, SP_Y, SP_W, SP_H); c.clip();
      c.translate(ox, SP_Y);
      drawScene(g, c, p === 0 ? S.L : S.R, p);
      // 찾은 표시
      for (const d of S.diffs) {
        if (d.found) g.ring(d.x, d.y, d.r * (1.4 - d.anim * 0.4), '#ef4444', 4);
        else if (S.reveal > 0 && g.time % 0.5 < 0.35) g.ring(d.x, d.y, d.r, '#fde047', 5);
      }
      if (S.hintT > 0 && S.hintD && !S.hintD.found && g.time % 0.3 < 0.18) g.ring(S.hintD.x, S.hintD.y, S.hintD.r + 10, '#facc15', 6);
      for (const m of S.miss) { c.globalAlpha = Math.min(1, m.t * 2); g.text('✕', m.x, m.y, 44, '#dc2626'); c.globalAlpha = 1; }
      // 키보드 커서
      c.strokeStyle = 'rgba(15,23,42,.6)'; c.lineWidth = 2; c.setLineDash([4, 4]);
      c.beginPath(); c.arc(S.cur.x, S.cur.y, 22, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
      g.line(S.cur.x - 8, S.cur.y, S.cur.x + 8, S.cur.y, 'rgba(15,23,42,.6)', 2); g.line(S.cur.x, S.cur.y - 8, S.cur.x, S.cur.y + 8, 'rgba(15,23,42,.6)', 2);
      c.restore();
    }
    g.text('👈 원본', 250, 585, 18, '#9a3412'); g.text('다른 곳을 찾아요 👉', 710, 585, 18, '#9a3412');
    g.button(800, 580, 140, 48, `💡 힌트 ${S.hints}`, S.hints ? '#ea580c' : '#a8a29e', 19);
    g.text(`총 발견 ${S.total}`, 480, 610, 18, '#7c2d12');
    if (S.clear > 0) {
      g.rrect(280, 250, 400, 140, 24, 'rgba(255,255,255,.95)', '#22c55e', 4);
      g.text('🎉 스테이지 클리어!', 480, 295, 34, '#16a34a');
      g.text(`남은 시간 보너스 +${S.bonus}`, 480, 345, 22, '#166534');
    }
    if (S.reveal > 0) { g.rrect(330, 270, 300, 80, 20, 'rgba(255,255,255,.95)', '#dc2626', 4); g.text('⏰ 시간 종료!', 480, 310, 32, '#dc2626'); }
  },
});
function drawScene(g, c, objs, p) {
  const th = S.theme;
  const grd = c.createLinearGradient(0, 0, 0, SP_H);
  grd.addColorStop(0, th.sky[0]); grd.addColorStop(1, th.sky[1]);
  c.fillStyle = grd; c.fillRect(0, 0, SP_W, SP_H);
  if (th.stars) for (let i = 0; i < 40; i++) g.circle((i * 97 + S.seed * 13) % SP_W, (i * 61 + S.seed * 7) % SP_H, (i % 3) * 0.6 + 0.6, 'rgba(255,255,255,.7)');
  if (th.sun) g.circle(370, 60, 34, th.sun);
  if (th.ground) {
    if (th.table) { g.rect(0, th.gy, SP_W, SP_H - th.gy, th.ground); g.rect(0, th.gy, SP_W, 14, '#92400e'); for (let i = 0; i < 6; i++) g.line(0, th.gy + 40 + i * 40, SP_W, th.gy + 40 + i * 40, 'rgba(0,0,0,.08)', 2); }
    else {
      c.fillStyle = th.ground; c.beginPath(); c.moveTo(0, th.gy);
      for (let x = 0; x <= SP_W; x += 20) c.lineTo(x, th.gy + Math.sin(x / 50 + S.seed) * 10);
      c.lineTo(SP_W, SP_H); c.lineTo(0, SP_H); c.fill();
    }
  }
  const sorted = objs.slice().sort((a, b) => a.y - b.y);
  for (const o of sorted) {
    if (o.hide) continue;
    if (o.kind === 'emoji') {
      if (o.flip) { c.save(); c.translate(o.x, o.y); c.scale(-1, 1); g.emoji(o.e, 0, 0, o.s); c.restore(); }
      else g.emoji(o.e, o.x, o.y, o.s);
    } else if (o.kind === 'cloud') {
      g.circle(o.x - o.s * 0.35, o.y + 4, o.s * 0.3, o.col); g.circle(o.x, o.y - 4, o.s * 0.38, o.col); g.circle(o.x + o.s * 0.38, o.y + 4, o.s * 0.28, o.col);
    } else if (o.kind === 'bubble') {
      g.ring(o.x, o.y, o.s / 2, o.col, 2); g.circle(o.x - o.s * 0.15, o.y - o.s * 0.15, o.s * 0.08, o.col);
    } else if (o.kind === 'ball') {
      g.circle(o.x, o.y, o.s / 2, o.col); g.circle(o.x - o.s * 0.15, o.y - o.s * 0.15, o.s * 0.12, 'rgba(255,255,255,.6)');
    } else if (o.kind === 'flag') {
      g.line(o.x - o.s * 0.3, o.y + o.s / 2, o.x - o.s * 0.3, o.y - o.s / 2, '#57534e', 3);
      g.poly([[o.x - o.s * 0.3, o.y - o.s / 2], [o.x + o.s * 0.4, o.y - o.s * 0.3], [o.x - o.s * 0.3, o.y - o.s * 0.1]], o.col);
    } else if (o.kind === 'box') {
      g.rrect(o.x - o.s / 2, o.y - o.s / 2, o.s, o.s, 6, o.col, 'rgba(0,0,0,.25)', 2); g.line(o.x, o.y - o.s / 2, o.x, o.y + o.s / 2, 'rgba(255,255,255,.7)', 4);
    }
  }
}
function place(objs, s) {
  const th = S.theme;
  for (let t = 0; t < 200; t++) {
    const x = U.rand(30, SP_W - 30), y = U.rand(th.clouds ? 110 : 40, SP_H - 30);
    if (objs.every((o) => U.dist(o.x, o.y, x, y) > (o.s + s) * 0.42)) return { x, y };
  }
  return null;
}
function newStage(g) {
  const th = SP_THEMES[(S.stage - 1 + (S.themeOff = S.themeOff ?? U.randi(0, 5))) % SP_THEMES.length];
  S.theme = th; S.seed = U.randi(0, 99);
  const L = [];
  // 배경 장식 오브젝트
  if (th.clouds) for (let i = 0; i < 3; i++) L.push({ kind: 'cloud', x: 60 + i * 140 + U.rand(-20, 20), y: U.rand(35, 85), s: U.rand(60, 80), col: '#ffffff' });
  if (th.bubbles) for (let i = 0; i < 5; i++) L.push({ kind: 'bubble', x: U.rand(20, 420), y: U.rand(20, 200), s: U.rand(14, 26), col: 'rgba(255,255,255,.8)' });
  const nObj = Math.min(34, 13 + S.stage * 3);
  for (let i = 0; i < nObj; i++) {
    const shape = Math.random() < 0.22;
    const s = shape ? U.rand(24, 38) : U.rand(30, 54);
    const p = place(L, s);
    if (!p) continue;
    if (shape) L.push({ kind: U.choice(['ball', 'flag', 'box']), x: p.x, y: p.y, s, col: U.choice(SP_SHAPECOL) });
    else L.push({ kind: 'emoji', e: U.choice(th.pool), x: p.x, y: p.y, s, flip: Math.random() < 0.3 });
  }
  const R = L.map((o) => ({ ...o }));
  const diffs = [];
  const subtle = Math.min(1, (S.stage - 1) / 8);
  const types = ['remove', 'swap', 'size', 'move', 'flip', 'color', 'add'];
  let guard = 0;
  while (diffs.length < 5 && guard++ < 400) {
    const type = U.choice(types);
    if (type === 'add') {
      const s = U.rand(30, 46), p = place(R.concat(diffs.map((d) => ({ x: d.x, y: d.y, s: 70 }))), s);
      if (!p) continue;
      const side = Math.random() < 0.5 ? R : L;
      side.push({ kind: 'emoji', e: U.choice(th.pool), x: p.x, y: p.y, s, flip: false });
      if (side === L) R.push({ ...L[L.length - 1], hide: true }); else L.push({ ...R[R.length - 1], hide: true });
      diffs.push({ x: p.x, y: p.y, r: Math.max(26, s * 0.6), found: false, anim: 0, type });
      continue;
    }
    const i = U.randi(0, L.length - 1), a = L[i], b = R[i];
    if (a.used || a.hide) continue;
    if (diffs.some((d) => U.dist(d.x, d.y, a.x, a.y) < 70)) continue;
    let ok = false;
    if (type === 'remove') { (Math.random() < 0.5 ? b : a).hide = true; ok = true; }
    else if (type === 'swap' && a.kind === 'emoji') { let e; do e = U.choice(th.pool); while (e === a.e); b.e = e; ok = true; }
    else if (type === 'size') { b.s = a.s * (Math.random() < 0.5 ? U.lerp(1.5, 1.28, subtle) : U.lerp(0.6, 0.75, subtle)); ok = true; }
    else if (type === 'move') { const ang = U.rand(0, Math.PI * 2), d = U.lerp(34, 20, subtle); b.x = U.clamp(a.x + Math.cos(ang) * d, 20, SP_W - 20); b.y = U.clamp(a.y + Math.sin(ang) * d, 20, SP_H - 20); ok = true; }
    else if (type === 'flip' && a.kind === 'emoji') { b.flip = !a.flip; ok = true; }
    else if (type === 'color' && a.kind !== 'emoji') { let col; do col = U.choice(a.kind === 'cloud' ? ['#fde68a', '#cbd5e1', '#fbcfe8'] : a.kind === 'bubble' ? ['rgba(250,204,21,.9)', 'rgba(244,114,182,.9)'] : SP_SHAPECOL); while (col === a.col); b.col = col; ok = true; }
    if (!ok) continue;
    a.used = b.used = true;
    const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
    diffs.push({ x: cx, y: cy, r: Math.max(26, Math.max(a.s, b.s) * 0.6 + U.dist(a.x, a.y, b.x, b.y) / 2), found: false, anim: 0, type });
  }
  S.L = L; S.R = R; S.diffs = diffs; S.found = 0;
  S.tmax = Math.max(45, 95 - S.stage * 4); S.time = S.tmax;
  S.miss = []; S.hintD = null; S.combo = 0;
}
function tryAt(g, x, y, p) {
  let best = null, bd = 1e9;
  for (const d of S.diffs) { if (d.found) continue; const dd = U.dist(x, y, d.x, d.y); if (dd < d.r + 8 && dd < bd) { bd = dd; best = d; } }
  if (best) {
    best.found = true; S.found++; S.total++; S.combo++;
    const pts = Math.round((100 + S.combo * 30) * (1 + (S.stage - 1) * 0.2));
    g.add(pts, SP_X[p] + best.x, SP_Y + best.y - 30);
    g.sfx.coin(); g.sfx.tone(880 + S.found * 80, 0.1, 'sine', 0.06, 0, 0.06);
    for (let q = 0; q < 2; q++) g.burst(SP_X[q] + best.x, SP_Y + best.y, ['#ef4444', '#fde047', '#fff'], 16, 220);
    if (S.found >= 5) {
      S.bonus = Math.round(S.time * 10 * S.stage);
      g.add(S.bonus);
      S.clear = 2.2; S.hints = Math.min(5, S.hints + 1);
      g.sfx.win(); g.shake(5);
      g.burst(480, 330, ['#22c55e', '#fde047', '#38bdf8', '#f472b6'], 80, 450, 1.3, 5);
    }
  } else {
    // 이미 찾은 곳 근처면 무시
    if (S.diffs.some((d) => d.found && U.dist(x, y, d.x, d.y) < d.r + 8)) return;
    S.time = Math.max(0.01, S.time - 5); S.combo = 0;
    S.miss.push({ x, y, t: 0.8 });
    g.sfx.hit(); g.shake(4);
    g.float(SP_X[p] + x, SP_Y + y - 30, '-5초', '#dc2626');
  }
}
function hint(g) {
  if (S.hints <= 0) { g.sfx.hit(); return; }
  const left = S.diffs.filter((d) => !d.found);
  if (!left.length) return;
  S.hints--; S.hintD = U.choice(left); S.hintT = 2.5;
  g.sfx.power();
}
