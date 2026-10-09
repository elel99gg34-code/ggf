let S;
const CW = 100, CH = 140, SUITS = ['♠', '♥', '♦', '♣'], RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const COLX = (i) => 40 + i * 132, TOPY = 30, TABY = 210;
GAME({
  title: '솔리테어', w: 980, h: 900, bg: '#065f46', controls: 'none',
  help: '카드를 드래그해서 옮기기 · 더블클릭 = 파운데이션으로 자동 이동\n테이블: 색이 번갈아 가며 내림차순 (빈 칸엔 K만)\n파운데이션: 같은 무늬 A → K 순서로 쌓기\n덱 클릭 = 카드 넘기기 · ↶ 되돌리기 · 4개 파운데이션 완성 시 승리!',
  init(g) { S = { hist: [], drag: null, lastClick: 0, lastCard: null, time: 0, moves: 0, auto: false, autoT: 0 }; deal(); },
  update(g, dt) {
    S.time += dt;
    if (S.auto) { S.autoT -= dt; if (S.autoT <= 0) { S.autoT = 0.08; if (!autoStep(g)) S.auto = false; } return; }
    if (g.clickIn(860, 840, 110, 44)) return undo(g);
    const m = g.mouse;
    if (m.clicked) {
      if (g.inRect(COLX(0), TOPY, CW, CH)) { drawStock(g); return; }
      const hit = pick(m.x, m.y);
      if (hit) {
        const now = g.time;
        if (S.lastCard === hit.cards[0] && now - S.lastClick < 0.4) { if (hit.cards.length === 1 && toFoundation(g, hit.from, hit.cards[0])) { S.lastCard = null; return; } }
        S.lastClick = now; S.lastCard = hit.cards[0];
        S.drag = { ...hit, ox: m.x - hit.x, oy: m.y - hit.y };
      }
    }
    if (S.drag && m.released) { drop(g, m.x, m.y); S.drag = null; }
    if (!S.auto && S.stock.length === 0 && S.waste.length === 0 && S.tab.every((col) => col.every((c) => c.up)) && S.found.reduce((a, f) => a + f.length, 0) < 52) S.auto = true;
    g.info = `이동 ${S.moves} · ⏱️${U.fmtTime(S.time)}`;
  },
  draw(g, c) {
    // 덱
    slot(g, COLX(0), TOPY); if (S.stock.length) card(g, COLX(0), TOPY, null); else g.text('↻', COLX(0) + CW / 2, TOPY + CH / 2, 40, 'rgba(255,255,255,.4)');
    g.text(S.stock.length, COLX(0) + CW / 2, TOPY + CH + 14, 13, '#a7f3d0');
    slot(g, COLX(1), TOPY);
    const w = S.waste.filter((cd) => !(S.drag && S.drag.cards.includes(cd)));
    w.slice(-3).forEach((cd, i, a) => card(g, COLX(1) + i * 18, TOPY, cd));
    for (let i = 0; i < 4; i++) { slot(g, COLX(3 + i), TOPY, SUITS[i]); const f = S.found[i].filter((cd) => !(S.drag && S.drag.cards.includes(cd))); if (f.length) card(g, COLX(3 + i), TOPY, f[f.length - 1]); }
    for (let i = 0; i < 7; i++) { slot(g, COLX(i), TABY); let y = TABY; for (const cd of S.tab[i]) { if (S.drag && S.drag.cards.includes(cd)) break; card(g, COLX(i), y, cd.up ? cd : null); y += cd.up ? 34 : 14; } }
    if (S.drag) S.drag.cards.forEach((cd, i) => card(g, g.mouse.x - S.drag.ox, g.mouse.y - S.drag.oy + i * 34, cd, true));
    g.button(860, 840, 110, 44, '↶ 되돌리기', '#064e3b', 15);
    g.text(`⏱️ ${U.fmtTime(S.time)}   이동 ${S.moves}`, 40, 862, 18, '#d1fae5', 'left');
  },
});
const red = (cd) => cd.s === 1 || cd.s === 2;
function slot(g, x, y, t) { g.rrect(x, y, CW, CH, 10, 'rgba(0,0,0,.18)', 'rgba(255,255,255,.25)', 2); if (t) g.text(t, x + CW / 2, y + CH / 2, 40, 'rgba(255,255,255,.25)'); }
function card(g, x, y, cd, lift) {
  if (lift) g.rrect(x + 4, y + 6, CW, CH, 10, 'rgba(0,0,0,.35)');
  if (!cd) { g.rrect(x, y, CW, CH, 10, '#1e40af', '#fff', 3); g.rrect(x + 8, y + 8, CW - 16, CH - 16, 6, null, 'rgba(255,255,255,.4)', 2); g.text('🂠', x + CW / 2, y + CH / 2, 40, 'rgba(255,255,255,.3)'); return; }
  g.rrect(x, y, CW, CH, 10, '#fff', '#9ca3af', 1.5);
  const col = red(cd) ? '#dc2626' : '#111827';
  g.text(RANKS[cd.r], x + 8, y + 16, 20, col, 'left'); g.text(SUITS[cd.s], x + 9, y + 38, 18, col, 'left');
  g.text(SUITS[cd.s], x + CW / 2, y + CH / 2 + 10, 48, col);
  if (cd.r >= 10) g.text(['', '', '', '', '', '', '', '', '', '', '🤴', '👸', '👑'][cd.r], x + CW - 20, y + 20, 18, col);
}
function deal() {
  const d = []; for (let s = 0; s < 4; s++) for (let r = 0; r < 13; r++) d.push({ s, r, up: false });
  U.shuffle(d);
  S.tab = []; for (let i = 0; i < 7; i++) { S.tab.push(d.splice(0, i + 1)); S.tab[i][i].up = true; }
  S.stock = d; S.waste = []; S.found = [[], [], [], []];
}
function snapshot() { return JSON.stringify({ tab: S.tab, stock: S.stock, waste: S.waste, found: S.found, score: 0 }); }
function save(g) { S.hist.push({ s: snapshot(), score: g.score }); if (S.hist.length > 100) S.hist.shift(); }
function undo(g) { const h = S.hist.pop(); if (!h) return; const o = JSON.parse(h.s); S.tab = o.tab; S.stock = o.stock; S.waste = o.waste; S.found = o.found; g.score = h.score; g.sfx.click(); }
function drawStock(g) {
  save(g);
  if (!S.stock.length) { S.stock = S.waste.reverse().map((c) => ({ ...c, up: false })); S.waste = []; g.add(-20 > -g.score ? -20 : 0); }
  else { const c = S.stock.pop(); c.up = true; S.waste.push(c); }
  g.sfx.tone(700, 0.04, 'triangle', 0.05);
}
function pick(mx, my) {
  if (S.waste.length) { const i = Math.min(2, S.waste.length - 1), x = COLX(1) + i * 18; if (mx >= x && mx <= x + CW && my >= TOPY && my <= TOPY + CH) return { from: { t: 'w' }, cards: [S.waste[S.waste.length - 1]], x, y: TOPY }; }
  for (let i = 0; i < 4; i++) { const f = S.found[i]; if (f.length && mx >= COLX(3 + i) && mx <= COLX(3 + i) + CW && my >= TOPY && my <= TOPY + CH) return { from: { t: 'f', i }, cards: [f[f.length - 1]], x: COLX(3 + i), y: TOPY }; }
  for (let i = 0; i < 7; i++) {
    const col = S.tab[i]; let y = TABY; const ys = col.map((cd) => { const v = y; y += cd.up ? 34 : 14; return v; });
    for (let k = col.length - 1; k >= 0; k--) { const top = k === col.length - 1 ? CH : (col[k].up ? 34 : 14); if (mx >= COLX(i) && mx <= COLX(i) + CW && my >= ys[k] && my <= ys[k] + top) { if (!col[k].up) return null; return { from: { t: 't', i, k }, cards: col.slice(k), x: COLX(i), y: ys[k] }; } }
  }
  return null;
}
function removeFrom(from, n) { if (from.t === 'w') S.waste.pop(); else if (from.t === 'f') S.found[from.i].pop(); else { S.tab[from.i].splice(S.tab[from.i].length - n, n); const col = S.tab[from.i]; if (col.length && !col[col.length - 1].up) { col[col.length - 1].up = true; return true; } } return false; }
function canFound(cd, i) { const f = S.found[i]; return cd.s === i && (f.length ? f[f.length - 1].r === cd.r - 1 : cd.r === 0); }
function canTab(cards, i) { const col = S.tab[i], c0 = cards[0]; if (!col.length) return c0.r === 12; const t = col[col.length - 1]; return t.up && t.r === c0.r + 1 && red(t) !== red(c0); }
function toFoundation(g, from, cd) { const i = cd.s; if (!canFound(cd, i)) return false; save(g); const rev = removeFrom(from, 1); S.found[i].push(cd); afterMove(g, 10 + (rev ? 5 : 0), from.t === 'f'); return true; }
function drop(g, mx, my) {
  const D = S.drag, cards = D.cards;
  if (Math.hypot(mx - D.ox - D.x, my - D.oy - D.y) < 5) return;
  if (cards.length === 1 && my < TOPY + CH + 30) for (let i = 0; i < 4; i++) if (mx > COLX(3 + i) - 30 && mx < COLX(3 + i) + CW + 30 && canFound(cards[0], i)) { save(g); const rev = removeFrom(D.from, 1); S.found[i].push(cards[0]); return afterMove(g, 10 + (rev ? 5 : 0)); }
  const cx = mx - D.ox + CW / 2;
  for (let i = 0; i < 7; i++) if (Math.abs(cx - (COLX(i) + CW / 2)) < 70 && !(D.from.t === 't' && D.from.i === i) && canTab(cards, i)) { save(g); const rev = removeFrom(D.from, cards.length); S.tab[i].push(...cards); return afterMove(g, (D.from.t === 'w' ? 5 : D.from.t === 'f' ? -15 : 0) + (rev ? 5 : 0)); }
  g.sfx.hit();
}
function afterMove(g, pts) {
  S.moves++; if (pts) g.add(pts); g.sfx.tone(400, 0.05, 'triangle', 0.07);
  if (S.found.every((f) => f.length === 13)) { g.add(Math.max(0, 5000 - Math.floor(S.time) * 10)); g.later(() => g.win(`클리어! ${U.fmtTime(S.time)} · ${S.moves}수`), 0.8); }
}
function autoStep(g) {
  for (let i = 0; i < 7; i++) { const col = S.tab[i]; if (col.length && toFoundation(g, { t: 't', i, k: col.length - 1 }, col[col.length - 1])) return true; }
  if (S.waste.length && toFoundation(g, { t: 'w' }, S.waste[S.waste.length - 1])) return true;
  return false;
}
