let S;
const WS_THEMES = {
  '동물': '호랑이 코끼리 기린 사자 원숭이 고양이 강아지 토끼 거북이 다람쥐 하마 판다 펭귄 고래 돌고래 여우 늑대 너구리 수달 캥거루 낙타 얼룩말 코뿔소 사슴 오리 독수리 앵무새 부엉이 악어 개구리 두더지 고슴도치 치타 표범 하이에나 오소리 염소 망아지',
  '과일': '사과 바나나 딸기 포도 수박 참외 복숭아 자두 귤 오렌지 레몬 키위 망고 파인애플 체리 블루베리 석류 감 배 무화과 앵두 살구 유자 모과 대추 메론 라임 리치 두리안 코코넛 아보카도 자몽 오디 머루 다래',
  '음식': '김치 불고기 비빔밥 떡볶이 김밥 라면 냉면 삼겹살 갈비 순대 잡채 만두 국수 짜장면 짬뽕 탕수육 치킨 피자 햄버거 떡국 된장국 미역국 김치찌개 칼국수 수제비 파전 호떡 붕어빵 순두부 감자탕 삼계탕 육개장 볶음밥 오므라이스 돈가스 우동 초밥 카레',
  '나라': '대한민국 일본 중국 미국 영국 프랑스 독일 이탈리아 스페인 캐나다 호주 브라질 멕시코 인도 러시아 이집트 태국 베트남 필리핀 몽골 터키 그리스 스위스 스웨덴 노르웨이 핀란드 덴마크 폴란드 칠레 페루 아르헨티나 케냐 뉴질랜드 싱가포르 말레이시아 이란 포르투갈 네덜란드 벨기에 쿠바',
  '직업': '의사 간호사 선생님 경찰관 소방관 요리사 가수 배우 화가 작가 기자 변호사 판사 군인 농부 어부 목수 미용사 약사 은행원 조종사 승무원 운전기사 과학자 기술자 건축가 사진가 디자이너 프로그래머 수의사 우체부 정원사 마술사 아나운서 통역사 회계사 제빵사 상담사 연구원',
  '스포츠': '축구 야구 농구 배구 테니스 탁구 배드민턴 골프 수영 육상 체조 양궁 유도 태권도 씨름 복싱 펜싱 레슬링 사이클 스키 스케이트 컬링 하키 럭비 볼링 승마 사격 조정 카누 서핑 마라톤 핸드볼 당구 피구 줄넘기 등산 요가 크리켓',
  '자연': '하늘 바다 구름 무지개 태양 달님 별빛 바람 소나기 눈보라 폭포 계곡 사막 초원 화산 빙하 동굴 호수 강물 섬나라 해변 파도 노을 새벽 숲속 언덕 들판 갯벌 안개 이슬 번개 천둥 우박 단풍 꽃잎 나뭇잎 시냇물 오솔길 봉우리',
  '탈것': '자동차 버스 기차 지하철 비행기 헬리콥터 자전거 오토바이 배 요트 잠수함 트럭 택시 구급차 소방차 경찰차 열기구 로켓 우주선 마차 썰매 유모차 킥보드 트랙터 굴착기 크레인 케이블카 모노레일 고속버스 화물선 유람선 카누 스쿠터 전동차 기관차 비행선 인력거',
  '악기': '피아노 기타 바이올린 첼로 플루트 클라리넷 트럼펫 트롬본 색소폰 하프 드럼 실로폰 탬버린 캐스터네츠 오르간 아코디언 하모니카 가야금 거문고 해금 대금 장구 꽹과리 북 피리 단소 우쿨렐레 비올라 콘트라베이스 오보에 튜바 호른 마림바 리코더 심벌즈 트라이앵글',
  '학교': '교실 칠판 분필 책상 의자 공책 연필 지우개 필통 가방 교과서 운동장 체육관 급식실 도서관 과학실 음악실 미술실 방학 숙제 시험 성적표 졸업식 입학식 선생님 친구 반장 소풍 운동회 수업 쉬는시간 출석부 사물함 실내화 크레파스 색연필 삼각자 각도기 컴퍼스',
  '몸': '머리 이마 눈썹 눈동자 코끝 입술 혀 이빨 턱 귀 목 어깨 팔꿈치 손목 손가락 손톱 가슴 배꼽 허리 엉덩이 무릎 발목 발가락 발바닥 심장 위장 간 폐 뼈 근육 피부 머리카락 보조개 주먹 손바닥 종아리 허벅지 겨드랑이',
  '도시': '서울 부산 대구 인천 광주 대전 울산 세종 수원 전주 경주 강릉 춘천 제주 포항 목포 여수 안동 청주 천안 창원 김해 속초 통영 순천 군산 원주 평택 파주 고양 성남 용인 도쿄 파리 런던 뉴욕 베이징 로마 시드니 방콕',
  '색깔': '빨강 주황 노랑 초록 파랑 남색 보라 분홍 하양 검정 회색 갈색 하늘색 연두 자주 금색 은색 살구색 청록 베이지 카키 민트 와인색 올리브 상아색 진홍 감색 황토색 코랄 라벤더 에메랄드 버건디 네이비 크림색 레몬색',
  '채소': '배추 무 당근 양파 마늘 대파 고추 오이 호박 가지 감자 고구마 시금치 상추 깻잎 부추 브로콜리 양배추 콩나물 숙주 버섯 토마토 파프리카 피망 옥수수 우엉 연근 도라지 더덕 미나리 쑥갓 청경채 셀러리 아스파라거스 비트 생강 토란',
};
const WS_FILL = '가나다라마바사아자차카타파하고노도로모보소오조초코토포호구누두루무부수우주추쿠투푸후기니디리미비시이지치키티피히거너더러머버서어저처커터퍼허강산정영민수현준서진';
const WS_DIRS8 = [[1, 0], [0, 1], [1, 1], [1, -1], [-1, 0], [0, -1], [-1, -1], [-1, 1]];
const WS_GX = 30, WS_GY = 90, WS_GS = 580;
GAME({
  title: '단어 찾기', w: 960, h: 700, bg: '#fff7ed', controls: 'dpad+ab', aLabel: '선택', bLabel: '힌트',
  help: '격자 속에 숨은 주제 단어를 찾아 첫 글자에서 마지막 글자까지 드래그하세요\n가로·세로·대각선, 높은 스테이지에서는 거꾸로도 숨어 있어요\n제한 시간 안에 모두 찾으면 다음 스테이지 (남은 시간 = 보너스)\n힌트 버튼(X): 아직 못 찾은 단어의 첫 글자를 반짝 (시간 -10초)\n키보드: 방향키 이동, Space로 시작/끝 지정',
  init(g) {
    S = { stage: 1, msg: '', msgT: 0, sel: null, cur: { x: 0, y: 0 }, kbStart: null, combo: 0, lastFind: -99, usedThemes: [] };
    g.score = 0;
    newStage(g);
  },
  update(g, dt) {
    S.msgT = Math.max(0, S.msgT - dt);
    S.hintT = Math.max(0, S.hintT - dt);
    if (S.clearT > 0) { S.clearT -= dt; if (S.clearT <= 0) { S.stage++; newStage(g); } return; }
    S.time -= dt;
    if (S.time <= 0) { S.time = 0; return g.over(`스테이지 ${S.stage} · ${S.found.size}/${S.words.length}개 찾음`); }
    const m = g.mouse;
    const c = cellAt(m.x, m.y);
    if (m.clicked && c) { S.sel = { a: c, b: c }; S.kbStart = null; }
    if (S.sel && m.down && c) S.sel.b = snapEnd(S.sel.a, c);
    if (S.sel && !m.down) { check(g, S.sel.a, S.sel.b); S.sel = null; }
    // 키보드
    if (g.pressed('left')) S.cur.x = Math.max(0, S.cur.x - 1);
    if (g.pressed('right')) S.cur.x = Math.min(S.n - 1, S.cur.x + 1);
    if (g.pressed('up')) S.cur.y = Math.max(0, S.cur.y - 1);
    if (g.pressed('down')) S.cur.y = Math.min(S.n - 1, S.cur.y + 1);
    if (g.pressed('a')) {
      if (!S.kbStart) S.kbStart = { ...S.cur };
      else { check(g, S.kbStart, snapEnd(S.kbStart, S.cur)); S.kbStart = null; }
    }
    if (g.pressed('b') || g.clickIn(650, 610, 140, 50)) hint(g);
    if (g.clickIn(810, 610, 130, 50)) { shuffleView(g); }
    g.info = `스테이지 ${S.stage} · 주제: ${S.theme} · ${S.found.size}/${S.words.length}`;
  },
  draw(g, c) {
    const n = S.n, cs = WS_GS / n;
    g.text(`주제: ${S.theme}`, WS_GX, 40, 30, '#9a3412', 'left');
    g.text(`STAGE ${S.stage}`, WS_GX + WS_GS, 40, 22, '#c2410c', 'right');
    // 시간 바
    const tr = S.time / S.maxTime;
    g.rrect(WS_GX, 62, WS_GS, 14, 7, '#fed7aa');
    g.rrect(WS_GX, 62, Math.max(14, WS_GS * tr), 14, 7, tr < 0.2 ? (g.time % 0.5 < 0.25 ? '#dc2626' : '#f87171') : '#f97316');
    g.rrect(WS_GX - 8, WS_GY - 8, WS_GS + 16, WS_GS + 16, 16, '#ffedd5', '#fdba74', 3);
    // 찾은 단어 하이라이트
    for (const w of S.words) if (S.found.has(w.w)) drawPill(g, w.x, w.y, w.x + w.dx * (w.len - 1), w.y + w.dy * (w.len - 1), w.col, cs);
    const sel = S.sel || (S.kbStart ? { a: S.kbStart, b: snapEnd(S.kbStart, S.cur) } : null);
    if (sel) drawPill(g, sel.a.x, sel.a.y, sel.b.x, sel.b.y, 'rgba(59,130,246,.45)', cs);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const px = WS_GX + x * cs + cs / 2, py = WS_GY + y * cs + cs / 2;
      const hk = S.hintCell && S.hintCell.x === x && S.hintCell.y === y && S.hintT > 0;
      if (hk) g.circle(px, py, cs * 0.45, `rgba(250,204,21,${0.5 + Math.sin(g.time * 14) * 0.4})`);
      g.text(S.grid[y][x], px, py + 1, cs * 0.52, '#431407', 'center', '600');
    }
    if (!S.sel) { const kx = WS_GX + S.cur.x * cs, ky = WS_GY + S.cur.y * cs; g.rrect(kx + 2, ky + 2, cs - 4, cs - 4, 8, null, 'rgba(234,88,12,.5)', 2); }
    // 단어 목록
    const LX = 650;
    g.rrect(LX - 10, 90, 310, 500, 16, '#ffffff', '#fdba74', 2);
    g.text('찾을 단어', LX + 145, 115, 18, '#9a3412');
    const cols = S.words.length > 10 ? 2 : 1;
    S.words.forEach((w, i) => {
      const col = cols === 2 ? i % 2 : 0, row = cols === 2 ? (i / 2) | 0 : i;
      const x = LX + 10 + col * 150, y = 150 + row * 40;
      const f = S.found.has(w.w);
      if (f) g.rrect(x - 6, y - 15, 140, 30, 8, w.col);
      g.text(w.w, x, y, w.w.length > 5 ? 15 : 19, f ? '#fff' : '#7c2d12', 'left');
      if (f) g.line(x, y, x + Math.min(128, w.w.length * 19), y, 'rgba(255,255,255,.8)', 2);
    });
    if (S.reverse) g.text('⚠ 거꾸로 숨은 단어도 있어요', LX + 145, 570, 13, '#dc2626');
    else if (S.diag) g.text('대각선도 확인하세요', LX + 145, 570, 13, '#c2410c');
    g.button(650, 610, 140, 50, '💡 힌트 (-10초)', '#ea580c', 16);
    g.button(810, 610, 130, 50, '🔀 목록 섞기', '#9a3412', 16);
    g.text(`⏱ 남은 시간 ${Math.ceil(S.time)}초`, 795, 545, 20, tr < 0.2 ? '#dc2626' : '#9a3412');
    if (S.combo > 1 && g.time - S.lastFind < 4) g.text(`연속 찾기 ×${S.combo}`, 795, 515, 18, '#db2777');
    if (S.msgT > 0) { c.globalAlpha = Math.min(1, S.msgT); g.rrect(WS_GX + 90, 330, WS_GS - 180, 80, 18, 'rgba(154,52,18,.92)'); g.text(S.msg, WS_GX + WS_GS / 2, 370, 28, '#fff'); c.globalAlpha = 1; }
  },
});
function newStage(g) {
  const st = S.stage;
  S.n = Math.min(14, 8 + st);
  const cnt = Math.min(16, 5 + st * 2);
  S.diag = st >= 2; S.reverse = st >= 4;
  const names = Object.keys(WS_THEMES).filter((t) => !S.usedThemes.includes(t));
  if (!names.length) S.usedThemes = [];
  S.theme = U.choice(names.length ? names : Object.keys(WS_THEMES));
  S.usedThemes.push(S.theme);
  const pool = U.shuffle(WS_THEMES[S.theme].split(' ').filter((w) => w.length >= 2 && w.length <= S.n));
  const dirs = WS_DIRS8.filter(([dx, dy], i) => (i < 2) || (S.diag && i < 4) || (S.reverse));
  let best = null;
  for (let attempt = 0; attempt < 12; attempt++) {
    const grid = U.grid(S.n, S.n, '');
    const words = [];
    const sorted = pool.slice().sort((a, b) => b.length - a.length + (Math.random() - 0.5) * 3);
    for (const w of sorted) {
      if (words.length >= cnt) break;
      const chars = [...w];
      let placed = false;
      for (let t = 0; t < 200 && !placed; t++) {
        const [dx, dy] = U.choice(dirs), x = U.randi(0, S.n - 1), y = U.randi(0, S.n - 1);
        const ex = x + dx * (chars.length - 1), ey = y + dy * (chars.length - 1);
        if (ex < 0 || ey < 0 || ex >= S.n || ey >= S.n) continue;
        let ok = true, overlap = 0;
        for (let i = 0; i < chars.length; i++) { const v = grid[y + dy * i][x + dx * i]; if (v && v !== chars[i]) { ok = false; break; } if (v) overlap++; }
        if (!ok || overlap === chars.length) continue;
        for (let i = 0; i < chars.length; i++) grid[y + dy * i][x + dx * i] = chars[i];
        words.push({ w, x, y, dx, dy, len: chars.length, col: U.hsl(U.randi(0, 359), 70, 55) });
        placed = true;
      }
    }
    if (!best || words.length > best.words.length) best = { grid, words };
    if (words.length >= cnt) break;
  }
  // 빈칸 채우기: 주제 단어 글자를 섞어 헷갈리게
  const themeChars = [...WS_THEMES[S.theme].replace(/ /g, '')];
  const fill = [...WS_FILL];
  for (let y = 0; y < S.n; y++) for (let x = 0; x < S.n; x++) if (!best.grid[y][x]) best.grid[y][x] = Math.random() < 0.45 ? U.choice(themeChars) : U.choice(fill);
  S.grid = best.grid; S.words = best.words; S.found = new Set();
  S.maxTime = 60 + S.words.length * 12 + S.n * 2; S.time = S.maxTime;
  S.hintCell = null; S.hintT = 0; S.clearT = 0; S.combo = 0;
  S.cur = { x: 0, y: 0 }; S.kbStart = null; S.sel = null;
  S.msg = `STAGE ${st} · ${S.theme}`; S.msgT = 1.8;
}
function cellAt(mx, my) {
  const cs = WS_GS / S.n, x = Math.floor((mx - WS_GX) / cs), y = Math.floor((my - WS_GY) / cs);
  if (x < 0 || y < 0 || x >= S.n || y >= S.n) return null;
  return { x, y };
}
function snapEnd(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  if (!dx && !dy) return { x: a.x, y: a.y };
  const ang = Math.atan2(dy, dx), oct = Math.round(ang / (Math.PI / 4));
  const ux = Math.round(Math.cos(oct * Math.PI / 4)), uy = Math.round(Math.sin(oct * Math.PI / 4));
  let len = Math.max(Math.abs(dx), Math.abs(dy));
  if (ux && uy) len = Math.round((Math.abs(dx) + Math.abs(dy)) / 2);
  let x = a.x + ux * len, y = a.y + uy * len;
  while (len > 0 && (x < 0 || y < 0 || x >= S.n || y >= S.n)) { len--; x = a.x + ux * len; y = a.y + uy * len; }
  return { x, y };
}
function check(g, a, b) {
  if (a.x === b.x && a.y === b.y) return;
  for (const w of S.words) {
    if (S.found.has(w.w)) continue;
    const ex = w.x + w.dx * (w.len - 1), ey = w.y + w.dy * (w.len - 1);
    if ((a.x === w.x && a.y === w.y && b.x === ex && b.y === ey) || (b.x === w.x && b.y === w.y && a.x === ex && a.y === ey)) return found(g, w);
  }
  // 단어 자체를 읽어서 확인 (같은 단어가 다른 곳에 우연히 생긴 경우)
  const dx = Math.sign(b.x - a.x), dy = Math.sign(b.y - a.y), len = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) + 1;
  let s = '';
  for (let i = 0; i < len; i++) s += S.grid[a.y + dy * i][a.x + dx * i];
  const rs = [...s].reverse().join('');
  for (const w of S.words) if (!S.found.has(w.w) && (w.w === s || w.w === rs)) { w.x = a.x; w.y = a.y; w.dx = dx; w.dy = dy; if (w.w === rs) { w.x = b.x; w.y = b.y; w.dx = -dx; w.dy = -dy; } return found(g, w); }
  g.sfx.beep(180, 0.08);
  S.combo = 0;
}
function found(g, w) {
  S.found.add(w.w);
  const cs = WS_GS / S.n;
  if (g.time - S.lastFind < 8) S.combo++; else S.combo = 1;
  S.lastFind = g.time;
  const pts = w.len * 50 * S.stage + (S.combo > 1 ? S.combo * 30 : 0);
  const mx = WS_GX + (w.x + w.dx * (w.len - 1) / 2) * cs + cs / 2, my = WS_GY + (w.y + w.dy * (w.len - 1) / 2) * cs + cs / 2;
  g.add(pts, mx, my);
  g.burst(mx, my, [w.col, '#fff', '#fde047'], 24, 240, 0.7, 5);
  g.sfx.tone(520 + S.combo * 60, 0.1, 'triangle', 0.09); g.later(() => g.sfx.tone(780 + S.combo * 60, 0.12, 'triangle', 0.09), 0.08);
  S.time = Math.min(S.maxTime, S.time + 3);
  if (S.found.size === S.words.length) {
    const bonus = Math.ceil(S.time) * 10 * S.stage;
    g.add(bonus);
    S.msg = `클리어! 시간 보너스 +${bonus}`; S.msgT = 2.2; S.clearT = 2.2;
    g.sfx.win(); g.shake(6, 0.3);
    g.burst(WS_GX + WS_GS / 2, WS_GY + WS_GS / 2, ['#f97316', '#facc15', '#ec4899', '#22c55e'], 80, 450, 1.3, 6);
  }
}
function hint(g) {
  const left = S.words.filter((w) => !S.found.has(w.w));
  if (!left.length) return;
  const w = U.choice(left);
  S.hintCell = { x: w.x, y: w.y }; S.hintT = 4;
  S.time = Math.max(1, S.time - 10);
  g.sfx.tone(880, 0.1, 'sine', 0.08);
}
function shuffleView(g) {
  // 단어 목록 순서 섞기 (시야 환기)
  U.shuffle(S.words);
  g.sfx.click();
}
function drawPill(g, x1, y1, x2, y2, col, cs) {
  const c = g.ctx;
  c.save();
  c.lineCap = 'round';
  c.strokeStyle = col; c.globalAlpha = 0.55;
  c.lineWidth = cs * 0.78;
  c.beginPath();
  c.moveTo(WS_GX + x1 * cs + cs / 2, WS_GY + y1 * cs + cs / 2);
  c.lineTo(WS_GX + x2 * cs + cs / 2 + 0.01, WS_GY + y2 * cs + cs / 2);
  c.stroke();
  c.restore();
}
