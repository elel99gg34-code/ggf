let S;
const T = 50, GW = 18, GH = 13, PX = GW * T;
const PATH = [[-1, 2], [4, 2], [4, 8], [1, 8], [1, 11], [9, 11], [9, 5], [7, 5], [7, 1], [13, 1], [13, 9], [11, 9], [11, 11], [16, 11], [16, 4], [18, 4]];
const TW = [
  { k: 'arrow', e: '🏹', n: '궁수탑', cost: 50, range: 130, rate: 0.5, dmg: 12, col: '#a3e635' },
  { k: 'cannon', e: '💣', n: '대포탑', cost: 90, range: 115, rate: 1.4, dmg: 30, splash: 55, col: '#f97316' },
  { k: 'frost', e: '❄️', n: '냉기탑', cost: 70, range: 110, rate: 0.9, dmg: 4, slow: 0.5, col: '#7dd3fc' },
  { k: 'tesla', e: '⚡', n: '테슬라탑', cost: 120, range: 125, rate: 1.1, dmg: 22, chain: 4, col: '#c084fc' },
];
const EN = [
  { e: '🐛', hp: 40, sp: 55, gold: 6 }, { e: '🦗', hp: 30, sp: 95, gold: 7 }, { e: '🐢', hp: 140, sp: 35, gold: 12 },
  { e: '🦇', hp: 55, sp: 80, gold: 9 }, { e: '🦂', hp: 90, sp: 60, gold: 10 }, { e: '🐲', hp: 1200, sp: 30, gold: 150, boss: true },
];
GAME({
  title: '타워 디펜스', w: PX + 220, h: GH * T, bg: '#1d2b1a', controls: 'none',
  help: '오른쪽 패널(또는 1~4키)에서 타워 선택 → 빈 땅 클릭으로 설치\n설치된 타워 클릭 → 업그레이드(최대 3단계) / 판매\nSpace = 다음 웨이브 바로 시작 (빨리 부르면 보너스 골드)\n🐲 10웨이브마다 보스 · 30웨이브 방어 시 승리!',
  init(g) {
    S = { gold: 180, lives: 20, wave: 0, towers: [], ens: [], shots: [], fx: [], sel: 0, pick: null, queue: [], spawnT: 0, waveT: 8, speed: 1, pathSet: new Set() };
    S.pts = PATH.map(([x, y]) => [x * T + T / 2, y * T + T / 2]);
    for (let i = 0; i < PATH.length - 1; i++) { const [x1, y1] = PATH[i], [x2, y2] = PATH[i + 1]; for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) S.pathSet.add(x + ',' + y); }
    S.segLen = []; S.total = 0; for (let i = 0; i < S.pts.length - 1; i++) { const l = U.dist(...S.pts[i], ...S.pts[i + 1]); S.segLen.push(l); S.total += l; }
  },
  update(g, dt0) {
    for (let i = 0; i < 4; i++) if (g.keyp('Digit' + (i + 1))) { S.sel = i; S.pick = null; }
    const m = g.mouse;
    if (m.clicked) click(g, m.x, m.y);
    if (g.keyp('Space') || g.keyp('KeyN')) callWave(g);
    if (g.keyp('KeyU') && S.pick) upgrade(g, S.pick);
    if (g.keyp('Escape')) S.pick = null;
    for (let it = 0; it < S.speed; it++) sim(g, dt0);
    if (S.lives <= 0) return g.over(`웨이브 ${S.wave} 에서 방어선 붕괴`);
    if (S.wave >= 30 && !S.queue.length && !S.ens.length) { g.add(S.lives * 500 + S.gold); return g.win(`30웨이브 방어 성공! 남은 생명 ${S.lives}`); }
    g.info = `웨이브 ${S.wave}/30 · ❤️${S.lives} · 💰${S.gold}`;
  },
  draw(g, c) {
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) g.rect(x * T, y * T, T, T, (x + y) % 2 ? '#3f6b2f' : '#467a34');
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.strokeStyle = '#7c5a36'; c.lineWidth = T * 0.86; c.beginPath(); S.pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
    c.strokeStyle = '#a07a4e'; c.lineWidth = T * 0.7; c.stroke();
    g.emoji('🏰', PX - 26, S.pts[S.pts.length - 1][1] - 4, 50);
    const m = g.mouse, hx = Math.floor(m.x / T), hy = Math.floor(m.y / T);
    if (m.x < PX && !S.pick) { const ok = canBuild(hx, hy); g.rect(hx * T, hy * T, T, T, ok ? 'rgba(255,255,255,.2)' : 'rgba(255,0,0,.25)'); if (ok) { g.circle(hx * T + T / 2, hy * T + T / 2, TW[S.sel].range, 'rgba(255,255,255,.08)'); g.ring(hx * T + T / 2, hy * T + T / 2, TW[S.sel].range, 'rgba(255,255,255,.3)', 1); } }
    for (const t of S.towers) {
      const D = TW[t.t], x = t.x * T + T / 2, y = t.y * T + T / 2;
      g.rrect(t.x * T + 4, t.y * T + 4, T - 8, T - 8, 10, '#334155', D.col, 2 + t.lvl);
      g.emoji(D.e, x, y - 2, 28);
      for (let i = 0; i < t.lvl; i++) g.circle(t.x * T + 12 + i * 10, t.y * T + T - 9, 3, '#fde047');
      if (S.pick === t) { g.circle(x, y, range(t), 'rgba(253,224,71,.1)'); g.ring(x, y, range(t), '#fde047', 2); }
    }
    for (const e of S.ens) {
      c.save(); c.translate(e.x, e.y); if (e.dir < 0) c.scale(-1, 1); g.emoji(e.e, 0, Math.sin(g.time * 10 + e.id) * 2, e.boss ? 52 : 30); c.restore();
      if (e.slowT > 0) g.ring(e.x, e.y, 16, '#7dd3fc', 2);
      g.rect(e.x - 16, e.y - (e.boss ? 34 : 22), 32, 4, '#450a0a'); g.rect(e.x - 16, e.y - (e.boss ? 34 : 22), (32 * e.hp) / e.max, 4, '#22c55e');
    }
    for (const s of S.shots) { if (s.kind === 'cannon') g.circle(s.x, s.y, 6, '#111'); else g.circle(s.x, s.y, 3, TW[s.t].col); }
    for (const f of S.fx) { c.globalAlpha = f.t * 4; if (f.k === 'chain') { c.beginPath(); c.moveTo(...f.pts[0]); f.pts.slice(1).forEach(([x, y]) => c.lineTo(x + U.rand(-4, 4), y + U.rand(-4, 4))); c.strokeStyle = '#e9d5ff'; c.lineWidth = 3; c.stroke(); } else g.circle(f.x, f.y, f.r * (1 - f.t * 2), 'rgba(249,115,22,.6)'); c.globalAlpha = 1; }
    // 패널
    g.rect(PX, 0, 220, g.H, '#0f172a');
    g.text(`💰 ${S.gold}`, PX + 20, 30, 24, '#fde047', 'left'); g.text(`❤️ ${S.lives}`, PX + 130, 30, 22, '#f87171', 'left');
    g.text(`웨이브 ${S.wave} / 30`, PX + 110, 62, 18, '#cbd5e1');
    TW.forEach((D, i) => {
      const y = 86 + i * 70, sel = S.sel === i && !S.pick, can = S.gold >= D.cost;
      g.rrect(PX + 12, y, 196, 62, 10, sel ? '#1e3a5f' : '#1e293b', sel ? '#fde047' : '#334155', 2);
      g.emoji(D.e, PX + 40, y + 31, 32);
      g.text(`${i + 1}. ${D.n}`, PX + 66, y + 20, 15, '#fff', 'left'); g.text(`💰${D.cost}  사거리 ${D.range}`, PX + 66, y + 44, 12, can ? '#a3e635' : '#f87171', 'left');
    });
    const by = 380;
    if (S.pick) {
      const t = S.pick, D = TW[t.t];
      g.rrect(PX + 12, by, 196, 150, 10, '#1e293b', '#fde047');
      g.text(`${D.e} ${D.n} Lv${t.lvl + 1}`, PX + 110, by + 20, 16, '#fff');
      g.text(`피해 ${Math.round(dmg(t))} · 처치 ${t.kills}`, PX + 110, by + 44, 13, '#cbd5e1');
      if (t.lvl < 2) g.button(PX + 22, by + 62, 176, 36, `⬆ 업그레이드 💰${upCost(t)}`, S.gold >= upCost(t) ? '#15803d' : '#475569', 15);
      else g.text('최대 레벨', PX + 110, by + 80, 15, '#fde047');
      g.button(PX + 22, by + 106, 176, 34, `판매 +💰${sellVal(t)}`, '#7f1d1d', 15);
    }
    g.button(PX + 12, g.H - 110, 196, 44, S.queue.length || S.ens.length ? `다음 웨이브 (${Math.ceil(S.waveT)}초)` : `▶ 웨이브 ${S.wave + 1} 시작`, '#2563eb', 16);
    g.button(PX + 12, g.H - 58, 196, 44, `속도 ×${S.speed}`, '#475569', 16);
    if (S.banner > 0) { S.banner -= 1 / 60; g.text(S.bannerText, PX / 2, 60, 36, '#fff'); }
  },
});
function canBuild(x, y) { return x >= 0 && y >= 0 && x < GW && y < GH && !S.pathSet.has(x + ',' + y) && !S.towers.some((t) => t.x === x && t.y === y); }
function range(t) { return TW[t.t].range * (1 + t.lvl * 0.15); }
function dmg(t) { return TW[t.t].dmg * (1 + t.lvl * 0.7); }
function upCost(t) { return Math.round(TW[t.t].cost * (0.8 + t.lvl * 0.6)); }
function sellVal(t) { return Math.round(t.spent * 0.7); }
function upgrade(g, t) { if (t.lvl >= 2 || S.gold < upCost(t)) return g.sfx.hit(); S.gold -= upCost(t); t.spent += upCost(t); t.lvl++; g.sfx.power(); }
function click(g, x, y) {
  if (x >= PX) {
    TW.forEach((D, i) => { if (g.inRect(PX + 12, 86 + i * 70, 196, 62)) { S.sel = i; S.pick = null; g.sfx.click(); } });
    if (S.pick) { if (g.inRect(PX + 22, 442, 176, 36)) upgrade(g, S.pick); if (g.inRect(PX + 22, 486, 176, 34)) { S.gold += sellVal(S.pick); S.towers.splice(S.towers.indexOf(S.pick), 1); S.pick = null; g.sfx.coin(); } }
    if (g.inRect(PX + 12, g.H - 110, 196, 44)) callWave(g);
    if (g.inRect(PX + 12, g.H - 58, 196, 44)) { S.speed = S.speed === 1 ? 2 : S.speed === 2 ? 3 : 1; g.sfx.click(); }
    return;
  }
  const tx = Math.floor(x / T), ty = Math.floor(y / T);
  const t = S.towers.find((t) => t.x === tx && t.y === ty);
  if (t) { S.pick = S.pick === t ? null : t; g.sfx.click(); return; }
  if (S.pick) { S.pick = null; return; }
  const D = TW[S.sel];
  if (canBuild(tx, ty) && S.gold >= D.cost) { S.gold -= D.cost; S.towers.push({ t: S.sel, x: tx, y: ty, lvl: 0, cd: 0, kills: 0, spent: D.cost }); g.sfx.drop(); g.burst(tx * T + T / 2, ty * T + T / 2, D.col, 12); }
  else g.sfx.hit();
}
function callWave(g) {
  if (S.wave >= 30) return;
  if (S.queue.length) return;
  const bonus = Math.max(0, Math.round(S.waveT * 2));
  if (S.wave > 0 && bonus) { S.gold += bonus; g.float(PX / 2, 100, `조기 호출 +💰${bonus}`, '#fde047'); }
  S.wave++;
  const w = S.wave, n = 8 + w * 2;
  const boss = w % 10 === 0;
  for (let i = 0; i < n; i++) { const pool = w < 3 ? [0] : w < 5 ? [0, 1] : w < 8 ? [0, 1, 2] : w < 12 ? [0, 1, 2, 3] : [0, 1, 2, 3, 4]; S.queue.push(U.choice(pool)); }
  if (boss) S.queue.push(5);
  S.spawnT = 0; S.waveT = 25; S.banner = 2; S.bannerText = boss ? `⚠️ 웨이브 ${w} — 보스!` : `웨이브 ${w}`;
  g.sfx.tone(220, 0.4, 'square', 0.04, 440);
}
let EID = 0;
function sim(g, dt) {
  S.waveT -= dt;
  if (S.waveT <= 0 && S.wave < 30 && !S.queue.length) callWave(g);
  S.spawnT -= dt;
  if (S.queue.length && S.spawnT <= 0) {
    const k = S.queue.shift(), D = EN[k], hpk = 1 + (S.wave - 1) * 0.22 + Math.pow(S.wave, 1.5) * 0.02;
    S.ens.push({ ...D, id: EID++, dist: 0, hp: D.hp * hpk, max: D.hp * hpk, x: S.pts[0][0], y: S.pts[0][1], slowT: 0, dir: 1 });
    S.spawnT = Math.max(0.35, 0.9 - S.wave * 0.015);
  }
  for (const e of S.ens) {
    e.slowT -= dt;
    e.dist += e.sp * (e.slowT > 0 ? e.slowAmt : 1) * dt;
    if (e.dist >= S.total) { e.dead = true; S.lives -= e.boss ? 10 : 1; g.sfx.hit(); g.shake(6); continue; }
    let d = e.dist, i = 0; while (d > S.segLen[i]) { d -= S.segLen[i]; i++; }
    const [x1, y1] = S.pts[i], [x2, y2] = S.pts[i + 1], k = d / S.segLen[i];
    e.dir = x2 > x1 ? 1 : x2 < x1 ? -1 : e.dir;
    e.x = x1 + (x2 - x1) * k; e.y = y1 + (y2 - y1) * k;
  }
  for (const t of S.towers) {
    t.cd -= dt;
    if (t.cd > 0) continue;
    const D = TW[t.t], tx = t.x * T + T / 2, ty = t.y * T + T / 2, R = range(t);
    const inR = S.ens.filter((e) => !e.dead && U.dist(e.x, e.y, tx, ty) < R).sort((a, b) => b.dist - a.dist);
    if (!inR.length) continue;
    t.cd = D.rate / (1 + t.lvl * 0.15);
    const tgt = inR[0];
    if (D.k === 'tesla') {
      const pts = [[tx, ty]]; let cur = tgt; const hit = new Set();
      for (let i = 0; i < D.chain + t.lvl; i++) { if (!cur) break; hit.add(cur); pts.push([cur.x, cur.y]); hurt(g, cur, dmg(t) * Math.pow(0.8, i), t); cur = S.ens.filter((e) => !e.dead && !hit.has(e) && U.dist(e.x, e.y, cur.x, cur.y) < 90).sort((a, b) => U.dist(a.x, a.y, cur.x, cur.y) - U.dist(b.x, b.y, cur.x, cur.y))[0]; }
      S.fx.push({ k: 'chain', pts, t: 0.2 }); g.sfx.tone(1400, 0.05, 'sawtooth', 0.02, 300);
    } else { S.shots.push({ x: tx, y: ty, tgt, t: t.t, kind: D.k, tw: t, sp: D.k === 'cannon' ? 320 : 600 }); if (D.k === 'arrow') g.sfx.tone(900, 0.03, 'triangle', 0.015); }
  }
  for (const s of S.shots) {
    const e = s.tgt;
    if (e.dead && s.kind !== 'cannon') { s.dead = true; continue; }
    const a = U.angle(s.x, s.y, e.x, e.y), d = U.dist(s.x, s.y, e.x, e.y);
    if (d < s.sp * dt + 6) {
      s.dead = true;
      const D = TW[s.t];
      if (D.splash) { S.fx.push({ k: 'boom', x: e.x, y: e.y, r: D.splash, t: 0.25 }); g.sfx.drop(); for (const o of S.ens) if (!o.dead && U.dist(o.x, o.y, e.x, e.y) < D.splash) hurt(g, o, dmg(s.tw), s.tw); }
      else { hurt(g, e, dmg(s.tw), s.tw); if (D.slow) { e.slowT = 1.6 + s.tw.lvl * 0.4; e.slowAmt = D.slow - s.tw.lvl * 0.08; } }
    } else { s.x += Math.cos(a) * s.sp * dt; s.y += Math.sin(a) * s.sp * dt; }
  }
  S.shots = S.shots.filter((s) => !s.dead); S.ens = S.ens.filter((e) => !e.dead);
  S.fx = S.fx.filter((f) => (f.t -= dt) > 0);
}
function hurt(g, e, d, t) {
  if (e.dead) return;
  e.hp -= d;
  if (e.hp <= 0) { e.dead = true; S.gold += e.gold; g.add(e.gold * 10); t.kills++; g.burst(e.x, e.y, '#fde047', e.boss ? 60 : 8, 180); if (e.boss) { g.sfx.explode(); g.shake(10); } else if (Math.random() < 0.3) g.sfx.coin(); }
}
