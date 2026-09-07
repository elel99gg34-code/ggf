/* =========================================================
 *  game.js - 상태 / 입력 / 게임 루프
 *
 *  일반 몹 : ❗ 뜨면 [E] 에서 손만 떼면 안 걸림
 *  보 스    : "무궁화꽃이 피었습니다" — 쳐다볼 때 움직이기만 해도 걸리고,
 *             걸리면 돌진해서 넉백 + 긴 기절 + 가방의 알 1개 손실
 * ========================================================= */

const Game = {
  money: 0, totalEarned: 0, stolen: 0, hatched: 0, bossKills: 0,
  best: null,
  unlocked: { farm: true },
  backpackLv: 0,
  incubatorSlots: CONFIG.incubator.baseSlots,
  treadmillSlots: CONFIG.treadmillSlots.base,
  carrying: [], pets: [], dex: {},
  tutorial: 0, lastSave: 0,

  player: {
    x: 400, y: 900, facing: 'down', phase: 0, moving: false,
    stun: 0, kx: 0, ky: 0, shirt: '#2f7dff', hatColor: '#e33b3b'
  },

  mobs: [], bosses: [], particles: [],
  cam: { x: 400, y: 900, scale: 1 },
  time: 0, target: null, stealing: null, paused: false,

  /* ================= 초기화 ================= */
  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    ZONES.forEach(z => { if (!(z.id in this.unlocked)) this.unlocked[z.id] = z.cost === 0; });
    World.init();
    this.spawnAll();
    this.load();
    Input.init(canvas);
    UI.init(this);
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.lastT = now();
    requestAnimationFrame(() => this.loop());
  },

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    this.canvas.width = Math.max(1, Math.floor(w * dpr));
    this.canvas.height = Math.max(1, Math.floor(h * dpr));
    this.dpr = dpr; this.vw = w; this.vh = h;
    this.cam.scale = clamp(Math.min(w / 1420, h / 800), 0.48, 1.15);
  },

  /* ================= 스폰 ================= */
  spawnAll() {
    this.mobs = []; this.bosses = [];
    for (const z of ZONES) {
      const spots = World.spawns[z.id] || [];
      spots.forEach(([x, y, elite], i) => {
        const spId = z.mobs[elite ? 1 : 0];
        this.mobs.push(this.makeMob(z.id, spId, x, y));
      });
      const b = BOSS_BY_ZONE[z.id];
      const spot = World.bossSpots[z.id];
      if (b && spot) this.bosses.push(this.makeBoss(b, spot));
    }
  },

  makeMob(zone, spId, x, y) {
    const sp = SPECIES[spId];
    const m = {
      zone, spId, sp, boss: false,
      x, y, hx: x, hy: y, tx: x, ty: y,
      faceX: 1, phase: rand(0, 6), seed: rand(0, 10), moving: false,
      speed: rand(sp.spd[0], sp.spd[1]), waitT: rand(0.4, 2.2),
      state: 'calm', stateT: rand(1, 3),
      hasEgg: true, eggRarity: null, eggVariant: null,
      respawn: 0, flee: 0, hidden: 0, blinkT: rand(3, 8), scale: 1
    };
    this.rollEgg(m);
    return m;
  },

  makeBoss(cfg, spot) {
    return {
      zone: cfg.zone, cfg, sp: cfg, boss: true,
      x: spot.x, y: spot.y, hx: spot.x, hy: spot.y, tx: spot.x, ty: spot.y,
      faceX: -1, phase: rand(0, 6), seed: rand(0, 10), moving: false,
      speed: 58, waitT: rand(1, 3),
      state: 'calm', stateT: rand(1.2, 2.4),
      eggsLeft: cfg.eggs, rage: 0, hasEgg: true,
      eggRarity: null, eggVariant: null,
      charge: null, cooldownT: 0, scale: 1, hidden: 0
    };
  },

  rollEgg(m) {
    const r = rollRarity(m.sp.luck);
    const v = rollVariant();
    m.eggRarity = r.id; m.eggVariant = v.id; m.hasEgg = true;
  },
  rollBossEgg(b) {
    const r = rollRarityMin(b.cfg.luck, b.cfg.minTier);
    const v = rollVariant();
    b.eggRarity = r.id; b.eggVariant = v.id; b.hasEgg = b.eggsLeft > 0;
  },

  /* ================= 저장 ================= */
  save() {
    const d = {
      money: this.money, totalEarned: this.totalEarned, stolen: this.stolen,
      hatched: this.hatched, bossKills: this.bossKills, best: this.best,
      unlocked: this.unlocked, backpackLv: this.backpackLv,
      incubatorSlots: this.incubatorSlots, treadmillSlots: this.treadmillSlots,
      tutorial: this.tutorial, carrying: this.carrying, pets: this.pets, dex: this.dex,
      px: this.player.x, py: this.player.y,
      inc: World.incubators.map(i => ({ egg: i.egg, grow: i.grow, ready: i.ready })),
      tms: World.treadmills.map(t => ({ pet: t.pet, kind: t.kind })),
      savedAt: Date.now(), seq: _petSeq
    };
    try { localStorage.setItem(CONFIG.save.key, JSON.stringify(d)); } catch (e) {}
  },

  load() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(CONFIG.save.key) || 'null'); } catch (e) {}
    if (!d) return;
    this.money = d.money || 0; this.totalEarned = d.totalEarned || 0;
    this.stolen = d.stolen || 0; this.hatched = d.hatched || 0;
    this.bossKills = d.bossKills || 0; this.best = d.best ?? null;
    Object.assign(this.unlocked, d.unlocked || {});
    this.unlocked.farm = true;
    this.backpackLv = d.backpackLv || 0;
    this.incubatorSlots = d.incubatorSlots || 1;
    this.treadmillSlots = d.treadmillSlots || 1;
    this.tutorial = d.tutorial || 0;
    this.carrying = d.carrying || []; this.pets = d.pets || []; this.dex = d.dex || {};
    _petSeq = d.seq || (this.pets.length + 1);
    this.player.x = d.px || 400; this.player.y = d.py || 900;
    this.cam.x = this.player.x; this.cam.y = this.player.y;
    (d.inc || []).forEach((v, i) => {
      const inc = World.incubators[i]; if (!inc) return;
      inc.egg = v.egg || null; inc.grow = v.grow || 0; inc.ready = !!v.ready;
    });
    (d.tms || []).forEach((v, i) => {
      const t = World.treadmills[i]; if (!t) return;
      t.pet = v.pet || null; t.kind = v.kind || 'basic';
    });
    if (d.savedAt) {
      const secs = clamp((Date.now() - d.savedAt) / 1000, 0, CONFIG.offline.capHours * 3600);
      const gain = Math.floor(this.income() * secs * CONFIG.offline.rate);
      if (gain > 0 && secs > 30) {
        this.money += gain; this.totalEarned += gain;
        setTimeout(() => UI.offlineModal(gain, secs), 500);
      }
    }
  },

  reset() { try { localStorage.removeItem(CONFIG.save.key); } catch (e) {} location.reload(); },

  /* ================= 경제 ================= */
  income() {
    let s = 0;
    for (const t of World.treadmills) {
      if (t.i >= this.treadmillSlots || !t.pet) continue;
      s += petIncome(t.pet) * TREADMILL_BY_ID[t.kind].mult;
    }
    return s;
  },
  carryMax() { return CONFIG.backpack.levels[this.backpackLv]; },
  spend(n) { if (this.money < n) { UI.toast('돈이 부족해!', '#ff6b6b'); return false; } this.money -= n; return true; },
  toast(m, c) { UI.toast(m, c); },

  pop(x, y, text, color, size = 16) {
    this.particles.push({ x, y, vy: -46, life: 1.15, max: 1.15, text, color, size });
  },
  burst(x, y, color, n = 18, spread = 150) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, 6.283), sp = rand(40, spread);
      this.particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
        life: rand(0.5, 1.1), max: 1.1, color, size: rand(3, 7), box: true
      });
    }
  },

  /* ================= 업데이트 ================= */
  update(dt) {
    this.time += dt;
    if (this.paused) return;
    this.updatePlayer(dt);
    this.updateMobs(dt);
    this.updateBosses(dt);
    this.updateSteal(dt);
    this.updateIncubators(dt);
    this.updateEconomy(dt);
    this.updateParticles(dt);
    this.pickTarget();
    this.checkTutorial();
    const k = 1 - Math.pow(0.0015, dt);
    this.cam.x = lerp(this.cam.x, this.player.x, k);
    this.cam.y = lerp(this.cam.y, this.player.y - 40, k);
    const hw = this.canvas.width / (2 * this.cam.scale * this.dpr);
    const hh = this.canvas.height / (2 * this.cam.scale * this.dpr);
    this.cam.x = hw * 2 >= World.w ? World.w / 2 : clamp(this.cam.x, hw, World.w - hw);
    this.cam.y = hh * 2 >= World.h ? World.h / 2 : clamp(this.cam.y, hh, World.h - hh);
    if (this.time - this.lastSave > CONFIG.save.interval) { this.lastSave = this.time; this.save(); }
  },

  updatePlayer(dt) {
    const p = this.player;
    if (Math.abs(p.kx) + Math.abs(p.ky) > 1) {
      p.x += p.kx * dt; p.y += p.ky * dt;
      p.kx *= Math.pow(0.02, dt); p.ky *= Math.pow(0.02, dt);
      World.resolve(p, CONFIG.player.radius, this.unlocked);
    }
    if (p.stun > 0) { p.stun -= dt; p.moving = false; p.phase += dt * 20; return; }

    let ax = Input.dirX, ay = Input.dirY;
    const len = Math.hypot(ax, ay);
    if (len > 1) { ax /= len; ay /= len; }
    const sp = this.stealing ? 0 : CONFIG.player.speed;
    p.x += ax * sp * dt; p.y += ay * sp * dt;
    p.moving = len > 0.06 && !this.stealing;
    if (p.moving) {
      p.phase += dt * 12;
      if (Math.abs(ax) > Math.abs(ay)) p.facing = ax > 0 ? 'right' : 'left';
      else p.facing = ay > 0 ? 'down' : 'up';
    } else p.phase += dt * 2;
    World.resolve(p, CONFIG.player.radius, this.unlocked);
  },

  /* ---------- 일반 몹 ---------- */
  updateMobs(dt) {
    const p = this.player;
    for (const m of this.mobs) {
      if (!this.unlocked[m.zone]) continue;
      const far = Math.abs(m.x - this.cam.x) > 1200;
      if (!m.hasEgg) { m.respawn -= dt; if (m.respawn <= 0) this.rollEgg(m); }
      if (m.hidden > 0) { m.hidden -= dt; if (m.hidden <= 0) this.reposition(m, 120); continue; }
      if (far) continue;

      const near = dist(m.x, m.y, p.x, p.y);
      const engaged = near < CONFIG.steal.range * 2.0 && m.hasEgg;

      if (engaged) {
        m.stateT -= dt;
        if (m.stateT <= 0) {
          const A = m.sp.alert, wm = m.sp.warnMul || 1;
          if (m.state === 'calm') { m.state = 'warn'; m.stateT = CONFIG.steal.warnTime * wm / A; }
          else if (m.state === 'warn') { m.state = 'look'; m.stateT = CONFIG.steal.lookTime; }
          else { m.state = 'calm'; m.stateT = rand(CONFIG.steal.calmMin, CONFIG.steal.calmMax) / A; }
        }
      } else if (m.state !== 'calm') { m.state = 'calm'; m.stateT = rand(1.4, 3); }

      /* 특수 습성 */
      if (m.sp.burrow && !engaged) {
        m.blinkT -= dt;
        if (m.blinkT <= 0) { m.blinkT = rand(6, 14); m.hidden = 1.4; this.burst(m.x, m.y - 8, '#e6c98a', 12, 90); }
      }
      if (m.sp.blink && !engaged) {
        m.blinkT -= dt;
        if (m.blinkT <= 0) {
          m.blinkT = rand(4, 9);
          this.burst(m.x, m.y - 20, m.sp.accent, 10, 100);
          this.reposition(m, 170);
          this.burst(m.x, m.y - 20, m.sp.accent, 10, 100);
        }
      }
      if (m.sp.quake && m.moving && near < 320) UI.shake(Math.min(0.10, (320 - near) / 3200));

      if (m.flee > 0) {
        m.flee -= dt;
        const a = Math.atan2(m.y - p.y, m.x - p.x);
        m.x += Math.cos(a) * m.speed * 2.3 * dt; m.y += Math.sin(a) * m.speed * 2.3 * dt;
        m.moving = true; m.phase += dt * 17; m.faceX = Math.cos(a);
      } else if (m.state === 'look' || (this.stealing && this.stealing.mob === m)) {
        m.moving = false;
        if (m.state === 'look') m.faceX = (p.x - m.x) > 0 ? 1 : -1;
      } else {
        m.waitT -= dt;
        if (m.waitT <= 0) { this.pickWander(m, 170); m.waitT = rand(1.4, 4.2); }
        const d = dist(m.x, m.y, m.tx, m.ty);
        if (d > 6) {
          const a = Math.atan2(m.ty - m.y, m.tx - m.x);
          m.x += Math.cos(a) * m.speed * dt; m.y += Math.sin(a) * m.speed * dt;
          m.moving = true; m.phase += dt * 13; m.faceX = Math.cos(a);
        } else m.moving = false;
      }
      this.clampToZone(m);
    }
  },

  pickWander(m, r) {
    const z = World.zoneDef(m.zone);
    m.tx = clamp(m.hx + rand(-r, r), z.x + 70, z.x + z.w - 70);
    m.ty = clamp(m.hy + rand(-r, r), z.y + 70, z.y + z.h - 70);
  },
  reposition(m, r) {
    const z = World.zoneDef(m.zone);
    m.x = clamp(m.hx + rand(-r, r), z.x + 70, z.x + z.w - 70);
    m.y = clamp(m.hy + rand(-r, r), z.y + 70, z.y + z.h - 70);
    m.tx = m.x; m.ty = m.y;
  },
  clampToZone(m) {
    const z = World.zoneDef(m.zone);
    m.x = clamp(m.x, z.x + 42, z.x + z.w - 42);
    m.y = clamp(m.y, z.y + 42, z.y + z.h - 42);
  },

  /* ---------- 보스 ---------- */
  updateBosses(dt) {
    const p = this.player;
    for (const b of this.bosses) {
      if (!this.unlocked[b.zone]) continue;

      if (b.cooldownT > 0) {
        b.cooldownT -= dt;
        if (b.cooldownT <= 0) {
          b.eggsLeft = b.cfg.eggs; b.rage = 0; b.hasEgg = true;
          this.rollBossEgg(b);
          this.burst(b.x, b.y - 40, b.cfg.glow, 34, 260);
          if (dist(b.x, b.y, p.x, p.y) < 900) UI.toast(`${b.cfg.name} 부활!`, b.cfg.glow);
        }
        continue;
      }
      if (!b.eggRarity) this.rollBossEgg(b);
      if (Math.abs(b.x - this.cam.x) > 1300) continue;

      const near = dist(b.x, b.y, p.x, p.y);

      /* 돌진 중 */
      if (b.charge) {
        b.charge.t -= dt;
        const a = b.charge.a;
        b.x += Math.cos(a) * b.cfg.chargeSpeed * dt;
        b.y += Math.sin(a) * b.cfg.chargeSpeed * dt;
        b.moving = true; b.phase += dt * 22; b.faceX = Math.cos(a);
        UI.shake(0.22);
        if (near < 62 && !b.charge.hit) { b.charge.hit = true; this.bossHit(b); }
        if (b.charge.t <= 0) { b.charge = null; b.state = 'calm'; b.stateT = rand(1.4, 2.4); }
        this.clampToZone(b);
        continue;
      }

      const engaged = near < CONFIG.steal.range * 3.4 && b.eggsLeft > 0;
      if (engaged) {
        b.stateT -= dt;
        if (b.stateT <= 0) {
          const c = b.cfg;
          if (b.state === 'calm') { b.state = 'warn'; b.stateT = Math.max(0.10, c.warn * (1 - b.rage * 0.2)); }
          else if (b.state === 'warn') { b.state = 'look'; b.stateT = c.look; }
          else { b.state = 'calm'; b.stateT = rand(c.calm[0], c.calm[1]); }
        }
        /* 무궁화꽃이 피었습니다 — 볼 때 움직이면 걸림 */
        if (b.state === 'look' && near < 260) {
          const busted = this.stealing && this.stealing.mob === b ? true : p.moving;
          if (busted && p.stun <= 0) this.bossCharge(b);
        }
      } else if (b.state !== 'calm') { b.state = 'calm'; b.stateT = rand(1.2, 2.2); }

      if (b.state === 'look') { b.moving = false; b.faceX = (p.x - b.x) > 0 ? 1 : -1; }
      else {
        b.waitT -= dt;
        if (b.waitT <= 0) { this.pickWander(b, b.cfg.roam); b.waitT = rand(1.8, 4); }
        const d = dist(b.x, b.y, b.tx, b.ty);
        if (d > 8) {
          const a = Math.atan2(b.ty - b.y, b.tx - b.x);
          b.x += Math.cos(a) * b.speed * dt; b.y += Math.sin(a) * b.speed * dt;
          b.moving = true; b.phase += dt * 9; b.faceX = Math.cos(a);
        } else b.moving = false;
      }
      this.clampToZone(b);
    }
  },

  bossCharge(b) {
    const p = this.player;
    this.stealing = null;
    b.charge = { t: b.cfg.chargeTime, a: Math.atan2(p.y - b.y, p.x - b.x), hit: false };
    this.pop(b.x, b.y - 120, '들켰다!!', '#ff2b4d', 26);
    UI.shake(0.5);
    Sfx.play('boss');
  },

  bossHit(b) {
    const p = this.player;
    const a = Math.atan2(p.y - b.y, p.x - b.x);
    p.kx = Math.cos(a) * 900; p.ky = Math.sin(a) * 900;
    p.stun = b.cfg.stun;
    let msg = '기절!';
    if (this.carrying.length) { this.carrying.pop(); msg = '알을 떨어뜨렸다!'; }
    this.pop(p.x, p.y - 100, msg, '#ff4d4d', 22);
    this.burst(p.x, p.y - 40, '#ff4d4d', 22, 200);
    UI.shake(0.7);
    Sfx.play('fail');
    UI.refresh();
  },

  /* ---------- 훔치기 ---------- */
  updateSteal(dt) {
    const p = this.player;
    const holding = Input.action && p.stun <= 0;

    if (this.stealing) {
      const m = this.stealing.mob;
      const gone = m.boss ? (m.eggsLeft <= 0 || m.charge || m.cooldownT > 0) : !m.hasEgg;
      const far = dist(m.x, m.y, p.x, p.y) > CONFIG.steal.range * 1.4;
      if (gone || far) { this.stealing = null; return; }

      if (!holding) {
        this.stealing.idle = true;
        this.stealing.progress -= dt * 0.22;
        if (this.stealing.progress <= 0) this.stealing = null;
        if (!m.boss) return;
      } else this.stealing.idle = false;

      if (m.state === 'look' && !this.stealing.idle && !m.boss) { this.caught(m); return; }
      if (!this.stealing || this.stealing.idle) return;

      const ft = m.boss ? m.cfg.fillTime : CONFIG.steal.fillTime;
      this.stealing.progress += dt / ft;
      if (this.stealing.progress >= 1) this.succeed(m);

    } else if (holding && this.target && this.target.kind === 'mob') {
      if (this.carrying.length >= this.carryMax()) {
        if (!this._bagWarn || this.time - this._bagWarn > 2) {
          this._bagWarn = this.time;
          UI.toast('가방이 꽉 찼어! 부화기에 넣고 와', '#ff9f43');
        }
      } else this.stealing = { mob: this.target.ref, progress: 0, idle: false };
    }
  },

  caught(m) {
    const p = this.player;
    this.stealing = null;
    p.stun = CONFIG.steal.stunTime;
    m.flee = 1.4;
    if (m.sp.pounce) {
      const a = Math.atan2(p.y - m.y, p.x - m.x);
      p.kx = Math.cos(a) * 480; p.ky = Math.sin(a) * 480;
      p.stun += 0.5;
      this.pop(p.x, p.y - 100, '덮쳤다!', '#ff4d4d', 20);
    } else this.pop(p.x, p.y - 92, '들켰다!', '#ff4d4d', 21);
    this.burst(m.x, m.y - 26, '#ff4d4d', 14, 130);
    UI.shake(0.35);
    Sfx.play('fail');
  },

  succeed(m) {
    const p = this.player;
    this.stealing = null;
    const spId = m.boss ? m.cfg.species : m.spId;
    this.carrying.push({ species: spId, rarity: m.eggRarity, variant: m.eggVariant });
    this.stolen++;
    this.pop(p.x, p.y - 100, '알 획득!', '#39ff9a', 21);
    this.burst(m.x, m.y - 24, RARITY_BY_ID[m.eggRarity].glow, 20, 170);
    Sfx.play('get');

    if (m.boss) {
      m.eggsLeft--; m.rage++;
      if (m.eggsLeft <= 0) {
        m.hasEgg = false; m.cooldownT = m.cfg.cooldown; m.state = 'calm';
        this.bossKills++;
        this.burst(m.x, m.y - 60, m.cfg.glow, 48, 320);
        UI.toast(`${m.cfg.name} 격파! 🏆`, m.cfg.glow);
        UI.shake(0.5);
        Sfx.play('rare');
      } else {
        this.rollBossEgg(m);
        UI.toast(`${m.cfg.name} 분노! 예고가 더 짧아진다`, '#ff6b3d');
        m.state = 'calm'; m.stateT = 0.7;
      }
    } else {
      m.hasEgg = false; m.respawn = CONFIG.steal.respawn; m.flee = 0.9;
    }
    UI.refresh();
  },

  /* ---------- 부화기 ---------- */
  updateIncubators(dt) {
    for (const inc of World.incubators) {
      if (inc.i >= this.incubatorSlots) { inc.egg = null; continue; }
      if (inc.egg && !inc.ready) {
        inc.grow += dt;
        if (inc.grow >= CONFIG.incubator.growTime) { inc.ready = true; Sfx.play('ready'); }
      }
    }
  },
  putEgg(inc) {
    if (!this.carrying.length) return;
    inc.egg = this.carrying.shift(); inc.grow = 0; inc.ready = false;
    this.pop(inc.x, inc.y - 70, '알 투입', '#8ed2ff', 15);
    Sfx.play('place'); UI.refresh();
  },
  petEgg(inc) {
    inc.grow = Math.min(CONFIG.incubator.growTime, inc.grow + CONFIG.incubator.petBonus);
    this.pop(inc.x + rand(-14, 14), inc.y - 60, '쓰담', '#ffd54a', 13);
    Sfx.play('tick');
  },
  hatch(inc) {
    const e = inc.egg;
    inc.egg = null; inc.grow = 0; inc.ready = false;
    const pet = makePet(e.species, e.rarity, e.variant);
    this.pets.push(pet); this.hatched++;
    const key = pet.species + ':' + pet.rarity;
    this.dex[key] = (this.dex[key] || 0) + 1;
    const r = RARITY_BY_ID[pet.rarity];
    if (this.best === null || r.tier > this.best) this.best = r.tier;
    this.burst(inc.x, inc.y - 40, r.glow, 34, 240);
    if (r.tier >= 3) UI.shake(0.4);
    UI.showReveal(pet);
    Sfx.play(r.tier >= 3 ? 'rare' : 'hatch');
    UI.refresh();
  },

  /* ---------- 러닝머신 ---------- */
  freePets() {
    const used = new Set(World.treadmills.filter(t => t.pet).map(t => t.pet.uid));
    return this.pets.filter(p => !used.has(p.uid));
  },
  placePet(tm) {
    const free = this.freePets();
    if (!free.length) { UI.toast('배치할 펫이 없어. 알을 부화시켜!', '#ff9f43'); return; }
    free.sort((a, b) => petIncome(b) - petIncome(a));
    tm.pet = free[0];
    this.pop(tm.x, tm.y - 72, petFullName(tm.pet), RARITY_BY_ID[tm.pet.rarity].glow, 13);
    Sfx.play('place'); UI.refresh();
  },
  removePet(tm) {
    if (!tm.pet) return;
    this.pop(tm.x, tm.y - 70, '회수', '#cfd6e0', 14);
    tm.pet = null; Sfx.play('tick'); UI.refresh();
  },
  autoPlace() {
    const slots = World.treadmills.filter(t => t.i < this.treadmillSlots);
    const all = this.pets.slice().sort((a, b) => petIncome(b) - petIncome(a));
    let n = 0;
    slots.forEach((t, i) => { t.pet = all[i] || null; if (t.pet) n++; });
    UI.toast(n ? `러닝머신 ${n}대 가동!` : '배치할 펫이 없어', n ? '#39ff9a' : '#ff9f43');
    Sfx.play(n ? 'buy' : 'tick'); UI.refresh();
  },

  updateEconomy(dt) {
    const inc = this.income();
    if (inc <= 0) return;
    this.money += inc * dt; this.totalEarned += inc * dt;
    this._mt = (this._mt || 0) + dt;
    if (this._mt > 1.1) {
      this._mt = 0;
      const act = World.treadmills.filter(t => t.pet && t.i < this.treadmillSlots);
      if (act.length) {
        const t = pick(act);
        this.pop(t.x + rand(-10, 10), t.y - 64,
          '+' + fmtMoney(petIncome(t.pet) * TREADMILL_BY_ID[t.kind].mult), '#39ff9a', 13);
      }
    }
  },

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const q = this.particles[i];
      q.life -= dt;
      if (q.life <= 0) { this.particles.splice(i, 1); continue; }
      if (q.box) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 420 * dt; }
      else { q.y += q.vy * dt; q.vy += 34 * dt; }
    }
  },

  /* ---------- 상호작용 ---------- */
  pickTarget() {
    const p = this.player;
    let best = null;
    const C = (kind, ref, x, y, label, range) => {
      const d = dist(p.x, p.y, x, y);
      if (d > range) return;
      if (!best || d < best.dist) best = { kind, ref, label, dist: d, x, y };
    };
    for (const m of this.mobs) {
      if (!m.hasEgg || m.hidden > 0 || !this.unlocked[m.zone]) continue;
      C('mob', m, m.x, m.y, `${m.sp.name} 알 훔치기`, CONFIG.steal.range);
    }
    for (const b of this.bosses) {
      if (!this.unlocked[b.zone] || b.eggsLeft <= 0 || b.charge) continue;
      C('mob', b, b.x, b.y, `${b.cfg.name}의 알 훔치기`, CONFIG.steal.range * 1.25);
    }
    for (const inc of World.incubators) {
      if (inc.i >= this.incubatorSlots) continue;
      let l = null;
      if (inc.ready) l = '부화하기';
      else if (inc.egg) l = '쓰다듬기 (성장 +)';
      else if (this.carrying.length) l = '알 넣기';
      if (l) C('inc', inc, inc.x, inc.y, l, 68);
    }
    for (const tm of World.treadmills) {
      if (tm.i >= this.treadmillSlots) continue;
      C('tm', tm, tm.x, tm.y, tm.pet ? '펫 회수' : '펫 올리기', 64);
    }
    C('shop', null, World.shop.x, World.shop.y, '상점 열기', 100);
    for (const g of World.gates) {
      if (this.unlocked[g.zone]) continue;
      C('gate', g, g.x + g.w / 2, g.y + g.h / 2, `${ZONE_BY_ID[g.zone].name} 해금`, 110);
    }
    this.target = best;
  },

  interact() {
    const t = this.target;
    if (!t || this.player.stun > 0) return;
    if (t.kind === 'inc') {
      const i = t.ref;
      if (i.ready) this.hatch(i); else if (i.egg) this.petEgg(i); else this.putEgg(i);
    } else if (t.kind === 'tm') {
      if (t.ref.pet) this.removePet(t.ref); else this.placePet(t.ref);
    } else if (t.kind === 'shop') UI.openShop('zone');
    else if (t.kind === 'gate') UI.openShop('zone');
  },

  /* ---------- 구매 ---------- */
  buyZone(id) {
    const z = ZONE_BY_ID[id];
    if (this.unlocked[id]) return;
    const idx = ZONES.findIndex(q => q.id === id);
    if (idx > 0 && !this.unlocked[ZONES[idx - 1].id]) { UI.toast('앞 구역부터 해금해야 해', '#ff9f43'); return; }
    if (!this.spend(z.cost)) return;
    this.unlocked[id] = true;
    UI.toast(`${z.emoji} ${z.name} 해금! 🎉`, '#ffd54a');
    Sfx.play('buy'); UI.refresh();
  },
  buyTreadmillSlot() {
    if (this.treadmillSlots >= CONFIG.treadmillSlots.max) return;
    if (!this.spend(CONFIG.treadmillSlots.cost(this.treadmillSlots))) return;
    this.treadmillSlots++;
    UI.toast(`러닝머신 슬롯 ${this.treadmillSlots}개!`, '#39ff9a');
    Sfx.play('buy'); UI.refresh();
  },
  buyIncubatorSlot() {
    if (this.incubatorSlots >= CONFIG.incubator.maxSlots) return;
    if (!this.spend(CONFIG.incubator.slotCost[this.incubatorSlots])) return;
    this.incubatorSlots++;
    UI.toast(`부화기 ${this.incubatorSlots}개!`, '#8ed2ff');
    Sfx.play('buy'); UI.refresh();
  },
  buyBackpack() {
    if (this.backpackLv >= CONFIG.backpack.levels.length - 1) return;
    if (!this.spend(CONFIG.backpack.cost[this.backpackLv + 1])) return;
    this.backpackLv++;
    UI.toast(`가방 확장! 알 ${this.carryMax()}개까지`, '#b45cff');
    Sfx.play('buy'); UI.refresh();
  },
  upgradeTreadmill(kind) {
    const cfg = TREADMILL_BY_ID[kind];
    const tm = World.treadmills.filter(t => t.i < this.treadmillSlots)
      .find(t => TREADMILL_BY_ID[t.kind].mult < cfg.mult);
    if (!tm) { UI.toast('전부 이미 그 등급 이상이야', '#ff9f43'); return; }
    if (!this.spend(cfg.cost)) return;
    tm.kind = kind;
    UI.toast(`${cfg.name} 설치! (슬롯 ${tm.i + 1})`, cfg.frame);
    Sfx.play('buy'); UI.refresh();
  },

  /* ---------- 튜토리얼 ---------- */
  checkTutorial() {
    const s = TUTORIAL[this.tutorial];
    if (!s) return;
    let done = false;
    switch (s.id) {
      case 'move': done = (this._moved || 0) > 240; break;
      case 'goFarm': done = World.zoneAt(this.player.x, this.player.y)?.id === 'farm'; break;
      case 'steal': done = this.stolen > 0; break;
      case 'deliver': done = World.incubators.some(i => i.egg) || this.hatched > 0; break;
      case 'hatch': done = this.hatched > 0; break;
      case 'place': done = World.treadmills.some(t => t.pet); break;
      case 'buy': done = this.treadmillSlots > 1 || this.unlocked.pond; break;
      case 'boss': done = this.bossKills > 0; break;
    }
    if (!done) return;
    this.tutorial++;
    UI.refresh();
    if (this.tutorial >= TUTORIAL.length) {
      UI.toast('튜토리얼 완료! 이제 제국을 세워봐 👑', '#ffd54a');
      Sfx.play('rare');
    } else Sfx.play('ready');
  },

  tutorialTarget() {
    const s = TUTORIAL[this.tutorial];
    if (!s) return null;
    const z = World.zoneDef('farm');
    switch (s.id) {
      case 'goFarm': return { x: z.x + 200, y: World.corridor.y + 70 };
      case 'steal': {
        let bm = null, bd = 1e9;
        for (const m of this.mobs) {
          if (m.zone !== 'farm' || !m.hasEgg) continue;
          const d = dist2(m.x, m.y, this.player.x, this.player.y);
          if (d < bd) { bd = d; bm = m; }
        }
        return bm;
      }
      case 'deliver': return World.incubators[0];
      case 'hatch': return World.incubators.find(i => i.egg) || World.incubators[0];
      case 'place': return World.treadmills[0];
      case 'buy': return World.shop;
      case 'boss': return this.bosses.find(b => b.zone === 'farm' && b.eggsLeft > 0);
    }
    return null;
  },

  nearestBoss() {
    let b = null, bd = 620;
    for (const q of this.bosses) {
      if (!this.unlocked[q.zone]) continue;
      const d = dist(q.x, q.y, this.player.x, this.player.y);
      if (d < bd) { bd = d; b = q; }
    }
    return b;
  },

  /* ================= 렌더 ================= */
  render() {
    const ctx = this.ctx, t = this.time;
    const S = this.cam.scale * this.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0b0e16';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const sh = UI.shakeAmt;
    const ox = this.canvas.width / 2 - this.cam.x * S + (sh ? rand(-10, 10) * sh : 0);
    const oy = this.canvas.height / 2 - this.cam.y * S + (sh ? rand(-10, 10) * sh : 0);
    ctx.setTransform(S, 0, 0, S, ox, oy);

    ctx.drawImage(World.ground, 0, 0);

    for (const z of World.zones) {
      if (z.id === 'base' || !this.unlocked[z.id]) continue;
      if (z.fog) { ctx.fillStyle = z.fog; ctx.fillRect(z.x, z.y, z.w, z.h); }
    }

    for (const g of World.gates) {
      if (this.unlocked[g.zone]) continue;
      const z = ZONE_BY_ID[g.zone];
      const grd = ctx.createLinearGradient(g.x, 0, g.x + g.w, 0);
      grd.addColorStop(0, 'rgba(255,80,80,0.10)');
      grd.addColorStop(0.5, `rgba(255,80,80,${0.45 + Math.sin(t * 4) * 0.15})`);
      grd.addColorStop(1, 'rgba(255,80,80,0.10)');
      ctx.fillStyle = grd; ctx.fillRect(g.x, g.y, g.w, g.h);
      ctx.strokeStyle = '#ff5a5a'; ctx.lineWidth = 3; ctx.strokeRect(g.x, g.y, g.w, g.h);
      outlineText(ctx, '🔒 ' + z.name, g.x + g.w / 2, g.y - 30, 19, '#ffd54a', '#000');
      outlineText(ctx, fmtMoney(z.cost) + '원', g.x + g.w / 2, g.y - 8, 15, '#fff', '#000');
      outlineText(ctx, '[E] 해금', g.x + g.w / 2, g.y + g.h + 16, 14, '#8ed2ff', '#000');
    }

    const list = [];
    for (const p of World.props) {
      if (p.type === 'fenceLine') { Draw.prop(ctx, p, t); continue; }
      list.push({ y: p.y, f: () => Draw.prop(ctx, p, t) });
    }
    for (const inc of World.incubators) {
      if (inc.i >= this.incubatorSlots) continue;
      list.push({ y: inc.y, f: () => Draw.incubator(ctx, inc, t) });
    }
    for (const tm of World.treadmills) {
      if (tm.i >= this.treadmillSlots) continue;
      list.push({ y: tm.y, f: () => Draw.treadmill(ctx, tm, t) });
    }
    const vis = 1000 / this.cam.scale;
    for (const m of this.mobs) {
      if (!this.unlocked[m.zone] || m.hidden > 0) continue;
      if (Math.abs(m.x - this.cam.x) > vis || Math.abs(m.y - this.cam.y) > vis) continue;
      list.push({ y: m.y, f: () => Draw.creature(ctx, m, t) });
    }
    for (const b of this.bosses) {
      if (!this.unlocked[b.zone] || b.cooldownT > 0) continue;
      if (Math.abs(b.x - this.cam.x) > vis + 300) continue;
      list.push({ y: b.y, f: () => Draw.creature(ctx, b, t) });
    }
    const p = this.player;
    list.push({
      y: p.y, f: () => Draw.avatar(ctx, {
        x: p.x, y: p.y, facing: p.facing, phase: p.phase, moving: p.moving,
        shirt: p.shirt, hatColor: p.hatColor,
        carry: this.carrying.length > 0, stunned: p.stun > 0
      })
    });
    list.sort((a, b) => a.y - b.y);
    for (const it of list) it.f();

    /* 잠긴 구역은 내용물까지 어둡게 */
    for (const z of World.zones) {
      if (z.id === 'base' || this.unlocked[z.id]) continue;
      ctx.fillStyle = 'rgba(6,8,16,0.70)';
      ctx.fillRect(z.x, z.y, z.w, z.h);
    }

    /* 보스 쿨다운 표시 */
    for (const b of this.bosses) {
      if (!this.unlocked[b.zone] || b.cooldownT <= 0) continue;
      if (Math.abs(b.x - this.cam.x) > vis) continue;
      outlineText(ctx, `${b.cfg.name} 재등장까지`, b.x, b.y - 40, 15, '#9aa7b8', '#000');
      outlineText(ctx, fmtTime(b.cooldownT), b.x, b.y - 18, 20, '#ffd54a', '#000');
    }

    if (this.carrying.length) {
      const e = this.carrying[0];
      Draw.egg(ctx, p.x, p.y - 54 + Math.sin(t * 3) * 1.5, 20, e.rarity, e.variant, t, true);
      if (this.carrying.length > 1) outlineText(ctx, 'x' + this.carrying.length, p.x + 19, p.y - 64, 14, '#fff', '#000');
    }

    if (this.stealing) {
      const m = this.stealing.mob;
      const danger = m.state === 'warn' || m.state === 'look';
      const top = m.y - (m.boss ? 150 : 82);
      Draw.bar(ctx, m.x, top, 92, 11, this.stealing.progress, danger ? '#ff4d4d' : '#39ff9a');
      const msg = m.boss
        ? (m.state === 'look' ? '멈춰!! 움직이면 죽는다' : danger ? '손 떼고 멈춰!' : '훔치는 중...')
        : (danger ? '손 떼!!' : '훔치는 중...');
      outlineText(ctx, msg, m.x, top - 19, 15, danger ? '#ff4d4d' : '#fff', '#000');
    }

    if (this.target && !this.stealing) {
      const tg = this.target;
      const y = tg.kind === 'mob' && tg.ref.boss
        ? tg.y + 38
        : tg.y - (tg.kind === 'mob' ? 78 : tg.kind === 'shop' ? 112 : 84);
      const label = ` [E] ${tg.label} `;
      ctx.save();
      ctx.font = '800 15px "Pretendard",system-ui,sans-serif';
      const w = ctx.measureText(label).width + 14;
      roundRect(ctx, tg.x - w / 2, y - 15, w, 29, 9);
      ctx.fillStyle = 'rgba(10,12,18,0.88)'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.stroke();
      outlineText(ctx, label, tg.x, y, 15, '#fff', 'rgba(0,0,0,0)');
      ctx.restore();
    }

    const tt = this.tutorialTarget();
    if (tt) {
      const a = Math.atan2(tt.y - p.y, tt.x - p.x);
      if (dist(p.x, p.y, tt.x, tt.y) > 100) {
        const rr = 66 + Math.sin(t * 5) * 8;
        ctx.save();
        ctx.translate(p.x + Math.cos(a) * rr, p.y - 40 + Math.sin(a) * rr);
        ctx.rotate(a);
        ctx.fillStyle = '#ffd54a'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(17, 0); ctx.lineTo(-10, -13); ctx.lineTo(-4, 0); ctx.lineTo(-10, 13);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
    }

    for (const q of this.particles) {
      const a = clamp(q.life / q.max, 0, 1);
      ctx.save(); ctx.globalAlpha = a;
      if (q.box) { ctx.fillStyle = q.color; ctx.fillRect(q.x, q.y, q.size, q.size); }
      else outlineText(ctx, q.text, q.x, q.y, q.size, q.color, '#000');
      ctx.restore();
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.renderMinimap();
  },

  renderMinimap() {
    const mm = UI.minimap; if (!mm) return;
    const g = mm.getContext('2d');
    const W = mm.width, H = mm.height;
    const sx = W / World.w, sy = H / World.h;
    g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(12,15,22,0.9)'; g.fillRect(0, 0, W, H);
    for (const z of World.zones) {
      const un = z.id === 'base' || this.unlocked[z.id];
      g.fillStyle = un ? z.floor : '#2a2f3a';
      g.fillRect(z.x * sx, z.y * sy, z.w * sx, z.h * sy);
      if (!un) { g.fillStyle = 'rgba(255,80,80,0.30)'; g.fillRect(z.x * sx, z.y * sy, z.w * sx, z.h * sy); }
    }
    g.fillStyle = 'rgba(200,170,120,0.7)';
    g.fillRect((World.base.x + World.base.w) * sx, World.corridor.y * sy,
      (World.w - World.base.x - World.base.w) * sx, World.corridor.h * sy);
    for (const b of this.bosses) {
      if (!this.unlocked[b.zone]) continue;
      g.fillStyle = b.cooldownT > 0 ? '#555' : '#ffd54a';
      g.fillRect(b.x * sx - 2.5, b.y * sy - 2.5, 5, 5);
    }
    const p = this.player;
    g.fillStyle = '#ff3b3b';
    g.beginPath(); g.arc(p.x * sx, p.y * sy, 3.6, 0, 7); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 1.4; g.stroke();
  },

  loop() {
    const t = now();
    let dt = Math.min(t - this.lastT, 0.05);
    this.lastT = t;
    Input.update();
    if (this.player.moving) this._moved = (this._moved || 0) + CONFIG.player.speed * dt;
    this.update(dt);
    UI.tick(dt);
    this.render();
    UI.fastRefresh();
    requestAnimationFrame(() => this.loop());
  }
};
