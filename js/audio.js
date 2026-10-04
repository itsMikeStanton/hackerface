import { onSignal, sigLevel } from './signal.js';
import { rnd } from './util.js';

let muted = false;
const MASTER_VOL = 0.5;
const BED_VOL    = 0.05;   // tube hum + hiss + flyback whine, before the signal scales it

export const snd = (function initAudio() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const master = ctx.createGain();
    master.gain.value = MASTER_VOL;
    master.connect(ctx.destination);

    // nothing is scheduled until the context is running — otherwise every
    // sound asked for before the first gesture plays at once when it unlocks
    const live = () => ctx.state === 'running';

    const resume = () => {
      if (ctx.state === 'suspended') ctx.resume().then(() => setBed(sigLevel()));
    };
    document.addEventListener('click', resume);
    document.addEventListener('keydown', resume);

    const noiseBuf = (() => {
      const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      return b;
    })();

    function mkNoise(freq, dur, vol, t = ctx.currentTime) {
      if (!live()) return;
      const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.2;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f); f.connect(g); g.connect(master);
      src.start(t); src.stop(t + dur);
    }

    function mkTone(freq, dur, vol, type = 'sine', t = ctx.currentTime) {
      if (!live()) return;
      const osc = ctx.createOscillator(); osc.type = type; osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g); g.connect(master);
      osc.start(t); osc.stop(t + dur);
    }

    // tone that slides from f0 to f1 over dur
    function mkSweep(f0, f1, dur, vol, type = 'sine', t = ctx.currentTime) {
      if (!live()) return;
      const osc = ctx.createOscillator(); osc.type = type;
      osc.frequency.setValueAtTime(f0, t);
      osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g); g.connect(master);
      osc.start(t); osc.stop(t + dur);
    }

    // ── TUBE BED ───────────────────────────────────────────────────────────
    // Always-on mains hum, hiss and flyback whine, kept very low. Its level
    // follows the signal, and it drops out while the tube is powered off.
    const bed = ctx.createGain();
    bed.gain.value = 0;
    bed.connect(master);
    [[60, 'sine', 0.5], [120, 'sine', 0.22], [180, 'triangle', 0.06], [15734, 'sine', 0.05]]
      .forEach(([freq, type, vol]) => {
        const osc = ctx.createOscillator(); osc.type = type; osc.frequency.value = freq;
        const g = ctx.createGain(); g.gain.value = vol;
        osc.connect(g); g.connect(bed); osc.start();
      });
    {
      const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 5200; f.Q.value = 0.5;
      const g = ctx.createGain(); g.gain.value = 0.12;
      src.connect(f); f.connect(g); g.connect(bed); src.start();
    }
    let tubeOn = true;
    function setBed(sig) {
      if (!live()) return;
      bed.gain.setTargetAtTime(tubeOn ? BED_VOL * (0.55 + 1.3 * sig) : 0, ctx.currentTime, 0.25);
    }
    onSignal(setBed);

    return {
      key:     () => mkNoise(3200, 0.035, 0.12),
      tick:    () => mkNoise(2000, 0.018, 0.065),
      hover:   () => mkTone(300 + Math.random()*180, 0.07, 0.09),
      barTick: (p) => mkTone(160 + p*520, 0.04, 0.065, 'square'),
      done:    () => { mkTone(620, 0.12, 0.13); mkTone(860, 0.1, 0.09, 'sine', ctx.currentTime+0.08); },
      // kind: undefined = the classic low buzz; 'tear' | 'flash' | 'drop' are the
      // live-mode glitches, each voiced for what the picture is doing and how long
      glitch:  (kind, ms = 220) => {
        if (!live()) return;
        const t = ctx.currentTime, dur = ms / 1000;
        if (kind === 'flash') { mkTone(2400, 0.03, 0.05, 'square'); mkNoise(5200, Math.max(0.03, dur), 0.07); return; }
        if (kind === 'drop')  { mkSweep(64, 40, 0.14, 0.16); return; }
        if (kind === 'tear')  mkNoise(rnd(900, 2600), dur + 0.04, 0.09);
        // simple low buzz
        const len = kind ? dur + 0.02 : 0.22;
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = 70;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(kind ? 0.035 : 0.05, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + len);
        osc.connect(g); g.connect(master);
        osc.start(t); osc.stop(t + len + 0.02);
      },
      wipe: (ms) => {
        if (!live()) return;
        const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
        const f = ctx.createBiquadFilter(); f.type = 'lowpass';
        f.frequency.setValueAtTime(60, ctx.currentTime);
        f.frequency.linearRampToValueAtTime(8000, ctx.currentTime + ms/1000);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.2, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + ms/1000);
        s.connect(f); f.connect(g); g.connect(master);
        s.start(); s.stop(ctx.currentTime + ms/1000);
      },
      boot: () => {
        mkTone(60,  0.25, 0.14, 'sawtooth');
        mkTone(90,  0.2,  0.10, 'square',   ctx.currentTime + 0.3);
        mkTone(140, 0.3,  0.12, 'sine',     ctx.currentTime + 0.55);
        mkTone(220, 0.4,  0.10, 'sine',     ctx.currentTime + 0.9);
        mkNoise(1200, 0.8, 0.08, ctx.currentTime + 1.4);
      },
      // degauss thump, the coil's decaying buzz, and the flyback winding up
      powerOn: () => {
        tubeOn = true; setBed(sigLevel());
        const t = ctx.currentTime;
        mkSweep(58, 36, 0.4, 0.5, 'sine', t);
        mkNoise(240, 0.09, 0.22, t);
        mkTone(100, 0.55, 0.07, 'sawtooth', t + 0.02);
        mkSweep(1800, 12000, 0.45, 0.012, 'sine', t);
      },
      // flyback winding down, then the click of the picture collapsing
      powerOff: () => {
        tubeOn = false; setBed(0);
        const t = ctx.currentTime;
        mkSweep(9000, 180, 0.34, 0.03, 'sine', t);
        mkNoise(1400, 0.05, 0.2, t + 0.18);
        mkSweep(90, 45, 0.2, 0.2, 'sine', t + 0.18);
      },
      // vertical hold slipping
      roll: () => {
        const t = ctx.currentTime;
        mkSweep(130, 62, 0.4, 0.08, 'square', t);
        mkNoise(900, 0.3, 0.1, t);
      },
      // channel change
      cut: () => {
        mkNoise(1800, 0.11, 0.2);
        mkTone(180, 0.06, 0.1, 'square');
      },
      mute: (m) => {
        master.gain.setTargetAtTime(m ? 0 : MASTER_VOL, ctx.currentTime, 0.06);
      },
    };
  } catch(e) {
    return new Proxy({}, { get: () => () => {} });
  }
})();

export function toggleMute() {
  muted = !muted;
  snd.mute(muted);
  const el = document.getElementById('sound-toggle');
  if (el) el.textContent = muted ? '[MUTED]' : '[SOUND]';
}
