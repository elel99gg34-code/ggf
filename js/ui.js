/* =========================================================
 *  ui.js - HUD / 알림 / 도감 / 부화 연출
 *  (상점 없음 — 러닝머신과 울타리 확장은 월드 안 설비로 처리)
 * ========================================================= */
const UI = {
  shakeAmt: 0,
  reveal: null,
  modalTab: 'pets',
  announceQ: [],
  announceT: 0,
  feed: [],

  init(game) {
    this.g = game;
    this.$ = id => document.getElementById(id);
    this.minimap = this.$('minimap');
    this.minimap.width = 260; this.minimap.height = 62;

    this.$('btnPets').onclick = () => this.open('pets');
    this.$('btnDex').onclick  = () => this.open('dex');
    this.$('btnHelp').onclick = () => this.open('help');
    this.$('btnMute').onclick = e => {
      Sfx.muted = !Sfx.muted;
      e.currentTarget.textContent = Sfx.muted ? '🔇' : '🔊';
      e.currentTarget.classList.toggle('off', Sfx.muted);
    };
    this.$('modalClose').onclick = () => this.closeModal();
    this.$('modal').addEventListener('click', e => { if (e.target.id === 'modal') this.closeModal(); });
    this.$('revealClose').onclick = () => this.closeReveal();
    this.$('startBtn').onclick = () => { this.$('splash').classList.add('gone'); Sfx.ensure(); };
    this.rc = this.$('revealCanvas');
    this.refresh();
  },

  /* ---------------- 매 프레임 ---------------- */
  fastRefresh() {
    const g = this.g;
    this.$('money').textContent = fmtMoney(g.money);
    this.$('rate').textContent = fmtMoney(g.income()) + '/초';
    this.$('spd').textContent = Math.round(g.speed());
    this.$('spdLv').textContent = 'Lv.' + g.speedLv;
    this.$('pen').textContent = `${g.penUsed()}/${g.penSlots}`;
    const z = World.zoneAt(g.player.x, g.player.y);
    this.$('zoneName').textContent = z
      ? (z.id === 'base' ? '🏠 내 기지' : ZONE_BY_ID[z.id].emoji + ' ' + z.name)
      : '🌱 들판';

    /* 들고 있는 알 */
    const eggEl = this.$('carry');
    if (g.carrying) {
      const r = RARITY_BY_ID[g.carrying.rarity];
      eggEl.classList.add('on');
      eggEl.style.borderColor = r.glow;
      eggEl.innerHTML = `<span class="ic">🥚</span><b style="color:${r.glow}">${r.name}</b>`;
    } else {
      eggEl.classList.remove('on');
      eggEl.style.borderColor = '';
      eggEl.innerHTML = `<span class="ic">🥚</span><b>없음</b>`;
    }

    /* 추격 경고 */
    const cw = this.$('chase');
    if (g.chasers > 0) {
      cw.classList.add('on');
      cw.innerHTML = `🏃 <b>도망쳐!</b> ${g.chasers}마리 추격 중` +
        (g.carrying ? ' — <span class="risk">잡히면 알을 뺏긴다</span>' : '');
    } else cw.classList.remove('on');

    /* 리스폰 진행 바 */
    if (g.downT > 0) {
      const p = 1 - g.downT / CONFIG.player.downTime;
      this.$('downed').querySelector('.dn-bar').style.width = (p * 100).toFixed(1) + '%';
    }
    this.drawReveal();
  },

  refresh() {
    const g = this.g;
    this.$('pen').textContent = `${g.penUsed()}/${g.penSlots}`;
    const step = TUTORIAL[g.tutorial];
    const box = this.$('tut');
    if (!step) {
      box.classList.add('done');
      box.innerHTML = `<div class="tut-h">✅ 튜토리얼 완료</div>
        <div class="tut-b">구역은 전부 자유롭게 갈 수 있어. 파수꾼이 빠른 곳일수록 좋은 알이 나와 — 속도를 올리고 도전해봐. [H] 도움말</div>`;
    } else {
      box.classList.remove('done');
      box.innerHTML = `<div class="tut-h"><span class="tut-n">${g.tutorial + 1}/${TUTORIAL.length}</span> ${step.title}</div>
        <div class="tut-b">${step.body}</div>`;
    }
    if (this.$('modal').classList.contains('open')) this.renderModal();
  },

  /* ---------------- 시크릿 이상 전광판 ---------------- */
  announce(egg, verb) {
    const r = RARITY_BY_ID[egg.rarity];
    const v = VARIANT_BY_ID[egg.variant];
    const sp = SPECIES[egg.species];
    this.announceQ.push({
      html: `<div class="an-top">🚨 ${r.name} 등급 ${verb}!</div>
             <div class="an-main">${v.name ? v.name + ' ' : ''}${sp.name}의 ${r.name} 알</div>
             <div class="an-sub">아우라 · ${r.auraName}${v.name ? ' + ' + v.name + ' x' + v.mult : ''}</div>`,
      glow: r.glow, c1: r.c1
    });
    this.feed.unshift({ t: Date.now(), name: `${v.name ? v.name + ' ' : ''}${sp.name} · ${r.name}`, glow: r.glow, verb });
    if (this.feed.length > 12) this.feed.pop();
    Sfx.play('alert');
  },

  pumpAnnounce(dt) {
    const el = this.$('announce');
    if (this.announceT > 0) {
      this.announceT -= dt;
      if (this.announceT <= 0) el.classList.remove('on');
      return;
    }
    if (!this.announceQ.length) return;
    const a = this.announceQ.shift();
    el.style.setProperty('--g', a.glow);
    el.style.setProperty('--c1', a.c1);
    el.innerHTML = a.html;
    el.classList.add('on');
    this.announceT = 3.4;
  },

  /* ---------------- 토스트 ---------------- */
  toast(msg, color) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.style.borderColor = color || '#ffd54a';
    el.innerHTML = `<span style="color:${color || '#ffd54a'}">${msg}</span>`;
    this.$('toasts').appendChild(el);
    setTimeout(() => el.classList.add('in'), 10);
    setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 350); }, 2400);
  },

  downOverlay(on) {
    const el = this.$('downed');
    el.classList.toggle('on', !!on);
  },

  shake(a) { this.shakeAmt = Math.max(this.shakeAmt, a); },
  tick(dt) {
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 1.8);
    if (this.reveal) this.reveal.t += dt;
    this.pumpAnnounce(dt);
  },

  /* ---------------- 정보 패널 ---------------- */
  open(tab) { this.modalTab = tab; this.$('modal').classList.add('open'); this.renderModal(); Sfx.play('tick'); },
  closeModal() { this.$('modal').classList.remove('open'); },

  renderModal() {
    const tabs = [['pets', '🐣 내 펫'], ['dex', '📖 등급표'], ['log', '🚨 발견 기록'], ['help', '❓ 도움말']];
    this.$('modalTabs').innerHTML = tabs.map(([id, l]) =>
      `<button class="tab ${this.modalTab === id ? 'on' : ''}" data-tab="${id}">${l}</button>`).join('');
    this.$('modalTabs').querySelectorAll('.tab').forEach(b =>
      b.onclick = () => { this.modalTab = b.dataset.tab; this.renderModal(); });
    const F = { pets: () => this.viewPets(), dex: () => this.viewDex(), log: () => this.viewLog(), help: () => this.viewHelp() };
    this.$('modalBody').innerHTML = (F[this.modalTab] || F.pets)();
  },

  viewPets() {
    const g = this.g;
    let h = `<div class="stats">
      <div><b>${Math.round(g.speed())}</b><span>내 속도 (Lv.${g.speedLv})</span></div>
      <div><b>${fmtMoney(g.income())}</b><span>초당 수익</span></div>
      <div><b>${g.penUsed()}/${g.penSlots}</b><span>울타리</span></div>
      <div><b>${g.stolen}</b><span>훔친 알</span></div>
      <div><b>${g.caught}</b><span>잡힌 횟수</span></div>
      <div><b>${g.deaths}</b><span>리스폰</span></div>
      <div><b>${g.best !== null ? RARITIES[g.best].name : '-'}</b><span>최고 등급</span></div>
    </div>`;
    if (!g.penPets.length && !g.penEggs.length)
      return h + `<p class="hint">울타리가 비었어. 둥지에서 알을 훔쳐다 넣어봐!</p>`;
    if (g.penEggs.length) {
      h += `<h3 class="sec">부화 중 (${g.penEggs.length})</h3><div class="petgrid">`;
      for (const e of g.penEggs) {
        const r = RARITY_BY_ID[e.egg.rarity];
        const pct = Math.round(clamp(e.t / CONFIG.hatch.time, 0, 1) * 100);
        h += `<div class="petcard" style="--c1:${r.c1};--c2:${r.c2};--g:${r.glow}">
          <div class="pc-rar">${r.name}</div><div class="pc-name">알 · ${SPECIES[e.egg.species].name}</div>
          <div class="pc-inc">부화 ${pct}%</div></div>`;
      }
      h += '</div>';
    }
    if (g.penPets.length) {
      h += `<h3 class="sec">울타리 안 펫 (${g.penPets.length})</h3><div class="petgrid">`;
      for (const q of g.penPets.slice().sort((a, b) => petIncome(b.pet) - petIncome(a.pet))) {
        const p = q.pet, r = RARITY_BY_ID[p.rarity], v = VARIANT_BY_ID[p.variant], sp = SPECIES[p.species];
        h += `<div class="petcard" style="--c1:${r.c1};--c2:${r.c2};--g:${r.glow}">
          <div class="pc-rar">${r.name}${v.name ? ' · ' + v.name : ''}</div>
          <div class="pc-name">${sp.pet}</div>
          <div class="pc-inc">${fmtMoney(petIncome(p))}/초</div></div>`;
      }
      h += '</div>';
    }
    return h + `<button class="danger-btn" onclick="if(confirm('정말 처음부터 다시 할래? 저장이 지워져.'))Game.reset()">저장 초기화</button>`;
  },

  viewDex() {
    let h = `<p class="hint">등급이 높을수록 펫 수익 배수가 크다. <b>시크릿</b> 이상이 나오면 화면에 알림이 뜬다.</p><div class="rargrid">`;
    const total = RARITIES.reduce((a, r) => a + r.weight, 0);
    for (const r of RARITIES) {
      h += `<div class="rarcard" style="--c1:${r.c1};--c2:${r.c2};--g:${r.glow}">
        <div class="rc-name">${r.name}${r.tier >= ANNOUNCE_TIER ? ' 🚨' : ''}</div>
        <div class="rc-en">${r.en}</div>
        <div class="rc-m">수익 x${r.mult}</div>
        <div class="rc-p">기본 확률 ${(r.weight / total * 100).toFixed(r.weight < 50 ? 3 : 1)}%</div>
        <div class="rc-a">아우라 · ${r.auraName}</div></div>`;
    }
    h += `</div><h3 class="sec">아우라 변형</h3><div class="rargrid">`;
    const vt = VARIANTS.reduce((a, v) => a + v.weight, 0);
    for (const v of VARIANTS) {
      h += `<div class="rarcard var"><div class="rc-name">${v.name || '기본'}</div>
        <div class="rc-m">수익 x${v.mult}</div><div class="rc-p">${(v.weight / vt * 100).toFixed(1)}%</div></div>`;
    }
    const firstSecret = ZONES.find(z => z.maxTier >= ANNOUNCE_TIER);
    h += `</div><h3 class="sec">구역 — 전부 자유롭게 갈 수 있다</h3>
      <p class="hint">잠금은 없다. 다만 파수꾼이 빠른 구역은 <b>내 속도가 낮으면 무조건 잡힌다.</b><br>
      구역마다 <b>나올 수 있는 최고 등급</b>이 정해져 있다 —
      <b style="color:#ff2b4d">시크릿은 ${firstSecret.emoji} ${firstSecret.name}부터</b> 나온다.</p><div class="spdlist">`;
    const my = Math.round(Game.speed());
    for (const z of ZONES) {
      const ok = my >= z.need;
      const cap = RARITIES[z.maxTier];
      h += `<div class="spdrow ${ok ? '' : 'no'}"><b>${z.emoji} ${z.name}</b>` +
        z.mobs.map(m => `<span>${SPECIES[m].name} <em>추격 ${SPECIES[m].chase}</em></span>`).join('') +
        `<span>펫 수익 <em>${fmtMoney(z.speed)}/초</em></span>
         <span>최고 등급 <em style="color:${cap.glow}">${cap.name}</em></span>
         <span class="req">권장 속도 <em>${z.need}</em> ${ok ? '✔' : '⚠ 부족'}</span></div>`;
    }
    return h + `</div>`;
  },

  viewLog() {
    if (!this.feed.length) return `<p class="hint">아직 시크릿 이상 등급을 발견한 적이 없어.</p>`;
    let h = `<p class="hint">시크릿 이상 등급을 찾으면 여기에 쌓인다.</p><div class="logs">`;
    for (const f of this.feed) {
      const d = new Date(f.t);
      h += `<div class="logrow" style="--g:${f.glow}">
        <span class="lg-t">${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}</span>
        <span class="lg-n" style="color:${f.glow}">${f.name}</span>
        <span class="lg-v">${f.verb}</span></div>`;
    }
    return h + '</div>';
  },

  viewHelp() {
    return `
    <h3 class="sec">조작</h3>
    <div class="keys">
      <div><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 이동 (모바일: 왼쪽 화면 드래그)</div>
      <div><kbd>E</kbd> <b>꾹</b> — 알 훔치기 / 울타리에 넣기 / 러닝머신 달리기 / 울타리 확장</div>
      <div><kbd>I</kbd> 내 펫 · <kbd>H</kbd> 도움말 · <kbd>ESC</kbd> 닫기</div>
    </div>
    <h3 class="sec">1. 알 훔치기</h3>
    <p class="hint"><b>스테이지 하나에 몹은 딱 한 마리</b>다. 그 몹이 둥지 옆에서 자고 있고(💤),
    <b>둥지에는 알이 4개</b> 들어 있으며 알마다 등급이 따로 굴려진다.
    둥지 옆에서 <b>E를 꾹</b> 누르면 맨 앞 알을 들어올리고, <b>그 순간 몹이 깨어나 쫓아온다.</b>
    한 둥지를 네 번까지 털 수 있지만 매번 새로 깨우게 된다.</p>
    <h3 class="sec">2. 도망치기 · 리스폰</h3>
    <p class="hint">체력 같은 건 없다. <b>한 번 잡히면 그 자리에서 쓰러지고</b>,
    2초 뒤 기지의 <b>⛑ 리스폰 지점</b>에서 다시 시작한다.
    들고 있던 알은 원래 둥지로 돌아가고, 추격도 전부 풀린다.
    리스폰 직후 2.5초 동안은 무적이다.<br>
    파수꾼은 시간이 지나거나 충분히 멀어지면 스스로 포기하고 둥지로 돌아가 다시 잠든다.
    알을 들면 살짝 느려지니 주의.</p>
    <h3 class="sec">3. 울타리에 넣기</h3>
    <p class="hint">기지 울타리 아래쪽 <b>알 넣는 곳</b>에서 <b>E</b>. 알은 울타리 안에서 자라다 부화하고,
    부화한 펫은 울타리를 돌아다니며 <b>초당 돈을 벌어준다.</b>
    칸이 부족하면 <b>울타리 확장 패드</b>를 밟고 <b>E</b>.</p>
    <h3 class="sec">4. 러닝머신 = 내 속도</h3>
    <p class="hint">러닝머신은 펫이 아니라 <b>내가 타는 것</b>이다. 올라서서 <b>E를 꾹</b> 누르면
    돈을 쓰면서 달리고, 게이지가 차면 <b>속도 레벨이 오른다</b>. 레벨당 +10%.</p>
    <h3 class="sec">5. 난이도</h3>
    <p class="hint">구역은 <b>전부 자유롭게</b> 갈 수 있다. 잠금은 없다.
    대신 뒤쪽 구역일수록 파수꾼의 <b>추격 속도</b>가 빨라서, 내 속도가 그보다 낮으면 절대 못 도망친다.
    좋은 알 → 좋은 펫 → 더 많은 돈 → 더 높은 속도 → 더 먼 구역, 이게 성장 루프.</p>
    <h3 class="sec">6. 등급 상한과 알림</h3>
    <p class="hint">구역마다 <b>나올 수 있는 최고 등급</b>이 다르다.
    <b>닭의 숲과 오리 연못은 에픽까지</b>만 나오고, <b style="color:#ff2b4d">시크릿은 사막부터</b> 등장한다.
    그 위 등급도 구역이 뒤로 갈수록 하나씩 풀린다 (정글 디바인 · 바다 코스믹 · 공룡 계곡부터 영원한).<br>
    <b>시크릿</b> 이상을 발견하거나 부화시키면 화면 위에 <b>전광판 알림</b>이 뜨고,
    그런 알이 든 둥지는 미니맵에도 크게 표시된다.</p>
    <p class="hint">진행상황은 자동 저장. 껐다 켜면 최대 2시간치 오프라인 수익(50%)을 받는다.</p>`;
  },

  /* ---------------- 부화 연출 ---------------- */
  showReveal(pet) {
    this.reveal = { pet, t: 0 };
    const r = RARITY_BY_ID[pet.rarity], v = VARIANT_BY_ID[pet.variant], sp = SPECIES[pet.species];
    const el = this.$('reveal');
    el.classList.add('open');
    el.style.setProperty('--g', r.glow);
    el.style.setProperty('--c1', r.c1);
    el.style.setProperty('--c2', r.c2);
    this.$('revTier').textContent = r.name;
    this.$('revTier').style.color = r.glow;
    this.$('revEn').textContent = r.en;
    this.$('revName').textContent = petFullName(pet);
    this.$('revInc').textContent = fmtMoney(petIncome(pet)) + ' / 초';
    this.$('revMeta').innerHTML =
      `<span>${sp.name} 계열</span><span>아우라 · ${r.auraName}</span>` +
      (v.name ? `<span class="vtag">${v.name} x${v.mult}</span>` : '');
    el.classList.toggle('big', r.tier >= ANNOUNCE_TIER);
    this.rc.width = 300 * 2; this.rc.height = 260 * 2;
  },
  closeReveal() { this.reveal = null; this.$('reveal').classList.remove('open'); },
  drawReveal() {
    if (!this.reveal) return;
    const { pet, t } = this.reveal;
    const c = this.rc.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.rc.width, this.rc.height);
    c.setTransform(2, 0, 0, 2, 0, 0);
    const cx = 150, cy = 170;
    if (t < 0.9) Draw.egg(c, cx + Math.sin(t * 40) * (2 + t * 9), cy - 26, 72, pet.rarity, pet.variant, t, true);
    else Draw.pet(c, cx, cy + 16, pet, t, 3.0, false);
  }
};
