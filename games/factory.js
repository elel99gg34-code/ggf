let S;
const T = 36, GX = 4, GY = 48, COLS = 21, ROWS = 15, PX = 768;
const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const IT = {
  io: { n: '철광석', c: '#94a3b8', sh: 'o', v: 1 },
  co: { n: '구리광석', c: '#f97316', sh: 'o', v: 1 },
  coal: { n: '석탄', c: '#18181b', sh: 'o', v: 2 },
  ip: { n: '철판', c: '#e2e8f0', sh: 's', v: 5 },
  cp: { n: '구리판', c: '#fb923c', sh: 's', v: 5 },
  gear: { n: '톱니', e: '⚙️', v: 12 },
  wire: { n: '구리선', e: '➰', v: 3 },
  circ: { n: '회로기판', e: '💾', v: 45 },
  steel: { n: '강철', e: '🔩', v: 30 },
  eng: { n: '엔진', e: '🔧', v: 130 },
  robot: { n: '로봇', e: '🤖', v: 600 },
};
const SMELT = { io: 'ip', co: 'cp' };
const REC = {
  gear: { in: { ip: 2 }, out: 'gear', n: 1, t: 1.6 },
  wire: { in: { cp: 1 }, out: 'wire', n: 2, t: 1.0 },
  circ: { in: { ip: 1, wire: 3 }, out: 'circ', n: 1, t: 2.6 },
  steel: { in: { ip: 2, coal: 1 }, out: 'steel', n: 1, t: 2.8 },
  eng: { in: { steel: 1, gear: 2 }, out: 'eng', n: 1, t: 4 },
  robot: { in: { circ: 2, eng: 1 }, out: 'robot', n: 1, t: 6 },
};
const BD = {
  belt: { n: '컨베이어', e: '➡️', cost: 8, key: 1 },
  miner: { n: '채굴기', e: '⛏️', cost: 120, key: 2 },
  furnace: { n: '제련소', e: '🔥', cost: 160, key: 3 },
  asm: { n: '조립기', e: '🏭', cost: 380, key: 4 },
  seller: { n: '판매기', e: '💰', cost: 60, key: 5 },
  split: { n: '분배기', e: '🔀', cost: 90, key: 6 },
};
const CONTRACTS = [
  { k: 'ip', n: 30, r: 400, un: ['asm'], rec: ['gear'], d: '조립기 해금 (톱니)' },
  { k: 'gear', n: 20, r: 700, un: [], rec: ['wire'], d: '구리선 레시피 해금' },
  { k: 'wire', n: 60, r: 1200, un: ['split'], rec: ['circ'], d: '회로기판 · 분배기 해금' },
  { k: 'circ', n: 20, r: 3000, un: [], rec: ['steel'], d: '강철 레시피 해금 (석탄 필요)' },
  { k: 'steel', n: 20, r: 5000, un: [], rec: ['eng'], d: '엔진 레시피 해금' },
  { k: 'eng', n: 10, r: 9000, un: [], rec: ['robot'], d: '로봇 레시피 해금' },
  { k: 'robot', n: 10, r: 0, un: [], rec: [], d: '완전 자동화 공장 완성!' },
];
const UPGS = [
  { k: 'belt', n: '벨트 속도', e: '⚡', base: 400 },
  { k: 'mine', n: '채굴 속도', e: '⛏️', base: 500 },
  { k: 'craft', n: '제작 속도', e: '🛠️', base: 700 },
  { k: 'price', n: '판매 단가', e: '💹', base: 900 },
];
const TOOLS = ['belt', 'miner', 'furnace', 'asm', 'seller', 'split', 'del', 'sel'];
GAME({
  title: '공장 자동화', w: 960, h: 600, bg: '#1c1917', controls: 'none',
  help: '오른쪽에서 건물 선택 (1~6) → 그리드 클릭/드래그로 설치\n컨베이어는 드래그한 방향으로 깔림 · Q/E 또는 우클릭으로 회전 · X 철거\n⛏️ 채굴기(광석 위) → 🔥 제련소 → 🏭 조립기 → 💰 판매기\n건물은 화살표 방향으로 결과물을 내보냄 · 조립기는 클릭해 레시피 선택\n계약을 완수해 새 레시피 해금 → 로봇 10개 납품 시 클리어 (자동 저장)',
  init(g) {
    S = null;
    const sv = g.load('run', null);
    if (sv && sv.v === 1) { try { restore(sv); } catch (e) { S = null; } }
    if (!S) newGame();
    S.g = g; S.fr = 0; S.saveT = 0; S.tool = 'belt'; S.dir = 0; S.drag = null; S.sel = null; S.flow = [];
    g.score = Math.floor(S.earned);
  },
  update(g, dt) {
    S.g = g; S.fr++;
    input(g);
    sim(g, dt);
    S.saveT += dt; if (S.saveT > 8) { S.saveT = 0; saveGame(); }
    g.score = Math.floor(S.earned);
    const c = CONTRACTS[S.ci];
    g.info = `💰${Math.floor(S.money).toLocaleString()} · 계약 ${S.ci + 1}/${CONTRACTS.length}` + (c ? ` ${IT[c.k].n} ${Math.min(S.sold[c.k] || 0, c.n)}/${c.n}` : '');
  },
  draw(g, c) { drawGrid(g, c); drawPanel(g); },
});
/* ---------- 상태 ---------- */
function newGame() {
  S = { v: 1, money: 800, earned: 0, ci: 0, sold: {}, unl: { belt: 1, miner: 1, furnace: 1, seller: 1 }, recs: {}, up: { belt: 0, mine: 0, craft: 0, price: 0 } };
  S.ore = U.grid(COLS, ROWS, 0);
  S.b = U.grid(COLS, ROWS, null);
  const blob = (k, cx, cy, n) => { const q = [[cx, cy]]; let c = 0; while (q.length && c < n) { const [x, y] = q.splice(U.randi(0, q.length - 1), 1)[0]; if (x < 0 || y < 0 || x >= COLS || y >= ROWS || S.ore[y][x]) continue; S.ore[y][x] = k; c++; for (const [dx, dy] of DIRS) q.push([x + dx, y + dy]); } };
  blob(1, U.randi(2, 5), U.randi(2, 5), 14);
  blob(1, U.randi(12, 17), U.randi(9, 12), 12);
  blob(2, U.randi(2, 5), U.randi(9, 12), 13);
  blob(2, U.randi(14, 18), U.randi(2, 4), 11);
  blob(3, U.randi(9, 11), U.randi(5, 9), 9);
}
function restore(sv) {
  S = { v: 1, money: sv.money, earned: sv.earned, ci: sv.ci, sold: sv.sold, unl: sv.unl, recs: sv.recs, up: sv.up, ore: sv.ore };
  S.b = U.grid(COLS, ROWS, null);
  for (const [x, y, t, d, rec] of sv.bl) S.b[y][x] = mk(t, d, rec);
}
function saveGame() {
  const bl = [];
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const b = S.b[y][x]; if (b) bl.push([x, y, b.t, b.d, b.rec || null]); }
  S.g.save('run', { v: 1, money: S.money, earned: S.earned, ci: S.ci, sold: S.sold, unl: S.unl, recs: S.recs, up: S.up, ore: S.ore, bl });
}
function mk(t, d, rec) { return { t, d, it: null, inb: {}, out: [], prog: 0, rec: rec || null, rot: 0, anim: 0 }; }
function at(x, y) { return x >= 0 && y >= 0 && x < COLS && y < ROWS ? S.b[y][x] : null; }
function upCost(u) { return Math.round(u.base * Math.pow(2.6, S.up[u.k])); }
function beltSpd() { return 1.6 * (1 + S.up.belt * 0.45); }
function sellVal(k) { return IT[k].v * (1 + S.up.price * 0.25); }
/* ---------- 입력 ---------- */
function input(g) {
  const m = g.mouse;
  for (let i = 0; i < 6; i++) if (g.keyp('Digit' + (i + 1))) { const t = TOOLS[i]; if (S.unl[t]) { S.tool = t; g.sfx.click(); } }
  if (g.keyp('KeyX')) { S.tool = S.tool === 'del' ? 'belt' : 'del'; g.sfx.click(); }
  if (g.keyp('KeyQ')) { S.dir = (S.dir + 3) % 4; g.sfx.move(); }
  if (g.keyp('KeyE')) { S.dir = (S.dir + 1) % 4; g.sfx.move(); }
  const hx = Math.floor((m.x - GX) / T), hy = Math.floor((m.y - GY) / T), onGrid = m.x < PX - 8 && hx >= 0 && hy >= 0 && hx < COLS && hy < ROWS;
  S.hx = onGrid ? hx : -1; S.hy = onGrid ? hy : -1;
  if (m.rclick && onGrid) { const b = at(hx, hy); if (b) { b.d = (b.d + 1) % 4; b.rot = 1; } else S.dir = (S.dir + 1) % 4; g.sfx.move(); }
  if (m.clicked && m.x >= PX) { panelClick(g, m); return; }
  if (!onGrid) { if (!m.down) S.drag = null; return; }
  if (m.clicked) {
    S.drag = { x: hx, y: hy };
    const b = at(hx, hy);
    if (S.tool === 'del') { demolish(g, hx, hy); return; }
    if (b && !(S.tool === 'belt' && b.t === 'belt')) { S.sel = b.t === 'asm' ? { x: hx, y: hy } : null; g.sfx.click(); if (S.tool !== 'belt') S.drag = null; return; }
    S.sel = null;
    if (S.tool === 'sel') { S.drag = null; return; }
    place(g, hx, hy, S.dir);
  } else if (m.down && S.drag) {
    if (hx !== S.drag.x || hy !== S.drag.y) {
      const dx = Math.sign(hx - S.drag.x), dy = Math.sign(hy - S.drag.y);
      const d = Math.abs(hx - S.drag.x) >= Math.abs(hy - S.drag.y) ? (dx > 0 ? 0 : 2) : (dy > 0 ? 1 : 3);
      if (S.tool === 'belt') { const pb = at(S.drag.x, S.drag.y); if (pb && pb.t === 'belt') pb.d = d; S.dir = d; }
      if (S.tool === 'del') demolish(g, hx, hy); else if (S.tool !== 'sel') place(g, hx, hy, S.dir);
      S.drag = { x: hx, y: hy };
    }
  }
  if (!m.down) S.drag = null;
}
function place(g, x, y, d) {
  const t = S.tool, def = BD[t];
  if (!def || !S.unl[t]) return;
  const ex = at(x, y);
  if (ex) { if (ex.t === 'belt' && t === 'belt') { ex.d = d; } return; }
  if (t === 'miner' && !S.ore[y][x]) { g.float(GX + x * T + 18, GY + y * T, '광석 위에만!', '#fca5a5', 14); g.sfx.beep(150, 0.08); return; }
  if (S.money < def.cost) { g.float(GX + x * T + 18, GY + y * T, '💸 돈 부족', '#fca5a5', 14); g.sfx.beep(150, 0.08); return; }
  S.money -= def.cost;
  const b = mk(t, d, null);
  if (t === 'asm') { const rs = Object.keys(S.recs); b.rec = rs.length ? rs[rs.length - 1] : null; S.sel = { x, y }; }
  S.b[y][x] = b;
  g.sfx.tone(t === 'belt' ? 520 : 330, 0.05, 'square', 0.04);
  g.burst(GX + x * T + 18, GY + y * T + 18, '#facc15', 5, 80, 0.3, 2);
}
function demolish(g, x, y) {
  const b = at(x, y); if (!b) return;
  S.money += Math.floor(BD[b.t].cost * 0.75);
  S.b[y][x] = null;
  if (S.sel && S.sel.x === x && S.sel.y === y) S.sel = null;
  g.sfx.drop(); g.burst(GX + x * T + 18, GY + y * T + 18, '#a8a29e', 8, 120, 0.4, 3);
}
function panelClick(g, m) {
  TOOLS.forEach((t, i) => {
    const x = PX + 6 + (i % 2) * 94, y = 196 + Math.floor(i / 2) * 44;
    if (g.inRect(x, y, 88, 38)) { if (t === 'del' || t === 'sel' || S.unl[t]) { S.tool = t; g.sfx.click(); } else { g.sfx.beep(150, 0.08); g.float(x + 44, y, '🔒 계약으로 해금', '#fca5a5', 13); } }
  });
  if (g.inRect(PX + 6, 376, 52, 26)) { S.dir = (S.dir + 1) % 4; g.sfx.move(); }
  const sb = S.sel && at(S.sel.x, S.sel.y);
  if (sb && sb.t === 'asm') {
    Object.keys(REC).forEach((k, i) => {
      if (!S.recs[k]) return;
      if (g.inRect(PX + 6 + (i % 3) * 62, 434 + Math.floor(i / 3) * 34, 58, 30)) { sb.rec = k; sb.inb = {}; sb.prog = 0; g.sfx.click(); }
    });
    return;
  }
  UPGS.forEach((u, i) => {
    const x = PX + 6 + (i % 2) * 94, y = 432 + Math.floor(i / 2) * 50;
    if (!g.inRect(x, y, 88, 44)) return;
    const c = upCost(u);
    if (S.up[u.k] >= 5) return;
    if (S.money < c) { g.sfx.beep(150, 0.08); g.float(x + 44, y, '💸', '#fca5a5', 16); return; }
    S.money -= c; S.up[u.k]++; g.sfx.power(); g.burst(x + 44, y + 22, ['#facc15', '#4ade80'], 20, 160, 0.6);
  });
  if (g.inRect(PX + 6, 540, 182, 26)) {
    if (S.confirm) { g.save('run', null); newGame(); S.g = g; S.tool = 'belt'; S.sel = null; S.flow = []; S.confirm = 0; g.sfx.drop(); }
    else { S.confirm = 1; g.later(() => { if (S) S.confirm = 0; }, 2.5); }
  }
}
/* ---------- 시뮬레이션 ---------- */
function accept(x, y, k, from) {
  const b = at(x, y); if (!b) return false;
  switch (b.t) {
    case 'belt': {
      if (b.it) return false;
      if (from) { const [dx, dy] = DIRS[b.d]; if (x + dx === from[0] && y + dy === from[1]) return false; }
      b.it = { k, p: 0, f: S.fr }; return true;
    }
    case 'seller': sell(k, x, y); b.anim = 0.3; return true;
    case 'furnace': {
      if (!SMELT[k]) return false;
      let n = 0; for (const q in b.inb) n += b.inb[q];
      if (n >= 6) return false;
      b.inb[k] = (b.inb[k] || 0) + 1; return true;
    }
    case 'asm': {
      const r = REC[b.rec]; if (!r || !r.in[k]) return false;
      if ((b.inb[k] || 0) >= r.in[k] * 3) return false;
      b.inb[k] = (b.inb[k] || 0) + 1; return true;
    }
    case 'split': if (b.out.length >= 2) return false; b.out.push(k); return true;
  }
  return false;
}
function sell(k, x, y) {
  const v = sellVal(k);
  S.money += v; S.earned += v;
  S.sold[k] = (S.sold[k] || 0) + 1;
  if (Math.random() < 0.35 || v >= 30) S.g.float(GX + x * T + 18, GY + y * T + 4, '+' + Math.round(v), v >= 30 ? '#fde047' : '#86efac', v >= 30 ? 16 : 12);
  if (v >= 30) S.g.sfx.coin(); else if (Math.random() < 0.3) S.g.sfx.tone(1200, 0.03, 'sine', 0.025);
  const c = CONTRACTS[S.ci];
  if (c && c.k === k && S.sold[k] >= c.n) completeContract();
}
function completeContract() {
  const g = S.g, c = CONTRACTS[S.ci];
  S.money += c.r; S.earned += c.r;
  for (const u of c.un) S.unl[u] = 1;
  for (const r of c.rec) S.recs[r] = 1;
  S.ci++;
  g.sfx.win(); g.shake(4, 0.3);
  g.burst(480, 300, ['#facc15', '#4ade80', '#60a5fa', '#f472b6'], 60, 400, 1.2, 4);
  g.float(390, 280, `📜 계약 완료! +${c.r.toLocaleString()}`, '#fde047', 26);
  g.float(390, 320, c.d, '#86efac', 18);
  saveGame();
  if (S.ci >= CONTRACTS.length) { g.save('run', null); g.later(() => g.win(`🤖 로봇 공장 완성! 총 수익 ${Math.floor(S.earned).toLocaleString()}`), 1.2); }
}
function pushOut(x, y, b) {
  if (!b.out.length) return;
  const [dx, dy] = DIRS[b.d];
  if (accept(x + dx, y + dy, b.out[0], [x, y])) b.out.shift();
}
function sim(g, dt) {
  const bs = beltSpd(), ms = 0.7 * (1 + S.up.mine * 0.4), cs = 1 + S.up.craft * 0.35;
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const b = S.b[y][x]; if (!b) continue;
    if (b.anim > 0) b.anim -= dt;
    if (b.rot > 0) b.rot -= dt * 4;
    switch (b.t) {
      case 'belt': {
        const it = b.it; if (!it || it.f === S.fr) break;
        it.p += bs * dt;
        if (it.p >= 1) { it.p = 1; const [dx, dy] = DIRS[b.d]; if (accept(x + dx, y + dy, it.k, [x, y])) { b.it = null; const nb = at(x + dx, y + dy); if (nb && nb.t === 'belt' && nb.it) nb.it.f = S.fr; } }
        break;
      }
      case 'miner': {
        if (b.out.length < 2) { b.prog += dt * ms; if (b.prog >= 1) { b.prog = 0; b.out.push(['', 'io', 'co', 'coal'][S.ore[y][x]]); b.anim = 0.2; } }
        pushOut(x, y, b); break;
      }
      case 'furnace': {
        if (b.out.length < 3) {
          const k = Object.keys(b.inb).find((q) => b.inb[q] > 0);
          if (k) { b.prog += dt * cs / 1.4; b.work = 1; if (b.prog >= 1) { b.prog = 0; b.inb[k]--; b.out.push(SMELT[k]); } } else b.work = 0;
        }
        pushOut(x, y, b); break;
      }
      case 'asm': {
        const r = REC[b.rec];
        if (r && b.out.length < 3) {
          const ok = Object.keys(r.in).every((q) => (b.inb[q] || 0) >= r.in[q]);
          if (ok) { b.prog += dt * cs / r.t; b.work = 1; if (b.prog >= 1) { b.prog = 0; for (const q in r.in) b.inb[q] -= r.in[q]; for (let i = 0; i < r.n; i++) b.out.push(r.out); b.anim = 0.25; } } else b.work = 0;
        }
        pushOut(x, y, b); break;
      }
      case 'split': {
        if (!b.out.length) break;
        for (let tries = 0; tries < 3; tries++) {
          const off = [3, 0, 1][(b.prog + tries) % 3], d = (b.d + off) % 4, [dx, dy] = DIRS[d];
          if (accept(x + dx, y + dy, b.out[0], [x, y])) { b.out.shift(); b.prog = (b.prog + tries + 1) % 3; break; }
        }
        break;
      }
    }
  }
}
/* ---------- 그리기 ---------- */
function drawItem(g, k, x, y, s) {
  const d = IT[k];
  if (d.e) { g.emoji(d.e, x, y, s * 1.5); return; }
  if (d.sh === 'o') { g.circle(x, y, s * 0.5, d.c); g.ring(x, y, s * 0.5, 'rgba(0,0,0,.5)', 1); }
  else { g.rect(x - s * 0.45, y - s * 0.32, s * 0.9, s * 0.64, d.c); g.stroke(x - s * 0.45, y - s * 0.32, s * 0.9, s * 0.64, 'rgba(0,0,0,.45)', 1); }
}
function arrow(g, cx, cy, d, s, col) {
  const [dx, dy] = DIRS[d], px = -dy, py = dx;
  g.poly([[cx + dx * s, cy + dy * s], [cx - dx * s * 0.4 + px * s * 0.7, cy - dy * s * 0.4 + py * s * 0.7], [cx - dx * s * 0.4 - px * s * 0.7, cy - dy * s * 0.4 - py * s * 0.7]], col);
}
const ORE_C = ['', '#64748b', '#c2410c', '#0a0a0a'];
function drawGrid(g, c) {
  g.rect(0, 0, PX, 600, '#292524');
  g.text('🏭 공장 부지', 12, 24, 16, '#e7e5e4', 'left');
  const tl = S.tool === 'del' ? '🧨 철거 모드' : S.tool === 'sel' ? '🔍 선택 모드' : `${BD[S.tool].e} ${BD[S.tool].n} 설치 중 (${BD[S.tool].cost}원) · 방향 ${'→↓←↑'[S.dir]}`;
  g.text(tl, 150, 24, 13, S.tool === 'del' ? '#fca5a5' : '#a8a29e', 'left');
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const px = GX + x * T, py = GY + y * T, o = S.ore[y][x];
    g.rect(px, py, T - 1, T - 1, (x + y) & 1 ? '#3f3a36' : '#44403c');
    if (o) { g.rect(px, py, T - 1, T - 1, o === 3 ? 'rgba(0,0,0,.35)' : o === 1 ? 'rgba(100,116,139,.35)' : 'rgba(194,65,12,.3)'); for (let k = 0; k < 4; k++) g.circle(px + 8 + ((k * 13 + x * 7) % 20), py + 8 + ((k * 17 + y * 5) % 20), 3.5, ORE_C[o]); }
  }
  const tm = g.time;
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const b = S.b[y][x]; if (!b) continue;
    const px = GX + x * T, py = GY + y * T, cx = px + T / 2 - 0.5, cy = py + T / 2 - 0.5;
    if (b.t === 'belt') {
      g.rect(px + 2, py + 2, T - 5, T - 5, '#57534e');
      const [dx, dy] = DIRS[b.d], off = ((tm * beltSpd()) % 1) * T;
      c.save(); c.beginPath(); c.rect(px + 2, py + 2, T - 5, T - 5); c.clip();
      for (let k = -1; k < 2; k++) { const ox = cx + dx * (k * T / 2 + off / 2 - T / 4), oy = cy + dy * (k * T / 2 + off / 2 - T / 4); arrow(g, ox, oy, b.d, 6, 'rgba(250,204,21,.35)'); }
      c.restore();
    } else {
      const col = { miner: '#854d0e', furnace: '#7f1d1d', asm: '#1e3a8a', seller: '#14532d', split: '#581c87' }[b.t];
      const pulse = b.anim > 0 ? 3 : 0;
      g.rrect(px + 2 - pulse / 2, py + 2 - pulse / 2, T - 5 + pulse, T - 5 + pulse, 6, col, b.work ? '#fde047' : 'rgba(255,255,255,.3)', b.work ? 2 : 1);
      if (b.t !== 'seller') { const [dx, dy] = DIRS[b.d]; arrow(g, cx + dx * 13, cy + dy * 13, b.d, 5, '#fde047'); }
      if (b.t === 'asm' && b.rec) { g.emoji(BD.asm.e, cx - 7, cy - 6, 14); drawItem(g, REC[b.rec].out, cx + 4, cy + 4, 13); }
      else g.emoji(BD[b.t].e, cx, cy, 20);
      if (b.t === 'asm' && !b.rec) g.emoji('❓', cx + 8, cy - 8, 12);
      if ((b.t === 'asm' || b.t === 'furnace' || b.t === 'miner') && b.prog > 0) g.rect(px + 4, py + T - 6, (T - 9) * Math.min(1, b.prog), 3, '#4ade80');
      if (b.t === 'furnace' && b.work && Math.random() < 0.06) g.burst(cx, cy - 10, ['#f97316', '#facc15'], 2, 40, 0.4, 2);
    }
    if (S.sel && S.sel.x === x && S.sel.y === y) g.stroke(px + 1, py + 1, T - 3, T - 3, '#38bdf8', 2);
  }
  // 벨트 위 아이템
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const b = S.b[y][x]; if (!b || b.t !== 'belt' || !b.it) continue;
    const [dx, dy] = DIRS[b.d], cx = GX + x * T + T / 2, cy = GY + y * T + T / 2;
    drawItem(g, b.it.k, cx + dx * (b.it.p - 0.5) * T, cy + dy * (b.it.p - 0.5) * T, 12);
  }
  // 호버
  if (S.hx >= 0) {
    const px = GX + S.hx * T, py = GY + S.hy * T, b = at(S.hx, S.hy);
    if (S.tool === 'del') g.stroke(px, py, T - 1, T - 1, '#ef4444', 2);
    else if (!b && BD[S.tool]) {
      c.globalAlpha = 0.5; g.rrect(px + 2, py + 2, T - 5, T - 5, 6, '#57534e'); g.emoji(BD[S.tool].e, px + T / 2, py + T / 2, 18);
      if (S.tool !== 'seller') arrow(g, px + T / 2 + DIRS[S.dir][0] * 13, py + T / 2 + DIRS[S.dir][1] * 13, S.dir, 5, '#fde047');
      c.globalAlpha = 1;
      const bad = S.tool === 'miner' && !S.ore[S.hy][S.hx];
      g.stroke(px, py, T - 1, T - 1, bad ? '#ef4444' : '#fff', 2);
    } else g.stroke(px, py, T - 1, T - 1, '#fff', 1);
    if (b) tooltip(g, b, px, py);
  }
}
function tooltip(g, b, px, py) {
  const lines = [BD[b.t].e + ' ' + BD[b.t].n];
  if (b.t === 'belt' && b.it) lines.push('운반 중: ' + IT[b.it.k].n);
  if (b.t === 'miner') lines.push('채굴: ' + (IT[['', 'io', 'co', 'coal'][S.ore[S.hy][S.hx]]] || IT.io).n);
  if (b.t === 'furnace') lines.push('광석 → 판 (철/구리)');
  if (b.t === 'asm') { if (b.rec) { const r = REC[b.rec]; lines.push(Object.keys(r.in).map((k) => `${IT[k].n} ${b.inb[k] || 0}/${r.in[k]}`).join(', ') + ' → ' + IT[r.out].n + (r.n > 1 ? '×' + r.n : '')); } else lines.push('클릭해서 레시피 선택!'); }
  if (b.t === 'seller') lines.push('들어온 물건을 판매');
  if (b.t === 'split') lines.push('왼쪽·앞·오른쪽으로 번갈아 분배');
  if (b.out.length && b.t !== 'split') lines.push('출력 대기 ' + b.out.length + (b.out.length >= 2 ? ' (앞이 막힘?)' : ''));
  const w = Math.max(...lines.map((l) => l.length)) * 11 + 16, h = lines.length * 18 + 8;
  let tx = px + T + 4, ty = py; if (tx + w > PX - 4) tx = px - w - 4; if (ty + h > 596) ty = 596 - h;
  g.rrect(tx, ty, w, h, 6, 'rgba(12,10,9,.92)', '#78716c', 1);
  lines.forEach((l, i) => g.text(l, tx + 8, ty + 13 + i * 18, 12, i ? '#d6d3d1' : '#fde047', 'left'));
}
function drawPanel(g) {
  g.rect(PX, 0, 960 - PX, 600, '#0c0a09');
  g.text('💰 ' + Math.floor(S.money).toLocaleString(), PX + 10, 22, 20, '#fde047', 'left');
  g.text('총 수익 ' + Math.floor(S.earned).toLocaleString(), PX + 10, 44, 12, '#a8a29e', 'left');
  // 계약
  const c = CONTRACTS[S.ci];
  g.rrect(PX + 4, 56, 186, 96, 10, '#1c1917', '#f59e0b', 2);
  if (c) {
    const n = Math.min(S.sold[c.k] || 0, c.n);
    g.text(`📜 계약 ${S.ci + 1}/${CONTRACTS.length}`, PX + 12, 72, 13, '#fbbf24', 'left');
    drawItem(g, c.k, PX + 24, 98, 16);
    g.text(`${IT[c.k].n} ${c.n}개 판매`, PX + 40, 98, 14, '#fff', 'left');
    g.rrect(PX + 12, 114, 170, 10, 5, '#292524'); g.rrect(PX + 12, 114, Math.max(6, 170 * n / c.n), 10, 5, '#22c55e');
    g.text(`${n}/${c.n}`, PX + 182, 98, 11, '#a8a29e', 'right');
    g.text('보상: ' + (c.r ? c.r.toLocaleString() + ' · ' : '') + c.d, PX + 12, 138, 10, '#86efac', 'left');
  }
  g.text(hint(), PX + 8, 168, 10, '#a8a29e', 'left');
  g.text('건설 (1~6, X 철거)', PX + 8, 186, 11, '#78716c', 'left');
  TOOLS.forEach((t, i) => {
    const x = PX + 6 + (i % 2) * 94, y = 196 + Math.floor(i / 2) * 44;
    const lock = BD[t] && !S.unl[t], on = S.tool === t;
    g.rrect(x, y, 88, 38, 8, on ? '#b45309' : lock ? '#1c1917' : '#292524', on ? '#fde047' : 'rgba(255,255,255,.12)');
    const e = t === 'del' ? '🧨' : t === 'sel' ? '🔍' : BD[t].e, nm = t === 'del' ? '철거' : t === 'sel' ? '선택' : BD[t].n;
    g.emoji(lock ? '🔒' : e, x + 16, y + 19, 18);
    g.text(nm, x + 30, y + 13, 11, lock ? '#57534e' : '#fff', 'left');
    if (BD[t]) g.text(BD[t].cost + '원', x + 30, y + 28, 10, lock ? '#44403c' : '#fbbf24', 'left');
  });
  g.rrect(PX + 6, 376, 52, 26, 6, '#292524', '#78716c', 1); g.text('↻ ' + '→↓←↑'[S.dir], PX + 32, 389, 13, '#fff');
  g.text('Q/E·우클릭 회전', PX + 64, 389, 10, '#78716c', 'left');
  const sb = S.sel && at(S.sel.x, S.sel.y);
  if (sb && sb.t === 'asm') {
    g.text('🏭 조립기 레시피 선택', PX + 8, 420, 12, '#38bdf8', 'left');
    Object.keys(REC).forEach((k, i) => {
      const x = PX + 6 + (i % 3) * 62, y = 434 + Math.floor(i / 3) * 34, ok = S.recs[k], on = sb.rec === k;
      g.rrect(x, y, 58, 30, 6, on ? '#0369a1' : ok ? '#292524' : '#1c1917', on ? '#7dd3fc' : null);
      if (ok) { drawItem(g, REC[k].out, x + 14, y + 15, 12); g.text(IT[k].n.slice(0, 3), x + 26, y + 15, 10, '#fff', 'left'); } else g.emoji('🔒', x + 29, y + 15, 14);
    });
    if (sb.rec) { const r = REC[sb.rec]; g.text(Object.keys(r.in).map((k) => IT[k].n + r.in[k]).join('+') + ' → ' + IT[r.out].n + (r.n > 1 ? r.n : ''), PX + 8, 512, 10, '#d6d3d1', 'left'); }
  } else {
    g.text('🔬 업그레이드', PX + 8, 420, 12, '#a78bfa', 'left');
    UPGS.forEach((u, i) => {
      const x = PX + 6 + (i % 2) * 94, y = 432 + Math.floor(i / 2) * 50, lv = S.up[u.k], mx = lv >= 5, cst = upCost(u);
      g.rrect(x, y, 88, 44, 8, '#1e1b4b', 'rgba(167,139,250,.4)', 1);
      g.text(`${u.e} ${u.n}`, x + 44, y + 12, 11, '#fff');
      g.text('Lv' + lv + (mx ? ' MAX' : ''), x + 44, y + 26, 10, '#c4b5fd');
      if (!mx) g.text(cst.toLocaleString() + '원', x + 44, y + 37, 10, S.money >= cst ? '#fde047' : '#78716c');
    });
  }
  g.rrect(PX + 6, 540, 182, 26, 6, S.confirm ? '#991b1b' : '#292524'); g.text(S.confirm ? '정말 초기화? 한 번 더' : '🗑️ 새 공장 (초기화)', PX + 97, 553, 11, '#e7e5e4');
  g.text('자동 저장됨', PX + 97, 580, 10, '#57534e');
}
function hint() {
  const has = (t) => S.b.some((r) => r.some((b) => b && b.t === t));
  if (!has('miner')) return '💡 철광석(회색) 위에 채굴기 설치';
  if (!has('furnace')) return '💡 채굴기 앞에 벨트 → 제련소 연결';
  if (!has('seller')) return '💡 제련소 앞으로 벨트 → 판매기';
  if (S.ci === 1 && !has('asm')) return '💡 철판을 조립기(톱니)로 보내기';
  if (S.ci === 3) return '💡 석탄(검정)은 바로 조립기(강철)로';
  if (S.ci >= 5) return '💡 로봇 = 회로기판2 + 엔진1';
  return '💡 결과물은 화살표 방향으로 나와요';
}
