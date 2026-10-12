// Açılış ve üst bar düğmeleri
'use strict';
(function () {
  World.init(document.getElementById('office'));
  UI.init();

  const $ = id => document.getElementById(id);
  const demoOnly = ['speedSeg', 'btnSupport', 'btnWake', 'btnProject'];

  function setMode(mode) {
    if (G.mode === mode && (mode === 'demo' ? Demo.active : Live.active)) return;
    G.mode = mode;
    Demo.stop(); Live.stop();
    $('modeLive').setAttribute('aria-pressed', String(mode === 'live'));
    $('modeDemo').setAttribute('aria-pressed', String(mode === 'demo'));
    demoOnly.forEach(id => { $(id).hidden = mode !== 'demo'; });
    if (mode === 'demo') { setSpeed(G.speed); Demo.start(); }
    else { G.speed = 1; Live.start(); }
    try { localStorage.setItem('ajanOfisiMode', mode); } catch (e) { /* depolama kapalı */ }
  }

  function setSpeed(s) {
    G.speed = s;
    document.querySelectorAll('#speedSeg button').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.speed) === s)));
  }

  $('modeLive').addEventListener('click', () => setMode('live'));
  $('modeDemo').addEventListener('click', () => setMode('demo'));
  document.querySelectorAll('#speedSeg button').forEach(b => b.addEventListener('click', () => setSpeed(Number(b.dataset.speed))));
  $('btnSupport').addEventListener('click', () => Demo.forceSupport());
  $('btnWake').addEventListener('click', () => Demo.wakeAll());
  $('btnProject').addEventListener('click', () => Demo.skipProject());
  $('btnSound').addEventListener('click', () => {
    G.sound = !G.sound;
    if (G.sound) Sfx.unlock();
    $('btnSound').textContent = 'Ses: ' + (G.sound ? 'açık' : 'kapalı');
    $('btnSound').setAttribute('aria-pressed', String(G.sound));
  });
  $('noticeClose').addEventListener('click', () => UI.notice(''));

  // köprü üzerinden açıldıysa canlı mod, dosyadan açıldıysa demo ile başla
  let saved = null;
  try { saved = localStorage.getItem('ajanOfisiMode'); } catch (e) { /* */ }
  const served = location.protocol.startsWith('http') && location.port === '4777';
  const hash = location.hash.replace('#', '');
  setMode(hash === 'demo' || hash === 'live' ? hash : served ? (saved || 'live') : 'demo');
})();
