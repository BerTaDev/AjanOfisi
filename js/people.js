// Piksel karakterler ve ofis kedisi
'use strict';
const SKINS = ['#f2c9a0', '#e0ac7e', '#c68a5e', '#8d5a3b', '#f5d6b8', '#b07850'];
const HAIRS = ['#2b1d16', '#5a3a22', '#c9a050', '#a8442f', '#1c1c24', '#6b6b78', '#e8d7a8', '#3d2b55'];
const STYLES = ['short', 'long', 'bun', 'spiky', 'cap', 'bob', 'mohawk'];
const SHIRTS = ['#e07a55', '#5fc9a8', '#9a8ff0', '#f0b84a', '#62aee8', '#e5606a', '#7bc46a', '#d86fa8', '#4fb0b8', '#c98d4f'];

function makeLook(seed, shirt) {
  const r = mulberry(seed * 977 + 13);
  return {
    skin: SKINS[Math.floor(r() * SKINS.length)],
    hair: HAIRS[Math.floor(r() * HAIRS.length)],
    style: STYLES[Math.floor(r() * STYLES.length)],
    shirt: shirt || SHIRTS[Math.floor(r() * SHIRTS.length)],
    pants: ['#2d3550', '#3b3247', '#4a3a2c', '#26303a'][Math.floor(r() * 4)],
    glasses: r() < 0.3,
    phones: r() < 0.2,
    cap: '#' + ['e07a55', '5fc9a8', '62aee8', 'f0b84a'][Math.floor(r() * 4)],
  };
}

// parçaları önce dış çizgiyle, sonra dolguyla çiz
function paint(g, parts) {
  for (const p of parts) if (!p.no) R(g, p[0] - 1, p[1] - 1, p[2] + 2, p[3] + 2, PAL.outline);
  for (const p of parts) R(g, p[0], p[1], p[2], p[3], p[4]);
}
function mirror(parts, X) { return parts.map(p => { const q = [2 * X - p[0] - p[2], p[1], p[2], p[3], p[4]]; q.no = p.no; return q; }); }

function headParts(X, top, L, dir, closed) {
  const p = [], s = L.skin, h = L.hair;
  p.push([X - 5, top, 10, 10, s]);
  const back = dir === 'up';
  if (back) {
    p.push([X - 5, top, 10, 9, h]);
    if (L.style === 'long' || L.style === 'bob') p.push([X - 5, top + 6, 10, L.style === 'long' ? 6 : 4, h]);
  } else {
    p.push([X - 5, top, 10, 3, h]);
    if (dir === 'side') {
      p.push([X - 5, top, 4, 7, h]);
      if (L.style === 'long') p.push([X - 5, top + 3, 3, 9, h]);
      p.push(closed ? [X + 2, top + 6, 2, 1, '#2a1f2a'] : [X + 2, top + 5, 1, 2, '#2a1f2a']);
      p.push([X + 3, top + 8, 1, 1, '#d97b6c']);
    } else {
      p.push([X - 5, top + 3, 1, L.style === 'long' ? 9 : 3, h], [X + 4, top + 3, 1, L.style === 'long' ? 9 : 3, h]);
      if (L.style === 'bob') p.push([X - 5, top + 3, 2, 5, h], [X + 3, top + 3, 2, 5, h]);
      if (closed) p.push([X - 3, top + 6, 2, 1, '#2a1f2a'], [X + 1, top + 6, 2, 1, '#2a1f2a']);
      else p.push([X - 3, top + 5, 1, 2, '#2a1f2a'], [X + 2, top + 5, 1, 2, '#2a1f2a']);
      p.push([X - 4, top + 7, 1, 1, '#e8998a'], [X + 3, top + 7, 1, 1, '#e8998a']);
      if (L.glasses && !closed) p.push([X - 4, top + 4, 3, 3, 'rgba(255,255,255,0.25)'], [X + 1, top + 4, 3, 3, 'rgba(255,255,255,0.25)'], [X - 1, top + 5, 2, 1, '#2a1f2a']);
    }
  }
  if (L.style === 'bun') p.push([X - 2, top - 3, 4, 3, h]);
  if (L.style === 'spiky') p.push([X - 4, top - 2, 2, 2, h], [X - 1, top - 3, 2, 3, h], [X + 2, top - 2, 2, 2, h]);
  if (L.style === 'mohawk') p.push([X - 1, top - 3, 2, 4, h]);
  if (L.style === 'cap') {
    p.push([X - 5, top - 1, 10, 4, L.cap]);
    if (dir === 'down') p.push([X - 4, top + 3, 8, 1, shade(L.cap, -0.3)]);
    else if (dir === 'side') p.push([X + 3, top + 2, 4, 1, shade(L.cap, -0.3)]);
  }
  if (L.phones && !back) p.push([X - 6, top + 3, 2, 4, '#2c2a36'], [X + 4, top + 3, 2, 4, '#2c2a36'], [X - 5, top - 1, 10, 1, '#2c2a36']);
  return p;
}

