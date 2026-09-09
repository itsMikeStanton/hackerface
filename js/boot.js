import { snd } from './audio.js';
import { G } from './util.js';
import { addLine, animatedClear, newRun, isCurrent } from './terminal.js';
import { showMenu } from './menu.js';

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

export function runBoot() {
  const gen = newRun();
  snd.boot();
  BOOT.forEach(([delay, cls, text]) => setTimeout(() => {
    if (!isCurrent(gen)) return;
    addLine(text, cls);
  }, delay));
  setTimeout(() => {
    if (!isCurrent(gen)) return;
    animatedClear(showMenu, gen);
  }, 3900);
}
