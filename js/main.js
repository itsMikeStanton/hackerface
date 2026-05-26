'use strict';

// ── EXECUTE COMMAND ──────────────────────────────────────────────────────────
function execute(cmd) {
  if (cmd.trim()) addLine(PROMPT + cmd, 'dim');

  if (/^(cls|clear)$/i.test(cmd.trim())) {
    animatedClear();
    return;
  }

  if (/^menu$/i.test(cmd.trim())) {
    animatedClear(showMenu);
    return;
  }

  menuMode = false;
  currentSection = null;

  const routine = getRoutineFor(cmd);

  if (state === 'HACKING') {
    routine.forEach(i => hackQueue.push(i));
    hackQueue.push(null);
    return;
  }

  state = 'HACKING';
  promptSpan.textContent = '';
  inputDispEl.textContent = '';
  cursorEl.style.visibility = 'hidden';

  routine.forEach(i => hackQueue.push(i));
  hackQueue.push(null);
  processQueue();
}

// ── KEYBOARD ─────────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (state === 'BOOT') return;

  if (e.key === 'Tab') {
    e.preventDefault();
    document.getElementById('sidebar').classList.toggle('collapsed');
    return;
  }

  const skip = ['Shift','Control','Alt','Meta','CapsLock',
                'F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12',
                'ArrowUp','ArrowDown','ArrowLeft','ArrowRight',
                'Home','End','PageUp','PageDown','Insert','Delete'];
  if (skip.includes(e.key)) return;
  e.preventDefault();

  if (e.key === 'Escape') {
    inputBuffer = '';
    inputDispEl.textContent = '';
    return;
  }

  if (e.key === 'Backspace') {
    inputBuffer = inputBuffer.slice(0,-1);
    inputDispEl.textContent = inputBuffer;
    return;
  }

  if (e.key === 'Enter') {
    const cmd = inputBuffer;
    inputBuffer = '';
    inputDispEl.textContent = '';
    execute(cmd);
    return;
  }

  if (e.key.length === 1) {
    if (snd) snd.key();
    inputBuffer += e.key;
    inputDispEl.textContent = inputBuffer;
  }
});

// ── SOUND TOGGLE ─────────────────────────────────────────────────────────────
document.getElementById('sound-toggle').addEventListener('click', toggleMute);

// ── BOOT SEQUENCE ────────────────────────────────────────────────────────────
const BOOT = [
  [0,    'dim',   'PHANTOM BIOS v3.1.7  (C) 1998-2024 PhantomSystems Inc.'],
  [110,  '',      ''],
  [200,  '',      'CPU: Intel Core i9-13900K @ 5.80GHz [OVERCLOCKED]'],
  [320,  '',      'RAM: 65536MB ECC DDR5-6400   GPU: RTX 4090 24GB'],
  [430,  '',      'NVMe: 2TB   NET: 10GbE [STEALTH MODE]'],
  [570,  '',      ''],
  [660,  '',      'POST....... PASS   Memory........ PASS   PCI-E......... OK'],
  [800,  '',      ''],
  [900,  'bright','═══════════════════ DARKNET OS v7.3.1 ═══════════════════'],
  [1020, '',      ''],
  [1100, 'dim',   'Loading kernel: darknet-7.3.1-amd64 ...'],
  [1200, 'dim',   '[    0.000000] Booting Linux kernel 7.3.1-darknet'],
  [1300, 'dim',   '[    0.148320] PCI: Using configuration type 1'],
  [1400, 'dim',   '[    0.891020] phantom_net module ................. OK'],
  [1500, 'dim',   '[    1.234100] eth0: MAC spoofing ENABLED'],
  [1600, 'dim',   '[    1.789300] Mounting encrypted filesystem ...... OK'],
  [1700, '',      '[    2.103400] Starting services:'],
  [1830, '',      '[    2.412000]   TOR relay (multi-hop) ............. [ OK ]'],
  [1940, '',      '[    2.534000]   VPN tunnel (AES-256-GCM) .......... [ OK ]'],
  [2050, '',      '[    2.656000]   Packet obfuscation ................ [ OK ]'],
  [2160, '',      '[    2.778000]   PHANTOM intrusion suite v9.1 ...... [ OK ]'],
  [2270, '',      '[    2.900000]   Payload library (32,768 exploits) . [ OK ]'],
  [2380, '',      '[    3.022000]   Neural hash cracker ................ [ OK ]'],
  [2490, '',      '[    3.144000]   Botnet C2 interface ............... [ OK ]'],
  [2600, '',      '[    3.266000]   Zero-day broker ................... [ OK ]'],
  [2720, '',      ''],
  [2820, 'dim',   'Origin masked. Traffic encrypted. Logging disabled.'],
  [2980, 'bright','Welcome back, GHOST.'],
  [3150, '',      ''],
  [3260, 'dim',   `Last login: Fri May 23 03:14:15 2026 via tor-relay [${G.ip()}]`],
  [3380, '',      ''],
  [3480, 'dim',   'Initializing navigation interface...'],
  [3580, '',      ''],
];

function runBoot() {
  if (snd) snd.boot();
  BOOT.forEach(([delay, cls, text]) => setTimeout(() => addLine(text, cls), delay));
  setTimeout(() => { animatedClear(showMenu); }, 3900);
}

// ── GHOST CURSOR + PARALLAX ───────────────────────────────────────────────────
const ghostCursorEl = document.getElementById('ghost-cursor');
const screenEl      = document.getElementById('screen');
let charW = 0, charH = 0;

function measureChar() {
  const span = document.createElement('span');
  span.style.cssText = 'visibility:hidden;position:absolute;white-space:pre';
  span.textContent = 'X';
  termEl.appendChild(span);
  const r = span.getBoundingClientRect();
  charW = r.width;
  charH = r.height;
  termEl.removeChild(span);
}

document.addEventListener('mousemove', e => {
  if (!charW) measureChar();

  ghostCursorEl.style.display = 'block';
  ghostCursorEl.style.left = (Math.round(e.clientX / charW) * charW) + 'px';
  ghostCursorEl.style.top  = (Math.round(e.clientY / charH) * charH) + 'px';

  const nx = e.clientX / window.innerWidth  - 0.5;
  const ny = e.clientY / window.innerHeight - 0.5;
  screenEl.style.transform = `translate(${(-nx * 40).toFixed(1)}px, ${(-ny * 27).toFixed(1)}px)`;
});

window.addEventListener('resize', () => { charW = 0; charH = 0; });

// ── INIT ─────────────────────────────────────────────────────────────────────
cursorEl.style.visibility = 'hidden';
showSplash();
