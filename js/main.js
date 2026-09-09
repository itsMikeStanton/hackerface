import { view } from './state.js';
import { snd, toggleMute } from './audio.js';
import { SECTIONS } from './util.js';
import { nav, navFocus } from './nav.js';
import { PROMPT, promptSpan, inputDispEl, cursorEl, addLine, processQueue,
         animatedClear, newRun } from './terminal.js';
import { getRoutineFor } from './routines.js';
import { closeTopOverlay } from './panel.js';
import { showMenu, openSection, showSplash } from './menu.js';
import { setKeyboardActive } from './cursor.js';
import './effects.js';
import './sidebar.js';

// ── EXECUTE COMMAND ──────────────────────────────────────────────────────────
function execute(cmd) {
  if (cmd.trim()) addLine(PROMPT + cmd, 'dim');
  const trimmed = cmd.trim();

  if (/^(cls|clear)$/i.test(trimmed)) {
    newRun();
    animatedClear();
    return;
  }

  if (/^menu$/i.test(trimmed)) {
    newRun();
    animatedClear(showMenu);
    return;
  }

  const match = SECTIONS.find(s => s.toLowerCase() === trimmed.toLowerCase());
  if (match) { openSection(match); return; }

  view.menuMode = false;
  view.currentSection = null;

  const routine = getRoutineFor(cmd);

  if (view.state === 'HACKING') {
    // queue behind the routine already running — it keeps its generation
    routine.forEach(i => view.hackQueue.push(i));
    view.hackQueue.push(null);
    return;
  }

  const gen = newRun();
  view.state = 'HACKING';
  promptSpan.textContent = '';
  inputDispEl.textContent = '';
  cursorEl.style.visibility = 'hidden';

  routine.forEach(i => view.hackQueue.push(i));
  view.hackQueue.push(null);
  processQueue(gen);
}

// ── KEYBOARD ─────────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (view.state === 'BOOT') return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;

  // splash has no visible prompt line, so anything but nav would pile up unseen
  const onSplash = document.body.classList.contains('splash');
  const SPLASH_KEYS = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter'];
  if (onSplash && !SPLASH_KEYS.includes(e.key)) return;

  if (e.key === 'Tab') {
    e.preventDefault();
    toggleSidebar();
    return;
  }

  // arrow keys — nav when items exist, otherwise ignore
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
    e.preventDefault();
    if (!nav.items.length) return;
    setKeyboardActive();
    if (e.key === 'ArrowUp')    navFocus(nav.index - nav.cols);
    if (e.key === 'ArrowDown')  navFocus(nav.index + nav.cols);
    if (e.key === 'ArrowLeft')  navFocus(nav.index - 1);
    if (e.key === 'ArrowRight') navFocus(nav.index + 1);
    return;
  }

  const skip = ['Shift','Control','Alt','Meta','CapsLock',
                'F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12',
                'Home','End','PageUp','PageDown','Insert','Delete'];
  if (skip.includes(e.key)) return;
  e.preventDefault();

  if (e.key === 'Escape') {
    if (view.inputBuffer) {
      view.inputBuffer = '';
      inputDispEl.textContent = '';
      return;
    }
    if (closeTopOverlay()) return;
    if (view.menuMode) { newRun(); animatedClear(showSplash); return; }
    return;
  }

  if (e.key === 'Backspace') {
    view.inputBuffer = view.inputBuffer.slice(0,-1);
    inputDispEl.textContent = view.inputBuffer;
    return;
  }

  if (e.key === 'Enter') {
    if (nav.items.length && nav.index >= 0 && !view.inputBuffer) {
      nav.items[nav.index].click();
      return;
    }
    if (onSplash) return;
    const cmd = view.inputBuffer;
    view.inputBuffer = '';
    inputDispEl.textContent = '';
    execute(cmd);
    return;
  }

  if (e.key.length === 1) {
    snd.key();
    view.inputBuffer += e.key;
    inputDispEl.textContent = view.inputBuffer;
  }
});

// ── SOUND TOGGLE ─────────────────────────────────────────────────────────────
document.getElementById('sound-toggle').addEventListener('click', toggleMute);

// ── SIDEBAR TOGGLE ───────────────────────────────────────────────────────────
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('collapsed');
}

document.getElementById('sidebar-tab').addEventListener('click', toggleSidebar);

// ── ROUTER ────────────────────────────────────────────────────────────────────
// history-driven navigation passes { fromHistory: true } so the nav functions
// restore the view without pushing a duplicate entry
window.addEventListener('popstate', e => {
  const s = e.state;
  if (!s || s.view === 'splash') { showSplash(); return; }
  if (s.view === 'menu')         { showMenu({ fromHistory: true }); return; }
  if (s.view === 'section') {
    showMenu({ fromHistory: true });
    openSection(s.name, { fromHistory: true });
  }
});

// ── INIT ─────────────────────────────────────────────────────────────────────
cursorEl.style.visibility = 'hidden';

(function initRoute() {
  const hash = location.hash.slice(1).toLowerCase();
  if (hash === 'menu') {
    history.replaceState({view:'menu'}, '', '#menu');
    document.body.classList.remove('splash');
    showMenu({ fromHistory: true });
  } else if (SECTIONS.some(s => s.toLowerCase() === hash)) {
    const name = SECTIONS.find(s => s.toLowerCase() === hash);
    history.replaceState({view:'section', name}, '', '#' + hash);
    document.body.classList.remove('splash');
    showMenu({ fromHistory: true });
    openSection(name, { fromHistory: true });
  } else {
    showSplash();
  }
})();
