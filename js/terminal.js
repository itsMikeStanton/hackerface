import { view } from './state.js';
import { snd } from './audio.js';
import { rnd, lpad } from './util.js';
import { addBackButton } from './menu.js';

// ── TERMINAL STATE ───────────────────────────────────────────────────────────
export const outputEl    = document.getElementById('output');
export const promptSpan  = document.getElementById('prompt-span');
export const inputDispEl = document.getElementById('input-disp');
export const cursorEl    = document.getElementById('cursor');
export const termEl      = document.getElementById('terminal');
export const PROMPT      = 'dmky@notquietly:~$ ';

// ── RUN GENERATION ───────────────────────────────────────────────────────────
// Every async sequence (boot, queue, progress bar, clear wipe) captures the
// generation it started in and bails when it no longer matches, so a stale
// timer chain can never write to — or call setIdle() on — a newer screen.
let runGen = 0;
export function newRun() { return ++runGen; }
export function currentGen() { return runGen; }
export function isCurrent(gen) { return gen === runGen; }

export function addLine(text, cls) {
  const div = document.createElement('div');
  if (cls) div.className = cls;
  div.textContent = text;
  outputEl.appendChild(div);
  if (text) snd.tick();
  while (outputEl.children.length > 600) outputEl.removeChild(outputEl.firstChild);
  outputEl.scrollTop = outputEl.scrollHeight;
  return div;
}

export function setIdle() {
  view.state = 'IDLE';
  promptSpan.textContent = PROMPT;
  inputDispEl.textContent = view.inputBuffer;
  cursorEl.style.visibility = 'visible';
  if (view.menuMode && view.currentSection) addBackButton();
}

// ── ANIMATED PROGRESS BAR ────────────────────────────────────────────────────
export function animateBar(cfg, done, gen) {
  if (gen === undefined) gen = runGen;
  const W     = 24;
  const steps = cfg.steps || 20;
  const delay = cfg.delay || 75;
  const div   = addLine('', '');
  let step = 0;

  function tick() {
    if (gen !== runGen) return;
    const f   = Math.round(step/steps*W);
    const pct = Math.round(step/steps*100);
    const bar = '█'.repeat(f) + '░'.repeat(W-f);
    if (step < steps) {
      div.textContent = `${cfg.label} [${bar}] ${lpad(pct,3)}%`;
      div.className   = '';
      snd.barTick(step/steps);
      step++;
      setTimeout(tick, delay + rnd(0, delay>>1));
    } else {
      div.textContent = `${cfg.label} [${bar}] ${cfg.done||'DONE'}`;
      div.className   = cfg.doneCls || '';
      snd.done();
      outputEl.scrollTop = outputEl.scrollHeight;
      setTimeout(done, rnd(60,180));
    }
  }
  tick();
}

// ── QUEUE PROCESSOR ──────────────────────────────────────────────────────────
export function processQueue(gen) {
  if (gen === undefined) gen = runGen;
  if (gen !== runGen) return;
  if (view.hackQueue.length === 0) { setIdle(); return; }

  const item = view.hackQueue.shift();

  if (item === null || item === undefined) {
    addLine('', '');
    view.hackTimer = setTimeout(() => processQueue(gen), rnd(80,200));
    return;
  }

  if (item.type === 'bar') {
    animateBar(item, () => processQueue(gen), gen);
    return;
  }

  if (item.type === 'callback') {
    item.fn(gen);
    return;
  }

  const [cls, text] = Array.isArray(item) ? item : ['', item];
  addLine(text, cls);
  view.hackTimer = setTimeout(() => processQueue(gen), rnd(28,95));
}

// ── ANIMATED CLEAR ───────────────────────────────────────────────────────────
export function animatedClear(done, gen) {
  if (gen === undefined) gen = runGen;
  const lines = Array.from(outputEl.children);
  if (lines.length === 0) { (done || setIdle)(); return; }

  const steps    = Math.min(lines.length, 10);
  const totalMs  = Math.min(Math.max(lines.length * 20, 150), 400);
  snd.wipe(totalMs);
  const perBatch = Math.ceil(lines.length / steps);

  const bar = document.createElement('div');
  bar.style.cssText = [
    'position:absolute','left:0','right:0','top:0','height:2px',
    'background:rgba(51,255,51,0.9)',
    'box-shadow:0 0 10px rgba(51,255,51,0.95),0 0 24px rgba(51,255,51,0.4)',
    `transition:top ${totalMs}ms steps(${steps})`,
    'pointer-events:none','z-index:5'
  ].join(';');
  outputEl.style.position = 'relative';
  outputEl.appendChild(bar);

  requestAnimationFrame(() => requestAnimationFrame(() => {
    bar.style.top = outputEl.clientHeight + 'px';
  }));

  for (let s = 0; s < steps; s++) {
    setTimeout(() => {
      if (gen !== runGen) return;
      for (let b = 0; b < perBatch; b++) {
        const line = lines[s * perBatch + b];
        if (line) line.style.visibility = 'hidden';
      }
    }, (s / steps) * totalMs);
  }

  setTimeout(() => {
    // the sweep bar is ours either way — tear it down before checking the gen
    bar.remove();
    outputEl.style.position = '';
    if (gen !== runGen) return;
    outputEl.innerHTML = '';
    (done || setIdle)();
  }, totalMs + 80);
}
