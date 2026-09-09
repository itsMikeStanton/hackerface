// ── CRT SCROLLBAR ─────────────────────────────────────────────────────────────
// makeScrollbar(outerEl, innerEl)
//   outerEl — position:relative/absolute container that gets the track injected
//   innerEl — overflow:hidden element whose scrollTop we control
// Returns { sync } so callers can force a re-sync after content changes.

const SCROLL_CHUNK = 15;
const SCROLL_GRID  = 80;

// Overlays are built and thrown away constantly, so drag/resize listeners live
// here once instead of per instance; dead instances are pruned by track.isConnected.
const _scrollbars = new Set();
let _sbDrag = null;

function _sbPrune() {
  _scrollbars.forEach(sb => { if (!sb.track.isConnected) _scrollbars.delete(sb); });
}

document.addEventListener('mousemove', e => { if (_sbDrag) _sbDrag(e.clientY); });
document.addEventListener('mouseup',   () => { _sbDrag = null; });

window.addEventListener('resize', () => {
  _sbPrune();
  _scrollbars.forEach(sb => sb.sync());
});

export function makeScrollbar(outerEl, innerEl) {
  const track = document.createElement('div');
  track.className = 'crt-sb-track';

  const thumb = document.createElement('div');
  thumb.className = 'crt-sb-thumb';
  track.appendChild(thumb);
  outerEl.appendChild(track);

  function sync() {
    const max    = innerEl.scrollHeight - innerEl.clientHeight;
    const ratio  = max > 0 ? innerEl.scrollTop / max : 0;
    const trackH = outerEl.clientHeight;
    const thumbH = Math.max(64, (innerEl.clientHeight / Math.max(innerEl.scrollHeight, 1)) * trackH);
    thumb.style.height = thumbH + 'px';
    thumb.style.top    = (ratio * (trackH - thumbH)).toFixed(1) + 'px';
  }

  // accumulate at SCROLL_CHUNK/tick but snap display to SCROLL_GRID boundaries
  // gives a low-framerate chunky feel without moving too fast
  let scrollAcc = 0;
  outerEl.addEventListener('wheel', e => {
    e.preventDefault();
    const max = innerEl.scrollHeight - innerEl.clientHeight;
    scrollAcc = Math.max(0, Math.min(max, scrollAcc + Math.sign(e.deltaY) * SCROLL_CHUNK));
    innerEl.scrollTop = Math.round(scrollAcc / SCROLL_GRID) * SCROLL_GRID;
    sync();
  }, { passive: false });

  // drag and track-click jump straight to a position — carry the wheel
  // accumulator with them or the next tick snaps back to where the wheel left off
  function scrollTo(px) {
    const max = Math.max(0, innerEl.scrollHeight - innerEl.clientHeight);
    scrollAcc = Math.max(0, Math.min(max, px));
    innerEl.scrollTop = scrollAcc;
    sync();
  }

  // drag thumb
  thumb.addEventListener('mousedown', e => {
    const startY      = e.clientY;
    const startScroll = innerEl.scrollTop;
    _sbDrag = y => {
      const thumbH = parseFloat(thumb.style.height) || 28;
      const maxTop = outerEl.clientHeight - thumbH;
      const range  = innerEl.scrollHeight - innerEl.clientHeight;
      scrollTo(startScroll + ((y - startY) / maxTop) * range);
    };
    e.preventDefault();
    e.stopPropagation();
  });

  // click track → jump to position
  track.addEventListener('click', e => {
    if (e.target === thumb) return;
    const rect   = track.getBoundingClientRect();
    const thumbH = parseFloat(thumb.style.height) || 28;
    const ratio  = (e.clientY - rect.top - thumbH / 2) / (outerEl.clientHeight - thumbH);
    scrollTo(Math.max(0, Math.min(1, ratio)) * (innerEl.scrollHeight - innerEl.clientHeight));
  });

  sync();
  const inst = { track, sync };
  _sbPrune();
  _scrollbars.add(inst);
  return { sync };
}
