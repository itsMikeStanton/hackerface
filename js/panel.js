import { view } from './state.js';
import { snd } from './audio.js';
import { promptSpan, inputDispEl, cursorEl, PROMPT } from './terminal.js';
import { clearNav, navFocus, initGridNav } from './nav.js';
import { makeScrollbar } from './scrollbar.js';
import { showMenu } from './menu.js';

// ── CONTENT PANEL ENGINE ──────────────────────────────────────────────────────
// Section data lives in js/sections/<name>.js and is loaded on demand.
// Each section file default-exports its def. Two def shapes:
//   { type:'panel',    index:'art/index.json' }   ← manifest of {title, sub,
//       collections:[ {id,label,desc,path,cover,count} ]}; each collection's
//       items come from <path>/meta.json when it is opened
//   { type:'terminal', content:[ ...queue items ] }
const panelEl = document.getElementById('content-panel');

const _sectionCache = new Map();   // name → def|null, once imported

// Import js/sections/<name>.js once; done(def|null) fires when ready.
export function loadSection(name, done) {
  if (_sectionCache.has(name)) { done(_sectionCache.get(name)); return; }
  import(`./sections/${name.toLowerCase()}.js`)
    .then(mod => { const def = mod.default || null; _sectionCache.set(name, def); done(def); })
    .catch(() => { _sectionCache.set(name, null); done(null); });
}

// ── JSON MANIFEST FETCH ───────────────────────────────────────────────────────
function fetchJSON(url) {
  return fetch(url).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
}

// dim "> ..." status line used while a manifest loads
function statusLine(text) {
  const el = document.createElement('div');
  el.className = 'panel-status';
  el.textContent = '> ' + text;
  return el;
}

// ── REAL-PROGRESS IMAGE FETCH ─────────────────────────────────────────────────
// Streams the file so we can show genuine byte progress — that's the flavor.
async function fetchImageProgress(src, onProgress) {
  const resp = await fetch(src);
  if (!resp.ok) throw new Error(resp.status);
  const total  = +resp.headers.get('Content-Length') || 0;
  const reader = resp.body.getReader();
  const chunks = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    if (total) onProgress(received / total, received, total);
  }
  if (!total) onProgress(1, received, received);
  return URL.createObjectURL(new Blob(chunks));
}

// ── PROGRESSIVE "ENHANCE" REVEAL ──────────────────────────────────────────────
// Renders an image as chunky pixel blocks that resolve into finer detail over
// several steps — the classic movie image-scan look. Done on a <canvas>.
const REVEAL_LEVELS = [4, 8, 16, 32, 64, 128];  // blocks across, coarse → fine
const REVEAL_TINT   = '#0d3a0d';                // dark phosphor green the reveal starts in

function drawFit(ctx, img, fit, dw, dh) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = fit === 'cover' ? Math.max(dw/iw, dh/ih) : Math.min(dw/iw, dh/ih);
  const w = iw * scale, h = ih * scale;
  ctx.clearRect(0, 0, dw, dh);
  ctx.drawImage(img, (dw - w) / 2, (dh - h) / 2, w, h);
}

