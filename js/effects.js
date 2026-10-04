import { snd } from './audio.js';
import { pick, rnd } from './util.js';
import { termEl } from './terminal.js';
import { REDUCED_MOTION, onSignal, sigLevel, fxLive, onFx } from './signal.js';

const screenEl = document.getElementById('screen');

// ── BARREL DISTORTION ────────────────────────────────────────────────────────
(function() {
  const W = 256, H = 256, k = 0.45, norm = 1.8;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const id = ctx.createImageData(W, H);
  const d = id.data;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const u = (x/W - 0.5)*2, v = (y/H - 0.5)*2, r2 = u*u + v*v;
      const R = Math.round((0.5 + u*k*r2/norm)*255);
      const Gv = Math.round((0.5 + v*k*r2/norm)*255);
      const i = (y*W+x)*4;
      d[i]   = Math.max(0,Math.min(255,R));
      d[i+1] = Math.max(0,Math.min(255,Gv));
      d[i+2] = 128; d[i+3] = 255;
    }
  }
  ctx.putImageData(id, 0, 0);
  const url = c.toDataURL();
  document.querySelectorAll('.bmap').forEach(el => el.setAttribute('href', url));
  screenEl.style.filter = 'url(#crt-warp)';
})();

// ── NOISE ────────────────────────────────────────────────────────────────────
const nc = document.getElementById('noise');
const nctx = nc.getContext('2d');
nc.width = 200; nc.height = 150;
const nid = nctx.createImageData(200, 150);
export function drawNoise() {
  const d = nid.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = (Math.random()*255)|0;
    d[i] = d[i+1] = d[i+2] = v; d[i+3] = 255;
  }
  nctx.putImageData(nid, 0, 0);
}
drawNoise();
if (!REDUCED_MOTION) setInterval(drawNoise, 90);

// ── GLITCH BURSTS ────────────────────────────────────────────────────────────
const glitchTypes = [
  () => { termEl.style.transform=`translate(${pick(-7,-5,-4,-3,3,4,5,7)}px,${pick(-2,-1,0,0,1,2)}px) skewX(${((Math.random()-.5)*8).toFixed(1)}deg)`; termEl.style.filter=`brightness(${(.3+Math.random()*.9).toFixed(2)}) hue-rotate(${rnd(-50,50)}deg)`; return rnd(50,200); },
  () => { termEl.style.filter=`brightness(${(1.8+Math.random()*1.2).toFixed(2)}) saturate(${rnd(1,4)})`; return rnd(15,70); },
  () => { termEl.style.filter=`brightness(1.1) hue-rotate(${pick(20,45,90,135,180,-20,-45,-90)}deg) saturate(5) contrast(1.4)`; termEl.style.transform=`translate(${pick(-4,-3,-2,-1,1,2,3,4)}px,0) scaleX(${(.96+Math.random()*.08).toFixed(3)})`; return rnd(35,140); },
  () => { termEl.style.filter=`brightness(${(.05+Math.random()*.18).toFixed(2)})`; return rnd(25,80); },
  () => { termEl.style.transform=`scaleX(${(1.02+Math.random()*.06).toFixed(3)}) scaleY(${(.97+Math.random()*.05).toFixed(3)})`; termEl.style.filter=`brightness(${(.6+Math.random()*.7).toFixed(2)}) hue-rotate(${rnd(-30,30)}deg)`; return rnd(60,180); },
];

// ── TEAR ─────────────────────────────────────────────────────────────────────
// Live-mode glitches shear horizontal bands sideways instead of moving the whole
// picture as one block. #crt-tear is the warp filter with three feOffset bands
// in front of it; it is only swapped in for the frames a tear lasts.
const tearEls = Array.from(document.querySelectorAll('#crt-tear feOffset'));
let tearUntil = 0, tearing = false;

function setTears() {
  const W = window.innerWidth, H = window.innerHeight;
  tearEls.forEach(el => {
    const h = Math.random() < 0.9 ? pick(6, 10, 18, 34, 60, 110) : 0;
    el.setAttribute('y', rnd(0, H - h));
    el.setAttribute('height', h);
    el.setAttribute('width', W);
    el.setAttribute('dx', pick(-1, 1) * rnd(6, 46));
  });
}

