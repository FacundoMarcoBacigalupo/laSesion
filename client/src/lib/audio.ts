import { useUiStore } from '../store/uiStore';

type Bus = {
  ctx: AudioContext;
  master: GainNode;
  sfx: GainNode;
  music: GainNode;
  wet: GainNode;
  noise: AudioBuffer;
  brown: AudioBuffer;
};

type Ambient = {
  amb: GainNode;
  lp: BiquadFilterNode;
  sources: AudioScheduledSourceNode[];
  timers: Set<number>;
};

let bus: Bus | null = null;
let ambient: Ambient | null = null;
let intensity = 0;

const BELLS = [220, 261.63, 293.66, 329.63, 392, 440];

function makeImpulse(ctx: AudioContext, seconds: number, decay: number) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

function makeNoise(ctx: AudioContext, seconds: number, brown: boolean) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (brown) {
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    } else {
      d[i] = w;
    }
  }
  return buf;
}

function ensureBus(): Bus | null {
  if (bus) {
    if (bus.ctx.state === 'suspended') void bus.ctx.resume();
    return bus;
  }
  const Ctor = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) return null;
  const ctx: AudioContext = new Ctor();

  const master = ctx.createGain();
  master.gain.value = useUiStore.getState().muted ? 0 : 1;
  master.connect(ctx.destination);

  const sfx = ctx.createGain();
  sfx.gain.value = 0.7;
  sfx.connect(master);

  const music = ctx.createGain();
  music.gain.value = 0.55;
  music.connect(master);

  const verb = ctx.createConvolver();
  verb.buffer = makeImpulse(ctx, 5, 2.5);
  const verbOut = ctx.createGain();
  verbOut.gain.value = 0.6;
  verb.connect(verbOut);
  verbOut.connect(master);
  const wet = ctx.createGain();
  wet.connect(verb);

  bus = { ctx, master, sfx, music, wet, noise: makeNoise(ctx, 2, false), brown: makeNoise(ctx, 4, true) };
  return bus;
}

function route(b: Bus, node: AudioNode, reverb: number, dest: AudioNode) {
  node.connect(dest);
  if (reverb > 0) {
    const send = b.ctx.createGain();
    send.gain.value = reverb;
    node.connect(send);
    send.connect(b.wet);
  }
}

type ToneOpts = { freq: number; type?: OscillatorType; dur?: number; vol?: number; slideTo?: number; reverb?: number; delay?: number };

function tone({ freq, type = 'sine', dur = 0.2, vol = 0.15, slideTo, reverb = 0, delay = 0 }: ToneOpts) {
  const b = ensureBus();
  if (!b) return;
  const t = b.ctx.currentTime + delay;
  const o = b.ctx.createOscillator();
  const g = b.ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.02, dur * 0.1));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  route(b, g, reverb, b.sfx);
  o.start(t);
  o.stop(t + dur + 0.05);
}

type BurstOpts = { dur?: number; freq?: number; sweepTo?: number; q?: number; vol?: number; type?: BiquadFilterType; reverb?: number; delay?: number; brown?: boolean };

function burst({ dur = 0.5, freq = 800, sweepTo, q = 1, vol = 0.1, type = 'bandpass', reverb = 0, delay = 0, brown = false }: BurstOpts = {}) {
  const b = ensureBus();
  if (!b) return;
  const t = b.ctx.currentTime + delay;
  const src = b.ctx.createBufferSource();
  src.buffer = brown ? b.brown : b.noise;
  const f = b.ctx.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, t);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  const g = b.ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.25);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f);
  f.connect(g);
  route(b, g, reverb, b.sfx);
  src.start(t, Math.random() * 1.5, dur + 0.05);
}

function bell(freq: number, vol = 0.1, reverb = 0.6, delay = 0) {
  tone({ freq, dur: 4, vol, reverb, delay });
  tone({ freq: freq * 2.76, dur: 2.2, vol: vol * 0.25, reverb, delay });
}

