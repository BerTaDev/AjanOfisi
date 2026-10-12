// Ofis kedisi Tırmık: açlık/susuzluk, mama-su kapları, lazer kovalama, sevilme, monitör işgali
'use strict';
const BOWL = {
  food: { tx: 26, ty: 8, stand: { tx: 26, ty: 7, x: 26 * T + 8, y: 7 * T + 11, dir: 'down', pose: 'stand', by: null } },
  water: { tx: 27, ty: 8, stand: { tx: 27, ty: 7, x: 27 * T + 8, y: 7 * T + 11, dir: 'down', pose: 'stand', by: null } },
};
const CAT_TREE = { tx: 1, ty: 13, from: { tx: 2, ty: 13 }, perch: { x: 1 * T + 8, y: 13 * T - 13 } };

const Cat = {
  name: 'Tırmık',
  x: 4 * T + 8, y: 16 * T + 10, dir: 'right', state: 'sleep', path: [], until: 0, frame: 0, ft: 0, say: null,
  hunger: 0.35, thirst: 0.25, need: null, needSince: 0, onDesk: null, perched: false, hop: null, speed: 22, next: 'sit',

  speak(text, dur) { this.say = { text, until: G.time + (dur || 2.5) }; },

  goTile(tx, ty, next, cb) {
    if (ty >= ROWS - 1) ty = ROWS - 2;
    const p = findPath(clamp(Math.floor(this.x / T), 0, COLS - 1), clamp(Math.floor(this.y / T), 0, ROWS - 1), { tx, ty });
    if (!p) { this.until = G.time + 2; return false; }
    if (!p.length) { this.state = next || 'sit'; this.until = G.time + rand(8, 20); if (cb) cb(); return true; }
    this.path = p.map(n => ({ x: n.tx * T + 8, y: n.ty * T + 10 }));
    this.state = 'walk'; this.next = next || 'sit'; this.onArrive = cb || null;
    this.speed = 22;
    return true;
  },

  hopTo(x, y, cb) { this.hop = { x0: this.x, y0: this.y, x1: x, y1: y, t: 0, dur: 0.45, cb }; },

  depth() {
    if (this.onDesk) return (this.onDesk.ty) * T + 0.4;
    if (this.perched) return (CAT_TREE.ty + 1) * T + 0.5;
    return this.y + 0.2;
  },

  busy() { return this.hop || this.onDesk || this.state === 'chase' || this.state === 'eat' || this.state === 'drink' || this.state === 'petted'; },

  // sevilme: kalpler, mırlama
  pet(by) {
    if (this.hop || this.state === 'chase') return;
    if (!this.onDesk && !this.perched && this.state !== 'eat' && this.state !== 'drink') { this.path = []; this.state = 'petted'; this.until = G.time + 3.5; }
    for (let i = 0; i < 5; i++) World.hearts.push({ x: this.x + rand(-6, 6), y: this.y - 10 - i * 3, t: G.time + i * 0.18 });
    this.speak(pick(['mrrr', 'prrr…', 'mrrrau', '♡']), 2.4);
    Sfx.purr(this.x);
    if (!by && G.time - (this.lastUserPet || -99) > 25) { this.lastUserPet = G.time; UI.sys('Tırmık\'ı sevdin. Mırlıyor.'); }
  },

  update(dt) {
    this.hunger = Math.min(1, this.hunger + dt / 300);
    this.thirst = Math.min(1, this.thirst + dt / 240);
    this.ft += dt;
    if (this.say && G.time > this.say.until) this.say = null;

    if (this.hop) {
      const h = this.hop; h.t += dt;
      const k = Math.min(1, h.t / h.dur);
      this.x = lerp(h.x0, h.x1, k); this.y = lerp(h.y0, h.y1, k) - Math.sin(k * Math.PI) * 10;
      this.dir = h.x1 >= h.x0 ? 'right' : 'left';
      if (k >= 1) { this.hop = null; if (h.cb) h.cb(); }
      return;
    }
    if (this.state === 'chase') {
      const L = World.laser;
      if (!L) { this.state = 'sit'; this.until = G.time + 3; this.speak('?', 2); return; }
      const dx = L.x - this.x, dy = L.y + 2 - this.y, d = Math.hypot(dx, dy);
      // yakalayacak gibi olunca zıplar
      if (d < 7 && G.time - (this.pounceAt || 0) > 1.4) { this.pounceAt = G.time; if (chance(0.4)) this.speak(pick(['!', 'hap!', 'mrrp!']), 1); this.hop = { x0: this.x, y0: this.y, x1: L.x + rand(-5, 5), y1: L.y + 2, t: 0, dur: 0.3, cb: null }; return; }
      if (d > 2) { const sp = Math.min(d, 68 * dt); this.x += dx / d * sp; this.y += dy / d * sp; if (Math.abs(dx) > 0.5) this.dir = dx > 0 ? 'right' : 'left'; }
      if (this.ft > 0.08) { this.ft = 0; this.frame++; }
      return;
    }
    if (this.path.length) {
      const n = this.path[0];
      const dx = n.x - this.x, dy = n.y - this.y, d = Math.hypot(dx, dy);
      const sp = this.speed * dt;
      if (d <= sp) { this.x = n.x; this.y = n.y; this.path.shift(); }
      else { this.x += dx / d * sp; this.y += dy / d * sp; if (Math.abs(dx) > 0.3) this.dir = dx > 0 ? 'right' : 'left'; }
      if (this.ft > (this.speed > 30 ? 0.07 : 0.14)) { this.ft = 0; this.frame++; }
      if (!this.path.length) {
        this.state = this.next || 'sit'; this.until = G.time + rand(8, 20);
        const cb = this.onArrive; this.onArrive = null;
        if (cb) cb();
      }
      return;
    }
    if (this.state === 'eat' || this.state === 'drink') {
      if (G.time > this.until) {
        const k = this.state === 'eat' ? 'food' : 'water';
        World.bowls[k] = Math.max(0, World.bowls[k] - 0.35);
        if (k === 'food') this.hunger = 0; else this.thirst = 0;
        this.state = 'sit'; this.until = G.time + rand(3, 6);
        this.speak(k === 'food' ? pick(['mmm…', 'nom nom', 'mrrr, doydum']) : pick(['şlap şlap', 'oh be']), 2.2);
      }
      return;
    }
    if (this.state === 'beg') {
      const k = this.need;
      if (k && World.bowls[k] > 0.3) { this.need = null; this.state = k === 'food' ? 'eat' : 'drink'; this.until = G.time + 5; return; }
      if (G.time > this.until) { this.until = G.time + rand(4, 7); this.speak(pick(['Miyaaav!', 'MİYAV!', 'miyav…?']), 2.2); Sfx.meow(this.x); }
      return;
    }
    if (this.onDesk) {
      const a = this.onDesk.agent;
      if (G.time > this.until || !a || a.removed) this.leaveDesk();
      return;
    }
    if (G.time < this.until) return;
    this.decide();
  },

  decide() {
    if (this.perched) { this.perched = false; this.hopTo(CAT_TREE.from.tx * T + 8, CAT_TREE.from.ty * T + 10, () => { this.state = 'sit'; this.until = G.time + 1; }); return; }
    if (this.hunger > 0.75) return this.seekBowl('food');
    if (this.thirst > 0.75) return this.seekBowl('water');
    if (World.pizzaUntil > G.time && chance(0.6)) {
      return this.goTile(7, 4, 'sit', () => {
        this.dir = 'left'; this.speak('Miyav? (pizza?)', 3); Sfx.meow(this.x);
        const eater = G.agents.find(a => a.slice && !a.removed);
        if (eater) TIMERS.push({ at: G.time + 2.5, res: () => eater.say(pick(['Tırmık, pizza sana göre değil!', 'Bakma öyle, vermiyorum.', 'Peki, bir parça peynir… olmaz!'])) });
      });
    }
    const night = World.nightLevel() > 0.3;
    const r = Math.random();
    const sleepers = G.agents.filter(a => a.sleeping && a.visible);
    const typers = G.agents.filter(a => a.seated && a.typing && !a.sleeping && a.desk && SPOTS.desks.includes(a.desk) && a.visible);
    if (r < 0.14) return this.goTile(4, 16, 'sleep');
    if (r < 0.26) return this.climbTree();
    if (r < 0.38 && sleepers.length) { const s = pick(sleepers); return this.goTile(clamp(Math.floor(s.x / T), 1, COLS - 2), clamp(Math.floor(s.y / T) + 1, 2, ROWS - 2), 'sleep'); }
    if (r < 0.5 && typers.length) return this.jumpOnDesk(pick(typers));
    if (r < 0.58 || (night && r < 0.66)) return this.zoomies();
    if (r < 0.68) return this.goTile(randi(13, 18), 2, 'sit', () => { this.dir = 'right'; });
    if (r < 0.78) return this.goTile(randi(23, 27), randi(4, 7), 'sit');
    let tx = randi(10, 21), ty = randi(7, 9);
    if (BLOCK[ty][tx]) { this.until = G.time + 2; return; }
    this.goTile(tx, ty, 'sit');
    if (chance(0.25)) { const w = pick(['miyav', 'mrrr', 'miyav?', 'prrr']); this.speak(w); if (w.startsWith('m')) Sfx.meow(this.x); else Sfx.purr(this.x); }
  },

  seekBowl(kind) {
    const b = BOWL[kind];
    this.goTile(b.tx, b.ty, 'sit', () => {
      this.x = b.tx * T + 8; this.y = b.ty * T + 9; this.dir = kind === 'food' ? 'right' : 'left';
      if (World.bowls[kind] > 0.05) { this.state = kind === 'food' ? 'eat' : 'drink'; this.until = G.time + 5; }
      else { this.state = 'beg'; this.need = kind; this.needSince = G.time; this.until = G.time + 0.3; }
    });
  },

  climbTree() {
    this.goTile(CAT_TREE.from.tx, CAT_TREE.from.ty, 'sit', () => {
      this.hopTo(CAT_TREE.perch.x, CAT_TREE.perch.y, () => { this.perched = true; this.state = chance(0.6) ? 'sleep' : 'sit'; this.until = G.time + rand(15, 35); });
    });
  },

  jumpOnDesk(agent) {
    const d = agent.desk;
    const cand = [[d.tx - 1, d.ty], [d.tx + 2, d.ty], [d.tx, d.ty + 1], [d.tx + 1, d.ty + 1]].find(([x, y]) => x > 0 && x < COLS - 1 && y < ROWS - 1 && !BLOCK[y][x]);
    if (!cand) { this.until = G.time + 2; return; }
    this.goTile(cand[0], cand[1], 'sit', () => {
      if (!agent.seated || agent.desk !== d) { this.until = G.time + 2; return; }
      const X0 = d.tx * T, Y0 = (d.ty - 1) * T;
      this.hopTo(X0 + 18, Y0 - 11, () => {
        this.onDesk = { agent, ty: d.ty, x: X0 };
        this.state = 'sit'; this.until = G.time + rand(8, 12); this.dir = 'right';
        agent.catScreen = G.time + 2.5;
        Sfx.meow(this.x);
        TIMERS.push({ at: G.time + 1.2, res: () => { if (!agent.removed && agent.seated) agent.say(pick(['Tırmık! Klavyeden in!', 'Ekranı kapatıyorsun Tırmık…', 'Yine mi monitörün üstündesin?', 'Commit mesajına "aaaaaaa" yazdın!'])); } });
      });
    });
  },

  leaveDesk() {
    const od = this.onDesk; this.onDesk = null;
    const a = od.agent;
    if (a && a.seated && !a.removed) a.say(pick(['Hadi in bakalım.', 'Tamam, aşağı.', 'Teşekkürler, yardımın için.']));
    const fx = clamp(Math.floor(this.x / T) + 1, 1, COLS - 2), fy = od.ty;
    const tx = BLOCK[fy][fx] ? fx - 2 : fx;
    this.hopTo(tx * T + 8, fy * T + 10, () => { this.state = 'sit'; this.until = G.time + rand(2, 5); });
  },

  zoomies() {
    const pts = [];
    for (let i = 0; i < 5; i++) {
      const tx = randi(10, 21), ty = randi(3, 16);
      if (!BLOCK[ty][tx]) pts.push({ tx, ty });
    }
    if (!pts.length) { this.until = G.time + 2; return; }
    let path = [], cx = Math.floor(this.x / T), cy = Math.floor(this.y / T);
    for (const p of pts) { const seg = findPath(cx, cy, p); if (seg) { path = path.concat(seg); cx = p.tx; cy = p.ty; } }
    this.path = path.map(n => ({ x: n.tx * T + 8, y: n.ty * T + 10 }));
    this.state = 'walk'; this.next = 'sit'; this.speed = 58;
    this.speak(pick(['!!!', 'VRRRM', 'zıııp!']), 1.6);
  },

  draw(g, t) {
    const X = Math.round(this.x), Y = Math.round(this.y);
    const c = '#e09a4f', d = '#b8743a';
    if (!this.onDesk && !this.perched && !this.hop) { g.globalAlpha = 0.25; R(g, X - 5, Y - 1, 10, 2, '#000'); g.globalAlpha = 1; }
    let p;
    const st = this.state;
    if (st === 'sleep' && !this.hop) {
      p = [[X - 5, Y - 5, 10, 5, c], [X - 6, Y - 6, 4, 4, c], [X - 6, Y - 7, 1, 1, c], [X - 3, Y - 7, 1, 1, c], [X + 3, Y - 3, 3, 2, d], [X - 1, Y - 5, 2, 1, d], [X + 2, Y - 4, 2, 1, d]];
    } else if ((st === 'eat' || st === 'drink') && !this.hop) {
      // başı kaba eğik, hafifçe sallanır
      const bob = Math.floor(t * 6) % 2;
      p = [[X - 5, Y - 7, 9, 4, c], [X - 4, Y - 3, 1, 3, d], [X + 2, Y - 3, 1, 3, d], [X + 3, Y - 5 + bob, 5, 4, c], [X + 3, Y - 6 + bob, 1, 1, c], [X + 7, Y - 6 + bob, 1, 1, c],
        [X - 7, Y - 10, 2, 4, c], [X - 2, Y - 7, 2, 1, d]];
    } else {
      const moving = st === 'walk' || st === 'chase' || this.hop;
      const f = moving ? this.frame % 2 : 0;
      p = [[X - 5, Y - 6, 9, 4, c], [X - 4, Y - 2, 1, 2 - f, d], [X - 1, Y - 2, 1, 1 + f, d], [X + 1, Y - 2, 1, 2 - f, d], [X + 3, Y - 2, 1, 1 + f, d],
        [X + 3, Y - 10, 5, 5, c], [X + 3, Y - 11, 1, 1, c], [X + 7, Y - 11, 1, 1, c], [X + 6, Y - 8, 1, 1, '#2a1f2a'],
        [X - 7, Y - 9 + (Math.floor(t * 2) % 2), 2, 4, c], [X - 2, Y - 6, 2, 1, d], [X + 1, Y - 6, 1, 1, d]];
      if (st === 'sit' || st === 'beg' || st === 'petted') p.push([X - 4, Y - 7, 7, 2, c]);
      if (this.onDesk) p.push([X - 7, Y - 5, 2, 9 + (Math.floor(t * 1.5) % 2), c]); // ekranın önüne sarkan kuyruk
      if (st === 'petted') { p.push([X + 5, Y - 8, 2, 1, '#2a1f2a']); }
    }
    if (this.dir === 'left') p = mirror(p, X);
    paint(g, p);
    if (st === 'beg' && this.need) drawIcon(g, this.need === 'food' ? 'fish' : 'drop', X + 4, Y - 22, this.need === 'food' ? '#e07a55' : '#3d8fd1');
  },

  label() {
    const mood = this.need === 'food' || this.hunger > 0.75 ? 'aç' : this.need === 'water' || this.thirst > 0.75 ? 'susamış'
      : { sleep: 'uyuyor', eat: 'mama yiyor', drink: 'su içiyor', chase: 'lazer kovalıyor', petted: 'seviliyor', beg: 'mama istiyor' }[this.state] || (this.onDesk ? 'monitörün üstünde' : 'keyfi yerinde');
    return `Tırmık (kedi) · ${mood}`;
  },
};

