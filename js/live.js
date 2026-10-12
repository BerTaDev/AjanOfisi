// Canlı mod: köprü sunucusundan gelen gerçek Claude oturumlarını ofise yansıtır
'use strict';
const SUB_NAMES = { 'general-purpose': 'Genel Destek', Explore: 'Explore', Plan: 'Plan', 'claude-code-guide': 'Rehber', 'statusline-setup': 'Kurulumcu' };
const TOOL_LOOK = [
  [/^(Read|NotebookRead|Grep|Glob|ToolSearch|LS)$/, 'doc', 'search'],
  [/^(Edit|Write|MultiEdit|NotebookEdit)$/, 'code', 'code'],
  [/^(Bash|PowerShell|Monitor|BashOutput|KillShell)$/, 'term', 'term'],
  [/^(WebSearch|WebFetch)$|Browser|chrome/i, 'web', 'globe'],
  [/^(TodoWrite|Task(Create|Update|List)|Skill)$/, 'code', 'note'],
  [/^(Agent|Task)$/, 'chat', 'phone'],
];
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return Math.abs(h); }

const Live = {
  active: false, es: null, recs: new Map(), connected: false, ever: false, retryT: null,
  nextBanter: 0, boardFrom: null,

  url() {
    if (location.protocol.startsWith('http') && location.port === '4777') return '/events';
    return 'http://localhost:4777/events';
  },

  start() {
    this.active = true;
    World.clear(); UI.reset(); this.recs.clear();
    UI.tasksProvider = () => [...this.recs.values()].filter(r => r.todos && r.todos.length).map(r => ({ title: r.agent.name, items: r.todos }));
    World.hooks.push(dt => this.tick(dt));
    document.getElementById('subtitle').textContent = 'Canlı · bağlanıyor…';
    this.nextBanter = G.time + 20;
    this.connect();
  },
  stop() {
    this.active = false;
    if (this.es) this.es.close();
    this.es = null; clearTimeout(this.retryT);
    this.setDot(false);
    UI.notice('');
  },
  setDot(on) { document.getElementById('liveDot').classList.toggle('on', on); },

  connect() {
    if (!this.active) return;
    let es;
    try { es = new EventSource(this.url()); } catch (e) { this.fail(); return; }
    this.es = es;
    es.onopen = () => { this.connected = true; this.ever = true; this.setDot(true); UI.notice(''); };
    es.onmessage = e => { let ev; try { ev = JSON.parse(e.data); } catch (err) { return; } if (this.active) this.handle(ev); };
    es.onerror = () => { es.close(); this.connected = false; this.setDot(false); this.fail(); };
  },
  fail() {
    if (!this.active) return;
    document.getElementById('subtitle').textContent = 'Canlı · bağlantı yok';
    UI.notice(this.ever
      ? 'Köprüyle bağlantı koptu, yeniden deneniyor…'
      : 'Canlı mod için köprü kapalı. <code>AjanOfisi\\baslat.bat</code> dosyasını çalıştır, sonra <code>http://localhost:4777</code> adresini aç. O zamana kadar Demo modunu izleyebilirsin.');
    clearTimeout(this.retryT);
    this.retryT = setTimeout(() => this.connect(), 3000);
  },

  updateSubtitle() {
    const mains = [...this.recs.values()].filter(r => !r.s.sub).length;
    document.getElementById('subtitle').textContent = `Canlı · ${mains} oturum`;
  },

  // ---------------- olaylar ----------------
  handle(ev) {
    if (ev.t === 'hello') {
      const ids = new Set(ev.sessions.map(s => s.id));
      for (const [id, r] of this.recs) if (!ids.has(id)) this.gone(r, true);
      ev.sessions.sort((a, b) => (a.sub - b.sub) || (b.lastTs - a.lastTs)).forEach(s => this.upsert(s, true));
      this.updateSubtitle();
      if (!ev.sessions.length) UI.sys('Son 10 saatte Claude oturumu bulunamadı. Bir sohbet başlattığında ajan kapıdan girecek.');
      else UI.sys(`Köprüye bağlandı. ${ev.sessions.filter(s => !s.sub).length} oturum ofiste.`);
      return;
    }
    if (ev.t === 'session') { this.upsert(ev.s, !ev.fresh); this.updateSubtitle(); return; }
    const r = this.recs.get(ev.id);
    if (!r) return;
    const a = r.agent;
    r.lastEvent = G.time;
    switch (ev.t) {
      case 'prompt':
        r.s.lastPrompt = ev.text; r.s.done = false;
        UI.sys(`Yeni görev → ${a.name}: ${ev.text}`);
        this.toWork(r, true);
        a.say('Görev: ' + ev.text, 'shout', 5);
        this.refreshBoard();
        break;
      case 'tool': this.onTool(r, ev); break;
      case 'tool_done':
        if (ev.error) { a.setIcon('excl', '#e5606a', 2); if (G.time - (r.errAt || -99) > 25) { r.errAt = G.time; if (!a.bubble) a.say(pick(['Hmm, hata verdi.', 'Olmadı, başka yol deneyeyim.', 'Bu beklediğim çıktı değil.'])); } }
        break;
      case 'say':
        this.toWork(r);
        a.say(ev.text, 'say', clamp(2 + ev.text.length * 0.045, 3, 8));
        break;
      case 'think':
        this.toWork(r);
        a.screen = 'think';
        if ((!a.bubble || a.bubble.kind === 'think') && G.time - (r.thinkAt || -99) > 7) { r.thinkAt = G.time; a.say(ev.text, 'think', 4); }
        a.setStatus('thinking');
        break;
      case 'todos':
        r.todos = ev.items.map(t => ({ text: t.text, status: t.status }));
        this.boardFrom = r;
        this.refreshBoard();
        this.visitBoard(r);
        break;
      case 'status': this.onStatus(r, ev.status, ev.idleSince); break;
      case 'gone': this.gone(r); break;
    }
  },

  upsert(s, initial) {
    let r = this.recs.get(s.id);
    if (r) { r.s = Object.assign(r.s, s); this.applyNames(r); return; }
    if (s.sub && s.done) return;
    const a = new Agent({ id: s.id, kind: s.sub ? 'sub' : 'main', seed: hashStr(s.id) % 100000 });
    r = { id: s.id, s, agent: a, todos: (s.todos || []).map(t => ({ text: t.text, status: t.status })), mode: '' };
    a.rec = r;
    this.recs.set(s.id, r);
    this.applyNames(r);
    World.add(a);
    if (r.todos.length) this.boardFrom = r;
    if (initial) this.placeInitial(r); else this.enter(r);
    this.refreshBoard();
  },

  applyNames(r) {
    const s = r.s, a = r.agent;
    if (s.sub) {
      a.name = SUB_NAMES[s.agentType] || s.agentType || 'Destek';
      a.role = shortText(s.description || 'Destek ajanı', 46);
    } else {
      a.name = shortText(s.title || s.project || 'Oturum', 26);
      a.role = [s.model, s.project].filter(Boolean).join(' · ');
    }
    a.short = shortText(a.name, 18);
    if (s.lastAction && !a.action) a.action = s.lastAction;
  },

  parentOf(r) { const p = r.s.parent && this.recs.get(r.s.parent); return p ? p.agent : null; },

  placeInitial(r) {
    const a = r.agent, s = r.s;
    const idleFor = Date.now() - (s.idleSince || s.lastTs || Date.now());
    if (s.sub || s.status === 'working' || s.status === 'waiting') {
      a.needDesk(); a.place(a.desk); a.seated = true;
      a.screen = s.status === 'waiting' ? 'wait' : 'code';
      a.setStatus(s.status === 'waiting' ? 'waiting' : 'working', s.lastAction || '');
      r.mode = 'work';
      if (s.status === 'waiting') a.setIcon('quest', '#c27c0e');
      return;
    }
    if (idleFor < 3 * 60 * 1000) {
      const sp = freeSpot(SPOTS.kitchen.concat(SPOTS.lounge), a);
      if (sp) a.place(sp); else { a.needDesk(); a.place(a.desk); }
      a.setStatus('break', 'Yeni görev bekliyor');
      this.idleLoop(r, Math.max(10, 180 - idleFor / 1000));
      return;
    }
    const sp = freeSpot(SPOTS.sleep, a);
    if (sp) { a.place(sp); }
    else { a.needDesk(); a.place(a.desk); a.pose = 'deskSleep'; a.seated = true; }
    a.sleeping = true; a.screen = 'off';
    a.setStatus('sleeping', 'Son iş: ' + this.ago(idleFor) + ' önce');
    r.mode = 'sleep';
  },

  ago(ms) {
    const m = Math.round(ms / 60000);
    if (m < 60) return m + ' dk';
    return Math.round(m / 60) + ' sa';
  },

  // yeni oturum ya da destek ajanı: kapıdan gir
  enter(r) {
    const a = r.agent;
    r.mode = 'work';
    if (r.s.sub) {
      const p = this.parentOf(r);
      UI.sys(`${p ? p.name + ' destek çağırdı: ' : ''}${a.name} geliyor (${a.role}).`);
      a.run(async api => {
        await api.wait(p && p.phone ? 1.5 : 0.3);
        await a.arrive(api, p && p.desk ? Demo.nearDesk(p) : SPOTS.reception[0]);
        a.wave = true;
        await api.say(`Merhaba! ${a.role} için geldim.`, 2.6);
        a.wave = false;
        if (p && !p.sleeping) p.say(pick(['Hoş geldin, sana bırakıyorum.', 'Süper, detaylar sende.', 'Tam zamanında!']));
        await api.wait(1.8);
        await a.goWork(api);
        a.screen = 'code'; a.setStatus('working');
      });
    } else {
      UI.sys(`Yeni oturum açıldı: ${a.name}`);
      a.run(async api => {
        await a.arrive(api, null);
        await api.say(pick(['Günaydın! Ne var ne yok?', 'Merhaba ekip, işe başlıyorum.', 'Selam! Hangi masa boş?']), 2.2);
        await a.goWork(api);
        a.screen = 'think'; a.setStatus('working');
      });
    }
  },

  toWork(r, fromPrompt) {
    const a = r.agent;
    if (r.mode === 'leaving') return;
    if (a.status !== 'waiting') a.setStatus(a.status === 'thinking' ? 'thinking' : 'working');
    if (r.mode === 'work') return;
    const wasAsleep = a.sleeping;
    r.mode = 'work';
    a.run(async api => {
      if (wasAsleep) await a.wakeUp(api, fromPrompt ? pick(['Yeni iş mi? Geliyorum!', 'Uyandım, uyandım!', 'Hemen masaya geçiyorum.']) : undefined);
      a.mug = false;
      await a.goWork(api);
      a.setStatus('working');
    });
  },

  onTool(r, ev) {
    const a = r.agent;
    this.toWork(r);
    let screen = 'code', icon = 'bolt';
    for (const [re, sc, ic] of TOOL_LOOK) if (re.test(ev.tool)) { screen = sc; icon = ic; break; }
    a.screen = screen;
    a.typing = screen === 'code' || screen === 'term';
    if (a.status !== 'waiting') a.setStatus('working');
    a.setIcon(icon, '#2a1f2a', 2.5);
    a.logAction(ev.detail ? `${ev.label} · ${ev.detail}` : ev.label);
    if (/^(Write|NotebookEdit)$/.test(ev.tool)) World.printing = G.time + 2.5;
    if (ev.tool === 'Agent' || ev.tool === 'Task') {
      a.phone = true; a.phoneRing = 0;
      a.setIcon('phone', '#2a1f2a', 3);
      World.lobbyRing = G.time + 2.4;
      Sfx.ring();
      a.say(`Alo destek? Bir ${SUB_NAMES[ev.sub] || ev.sub || 'ajan'} lazım: ${ev.detail}`, 'shout', 3.4);
      TIMERS.push({ at: G.time + 3.4, res: () => { a.phone = false; } });
    }
  },

  onStatus(r, st, idleSince) {
    const a = r.agent;
    r.s.status = st;
    if (idleSince) r.s.idleSince = idleSince;
    if (st === 'working') { a.clearIcon(); this.toWork(r); if (a.screen === 'wait') a.screen = 'code'; }
    else if (st === 'waiting') {
      this.toWork(r);
      a.setStatus('waiting', 'Onay bekliyor: ' + (a.action || ''));
      a.screen = 'wait';
      a.setIcon('quest', '#c27c0e');
      a.say('Devam etmek için onayını bekliyorum…', 'shout', 4);
    } else if (st === 'idle') {
      a.clearIcon();
      a.typing = false; a.screen = 'idle';
      a.setIcon('check', '#3aa070', 3);
      a.setStatus('idle', 'Tur bitti, yeni görev bekliyor');
      this.idleLoop(r, 180);
    } else if (st === 'done' && r.s.sub) this.subLeave(r);
  },

  // turu biten ajan: masada bekler, kahveye gider, sonunda kestirir
  idleLoop(r, untilSleep) {
    const a = r.agent;
    r.mode = 'idle';
    const t0 = G.time;
    a.run(async api => {
      if (a.seated) await api.wait(rand(15, 25));
      await Demo.coffee(a, api);
      while (G.time - t0 < untilSleep) {
        const roll = Math.random();
        if (roll < 0.3) await Demo.visit(a, api, SPOTS.lounge, null, 'Dinleniyor');
        else if (roll < 0.5) await Demo.visit(a, api, SPOTS.windowSpot, L.window, 'Pencereden bakıyor');
        else if (roll < 0.65) await Demo.visit(a, api, SPOTS.arcade, L.arcade, 'Atari oynuyor');
        else await Demo.visit(a, api, SPOTS.kitchen, null, 'Mutfakta');
        await api.wait(rand(2, 5));
      }
      a.mug = false;
      if (chance(0.7)) await api.say(pick(L.sleepy), 2);
      r.mode = 'sleep';
      await a.sleepSomewhere(api, true);
    });
  },

  subLeave(r) {
    const a = r.agent;
    if (r.mode === 'leaving') return;
    r.mode = 'leaving';
    const p = this.parentOf(r);
    a.run(async api => {
      a.typing = false; a.screen = 'idle';
      a.setIcon('check', '#3aa070', 3);
      if (p && !p.removed) {
        await api.go(p.desk ? Demo.nearDesk(p) : Demo.adjacent(p));
        await api.say(`İşim bitti: ${shortText(a.role, 60)}. Rapor sende.`, 3);
        if (!p.sleeping) p.say(pick(L.thanks));
        await api.wait(1.8);
      }
      UI.sys(`${a.name} işini bitirdi, ofisten çıkıyor.`);
      await a.leave(api, pick(L.bye));
    }).then(() => { this.recs.delete(r.id); });
  },

  gone(r, quick) {
    const a = r.agent;
    this.recs.delete(r.id);
    if (quick) { a.removed = true; release(a); a.freeDesk(); return; }
    r.mode = 'leaving';
    a.run(async api => {
      if (a.sleeping) await a.wakeUp(api, 'Mesai bitti, eve gidiyorum.');
      await a.leave(api);
    });
    this.updateSubtitle();
  },

  visitBoard(r) {
    const a = r.agent;
    if (G.time - (r.boardAt || -99) < 50 || a.sleeping || r.mode !== 'work') return;
    r.boardAt = G.time;
    a.run(async api => {
      a.setStatus('working', 'Görev panosunu güncelliyor');
      const sp = SPOTS.board[0];
      await api.go(sp.by && sp.by !== a ? Demo.adjacent({ x: sp.x + 20, y: sp.y }) : sp);
      a.setIcon('note', '#2a1f2a', 2.5);
      await api.wait(2.5);
      await a.goWork(api);
    });
  },

  refreshBoard() {
    const r = this.boardFrom && this.recs.has(this.boardFrom.id) ? this.boardFrom : null;
    if (r && r.todos.length) { World.board = { title: r.agent.name, items: r.todos }; return; }
    const items = [...this.recs.values()].filter(x => !x.s.sub && x.s.lastPrompt).slice(0, 4)
      .map(x => ({ text: x.s.lastPrompt, status: ['working', 'waiting'].includes(x.s.status) ? 'in_progress' : 'completed' }));
    World.board = { title: 'Son görevler', items };
  },

  // ajanlar arası küçük sohbetler (gerçek verilerden)
  tick() {
    if (!this.active || G.time < this.nextBanter) return;
    this.nextBanter = G.time + rand(28, 50);
    const awake = G.agents.filter(a => a.visible && !a.sleeping && !a.removed && a.pose !== 'walk' && !a.bubble);
    if (awake.length < 2) return;
    const a = pick(awake), b = pick(awake.filter(x => x !== a));
    const work = x => ['working', 'thinking'].includes(x.status);
    let sc;
    if (b.kind === 'sub' && work(b)) sc = [`${b.name}, nasıl gidiyor?`, `İyi, ${shortText(b.role, 40)} üzerinde. Az kaldı.`];
    else if (work(a) && work(b)) sc = [`${b.name}, ne üzerindesin?`, b.action ? `Şu an ${shortText(b.action, 50)}.` : 'Kodu okuyorum, birazdan yazarım.', 'Kolay gelsin!'];
    else if (!work(a) && work(b)) sc = [`Kolay gelsin ${b.name}!`, b.action ? `Sağ ol. ${shortText(b.action, 50)} ile uğraşıyorum.` : 'Sağ ol, az kaldı.'];
    else if (work(a) && !work(b)) sc = [`${b.name}, molada mısın?`, pick(['Evet, turum bitti. Yeni görev bekliyorum.', 'Kahve içiyorum, sonra devam.', 'Biraz dinleniyorum.'])];
    else sc = pick(L.kitchen);
    a.say(sc[0]);
    TIMERS.push({ at: G.time + 3, res: () => { if (!b.removed && !b.sleeping) b.say(sc[1]); } });
    if (sc[2]) TIMERS.push({ at: G.time + 6, res: () => { if (!a.removed && !a.sleeping) a.say(sc[2]); } });
  },
};
