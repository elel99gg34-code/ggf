let S;
const B = [
  ['👆', '커서', 15, 0.1], ['👵', '할머니', 100, 1], ['🌾', '농장', 1100, 8], ['⛏️', '광산', 12000, 47], ['🏭', '공장', 130000, 260], ['🏦', '은행', 1.4e6, 1400],
  ['🛕', '신전', 2e7, 7800], ['🧙', '마법사 탑', 3.3e8, 44000], ['🚀', '우주선', 5.1e9, 260000], ['⚗️', '연금술 연구소', 7.5e10, 1.6e6], ['🌀', '차원문', 1e12, 1e7], ['⏳', '타임머신', 1.4e13, 6.5e7],
];
const UPS = [[100, '강화 손가락', '클릭 파워 ×2', (s) => (s.cpcMul *= 2)], [500, '오븐 장갑', '클릭 파워 ×2', (s) => (s.cpcMul *= 2)], [10000, '할머니의 비법', '할머니 생산 ×2', (s) => (s.mul[1] *= 2)], [50000, '쿠키 연구', '전체 생산 +10%', (s) => (s.allMul *= 1.1)], [2e5, '클릭의 달인', '클릭이 CPS의 1%만큼 추가', (s) => (s.cpsClick = 0.01)], [1e6, '자동 커서', '커서 생산 ×5', (s) => (s.mul[0] *= 5)], [5e6, '농장 비료', '농장 생산 ×3', (s) => (s.mul[2] *= 3)], [5e7, '황금 반죽', '전체 생산 +25%', (s) => (s.allMul *= 1.25)], [5e8, '광산 드릴', '광산·공장 ×3', (s) => { s.mul[3] *= 3; s.mul[4] *= 3; }], [1e10, '쿠키 우주론', '전체 생산 ×2', (s) => (s.allMul *= 2)]];
GAME({
  title: '쿠키 클리커', w: 1100, h: 760, bg: '#2a1a10', controls: 'none', noRKey: true, quietOver: true,
  help: '🍪 큰 쿠키를 클릭해서 쿠키를 구워요\n쿠키로 건물을 사면 자동으로 쿠키가 생산돼요 (오른쪽 상점)\n✨ 황금 쿠키가 나타나면 클릭! (대박 보너스)\n진행 상황은 자동 저장 · "🏆 기록 등록"으로 누적 쿠키를 최고기록에 남기세요',
  init(g) {
    const sv = g.load('save', null);
    S = { cookies: 0, total: 0, own: B.map(() => 0), mul: B.map(() => 1), ups: [], cpcMul: 1, allMul: 1, cpsClick: 0, clicks: 0, golden: null, goldT: U.rand(30, 90), frenzy: 0, pops: [], saveT: 5, scroll: 0, bounce: 0 };
    if (sv) { Object.assign(S, sv); S.ups.forEach((i) => UPS[i][3](S)); S.pops = []; S.golden = null; const away = Math.min(7200, (Date.now() - (sv.at || Date.now())) / 1000); if (away > 30) { const gain = cps() * away * 0.5; S.cookies += gain; S.total += gain; S.welcome = `자리를 비운 동안 🍪 ${fmt(gain)} 구움!`; } }
  },
  update(g, dt) {
    const rate = cps();
    S.cookies += rate * dt; S.total += rate * dt;
    S.frenzy -= dt; S.bounce = Math.max(0, S.bounce - dt * 4);
    if (g.mouse.clicked && U.dist(g.mouse.x, g.mouse.y, 280, 380) < 150) {
      const v = cpc(); S.cookies += v; S.total += v; S.clicks++; S.bounce = 1;
      S.pops.push({ x: g.mouse.x + U.rand(-10, 10), y: g.mouse.y, t: 1, v });
      g.sfx.tone(300 + Math.random() * 200, 0.05, 'triangle', 0.05);
      g.burst(g.mouse.x, g.mouse.y, ['#d97706', '#78350f'], 4, 160, 0.5);
    }
    S.pops = S.pops.filter((p) => (p.t -= dt) > 0);
    // 황금 쿠키
    S.goldT -= dt;
    if (S.goldT <= 0 && !S.golden) { S.golden = { x: U.rand(80, 1020), y: U.rand(100, 680), t: 10 }; S.goldT = U.rand(40, 100); }
    if (S.golden) { S.golden.t -= dt; if (S.golden.t <= 0) S.golden = null; else if (g.mouse.clicked && U.dist(g.mouse.x, g.mouse.y, S.golden.x, S.golden.y) < 40) { if (Math.random() < 0.5) { S.frenzy = 30; g.float(S.golden.x, S.golden.y, '🔥 프렌지! 생산 ×7 (30초)', '#fde047', 26); } else { const gain = Math.max(13, Math.min(S.cookies * 0.15, rate * 900)); S.cookies += gain; S.total += gain; g.float(S.golden.x, S.golden.y, `🍀 럭키! +${fmt(gain)}`, '#fde047', 26); } g.sfx.win(); S.golden = null; } }
    // 상점
    for (let i = 0; i < B.length; i++) { const y = 150 + i * 50 - S.scroll; if (y > 120 && y < 720 && g.clickIn(620, y, 460, 46)) buy(g, i); }
    const avail = UPS.map((u, i) => i).filter((i) => !S.ups.includes(i)).slice(0, 5);
    avail.forEach((ui, k) => { if (g.clickIn(620 + k * 92, 60, 86, 70) && S.cookies >= UPS[ui][0]) { S.cookies -= UPS[ui][0]; S.ups.push(ui); UPS[ui][3](S); g.sfx.power(); g.float(800, 140, `✨ ${UPS[ui][1]}: ${UPS[ui][2]}`, '#fde047', 20); } });
    if (g.clickIn(40, 690, 200, 50)) { save(g); g.score = Math.floor(S.total); return g.win(`누적 🍪 ${fmt(S.total)} · 초당 ${fmt(cps())}`); }
    S.saveT -= dt; if (S.saveT <= 0) { S.saveT = 5; save(g); }
    g.score = Math.floor(S.total);
    g.info = `🍪 ${fmt(S.cookies)} · 초당 ${fmt(rate)}`;
  },
  draw(g, c) {
    const grd = c.createRadialGradient(280, 380, 50, 280, 380, 450); grd.addColorStop(0, '#7c4a1e'); grd.addColorStop(1, '#2a1a10'); c.fillStyle = grd; c.fillRect(0, 0, 600, 760);
    g.text(`${fmt(S.cookies)} 쿠키`, 280, 70, 38, '#fff');
    g.text(`초당 ${fmt(cps())}` + (S.frenzy > 0 ? `  🔥 ×7 (${Math.ceil(S.frenzy)}s)` : ''), 280, 112, 18, S.frenzy > 0 ? '#fde047' : '#fde68a');
    c.save(); c.translate(280, 380); c.rotate(g.time * 0.1); for (let i = 0; i < 12; i++) { c.rotate(Math.PI / 6); c.fillStyle = 'rgba(253,230,138,.06)'; c.beginPath(); c.moveTo(0, 0); c.lineTo(-40, -280); c.lineTo(40, -280); c.fill(); } c.restore();
    const s = 1 + S.bounce * 0.06 + (g.inRect(130, 230, 300, 300) ? 0.03 : 0);
    g.emoji('🍪', 280, 380, 260 * s);
    for (let i = 0; i < Math.min(S.own[0], 40); i++) { const a = g.time * 0.5 + (i / Math.min(S.own[0], 40)) * Math.PI * 2; g.emoji('👆', 280 + Math.cos(a) * 165, 380 + Math.sin(a) * 165, 22); }
    for (const p of S.pops) { c.globalAlpha = p.t; g.text(`+${fmt(p.v)}`, p.x, p.y - (1 - p.t) * 80, 20, '#fff'); c.globalAlpha = 1; }
    if (S.golden) { const gs = 60 + Math.sin(g.time * 6) * 6; c.shadowBlur = 30; c.shadowColor = '#fde047'; g.emoji('🍪', S.golden.x, S.golden.y, gs); c.shadowBlur = 0; g.ring(S.golden.x, S.golden.y, gs * 0.55, '#fde047', 4); }
    g.button(40, 690, 200, 50, '🏆 기록 등록', '#b45309', 18);
    g.text(`누적 ${fmt(S.total)} · 클릭 ${S.clicks}`, 380, 715, 14, '#d6a86b');
    if (S.welcome) { g.rrect(60, 140, 440, 50, 12, 'rgba(0,0,0,.6)'); g.text(S.welcome, 280, 165, 18, '#fde047'); if (g.time > 5) S.welcome = null; }
    // 상점
    g.rect(600, 0, 500, 760, '#1c1209'); g.line(600, 0, 600, 760, '#78350f', 4);
    g.text('업그레이드', 620, 30, 16, '#fde68a', 'left');
    const avail = UPS.map((u, i) => i).filter((i) => !S.ups.includes(i)).slice(0, 5);
    avail.forEach((ui, k) => { const can = S.cookies >= UPS[ui][0], x = 620 + k * 92; g.rrect(x, 60, 86, 70, 10, can ? '#78350f' : '#3f2a14', can ? '#fbbf24' : '#57381a', 2); g.text(UPS[ui][1], x + 43, 82, 12, '#fff'); g.text(`🍪${fmt(UPS[ui][0])}`, x + 43, 110, 12, can ? '#4ade80' : '#f87171'); if (g.inRect(x, 60, 86, 70)) { g.rrect(x - 40, 132, 170, 30, 6, '#000'); g.text(UPS[ui][2], x + 45, 147, 12, '#fde047'); } });
    c.save(); c.beginPath(); c.rect(600, 140, 500, 620); c.clip();
    B.forEach(([e, n, , base], i) => {
      const y = 150 + i * 50 - S.scroll, cost = price(i), can = S.cookies >= cost, unlocked = i === 0 || S.own[i - 1] > 0 || S.total >= B[i][2] * 0.5;
      g.rrect(620, y, 460, 46, 8, can ? '#57381a' : '#2e1f10', can ? '#d97706' : '#3f2a14', 2);
      g.emoji(unlocked ? e : '❓', 650, y + 23, 30);
      g.text(unlocked ? n : '???', 680, y + 15, 17, unlocked ? '#fff' : '#78716c', 'left');
      g.text(`🍪 ${fmt(cost)}`, 680, y + 34, 13, can ? '#4ade80' : '#f87171', 'left');
      g.text(S.own[i], 1060, y + 23, 26, 'rgba(255,255,255,.35)', 'right');
      if (unlocked) g.text(`+${fmt(base * S.mul[i] * S.allMul)}/s`, 960, y + 23, 13, '#d6a86b', 'right');
    });
    c.restore();
  },
});
function fmt(n) { if (n < 1000) return n < 10 && n % 1 ? n.toFixed(1) : Math.floor(n).toLocaleString(); const u = [['경', 1e16], ['조', 1e12], ['억', 1e8], ['만', 1e4]]; for (const [s, v] of u) if (n >= v) return (n / v).toFixed(n / v < 100 ? 2 : 0).replace(/\.00$/, '') + s; return Math.floor(n).toLocaleString(); }
function cps() { let s = 0; B.forEach((b, i) => (s += S.own[i] * b[3] * S.mul[i])); return s * S.allMul * (S.frenzy > 0 ? 7 : 1); }
function cpc() { return (1 + S.own[0] * 0.1) * S.cpcMul + cps() * S.cpsClick; }
function price(i) { return Math.ceil(B[i][2] * Math.pow(1.15, S.own[i])); }
function buy(g, i) { const p = price(i); if (S.cookies < p) return g.sfx.hit(); S.cookies -= p; S.own[i]++; g.sfx.coin(); save(g); }
function save(g) { g.save('save', { cookies: S.cookies, total: S.total, own: S.own, mul: B.map(() => 1), ups: S.ups, cpcMul: 1, allMul: 1, cpsClick: 0, clicks: S.clicks, at: Date.now() }); }
