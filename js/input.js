/* =========================================================
 *  input.js - 키보드 / 터치 조이스틱
 * ========================================================= */
const Input = {
  keys: {}, dirX: 0, dirY: 0, action: false,
  stick: { active: false, id: null, bx: 0, by: 0, dx: 0, dy: 0 },

  init(canvas) {
    addEventListener('keydown', e => {
      if (e.repeat) { return; }
      const k = e.key.toLowerCase();
      this.keys[k] = true;
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
      if (k === 'e' || k === ' ') { this.action = true; Game.interact(); }
      if (k === 'b') UI.openShop('zone');
      if (k === 'i' || k === 'tab') { e.preventDefault(); UI.openPets(); }
      if (k === 'h' || k === '?' || k === '/') UI.openHelp();
      if (k === 'escape') UI.closeModal();
    });
    addEventListener('keyup', e => {
      const k = e.key.toLowerCase();
      this.keys[k] = false;
      if (k === 'e' || k === ' ') this.action = false;
    });
    addEventListener('blur', () => { this.keys = {}; this.action = false; });

    /* 터치 조이스틱 */
    const stick = document.getElementById('stick');
    const knob = document.getElementById('knob');
    const area = document.getElementById('touchLeft');
    const setStick = (x, y) => {
      const dx = x - this.stick.bx, dy = y - this.stick.by;
      const d = Math.hypot(dx, dy), max = 56;
      const k = d > max ? max / d : 1;
      this.stick.dx = dx * k; this.stick.dy = dy * k;
      knob.style.transform = `translate(${this.stick.dx}px, ${this.stick.dy}px)`;
    };
    const start = (x, y, id) => {
      this.stick.active = true; this.stick.id = id;
      this.stick.bx = x; this.stick.by = y;
      stick.style.left = x + 'px'; stick.style.top = y + 'px';
      stick.classList.add('on');
      setStick(x, y);
    };
    const end = () => {
      this.stick.active = false; this.stick.id = null;
      this.stick.dx = this.stick.dy = 0;
      knob.style.transform = 'translate(0,0)';
      stick.classList.remove('on');
    };
    if (area) {
      area.addEventListener('touchstart', e => {
        const t = e.changedTouches[0];
        start(t.clientX, t.clientY, t.identifier); e.preventDefault();
      }, { passive: false });
      area.addEventListener('touchmove', e => {
        for (const t of e.changedTouches) if (t.identifier === this.stick.id) setStick(t.clientX, t.clientY);
        e.preventDefault();
      }, { passive: false });
      const stop = e => {
        for (const t of e.changedTouches) if (t.identifier === this.stick.id) end();
      };
      area.addEventListener('touchend', stop);
      area.addEventListener('touchcancel', stop);
    }

    const ab = document.getElementById('abtn');
    if (ab) {
      const down = e => { e.preventDefault(); this.action = true; ab.classList.add('on'); Game.interact(); };
      const up = e => { e.preventDefault(); this.action = false; ab.classList.remove('on'); };
      ab.addEventListener('touchstart', down, { passive: false });
      ab.addEventListener('touchend', up);
      ab.addEventListener('touchcancel', up);
      ab.addEventListener('mousedown', down);
      addEventListener('mouseup', up);
    }
  },

  update() {
    let x = 0, y = 0;
    const k = this.keys;
    if (k['a'] || k['arrowleft'])  x -= 1;
    if (k['d'] || k['arrowright']) x += 1;
    if (k['w'] || k['arrowup'])    y -= 1;
    if (k['s'] || k['arrowdown'])  y += 1;
    if (this.stick.active) {
      x = this.stick.dx / 56;
      y = this.stick.dy / 56;
      if (Math.hypot(x, y) < 0.18) { x = 0; y = 0; }
    }
    this.dirX = x; this.dirY = y;
  }
};
