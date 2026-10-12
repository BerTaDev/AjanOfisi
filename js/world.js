// Oyun döngüsü, sahne çizimi, ekran katmanı (balonlar, isimler, pano yazısı), fare etkileşimi
'use strict';
const World = {
  canvas: null, ctx: null, buf: null, g: null, light: null, lg: null, bg: null,
  scale: 3, ox: 0, oy: 0, dpr: 1,
  doorOpen: 0, lobbyRing: 0, coffeeBrew: 0, printing: 0, serverBusy: false,
  board: { title: 'Görevler', items: [] },
  hooks: [],
  zzz: [],
  confetti: [],

  burst(x, y, n) {
    const cols = ['#e07a55', '#5fc9a8', '#f0b84a', '#9a8ff0', '#62aee8', '#e5606a', '#ffffff'];
    for (let i = 0; i < n; i++) this.confetti.push({ x: x + rand(-120, 120), y: y + rand(-40, 20), vx: rand(-20, 20), vy: rand(-70, -20), c: pick(cols), life: rand(2, 3.5), t: 0 });
  },

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.buf = document.createElement('canvas'); this.buf.width = W; this.buf.height = H;
    this.g = this.buf.getContext('2d');
    this.light = document.createElement('canvas'); this.light.width = W; this.light.height = H;
    this.lg = this.light.getContext('2d');
    this.bg = buildBackground();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    canvas.addEventListener('mousemove', e => this.pointer(e, false));
    canvas.addEventListener('click', e => this.pointer(e, true));
    canvas.addEventListener('mouseleave', () => { G.hover = null; });
    let last = performance.now();
    const loop = now => {
      const real = Math.min(0.05, (now - last) / 1000); last = now;
      this.update(real * G.speed);
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  },

  resize() {
    const st = this.canvas.parentElement;
    const narrow = window.innerWidth <= 920;
    const cw = st.clientWidth;
    const ch = narrow ? Math.round(cw * H / W) : st.clientHeight;
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(cw * this.dpr);
    this.canvas.height = Math.round(ch * this.dpr);
    this.canvas.style.width = cw + 'px';
    this.canvas.style.height = ch + 'px';
    let s = Math.min(this.canvas.width / W, this.canvas.height / H);
    if (s >= 2 && Math.floor(s) / s > 0.88) s = Math.floor(s);
    this.scale = s;
    this.ox = Math.round((this.canvas.width - W * s) / 2);
    this.oy = Math.round((this.canvas.height - H * s) / 2);
  },

  pointer(e, click) {
    const r = this.canvas.getBoundingClientRect();
    const wx = ((e.clientX - r.left) * this.dpr - this.ox) / this.scale;
    const wy = ((e.clientY - r.top) * this.dpr - this.oy) / this.scale;
    let hit = null;
    for (const a of G.agents) {
      if (!a.visible) continue;
      const lying = a.pose === 'lie';
      const x0 = a.x - (lying ? 13 : 7), x1 = a.x + (lying ? 14 : 7), y0 = a.y - (lying ? 12 : 24), y1 = a.y + 2;
      if (wx >= x0 && wx <= x1 && wy >= y0 && wy <= y1) { if (!hit || a.y > hit.y) hit = a; }
    }
    G.hover = hit;
    this.canvas.style.cursor = hit ? 'pointer' : 'default';
    if (click) { G.selected = hit && G.selected !== hit ? hit : null; if (window.UI) UI.renderTeam(true); }
  },

  add(agent) { G.agents.push(agent); if (window.UI) UI.renderTeam(true); return agent; },
  clear() {
    for (const a of G.agents) { a.removed = true; a.tok++; }
    G.agents = [];
    for (const k of Object.keys(SPOTS)) { const v = SPOTS[k]; (Array.isArray(v) ? v : [v]).forEach(s => { s.by = null; s.owner = null; }); }
    TIMERS.length = 0; this.hooks = []; G.selected = null; G.hover = null; this.confetti = []; this.zzz = [];
    this.board = { title: 'Görevler', items: [] };
  },

  update(dt) {
    G.time += dt;
    for (let i = TIMERS.length - 1; i >= 0; i--) if (TIMERS[i].at <= G.time) { const t = TIMERS[i]; TIMERS.splice(i, 1); t.res(); }
    for (const a of G.agents) a.update(dt);
    Cat.update(dt);
    if (Cat.say && G.time > Cat.say.until) Cat.say = null;
    const before = G.agents.length;
    G.agents = G.agents.filter(a => !a.removed);
    if (G.selected && G.selected.removed) G.selected = null;
    if (before !== G.agents.length && window.UI) UI.renderTeam(true);
    for (const h of this.hooks) h(dt);
    this.serverBusy = G.agents.some(a => a.seated && a.screen === 'term');
    // uyuyanlardan "z" yükselsin
    for (const a of G.agents) if (a.sleeping && a.visible && Math.random() < dt * 0.9) this.zzz.push({ x: a.x + (a.pose === 'lie' ? -8 : 2), y: a.y - (a.pose === 'lie' ? 10 : 22), t: G.time });
    this.zzz = this.zzz.filter(z => G.time - z.t < 2.6);
    for (const p of this.confetti) { p.t += dt; p.vy += 60 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    this.confetti = this.confetti.filter(p => p.t < p.life);
  },

  nightLevel() {
    const d = new Date(), h = d.getHours() + d.getMinutes() / 60;
    if (h >= 7.5 && h < 17.5) return 0;
    if (h >= 17.5 && h < 19.5) return (h - 17.5) / 2 * 0.42;
    if (h >= 5.5 && h < 7.5) return (7.5 - h) / 2 * 0.42;
    return 0.42;
  },

  render() {
    const g = this.g, t = G.time;
    g.drawImage(this.bg, 0, 0);
    drawWall(g, t, this.board);
    // sürgülü kapı
    const open = this.doorOpen > t ? 1 : 0;
    const dx = 25 * T, dy = 17 * T;
    R(g, dx - (open ? 12 : 0), dy + 1, 16, 4, '#9fc9dc'); R(g, dx + 16 + (open ? 12 : 0), dy + 1, 16, 4, '#9fc9dc');
    R(g, dx - (open ? 12 : 0), dy + 1, 16, 1, '#d9eef6'); R(g, dx + 16 + (open ? 12 : 0), dy + 1, 16, 1, '#d9eef6');

    const deskOwner = SPOTS.desks.map(s => s.owner ? {
      screen: s.owner.seated && s.owner.desk === s ? (s.owner.sleeping ? 'off' : s.owner.screen) : 'idle',
      seated: s.by === s.owner && s.owner.seated, phoneRing: s.owner.phoneRing, onPhone: s.owner.phone && s.owner.seated,
    } : (s.by && s.by.pose === 'sit' ? { screen: 'idle', seated: true } : null));
    const ctx = { deskOwner, serverBusy: this.serverBusy, printing: this.printing, coffeeBrew: this.coffeeBrew, lobbyRing: this.lobbyRing };

    const list = [];
    for (const f of FURN) {
      if (['rug', 'mat', 'sleepbag', 'catbed', 'window', 'whiteboard', 'clock', 'poster'].includes(f.type)) continue;
      list.push({ d: (f.y + f.h) * T, f });
    }
    for (const a of G.agents) if (a.visible) list.push({ d: a.y + (a.pose === 'lie' || a.pose === 'bean' ? 8 : 0) + (a.pose === 'sit' ? 0.5 : 0), a });
    list.push({ d: Cat.y + 0.2, cat: true });
    list.sort((p, q) => p.d - q.d);
    for (const it of list) {
      if (it.f) drawFurniture(g, it.f, t, ctx);
      else if (it.cat) Cat.draw(g, t);
      else {
        const a = it.a;
        if (a === G.selected || a === G.hover) {
          g.globalAlpha = a === G.selected ? 0.9 : 0.5;
          R(g, a.x - 7, a.y, 14, 1, '#e07a55'); R(g, a.x - 8, a.y - 1, 1, 1, '#e07a55'); R(g, a.x + 7, a.y - 1, 1, 1, '#e07a55');
          g.globalAlpha = 1;
        }
        drawPerson(g, a, t);
      }
    }
    for (const p of this.confetti) R(g, p.x, p.y, (p.t * 10 | 0) % 2 ? 2 : 1, 2, p.c);
    // durum ikonları
    for (const a of G.agents) {
      if (!a.visible || !a.icon) continue;
      const hy = a.pose === 'lie' ? a.y - 22 : a.pose === 'sit' ? a.y - 34 : a.y - 33;
      const bob = Math.round(Math.sin(t * 4 + a.uid) * 1);
      drawIcon(g, a.icon.name, Math.round(a.x), hy + bob, a.icon.col, a.icon.bg);
    }
    // gece ışıkları
    const night = this.nightLevel();
    if (night > 0.01) {
      const lg = this.lg;
      lg.globalCompositeOperation = 'source-over';
      lg.clearRect(0, 0, W, H);
      lg.fillStyle = `rgba(14,10,40,${night})`;
      lg.fillRect(0, 0, W, H);
      lg.globalCompositeOperation = 'destination-out';
      const hole = (x, y, r, a) => { const gr = lg.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); lg.fillStyle = gr; lg.fillRect(x - r, y - r, r * 2, r * 2); };
      for (const [x, y] of [[176, 110], [304, 110], [176, 200], [304, 200], [240, 250], [80, 80], [400, 80], [400, 210], [80, 200]]) hole(x, y, 72, 0.6);
      SPOTS.desks.forEach((s, i) => { if (deskOwner[i] && deskOwner[i].screen !== 'off') hole(s.x, s.y - 30, 26, 0.75); });
      hole(1 * T + 8, 10 * T - 10, 40, 0.9);
      hole(6 * T + 8, 15 * T - 6, 22, 0.6);
      hole(4 * T + 8, 14, 30, 0.5);
      g.drawImage(this.light, 0, 0);
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = night * 0.35;
      const warm = (x, y, r, c) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); };
      warm(1 * T + 8, 10 * T - 10, 36, 'rgba(255,190,110,1)');
      SPOTS.desks.forEach((s, i) => { if (deskOwner[i] && deskOwner[i].screen !== 'off' && deskOwner[i].screen !== 'idle') warm(s.x, s.y - 32, 20, 'rgba(120,200,255,1)'); });
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    }

    // ana tuvale ölçekle
    const c = this.ctx, s = this.scale;
    c.imageSmoothingEnabled = false;
    c.fillStyle = '#0f0d18';
    c.fillRect(0, 0, this.canvas.width, this.canvas.height);
    c.drawImage(this.buf, this.ox, this.oy, W * s, H * s);
    this.overlay(c, s, t);
  },

  toScreen(x, y) { return [this.ox + x * this.scale, this.oy + y * this.scale]; },

  overlay(c, s, t) {
    const px = this.dpr;
    // pano yazısı
    const items = this.board.items.slice(0, 4);
    {
      const [bx, by] = this.toScreen(2 * T + 9, 6.3);
      const fs = Math.max(8, 2.7 * s);
      c.font = `600 ${fs}px "Pixelify Sans", monospace`;
      c.fillStyle = '#3d76c9'; c.textBaseline = 'top';
      c.fillText(shortText(this.board.title || 'Görevler', 22), bx, by - fs * 0.15);
      c.font = `${fs * 0.86}px "Pixelify Sans", monospace`;
      items.forEach((it, i) => {
        c.fillStyle = it.status === 'completed' ? '#3aa070' : '#2b2838';
        const [ix, iy] = this.toScreen(2 * T + 10, 9.2 + i * 3.5);
        let txt = it.text;
        while (c.measureText(txt).width > 64 * s && txt.length > 3) txt = txt.slice(0, -2);
        if (txt !== it.text) txt = txt.replace(/.$/, '…');
        c.fillText(txt, ix, iy);
        if (it.status === 'completed') { const w = c.measureText(txt).width; c.fillRect(ix, iy + fs * 0.45, w, Math.max(1, s * 0.4)); }
      });
    }
    // zzz
    c.textBaseline = 'alphabetic';
    for (const z of this.zzz) {
      const k = (G.time - z.t) / 2.6;
      const [zx, zy] = this.toScreen(z.x + k * 8 + Math.sin(k * 6) * 2, z.y - k * 16);
      c.globalAlpha = 1 - k;
      c.font = `700 ${(3 + k * 3) * s}px "Pixelify Sans", monospace`;
      c.fillStyle = '#c9c1ff';
      c.fillText('z', zx, zy);
    }
    c.globalAlpha = 1;
    // telefon çalıyor
    if (this.lobbyRing > t && Math.floor(t * 6) % 2) {
      const [rx, ry] = this.toScreen(26 * T, 12 * T - 12);
      c.font = `700 ${3.4 * s}px "Pixelify Sans", monospace`; c.fillStyle = '#ffd08a'; c.textAlign = 'center';
      c.fillText('ZIRR!', rx, ry); c.textAlign = 'left';
    }
    // isim etiketleri
    const fsN = Math.max(10 * px, 2.6 * s);
    c.font = `600 ${fsN}px "IBM Plex Sans", sans-serif`;
    c.textAlign = 'center'; c.textBaseline = 'top';
    for (const a of G.agents) {
      if (!a.visible) continue;
      const sel = a === G.selected || a === G.hover;
      if (a.sleeping && !sel) continue;
      const [nx, ny] = this.toScreen(a.x, a.y + (a.pose === 'sit' ? 9 : 2));
      const label = sel && a.role ? `${a.name} · ${shortText(a.role, 40)}` : (a.short || a.name);
      const w = c.measureText(label).width + 8 * px;
      c.globalAlpha = sel ? 0.95 : 0.72;
      c.fillStyle = '#15131f'; c.fillRect(nx - w / 2, ny, w, fsN + 4 * px);
      c.fillStyle = sel ? '#ffffff' : a.color; c.fillText(label, nx, ny + 2 * px);
    }
    c.globalAlpha = 1; c.textAlign = 'left';
    // konuşma balonları
    const bubbles = [];
    const fs = Math.max(11.5 * px, 2.9 * s);
    const lh = fs * 1.28, pad = 7 * px, maxW = Math.min(230 * px, 70 * s);
    for (const a of G.agents.concat(Cat.say ? [Cat] : [])) {
      const b = a === Cat ? { text: Cat.say.text, kind: 'say', born: G.time - 1, until: Cat.say.until } : a.bubble;
      if (!b) continue;
      if (a !== Cat && !a.visible) continue;
      c.font = `${b.kind === 'think' ? 'italic ' : ''}${fs}px "IBM Plex Sans", sans-serif`;
      const lines = wrapText(c, b.text, maxW - pad * 2, 3);
      const nameW = a === Cat ? 0 : 0;
      const w = Math.max(...lines.map(l => c.measureText(l).width)) + pad * 2 + nameW;
      const h = lines.length * lh + pad * 2 + fs * 0.9;
      const headY = a === Cat ? a.y - 14 : a.pose === 'lie' ? a.y - 14 : a.pose === 'sit' ? a.y - 26 : a.y - 26;
      const [ax, ay] = this.toScreen(a.x, headY);
      let x = clamp(ax - w / 2, 4 * px, this.canvas.width - w - 4 * px);
      bubbles.push({ a, b, lines, x, y: ay - h - 8 * px, w, h, ax, ay });
    }
    bubbles.sort((p, q) => q.ay - p.ay);
    const placed = [];
    for (const bb of bubbles) {
      let moved = true, guard = 0;
      while (moved && guard++ < 12) {
        moved = false;
        for (const o of placed) if (bb.x < o.x + o.w && bb.x + bb.w > o.x && bb.y < o.y + o.h && bb.y + bb.h > o.y) { bb.y = o.y - bb.h - 4 * px; moved = true; }
      }
      placed.push(bb);
    }
    for (const bb of placed) {
      const { a, b, lines, x, y, w, h, ax, ay } = bb;
      const age = G.time - b.born, left = b.until - G.time;
      const alpha = clamp(Math.min(age * 6, left * 2), 0, 1);
      const pop = age < 0.15 ? 0.85 + age : 1;
      c.save();
      c.globalAlpha = alpha;
      c.translate(ax, y + h); c.scale(pop, pop); c.translate(-ax, -(y + h));
      const bgc = b.kind === 'think' ? '#ddd7f2' : b.kind === 'shout' ? '#ffe2ad' : '#f6f1e6';
      c.fillStyle = '#15131f';
      c.fillRect(x - 2 * px, y - 2 * px, w + 4 * px, h + 4 * px);
      c.fillStyle = bgc; c.fillRect(x, y, w, h);
      // kuyruk
      if (b.kind === 'think') {
        c.fillStyle = '#15131f'; c.fillRect(ax - 4 * px, y + h + 3 * px, 7 * px, 7 * px); c.fillRect(ax - 1 * px, ay - 9 * px, 4 * px, 4 * px);
        c.fillStyle = bgc; c.fillRect(ax - 2 * px, y + h + 5 * px, 3 * px, 3 * px);
      } else {
        const tx = clamp(ax, x + 8 * px, x + w - 8 * px);
        c.fillStyle = '#15131f'; c.fillRect(tx - 6 * px, y + h, 12 * px, 4 * px); c.fillRect(tx - 3 * px, y + h + 3 * px, 6 * px, 5 * px);
        c.fillStyle = bgc; c.fillRect(tx - 4 * px, y + h - 2 * px, 8 * px, 4 * px); c.fillRect(tx - 1 * px, y + h + 2 * px, 2 * px, 3 * px);
      }
      // ad
      c.textBaseline = 'top';
      c.font = `700 ${fs * 0.78}px "IBM Plex Sans", sans-serif`;
      c.fillStyle = a === Cat ? '#b8743a' : shade(a.color, -0.35);
      c.fillText(a === Cat ? 'Tırmık (kedi)' : a.name, x + pad, y + pad * 0.7);
      c.font = `${b.kind === 'think' ? 'italic ' : ''}${fs}px "IBM Plex Sans", sans-serif`;
      c.fillStyle = '#1d1a28';
      lines.forEach((l, i) => c.fillText(l, x + pad, y + pad * 0.7 + fs * 0.95 + i * lh));
      c.restore();
    }
  },
};
