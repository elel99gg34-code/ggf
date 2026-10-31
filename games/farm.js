let S;
// 작물: k, 이름, 이모지, 씨앗값, 성장(초), 판매가, xp, 해금레벨
const FM_CROPS = [
  ['carrot', '당근', '🥕', 5, 15, 12, 3, 1], ['wheat', '밀', '🌾', 3, 12, 7, 2, 1], ['tomato', '토마토', '🍅', 12, 28, 30, 5, 2],
  ['corn', '옥수수', '🌽', 10, 24, 25, 4, 3], ['potato', '감자', '🥔', 15, 34, 40, 6, 3], ['straw', '딸기', '🍓', 25, 44, 66, 8, 4],
  ['egg', '가지', '🍆', 30, 50, 82, 9, 5], ['pump', '호박', '🎃', 45, 68, 130, 12, 6], ['melon', '수박', '🍉', 70, 88, 210, 15, 7],
  ['grape', '포도', '🍇', 90, 100, 280, 17, 8], ['pine', '파인애플', '🍍', 120, 118, 400, 20, 9],
].map((a) => ({ k: a[0], n: a[1], e: a[2], cost: a[3], time: a[4], price: a[5], xp: a[6], lv: a[7] }));
const FM_ANIM = [
  { k: 'chicken', n: '닭', e: '🐔', cost: 80, pk: 'eggs', pn: '계란', pe: '🥚', price: 26, time: 30, feed: 'wheat', fq: 1, lv: 2, xp: 4 },
  { k: 'cow', n: '젖소', e: '🐄', cost: 300, pk: 'milk', pn: '우유', pe: '🥛', price: 72, time: 50, feed: 'wheat', fq: 2, lv: 4, xp: 8 },
  { k: 'sheep', n: '양', e: '🐑', cost: 450, pk: 'wool', pn: '양털', pe: '🧶', price: 115, time: 70, feed: 'corn', fq: 1, lv: 6, xp: 11 },
  { k: 'pig', n: '돼지', e: '🐖', cost: 650, pk: 'truf', pn: '송로버섯', pe: '🍄', price: 170, time: 80, feed: 'carrot', fq: 2, lv: 8, xp: 15 },
];
const FM_ITEMS = {};
FM_CROPS.forEach((c) => (FM_ITEMS[c.k] = { n: c.n, e: c.e, price: c.price }));
FM_ANIM.forEach((a) => (FM_ITEMS[a.pk] = { n: a.pn, e: a.pe, price: a.price }));
const FM_PLOT = 92, FM_GX = 20, FM_GY = 60, FM_DAY = 120;
const FM_MAXPLOTS = [0, 9, 12, 16, 20, 25, 30, 36, 36, 36, 36];
const FM_WEATHER = [{ n: '맑음', e: '☀️' }, { n: '비', e: '🌧️' }, { n: '흐림', e: '☁️' }];
GAME({
  title: '해피 농장', w: 960, h: 640, bg: '#14532d', controls: 'dpad+ab', aLabel: '행동', bLabel: '수확',
  help: '씨앗을 고르고 빈 밭 클릭 → 심기 · 다 자란 작물 클릭 → 수확 · 자라는 작물 클릭 → 물주기(성장 1.6배)\n🐛 벌레는 클릭해서 잡고, 🐦 까마귀는 클릭해서 쫓아요 · 🔒 밭 클릭 → 확장\n🐔 동물은 밀·옥수수·당근을 먹고 계란·우유 등을 생산 · 📦 주문을 채우면 큰 보상\n키보드: 방향키 커서 · Space 행동 · X 전체 수확 · G 전체 심기 · Q 전체 물주기 · 1~9 씨앗 선택\n농장 레벨 10 달성이 목표!',
  init(g) {
    S = {
      money: 120, earned: 0, xp: 0, lv: 1, day: 1, dayT: 0, weather: 0, water: 10, waterMax: 10, waterT: 0,
      plots: [], sel: 0, tab: 0, inv: {}, animals: [], orders: [], crows: [], cur: 0, msg: '', msgT: 0,
      priceMul: {}, truck: 0, bugT: 8, crowT: 15, rainT: 0, t: 0, orderT: 0, delivered: 0,
    };
    for (let i = 0; i < 36; i++) { const x = i % 6, y = Math.floor(i / 6); S.plots.push({ un: x < 3 && y < 3, crop: null }); }
    for (const k in FM_ITEMS) { S.inv[k] = 0; S.priceMul[k] = 1; }
    for (let i = 0; i < 3; i++) S.orders.push(makeOrder());
    newDay(g, true);
    say('🥕 당근 씨앗을 골랐어요. 빈 밭을 클릭해 심어보세요!');
  },
  update(g, dt) {
    S.t += dt; S.msgT = Math.max(0, S.msgT - dt); S.truck = Math.max(0, S.truck - dt);
    // 하루
    S.dayT += dt;
    if (S.dayT >= FM_DAY) { S.dayT = 0; S.day++; newDay(g, false); }
    // 물 보충
    S.waterT += dt; if (S.waterT >= 2.5) { S.waterT = 0; S.water = Math.min(S.waterMax, S.water + 1); }
    const W = S.weather;
    if (W === 1) { S.rainT -= dt; if (S.rainT <= 0) { S.rainT = 4; S.plots.forEach((p) => p.crop && !ripe(p) && (p.crop.water = Math.max(p.crop.water, 8))); } }
    // 성장
    S.plots.forEach((p, i) => {
      const c = p.crop; if (!c) return;
      const def = FM_CROPS[c.ci];
      if (!ripe(p)) {
        const mul = (c.water > 0 ? 1.6 : 1) * (c.bug ? 0 : 1) * (W === 2 ? 0.9 : 1);
        c.t = Math.min(def.time, c.t + dt * mul);
        if (ripe(p)) { g.burst(plotX(i) + FM_PLOT / 2, plotY(i) + FM_PLOT / 2, ['#fde047', '#86efac'], 8, 90, 0.5, 3); g.sfx.tone(880, 0.05, 'sine', 0.03); }
      }
      c.water = Math.max(0, c.water - dt);
    });
    // 벌레
    S.bugT -= dt;
    if (S.bugT <= 0) {
      S.bugT = U.rand(10, 20) / (1 + S.lv * 0.08);
      const cand = S.plots.filter((p) => p.crop && !ripe(p) && !p.crop.bug);
      if (cand.length) { U.choice(cand).crop.bug = true; g.sfx.tone(200, 0.1, 'sawtooth', 0.03); }
    }
    // 까마귀 (맑은 날 많음)
    S.crowT -= dt;
    if (S.crowT <= 0) {
      S.crowT = U.rand(14, 26) / (W === 0 ? 1.4 : 1);
      const cand = S.plots.map((p, i) => i).filter((i) => ripe(S.plots[i]) && !S.crows.some((c) => c.i === i));
      if (cand.length) { S.crows.push({ i: U.choice(cand), t: 9, fly: 0 }); g.sfx.tone(600, 0.15, 'square', 0.04, 300); }
    }
    for (let k = S.crows.length - 1; k >= 0; k--) {
      const cr = S.crows[k]; cr.t -= dt; cr.fly = Math.min(1, cr.fly + dt * 2);
      const p = S.plots[cr.i];
      if (!ripe(p)) { S.crows.splice(k, 1); continue; }
      if (cr.t <= 0) { p.crop = null; S.crows.splice(k, 1); say('🐦 까마귀가 작물을 먹어버렸어요!'); g.sfx.hit(); }
    }
    // 동물
    for (const a of S.animals) {
      const d = FM_ANIM[a.ai];
      if (a.ready) continue;
      if (!a.fed) { if (S.inv[d.feed] >= d.fq) { S.inv[d.feed] -= d.fq; a.fed = true; } else continue; }
      a.t += dt;
      if (a.t >= d.time) { a.ready = true; a.t = 0; a.fed = false; }
    }
    // 주문 갱신
    S.orders.forEach((o, i) => { if (o.wait > 0) { o.wait -= dt; if (o.wait <= 0) S.orders[i] = makeOrder(); } });
    // 지원금 (막힘 방지)
    if (S.money < 3 && !S.plots.some((p) => p.crop) && Object.values(S.inv).every((v) => !v) && !S.animals.some((a) => a.ready)) { S.money += 40; say('🏛️ 농협 지원금 +40'); }
    input(g);
    g.score = Math.floor(S.earned);
    g.info = `농장 Lv.${S.lv} · ${S.day}일차 ${FM_WEATHER[W].e}`;
    if (S.lv >= 10) g.win(`농장 레벨 10 달성! ${S.day}일 만에 · 총 수입 ${Math.floor(S.earned).toLocaleString()}원`);
  },
  draw(g, c) {
    // 배경 잔디
    g.rect(0, 0, 960, 640, '#4d7c0f');
    for (let i = 0; i < 40; i++) g.rect((i * 97) % 960, (i * 53) % 640, 3, 8, '#65a30d');
    // 상단
    g.rect(0, 0, 960, 52, 'rgba(20,40,10,.85)');
    g.text(`💰 ${Math.floor(S.money).toLocaleString()}`, 16, 26, 22, '#fde047', 'left');
    g.text(`⭐ Lv.${S.lv}`, 190, 18, 16, '#fff', 'left');
    const need = xpNeed(S.lv);
    g.rrect(190, 32, 130, 10, 5, '#1a2e05'); g.rrect(190, 32, Math.max(5, 130 * Math.min(1, S.xp / need)), 10, 5, '#a3e635');
    g.text(`${Math.floor(S.xp)}/${need}`, 326, 37, 11, '#d9f99d', 'left', '500');
    g.text(`💧 ${S.water}/${S.waterMax}`, 400, 26, 17, '#7dd3fc', 'left');
    const night = S.dayT > FM_DAY * 0.75;
    g.text(`${night ? '🌙' : FM_WEATHER[S.weather].e} ${S.day}일차 ${FM_WEATHER[S.weather].n}`, 510, 26, 16, '#fff', 'left');
    g.rrect(650, 20, 100, 10, 5, '#1a2e05'); g.rrect(650, 20, 100 * (S.dayT / FM_DAY), 10, 5, night ? '#6366f1' : '#facc15');
    const sd = FM_CROPS[S.sel];
    g.text(`선택: ${sd.e} ${sd.n} (${sd.cost}원)`, 944, 26, 15, '#fef9c3', 'right');
    // 밭
    S.plots.forEach((p, i) => drawPlot(g, p, i));
    // 커서
    const cx = plotX(S.cur), cy = plotY(S.cur);
    g.ctx.setLineDash([6, 4]); g.rrect(cx - 2, cy - 2, FM_PLOT + 4, FM_PLOT + 4, 12, null, '#fef08a', 3); g.ctx.setLineDash([]);
    // 까마귀
    for (const cr of S.crows) { const x = plotX(cr.i) + FM_PLOT / 2, y = plotY(cr.i) + 20 - (1 - cr.fly) * 80; g.emoji('🐦', x + Math.sin(S.t * 10) * 3, y, 34); g.rrect(x - 20, y + 20, 40 * (cr.t / 9), 4, 2, '#ef4444'); }
    // 비
    if (S.weather === 1) { c.globalAlpha = 0.4; for (let k = 0; k < 60; k++) { const x = (k * 137 + S.t * 300) % 620, y = (k * 71 + S.t * 600) % 640; g.line(x, y, x - 4, y + 12, '#bfdbfe', 1.5); } c.globalAlpha = 1; }
    // 밤
    if (night) { const a = Math.min(0.45, (S.dayT - FM_DAY * 0.75) / (FM_DAY * 0.1) * 0.45); c.globalAlpha = a; g.rect(0, 52, 960, 588, '#0b1033'); c.globalAlpha = 1; }
    drawPanel(g);
    // 트럭
    if (S.truck > 0) g.emoji('🚚', 960 - (2 - S.truck) * 500, 610, 40);
    if (S.msgT > 0) { c.globalAlpha = Math.min(1, S.msgT); g.rrect(40, 590, 540, 38, 12, 'rgba(0,0,0,.75)'); g.text(S.msg, 310, 609, 15, '#fef9c3'); c.globalAlpha = 1; }
  },
});
function xpNeed(lv) { return Math.round(20 * lv ** 1.5); }
function plotX(i) { return FM_GX + (i % 6) * (FM_PLOT + 4); }
function plotY(i) { return FM_GY + Math.floor(i / 6) * (FM_PLOT + 4); }
function ripe(p) { return p.crop && p.crop.t >= FM_CROPS[p.crop.ci].time; }
function say(m) { S.msg = m; S.msgT = 3; }
function owned() { return S.plots.filter((p) => p.un).length; }
function plotPrice() { return Math.round(60 * 1.3 ** (owned() - 9)); }
function gainXp(g, n, x, y) {
  S.xp += n;
  if (x !== undefined) g.float(x, y - 16, `+${n}xp`, '#bef264', 14);
  while (S.xp >= xpNeed(S.lv) && S.lv < 10) {
    S.xp -= xpNeed(S.lv); S.lv++; S.waterMax += 2;
    g.sfx.power(); g.burst(480, 300, ['#fde047', '#a3e635', '#f472b6'], 50, 320, 1, 5);
    const un = FM_CROPS.filter((c) => c.lv === S.lv).map((c) => c.e + c.n).concat(FM_ANIM.filter((a) => a.lv === S.lv).map((a) => a.e + a.n));
    say(`⭐ 레벨 ${S.lv}! ${un.length ? '새로 해금: ' + un.join(', ') : '밭 확장 한도 증가'}`);
  }
}
function earn(g, v, x, y) { S.money += v; S.earned += v; g.add(0); if (x !== undefined) g.float(x, y, `+${v}원`, '#fde047', 18); }
function newDay(g, first) {
  S.weather = first ? 0 : U.choice([0, 0, 1, 2]);
  for (const k in FM_ITEMS) S.priceMul[k] = first ? 1 : Math.round(U.rand(0.75, 1.35) * 100) / 100;
  if (!first) { say(`🌅 ${S.day}일차 아침 · 날씨 ${FM_WEATHER[S.weather].e} ${FM_WEATHER[S.weather].n} · 시세가 바뀌었어요`); g.sfx.tone(523, 0.2, 'triangle', 0.05); }
}
function unlockedItems() {
  const out = FM_CROPS.filter((c) => c.lv <= S.lv).map((c) => c.k);
  FM_ANIM.forEach((a) => { if (a.lv <= S.lv && S.animals.some((x) => x.ai === FM_ANIM.indexOf(a))) out.push(a.pk); });
  return out;
}
function makeOrder() {
  const items = unlockedItems(), n = Math.min(items.length, U.randi(1, S && S.lv >= 4 ? 3 : 2));
  const pick = U.shuffle(items.slice()).slice(0, n), need = {};
  let val = 0;
  pick.forEach((k) => { const q = U.randi(2, 3 + Math.floor((S ? S.lv : 1) * 0.8)); need[k] = q; val += FM_ITEMS[k].price * q; });
  return { need, reward: Math.round(val * 1.6), xp: Math.round(val / 6) + 5, wait: 0 };
}
function canDeliver(o) { return Object.entries(o.need).every(([k, q]) => S.inv[k] >= q); }
// ───── 행동 ─────
function actPlot(g, i) {
  const p = S.plots[i], x = plotX(i) + FM_PLOT / 2, y = plotY(i) + FM_PLOT / 2;
  const cr = S.crows.findIndex((c) => c.i === i);
  if (cr >= 0) { S.crows.splice(cr, 1); g.sfx.tone(900, 0.1, 'square', 0.05, 1500); g.burst(x, y - 20, '#1f2937', 10, 200, 0.5, 4); gainXp(g, 1); return; }
  if (!p.un) {
    if (owned() >= FM_MAXPLOTS[S.lv]) { say(`🔒 레벨 ${FM_MAXPLOTS.findIndex((m) => m > owned())} 에 더 확장할 수 있어요`); g.sfx.beep(200, 0.1); return; }
    const pr = plotPrice();
    if (S.money < pr) { say(`밭 확장에 ${pr}원 필요`); g.sfx.beep(200, 0.1); return; }
    S.money -= pr; p.un = true; g.sfx.power(); g.burst(x, y, ['#a16207', '#fde047'], 20, 200, 0.6, 4); gainXp(g, 5, x, y); return;
  }
  if (!p.crop) {
    const d = FM_CROPS[S.sel];
    if (S.money < d.cost) { say('씨앗 살 돈이 부족해요'); g.sfx.beep(200, 0.1); return; }
    S.money -= d.cost; p.crop = { ci: S.sel, t: 0, water: S.weather === 1 ? 8 : 0, bug: false };
    g.sfx.drop(); g.burst(x, y, '#78350f', 6, 80, 0.3, 3); gainXp(g, 1);
    return;
  }
  if (p.crop.bug) { p.crop.bug = false; g.sfx.pop(); g.burst(x, y, '#65a30d', 10, 150, 0.4, 3); gainXp(g, 1, x, y); return; }
  if (ripe(p)) { harvest(g, i); return; }
  if (p.crop.water <= 0) {
    if (S.water <= 0) { say('💧 물이 부족해요 (잠시 후 다시 채워져요)'); g.sfx.beep(200, 0.1); return; }
    S.water--; p.crop.water = 20; g.sfx.tone(700, 0.12, 'sine', 0.05, 300); g.burst(x, y, '#60a5fa', 10, 120, 0.4, 3);
  }
}
function harvest(g, i) {
  const p = S.plots[i], d = FM_CROPS[p.crop.ci], x = plotX(i) + FM_PLOT / 2, y = plotY(i) + FM_PLOT / 2;
  const bonus = p.crop.waterBonus ? 1 : 0;
  const qty = 1 + (Math.random() < 0.15 + S.lv * 0.02 ? 1 : 0) + bonus;
  S.inv[d.k] += qty; p.crop = null;
  g.sfx.coin(); g.float(x, y, `${d.e}+${qty}`, '#fff', 18); gainXp(g, d.xp);
  g.burst(x, y, ['#fde047', '#86efac'], 8, 120, 0.4, 3);
}
function input(g) {
  const m = g.mouse;
  if (g.pressed('left')) S.cur = (S.cur % 6 === 0 ? S.cur + 5 : S.cur - 1);
  if (g.pressed('right')) S.cur = (S.cur % 6 === 5 ? S.cur - 5 : S.cur + 1);
  if (g.pressed('up')) S.cur = (S.cur + 30) % 36;
  if (g.pressed('down')) S.cur = (S.cur + 6) % 36;
  if (g.keyp('Space') || g.keyp('KeyZ') || g.keyp('KeyJ') || g.keyp('Enter')) actPlot(g, S.cur);
  if (g.pressed('b') || g.clickIn(616, 588, 108, 44)) harvestAll(g);
  if (g.keyp('KeyG') || g.clickIn(730, 588, 108, 44)) plantAll(g);
  if (g.keyp('KeyQ') || g.clickIn(844, 588, 108, 44)) waterAll(g);
  for (let d = 1; d <= 9; d++) if (g.keyp('Digit' + d) && FM_CROPS[d - 1] && FM_CROPS[d - 1].lv <= S.lv) { S.sel = d - 1; g.sfx.click(); }
  if (!m.clicked) return;
  // 밭 클릭
  for (let i = 0; i < 36; i++) if (g.inRect(plotX(i), plotY(i), FM_PLOT, FM_PLOT)) { S.cur = i; actPlot(g, i); return; }
  // 탭
  for (let t = 0; t < 4; t++) if (g.inRect(616 + t * 84, 60, 80, 34)) { S.tab = t; g.sfx.click(); return; }
  panelClick(g, m.x, m.y);
}
function harvestAll(g) { let n = 0; S.plots.forEach((p, i) => { if (ripe(p)) { harvest(g, i); n++; } }); if (!n) say('수확할 작물이 없어요'); }
function plantAll(g) {
  const d = FM_CROPS[S.sel]; let n = 0;
  S.plots.forEach((p) => { if (p.un && !p.crop && S.money >= d.cost) { S.money -= d.cost; p.crop = { ci: S.sel, t: 0, water: S.weather === 1 ? 8 : 0, bug: false }; n++; } });
  if (n) { g.sfx.drop(); gainXp(g, n); say(`${d.e} ${n}칸에 심었어요 (-${n * d.cost}원)`); } else say('심을 빈 밭이 없거나 돈이 부족해요');
}
function waterAll(g) {
  let n = 0;
  S.plots.forEach((p, i) => { if (p.crop && !ripe(p) && p.crop.water <= 0 && S.water > 0) { S.water--; p.crop.water = 20; n++; g.burst(plotX(i) + 46, plotY(i) + 46, '#60a5fa', 5, 90, 0.3, 3); } });
  if (n) g.sfx.tone(700, 0.2, 'sine', 0.05, 300); else say('물 줄 작물이 없거나 물이 부족해요');
}
// ───── 패널 ─────
const FM_TABS = ['🌱 씨앗', '🐮 동물', '📦 주문', '🏪 판매'];
function drawPanel(g) {
  g.rrect(608, 56, 348, 580, 14, 'rgba(20,40,10,.88)', '#365314', 2);
  FM_TABS.forEach((t, i) => { const on = S.tab === i; g.rrect(616 + i * 84, 60, 80, 34, 8, on ? '#65a30d' : '#1a2e05', on ? '#d9f99d' : null, 2); g.text(t, 656 + i * 84, 77, 14, on ? '#fff' : '#bef264'); });
  const y0 = 102;
  if (S.tab === 0) {
    FM_CROPS.forEach((d, i) => {
      const y = y0 + i * 43, lock = d.lv > S.lv, on = S.sel === i;
      g.rrect(616, y, 332, 39, 8, on ? '#3f6212' : lock ? '#1c1917' : '#1a2e05', on ? '#fde047' : null, 2);
      g.emoji(lock ? '🔒' : d.e, 638, y + 20, 24);
      g.text(`${i < 9 ? i + 1 + '. ' : ''}${d.n}`, 658, y + 13, 14, lock ? '#78716c' : '#fff', 'left');
      g.text(lock ? `레벨 ${d.lv}에 해금` : `${d.time}초 · 판매 ${d.price}원 · ${d.xp}xp`, 658, y + 29, 11, lock ? '#57534e' : '#bef264', 'left', '500');
      g.text(`${d.cost}원`, 938, y + 20, 14, lock ? '#57534e' : '#fde047', 'right');
    });
  } else if (S.tab === 1) {
    g.text('축사 (최대 8마리) · 클릭해서 생산물 수거', 782, y0 + 10, 12, '#d9f99d');
    for (let s = 0; s < 8; s++) {
      const x = 620 + (s % 4) * 82, y = y0 + 24 + Math.floor(s / 4) * 92, a = S.animals[s];
      g.rrect(x, y, 76, 86, 10, '#3f2a14', '#78350f', 2);
      if (!a) { g.text('빈 자리', x + 38, y + 43, 12, '#a8a29e'); continue; }
      const d = FM_ANIM[a.ai];
      g.emoji(d.e, x + 38, y + 36 + (a.ready ? Math.sin(S.t * 6) * 3 : 0), 36);
      if (a.ready) g.emoji(d.pe, x + 60, y + 16, 22);
      else if (!a.fed) { g.text(`먹이 ${FM_ITEMS[d.feed].e}×${d.fq}`, x + 38, y + 72, 11, '#fca5a5'); }
      else { g.rrect(x + 8, y + 70, 60, 6, 3, '#1c1917'); g.rrect(x + 8, y + 70, 60 * (a.t / d.time), 6, 3, '#a3e635'); }
    }
    FM_ANIM.forEach((d, i) => {
      const y = y0 + 220 + i * 62, lock = d.lv > S.lv, can = !lock && S.money >= d.cost && S.animals.length < 8;
      g.rrect(616, y, 332, 56, 10, lock ? '#1c1917' : '#1a2e05');
      g.emoji(lock ? '🔒' : d.e, 642, y + 28, 30);
      g.text(`${d.n} → ${d.pe} ${d.pn} (${d.price}원)`, 666, y + 17, 14, lock ? '#78716c' : '#fff', 'left');
      g.text(lock ? `레벨 ${d.lv}에 해금` : `먹이 ${FM_ITEMS[d.feed].e}${FM_ITEMS[d.feed].n}×${d.fq} · ${d.time}초`, 666, y + 38, 11, lock ? '#57534e' : '#bef264', 'left', '500');
      g.rrect(860, y + 10, 80, 36, 8, can ? '#15803d' : '#44403c');
      g.text(`${d.cost}원`, 900, y + 28, 13, '#fff');
    });
  } else if (S.tab === 2) {
    S.orders.forEach((o, i) => {
      const y = y0 + i * 158;
      g.rrect(616, y, 332, 150, 12, '#3f2a14', '#a16207', 2);
      if (o.wait > 0) { g.emoji('🚚', 782, y + 60, 40); g.text(`새 주문까지 ${Math.ceil(o.wait)}초`, 782, y + 110, 14, '#fde68a'); return; }
      g.text(`📦 주문 #${i + 1}`, 630, y + 18, 15, '#fde68a', 'left');
      Object.entries(o.need).forEach(([k, q], j) => {
        const it = FM_ITEMS[k], have = S.inv[k], ok = have >= q, x = 650 + j * 100;
        g.emoji(it.e, x, y + 58, 34);
        g.text(`${Math.min(have, q)}/${q}`, x + 34, y + 62, 15, ok ? '#86efac' : '#fca5a5', 'left');
      });
      g.text(`보상 💰${o.reward} · ⭐${o.xp}xp`, 630, y + 104, 14, '#fff', 'left');
      const can = canDeliver(o);
      g.rrect(780, y + 108, 80, 34, 8, can ? '#15803d' : '#44403c'); g.text('배달', 820, y + 125, 14, '#fff');
      g.rrect(868, y + 108, 72, 34, 8, '#7f1d1d'); g.text('거절', 904, y + 125, 13, '#fff');
    });
  } else {
    g.text('오늘의 시세 (매일 아침 변동)', 782, y0 + 8, 12, '#d9f99d');
    const keys = Object.keys(FM_ITEMS).filter((k) => S.inv[k] > 0 || FM_CROPS.some((c) => c.k === k && c.lv <= S.lv));
    keys.slice(0, 15).forEach((k, i) => {
      const y = y0 + 20 + i * 31, it = FM_ITEMS[k], pr = Math.round(it.price * S.priceMul[k]);
      g.rrect(616, y, 332, 28, 6, i % 2 ? '#1a2e05' : '#213a08');
      g.emoji(it.e, 632, y + 14, 18);
      g.text(`${it.n} ×${S.inv[k]}`, 646, y + 14, 13, '#fff', 'left');
      const mul = S.priceMul[k];
      g.text(`${pr}원 ${mul > 1.05 ? '▲' : mul < 0.95 ? '▼' : ''}`, 820, y + 14, 13, mul > 1.05 ? '#f87171' : mul < 0.95 ? '#60a5fa' : '#fde047', 'right');
      g.rrect(828, y + 2, 50, 24, 6, S.inv[k] ? '#a16207' : '#44403c'); g.text('1개', 853, y + 14, 12, '#fff');
      g.rrect(884, y + 2, 58, 24, 6, S.inv[k] ? '#15803d' : '#44403c'); g.text('전부', 913, y + 14, 12, '#fff');
    });
  }
  g.button(616, 588, 108, 44, '🧺 전체수확', '#a16207', 14);
  g.button(730, 588, 108, 44, '🌱 전체심기', '#15803d', 14);
  g.button(844, 588, 108, 44, '💧 전체물', '#1d4ed8', 14);
}
function panelClick(g, mx, my) {
  const y0 = 102;
  if (S.tab === 0) {
    FM_CROPS.forEach((d, i) => { if (g.inRect(616, y0 + i * 43, 332, 39)) { if (d.lv > S.lv) { say(`레벨 ${d.lv}에 해금돼요`); g.sfx.beep(200, 0.1); } else { S.sel = i; g.sfx.click(); } } });
  } else if (S.tab === 1) {
    for (let s = 0; s < S.animals.length; s++) {
      const x = 620 + (s % 4) * 82, y = y0 + 24 + Math.floor(s / 4) * 92, a = S.animals[s];
      if (g.inRect(x, y, 76, 86) && a.ready) { const d = FM_ANIM[a.ai]; a.ready = false; S.inv[d.pk]++; g.sfx.coin(); g.float(x + 38, y + 20, `${d.pe}+1`, '#fff', 16); gainXp(g, d.xp); }
    }
    FM_ANIM.forEach((d, i) => {
      if (!g.inRect(860, y0 + 220 + i * 62 + 10, 80, 36)) return;
      if (d.lv > S.lv) { say(`레벨 ${d.lv}에 해금돼요`); return; }
      if (S.animals.length >= 8) { say('축사가 가득 찼어요'); return; }
      if (S.money < d.cost) { say('돈이 부족해요'); g.sfx.beep(200, 0.1); return; }
      S.money -= d.cost; S.animals.push({ ai: i, t: 0, fed: false, ready: false }); g.sfx.power(); gainXp(g, 10);
      say(`${d.e} ${d.n} 입주! 먹이로 ${FM_ITEMS[d.feed].e}${FM_ITEMS[d.feed].n}이(가) 필요해요`);
    });
  } else if (S.tab === 2) {
    S.orders.forEach((o, i) => {
      const y = y0 + i * 158;
      if (o.wait > 0) return;
      if (g.inRect(780, y + 108, 80, 34)) {
        if (!canDeliver(o)) { say('재료가 부족해요'); g.sfx.beep(200, 0.1); return; }
        Object.entries(o.need).forEach(([k, q]) => (S.inv[k] -= q));
        earn(g, o.reward, 820, y + 90); gainXp(g, o.xp); S.truck = 2; S.delivered++;
        o.wait = 15; g.sfx.win(); g.burst(782, y + 60, ['#fde047', '#86efac'], 30, 250, 0.8, 4);
      } else if (g.inRect(868, y + 108, 72, 34)) { o.wait = 20; g.sfx.move(); }
    });
  } else {
    const keys = Object.keys(FM_ITEMS).filter((k) => S.inv[k] > 0 || FM_CROPS.some((c) => c.k === k && c.lv <= S.lv));
    keys.slice(0, 15).forEach((k, i) => {
      const y = y0 + 20 + i * 31, pr = Math.round(FM_ITEMS[k].price * S.priceMul[k]);
      if (!S.inv[k]) return;
      if (g.inRect(828, y + 2, 50, 24)) { S.inv[k]--; earn(g, pr, 853, y); g.sfx.coin(); gainXp(g, 1); }
      else if (g.inRect(884, y + 2, 58, 24)) { const n = S.inv[k]; S.inv[k] = 0; earn(g, pr * n, 913, y); g.sfx.coin(); gainXp(g, Math.ceil(n / 2)); }
    });
  }
}
function drawPlot(g, p, i) {
  const x = plotX(i), y = plotY(i), c = p.crop;
  if (!p.un) {
    const can = owned() < FM_MAXPLOTS[S.lv];
    g.rrect(x, y, FM_PLOT, FM_PLOT, 12, '#3f6212', 'rgba(0,0,0,.2)', 2);
    g.emoji('🔒', x + FM_PLOT / 2, y + 36, 24);
    g.text(can ? `${plotPrice()}원` : '레벨 업 필요', x + FM_PLOT / 2, y + 66, 12, can ? '#fde047' : '#a3a3a3');
    return;
  }
  g.rrect(x, y, FM_PLOT, FM_PLOT, 12, c && c.water > 0 ? '#422006' : '#78350f', '#451a03', 3);
  for (let r = 0; r < 3; r++) g.rect(x + 10, y + 22 + r * 24, FM_PLOT - 20, 3, 'rgba(0,0,0,.18)');
  if (!c) return;
  const d = FM_CROPS[c.ci], pr = c.t / d.time;
  if (pr >= 1) {
    const b = Math.sin(S.t * 5 + i) * 3;
    g.emoji(d.e, x + FM_PLOT / 2, y + FM_PLOT / 2 - 4 + b, 46);
    g.emoji('✨', x + FM_PLOT - 16, y + 16, 16);
  } else {
    g.emoji(pr < 0.33 ? '🌰' : pr < 0.7 ? '🌱' : '🌿', x + FM_PLOT / 2, y + FM_PLOT / 2 - 4, pr < 0.33 ? 20 : pr < 0.7 ? 32 : 40);
    g.rrect(x + 10, y + FM_PLOT - 14, FM_PLOT - 20, 6, 3, 'rgba(0,0,0,.4)');
    g.rrect(x + 10, y + FM_PLOT - 14, (FM_PLOT - 20) * pr, 6, 3, c.water > 0 ? '#60a5fa' : '#a3e635');
    if (c.water > 0) g.emoji('💧', x + 14, y + 14, 14);
    if (c.bug) g.emoji('🐛', x + FM_PLOT - 22 + Math.sin(S.t * 8) * 3, y + 24, 24);
  }
}
