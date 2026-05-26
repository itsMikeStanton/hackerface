'use strict';

let menuMode = false;
let currentSection = null;

// ── HELPERS ──────────────────────────────────────────────────────────────────
const pick  = (...a)  => a[Math.floor(Math.random()*a.length)];
const rnd   = (a,b)   => Math.floor(Math.random()*(b-a))+a;
const hex   = n       => Array.from({length:n}, () => rnd(0,16).toString(16)).join('');
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const pad   = (s,n)   => String(s).padEnd(n);
const lpad  = (s,n)   => String(s).padStart(n);

const G = {
  ip:      () => `${rnd(1,255)}.${rnd(0,255)}.${rnd(0,255)}.${rnd(1,255)}`,
  port:    () => pick(21,22,23,25,53,80,443,445,1433,3306,3389,4444,5432,6379,8080,8443,9200,27017),
  svc:     () => pick('ssh','ftp','http','https','smb','mysql','rdp','redis','mongodb','postgres','vnc','smtp'),
  exploit: () => pick('CVE-2024-6387','CVE-2024-1337','MS17-010','Log4Shell','CVE-2023-44487','ShellShock','Heartbleed','CVE-2024-3400','BlueKeep','PrintNightmare','DirtyPipe'),
  sub:     () => pick('GHOST_PROTOCOL','PHANTOM_SWEEP','KRAKEN_SCAN','MIRAGE_INJECT','SHADOW_MAP','HYDRA_SPAWN','NULL_ROUTE','VENOM_PAYLOAD','CIPHER_PULSE','WRAITH_NET','BASILISK_EYE'),
  proc:    () => pick('svchost.exe','explorer.exe','lsass.exe','winlogon.exe','systemd','nginx','apache2','mysqld','java','python3','node','chrome'),
  user:    () => pick('admin','root','administrator','guest','sysadmin','backup','deploy','jenkins','ubuntu','pi','service','oracle'),
  pass:    () => pick('password123','qwerty','letmein','admin2024','hunter2','Secure!@#','dragon','iloveyou','master','root1234','P@ssw0rd','abc123'),
  hash:    () => hex(32),
  fpath:   () => pick('/etc/shadow','/etc/passwd','/root/.ssh/id_rsa','/var/log/auth.log','/home/admin/.bash_history','C:\\Windows\\System32\\SAM','C:\\Users\\Admin\\Desktop\\passwords.txt','/var/www/html/config.php','/opt/app/.env','/etc/ssl/private/server.key'),
  fsize:   () => (Math.random()*999+1).toFixed(1)+pick('KB','KB','MB','MB','GB'),
  mac:     () => Array.from({length:6}, () => hex(2)).join(':'),
};

// ── SKULL ART ────────────────────────────────────────────────────────────────
const SKULL = [
  '        ░░░░░░░░░░░░░        ',
  '      ░░             ░░      ',
  '     ░   ████   ████   ░     ',
  '     ░   ████   ████   ░     ',
  '     ░               ░     ',
  '      ░░  █████████  ░░      ',
  '        ░░░░░░░░░░░░░        ',
  '          ██     ██          ',
  '         ████   ████         ',
  '        █ █ █████ █ █        ',
  '        █████████████        ',
];

// ── SECTIONS ─────────────────────────────────────────────────────────────────
const SECTIONS = ['ART', 'GAMES', 'MUSIC', 'WORK', 'WRITING'];
