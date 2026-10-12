// Demo modu: kendi kendine dönen ofis senaryosu
'use strict';
function makeSteps(p) {
  const f = () => pick(p.files);
  const s = [];
  const step = (screen, icon, label, d0, d1, tool) => ({ screen, icon, label, dur: rand(d0, d1) * 1.5, tool });
  s.push(step('think', 'dots', 'Düşünüyor…', 2, 3.5, 'think'));
  s.push(step('doc', 'search', 'Read · ' + f(), 2, 4, 'Read'));
  if (chance(0.6)) s.push(step('doc', 'search', `Grep · "${pick(SYMS)}"`, 2, 3, 'Grep'));
  if (chance(0.3)) s.push(step('web', 'globe', 'WebSearch · ' + pick(QUERIES), 3, 4.5, 'Web'));
  const n = randi(2, 4);
  for (let i = 0; i < n; i++) {
    s.push(step('code', 'code', (chance(0.25) ? 'Write · ' : 'Edit · ') + f(), 3, 6, 'Edit'));
    if (chance(0.5)) s.push(step('term', 'term', 'Bash · ' + pick(CMDS), 2.5, 5, 'Bash'));
  }
  s.push(step('term', 'term', 'Bash · ' + pick(['npm test', 'npm run build', 'pytest -q', 'dotnet test']), 3, 5, 'Bash'));
  return s;
}

