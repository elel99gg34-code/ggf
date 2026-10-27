let S;
const GW = 200, GH = 150, CS = 4, PX = 800;
const E = 0, SAND = 1, WATER = 2, WALL = 3, FIRE = 4, PLANT = 5, WOOD = 6, OIL = 7, LAVA = 8, STONE = 9, STEAM = 10, SMOKE = 11, ICE = 12, ACID = 13, POWDER = 14, SEED = 15, GLASS = 16, ASH = 17, CLONE = 18, FLOWER = 19, SALT = 20, ERASE = 99;
const ST = 0, PW = 1, LQ = 2, GS = 3;
// [이름, 이모지, 종류, 밀도, 기본색, 가연성, 설명]
const MATS = [];
MATS[SAND] = ['모래', '🏖️', PW, 5, [222, 192, 112], 0, '쌓이고 물에 가라앉아요'];
MATS[WATER] = ['물', '💧', LQ, 2, [48, 120, 230], 0, '흐르고 불을 꺼요'];
MATS[WALL] = ['벽', '🧱', ST, 9, [120, 120, 132], 0, '움직이지 않는 벽'];
MATS[FIRE] = ['불', '🔥', GS, 0, [255, 120, 30], 0, '가연물을 태워요'];
MATS[PLANT] = ['식물', '🌿', ST, 9, [60, 180, 70], 0.05, '물을 먹고 자라요'];
MATS[WOOD] = ['나무', '🪵', ST, 9, [140, 92, 50], 0.012, '천천히 타서 재가 돼요'];
MATS[OIL] = ['기름', '🛢️', LQ, 1, [90, 60, 40], 0.4, '물에 뜨고 잘 타요'];
MATS[LAVA] = ['용암', '🌋', LQ, 4, [255, 80, 20], 0, '뜨거운 액체. 물을 만나면…'];
MATS[STONE] = ['돌', '🪨', PW, 7, [110, 104, 100], 0, '무거운 돌'];
MATS[STEAM] = ['증기', '♨️', GS, 0, [210, 220, 235], 0, '위로 올라가 식으면 비'];
MATS[SMOKE] = ['연기', '💨', GS, 0, [80, 80, 86], 0, '곧 사라져요'];
MATS[ICE] = ['얼음', '🧊', ST, 9, [170, 220, 250], 0, '물을 얼리고 열에 녹아요'];
MATS[ACID] = ['산', '🧪', LQ, 2, [140, 255, 60], 0, '대부분을 녹여요'];
MATS[POWDER] = ['화약', '💥', PW, 5, [60, 60, 60], 1, '불이 닿으면 폭발!'];
MATS[SEED] = ['씨앗', '🌱', PW, 5, [200, 160, 60], 0.1, '흙 위에서 물을 주면 자라요'];
MATS[GLASS] = ['유리', '🔷', ST, 9, [190, 230, 240], 0, '투명한 벽'];
MATS[ASH] = ['재', '⚱️', PW, 4, [150, 145, 140], 0, '타고 남은 가벼운 가루'];
MATS[CLONE] = ['생성기', '♾️', ST, 9, [200, 60, 200], 0, '닿은 물질을 계속 만들어요'];
MATS[FLOWER] = ['꽃', '🌸', ST, 9, [255, 120, 190], 0.08, '아름다운 꽃'];
MATS[SALT] = ['소금', '🧂', PW, 5, [240, 240, 240], 0, '얼음을 녹이고 물에 녹아요'];
const DISC = [
  ['steam', '증기', '물에 불을 대면?'], ['sink', '가라앉는 모래', '모래를 물 위에 부어 보자'], ['grow', '식물 성장', '식물에 물을 주자'],
  ['ash', '재', '나무를 태워 보자'], ['rain', '비', '증기가 위에서 식으면…'], ['float', '기름 뜨기', '기름 위로 물을 부어 보자'],
  ['oilfire', '기름 화재', '기름에 불을!'], ['stone', '돌', '용암에 물을 부어 보자'], ['glass', '유리', '용암이 모래를 만나면?'],
  ['melt', '해빙', '얼음을 데워 보자'], ['freeze', '결빙', '얼음 옆에 물을 두자'], ['sprout', '발아', '모래 위 씨앗에 물을'],
  ['flower', '개화', '씨앗이 끝까지 자라면?'], ['boom', '폭발', '화약에 불을 붙이면…'], ['acid', '부식', '산은 무엇이든 녹인다'],
  ['salt', '녹는 소금', '소금을 물이나 얼음에'], ['clone', '복제', '생성기에 물질을 닿게 하자'],
];
const PAL = [
  { t: SAND }, { t: WATER }, { t: WALL }, { t: FIRE }, { t: PLANT }, { t: WOOD }, { t: OIL, need: 1 }, { t: LAVA, need: 3 },
  { t: SEED, need: 4 }, { t: ICE, need: 5 }, { t: SALT, need: 6 }, { t: POWDER, need: 7 }, { t: ACID, need: 9 }, { t: CLONE, need: 11 },
  { t: STONE, disc: 'stone' }, { t: GLASS, disc: 'glass' }, { t: STEAM, disc: 'steam' }, { t: ERASE },
];
const KIND = new Uint8Array(32), DEN = new Uint8Array(32), FLAM = new Float32Array(32), COLS = new Uint32Array(32 * 4);
for (let t = 1; t < MATS.length; t++) {
  const m = MATS[t]; if (!m) continue;
  KIND[t] = m[2]; DEN[t] = m[3]; FLAM[t] = m[5];
  for (let k = 0; k < 4; k++) {
    const f = 0.82 + k * 0.08, al = t === WATER ? 215 : t === STEAM ? 120 : t === SMOKE ? 150 : t === GLASS ? 150 : t === ACID ? 220 : 255;
    const [r, gg, b] = m[4].map((v) => Math.min(255, Math.round(v * f)));
    COLS[t * 4 + k] = ((al << 24) | (b << 16) | (gg << 8) | r) >>> 0;
  }
}
const FIRECOL = [[255, 60, 20], [255, 120, 30], [255, 180, 40], [255, 230, 120]].map(([r, gg, b]) => ((255 << 24) | (b << 16) | (gg << 8) | r) >>> 0);
const FLOWCOL = [[255, 110, 180], [255, 220, 80], [180, 120, 255], [255, 90, 90]].map(([r, gg, b]) => ((255 << 24) | (b << 16) | (gg << 8) | r) >>> 0);
let OFF = null, OCTX = null, IMG = null, BUF = null;

