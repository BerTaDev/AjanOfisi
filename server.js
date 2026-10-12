// Ajan Ofisi — canlı köprü
// ~/.claude/projects altındaki oturum kayıtlarını (jsonl) izler, olayları SSE ile tarayıcıya yollar.
// Hiçbir ayar dosyasını değiştirmez, sadece okur.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = Number(process.env.AJAN_OFISI_PORT || 4777);
const ROOT = path.join(os.homedir(), '.claude', 'projects');
const WINDOW_MS = 10 * 60 * 60 * 1000;   // son 10 saatte dokunulan oturumlar ofiste görünür
const BOOT_TAIL = 768 * 1024;            // ilk açılışta dosyanın son kısmını oku
const IDLE_MS = 25 * 1000;               // araç beklemiyorsa ve 25 sn ses yoksa: mola
const WAIT_MS = 14 * 1000;               // araç sonucu 14 sn gelmezse: onay bekliyor olabilir
const SUB_STALE_MS = 8 * 60 * 1000;      // destek ajanı 8 dk sessizse gitmiş say
const LONG_TOOLS = /^(Bash|PowerShell|Agent|Task|WebSearch|WebFetch|Monitor|Workflow|mcp__)/;

const files = new Map();    // dosya yolu -> izleme bilgisi
const sessions = new Map(); // oturum/ajan id -> durum
const clients = new Set();
let firstScanDone = false;

// ---------- yardımcılar ----------
const now = () => Date.now();
const short = (s, n) => {
  s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
};
const base = p => (p ? String(p).split(/[\\/]/).filter(Boolean).pop() : '');

function modelLabel(m) {
  if (!m || m === '<synthetic>') return '';
  const r = /claude-(opus|sonnet|haiku|fable)-(\d+)(?:-(\d+))?/i.exec(m);
  if (!r) return m;
  const n = r[1][0].toUpperCase() + r[1].slice(1);
  return r[3] && r[3].length <= 2 ? `${n} ${r[2]}.${r[3]}` : `${n} ${r[2]}`;
}

function toolDetail(name, input) {
  input = input || {};
  const n = name || '';
  if (/^(Read|Edit|Write|MultiEdit|NotebookEdit)$/.test(n)) return base(input.file_path || input.notebook_path);
  if (n === 'Bash' || n === 'PowerShell') return short(input.description || input.command, 70);
  if (n === 'Grep') return short(input.pattern, 50);
  if (n === 'Glob') return short(input.pattern, 50);
  if (n === 'WebSearch') return short(input.query, 60);
  if (n === 'WebFetch') { try { return new URL(input.url).host; } catch (e) { return short(input.url, 50); } }
  if (n === 'Agent' || n === 'Task') return short(input.description || input.prompt, 60);
  if (n === 'TodoWrite') return (input.todos || []).length + ' madde';
  if (n === 'Skill') return short(input.skill, 40);
  if (n === 'Artifact') return short(input.action || 'publish', 30);
  if (n.startsWith('mcp__')) {
    const first = Object.values(input).find(v => typeof v === 'string');
    return short(first || '', 50);
  }
  const first = Object.values(input).find(v => typeof v === 'string');
  return short(first || '', 50);
}

function toolLabel(name) {
  if (!name) return '';
  if (name.startsWith('mcp__')) {
    const parts = name.split('__');
    let srv = parts[1] || '';
    if (/^[0-9a-f-]{20,}$/i.test(srv)) srv = 'MCP';
    srv = srv.replace(/^Claude_/, '').replace(/^claude-in-/, '').replace(/_/g, ' ');
    return `${srv} · ${parts.slice(2).join('_')}`;
  }
  return name;
}

