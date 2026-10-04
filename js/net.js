// ── NET ──────────────────────────────────────────────────────────────────────
// Real transfer activity for the sidebar readout. `rx` is bytes that actually
// came over the wire (cache hits count as 0); `pulse` is bytes seen since the
// sidebar last looked, fed live by streaming fetches as their chunks land.
export const net = { rx: 0, pulse: 0 };

export function netPulse(bytes) { net.pulse += bytes; }

try {
  new PerformanceObserver(list => list.getEntries().forEach(e => {
    const b = e.transferSize || 0;
    net.rx += b;
    // streamed fetches already pulsed chunk by chunk
    if (e.initiatorType !== 'fetch') net.pulse += b;
  })).observe({ type: 'resource', buffered: true });
} catch (e) {}
