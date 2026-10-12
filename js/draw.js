// Ortam çizimi: zemin, duvarlar, mobilyalar, ekranlar, ikonlar
'use strict';
const R = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h)); };

function mulberry(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

const PAL = {
  wallTop: '#262138', wallFace: '#39325a', wallLine: '#433b66', trim: '#2c2644',
  wood: '#5d4838', woodSeam: '#4d3b2e', woodHi: '#68513f',
  meet: '#38476a', meetDot: '#415179',
  lounge: '#553d5c', loungeHi: '#5f4667',
  tileA: '#d8cfbd', tileB: '#c3b9a5',
  stone: '#64636f', stoneLine: '#585763',
  outline: '#17131f',
  deskTop: '#b48a5f', deskEdge: '#8f6a45', deskFront: '#6f5137',
  metal: '#a7a9b8', dark: '#22202e',
};

// ---------------- statik arka plan ----------------
function buildBackground() {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const rnd = mulberry(7);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const z = ZONES[y][x], X = x * T, Y = y * T;
    if (z === 'O' || z === 'D') {
      R(g, X, Y, T, T, PAL.wood);
      for (let r = 0; r < 4; r++) {
        R(g, X, Y + r * 4 + 3, T, 1, PAL.woodSeam);
        const off = ((y * 4 + r) * 7) % 16;
        R(g, X + off, Y + r * 4, 1, 3, PAL.woodSeam);
        if (rnd() < 0.3) R(g, X + Math.floor(rnd() * 12), Y + r * 4 + 1, 3, 1, PAL.woodHi);
      }
    } else if (z === 'M') {
      R(g, X, Y, T, T, PAL.meet);
      for (let i = 2; i < T; i += 5) for (let j = 2; j < T; j += 5) R(g, X + i, Y + j, 1, 1, PAL.meetDot);
    } else if (z === 'L') {
      R(g, X, Y, T, T, PAL.lounge);
      for (let i = 0; i < T; i += 4) R(g, X + i, Y + ((i + y * 3) % 8), 2, 1, PAL.loungeHi);
    } else if (z === 'K') {
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) R(g, X + i * 8, Y + j * 8, 8, 8, (i + j + x + y) % 2 ? PAL.tileA : PAL.tileB);
    } else if (z === 'R') {
      R(g, X, Y, T, T, PAL.stone);
      R(g, X, Y, T, 1, PAL.stoneLine); R(g, X, Y, 1, T, PAL.stoneLine);
      if (rnd() < 0.4) R(g, X + 3 + Math.floor(rnd() * 9), Y + 3 + Math.floor(rnd() * 9), 2, 1, '#6d6c78');
    } else {
      R(g, X, Y, T, T, PAL.wallTop);
    }
  }
  // kapı eşiği
  R(g, 25 * T, 17 * T, 2 * T, T, '#2f2a3d');
  // üst duvar yüzü
  R(g, 0, 0, W, 32, PAL.wallFace);
  R(g, 0, 0, W, 3, PAL.wallTop);
  for (let x = 0; x < W; x += 24) R(g, x, 3, 1, 26, PAL.wallLine);
  R(g, 0, 29, W, 3, PAL.trim);
  // mutfak fayansı
  for (let x = 22 * T; x < 29 * T; x += 6) for (let y = 12; y < 29; y += 5) { R(g, x, y, 5, 4, '#d9dde3'); }
  // yan ve alt duvarlar
  R(g, 0, 32, T - 4, H - 32, PAL.wallTop); R(g, T - 4, 32, 4, H - 32, PAL.trim);
  R(g, W - T + 4, 32, T - 4, H - 32, PAL.wallTop); R(g, W - T, 32, 4, H - 32, PAL.trim);
  R(g, 0, 17 * T + 4, 25 * T, T - 4, PAL.wallTop); R(g, 0, 17 * T, 25 * T, 4, PAL.trim);
  R(g, 27 * T, 17 * T + 4, 3 * T, T - 4, PAL.wallTop); R(g, 27 * T, 17 * T, 3 * T, 4, PAL.trim);
  R(g, 25 * T - 2, 17 * T, 2, T, '#8a8597'); R(g, 27 * T, 17 * T, 2, T, '#8a8597');
  // duvar dibi gölgesi
  g.globalAlpha = 0.25; R(g, T, 32, W - 2 * T, 3, '#000'); g.globalAlpha = 1;
  // cam bölmeler
  g.globalAlpha = 0.28; R(g, T, 9 * T + 3, 9 * T - 2, 11, '#9fd3e8'); g.globalAlpha = 1;
  R(g, T, 9 * T + 2, 9 * T - 2, 1, '#cfe3ee'); R(g, T, 9 * T + 14, 9 * T - 2, 2, '#7d8aa0');
  for (let x = T; x < 10 * T; x += 24) R(g, x, 9 * T + 2, 1, 13, '#a9b8c9');
  for (const [y0, y1] of [[2, 7], [8, 10]]) {
    g.globalAlpha = 0.28; R(g, 9 * T + 6, y0 * T, 4, (y1 - y0) * T - 2, '#9fd3e8'); g.globalAlpha = 1;
    R(g, 9 * T + 6, y0 * T, 1, (y1 - y0) * T - 2, '#cfe3ee'); R(g, 9 * T + 9, y0 * T, 1, (y1 - y0) * T - 2, '#7d8aa0');
  }
  // zemin eşyaları
  for (const f of FURN) {
    const X = f.x * T, Y = f.y * T, w = f.w * T, h = f.h * T;
    if (f.type === 'rug') {
      R(g, X + 2, Y + 2, w - 4, h - 4, '#8a4f4a');
      R(g, X + 5, Y + 5, w - 10, h - 10, '#a8644f');
      for (let i = X + 9; i < X + w - 9; i += 6) R(g, i, Y + h / 2 - 1, 3, 2, '#e0b46a');
      for (let i = X + 2; i < X + w - 2; i += 3) { R(g, i, Y, 1, 2, '#c9a77c'); R(g, i, Y + h - 2, 1, 2, '#c9a77c'); }
    } else if (f.type === 'mat') {
      R(g, X + 4, Y + 6, w - 8, h - 10, '#3c5a52'); R(g, X + 6, Y + 8, w - 12, h - 14, '#4d7066');
      for (let i = X + 10; i < X + w - 10; i += 5) R(g, i, Y + h / 2 - 2, 3, 3, '#e3d6a8');
    } else if (f.type === 'sleepbag') {
      R(g, X + 2, Y + 3, w - 4, 11, '#2f6f9f'); R(g, X + 2, Y + 3, 9, 11, '#e9e2d0'); R(g, X + 11, Y + 3, 1, 11, '#24577d');
      R(g, X + 2, Y + 13, w - 4, 1, '#204a69');
    } else if (f.type === 'catbed') {
      R(g, X + 1, Y + 6, 14, 8, '#8f5d3b'); R(g, X + 3, Y + 8, 10, 4, '#d9b48c');
    }
  }
  return c;
}

