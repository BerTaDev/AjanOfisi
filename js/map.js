// Ofis haritası: zeminler, mobilyalar, özel noktalar ve yol bulma
'use strict';
const T = 16, COLS = 30, ROWS = 18, W = COLS * T, H = ROWS * T;

// Zemin bölgeleri: w duvar, g cam, M toplantı, L dinlenme, O ofis, K mutfak, R resepsiyon, D kapı
const ZONES = [];
for (let y = 0; y < ROWS; y++) {
  const row = [];
  for (let x = 0; x < COLS; x++) {
    let z;
    if (y <= 1) z = 'w';
    else if (y === 17) z = (x === 25 || x === 26) ? 'D' : 'w';
    else if (x === 0 || x === 29) z = 'w';
    else if (x <= 8) z = y <= 8 ? 'M' : y === 9 ? 'g' : 'L';
    else if (x === 9) z = y <= 9 ? (y === 7 ? 'O' : 'g') : 'O';
    else if (x <= 21) z = 'O';
    else z = y <= 8 ? 'K' : 'R';
    row.push(z);
  }
  ZONES.push(row);
}

// Mobilyalar (karo cinsinden)
const DESKS = [
  [11, 5], [13, 5], [17, 5], [19, 5],
  [11, 10], [13, 10], [17, 10], [19, 10],
  [11, 14], [13, 14], [17, 14], [19, 14],
];
const FURN = [
  { type: 'whiteboard', x: 2, y: 0, w: 5, h: 2 },
  { type: 'window', x: 13, y: 0, w: 6, h: 2 },
  { type: 'clock', x: 19, y: 0, w: 1, h: 2 },
  { type: 'window', x: 23, y: 0, w: 3, h: 2 },
  { type: 'poster', x: 7, y: 0, w: 1, h: 2 },
  { type: 'meetTable', x: 3, y: 4, w: 4, h: 2, block: 1 },
  { type: 'plant', x: 1, y: 2, w: 1, h: 1, block: 1 },
  { type: 'plant', x: 8, y: 2, w: 1, h: 1, block: 1 },
  { type: 'shelf', x: 10, y: 2, w: 3, h: 1, block: 1 },
  { type: 'server', x: 20, y: 2, w: 2, h: 1, block: 1 },
  { type: 'printer', x: 15, y: 14, w: 2, h: 1, block: 1 },
  { type: 'plant', x: 21, y: 7, w: 1, h: 1, block: 1 },
  { type: 'plant', x: 10, y: 16, w: 1, h: 1, block: 1 },
  { type: 'counter', x: 22, y: 2, w: 5, h: 1, block: 1 },
  { type: 'fridge', x: 28, y: 2, w: 1, h: 2, block: 1 },
  { type: 'kTable', x: 24, y: 5, w: 2, h: 2, block: 1 },
  { type: 'cooler', x: 28, y: 6, w: 1, h: 1, block: 1 },
  { type: 'plant', x: 22, y: 8, w: 1, h: 1, block: 1 },
  { type: 'mat', x: 24, y: 15, w: 4, h: 2 },
  { type: 'reception', x: 24, y: 12, w: 3, h: 1, block: 1 },
  { type: 'coat', x: 28, y: 10, w: 1, h: 1, block: 1 },
  { type: 'plant', x: 22, y: 16, w: 1, h: 1, block: 1 },
  { type: 'plant', x: 28, y: 16, w: 1, h: 1, block: 1 },
  { type: 'bench', x: 22, y: 11, w: 1, h: 2, block: 1 },
  { type: 'rug', x: 2, y: 11, w: 5, h: 3 },
  { type: 'couch', x: 2, y: 10, w: 4, h: 1, block: 1 },
  { type: 'lamp', x: 1, y: 10, w: 1, h: 1, block: 1 },
  { type: 'coffeeTable', x: 3, y: 12, w: 2, h: 1, block: 1 },
  { type: 'beanbag', x: 7, y: 11, w: 1, h: 1, color: '#c75b7a' },
  { type: 'beanbag', x: 7, y: 13, w: 1, h: 1, color: '#4f8fc0' },
  { type: 'sleepbag', x: 2, y: 15, w: 2, h: 1 },
  { type: 'arcade', x: 6, y: 15, w: 1, h: 1, block: 1 },
  { type: 'catbed', x: 4, y: 16, w: 1, h: 1 },
  { type: 'cattree', x: 1, y: 13, w: 1, h: 1, block: 1 },
  { type: 'bowlFood', x: 26, y: 8, w: 1, h: 1 },
  { type: 'bowlWater', x: 27, y: 8, w: 1, h: 1 },
  { type: 'plant', x: 8, y: 16, w: 1, h: 1, block: 1 },
];
DESKS.forEach(([x, y], i) => FURN.push({ type: 'desk', x, y, w: 2, h: 1, block: 1, idx: i }));

