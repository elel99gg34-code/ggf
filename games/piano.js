let S;
const LW = 130, TH = 200;
const SONG = [64, 62, 60, 62, 64, 64, 64, 62, 62, 62, 64, 67, 67, 64, 62, 60, 62, 64, 64, 64, 62, 62, 64, 62, 60, 60, 62, 64, 65, 67, 67, 65, 64, 62, 60, 62, 64, 60, 67, 65, 64, 62, 60, 72, 71, 69, 67, 65, 64, 62, 60];
GAME({
  title: '피아노 타일', w: 520, h: 860, bg: '#fff', controls: 'none', typing: true,
  help: '검은 타일만 순서대로 탭! (D F J K 키도 가능)\n흰 칸을 누르거나 검은 타일을 놓치면 게임 오버\n누를 때마다 멜로디가 연주돼요 🎶\n점점 빨라집니다',
  init(g) { S = { rows: [], speed: 380, y: 0, n: 0, started: false, note: 0, dead: false, flash: null }; for (let i = 0; i < 6; i++) addRow(); },
  update(g, dt) {
    if (S.dead) return;
    if (S.started) { S.speed += dt * 9; S.y += S.speed * dt; }
    let lane = -1;
    ['KeyD', 'KeyF', 'KeyJ', 'KeyK'].forEach((k, i) => { if (g.keyp(k)) lane = i; });
    if (g.mouse.clicked) lane = Math.floor(g.mouse.x / LW);
    if (lane >= 0) {
      const next = S.rows.find((r) => !r.hit);
      const ry = rowY(next);
      if (next && next.lane === lane && (!S.started || ry > -TH)) { next.hit = true; S.started = true; S.n++; g.score = S.n; const f = 440 * Math.pow(2, (SONG[S.note++ % SONG.length] - 69) / 12); g.sfx.tone(f, 0.35, 'triangle', 0.12); g.sfx.tone(f * 2, 0.2, 'sine', 0.03); }
      else { S.flash = { lane, row: next }; return die(g, '틀린 칸!'); }
    }
    const first = S.rows.find((r) => !r.hit);
    if (first && rowY(first) > g.H) { S.flash = { lane: first.lane, row: first, miss: true }; S.y -= TH * 0.8; return die(g, '타일을 놓쳤다!'); }
    while (S.rows.length && rowY(S.rows[0]) > g.H + TH) S.rows.shift();
    while (rowY(S.rows[S.rows.length - 1]) > -TH) addRow();
    g.info = `${(S.speed / TH).toFixed(1)} 타일/초`;
  },
  draw(g, c) {
    for (let i = 1; i < 4; i++) g.line(i * LW, 0, i * LW, g.H, '#e5e7eb', 2);
    for (const r of S.rows) {
      const y = rowY(r);
      if (y > g.H || y + TH < 0) continue;
      g.rect(r.lane * LW + 1, y + 1, LW - 2, TH - 2, r.hit ? '#cbd5e1' : '#111827');
      if (!r.hit && r === S.rows.find((q) => !q.hit) && !S.started) g.text('시작', r.lane * LW + LW / 2, y + TH / 2, 26, '#fff');
      g.line(0, y + TH, g.W, y + TH, '#f1f5f9', 1);
    }
    if (S.flash) { const y = rowY(S.flash.row); c.globalAlpha = 0.5 + Math.sin(g.time * 20) * 0.4; g.rect(S.flash.lane * LW, S.flash.miss ? y : y, LW, TH, '#ef4444'); c.globalAlpha = 1; }
    g.text(S.n, g.W / 2, 60, 56, '#ef4444');
  },
});
function rowY(r) { return S.y + (r.idx === undefined ? 0 : (r.base - r.idx * TH)); }
function addRow() { const idx = S.rows.length ? S.rows[S.rows.length - 1].idx + 1 : 0; S.rows.push({ idx, base: 860 - TH * 1.5, lane: U.randi(0, 3), hit: false }); }
function die(g, msg) { S.dead = true; g.sfx.lose(); g.shake(10); g.later(() => g.over(`${msg} · ${S.n}타일`), 1); }