export const sfx = {
  click: () => tone({ freq: 620, slideTo: 300, type: 'triangle', dur: 0.06, vol: 0.05 }),
  key: () => tone({ freq: 1400 + Math.random() * 500, dur: 0.035, vol: 0.02 }),
  hold: () => {
    burst({ dur: 1.1, freq: 180, sweepTo: 900, q: 0.8, vol: 0.12, brown: true });
    tone({ freq: 110, slideTo: 220, type: 'sawtooth', dur: 1.1, vol: 0.05 });
  },
  release: () => {
    tone({ freq: 220, slideTo: 80, type: 'sawtooth', dur: 0.6, vol: 0.08 });
    burst({ dur: 0.4, freq: 600, sweepTo: 150, vol: 0.08 });
  },
  heartbeat: () => {
    tone({ freq: 58, slideTo: 40, dur: 0.22, vol: 0.4 });
    tone({ freq: 50, slideTo: 36, dur: 0.2, vol: 0.28, delay: 0.22 });
  },
  whisper: () => burst({ dur: 1.8, freq: 1100, sweepTo: 2800, q: 4, vol: 0.07, reverb: 0.7 }),
  letter: () => tone({ freq: 1100 + Math.random() * 500, dur: 0.14, vol: 0.05, reverb: 0.4 }),
  vote: () => {
    tone({ freq: 330, type: 'triangle', dur: 0.25, vol: 0.12 });
    tone({ freq: 247, type: 'triangle', dur: 0.35, vol: 0.12, delay: 0.18 });
  },
  chosen: () => {
    tone({ freq: 110, type: 'sawtooth', dur: 1.6, vol: 0.12, reverb: 0.4 });
    tone({ freq: 116.5, type: 'sawtooth', dur: 1.6, vol: 0.1, reverb: 0.4 });
    burst({ dur: 0.7, freq: 140, sweepTo: 60, vol: 0.25, brown: true });
  },
  seal: () => {
    tone({ freq: 55, slideTo: 38, dur: 1.2, vol: 0.4 });
    bell(110, 0.2, 0.5);
    bell(440, 0.1, 0.6, 0.12);
  },
  fire: () => {
    burst({ dur: 0.9, freq: 400, sweepTo: 1400, q: 1.2, vol: 0.15 });
    for (let i = 0; i < 6; i++) burst({ dur: 0.05, freq: 2000 + Math.random() * 2000, vol: 0.06, delay: 0.1 + Math.random() * 0.7 });
  },
  phase: () => {
    bell(146.8, 0.12, 0.5);
    bell(293.7, 0.08, 0.6, 0.1);
  },
  reveal: () => {
    tone({ freq: 65, slideTo: 40, type: 'sawtooth', dur: 2.5, vol: 0.14 });
    burst({ dur: 1.2, freq: 200, sweepTo: 80, vol: 0.15, brown: true });
    bell(440, 0.1, 0.6, 0.3);
  },
  ghost: () => {
    burst({ dur: 2.5, freq: 300, sweepTo: 1500, q: 1.5, vol: 0.1, reverb: 0.5 });
    tone({ freq: 600, slideTo: 150, dur: 2, vol: 0.05, reverb: 0.7 });
  },
  splash: () => {
    burst({ dur: 0.25, freq: 900, vol: 0.12 });
    tone({ freq: 300, slideTo: 120, dur: 0.2, vol: 0.05 });
  },
  hit: () => {
    tone({ freq: 180, type: 'square', dur: 0.12, vol: 0.06 });
    burst({ dur: 0.05, freq: 1500, vol: 0.15 });
  },
  exorcism: () => {
    tone({ freq: 60, slideTo: 90, type: 'sawtooth', dur: 3, vol: 0.12, reverb: 0.3 });
    burst({ dur: 3, freq: 800, sweepTo: 2500, q: 2, vol: 0.05 });
  },
  exorcismWon: () => {
    burst({ dur: 1.2, freq: 3000, sweepTo: 400, vol: 0.2 });
    bell(659, 0.12, 0.6);
    bell(987, 0.08, 0.6, 0.2);
  },
  scroll: () => {
    burst({ dur: 0.6, freq: 2000, vol: 0.08 });
    tone({ freq: 90, dur: 0.3, vol: 0.05 });
  },
  swish: () => burst({ dur: 0.3, freq: 800, sweepTo: 300, vol: 0.06 }),
  error: () => tone({ freq: 90, slideTo: 70, type: 'square', dur: 0.3, vol: 0.08 }),
  bell: () => bell(880, 0.12, 0.6),
  kick: () => tone({ freq: 300, slideTo: 60, type: 'square', dur: 0.5, vol: 0.08 }),
};