// ---------------- duvar katmanı (animasyonlu) ----------------
function skyColors(h) {
  if (h >= 7 && h < 17) return ['#7cc3ee', '#bfe3f5'];
  if (h >= 17 && h < 19) return ['#f08a5d', '#f7c58a'];
  if (h >= 5 && h < 7) return ['#8c7bd1', '#f2b28b'];
  return ['#141a3a', '#273061'];
}

function drawWall(g, t, board) {
  const hour = dayHour();
  const night = hour < 6 || hour >= 19.5;
  for (const f of FURN) {
    const X = f.x * T, Y = f.y * T, w = f.w * T;
    if (f.type === 'window') {
      const [a, b] = skyColors(Math.floor(hour));
      R(g, X + 2, 4, w - 4, 22, '#d6d2e4');
      const gr = g.createLinearGradient(0, 6, 0, 24); gr.addColorStop(0, a); gr.addColorStop(1, b);
      g.fillStyle = gr; g.fillRect(X + 4, 6, w - 8, 18);
      if (night) {
        for (let i = 0; i < 9; i++) { const sx = X + 6 + ((i * 37 + f.x * 11) % (w - 12)); const sy = 7 + ((i * 13) % 8); if ((i + Math.floor(t * 0.7)) % 5) R(g, sx, sy, 1, 1, '#f4f1d0'); }
        if (f.x === 13) { R(g, X + w - 18, 8, 5, 5, '#f3eccb'); R(g, X + w - 16, 8, 3, 3, '#273061'); }
      } else {
        const cx = X + 4 + ((t * 2 + f.x * 20) % (w + 10)) - 10;
        g.save(); g.beginPath(); g.rect(X + 4, 6, w - 8, 18); g.clip();
        R(g, cx, 9, 12, 3, '#ffffff'); R(g, cx + 3, 7, 6, 2, '#ffffff');
        g.restore();
      }
      // şehir silueti
      const bh = [7, 11, 5, 9, 13, 6, 10, 8, 12, 5];
      for (let i = 0, x = X + 4; x < X + w - 4; i++) {
        const bw = 6 + (i * 3) % 5, hh = bh[(i + f.x) % bh.length];
        const ww = Math.min(bw, X + w - 4 - x);
        R(g, x, 24 - hh, ww, hh, night ? '#1d2140' : '#5d6f8f');
        if (night) for (let k = 0; k < hh - 2; k += 3) if ((i * 7 + k) % 3 === 0) R(g, x + 2, 24 - hh + 1 + k, 1, 1, '#f6d77a');
        x += bw + 1;
      }
      R(g, X + 4 + (w - 8) / 2, 6, 1, 18, '#d6d2e4');
      R(g, X + 1, 25, w - 2, 3, '#b8b3ca');
    } else if (f.type === 'whiteboard') {
      R(g, X + 3, 4, w - 6, 21, '#8c8aa0'); R(g, X + 4, 5, w - 8, 19, '#f3f1ea');
      R(g, X + 8, 25, w - 16, 2, '#6f6d80'); R(g, X + 14, 24, 4, 1, '#d24a4a'); R(g, X + 19, 24, 4, 1, '#3d76c9');
      // görev işaretleri: başlık + maddeler (yazının kendisi ekran katmanında)
      const items = (board && board.items) || [];
      R(g, X + 8, 7, 22, 1, '#3d76c9');
      items.slice(0, 4).forEach((it, i) => {
        const yy = 10 + i * 3.5;
        R(g, X + 7, yy, 2, 2, it.status === 'completed' ? '#3aa070' : it.status === 'in_progress' ? '#e09a2d' : '#8c8aa0');
      });
    } else if (f.type === 'clock') {
      const cx = X + 8, cy = 13;
      R(g, cx - 6, cy - 6, 13, 13, '#2a2540'); R(g, cx - 5, cy - 5, 11, 11, '#f2eee2');
      const d = new Date();
      const hand = (ang, len, col) => { for (let i = 0; i <= len; i++) R(g, cx + Math.round(Math.sin(ang) * i), cy - Math.round(Math.cos(ang) * i), 1, 1, col); };
      hand((d.getHours() % 12 + d.getMinutes() / 60) / 12 * Math.PI * 2, 3, '#2a2540');
      hand(d.getMinutes() / 60 * Math.PI * 2, 4, '#2a2540');
      hand(d.getSeconds() / 60 * Math.PI * 2, 4, '#d24a4a');
    } else if (f.type === 'poster') {
      R(g, X + 2, 6, 12, 17, '#e07a55'); R(g, X + 3, 7, 10, 15, '#f2d6b8');
      drawSpark(g, X + 8, 12, 3, '#e07a55');
      R(g, X + 4, 18, 8, 1, '#7a4b38'); R(g, X + 5, 20, 6, 1, '#7a4b38');
    }
  }
  // mutfak üst dolapları
  R(g, 22 * T + 2, 4, 5 * T - 4, 9, '#7b5a43'); for (let i = 0; i < 5; i++) { R(g, 22 * T + 3 + i * 16, 5, 14, 7, '#8d6a50'); R(g, 22 * T + 9 + i * 16, 10, 2, 1, '#d8c39a'); }
}

