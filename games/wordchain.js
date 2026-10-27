let S;
const WC_RAW = `
가구 가게 가방 가수 가족 가을 가위 가지 가로수 가마솥 가면 가슴 가치 가격 가루 가사 가야금 가로등 가습기 가뭄 가오리 가자미 가시 가요 가정 가훈
각도 각시 각오 각자 간식 간호사 간장 간판 간격 간이역 갈비 갈매기 갈대 갈치 갈림길 갈등 갈색 감자 감기 감나무 감동 감옥 감정 감독 감사 감귤
강물 강아지 강당 강도 강변 강의 강낭콩 강산 강철 개구리 개미 개나리 개울 개성 개학 개인 개구쟁이 거울 거미 거북이 거리 거실 거인 거짓말 거품 거름
건물 건강 건전지 건축 건반 걸레 걸음 검사 검도 검정 게임 게시판 겨울 겨자 결혼 결과 결심 결승 경찰 경기 경주 경치 경험 경제 경복궁 경례 경로당
계단 계란 계절 계산 계곡 계획 계약 계주 고래 고양이 고구마 고추 고기 고등어 고향 고무 고속도로 고슴도치 고릴라 고드름 고민 고전 고려 고사리 고무줄 고개 고깔
곡식 곡선 곤충 곤란 골목 골프 골짜기 골키퍼 곰팡이 곰탕 곰인형 공원 공책 공기 공주 공룡 공항 공장 공부 공연 공사 공포 공간 공격 공작 공짜
과자 과일 과학 과제 과거 과녁 관광 관객 관심 관계 관절 광장 광고 광대 광산 광부 교실 교과서 교회 교통 교육 교수 교장 교복 교문
구름 구두 구슬 구멍 구급차 구조 구역 구경 구석 구멍가게 국수 국가 국어 국자 국화 국회 국물 군인 군대 군밤 군고구마 굴뚝 굴비 궁전 궁궐 귀신 귀걸이 귀뚜라미 귀족 귀마개 규칙 규모
그림 그릇 그네 그늘 그물 그림자 그림책 극장 글씨 글자 금요일 금붕어 금고 금메달 금강산 금반지 기차 기린 기름 기억 기자 기타 기계 기술 기온 기적 기침 기회 기와 기러기 기둥 기도 기념일 기지개
길이 길거리 길잡이 김치 김밥 김장 김치전 까치 까마귀 깃발 깃털 꼬리 꼬마 꽃병 꽃잎 꽃게 꽃다발 꿀벌 꿀떡 꿈나무
나무 나비 나라 나이 나팔 나침반 나그네 나들이 나룻배 나사 낙타 낙엽 낙서 낙하산 난로 난초 날씨 날개 날짜 남자 남쪽 남극 남편 남매 남산 낮잠 낭떠러지 낭비
내일 내복 내용 내기 냄비 냄새 냉장고 냉면 너구리 너울 네모 네잎클로버 노래 노트 노을 노인 노력 노루 노란색 노크 녹차 녹음 논밭 논리 논문 놀이터 놀이공원 농구 농부 농장 농사 농담
누나 누룽지 눈사람 눈물 눈썹 눈동자 눈보라 눈썰매 느낌표 느티나무 늑대 늠름 늪
다리 다람쥐 다리미 다이아몬드 다락방 다시마 단추 단어 단풍 단군 단독 달걀 달력 달팽이 달리기 달빛 닭고기 닭장 담요 담장 당근 당나귀 당번 당나라
대나무 대문 대학 대화 대통령 대표 대답 대회 대장 대추 도시 도로 도서관 도마 도토리 도자기 도깨비 도둑 도장 도화지 도마뱀 도움 도전 도시락 도넛
독수리 독서 독도 돈가스 돌고래 돌다리 돌멩이 동물 동생 동전 동화 동네 동굴 동산 동그라미 동상 동요 동창 동물원 돼지 두부 두더지 두꺼비 두뇌 두루미 뒤꿈치 드럼 드라마 등대 등산 등불 딸기 땅콩 땅굴 떡국 떡볶이 떡갈나무
라면 라디오 라켓 램프 레몬 레슬링 레고 로봇 로켓 리본 리듬 리모컨 마을 마음 마술 마차 마스크 마당 마늘 마라톤 마녀 마법사 만두 만화 만세 만화책 말씀 말투 망치 망원경 망아지
매미 매일 매듭 매화 머리 머리띠 머리카락 먹이 메뚜기 메아리 메밀 면도기 면허 명절 명함 명태 모자 모래 모기 모양 모험 모서리 모니터 모과 모닥불 모래성
목걸이 목도리 목욕 목소리 목수 목장 몸무게 무지개 무릎 무궁화 무대 무용 무늬 무사 무기 무게 무당벌레 문어 문제 문화 문방구 문법 문지기 물고기 물감 물개 물건 물병 물방울 물레방아
미술 미역 미소 미로 미래 미끄럼틀 미나리 미술관 민들레 민속촌 밀가루 밀림 밀짚모자 바다 바람 바나나 바지 바위 바구니 바이올린 바퀴 바늘 바둑 바닷가 박물관 박수 박쥐 박사 박하사탕
반지 반찬 반달 반장 반딧불 발가락 발자국 발명 발레 밤하늘 밤나무 밥상 밥솥 방울 방석 방학 방송 방패 방향 방울토마토 배추 배꼽 배구 배낭 배달 배우 백조 백과사전 백두산 백화점 뱀장어
버스 버섯 버터 번개 번호 벌레 벌집 범인 법원 법칙 벚꽃 베개 벽돌 벽시계 변기 변신 변호사 별자리 별명 별똥별 병원 병아리 보물 보리 보석 보자기 보름달 보라색 보물섬 복숭아 복도 복권 볼펜 봄비 봉투 봉사 봉숭아
부채 부엌 부엉이 부모 부산 부자 부츠 부침개 북극 북쪽 북극곰 분수 분필 불꽃 불고기 불가사리 붓글씨 비행기 비누 비둘기 비빔밥 비밀 비옷 비타민 비단 비버 비석 빗자루 빗물 빨래 빨대 빵집
사과 사자 사랑 사진 사탕 사막 사슴 사다리 사전 사람 사이다 사슬 사회 사무실 사계절 산책 산타 산소 산호 산딸기 살구 삼촌 삼각형 삼겹살 상자 상어 상추 상처 상장 상품 상상 새우 새벽 새해 색연필 색종이
생선 생일 생각 생쥐 생강 서랍 서점 서울 서쪽 서커스 석류 석탄 선물 선생님 선풍기 선수 선배 선장 설탕 설날 설거지 섬나라 성탄절 성격 성냥 세탁기 세상 세수 세균 소금 소나무 소방관 소풍 소리 소설 소녀 소년 소라 소나기 소방차
속담 속도 손가락 손수건 손님 손톱 손잡이 솜사탕 송아지 송편 송이 수박 수영 수건 수학 수레 수염 수달 수첩 수도 수요일 수족관 수제비 숙제 숟가락 술래잡기 숲속 스키 스케이트 스웨터 스파게티 스님 습관
시계 시장 시간 시금치 시소 시험 시골 시인 시냇물 식물 식탁 식당 식빵 신발 신문 신호등 신부 신랑 실내화 실수 실험 심장 심부름 씨앗 씨름 아기 아빠 아이스크림 아침 아파트 아버지 아저씨 아리랑 아궁이
악어 악기 악수 안경 안개 안녕 안전 알약 알람 알밤 앵무새 야구 야자수 야채 야옹이 약국 약속 양말 양파 양치 양산 양복 어머니 어부 어항 어린이 어깨 얼음 얼굴 얼룩말 엄마 에어컨 여름 여우 여행 여자 여왕 여권 역사 역도
연필 연못 연극 연기 연어 연습 연꽃 연날리기 열쇠 열매 열차 염소 염색 엽서 영화 영어 영웅 영양 예술 예절 예보 오리 오이 오징어 오렌지 오늘 오후 오전 오토바이 오두막 오솔길 옥수수 옥상 온도 온천 올빼미 올림픽 옷장 옷걸이
왕자 왕관 왕비 외국 외계인 외투 요리 요정 요일 요리사 요구르트 요술 용기 용돈 용궁 우유 우산 우주 우체국 우정 우물 우비 우주선 운동 운동장 운명 울타리 원숭이 원피스 원두막 월요일 유리 유령 유치원 유람선 유자 유리병
은행 은하수 은메달 음악 음식 음료수 의자 의사 이마 이불 이야기 이름 이사 이빨 이순신 이웃 이삿짐 이끼 이슬 인형 인사 인삼 인터넷 인절미 일기 일요일 일출 입술 입학 잉어 잉크 임금 임무
자동차 자전거 자석 자연 자두 자유 자장가 자라 자갈 자물쇠 잔디 잔치 잠자리 잠수함 잠옷 장갑 장난감 장미 장마 장구 장수풍뎅이 장화 장난꾸러기 재미 재채기 재료 저녁 저금통 저울 전화 전기 전쟁 전설 전등 전철 절벽 점심 점수 접시
정원 정글 정답 정류장 정거장 정성 제비 제주도 제기차기 제목 조개 조각 조끼 조미료 조카 족제비 족발 종이 종소리 종이학 주머니 주사 주스 주전자 주말 주인 주차장 죽순 줄넘기 줄기 지구 지도 지갑 지하철 지우개 지렁이 지붕 지팡이 지혜 지진 지하 지역 지식 지휘자
진주 진달래 진흙 짐승 집게 짜장면 찌개 차표 차례 차고 참새 참외 참기름 참치 창문 창고 채소 책상 책가방 책장 처음 천둥 천사 천장 천막 철새 철도 철봉 청소 청바지 청소기 청개구리 체육 체조 체온 초콜릿 초록 초대 초인종 초밥 초가집 촛불 총알 추석 추억 축구 축제 충치
치마 치즈 치약 치과 치킨 치타 칠판 칠면조 침대 침팬지 칫솔 카메라 카드 카레 칼국수 캥거루 커피 커튼 컨테이너 컴퓨터 케이크 케첩 코끼리 코알라 코스모스 코트 콩나물 크레파스 크리스마스 타조 타자기 타이어 탁자 탁구 태양 태극기 태풍 택시 택배 탬버린 터널 텔레비전
토끼 토마토 토요일 토끼풀 통조림 투수 튤립 트럭 트럼펫 파도 파랑새 파인애플 파리 파일 파티 판다 판사 팔찌 팔꿈치 팽이 펭귄 편지 편의점 포도 포크 포장 표범 표정 풀밭 풍선 풍차 풍경 프라이팬 프린터 피아노 피자 피리 피망
하늘 하마 하모니카 하트 학교 학생 학원 한글 한복 한강 한라산 할머니 할아버지 해바라기 해적 해변 해님 해마 해파리 햄버거 햄스터 햇빛 햇살 행복 행운 향기 향수 허수아비 허리 호랑이 호박 호수 호떡 호루라기 호텔 홍수 홍시 화분 화가 화산 화장실 화요일 환자 황소 황금 회사 회의 후추 휴지 휴가 휴대폰 흰색 희망
갑옷 강강술래 개나리꽃 고무신 고추장 공책꽂이 관광객 구슬치기 국가대표 기념품 기차역 나뭇잎 냉이 녹두 놀이기구 눈꽃 단팥빵 달맞이 대장장이 도롱뇽 동그랑땡 된장 두레박 등잔 라일락 마카롱 메주 모내기 무지개떡 물수제비 미꾸라지 바지락 방아깨비 버드나무 베짱이 보리차 비빔국수 사또 상투 새싹 선녀 소쿠리 수수께끼
시루떡 쑥떡 씨름판 아지랑이 약과 양반 어묵 엿가락 오곡밥 옹달샘 우렁이 윷놀이 이팝나무 장독대 절구 젓가락 조약돌 주꾸미 지게 짚신 찐빵 참나무 초가지붕 추어탕 콩국수 탈춤 팥빙수 풀피리 한옥 해님달님 호두 화로 황새 흥부
가로세로 각설탕 개똥벌레 거위 고슴도치 공깃돌 구슬땀 귤껍질 그네뛰기 기러기떼 꼭두각시 나룻터 너와집 노루귀 다듬이 대들보 도토리묵 동백꽃 두꺼비집 뜀틀 마루 맷돌 멍석 모시 문풍지 바가지 방패연 버선 보름 비녀 빈대떡 사랑방 살림 새참 서낭당 석빙고 소달구지 솟대 수라상 시조 쌀밥 아궁 안방 앞치마 얼레 엽전 오미자 온돌 우산꽂이 윗목 은행나무 이엉 자개장 장승 저고리 절편 정자 제사 조롱박 종묘 주막 줄다리기
`;
const WC_DICT = [...new Set(WC_RAW.split(/\s+/).filter((w) => /^[가-힣]{2,}$/.test(w)))];
const WC_SET = new Set(WC_DICT);
const WC_BY = {};
for (const w of WC_DICT) (WC_BY[w[0]] = WC_BY[w[0]] || []).push(w);
const WC_Y = [2, 6, 7, 12, 17, 20];
const WC_AIFACE = ['🤖', '😎', '🧐', '😈', '👾', '🦊', '🐉'];
const WC_AINAME = ['초보봇', '말랑봇', '박사봇', '악마봇', '외계봇', '여우봇', '용왕봇'];

