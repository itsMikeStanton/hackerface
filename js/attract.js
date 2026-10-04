import { view } from './state.js';
import { rnd, lpad } from './util.js';
import { getRoutine } from './routines.js';
import { REDUCED_MOTION } from './signal.js';

// ── ATTRACT MODE ─────────────────────────────────────────────────────────────
// Left alone on the splash or the menu, the machine goes back to what it began
// as: a screensaver. Routines scroll dimly behind the menu on their own layer —
// never the real output or its queue — and any input clears them.
const IDLE_MS = 30000;
const MAX_LINES = 60;
const el = document.getElementById('attract');
let idleTimer = null, runTimer = null, active = false;

function eligible() {
  if (document.body.classList.contains('splash')) return view.state !== 'BOOT';
  return view.menuMode && !view.currentSection && view.state === 'IDLE' && !view.inputBuffer;
}

function line(text, cls) {
  const div = document.createElement('div');
  if (cls) div.className = cls;
  div.textContent = text || '\u00a0';
  el.appendChild(div);
  while (el.children.length > MAX_LINES) el.removeChild(el.firstChild);
  el.scrollTop = el.scrollHeight;
  return div;
}

// silent copy of terminal.js animateBar, writing to this layer
function bar(cfg, done) {
  const W = 24, steps = cfg.steps || 20, delay = cfg.delay || 75;
  const div = line('', '');
  let step = 0;
  (function tick() {
    if (!active) return;
    const f = Math.round(step/steps*W);
    const b = '█'.repeat(f) + '░'.repeat(W-f);
    if (step < steps) {
      div.textContent = `${cfg.label} [${b}] ${lpad(Math.round(step/steps*100),3)}%`;
      step++;
      runTimer = setTimeout(tick, delay + rnd(0, delay>>1));
    } else {
      div.textContent = `${cfg.label} [${b}] ${cfg.done||'DONE'}`;
      div.className   = cfg.doneCls || '';
      runTimer = setTimeout(done, rnd(60,180));
    }
  })();
}

function run(queue) {
  if (!active) return;
  if (!eligible()) { stop(); return; }
  if (!queue.length) {
    runTimer = setTimeout(() => run([...getRoutine(), null]), rnd(500,1600));
    return;
  }
  const item = queue.shift();
  if (item && item.type === 'bar') { bar(item, () => run(queue)); return; }
  const [cls, text] = !item ? ['', ''] : Array.isArray(item) ? item : ['', item];
  line(text, cls);
  runTimer = setTimeout(() => run(queue), rnd(40,130));
}

function start() {
  if (!eligible()) { arm(); return; }
  active = true;
  el.classList.add('on');
  run([]);
}

function stop() {
  if (active) {
    active = false;
    clearTimeout(runTimer);
    el.classList.remove('on');
    // let the layer fade before emptying it
    setTimeout(() => { if (!active) el.textContent = ''; }, 450);
  }
  arm();
}

function arm() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(start, IDLE_MS);
}

if (!REDUCED_MOTION) {
  ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel'].forEach(t =>
    document.addEventListener(t, stop, { passive: true }));
  window.addEventListener('popstate', stop);
  arm();
}
