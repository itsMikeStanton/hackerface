'use strict';

// ── MENU / NAV ───────────────────────────────────────────────────────────────
function addBackButton() {
  if (outputEl.querySelector('.menu-back')) return;
  const btn = document.createElement('div');
  btn.className = 'menu-back';
  btn.textContent = '[ ↩ back ]';
  btn.addEventListener('click', showMenu);
  outputEl.appendChild(btn);
  outputEl.scrollTop = outputEl.scrollHeight;
}

function showMenu() {
  menuMode = true;
  currentSection = null;
  if (hackTimer) { clearTimeout(hackTimer); hackTimer = null; }
  hackQueue = [];
  outputEl.innerHTML = '';

  const wrap = document.createElement('div');
  wrap.className = 'menu-wrap';
  SECTIONS.forEach((name, i) => {
    const item = document.createElement('div');
    item.className = 'menu-item';
    item.textContent = `[ ${name} ]`;
    item.addEventListener('click', () => openSection(name));
    item.addEventListener('mouseenter', () => snd && snd.hover());
    wrap.appendChild(item);
    if (i < SECTIONS.length - 1) {
      const conn = document.createElement('div');
      conn.className = 'menu-conn';
      conn.textContent = '|';
      wrap.appendChild(conn);
    }
  });

  outputEl.appendChild(wrap);
  updateSidebarNav();
  setIdle();
}

function openSection(name) {
  currentSection = name;
  if (hackTimer) { clearTimeout(hackTimer); hackTimer = null; }
  hackQueue = [];
  outputEl.innerHTML = '';
  updateSidebarNav();

  SECTION_CONTENT[name].forEach(item => hackQueue.push(item));
  hackQueue.push(null);

  state = 'HACKING';
  promptSpan.textContent = '';
  inputDispEl.textContent = '';
  cursorEl.style.visibility = 'hidden';
  processQueue();
}

// ── SPLASH ───────────────────────────────────────────────────────────────────
function showSplash() {
  menuMode = false;
  currentSection = null;
  hackQueue = [];
  if (hackTimer) { clearTimeout(hackTimer); hackTimer = null; }
  outputEl.innerHTML = '';
  inputBuffer = '';
  document.body.classList.add('splash');
  state = 'IDLE';
  promptSpan.textContent = '';
  cursorEl.style.visibility = 'hidden';

  const wrap = document.createElement('div');
  wrap.className = 'menu-wrap splash-wrap';

  const title = document.createElement('div');
  title.className = 'menu-item splash-title';
  title.style.marginBottom = '0.6em';
  title.textContent = '[ NOT QUIETLY . COM ]';
  const GLITCH_CHARS = '!@#$%^&*[]{}|<>?/\\~`±§';
  let titleGlitch = null;
  title.addEventListener('mouseenter', () => {
    let running = true;

    function scheduleNext() {
      if (!running) return;
      if (Math.random() < 0.45) {
        setTimeout(scheduleNext, rnd(180, 550));
      } else {
        const end = Date.now() + rnd(100, 400);
        function burst() {
          if (!running) return;
          if (Date.now() >= end) {
            title.textContent = '[ NOT FUCKING QUIETLY . COM ]';
            title.style.transform = '';
            title.style.filter = '';
            title.style.textShadow = '';
            setTimeout(scheduleNext, rnd(60, 280));
            return;
          }
          const base = '[ NOT FUCKING QUIETLY . COM ]';
          title.textContent = Math.random() < 0.35
            ? base.split('').map(c => Math.random() < 0.2 ? GLITCH_CHARS[Math.floor(Math.random()*GLITCH_CHARS.length)] : c).join('')
            : base;
          title.style.transform = `translate(${((Math.random()-0.5)*32).toFixed(0)}px,${((Math.random()-0.5)*6).toFixed(0)}px) skewX(${((Math.random()-0.5)*22).toFixed(1)}deg)`;
          title.style.filter = `brightness(${(0.3+Math.random()*2.5).toFixed(2)}) saturate(${rnd(1,13)}) hue-rotate(${rnd(0,360)}deg)`;
          title.style.textShadow = `${((Math.random()-0.5)*22).toFixed(0)}px 0 rgba(255,40,40,0.95),${((Math.random()-0.5)*22).toFixed(0)}px 0 rgba(40,40,255,0.95),0 0 32px rgba(255,204,0,1)`;
          if (snd && Math.random() < 0.35) snd.glitch();
          setTimeout(burst, rnd(30, 65));
        }
        burst();
      }
    }

    titleGlitch = { stop: () => { running = false; } };
    scheduleNext();
  });
  title.addEventListener('mouseleave', () => {
    if (titleGlitch) { titleGlitch.stop(); titleGlitch = null; }
    title.textContent = '[ NOT QUIETLY . COM ]';
    title.style.transform = '';
    title.style.filter = '';
    title.style.textShadow = '';
  });
  wrap.appendChild(title);

  const bootEl = document.createElement('div');
  bootEl.className = 'menu-item splash-item';
  bootEl.textContent = '[ BOOT ]';
  bootEl.addEventListener('mouseenter', () => snd && snd.hover());
  bootEl.addEventListener('click', () => {
    document.body.classList.remove('splash');
    state = 'BOOT';
    outputEl.innerHTML = '';
    promptSpan.textContent = '';
    cursorEl.style.visibility = 'hidden';
    runBoot();
  });
  wrap.appendChild(bootEl);

  const conn = document.createElement('div');
  conn.className = 'menu-conn splash-item';
  conn.textContent = '|';
  wrap.appendChild(conn);

  const exitEl = document.createElement('div');
  exitEl.className = 'menu-item splash-item';
  exitEl.textContent = '[ EXIT ]';
  exitEl.addEventListener('mouseenter', () => snd && snd.hover());
  exitEl.addEventListener('click', () => {
    window.open('https://www.google.com/search?q=kittens+gif', '_blank');
  });
  wrap.appendChild(exitEl);

  outputEl.appendChild(wrap);
}
