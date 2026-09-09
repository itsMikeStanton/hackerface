let muted = false;
const MASTER_VOL = 0.5;

export const snd = (function initAudio() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const master = ctx.createGain();
    master.gain.value = MASTER_VOL;
    master.connect(ctx.destination);

    const resume = () => { if (ctx.state === 'suspended') ctx.resume(); };
    document.addEventListener('click', resume);
    document.addEventListener('keydown', resume);

    const noiseBuf = (() => {
      const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      return b;
    })();

    function mkNoise(freq, dur, vol, t = ctx.currentTime) {
      const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.2;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f); f.connect(g); g.connect(master);
      src.start(t); src.stop(t + dur);
    }

    function mkTone(freq, dur, vol, type = 'sine', t = ctx.currentTime) {
      const osc = ctx.createOscillator(); osc.type = type; osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g); g.connect(master);
      osc.start(t); osc.stop(t + dur);
    }

    return {
      key:     () => mkNoise(3200, 0.035, 0.12),
      tick:    () => mkNoise(2000, 0.018, 0.065),
      hover:   () => mkTone(300 + Math.random()*180, 0.07, 0.09),
      barTick: (p) => mkTone(160 + p*520, 0.04, 0.065, 'square'),
      done:    () => { mkTone(620, 0.12, 0.13); mkTone(860, 0.1, 0.09, 'sine', ctx.currentTime+0.08); },
      glitch:  () => {
        // simple low buzz
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = 70;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.05, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
        osc.connect(g); g.connect(master);
        osc.start(t); osc.stop(t + 0.24);
      },
      wipe: (ms) => {
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
