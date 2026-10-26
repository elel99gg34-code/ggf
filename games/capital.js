let S;
// 나라|수도|대륙|난이도
const CP_RAW = `대한민국|서울|아시아|1
일본|도쿄|아시아|1
중국|베이징|아시아|1
인도|뉴델리|아시아|1
베트남|하노이|아시아|1
태국|방콕|아시아|1
필리핀|마닐라|아시아|1
인도네시아|자카르타|아시아|2
말레이시아|쿠알라룸푸르|아시아|2
싱가포르|싱가포르|아시아|1
몽골|울란바토르|아시아|2
북한|평양|아시아|1
대만|타이베이|아시아|1
캄보디아|프놈펜|아시아|2
라오스|비엔티안|아시아|3
미얀마|네피도|아시아|3
방글라데시|다카|아시아|2
파키스탄|이슬라마바드|아시아|2
네팔|카트만두|아시아|2
스리랑카|스리자야와르데네푸라코테|아시아|3
부탄|팀부|아시아|3
몰디브|말레|아시아|3
아프가니스탄|카불|아시아|2
이란|테헤란|아시아|2
이라크|바그다드|아시아|2
사우디아라비아|리야드|아시아|2
아랍에미리트|아부다비|아시아|2
카타르|도하|아시아|2
쿠웨이트|쿠웨이트|아시아|2
오만|무스카트|아시아|3
예멘|사나|아시아|3
요르단|암만|아시아|3
시리아|다마스쿠스|아시아|2
레바논|베이루트|아시아|2
튀르키예|앙카라|아시아|1
카자흐스탄|아스타나|아시아|3
우즈베키스탄|타슈켄트|아시아|3
키르기스스탄|비슈케크|아시아|3
타지키스탄|두샨베|아시아|3
투르크메니스탄|아시가바트|아시아|3
조지아|트빌리시|아시아|3
아르메니아|예레반|아시아|3
아제르바이잔|바쿠|아시아|3
브루나이|반다르스리브가완|아시아|3
동티모르|딜리|아시아|3
바레인|마나마|아시아|3
영국|런던|유럽|1
프랑스|파리|유럽|1
독일|베를린|유럽|1
이탈리아|로마|유럽|1
스페인|마드리드|유럽|1
포르투갈|리스본|유럽|1
러시아|모스크바|유럽|1
네덜란드|암스테르담|유럽|1
벨기에|브뤼셀|유럽|2
스위스|베른|유럽|2
오스트리아|빈|유럽|1
그리스|아테네|유럽|1
스웨덴|스톡홀름|유럽|1
노르웨이|오슬로|유럽|2
덴마크|코펜하겐|유럽|2
핀란드|헬싱키|유럽|2
아이슬란드|레이캬비크|유럽|2
아일랜드|더블린|유럽|2
폴란드|바르샤바|유럽|2
체코|프라하|유럽|2
헝가리|부다페스트|유럽|2
우크라이나|키이우|유럽|2
루마니아|부쿠레슈티|유럽|3
불가리아|소피아|유럽|3
세르비아|베오그라드|유럽|3
크로아티아|자그레브|유럽|3
슬로베니아|류블랴나|유럽|3
슬로바키아|브라티슬라바|유럽|3
보스니아 헤르체고비나|사라예보|유럽|3
몬테네그로|포드고리차|유럽|3
북마케도니아|스코페|유럽|3
알바니아|티라나|유럽|3
에스토니아|탈린|유럽|3
라트비아|리가|유럽|3
리투아니아|빌뉴스|유럽|3
벨라루스|민스크|유럽|3
몰도바|키시너우|유럽|3
룩셈부르크|룩셈부르크|유럽|2
모나코|모나코|유럽|2
몰타|발레타|유럽|3
키프로스|니코시아|유럽|3
리히텐슈타인|파두츠|유럽|3
안도라|안도라라베야|유럽|3
산마리노|산마리노|유럽|3
바티칸 시국|바티칸|유럽|2
미국|워싱턴 D.C.|아메리카|1
캐나다|오타와|아메리카|1
멕시코|멕시코시티|아메리카|1
브라질|브라질리아|아메리카|1
아르헨티나|부에노스아이레스|아메리카|1
칠레|산티아고|아메리카|1
페루|리마|아메리카|1
콜롬비아|보고타|아메리카|2
베네수엘라|카라카스|아메리카|2
에콰도르|키토|아메리카|2
볼리비아|수크레|아메리카|3
파라과이|아순시온|아메리카|3
우루과이|몬테비데오|아메리카|2
쿠바|아바나|아메리카|1
자메이카|킹스턴|아메리카|2
파나마|파나마시티|아메리카|2
코스타리카|산호세|아메리카|3
과테말라|과테말라시티|아메리카|3
온두라스|테구시갈파|아메리카|3
엘살바도르|산살바도르|아메리카|3
니카라과|마나과|아메리카|3
도미니카공화국|산토도밍고|아메리카|3
아이티|포르토프랭스|아메리카|3
바하마|나소|아메리카|3
가이아나|조지타운|아메리카|3
수리남|파라마리보|아메리카|3
트리니다드 토바고|포트오브스페인|아메리카|3
이집트|카이로|아프리카|1
남아프리카공화국|프리토리아|아프리카|2
나이지리아|아부자|아프리카|2
케냐|나이로비|아프리카|1
에티오피아|아디스아바바|아프리카|2
가나|아크라|아프리카|2
모로코|라바트|아프리카|2
알제리|알제|아프리카|2
튀니지|튀니스|아프리카|2
리비아|트리폴리|아프리카|2
수단|하르툼|아프리카|3
세네갈|다카르|아프리카|2
코트디부아르|야무수크로|아프리카|3
말리|바마코|아프리카|3
카메룬|야운데|아프리카|3
탄자니아|도도마|아프리카|3
우간다|캄팔라|아프리카|3
르완다|키갈리|아프리카|3
콩고민주공화국|킨샤사|아프리카|3
앙골라|루안다|아프리카|3
잠비아|루사카|아프리카|3
짐바브웨|하라레|아프리카|3
모잠비크|마푸투|아프리카|3
마다가스카르|안타나나리보|아프리카|3
소말리아|모가디슈|아프리카|3
나미비아|빈트후크|아프리카|3
보츠와나|가보로네|아프리카|3
가봉|리브르빌|아프리카|3
니제르|니아메|아프리카|3
차드|은자메나|아프리카|3
모리타니|누악쇼트|아프리카|3
호주|캔버라|오세아니아|1
뉴질랜드|웰링턴|오세아니아|1
피지|수바|오세아니아|3
파푸아뉴기니|포트모르즈비|오세아니아|3
사모아|아피아|오세아니아|3
통가|누쿠알로파|오세아니아|3
바누아투|포트빌라|오세아니아|3
솔로몬 제도|호니아라|오세아니아|3
팔라우|응게룰무드|오세아니아|3
키리바시|타라와|오세아니아|3`;
const CP_CONT = {
  '아시아': { e: '🌏', x: 700, y: 210, rx: 150, ry: 95, col: '#f59e0b', sym: '🏯' },
  '유럽': { e: '🌍', x: 470, y: 170, rx: 75, ry: 55, col: '#60a5fa', sym: '🏰' },
  '아메리카': { e: '🌎', x: 190, y: 250, rx: 95, ry: 150, col: '#34d399', sym: '🗽' },
  '아프리카': { e: '🌍', x: 480, y: 330, rx: 75, ry: 95, col: '#f87171', sym: '🦁' },
  '오세아니아': { e: '🌏', x: 800, y: 400, rx: 75, ry: 45, col: '#c084fc', sym: '🦘' },
};
const CP_ROUTE = ['아시아', '유럽', '아메리카', '아프리카', '오세아니아'];
const CP_QN = 8, CP_QT = 12;
GAME({
  title: '수도 퀴즈', w: 960, h: 720, bg: '#0b2545', controls: 'none',
  help: '✈️ 세계 일주 수도 퀴즈! 나라 이름을 보고 수도를 고르세요\n대륙마다 8문제 — 6개 이상 맞히면 다음 대륙으로 비행 (아시아→유럽→아메리카→아프리카→오세아니아→…)\n클릭 또는 숫자 1~4 · 문제당 12초 · 빨리 맞힐수록 점수 UP\n두 바퀴째부터는 거꾸로(수도→나라) 문제와 어려운 나라 등장\n📖 가이드북(Q): 오답 2개 제거 (대륙마다 1회 충전) · 생명 ❤️ 3개\n맞힌 나라는 여권 도장으로 영구 수집!',
  init(g) {
    S = { leg: 0, lap: 1, qi: 0, ok: 0, lives: 3, combo: 0, phase: 'fly', flyT: 2.2, t: CP_QT, pick: -1, hidden: [], guide: 1, hist: [], stamps: g.load('stamps', []), newStamps: 0, msg: '', msgT: 0, used: new Set(), plane: { x: 480, y: 600 } };
    g.score = 0;
    startLeg(g, true);
  },
  update(g, dt) {
    S.msgT = Math.max(0, S.msgT - dt);
    const cont = CP_CONT[curCont()];
    if (S.phase === 'fly') {
      S.flyT -= dt;
      const k = 1 - Math.max(0, S.flyT) / 2.2;
      S.plane.x = U.lerp(S.from.x, cont.x, ease(k)); S.plane.y = U.lerp(S.from.y, cont.y, ease(k)) - Math.sin(k * Math.PI) * 90;
      if (S.flyT <= 0 || (S.flyT < 1.6 && (g.mouse.clicked || g.pressed('a')))) { S.phase = 'q'; newQ(); g.sfx.tone(660, 0.1, 'sine', 0.08, 990); }
      return;
    }
    if (S.phase === 'reveal') {
      S.revealT -= dt;
      if (S.revealT <= 0 || (S.revealT < (S.pick === S.q.ans ? 0.7 : 2) && (g.mouse.clicked || g.pressed('a')))) advance(g);
      return;
    }
    if (S.phase === 'result') {
      S.revealT -= dt;
      if (S.revealT <= 0 || (S.revealT < 2.5 && (g.mouse.clicked || g.pressed('a')))) nextLeg(g);
      return;
    }
    S.t -= dt;
    if (S.t <= 3 && Math.floor(S.t) !== Math.floor(S.t + dt)) g.sfx.beep(880, 0.05);
    if (S.t <= 0) { S.t = 0; answer(g, -1); return; }
    for (let k = 0; k < 4; k++) if (g.keyp('Digit' + (k + 1)) || g.keyp('Numpad' + (k + 1)) || g.clickIn(...optRect(k))) answer(g, k);
    if (g.keyp('KeyQ') || g.clickIn(770, 266, 170, 36)) useGuide(g);
    g.info = `${S.lap}바퀴 · ${curCont()} ${S.qi + 1}/${CP_QN} · ❤️${S.lives} · 도장 ${S.stamps.length}`;
  },
  draw(g, c) {
    drawMap(g, c);
    g.text('🏛️ 수도 퀴즈 — 세계 일주', 24, 30, 22, '#e0f2fe', 'left');
    g.text('❤️'.repeat(S.lives) + '🖤'.repeat(Math.max(0, 3 - S.lives)), 936, 30, 20, '#fff', 'right');
    g.text(`🛂 여권 도장 ${S.stamps.length}/${CP_DATA().length}`, 936, 62, 15, '#bae6fd', 'right');
    if (S.phase === 'fly') {
      g.rrect(230, 520, 500, 120, 20, 'rgba(8,47,73,.9)', '#7dd3fc', 2);
      g.text(`✈️ ${curCont()}(으)로 출발!`, 480, 560, 30, '#fde047');
      g.text(`${S.lap}바퀴째 · ${S.leg % 5 + 1}번째 대륙 · 8문제 중 6개 이상 정답 시 통과`, 480, 605, 16, '#e0f2fe');
      return;
    }
    if (S.phase === 'result') {
      g.rrect(200, 200, 560, 300, 24, 'rgba(8,47,73,.95)', '#7dd3fc', 3);
      g.text(S.resMsg, 480, 260, 32, S.resOk ? '#fde047' : '#fca5a5');
      g.text(S.resSub, 480, 315, 18, '#e0f2fe');
      S.resStamps.slice(0, 8).forEach((n, i) => { const x = 250 + (i % 4) * 130, y = 375 + Math.floor(i / 4) * 55; g.rrect(x, y - 20, 120, 40, 8, null, '#f87171', 2); g.text(n, x + 60, y, n.length > 6 ? 12 : 15, '#fecaca'); });
      g.text('클릭해서 계속', 480, 480, 14, '#7dd3fc');
      return;
    }
    const q = S.q;
    // 문제 카드
    g.rrect(140, 470 - 380, 680, 150, 20, 'rgba(8,47,73,.92)', CP_CONT[curCont()].col, 3);
    g.text(q.rev ? '이 도시는 어느 나라의 수도일까요?' : '이 나라의 수도는 어디일까요?', 480, 118, 18, '#bae6fd');
    g.text(q.rev ? q.c.capital : q.c.name, 480, 170, q.c.name.length > 8 || q.c.capital.length > 8 ? 36 : 48, '#fff');
    g.text(`${CP_CONT[q.c.cont].e} ${q.c.cont} · ${'★'.repeat(q.c.tier)}`, 480, 218, 14, '#7dd3fc');
    // 타이머
    const tr = S.t / CP_QT;
    g.rrect(140, 250, 680, 10, 5, 'rgba(255,255,255,.15)');
    g.rrect(140, 250, 680 * tr, 10, 5, tr < 0.3 ? '#f87171' : '#38bdf8');
    // 진행
    for (let k = 0; k < CP_QN; k++) g.circle(370 + k * 30, 280, 8, S.hist[k] === 1 ? '#22c55e' : S.hist[k] === 0 ? '#ef4444' : k === S.qi ? '#fde047' : 'rgba(255,255,255,.25)');
    // 보기
    for (let k = 0; k < 4; k++) {
      const [x, y, w, h] = optRect(k);
      if (S.hidden.includes(k)) { g.rrect(x, y, w, h, 16, 'rgba(15,23,42,.5)', '#1e293b', 2); continue; }
      let fill = g.inRect(x, y, w, h) && S.phase === 'q' ? '#1d4e89' : 'rgba(19,49,92,.95)', st = '#60a5fa';
      if (S.phase === 'reveal') { if (k === q.ans) { fill = '#15803d'; st = '#bbf7d0'; } else if (k === S.pick) { fill = '#991b1b'; st = '#fecaca'; } }
      g.rrect(x, y, w, h, 16, fill, st, 3);
      g.text(String(k + 1), x + 22, y + h / 2, 16, '#93c5fd');
      const s = q.rev ? q.opts[k].name : q.opts[k].capital;
      g.text(s, x + w / 2 + 10, y + h / 2, s.length > 11 ? 16 : s.length > 7 ? 21 : 26, '#fff');
    }
    g.button(770, 266, 170, 36, `📖 가이드북 ${S.guide}`, S.guide ? '#7c3aed' : '#334155', 16);
    if (S.phase === 'reveal') {
      const ok = S.pick === q.ans;
      g.rrect(230, 664, 500, 42, 12, ok ? 'rgba(21,128,61,.92)' : 'rgba(153,27,27,.92)');
      g.text(ok ? `정답! ${q.c.name}의 수도는 ${q.c.capital} 🛂` : `정답: ${q.c.name} → ${q.c.capital}`, 480, 685, 18, '#fff');
    } else if (S.combo > 1) g.text(`🔥 ${S.combo}연속 정답`, 480, 685, 20, '#fb923c');
    if (S.msgT > 0) { c.globalAlpha = Math.min(1, S.msgT); g.text(S.msg, 480, 310, 20, '#fde047'); c.globalAlpha = 1; }
  },
});
let CP_CACHE = null;
function CP_DATA() {
  if (!CP_CACHE) CP_CACHE = CP_RAW.split('\n').map((l) => { const p = l.split('|'); return { name: p[0], capital: p[1], cont: p[2], tier: +p[3] }; });
  return CP_CACHE;
}
function ease(k) { return k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; }
function curCont() { return CP_ROUTE[S.leg % 5]; }
function optRect(k) { return [100 + (k % 2) * 390, 310 + Math.floor(k / 2) * 170, 370, 150]; }
function startLeg(g, first) {
  S.from = first ? { x: 480, y: 640 } : { x: S.plane.x, y: S.plane.y };
  S.phase = 'fly'; S.flyT = 2.2; S.qi = 0; S.ok = 0; S.hist = []; S.guide = Math.min(2, S.guide + (first ? 0 : 1)); S.resStamps = [];
  g.sfx.tone(300, 0.6, 'sawtooth', 0.03, 600);
}
function newQ() {
  const D = CP_DATA(), cont = curCont();
  const maxTier = Math.min(3, S.lap + (S.qi >= 5 ? 1 : 0));
  let pool = D.filter((d) => d.cont === cont && d.tier <= maxTier && !S.used.has(d.name));
  if (pool.length < 2) pool = D.filter((d) => d.cont === cont && !S.used.has(d.name));
  if (pool.length < 2) { D.filter((d) => d.cont === cont).forEach((d) => S.used.delete(d.name)); pool = D.filter((d) => d.cont === cont); }
  // 아직 도장 없는 나라 우선
  const fresh = pool.filter((d) => !S.stamps.includes(d.name));
  const c = U.choice(fresh.length && Math.random() < 0.7 ? fresh : pool);
  S.used.add(c.name);
  const rev = S.lap >= 2 && Math.random() < 0.4;
  // 오답: 같은 대륙 위주 (높은 바퀴일수록)
  let cands = D.filter((d) => d !== c && d.capital !== c.capital);
  const same = cands.filter((d) => d.cont === c.cont);
  const wrong = [];
  const src = U.shuffle(same.slice());
  const other = U.shuffle(cands.filter((d) => d.cont !== c.cont));
  const nSame = S.lap >= 2 ? 3 : 2;
  while (wrong.length < nSame && src.length) wrong.push(src.pop());
  while (wrong.length < 3) wrong.push(other.length ? other.pop() : src.pop());
  const opts = U.shuffle([c, ...wrong]);
  S.q = { c, rev, opts, ans: opts.indexOf(c) };
  S.t = CP_QT; S.pick = -1; S.hidden = []; S.phase = 'q';
}
function answer(g, k) {
  if (S.phase !== 'q' || S.hidden.includes(k)) return;
  S.pick = k; S.phase = 'reveal';
  const ok = k === S.q.ans, [x, y, w, h] = optRect(k >= 0 ? k : S.q.ans);
  S.hist[S.qi] = ok ? 1 : 0;
  if (ok) {
    S.ok++; S.combo++;
    const pts = 80 + S.q.c.tier * 60 + Math.round(S.t * 12) + Math.min(S.combo, 10) * 15 + (S.q.rev ? 50 : 0);
    g.add(pts * S.lap, x + w / 2, y + 10);
    g.sfx.coin(); g.burst(x + w / 2, y + h / 2, ['#4ade80', '#fde047', '#fff'], 24, 260, 0.7, 5);
    if (!S.stamps.includes(S.q.c.name)) { S.stamps.push(S.q.c.name); S.newStamps++; S.resStamps.push(S.q.c.name); g.save('stamps', S.stamps); g.later(() => g.sfx.tone(1200, 0.08, 'square', 0.04), 0.15); }
    S.revealT = 1.3;
  } else {
    S.combo = 0; S.lives--;
    g.sfx.hit(); g.shake(7, 0.25);
    S.revealT = 3;
  }
}
function advance(g) {
  if (S.lives <= 0) return g.over(`${S.lap}바퀴째 ${curCont()}에서 여행 종료 · 도장 ${S.stamps.length}개`);
  S.qi++;
  if (S.qi < CP_QN) { newQ(); return; }
  S.phase = 'result'; S.revealT = 5;
  S.resOk = S.ok >= 6;
  if (S.resOk) {
    const bonus = S.ok * 150 * S.lap + (S.ok === CP_QN ? 1500 : 0);
    g.add(bonus);
    S.resMsg = S.ok === CP_QN ? `${curCont()} 퍼펙트! ${CP_CONT[curCont()].sym}` : `${curCont()} 통과! ${CP_CONT[curCont()].sym}`;
    S.resSub = `${S.ok}/${CP_QN} 정답 · 보너스 +${bonus}` + (S.resStamps.length ? ` · 새 도장 ${S.resStamps.length}개` : '');
    if (S.ok === CP_QN) S.lives = Math.min(3, S.lives + 1);
    g.sfx.win(); g.burst(480, 300, ['#fde047', '#38bdf8', '#f472b6'], 60, 420, 1.1, 6);
  } else {
    S.lives--;
    S.resMsg = `${S.ok}/${CP_QN} — 재시험!`;
    S.resSub = S.lives > 0 ? `6개 이상 맞혀야 통과 · ❤️ -1 · ${curCont()} 다시 도전` : '생명을 모두 잃었어요';
    g.sfx.lose();
    if (S.lives <= 0) { g.later(() => g.over(`${curCont()} 통과 실패 · 도장 ${S.stamps.length}개`), 1.5); }
  }
}
function nextLeg(g) {
  if (S.lives <= 0) return;
  if (S.resOk) {
    S.leg++;
    if (S.leg % 5 === 0) { S.lap++; g.float(480, 300, `🌏 세계 일주 ${S.lap - 1}바퀴 완주!`, '#fde047', 34); g.add(3000 * (S.lap - 1)); }
  }
  startLeg(g, false);
}
function useGuide(g) {
  if (!S.guide || S.phase !== 'q') return;
  S.guide--;
  S.hidden = U.shuffle([0, 1, 2, 3].filter((k) => k !== S.q.ans)).slice(0, 2);
  g.sfx.power(); S.msg = '📖 가이드북: 오답 2개 제거!'; S.msgT = 1.5;
}
function drawMap(g, c) {
  // 바다 격자
  c.globalAlpha = 0.07;
  for (let x = 0; x <= 960; x += 60) g.line(x, 0, x, 720, '#bae6fd', 1);
  for (let y = 0; y <= 720; y += 60) g.line(0, y, 960, y, '#bae6fd', 1);
  c.globalAlpha = S.phase === 'fly' || S.phase === 'result' ? 0.85 : 0.18;
  const cur = curCont();
  for (const [name, d] of Object.entries(CP_CONT)) {
    c.fillStyle = d.col;
    c.beginPath(); c.ellipse(d.x, d.y, d.rx, d.ry, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(d.x + d.rx * 0.4, d.y - d.ry * 0.3, d.rx * 0.6, d.ry * 0.5, 0.5, 0, Math.PI * 2); c.fill();
    if (S.phase === 'fly' || S.phase === 'result') {
      g.text(name, d.x, d.y + 4, name === cur ? 22 : 16, name === cur ? '#0b2545' : 'rgba(11,37,69,.7)');
      g.emoji(d.sym, d.x, d.y - 30, 30);
    }
  }
  c.globalAlpha = 1;
  if (S.phase === 'fly') {
    const d = CP_CONT[cur];
    g.ring(d.x, d.y, 30 + Math.sin(g.time * 6) * 6, '#fff', 3);
    c.setLineDash([8, 8]); g.line(S.from.x, S.from.y, d.x, d.y, 'rgba(255,255,255,.5)', 2); c.setLineDash([]);
    g.emoji('✈️', S.plane.x, S.plane.y, 54);
  }
}
