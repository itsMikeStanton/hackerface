import { snd } from './audio.js';

// ── KEYBOARD NAV ─────────────────────────────────────────────────────────────
export const nav = { items: [], index: -1, cols: 1 };

export function navFocus(idx) {
  if (!nav.items.length) return;
  if (nav.index >= 0 && nav.index < nav.items.length)
    nav.items[nav.index].classList.remove('nav-focus');
  nav.index = Math.max(0, Math.min(nav.items.length - 1, idx));
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