function drawSpark(g, cx, cy, r, col) {
  for (let i = -r; i <= r; i++) { R(g, cx + i, cy, 1, 1, col); R(g, cx, cy + i, 1, 1, col); }
  for (let i = -r + 1; i < r; i++) { R(g, cx + i, cy + i, 1, 1, col); R(g, cx + i, cy - i, 1, 1, col); }
}

// ---------------- monitör ekranları ----------------
const CODE_COLS = ['#e07a55', '#5fc9a8', '#9a8ff0', '#f0b84a', '#62aee8', '#c9c3d9'];
function drawScreen(g, x, y, w, h, kind, t, seed) {
  const r = mulberry(seed);
  if (kind === 'off') { R(g, x, y, w, h, '#14121c'); R(g, x + 1, y + 1, 3, 1, '#2a2737'); return; }
  if (kind === 'cat') {
    // kedi klavyeye bastı: aaaaaaaaaa
    R(g, x, y, w, h, '#1d1b2c');
    const n = Math.min(Math.floor(t * 30) % 60, (h - 2) / 2 * (w - 2));
    for (let i = 0; i < n; i++) R(g, x + 1 + (i % (w - 2)), y + 1 + Math.floor(i / (w - 2)) * 2, 1, 1, '#e9e5da');
    return;
  }
  if (kind === 'idle') {
    R(g, x, y, w, h, '#16142a');
    const px = x + 2 + Math.abs(((t * 6 + seed) % (2 * (w - 5))) - (w - 5));
    const py = y + 2 + Math.abs(((t * 4 + seed * 3) % (2 * (h - 5))) - (h - 5));
    drawSpark(g, Math.floor(px), Math.floor(py), 1, '#e07a55');
    return;
  }
  if (kind === 'wait') {
    R(g, x, y, w, h, '#1d1b2c');
    R(g, x + 2, y + 2, w - 4, h - 4, '#3b3550'); R(g, x + 3, y + 3, w - 6, 1, '#f0b84a');
    if (Math.floor(t * 2) % 2) { R(g, x + 4, y + h - 4, 4, 2, '#5fc9a8'); R(g, x + w - 8, y + h - 4, 4, 2, '#e5606a'); }
    return;
  }
  if (kind === 'web') {
    R(g, x, y, w, h, '#f4f2ee'); R(g, x, y, w, 2, '#62aee8'); R(g, x + 1, y + 3, 6, 4, '#c9d9e8');
    const sc = Math.floor(t * 3) % 4;
    for (let i = 0; i < 4; i++) R(g, x + 8, y + 3 + i * 2, w - 10 - ((i + sc) % 3) * 2, 1, '#9a97a6');
    return;
  }
  if (kind === 'doc') {
    R(g, x, y, w, h, '#e9e5da');
    const sc = Math.floor(t * 4);
    for (let i = 0; i < h - 2; i += 2) { const rr = mulberry(seed + Math.floor((i + sc * 2) / 2)); R(g, x + 1, y + 1 + i, Math.floor(4 + rr() * (w - 6)), 1, '#8d889c'); }
    R(g, x + w - 2, y + 1 + (sc % (h - 3)), 1, 2, '#e07a55');
    return;
  }
  if (kind === 'think') {
    R(g, x, y, w, h, '#1d1b2c');
    for (let i = 0; i < 3; i++) if (Math.floor(t * 3) % 4 > i) R(g, x + w / 2 - 4 + i * 3, y + h / 2, 2, 2, '#e07a55');
    return;
  }
  if (kind === 'chat') {
    R(g, x, y, w, h, '#1d1b2c');
    R(g, x + 1, y + 2, 8, 3, '#5fc9a8'); R(g, x + w - 9, y + 6, 8, 3, '#e07a55');
    return;
  }
  if (kind === 'term') {
    R(g, x, y, w, h, '#0c0c12');
    const n = Math.floor(t * 5);
    for (let i = 0; i < Math.floor(h / 2) - 1; i++) {
      const rr = mulberry(seed * 7 + n + i);
      R(g, x + 1, y + 1 + i * 2, Math.floor(2 + rr() * (w - 5)), 1, i === 0 ? '#e07a55' : '#59d38f');
    }
    if (Math.floor(t * 2) % 2) R(g, x + 2, y + h - 2, 2, 1, '#e9e9e9');
    return;
  }
  // kod
  R(g, x, y, w, h, '#1d1b2c');
  R(g, x, y, 2, h, '#2a2740');
  const n = Math.floor(t * 2.5);
  const lines = Math.floor((h - 1) / 2);
  for (let i = 0; i < lines; i++) {
    const rr = mulberry(seed * 13 + n + i);
    let cx = x + 3 + Math.floor(rr() * 3) * 2;
    const segs = 1 + Math.floor(rr() * 3);
    for (let s = 0; s < segs && cx < x + w - 2; s++) {
      const len = Math.min(2 + Math.floor(rr() * 5), x + w - 1 - cx);
      R(g, cx, y + 1 + i * 2, len, 1, CODE_COLS[Math.floor(rr() * CODE_COLS.length)]);
      cx += len + 1;
    }
  }
  if (Math.floor(t * 3) % 2) R(g, x + 4, y + 1 + (lines - 1) * 2, 1, 1, '#fff');
  void r;
}