function revealImage(canvas, img, fit, stepMs, opts = {}) {
  const cw = canvas.width, ch = canvas.height;
  const ctx = canvas.getContext('2d');
  const n = REVEAL_LEVELS.length;

  // full-res fitted render we downsample from each step
  const src = document.createElement('canvas');
  src.width = cw; src.height = ch;
  drawFit(src.getContext('2d'), img, fit, cw, ch);

  const tmp  = document.createElement('canvas');
  const tctx = tmp.getContext('2d');

  // phosphor layer buffer (green-mapped copy of the current blocky frame)
  const ph   = document.createElement('canvas');
  ph.width = cw; ph.height = ch;
  const phctx = ph.getContext('2d');

  // Build a green-phosphor version of the low-res frame and composite it over
  // the colour frame at `alpha`. Maps luminance → green ramp, so whites become
  // bright green (a plain hue tint leaves whites white).
  function phosphorOver(bw, bh, alpha) {
    if (alpha <= 0) return;
    phctx.globalCompositeOperation = 'source-over';
    phctx.globalAlpha = 1;
    phctx.imageSmoothingEnabled = false;
    phctx.clearRect(0, 0, cw, ch);
    phctx.filter = 'grayscale(1)';
    phctx.drawImage(tmp, 0, 0, bw, bh, 0, 0, cw, ch);   // grayscale blocky
    phctx.filter = 'none';
    phctx.globalCompositeOperation = 'multiply';
    phctx.fillStyle = REVEAL_TINT;
    phctx.fillRect(0, 0, cw, ch);                        // white→dark green, black→black
    phctx.globalCompositeOperation = 'destination-in';
    phctx.drawImage(tmp, 0, 0, bw, bh, 0, 0, cw, ch);   // re-mask to image alpha
    phctx.globalCompositeOperation = 'source-over';

    ctx.globalAlpha = alpha;
    ctx.drawImage(ph, 0, 0);
    ctx.globalAlpha = 1;
  }

  let i = 0;
  (function step() {
    if (i >= n) {
      ctx.imageSmoothingEnabled = true;
      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(src, 0, 0);                          // crisp, full color
      if (opts.done) opts.done();
      return;
    }
    const bw = Math.max(1, REVEAL_LEVELS[i]);
    const bh = Math.max(1, Math.round(bw * ch / cw));
    tmp.width = bw; tmp.height = bh;
    tctx.imageSmoothingEnabled = true;
    tctx.drawImage(src, 0, 0, cw, ch, 0, 0, bw, bh);    // downsample
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(tmp, 0, 0, bw, bh, 0, 0, cw, ch);     // blocky colour upscale
    phosphorOver(bw, bh, Math.pow(1 - i / n, 0.4));      // green → colour (green lingers)
    if (opts.onStep) opts.onStep(i / n);
    i++;
    setTimeout(step, stepMs);
  })();
}

// ── REVEAL CASCADE QUEUE ──────────────────────────────────────────────────────
// Staggers reveal kickoffs ~30ms apart so a grid of thumbs cascades in.
const REVEAL_CASCADE_MS = 110;
const _revealQueue = [];
let _revealDraining = false;

function enqueueReveal(fn) {
  _revealQueue.push(fn);
  if (_revealDraining) return;
  _revealDraining = true;
  (function drain() {
    const next = _revealQueue.shift();
    if (!next) { _revealDraining = false; return; }
    next();
    setTimeout(drain, REVEAL_CASCADE_MS);
  })();
}

function makeCanvas(container, cls) {
  const w = container.clientWidth  || 160;
  const h = container.clientHeight || 120;
  const dpr = window.devicePixelRatio || 1;
  const c = document.createElement('canvas');
  c.width  = Math.round(w * dpr);
  c.height = Math.round(h * dpr);
  c.className = cls;
  return c;
}

// thumbnails reveal once scrolled into view (cheap, no progress bar)
const _thumbObserver = new IntersectionObserver((entries, obs) => {
  entries.forEach(e => {
    if (e.isIntersecting) { obs.unobserve(e.target); if (e.target._reveal) enqueueReveal(e.target._reveal); }
  });
}, { rootMargin: '140px' });

function revealThumb(container, src) {
  container.classList.add('img-pending');
  container._reveal = () => {
    const img = new Image();
    img.onload = () => {
      container.classList.remove('img-pending');
      container.textContent = '';
      const canvas = makeCanvas(container, 'thumb-canvas');
      container.appendChild(canvas);
      revealImage(canvas, img, 'cover', 170);
    };
    img.onerror = () => { container.classList.remove('img-pending'); container.textContent = '[ ? ]'; };
    img.src = src;
  };
  _thumbObserver.observe(container);
}