GAME({
  title: '모래 시뮬', w: 960, h: 600, bg: '#0c1220', controls: 'none', noRKey: true, noAutoPause: true,
  help: '마우스 드래그로 그리기 · 오른쪽 패널에서 재료 선택\n1~9·0 재료 선택 · Q/E 이전/다음 · ↑↓ 붓 크기 · Space 일시정지 · X 지우개 · C 비우기\n물질끼리의 반응을 발견하면 새 재료가 해금돼요! 📖 도감에서 힌트 확인\n💾 저장 / 📂 불러오기로 작품을 보관',
  init(g) {
    if (!OFF) {
      OFF = document.createElement('canvas'); OFF.width = GW; OFF.height = GH; OCTX = OFF.getContext('2d');
      IMG = OCTX.createImageData(GW, GH); BUF = new Uint32Array(IMG.data.buffer);
    }
    const n = GW * GH;
    S = { T: new Uint8Array(n), A: new Uint8Array(n), C: new Uint8Array(n), M: new Uint8Array(n), stamp: 1, fc: 0,
      cur: SAND, brush: 4, paused: false, last: null, disc: new Set(g.load('disc', [])), toast: [], book: false,
      boomCd: 0, sndCd: 0, speed: 1, count: 0, hover: -1 };
    const T = S.T;
    for (let x = 0; x < GW; x++) { T[(GH - 1) * GW + x] = WALL; T[(GH - 2) * GW + x] = WALL; }
    for (let i = 0; i < n; i++) S.C[i] = (Math.random() * 4) | 0;
    scene('start');
    g.score = S.disc.size * 100;
  },
  update(g, dt) {
    S.boomCd -= dt; S.sndCd -= dt;
    for (const t of S.toast) t.t -= dt;
    S.toast = S.toast.filter((t) => t.t > 0);
    const m = g.mouse;
    if (S.book) { if (m.clicked || g.pressed('a') || g.pressed('b') || g.keyp('KeyB')) S.book = false; return; }
    // 키보드
    const un = unlockedList();
    for (let k = 0; k < 10; k++) if (g.keyp('Digit' + ((k + 1) % 10))) { if (un[k] !== undefined) S.cur = un[k]; g.sfx.click(); }
    if (g.keyp('KeyQ') || g.keyp('KeyE')) {
      let ix = un.indexOf(S.cur); ix = (ix + (g.keyp('KeyE') ? 1 : -1) + un.length) % un.length; S.cur = un[ix]; g.sfx.click();
    }
    if (g.pressed('up')) S.brush = Math.min(14, S.brush + 1);
    if (g.pressed('down')) S.brush = Math.max(1, S.brush - 1);
    if (g.pressed('a')) S.paused = !S.paused;
    if (g.pressed('b')) S.cur = S.cur === ERASE ? SAND : ERASE;
    if (g.keyp('KeyC')) clearAll();
    if (g.keyp('KeyB')) S.book = true;
    // 패널 클릭
    if (m.clicked && m.x >= PX) panelClick(g, m.x, m.y);
    // 그리기
    if (m.down && m.x < PX) {
      const cx = Math.floor(m.x / CS), cy = Math.floor(m.y / CS);
      if (S.last) {
        const dx = cx - S.last[0], dy = cy - S.last[1], n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / Math.max(1, S.brush * 0.5)));
        for (let k = 1; k <= n; k++) paint(Math.round(S.last[0] + (dx * k) / n), Math.round(S.last[1] + (dy * k) / n));
      } else paint(cx, cy);
      S.last = [cx, cy];
      if (S.sndCd <= 0) { S.sndCd = 0.09; g.sfx.tone(S.cur === ERASE ? 300 : 500 + Math.random() * 300, 0.03, 'triangle', 0.015); }
    } else S.last = null;
    S.hover = m.x < PX ? Math.floor(m.y / CS) * GW + Math.floor(m.x / CS) : -1;
    if (!S.paused) for (let k = 0; k < S.speed; k++) step(g);
    g.info = `발견 ${S.disc.size}/${DISC.length} · ${S.cur === ERASE ? '지우개' : MATS[S.cur][0]} · 붓 ${S.brush}${S.paused ? ' · ⏸' : ''}`;
  },
  draw(g, c) {
    const gr = c.createLinearGradient(0, 0, 0, g.H);
    gr.addColorStop(0, '#14213d'); gr.addColorStop(1, '#0b0f1a');
    c.fillStyle = gr; c.fillRect(0, 0, PX, g.H);
    render();
    c.imageSmoothingEnabled = false;
    c.drawImage(OFF, 0, 0, PX, GH * CS);
    c.imageSmoothingEnabled = true;
    // 붓 미리보기
    if (g.mouse.x < PX && g.mouse.y < g.H) {
      g.ring(g.mouse.x, g.mouse.y, S.brush * CS, S.cur === ERASE ? 'rgba(255,90,90,.8)' : 'rgba(255,255,255,.55)', 1.5);
      if (S.hover >= 0 && S.T[S.hover]) g.text(MATS[S.T[S.hover]][0], g.mouse.x + 14, g.mouse.y - 16, 13, '#e2e8f0', 'left');
    }
    if (S.paused) { g.rrect(PX / 2 - 70, 16, 140, 34, 10, 'rgba(0,0,0,.6)'); g.text('⏸ 일시정지', PX / 2, 33, 18, '#fde68a'); }
    drawPanel(g, c);
    // 토스트
    S.toast.forEach((t, k) => {
      const y = 70 + k * 46, a = Math.min(1, t.t);
      c.globalAlpha = a;
      g.rrect(PX / 2 - 190, y - 20, 380, 40, 12, 'rgba(20,30,60,.92)', '#fde047', 2);
      g.text(t.s, PX / 2, y, 18, '#fde047');
      c.globalAlpha = 1;
    });
    if (S.book) drawBook(g);
  },
});