// ---------------- mobilyalar (derinliğe göre sıralanır) ----------------
function drawFurniture(g, f, t, ctx) {
  const X = f.x * T, Y = f.y * T, w = f.w * T, h = f.h * T;
  switch (f.type) {
    case 'desk': {
      const owner = ctx.deskOwner[f.idx];
      R(g, X + 1, Y + 2, w - 2, 11, PAL.deskEdge); R(g, X + 2, Y + 2, w - 4, 9, PAL.deskTop);
      R(g, X + 1, Y + 13, w - 2, 3, PAL.deskFront); R(g, X + 2, Y + 16, 2, 1, PAL.deskFront); R(g, X + w - 4, Y + 16, 2, 1, PAL.deskFront);
      // monitör
      R(g, X + 14, Y + 4, 5, 2, '#3b3747'); R(g, X + 15, Y, 3, 4, '#4a4658');
      R(g, X + 5, Y - 12, 22, 14, '#2b2838'); R(g, X + 6, Y - 11, 20, 12, '#3b3747');
      const kind = owner ? (owner.catScreen ? 'cat' : owner.screen) : 'off';
      drawScreen(g, X + 7, Y - 10, 18, 10, kind, t, f.idx * 17 + 3);
      // klavye, kupa, telefon
      R(g, X + 9, Y + 8, 14, 3, '#d8d4e0'); R(g, X + 10, Y + 9, 12, 1, '#b3aec2');
      R(g, X + 26, Y + 5, 3, 4, ['#e07a55', '#5fc9a8', '#f0b84a', '#9a8ff0'][f.idx % 4]); R(g, X + 29, Y + 6, 1, 2, '#e9e5da');
      const ring = owner && owner.phoneRing > t;
      const jig = ring ? (Math.floor(t * 20) % 2) : 0;
      R(g, X + 2 + jig, Y + 5, 5, 4, '#2d2a36'); if (!(owner && owner.onPhone)) R(g, X + 2 + jig, Y + 4, 5, 2, ring ? '#e5606a' : '#4b4659');
      if (owner && owner.duck) {
        // lastik ördek: hata ayıklamanın en eski yöntemi
        const b = Math.floor(t * 3) % 2;
        paint(g, [[X + 20, Y + 3 - b, 6, 4, '#f6d23a'], [X + 24, Y - b, 4, 4, '#f6d23a']]);
        R(g, X + 28, Y + 1 - b, 2, 1, '#e8742a'); R(g, X + 26, Y + 1 - b, 1, 1, '#2a1f2a'); R(g, X + 21, Y + 3 - b, 2, 1, '#fbe58a');
      }
      if (f.idx % 3 === 1) { R(g, X + 24, Y - 2, 4, 3, '#a8644f'); R(g, X + 24, Y - 6, 1, 4, '#5fa86b'); R(g, X + 26, Y - 7, 1, 5, '#5fa86b'); R(g, X + 27, Y - 5, 1, 3, '#4c8f58'); }
      // boş sandalye
      if (!owner || !owner.seated) drawChair(g, X + 16, Y + 35);
      break;
    }
    case 'meetTable':
      R(g, X + 2, Y + 4, w - 4, h - 6, '#7a5a40'); R(g, X + 3, Y + 2, w - 6, h - 8, '#a07a55');
      R(g, X + 8, Y + 6, 8, 5, '#3b3747'); R(g, X + 9, Y + 7, 6, 3, '#5fc9a8');
      R(g, X + 40, Y + 12, 6, 6, '#f2eee2'); R(g, X + 26, Y + 8, 3, 3, '#e07a55');
      if (ctx.pizza) {
        // açık pizza kutusu; dilim sayısı azaldıkça boşalır
        R(g, X + 20, Y + 3, 24, 4, '#c9a46a'); R(g, X + 20, Y + 7, 24, 18, '#e0c08a'); R(g, X + 22, Y + 9, 20, 14, '#d39a4a');
        for (let i = 0; i < ctx.pizza; i++) { const sx = X + 23 + (i % 3) * 6, sy = Y + 10 + Math.floor(i / 3) * 6; R(g, sx, sy, 5, 5, '#f2c14e'); R(g, sx + 1, sy + 1, 2, 2, '#c0392b'); R(g, sx + 3, sy + 3, 1, 1, '#5a8f3a'); }
      }
      break;
    case 'plant': {
      const sw = Math.round(Math.sin(t * 1.3 + f.x) * 0.8);
      R(g, X + 4, Y + 9, 8, 7, '#b0603f'); R(g, X + 4, Y + 9, 8, 2, '#c9744f');
      R(g, X + 3 + sw, Y + 1, 4, 9, '#3f8f55'); R(g, X + 8 + sw, Y - 1, 4, 10, '#4fa865'); R(g, X + 6 + sw, Y - 4, 3, 9, '#5fbf72');
      R(g, X + 2 + sw, Y + 4, 2, 3, '#3f8f55'); R(g, X + 12 + sw, Y + 3, 2, 3, '#3f8f55');
      break;
    }
    case 'shelf':
      R(g, X, Y - 20, w, h + 20, '#5b4030'); R(g, X + 2, Y - 18, w - 4, h + 16, '#3e2c21');
      for (let s = 0; s < 3; s++) {
        const sy = Y - 18 + s * 11;
        for (let bx = X + 3; bx < X + w - 4;) {
          const bw = 2 + ((bx * 7 + s * 3) % 3);
          R(g, bx, sy + 2 + ((bx + s) % 3), bw, 9 - ((bx + s) % 3), CODE_COLS[(bx + s * 2) % CODE_COLS.length]);
          bx += bw + 1;
        }
        R(g, X + 2, sy + 11, w - 4, 1, '#5b4030');
      }
      break;
    case 'server': {
      R(g, X + 1, Y - 18, w - 2, h + 18, '#1e1c26'); R(g, X + 2, Y - 17, w - 4, h + 15, '#2c2a36');
      const fast = ctx.serverBusy ? 9 : 2;
      for (let r = 0; r < 6; r++) {
        R(g, X + 3, Y - 15 + r * 5, w - 6, 4, '#373445');
        for (let l = 0; l < 4; l++) {
          const on = (Math.floor(t * fast + r * 3 + l * 7) % 5) < 3;
          R(g, X + 5 + l * 3, Y - 14 + r * 5, 1, 1, on ? (l === 3 ? '#f0b84a' : '#59d38f') : '#24402f');
        }
        R(g, X + w - 9, Y - 14 + r * 5, 4, 1, '#55526a');
      }
      break;
    }
    case 'printer': {
      R(g, X + 3, Y + 2, w - 6, 12, '#d9d5e2'); R(g, X + 3, Y + 10, w - 6, 4, '#b7b2c4'); R(g, X + 7, Y + 4, w - 14, 2, '#3b3747');
      const p = ctx.printing > t ? (1 - (ctx.printing - t) / 2.5) : 0;
      if (p > 0) R(g, X + 9, Y + 4 - Math.floor(p * 7), w - 18, Math.floor(p * 7) + 1, '#ffffff');
      R(g, X + w - 7, Y + 7, 1, 1, ctx.printing > t ? '#59d38f' : '#24402f');
      break;
    }
    case 'counter': {
      R(g, X, Y - 2, w, 6, '#e3ded3'); R(g, X, Y + 4, w, 12, '#8d6a50');
      for (let i = 0; i < 5; i++) { R(g, X + 1 + i * 16, Y + 5, 14, 10, '#9c785c'); R(g, X + 7 + i * 16, Y + 7, 2, 1, '#d8c39a'); }
      // kahve makinesi
      R(g, X + 18, Y - 14, 12, 15, '#2c2a36'); R(g, X + 19, Y - 13, 10, 4, '#4a4658'); R(g, X + 21, Y - 6, 6, 1, '#e07a55');
      R(g, X + 22, Y - 4, 4, 4, '#f2eee2');
      if (ctx.coffeeBrew > t) for (let i = 0; i < 3; i++) { const sy = Y - 8 - ((t * 10 + i * 4) % 10); R(g, X + 23 + Math.round(Math.sin(t * 4 + i) * 1.5), sy, 1, 2, 'rgba(255,255,255,0.6)'); }
      // lavabo + mikrodalga
      R(g, X + 36, Y - 1, 14, 4, '#9aa3b2'); R(g, X + 42, Y - 6, 2, 5, '#c7ccd6');
      R(g, X + 56, Y - 10, 20, 11, '#d9d5e2'); R(g, X + 58, Y - 8, 12, 7, '#3b3747'); R(g, X + 72, Y - 7, 2, 1, '#59d38f');
      break;
    }
    case 'fridge':
      R(g, X + 1, Y - 14, w - 2, h + 13, '#e6e8ee'); R(g, X + 1, Y - 14, w - 2, 1, '#ffffff'); R(g, X + 1, Y + 2, w - 2, 1, '#b8bcc8');
      R(g, X + 12, Y - 8, 1, 6, '#9aa0ae'); R(g, X + 12, Y + 6, 1, 8, '#9aa0ae'); R(g, X + 4, Y - 10, 3, 3, '#e07a55'); R(g, X + 8, Y + 8, 3, 2, '#62aee8');
      break;
    case 'kTable':
      R(g, X + 3, Y + 4, w - 6, h - 8, '#7a5a40'); R(g, X + 1, Y + 6, w - 2, h - 14, '#7a5a40');
      R(g, X + 4, Y + 3, w - 8, h - 10, '#b58b60'); R(g, X + 2, Y + 6, w - 4, h - 16, '#b58b60');
      R(g, X + 9, Y + 9, 3, 3, '#f2eee2'); R(g, X + 20, Y + 14, 3, 3, '#e07a55'); R(g, X + 14, Y + 6, 5, 3, '#f0b84a');
      break;
    case 'cooler': {
      R(g, X + 3, Y + 2, 10, 14, '#d9d5e2'); R(g, X + 4, Y - 8, 8, 10, '#8fd0f0'); R(g, X + 5, Y - 7, 2, 8, '#bfe6f7');
      const b = (t * 0.6 + f.x) % 3;
      if (b < 1) R(g, X + 8, Y - 1 - Math.floor(b * 7), 1, 1, '#ffffff');
      R(g, X + 6, Y + 7, 4, 2, '#62aee8');
      break;
    }
    case 'reception': {
      R(g, X, Y - 2, w, 5, '#e3ded3'); R(g, X, Y + 3, w, 13, '#3b3456'); R(g, X + 2, Y + 5, w - 4, 9, '#463e67');
      drawSpark(g, X + w / 2, Y + 9, 3, '#e07a55');
      const ring = ctx.lobbyRing > t; const j = ring ? Math.floor(t * 20) % 2 : 0;
      R(g, X + w - 12 + j, Y - 5, 8, 5, '#2d2a36'); R(g, X + w - 12 + j, Y - 6, 8, 2, ring ? '#e5606a' : '#4b4659');
      R(g, X + 6, Y - 5, 5, 3, '#f0b84a'); R(g, X + 8, Y - 6, 1, 1, '#f0b84a');
      break;
    }
    case 'coat':
      R(g, X + 7, Y - 14, 2, 28, '#5b4030'); R(g, X + 4, Y + 13, 8, 2, '#5b4030'); R(g, X + 3, Y - 10, 5, 9, '#3d6d8c'); R(g, X + 9, Y - 12, 4, 7, '#a8644f');
      break;
    case 'bench':
      R(g, X + 2, Y + 2, 12, h - 4, '#7a5a40'); R(g, X + 3, Y + 3, 10, h - 6, '#a07a55');
      break;
    case 'couch':
      R(g, X, Y - 10, w, 12, '#2f6670'); R(g, X + 1, Y - 9, w - 2, 9, '#3a7d88');
      R(g, X - 2, Y - 4, 6, 18, '#2f6670'); R(g, X + w - 4, Y - 4, 6, 18, '#2f6670');
      R(g, X + 3, Y + 1, w - 6, 12, '#4a919c'); R(g, X + 3, Y + 12, w - 6, 3, '#2f6670');
      R(g, X + w / 2, Y + 1, 1, 11, '#3a7d88');
      break;
    case 'lamp':
      R(g, X + 7, Y - 8, 2, 22, '#4b4659'); R(g, X + 4, Y + 13, 8, 2, '#4b4659'); R(g, X + 2, Y - 14, 12, 7, '#f2d28a'); R(g, X + 3, Y - 8, 10, 1, '#d9a85c');
      break;
    case 'coffeeTable':
      R(g, X + 1, Y + 3, w - 2, 9, '#5b4030'); R(g, X + 2, Y + 2, w - 4, 8, '#7a5a40');
      R(g, X + 5, Y + 4, 8, 5, '#e3ded3'); R(g, X + 6, Y + 5, 6, 1, '#e07a55'); R(g, X + 20, Y + 4, 3, 3, '#f2eee2');
      break;
    case 'beanbag':
      R(g, X + 1, Y + 6, 14, 9, shade(f.color, -0.25)); R(g, X + 2, Y + 3, 12, 10, f.color); R(g, X + 4, Y + 4, 5, 2, shade(f.color, 0.25));
      break;
    case 'bowlFood': case 'bowlWater': {
      const food = f.type === 'bowlFood', lvl = ctx.bowls ? ctx.bowls[food ? 'food' : 'water'] : 1;
      if (food) { R(g, X - 2, Y + 7, 36, 9, '#3c5a52'); R(g, X + 26, Y + 9, 2, 2, '#4d7066'); R(g, X + 29, Y + 11, 2, 2, '#4d7066'); R(g, X + 27, Y + 13, 2, 1, '#4d7066'); }
      const rim = food ? '#d0574f' : '#4f8fc0';
      R(g, X + 2, Y + 9, 12, 5, shade(rim, -0.3)); R(g, X + 3, Y + 8, 10, 2, rim); R(g, X + 4, Y + 9, 8, 2, '#2a2433');
      if (lvl > 0.02) {
        const hh = Math.max(1, Math.round(lvl * 3));
        if (food) { R(g, X + 4, Y + 10 - hh, 8, hh + 1, '#a0623a'); for (let i = 0; i < 4; i++) R(g, X + 5 + i * 2, Y + 10 - hh, 1, 1, '#c9874f'); }
        else { R(g, X + 4, Y + 9, 8, 2, '#8fd0f0'); if (Math.floor(t * 2) % 2) R(g, X + 6 + (Math.floor(t) % 3), Y + 9, 2, 1, '#e3f5fc'); }
      }
      break;
    }
    case 'cattree': {
      R(g, X + 2, Y + 11, 13, 4, '#9c7a5a'); R(g, X + 2, Y + 11, 13, 1, '#b8946e');
      R(g, X + 6, Y - 22, 4, 34, '#d9c49a'); for (let i = Y - 20; i < Y + 10; i += 3) R(g, X + 6, i, 4, 1, '#bfa77a');
      R(g, X + 1, Y - 6, 12, 3, '#9c7a5a'); R(g, X, Y - 26, 15, 4, '#9c7a5a'); R(g, X, Y - 26, 15, 1, '#b8946e');
      const sw = Math.round(Math.sin(t * 2.2) * 1.5);
      R(g, X + 13, Y - 22, 1, 7, '#e9e2d0'); R(g, X + 12 + sw, Y - 15, 3, 3, '#e5606a');
      break;
    }
    case 'arcade': {
      R(g, X + 1, Y - 16, 14, 30, '#3b2a5c'); R(g, X + 2, Y - 15, 12, 4, '#e07a55');
      R(g, X + 3, Y - 10, 10, 9, '#0c0c12');
      const k = Math.floor(t * 4);
      for (let i = 0; i < 3; i++) R(g, X + 4 + ((k + i * 3) % 8), Y - 9 + i * 3, 2, 2, ['#59d38f', '#f0b84a', '#62aee8'][i]);
      R(g, X + 2, Y, 12, 4, '#2c2140'); R(g, X + 5, Y + 1, 1, 2, '#e5606a'); R(g, X + 9, Y + 1, 2, 2, '#62aee8');
      break;
    }
  }
}