export function startAmbient() {
  const b = ensureBus();
  if (!b || ambient) return;
  const { ctx, music } = b;
  const t = ctx.currentTime;

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 280 + intensity * 500;
  lp.Q.value = 6;
  const amb = ctx.createGain();
  amb.gain.value = 0;
  lp.connect(amb);
  route(b, amb, 0.35, music);
  amb.gain.setTargetAtTime(0.9, t, 3);

  const sources: AudioScheduledSourceNode[] = [];
  const drones: [number, OscillatorType, number][] = [
    [55, 'sawtooth', 0.05],
    [55.4, 'sawtooth', 0.05],
    [82.41, 'triangle', 0.1],
    [77.78, 'sine', 0.05],
    [110.6, 'sine', 0.035],
    [41.2, 'sine', 0.12],
  ];
  for (const [f, type, vol] of drones) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.value = vol;
    o.connect(g);
    g.connect(lp);
    o.start(t);
    sources.push(o);
  }

  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.05;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 140;
  lfo.connect(lfoGain);
  lfoGain.connect(lp.frequency);
  lfo.start(t);
  sources.push(lfo);

  const wind = ctx.createGain();
  wind.gain.value = 0.04;
  const wlp = ctx.createBiquadFilter();
  wlp.type = 'bandpass';
  wlp.frequency.value = 420;
  wlp.Q.value = 0.6;
  const wsrc = ctx.createBufferSource();
  wsrc.buffer = b.brown;
  wsrc.loop = true;
  wsrc.connect(wlp);
  wlp.connect(wind);
  wind.connect(amb);
  wsrc.start(t);
  sources.push(wsrc);

  const timers = new Set<number>();
  const every = (min: number, max: number, fn: () => void) => {
    const tick = () => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        fn();
        tick();
      }, (min + Math.random() * (max - min)) * 1000);
      timers.add(id);
    };
    tick();
  };

  every(4, 9, () => {
    wind.gain.setTargetAtTime(0.02 + Math.random() * 0.08, ctx.currentTime, 2);
    wlp.frequency.setTargetAtTime(250 + Math.random() * 500, ctx.currentTime, 3);
  });
  every(7, 16, () => {
    if (Math.random() < 0.5 + intensity * 0.5) bell(BELLS[Math.floor(Math.random() * BELLS.length)] ?? 220, 0.03 + intensity * 0.05, 0.8);
  });
  every(10, 22, () => burst({ dur: 2.2, freq: 1100, sweepTo: 2800, q: 4, vol: 0.04 + intensity * 0.03, reverb: 0.7 }));
  every(25, 45, () => tone({ freq: 50, slideTo: 35, dur: 2.5, vol: 0.1, reverb: 0.3 }));

  ambient = { amb, lp, sources, timers };
}

export function stopAmbient() {
  if (!ambient || !bus) return;
  const a = ambient;
  ambient = null;
  a.amb.gain.setTargetAtTime(0, bus.ctx.currentTime, 1);
  a.timers.forEach((id) => window.clearTimeout(id));
  window.setTimeout(() => a.sources.forEach((s) => { try { s.stop(); } catch { /* already stopped */ } }), 4000);
}

export function setAmbientIntensity(v: number) {
  intensity = Math.max(0, Math.min(1, v));
  if (!ambient || !bus) return;
  ambient.lp.frequency.setTargetAtTime(280 + intensity * 500, bus.ctx.currentTime, 2);
}

type Chant = { oscs: OscillatorNode[]; gain: GainNode };
let chant: Chant | null = null;
let lastHands = 0;

const handsPitch = (ratio: number) => 110 * Math.pow(2, ratio * 3);

export function setHandsLevel(hands: number, max: number) {
  if (!bus && hands === 0) return;
  const b = ensureBus();
  if (!b) return;
  const ratio = Math.max(0, Math.min(1, hands / max));
  const t = b.ctx.currentTime;

  if (!chant) {
    const lp = b.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1400;
    const gain = b.ctx.createGain();
    gain.gain.value = 0;
    lp.connect(gain);
    route(b, gain, 0.5, b.sfx);
    const oscs = [0, 7].map((detune) => {
      const o = b.ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = handsPitch(0);
      o.detune.value = detune;
      o.connect(lp);
      o.start(t);
      return o;
    });
    chant = { oscs, gain };
  }

  const pitch = handsPitch(ratio);
  chant.oscs.forEach((o) => o.frequency.setTargetAtTime(pitch, t, 0.35));
  chant.gain.gain.setTargetAtTime(hands > 0 ? 0.03 + ratio * 0.07 : 0, t, 0.4);

  if (hands > lastHands) {
    tone({ freq: pitch * 2, slideTo: pitch * 2.5, dur: 0.3, vol: 0.07, reverb: 0.4 });
  }
  lastHands = hands;
}

export function setupAudio() {
  const applyMute = (muted: boolean) => {
    if (!bus) return;
    bus.master.gain.setTargetAtTime(muted ? 0 : 1, bus.ctx.currentTime, 0.05);
    if (!muted) startAmbient();
  };
  const unsub = useUiStore.subscribe((s: any) => applyMute(s.muted));

  const unlock = () => {
    ensureBus();
    if (!useUiStore.getState().muted) startAmbient();
  };
  const onPointerDown = (e: Event) => {
    const el = (e.target as Element | null)?.closest?.('button, input[type="checkbox"], [role="button"]') as HTMLButtonElement | null;
    if (el && !el.disabled) sfx.click();
  };
  const onKeyDown = (e: KeyboardEvent) => {
    const el = e.target as Element | null;
    if (el?.matches?.('input:not([type="checkbox"]):not([type="button"]), textarea')) sfx.key();
  };

  document.addEventListener('pointerdown', unlock, { once: true });
  document.addEventListener('keydown', unlock, { once: true });
  document.addEventListener('pointerdown', onPointerDown, true);
  document.addEventListener('keydown', onKeyDown);

  return () => {
    unsub();
    document.removeEventListener('pointerdown', unlock);
    document.removeEventListener('keydown', unlock);
    document.removeEventListener('pointerdown', onPointerDown, true);
    document.removeEventListener('keydown', onKeyDown);
    stopAmbient();
  };
}