// a: {x,y,dir,pose,frame,look, typing, phone, mug, wave}
function drawPerson(g, a, t) {
  const X = Math.round(a.x), Y = Math.round(a.y), L = a.look;
  const sh = L.shirt, sh2 = shade(L.shirt, -0.22), pants = L.pants, shoe = '#2a2230';
  const pose = a.pose || 'stand';
  // gölge
  g.globalAlpha = 0.28; R(g, X - 5, Y - 1, 10, 2, '#000'); g.globalAlpha = 1;

  if (pose === 'lie') {
    // yatay uzanmış, battaniyeli
    const bob = Math.round(Math.sin(t * 1.6) * 0.5);
    const parts = [
      [X - 12, Y - 9, 9, 9, L.skin], [X - 12, Y - 9, 3, 9, L.hair], [X - 12, Y - 10, 9, 2, L.hair],
      [X - 6, Y - 6, 2, 1, '#2a1f2a'],
      [X - 3, Y - 8 + bob, 15, 7, a.blanket || '#c9b8e8'], [X - 3, Y - 8 + bob, 15, 2, shade(a.blanket || '#c9b8e8', 0.2)],
      [X + 12, Y - 6, 2, 4, shoe],
    ];
    paint(g, parts);
    return;
  }

  const walk = pose === 'walk';
  const f = walk ? a.frame % 4 : 0;
  let dir = a.dir === 'left' || a.dir === 'right' ? 'side' : a.dir;

  if (pose === 'sit' || pose === 'deskSleep') {
    // arkadan oturuş (masaya dönük)
    const sl = pose === 'deskSleep';
    const ty = a.typing && !sl ? (Math.floor(t * 8 + a.seed) % 2) : 0;
    const top = Y - 22 + (sl ? 5 : 0);
    const parts = [];
    parts.push([X - 4, Y - 13, 8, 7, sh], [X + 2, Y - 13, 2, 7, sh2]);
    if (a.phone) parts.push([X - 6, Y - 13 - ty, 2, 5, sh], [X + 4, Y - 19, 2, 8, sh], [X + 4, Y - 20, 3, 3, '#2d2a36']);
    else parts.push([X - 6, Y - 14 - ty, 2, 5, sh], [X + 4, Y - 14 - (1 - ty) * (a.typing ? 1 : 0), 2, 5, sh]);
    paint(g, parts);
    paint(g, headParts(X, top, L, 'up'));
    drawChair(g, X, Y + 6);
    return;
  }

  if (pose === 'sitDown' || pose === 'bean') {
    // önden oturuş
    const top = Y - 20 + (pose === 'bean' ? 3 : 0);
    const closed = a.sleeping;
    if (pose === 'sitDown') { R(g, X - 6, Y - 22, 12, 12, '#3a3550'); }
    const parts = [
      [X - 4, top + 10, 8, 7, sh], [X + 2, top + 10, 2, 7, sh2],
      [X - 6, top + 11, 2, 5, sh], [X + 4, top + 11, 2, 5, sh],
      [X - 4, top + 17, 3, 2, pants], [X + 1, top + 17, 3, 2, pants],
    ];
    if (a.mug) parts.push([X + 4, top + 13, 3, 3, '#f2eee2']);
    paint(g, parts);
    const head = headParts(X, top + (closed ? 1 : 0), L, 'down', closed);
    paint(g, closed && pose === 'bean' ? head.map(p => { const q = [p[0] + 1, p[1] + 1, p[2], p[3], p[4]]; return q; }) : head);
    return;
  }

  // ayakta / yürürken
  const lift = [0, 1, 0, 1][f];
  const legA = walk && (f === 1) ? 1 : 0, legB = walk && (f === 3) ? 1 : 0;
  const bounce = walk && (f === 1 || f === 3) ? -1 : 0;
  const top = Y - 22 + bounce;
  let parts = [];
  if (dir === 'side') {
    parts.push([X - 3 - legA, Y - 5, 3, 5 - legB, pants], [X + 0 + legA, Y - 5, 3, 5 - legA, pants]);
    parts.push([X - 3 - legA, Y - 1 - legB, 3, 1, shoe], [X + legA, Y - 1 - legA, 3, 1, shoe]);
    parts.push([X - 3, top + 10, 7, 8, sh], [X - 3, top + 10, 2, 8, sh2]);
    const sw = walk ? [0, 1, 0, -1][f] : 0;
    parts.push([X - 1 + sw, top + 11, 2, 6, shade(sh, -0.1)], [X - 1 + sw, top + 17, 2, 1, L.skin]);
    if (a.mug) parts.push([X + 1 + sw, top + 14, 3, 3, '#f2eee2']);
    parts = parts.concat(headParts(X, top, L, 'side', a.sleeping));
    if (a.dir === 'left') parts = mirror(parts, X);
    paint(g, parts);
  } else {
    const back = dir === 'up';
    parts.push([X - 4, Y - 5 + legA, 3, 5 - legA, pants], [X + 1, Y - 5 + legB, 3, 5 - legB, pants]);
    parts.push([X - 4, Y - 1, 3, 1, shoe], [X + 1, Y - 1, 3, 1, shoe]);
    parts.push([X - 4, top + 10, 8, 8, sh], [X + 2, top + 10, 2, 8, sh2]);
    if (!back) parts.push([X - 1, top + 10, 2, 2, shade(sh, 0.3)]);
    const swA = walk ? [0, -1, 0, 1][f] : 0;
    if (a.armsUp) parts.push([X - 6, top + 4, 2, 7, sh], [X + 4, top + 4, 2, 7, sh], [X - 6, top + 3, 2, 1, L.skin], [X + 4, top + 3, 2, 1, L.skin]);
    else if (a.wave && Math.floor(t * 6) % 2) parts.push([X - 6, top + 11 + swA, 2, 6, sh], [X + 4, top + 5, 2, 6, sh], [X + 4, top + 4, 2, 1, L.skin]);
    else {
      parts.push([X - 6, top + 11 + swA, 2, 6, sh], [X + 4, top + 11 - swA, 2, 6, sh]);
      parts.push([X - 6, top + 17 + swA, 2, 1, L.skin], [X + 4, top + 17 - swA, 2, 1, L.skin]);
    }
    if (a.mug && !back) parts.push([X + 5, top + 14, 3, 3, '#f2eee2']);
    if (a.phone) parts.push([X + 4, top + 4, 2, 7, sh], [X + 3, top + 4, 3, 4, '#2d2a36']);
    paint(g, parts);
    paint(g, headParts(X, top, L, back ? 'up' : 'down', a.sleeping));
    if (a.badge && !back) { R(g, X - 3, top + 13, 2, 3, '#f2eee2'); R(g, X - 3, top + 13, 2, 1, a.badge); }
  }
}