function cleanText(t) {
  return String(t || '')
    .replace(/```[\s\S]*?```/g, ' [kod] ')
    .replace(/<[^>]{1,40}>/g, ' ')
    .replace(/[*_`#>|]/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------- oturum durumu ----------
function getSession(id, info) {
  let s = sessions.get(id);
  if (!s) {
    s = {
      id, sub: !!info.sub, parent: info.parent || null,
      title: '', project: '', model: '', agentType: info.agentType || '', description: info.description || '',
      status: 'idle', lastTs: 0, idleSince: 0, lastAction: '', lastPrompt: '', todos: [],
      pending: new Map(), done: false, tools: 0, file: info.file
    };
    sessions.set(id, s);
  }
  return s;
}

function pub(s) {
  return {
    id: s.id, sub: s.sub, parent: s.parent, title: s.title, project: s.project, model: s.model,
    agentType: s.agentType, description: s.description, status: s.status, lastTs: s.lastTs,
    idleSince: s.idleSince, lastAction: s.lastAction, lastPrompt: s.lastPrompt, todos: s.todos,
    done: s.done, tools: s.tools
  };
}

function emit(ev) {
  const line = `data: ${JSON.stringify(ev)}\n\n`;
  for (const res of clients) { try { res.write(line); } catch (e) { /* bağlantı kopmuş */ } }
}

function setStatus(s, st, quiet) {
  if (s.status === st) return;
  s.status = st;
  if (st === 'idle' || st === 'done') s.idleSince = s.lastTs || now();
  if (!quiet && !s.hidden) emit({ t: 'status', id: s.id, status: st, idleSince: s.idleSince });
}

// Bir jsonl satırını işle. quiet=true ise sadece durumu güncelle (ilk okuma).
function handleLine(s, o, quiet) {
  const ts = o.timestamp ? Date.parse(o.timestamp) : 0;
  const out = ev => { if (!quiet && !s.hidden) emit(Object.assign({ id: s.id, ts }, ev)); };

  if (o.type === 'agent-name' && o.agentName) { s.title = o.agentName; return; }
  if (o.type === 'custom-title' && o.customTitle) { s.title = o.customTitle; return; }
  if (o.type === 'summary' && o.summary && !s.title) { s.title = o.summary; return; }
  if (o.type !== 'user' && o.type !== 'assistant') return;
  if (ts) s.lastTs = Math.max(s.lastTs, ts);
  if (o.cwd && !s.project) s.project = base(o.cwd);
  const msg = o.message || {};
  const content = msg.content;

  if (o.type === 'assistant') {
    const ml = modelLabel(msg.model);
    if (ml) s.model = ml;
    if (s.status !== 'working' && !s.done) setStatus(s, 'working', quiet);
    for (const c of Array.isArray(content) ? content : []) {
      if (c.type === 'tool_use') {
        s.tools++;
        const label = toolLabel(c.name);
        const detail = toolDetail(c.name, c.input);
        s.lastAction = detail ? `${label} · ${detail}` : label;
        s.pending.set(c.id, { name: c.name, ts: ts || now() });
        if (c.name === 'TodoWrite' && Array.isArray(c.input && c.input.todos)) {
          s.todos = c.input.todos.slice(0, 12).map(t => ({ text: short(t.content || t.activeForm, 80), status: t.status }));
          out({ t: 'todos', items: s.todos });
        }
        out({
          t: 'tool', tool: c.name, label, detail, toolId: c.id,
          sub: (c.name === 'Agent' || c.name === 'Task') ? (c.input && c.input.subagent_type) || 'general-purpose' : undefined
        });
      } else if (c.type === 'text' && c.text && c.text.trim()) {
        const t = cleanText(c.text);
        if (t) { s.lastSay = t; out({ t: 'say', text: short(t, 220) }); }
      } else if (c.type === 'thinking' && c.thinking && c.thinking.trim()) {
        out({ t: 'think', text: short(cleanText(c.thinking), 140) });
      }
    }
    if (msg.stop_reason === 'end_turn' && s.pending.size === 0) {
      if (s.sub) { s.done = true; setStatus(s, 'done', quiet); }
      else setStatus(s, 'idle', quiet);
    }
    return;
  }

  // user satırı
  if (Array.isArray(content)) {
    let gotResult = false;
    for (const c of content) {
      if (c.type === 'tool_result') {
        gotResult = true;
        const p = s.pending.get(c.tool_use_id);
        s.pending.delete(c.tool_use_id);
        out({ t: 'tool_done', toolId: c.tool_use_id, tool: p && p.name, error: !!c.is_error });
      }
    }
    if (gotResult) {
      if (s.status === 'waiting') setStatus(s, 'working', quiet);
      return;
    }
  }
  if (o.isMeta || o.isSidechain && !s.sub) return;
  let text = typeof content === 'string' ? content
    : Array.isArray(content) ? content.filter(c => c.type === 'text').map(c => c.text).join(' ') : '';
  text = String(text || '').trim();
  if (!text || text.startsWith('<') || text.startsWith('[Request interrupted')) return;
  const t = short(cleanText(text), 200);
  if (!t) return;
  s.lastPrompt = t;
  s.done = false;
  setStatus(s, 'working', quiet);
  out({ t: 'prompt', text: t });
}

// ---------- dosya izleme ----------
function track(file, info) {
  if (files.has(file)) return;
  let st;
  try { st = fs.statSync(file); } catch (e) { return; }
  if (now() - st.mtimeMs > WINDOW_MS) return;
  const f = { file, id: info.id, size: 0, rest: '', info };
  files.set(file, f);
  const s = getSession(info.id, Object.assign({ file }, info));
  // ilk okuma: sessizce durumu kur, sonra tek bir "session" olayı yolla
  const start = st.size > BOOT_TAIL ? st.size - BOOT_TAIL : 0;
  readRange(f, start, st.size, true);
  if (start > 0) f.rest = '';
  if (!s.lastTs) s.lastTs = st.mtimeMs;
  // eski kayıtlarda bekleyen araçlar artık beklemiyor
  if (now() - s.lastTs > IDLE_MS) {
    s.pending.clear();
    if (s.sub && (s.done || now() - s.lastTs > SUB_STALE_MS)) { s.done = true; s.status = 'done'; }
    else if (!s.sub) { s.status = 'idle'; s.idleSince = s.lastTs; }
  }
  if (now() - s.lastTs > WINDOW_MS) { s.hidden = true; return; } // eski oturum: görünmez bekler
  if (s.sub && s.done && firstScanDone) return; // bitmiş destek ajanını yeniden çağırma
  emit({ t: 'session', s: pub(s), fresh: firstScanDone });
}

function readRange(f, from, to, quiet) {
  if (to <= from) { f.size = to; return; }
  let buf;
  try {
    const fd = fs.openSync(f.file, 'r');
    buf = Buffer.alloc(to - from);
    fs.readSync(fd, buf, 0, buf.length, from);
    fs.closeSync(fd);
  } catch (e) { return; }
  f.size = to;
  let text = f.rest + buf.toString('utf8');
  const lines = text.split('\n');
  f.rest = lines.pop();
  // tail okumada ilk satır yarım olabilir
  if (quiet && from > 0) lines.shift();
  const s = sessions.get(f.id);
  for (const line of lines) {
    if (!line.trim()) continue;
    let o;
    try { o = JSON.parse(line); } catch (e) { continue; }
    try { handleLine(s, o, quiet); } catch (e) { /* bozuk satırı atla */ }
  }
}

function scan() {
  let dirs = [];
  try { dirs = fs.readdirSync(ROOT, { withFileTypes: true }).filter(d => d.isDirectory()); } catch (e) { return; }
  for (const d of dirs) {
    const dp = path.join(ROOT, d.name);
    let ents = [];
    try { ents = fs.readdirSync(dp, { withFileTypes: true }); } catch (e) { continue; }
    for (const e of ents) {
      if (e.isFile() && e.name.endsWith('.jsonl')) {
        const id = e.name.slice(0, -6);
        track(path.join(dp, e.name), { id, sub: false });
      } else if (e.isDirectory() && /^[0-9a-f-]{36}$/i.test(e.name)) {
        const subDir = path.join(dp, e.name, 'subagents');
        let subs = [];
        try { subs = fs.readdirSync(subDir); } catch (err) { continue; }
        for (const sf of subs) {
          const m = /^agent-(.+)\.jsonl$/.exec(sf);
          if (!m) continue;
          const full = path.join(subDir, sf);
          if (files.has(full)) continue;
          let meta = {};
          try { meta = JSON.parse(fs.readFileSync(path.join(subDir, `agent-${m[1]}.meta.json`), 'utf8')); } catch (err) { /* meta yok */ }
          track(full, { id: 'sub-' + m[1], sub: true, parent: e.name, agentType: meta.agentType || 'general-purpose', description: meta.description || '' });
        }
      }
    }
  }
  firstScanDone = true;
}

function poll() {
  for (const f of files.values()) {
    let st;
    try { st = fs.statSync(f.file); } catch (e) { continue; }
    const s = sessions.get(f.id);
    if (st.size > f.size) {
      if (s && s.hidden) {
        // uyuyan dosyaya yeni satır geldi: gerçekten yeni bir mesajsa ofise geri al
        readRange(f, f.size, st.size, true);
        if (now() - s.lastTs < IDLE_MS * 4) { s.hidden = false; emit({ t: 'session', s: pub(s), fresh: true }); }
      } else readRange(f, f.size, st.size, false);
    } else if (st.size < f.size) f.size = st.size;
  }
}

function tick() {
  const t = now();
  for (const s of sessions.values()) {
    if (s.sub) {
      if (!s.done && t - s.lastTs > SUB_STALE_MS) { s.done = true; setStatus(s, 'done'); }
      continue;
    }
    if (s.status === 'working') {
      let oldest = 0, longOnly = true;
      for (const p of s.pending.values()) {
        oldest = oldest ? Math.min(oldest, p.ts) : p.ts;
        if (!LONG_TOOLS.test(p.name)) longOnly = false;
      }
      if (s.pending.size && !longOnly && t - oldest > WAIT_MS) setStatus(s, 'waiting');
      else if (!s.pending.size && t - s.lastTs > IDLE_MS) setStatus(s, 'idle');
    }
  }
  // pencere dışına çıkanları ofisten çıkar (dosya izlenmeye devam eder)
  for (const s of sessions.values()) {
    if (!s.hidden && t - s.lastTs > WINDOW_MS) {
      s.hidden = true;
      emit({ t: 'gone', id: s.id });
    }
  }
}

// ---------- http ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml' };

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (url.pathname === '/events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    const list = [...sessions.values()].filter(s => !s.hidden && !(s.sub && s.done)).map(pub);
    res.write(`data: ${JSON.stringify({ t: 'hello', sessions: list, now: now() })}\n\n`);
    clients.add(res);
    const ka = setInterval(() => { try { res.write(': ka\n\n'); } catch (e) { /* */ } }, 20000);
    req.on('close', () => { clients.delete(res); clearInterval(ka); });
    return;
  }
  if (url.pathname === '/state') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify([...sessions.values()].filter(s => !s.hidden).map(pub)));
    return;
  }
  let p = decodeURIComponent(url.pathname);
  if (p === '/') p = '/index.html';
  const fp = path.join(__dirname, path.normalize(p).replace(/^([\\/])+/, ''));
  if (!fp.startsWith(__dirname)) { res.writeHead(403); res.end(); return; }
  fs.readFile(fp, (err, data) => {
    if (err) { res.writeHead(404); res.end('yok'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

scan();
setInterval(scan, 2500);
setInterval(poll, 500);
setInterval(tick, 1000);
server.listen(PORT, '127.0.0.1', () => {
  const n = [...sessions.values()].filter(s => !s.sub && !s.hidden).length;
  console.log(`Ajan Ofisi açık: http://localhost:${PORT}  (${n} oturum izleniyor)`);
});
