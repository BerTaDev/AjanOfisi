// Ajanlar: hareket, konuşma balonları, iptal edilebilir davranış planları
'use strict';
const CANCEL = { cancelled: true };
const TIMERS = [];
let AGENT_SEQ = 0;

const STATUS = {
  working: { label: 'Çalışıyor', col: 'var(--work)' },
  thinking: { label: 'Düşünüyor', col: 'var(--work)' },
  waiting: { label: 'Onay bekliyor', col: 'var(--wait)' },
  meeting: { label: 'Toplantıda', col: 'var(--sub)' },
  supervise: { label: 'Ekibi yönetiyor', col: 'var(--sub)' },
  phone: { label: 'Telefonda', col: 'var(--wait)' },
  break: { label: 'Molada', col: 'var(--rest)' },
  idle: { label: 'Boşta', col: 'var(--muted)' },
  sleeping: { label: 'Uyuyor', col: 'var(--sleep)' },
  arriving: { label: 'Geliyor', col: 'var(--sub)' },
  leaving: { label: 'Gidiyor', col: 'var(--muted)' },
  done: { label: 'İşi bitti', col: 'var(--work)' },
};

class Agent {
  constructor(o) {
    this.uid = ++AGENT_SEQ;
    this.id = o.id || 'a' + this.uid;
    this.name = o.name || 'Ajan';
    this.role = o.role || '';
    this.kind = o.kind || 'main';           // main | sub
    this.parent = o.parent || null;
    this.seed = o.seed != null ? o.seed : this.uid * 31;
    this.look = o.look || makeLook(this.seed);
    this.color = this.look.shirt;
    this.badge = this.kind === 'sub' ? '#62aee8' : null;
    this.x = 0; this.y = 0; this.dir = 'down'; this.pose = 'stand';
    this.frame = 0; this.ft = 0; this.path = []; this.speed = 34;
    this.spot = null; this.desk = null; this.seated = false;
    this.screen = 'idle'; this.typing = false; this.phone = false; this.mug = false; this.armsUp = false; this.wave = false;
    this.sleeping = false; this.visible = true; this.removed = false;
    this.status = 'idle'; this.action = ''; this.icon = null; this.bubble = null;
    this.tok = 0; this._arrive = null; this.phoneRing = 0; this.blanket = pick(['#c9b8e8', '#f2c48d', '#9fd0c4', '#e8a7b5']);
    this.history = [];
    this.task = null;
    this.lastSpoke = -99;
  }

  // ---- yerleşim ----
  place(spot) {
    this.path = []; this._arrive = null;
    this.x = spot.x; this.y = spot.y; this.dir = spot.dir || 'down';
    this.pose = spot.pose || 'stand';
    if (spot.by !== undefined) claim(spot, this);
    this.seated = this.pose === 'sit' && spot === this.desk;
    this.laptop = spot === this.desk && !SPOTS.desks.includes(spot);
  }
  tile() { return { tx: clamp(Math.floor(this.x / T), 0, COLS - 1), ty: clamp(Math.floor((this.y - 2) / T), 0, ROWS - 1) }; }

