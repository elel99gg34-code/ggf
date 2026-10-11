let S;
const MT_N = 6, MT_C = 92, MT_X = 40, MT_Y = 110;
// 아이템 정의: e=이모지, n=이름, to=합쳐지면 다음, pts=만들어질 때 점수
const MT = {
  grass: { e: '🌱', n: '새싹', to: 'bush', pts: 5 },
  bush: { e: '🌿', n: '덤불', to: 'tree', pts: 20 },
  tree: { e: '🌳', n: '나무', to: 'hut', pts: 100 },
  hut: { e: '⛺', n: '천막', to: 'house', pts: 500 },
  house: { e: '🏠', n: '집', to: 'villa', pts: 1500 },
  villa: { e: '🏡', n: '전원주택', to: 'build', pts: 5000 },
  build: { e: '🏢', n: '빌딩', to: 'castle', pts: 15000 },
  castle: { e: '🏰', n: '성', to: 'palace', pts: 50000 },
  palace: { e: '🏯', n: '궁전', to: null, pts: 200000 },
  rock: { e: '🪨', n: '바위', to: 'mount', pts: 0 },
  mount: { e: '⛰️', n: '산', to: 'volcano', pts: 1000 },
  volcano: { e: '🌋', n: '화산', to: null, pts: 10000 },
  bear: { e: '🐻', n: '곰', to: null, pts: 0 },
  grave: { e: '🪦', n: '무덤', to: 'church', pts: 0 },
  church: { e: '⛪', n: '교회', to: 'temple', pts: 1000 },
  temple: { e: '🏛️', n: '신전', to: 'chest', pts: 5000 },
  chest: { e: '💰', n: '보물', to: null, pts: 0 },
  crystal: { e: '💎', n: '크리스탈', to: null, pts: 0 },
  robot: { e: '🤖', n: '로봇', to: null, pts: 0 },
};
const MT_CHAIN = ['grass', 'bush', 'tree', 'hut', 'house', 'villa', 'build', 'castle', 'palace'];
const MT_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
GAME({
  title: '머지 타운', w: 960, h: 700, bg: '#a7d48a', controls: 'dpad+ab', aLabel: '놓기', bLabel: '보관',
  help: '손에 든 물건을 빈 칸에 놓아요. 같은 물건이 3개 이상 이어지면 합쳐져서 한 단계 성장!\n🌱→🌿→🌳→⛺→🏠→🏡→🏢→🏰→🏯 · 🪨→⛰️→🌋\n🐻 곰은 돌아다니며 칸을 막아요. 가둬서 못 움직이면 🪦 무덤이 되고, 무덤 3개 → ⛪ 교회!\n💎 크리스탈은 만능, 🤖 로봇은 물건 하나를 부숴요 · 💰 보물은 클릭해서 수집\n오른쪽 보관함을 클릭(X)하면 손의 물건과 교체 · 칸이 꽉 차면 게임 끝',
  init(g) {
    S = { b: [], hand: null, hold: null, cur: { x: 2, y: 2 }, turn: 0, msg: '', msgT: 0, preview: null, bump: [], made: {}, coins: 0 };
    for (let i = 0; i < MT_N * MT_N; i++) S.b.push(null);
    const seed = ['grass', 'grass', 'grass', 'grass', 'grass', 'bush', 'bush', 'bush', 'tree', 'rock', 'rock', 'bear'];
    for (const t of seed) {
      for (let tries = 0; tries < 30; tries++) {
        const k = U.randi(0, 35);
        if (S.b[k]) continue;
        S.b[k] = item(t);
        if (t !== 'bear' && groupOf(k).length >= 3) { S.b[k] = null; continue; }
        break;
      }
    }
    S.hand = randItem(); S.next = randItem();
    g.score = 0;
  },
  update(g, dt) {
    S.msgT = Math.max(0, S.msgT - dt);
    for (const it of S.b) if (it) { it.pop = Math.max(0, it.pop - dt * 3); it.mx += (0 - it.mx) * Math.min(1, dt * 10); it.my += (0 - it.my) * Math.min(1, dt * 10); }
    if (g.mouse.moved) { const c = cellAt(g.mouse.x, g.mouse.y); if (c) S.cur = c; }
    if (g.pressed('left')) S.cur.x = Math.max(0, S.cur.x - 1);
    if (g.pressed('right')) S.cur.x = Math.min(MT_N - 1, S.cur.x + 1);
    if (g.pressed('up')) S.cur.y = Math.max(0, S.cur.y - 1);
    if (g.pressed('down')) S.cur.y = Math.min(MT_N - 1, S.cur.y + 1);
    if (g.pressed('b') || g.clickIn(700, 330, 220, 130)) { swapHold(g); return; }
    let act = g.pressed('a');
    if (g.mouse.clicked) { const c = cellAt(g.mouse.x, g.mouse.y); if (c) { S.cur = c; act = true; } }
    S.preview = previewAt(S.cur.x + S.cur.y * MT_N);
    if (act) place(g, S.cur.x + S.cur.y * MT_N);
    g.info = `턴 ${S.turn} · 보물 ${S.coins}개`;
  },
  draw(g, c) {
    g.text('🏘️ 머지 타운', MT_X, 45, 32, '#14532d', 'left');
    g.text(`빈 칸 ${S.b.filter((x) => !x).length}`, MT_X + MT_N * MT_C, 50, 18, '#14532d', 'right');
    // 보드
    g.rrect(MT_X - 10, MT_Y - 10, MT_N * MT_C + 20, MT_N * MT_C + 20, 18, '#6b9a4f');
    const pv = S.preview, pset = new Set(pv && pv.group ? pv.group : []);
    for (let y = 0; y < MT_N; y++) for (let x = 0; x < MT_N; x++) {
      const k = x + y * MT_N, px = MT_X + x * MT_C, py = MT_Y + y * MT_C;
      g.rrect(px + 3, py + 3, MT_C - 6, MT_C - 6, 12, (x + y) % 2 ? '#c6e8a8' : '#bfe39f');
      if (pset.has(k)) g.rrect(px + 3, py + 3, MT_C - 6, MT_C - 6, 12, `rgba(250,204,21,${0.35 + Math.sin(g.time * 8) * 0.2})`);
      const it = S.b[k];
      if (it) {
        const d = MT[it.t], s = 1 + it.pop * 0.35;
        let ox = 0, oy = 0;
        if (pset.has(k) && pv.target !== k) { const tx = (pv.target % MT_N) - x, ty = ((pv.target / MT_N) | 0) - y; ox = tx * 8 * (0.5 + Math.sin(g.time * 8) * 0.5); oy = ty * 8 * (0.5 + Math.sin(g.time * 8) * 0.5); }
        if (it.t === 'bear') oy += Math.sin(g.time * 4 + k) * 3;
        g.circle(px + MT_C / 2, py + MT_C - 16, 26, 'rgba(0,0,0,.12)');
        g.emoji(d.e, px + MT_C / 2 + ox + it.mx * MT_C, py + MT_C / 2 + oy + it.my * MT_C, 58 * s);
        if (it.t === 'chest') g.text('클릭!', px + MT_C / 2, py + 14, 12, '#92400e');
      }
    }
    // 커서 & 고스트
    const ck = S.cur.x + S.cur.y * MT_N, cx = MT_X + S.cur.x * MT_C, cy = MT_Y + S.cur.y * MT_C;
    g.rrect(cx + 2, cy + 2, MT_C - 4, MT_C - 4, 12, null, '#fff', 3);
    if (!S.b[ck] && S.hand !== 'robot') { c.globalAlpha = 0.55; g.emoji(MT[pv && pv.result ? pv.result : S.hand].e, cx + MT_C / 2, cy + MT_C / 2, 54); c.globalAlpha = 1; }
    if (S.b[ck] && S.hand === 'robot' && S.b[ck].t !== 'chest') { g.text('💥', cx + MT_C / 2, cy + MT_C / 2, 50); }
    // 오른쪽 패널
    const PX = 640;
    g.rrect(PX, 110, 300, 200, 18, '#f0fdf4', '#14532d', 3);
    g.text('손에 든 물건', PX + 150, 135, 18, '#14532d');
    g.emoji(MT[S.hand].e, PX + 100, 215, 80 + Math.sin(g.time * 3) * 4);
    g.text(MT[S.hand].n, PX + 100, 280, 18, '#166534');
    g.text('다음', PX + 240, 160, 14, '#4d7c0f');
    g.emoji(MT[S.next].e, PX + 240, 210, 46);
    g.text(MT[S.next].n, PX + 240, 250, 13, '#4d7c0f');
    g.rrect(700, 330, 220, 130, 16, '#fef9c3', '#a16207', 3);
    g.text('📦 보관함 (클릭/X)', 810, 352, 15, '#a16207');
    if (S.hold) { g.emoji(MT[S.hold].e, 810, 405, 58); } else g.text('비어 있음', 810, 405, 16, '#ca8a04');
    if (pv && pv.result) g.text(`→ ${MT[pv.result].n} 완성!${pv.chain > 1 ? ` (연쇄 ×${pv.chain})` : ''}`, 790, 490, 18, '#b45309');
    // 진화표
    g.text('성장 순서', PX + 150, 525, 15, '#14532d');
    MT_CHAIN.forEach((t, i) => { g.emoji(MT[t].e, PX + 10 + i * 35, 560, 28); if (!S.made[t] && i > 2) { c.globalAlpha = 0.6; g.circle(PX + 10 + i * 35, 560, 15, '#a7d48a'); c.globalAlpha = 1; g.text('?', PX + 10 + i * 35, 560, 16, '#14532d'); } });
    ['rock', 'mount', 'volcano', 'grave', 'church', 'temple', 'chest'].forEach((t, i) => g.emoji(MT[t].e, PX + 10 + i * 40, 605, 28));
    g.text('💎 만능  🤖 부수기  🐻 가두면 무덤', PX + 150, 650, 14, '#14532d');
    if (S.msgT > 0) {
      c.globalAlpha = Math.min(1, S.msgT);
      g.rrect(MT_X + 40, 360, MT_N * MT_C - 80, 70, 18, 'rgba(20,83,45,.9)');
      g.text(S.msg, MT_X + MT_N * MT_C / 2, 395, 26, '#fef08a');
      c.globalAlpha = 1;
    }
  },
});
function item(t) { return { t, pop: 1, mx: 0, my: 0 }; }
function randItem() {
  const r = Math.random() * 100;
  if (r < 58) return 'grass';
  if (r < 72) return 'bush';
  if (r < 74.5) return 'tree';
  if (r < 75.3) return 'hut';
  if (r < 88) return 'bear';
  if (r < 91.5) return 'rock';
  if (r < 95) return 'crystal';
  return 'robot';
}
function cellAt(mx, my) {
  const x = Math.floor((mx - MT_X) / MT_C), y = Math.floor((my - MT_Y) / MT_C);
  if (x < 0 || y < 0 || x >= MT_N || y >= MT_N) return null;
  return { x, y };
}
function nb(k) {
  const x = k % MT_N, y = (k / MT_N) | 0, out = [];
  for (const [dx, dy] of MT_DIRS) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < MT_N && ny < MT_N) out.push(nx + ny * MT_N); }
  return out;
}
// k칸의 아이템(또는 가정 타입 t)과 같은 타입으로 이어진 그룹 (k 포함)
function groupOf(k, t, board = S.b) {
  t = t || (board[k] && board[k].t);
  const seen = new Set([k]), st = [k];
  while (st.length) {
    const a = st.pop();
    for (const n of nb(a)) if (!seen.has(n) && board[n] && board[n].t === t) { seen.add(n); st.push(n); }
  }
  return [...seen];
}
// 빈칸 k에 타입 t를 놓았을 때 연쇄 시뮬레이션
function simulate(k, t) {
  const board = S.b.map((x) => (x ? { t: x.t } : null));
  board[k] = { t };
  let group = [], chain = 0, cur = t;
  while (MT[cur].to) {
    const gr = groupOf(k, cur, board);
    if (gr.length < 3) break;
    for (const n of gr) { if (n !== k) board[n] = null; group.push(n); }
    cur = MT[cur].to; board[k] = { t: cur }; chain++;
  }
  return { chain, result: chain ? cur : null, group };
}
function crystalType(k) {
  // 주변에서 가장 높은 성장을 만드는 타입 선택
  let best = null, bestScore = -1;
  const cands = new Set();
  for (const n of nb(k)) if (S.b[n] && MT[S.b[n].t].to) cands.add(S.b[n].t);
  for (const t of cands) {
    const r = simulate(k, t);
    if (r.chain) { const sc = r.chain * 1000 + MT_CHAIN.indexOf(t) + 10; if (sc > bestScore) { bestScore = sc; best = t; } }
  }
  return best || 'rock';
}
function previewAt(k) {
  if (S.b[k]) return null;
  let t = S.hand;
  if (t === 'robot' || t === 'bear') return null;
  if (t === 'crystal') t = crystalType(k);
  const r = simulate(k, t);
  return r.chain ? { group: r.group, target: k, result: r.result, chain: r.chain } : null;
}
function swapHold(g) {
  if (!S.hold) { S.hold = S.hand; S.hand = S.next; S.next = randItem(); }
  else { const t = S.hold; S.hold = S.hand; S.hand = t; }
  g.sfx.click();
}
function place(g, k) {
  const it = S.b[k];
  if (it && it.t === 'chest') { // 보물 수집
    S.b[k] = null; S.coins++;
    const v = 3000 + S.turn * 20; const p = cellC(k);
    g.add(v, p.x, p.y); g.sfx.coin(); g.burst(p.x, p.y, ['#fde047', '#facc15', '#fff'], 30, 260, 0.8, 5);
    return;
  }
  if (S.hand === 'robot') {
    if (!it) { g.sfx.beep(160, 0.06); flash('로봇은 물건 위에 써야 해요'); return; }
    const p = cellC(k);
    g.burst(p.x, p.y, ['#94a3b8', '#f97316', '#fff'], 24, 260, 0.6, 5); g.sfx.explode(); g.shake(6);
    S.b[k] = it.t === 'bear' ? item('grave') : null;
    if (S.b[k]) mergeAt(g, k);
    nextTurn(g);
    return;
  }
  if (it) { g.sfx.beep(160, 0.05); return; }
  let t = S.hand;
  if (t === 'crystal') t = crystalType(k);
  S.b[k] = item(t);
  g.sfx.drop();
  const p = cellC(k); g.burst(p.x, p.y, '#fff', 6, 90, 0.4, 3);
  if (t !== 'bear') mergeAt(g, k);
  nextTurn(g);
}
function mergeAt(g, k) {
  let chain = 0;
  while (S.b[k] && MT[S.b[k].t].to) {
    const t = S.b[k].t, gr = groupOf(k);
    if (gr.length < 3) break;
    for (const n of gr) if (n !== k) {
      const it = S.b[n]; S.b[n] = null;
      const p = cellC(n); g.burst(p.x, p.y, ['#fde047', '#fff', '#86efac'], 8, 150, 0.5, 4);
      void it;
    }
    const nt = MT[t].to; S.b[k] = item(nt); chain++;
    const big = gr.length >= 4 ? 2 : 1;
    const pts = MT[nt].pts * big * chain;
    const p = cellC(k);
    if (pts) g.add(pts, p.x, p.y - 20);
    if (big > 1) g.float(p.x, p.y - 50, '4개 이상! 점수 2배', '#fef08a', 18);
    if (!S.made[nt]) { S.made[nt] = true; if (MT_CHAIN.indexOf(nt) >= 3 || ['church', 'temple', 'mount', 'volcano', 'chest'].includes(nt)) flash(`${MT[nt].e} ${MT[nt].n} 첫 완성!`); }
    g.sfx.tone(400 + chain * 120 + MT_CHAIN.indexOf(nt) * 40, 0.15, 'triangle', 0.1);
    g.burst(p.x, p.y, ['#facc15', '#fff', '#4ade80'], 20 + chain * 8, 260, 0.8, 5);
    g.shake(2 + chain * 2, 0.2);
    if (nt === 'palace') { g.sfx.win(); g.shake(12, 0.5); }
  }
}
function flash(m) { S.msg = m; S.msgT = 2; }
function cellC(k) { return { x: MT_X + (k % MT_N) * MT_C + MT_C / 2, y: MT_Y + ((k / MT_N) | 0) * MT_C + MT_C / 2 }; }
function nextTurn(g) {
  S.turn++;
  moveBears(g);
  S.hand = S.next; S.next = randItem();
  // 생존 보너스
  g.add(1);
  if (S.b.every((x) => x)) {
    if (S.hand === 'robot' || S.hold === 'robot' || S.b.some((x) => x.t === 'chest')) flash('칸이 꽉 찼어요! 로봇/보물로 공간을 만드세요');
    else g.later(() => { if (S.b.every((x) => x)) g.over(`${S.turn}턴 동안 마을을 키웠어요!`); }, 0.6);
  }
}
function moveBears(g) {
  const bears = [];
  S.b.forEach((it, k) => { if (it && it.t === 'bear') bears.push(k); });
  U.shuffle(bears);
  const moved = new Set();
  for (const k of bears) {
    if (moved.has(k)) continue;
    const empt = nb(k).filter((n) => !S.b[n]);
    if (!empt.length) continue;
    const n = U.choice(empt);
    S.b[n] = S.b[k]; S.b[k] = null; moved.add(n);
    S.b[n].mx = (k % MT_N) - (n % MT_N); S.b[n].my = ((k / MT_N) | 0) - ((n / MT_N) | 0);
  }
  // 갇힌 곰 그룹 → 무덤
  const done = new Set();
  let lastGrave = -1;
  S.b.forEach((it, k) => {
    if (!it || it.t !== 'bear' || done.has(k)) return;
    const gr = groupOf(k);
    gr.forEach((n) => done.add(n));
    const free = gr.some((n) => nb(n).some((m) => !S.b[m]));
    if (!free) {
      for (const n of gr) { S.b[n] = item('grave'); lastGrave = n; const p = cellC(n); g.burst(p.x, p.y, '#9ca3af', 14, 160, 0.6, 4); }
      g.sfx.tone(200, 0.25, 'sawtooth', 0.06, 90);
      g.add(50 * gr.length, cellC(lastGrave).x, cellC(lastGrave).y);
    }
  });
  if (lastGrave >= 0) mergeAt(g, lastGrave);
}