// ---------------- kediyle ilgili ofis olayları ----------------
const Fun = {
  nextLaser: 60, nextPet: 25, refill: null,

  freeAgent(a) {
    if (!a.visible || a.removed || a.sleeping || a.kind !== 'main' || a.pose === 'walk') return false;
    if (G.mode === 'demo') return a.mind === 'free';
    return a.rec && a.rec.mode === 'idle';
  },
  sleeper(a) {
    if (!a.visible || a.removed || !a.sleeping || a.kind !== 'main') return false;
    if (G.mode === 'demo') return a.mind === 'sleep';
    return a.rec && a.rec.mode === 'sleep';
  },

  // ajanı kısa bir işe gönder, bitince eski hâline dönsün
  errand(a, plan) {
    const wasAsleep = a.sleeping;
    if (G.mode === 'demo') a.mind = 'errand'; else if (a.rec) a.rec.mode = 'errand';
    return a.run(plan).then(ok => { if (ok) (G.mode === 'demo' ? Demo : Live).resume(a, wasAsleep); return ok; });
  },

  adjacentTo(x, y) {
    const tx = clamp(Math.floor(x / T), 1, COLS - 2), ty = clamp(Math.floor(y / T), 2, ROWS - 2);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1]]) {
      const nx = tx + dx, ny = ty + dy;
      if (nx > 0 && ny > 1 && nx < COLS - 1 && ny < ROWS - 1 && !BLOCK[ny][nx]) return { tx: nx, ty: ny, x: nx * T + 8, y: ny * T + 11, dir: dx > 0 ? 'left' : dx < 0 ? 'right' : dy > 0 ? 'up' : 'down', pose: 'stand' };
    }
    return null;
  },

  fill(kind, by) {
    World.bowls[kind] = 1;
    const b = BOWL[kind];
    const cols = kind === 'food' ? ['#a0623a', '#c9874f', '#7a4a2a'] : ['#9fd3e8', '#62aee8', '#ffffff'];
    for (let i = 0; i < 14; i++) World.confetti.push({ x: b.tx * T + 8 + rand(-3, 3), y: b.ty * T - 4 - rand(0, 6), vx: rand(-8, 8), vy: rand(10, 40), c: pick(cols), life: rand(0.4, 0.8), t: 0 });
    if (kind === 'water') Sfx.play('water', { x: b.tx * T }); else for (let i = 0; i < 4; i++) TIMERS.push({ at: G.time + i * 0.12, res: () => Sfx.play('pop', { x: b.tx * T, rate: 1.6 + Math.random() * 0.4, vol: 0.6 }) });
    if (Cat.need === kind && Cat.state === 'beg') { Cat.need = null; Cat.state = kind === 'food' ? 'eat' : 'drink'; Cat.until = G.time + 5; }
    if (!by) UI.sys(kind === 'food' ? 'Tırmık\'ın mama kabını doldurdun.' : 'Tırmık\'ın su kabını tazeledin.');
  },

  refillPlan(a, kind) {
    return async api => {
      if (a.sleeping) await a.wakeUp(api, pick(['Tamam Tırmık, kalktım…', 'Gece gece mama mı? Peki.']));
      a.setStatus('break', kind === 'food' ? 'Tırmık\'a mama veriyor' : 'Tırmık\'ın suyunu tazeliyor');
      await api.say(kind === 'food' ? pick(['Tırmık acıkmış, mamasını vereyim.', 'Mama kabı boş kalmış!', 'Geliyorum Tırmık, geliyorum.']) : pick(['Su kabı bitmiş, tazeleyeyim.', 'Tırmık susamış.']), 2);
      await api.go(BOWL[kind].stand);
      a.setIcon(kind === 'food' ? 'fish' : 'drop', kind === 'food' ? '#e07a55' : '#3d8fd1', 2);
      await api.wait(0.8);
      this.fill(kind, a);
      await api.wait(1);
      await api.say(pick(['Afiyet olsun Tırmık!', 'Buyur bakalım.', 'Doydun mu şimdi?']), 2);
    };
  },

  laserPlan(a) {
    return async api => {
      a.setStatus('break', 'Tırmık\'la oynuyor');
      const sp = this.adjacentTo(Cat.x + 24, Cat.y) || this.adjacentTo(Cat.x, Cat.y);
      if (sp) await api.go(sp);
      a.dir = Cat.x > a.x ? 'right' : 'left';
      await api.say('Tırmık! Bak, kırmızı nokta!', 2);
      if (Cat.busy() || Cat.need) return;
      Cat.path = []; Cat.perched = false; Cat.state = 'chase';
      World.laser = { x: Cat.x + 18, y: Cat.y - 2, tx: Cat.x + 18, ty: Cat.y - 2, by: a };
      a.wave = true;
      await api.wait(10);
      a.wave = false;
      World.laser = null;
      await api.say(pick(['Hahaha, yine yakalayamadı.', 'Tamam tamam, bugünlük bu kadar.', 'En iyi kedi sensin.']), 2.4);
    };
  },

  petPlan(a) {
    return async api => {
      a.setStatus('break', 'Tırmık\'ı seviyor');
      const sp = this.adjacentTo(Cat.x, Cat.y);
      if (!sp) return;
      await api.go(sp);
      a.dir = Cat.x > a.x ? 'right' : 'left';
      Cat.pet(a);
      await api.say(pick(['Kim güzel kedi? Sen!', 'Pati pati.', 'Mırlamaya başladı bile.']), 2.6);
    };
  },

  update(dt) {
    // lazer noktası rastgele noktalar arasında gezinir
    const L = World.laser;
    if (L) {
      const dx = L.tx - L.x, dy = L.ty - L.y, d = Math.hypot(dx, dy);
      if (d < 3) {
        const ox = L.by ? L.by.x : L.x, oy = L.by ? L.by.y : L.y;
        for (let i = 0; i < 8; i++) {
          const tx = clamp(Math.floor(ox / T) + randi(-4, 4), 1, COLS - 2), ty = clamp(Math.floor(oy / T) + randi(-2, 3), 2, ROWS - 2);
          if (!BLOCK[ty][tx]) { L.tx = tx * T + rand(2, 14); L.ty = ty * T + rand(4, 14); break; }
        }
      } else { const sp = Math.min(d, 95 * dt); L.x += dx / d * sp + rand(-0.6, 0.6); L.y += dy / d * sp + rand(-0.6, 0.6); }
    }
    if (G.mode === 'demo' && !Demo.active) return;
    // aç kedi: boştaki biri doldurur; kimse yoksa uyuyan biri uyanır
    if (Cat.need && !this.refill) {
      const b = BOWL[Cat.need];
      let cand = G.agents.filter(a => this.freeAgent(a)).sort((p, q) => dist(p, b.stand) - dist(q, b.stand))[0];
      if (!cand && G.time - Cat.needSince > 35) cand = G.agents.filter(a => this.sleeper(a))[0];
      if (cand) {
        const kind = Cat.need;
        this.refill = cand;
        this.errand(cand, this.refillPlan(cand, kind)).then(() => { this.refill = null; });
      }
    }
    const free = G.agents.filter(a => this.freeAgent(a));
    if (G.time > this.nextLaser && free.length && !Cat.busy() && !Cat.need && !Cat.path.length && !World.pizzaUntil) {
      this.nextLaser = G.time + rand(90, 160);
      const a = free.sort((p, q) => dist(p, Cat) - dist(q, Cat))[0];
      this.errand(a, this.laserPlan(a));
    } else if (G.time > this.nextPet && free.length && !Cat.busy() && !Cat.path.length && !Cat.hop) {
      this.nextPet = G.time + rand(30, 60);
      const a = free.find(x => dist(x, Cat) < 110);
      if (a) this.errand(a, this.petPlan(a));
    }
  },
};