GAME({
  title: '끝말잇기', w: 900, h: 700, bg: '#f0f9ff', controls: 'none', typing: true, noAutoPause: true,
  help: '앞 단어의 마지막 글자로 시작하는 단어를 입력하고 Enter!\n두음법칙 OK: 력→역, 리→이, 녀→여, 라→나 …\n같은 단어는 다시 못 써요 · 시간이 다 되면 생명 -1\n사전에 없는 단어는 🃏양심카드(3장)로 낼 수 있어요\n💡힌트 3번 · AI가 막히면 다음 스테이지 (AI가 점점 강해져요)',
  init(g) {
    S = { stage: 1, lives: 3, jokers: 3, hints: 3, chain: [], used: new Set(), turn: 'wait', t: 0, tmax: 15, think: 0, msg: '', msgC: '#0f172a', msgT: 0, hintW: '', wait: 0.8, words: 0, best: 0, bubbles: [], inp: S && S.inp, next: null, shakeIn: 0 };
  },
  update(g, dt) {
    ensureInput();
    if (document.activeElement !== S.inp && g.frame % 10 === 0 && !('ontouchstart' in window)) S.inp.focus();
    S.msgT = Math.max(0, S.msgT - dt);
    S.shakeIn = Math.max(0, S.shakeIn - dt);
    const typed = window.__wcTyped || []; window.__wcTyped = [];
    if (S.turn === 'wait') {
      S.wait -= dt;
      if (S.wait <= 0) startRound(g);
      return;
    }
    if (S.turn === 'ai') {
      S.think -= dt;
      if (S.think <= 0) aiMove(g);
    } else if (S.turn === 'player') {
      S.t -= dt;
      if (S.t < 3 && Math.floor(S.t * 2) !== Math.floor((S.t + dt) * 2)) g.sfx.beep(880, 0.05);
      for (const w of typed) submit(g, w);
      if (S.turn === 'player' && S.t <= 0) { playerFail(g, '⏰ 시간 초과!'); }
      if (S.turn === 'player' && g.clickIn(40, 548, 150, 46)) useHint(g);
      if (S.turn === 'player' && g.clickIn(710, 548, 150, 46)) playerFail(g, '🏳️ 패스했어요');
    }
    g.info = `스테이지 ${S.stage} · ❤️${S.lives} · 🃏${S.jokers} · 💡${S.hints}`;
  },
  draw(g, c) {
    if (S.inp) {
      const play = window.__state && window.__state() === 'play' && !g.ended;
      S.inp.style.display = play ? '' : 'none';
    }
    // 헤더
    g.rrect(20, 14, 860, 92, 18, '#e0f2fe', '#7dd3fc', 2);
    const lvl = Math.min(S.stage - 1, WC_AIFACE.length - 1);
    g.emoji(WC_AIFACE[lvl], 70, 60, 56 + (S.turn === 'ai' ? Math.sin(g.time * 12) * 4 : 0));
    g.text(`${WC_AINAME[lvl]} Lv.${S.stage}`, 110, 44, 22, '#0c4a6e', 'left');
    g.text(S.turn === 'ai' ? '생각 중' + '.'.repeat(1 + Math.floor(g.time * 3) % 3) : '대기 중', 110, 76, 17, '#0369a1', 'left', '600');
    for (let i = 0; i < 3; i++) g.emoji(i < S.lives ? '❤️' : '🤍', 560 + i * 36, 44, 28);
    for (let i = 0; i < S.jokers; i++) g.emoji('🃏', 560 + i * 36, 80, 24);
    g.text(`연결 ${S.chain.length}`, 860, 44, 22, '#0c4a6e', 'right');
    g.text(`최장 ${S.best}`, 860, 78, 17, '#0369a1', 'right', '600');
    // 체인 버블
    const list = S.chain.slice(-6);
    list.forEach((e, i) => {
      const y = 140 + i * 58, me = e.who === 'p', w = Math.max(140, e.w.length * 34 + 60);
      const x = me ? 860 - w : 40;
      g.rrect(x, y, w, 48, 22, me ? '#fde68a' : '#ffffff', me ? '#f59e0b' : '#94a3b8', 2);
      const last = e.w[e.w.length - 1];
      g.text(e.w.slice(0, -1), x + w / 2 - 14, y + 25, 28, '#0f172a');
      c.font = 'bold 28px system-ui'; const tw = c.measureText(e.w.slice(0, -1)).width;
      g.text(last, x + w / 2 - 14 + tw / 2 + 16, y + 25, 30, '#dc2626');
      if (e.joker) g.emoji('🃏', x + w - 18, y + 8, 20);
    });
    if (!S.chain.length) g.text('새 라운드를 준비 중…', 450, 300, 26, '#64748b');
    // 다음 글자
    if (S.turn === 'player' || S.turn === 'ai') {
      const st = S.next ? starts(S.next) : [];
      g.rrect(250, 500, 400, 44, 14, '#0c4a6e');
      g.text(S.turn === 'player' ? `'${st.join("' 또는 '")}'(으)로 시작!` : `AI 차례 ('${st.join("'/'")}')`, 450, 523, 22, '#fff');
    }
    // 타이머
    if (S.turn === 'player') {
      const r = Math.max(0, S.t / S.tmax);
      g.rrect(40, 610, 820, 14, 7, '#cbd5e1');
      g.rrect(40, 610, Math.max(14, 820 * r), 14, 7, r < 0.25 ? (g.time % 0.4 < 0.2 ? '#dc2626' : '#f87171') : '#0ea5e9');
      g.text(S.t.toFixed(1) + '초', 450, 594, 16, '#334155', 'center', '600');
      g.button(40, 548, 150, 46, `💡 힌트 (${S.hints})`, S.hints ? '#0284c7' : '#94a3b8', 18);
      g.button(710, 548, 150, 46, '🏳️ 패스', '#e11d48', 18);
    }
    if (S.hintW) g.text(`힌트: ${S.hintW}`, 450, 470, 22, '#0369a1');
    if (S.msgT > 0) {
      c.globalAlpha = Math.min(1, S.msgT * 2);
      g.rrect(170, 420, 560, 50, 16, 'rgba(255,255,255,.95)', S.msgC, 3);
      g.text(S.msg, 450 + (S.shakeIn > 0 ? Math.sin(g.time * 80) * 6 : 0), 446, 22, S.msgC);
      c.globalAlpha = 1;
    }
    g.text('입력창에 단어를 쓰고 Enter ⏎', 450, 676, 14, '#64748b', 'center', '500');
  },
});

