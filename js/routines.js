'use strict';

// ── HACKING ROUTINES ─────────────────────────────────────────────────────────
const ROUTINES = [

  // 0 — Port scan
  () => { const t=G.ip(), n=rnd(4,9);
    const r = [['','`nmap -sS -T4 -p- --open '+t+'`'],['dim','SYN scan  rate:1000pps  os:Linux 5.x']];
    for(let i=0;i<n;i++) r.push(['ok',`[+] ${pad(G.port()+'/tcp',10)} OPEN   ${G.svc()}`]);
    r.push(['dim',`Scan done: ${n} ports in ${rnd(1,12)}.${rnd(0,9)}s`]);
    return r;
  },

  // 1 — Brute force
  () => { const t=G.ip(), u=G.user(), p=G.pass();
    return [
      ['',`hydra -l ${u} -P rockyou.txt ssh://${t}`],
      ['dim','[*] 14,344,391 passwords  threads:16'],
      ['dim',`[-] ${u}:password123 ... FAIL`],
      ['dim',`[-] ${u}:qwerty ....... FAIL`],
      ['dim',`[-] ${u}:${pick('letmein','dragon','admin')} ....... FAIL`],
      {type:'bar', label:'[*] attacking:  ', steps:16, delay:65, done:'FOUND', doneCls:'ok'},
      ['ok', `[+] VALID CREDS → ${u} : ${p}`],
      ['ok', `[+] token: ${hex(32)}`],
    ];
  },

  // 2 — Hash crack
  () => { const h=G.hash(), p=G.pass();
    return [
      ['',`hashcat -m 0 ${h} rockyou.txt`],
      ['dim',`[*] MD5  speed: ${rnd(200,999)}.${rnd(1,9)} MH/s`],
      {type:'bar', label:'[*] cracking:   ', steps:18, delay:70, done:'CRACKED', doneCls:'ok'},
      ['ok', `[+] ${h} → "${p}"`],
      ['ok', '[+] written → /loot/hashes.txt'],
    ];
  },

  // 3 — Exploit
  () => { const t=G.ip(), e=G.exploit();
    return [
      ['warn',`[!] ${e}`],
      ['',   `[*] target: ${t}:${G.port()}`],
      ['',   '[*] payload: linux/x64/meterpreter/reverse_tcp'],
      ['dim','[*] encoding: shikata_ga_nai ×3'],
      {type:'bar', label:'[*] exploiting: ', steps:14, delay:90, done:'SHELL', doneCls:'warn'},
      ['ok', `[+] Meterpreter session opened`],
      ['ok', `[+]   ${G.ip()}:4444 ← ${t}:${rnd(1024,65534)}`],
      ['ok', '[+] uid=0(root) gid=0(root) — OWNED'],
    ];
  },

  // 4 — Subroutine
  () => { const s=G.sub();
    return [
      ['',     `[*] exec ${s}`],
      ['dim',  `[*] deps: OK   heap: ${rnd(128,512)}MB`],
      {type:'bar', label:'[*] stage 1/4:  ', steps:10, delay:80,  done:'RECON DONE'},
      {type:'bar', label:'[*] stage 2/4:  ', steps:10, delay:95,  done:'IN'},
      {type:'bar', label:'[*] stage 3/4:  ', steps:10, delay:110, done:'ROOT'},
      {type:'bar', label:'[*] stage 4/4:  ', steps:8,  delay:120, done:'PERSISTED', doneCls:'ok'},
      ['ok',   `[+] ${s} complete`],
      ['bright',`>> ${rnd(12,999)} new targets queued`],
    ];
  },

  // 5 — Exfil
  () => { const t=G.ip();
    return [
      ['',  `[*] shell: ${t}`],
      ['ok',`[+] ${G.fpath()}  (${G.fsize()})`],
      ['ok',`[+] ${G.fpath()}  (${G.fsize()})`],
      ['ok',`[+] ${G.fpath()}  (${G.fsize()})`],
      ['',  '[*] AES-256-GCM encrypt + compress...'],
      {type:'bar', label:'[*] exfil:      ', steps:20, delay:55, done:'SENT', doneCls:'ok'},
      ['ok', `[+] ${G.fsize()} transferred in ${(Math.random()*4+0.4).toFixed(2)}s`],
      ['dim','[*] logs wiped'],
    ];
  },

  // 6 — MITM
  () => { const a=G.ip(), b=G.ip();
    return [
      ['',    `arpspoof -i eth0 -t ${b} ${a}`],
      ['warn','[!] ARP poisoned — MITM active'],
      {type:'bar', label:'[*] intercepting:', steps:12, delay:80, done:'CAPTURING'},
      ['ok',  `[+] HTTP:   ${G.user()} / ${G.pass()} @ ${b}`],
      ['ok',  `[+] cookie: ${hex(32)}`],
      ['ok',  `[+] JWT:    eyJ${hex(20)}...`],
      ['dim', '[*] forwarding — target unaware'],
    ];
  },

  // 7 — Botnet
  () => { const n=rnd(1000,12000), t=G.ip();
    return [
      ['',    `[*] C2: ${G.ip()}:${G.port()}`],
      ['ok',  `[+] botnet ONLINE: ${n.toLocaleString()} nodes`],
      ['dim', `[*] RU ${rnd(20,38)}%  CN ${rnd(15,28)}%  US ${rnd(8,18)}%  OTHER`],
      {type:'bar', label:'[*] deploying:  ', steps:20, delay:50, done:`${n.toLocaleString()} UPDATED`, doneCls:'ok'},
      ['warn',`[!] FLOOD → ${t}  est. ${rnd(80,999)} Gbps`],
      ['ok',  '[+] attack launched'],
    ];
  },

  // 8 — Keylogger harvest
  () => { const n=rnd(8,80);
    return [
      ['',  `[*] polling ${n} agents`],
      {type:'bar', label:'[*] collecting: ', steps:10, delay:90, done:`${n} REPORTS`, doneCls:'ok'},
      ['',  '[*] parsing keystrokes...'],
      ['ok',`[+] gmail:  ${G.user()}@gmail.com / ${G.pass()}`],
      ['ok',`[+] bank:   ${G.user()} / ${G.pass()}  [$$ FLAGGED]`],
      ['ok',`[+] ssh key passphrase: "${G.pass()}"`],
      ['dim','[*] saved → /loot/keylog.txt'],
    ];
  },

  // 9 — Crypto
  () => [
    ['',   '[*] Generating RSA-4096 keypair'],
    ['dim','[*] entropy: /dev/urandom  512 bits'],
    {type:'bar', label:'[*] generating: ', steps:14, delay:100, done:'DONE', doneCls:'ok'},
    ['ok', `[+] pub:  ${hex(16)}...`],
    ['ok', `[+] priv: ${hex(16)}... [AES-256 wrapped]`],
    ['',   '[*] ChaCha20-Poly1305 tunnel → C2'],
    ['ok', '[+] secure channel UP'],
  ],

  // 10 — SQL inject
  () => { const t=G.ip();
    return [
      ['',   `sqlmap -u http://${t}/login.php --dbs --batch`],
      {type:'bar', label:"[*] probing:    ", steps:15, delay:70, done:'VULN FOUND', doneCls:'warn'},
      ['ok', "[+] injectable: POST 'username' (boolean-blind)"],
      ['ok', '[+] DBs: users_db, admin_db, orders, logs'],
      {type:'bar', label:'[*] dumping:    ', steps:12, delay:80, done:'DONE', doneCls:'ok'},
      ['ok', `[+] ${rnd(1000,99999).toLocaleString()} rows → /loot/db_${t}.sql`],
    ];
  },

  // 11 — Priv esc
  () => { const p=G.proc();
    return [
      ['',   '[*] LinPEAS running on target...'],
      {type:'bar', label:'[*] scanning:   ', steps:12, delay:100, done:'VULNS FOUND', doneCls:'warn'},
      ['ok', '[+] SUID: /usr/bin/pkexec'],
      ['warn','[!] CVE-2021-4034 (PwnKit) confirmed!'],
      ['',   `[*] injecting into ${p} [${rnd(1000,65535)}]`],
      ['ok', '[+] uid=1000 → uid=0(root)'],
      ['ok', '[+] /bin/bash -p  #'],
    ];
  },

  // 12 — Packet cap
  () => { const iface=pick('eth0','wlan0','en0','ens33');
    return [
      ['',   `tcpdump -i ${iface} -w /tmp/cap.pcap`],
      {type:'bar', label:'[*] capturing:  ', steps:14, delay:85, done:`${rnd(1000,9999)} pkts`},
      ['',   '[*] tshark analysis...'],
      ['ok', `[+] FTP: ${G.user()} / ${G.pass()} from ${G.ip()}`],
      ['ok', `[+] Telnet: ${G.ip()} → ${G.ip()}`],
      ['dim','[*] credentials logged'],
    ];
  },

  // 13 — Lateral move
  () => { const s=G.ip(), d=G.ip();
    return [
      ['',   `[*] pivot: ${s} → ${d}`],
      ['dim','[*] uploading tunnel agent...'],
      ['ok', `[+] socks5: ${s}:1080`],
      {type:'bar', label:'[*] scanning:   ', steps:10, delay:90, done:'DONE'},
      ['ok', `[+] ${rnd(3,15)} internal hosts found`],
      ['ok', `[+] domain controller: ${G.ip()}`],
      ['warn','[!] Kerberoastable SPN!'],
      ['ok', '[+] TGS extracted — offline crack queued'],
    ];
  },

  // 14 — Rootkit
  () => { const t=G.ip();
    return [
      ['',   `[*] rootkit → ${t}`],
      {type:'bar', label:'[*] uploading:  ', steps:8, delay:110, done:'DONE'},
      ['',   '[*] patching sys_call_table...'],
      ['ok', '[+] hooked: sys_read, sys_write, sys_getdents64'],
      ['ok', `[+] hiding pid ${rnd(1000,9999)} (${G.proc()})`],
      ['ok', '[+] hidden from: ps, top, netstat, /proc'],
      ['ok', '[+] rootkit active — system clean'],
    ];
  },

  // 15 — Zero day
  () => { const zd=`ZD-${rnd(2024,2026)}-${rnd(1000,9999)}`;
    return [
      ['warn',`[!] zero-day: ${zd}`],
      ['dim', `[*] target: ${pick('Chrome 134','Windows 11','OpenSSH 9.x','iOS 18','Android 15')}`],
      ['dim', `[*] CVSS: ${(7+Math.random()*3).toFixed(1)}  (${pick('RCE','LPE','Auth Bypass','RCE')})`],
      {type:'bar', label:'[*] acquiring:  ', steps:12, delay:95, done:'DOWNLOADED', doneCls:'ok'},
      ['',   `[*] testing vs ${G.ip()}...`],
      ['ok', `[+] ${zd}: CONFIRMED WORKING`],
    ];
  },

  // 16 — Decrypt payload
  () => [
    ['',   '[*] loading encrypted payload...'],
    ['dim',`[*] cipher: AES-256-GCM  IV: ${hex(16)}`],
    {type:'bar', label:'[*] decrypting: ', steps:18, delay:75, done:'PLAINTEXT RECOVERED', doneCls:'ok'},
    ['ok', `[+] ${hex(32)}`],
    ['ok', '[+] payload extracted → /tmp/.ghost/stage2.bin'],
  ],

  // 17 — SKULL: full system takeover
  () => [
    ['warn','[!] PHANTOM ROOT PROTOCOL — FULL SYSTEM OVERRIDE'],
    null,
    ...SKULL.map(line => ['skull', line]),
    null,
    ['err',  '[!!!] ALL SYSTEMS COMPROMISED'],
    ['ok',  `[+] remote control: ${rnd(100,999)} hosts`],
    ['ok',  `[+] data exfil: ${(Math.random()*500+50).toFixed(1)} GB`],
    ['bright','>> GHOST IN THE MACHINE'],
  ],

  // 18 — System monitor blitz
  () => { const n=rnd(5,20);
    const r = [['','[*] process injection sweep']];
    for(let i=0;i<n;i++) r.push(['dim',`    ${lpad(rnd(1000,65535),5)}  ${G.proc()}`]);
    r.push({type:'bar', label:'[*] injecting:  ', steps:16, delay:65, done:`${n} PROCS INFECTED`, doneCls:'warn'});
    r.push(['ok','[+] all target processes compromised']);
    return r;
  },

  // 19 — Wireless attack
  () => { const ssid=pick('CorpWiFi','NETGEAR-5G','ATT-Guest','Office-2G','Linksys');
    return [
      ['',   `airodump-ng --bssid ${G.mac()} wlan0mon`],
      ['ok', `[+] SSID: ${ssid}  CH:${rnd(1,13)}  ENC:WPA2`],
      ['',   '[*] capturing 4-way handshake...'],
      {type:'bar', label:'[*] waiting:    ', steps:10, delay:150, done:'HANDSHAKE', doneCls:'ok'},
      {type:'bar', label:'[*] cracking:   ', steps:20, delay:70,  done:pick('PSK: '+G.pass(),'KEY FOUND'), doneCls:'ok'},
      ['ok', `[+] connected to ${ssid}`],
      ['ok', `[+] gateway: ${G.ip()}`],
    ];
  },
];

