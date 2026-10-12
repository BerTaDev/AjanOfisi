// Yan panel: ekip listesi, sohbet, olaylar, görevler, üst bar sayaçları
'use strict';
const UI = {
  rows: new Map(),
  events: [],
  chatCount: 0,
  tab: 'chat',
  tasksProvider: () => [],

  init() {
    this.$team = document.getElementById('team');
    this.$chat = document.getElementById('feedChat');
    this.$events = document.getElementById('feedEvents');
    this.$tasks = document.getElementById('feedTasks');
    this.$stats = document.getElementById('stats');
    this.$ticker = document.getElementById('ticker');
    document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => this.showTab(b.dataset.tab)));
    const logo = document.getElementById('logo').getContext('2d');
    drawSpark(logo, 7, 7, 6, '#e07a55'); drawSpark(logo, 7, 7, 2, '#f6c3ad');
    setInterval(() => { this.renderTeam(); this.renderStats(); if (this.tab === 'tasks') this.renderTasks(); }, 450);
  },

  showTab(tab) {
    this.tab = tab;
    document.querySelectorAll('.tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    this.$chat.hidden = tab !== 'chat';
    this.$events.hidden = tab !== 'events';
    this.$tasks.hidden = tab !== 'tasks';
    if (tab === 'tasks') this.renderTasks();
    if (tab === 'events') this.renderEvents();
    if (tab === 'chat') this.$chat.scrollTop = this.$chat.scrollHeight;
  },

  reset() {
    this.$chat.innerHTML = ''; this.$events.innerHTML = ''; this.$tasks.innerHTML = '';
    this.events = []; this.chatCount = 0; this.rows.clear(); this.$team.innerHTML = '';
    document.getElementById('cntChat').textContent = '';
    document.getElementById('cntEvents').textContent = '';
  },

  near(el) { return !el.clientHeight || el.scrollHeight - el.scrollTop - el.clientHeight < 80; },

  chat(agent, text, kind) {
    const stick = this.near(this.$chat);
    const d = document.createElement('div');
    d.className = 'msg' + (kind === 'think' ? ' think' : '') + (kind === 'sys' ? ' sys' : '');
    const who = document.createElement('div'); who.className = 'who';
    if (agent) { who.style.color = agent.color; who.textContent = agent.name; if (agent.role) { const sm = document.createElement('small'); sm.textContent = ' · ' + agent.role; who.appendChild(sm); } }
    else { who.textContent = 'Ofis'; who.style.color = 'var(--muted)'; }
    const tm = document.createElement('time'); tm.textContent = clock();
    const p = document.createElement('p'); p.textContent = kind === 'think' ? '(' + text + ')' : text;
    d.append(who, tm, p);
    this.$chat.appendChild(d);
    while (this.$chat.children.length > 220) this.$chat.firstChild.remove();
    if (stick) this.$chat.scrollTop = this.$chat.scrollHeight;
    this.chatCount++;
    document.getElementById('cntChat').textContent = this.chatCount;
    if (kind !== 'think') this.ticker((agent ? agent.name + ': ' : '') + text);
  },

  sys(text) { this.chat(null, text, 'sys'); },

  event(agent, text) {
    this.events.push({ uid: agent.uid, name: agent.name, color: agent.color, text, t: clock() });
    if (this.events.length > 400) this.events.shift();
    document.getElementById('cntEvents').textContent = this.events.length;
    if (this.tab === 'events' && (!G.selected || G.selected.uid === agent.uid)) {
      const stick = this.near(this.$events);
      this.$events.appendChild(this.evEl(this.events[this.events.length - 1]));
      while (this.$events.children.length > 300) this.$events.firstChild.remove();
      if (stick) this.$events.scrollTop = this.$events.scrollHeight;
    }
  },
  evEl(e) {
    const d = document.createElement('div'); d.className = 'ev';
    const tm = document.createElement('time'); tm.textContent = e.t;
    const b = document.createElement('b'); b.textContent = e.name; b.style.color = e.color;
    const s = document.createElement('span'); s.textContent = e.text;
    d.append(tm, b, s);
    return d;
  },
  renderEvents() {
    this.$events.innerHTML = '';
    const list = this.events.filter(e => !G.selected || e.uid === G.selected.uid);
    if (G.selected) {
      const h = document.createElement('div'); h.className = 'group';
      h.textContent = `${G.selected.name} filtresi · temizlemek için ajana tekrar tıkla`;
      this.$events.appendChild(h);
    }
    if (!list.length) { const e = document.createElement('div'); e.className = 'empty'; e.textContent = 'Henüz araç çağrısı yok. Ajanlar dosya okudukça, komut çalıştırdıkça burada akacak.'; this.$events.appendChild(e); }
    list.slice(-300).forEach(e => this.$events.appendChild(this.evEl(e)));
    this.$events.scrollTop = this.$events.scrollHeight;
  },

  renderTasks() {
    const groups = this.tasksProvider();
    this.$tasks.innerHTML = '';
    if (!groups.length) { const e = document.createElement('div'); e.className = 'empty'; e.textContent = 'Görev listesi yok. Ajanlar bir yapılacaklar listesi yazınca burada görünür.'; this.$tasks.appendChild(e); return; }
    for (const gr of groups) {
      const h = document.createElement('div'); h.className = 'group'; h.textContent = gr.title; this.$tasks.appendChild(h);
      for (const it of gr.items) {
        const d = document.createElement('div');
        d.className = 'task' + (it.status === 'completed' ? ' done' : it.status === 'in_progress' ? ' doing' : '');
        const i = document.createElement('i');
        const s = document.createElement('span'); s.textContent = it.text;
        if (it.who) { const sm = document.createElement('small'); sm.textContent = it.who; s.appendChild(sm); }
        d.append(i, s); this.$tasks.appendChild(d);
      }
    }
  },

  renderTeam(force) {
    const list = G.agents.slice().sort((a, b) => (a.kind === 'sub') - (b.kind === 'sub') || a.uid - b.uid);
    document.getElementById('teamCount').textContent = list.length ? list.length + ' ajan' : '';
    if (!list.length) {
      if (!this.$team.querySelector('.empty')) this.$team.innerHTML = '<li class="empty">Ofis boş. Canlı modda Claude oturumları açıldıkça ajanlar kapıdan girer.</li>';
      this.rows.clear();
      return;
    }
    const emp = this.$team.querySelector('.empty'); if (emp) emp.remove();
    const seen = new Set();
    list.forEach((a, idx) => {
      seen.add(a.uid);
      let r = this.rows.get(a.uid);
      if (!r) {
        const li = document.createElement('li'); li.className = 'agent'; li.tabIndex = 0;
        const cv = document.createElement('canvas'); cv.width = 14; cv.height = 15;
        const nm = document.createElement('div'); nm.className = 'nm';
        const chip = document.createElement('span'); chip.className = 'chip';
        const act = document.createElement('div'); act.className = 'act';
        li.append(cv, nm, chip, act);
        const sel = () => { G.selected = G.selected === a ? null : a; this.renderTeam(true); if (this.tab === 'events') this.renderEvents(); };
        li.addEventListener('click', sel);
        li.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sel(); } });
        r = { li, cv, nm, chip, act, key: '' };
        this.rows.set(a.uid, r);
      }
      if (this.$team.children[idx] !== r.li) this.$team.insertBefore(r.li, this.$team.children[idx] || null);
      const st = STATUS[a.status] || STATUS.idle;
      const key = [a.name, a.role, a.status, a.action, a === G.selected, a.sleeping, a.pose].join('|');
      if (key !== r.key || force) {
        r.key = key;
        r.nm.textContent = a.name;
        if (a.role) { const sm = document.createElement('small'); sm.textContent = a.role; r.nm.appendChild(sm); }
        r.chip.textContent = st.label; r.chip.style.background = st.col;
        r.act.textContent = a.action || '—';
        r.li.classList.toggle('sel', a === G.selected);
        const g = r.cv.getContext('2d');
        g.clearRect(0, 0, 14, 15);
        drawPerson(g, { x: 7, y: 26, dir: 'down', pose: 'stand', look: a.look, sleeping: a.sleeping, seed: 0 }, 0);
      }
    });
    for (const [uid, r] of this.rows) if (!seen.has(uid)) { r.li.remove(); this.rows.delete(uid); }
  },

  renderStats() {
    const c = { working: 0, break: 0, sleeping: 0, sub: 0, waiting: 0 };
    for (const a of G.agents) {
      if (a.kind === 'sub') c.sub++;
      if (['working', 'thinking', 'phone', 'meeting'].includes(a.status)) c.working++;
      else if (a.status === 'sleeping') c.sleeping++;
      else if (a.status === 'waiting') c.waiting++;
      else if (a.status === 'break' || a.status === 'idle') c.break++;
    }
    const chip = (n, label, col) => `<span class="stat"><span class="dot" style="background:${col}"></span><b>${n}</b>${label}</span>`;
    const html = chip(c.working, 'çalışıyor', 'var(--work)') + (c.waiting ? chip(c.waiting, 'bekliyor', 'var(--wait)') : '') +
      chip(c.break, 'molada', 'var(--rest)') + chip(c.sleeping, 'uyuyor', 'var(--sleep)') + chip(c.sub, 'destek', 'var(--sub)');
    if (html !== this._stats) { this.$stats.innerHTML = html; this._stats = html; }
  },

  ticker(text) { this.$ticker.textContent = shortText(text, 160); },
  notice(html) {
    const n = document.getElementById('notice');
    document.getElementById('noticeText').innerHTML = html;
    n.hidden = !html;
  },
};

window.UI = UI;
