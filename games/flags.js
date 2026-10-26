let S;
// 나라|수도|대륙|난이도|국기 그리기 명령(;로 구분, 좌표는 국기 크기 대비 비율)
const FL_RAW = `대한민국|서울|아시아|1|kr
일본|도쿄|아시아|1|h:#fff;circ:.5,.5,.3,#bc002d
중국|베이징|아시아|1|h:#de2910;star:.17,.27,.15,#ffde00;star:.33,.1,.05,#ffde00;star:.4,.2,.05,#ffde00;star:.4,.35,.05,#ffde00;star:.33,.45,.05,#ffde00
인도|뉴델리|아시아|1|h:#ff9933,#fff,#138808;ring:.5,.5,.12,#000080
베트남|하노이|아시아|1|h:#da251d;star:.5,.5,.3,#ffff00
튀르키예|앙카라|아시아|1|h:#e30a17;cres:.37,.5,.25,.42,.5,.2,#fff;star:.55,.5,.1,#fff
태국|방콕|아시아|2|hr:1,1,2,1,1:#a51931,#f4f5f8,#2d2a4a,#f4f5f8,#a51931
인도네시아|자카르타|아시아|2|h:#ce1126,#fff
싱가포르|싱가포르|아시아|2|h:#ef3340,#fff;cres:.2,.25,.15,.25,.25,.14,#fff;star:.27,.15,.04,#fff;star:.33,.22,.04,#fff;star:.3,.32,.04,#fff;star:.23,.32,.04,#fff;star:.21,.22,.04,#fff
말레이시아|쿠알라룸푸르|아시아|2|stripes:14,#cc0001,#fff;rect:0,0,.5,.57,#010066;cres:.18,.28,.2,.23,.28,.17,#fc0;star:.34,.28,.11,#fc0
필리핀|마닐라|아시아|2|h:#0038a8,#ce1126;tri:.43,#fff;star:.14,.5,.1,#fcd116
몽골|울란바토르|아시아|3|v:#c4272f,#015197,#c4272f;circ:.17,.38,.07,#f9cf02;rect:.12,.5,.1,.25,#f9cf02
방글라데시|다카|아시아|2|h:#006a4e;circ:.45,.5,.3,#f42a41
파키스탄|이슬라마바드|아시아|2|h:#fff;rect:.25,0,.75,1,#01411c;cres:.62,.5,.28,.67,.44,.24,#fff;star:.7,.38,.08,#fff
사우디아라비아|리야드|아시아|2|h:#006c35;rect:.22,.66,.56,.05,#fff;rect:.25,.3,.5,.18,#3d8f5c
이란|테헤란|아시아|2|h:#239f40,#fff,#da0000;circ:.5,.5,.09,#da0000
아랍에미리트|아부다비|아시아|2|h:#00732f,#fff,#000;rect:0,0,.25,1,#ff0000
카자흐스탄|아스타나|아시아|3|h:#00afca;circ:.5,.45,.2,#fec50c;rect:.05,0,.05,1,#fec50c
우즈베키스탄|타슈켄트|아시아|3|hr:10,1,10,1,10:#0099b5,#ce1126,#fff,#ce1126,#1eb53a;cres:.12,.17,.11,.15,.17,.09,#fff
라오스|비엔티안|아시아|3|hr:1,2,1:#ce1126,#002868,#ce1126;circ:.5,.5,.2,#fff
캄보디아|프놈펜|아시아|3|hr:1,2,1:#032ea1,#e00025,#032ea1;rect:.36,.38,.28,.24,#fff;rect:.46,.3,.08,.1,#fff
미얀마|네피도|아시아|3|h:#fecb00,#34b233,#ea2839;star:.5,.55,.36,#fff
레바논|베이루트|아시아|3|hr:1,2,1:#ed1c24,#fff,#ed1c24;tri2:.5,.32,.2,#00a651
쿠웨이트|쿠웨이트|아시아|3|h:#007a3d,#fff,#ce1126;tri:.25,#000
예멘|사나|아시아|3|h:#ce1126,#fff,#000
프랑스|파리|유럽|1|v:#0055a4,#fff,#ef4135
독일|베를린|유럽|1|h:#000,#dd0000,#ffce00
이탈리아|로마|유럽|1|v:#009246,#fff,#ce2b37
영국|런던|유럽|1|uk:0,0,1,1
스페인|마드리드|유럽|1|hr:1,2,1:#aa151b,#f1bf00,#aa151b;rect:.25,.38,.1,.24,#aa151b
러시아|모스크바|유럽|1|h:#fff,#0039a6,#d52b1e
스웨덴|스톡홀름|유럽|1|h:#006aa7;nord:#fecc00,.2
포르투갈|리스본|유럽|2|vr:2,3:#006600,#ff0000;circ:.4,.5,.2,#ffcc00;circ:.4,.5,.13,#ff0000;circ:.4,.5,.08,#fff
네덜란드|암스테르담|유럽|2|h:#ae1c28,#fff,#21468b
벨기에|브뤼셀|유럽|2|v:#000,#fdda24,#ef3340
스위스|베른|유럽|2|h:#d52b1e;rect:.43,.2,.14,.6,#fff;rect:.32,.4,.36,.2,#fff
오스트리아|빈|유럽|2|h:#ed2939,#fff,#ed2939
노르웨이|오슬로|유럽|2|h:#ba0c2f;nord:#fff,.25;nord:#00205b,.12
덴마크|코펜하겐|유럽|2|h:#c8102e;nord:#fff,.18
핀란드|헬싱키|유럽|2|h:#fff;nord:#002f6c,.24
아일랜드|더블린|유럽|2|v:#169b62,#fff,#ff883e
폴란드|바르샤바|유럽|2|h:#fff,#dc143c
우크라이나|키이우|유럽|2|h:#0057b7,#ffd700
그리스|아테네|유럽|2|stripes:9,#0d5eaf,#fff;rect:0,0,.37,.555,#0d5eaf;rect:.148,0,.074,.555,#fff;rect:0,.222,.37,.111,#fff
아이슬란드|레이캬비크|유럽|3|h:#02529c;nord:#fff,.28;nord:#dc1e35,.14
체코|프라하|유럽|3|h:#fff,#d7141a;tri:.5,#11457e
헝가리|부다페스트|유럽|3|h:#ce2939,#fff,#477050
루마니아|부쿠레슈티|유럽|3|v:#002b7f,#fcd116,#ce1126
불가리아|소피아|유럽|3|h:#fff,#00966e,#d62612
크로아티아|자그레브|유럽|3|h:#ff0000,#fff,#171796;rect:.4,.22,.2,.42,#fff;rect:.4,.22,.067,.084,#ff0000;rect:.533,.22,.067,.084,#ff0000;rect:.467,.304,.067,.084,#ff0000;rect:.4,.388,.067,.084,#ff0000;rect:.533,.388,.067,.084,#ff0000;rect:.467,.472,.067,.084,#ff0000;rect:.4,.556,.067,.084,#ff0000;rect:.533,.556,.067,.084,#ff0000
에스토니아|탈린|유럽|3|h:#0072ce,#000,#fff
라트비아|리가|유럽|3|hr:2,1,2:#9e3039,#fff,#9e3039
리투아니아|빌뉴스|유럽|3|h:#fdb913,#006a44,#c1272d
룩셈부르크|룩셈부르크|유럽|3|h:#ed2939,#fff,#00a1de
모나코|모나코|유럽|3|h:#ce1126,#fff
미국|워싱턴 D.C.|아메리카|1|usa
캐나다|오타와|아메리카|1|vr:1,2,1:#d80621,#fff,#d80621;star:.5,.5,.28,#d80621;rect:.485,.55,.03,.25,#d80621
멕시코|멕시코시티|아메리카|1|v:#006847,#fff,#ce1126;circ:.5,.5,.12,#8c5a2b;circ:.5,.47,.06,#5e8c31
브라질|브라질리아|아메리카|1|h:#009c3b;diam:#ffdf00;circ:.5,.5,.24,#002776;rect:.33,.47,.34,.05,#fff
아르헨티나|부에노스아이레스|아메리카|1|h:#74acdf,#fff,#74acdf;circ:.5,.5,.1,#f6b40e
쿠바|아바나|아메리카|2|stripes:5,#002a8f,#fff;tri:.45,#cf142b;star:.15,.5,.13,#fff
칠레|산티아고|아메리카|2|h:#fff,#d52b1e;rect:0,0,.33,.5,#0039a6;star:.165,.25,.13,#fff
페루|리마|아메리카|2|v:#d91023,#fff,#d91023
콜롬비아|보고타|아메리카|2|hr:2,1,1:#fcd116,#003893,#ce1126
베네수엘라|카라카스|아메리카|3|h:#ffcc00,#00247d,#cf142b;star:.4,.45,.04,#fff;star:.45,.4,.04,#fff;star:.5,.38,.04,#fff;star:.55,.4,.04,#fff;star:.6,.45,.04,#fff
우루과이|몬테비데오|아메리카|3|stripes:9,#fff,#0038a8;rect:0,0,.4,.555,#fff;circ:.2,.28,.13,#fcd116
볼리비아|수크레|아메리카|3|h:#d52b1e,#f9e300,#007934
에콰도르|키토|아메리카|3|hr:2,1,1:#ffdd00,#034ea2,#ed1c24;circ:.5,.5,.12,#7a5c2e
파라과이|아순시온|아메리카|3|h:#d52b1e,#fff,#0038a8;ring:.5,.5,.1,#2a6f2b
자메이카|킹스턴|아메리카|3|h:#009b3a;tri:.5,#000;trir:.5,#000;salt:#fed100,.12
이집트|카이로|아프리카|1|h:#ce1126,#fff,#000;circ:.5,.5,.1,#c09300
남아프리카공화국|프리토리아|아프리카|2|h:#e03c31,#001489;rect:0,.37,1,.26,#fff;rect:0,.42,1,.16,#007749;tri:.42,#fff;tri:.36,#007749;tri:.3,#ffb81c;tri:.25,#000
나이지리아|아부자|아프리카|2|v:#008751,#fff,#008751
케냐|나이로비|아프리카|2|hr:6,1,6,1,6:#000,#fff,#bb0000,#fff,#006600;oval:.5,.5,.1,.38,#bb0000;oval:.5,.5,.04,.3,#000
에티오피아|아디스아바바|아프리카|2|h:#078930,#fcdd09,#da121a;circ:.5,.5,.2,#0f47af;star:.5,.5,.15,#fcdd09
가나|아크라|아프리카|2|h:#ce1126,#fcd116,#006b3f;star:.5,.5,.16,#000
모로코|라바트|아프리카|2|h:#c1272d;star:.5,.5,.25,#006233;star:.5,.5,.13,#c1272d
튀니지|튀니스|아프리카|3|h:#e70013;circ:.5,.5,.25,#fff;cres:.5,.5,.19,.54,.5,.15,#e70013;star:.56,.5,.09,#e70013
세네갈|다카르|아프리카|3|v:#00853f,#fdef42,#e31b23;star:.5,.5,.13,#00853f
코트디부아르|야무수크로|아프리카|3|v:#f77f00,#fff,#009e60
말리|바마코|아프리카|3|v:#14b53a,#fcd116,#ce1126
카메룬|야운데|아프리카|3|v:#007a5e,#ce1126,#fcd116;star:.5,.5,.13,#fcd116
마다가스카르|안타나나리보|아프리카|3|h:#fc3d32,#007e3a;rect:0,0,.33,1,#fff
리비아|트리폴리|아프리카|3|hr:1,2,1:#e70013,#000,#239e46;cres:.47,.5,.16,.51,.5,.13,#fff;star:.56,.5,.06,#fff
소말리아|모가디슈|아프리카|3|h:#4189dd;star:.5,.5,.22,#fff
보츠와나|가보로네|아프리카|3|hr:9,1,4,1,9:#75aadb,#fff,#000,#fff,#75aadb
가봉|리브르빌|아프리카|3|h:#009e60,#fcd116,#3a75c4
호주|캔버라|오세아니아|1|h:#012169;uk:0,0,.5,.5;star:.25,.75,.14,#fff;star:.75,.2,.06,#fff;star:.63,.45,.06,#fff;star:.88,.4,.06,#fff;star:.75,.83,.07,#fff
뉴질랜드|웰링턴|오세아니아|2|h:#012169;uk:0,0,.5,.5;star:.75,.25,.08,#cc142b;star:.65,.48,.07,#cc142b;star:.86,.43,.06,#cc142b;star:.75,.8,.09,#cc142b`;
const FL_CONT_E = { '아시아': '🌏', '유럽': '🌍', '아메리카': '🌎', '아프리카': '🌍', '오세아니아': '🌏' };
const FL_W = 960, FL_H = 700, FL_QT = 15;
GAME({
  title: '국기 맞히기', w: FL_W, h: FL_H, bg: '#0f2a3d', controls: 'none',
  help: '세계 지리 퀴즈! 국기를 보고 나라를, 나라를 보고 국기를, 국기를 보고 수도를 맞혀요\n보기를 클릭하거나 숫자 1~4 · 문제당 15초\n레벨마다 10문제 — 7개 이상 맞히면 다음 레벨 (어려운 나라·같은 대륙 보기 등장)\n생명 ❤️ 3개 · 틀리면 정답 국기와 수도를 보여줘요 (공부도 돼요!)\n연속 정답 콤보 보너스',
  init(g) {
    S = { lv: 1, qi: 0, ok: 0, lives: 3, combo: 0, best: 0, phase: 'q', t: FL_QT, q: null, pick: -1, revealT: 0, seen: new Set(), msg: '', msgT: 0, learned: g.load('learned', []) };
    newQ();
    g.score = 0;
    S.msg = '레벨 1 · 쉬운 나라부터!'; S.msgT = 2;
  },
  update(g, dt) {
    S.msgT = Math.max(0, S.msgT - dt);
    if (S.phase === 'reveal') {
      S.revealT -= dt;
      if (S.revealT <= 0 || (S.revealT < (S.pick === S.q.ans ? 0.8 : 2.2) && (g.mouse.clicked || g.pressed('a')))) advance(g);
      return;
    }
    if (S.phase === 'level') { S.revealT -= dt; if (S.revealT <= 0 || (S.revealT < 1.5 && (g.mouse.clicked || g.pressed('a')))) { S.phase = 'q'; newQ(); } return; }
    S.t -= dt;
    if (S.t <= 3 && Math.floor(S.t) !== Math.floor(S.t + dt)) g.sfx.beep(900, 0.05);
    if (S.t <= 0) { S.t = 0; answer(g, -1); return; }
    for (let k = 0; k < 4; k++) if (g.keyp('Digit' + (k + 1)) || g.keyp('Numpad' + (k + 1)) || g.clickIn(...optRect(k))) answer(g, k);
    g.info = `레벨 ${S.lv} · ${S.qi + 1}/10 · 정답 ${S.ok} · ❤️${S.lives}`;
  },
  draw(g, c) {
    // 배경 지구 격자
    c.globalAlpha = 0.08;
    for (let k = 0; k < 8; k++) g.ring(480, 360, 80 + k * 70, '#7dd3fc', 1);
    c.globalAlpha = 1;
    g.text('🏳️ 국기 맞히기', 30, 36, 26, '#e0f2fe', 'left');
    g.text('❤️'.repeat(S.lives) + '🖤'.repeat(Math.max(0, 3 - S.lives)), 930, 36, 22, '#fff', 'right');
    g.text(`LEVEL ${S.lv}`, 480, 36, 22, '#fde047');
    // 진행 점
    for (let k = 0; k < 10; k++) {
      const st = S.hist && S.hist[k];
      g.circle(345 + k * 30, 70, 9, st === 1 ? '#22c55e' : st === 0 ? '#ef4444' : k === S.qi ? '#fde047' : '#334155');
    }
    if (S.phase === 'level') {
      g.rrect(230, 200, 500, 260, 24, '#0b3a57', '#7dd3fc', 3);
      g.text(S.levelMsg, 480, 260, 34, '#fde047');
      g.text(S.levelSub, 480, 320, 20, '#e0f2fe');
      g.text('클릭해서 계속', 480, 400, 16, '#7dd3fc');
      return;
    }
    const q = S.q;
    // 타이머 바
    const tr = S.t / FL_QT;
    g.rrect(180, 92, 600, 10, 5, '#1e3a4c');
    g.rrect(180, 92, 600 * tr, 10, 5, tr < 0.3 ? '#f87171' : '#38bdf8');
    // 문제
    g.text(q.prompt, 480, 130, 22, '#bae6fd');
    if (q.mode === 1 || q.mode === 3) {
      drawFlag(c, q.c.spec, 330, 160, 300, 200, g);
      if (S.phase === 'reveal' && q.mode === 3) g.text(q.c.name, 480, 380, 18, '#fde047');
    } else {
      g.text(q.mode === 2 ? q.c.name : q.c.capital, 480, 240, 56, '#fff');
      g.text(`${FL_CONT_E[q.c.cont]} ${q.c.cont}`, 480, 310, 18, '#7dd3fc');
    }
    // 보기
    for (let k = 0; k < 4; k++) {
      const [x, y, w, h] = optRect(k), o = q.opts[k];
      let fill = g.inRect(x, y, w, h) && S.phase === 'q' ? '#155e75' : '#0e4560', st = '#38bdf8';
      if (S.phase === 'reveal') { if (k === q.ans) { fill = '#15803d'; st = '#bbf7d0'; } else if (k === S.pick) { fill = '#991b1b'; st = '#fecaca'; } }
      g.rrect(x, y, w, h, 16, fill, st, 3);
      g.text(String(k + 1), x + 22, y + 22, 15, '#7dd3fc');
      if (q.mode === 2 || q.mode === 4) drawFlag(c, o.spec, x + w / 2 - 75, y + h / 2 - 50, 150, 100, g);
      else g.text(q.mode === 3 ? o.capital : o.name, x + w / 2, y + h / 2, o.name.length > 7 || (q.mode === 3 && o.capital.length > 7) ? 22 : 28, '#fff');
      if (S.phase === 'reveal' && (q.mode === 2 || q.mode === 4)) g.text(o.name, x + w / 2, y + h - 12, 13, '#e0f2fe');
    }
    if (S.phase === 'reveal') {
      const ok = S.pick === q.ans;
      g.rrect(250, 650, 460, 42, 12, ok ? 'rgba(21,128,61,.9)' : 'rgba(153,27,27,.9)');
      g.text(ok ? `정답! ${q.c.name} · 수도 ${q.c.capital}` : `정답: ${q.c.name} (수도 ${q.c.capital})`, 480, 671, 18, '#fff');
    } else if (S.combo > 1) g.text(`🔥 ${S.combo}연속!`, 480, 671, 20, '#fb923c');
    if (S.msgT > 0) { c.globalAlpha = Math.min(1, S.msgT); g.text(S.msg, 480, 400, 26, '#fde047'); c.globalAlpha = 1; }
    g.text(`🌐 ${S.learned.length}/${FL_DATA().length} 나라 정복`, 30, 671, 15, '#7dd3fc', 'left');
  },
});
let FL_CACHE = null;
function FL_DATA() {
  if (!FL_CACHE) FL_CACHE = FL_RAW.split('\n').map((l) => { const p = l.split('|'); return { name: p[0], capital: p[1], cont: p[2], tier: +p[3], spec: p[4] }; });
  return FL_CACHE;
}
function optRect(k) { return [70 + (k % 2) * 420, 420 + Math.floor(k / 2) * 115, 400, 105]; }
function newQ() {
  const D = FL_DATA(), lv = S.lv;
  const maxTier = lv >= 3 ? 3 : lv >= 2 ? 2 : 1;
  let pool = D.filter((d) => d.tier <= maxTier && !S.seen.has(d.name));
  if (lv >= 4) pool = pool.filter((d) => d.tier >= 2).length > 5 ? pool.filter((d) => d.tier >= 2) : pool;
  if (pool.length < 4) { S.seen.clear(); pool = D.filter((d) => d.tier <= maxTier); }
  const c = U.choice(pool);
  S.seen.add(c.name);
  const modes = lv === 1 ? [1, 1, 2] : lv === 2 ? [1, 2, 3] : [1, 2, 3, 4];
  const mode = U.choice(modes);
  // 오답: 높은 레벨일수록 같은 대륙
  let cands = D.filter((d) => d !== c);
  if (lv >= 2) { const same = cands.filter((d) => d.cont === c.cont); if (same.length >= 3 && Math.random() < 0.4 + lv * 0.15) cands = same; }
  const wrong = U.shuffle(cands.slice()).slice(0, 3);
  const opts = U.shuffle([c, ...wrong]);
  const prompt = { 1: '이 국기는 어느 나라일까요?', 2: '이 나라의 국기는?', 3: '이 국기 나라의 수도는?', 4: '이 도시가 수도인 나라의 국기는?' }[mode];
  S.q = { c, mode, opts, ans: opts.indexOf(c), prompt };
  S.t = FL_QT + (mode >= 3 ? 3 : 0); S.pick = -1; S.phase = 'q';
  if (!S.hist) S.hist = [];
}
function answer(g, k) {
  if (S.phase !== 'q') return;
  S.pick = k; S.phase = 'reveal';
  const ok = k === S.q.ans;
  S.hist[S.qi] = ok ? 1 : 0;
  const [x, y, w, h] = optRect(k >= 0 ? k : S.q.ans);
  if (ok) {
    S.ok++; S.combo++; S.best = Math.max(S.best, S.combo);
    const pts = 100 * S.lv + Math.round(S.t * 10) + S.q.c.tier * 50 + Math.min(S.combo, 10) * 20;
    g.add(pts, x + w / 2, y);
    g.sfx.coin(); g.burst(x + w / 2, y + h / 2, ['#4ade80', '#fde047', '#fff'], 26, 260, 0.7, 5);
    if (!S.learned.includes(S.q.c.name)) { S.learned.push(S.q.c.name); g.save('learned', S.learned); }
    S.revealT = 1.4;
  } else {
    S.combo = 0; S.lives--;
    g.sfx.hit(); g.shake(7, 0.25);
    S.revealT = 3.2;
  }
}
function advance(g) {
  if (S.lives <= 0) return g.over(`레벨 ${S.lv}에서 탈락 · 최고 연속 ${S.best}`);
  S.qi++;
  if (S.qi >= 10) {
    if (S.ok >= 7) {
      const bonus = S.ok * 100 * S.lv + (S.ok === 10 ? 2000 : 0);
      g.add(bonus);
      S.levelMsg = S.ok === 10 ? `퍼펙트! 레벨 ${S.lv} 클리어` : `레벨 ${S.lv} 클리어!`;
      S.lv++;
      if (S.ok === 10) S.lives = Math.min(3, S.lives + 1);
      S.levelSub = `${S.ok}/10 정답 · 보너스 +${bonus} → 레벨 ${S.lv}`;
      g.sfx.win(); g.burst(480, 330, ['#fde047', '#38bdf8', '#f472b6', '#4ade80'], 70, 450, 1.2, 6);
    } else {
      S.lives--;
      if (S.lives <= 0) return g.over(`레벨 ${S.lv} 재도전 실패 · ${S.ok}/10`);
      S.levelMsg = `${S.ok}/10 — 아쉬워요!`;
      S.levelSub = `7개 이상 맞혀야 해요 · ❤️ -1 · 레벨 ${S.lv} 다시 도전`;
      g.sfx.lose();
    }
    S.qi = 0; S.ok = 0; S.hist = [];
    S.phase = 'level'; S.revealT = 4;
    return;
  }
  newQ();
}
/* ---------- 국기 그리기 ---------- */
function drawFlag(c, spec, x, y, w, h, g) {
  c.save();
  c.beginPath(); c.rect(x, y, w, h); c.clip();
  c.fillStyle = '#fff'; c.fillRect(x, y, w, h);
  for (const cmd of spec.split(';')) {
    const i = cmd.indexOf(':'), op = i < 0 ? cmd : cmd.slice(0, i), arg = i < 0 ? '' : cmd.slice(i + 1);
    const a = arg.split(','), n = (k) => +a[k];
    switch (op) {
      case 'h': a.forEach((col, k) => { c.fillStyle = col; c.fillRect(x, y + (h * k) / a.length, w, h / a.length + 1); }); break;
      case 'v': a.forEach((col, k) => { c.fillStyle = col; c.fillRect(x + (w * k) / a.length, y, w / a.length + 1, h); }); break;
      case 'hr': case 'vr': {
        const [rs, cs] = arg.split(':'), r = rs.split(',').map(Number), cols = cs.split(','), tot = r.reduce((p, q) => p + q, 0);
        let acc = 0;
        r.forEach((v, k) => { c.fillStyle = cols[k]; if (op === 'hr') c.fillRect(x, y + (h * acc) / tot, w, (h * v) / tot + 1); else c.fillRect(x + (w * acc) / tot, y, (w * v) / tot + 1, h); acc += v; });
        break;
      }
      case 'stripes': { const cnt = n(0); for (let k = 0; k < cnt; k++) { c.fillStyle = k % 2 ? a[2] : a[1]; c.fillRect(x, y + (h * k) / cnt, w, h / cnt + 1); } break; }
      case 'rect': c.fillStyle = a[4]; c.fillRect(x + w * n(0), y + h * n(1), w * n(2), h * n(3)); break;
      case 'circ': c.fillStyle = a[3]; c.beginPath(); c.arc(x + w * n(0), y + h * n(1), h * n(2), 0, Math.PI * 2); c.fill(); break;
      case 'oval': c.fillStyle = a[4]; c.beginPath(); c.ellipse(x + w * n(0), y + h * n(1), w * n(2), h * n(3), 0, 0, Math.PI * 2); c.fill(); break;
      case 'ring': c.strokeStyle = a[3]; c.lineWidth = Math.max(1.5, h * 0.025); c.beginPath(); c.arc(x + w * n(0), y + h * n(1), h * n(2), 0, Math.PI * 2); c.stroke(); break;
      case 'star': star(c, x + w * n(0), y + h * n(1), h * n(2), a[3]); break;
      case 'tri': c.fillStyle = a[1]; c.beginPath(); c.moveTo(x, y); c.lineTo(x + w * n(0), y + h / 2); c.lineTo(x, y + h); c.fill(); break;
      case 'trir': c.fillStyle = a[1]; c.beginPath(); c.moveTo(x + w, y); c.lineTo(x + w - w * n(0), y + h / 2); c.lineTo(x + w, y + h); c.fill(); break;
      case 'tri2': c.fillStyle = a[3]; c.beginPath(); c.moveTo(x + w * n(0), y + h * (0.5 - n(1) / 2)); c.lineTo(x + w * (n(0) + n(2) / 2), y + h * (0.5 + n(1) / 2)); c.lineTo(x + w * (n(0) - n(2) / 2), y + h * (0.5 + n(1) / 2)); c.fill(); break;
      case 'nord': { const t = h * n(1); c.fillStyle = a[0]; c.fillRect(x, y + h / 2 - t / 2, w, t); c.fillRect(x + w * 0.36 - t / 2, y, t, h); break; }
      case 'salt': { c.strokeStyle = a[0]; c.lineWidth = h * n(1); c.beginPath(); c.moveTo(x, y); c.lineTo(x + w, y + h); c.moveTo(x + w, y); c.lineTo(x, y + h); c.stroke(); break; }
      case 'diam': c.fillStyle = a[0]; c.beginPath(); c.moveTo(x + w * 0.5, y + h * 0.08); c.lineTo(x + w * 0.94, y + h / 2); c.lineTo(x + w * 0.5, y + h * 0.92); c.lineTo(x + w * 0.06, y + h / 2); c.fill(); break;
      case 'cres': {
        // 바깥 원 - 안쪽 원 (cx,cy,r, ix,iy,ir, color)
        c.save();
        c.beginPath(); c.arc(x + w * n(0), y + h * n(1), h * n(2), 0, Math.PI * 2); c.clip();
        c.beginPath(); c.rect(x, y, w, h); c.arc(x + w * n(3), y + h * n(4), h * n(5), 0, Math.PI * 2, true);
        c.fillStyle = a[6]; c.fill('evenodd');
        c.restore();
        break;
      }
      case 'uk': unionJack(c, x + w * n(0), y + h * n(1), w * n(2), h * n(3)); break;
      case 'usa': usa(c, x, y, w, h); break;
      case 'kr': korea(c, x, y, w, h); break;
    }
  }
  c.restore();
  c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 2; c.strokeRect(x, y, w, h);
}
function star(c, cx, cy, r, col) {
  c.fillStyle = col; c.beginPath();
  for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.4 : r, an = -Math.PI / 2 + (i * Math.PI) / 5; const px = cx + Math.cos(an) * rr, py = cy + Math.sin(an) * rr; i ? c.lineTo(px, py) : c.moveTo(px, py); }
  c.closePath(); c.fill();
}
function unionJack(c, x, y, w, h) {
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  c.fillStyle = '#012169'; c.fillRect(x, y, w, h);
  c.lineCap = 'butt';
  const diag = (col, lw) => { c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.moveTo(x, y); c.lineTo(x + w, y + h); c.moveTo(x + w, y); c.lineTo(x, y + h); c.stroke(); };
  diag('#fff', h * 0.2); diag('#c8102e', h * 0.07);
  c.fillStyle = '#fff'; c.fillRect(x + w / 2 - h * 0.17, y, h * 0.34, h); c.fillRect(x, y + h / 2 - h * 0.17, w, h * 0.34);
  c.fillStyle = '#c8102e'; c.fillRect(x + w / 2 - h * 0.1, y, h * 0.2, h); c.fillRect(x, y + h / 2 - h * 0.1, w, h * 0.2);
  c.restore();
}
function usa(c, x, y, w, h) {
  for (let k = 0; k < 13; k++) { c.fillStyle = k % 2 ? '#fff' : '#b22234'; c.fillRect(x, y + (h * k) / 13, w, h / 13 + 1); }
  const cw = w * 0.4, ch = h * 7 / 13;
  c.fillStyle = '#3c3b6e'; c.fillRect(x, y, cw, ch);
  for (let r = 0; r < 9; r++) for (let k = 0; k < (r % 2 ? 5 : 6); k++) star(c, x + cw * ((k * 2 + (r % 2 ? 2 : 1)) / 12), y + ch * ((r + 1) / 10), h * 0.025, '#fff');
}
function korea(c, x, y, w, h) {
  c.fillStyle = '#fff'; c.fillRect(x, y, w, h);
  const cx = x + w / 2, cy = y + h / 2, r = h * 0.25;
  c.save(); c.translate(cx, cy); c.rotate(Math.atan2(2, 3));
  c.fillStyle = '#cd2e3a'; c.beginPath(); c.arc(0, 0, r, Math.PI, 0); c.fill();
  c.fillStyle = '#0047a0'; c.beginPath(); c.arc(0, 0, r, 0, Math.PI); c.fill();
  c.fillStyle = '#cd2e3a'; c.beginPath(); c.arc(-r / 2, 0, r / 2, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#0047a0'; c.beginPath(); c.arc(r / 2, 0, r / 2, 0, Math.PI * 2); c.fill();
  c.restore();
  // 4괘 (건곤감리)
  const bars = [[[1], [1], [1]], [[0], [1], [0]], [[1], [0], [1]], [[0], [0], [0]]];
  const pos = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  const dirs = [Math.atan2(2, 3), -Math.atan2(2, 3), -Math.atan2(2, 3), Math.atan2(2, 3)];
  const trig = [[1, 1, 1], [1, 0, 1], [0, 1, 0], [0, 0, 0]];
  void bars;
  pos.forEach(([sx, sy], i) => {
    const px = cx + sx * w * 0.3, py = cy + sy * h * 0.3;
    c.save(); c.translate(px, py); c.rotate(dirs[i] + Math.PI / 2);
    const bw = h * 0.25, bh = h * 0.042;
    trig[i].forEach((solid, k) => {
      const yy = -bh * 2 + k * bh * 1.5;
      c.fillStyle = '#000';
      if (solid) c.fillRect(-bw / 2, yy, bw, bh);
      else { c.fillRect(-bw / 2, yy, bw * 0.45, bh); c.fillRect(bw * 0.05, yy, bw * 0.45, bh); }
    });
    c.restore();
  });
}