// Geçilemez karolar
const BLOCK = ZONES.map(r => r.map(z => z === 'w' || z === 'g'));
for (const f of FURN) {
  if (!f.block) continue;
  for (let y = f.y; y < f.y + f.h; y++) for (let x = f.x; x < f.x + f.w; x++) BLOCK[y][x] = true;
}

// Özel noktalar: px konumu, bakış yönü, duruş
const tileSpot = (tx, ty, dir, pose, extra) =>
  Object.assign({ tx, ty, x: tx * T + 8, y: ty * T + 11, dir, pose: pose || 'stand', by: null }, extra || {});

const SPOTS = {
  desks: DESKS.map(([x, y], i) => ({ tx: x, ty: y + 1, x: (x + 1) * T, y: (y + 1) * T + 13, dir: 'up', pose: 'sit', by: null, desk: i })),
  meetTop: [3, 4, 5, 6].map(x => tileSpot(x, 3, 'down', 'sitDown', { y: 3 * T + 13 })),
  meetBottom: [3, 4, 5, 6].map(x => tileSpot(x, 6, 'up', 'sit', { y: 6 * T + 12 })),
  board: [tileSpot(4, 2, 'up', 'stand', { x: 4 * T + 16, y: 2 * T + 12 })],
  coffee: [tileSpot(23, 3, 'up', 'stand', { y: 3 * T + 8 })],
  sink: [tileSpot(25, 3, 'up', 'stand', { y: 3 * T + 8 })],
  kitchen: [tileSpot(23, 5, 'right'), tileSpot(26, 6, 'left'), tileSpot(24, 7, 'up'), tileSpot(25, 4, 'down'), tileSpot(23, 6, 'right'), tileSpot(26, 5, 'left')],
  cooler: [tileSpot(27, 6, 'right')],
  shelf: [tileSpot(11, 3, 'up', 'stand', { y: 3 * T + 6 })],
  server: [tileSpot(20, 3, 'up', 'stand', { x: 21 * T, y: 3 * T + 6 })],
  windowSpot: [tileSpot(16, 2, 'up', 'stand', { y: 2 * T + 9 }), tileSpot(14, 2, 'up', 'stand', { y: 2 * T + 9 })],
  printer: [tileSpot(15, 13, 'down', 'stand', { x: 16 * T, y: 13 * T + 12 })],
  arcade: [tileSpot(6, 16, 'up', 'stand', { y: 16 * T + 6 })],
  lounge: [tileSpot(5, 14, 'left'), tileSpot(3, 14, 'right'), tileSpot(6, 12, 'left')],
  sleep: [
    { tx: 2, ty: 11, x: 3 * T, y: 10 * T + 11, dir: 'right', pose: 'lie', by: null, kind: 'couch' },
    { tx: 5, ty: 11, x: 5 * T, y: 10 * T + 11, dir: 'right', pose: 'lie', by: null, kind: 'couch' },
    { tx: 7, ty: 11, x: 7 * T + 8, y: 11 * T + 12, dir: 'down', pose: 'bean', by: null, kind: 'bean' },
    { tx: 7, ty: 13, x: 7 * T + 8, y: 13 * T + 12, dir: 'down', pose: 'bean', by: null, kind: 'bean' },
    { tx: 2, ty: 15, x: 3 * T, y: 15 * T + 10, dir: 'right', pose: 'lie', by: null, kind: 'bag' },
  ],
  door: tileSpot(25, 16, 'up', 'stand', { x: 26 * T, y: 16 * T + 10 }),
  outside: { tx: 25, ty: 17, x: 26 * T, y: 18 * T + 14 },
  reception: [tileSpot(23, 13, 'right'), tileSpot(27, 13, 'left'), tileSpot(23, 14, 'right'), tileSpot(27, 14, 'left')],
};