const Demo = {
  active: false, proj: null, tasks: [], projIdx: 0, acc: 0, phase: 'work',
  cool: { support: 0, wake: 0, chat: 0, project: 0 },

  start() {
    this.active = true;
    World.clear(); UI.reset();
    UI.tasksProvider = () => this.proj ? [{ title: this.proj.title, items: this.tasks.map(t => ({ text: t.text, status: t.status, who: t.who ? (t.status === 'completed' ? '✓ ' : '') + t.who : 'Sahipsiz' })) }] : [];
    this.projIdx = randi(0, PROJECTS.length - 1);
    this.cool = { support: G.time + 25, wake: G.time + 18, chat: 0, project: 0 };
    this.newProject(false);
    const team = CAST.map(c => {
      const a = World.add(new Agent({ name: c.name, role: c.role, seed: c.seed, look: makeLook(c.seed, c.shirt) }));
      a.lead = !!c.lead; a.fatigue = rand(0, 40); a.mind = 'free';
      return a;
    });
    const [opus, sonnet, haiku, fable, s2, h2, o2] = team;
    haiku.prefLaptop = true; h2.prefLaptop = true;
    [opus, sonnet, fable].forEach((a, i) => {
      a.needDesk(); a.place(a.desk); a.seated = true;
      const t = this.tasks[i]; t.reserved = true; t.status = 'in_progress'; t.who = a.name; t.step = randi(1, 3);
      a.task = t; a.mind = 'busy';
    });
    const ks = SPOTS.kitchen[0]; haiku.place(ks); haiku.mug = true;
    [[s2, SPOTS.sleep[0]], [h2, SPOTS.sleep[2]]].forEach(([a, sp]) => { a.place(sp); a.sleeping = true; a.mind = 'sleep'; a.setStatus('sleeping', 'Kestiriyor'); });
    o2.needDesk(); o2.place(o2.desk); o2.pose = 'deskSleep'; o2.sleeping = true; o2.seated = true; o2.mind = 'sleep'; o2.screen = 'off'; o2.setStatus('sleeping', 'Masada sızdı');
    for (const a of team) {
      if (a.mind === 'sleep') this.napPlan(a, rand(60, 140));
      else this.next(a);
    }
    World.hooks.push(dt => this.tick(dt));
    UI.sys(`Demo başladı. Proje: ${this.proj.title}. Ajanlar gerçek değil, ofis kendi kendine dönüyor.`);
    UI.renderTeam(true);
  },
  stop() { this.active = false; },

  newProject(meeting) {
    const p = PROJECTS[this.projIdx++ % PROJECTS.length];
    this.proj = p;
    this.tasks = p.tasks.map(text => ({ text, status: 'pending', who: '', step: 0, steps: makeSteps(p) }));
    World.board = { title: p.title, items: this.tasks };
    document.getElementById('subtitle').textContent = 'Demo · ' + p.title;
    if (meeting) this.standup();
  },

  free() { return G.agents.filter(a => a.kind === 'main' && a.mind === 'free' && !a.task && !a.removed); },
  pending() { return this.tasks.filter(t => t.status === 'pending' && !t.reserved); },
  subCount() { return G.agents.filter(a => a.kind === 'sub').length; },
  lead() { return G.agents.find(a => a.lead && !a.removed); },

  tick(dt) {
    if (!this.active) return;
    this.acc += dt; if (this.acc < 1) return; this.acc = 0;
    for (const a of G.agents) if (a.mind === 'waking' && a.sleeping && G.time - (a.wakingAt || 0) > 20) a.mind = 'sleep';
    if (this.phase !== 'work') return;
    const free = this.free();
    for (const t of this.pending()) { const a = free.shift(); if (!a) break; this.assign(a, t); }
    const still = this.pending();
    if (still.length) {
      const sleepers = G.agents.filter(a => a.mind === 'sleep' && a.sleeping);
      if (sleepers.length && G.time > this.cool.wake) { this.cool.wake = G.time + 16; this.wake(pick(sleepers)); }
      else if (still.length >= 2 && this.subCount() < 2 && G.time > this.cool.support) { this.cool.support = G.time + 45; this.callSupport(); }
    }
    if (this.tasks.length && this.tasks.every(t => t.status === 'completed')) this.celebrate();
  },

  assign(a, t) {
    t.reserved = true; t.who = a.name; a.task = t; a.mind = 'busy';
    this.next(a);
  },

  next(a) {
    if (!this.active || a.removed) return;
    if (a.kind === 'sub') return this.subNext(a);
    if (a.task) return this.work(a);
    return this.idle(a);
  },

  // ---- çalışma ----
  work(a) {
    a.mind = a.kind === 'sub' ? 'support' : 'busy';
    const t = a.task;
    a.run(async api => {
      await a.goWork(api);
      t.status = 'in_progress';
      a.mug = false;
      a.setStatus('working', t.text);
      if (t.step === 0 && chance(0.6)) a.say(fill(pick(L.start), { task: t.text }));
      while (t.step < t.steps.length) {
        const st = t.steps[t.step];
        // ara sıra kalkıp arşive ya da sunucuya git
        if (st.tool === 'Read' && chance(0.15)) {
          a.setStatus('working', 'Arşivde arıyor'); await api.go(SPOTS.shelf[0]); a.setIcon('search', '#2a1f2a', 3); await api.wait(3); await a.goWork(api);
        } else if (st.tool === 'Bash' && chance(0.1)) {
          a.setStatus('working', 'Sunucuya bakıyor'); await api.go(SPOTS.server[0]); a.setIcon('term', '#2a1f2a', 3); await api.wait(3); await a.goWork(api);
        }
        a.screen = st.screen;
        a.typing = st.screen === 'code' || st.screen === 'term';
        a.setStatus(st.screen === 'think' ? 'thinking' : 'working');
        a.setIcon(st.icon, '#2a1f2a', Math.min(st.dur, 2.5));
        a.logAction(st.label);
        if (st.label.startsWith('Write')) { World.printing = G.time + 2.5; Sfx.printer(); }
        const vars = { task: t.text, file: pick(this.proj.files) };
        if (st.screen === 'think' && chance(0.5)) a.say(fill(pick(L.think), vars), 'think');
        else if (chance(0.05)) { a.duckUntil = G.time + 14; a.say(pick(['Lastik ördek, dinle: bu fonksiyon neden null dönüyor?', 'Ördeğe anlatırken hatayı buldum!', 'Lastik ördek her şeyi bilir.', 'Ördek, sence bu bir yarış durumu mu?'])); }
        else if (chance(0.16)) a.say(fill(pick(L.work), vars));
        else if (chance(0.12) && G.time > this.cool.chat) { this.cool.chat = G.time + 10; this.deskChat(a, vars); }
        await api.wait(st.dur);
        t.step++;
        a.fatigue = (a.fatigue || 0) + st.dur;
      }
      t.status = 'completed';
      a.lastTask = t.text;
      a.task = null; a.typing = false; a.screen = 'idle';
      a.setIcon('check', '#3aa070', 2.5);
      a.setStatus('done', t.text + ' bitti');
      a.logAction('✓ ' + t.text);
      Sfx.done(a.x);
      a.say(fill(pick(L.done), { task: t.text }));
      const mate = G.agents.find(b => b !== a && !b.sleeping && b.visible && b.kind === 'main' && dist(a, b) < 120);
      if (mate) TIMERS.push({ at: G.time + 1.6, res: () => { if (!mate.removed && !mate.sleeping) mate.say(pick(L.doneReply)); } });
      await api.wait(2.5);
    }).then(ok => { if (ok) { a.mind = a.kind === 'sub' ? 'support' : 'free'; this.next(a); } });
  },

  deskChat(a, vars) {
    const b = G.agents.filter(o => o !== a && o.seated && !o.sleeping && !o.chatting && o.visible);
    if (!b.length) return;
    const o = pick(b);
    const sc = pick(L.ask);
    const v = Object.assign({ other: o.name }, vars);
    a.chatting = o.chatting = true;
    a.say(fill(sc[0], v));
    TIMERS.push({ at: G.time + 3, res: () => { if (!o.removed) o.say(fill(sc[1], Object.assign({}, v, { other: a.name }))); } });
    TIMERS.push({ at: G.time + 6, res: () => { if (!a.removed && sc[2]) a.say(fill(sc[2], v)); a.chatting = o.chatting = false; } });
  },

  async converse(api, a, b, sc, vars) {
    a.chatting = b.chatting = true;
    try {
      a.dir = b.x > a.x ? 'right' : 'left';
      if (b.pose === 'stand') b.dir = a.x > b.x ? 'right' : 'left';
      for (let i = 0; i < sc.length; i++) {
        const sp = i % 2 ? b : a;
        if (sp.removed) break;
        sp.say(fill(sc[i], Object.assign({ other: (sp === a ? b : a).name }, vars || {})));
        await api.wait(clamp(1.8 + sc[i].length * 0.05, 2.4, 4));
      }
    } finally { a.chatting = b.chatting = false; }
  },

  // ---- boş zaman ----
  idle(a) {
    a.mind = 'free';
    a.run(async api => {
      for (;;) {
        let act = Hangout.pick();
        if (a.fatigue > 80 && chance(0.6)) act = 'nap';
        if (act === 'nap') { await this.nap(a, api); continue; }
        await Hangout.run(act, a, api);
        await api.wait(rand(1, 3));
      }
    });
  },

  // kedi işi gibi kısa bir görevden dönen ajanı eski hâline al
  resume(a, wasAsleep) {
    if (!this.active || a.removed) return;
    if (wasAsleep) {
      a.mind = 'sleep';
      a.run(async api => {
        await a.sleepSomewhere(api, true);
        await api.wait(rand(40, 90));
        await a.wakeUp(api, pick(L.rested));
        a.fatigue = 0;
      }).then(ok => { if (ok) { a.mind = 'free'; this.next(a); } });
      return;
    }
    a.mind = a.task ? 'busy' : 'free';
    this.next(a);
  },

  async visit(a, api, list, lines, action) {
    const sp = freeSpot(list, a);
    if (!sp) { await api.wait(2); return; }
    a.setStatus('break', action);
    await api.go(sp);
    if (lines && chance(0.5)) await api.say(pick(lines), 2.4);
    await api.wait(rand(6, 12));
  },

  async coffee(a, api) {
    const sp = freeSpot(SPOTS.coffee, a);
    if (!sp) { await this.visit(a, api, SPOTS.kitchen, null, 'Mutfakta'); return; }
    a.setStatus('break', 'Kahve alıyor');
    await api.go(sp);
    World.coffeeBrew = G.time + 3;
    Sfx.coffee();
    await api.wait(3);
    a.mug = true;
    const ks = freeSpot(SPOTS.kitchen, a);
    if (ks) await api.go(ks);
    a.setStatus('break', 'Kahve molası');
    const mate = G.agents.find(b => b !== a && b.mind === 'free' && b.spot && SPOTS.kitchen.includes(b.spot) && !b.chatting && b.pose !== 'walk');
    if (mate && G.time > this.cool.chat) { this.cool.chat = G.time + 8; await this.converse(api, a, mate, pick(L.kitchen)); }
    else if (chance(0.35)) await api.say(pick(['Ohh, kahve.', 'Kafein yükleniyor…', 'Bu kahve harika.', 'Bir yudum daha, sonra iş.']), 2.2);
    await api.wait(rand(5, 10));
  },

  async nap(a, api) {
    a.mind = 'sleep';
    await api.say(pick(L.sleepy), 2);
    await a.sleepSomewhere(api, true);
    if (!a.sleeping) { a.mind = 'free'; return; }
    await api.wait(rand(40, 90));
    await a.wakeUp(api, pick(L.rested));
    a.fatigue = 0; a.mind = 'free'; a.setStatus('idle', 'Yeni uyandı');
  },
  napPlan(a, secs) {
    a.run(async api => {
      await api.wait(secs);
      await a.wakeUp(api, pick(L.rested));
      a.fatigue = 0;
    }).then(ok => { if (ok) { a.mind = 'free'; this.next(a); } });
  },

  adjacent(s) {
    const tx = clamp(Math.floor(s.x / T), 0, COLS - 1), ty = clamp(Math.floor((s.y - 2) / T), 0, ROWS - 1);
    const cand = [[1, 0], [-1, 0], [0, 1], [1, 1], [-1, 1], [0, -1]];
    for (const [dx, dy] of cand) {
      const x = tx + dx, y = ty + dy;
      if (x > 0 && y > 1 && x < COLS - 1 && y < ROWS - 1 && !BLOCK[y][x]) {
        const dir = dy === 1 && !dx ? 'up' : dx > 0 ? 'left' : dx < 0 ? 'right' : 'down';
        return { tx: x, ty: y, x: x * T + 8, y: y * T + 11, dir, pose: 'stand' };
      }
    }
    return { tx, ty: ty + 1, x: tx * T + 8, y: (ty + 1) * T + 11, dir: 'up' };
  },
  nearDesk(c) {
    const d = c.desk;
    if (!d) return this.adjacent(c);
    for (const dx of [2, -1, 3, -2]) {
      const x = d.tx + dx;
      if (x > 0 && x < COLS - 1 && !BLOCK[d.ty][x]) return { tx: x, ty: d.ty, x: x * T + 8, y: d.ty * T + 11, dir: dx > 0 ? 'left' : 'right', pose: 'stand' };
    }
    return this.adjacent(c);
  },

  // ---- uyandırma ----
  wake(s) {
    s.mind = 'waking'; s.wakingAt = G.time;
    const w = this.lead();
    const done = ok => { if (ok) { s.mind = 'free'; s.fatigue = 0; this.next(s); } };
    if (!w || w === s || !['busy', 'free'].includes(w.mind) || chance(0.25)) {
      s.run(async api => { s.setIcon('bolt', '#e07a55', 2); Sfx.alarm(s.x); await api.say(pick(L.alarm), 2.2); await s.wakeUp(api); }).then(done);
      return;
    }
    w.mind = 'errand';
    w.run(async api => {
      w.setStatus('working', `${s.name} uyandırılıyor`);
      await api.go(this.adjacent(s));
      await api.say(fill(pick(L.wakeCall), { other: s.name }), 2.2, 'shout');
      s.run(async a2 => { await s.wakeUp(a2); }).then(done);
      await api.wait(2.2);
    }).then(ok => { if (ok) { w.mind = w.task ? 'busy' : 'free'; this.next(w); } });
  },

  // ---- destek çağırma ----
  callSupport(force) {
    const t = this.pending()[0] || (force ? null : undefined);
    if (t === undefined) return;
    const type = pick(SUPPORT_TYPES);
    let c = this.lead();
    if (!c || !['busy', 'free'].includes(c.mind)) c = G.agents.find(a => a.kind === 'main' && ['busy', 'free'].includes(a.mind));
    if (!c) return;
    if (t) { t.reserved = true; t.who = type.name; }
    c.mind = 'errand';
    UI.sys(`${c.name} destek hattını arıyor: ${type.name} isteniyor.`);
    c.run(async api => {
      await c.phoneCall(api, fill(pick(L.phone), { project: this.proj.title, type: type.name }), 3.2);
      await api.say(pick(L.phoneEnd), 1.8);
    }).then(ok => { if (ok) { c.mind = c.task ? 'busy' : 'free'; this.next(c); } });
    TIMERS.push({ at: G.time + 6, res: () => this.spawnSupport(type, c, t) });
  },

  spawnSupport(type, caller, task) {
    if (!this.active) return;
    const seed = randi(1000, 99999);
    const s = World.add(new Agent({ name: type.name, role: type.role, kind: 'sub', seed, look: caller ? makeLook(seed, caller.look.shirt) : undefined }));
    s.mind = 'support'; s.caller = caller; s.parentAgent = caller;
    if (!task) { task = { text: 'Kod taraması', status: 'pending', who: s.name, step: 0, steps: makeSteps(this.proj), reserved: true }; this.tasks.push(task); }
    s.task = task; task.who = s.name;
    UI.sys(`${s.name} destek ajanı kapıdan girdi.`);
    s.run(async api => {
      const near = caller && !caller.removed ? this.nearDesk(caller) : SPOTS.reception[0];
      await s.arrive(api, near);
      s.wave = true;
      await api.say(fill(pick(L.greet), { name: s.name, who: caller ? caller.name : 'ekip' }), 2.8);
      s.wave = false;
      if (caller && !caller.removed && !caller.sleeping) caller.say(fill(pick(L.brief), { task: task.text }));
      await api.wait(2.6);
    }).then(ok => { if (ok) this.work(s); });
  },

  subNext(s) {
    if (s.task) return this.work(s);
    const t = this.pending()[0];
    if (t && chance(0.45)) { t.reserved = true; t.who = s.name; s.task = t; return this.work(s); }
    s.run(async api => {
      const c = s.caller && !s.caller.removed ? s.caller : null;
      s.freeDesk();
      if (c) {
        await api.go(c.desk ? this.nearDesk(c) : this.adjacent(c));
        await api.say(fill(pick(L.report), { task: s.lastTask || 'İş' }), 2.8);
        if (!c.sleeping) c.say(pick(L.thanks));
        await api.wait(2.2);
      }
      UI.sys(`${s.name} işini bitirdi ve ofisten ayrılıyor.`);
      await s.leave(api, pick(L.bye));
    });
  },

  // ---- toplantı ve kutlama ----
  standup() {
    this.phase = 'standup';
    const lead = this.lead();
    const awake = G.agents.filter(a => a.kind === 'main' && !['sleep', 'waking', 'errand'].includes(a.mind) && a !== lead);
    const meetSeats = SPOTS.meetTop.concat(SPOTS.meetBottom);
    for (const a of awake.concat(lead ? [lead] : [])) if (a.spot && meetSeats.includes(a.spot)) release(a);
    const seats = shuffle(meetSeats.filter(s => !s.owner && !s.by));
    awake.forEach((a, i) => {
      a.mind = 'meeting';
      const seat = seats[i];
      a.run(async api => {
        a.setStatus('meeting', 'Toplantıya gidiyor');
        if (seat) await api.go(seat);
        a.setStatus('meeting', 'Toplantıda');
        await api.wait(999);
      });
    });
    if (!lead) { this.phase = 'work'; return; }
    lead.mind = 'meeting';
    lead.run(async api => {
      if (lead.sleeping) await lead.wakeUp(api);
      lead.setStatus('meeting', 'Toplantı yönetiyor');
      await api.go(SPOTS.board[0]);
      for (let i = 0; i < 40; i++) { if (awake.every(a => a.removed || a.pose !== 'walk')) break; await api.wait(0.5); }
      for (const line of L.standupLead) await api.say(fill(line, { project: this.proj.title }), 2.6);
      for (const a of awake) {
        if (a.removed || a.mind !== 'meeting') continue;
        const t = this.pending()[0];
        if (!t) break;
        t.reserved = true; a.task = t; t.who = a.name;
        a.say(fill(pick(L.standupTake), { task: t.text }));
        await api.wait(2.4);
      }
      const lt = this.pending()[0];
      if (lt) { lt.reserved = true; lead.task = lt; lt.who = lead.name; }
      await api.say(pick(L.standupEnd), 2);
    }).then(() => {
      this.phase = 'work';
      for (const a of G.agents) if (a.mind === 'meeting') { a.mind = a.task ? 'busy' : 'free'; this.next(a); }
    });
  },

  celebrate() {
    this.phase = 'party';
    const lead = this.lead();
    if (lead) lead.say(fill(L.party[0], { project: this.proj.title }), 'shout');
    UI.sys(`${this.proj.title} projesi tamamlandı.`);
    World.burst(W / 2, 120, 70);
    Sfx.jingle();
    G.agents.filter(a => a.kind === 'main' && !a.sleeping && a !== lead).forEach((a, i) => {
      TIMERS.push({ at: G.time + 1 + i * 0.6, res: () => { if (a.removed || a.sleeping) return; a.armsUp = a.pose === 'stand'; a.say(pick(L.party.slice(1))); TIMERS.push({ at: G.time + 1.8, res: () => { a.armsUp = false; } }); } });
    });
    // kutlama pizzası: telefon, kurye, toplantı masasında ziyafet
    TIMERS.push({ at: G.time + 4, res: () => this.orderPizza() });
    TIMERS.push({ at: G.time + 75, res: () => { if (this.active && this.phase === 'party') this.newProject(true); } });
  },

  orderPizza() {
    if (!this.active) return;
    const lead = this.lead();
    const c = lead && ['free', 'busy'].includes(lead.mind) && !lead.sleeping ? lead : G.agents.find(a => a.kind === 'main' && a.mind === 'free' && !a.sleeping);
    if (c) {
      c.mind = 'errand';
      c.run(async api => {
        await c.phoneCall(api, pick(['Alo, pizzacı? Ekibe beş büyük pizza lütfen!', 'İyi akşamlar, bol malzemeli pizza istiyoruz. Kutlama var!', 'Pizzacı mı? Bir ofis dolusu aç ajan var.']), 3.2);
        await api.say('Pizzalar yolda!', 1.8);
      }).then(ok => { if (ok) { c.mind = 'free'; this.next(c); } });
    }
    UI.sys('Kutlama için pizza söylendi.');
    TIMERS.push({ at: G.time + 9, res: () => this.courier() });
  },

  courier() {
    if (!this.active) return;
    const seed = randi(1, 99999);
    const look = makeLook(seed, '#d0453a');
    look.style = 'cap'; look.cap = '#f2c14e'; look.glasses = false; look.phones = false;
    const c = World.add(new Agent({ name: 'Kurye', role: 'Pizza teslimatı', kind: 'guest', seed, look }));
    c.mug = false;
    c.run(async api => {
      await c.arrive(api, { tx: 7, ty: 5, x: 7 * T + 8, y: 5 * T + 11, dir: 'left', pose: 'stand' });
      c.setStatus('arriving', 'Pizzaları getirdi');
      await api.say('Pizzalar geldi! Afiyet olsun.', 2.4);
      World.pizzaUntil = G.time + 60; World.pizzaSlices = 9;
      UI.sys('Pizzalar geldi, ekip toplantı masasına toplanıyor.');
      this.pizzaParty();
      await api.wait(1);
      await c.leave(api, 'İyi çalışmalar!');
    });
  },

  pizzaParty() {
    const eaters = G.agents.filter(a => a.kind === 'main' && a.mind === 'free' && !a.sleeping);
    const seats = shuffle(SPOTS.meetTop.concat(SPOTS.meetBottom).filter(s => !s.owner && !s.by));
    eaters.forEach((a, i) => {
      const seat = seats[i];
      if (!seat) return;
      a.mind = 'party';
      a.run(async api => {
        a.setStatus('break', 'Pizza yiyor');
        await api.go(seat);
        if (World.pizzaSlices > 0) { World.pizzaSlices--; a.slice = true; }
        await api.wait(rand(0.5, 2));
        if (chance(0.7)) a.say(pick(['Ohh, sıcacık.', 'Ananaslı olanı kim söyledi?!', 'En güzel pizza kutlama pizzasıdır.', 'Bir dilim daha alabilir miyim?', 'Kod yazmaktan iyidir.', 'Peynir uzadıkça uzuyor.']));
        await api.wait(rand(10, 16));
        if (World.pizzaSlices > 0 && chance(0.5)) { World.pizzaSlices--; a.say('Bir tane daha…'); await api.wait(5); }
        a.slice = false;
        await api.wait(60);
      });
    });
    TIMERS.push({ at: G.time + 24, res: () => { if (this.active && this.phase === 'party') this.newProject(true); } });
  },

  // ---- düğmeler ----
  forceSupport() { if (this.subCount() >= 3) { UI.sys('Ofiste zaten yeterince destek ajanı var.'); return; } this.callSupport(true); },
  wakeAll() {
    const sl = G.agents.filter(a => a.sleeping);
    if (!sl.length) { UI.sys('Uyuyan ajan yok.'); return; }
    const lead = this.lead();
    if (lead && !lead.sleeping) lead.say('Herkes kalksın, iş var!', 'shout');
    sl.forEach((s, i) => TIMERS.push({ at: G.time + 0.6 + i * 0.5, res: () => {
      s.mind = 'waking';
      s.run(async api => { await s.wakeUp(api); }).then(ok => { if (ok) { s.mind = 'free'; s.fatigue = 0; this.next(s); } });
    } }));
  },
  skipProject() {
    if (this.phase === 'standup') return;
    for (const a of G.agents) if (a.task) { a.task = null; }
    for (const a of G.agents) if (a.kind === 'main' && ['busy', 'free'].includes(a.mind)) { a.mind = 'free'; }
    this.newProject(true);
  },
};
