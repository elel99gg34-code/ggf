let S;
const FACES = ['🀄', '🐉', '🌸', '🍀', '🎋', '🌙', '⭐', '🔥', '💧', '🍁', '🌻', '🐼', '🐯', '🦊', '🐸', '🐙', '🍎', '🍇', '🍑', '🥝', '🍒', '🎲', '🎯', '🎴', '🔔', '💎', '👑', '🎈', '🪁', '🧧', '🏮', '🎐', '⛩️', '🗻', '🌊', '☯️'];
const TW = 56, TH = 72;
GAME({
  title: '마작 솔리테어', w: 1000, h: 760, bg: '#14532d', controls: 'none',
  help: '같은 그림의 "자유로운" 패 2개를 클릭하면 제거\n자유로운 패 = 위에 덮인 패가 없고, 왼쪽이나 오른쪽 중 한쪽이 비어있는 패\n💡 힌트 · 🔀 섞기 · ↶ 되돌리기\n모든 패를 제거하면 승리! (항상 풀 수 있게 배치돼요)',
  init(g) { S = { sel: null, hist: [], hints: 3, shuf: 2, time: 0, hl: [] }; deal(); },
  update(g, dt) {
    S.time += dt; S.hlT = Math.max(0, (S.hlT || 0) - dt);
    if (g.clickIn(820, 140, 160, 50)) return hint(g);
    if (g.clickIn(820, 200, 160, 50)) return reshuffle(g);
    if (g.clickIn(820, 260, 160, 50)) { const h = S.hist.pop(); if (h) { h.forEach((t) => (t.gone = false)); g.sfx.click(); } return; }
    if (!g.mouse.clicked) return;
    const t = pickAt(g.mouse.x, g.mouse.y);
    if (!t) { S.sel = null; return; }
    if (!free(t)) { g.sfx.hit(); t.shake = 0.3; return; }
    if (!S.sel) { S.sel = t; g.sfx.click(); return; }
    if (S.sel === t) { S.sel = null; return; }
    if (S.sel.f === t.f) {
      S.sel.gone = t.gone = true; S.hist.push([S.sel, t]); g.add(50); g.sfx.coin();
      for (const q of [S.sel, t]) { const [x, y] = scr(q); g.burst(x + TW / 2, y + TH / 2, '#fde047', 10); }
      S.sel = null;
      const left = S.tiles.filter((q) => !q.gone);
      if (!left.length) { g.add(Math.max(1000, 6000 - Math.floor(S.time) * 10)); return g.win(`클리어! ${U.fmtTime(S.time)}`); }
      if (!movesLeft().length) { if (S.shuf > 0) g.float(500, 380, '더 이상 짝이 없어요 → 🔀 섞기!', '#fde047', 26); else g.later(() => g.over(`남은 패 ${left.length}개`), 1); }
    } else { S.sel = t; g.sfx.click(); }
    g.info = `남은 패 ${S.tiles.filter((q) => !q.gone).length} · 가능한 짝 ${movesLeft().length}`;
  },
  draw(g, c) {
    const list = S.tiles.filter((t) => !t.gone).sort((a, b) => a.l - b.l || a.x - b.x || a.y - b.y);
    for (const t of list) {
      let [x, y] = scr(t);
      if (t.shake > 0) { t.shake -= 1 / 60; x += Math.sin(t.shake * 60) * 3; }
      const fr = free(t), sel = S.sel === t, hl = S.hlT > 0 && S.hl.includes(t);
      g.rrect(x + 5, y + 6, TW, TH, 8, '#0f3d22');
      g.rrect(x + 3, y + 3, TW, TH, 8, '#a8a29e');
      g.rrect(x, y, TW, TH, 8, sel ? '#fde68a' : hl ? '#bbf7d0' : fr ? '#fefce8' : '#e7e5e4', sel ? '#f59e0b' : '#78716c', sel ? 3 : 1.5);
      g.emoji(FACES[t.f], x + TW / 2, y + TH / 2, 38);
      if (!fr) { c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.roundRect ? c.roundRect(x, y, TW, TH, 8) : c.rect(x, y, TW, TH); c.fill(); }
    }
    g.text('🀄 마작 솔리테어', 900, 50, 22, '#fff');
    g.text(U.fmtTime(S.time), 900, 95, 24, '#fde047');
    g.button(820, 140, 160, 50, `💡 힌트 (${S.hints})`, S.hints ? '#15803d' : '#3f3f46', 17);
    g.button(820, 200, 160, 50, `🔀 섞기 (${S.shuf})`, S.shuf ? '#b45309' : '#3f3f46', 17);
    g.button(820, 260, 160, 50, '↶ 되돌리기', '#1e40af', 17);
    g.text(`남은 패 ${S.tiles.filter((q) => !q.gone).length}`, 900, 350, 18, '#d1fae5');
  },
});
function scr(t) { return [S.ox + t.x * TW - t.l * 6, S.oy + t.y * TH - t.l * 7]; }
function at(l, x, y) { return S.map.get(l + ',' + x + ',' + y); }
function free(t) {
  if (t.gone) return false;
  const up = at(t.l + 1, t.x, t.y); if (up && !up.gone) return false;
  const L = at(t.l, t.x - 1, t.y), R = at(t.l, t.x + 1, t.y);
  return !(L && !L.gone) || !(R && !R.gone);
}
function pickAt(mx, my) { const list = S.tiles.filter((t) => !t.gone).sort((a, b) => b.l - a.l || b.x - a.x); for (const t of list) { const [x, y] = scr(t); if (mx >= x && mx <= x + TW && my >= y && my <= y + TH) return t; } return null; }
function layout() {
  const P = [];
  const rows = ['  XXXXXXXXXX  ', ' XXXXXXXXXXXX ', 'XXXXXXXXXXXXXX', 'XXXXXXXXXXXXXX', ' XXXXXXXXXXXX ', '  XXXXXXXXXX  '];
  rows.forEach((r, y) => [...r].forEach((ch, x) => ch === 'X' && P.push({ l: 0, x, y: y + 1 })));
  for (let y = 2; y <= 5; y++) for (let x = 3; x <= 10; x++) P.push({ l: 1, x, y });
  for (let y = 3; y <= 4; y++) for (let x = 5; x <= 8; x++) P.push({ l: 2, x, y });
  P.push({ l: 3, x: 6, y: 3 }, { l: 3, x: 7, y: 4 });
  return P;
}
function deal() {
  let P;
  for (let tries = 0; tries < 50; tries++) {
    P = layout(); if (P.length % 2) P.pop();
    S.map = new Map(P.map((t) => [t.l + ',' + t.x + ',' + t.y, t])); S.tiles = P;
    P.forEach((t) => (t.gone = false));
    const order = []; let ok = true;
    while (P.some((t) => !t.gone)) { const fr = P.filter((t) => free(t)); if (fr.length < 2) { ok = false; break; } U.shuffle(fr); fr[0].gone = fr[1].gone = true; order.push([fr[0], fr[1]]); }
    if (!ok) continue;
    const faces = []; for (let i = 0; i < order.length; i++) faces.push(Math.floor(i / 2) % FACES.length);
    U.shuffle(faces);
    order.forEach(([a, b], i) => { a.f = b.f = faces[i]; });
    P.forEach((t) => (t.gone = false));
    break;
  }
  const maxX = Math.max(...P.map((t) => t.x)) + 1;
  S.ox = (800 - maxX * TW) / 2 + 10; S.oy = 70;
}
function movesLeft() { const fr = S.tiles.filter((t) => free(t)), m = []; for (let i = 0; i < fr.length; i++) for (let j = i + 1; j < fr.length; j++) if (fr[i].f === fr[j].f) m.push([fr[i], fr[j]]); return m; }
function hint(g) { if (!S.hints) return; const m = movesLeft(); if (!m.length) { g.float(500, 380, '가능한 짝이 없어요!', '#fca5a5'); return; } S.hints--; S.hl = m[0]; S.hlT = 2; g.sfx.power(); }
function reshuffle(g) {
  if (!S.shuf) return; S.shuf--;
  const left = S.tiles.filter((t) => !t.gone), faces = U.shuffle(left.map((t) => t.f));
  left.forEach((t, i) => (t.f = faces[i])); S.sel = null; S.hist = []; g.sfx.power();
}
