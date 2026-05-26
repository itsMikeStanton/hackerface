'use strict';

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
  document.getElementById('bmap').setAttribute('href', c.toDataURL());
  document.getElementById('screen').style.filter = 'url(#crt-warp)';
})();

// ── NOISE ────────────────────────────────────────────────────────────────────
const nc = document.getElementById('noise');
const nctx = nc.getContext('2d');
nc.width = 200; nc.height = 150;
nc.style.width = '100vw'; nc.style.height = '100vh';
const nid = nctx.createImageData(200, 150);
function drawNoise() {
  const d = nid.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = (Math.random()*255)|0;
    d[i] = d[i+1] = d[i+2] = v; d[i+3] = 255;
  }
  nctx.putImageData(nid, 0, 0);
}
drawNoise();
setInterval(drawNoise, 90);

// ── GLITCH BURSTS ────────────────────────────────────────────────────────────
const glitchTypes = [
  () => { termEl.style.transform=`translate(${pick(-7,-5,-4,-3,3,4,5,7)}px,${pick(-2,-1,0,0,1,2)}px) skewX(${((Math.random()-.5)*8).toFixed(1)}deg)`; termEl.style.filter=`brightness(${(.3+Math.random()*.9).toFixed(2)}) hue-rotate(${rnd(-50,50)}deg)`; return rnd(50,200); },
  () => { termEl.style.filter=`brightness(${(1.8+Math.random()*1.2).toFixed(2)}) saturate(${rnd(1,4)})`; return rnd(15,70); },
  () => { termEl.style.filter=`brightness(1.1) hue-rotate(${pick(20,45,90,135,180,-20,-45,-90)}deg) saturate(5) contrast(1.4)`; termEl.style.transform=`translate(${pick(-4,-3,-2,-1,1,2,3,4)}px,0) scaleX(${(.96+Math.random()*.08).toFixed(3)})`; return rnd(35,140); },
  () => { termEl.style.filter=`brightness(${(.05+Math.random()*.18).toFixed(2)})`; return rnd(25,80); },
  () => { termEl.style.transform=`scaleX(${(1.02+Math.random()*.06).toFixed(3)}) scaleY(${(.97+Math.random()*.05).toFixed(3)})`; termEl.style.filter=`brightness(${(.6+Math.random()*.7).toFixed(2)}) hue-rotate(${rnd(-30,30)}deg)`; return rnd(60,180); },
];

function doGlitch(remaining) {
  if (snd) snd.glitch();
  const duration = glitchTypes[rnd(0,glitchTypes.length)]();
  setTimeout(() => {
    termEl.style.transform = '';
    termEl.style.filter    = '';
    if (remaining > 1) setTimeout(() => doGlitch(remaining-1), rnd(8,60));
    else setTimeout(() => doGlitch(Math.random()<0.5 ? rnd(2,6) : 1), rnd(2000,8000));
  }, duration);
}
setTimeout(() => doGlitch(1), rnd(2000,4000));