function drawChair(g, cx, y) {
  R(g, cx - 5, y - 13, 10, 8, '#3a3550'); R(g, cx - 4, y - 12, 8, 6, '#4a4466');
  R(g, cx - 5, y - 5, 10, 3, '#2c2840'); R(g, cx - 1, y - 2, 2, 2, '#2c2840');
}

// 7x7 piksel ikonlar
const ICONS = {
  excl: ['..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  quest: ['.###.', '#...#', '...#.', '..#..', '.....', '..#..'],
  check: ['.....', '....#', '...#.', '#.#..', '.#...', '.....'],
  phone: ['##...', '##...', '.#...', '.##..', '..###', '...##'],
  code: ['.#.#.', '#...#', '#...#', '#...#', '.#.#.', '.....'],
  term: ['#....', '.#...', '..#..', '.#...', '#..##', '.....'],
  search: ['.##..', '#..#.', '#..#.', '.##..', '...#.', '....#'],
  globe: ['.###.', '#.#.#', '#####', '#.#.#', '.###.', '.....'],
  note: ['####.', '#..#.', '####.', '#..#.', '####.', '.....'],
  heart: ['.#.#.', '#####', '#####', '.###.', '..#..', '.....'],
  cup: ['.....', '####.', '#..##', '#..#.', '.##..', '.....'],
  zz: ['####.', '..#..', '.#...', '####.', '.....', '.....'],
  bolt: ['...#.', '..#..', '.###.', '..#..', '.#...', '.....'],
  dots: ['.....', '.....', '#.#.#', '.....', '.....', '.....'],
  fish: ['.....', '#..#.', '####.', '#####', '####.', '#..#.'],
  drop: ['..#..', '.###.', '.###.', '#####', '#####', '.###.'],
  music: ['..###', '..#.#', '..#.#', '.##.#', '###.#', '.#.##'],
  anger: ['#.#.#', '.#.#.', '#...#', '.#.#.', '#.#.#', '.....'],
  game: ['.....', '#####', '#.#.#', '#####', '.#.#.', '.....'],
};
function drawIcon(g, name, cx, y, col, bg) {
  const m = ICONS[name]; if (!m) return;
  const w = m[0].length, h = m.length;
  R(g, cx - 4, y - 1, w + 4, h + 3, PAL.outline);
  R(g, cx - 3, y, w + 2, h + 1, bg || '#f4efe4');
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (m[j][i] === '#') R(g, cx - 2 + i, y + 1 + j, 1, 1, col);
  R(g, cx - 1, y + h + 2, 1, 1, PAL.outline);
}
