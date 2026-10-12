// Ses motoru: sfx/ klasöründeki örnekler (WebAudio), yoksa sentez seslere düşer
'use strict';
const Sfx = (() => {
  // ad -> varyant sayısı (1 ise ad.ogg, fazlaysa ad_1.ogg … ad_n.ogg)
  const LIST = {
    type: 4, step: 4, phone_ring: 1, door_open: 1, door_chime: 1, pop: 3, done: 1, error: 1, question: 1,
    alarm: 1, yawn: 1, snore: 2, meow: 2, purr: 1, coffee: 1, printer: 1, jingle: 1, ambience: 1,
    arcade: 1, water: 1, marker: 1, chair: 1,
  };
  // varsayılan seviyeler (0..1)
  const LEVEL = {
    type: 0.22, step: 0.16, phone_ring: 0.3, door_open: 0.35, door_chime: 0.4, pop: 0.3, done: 0.4, error: 0.35,
    question: 0.4, alarm: 0.24, yawn: 0.4, snore: 0.22, meow: 0.35, purr: 0.25, coffee: 0.3, printer: 0.28,
    jingle: 0.45, ambience: 0.16, arcade: 0.18, water: 0.3, marker: 0.3, chair: 0.25,
  };
  const MIN_GAP = { pop: 0.07, step: 0.11, type: 0.25, snore: 2.5, meow: 1.5, door_open: 0.8, door_chime: 0.8, phone_ring: 1.5, chair: 0.3, error: 1, question: 1 };
  let ac = null, master = null, volume = 0.8, ready = false, ambSrc = null, ambEl = null;
  const bufs = {};   // ad -> [AudioBuffer]
  const els = {};    // ad -> [HTMLAudioElement] (file:// için yedek)
  const last = {};

  const files = name => LIST[name] > 1 ? Array.from({ length: LIST[name] }, (_, i) => `${name}_${i + 1}.ogg`) : [`${name}.ogg`];

  function ctx() {
    if (!ac) {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain();
      master.gain.value = volume;
      master.connect(ac.destination);
    }
    return ac;
  }

  function load() {
    if (ready) return;
    ready = true;
    const a = ctx();
    const each = fn => { for (const name of Object.keys(LIST)) files(name).forEach(f => fn(name, f)); };
    // köprü sfx/ klasöründe ne olduğunu söyler; dosyadan açıldıysa <audio> ile dene
    fetch('sfx/index.json').then(r => r.json()).then(list => {
      const have = new Set(list);
      each((name, f) => {
        if (!have.has(f)) return;
        fetch('sfx/' + f).then(r => r.arrayBuffer()).then(b => a.decodeAudioData(b))
          .then(buf => { (bufs[name] = bufs[name] || []).push(buf); if (name === 'ambience') ambience(); })
          .catch(() => { /* bozuk dosya: sentez sese düş */ });
      });
    }).catch(() => {
      each((name, f) => {
        const el = new Audio('sfx/' + f);
        el.preload = 'auto';
        el.addEventListener('canplaythrough', () => { (els[name] = els[name] || []).push(el); if (name === 'ambience') ambience(); }, { once: true });
      });
    });
  }

  function has(name) { return (bufs[name] && bufs[name].length) || (els[name] && els[name].length); }

  function panOf(x) { return x == null ? 0 : clamp((x / W) * 2 - 1, -1, 1) * 0.55; }

  // örneği çal; yoksa false döner
  function play(name, opt) {
    if (!G.sound) return true;
    opt = opt || {};
    const t = performance.now() / 1000;
    if (MIN_GAP[name] && t - (last[name] || 0) < MIN_GAP[name]) return true;
    const vol = (opt.vol != null ? opt.vol : 1) * (LEVEL[name] || 0.3);
    const rate = opt.rate || 1;
    if (bufs[name] && bufs[name].length) {
      last[name] = t;
      const a = ctx();
      const src = a.createBufferSource();
      src.buffer = pick(bufs[name]);
      src.playbackRate.value = rate;
      const g = a.createGain();
      g.gain.value = vol;
      let node = src.connect(g);
      if (a.createStereoPanner) { const p = a.createStereoPanner(); p.pan.value = panOf(opt.x); node = node.connect(p); }
      node.connect(master);
      src.start();
      return true;
    }
    if (els[name] && els[name].length) {
      last[name] = t;
      const el = pick(els[name]).cloneNode();
      el.volume = clamp(vol * volume, 0, 1);
      el.playbackRate = rate;
      el.play().catch(() => { /* */ });
      return true;
    }
    return false;
  }

  // ---- sentez yedekleri ----
  function tone(freq, t0, dur, vol, type, x) {
    if (!G.sound) return;
    const a = ctx();
    const o = a.createOscillator(), g = a.createGain();
    o.type = type || 'square';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, a.currentTime + t0);
    g.gain.linearRampToValueAtTime(vol, a.currentTime + t0 + 0.01);
    g.gain.linearRampToValueAtTime(0, a.currentTime + t0 + dur);
    let node = o.connect(g);
    if (x != null && a.createStereoPanner) { const p = a.createStereoPanner(); p.pan.value = panOf(x); node = node.connect(p); }
    node.connect(master);
    o.start(a.currentTime + t0);
    o.stop(a.currentTime + t0 + dur + 0.02);
  }

  function ambience() {
    if (!G.sound || ambSrc || ambEl) return;
    if (bufs.ambience && bufs.ambience.length) {
      const a = ctx();
      ambSrc = a.createBufferSource();
      ambSrc.buffer = bufs.ambience[0];
      ambSrc.loop = true;
      const g = a.createGain();
      g.gain.setValueAtTime(0, a.currentTime);
      g.gain.linearRampToValueAtTime(LEVEL.ambience, a.currentTime + 2);
      ambSrc.connect(g).connect(master);
      ambSrc.start();
    } else if (els.ambience && els.ambience.length) {
      ambEl = els.ambience[0];
      ambEl.loop = true;
      ambEl.volume = LEVEL.ambience * volume;
      ambEl.play().catch(() => { /* */ });
    }
  }
  function stopAmbience() {
    if (ambSrc) { try { ambSrc.stop(); } catch (e) { /* */ } ambSrc = null; }
    if (ambEl) { ambEl.pause(); ambEl = null; }
  }

  return {
    play,
    unlock() {
      try { ctx().resume(); } catch (e) { /* */ }
      load();
      ambience();
    },
    setEnabled(on) {
      G.sound = on;
      if (on) this.unlock(); else stopAmbience();
    },
    setVolume(v) {
      volume = v;
      if (master) master.gain.value = v;
      if (ambEl) ambEl.volume = LEVEL.ambience * v;
    },

    // ---- olay sesleri ----
    ring() { if (!play('phone_ring')) for (let i = 0; i < 6; i++) { tone(1320, i * 0.09, 0.07, 0.035); tone(1660, i * 0.09 + 0.045, 0.04, 0.03); } },
    door(arrive) {
      if (!play('door_open') && !arrive) tone(220, 0, 0.3, 0.03, 'triangle');
      if (arrive && !play('door_chime')) { tone(660, 0, 0.18, 0.05, 'triangle'); tone(880, 0.16, 0.25, 0.05, 'triangle'); }
    },
    done(x) { if (!play('done', { x })) { tone(784, 0, 0.1, 0.04, 'triangle', x); tone(1047, 0.1, 0.18, 0.04, 'triangle', x); } },
    error(x) { if (!play('error', { x })) tone(180, 0, 0.18, 0.04, 'sawtooth', x); },
    question(x) { if (!play('question', { x })) { tone(988, 0, 0.12, 0.04, 'triangle', x); tone(740, 0.13, 0.18, 0.04, 'triangle', x); } },
    alarm(x) { if (!play('alarm', { x })) for (let i = 0; i < 4; i++) tone(1760, i * 0.14, 0.08, 0.03, 'square', x); },
    wake(x) { if (!play('yawn', { x, rate: rand(0.9, 1.1) })) { tone(300, 0, 0.08, 0.04, 'square', x); tone(600, 0.08, 0.12, 0.04, 'square', x); } },
    jingle() { if (!play('jingle')) [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.2, 0.04, 'triangle')); },

    // konuşma balonu: küçük bir "pop" ve ajana özgü perdeyle mırıldanma
    say(agent, text, kind) {
      if (!G.sound) return;
      const x = agent && agent.x;
      if (!play('pop', { x, vol: kind === 'think' ? 0.5 : 1, rate: rand(0.95, 1.1) })) tone(520 + Math.random() * 200, 0, 0.05, 0.025, 'triangle', x);
      if (kind === 'think' || !agent || agent === Cat) return;
      const base = 260 + ((agent.seed || 0) % 9) * 38;
      const n = clamp(Math.round(String(text).length / 9), 3, 9);
      for (let i = 0; i < n; i++) tone(base * (0.85 + Math.random() * 0.4), 0.06 + i * 0.075, 0.045, kind === 'shout' ? 0.022 : 0.014, 'triangle', x);
    },
    step(agent) { play('step', { x: agent.x, rate: rand(0.9, 1.15) }); },
    type(agent) { play('type', { x: agent.x, rate: rand(0.95, 1.08) }); },
    snore(agent) { play('snore', { x: agent.x, rate: rand(0.92, 1.08) }); },
    meow(x) { if (!play('meow', { x, rate: rand(0.95, 1.15) })) { tone(700, 0, 0.12, 0.02, 'sine', x); tone(520, 0.1, 0.2, 0.02, 'sine', x); } },
    purr(x) { play('purr', { x }); },
    arrive(agent, target) {
      if (!G.sound || !target) return;
      const x = agent.x;
      if (SPOTS.cooler.includes(target)) play('water', { x });
      else if (SPOTS.board.includes(target)) play('marker', { x });
      else if (target.pose === 'sit' || target.pose === 'sitDown') play('chair', { x, rate: rand(0.9, 1.1) });
    },
    coffee() { play('coffee', { x: 23 * T }); },
    printer() { play('printer', { x: 16 * T }); },
    arcade() { if (!play('arcade', { x: 6 * T })) for (let i = 0; i < 3; i++) tone(400 + Math.random() * 800, i * 0.09, 0.06, 0.015, 'square', 6 * T); },
  };
})();
