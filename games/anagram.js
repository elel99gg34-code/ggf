let S;
const AN_BANK = {
  '동물': '고양이 강아지 코끼리 호랑이 원숭이 다람쥐 거북이 고슴도치 너구리 캥거루 코알라 하이에나 얼룩말 기러기 독수리 앵무새 부엉이 올빼미 두더지 고릴라 오랑우탄 침팬지 카멜레온 도마뱀 미어캣 알파카 치타 표범 북극곰 바다표범 해마 문어 오징어 불가사리 해파리 돌고래 범고래 상어 청개구리 두꺼비 사마귀 메뚜기 귀뚜라미 잠자리 무당벌레 반딧불이 장수풍뎅이 사슴벌레',
  '음식': '떡볶이 김치찌개 된장찌개 비빔밥 불고기 삼겹살 칼국수 수제비 짜장면 짬뽕 탕수육 냉면 잡채 순두부 감자탕 삼계탕 육개장 볶음밥 김밥 주먹밥 떡국 만두국 호떡 붕어빵 팥빙수 아이스크림 초콜릿 햄버거 스파게티 샌드위치 도넛 와플 마카롱 케이크 피자 치킨 돈가스 오므라이스 카레라이스 미역국 갈비찜 계란말이 부대찌개 닭갈비 족발 보쌈',
  '나라': '대한민국 일본 중국 미국 영국 프랑스 독일 이탈리아 스페인 캐나다 오스트레일리아 브라질 멕시코 인도네시아 러시아 이집트 베트남 필리핀 몽골 튀르키예 그리스 스위스 스웨덴 노르웨이 핀란드 덴마크 아르헨티나 포르투갈 네덜란드 벨기에 싱가포르 말레이시아 뉴질랜드 사우디아라비아 남아프리카 콜롬비아 우크라이나 오스트리아 헝가리 아일랜드',
  '직업': '선생님 간호사 소방관 경찰관 요리사 과학자 변호사 우주비행사 프로그래머 디자이너 사진작가 건축가 미용사 수의사 약사 은행원 조종사 승무원 운동선수 아나운서 기상캐스터 유튜버 작곡가 피아니스트 바리스타 제빵사 농부 어부 목수 택배기사 외교관 통역사 탐정 판사 검사 기자 만화가 성우 마술사',
  '자연': '무지개 소나기 눈보라 폭포 계곡 사막 초원 화산 빙하 동굴 호수 해변 파도 노을 새벽 숲속 언덕 들판 갯벌 안개 이슬 번개 천둥 우박 단풍 꽃잎 나뭇잎 시냇물 오솔길 은하수 별똥별 보름달 해돋이 아지랑이 고드름 서리 태풍 지진 해일',
  '물건': '냉장고 세탁기 텔레비전 컴퓨터 휴대폰 선풍기 에어컨 청소기 전자레인지 가습기 다리미 손전등 우산 안경 지우개 연필깎이 스테이플러 계산기 망원경 현미경 나침반 손목시계 자명종 헤드폰 키보드 마우스 프린터 카메라 의자 책상 침대 소파 거울 숟가락 젓가락 프라이팬 주전자 머그컵',
  '탈것': '자동차 자전거 오토바이 비행기 헬리콥터 지하철 기차 버스 택시 구급차 소방차 경찰차 잠수함 유람선 요트 열기구 로켓 우주선 트랙터 굴착기 크레인 케이블카 모노레일 고속버스 킥보드 썰매 유모차 마차 트럭 지게차',
  '스포츠': '축구 야구 농구 배구 테니스 탁구 배드민턴 골프 수영 체조 양궁 태권도 씨름 복싱 펜싱 레슬링 스키 스케이트 컬링 아이스하키 럭비 볼링 승마 사격 카누 서핑 마라톤 핸드볼 피구 줄넘기 등산 스노보드 스케이트보드 수상스키 철인삼종',
  '속담·관용': '그림의떡 식은죽먹기 누워서떡먹기 하늘의별따기 우물안개구리 개밥에도토리 그림의떡 발등에불 새발의피 꿩먹고알먹고 도토리키재기 금강산도식후경 티끌모아태산 고래싸움에새우등',
  '한국문화': '한복 한옥 한글날 세종대왕 이순신 경복궁 창덕궁 불국사 석굴암 첨성대 훈민정음 거북선 태극기 무궁화 아리랑 판소리 사물놀이 탈춤 강강술래 윷놀이 제기차기 연날리기 팽이치기 널뛰기 그네뛰기 송편 추석 설날 정월대보름 단오',
  '과일·채소': '바나나 파인애플 복숭아 블루베리 오렌지 토마토 참외 수박 딸기 포도 사과 귤 자두 살구 키위 망고 체리 석류 무화과 아보카도 코코넛 브로콜리 양배추 시금치 콩나물 고구마 감자 당근 양파 마늘 옥수수 파프리카 버섯 호박 가지 오이 고추 배추 상추 깻잎',
};
const AN_WORDS = (() => {
  const out = [];
  for (const k in AN_BANK) for (const w of new Set(AN_BANK[k].split(/\s+/))) if (w.length >= 2) out.push({ w, cat: k });
  return out;
})();
const AN_DECOY = '가나다라마바사아자차카타파하고노도로모보소오조초코토포호구누두루무부수우주추쿠투푸후기니디리미비시이지치키티피히강산정영민수현준서진';
const TW = 84;
GAME({
  title: '단어 퍼즐', w: 960, h: 680, bg: '#fdf4ff', controls: 'none', typing: true,
  help: '섞인 글자 타일을 순서대로 클릭해 단어를 완성!\n숫자키 1~9로 타일 선택 · Backspace 되돌리기 · Enter 확인\n높은 레벨에선 가짜 글자(함정)가 섞여요\n💡힌트: 다음 글자 공개(H) · ⏭️건너뛰기: 시간 -8초(S)\n맞히면 시간 보너스 · 연속 정답 콤보!',
  init(g) {
    S = { level: 1, solved: 0, time: 60, combo: 0, hints: 3, tiles: [], pick: [], cur: null, msg: '', msgC: '#000', msgT: 0, flash: 0, used: new Set(), anim: 0, done: 0, shake: 0 };
    nextWord(g);
  },
  update(g, dt) {
    S.msgT = Math.max(0, S.msgT - dt); S.flash = Math.max(0, S.flash - dt); S.shake = Math.max(0, S.shake - dt);
    S.anim += dt;
    if (S.done > 0) { S.done -= dt; if (S.done <= 0) nextWord(g); return; }
    S.time -= dt;
    if (S.time <= 0) { S.time = 0; return g.over(`정답: ${S.cur.w} · ${S.solved}단어 · 레벨 ${S.level}`); }
    // 키 입력
    for (const code of g.typed) { const m = /^(?:Digit|Numpad)([1-9])$/.exec(code); if (m) pickTile(g, Number(m[1]) - 1); }
    if (g.keyp('Backspace')) unpick(g, S.pick.length - 1);
    if (g.keyp('KeyH')) hint(g);
    if (g.keyp('KeyS')) skip(g);
    if (g.keyp('Enter') || g.keyp('Space')) check(g, true);
    if (g.mouse.clicked) {
      S.tiles.forEach((t, i) => { const p = tilePos(i); if (!t.used && g.inRect(p.x, p.y, TW, TW)) pickTile(g, i); });
      const n = S.cur.w.length;
      for (let i = 0; i < S.pick.length; i++) { const p = slotPos(i, n); if (g.inRect(p.x, p.y, TW, TW)) { unpick(g, i); break; } }
      if (g.inRect(250, 590, 140, 52)) hint(g);
      if (g.inRect(410, 590, 140, 52)) shuffleTiles(g);
      if (g.inRect(570, 590, 140, 52)) skip(g);
      if (g.inRect(730, 590, 140, 52)) clearPick(g);
    }
    g.info = `레벨 ${S.level} · ${S.solved}단어 · 콤보 ${S.combo}`;
  },
  draw(g, c) {
    // 상단
    g.text(`LEVEL ${S.level}`, 40, 40, 26, '#86198f', 'left');
    g.text(`💡 ${S.hints}`, 920, 40, 24, '#a21caf', 'right');
    const tr = Math.min(1, S.time / 60);
    g.rrect(200, 30, 560, 20, 10, '#f5d0fe');
    g.rrect(200, 30, Math.max(20, 560 * tr), 20, 10, S.time < 10 ? (g.time % 0.4 < 0.2 ? '#dc2626' : '#f87171') : '#c026d3');
    g.text(`${Math.ceil(S.time)}초`, 480, 41, 15, '#fff');
    g.rrect(330, 72, 300, 46, 23, '#86198f');
    g.text(`주제: ${S.cur.cat}  ·  ${S.cur.w.length}글자`, 480, 96, 22, '#fff');
    if (S.combo >= 2) g.text(`🔥 ${S.combo} 콤보`, 480, 140, 22, '#ea580c');
    // 정답 슬롯
    const n = S.cur.w.length;
    const sx = S.shake > 0 ? Math.sin(g.time * 70) * 8 : 0;
    for (let i = 0; i < n; i++) {
      const p = slotPos(i, n), ch = S.pick[i] !== undefined ? S.tiles[S.pick[i]].ch : '';
      const ok = S.done > 0;
      g.rrect(p.x + sx, p.y, TW, TW, 16, ok ? '#bbf7d0' : ch ? '#fff' : 'rgba(134,25,143,.08)', ok ? '#16a34a' : S.shake > 0 ? '#dc2626' : '#c026d3', 3);
      if (ch) g.text(ch, p.x + sx + TW / 2, p.y + TW / 2 + 2, 44, ok ? '#166534' : '#3b0764');
      else if (S.cur.reveal > i) g.text(S.cur.w[i], p.x + TW / 2, p.y + TW / 2 + 2, 44, 'rgba(134,25,143,.35)');
    }
    // 타일
    S.tiles.forEach((t, i) => {
      const p = tilePos(i), bob = Math.sin(S.anim * 3 + i) * 3;
      if (t.used) { g.rrect(p.x, p.y, TW, TW, 16, 'rgba(0,0,0,.05)'); return; }
      const hov = g.inRect(p.x, p.y, TW, TW);
      g.rrect(p.x + 3, p.y + 6 + bob, TW, TW, 16, 'rgba(112,26,117,.25)');
      g.rrect(p.x, p.y + bob, TW, TW, 16, hov ? '#fae8ff' : '#fdf4ff', '#a21caf', 3);
      g.text(t.ch, p.x + TW / 2, p.y + TW / 2 + bob + 2, 42, '#581c87');
      g.text(String(i + 1), p.x + 12, p.y + 14 + bob, 13, '#c084fc', 'center', '600');
    });
    // 버튼
    g.button(250, 590, 140, 52, `💡 힌트(H)`, S.hints ? '#a21caf' : '#9ca3af', 19);
    g.button(410, 590, 140, 52, '🔀 섞기', '#7c3aed', 19);
    g.button(570, 590, 140, 52, '⏭️ 건너뛰기', '#db2777', 19);
    g.button(730, 590, 140, 52, '↩ 지우기', '#64748b', 19);
    g.text(`맞힌 단어 ${S.solved}`, 90, 616, 20, '#86198f');
    if (S.msgT > 0) { c.globalAlpha = Math.min(1, S.msgT * 2); g.text(S.msg, 480, 175, 30, S.msgC); c.globalAlpha = 1; }
    if (S.flash > 0) { c.globalAlpha = S.flash; g.rect(0, 0, 960, 680, 'rgba(34,197,94,.25)'); c.globalAlpha = 1; }
  },
});
function slotPos(i, n) { const gap = 12, tot = n * TW + (n - 1) * gap; return { x: 480 - tot / 2 + i * (TW + gap), y: 200 }; }
function tilePos(i) {
  const n = S.tiles.length, per = Math.min(n, 7), row = Math.floor(i / per), col = i % per;
  const inRow = Math.min(per, n - row * per), gap = 16, tot = inRow * TW + (inRow - 1) * gap;
  return { x: 480 - tot / 2 + col * (TW + gap), y: 360 + row * (TW + 20) };
}
function pool() {
  const L = S.level;
  const minL = L < 3 ? 2 : L < 6 ? 3 : 4, maxL = L < 3 ? 3 : L < 6 ? 4 : L < 9 ? 5 : 8;
  let p = AN_WORDS.filter((x) => x.w.length >= minL && x.w.length <= maxL && !S.used.has(x.w));
  if (p.length < 5) { S.used.clear(); p = AN_WORDS.filter((x) => x.w.length >= minL && x.w.length <= maxL); }
  return p;
}
function nextWord(g) {
  const cur = U.choice(pool());
  S.used.add(cur.w);
  S.cur = { w: cur.w, cat: cur.cat, reveal: 0, hinted: false };
  const chs = [...cur.w];
  const decoys = S.level >= 8 ? 2 : S.level >= 4 ? 1 : 0;
  for (let i = 0; i < decoys; i++) { let d; do d = AN_DECOY[U.randi(0, AN_DECOY.length - 1)]; while (chs.includes(d)); chs.push(d); }
  let sh;
  let tries = 0;
  do { sh = U.shuffle(chs.slice()); tries++; } while (sh.slice(0, cur.w.length).join('') === cur.w && tries < 10);
  S.tiles = sh.map((ch) => ({ ch, used: false }));
  S.pick = [];
  S.wordStart = S.time;
}
function pickTile(g, i) {
  const t = S.tiles[i];
  if (!t || t.used || S.pick.length >= S.cur.w.length) return;
  t.used = true; S.pick.push(i); g.sfx.tone(400 + S.pick.length * 60, 0.06, 'triangle', 0.06);
  if (S.pick.length === S.cur.w.length) check(g, false);
}
function unpick(g, idx) {
  if (idx < 0 || idx >= S.pick.length) return;
  if (idx < S.cur.reveal) return;
  const rem = S.pick.splice(idx);
  for (const r of rem) S.tiles[r].used = false;
  g.sfx.click();
}
function clearPick(g) { unpick(g, S.cur.reveal); }
function shuffleTiles(g) {
  const pickedChars = S.pick.map((i) => S.tiles[i].ch);
  const free = S.tiles.filter((t) => !t.used).map((t) => t.ch);
  U.shuffle(free);
  S.tiles = pickedChars.map((ch) => ({ ch, used: true })).concat(free.map((ch) => ({ ch, used: false })));
  S.pick = pickedChars.map((_, i) => i);
  g.sfx.pop();
}
function check(g, manual) {
  const n = S.cur.w.length;
  if (S.pick.length < n) { if (manual) { S.msg = '칸을 모두 채워주세요'; S.msgC = '#9333ea'; S.msgT = 1; } return; }
  const ans = S.pick.map((i) => S.tiles[i].ch).join('');
  if (ans === S.cur.w) {
    S.combo++; S.solved++;
    const spent = S.wordStart - S.time;
    const pts = Math.round((n * 40 + Math.max(0, 20 - spent) * 8) * (1 + S.combo * 0.1) * (S.cur.hinted ? 0.6 : 1) * (1 + (S.level - 1) * 0.15));
    g.add(pts, 480, 240);
    const tb = 4 + n * 1.5;
    S.time = Math.min(90, S.time + tb);
    S.msg = U.choice(['정답! 🎉', '훌륭해요! ✨', '천재인가요? 🧠', '완벽! 💯']) + `  +${tb.toFixed(0)}초`; S.msgC = '#16a34a'; S.msgT = 1.3;
    S.flash = 0.5; S.done = 0.9;
    g.sfx.coin(); g.later(() => g.sfx.tone(880, 0.12, 'sine', 0.08), 0.1);
    for (let i = 0; i < n; i++) { const p = slotPos(i, n); g.burst(p.x + TW / 2, p.y + TW / 2, ['#e879f9', '#fde047', '#4ade80', '#fff'], 12, 260, 0.8, 4); }
    if (S.solved % 5 === 0) {
      S.level++; S.hints = Math.min(5, S.hints + 1);
      g.later(() => { g.float(480, 300, `⬆ 레벨 ${S.level}! 💡+1`, '#a21caf', 40); g.sfx.power(); g.shake(5); }, 0.4);
    }
  } else {
    S.combo = 0; S.shake = 0.35; g.sfx.hit(); g.shake(4);
    S.msg = '틀렸어요! 다시 배열해보세요'; S.msgC = '#dc2626'; S.msgT = 1.2;
    S.time -= 2;
    g.later(() => { if (S.done <= 0) clearPick(g); }, 0.4);
  }
}
function hint(g) {
  if (S.hints <= 0 || S.done > 0) { g.sfx.hit(); return; }
  const n = S.cur.w.length;
  if (S.cur.reveal >= n - 1) return;
  // 앞에서부터 맞는 글자 수
  let k = 0;
  while (k < S.pick.length && S.tiles[S.pick[k]].ch === S.cur.w[k]) k++;
  unpick(g, k);
  const need = S.cur.w[k];
  const idx = S.tiles.findIndex((t) => !t.used && t.ch === need);
  if (idx < 0) return;
  S.hints--; S.cur.hinted = true;
  S.tiles[idx].used = true; S.pick.push(idx); S.cur.reveal = k + 1;
  g.sfx.power();
  if (S.pick.length === n) check(g, false);
}
function skip(g) {
  if (S.done > 0) return;
  S.combo = 0; S.time -= 8;
  S.msg = `정답은 "${S.cur.w}"`; S.msgC = '#db2777'; S.msgT = 1.6;
  g.sfx.drop(); g.shake(3);
  S.done = 1.2;
  S.tiles = [...S.cur.w].map((ch) => ({ ch, used: true })); S.pick = S.tiles.map((_, i) => i);
}