  walkTo(target, done) {
    this.seated = false; this.typing = false; this.phone = false; this.armsUp = false;
    this.laptop = false; this.handheld = false; this.music = false; this.headphones = false; this.rage = 0; this.slice = false;
    if (this.sleeping) this.sleeping = false;
    if (target.by !== undefined) claim(target, this); else release(this);
    let { tx, ty } = this.tile();
    if (BLOCK[ty] && BLOCK[ty][tx]) {
      // masa/koltuk içindeysek en yakın boş karoya çık
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, 1]]) if (!BLOCK[ty + dy] || !BLOCK[ty + dy][tx + dx]) { tx += dx; ty += dy; break; }
    }
    const p = target.tx != null ? findPath(tx, ty, target) : null;
    this.path = (p || []).map(n => ({ x: n.tx * T + 8, y: n.ty * T + 10 }));
    if (this.path.length) this.path.pop();
    this.path.push({ x: target.x, y: target.y });
    this._target = target;
    this._arrive = done;
    this.pose = 'walk';
  }

  // ---- iptal edilebilir plan ----
  run(fn) {
    const tok = ++this.tok;
    if (this.pose === 'walk') { this.path = []; this.pose = 'stand'; }
    this._arrive = null;
    const self = this;
    const chk = () => { if (tok !== self.tok || self.removed) throw CANCEL; };
    const api = {
      chk,
      go: async target => { chk(); if (!target) return; await new Promise(res => self.walkTo(target, res)); chk(); },
      wait: async s => { chk(); await new Promise(res => TIMERS.push({ at: G.time + s, res })); chk(); },
      say: async (text, s, kind) => { chk(); self.say(text, kind, s); await api.wait(s || 2.6); },
      face: dir => { self.dir = dir; },
    };
    return Promise.resolve().then(() => fn(api)).then(() => tok === self.tok && !self.removed, e => { if (e !== CANCEL) console.error(e); return false; });
  }

  // ---- konuşma / durum ----
  say(text, kind, dur) {
    if (!text) return;
    text = shortText(text, kind === 'think' ? 110 : 160);
    const d = dur || clamp(1.6 + text.length * 0.055, 2.4, 7);
    this.bubble = { text, kind: kind || 'say', born: G.time, until: G.time + d };
    this.lastSpoke = G.time;
    Sfx.say(this, text, kind);
    if (window.UI) UI.chat(this, text, kind || 'say');
  }
  setIcon(name, col, dur, bg) { this.icon = { name, col: col || '#2a1f2a', bg, until: dur ? G.time + dur : Infinity }; }
  clearIcon() { this.icon = null; }
  setStatus(s, action) {
    this.status = s;
    if (action != null) this.action = action;
  }
  logAction(text) {
    this.action = text;
    this.history.unshift({ t: new Date(), text });
    if (this.history.length > 40) this.history.pop();
    if (window.UI) UI.event(this, text);
  }

  // ---- güncelleme ----
  update(dt) {
    if (this.path.length) {
      const n = this.path[0];
      const dx = n.x - this.x, dy = n.y - this.y, d = Math.hypot(dx, dy);
      const sp = this.speed * dt;
      if (d <= sp) { this.x = n.x; this.y = n.y; this.path.shift(); }
      else {
        this.x += dx / d * sp; this.y += dy / d * sp;
        if (Math.abs(dx) > Math.abs(dy) * 0.8) this.dir = dx > 0 ? 'right' : 'left';
        else this.dir = dy > 0 ? 'down' : 'up';
      }
      this.ft += dt;
      if (this.ft > 0.13) { this.ft = 0; this.frame++; if (this.frame % 2 === 0 && this.visible) Sfx.step(this); }
      if (!this.path.length) {
        const tg = this._target || {};
        this.pose = tg.pose || 'stand';
        this.dir = tg.dir || this.dir;
        this.seated = this.pose === 'sit' && tg === this.desk;
        Sfx.arrive(this, tg);
        const cb = this._arrive; this._arrive = null;
        if (cb) cb();
      }
    }
    if (this.bubble && G.time > this.bubble.until) this.bubble = null;
    if (this.icon && G.time > this.icon.until) this.icon = null;
  }

  // ---- hazır davranışlar ----
  needDesk(near) {
    if (this.desk) return this.desk;
    if (this.prefLaptop && !near) {
      // bazıları puf minderde laptopla çalışmayı sever
      const l = SPOTS.laptop.find(s => !s.by && !s.owner && twinFree(s, this));
      if (l) { l.owner = this; this.desk = l; return l; }
    }
    const free = SPOTS.desks.filter(s => !s.by && !s.owner);
    const nearTo = near || (this.parentAgent && this.parentAgent.desk);
    if (nearTo && free.length) free.sort((p, q) => dist(p, nearTo) - dist(q, nearTo));
    const d = (free.length ? (nearTo ? free[0] : pick(free)) : null)
      || SPOTS.laptop.find(s => !s.by && !s.owner && twinFree(s, this))
      || SPOTS.meetTop.concat(SPOTS.meetBottom).find(s => !s.by && !s.owner);
    if (d) { d.owner = this; this.desk = d; }
    return d;
  }
  freeDesk() { if (this.desk) { if (this.desk.owner === this) this.desk.owner = null; if (this.desk.by === this) this.desk.by = null; this.desk = null; } }
  atDesk() { return this.desk && this.seated && dist(this, this.desk) < 2; }

  async goWork(api) {
    const d = this.needDesk();
    if (!d) return;
    if (!this.atDesk()) await api.go(d);
    this.seated = true; this.pose = d.pose; this.dir = d.dir;
    this.laptop = !SPOTS.desks.includes(d);
  }

  async sleepSomewhere(api, allowDesk) {
    const s = freeSpot(SPOTS.sleep, this);
    if (s) {
      this.setStatus('sleeping', 'Kestiriyor');
      await api.go(s);
      this.sleeping = true;
      this.pose = s.pose;
    } else if (allowDesk && this.desk) {
      await this.goWork(api);
      const lap = !SPOTS.desks.includes(this.desk);
      this.laptop = false;
      this.pose = lap ? this.desk.pose : 'deskSleep'; this.sleeping = true; this.setStatus('sleeping', lap ? 'Laptopun başında sızdı' : 'Masada sızdı');
    } else return;
    this.screen = 'off';
  }

  async wakeUp(api, line) {
    if (!this.sleeping) return;
    this.sleeping = false;
    this.setStatus('idle', 'Yeni uyandı');
    this.setIcon('excl', '#e07a55', 1.6);
    Sfx.wake(this.x);
    if (this.pose === 'lie' || this.pose === 'bean' || this.pose === 'deskSleep') {
      const sp = this.spot;
      this.pose = 'stand';
      if (sp && sp.kind) { this.y = sp.y + 4; this.dir = 'down'; }
    }
    await api.wait(0.5);
    this.armsUp = true;
    await api.say(line || pick(LINES.wake), 1.8);
    this.armsUp = false;
  }

  async leave(api, line) {
    this.setStatus('leaving', 'Ofisten çıkıyor');
    if (line) this.say(line);
    this.freeDesk();
    await api.go(SPOTS.door);
    Sfx.door(false);
    World.doorOpen = G.time + 2;
    await api.go(SPOTS.outside);
    this.visible = false;
    this.removed = true;
    release(this);
  }

  async arrive(api, target) {
    this.x = SPOTS.outside.x; this.y = SPOTS.outside.y; this.dir = 'up'; this.visible = true;
    this.setStatus('arriving', 'Kapıdan giriyor');
    World.doorOpen = G.time + 2.5;
    Sfx.door(true);
    await api.go(SPOTS.door);
    if (target) await api.go(target);
  }

  async phoneCall(api, line, secs) {
    await this.goWork(api);
    this.phoneRing = 0;
    this.phone = true; this.setStatus('phone');
    this.setIcon('phone', '#2a1f2a', secs || 3);
    World.lobbyRing = G.time + 2.2;
    Sfx.ring();
    await api.say(line, secs || 3);
    this.phone = false;
  }
}

const LINES = {
  wake: ['Ha? Uyumuyordum!', 'Geldim geldim…', 'Beş dakika daha…', 'Tamam, kalktım!', 'Kahve lazım. Hemen.', 'Ne kaçırdım?'],
};

// konuşma balonu çakışmalarını önlemek için yardımcı
function bubbleRects(list) {
  list.sort((a, b) => a.y - b.y);
  for (let i = 0; i < list.length; i++) for (let j = 0; j < i; j++) {
    const a = list[i], b = list[j];
    if (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y) a.y = b.y + b.h + 4;
  }
  return list;
}
