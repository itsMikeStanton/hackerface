import { snd } from './audio.js';
import { termEl } from './terminal.js';
import { REDUCED_MOTION, kick } from './signal.js';
import { drawNoise } from './effects.js';

// ── TUBE MOTION ──────────────────────────────────────────────────────────────
// The choreographed moments: power on/off, vertical-hold roll, channel cut.
// All of them animate with WAAPI so they layer over the CSS flicker loops and
// the inline transforms the glitch code writes, and leave nothing behind.
const rasterEl = document.getElementById('raster');
const washEl   = document.getElementById('tube-wash');
const noiseEl  = document.getElementById('noise');
const warpEls  = document.querySelectorAll('.warp');
const WARP     = +warpEls[0].getAttribute('scale');

const wait = ms => new Promise(r => setTimeout(r, ms));

// ── STATIC BURST ─────────────────────────────────────────────────────────────
export function staticBurst(ms, peak = 0.5) {
  if (REDUCED_MOTION) return;
  noiseEl.animate([{ opacity: peak }, { opacity: peak * 0.4 }],
                  { duration: ms, easing: 'steps(3, end)' });
  const end = performance.now() + ms;
  (function frame() {
    drawNoise();
    if (performance.now() < end) requestAnimationFrame(frame);
  })();
}

// ── DEGAUSS ──────────────────────────────────────────────────────────────────
// Rings the barrel warp like the degauss coil firing: a fast wobble that dies.
function degauss(ms = 650) {
  const t0 = performance.now();
  (function frame() {
    const t = performance.now() - t0;
    if (t >= ms) { warpEls.forEach(el => el.setAttribute('scale', WARP)); return; }
    const s = WARP + 60 * Math.sin(t / 1000 * 2 * Math.PI * 11) * Math.exp(-t / 170);
    warpEls.forEach(el => el.setAttribute('scale', s.toFixed(1)));
    requestAnimationFrame(frame);
  })();
}

// ── POWER ON / OFF ───────────────────────────────────────────────────────────
// The raster collapses to a line, then a dot (off), or opens from a line with a
// bloom that settles (on). #tube-wash supplies the light — an empty raster is
// nearly black, so scaling it alone would show nothing.
const ON_FRAMES = [
  { transform: 'scale(0.012, 0.004)', filter: 'brightness(8)',    offset: 0 },
  { transform: 'scale(1, 0.004)',     filter: 'brightness(6)',    offset: 0.16 },
  { transform: 'scale(1, 0.006)',     filter: 'brightness(6)',    offset: 0.24 },
  { transform: 'scale(1, 1.035)',     filter: 'brightness(2.4)',  offset: 0.62 },
  { transform: 'scale(1, 0.99)',      filter: 'brightness(1.35)', offset: 0.8 },
  { transform: 'scale(1, 1)',         filter: 'brightness(1)',    offset: 1 },
];
const ON_WASH = [
  { opacity: 1, offset: 0 }, { opacity: 1, offset: 0.24 },
  { opacity: 0.3, offset: 0.62 }, { opacity: 0, offset: 1 },
];
const OFF_FRAMES = [
  { transform: 'scale(1, 1)',         filter: 'brightness(1)', opacity: 1, offset: 0 },
  { transform: 'scale(1, 0.006)',     filter: 'brightness(5)', opacity: 1, offset: 0.34 },
  { transform: 'scale(0.01, 0.005)',  filter: 'brightness(8)', opacity: 1, offset: 0.6 },
  { transform: 'scale(0.006, 0.004)', filter: 'brightness(8)', opacity: 0, offset: 1 },
];
const OFF_WASH = [
  { opacity: 0, offset: 0 }, { opacity: 0.85, offset: 0.34 }, { opacity: 1, offset: 1 },
];

let tubeAnim = null, washAnim = null;

// resolves true when the animation ran to the end, false if a newer one cut in
function tube(frames, wash, opts) {
  if (tubeAnim) tubeAnim.cancel();
  if (washAnim) washAnim.cancel();
  const a = tubeAnim = rasterEl.animate(frames, opts);
  washAnim = washEl.animate(wash, opts);
  return a.finished.then(() => true, () => false);
}