// Loads `src` into `container` with a terminal-style progress readout.
function loadImageInto(container, src, label) {
  container.innerHTML = '';
  container.classList.add('img-loading');

  const readout = document.createElement('div');
  readout.className = 'img-readout';
  readout.textContent = `> fetching ${label}...`;
  container.appendChild(readout);

  const W = 22;
  const draw = p => {
    const f = Math.round(p * W);
    readout.textContent = `> ${label}\n[${'█'.repeat(f)}${'░'.repeat(W - f)}] ${String(Math.round(p*100)).padStart(3)}%`;
  };
  draw(0);

  fetchImageProgress(src, (p) => { draw(p); snd.barTick(p); })
    .then(url => {
      const img = new Image();
      img.onload = () => {
        container.classList.remove('img-loading');
        container.innerHTML = '';
        const canvas = makeCanvas(container, 'img-canvas');
        container.appendChild(canvas);
        // bytes are in — now resolve from blocks to crisp
        revealImage(canvas, img, 'contain', 210, {
          onStep: (p) => { snd.barTick(p); },
          done:   () => { snd.done(); },
        });
        // revealImage rasterises the image into its own canvas synchronously
        // above, so the blob is done being read by the time we get here
        URL.revokeObjectURL(url);
      };
      img.src = url;
      img.alt = label;
    })
    .catch(() => {
      container.classList.remove('img-loading');
      container.innerHTML = '';
      const err = document.createElement('div');
      err.className = 'img-readout';
      err.textContent = '[ NO SIGNAL ]';
      container.appendChild(err);
    });
}

// ── GRID BUILDER ──────────────────────────────────────────────────────────────
// items: [{label, sub, src(optional)}], onClick(item, i)
function buildGrid(items, onClick) {
  const grid = document.createElement('div');
  grid.className = 'panel-grid';
  const cards = [];

  items.forEach((item, i) => {
    const card = document.createElement('div');
    card.className = 'panel-card';

    const thumb = document.createElement('div');
    thumb.className = 'panel-thumb';
    if (item.src) {
      // reveal with the blocky enhance effect when scrolled into view
      revealThumb(thumb, item.src);
    } else {
      thumb.textContent = '[ img ]';
    }
    card.appendChild(thumb);

    const caption = document.createElement('div');
    caption.className = 'panel-caption';
    caption.textContent = item.label;
    card.appendChild(caption);

    const tagEl = document.createElement('div');
    tagEl.className = 'panel-tag';
    tagEl.textContent = item.sub || '';
    card.appendChild(tagEl);

    card.addEventListener('mouseenter', () => { snd.hover(); navFocus(i); });
    card.addEventListener('click', () => onClick(item, i));
    grid.appendChild(card);
    cards.push(card);
  });

  return { grid, cards };
}

// ── OVERLAY CHROME ────────────────────────────────────────────────────────────
// header bar → back button → breadcrumb, shared by all three overlay levels.
// crumbText omitted → no breadcrumb element (the root panel header has none).
function buildOverlayChrome({ headerClass, backText, crumbText, onBack }) {
  const hdr = document.createElement('div');
  hdr.className = headerClass;

  const backBtn = document.createElement('div');
  backBtn.className = 'panel-close';
  backBtn.textContent = backText;
  backBtn.addEventListener('click', onBack);
  backBtn.addEventListener('mouseenter', () => snd.hover());
  hdr.appendChild(backBtn);

  let crumb = null;
  if (crumbText != null) {
    crumb = document.createElement('div');
    crumb.className = 'panel-detail-breadcrumb';
    crumb.textContent = crumbText;
    hdr.appendChild(crumb);
  }

  return { hdr, backBtn, crumb };
}

// hands keyboard nav back to the grid we are returning to
function refocusGrid(scopeEl, sel) {
  const grid = scopeEl.querySelector(sel);
  if (grid) requestAnimationFrame(() => initGridNav(Array.from(grid.querySelectorAll('.panel-card'))));
}

function closeDetail(detail, collOverlay) {
  detail.classList.remove('open');
  snd.hover();
  refocusGrid(collOverlay, '.panel-grid');
}

function closeCollection(overlay, rootEl) {
  overlay.classList.remove('open');
  setTimeout(() => overlay.remove(), 240);
  snd.hover();
  refocusGrid(rootEl, '.panel-scroll-body .panel-grid');
}

