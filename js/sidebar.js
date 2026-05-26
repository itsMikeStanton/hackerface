'use strict';

// ── SIDEBAR ──────────────────────────────────────────────────────────────────
const sidebarEl = document.getElementById('sidebar-content');
const sL  = s => '║' + s.padEnd(30).slice(0,30) + '║';
const TOP = '╔' + '═'.repeat(30) + '╗';
const SEP = '╠' + '═'.repeat(30) + '╣';
const BOT = '╚' + '═'.repeat(30) + '╝';
const BAR = (pct, w=14) => { const f=Math.round(pct/100*w); return '█'.repeat(f)+'░'.repeat(w-f); };

const sbProcs = [
  { name:'ghost-d',   st:'RUN'  },
  { name:'krakensc',  st:'RUN'  },
  { name:'netsniff',  st:'WAIT' },
  { name:'tunneld',   st:'RUN'  },
  { name:'keyd',      st:'IDLE' },
  { name:'phantomd',  st:'RUN'  },
];
const TRANS = {
  RUN:  { RUN:0.92, WAIT:0.06, IDLE:0.02 },
  WAIT: { RUN:0.3,  WAIT:0.6,  IDLE:0.1  },
  IDLE: { RUN:0.15, WAIT:0.15, IDLE:0.7  },
};
function nextState(s) {
  let r = Math.random(), c = 0;
  for (const [k,v] of Object.entries(TRANS[s])) { c+=v; if (r<c) return k; }
  return s;
}

let sb = { cpu:65, ram:55, net:72, up:2.1, dn:0.8, nodes:4821, owned:247, exfil:47.3, conns:183 };

function updateSidebar() {
  if (menuMode) return;
  sb.cpu   = clamp(sb.cpu   + rnd(-9,9),  15, 99);
  sb.ram   = clamp(sb.ram   + rnd(-5,5),  25, 90);
  sb.net   = clamp(sb.net   + rnd(-10,10),20, 99);
  sb.up    = Math.max(0.1, Math.min(9.9, sb.up  + (Math.random()-0.5)*0.6));
  sb.dn    = Math.max(0.1, Math.min(4.9, sb.dn  + (Math.random()-0.5)*0.3));
  sb.conns = clamp(sb.conns + rnd(-8,8),  80, 350);
  if (Math.random()<0.35) sb.nodes += rnd(1,25);
  if (Math.random()<0.12) sb.owned += rnd(1,4);
  if (Math.random()<0.5)  sb.exfil += Math.random()*0.8;
  sbProcs.forEach(p => { p.st = nextState(p.st); });

  const stColor = s => s==='RUN' ? '▶' : s==='WAIT' ? '◌' : '·';

  const lines = [
    TOP,
    sL('  ▓ SYS MONITOR v9.1'),
    SEP,
    sL(` CPU ${BAR(sb.cpu)}  ${lpad(sb.cpu,3)}%`),
    sL(` RAM ${BAR(sb.ram)}  ${lpad(sb.ram,3)}%`),
    sL(` NET ${BAR(sb.net)}  ${lpad(sb.net,3)}%`),
    SEP,
    sL(` ↑ ${lpad(sb.up.toFixed(1),4)} GB/s`),
    sL(` ↓ ${lpad(sb.dn.toFixed(1),4)} GB/s`),
    sL(` CONNS: ${lpad(sb.conns,5)}`),
    SEP,
    sL('  PROCESSES'),
    ...sbProcs.map(p => sL(` ${stColor(p.st)} ${pad(p.name,9)}[${pad(p.st,4)}]`)),
    SEP,
    sL(` NODES  ${lpad(sb.nodes.toLocaleString(),7)}`),
    sL(` OWNED  ${lpad(sb.owned,7)}`),
    sL(` EXFIL  ${lpad(sb.exfil.toFixed(1),5)}GB`),
    BOT,
  ];
  sidebarEl.textContent = lines.join('\n');
}
updateSidebar();
setInterval(updateSidebar, 1200);

function updateSidebarNav() {
  const lines = [
    TOP,
    sL('  ▓ NAVIGATE'),
    SEP,
    sL(''),
    ...SECTIONS.map(s => sL(s === currentSection ? ` ▶ ${s}` : `   ${s}`)),
    sL(''),
    SEP,
    sL(currentSection ? "  'menu' to return" : '  click to enter'),
    BOT,
  ];
  sidebarEl.textContent = lines.join('\n');
}
