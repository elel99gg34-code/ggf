let S;
const WORDS = ['사과', '바나나', '컴퓨터', '키보드', '모니터', '프로그램', '고양이', '강아지', '하늘', '바다', '구름', '무지개', '학교', '선생님', '친구', '사랑', '행복', '우정', '음악', '노래', '피아노', '기타', '드럼', '축구', '야구', '농구', '배구', '수영', '여행', '비행기', '기차', '자동차', '자전거', '지하철', '버스', '택시', '병원', '약국', '도서관', '박물관', '미술관', '영화관', '놀이공원', '동물원', '식물원', '수족관', '김치', '불고기', '비빔밥', '떡볶이', '라면', '김밥', '치킨', '피자', '햄버거', '아이스크림', '초콜릿', '사탕', '과자', '우유', '커피', '녹차', '주스', '봄', '여름', '가을', '겨울', '눈사람', '크리스마스', '생일', '선물', '케이크', '풍선', '파티', '달력', '시계', '안경', '모자', '신발', '가방', '우산', '연필', '지우개', '공책', '필통', '가위', '풀', '색종이', '물감', '도화지', '태양', '지구', '우주', '로켓', '별자리', '은하수', '산성비', '한컴타자', '타자연습', '빠르게', '정확하게', '대한민국', '서울', '부산', '제주도', '한라산', '백두산', '독도', '한강', '경복궁', '남산타워', '세종대왕', '이순신', '한글날', '무궁화', '태극기', '아리랑', '김치찌개', '된장찌개', '삼겹살', '냉면', '호떡', '붕어빵', '떡국', '송편', '윷놀이', '팽이치기', '연날리기', '제기차기'];
GAME({
  title: '산성비', w: 900, h: 720, bg: '#0c1a2a', controls: 'none', typing: true, noAutoPause: true,
  help: '하늘에서 떨어지는 단어를 아래 입력창에 똑같이 치고 Enter!\n단어가 땅(빗물받이)에 닿으면 체력 감소 💧\n🌈 무지개 단어 = 화면 정지 · 💊 단어 = 체력 회복 · 💥 = 전체 제거\n단계가 오를수록 빨라져요 — 그 시절 한컴타자 산성비!',
  init(g) {
    S = { words: [], hp: 100, level: 1, killed: 0, spawn: 0, freeze: 0, splash: [] };
    let inp = document.getElementById('typeIn');
    if (!inp) {
      inp = document.createElement('input'); inp.id = 'typeIn'; inp.autocomplete = 'off'; inp.placeholder = '여기에 입력하고 Enter';
      Object.assign(inp.style, { position: 'absolute', left: '50%', bottom: '18px', transform: 'translateX(-50%)', width: 'min(360px,80vw)', fontSize: '22px', padding: '10px 14px', borderRadius: '12px', border: '3px solid #38bdf8', background: '#0f172a', color: '#fff', outline: 'none', zIndex: 6, textAlign: 'center', fontFamily: 'inherit' });
      document.getElementById('stage').appendChild(inp);
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); window.__typed = (window.__typed || []).concat(inp.value.trim()); inp.value = ''; } if (e.key === 'Escape') inp.blur(); });
    }
    inp.value = ''; S.inp = inp; window.__typed = [];
  },
  update(g, dt) {
    if (document.activeElement !== S.inp && g.frame % 10 === 0) S.inp.focus();
    S.freeze -= dt;
    const fall = (30 + S.level * 9) * (S.freeze > 0 ? 0 : 1);
    S.spawn -= dt;
    if (S.spawn <= 0 && S.freeze <= 0) { S.spawn = Math.max(0.6, 2.2 - S.level * 0.15); const r = Math.random(); S.words.push({ w: U.choice(WORDS), x: U.rand(80, 820), y: -10, sp: U.rand(0.8, 1.2), k: r < 0.05 ? 'rain' : r < 0.1 ? 'heal' : r < 0.13 ? 'boom' : null }); }
    for (const w of S.words) { w.y += fall * w.sp * dt; if (w.y > 600) { w.dead = true; S.hp -= 10; S.splash.push({ x: w.x, t: 0.6 }); g.sfx.drop(); g.shake(4); } }
    const typed = window.__typed || []; window.__typed = [];
    for (const t of typed) {
      if (!t) continue;
      const w = S.words.filter((w) => !w.dead && w.w === t).sort((a, b) => b.y - a.y)[0];
      if (w) {
        w.dead = true; S.killed++; const pts = t.length * 10 * S.level; g.add(pts); g.sfx.coin(); g.burst(w.x, w.y, ['#38bdf8', '#fff'], 14); g.float(w.x, w.y - 20, `+${pts}`, '#fde047');
        if (w.k === 'rain') { S.freeze = 4; g.float(450, 300, '🌈 정지!', '#fde047', 34); }
        if (w.k === 'heal') { S.hp = Math.min(100, S.hp + 20); g.float(450, 300, '💊 회복!', '#4ade80', 34); }
        if (w.k === 'boom') { S.words.forEach((o) => { if (!o.dead) { o.dead = true; g.add(o.w.length * 5); g.burst(o.x, o.y, '#f97316', 8); } }); g.sfx.explode(); g.shake(8); }
        if (S.killed % 15 === 0) { S.level++; g.sfx.win(); g.float(450, 250, `${S.level}단계!`, '#a78bfa', 40); }
      } else { g.sfx.hit(); S.miss = 0.3; }
    }
    S.words = S.words.filter((w) => !w.dead);
    S.splash = S.splash.filter((s) => (s.t -= dt) > 0);
    S.miss = Math.max(0, (S.miss || 0) - dt);
    if (S.hp <= 0) { S.inp.blur(); S.inp.remove(); return g.over(`${S.level}단계 · ${S.killed}단어`); }
    g.info = `${S.level}단계 · ${S.killed}단어`;
  },
  draw(g, c) {
    const grd = c.createLinearGradient(0, 0, 0, 720); grd.addColorStop(0, '#1e293b'); grd.addColorStop(1, '#0c1a2a'); c.fillStyle = grd; c.fillRect(0, 0, 900, 720);
    for (let i = 0; i < 60; i++) { const x = (i * 97 + g.time * 40) % 900, y = (i * 53 + g.time * 300) % 620; g.line(x, y, x - 3, y + 12, 'rgba(148,163,184,.25)', 1); }
    g.rect(0, 610, 900, 110, '#164e63'); for (let x = 0; x < 900; x += 60) g.rrect(x + 4, 600, 52, 20, 6, '#0e7490');
    g.rect(20, 640, 200, 16, '#0f172a'); g.rect(20, 640, 2 * Math.max(0, S.hp), 16, S.hp < 30 ? '#ef4444' : '#22d3ee'); g.text('💧 체력', 20, 628, 13, '#a5f3fc', 'left');
    for (const s of S.splash) { c.globalAlpha = s.t; g.emoji('💦', s.x, 600, 40); c.globalAlpha = 1; }
    for (const w of S.words) {
      const col = w.k === 'rain' ? `hsl(${(g.time * 200) % 360},90%,65%)` : w.k === 'heal' ? '#4ade80' : w.k === 'boom' ? '#fb923c' : '#e2e8f0';
      g.ctx.font = 'bold 22px system-ui'; const tw = g.ctx.measureText(w.w).width;
      g.rrect(w.x - tw / 2 - 10, w.y - 18, tw + 20, 34, 10, 'rgba(15,23,42,.75)', col, 2);
      g.text((w.k === 'heal' ? '💊' : w.k === 'boom' ? '💥' : '') + w.w, w.x, w.y, 22, col);
    }
    if (S.freeze > 0) { c.fillStyle = 'rgba(253,224,71,.08)'; c.fillRect(0, 0, 900, 720); }
    if (S.miss > 0) g.text('오타!', 450, 560, 24, '#f87171');
    g.text(`${S.level}단계`, 880, 640, 22, '#a78bfa', 'right');
  },
});
