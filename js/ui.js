/* =========================================================
 *  ui.js - HUD / 모달 / 튜토리얼 / 토스트
 * ========================================================= */
const UI = {
  shakeAmt: 0,
  toasts: [],
  reveal: null,
  modalTab: 'zone',

  init(game) {
    this.g = game;
    this.$ = id => document.getElementById(id);
    this.minimap = this.$('minimap');
    this.minimap.width = 260; this.minimap.height = 74;

    this.$('btnShop').onclick = () => this.openShop('zone');
    this.$('btnPets').onclick = () => this.openPets();
    this.$('btnAuto').onclick = () => Game.autoPlace();
    this.$('btnHelp').onclick = () => this.openHelp();
    this.$('btnMute').onclick = e => {
      Sfx.muted = !Sfx.muted;
      e.currentTarget.textContent = Sfx.muted ? '🔇' : '🔊';
      e.currentTarget.classList.toggle('off', Sfx.muted);
    };
    this.$('modalClose').onclick = () => this.closeModal();
    this.$('modal').addEventListener('click', e => { if (e.target.id === 'modal') this.closeModal(); });
    this.$('revealClose').onclick = () => this.closeReveal();
    this.$('startBtn').onclick = () => {
      this.$('splash').classList.add('gone');
      Sfx.ensure();
    };
    this.rc = this.$('revealCanvas');
    this.refresh();
  },

  /* ---------------- 상단 HUD ---------------- */
  fastRefresh() {
    const g = this.g;
    this.$('money').textContent = fmtMoney(g.money);
    this.$('rate').textContent = fmtMoney(g.income()) + '/초';
    this.$('bag').textContent = `${g.carrying.length}/${g.carryMax()}`;
    const z = World.zoneAt(g.player.x, g.player.y);
    this.$('zoneName').textContent = z ? (z.id === 'base' ? '🏠 내 기지' : (ZONE_BY_ID[z.id].emoji + ' ' + z.name)) : '🛣️ 이동 중';
    this.bossBar();
    this.drawReveal();
  },

  refresh() {
    const g = this.g;
    this.$('pets').textContent = g.pets.length;
    this.$('tmCount').textContent = `${World.treadmills.filter(t => t.i < g.treadmillSlots && t.pet).length}/${g.treadmillSlots}`;
    /* 튜토리얼 */
    const step = TUTORIAL[g.tutorial];
    const box = this.$('tut');
    if (!step) { box.classList.add('done'); box.innerHTML = `<div class="tut-h">✅ 튜토리얼 완료</div><div class="tut-b">이제 자유롭게 제국을 키워봐. [H] 도움말</div>`; }
    else {
      box.classList.remove('done');
      box.innerHTML =
        `<div class="tut-h"><span class="tut-n">${g.tutorial + 1}/${TUTORIAL.length}</span> ${step.title}</div>
         <div class="tut-b">${step.body}</div>`;
    }
    if (this.$('modal').classList.contains('open')) this.renderModal();
  },

  bossBar() {
    const b = Game.nearestBoss();
    const el = this.$('bossbar');
    if (!b) { el.classList.remove('on'); return; }
    el.classList.add('on');
    const c = b.cfg;
    if (b.cooldownT > 0) {
      el.innerHTML = `<div class="bb-name" style="color:${c.glow}">${c.name}</div>
        <div class="bb-sub">재등장까지 ${fmtTime(b.cooldownT)}</div>`;
      return;
    }
    const eggs = '🥚'.repeat(b.eggsLeft) + '<span class="dim">' + '🥚'.repeat(c.eggs - b.eggsLeft) + '</span>';
    const rule = b.state === 'look'
      ? '<span class="danger">쳐다보는 중 — 완전히 멈춰!</span>'
      : b.state === 'warn'
        ? '<span class="warn">❗ 돌아본다!</span>'
        : `최소 <b style="color:${RARITIES[c.minTier].glow}">${RARITIES[c.minTier].name}</b> 확정 · 분노 ${b.rage}`;
    el.innerHTML = `<div class="bb-name" style="color:${c.glow}">👑 ${c.name} <span class="bb-t">${c.title}</span></div>
      <div class="bb-eggs">${eggs}</div><div class="bb-sub">${rule}</div>`;
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

  shake(a) { this.shakeAmt = Math.max(this.shakeAmt, a); },
  tick(dt) { this.shakeAmt = Math.max(0, this.shakeAmt - dt * 1.8); if (this.reveal) this.reveal.t += dt; },

  /* ---------------- 모달 ---------------- */
  openShop(tab) { this.modalTab = tab || 'zone'; this.$('modal').classList.add('open'); Game.paused = false; this.renderModal(); Sfx.play('tick'); },
  openPets() { this.modalTab = 'pets'; this.$('modal').classList.add('open'); this.renderModal(); Sfx.play('tick'); },
  openHelp() { this.modalTab = 'help'; this.$('modal').classList.add('open'); this.renderModal(); Sfx.play('tick'); },
  closeModal() { this.$('modal').classList.remove('open'); },

  renderModal() {
    const g = this.g;
    const tabs = [
      ['zone', '🗺️ 구역'], ['gear', '🏃 러닝머신'], ['fac', '🏗️ 시설'],
      ['pets', '🐣 내 펫'], ['dex', '📖 등급표'], ['help', '❓ 도움말']
    ];
    this.$('modalTabs').innerHTML = tabs.map(([id, l]) =>
      `<button class="tab ${this.modalTab === id ? 'on' : ''}" data-tab="${id}">${l}</button>`).join('');
    this.$('modalTabs').querySelectorAll('.tab').forEach(b =>
      b.onclick = () => { this.modalTab = b.dataset.tab; this.renderModal(); });

    const body = this.$('modalBody');
    const F = {
      zone: () => this.viewZones(), gear: () => this.viewGear(), fac: () => this.viewFac(),
      pets: () => this.viewPets(), dex: () => this.viewDex(), help: () => this.viewHelp()
    };
    body.innerHTML = (F[this.modalTab] || F.zone)();
    body.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => {
      const [k, v] = b.dataset.buy.split(':');
      if (k === 'zone') Game.buyZone(v);
      else if (k === 'tm') Game.buyTreadmillSlot();
      else if (k === 'inc') Game.buyIncubatorSlot();
      else if (k === 'bag') Game.buyBackpack();
      else if (k === 'up') Game.upgradeTreadmill(v);
      this.renderModal();
    });
    body.querySelectorAll('[data-sell]').forEach(b => b.onclick = () => {
      const uid = +b.dataset.sell;
      const i = Game.pets.findIndex(p => p.uid === uid);
      if (i < 0) return;
      const pet = Game.pets[i];
      const price = Math.floor(petIncome(pet) * 45);
      World.treadmills.forEach(t => { if (t.pet && t.pet.uid === uid) t.pet = null; });
      Game.pets.splice(i, 1);
      Game.money += price;
      this.toast(`${petFullName(pet)} 판매 +${fmtMoney(price)}원`, '#39ff9a');
      Sfx.play('buy'); this.refresh(); this.renderModal();
    });
  },

  card(title, sub, right, cls = '') {
    return `<div class="row ${cls}"><div class="row-l"><div class="row-t">${title}</div><div class="row-s">${sub}</div></div><div class="row-r">${right}</div></div>`;
  },
  btn(label, key, ok) {
    return `<button class="buy ${ok ? '' : 'no'}" data-buy="${key}">${label}</button>`;
  },

  viewZones() {
    const g = this.g;
    let h = `<p class="hint">구역마다 알 주인이 다르고 <b>권장속도(초당 수익 기준값)</b>가 다르다. 각 구역엔 <b>보스</b>가 하나씩 있어.</p>`;
    ZONES.forEach((z, i) => {
      const un = g.unlocked[z.id];
      const prev = i > 0 ? g.unlocked[ZONES[i - 1].id] : true;
      const boss = BOSS_BY_ZONE[z.id];
      const mobs = z.mobs.map(m => `${SPECIES[m].name}(${fmtMoney(SPECIES[m].base)})`).join(' · ');
      const right = un ? `<span class="ok">해금됨</span>`
        : prev ? this.btn(fmtMoney(z.cost) + '원', 'zone:' + z.id, g.money >= z.cost)
          : `<span class="lock">앞 구역 먼저</span>`;
      h += this.card(
        `${z.emoji} ${z.name} <span class="spd">속도 ${fmtMoney(z.speed)}/초</span>`,
        `${mobs}<br><span class="boss">👑 보스 ${boss.name} — 최소 ${RARITIES[boss.minTier].name} 확정</span>`,
        right, un ? 'on' : '');
    });
    return h;
  },

  viewGear() {
    const g = this.g;
    let h = `<p class="hint">러닝머신 슬롯을 늘리고 등급을 올려. 수익 = <b>생물 속도 × 등급배수 × 아우라배수 × 러닝머신배수</b></p>`;
    const canSlot = g.treadmillSlots < CONFIG.treadmillSlots.max;
    const sc = CONFIG.treadmillSlots.cost(g.treadmillSlots);
    h += this.card('러닝머신 슬롯 추가', `현재 ${g.treadmillSlots} / ${CONFIG.treadmillSlots.max}`,
      canSlot ? this.btn(fmtMoney(sc) + '원', 'tm:1', g.money >= sc) : `<span class="ok">MAX</span>`);
    TREADMILLS.forEach(t => {
      if (t.cost === 0) return;
      const n = World.treadmills.filter(q => q.i < g.treadmillSlots && q.kind === t.id).length;
      h += this.card(`${t.name} <span class="spd">x${t.mult}</span>`,
        `보유 ${n}대 — 가장 낮은 슬롯 1개를 업그레이드`,
        this.btn(fmtMoney(t.cost) + '원', 'up:' + t.id, g.money >= t.cost));
    });
    return h;
  },

  viewFac() {
    const g = this.g;
    let h = `<p class="hint">부화기를 늘리면 알을 동시에 키우고, 가방을 키우면 한 번에 여러 개를 훔칠 수 있어.</p>`;
    const ic = g.incubatorSlots < CONFIG.incubator.maxSlots;
    const icc = CONFIG.incubator.slotCost[g.incubatorSlots];
    h += this.card('부화기 추가', `현재 ${g.incubatorSlots} / ${CONFIG.incubator.maxSlots}`,
      ic ? this.btn(fmtMoney(icc) + '원', 'inc:1', g.money >= icc) : `<span class="ok">MAX</span>`);
    const bl = g.backpackLv < CONFIG.backpack.levels.length - 1;
    const bc = CONFIG.backpack.cost[g.backpackLv + 1];
    h += this.card('가방 확장', `한 번에 알 ${g.carryMax()}개 → ${bl ? CONFIG.backpack.levels[g.backpackLv + 1] : '-'}개`,
      bl ? this.btn(fmtMoney(bc) + '원', 'bag:1', g.money >= bc) : `<span class="ok">MAX</span>`);
    h += `<div class="stats">
      <div><b>${fmtMoney(g.totalEarned)}</b><span>총 수익</span></div>
      <div><b>${g.stolen}</b><span>훔친 알</span></div>
      <div><b>${g.hatched}</b><span>부화</span></div>
      <div><b>${g.bossKills}</b><span>보스 격파</span></div>
      <div><b>${g.best !== null ? RARITIES[g.best].name : '-'}</b><span>최고 등급</span></div>
    </div>
    <button class="danger-btn" onclick="if(confirm('정말 처음부터 다시 할래? 저장이 지워져.'))Game.reset()">저장 초기화</button>`;
    return h;
  },

  viewPets() {
    const g = this.g;
    if (!g.pets.length) return `<p class="hint">아직 펫이 없어. 알을 훔쳐서 부화시켜봐!</p>`;
    const placed = new Set(World.treadmills.filter(t => t.pet).map(t => t.pet.uid));
    const sorted = g.pets.slice().sort((a, b) => petIncome(b) - petIncome(a));
    let h = `<p class="hint">총 ${g.pets.length}마리 · 가동 중 ${placed.size}마리 · <b>[자동 배치]</b>로 최고 수익 펫만 올릴 수 있어.</p><div class="petgrid">`;
    for (const p of sorted) {
      const r = RARITY_BY_ID[p.rarity], v = VARIANT_BY_ID[p.variant], sp = SPECIES[p.species];
      h += `<div class="petcard" style="--c1:${r.c1};--c2:${r.c2};--g:${r.glow}">
        <div class="pc-rar">${r.name}${v.name ? ' · ' + v.name : ''}</div>
        <div class="pc-name">${sp.pet}</div>
        <div class="pc-inc">${fmtMoney(petIncome(p))}/초</div>
        <div class="pc-foot">${placed.has(p.uid) ? '<span class="run">가동중</span>' : '<span class="idle">대기</span>'}
          <button class="sell" data-sell="${p.uid}">판매 ${fmtMoney(Math.floor(petIncome(p) * 45))}</button></div>
      </div>`;
    }
    return h + '</div>';
  },

  viewDex() {
    let h = `<p class="hint">등급이 높을수록 수익 배수가 커진다. <b>아우라 변형</b>은 등급 위에 한 번 더 곱해져.</p><div class="rargrid">`;
    const total = RARITIES.reduce((a, r) => a + r.weight, 0);
    for (const r of RARITIES) {
      h += `<div class="rarcard" style="--c1:${r.c1};--c2:${r.c2};--g:${r.glow}">
        <div class="rc-name">${r.name}</div>
        <div class="rc-en">${r.en}</div>
        <div class="rc-m">수익 x${r.mult}</div>
        <div class="rc-p">기본 확률 ${(r.weight / total * 100).toFixed(r.weight < 50 ? 3 : 1)}%</div>
        <div class="rc-a">아우라 · ${r.auraName}</div>
      </div>`;
    }
    h += `</div><h3 class="sec">아우라 변형</h3><div class="rargrid">`;
    const vt = VARIANTS.reduce((a, v) => a + v.weight, 0);
    for (const v of VARIANTS) {
      h += `<div class="rarcard var">
        <div class="rc-name">${v.name || '기본'}</div>
        <div class="rc-m">수익 x${v.mult}</div>
        <div class="rc-p">${(v.weight / vt * 100).toFixed(1)}%</div>
      </div>`;
    }
    h += `</div><h3 class="sec">생물 권장속도</h3><div class="spdlist">`;
    for (const z of ZONES) {
      h += `<div class="spdrow"><b>${z.emoji} ${z.name}</b>` +
        z.mobs.map(m => `<span>${SPECIES[m].name} <em>${fmtMoney(SPECIES[m].base)}</em></span>`).join('') +
        `<span class="bossrow">👑 ${BOSS_BY_ZONE[z.id].name} <em>최소 ${RARITIES[BOSS_BY_ZONE[z.id].minTier].name}</em></span></div>`;
    }
    return h + '</div>';
  },

  viewHelp() {
    return `
    <h3 class="sec">조작</h3>
    <div class="keys">
      <div><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 이동 (모바일: 왼쪽 화면 드래그)</div>
      <div><kbd>E</kbd> 꾹 누르기 — 알 훔치기 / 부화 / 설치</div>
      <div><kbd>B</kbd> 상점 · <kbd>I</kbd> 내 펫 · <kbd>H</kbd> 도움말 · <kbd>ESC</kbd> 닫기</div>
    </div>
    <h3 class="sec">알 훔치기</h3>
    <p class="hint">알을 품은 생물 옆에서 <b>E를 꾹</b> 누르면 게이지가 찬다.
    머리 위에 <b style="color:#ffd54a">❗</b> 가 뜨면 곧 뒤돌아본다는 신호 —
    <b style="color:#ff4d4d">즉시 손을 떼</b>. 눈이 빨개졌을 때 계속 잡고 있으면 들켜서 기절한다.</p>
    <h3 class="sec">보스는 규칙이 다르다 👑</h3>
    <p class="hint">
    구역마다 보스가 하나씩 있고 알을 <b>3개</b> 품고 있어. 보스는:<br>
    • 예고(❗)가 <b>훨씬 짧고</b>, 알을 뺏길 때마다 <b>분노</b>해서 더 짧아진다<br>
    • <b style="color:#ff4d4d">무궁화꽃이 피었습니다</b> 룰 — 쳐다볼 땐 E를 떼는 것뿐 아니라 <b>완전히 멈춰야</b> 한다<br>
    • 걸리면 <b>돌진</b>해서 날려버리고, 가방에 있던 알 1개를 떨어뜨린다<br>
    • 대신 <b>등급 하한이 보장</b>되고, 3개를 다 털면 격파 — 일정 시간 뒤 부활한다</p>
    <h3 class="sec">수익 공식</h3>
    <p class="hint"><b>생물 권장속도 × 등급 배수 × 아우라 변형 배수 × 러닝머신 배수</b><br>
    예) 고래(500K) × 코스믹(x350) × 무지개(x5) × 터보(x5) = 초당 4.4조</p>
    <h3 class="sec">기타</h3>
    <p class="hint">진행상황은 자동 저장돼. 껐다 켜면 최대 2시간치 오프라인 수익(50%)을 받아.</p>`;
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
    el.classList.toggle('big', r.tier >= 3);
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
    if (t < 0.9) {
      const sh = Math.sin(t * 40) * (2 + t * 9);
      Draw.egg(c, cx + sh, cy - 26, 72, pet.rarity, pet.variant, t, true);
    } else {
      const p = Math.min(1, (t - 0.9) / 0.35);
      c.save();
      c.translate(cx, cy);
      c.scale(0.9 + p * 0.25, 0.9 + p * 0.25);
      c.translate(-cx, -cy);
      Draw.pet(c, cx, cy + 16, pet, t, 3.0, false);
      c.restore();
    }
  },

  offlineModal(gain, secs) {
    this.toast(`오프라인 ${fmtTime(secs)} 동안 +${fmtMoney(gain)}원 벌었어! 💤`, '#39ff9a');
  }
};