export function tear(ms) {
  if (REDUCED_MOTION) return;
  tearUntil = Math.max(tearUntil, performance.now() + ms);
  if (tearing) return;
  tearing = true;
  screenEl.style.filter = 'url(#crt-tear)';
  (function frame() {
    if (performance.now() >= tearUntil) {
      tearing = false;
      screenEl.style.filter = 'url(#crt-warp)';
      return;
    }
    setTears();
    setTimeout(frame, rnd(28, 70));
  })();
}

// each returns [kind, ms] — the kind picks the sound in snd.glitch
const liveGlitches = [
  () => { const ms = rnd(60,220); tear(ms); termEl.style.filter=`brightness(${(.7+Math.random()*.6).toFixed(2)})`; return ['tear', ms]; },
  () => { const ms = rnd(40,140); tear(ms); termEl.style.filter=`brightness(1.1) hue-rotate(${pick(20,45,90,-20,-45,-90)}deg) saturate(4)`; return ['tear', ms]; },
  () => { termEl.style.filter=`brightness(${(1.8+Math.random()*1.2).toFixed(2)}) saturate(${rnd(1,4)})`; return ['flash', rnd(15,70)]; },
  () => { termEl.style.filter=`brightness(${(.05+Math.random()*.18).toFixed(2)})`; return ['drop', rnd(25,80)]; },
];

function fire(done) {
  let duration;
  if (fxLive()) {
    const [kind, ms] = liveGlitches[rnd(0,liveGlitches.length)]();
    snd.glitch(kind, ms);
    duration = ms;
  } else {
    snd.glitch();
    duration = glitchTypes[rnd(0,glitchTypes.length)]();
  }

  const gc = document.getElementById('ghost-cursor');
  if (gc) {
    gc.style.filter    = termEl.style.filter;
    gc.style.transform = `translate(${((Math.random()-0.5)*8).toFixed(1)}px,${((Math.random()-0.5)*5).toFixed(1)}px)`;
  }

  setTimeout(() => {
    termEl.style.transform = '';
    termEl.style.filter    = '';
    if (gc) { gc.style.filter = ''; gc.style.transform = ''; }
    if (done) done();
  }, duration);
}

// live mode stretches the gap between bursts while the signal is calm
function nextGap() {
  const g = rnd(2000,8000);
  return fxLive() ? Math.round(g * (2.4 - 2 * sigLevel())) : g;
}

function doGlitch(remaining) {
  fire(() => {
    if (remaining > 1) setTimeout(() => doGlitch(remaining-1), rnd(8,60));
    else setTimeout(() => doGlitch(Math.random()<0.5 ? rnd(2,6) : 1), nextGap());
  });
}
if (!REDUCED_MOTION) setTimeout(() => doGlitch(1), rnd(2000,4000));

// ── LIVE AMBIENCE ────────────────────────────────────────────────────────────
// In live mode the CSS flicker / aberration loops are off (see body.fx-live in
// style.css) and the same properties follow the signal from here.
let heardSig = 0, flickering = false;

function applySignal(q) {
  if (!fxLive()) return;
  termEl.style.setProperty('--sig', q.toFixed(2));
  nc.style.opacity = (0.032 + 0.13 * q).toFixed(3);
  // a hard kick (section change, power-on) breaks the picture up right away
  if (q >= 0.6 && heardSig < 0.6) {
    fire(() => setTimeout(() => fire(), rnd(20,90)));
  }
  heardSig = q;
}
onSignal(applySignal);

function liveFlicker() {
  if (!fxLive()) { flickering = false; termEl.style.opacity = ''; return; }
  const s = sigLevel();
  termEl.style.opacity = (1 - Math.random() * (0.05 + 0.3 * s)).toFixed(2);
  setTimeout(() => { termEl.style.opacity = ''; }, rnd(30,90));
  setTimeout(liveFlicker, Math.round(rnd(120,900) * (1.7 - 1.5 * s)));
}

function syncFx(live) {
  if (live) {
    applySignal(sigLevel());
    if (!flickering) { flickering = true; liveFlicker(); }
  } else {
    termEl.style.removeProperty('--sig');
    nc.style.opacity = '';
  }
}
onFx(syncFx);
// termEl isn't bound yet while this module is still evaluating (import cycle)
if (fxLive()) setTimeout(() => syncFx(true), 0);
