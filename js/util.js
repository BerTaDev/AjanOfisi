// Ortak yardımcılar
'use strict';
const G = {
  time: 0,        // oyun zamanı (sn), hız çarpanıyla akar
  speed: 1,
  mode: 'demo',   // 'demo' | 'live'
  agents: [],
  selected: null,
  hover: null,
  sound: false,
};

const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const chance = p => Math.random() < p;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const shuffle = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };

function clock(d) {
  d = d || new Date();
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

function shortText(s, n) {
  s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function fill(tpl, vars) {
  return tpl.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
}

function wrapText(ctx, text, maxW, maxLines) {
  const words = String(text).split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && cur) {
      lines.push(cur);
      cur = w;
      if (lines.length === maxLines) break;
    } else cur = t;
  }
  if (lines.length < maxLines && cur) lines.push(cur);
  else if (lines.length === maxLines && cur) {
    let last = lines[maxLines - 1];
    while (ctx.measureText(last + '…').width > maxW && last.length > 1) last = last.slice(0, -1);
    lines[maxLines - 1] = last + '…';
  }
  return lines;
}

function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function shade(hex, amt) {
  const [r, g, b] = hexToRgb(hex);
  const f = v => clamp(Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt), 0, 255);
  return '#' + [f(r), f(g), f(b)].map(v => v.toString(16).padStart(2, '0')).join('');
}

// ---- küçük ses efektleri (isteğe bağlı) ----
const Sfx = (() => {
  let ac = null;
  const ctx = () => { if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)(); return ac; };
  function tone(freq, t0, dur, vol, type) {
    const a = ctx();
    const o = a.createOscillator(), g = a.createGain();
    o.type = type || 'square';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, a.currentTime + t0);
    g.gain.linearRampToValueAtTime(vol, a.currentTime + t0 + 0.01);
    g.gain.linearRampToValueAtTime(0, a.currentTime + t0 + dur);
    o.connect(g).connect(a.destination);
    o.start(a.currentTime + t0);
    o.stop(a.currentTime + t0 + dur + 0.02);
  }
  return {
    unlock() { try { ctx().resume(); } catch (e) { /* */ } },
    ring() { if (!G.sound) return; for (let i = 0; i < 6; i++) { tone(1320, i * 0.09, 0.07, 0.035); tone(1660, i * 0.09 + 0.045, 0.04, 0.03); } },
    door() { if (!G.sound) return; tone(660, 0, 0.18, 0.05, 'triangle'); tone(880, 0.16, 0.25, 0.05, 'triangle'); },
    pop() { if (!G.sound) return; tone(520 + Math.random() * 200, 0, 0.05, 0.025, 'triangle'); },
    done() { if (!G.sound) return; tone(784, 0, 0.1, 0.04, 'triangle'); tone(1047, 0.1, 0.18, 0.04, 'triangle'); },
    wake() { if (!G.sound) return; tone(300, 0, 0.08, 0.04); tone(600, 0.08, 0.12, 0.04); },
  };
})();
