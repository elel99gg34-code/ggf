let S;
const TPD = 24, DAYS = 40, START = 1e7, GOAL = 1e9, HIST = 140, VIEW = 56;
const STK = [
  { n: '별빛전자', e: '💻', p: 72000, v: 0.011, c: '#60a5fa', dv: 0.012 },
  { n: '한빛화학', e: '⚗️', p: 41000, v: 0.013, c: '#a78bfa', dv: 0.01 },
  { n: '구름게임즈', e: '🎮', p: 26000, v: 0.022, c: '#f472b6', dv: 0 },
  { n: '바다해운', e: '🚢', p: 14500, v: 0.018, c: '#22d3ee', dv: 0.02 },
  { n: '미래바이오', e: '🧬', p: 8800, v: 0.034, c: '#4ade80', dv: 0 },
  { n: '황금건설', e: '🏗️', p: 19500, v: 0.014, c: '#fbbf24', dv: 0.015 },
  { n: '도지코인', e: '🐶', p: 320, v: 0.052, c: '#fb923c', dv: 0 },
];
const QTY = [1, 10, 100, 1000, 10000, 'MAX'];
const GOOD = ['{n}, 대규모 해외 수주 성공!', '{n} 신제품 예약 판매 폭주', '{n} 분기 실적 어닝 서프라이즈', '외국인, {n} 대량 순매수', '{n} 정부 국책 과제 선정', '{n} 대형 인수합병 발표', '{n} 특허 소송 승소'];
const BAD = ['{n} 공장 화재 발생', '{n} 경영진 횡령 의혹', '{n} 분기 실적 쇼크', '{n} 대규모 리콜 사태', '{n} 핵심 인력 대거 이탈', '{n} 검찰 압수수색', '{n} 신용등급 강등'];
const MGOOD = ['중앙은행 기준금리 인하! 증시 훈풍', '정부, 대규모 증시 부양책 발표', '글로벌 경기 회복 신호 포착'];
const MBAD = ['글로벌 금융 위기 우려 확산', '지정학 위기 고조, 투자 심리 위축', '기준금리 전격 인상'];
const COIN_G = ['유명 CEO, 도지코인 언급! 🚀', '도지코인 대형 거래소 상장', '도지코인 결제 도입 소식'];
const COIN_B = ['코인 거래소 해킹 사고', '정부, 가상화폐 규제 강화', '도지코인 고래 대량 매도'];
const RANKS = [[0, '깡통 🥫'], [5e6, '개미 🐜'], [2e7, '슈퍼개미 🐜'], [1e8, '큰손 💰'], [3e8, '전업 투자자 🏆'], [1e9, '재벌 👑']];
const UPG = [
  { k: 'ma', n: '차트 분석 툴', e: '📊', cost: 3e6, d: '이동평균선(MA5·MA20) 표시' },
  { k: 'stop', n: '자동 손절', e: '🛑', cost: 8e6, d: '평단 대비 -12%면 자동 매도' },
  { k: 'vip', n: 'VIP 수수료', e: '💳', cost: 1e7, d: '수수료 0.3% → 0.05%' },
  { k: 'spy', n: '내부 정보원', e: '🕵️', cost: 1.5e7, d: '뉴스의 진위(루머) 판별' },
  { k: 'credit', n: '신용 등급 A+', e: '🏦', cost: 2e7, d: '대출 한도 순자산 50% → 150%' },
  { k: 'short', n: '공매도 계좌', e: '📉', cost: 3e7, d: '보유 없이 매도(공매도) 가능' },
  { k: 'ai', n: 'AI 예측 엔진', e: '🔮', cost: 1e8, d: '다음 틱 방향 예측 (적중률 ~75%)' },
];
const LX = 8, LY = 52, LW = 240, LH = 62, CX = 258, CY = 52, CW = 694, CH = 308;
GAME({
  title: '주식 트레이더', w: 960, h: 600, bg: '#0b1220', controls: 'none',
  help: '왼쪽 목록에서 종목 선택 (↑↓ 또는 1~7) · ←→ 수량 선택\nZ 매수 · X 매도 · Space 일시정지/재생 · 빨강=상승, 파랑=하락\n뉴스를 보고 타이밍을 잡자! 단, 루머는 금방 되돌림\n🛒 상점: 이동평균선·손절·정보원·대출·공매도·AI 예측\n40일 안에 순자산 10억 달성 시 재벌 등극 (매일 자동 저장)',
  init(g) {
    S = null;
    const sv = g.load('run', null);
    if (sv && sv.ver === 2) { try { restore(sv); } catch (e) { S = null; } }
    if (!S) newRun();
    S.g = g;
    g.score = Math.floor(equity() / 1e4);
  },
  update(g, dt) {
    S.g = g;
    const m = g.mouse;
    S.flash = Math.max(0, S.flash - dt);
    if (S.pop) {
      S.pop.t -= dt;
      if (m.clicked || g.keyp('Space') || g.keyp('Enter') || S.pop.t <= 0) { const f = S.pop.next; S.pop = null; if (f) f(); }
      return;
    }
    if (S.shop) { shopInput(g); return; }
    // 키보드
    for (let i = 0; i < STK.length; i++) if (g.keyp('Digit' + (i + 1))) S.sel = i;
    if (g.pressed('up')) S.sel = (S.sel + STK.length - 1) % STK.length;
    if (g.pressed('down')) S.sel = (S.sel + 1) % STK.length;
    if (g.pressed('left')) S.qi = Math.max(0, S.qi - 1);
    if (g.pressed('right')) S.qi = Math.min(QTY.length - 1, S.qi + 1);
    if (g.keyp('KeyZ')) trade(g, 1);
    if (g.keyp('KeyX')) trade(g, -1);
    if (g.keyp('Space')) { S.spd = S.spd ? 0 : (S.lastSpd || 1); g.sfx.click(); }
    if (g.keyp('KeyB')) { S.shop = true; g.sfx.click(); }
    if (m.clicked) clickMain(g, m);
    // 시간 진행
    if (S.spd > 0) {
      S.acc += dt * S.spd;
      while (S.acc >= 0.55 && !S.pop && !g.ended) { S.acc -= 0.55; tick(g); }
    }
    for (const n of S.news) n.age += dt;
    g.score = Math.floor(equity() / 1e4);
    g.info = `${S.day}일차 · 순자산 ${fmtW(equity())} · ${rank(equity())}`;
  },
  draw(g, c) {
    drawTop(g); drawList(g); drawChart(g, c); drawTrade(g); drawBottom(g);
    if (S.shop) drawShop(g);
    if (S.pop) drawPop(g);
    if (S.flash > 0) { c.globalAlpha = S.flash * 0.5; g.rect(0, 0, 960, 600, S.flashC); c.globalAlpha = 1; }
  },
});
/* ---------- 상태 ---------- */
function gauss() { let u = 0; while (!u) u = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random()); }
function newRun() {
  S = { ver: 2, day: 1, t: 0, cash: START, loan: 0, sel: 0, qi: 2, spd: 1, lastSpd: 1, acc: 0, mkt: 0, mktT: 0, news: [], up: {}, shop: false, pop: null, flash: 0, flashC: '#fff', fees: 0, trades: 0, peak: START, dayStart: START, nextNews: 6, stopOn: true };
  S.st = STK.map((d, i) => ({ i, p: d.p * U.rand(0.85, 1.15), fair: 0, trend: 0, news: 0, newsT: 0, pend: null, h: [], base: 0, q: 0, avg: 0, marks: [], nz: gauss(), dayOpen: 0 }));
  for (const s of S.st) { s.fair = s.p * U.rand(0.9, 1.1); for (let k = 0; k < 70; k++) stepStock(s); s.dayOpen = s.p; }
  S.dayStart = equity();
}
function restore(sv) {
  S = Object.assign({}, sv, { pop: null, shop: false, flash: 0, flashC: '#fff', acc: 0 });
  for (const s of S.st) s.nz = gauss();
}
function saveRun() {
  const o = {};
  for (const k in S) if (k !== 'g' && k !== 'pop' && k !== 'shop') o[k] = S[k];
  S.g.save('run', o);
}
function equity() { let v = S.cash - S.loan; for (const s of S.st) v += s.q * price(s); return v; }
function stockVal() { let v = 0; for (const s of S.st) v += s.q * price(s); return v; }
function shortVal() { let v = 0; for (const s of S.st) if (s.q < 0) v -= s.q * price(s); return v; }
function feeRate() { return S.up.vip ? 0.0005 : 0.003; }
function loanLimit() { return Math.max(0, equity() * (S.up.credit ? 1.5 : 0.5)); }
function tickSize(p) { return p < 1000 ? 1 : p < 10000 ? 5 : p < 50000 ? 10 : p < 200000 ? 50 : 100; }
function price(s) { const t = tickSize(s.p); return Math.max(1, Math.round(s.p / t) * t); }
function rank(v) { let r = RANKS[0][1]; for (const [th, n] of RANKS) if (v >= th) r = n; return r; }
function fmtW(n) {
  const a = Math.abs(n), sg = n < 0 ? '-' : '';
  if (a >= 1e8) return sg + (a / 1e8).toFixed(a >= 1e10 ? 0 : 2) + '억';
  if (a >= 1e4) return sg + Math.round(a / 1e4).toLocaleString() + '만';
  return sg + Math.round(a).toLocaleString() + '원';
}
function fmtQ(n) { return n >= 1e4 ? (n / 1e4).toFixed(n >= 1e5 ? 0 : 1) + '만' : n.toLocaleString(); }
function fmtP(n) { return Math.round(n).toLocaleString(); }
/* ---------- 시세 ---------- */
function stepStock(s) {
  const d = STK[s.i];
  const o = s.p;
  s.trend = s.trend * 0.96 + gauss() * d.v * 0.035;
  s.fair *= Math.exp(gauss() * d.v * 0.12 + 0.00015);
  const rev = Math.log(s.fair / s.p) * 0.025;
  if (s.newsT > 0) { s.newsT--; if (s.newsT === 0 && s.revAmt) { s.news = s.revAmt; s.newsT = 3; s.revAmt = 0; } }
  else s.news *= 0.5;
  const r = s.trend + S.mkt + s.news + rev + d.v * s.nz;
  s.p = Math.max(1, s.p * Math.exp(r));
  s.nz = gauss();
  const cl = s.p;
  const hi = Math.max(o, cl) * Math.exp(Math.abs(gauss()) * d.v * 0.45), lo = Math.min(o, cl) * Math.exp(-Math.abs(gauss()) * d.v * 0.45);
  const vol = (0.3 + Math.abs(r) / d.v + Math.random() * 0.5) * (1 + Math.abs(s.news) * 40);
  s.h.push([o, hi, lo, cl, vol]);
  if (s.h.length > HIST) { s.h.shift(); s.base++; s.marks = s.marks.filter((mk) => mk.i >= s.base); }
}
function tick(g) {
  S.t++;
  if (S.mktT > 0) { S.mktT--; if (!S.mktT) S.mkt = 0; }
  // 대기 중인 뉴스 효과 적용
  for (const s of S.st) if (s.pend && --s.pend.t <= 0) { applyNews(s, s.pend); s.pend = null; }
  for (const s of S.st) stepStock(s);
  if (--S.nextNews <= 0) { makeNews(g); S.nextNews = U.randi(5, 13); }
  // 자동 손절
  if (S.up.stop && S.stopOn) for (const s of S.st) {
    if (s.q > 0 && price(s) < s.avg * 0.88) { const q = s.q; exec(s, -q, price(s)); addNews(`🛑 자동 손절: ${STK[s.i].n} ${q.toLocaleString()}주 매도`, '#fca5a5'); g.sfx.hit(); }
  }
  const eq = equity();
  S.peak = Math.max(S.peak, eq);
  if (eq <= 0) { liquidate(g); return; }
  if (eq >= GOAL && !S.goalHit) { S.goalHit = true; finish(g, true); return; }
  if (S.t % TPD === 0) dayEnd(g);
}
function applyNews(s, n) {
  s.news = n.amt; s.newsT = n.dur;
  if (n.real) s.fair *= Math.exp(n.amt * n.dur * 0.6);
  else s.revAmt = -n.amt * 1.2;
}
function makeNews(g) {
  const real = Math.random() < 0.72;
  const r = Math.random();
  if (r < 0.14) {
    const good = Math.random() < 0.5 + (S.day > 20 ? -0.05 : 0.05);
    S.mkt = (good ? 1 : -1) * U.rand(0.002, 0.005); S.mktT = U.randi(8, 20);
    addNews((good ? '🌐📈 ' : '🌐📉 ') + U.choice(good ? MGOOD : MBAD), good ? '#fca5a5' : '#93c5fd');
    g.sfx.beep(good ? 700 : 300, 0.12);
    return;
  }
  const i = U.randi(0, STK.length - 1), s = S.st[i], d = STK[i];
  const good = Math.random() < 0.52;
  const pool = i === 6 ? (good ? COIN_G : COIN_B) : good ? GOOD : BAD;
  const amt = (good ? 1 : -1) * d.v * U.rand(0.6, 1.4), dur = U.randi(3, 7);
  s.pend = { amt, dur, real, t: U.randi(1, 2) };
  const tag = S.up.spy ? (real ? ' [✅확인]' : ' [⚠️루머]') : '';
  addNews((good ? '📰📈 ' : '📰📉 ') + U.choice(pool).replace('{n}', d.n) + tag, good ? '#fca5a5' : '#93c5fd', i);
  g.sfx.beep(good ? 880 : 260, 0.1);
}
function addNews(text, col, si) { S.news.unshift({ text, col, si, age: 0, day: S.day }); if (S.news.length > 30) S.news.pop(); }
function dayEnd(g) {
  const lines = [];
  const eq0 = equity(), pl = eq0 - S.dayStart;
  lines.push([`오늘 손익`, (pl >= 0 ? '+' : '') + fmtW(pl), pl >= 0 ? '#f87171' : '#60a5fa']);
  if (S.loan > 0) { const it = Math.round(S.loan * 0.004); S.cash -= it; lines.push(['대출 이자 (0.4%)', '-' + fmtW(it), '#fbbf24']); }
  const sv = shortVal();
  if (sv > 0) { const f = Math.round(sv * 0.002); S.cash -= f; lines.push(['공매도 대여료', '-' + fmtW(f), '#fbbf24']); }
  if (S.day % 10 === 0) {
    let dv = 0; for (const s of S.st) if (s.q > 0) dv += s.q * price(s) * STK[s.i].dv;
    if (dv > 0) { S.cash += dv; lines.push(['💵 배당금 지급', '+' + fmtW(dv), '#4ade80']); }
  }
  lines.push(['순자산', fmtW(equity()), '#fff']);
  lines.push(['등급', rank(equity()), '#fde047']);
  if (S.day >= DAYS) { S.pop = { title: `📅 ${S.day}일차 마감 — 대회 종료!`, lines, t: 4, next: () => finish(g, equity() >= GOAL) }; return; }
  S.day++;
  // 갭 상승/하락
  for (const s of S.st) { s.p *= Math.exp(gauss() * STK[s.i].v * 1.5); s.dayOpen = price(s); }
  if (Math.random() < 0.08) { S.mkt = (Math.random() < 0.5 ? 1 : -1) * 0.006; S.mktT = 12; addNews(S.mkt > 0 ? '🐂 장 초반 매수세 폭발!' : '🐻 개장과 동시에 패닉 셀!', S.mkt > 0 ? '#fca5a5' : '#93c5fd'); }
  S.dayStart = equity();
  S.pop = { title: `📅 ${S.day - 1}일차 장 마감`, lines, t: 3 };
  g.sfx.coin();
  saveRun();
}
function liquidate(g) {
  for (const s of S.st) if (s.q) exec(s, -s.q, price(s));
  S.g.save('run', null);
  g.shake(14, 0.6); g.sfx.explode();
  g.score = 0;
  g.over(`💥 반대매매로 파산! (${S.day}일차) · 최고 순자산 ${fmtW(S.peak)}`);
}
function finish(g, won) {
  S.g.save('run', null);
  const eq = equity();
  g.score = Math.floor(eq / 1e4);
  const best = g.load('stats', { bestEq: 0, runs: 0 });
  best.runs++; best.bestEq = Math.max(best.bestEq, eq); g.save('stats', best);
  if (won) g.win(`👑 ${S.day}일차에 재벌 등극! 순자산 ${fmtW(eq)} · 거래 ${S.trades}회`);
  else g.over(`40일 대회 종료 · 순자산 ${fmtW(eq)} · 최종 등급 ${rank(eq)}`);
}
/* ---------- 매매 ---------- */
function exec(s, dq, pr) {
  const fee = Math.abs(dq) * pr * feeRate();
  S.cash -= dq * pr + fee; S.fees += fee; S.trades++;
  const q0 = s.q, q1 = q0 + dq;
  if (q0 === 0 || Math.sign(q0) === Math.sign(dq)) s.avg = (s.avg * Math.abs(q0) + pr * Math.abs(dq)) / Math.abs(q1);
  else if (q1 !== 0 && Math.sign(q1) !== Math.sign(q0)) s.avg = pr;
  if (q1 === 0) s.avg = 0;
  s.q = q1;
  s.marks.push({ i: s.base + s.h.length - 1, b: dq > 0 });
}
function trade(g, side) {
  const s = S.st[S.sel], pr = price(s), want = QTY[S.qi];
  let n = 0;
  if (side > 0) {
    const afford = Math.floor(Math.max(0, S.cash) / (pr * (1 + feeRate())));
    n = want === 'MAX' ? (s.q < 0 ? -s.q : afford) : Math.min(want, afford);
    if (s.q < 0 && want === 'MAX') n = Math.min(n, afford);
    if (n <= 0) { warn(g, '💸 현금이 부족해요 (대출을 이용하세요)'); return; }
  } else {
    if (S.up.short) {
      const room = Math.floor(Math.max(0, equity() * 1.0 - shortVal() + Math.max(0, s.q) * pr) / pr);
      const maxSell = Math.max(0, s.q) + Math.max(0, room - Math.max(0, s.q));
      n = want === 'MAX' ? (s.q > 0 ? s.q : maxSell) : Math.min(want, maxSell);
      if (n <= 0) { warn(g, '⚠️ 공매도 한도 초과 (순자산 100%)'); return; }
    } else {
      n = want === 'MAX' ? s.q : Math.min(want, s.q);
      if (n <= 0) { warn(g, s.q <= 0 ? '보유 주식이 없어요 (공매도는 상점에서 해금)' : '수량 부족'); return; }
    }
  }
  exec(s, side * n, pr);
  g.sfx.tone(side > 0 ? 660 : 440, 0.08, 'square', 0.05, side > 0 ? 990 : 300);
  g.burst(side > 0 ? 690 : 830, 440, side > 0 ? '#f87171' : '#60a5fa', 12, 160, 0.5, 3);
  g.float(side > 0 ? 690 : 830, 410, `${side > 0 ? '매수' : '매도'} ${n.toLocaleString()}주`, side > 0 ? '#fca5a5' : '#93c5fd', 18);
  S.flash = 0.25; S.flashC = side > 0 ? '#ef4444' : '#3b82f6';
}
function warn(g, t) { g.float(600, 430, t, '#fde047', 16); g.sfx.beep(160, 0.12); }
function loan(g, take) {
  if (take) {
    const room = loanLimit() - S.loan;
    const amt = Math.floor(Math.min(room, Math.max(1e6, loanLimit() * 0.25)) / 1e4) * 1e4;
    if (amt < 1e5) { warn(g, '🏦 대출 한도 초과'); return; }
    S.loan += amt; S.cash += amt; g.sfx.coin(); g.float(150, 540, '+' + fmtW(amt), '#fde047', 18);
  } else {
    const amt = Math.min(S.loan, Math.max(0, S.cash));
    if (amt <= 0) { warn(g, S.loan ? '현금이 없어요' : '갚을 대출이 없어요'); return; }
    S.loan -= amt; S.cash -= amt; g.sfx.pop();
  }
}
/* ---------- 입력 ---------- */
const SPD = [0, 1, 2, 5];
function clickMain(g, m) {
  for (let i = 0; i < STK.length; i++) if (g.inRect(LX, LY + i * LH, LW, LH - 6)) { S.sel = i; g.sfx.move(); return; }
  for (let i = 0; i < SPD.length; i++) if (g.inRect(600 + i * 52, 8, 46, 30)) { S.spd = SPD[i]; if (SPD[i]) S.lastSpd = SPD[i]; g.sfx.click(); return; }
  if (g.inRect(820, 8, 130, 30)) { S.shop = true; g.sfx.click(); return; }
  for (let i = 0; i < QTY.length; i++) if (g.inRect(540 + i * 68, 374, 62, 28)) { S.qi = i; g.sfx.click(); return; }
  if (g.inRect(540, 412, 196, 66)) { trade(g, 1); return; }
  if (g.inRect(744, 412, 200, 66)) { trade(g, -1); return; }
  if (g.inRect(262, 560, 84, 28)) { loan(g, true); return; }
  if (g.inRect(352, 560, 84, 28)) { loan(g, false); return; }
  if (S.up.stop && g.inRect(442, 560, 90, 28)) { S.stopOn = !S.stopOn; g.sfx.click(); return; }
  // 뉴스 클릭 → 해당 종목
  for (let i = 0; i < 4; i++) { const n = S.news[i]; if (n && n.si !== undefined && g.inRect(544, 500 + i * 24, 408, 22)) { S.sel = n.si; g.sfx.move(); return; } }
}
function shopInput(g) {
  const m = g.mouse;
  if (g.keyp('KeyB') || g.keyp('Escape') || (m.clicked && g.inRect(700, 92, 40, 40))) { S.shop = false; return; }
  if (!m.clicked) return;
  UPG.forEach((u, i) => {
    const x = 230, y = 140 + i * 54;
    if (!g.inRect(x, y, 500, 48)) return;
    if (S.up[u.k]) { g.sfx.beep(200, 0.08); return; }
    if (S.cash < u.cost) { g.float(480, y + 24, '💸 현금 부족', '#fde047', 18); g.sfx.beep(160, 0.12); return; }
    S.cash -= u.cost; S.up[u.k] = true; g.sfx.power(); g.burst(480, y + 24, ['#fde047', '#4ade80'], 30, 260, 0.8);
    addNews(`${u.e} ${u.n} 구입 완료!`, '#4ade80'); saveRun();
  });
  if (!g.inRect(220, 90, 520, 470)) S.shop = false;
}
/* ---------- 그리기 ---------- */
function upC(v) { return v > 0 ? '#f87171' : v < 0 ? '#60a5fa' : '#cbd5e1'; }
function drawTop(g) {
  g.rect(0, 0, 960, 46, '#111a2e');
  g.text(`📅 ${S.day}일차`, 14, 23, 20, '#fff', 'left');
  g.text(`/ ${DAYS}`, 112, 24, 14, '#94a3b8', 'left');
  const k = (S.t % TPD) / TPD;
  g.rrect(160, 16, 180, 14, 7, '#1e293b'); g.rrect(160, 16, Math.max(8, 180 * k), 14, 7, '#38bdf8');
  g.text('장중 ' + Math.floor(9 + k * 6.5) + ':' + String(Math.floor((k * 6.5 % 1) * 60)).padStart(2, '0'), 250, 23, 11, '#fff');
  const mood = S.mkt > 0 ? ['🐂 상승장', '#f87171'] : S.mkt < 0 ? ['🐻 하락장', '#60a5fa'] : ['😐 보합', '#cbd5e1'];
  g.text(mood[0], 360, 23, 16, mood[1], 'left');
  g.text('속도', 586, 23, 13, '#94a3b8', 'right');
  ['⏸', '▶', '▶▶', '▶▶▶'].forEach((l, i) => { const on = S.spd === SPD[i]; g.rrect(600 + i * 52, 8, 46, 30, 8, on ? '#2563eb' : '#1e293b', on ? '#93c5fd' : null); g.text(l, 623 + i * 52, 24, 13, '#fff'); });
  g.button(820, 8, 130, 30, '🛒 상점 (B)', '#7c3aed', 15);
}
function drawList(g) {
  for (let i = 0; i < STK.length; i++) {
    const s = S.st[i], d = STK[i], y = LY + i * LH, sel = S.sel === i, pr = price(s), ch = (pr - s.dayOpen) / s.dayOpen;
    g.rrect(LX, y, LW, LH - 6, 10, sel ? '#1e3a5f' : '#131c31', sel ? '#38bdf8' : 'rgba(255,255,255,.06)', sel ? 2 : 1);
    g.emoji(d.e, LX + 22, y + 22, 24);
    g.text(d.n, LX + 42, y + 15, 14, '#e2e8f0', 'left');
    g.text(fmtP(pr), LX + LW - 8, y + 15, 15, upC(ch), 'right');
    g.text((ch >= 0 ? '▲' : '▼') + (Math.abs(ch) * 100).toFixed(2) + '%', LX + LW - 8, y + 37, 12, upC(ch), 'right');
    // 미니 스파크라인
    const n = 30, h = s.h.slice(-n); let lo = 1e18, hi = 0;
    for (const k of h) { lo = Math.min(lo, k[3]); hi = Math.max(hi, k[3]); }
    const c = g.ctx; c.beginPath();
    h.forEach((k, j) => { const x = LX + 42 + j * 2.4, yy = y + 46 - ((k[3] - lo) / (hi - lo || 1)) * 18; j ? c.lineTo(x, yy) : c.moveTo(x, yy); });
    c.strokeStyle = d.c; c.lineWidth = 1.5; c.stroke();
    if (s.q) g.text((s.q > 0 ? '보유 ' : '공매 ') + fmtQ(Math.abs(s.q)), LX + 118, y + 38, 10, s.q > 0 ? '#fde047' : '#c4b5fd', 'left');
    if (s.pend) g.emoji('📰', LX + 128, y + 15, 13);
    if (i < 9) g.text(String(i + 1), LX + 6, y + 8, 9, '#64748b', 'left');
  }
}
function drawChart(g, c) {
  const s = S.st[S.sel], d = STK[S.sel], pr = price(s), ch = (pr - s.dayOpen) / s.dayOpen;
  g.rrect(CX, CY, CW, CH, 12, '#0f172a', 'rgba(255,255,255,.08)');
  g.emoji(d.e, CX + 24, CY + 22, 26);
  g.text(d.n, CX + 44, CY + 22, 20, '#fff', 'left');
  g.text(fmtP(pr) + '원', CX + 170, CY + 22, 22, upC(ch), 'left');
  g.text(`${ch >= 0 ? '+' : ''}${(ch * 100).toFixed(2)}% (오늘)`, CX + 300, CY + 23, 14, upC(ch), 'left');
  g.text(`변동성 ${'★'.repeat(Math.min(5, Math.ceil(d.v / 0.011)))}`, CX + CW - 12, CY + 22, 12, '#94a3b8', 'right');
  if (S.up.ai) {
    const real = s.nz + (s.news + s.trend) / d.v > 0;
    const seed = Math.sin(S.t * 12.9898 + S.sel * 78.233) * 43758.5453; const ok = (seed - Math.floor(seed)) < 0.75;
    const upDir = ok ? real : !real;
    g.text('🔮 AI: ' + (upDir ? '▲ 상승 예상' : '▼ 하락 예상'), CX + CW - 110, CY + 22, 13, upDir ? '#f87171' : '#60a5fa', 'right');
  }
  const h = s.h.slice(-VIEW), x0 = CX + 12, y0 = CY + 46, ww = CW - 86, hh = 200, vy = y0 + hh + 8, vh = 44;
  let lo = 1e18, hi = 0, vmax = 0;
  for (const k of h) { lo = Math.min(lo, k[2]); hi = Math.max(hi, k[1]); vmax = Math.max(vmax, k[4]); }
  const pad = (hi - lo) * 0.08 || hi * 0.01; lo -= pad; hi += pad;
  const Y = (v) => y0 + hh - ((v - lo) / (hi - lo)) * hh;
  // 그리드
  for (let k = 0; k <= 4; k++) { const v = lo + (hi - lo) * k / 4, yy = Y(v); g.line(x0, yy, x0 + ww, yy, 'rgba(148,163,184,.12)', 1); g.text(fmtP(v), x0 + ww + 6, yy, 11, '#64748b', 'left'); }
  const cw = ww / VIEW, startIdx = s.base + s.h.length - h.length;
  // 일 구분선
  const newest = s.base + s.h.length - 1;
  for (let j = 0; j < h.length; j++) { const tk = S.t - (newest - (startIdx + j)); if (tk % TPD === 0) g.line(x0 + j * cw, y0, x0 + j * cw, vy + vh, 'rgba(250,204,21,.18)', 1); }
  h.forEach((k, j) => {
    const x = x0 + j * cw + cw / 2, up = k[3] >= k[0], col = up ? '#ef4444' : '#3b82f6';
    g.line(x, Y(k[1]), x, Y(k[2]), col, 1);
    const top = Y(Math.max(k[0], k[3])), bot = Y(Math.min(k[0], k[3]));
    g.rect(x - cw * 0.35, top, cw * 0.7, Math.max(1, bot - top), col);
    g.rect(x - cw * 0.35, vy + vh - (k[4] / vmax) * vh, cw * 0.7, (k[4] / vmax) * vh, up ? 'rgba(239,68,68,.45)' : 'rgba(59,130,246,.45)');
  });
  if (S.up.ma) {
    for (const [n, col] of [[5, '#fde047'], [20, '#c084fc']]) {
      c.beginPath(); let first = true;
      for (let j = 0; j < h.length; j++) {
        const abs = s.h.length - h.length + j; if (abs < n - 1) continue;
        let sum = 0; for (let q = abs - n + 1; q <= abs; q++) sum += s.h[q][3];
        const x = x0 + j * cw + cw / 2, yy = Y(sum / n); first ? c.moveTo(x, yy) : c.lineTo(x, yy); first = false;
      }
      c.strokeStyle = col; c.lineWidth = 1.6; c.stroke();
    }
    g.text('MA5', x0 + 8, y0 + 8, 10, '#fde047', 'left'); g.text('MA20', x0 + 40, y0 + 8, 10, '#c084fc', 'left');
  }
  for (const mk of s.marks) {
    const j = mk.i - startIdx; if (j < 0 || j >= h.length) continue;
    const x = x0 + j * cw + cw / 2, k = h[j];
    if (mk.b) g.poly([[x, Y(k[2]) + 4], [x - 5, Y(k[2]) + 13], [x + 5, Y(k[2]) + 13]], '#fde047');
    else g.poly([[x, Y(k[1]) - 4], [x - 5, Y(k[1]) - 13], [x + 5, Y(k[1]) - 13]], '#e879f9');
  }
  if (s.q && s.avg) { const yy = Y(s.avg); if (yy > y0 && yy < y0 + hh) { c.setLineDash([5, 5]); g.line(x0, yy, x0 + ww, yy, '#fde047', 1); c.setLineDash([]); g.text('평단', x0 + ww - 4, yy - 7, 10, '#fde047', 'right'); } }
  const ly = Y(pr); g.rrect(x0 + ww + 2, ly - 9, 68, 18, 4, upC(ch)); g.text(fmtP(pr), x0 + ww + 36, ly, 11, '#fff');
}
function drawTrade(g) {
  const s = S.st[S.sel], pr = price(s), d = STK[S.sel];
  g.rrect(CX, 368, CW, 118, 12, '#131c31', 'rgba(255,255,255,.06)');
  const val = s.q * pr, pl = s.q ? (pr - s.avg) * s.q : 0, plr = s.avg ? (s.q > 0 ? (pr / s.avg - 1) : (1 - pr / s.avg)) : 0;
  g.text(s.q >= 0 ? '보유 수량' : '공매도 수량', CX + 14, 386, 13, '#94a3b8', 'left'); g.text(Math.abs(s.q).toLocaleString() + '주', CX + 120, 386, 15, s.q < 0 ? '#c4b5fd' : '#fff', 'left');
  g.text('평균 단가', CX + 14, 410, 13, '#94a3b8', 'left'); g.text(s.q ? fmtP(s.avg) + '원' : '-', CX + 120, 410, 15, '#fff', 'left');
  g.text('평가 금액', CX + 14, 434, 13, '#94a3b8', 'left'); g.text(fmtW(Math.abs(val)), CX + 120, 434, 15, '#fff', 'left');
  g.text('평가 손익', CX + 14, 458, 13, '#94a3b8', 'left');
  g.text(s.q ? `${pl >= 0 ? '+' : ''}${fmtW(pl)} (${(plr * 100).toFixed(1)}%)` : '-', CX + 120, 458, 15, upC(pl), 'left');
  g.text('수량', 532, 388, 12, '#94a3b8', 'right');
  QTY.forEach((q, i) => { const on = S.qi === i; g.rrect(540 + i * 68, 374, 62, 28, 7, on ? '#0ea5e9' : '#1e293b', on ? '#bae6fd' : null); g.text(q === 'MAX' ? '최대' : q.toLocaleString(), 571 + i * 68, 388, 13, '#fff'); });
  const want = QTY[S.qi], bn = want === 'MAX' ? Math.floor(Math.max(0, S.cash) / (pr * (1 + feeRate()))) : want;
  g.button(540, 412, 196, 66, '', '#b91c1c'); g.text('매수 (Z)', 638, 432, 20, '#fff'); g.text('≈ ' + fmtW(bn * pr), 638, 458, 12, '#fecaca');
  g.button(744, 412, 200, 66, '', '#1d4ed8'); g.text(S.up.short && s.q <= 0 ? '매도/공매도 (X)' : '매도 (X)', 844, 432, 20, '#fff');
  g.text('수수료 ' + (feeRate() * 100).toFixed(2) + '%', 844, 458, 12, '#bfdbfe');
  void d;
}
function drawBottom(g) {
  const eq = equity();
  g.rrect(LX, 494, 528, 102, 12, '#131c31', 'rgba(255,255,255,.06)');
  g.text('💰 현금', 22, 512, 13, '#94a3b8', 'left'); g.text(fmtW(S.cash), 120, 512, 15, '#fff', 'left');
  g.text('📈 주식', 22, 534, 13, '#94a3b8', 'left'); g.text(fmtW(stockVal()), 120, 534, 15, '#fff', 'left');
  g.text('🏦 대출', 262, 512, 13, '#94a3b8', 'left'); g.text(fmtW(S.loan) + ' / ' + fmtW(loanLimit()), 330, 512, 13, S.loan ? '#fbbf24' : '#fff', 'left');
  g.text('순자산', 262, 534, 13, '#94a3b8', 'left'); g.text(fmtW(eq), 330, 534, 17, upC(eq - START), 'left');
  g.button(262, 560, 84, 28, '대출 +', '#92400e', 13);
  g.button(352, 560, 84, 28, '상환', '#3f3f46', 13);
  if (S.up.stop) g.button(442, 560, 90, 28, S.stopOn ? '손절 ON' : '손절 OFF', S.stopOn ? '#166534' : '#3f3f46', 13);
  // 목표 진행도 (로그)
  const k = U.clamp(Math.log(Math.max(eq, 1e6) / 1e6) / Math.log(GOAL / 1e6), 0, 1);
  g.text('목표 10억', 22, 560, 11, '#94a3b8', 'left');
  g.rrect(22, 570, 230, 14, 7, '#1e293b'); g.rrect(22, 570, Math.max(10, 230 * k), 14, 7, k >= 1 ? '#fde047' : '#22c55e');
  g.text(rank(eq), 137, 577, 10, '#fff');
  // 뉴스
  g.rrect(544 - 8, 494, 416, 102, 12, '#131c31', 'rgba(255,255,255,.06)');
  if (!S.news.length) g.text('뉴스 대기 중...', 744, 545, 14, '#64748b');
  for (let i = 0; i < 4; i++) {
    const n = S.news[i]; if (!n) break;
    const y = 500 + i * 24, fresh = n.age < 1.5 && i === 0;
    if (fresh) g.rrect(542, y, 410, 22, 6, `rgba(250,204,21,${0.25 * (1.5 - n.age)})`);
    const t = n.text.length > 34 ? n.text.slice(0, 33) + '…' : n.text;
    g.text(t, 550, y + 11, 13, i === 0 ? n.col : 'rgba(203,213,225,.75)', 'left');
  }
}
function drawShop(g) {
  g.rect(0, 0, 960, 600, 'rgba(0,0,0,.6)');
  g.rrect(220, 90, 520, 470, 16, '#111827', '#7c3aed', 3);
  g.text('🛒 투자 도구 상점', 480, 116, 24, '#fff');
  g.button(700, 92, 40, 40, '✕', '#374151', 18);
  UPG.forEach((u, i) => {
    const x = 230, y = 140 + i * 54, own = S.up[u.k], can = S.cash >= u.cost;
    g.rrect(x, y, 500, 48, 10, own ? '#14532d' : g.inRect(x, y, 500, 48) ? '#1f2a44' : '#172033', own ? '#4ade80' : null);
    g.emoji(u.e, x + 26, y + 24, 26);
    g.text(u.n, x + 50, y + 15, 16, '#fff', 'left');
    g.text(u.d, x + 50, y + 34, 12, '#94a3b8', 'left');
    g.text(own ? '보유 ✓' : fmtW(u.cost), x + 488, y + 24, 15, own ? '#4ade80' : can ? '#fde047' : '#ef4444', 'right');
  });
  g.text(`현금 ${fmtW(S.cash)} · 클릭해서 구매 · B/바깥 클릭으로 닫기`, 480, 538, 13, '#94a3b8');
}
function drawPop(g) {
  g.rect(0, 0, 960, 600, 'rgba(0,0,0,.55)');
  const h = 90 + S.pop.lines.length * 30;
  g.rrect(300, 300 - h / 2, 360, h, 16, '#0f172a', '#38bdf8', 3);
  g.text(S.pop.title, 480, 300 - h / 2 + 30, 20, '#fff');
  S.pop.lines.forEach(([a, b, col], i) => { const y = 300 - h / 2 + 68 + i * 30; g.text(a, 330, y, 15, '#94a3b8', 'left'); g.text(b, 630, y, 16, col, 'right'); });
  g.text('클릭/Space로 계속', 480, 300 + h / 2 - 14, 11, '#64748b');
}
