let S;
const CATS = {
  '동물': ['ELEPHANT', 'GIRAFFE', 'PENGUIN', 'DOLPHIN', 'KANGAROO', 'CHEETAH', 'OCTOPUS', 'HAMSTER', 'PANTHER', 'TORTOISE', 'SQUIRREL', 'BUTTERFLY'],
  '음식': ['PANCAKE', 'SPAGHETTI', 'HAMBURGER', 'CHOCOLATE', 'AVOCADO', 'PINEAPPLE', 'SANDWICH', 'DUMPLING', 'BROCCOLI', 'KIMCHI', 'POPCORN', 'BISCUIT'],
  '나라': ['CANADA', 'BRAZIL', 'GERMANY', 'AUSTRALIA', 'MEXICO', 'NORWAY', 'THAILAND', 'PORTUGAL', 'ARGENTINA', 'VIETNAM', 'EGYPT', 'SWITZERLAND'],
  '직업': ['ASTRONAUT', 'DOCTOR', 'ENGINEER', 'TEACHER', 'FIREFIGHTER', 'MUSICIAN', 'SCIENTIST', 'DETECTIVE', 'ARCHITECT', 'PROGRAMMER', 'PHOTOGRAPHER'],
  '스포츠': ['BASEBALL', 'BASKETBALL', 'SWIMMING', 'VOLLEYBALL', 'BADMINTON', 'SKATEBOARD', 'GYMNASTICS', 'MARATHON', 'ARCHERY', 'TAEKWONDO', 'CYCLING'],
};
GAME({
  title: '행맨', w: 900, h: 700, bg: '#fefce8', controls: 'none', noRKey: true, typing: true,
  help: '알파벳을 키보드로 누르거나 화면 버튼을 클릭\n틀릴 때마다 그림이 그려져요 — 7번 틀리면 끝!\n카테고리 힌트를 활용하세요\n연속으로 맞힐수록 점수 UP',
  init(g) { S = { streak: 0 }; newWord(); },
  update(g, dt) {
    if (S.next > 0) { S.next -= dt; if (S.next <= 0) { if (S.lost) return g.over(`정답: ${S.word} · 연속 ${S.streak}개`); newWord(); } return; }
    let key = null;
    for (const code of g.typed) if (/^Key[A-Z]$/.test(code) && !S.used.has(code[3])) { key = code[3]; break; }
    if (g.mouse.clicked) [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].forEach((ch, i) => { const [x, y] = kpos(i); if (g.inRect(x, y, 56, 56)) key = ch; });
    if (key && !S.used.has(key)) {
      S.used.add(key);
      if (S.word.includes(key)) { g.sfx.coin(); g.add(10 * [...S.word].filter((c) => c === key).length); if ([...S.word].every((c) => !/[A-Z]/.test(c) || S.used.has(c))) { S.streak++; const pts = (7 - S.miss) * 50 + S.streak * 30; g.add(pts); g.sfx.win(); S.msg = `정답! +${pts}`; S.next = 2; } }
      else { S.miss++; g.sfx.hit(); g.shake(4); if (S.miss >= 7) { S.lost = true; S.msg = `정답: ${S.word}`; S.next = 2.2; g.sfx.lose(); } }
    }
    g.info = `연속 ${S.streak} · 실수 ${S.miss}/7`;
  },
  draw(g, c) {
    g.text(`카테고리: ${S.cat}`, 450, 40, 24, '#854d0e');
    const m = S.miss, col = '#422006';
    c.lineCap = 'round';
    g.line(100, 420, 300, 420, col, 6); g.line(150, 420, 150, 100, col, 6); g.line(150, 100, 260, 100, col, 6); g.line(260, 100, 260, 140, col, 3);
    if (m > 0) g.ring(260, 170, 30, col, 4);
    if (m > 1) g.line(260, 200, 260, 300, col, 4);
    if (m > 2) g.line(260, 230, 220, 270, col, 4);
    if (m > 3) g.line(260, 230, 300, 270, col, 4);
    if (m > 4) g.line(260, 300, 225, 360, col, 4);
    if (m > 5) g.line(260, 300, 295, 360, col, 4);
    if (m > 6) { g.text('✕ ✕', 260, 165, 14, '#dc2626'); }
    const n = S.word.length, w = Math.min(54, 520 / n);
    [...S.word].forEach((ch, i) => { const x = 360 + i * w; if (/[A-Z]/.test(ch)) g.line(x + 4, 300, x + w - 4, 300, col, 3); if (S.used.has(ch) || S.lost) g.text(ch, x + w / 2, 275, w * 0.75, S.used.has(ch) ? col : '#dc2626'); });
    [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].forEach((ch, i) => { const [x, y] = kpos(i), u = S.used.has(ch); g.rrect(x, y, 56, 56, 10, u ? (S.word.includes(ch) ? '#86efac' : '#fca5a5') : '#fde68a', '#a16207', 2); g.text(ch, x + 28, y + 30, 26, u ? '#57534e' : '#422006'); });
    if (S.msg) g.text(S.msg, 600, 380, 30, S.lost ? '#dc2626' : '#16a34a');
  },
});
function kpos(i) { const r = Math.floor(i / 9), k = i % 9; return [450 - (9 * 62) / 2 + k * 62 + (r === 2 ? 31 : 0), 470 + r * 66]; }
function newWord() { S.cat = U.choice(Object.keys(CATS)); S.word = U.choice(CATS[S.cat]); S.used = new Set(); S.miss = 0; S.next = 0; S.lost = false; S.msg = ''; }