function getRoutine() {
  return ROUTINES[rnd(0, ROUTINES.length)]();
}

function getRoutineFor(cmd) {
  if (!cmd) return getRoutine();
  const s = cmd.toLowerCase();
  if (/nmap|scan|port/.test(s))              return ROUTINES[0]();
  if (/hydra|brute|crack|ssh/.test(s))       return ROUTINES[1]();
  if (/hash|hashcat|john/.test(s))           return ROUTINES[2]();
  if (/exploit|msf|msfconsole/.test(s))      return ROUTINES[3]();
  if (/run|exec|sub|phantom/.test(s))        return ROUTINES[4]();
  if (/exfil|wget|scp|rsync/.test(s))        return ROUTINES[5]();
  if (/arp|mitm|poison/.test(s))             return ROUTINES[6]();
  if (/bot|c2|ddos|flood/.test(s))           return ROUTINES[7]();
  if (/key|log|harvest/.test(s))             return ROUTINES[8]();
  if (/rsa|aes|crypt|sign|key/.test(s))      return ROUTINES[9]();
  if (/sql|inject|db/.test(s))               return ROUTINES[10]();
  if (/priv|sudo|root|esc/.test(s))          return ROUTINES[11]();
  if (/tcpdump|pcap|sniff/.test(s))          return ROUTINES[12]();
  if (/pivot|lateral|move/.test(s))          return ROUTINES[13]();
  if (/rootkit|hide|stealth/.test(s))        return ROUTINES[14]();
  if (/zero|0day|broker/.test(s))            return ROUTINES[15]();
  if (/decrypt|aes|cipher/.test(s))          return ROUTINES[16]();
  if (/skull|override|phantom root/.test(s)) return ROUTINES[17]();
  if (/wifi|wireless|wpa|wlan/.test(s))      return ROUTINES[19]();
  return getRoutine();
}
