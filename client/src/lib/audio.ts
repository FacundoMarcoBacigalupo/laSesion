let ctx: AudioContext | null = null;
export function audioCtx() {
  if (!ctx) try { ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch {}
  return ctx;
}
export function beep(freq = 440, dur = 0.1) {
  const c = audioCtx(); if (!c) return;
  const o = c.createOscillator(); const g = c.createGain();
  o.frequency.value = freq; g.gain.value = 0.05;
  o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + dur);
}
export function playBell() { beep(880, 0.3); }
export function playHeartbeat() { beep(60, 0.15); }