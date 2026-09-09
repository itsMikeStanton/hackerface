// ── GHOST CURSOR + PARALLAX ───────────────────────────────────────────────────
const ghostCursorEl  = document.getElementById('ghost-cursor');
const screenEl       = document.getElementById('screen');
const reflectionEl   = document.getElementById('reflection');

let targetX = 0, targetY = 0;
let lerpX   = 0, lerpY   = 0;
let cursorStarted  = false;
let keyboardActive = false;
const LERP        = 0.22;
const CURSOR_CHUNK = 8;     // px grid the cursor snaps to

export function setKeyboardActive() {
  keyboardActive = true;
  ghostCursorEl.style.display = 'none';
}

// ── PHOSPHOR TRAILS ───────────────────────────────────────────────────────────
const TRAIL_POOL  = 14;      // afterimage element pool
const TRAIL_SPAWN = 6;      // frames between stamping a new afterimage (lower freq)
const TRAIL_FADE  = 0.015;  // opacity lost per frame (smaller = slower fadeaway)
const TRAIL_START = 0.4;    // opacity a fresh afterimage starts at
const trailEls    = [];
for (let k = 0; k < TRAIL_POOL; k++) {
  const t = document.createElement('div');
  t.className = 'ghost-trail';
  t._op = 0;
  ghostCursorEl.parentNode.insertBefore(t, ghostCursorEl);
  trailEls.push(t);
}
let trailFrame = 0, trailNext = 0, lastStampX = 0, lastStampY = 0;

// ── CURSOR HIDE ON INTERACTIVE ELEMENTS ──────────────────────────────────────
const INTERACTIVE_SEL = '.menu-item, .menu-back, .splash-item, .panel-card, ' +
  '.panel-close, .panel-detail-prev, .panel-detail-next, .sb-nav-item, #sound-toggle, .crt-sb-thumb';

document.addEventListener('mouseover', e => {
  if (e.target.closest(INTERACTIVE_SEL)) {
    ghostCursorEl.classList.add('cursor-hot');
  } else {
    ghostCursorEl.classList.remove('cursor-hot');
  }
});

document.addEventListener('mousemove', e => {
  if (!cursorStarted) {
    lerpX = e.clientX;
    lerpY = e.clientY;
    cursorStarted = true;
  }
  if (keyboardActive) {
    keyboardActive = false;
    lerpX = e.clientX;
    lerpY = e.clientY;
  }
  targetX = e.clientX;
  targetY = e.clientY;

  const nx = e.clientX / window.innerWidth  - 0.5;
  const ny = e.clientY / window.innerHeight - 0.5;
  const tx = (-nx * 80).toFixed(1);
  const ty = (-ny * 55).toFixed(1);
  screenEl.style.transform     = `translate(${tx}px, ${ty}px)`;
  reflectionEl.style.transform = `translate(${(-tx * 0.45).toFixed(1)}px, ${(-ty * 0.45).toFixed(1)}px)`;
});

// cursor lerp loop — runs independently of mousemove
(function animateCursor() {
  if (cursorStarted) {
    lerpX += (targetX - lerpX) * LERP;
    lerpY += (targetY - lerpY) * LERP;

    if (keyboardActive) {
      // keyboard in control — hide cursor and clear all afterimages
      ghostCursorEl.style.display = 'none';
      trailEls.forEach(t => { t._op = 0; t.style.display = 'none'; });
    } else {
      // fade every live afterimage a little each frame
      const hot = ghostCursorEl.classList.contains('cursor-hot');
      trailEls.forEach(t => {
        if (t._op > 0) {
          t._op -= TRAIL_FADE;
          if (t._op <= 0) { t._op = 0; t.style.display = 'none'; }
          else t.style.opacity = t._op.toFixed(3);
        }
      });

      const cx = Math.round(lerpX / CURSOR_CHUNK) * CURSOR_CHUNK;
      const cy = Math.round(lerpY / CURSOR_CHUNK) * CURSOR_CHUNK;
      ghostCursorEl.style.display = 'block';
      ghostCursorEl.style.left = cx + 'px';
      ghostCursorEl.style.top  = cy + 'px';

      // stamp a fresh afterimage occasionally, only when actually moving
      trailFrame++;
      const moved = Math.abs(cx - lastStampX) + Math.abs(cy - lastStampY) > CURSOR_CHUNK;
      if (trailFrame % TRAIL_SPAWN === 0 && moved) {
        const t = trailEls[trailNext];
        trailNext = (trailNext + 1) % TRAIL_POOL;
        t.style.left = cx + 'px';
        t.style.top  = cy + 'px';
        t.style.background = hot
          ? 'repeating-linear-gradient(to bottom,#ffcc00 0px,#ffcc00 3px,rgba(0,0,0,0.10) 3px,rgba(0,0,0,0.10) 4px)'
          : '';
        t._op = TRAIL_START;
        t.style.opacity = TRAIL_START.toFixed(3);
        t.style.display = 'block';
        lastStampX = cx; lastStampY = cy;
      }
    }
  }
  requestAnimationFrame(animateCursor);
})();
