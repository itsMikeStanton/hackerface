'use strict';

// ── TERMINAL STATE ───────────────────────────────────────────────────────────
const outputEl    = document.getElementById('output');
const promptSpan  = document.getElementById('prompt-span');
const inputDispEl = document.getElementById('input-disp');
const cursorEl    = document.getElementById('cursor');
const termEl      = document.getElementById('terminal');
const PROMPT      = 'dmky@notquietly:~$ ';

let state       = 'BOOT';
let hackQueue   = [];
let hackTimer   = null;
let inputBuffer = '';

function addLine(text, cls) {
  const div = document.createElement('div');
  if (cls) div.className = cls;
  div.textContent = text;
  outputEl.appendChild(div);
  if (snd && text) snd.tick();
  while (outputEl.children.length > 600) outputEl.removeChild(outputEl.firstChild);
  outputEl.scrollTop = outputEl.scrollHeight;
  return div;
}

function setIdle() {
  state = 'IDLE';
  promptSpan.textContent = PROMPT;
  inputDispEl.textContent = inputBuffer;
  cursorEl.style.visibility = 'visible';
  if (menuMode && currentSection) addBackButton();
}

// ── ANIMATED PROGRESS BAR ────────────────────────────────────────────────────
function animateBar(cfg, done) {
  const W     = 24;
  const steps = cfg.steps || 20;
  const delay = cfg.delay || 75;
  const div   = addLine('', '');
  let step = 0;

  function tick() {
    const f   = Math.round(step/steps*W);
    const pct = Math.round(step/steps*100);
    const bar = '█'.repeat(f) + '░'.repeat(W-f);
    if (step < steps) {
      div.textContent = `${cfg.label} [${bar}] ${lpad(pct,3)}%`;
      div.className   = '';
      if (snd) snd.barTick(step/steps);
      step++;
      setTimeout(tick, delay + rnd(0, delay>>1));
    } else {
      div.textContent = `${cfg.label} [${bar}] ${cfg.done||'DONE'}`;
      div.className   = cfg.doneCls || '';
      if (snd) snd.done();
      outputEl.scrollTop = outputEl.scrollHeight;
      setTimeout(done, rnd(60,180));
    }
  }
  tick();
}

// ── QUEUE PROCESSOR ──────────────────────────────────────────────────────────
function processQueue() {
  if (hackQueue.length === 0) { setIdle(); return; }

  const item = hackQueue.shift();

  if (item === null || item === undefined) {
    addLine('', '');
    hackTimer = setTimeout(processQueue, rnd(80,200));
    return;
  }

  if (item.type === 'bar') {
    animateBar(item, processQueue);
    return;
  }

  const [cls, text] = Array.isArray(item) ? item : ['', item];
  addLine(text, cls);
  hackTimer = setTimeout(processQueue, rnd(28,95));
}

// ── ANIMATED CLEAR ───────────────────────────────────────────────────────────
function animatedClear(done) {
  const lines = Array.from(outputEl.children);
  if (lines.length === 0) { (done || setIdle)(); return; }

  const steps    = Math.min(lines.length, 10);
  const totalMs  = Math.min(Math.max(lines.length * 20, 150), 400);
  if (snd) snd.wipe(totalMs);
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
      for (let b = 0; b < perBatch; b++) {
        const line = lines[s * perBatch + b];
        if (line) line.style.visibility = 'hidden';
      }
    }, (s / steps) * totalMs);
  }

  setTimeout(() => {
    bar.remove();
    outputEl.style.position = '';
    outputEl.innerHTML = '';
    (done || setIdle)();
  }, totalMs + 80);
}