// ---------------- ofis kedisi ----------------
const Cat = {
  x: 4 * T + 8, y: 16 * T + 10, dir: 'right', state: 'sleep', path: [], until: 0, frame: 0, ft: 0, say: null,
  update(dt) {
    this.ft += dt;
    if (this.path.length) {
      const n = this.path[0];
      const dx = n.x - this.x, dy = n.y - this.y, d = Math.hypot(dx, dy);
      const sp = 22 * dt;
      if (d <= sp) { this.x = n.x; this.y = n.y; this.path.shift(); }
      else { this.x += dx / d * sp; this.y += dy / d * sp; if (Math.abs(dx) > 0.3) this.dir = dx > 0 ? 'right' : 'left'; }
      if (this.ft > 0.14) { this.ft = 0; this.frame++; }
      if (!this.path.length) { this.state = this.next || 'sit'; this.until = G.time + rand(8, 20); }
      return;
    }
    if (G.time < this.until) return;
    // yeni hedef: uyuyan birinin yanı, kedi yatağı, mutfak ya da rastgele
    const sleepers = G.agents.filter(a => a.sleeping && a.visible);
    let tx, ty, next = 'sit';
    const roll = Math.random();
    if (roll < 0.35 && sleepers.length) { const s = pick(sleepers); tx = Math.floor(s.x / T); ty = Math.floor(s.y / T) + 1; next = 'sleep'; }
    else if (roll < 0.55) { tx = 4; ty = 16; next = 'sleep'; }
    else if (roll < 0.7) { tx = 26; ty = 4; }
    else { tx = randi(10, 21); ty = randi(7, 9); }
    if (ty >= ROWS - 1) ty = ROWS - 2;
    if (BLOCK[ty] && BLOCK[ty][tx]) { this.until = G.time + 2; return; }
    const p = findPath(Math.floor(this.x / T), Math.floor(this.y / T), { tx, ty });
    if (!p) { this.until = G.time + 3; return; }
    this.path = p.map(n => ({ x: n.tx * T + 8, y: n.ty * T + 10 }));
    this.state = 'walk'; this.next = next;
    if (chance(0.25)) this.say = { text: pick(['miyav', 'mrrr', 'miyav?', 'prrr']), until: G.time + 2.5 };
  },
  draw(g, t) {
    const X = Math.round(this.x), Y = Math.round(this.y);
    const c = '#e09a4f', d = '#b8743a';
    g.globalAlpha = 0.25; R(g, X - 5, Y - 1, 10, 2, '#000'); g.globalAlpha = 1;
    let p;
    if (this.state === 'sleep') {
      p = [[X - 5, Y - 5, 10, 5, c], [X - 6, Y - 6, 4, 4, c], [X - 6, Y - 7, 1, 1, c], [X - 3, Y - 7, 1, 1, c], [X + 3, Y - 3, 3, 2, d], [X - 1, Y - 5, 2, 1, d], [X + 2, Y - 4, 2, 1, d]];
    } else {
      const f = this.state === 'walk' ? this.frame % 2 : 0;
      p = [[X - 5, Y - 6, 9, 4, c], [X - 4, Y - 2, 1, 2 - f, d], [X - 1, Y - 2, 1, 1 + f, d], [X + 1, Y - 2, 1, 2 - f, d], [X + 3, Y - 2, 1, 1 + f, d],
        [X + 3, Y - 10, 5, 5, c], [X + 3, Y - 11, 1, 1, c], [X + 7, Y - 11, 1, 1, c], [X + 6, Y - 8, 1, 1, '#2a1f2a'],
        [X - 7, Y - 9 + (Math.floor(t * 2) % 2), 2, 4, c], [X - 2, Y - 6, 2, 1, d], [X + 1, Y - 6, 1, 1, d]];
      if (this.state === 'sit') p.push([X - 4, Y - 7, 7, 2, c]);
    }
    if (this.dir === 'left') p = mirror(p, X);
    paint(g, p);
  }
};
