let S;
const WORDS = ('apple beach brain bread brick chair chess cloud crane dance dream drink eagle earth flame frost fruit ghost giant glass grape green heart horse house juice knife laugh lemon light lucky magic metal money mouse music night ocean olive paint party peace pearl phone piano pilot pizza plant plate power queen quiet radio raven river robot rocky royal salad sauce scale shark sheep shine shirt shoes skate skill sleep smile snake space spoon sport stack stone storm sugar sunny table tiger toast tooth tower train treat truck uncle unity urban vivid voice water whale wheel white world write young zebra angel alarm alert amber arrow audio award basic berry black blade blame blank blast blind block bloom board boost brave brush buddy cabin camel candy cargo carry catch cause chain chalk charm cheap check cheek chief child civil claim class clean clear climb clock close coach coast color coral count court cover crack craft crash cream crowd crown curve cycle daily dairy delta depth diary dirty dozen draft drama drawn dress drift drive early elbow empty enjoy enter equal error event exact extra fable faith false fancy feast fiber field fifth fight final flash fleet float floor flour fluid focus force forge frame fresh front gamer gauge giver globe glory glove grace grade grain grand grant grass gravy great greed grief guard guess guest guide habit happy harsh hello hobby honey honor hotel human humor ideal image index inner input irony ivory jelly jewel joint judge jumbo karma kayak kitty label labor large laser later layer learn leave level lever linen liver llama local logic loose lover lunar lunch magic major maker mango maple march marry match maybe mayor medal melon mercy merry minor mixer model moist month moral motor mount movie nerve never noble noise north novel nurse nylon occur offer often onion opera orbit order organ other otter outer owner panda panel paper pasta patch pause peach penny perky photo piece pinky pixel place plain planet plaza point polar porch pound press price pride prime print prize proof proud puppy purse quest quick quilt quote rainy ranch range rapid ratio reach ready realm relax reply rhyme ridge right rival roast robin rover rugby ruler rural saint sandy scarf scene scent scout seven shade shake shape share sharp shelf shell shift shock short shout sight silly since sixty skirt slice slide smart smoke snack sneak solar solid sound south spare spark speak speed spell spend spice spike spine spoil spray squad stage stair stamp stand start steak steam steel stick still storm story stove straw strip study style sugar sweet swing sword syrup taste teach teeth thank theme thick thing think thumb tiara title toast today topic torch total touch tough towel toxic trace track trade trail trend trial tribe trick tulip tuner twist ultra under upper upset usage usual valid value vapor video villa vinyl viola virus visit vital vocal wagon waist watch weird wheat whole widow width wings witch woman women worry worth wound yacht yield youth zesty').split(' ').filter((w) => w.length === 5);
const KB = ['QWERTYUIOP', 'ASDFGHJKL', '↵ZXCVBNM⌫'];
GAME({
  title: '워들', w: 620, h: 860, bg: '#121213', controls: 'none', noRKey: true, typing: true,
  help: '5글자 영어 단어를 키보드로 입력 후 Enter\n🟩 위치까지 정답 · 🟨 단어에 있지만 위치가 다름 · ⬛ 없음\n6번 안에 맞히세요! 연속으로 맞힐수록 보너스\n화면 키보드도 사용 가능',
  init(g) { S = { streak: 0, round: 0 }; newWord(); },
  update(g, dt) {
    S.shake = Math.max(0, S.shake - dt);
    S.flip = Math.min(5.5, S.flip + dt * 5);
    if (S.next > 0) { S.next -= dt; if (S.next <= 0) { if (S.lost) return g.over(`정답: ${S.ans.toUpperCase()} · 연속 ${S.streak}개`); newWord(); } return; }
    const keys = [];
    for (const code of g.typed) { if (/^Key[A-Z]$/.test(code)) keys.push(code[3]); else if (code === 'Enter' || code === 'NumpadEnter') keys.push('↵'); else if (code === 'Backspace') keys.push('⌫'); }
    if (g.mouse.clicked) KB.forEach((row, r) => [...row].forEach((ch, i) => { const [x, y, w, h] = keyRect(r, i, row.length); if (g.inRect(x, y, w, h)) keys.push(ch); }));
    for (const key of keys) { if (S.next > 0) break; handle(g, key); }
    g.info = `라운드 ${S.round} · 연속 ${S.streak}`;
  },
  draw(g, c) {
    g.text('WORDLE', 310, 40, 34, '#fff');
    const cs = 74, ox = 310 - (cs * 5 + 8 * 4) / 2, oy = 80;
    for (let r = 0; r < 6; r++) for (let i = 0; i < 5; i++) {
      const done = r < S.rows.length, row = S.rows[r], ch = done ? row.w[i] : r === S.rows.length ? S.cur[i] : '';
      let x = ox + i * (cs + 8), y = oy + r * (cs + 8);
      if (r === S.rows.length && S.shake > 0) x += Math.sin(S.shake * 60) * 8;
      let col = '#121213', border = ch ? '#565758' : '#3a3a3c';
      const flipped = done && (r < S.rows.length - 1 || S.flip > i + 0.5);
      if (flipped) { col = ['#3a3a3c', '#b59f3b', '#538d4e'][row.s[i]]; border = col; }
      g.rect(x, y, cs, cs, col); g.stroke(x + 1, y + 1, cs - 2, cs - 2, border, 2);
      if (ch) g.text(ch.toUpperCase(), x + cs / 2, y + cs / 2 + 2, 38, '#fff');
    }
    KB.forEach((row, r) => [...row].forEach((ch, i) => { const [x, y, w, h] = keyRect(r, i, row.length); const st = S.keys[ch.toLowerCase()]; g.rrect(x, y, w, h, 6, st === undefined ? '#818384' : ['#3a3a3c', '#b59f3b', '#538d4e'][st]); g.text(ch === '↵' ? 'ENTER' : ch, x + w / 2, y + h / 2 + 1, ch === '↵' ? 13 : 20, '#fff'); }));
    if (S.msg) g.text(S.msg, 310, 590, 22, '#fde047');
  },
});
function handle(g, key) {
  if (key === '⌫') { S.cur = S.cur.slice(0, -1); g.sfx.click(); }
  else if (key === '↵') submit(g);
  else if (S.cur.length < 5) { S.cur += key.toLowerCase(); g.sfx.tone(500, 0.03, 'triangle', 0.04); }
}
function keyRect(r, i, n) { const w = r === 2 && (i === 0 || i === n - 1) ? 82 : 52, gap = 6; const total = r === 2 ? 7 * 52 + 2 * 82 + 8 * gap : n * 52 + (n - 1) * gap; let x = 310 - total / 2; for (let k = 0; k < i; k++) x += (r === 2 && (k === 0) ? 82 : 52) + gap; return [x, 630 + r * 70, w, 60]; }
function newWord() { S.ans = U.choice(WORDS); S.rows = []; S.cur = ''; S.keys = {}; S.msg = ''; S.next = 0; S.lost = false; S.flip = 5.5; S.round++; S.shake = 0; }
function submit(g) {
  if (S.cur.length < 5) { S.shake = 0.3; S.msg = '5글자를 입력하세요'; g.sfx.hit(); return; }
  const w = S.cur, a = [...S.ans], s = Array(5).fill(0), used = Array(5).fill(false);
  for (let i = 0; i < 5; i++) if (w[i] === a[i]) { s[i] = 2; used[i] = true; }
  for (let i = 0; i < 5; i++) if (!s[i]) { const j = a.findIndex((ch, k) => ch === w[i] && !used[k]); if (j >= 0) { s[i] = 1; used[j] = true; } }
  S.rows.push({ w, s }); S.cur = ''; S.flip = 0; S.msg = '';
  for (let i = 0; i < 5; i++) S.keys[w[i]] = Math.max(S.keys[w[i]] ?? 0, s[i]);
  g.sfx.tone(400, 0.08, 'square', 0.04);
  if (s.every((v) => v === 2)) { S.streak++; const pts = (7 - S.rows.length) * 100 + S.streak * 50; g.add(pts); g.later(() => { g.sfx.win(); S.msg = ['천재!', '굉장해요!', '훌륭해요!', '좋아요!', '잘했어요!', '휴~ 아슬아슬!'][S.rows.length - 1] + ` +${pts}`; }, 1); S.next = 2.8; }
  else if (S.rows.length >= 6) { S.lost = true; S.msg = `정답: ${S.ans.toUpperCase()}`; S.next = 2.5; }
}