function ensureInput() {
  let inp = document.getElementById('wcIn');
  if (!inp) {
    inp = document.createElement('input'); inp.id = 'wcIn'; inp.autocomplete = 'off'; inp.placeholder = '단어 입력 후 Enter';
    Object.assign(inp.style, { position: 'absolute', left: '50%', bottom: '14px', transform: 'translateX(-50%)', width: 'min(340px,80vw)', fontSize: '22px', padding: '9px 14px', borderRadius: '12px', border: '3px solid #0ea5e9', background: '#fff', color: '#0f172a', outline: 'none', zIndex: 6, textAlign: 'center', fontFamily: 'inherit' });
    (document.getElementById('stage') || document.body).appendChild(inp);
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); window.__wcTyped = (window.__wcTyped || []).concat(inp.value.trim()); inp.value = ''; }
      if (e.key === 'Escape') inp.blur();
    });
  }
  S.inp = inp;
}
function dueum(ch) {
  const c = ch.charCodeAt(0) - 0xac00;
  if (c < 0 || c > 11171) return ch;
  const cho = Math.floor(c / 588), jung = Math.floor((c % 588) / 28), jong = c % 28;
  let nc = cho;
  if (cho === 5) nc = WC_Y.includes(jung) ? 11 : 2;
  else if (cho === 2 && WC_Y.includes(jung)) nc = 11;
  return String.fromCharCode(0xac00 + nc * 588 + jung * 28 + jong);
}
function starts(ch) { const d = dueum(ch); return d === ch ? [ch] : [ch, d]; }
function cands(ch) {
  const out = [];
  for (const s of starts(ch)) for (const w of WC_BY[s] || []) if (!S.used.has(w)) out.push(w);
  return out;
}
function follow(w) { return cands(w[w.length - 1]).length; }
function say(text, col, t = 2) { S.msg = text; S.msgC = col; S.msgT = t; }
function startRound(g) {
  S.chain = []; S.used = new Set(); S.hintW = '';
  const pool = WC_DICT.filter((w) => w.length <= 3 && follow(w) >= 4);
  const w = U.choice(pool);
  addWord(g, w, 'ai');
  say(`${WC_AINAME[Math.min(S.stage - 1, 6)]}: "${w}"(으)로 시작할게요!`, '#0369a1', 2);
  playerTurn();
}
function playerTurn() { S.turn = 'player'; S.tmax = Math.max(7, 16 - S.stage * 1.2); S.t = S.tmax; S.hintW = ''; }
function addWord(g, w, who, joker) {
  S.chain.push({ w, who, joker }); S.used.add(w); S.next = w[w.length - 1];
  S.best = Math.max(S.best, S.chain.length);
}
function submit(g, raw) {
  const w = (raw || '').replace(/\s/g, '');
  if (!w) return;
  const bad = (m) => { say(m, '#dc2626', 1.6); S.shakeIn = 0.3; g.sfx.hit(); g.shake(3); };
  if (!/^[가-힣]+$/.test(w)) return bad('한글 단어만 쓸 수 있어요');
  if (w.length < 2) return bad('두 글자 이상 써주세요');
  if (!starts(S.next).includes(w[0])) return bad(`'${starts(S.next).join("' / '")}'(으)로 시작해야 해요`);
  if (S.used.has(w)) return bad('이미 나온 단어예요!');
  let joker = false;
  if (!WC_SET.has(w)) {
    if (S.jokers <= 0) return bad(`'${w}'… 사전에 없는 단어예요`);
    S.jokers--; joker = true;
    say(`🃏 사전에 없는 단어 → 양심카드 사용 (남은 ${S.jokers})`, '#9333ea', 2);
  }
  addWord(g, w, 'p', joker);
  const pts = Math.round((w.length * 20 + Math.ceil(S.t) * 6) * (1 + (S.stage - 1) * 0.25) * (joker ? 0.5 : 1) + S.chain.length * 2);
  g.add(pts, 700, 400);
  g.sfx.coin(); g.burst(720, 140 + Math.min(5, S.chain.length - 1) * 58 + 24, ['#fbbf24', '#38bdf8', '#fff'], 16, 200);
  S.words++;
  if (!joker) say(`좋아요! +${pts}`, '#16a34a', 1.0);
  S.turn = 'ai'; S.think = U.rand(0.7, 1.5) + Math.random() * 0.4;
}
function aiMove(g) {
  const cs = cands(S.next);
  const know = Math.min(0.97, 0.55 + S.stage * 0.08);
  const known = cs.filter(() => Math.random() < know);
  if (!known.length) {
    g.sfx.win(); g.shake(6);
    const bonus = 300 * S.stage + S.chain.length * 20;
    g.add(bonus, 450, 300);
    say(`😵 AI가 '${S.next}'(으)로 시작하는 단어를 못 찾았어요! 승리 +${bonus}`, '#16a34a', 2.6);
    g.burst(450, 300, ['#fde047', '#22c55e', '#38bdf8', '#f472b6'], 60, 400, 1.2, 5);
    S.stage++; S.turn = 'wait'; S.wait = 2.6;
    if (S.stage > 1 && S.stage % 3 === 1 && S.jokers < 3) { S.jokers++; g.later(() => say('🃏 양심카드 +1 보너스!', '#9333ea', 1.6), 2.7); }
    return;
  }
  let w;
  const killer = Math.min(0.85, 0.08 + (S.stage - 1) * 0.13);
  if (Math.random() < killer) {
    known.sort((a, b) => follow(a) - follow(b));
    const top = known.slice(0, Math.max(1, Math.ceil(known.length / 4)));
    w = U.choice(top);
  } else {
    const safe = known.filter((x) => follow(x) > 0);
    w = U.choice(safe.length && Math.random() > 0.05 * S.stage ? safe : known);
  }
  addWord(g, w, 'ai');
  g.sfx.tone(520, 0.08, 'triangle', 0.06); g.sfx.tone(700, 0.08, 'triangle', 0.06, 0, 0.08);
  if (follow(w) === 0) say('😈 한방 단어! 이어갈 수 있을까?', '#b91c1c', 1.8);
  playerTurn();
}
function playerFail(g, why) {
  S.lives--; g.sfx.lose(); g.shake(8);
  const sample = cands(S.next).slice(0, 3);
  say(`${why}${sample.length ? ' 예: ' + sample.join(', ') : ''}`, '#dc2626', 2.6);
  S.turn = 'wait'; S.wait = 2.6;
  if (S.lives <= 0) { S.turn = 'end'; g.later(() => g.over(`스테이지 ${S.stage} · 이은 단어 ${S.words}개 · 최장 연결 ${S.best}`), 1.6); }
}
function useHint(g) {
  if (S.hints <= 0) { g.sfx.hit(); return; }
  const cs = cands(S.next);
  if (!cs.length) { say('힌트가 없어요… 양심카드나 패스를 써보세요', '#9333ea', 1.6); return; }
  S.hints--;
  cs.sort((a, b) => follow(b) - follow(a));
  const w = cs[0];
  S.hintW = w[0] + ' ○'.repeat(w.length - 1) + `  (${w.length}글자)`;
  if (S.t < 6) S.t = 6;
  g.sfx.power();
}
