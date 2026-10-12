// Boş zaman: kahve, kulaklıkla müzik, oyun (ve oyuna sinirlenme), bitki sulama…
'use strict';
const RAGE = ['NASIL ÖLDÜM YA?!', 'Bu oyun hileli!', 'Lag vardı, lag!', 'Kim tasarladı bu bölümü?!', 'Bir daha oynamıyorum. …Bir el daha.', 'Tuşa bastım ama!', 'O boss bana kişisel kin besliyor.'];
const CALM = ['Tamam, sakinim.', 'Derin nefes…', 'Neyse, sadece bir oyun.', 'Kimse görmedi değil mi?'];
const SONGS = ['lo-fi kodlama listesi', 'synthwave', 'Barış Manço', 'oyun müzikleri', 'caz', 'yağmur sesi', 'anime açılışları'];

const Hangout = {
  // gece: uyku, müzik ya da oyun; gündüz: kahve ve diğerleri
  pick() {
    const night = World.nightLevel() > 0.3;
    const r = Math.random();
    if (night) {
      if (r < 0.38) return 'nap';
      if (r < 0.64) return 'music';
      if (r < 0.9) return 'game';
      return 'coffee';
    }
    if (r < 0.28) return 'coffee';
    if (r < 0.37) return 'window';
    if (r < 0.5) return 'game';
    if (r < 0.6) return 'music';
    if (r < 0.68) return 'plants';
    if (r < 0.75) return 'cooler';
    if (r < 0.85) return 'lounge';
    if (r < 0.95) return 'desk';
    return 'nap';
  },

  async run(name, a, api) {
    switch (name) {
      case 'coffee': return Demo.coffee(a, api);
      case 'window': return Demo.visit(a, api, SPOTS.windowSpot, L.window, 'Pencereden bakıyor');
      case 'cooler': return Demo.visit(a, api, SPOTS.cooler, null, 'Su içiyor');
      case 'lounge': return Demo.visit(a, api, SPOTS.lounge, null, 'Dinleniyor');
      case 'music': return this.music(a, api);
      case 'game': return this.game(a, api);
      case 'plants': return this.plants(a, api);
      case 'desk':
        await a.goWork(api);
        a.screen = 'chat'; a.setStatus('idle', 'Mesajları okuyor');
        await api.wait(rand(6, 10));
        a.screen = 'idle';
        return;
      default: return api.wait(2);
    }
  },

  async music(a, api) {
    const sp = freeSpot(SPOTS.laptop, a) || freeSpot(SPOTS.lounge, a) || freeSpot(SPOTS.kitchen, a);
    if (!sp) { await api.wait(2); return; }
    a.setStatus('break', 'Kulaklıkla müzik dinliyor');
    await api.go(sp);
    a.headphones = true; a.music = true;
    a.setIcon('music', '#6a5acd', 2.5);
    if (chance(0.55)) a.say(`(kulaklıkta ${pick(SONGS)})`, 'think');
    await api.wait(rand(18, 40));
    a.music = false; a.headphones = false;
  },

  async game(a, api) {
    const arcade = freeSpot(SPOTS.arcade, a);
    const useArcade = !!arcade && chance(0.5);
    const sp = useArcade ? arcade : (freeSpot(SPOTS.laptop, a) || freeSpot(SPOTS.lounge, a));
    if (!sp) { await api.wait(2); return; }
    a.setStatus('break', useArcade ? 'Atari oynuyor' : 'Konsolda oyun oynuyor');
    await api.go(sp);
    if (!useArcade) a.handheld = true;
    a.setIcon('game', '#2a1f2a', 2);
    const total = rand(15, 35);
    let spent = 0;
    while (spent < total) {
      const w = rand(4, 8);
      await api.wait(w); spent += w;
      if (chance(0.35)) {
        // durduk yere gerilme
        a.rage = G.time + 2.4;
        a.setIcon('anger', '#d23a3a', 2.4);
        await api.say(pick(RAGE), 2.4, 'shout');
        if (chance(0.55)) await api.say(pick(CALM), 2);
      } else if (chance(0.25)) await api.say(pick(['Bir bölüm daha…', 'Rekor geliyor!', 'Hadi hadi hadi!', 'Kolaymış bu.']), 2);
    }
    a.handheld = false;
  },

  async plants(a, api) {
    const p = pick(FURN.filter(f => f.type === 'plant'));
    const sp = Fun.adjacentTo(p.x * T + 8, p.y * T + 10);
    if (!sp) { await api.wait(2); return; }
    a.setStatus('break', 'Bitkileri suluyor');
    await api.go(sp);
    a.dir = p.x * T + 8 > a.x ? 'right' : 'left';
    a.setIcon('drop', '#3d8fd1', 2.5);
    if (chance(0.6)) a.say(pick(['Bitkileri sulayayım.', 'Büyü bakalım, büyü.', 'Bu saksı da susamış.']));
    for (let i = 0; i < 10; i++) World.confetti.push({ x: p.x * T + 8 + rand(-4, 4), y: p.y * T - 6, vx: rand(-6, 6), vy: rand(10, 30), c: pick(['#8fd0f0', '#bfe6f7']), life: rand(0.4, 0.8), t: 0 });
    await api.wait(2.5);
    for (let i = 0; i < 6; i++) World.confetti.push({ x: p.x * T + 8 + rand(-6, 6), y: p.y * T - 4, vx: rand(-4, 4), vy: rand(-30, -15), c: pick(['#7fe08a', '#c8f7c5']), life: rand(0.6, 1), t: 0 });
    await api.wait(1.5);
  },
};