// salondaki laptop yerleri uyku yerleriyle aynı koltuğu/pufu paylaşır
SPOTS.laptop = [
  { tx: 2, ty: 11, x: 3 * T, y: 10 * T + 12, dir: 'down', pose: 'sitDown', noChair: true, by: null, laptop: true },
  { tx: 5, ty: 11, x: 5 * T, y: 10 * T + 12, dir: 'down', pose: 'sitDown', noChair: true, by: null, laptop: true },
  { tx: 7, ty: 11, x: 7 * T + 8, y: 11 * T + 12, dir: 'down', pose: 'bean', noChair: true, by: null, laptop: true },
  { tx: 7, ty: 13, x: 7 * T + 8, y: 13 * T + 12, dir: 'down', pose: 'bean', noChair: true, by: null, laptop: true },
];
SPOTS.laptop.forEach((s, i) => { s.twin = SPOTS.sleep[i]; SPOTS.sleep[i].twin = s; });
const twinFree = (s, agent) => !s.twin || ((!s.twin.by || s.twin.by === agent) && (!s.twin.owner || s.twin.owner === agent));

function freeSpot(list, agent) {
  const free = list.filter(s => (!s.by || s.by === agent) && twinFree(s, agent));
  return free.length ? pick(free) : null;
}
function claim(spot, agent) {
  if (agent.spot && agent.spot !== spot && agent.spot.by === agent) agent.spot.by = null;
  if (spot) spot.by = agent;
  agent.spot = spot;
}
function release(agent) {
  if (agent.spot && agent.spot.by === agent) agent.spot.by = null;
  agent.spot = null;
}

// ---- yol bulma (8 yön, köşe kesmeden A*) ----
const DIRS8 = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
function walkable(x, y, goal) {
  if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return false;
  if (goal && x === goal.tx && y === goal.ty) return true;
  return !BLOCK[y][x];
}
function findPath(sx, sy, goal) {
  sx = clamp(sx, 0, COLS - 1); sy = clamp(sy, 0, ROWS - 1);
  const key = (x, y) => y * COLS + x;
  const gScore = new Map([[key(sx, sy), 0]]);
  const came = new Map();
  const open = [{ x: sx, y: sy, f: 0 }];
  const h = (x, y) => Math.hypot(x - goal.tx, y - goal.ty);
  let guard = 0;
  while (open.length && guard++ < 4000) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
    const cur = open.splice(bi, 1)[0];
    if (cur.x === goal.tx && cur.y === goal.ty) {
      const path = [];
      let k = key(cur.x, cur.y);
      while (k !== undefined && k !== key(sx, sy)) {
        path.unshift({ tx: k % COLS, ty: Math.floor(k / COLS) });
        k = came.get(k);
      }
      return path;
    }
    for (const [dx, dy, c] of DIRS8) {
      const nx = cur.x + dx, ny = cur.y + dy;
      if (!walkable(nx, ny, goal)) continue;
      if (dx && dy && (!walkable(cur.x + dx, cur.y, goal) || !walkable(cur.x, cur.y + dy, goal))) continue;
      const g = gScore.get(key(cur.x, cur.y)) + c;
      const nk = key(nx, ny);
      if (g < (gScore.has(nk) ? gScore.get(nk) : Infinity)) {
        gScore.set(nk, g);
        came.set(nk, key(cur.x, cur.y));
        open.push({ x: nx, y: ny, f: g + h(nx, ny) });
      }
    }
  }
  return null;
}
