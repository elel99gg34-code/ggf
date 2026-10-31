let S;
const MW = 700, NAMES = ['케플러', '베가', '시리우스', '프록시마', '오리온', '리겔', '데네브', '알타이르', '카펠라', '폴룩스', '스피카', '아크투루스', '벨라트릭스', '미라', '타우', '엡실론', '글리제', '트라피스트', '알데바란', '안타레스'];
const PT = {
  rock: { n: '암석 행성', c: ['#a8a29e', '#57534e'], ore: 2, en: 0, cr: 0 },
  gas: { n: '가스 행성', c: ['#fdba74', '#c2410c'], ore: 0, en: 2, cr: 0, ring: 1 },
  ice: { n: '얼음 행성', c: ['#e0f2fe', '#38bdf8'], ore: 1, en: 1, cr: 0 },
  garden: { n: '정원 행성', c: ['#86efac', '#1d4ed8'], ore: 1.2, en: 1.2, cr: 0 },
  crystal: { n: '수정 행성', c: ['#f0abfc', '#7e22ce'], ore: 0, en: 0.5, cr: 0.5 },
};
const SHIP = {
  f: { n: '전투정', e: '🛸', str: 1, cost: { ore: 40, en: 20, cr: 0 } },
  c: { n: '전함', e: '🚀', str: 6, cost: { ore: 160, en: 110, cr: 15 } },
  col: { n: '개척선', e: '🛰️', str: 0, cost: { ore: 100, en: 60, cr: 0 } },
};
const RES = [
  { k: 'mine', n: '자동 채굴', e: '⛏️', d: '생산량 +30%', cost: (l) => ({ ore: 0, en: 150 * (l + 1), cr: 10 * (l + 1) }) },
  { k: 'armor', n: '함선 장갑', e: '🛡️', d: '아군 전투력 +25%', cost: (l) => ({ ore: 200 * (l + 1), en: 100 * (l + 1), cr: 15 * (l + 1) }) },
  { k: 'warp', n: '워프 엔진', e: '🌀', d: '항행 거리 +70', cost: (l) => ({ ore: 100 * (l + 1), en: 200 * (l + 1), cr: 12 * (l + 1) }) },
  { k: 'turret', n: '궤도 포대', e: '🔫', d: '방어 포대 위력 +40%', cost: (l) => ({ ore: 150 * (l + 1), en: 150 * (l + 1), cr: 10 * (l + 1) }) },
];
GAME({
  title: '우주 개척', w: 960, h: 600, bg: '#030712', controls: 'none',
  help: '행성 클릭 → 오른쪽 패널에서 채굴 기지·방어 포대·조선소 건설, 함선 건조\n🛰️ 개척선으로 중립 행성 개척 · ⚔️ 출격 후 목표 행성 클릭 (점선 원 = 항행 거리)\n자원: ⛏️광물 ⚡에너지 💎수정 · 연구로 생산·전투력·항행 거리 강화\n👾 외계 둥지가 주기적으로 습격! 방어하고 둥지 3곳을 모두 점령하면 승리\n우클릭 취소 · Space 배속 · 본거지(🏠)를 잃으면 패배 (자동 저장)',
  init(g) {
    S = null;
    const sv = g.load('run', null);
    if (sv && sv.v === 2) { S = sv; S.fleets = S.fleets || []; }
    if (!S) newGame();
    S.g = g; S.sel = S.home; S.mode = null; S.spd = 1; S.saveT = 0; S.fx = [];
    S.stars = []; for (let i = 0; i < 140; i++) S.stars.push([Math.random() * MW, Math.random() * 600, Math.random() * 1.6 + 0.3, Math.random() * 6]);
  },
  update(g, dt) {
    S.g = g;
    if (g.keyp('Space')) { S.spd = S.spd === 1 ? 2 : S.spd === 2 ? 4 : 1; g.sfx.click(); }
    input(g);
    for (let k = 0; k < S.spd; k++) sim(g, dt);
    for (const f of S.fx) f.t -= dt;
    S.fx = S.fx.filter((f) => f.t > 0);
    S.saveT += dt; if (S.saveT > 10) { S.saveT = 0; g.save('run', strip()); }
    const mine = S.pl.filter((p) => p.own === 1).length;
    g.score = Math.floor(mine * 100 + S.kills * 5 + S.mined / 25);
    g.info = `🪐 ${mine}개 행성 · 👾 둥지 ${S.pl.filter((p) => p.nest && p.own === 2).length} · ${U.fmtTime(S.t)}`;
  },
  draw(g, c) { drawMap(g, c); drawPanel(g); },
});
function strip() { const o = {}; for (const k in S) if (!['g', 'stars', 'fx', 'mode'].includes(k)) o[k] = S[k]; return o; }
function newGame() {
  let pl, tries = 0;
  do { pl = genMap(); } while (!connected(pl, 215) && ++tries < 60);
  S = { v: 2, pl, fleets: [], ore: 180, en: 120, cr: 0, t: 0, kills: 0, mined: 0, res: { mine: 0, armor: 0, warp: 0, turret: 0 }, raidT: 50, home: 0 };
  const home = pl[0];
  Object.assign(home, { own: 1, type: 'garden', lvl: 2, def: 1, yard: 1, f: 3, home: 1, r: 18 });
  const nests = pl.slice(1).sort((a, b) => b.x - a.x).slice(0, 3);
  for (const n of nests) Object.assign(n, { own: 2, nest: 1, def: 2, f: 6, lvl: 1, r: 17 });
}
function genMap() {
  const pl = [{ x: 70, y: U.rand(220, 380) }];
  let guard = 0;
  while (pl.length < 18 && guard++ < 4000) {
    const x = U.rand(40, MW - 40), y = U.rand(50, 560);
    if (pl.every((p) => Math.hypot(p.x - x, p.y - y) > 105)) pl.push({ x, y });
  }
  const types = ['rock', 'rock', 'gas', 'gas', 'ice', 'garden', 'crystal', 'crystal', 'rock', 'gas', 'ice', 'crystal'];
  return pl.map((p, i) => ({ id: i, x: p.x, y: p.y, r: U.randi(11, 16), type: i === 0 ? 'garden' : U.choice(types), name: NAMES[i % NAMES.length], own: 0, lvl: 1, def: 0, yard: 0, f: 0, c: 0, col: 0, nest: 0, home: 0, ang: Math.random() * 6, prod: 0 }));
}
function connected(pl, R) {
  const seen = new Set([0]), st = [0];
  while (st.length) { const a = pl[st.pop()]; for (const b of pl) if (!seen.has(b.id) && Math.hypot(a.x - b.x, a.y - b.y) <= R) { seen.add(b.id); st.push(b.id); } }
  return seen.size === pl.length && pl.length >= 14;
}
function range() { return 215 + S.res.warp * 70; }
function afford(c) { return S.ore >= c.ore && S.en >= c.en && S.cr >= (c.cr || 0); }
function pay(c) { S.ore -= c.ore; S.en -= c.en; S.cr -= c.cr || 0; }
function costStr(c) { return [c.ore ? '⛏️' + c.ore : '', c.en ? '⚡' + c.en : '', c.cr ? '💎' + c.cr : ''].filter(Boolean).join(' '); }
function mineCost(p) { return { ore: 60 * p.lvl, en: 40 * p.lvl, cr: p.lvl >= 3 ? 5 * p.lvl : 0 }; }
function defCost(p) { return { ore: 50 * (p.def + 1), en: 30 * (p.def + 1), cr: 0 }; }
const YARD = { ore: 200, en: 120, cr: 0 };
function strOf(o, f, c) { return (f * 1 + c * 6) * (o === 1 ? 1 + S.res.armor * 0.25 : 1 + Math.min(1.5, S.t / 900)); }
function defStr(p) { return p.def * 2.5 * (p.own === 1 ? 1 + S.res.turret * 0.4 : 1 + Math.min(1, S.t / 1200)) + (p.home ? 4 : 0) + (p.nest ? 4 : 0); }
function prodOf(p) {
  const T = PT[p.type], m = (1 + S.res.mine * 0.3) * (p.home ? 1.5 : 1) * p.lvl;
  return { ore: T.ore * m + (p.home ? 2 : 0), en: T.en * m + (p.home ? 2 : 0), cr: T.cr * m };
}
/* ---------- 입력 ---------- */
function pick(m) { let best = null, bd = 1e9; for (const p of S.pl) { const d = Math.hypot(p.x - m.x, p.y - m.y); if (d < p.r + 14 && d < bd) { bd = d; best = p; } } return best; }
function input(g) {
  const m = g.mouse;
  if (m.rclick) { S.mode = null; }
  if (!m.clicked) return;
  if (m.x >= MW) { panelClick(g, m); return; }
  const p = pick(m);
  if (S.mode && p) {
    const src = S.pl[S.mode.src];
    if (p === src) { S.mode = null; return; }
    if (Math.hypot(p.x - src.x, p.y - src.y) > range()) { g.float(p.x, p.y - 24, '항행 거리 밖!', '#fca5a5', 15); g.sfx.beep(150, 0.1); return; }
    launch(g, src, p, S.mode.k);
    S.mode = null; return;
  }
  if (p) { S.sel = p.id; g.sfx.click(); } else S.mode = null;
}
function launch(g, src, dst, k) {
  let fl;
  if (k === 'col') {
    if (src.col < 1) return;
    if (dst.own !== 0) { g.float(dst.x, dst.y - 24, '중립 행성만 개척 가능', '#fca5a5', 14); return; }
    src.col--; fl = { o: 1, f: 0, c: 0, col: 1 };
  } else {
    const f = k === 'half' ? Math.ceil(src.f / 2) : src.f, c = k === 'half' ? Math.ceil(src.c / 2) : src.c;
    if (f + c < 1) return;
    src.f -= f; src.c -= c; fl = { o: 1, f, c, col: 0 };
  }
  Object.assign(fl, { x: src.x, y: src.y, from: src.id, to: dst.id, sp: 62 });
  S.fleets.push(fl);
  g.sfx.tone(300, 0.3, 'sawtooth', 0.04, 900);
}
function panelClick(g, m) {
  const p = S.pl[S.sel];
  for (const b of S.btns || []) {
    if (!g.inRect(b.x, b.y, b.w, b.h)) continue;
    if (b.dis) { g.sfx.beep(150, 0.08); return; }
    b.fn(g, p); return;
  }
}
function tryBuy(g, cost, fn, x, y) {
  if (!afford(cost)) { g.float(x || 830, y || 300, '자원 부족!', '#fca5a5', 16); g.sfx.beep(150, 0.1); return; }
  pay(cost); fn(); g.sfx.power();
}
/* ---------- 시뮬레이션 ---------- */
function sim(g, dt) {
  S.t += dt;
  for (const p of S.pl) {
    p.ang += dt * 0.3;
    if (p.own === 1) { const r = prodOf(p); S.ore += r.ore * dt; S.en += r.en * dt; S.cr += r.cr * dt; S.mined += (r.ore + r.en + r.cr * 5) * dt; }
    else if (p.own === 2) {
      p.prod += dt * (p.nest ? 0.07 + S.t / 5000 : 0.025 + S.t / 15000);
      while (p.prod >= 1) { p.prod--; p.f++; }
      if (p.f > 60) p.f = 60;
    }
    // 방어 포대가 근처 적 함대 사격
    if (p.def > 0 && p.own) {
      p.cool = (p.cool || 0) - dt;
      if (p.cool <= 0) {
        const tg = S.fleets.find((f) => f.o !== p.own && f.to === p.id && Math.hypot(f.x - p.x, f.y - p.y) < 90 && f.f + f.c + f.col > 0);
        if (tg) { p.cool = 1.6 / p.def; S.fx.push({ k: 'shot', x1: p.x, y1: p.y, x2: tg.x, y2: tg.y, t: 0.2 }); if (tg.col) tg.col = 0; else if (tg.f > 0) tg.f--; else if (tg.c > 0 && Math.random() < 0.3) tg.c--; if (tg.o === 2) S.kills++; }
      }
    }
  }
  // 함대 이동
  for (const f of S.fleets) {
    const d = S.pl[f.to], dx = d.x - f.x, dy = d.y - f.y, L = Math.hypot(dx, dy);
    if (L < 4) { arrive(g, f, d); f.dead = 1; continue; }
    const s = Math.min(L, f.sp * dt); f.x += dx / L * s; f.y += dy / L * s;
    if (f.f + f.c + f.col <= 0) f.dead = 1;
  }
  S.fleets = S.fleets.filter((f) => !f.dead);
  // 외계인 습격
  S.raidT -= dt;
  if (S.raidT <= 0) { alienMove(g); S.raidT = Math.max(22, 48 - S.t / 30) * U.rand(0.8, 1.2); }
}
function alienMove(g) {
  const al = S.pl.filter((p) => p.own === 2 && p.f >= 4);
  if (!al.length) return;
  const src = U.choice(al);
  const R = 230 + Math.min(150, S.t / 4);
  const targets = S.pl.filter((p) => p.own !== 2 && Math.hypot(p.x - src.x, p.y - src.y) <= R);
  if (!targets.length) return;
  targets.sort((a, b) => (a.own === 1 ? 0 : 60) + Math.hypot(a.x - src.x, a.y - src.y) - ((b.own === 1 ? 0 : 60) + Math.hypot(b.x - src.x, b.y - src.y)));
  const dst = targets[0], n = Math.max(3, Math.floor(src.f * U.rand(0.5, 0.8)));
  src.f -= n;
  S.fleets.push({ o: 2, f: n, c: 0, col: 0, x: src.x, y: src.y, from: src.id, to: dst.id, sp: 48 });
  if (dst.own === 1) { g.sfx.tone(220, 0.5, 'sawtooth', 0.05, 110); S.alert = { t: 3, txt: `⚠️ 외계 함대 ${n}척이 ${dst.name}(으)로 접근 중!` }; }
}
function arrive(g, f, p) {
  if (f.o === p.own) { p.f += f.f; p.c += f.c; p.col += f.col; return; }
  if (f.col && !f.f && !f.c) {
    if (p.own === 0) { p.own = 1; p.lvl = 1; p.f = 0; p.c = 0; g.sfx.win(); g.burst(p.x, p.y, ['#60a5fa', '#a5f3fc', '#fff'], 30, 200, 0.8); g.float(p.x, p.y - 30, `🎉 ${p.name} 개척!`, '#93c5fd', 18); g.save('run', strip()); }
    else p.col += 0;
    return;
  }
  // 전투
  let A = strOf(f.o, f.f, f.c) * U.rand(0.85, 1.15);
  let D = (strOf(p.own || 2, p.f, p.c) + (p.own ? defStr(p) : 0)) * U.rand(0.85, 1.15);
  if (p.own === 0) D = 0;
  g.burst(p.x, p.y, ['#f97316', '#facc15', '#ef4444', '#fff'], 40, 260, 0.9, 3);
  g.shake(f.o === 2 && p.own === 1 ? 8 : 4, 0.3); g.sfx.explode();
  S.fx.push({ k: 'boom', x: p.x, y: p.y, t: 0.6 });
  if (A > D) {
    const loss = D / A * 0.85;
    const lostF = Math.round(f.f * loss), lostC = Math.round(f.c * loss);
    if (f.o === 1) S.kills += p.f + p.c * 3; else if (p.own === 1) { /* 아군 손실 */ }
    const wasNest = p.nest, wasHome = p.home, prev = p.own;
    p.own = f.o; p.f = Math.max(f.f - lostF, f.f + f.c ? 0 : 0); p.c = Math.max(0, f.c - lostC); p.def = Math.max(0, p.def - 1);
    if (p.f + p.c === 0) p.f = 1;
    if (f.o === 1) {
      p.home = 0; g.float(p.x, p.y - 30, wasNest ? '👾 둥지 파괴!' : `⚔️ ${p.name} 점령!`, '#fde047', 20); g.sfx.win();
      if (wasNest) { p.nest = 0; S.kills += 20; }
      if (!S.pl.some((q) => q.nest && q.own === 2)) { g.save('run', null); g.score += Math.max(500, 6000 - Math.floor(S.t * 3)); g.later(() => g.win(`👾 외계 둥지 전멸! ${U.fmtTime(S.t)} 만에 은하 평정`), 1); }
    } else {
      p.lvl = Math.max(1, p.lvl - 1); p.yard = p.yard && !wasHome ? p.yard : p.yard;
      if (prev === 1) { g.float(p.x, p.y - 30, `💥 ${p.name} 함락!`, '#f87171', 20); g.sfx.lose(); }
      if (wasHome) { p.home = 0; g.save('run', null); g.later(() => g.over(`🏠 본거지가 함락되었어요… ${U.fmtTime(S.t)} 생존`), 1); }
    }
  } else {
    const loss = A / Math.max(D, 0.01) * 0.75;
    if (f.o === 1) S.kills += Math.round(p.f * loss);
    else S.kills += f.f;
    p.f = Math.max(0, Math.round(p.f * (1 - loss))); p.c = Math.max(0, Math.round(p.c * (1 - loss * 0.7)));
    if (p.own === 1) { g.float(p.x, p.y - 30, '🛡️ 방어 성공!', '#86efac', 18); g.add(30); }
    else g.float(p.x, p.y - 30, '공격 실패…', '#fca5a5', 16);
  }
}
/* ---------- 그리기 ---------- */
function ownC(o) { return o === 1 ? '#3b82f6' : o === 2 ? '#ef4444' : '#6b7280'; }
function drawMap(g, c) {
  g.rect(0, 0, MW, 600, '#030712');
  for (const s of S.stars) { c.globalAlpha = 0.4 + 0.4 * Math.sin(g.time * 2 + s[3]); g.rect(s[0], s[1], s[2], s[2], '#fff'); }
  c.globalAlpha = 1;
  const sel = S.pl[S.sel];
  // 항로
  if (sel && sel.own === 1) {
    c.setLineDash([4, 6]);
    g.ring(sel.x, sel.y, range(), S.mode ? 'rgba(96,165,250,.6)' : 'rgba(96,165,250,.18)', S.mode ? 2 : 1);
    if (S.mode) for (const p of S.pl) if (p !== sel && Math.hypot(p.x - sel.x, p.y - sel.y) <= range() && (S.mode.k !== 'col' || p.own === 0)) g.line(sel.x, sel.y, p.x, p.y, S.mode.k === 'col' ? 'rgba(134,239,172,.35)' : 'rgba(248,113,113,.35)', 1);
    c.setLineDash([]);
  }
  for (const f of S.fleets) { const d = S.pl[f.to]; c.setLineDash([2, 5]); g.line(f.x, f.y, d.x, d.y, f.o === 1 ? 'rgba(96,165,250,.4)' : 'rgba(248,113,113,.5)', 1); c.setLineDash([]); }
  // 행성
  for (const p of S.pl) {
    const T = PT[p.type];
    if (p.own) g.circle(p.x, p.y, p.r + 9, p.own === 1 ? 'rgba(59,130,246,.12)' : 'rgba(239,68,68,.15)');
    const gr = c.createRadialGradient(p.x - p.r * 0.4, p.y - p.r * 0.4, 1, p.x, p.y, p.r);
    gr.addColorStop(0, T.c[0]); gr.addColorStop(1, T.c[1]);
    c.fillStyle = gr; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.283); c.fill();
    if (T.ring) { c.save(); c.translate(p.x, p.y); c.scale(1, 0.35); g.ring(0, 0, p.r + 7, 'rgba(253,186,116,.7)', 3); c.restore(); }
    g.ring(p.x, p.y, p.r + 4, ownC(p.own), p.id === S.sel ? 3 : 1.5);
    if (p.id === S.sel) g.ring(p.x, p.y, p.r + 8 + Math.sin(g.time * 5) * 2, '#fff', 1);
    if (p.nest) g.emoji('👾', p.x, p.y, 20);
    if (p.home) g.emoji('🏠', p.x, p.y, 16);
    if (p.yard && !p.home) g.emoji('🏗️', p.x + p.r, p.y - p.r, 11);
    for (let i = 0; i < p.def; i++) { const a = p.ang + i * 6.283 / p.def; g.circle(p.x + Math.cos(a) * (p.r + 6), p.y + Math.sin(a) * (p.r + 6), 2.5, '#facc15'); }
    g.text(p.name + (p.own === 1 ? ` Lv${p.lvl}` : ''), p.x, p.y + p.r + 14, 11, p.own === 1 ? '#bfdbfe' : p.own === 2 ? '#fecaca' : '#9ca3af');
    const sh = (p.f ? '🛸' + p.f : '') + (p.c ? ' 🚀' + p.c : '') + (p.col ? ' 🛰️' + p.col : '');
    if (sh) g.text(sh, p.x, p.y - p.r - 12, 11, '#fff');
  }
  // 함대
  for (const f of S.fleets) {
    const d = S.pl[f.to], a = Math.atan2(d.y - f.y, d.x - f.x);
    g.emoji(f.col && !f.f ? '🛰️' : f.o === 1 ? (f.c ? '🚀' : '🛸') : '👾', f.x, f.y, 18);
    g.circle(f.x - Math.cos(a) * 12, f.y - Math.sin(a) * 12, 3, f.o === 1 ? 'rgba(96,165,250,.7)' : 'rgba(248,113,113,.7)');
    const n = f.f + f.c + f.col; g.text(String(n), f.x + 12, f.y - 10, 11, f.o === 1 ? '#93c5fd' : '#fca5a5');
  }
  for (const fx of S.fx) {
    if (fx.k === 'shot') g.line(fx.x1, fx.y1, fx.x2, fx.y2, '#fde047', 2);
    if (fx.k === 'boom') g.ring(fx.x, fx.y, 40 * (1 - fx.t / 0.6) + 10, `rgba(251,146,60,${fx.t})`, 3);
  }
  if (S.mode) g.text(S.mode.k === 'col' ? '🛰️ 개척할 중립 행성을 클릭 (우클릭 취소)' : '⚔️ 출격할 목표 행성을 클릭 (우클릭 취소)', MW / 2, 20, 15, '#fde047');
  if (S.alert && S.alert.t > 0) { S.alert.t -= 1 / 60; g.rrect(MW / 2 - 200, 34, 400, 28, 8, 'rgba(127,29,29,.85)'); g.text(S.alert.txt, MW / 2, 48, 13, '#fff'); }
  g.text(`▶×${S.spd} (Space)`, 10, 588, 11, '#64748b', 'left');
  g.text(`다음 습격 ~${Math.ceil(S.raidT)}초`, MW - 10, 588, 11, '#f87171', 'right');
}
function btn(g, x, y, w, h, label, sub, col, dis, fn) {
  S.btns.push({ x, y, w, h, dis, fn });
  g.rrect(x, y, w, h, 8, dis ? '#1f2937' : g.inRect(x, y, w, h) ? lighten(col) : col, 'rgba(255,255,255,.15)', 1);
  g.text(label, x + w / 2, y + (sub ? h / 2 - 7 : h / 2), 13, dis ? '#6b7280' : '#fff');
  if (sub) g.text(sub, x + w / 2, y + h / 2 + 9, 10, dis ? '#4b5563' : '#e5e7eb');
}
function lighten(c) { return c + 'cc'; }
function drawPanel(g) {
  S.btns = [];
  g.rect(MW, 0, 960 - MW, 600, '#0b1120');
  g.line(MW, 0, MW, 600, '#1e3a8a', 2);
  const inc = { ore: 0, en: 0, cr: 0 }; for (const p of S.pl) if (p.own === 1) { const r = prodOf(p); inc.ore += r.ore; inc.en += r.en; inc.cr += r.cr; }
  [['⛏️', 'ore', '광물'], ['⚡', 'en', '에너지'], ['💎', 'cr', '수정']].forEach(([e, k, n], i) => {
    const y = 14 + i * 24; g.emoji(e, MW + 18, y + 2, 16); g.text(n, MW + 32, y + 2, 12, '#94a3b8', 'left');
    g.text(Math.floor(S[k]).toLocaleString(), MW + 170, y + 2, 15, '#fff', 'right'); g.text('+' + inc[k].toFixed(1) + '/s', MW + 250, y + 2, 11, '#4ade80', 'right');
  });
  const p = S.pl[S.sel];
  let y = 90;
  g.rrect(MW + 8, y, 244, 112, 10, '#111827', ownC(p.own), 2);
  g.text(`${p.home ? '🏠 ' : p.nest ? '👾 ' : ''}${p.name}`, MW + 18, y + 16, 16, '#fff', 'left');
  g.text(PT[p.type].n, MW + 242, y + 16, 11, '#94a3b8', 'right');
  g.text(p.own === 1 ? '아군 식민지' : p.own === 2 ? (p.nest ? '외계 둥지' : '외계인 점령지') : '중립 (개척 가능)', MW + 18, y + 38, 12, ownC(p.own) === '#6b7280' ? '#d1d5db' : ownC(p.own), 'left');
  const pr = prodOf(p);
  if (p.own === 1) g.text(`생산 ⛏️${pr.ore.toFixed(1)} ⚡${pr.en.toFixed(1)} 💎${pr.cr.toFixed(1)}`, MW + 18, y + 58, 11, '#cbd5e1', 'left');
  else { const T = PT[p.type]; g.text(`잠재력 ⛏️${T.ore} ⚡${T.en} 💎${T.cr}`, MW + 18, y + 58, 11, '#cbd5e1', 'left'); }
  g.text(`방어 포대 ${p.def} · 조선소 ${p.yard ? '✓' : '✗'}`, MW + 18, y + 78, 11, '#cbd5e1', 'left');
  const ds = Math.round(strOf(p.own || 2, p.f, p.c) + (p.own ? defStr(p) : 0));
  g.text(`🛸${p.f} 🚀${p.c} 🛰️${p.col} · 전투력 ${p.own ? ds : 0}`, MW + 18, y + 98, 12, '#fde68a', 'left');
  y = 212;
  if (p.own === 1) {
    btn(g, MW + 8, y, 120, 40, `⛏️ 채굴 Lv${p.lvl + 1}`, costStr(mineCost(p)), '#065f46', p.lvl >= 6 || !afford(mineCost(p)), (g2, q) => tryBuy(g2, mineCost(q), () => { q.lvl++; g2.burst(q.x, q.y, '#4ade80', 16, 120, 0.5); }));
    btn(g, MW + 132, y, 120, 40, `🔫 포대 +1`, costStr(defCost(p)), '#78350f', p.def >= 6 || !afford(defCost(p)), (g2, q) => tryBuy(g2, defCost(q), () => q.def++));
    y += 46;
    if (!p.yard) btn(g, MW + 8, y, 244, 40, '🏗️ 조선소 건설', costStr(YARD), '#1e3a8a', !afford(YARD), (g2, q) => tryBuy(g2, YARD, () => (q.yard = 1)));
    else ['f', 'c', 'col'].forEach((k, i) => { const s = SHIP[k]; btn(g, MW + 8 + i * 82, y, 78, 40, `${s.e} ${s.n}`, costStr(s.cost).replace(/ /g, ''), '#312e81', !afford(s.cost), (g2, q) => tryBuy(g2, s.cost, () => { q[k]++; g2.burst(q.x, q.y, '#93c5fd', 8, 80, 0.4); })); });
    y += 46;
    btn(g, MW + 8, y, 120, 40, '⚔️ 전체 출격', '', '#991b1b', p.f + p.c < 1, (g2, q) => { S.mode = { src: q.id, k: 'all' }; g2.sfx.click(); });
    btn(g, MW + 132, y, 120, 40, '⚔️ 절반 출격', '', '#7f1d1d', p.f + p.c < 1, (g2, q) => { S.mode = { src: q.id, k: 'half' }; g2.sfx.click(); });
    y += 46;
    btn(g, MW + 8, y, 244, 34, '🛰️ 개척선 보내기', '', '#166534', p.col < 1, (g2, q) => { S.mode = { src: q.id, k: 'col' }; g2.sfx.click(); });
    y += 40;
  } else {
    const near = S.pl.filter((q) => q.own === 1 && Math.hypot(q.x - p.x, q.y - p.y) <= range());
    g.text(near.length ? `가까운 아군: ${near.map((q) => q.name).slice(0, 3).join(', ')}` : '항행 거리 내 아군 행성 없음', MW + 18, y + 10, 11, '#94a3b8', 'left');
    g.text(p.own === 0 ? '🛰️ 개척선을 보내 식민지로!' : `⚔️ 적 전투력 약 ${ds} — 더 강한 함대로 공격`, MW + 18, y + 32, 12, p.own === 0 ? '#86efac' : '#fca5a5', 'left');
    y += 178 - 46 + 4;
  }
  // 연구
  y = 438;
  g.text('🔬 연구', MW + 12, y, 13, '#c4b5fd', 'left');
  RES.forEach((r, i) => {
    const lv = S.res[r.k], cost = r.cost(lv), x = MW + 8 + (i % 2) * 124, yy = y + 12 + Math.floor(i / 2) * 50, mx = lv >= 4;
    btn(g, x, yy, 120, 46, `${r.e} ${r.n} ${lv}`, mx ? 'MAX' : costStr(cost), '#4c1d95', mx || !afford(cost), (g2) => tryBuy(g2, cost, () => { S.res[r.k]++; }));
  });
  btn(g, MW + 8, 560, 244, 30, '🗑️ 새 은하 (초기화)', S.confirm ? '한 번 더 클릭!' : '', S.confirm ? '#991b1b' : '#1f2937', false, (g2) => {
    if (S.confirm) { g2.save('run', null); const st = S.stars; newGame(); Object.assign(S, { g: g2, sel: 0, mode: null, spd: 1, saveT: 0, fx: [], stars: st }); }
    else { S.confirm = 1; g2.later(() => { if (S) S.confirm = 0; }, 2.5); }
  });
}
