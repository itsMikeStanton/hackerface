import { snd } from './audio.js';

// ── KEYBOARD NAV ─────────────────────────────────────────────────────────────
export const nav = { items: [], index: -1, cols: 1 };

// the item the highlight just left keeps a fading amber afterimage
function afterglow(el) {
  el.classList.remove('nav-after');
  void el.offsetWidth;                 // restart the animation if it was mid-fade
  el.classList.add('nav-after');
  el.addEventListener('animationend', () => el.classList.remove('nav-after'), { once: true });
}

export function navFocus(idx) {
  if (!nav.items.length) return;
  const prev = nav.index;
  if (prev >= 0 && prev < nav.items.length)
    nav.items[prev].classList.remove('nav-focus');
  nav.index = Math.max(0, Math.min(nav.items.length - 1, idx));
  if (prev >= 0 && prev < nav.items.length && prev !== nav.index) afterglow(nav.items[prev]);
  nav.items[nav.index].classList.remove('nav-after');
  nav.items[nav.index].classList.add('nav-focus');
  nav.items[nav.index].scrollIntoView({ block: 'nearest' });
  snd.hover();
}

export function clearNav() {
  if (nav.index >= 0 && nav.index < nav.items.length)
    nav.items[nav.index].classList.remove('nav-focus');
  nav.items = [];
  nav.index = -1;
  nav.cols  = 1;
}

// ── GRID BUILDER ──────────────────────────────────────────────────────────────
export function initGridNav(cards) {
  clearNav();
  nav.items = cards;
  if (cards.length) {
    const firstTop = cards[0].getBoundingClientRect().top;
    nav.cols = cards.filter(c => Math.abs(c.getBoundingClientRect().top - firstTop) < 2).length || 1;
  }
  navFocus(0);
}
