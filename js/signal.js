// ── SIGNAL ───────────────────────────────────────────────────────────────────
// One 0–1 "how unstable is the picture" value. Navigation and loads kick it up,
// it decays back to a calm floor, and listeners (ambient effects, the sound
// bed, the sidebar readout) follow it instead of each running its own loop.
export const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const FLOOR = 0.12;   // resting level
const TAU   = 1300;   // ms decay time constant
const STEP  = 0.04;   // listeners only hear changes of this size

let level = FLOOR, heard = FLOOR, last = 0, running = false;
const listeners = [];

export function sigLevel() { return level; }
export function onSignal(fn) { listeners.push(fn); }

export function kick(v) {
  level = Math.min(1, level + v * (1 - level));
  if (!running) { running = true; last = performance.now(); requestAnimationFrame(tick); }
}

function tick(now) {
  const dt = Math.max(0, now - last); last = now;
  level = FLOOR + (level - FLOOR) * Math.exp(-dt / TAU);
  if (level - FLOOR < 0.005) level = FLOOR;
  const q = Math.round(level / STEP) * STEP;
  if (q !== heard) { heard = q; listeners.forEach(fn => fn(q)); }
  if (level > FLOOR) requestAnimationFrame(tick); else running = false;
}

// ── FX MODE ──────────────────────────────────────────────────────────────────
// 'classic' is the calibrated fixed-loop ambience (flicker / aberration / noise
// / rigid glitches). 'live' drives those from the signal instead. Classic stays
// the default; ?fx=live|classic, the `fx` command and [FX] toggle switch it.
let live = false;
try { live = localStorage.getItem('fx') === 'live'; } catch (e) {}
const fxParam = new URLSearchParams(location.search).get('fx');
if (fxParam) live = fxParam === 'live';
if (REDUCED_MOTION) live = false;
document.body.classList.toggle('fx-live', live);

const fxListeners = [];
export function fxLive() { return live; }
export function onFx(fn) { fxListeners.push(fn); }
export function setFxLive(v) {
  live = !!v && !REDUCED_MOTION;
  try { localStorage.setItem('fx', live ? 'live' : 'classic'); } catch (e) {}
  document.body.classList.toggle('fx-live', live);
  fxListeners.forEach(fn => fn(live));
}