export function powerOn() {
  rasterEl.style.visibility = '';
  if (REDUCED_MOTION) return Promise.resolve();
  snd.powerOn();
  kick(1);
  degauss();
  return tube(ON_FRAMES, ON_WASH, { duration: 720, easing: 'cubic-bezier(.2,.7,.2,1)' });
}

export function powerOff() {
  if (REDUCED_MOTION) return Promise.resolve();
  snd.powerOff();
  return tube(OFF_FRAMES, OFF_WASH,
              { duration: 560, easing: 'cubic-bezier(.5,0,.8,.4)', fill: 'forwards' })
    .then(ran => { if (ran) rasterEl.style.visibility = 'hidden'; });
}

// off → mid() while the tube is dark → on. mid is skipped if a newer cycle
// started in the meantime; the tube itself always comes back.
let cycle = 0;
export async function powerCycle(mid, dark = 160) {
  if (REDUCED_MOTION) { if (mid) mid(); return; }
  const me = ++cycle;
  await powerOff();
  if (me !== cycle) return;
  if (mid) mid();
  await wait(dark);
  if (me !== cycle) return;
  await powerOn();
}

// ── VERTICAL-HOLD ROLL ───────────────────────────────────────────────────────
// Section changes lose vertical sync for a moment: the picture rolls up, the
// blanking bar chases it through, and the frame drops back in from below.
const BAR_H = 13;   // vh
export function vRoll() {
  if (REDUCED_MOTION) return;
  snd.roll();
  staticBurst(300, 0.35);
  const opts = { duration: 460 };
  termEl.animate([
    { transform: 'translateY(0)',    offset: 0,    easing: 'cubic-bezier(.5,0,1,.7)' },
    { transform: 'translateY(-52%)', offset: 0.4 },
    { transform: 'translateY(60%)',  offset: 0.4,  easing: 'cubic-bezier(.1,.6,.3,1)' },
    { transform: 'translateY(14%)',  offset: 0.7 },
    { transform: 'translateY(-3%)',  offset: 0.86 },
    { transform: 'translateY(0)',    offset: 1 },
  ], opts);

  // the bar sits under the outgoing picture, then on top of the incoming one
  const bar = document.createElement('div');
  bar.className = 'vblank';
  bar.style.height = BAR_H + 'vh';
  rasterEl.appendChild(bar);
  bar.animate([
    { transform: 'translateY(100vh)',           offset: 0,    easing: 'cubic-bezier(.5,0,1,.7)' },
    { transform: 'translateY(47vh)',            offset: 0.4,  easing: 'cubic-bezier(.1,.6,.3,1)' },
    { transform: `translateY(${14 - BAR_H}vh)`, offset: 0.7 },
    { transform: `translateY(${-3 - BAR_H}vh)`, offset: 0.86 },
    { transform: `translateY(${-BAR_H}vh)`,     offset: 1 },
  ], opts).finished.then(() => bar.remove(), () => bar.remove());
}

// ── CHANNEL CUT ──────────────────────────────────────────────────────────────
// Three held frames — jump, dip, overshoot — under a burst of static. Used
// where one picture replaces another in place (prev / next in the detail view).
export function channelCut(el) {
  if (REDUCED_MOTION) return;
  snd.cut();
  staticBurst(150, 0.45);
  el.animate([
    { transform: 'translateY(-9%) scaleY(1.06)', filter: 'brightness(2.2) saturate(0)', offset: 0 },
    { transform: 'translateY(5%)',               filter: 'brightness(0.4)',             offset: 0.34 },
    { transform: 'translateY(-1.5%)',            filter: 'brightness(1.3)',             offset: 0.67 },
    { transform: 'translateY(0)',                filter: 'brightness(1)',               offset: 1 },
  ], { duration: 150, easing: 'steps(1, end)' });
}