function unlockedList() {
  const r = [];
  for (const p of PAL) if (isUnlocked(p)) r.push(p.t);
  return r;
}
function isUnlocked(p) {
  if (p.disc) return S.disc.has(p.disc);
  return !p.need || S.disc.size >= p.need;
}
function discover(key) {
  if (S.disc.has(key)) return;
  const before = unlockedList().length;
  S.disc.add(key);
  const d = DISC.find((x) => x[0] === key);
  const gg = window.__game;
  gg.save('disc', [...S.disc]);
  gg.score = S.disc.size * 100 + (S.disc.size === DISC.length ? 1000 : 0);
  S.toast.push({ s: `✨ 발견! ${d[1]}  (+100)`, t: 3.5 });
  gg.sfx.power();
  if (unlockedList().length > before) {
    const newly = PAL.filter((p) => isUnlocked(p) && (p.need === S.disc.size || p.disc === key)).map((p) => MATS[p.t][0]);
    if (newly.length) S.toast.push({ s: `🔓 새 재료: ${newly.join(', ')}`, t: 4 });
  }
  if (S.disc.size === DISC.length) S.toast.push({ s: '🏆 모든 반응을 발견했어요! (+1000)', t: 5 });
  gg.burst(PX / 2, 70, ['#fde047', '#f472b6', '#60a5fa'], 30, 260, 0.9, 4);
}
function initA(t) {
  if (t === FIRE) return 20 + ((Math.random() * 30) | 0);
  if (t === STEAM) return 90 + ((Math.random() * 120) | 0);
  if (t === SMOKE) return 40 + ((Math.random() * 60) | 0);
  return 0;
}
function put(i, t) { S.T[i] = t; S.A[i] = initA(t); S.C[i] = (Math.random() * 4) | 0; }
function paint(cx, cy) {
  const r = S.brush, t = S.cur, T = S.T;
  const dense = t === ERASE || KIND[t] === ST;
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (dx * dx + dy * dy > r * r + 1) continue;
    const x = cx + dx, y = cy + dy;
    if (x < 0 || x >= GW || y < 0 || y >= GH - 2) continue;
    const i = y * GW + x;
    if (t === ERASE) { T[i] = E; S.A[i] = 0; continue; }
    if (T[i] !== E && !(dense && T[i] !== t)) continue;
    if (!dense && Math.random() > 0.45) continue;
    put(i, t);
  }
}
function clearAll() {
  const T = S.T;
  for (let i = 0; i < GW * (GH - 2); i++) { T[i] = E; S.A[i] = 0; }
}
function canDisp(src, dst) { return dst === E || ((KIND[dst] === LQ || KIND[dst] === GS) && DEN[dst] < DEN[src]); }
function mv(i, j, st) {
  const T = S.T, A = S.A, C = S.C;
  const t = T[j], a = A[j], c = C[j];
  if (T[i] === SAND && t === WATER) discover('sink');
  else if (T[i] === WATER && t === OIL) discover('float');
  T[j] = T[i]; A[j] = A[i]; C[j] = C[i]; S.M[j] = st;
  T[i] = t; A[i] = a; C[i] = c; S.M[i] = st;
}
function nbr(i, x, y, d) {
  if (d === 0) return y > 0 ? i - GW : -1;
  if (d === 1) return y < GH - 1 ? i + GW : -1;
  if (d === 2) return x > 0 ? i - 1 : -1;
  return x < GW - 1 ? i + 1 : -1;
}
function powder(i, x, y, t, st, diag) {
  if (y >= GH - 1) return;
  const j = i + GW;
  if (canDisp(t, S.T[j])) return mv(i, j, st);
  if (!diag) return;
  const s = Math.random() < 0.5 ? -1 : 1;
  if (x + s >= 0 && x + s < GW && canDisp(t, S.T[j + s])) return mv(i, j + s, st);
  if (x - s >= 0 && x - s < GW && canDisp(t, S.T[j - s])) return mv(i, j - s, st);
}
function liquid(i, x, y, t, st, spread) {
  const T = S.T;
  if (y < GH - 1) {
    const j = i + GW;
    if (canDisp(t, T[j])) return mv(i, j, st);
    const s = Math.random() < 0.5 ? -1 : 1;
    if (x + s >= 0 && x + s < GW && canDisp(t, T[j + s])) return mv(i, j + s, st);
    if (x - s >= 0 && x - s < GW && canDisp(t, T[j - s])) return mv(i, j - s, st);
  }
  const s = Math.random() < 0.5 ? -1 : 1;
  for (let pass = 0; pass < 2; pass++) {
    const dir = pass ? -s : s;
    let best = -1;
    for (let n = 1; n <= spread; n++) {
      const nx = x + dir * n;
      if (nx < 0 || nx >= GW) break;
      const j = i + dir * n;
      if (T[j] === E) best = j;
      else if (canDisp(t, T[j])) { best = j; break; }
      else break;
    }
    if (best >= 0) return mv(i, best, st);
  }
}
function gas(i, x, y, t, st) {
  const T = S.T;
  const s = Math.random() < 0.5 ? -1 : 1;
  if (y > 0) {
    const j = i - GW;
    const up = T[j];
    if (up === E || (KIND[up] === LQ && Math.random() < 0.4)) return mv(i, j, st);
    if (x + s >= 0 && x + s < GW && T[j + s] === E) return mv(i, j + s, st);
  }
  if (x + s >= 0 && x + s < GW && T[i + s] === E && Math.random() < 0.6) return mv(i, i + s, st);
}
function ignite(j, tt) {
  const T = S.T, A = S.A;
  if (tt === OIL) discover('oilfire');
  T[j] = FIRE;
  if (tt === WOOD) A[j] = 128 | 64 | (40 + ((Math.random() * 23) | 0));
  else if (tt === PLANT || tt === FLOWER) A[j] = 128 | 64 | (15 + ((Math.random() * 20) | 0));
  else if (tt === OIL) A[j] = 20 + ((Math.random() * 25) | 0);
  else A[j] = 15 + ((Math.random() * 20) | 0);
}
function explode(cx, cy, r) {
  const T = S.T, A = S.A;
  discover('boom');
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (dx * dx + dy * dy > r * r) continue;
    const x = cx + dx, y = cy + dy;
    if (x < 0 || x >= GW || y < 0 || y >= GH - 2) continue;
    const i = y * GW + x, tt = T[i];
    if (tt === WALL || tt === CLONE) continue;
    if (tt === POWDER) { T[i] = FIRE; A[i] = 4 + ((Math.random() * 6) | 0); continue; }
    if (Math.random() < 0.55) { T[i] = FIRE; A[i] = 6 + ((Math.random() * 18) | 0); } else if (tt !== WATER) { T[i] = Math.random() < 0.5 ? SMOKE : E; A[i] = 40; }
  }
  const g = window.__game;
  if (S.boomCd <= 0) {
    S.boomCd = 0.12;
    g.sfx.explode(); g.shake(7, 0.25);
    g.burst(cx * CS, cy * CS, ['#fb923c', '#fde047', '#ef4444'], 16, 260, 0.6, 4);
  }
}
function step(g) {
  const st = (S.stamp = S.stamp === 1 ? 2 : 1);
  S.fc++;
  const T = S.T, A = S.A, M = S.M;
  let cnt = 0;
  for (let y = GH - 1; y >= 0; y--) {
    const ltr = ((y + S.fc) & 1) === 0;
    for (let k = 0; k < GW; k++) {
      const x = ltr ? k : GW - 1 - k, i = y * GW + x, t = T[i];
      if (t === E) continue;
      cnt++;
      if (M[i] === st) continue;
      const R = Math.random();
      switch (t) {
        case SAND: powder(i, x, y, t, st, true); break;
        case POWDER: powder(i, x, y, t, st, true); break;
        case STONE: powder(i, x, y, t, st, false); break;
        case ASH: if (R < 0.6) powder(i, x, y, t, st, true); break;
        case SALT: {
          const j = nbr(i, x, y, (R * 4) | 0);
          if (j >= 0 && T[j] === WATER && Math.random() < 0.02) { T[i] = WATER; A[i] = 0; discover('salt'); break; }
          if (j >= 0 && T[j] === ICE && Math.random() < 0.08) { T[j] = WATER; discover('salt'); discover('melt'); }
          powder(i, x, y, t, st, true); break;
        }
        case WATER: liquid(i, x, y, t, st, 5); break;
        case OIL: liquid(i, x, y, t, st, 3); break;
        case ACID: {
          const j = nbr(i, x, y, (R * 4) | 0);
          if (j >= 0) {
            const tt = T[j];
            if (tt !== E && tt !== WALL && tt !== GLASS && tt !== ACID && tt !== CLONE && tt !== WATER && Math.random() < 0.12) {
              T[j] = Math.random() < 0.3 ? SMOKE : E; A[j] = 40; discover('acid');
              if (Math.random() < 0.25) { T[i] = E; break; }
            }
          }
          liquid(i, x, y, t, st, 3); break;
        }
        case LAVA: {
          const j = nbr(i, x, y, (R * 4) | 0);
          if (j >= 0) {
            const tt = T[j];
            if (tt === WATER) { T[i] = STONE; A[i] = 0; T[j] = STEAM; A[j] = initA(STEAM); discover('stone'); discover('steam'); break; }
            if (tt === SAND && Math.random() < 0.06) { T[j] = GLASS; discover('glass'); }
            else if (tt === ICE) { T[j] = WATER; discover('melt'); }
            else if (tt === POWDER) { explode(j % GW, (j / GW) | 0, 5); break; }
            else if (FLAM[tt] > 0 && Math.random() < 0.3) ignite(j, tt);
          }
          if (y > 0 && T[i - GW] === E && Math.random() < 0.004) { T[i - GW] = FIRE; A[i - GW] = 8; }
          if (Math.random() < 0.45) liquid(i, x, y, t, st, 1);
          break;
        }
        case FIRE: {
          let a = A[i], life = a & 63;
          const anchored = a & 64, ash = a & 128;
          if (!anchored || Math.random() < 0.35) life -= 1;
          if (life <= 0) {
            if (ash && Math.random() < 0.45) { T[i] = ASH; A[i] = 0; discover('ash'); }
            else if (Math.random() < 0.25) { T[i] = SMOKE; A[i] = initA(SMOKE); } else { T[i] = E; A[i] = 0; }
            break;
          }
          A[i] = ash | anchored | life;
          let out = false;
          for (let d = 0; d < 4; d++) {
            const j = nbr(i, x, y, d);
            if (j < 0) continue;
            const tt = T[j];
            if (tt === WATER) { T[j] = STEAM; A[j] = initA(STEAM); T[i] = E; discover('steam'); out = true; break; }
            if (tt === ICE) { if (Math.random() < 0.06) { T[j] = WATER; discover('melt'); } continue; }
            if (tt === POWDER) { explode(j % GW, (j / GW) | 0, 5); out = true; break; }
            if (FLAM[tt] > 0 && Math.random() < FLAM[tt]) ignite(j, tt);
          }
          if (out) break;
          if (!anchored && Math.random() < 0.7) gas(i, x, y, t, st);
          break;
        }
        case STEAM: {
          if (--A[i] <= 0) { if (Math.random() < 0.4) { T[i] = WATER; discover('rain'); } else T[i] = E; break; }
          if (y < 6 && Math.random() < 0.01) { T[i] = WATER; A[i] = 0; discover('rain'); break; }
          gas(i, x, y, t, st); break;
        }
        case SMOKE: {
          if (--A[i] <= 0) { T[i] = E; break; }
          if (Math.random() < 0.7) gas(i, x, y, t, st); break;
        }
        case PLANT: {
          const j = nbr(i, x, y, (R * 4) | 0);
          if (j >= 0 && T[j] === WATER && Math.random() < 0.05) { T[j] = PLANT; S.C[j] = (Math.random() * 4) | 0; discover('grow'); }
          break;
        }
        case ICE: {
          const j = nbr(i, x, y, (R * 4) | 0);
          if (j >= 0 && T[j] === WATER && Math.random() < 0.006) { T[j] = ICE; discover('freeze'); }
          break;
        }
        case SEED: {
          if (A[i] > 0) { growSeed(i, x, y, st); break; }
          const below = y < GH - 1 ? T[i + GW] : WALL;
          if (canDisp(SEED, below)) { powder(i, x, y, t, st, true); break; }
          if (below === SAND || below === ASH || below === PLANT || below === STONE) {
            let wj = -1;
            for (let d = 0; d < 4; d++) { const j = nbr(i, x, y, d); if (j >= 0 && T[j] === WATER) { wj = j; break; } }
            if (wj >= 0 || (below === ASH && Math.random() < 0.002)) {
              if (wj >= 0) T[wj] = E;
              A[i] = 12 + ((Math.random() * 22) | 0); discover('sprout');
            }
          } else powder(i, x, y, t, st, true);
          break;
        }
        case CLONE: {
          if (A[i] === 0) {
            for (let d = 0; d < 4; d++) { const j = nbr(i, x, y, d); if (j >= 0) { const tt = T[j]; if (tt !== E && tt !== CLONE && tt !== WALL) { A[i] = tt; break; } } }
          } else if (Math.random() < 0.3) {
            const j = nbr(i, x, y, (R * 4) | 0);
            if (j >= 0 && T[j] === E) { put(j, A[i]); M[j] = st; discover('clone'); }
          }
          break;
        }
      }
    }
  }
  S.count = cnt;
}
function growSeed(i, x, y, st) {
  const T = S.T, A = S.A;
  if (Math.random() > 0.12) return;
  const h = A[i];
  const up = y > 0 ? i - GW : -1;
  if (h <= 1 || up < 0 || !(T[up] === E || T[up] === WATER)) {
    T[i] = FLOWER; A[i] = 0;
    for (let d = 0; d < 4; d++) { const j = nbr(i, x, y, d); if (j >= 0 && T[j] === E) { T[j] = FLOWER; S.C[j] = S.C[i]; } }
    if (up >= 0 && up >= GW && T[up] === FLOWER && T[up - GW] === E) T[up - GW] = FLOWER;
    discover('flower');
    return;
  }
  T[up] = SEED; A[up] = h - 1; S.C[up] = S.C[i]; S.M[up] = st;
  T[i] = PLANT; A[i] = 0;
  if (Math.random() < 0.18) { const s = Math.random() < 0.5 ? -1 : 1; if (x + s >= 0 && x + s < GW && T[i + s] === E) T[i + s] = PLANT; }
}
function render() {
  const T = S.T, C = S.C, A = S.A, n = GW * GH;
  for (let i = 0; i < n; i++) {
    const t = T[i];
    if (t === E) { BUF[i] = 0; continue; }
    if (t === FIRE) BUF[i] = FIRECOL[(Math.random() * 4) | 0];
    else if (t === FLOWER) BUF[i] = FLOWCOL[C[i]];
    else if (t === LAVA) BUF[i] = COLS[t * 4 + ((C[i] + ((S.fc >> 3) + i)) & 3)];
    else if (t === SEED && A[i] > 0) BUF[i] = COLS[PLANT * 4 + 3];
    else if (t === WATER) BUF[i] = COLS[t * 4 + ((C[i] + ((S.fc + i * 7) >> 4)) & 3)];
    else BUF[i] = COLS[t * 4 + C[i]];
  }
  OCTX.putImageData(IMG, 0, 0);
}
// ---------- 패널 ----------
const BTN = { w: 74, h: 28 };
function panelLayout() {
  const L = [];
  PAL.forEach((p, k) => L.push({ p, x: PX + 6 + (k % 2) * 76, y: 26 + Math.floor(k / 2) * 31 }));
  return L;
}
function panelClick(g, mx, my) {
  for (const b of panelLayout()) if (g.inRect(b.x, b.y, BTN.w, BTN.h)) {
    if (isUnlocked(b.p)) { S.cur = b.p.t; g.sfx.click(); } else { g.sfx.beep(200, 0.1); S.toast.push({ s: b.p.disc ? '🔒 반응으로 직접 만들어 발견하세요' : `🔒 발견 ${b.p.need}개 필요`, t: 2 }); }
    return;
  }
  if (g.inRect(PX + 50, 318, 26, 24)) S.brush = Math.max(1, S.brush - 1);
  if (g.inRect(PX + 112, 318, 26, 24)) S.brush = Math.min(14, S.brush + 1);
  if (g.inRect(PX + 6, 350, 74, 30)) S.paused = !S.paused;
  if (g.inRect(PX + 82, 350, 74, 30)) { clearAll(); g.sfx.drop(); }
  if (g.inRect(PX + 6, 385, 74, 30)) saveWorld(g);
  if (g.inRect(PX + 82, 385, 74, 30)) loadWorld(g);
  if (g.inRect(PX + 6, 420, 150, 30)) { S.book = true; g.sfx.click(); }
  ['volcano', 'island', 'lab'].forEach((k, ix) => { if (g.inRect(PX + 6 + ix * 51, 476, 48, 30)) { scene(k); g.sfx.pop(); } });
  if (g.inRect(PX + 6, 512, 150, 24)) { S.speed = S.speed === 1 ? 2 : 1; g.sfx.click(); }
}
function drawPanel(g, c) {
  g.rect(PX, 0, 160, g.H, '#111827');
  g.line(PX, 0, PX, g.H, '#334155', 2);
  g.text('재료', PX + 80, 13, 14, '#94a3b8');
  for (const b of panelLayout()) {
    const t = b.p.t, un = isUnlocked(b.p), sel = S.cur === t;
    g.rrect(b.x, b.y, BTN.w, BTN.h, 6, sel ? '#334155' : '#1e293b', sel ? '#fde047' : 'rgba(255,255,255,.12)', sel ? 2 : 1);
    if (!un) { g.text('🔒 ' + (b.p.need || '?'), b.x + BTN.w / 2, b.y + BTN.h / 2, 12, '#64748b'); continue; }
    if (t === ERASE) { g.text('🧽 지우개', b.x + BTN.w / 2, b.y + BTN.h / 2, 12, '#fca5a5'); continue; }
    const m = MATS[t], col = m[4];
    g.rect(b.x + 5, b.y + 7, 14, 14, `rgb(${col[0]},${col[1]},${col[2]})`);
    g.text(m[0], b.x + 24, b.y + BTN.h / 2 + 1, 12, '#e2e8f0', 'left');
  }
  g.text('붓', PX + 26, 330, 13, '#94a3b8');
  g.button(PX + 50, 318, 26, 24, '−', '#1e293b', 16); g.text(String(S.brush), PX + 94, 330, 16, '#fff'); g.button(PX + 112, 318, 26, 24, '+', '#1e293b', 16);
  g.button(PX + 6, 350, 74, 30, S.paused ? '▶ 재생' : '⏸ 정지', '#1e3a5f', 13);
  g.button(PX + 82, 350, 74, 30, '🗑 비우기', '#3f1d1d', 13);
  g.button(PX + 6, 385, 74, 30, '💾 저장', '#1f3b2c', 13);
  g.button(PX + 82, 385, 74, 30, '📂 불러오기', '#1f3b2c', 12);
  g.button(PX + 6, 420, 150, 30, `📖 발견 도감 ${S.disc.size}/${DISC.length}`, '#3b2f63', 13);
  g.text('장면', PX + 80, 463, 12, '#94a3b8');
  [['🌋', 'volcano'], ['🏝️', 'island'], ['🧪', 'lab']].forEach(([e], ix) => { g.button(PX + 6 + ix * 51, 476, 48, 30, '', '#1e293b'); g.emoji(e, PX + 30 + ix * 51, 491, 20); });
  g.button(PX + 6, 512, 150, 24, `속도 x${S.speed}`, '#1e293b', 12);
  const p = S.disc.size / DISC.length;
  g.rect(PX + 8, 546, 144, 8, '#1e293b'); g.rect(PX + 8, 546, 144 * p, 8, '#fde047');
  if (S.cur !== ERASE) { const m = MATS[S.cur]; g.text(m[1] + ' ' + m[0], PX + 80, 568, 13, '#fff'); g.text(m[6], PX + 80, 586, 10, '#94a3b8'); }
  else g.text('🧽 지우개 (X 전환)', PX + 80, 576, 12, '#fca5a5');
}
function drawBook(g) {
  g.rect(0, 0, g.W, g.H, 'rgba(0,0,0,.7)');
  g.rrect(90, 40, 780, 520, 16, '#111827', '#fde047', 2);
  g.text(`📖 발견 도감  ${S.disc.size} / ${DISC.length}`, 480, 74, 26, '#fde047');
  DISC.forEach(([k, n, h], ix) => {
    const x = 120 + (ix % 2) * 370, y = 112 + Math.floor(ix / 2) * 48, got = S.disc.has(k);
    g.rrect(x, y, 350, 40, 8, got ? '#1f3b2c' : '#1e293b');
    g.text(got ? '✅ ' + n : '❔ ???', x + 14, y + 13, 15, got ? '#bbf7d0' : '#94a3b8', 'left');
    g.text('힌트: ' + h, x + 14, y + 30, 11, got ? '#86efac' : '#64748b', 'left');
  });
  g.text('클릭하면 닫기', 480, 540, 14, '#94a3b8');
}
// ---------- 저장 / 장면 ----------
function saveWorld(g) {
  const T = S.T; let out = '', prev = -1, run = 0;
  for (let i = 0; i < GW * GH; i++) {
    const t = T[i] === SEED && S.A[i] > 0 ? PLANT : T[i];
    if (t === prev && run < 4000) run++;
    else { if (prev >= 0) out += prev.toString(36) + '.' + run.toString(36) + ','; prev = t; run = 1; }
  }
  out += prev.toString(36) + '.' + run.toString(36);
  g.save('world', out);
  S.toast.push({ s: '💾 작품을 저장했어요', t: 2 }); g.sfx.coin();
}
function loadWorld(g) {
  const s = g.load('world', null);
  if (!s) { S.toast.push({ s: '저장된 작품이 없어요', t: 2 }); g.sfx.beep(200, 0.1); return; }
  let i = 0;
  for (const part of s.split(',')) {
    const [t, r] = part.split('.').map((v) => parseInt(v, 36));
    for (let k = 0; k < r && i < GW * GH; k++, i++) { S.T[i] = t; S.A[i] = initA(t); }
  }
  S.toast.push({ s: '📂 작품을 불러왔어요', t: 2 }); g.sfx.coin();
}
function fillRect(x0, y0, w, h, t, p = 1) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (x >= 0 && x < GW && y >= 0 && y < GH - 2 && Math.random() < p) put(y * GW + x, t);
}
function scene(k) {
  clearAll();
  const T = S.T;
  if (k === 'start') {
    for (let x = 0; x < GW; x++) { const h = 8 + Math.round(Math.sin(x / 17) * 4 + Math.sin(x / 7) * 2); fillRect(x, GH - 2 - h, 1, h, SAND); }
    fillRect(120, 70, 40, 3, WALL); fillRect(126, 40, 28, 30, WATER, 0.8);
    fillRect(40, 118, 3, 20, WOOD); fillRect(34, 112, 15, 6, PLANT);
  } else if (k === 'volcano') {
    for (let x = 0; x < GW; x++) { const d = Math.abs(x - 100), h = Math.max(6, 70 - d * 0.9); fillRect(x, GH - 2 - Math.round(h), 1, Math.round(h), d < 6 ? LAVA : STONE); }
    fillRect(97, 76, 6, 4, LAVA); fillRect(0, 120, 30, 28, WATER, 0.9); fillRect(170, 120, 30, 28, WATER, 0.9);
    for (let x = 20; x < 60; x += 8) { fillRect(x, 100 - (x - 20) * 0.4, 2, 10, WOOD); fillRect(x - 3, 96 - (x - 20) * 0.4, 8, 4, PLANT); }
  } else if (k === 'island') {
    fillRect(0, 105, GW, 43, WATER, 0.95);
    for (let x = 60; x < 140; x++) { const h = 30 - Math.abs(x - 100) * 0.7; fillRect(x, 148 - Math.round(h) - 18, 1, Math.round(h) + 18, SAND); }
    fillRect(98, 92, 3, 22, WOOD); fillRect(90, 88, 19, 5, PLANT);
    fillRect(70, 40, 60, 2, WALL); fillRect(72, 20, 56, 20, STEAM, 0.5);
    for (let x = 75; x < 125; x += 9) T[((132 - Math.abs(x - 100) * 0.7 - 20) | 0) * GW + x] = SEED;
  } else if (k === 'lab') {
    fillRect(10, 140, 180, 1, GLASS);
    for (let k2 = 0; k2 < 4; k2++) { const x = 15 + k2 * 47; fillRect(x, 90, 2, 50, GLASS); fillRect(x + 38, 90, 2, 50, GLASS); fillRect(x, 139, 40, 1, GLASS); }
    fillRect(17, 100, 36, 39, WATER, 0.9); fillRect(64, 100, 36, 39, OIL, 0.9); fillRect(111, 115, 36, 24, POWDER, 0.9); fillRect(158, 105, 36, 34, ACID, 0.9);
    fillRect(60, 30, 80, 3, WALL); fillRect(98, 33, 4, 2, CLONE);
  }
}