// ── COLLECTION OVERLAY ────────────────────────────────────────────────────────
function openCollection(coll, rootEl) {
  clearNav();

  const overlay = document.createElement('div');
  overlay.className = 'panel-collection';
  overlay._rootEl = rootEl;

  const { hdr, crumb } = buildOverlayChrome({
    headerClass: 'panel-collection-header',
    backText:    '[ ← back ]',
    crumbText:   `${view.currentSection}  ›  ${coll.label}`,
    onBack:      () => closeCollection(overlay, rootEl),
  });
  overlay.appendChild(hdr);

  const body = document.createElement('div');
  body.className = 'panel-collection-body';
  const inner = document.createElement('div');
  inner.className = 'panel-inner';
  body.appendChild(inner);
  overlay.appendChild(body);

  rootEl.appendChild(overlay);

  function renderItems(items) {
    coll.items = items;
    crumb.textContent = `${view.currentSection}  ›  ${coll.label}  ·  ${items.length} works`;
    const gridItems = items.map(it => ({
      ...it,
      sub: `${it.tag}  ${it.year}`,
      src: it.file ? `${coll.path}/${it.file}` : null,
    }));
    const { grid, cards } = buildGrid(gridItems, (_, i) => openDetail(coll, i, overlay));
    inner.appendChild(grid);
    makeScrollbar(overlay, body);
    requestAnimationFrame(() => initGridNav(cards));
  }

  // items already loaded once? reuse. otherwise fetch this folder's manifest.
  if (coll.items) {
    renderItems(coll.items);
  } else {
    const status = statusLine(`reading ${coll.path}/meta.json ...`);
    inner.appendChild(status);
    fetchJSON(`${coll.path}/meta.json`)
      .then(data => { status.remove(); renderItems(data.items || []); })
      .catch(() => { status.className = 'panel-status err'; status.textContent = '[ collection unavailable ]'; });
  }

  requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('open')));
}

// ── DETAIL OVERLAY ────────────────────────────────────────────────────────────
function openDetail(coll, idx, collOverlay) {
  clearNav();
  snd.hover();
  const item = coll.items[idx];

  let detail = panelEl.querySelector('.panel-detail');
  if (!detail) {
    detail = document.createElement('div');
    detail.className = 'panel-detail';
    panelEl.appendChild(detail);
  }
  detail.innerHTML = '';
  detail._collOverlay = collOverlay;

  const { hdr } = buildOverlayChrome({
    headerClass: 'panel-detail-header',
    backText:    '[ ← back ]',
    crumbText:   `${view.currentSection}  ›  ${coll.label}  ›  ${item.label}  ·  ${idx + 1} / ${coll.items.length}`,
    onBack:      () => closeDetail(detail, collOverlay),
  });
  detail.appendChild(hdr);

  if (idx > 0) {
    const prev = document.createElement('div');
    prev.className = 'panel-detail-prev';
    prev.textContent = '◀';
    prev.addEventListener('click', () => openDetail(coll, idx - 1, collOverlay));
    prev.addEventListener('mouseenter', () => snd.hover());
    detail.appendChild(prev);
  }
  if (idx < coll.items.length - 1) {
    const next = document.createElement('div');
    next.className = 'panel-detail-next';
    next.textContent = '▶';
    next.addEventListener('click', () => openDetail(coll, idx + 1, collOverlay));
    next.addEventListener('mouseenter', () => snd.hover());
    detail.appendChild(next);
  }

  const content = document.createElement('div');
  content.className = 'panel-detail-content';
  content.style.overflow = 'hidden';        // the CRT scrollbar owns scrolling

  // the scroller is a child of content, not content itself, so the track we
  // append to content stays put instead of scrolling away with the items
  const scroller = document.createElement('div');
  scroller.style.cssText = 'flex:1 1 auto; min-height:0; overflow:hidden; ' +
                           'display:flex; flex-direction:column; gap:1em;';
  content.appendChild(scroller);

  const imgEl = document.createElement('div');
  imgEl.className = 'panel-detail-img';
  scroller.appendChild(imgEl);

  const nameEl = document.createElement('div');
  nameEl.className = 'panel-detail-title';
  nameEl.textContent = item.label;
  scroller.appendChild(nameEl);

  const meta = document.createElement('div');
  meta.className = 'panel-detail-meta';
  meta.textContent = `${item.tag}  ·  ${item.year}`;
  scroller.appendChild(meta);

  detail.appendChild(content);
  const sb = makeScrollbar(content, scroller);

  // load the full-res image with real progress feedback
  if (item.file) loadImageInto(imgEl, `${coll.path}/${item.file}`, item.label);
  else imgEl.textContent = '[ img ]';

  requestAnimationFrame(() => requestAnimationFrame(() => {
    detail.classList.add('open');
    sb.sync();
  }));
}

// ── PANEL OPEN / CLOSE ────────────────────────────────────────────────────────
// Called with a loaded panel def. Returns true if it rendered a panel.
export function openPanel(name, def) {
  if (!def || def.type !== 'panel') return false;

  panelEl.innerHTML = '';

  const { hdr } = buildOverlayChrome({
    headerClass: 'panel-header',
    backText:    '[ ✕ back ]',
    onBack:      closePanel,
  });
  panelEl.appendChild(hdr);

  const scrollBody = document.createElement('div');
  scrollBody.className = 'panel-scroll-body';
  const inner = document.createElement('div');
  inner.className = 'panel-inner';
  scrollBody.appendChild(inner);
  panelEl.appendChild(scrollBody);

  const titleEl = document.createElement('div');
  titleEl.className = 'panel-title';
  titleEl.textContent = def.title || `[ ${name} ]`;
  inner.appendChild(titleEl);

  const subEl = document.createElement('div');
  subEl.className = 'panel-sub';
  if (def.sub) subEl.textContent = def.sub;
  inner.appendChild(subEl);

  // builds the collection grid once the registry is available
  function renderCollections(meta) {
    def._meta = meta;                       // whole manifest, so a re-open keeps title/sub
    if (meta.title) titleEl.textContent = meta.title;
    if (meta.sub)   subEl.textContent   = meta.sub;
    const collections = meta.collections || [];

    const collItems = collections.map(c => ({
      label: c.label,
      sub:   `${c.count != null ? c.count : (c.items ? c.items.length : '—')} works  ·  ${c.desc}`,
      src:   c.cover ? `${c.path}/${c.cover}` : null,
    }));
    const { grid, cards } = buildGrid(collItems, (_, i) => openCollection(collections[i], panelEl));
    inner.appendChild(grid);
    makeScrollbar(panelEl, scrollBody);
    requestAnimationFrame(() => initGridNav(cards));
  }

  // manifest already fetched once? re-render from the cache. otherwise fetch it
  if (def._meta) {
    renderCollections(def._meta);
  } else if (def.index) {
    const status = statusLine(`reading ${def.index} ...`);
    inner.appendChild(status);
    fetchJSON(def.index)
      .then(meta => { status.remove(); renderCollections(meta); })
      .catch(() => { status.className = 'panel-status err'; status.textContent = '[ index unavailable ]'; });
  }

  requestAnimationFrame(() => requestAnimationFrame(() => {
    panelEl.classList.add('open');
    promptSpan.textContent  = PROMPT;
    inputDispEl.textContent = view.inputBuffer;
    cursorEl.style.visibility = 'visible';
    view.state = 'IDLE';
  }));
  return true;
}

// Closes the topmost open overlay (detail → collection → panel).
// Returns false when nothing was open, so the Escape handler can fall through.
export function closeTopOverlay() {
  const detail = panelEl.querySelector('.panel-detail.open');
  if (detail) { closeDetail(detail, detail._collOverlay || panelEl); return true; }

  const coll = panelEl.querySelector('.panel-collection.open');
  if (coll) { closeCollection(coll, coll._rootEl || panelEl); return true; }

  if (panelEl.classList.contains('open')) { closePanel(); return true; }
  return false;
}

export function closePanel() {
  clearNav();
  panelEl.classList.remove('open');
  setTimeout(() => {
    panelEl.innerHTML = '';
    showMenu();
  }, 240);
}
