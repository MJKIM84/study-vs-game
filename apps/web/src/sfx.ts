type SfxKind = "tap" | "correct" | "wrong" | "count" | "win" | "lose";

let ctx: AudioContext | null = null;

function ac() {
  const AnyWindow = window as unknown as { webkitAudioContext?: typeof AudioContext };
  if (!ctx) ctx = new (window.AudioContext || AnyWindow.webkitAudioContext!)();
  return ctx;
}

function now() {
  return ac().currentTime;
}

function oscTone(type: OscillatorType, f0: number, f1: number, dur = 0.16, vol = 0.22) {
  const c = ac();
  const o = c.createOscillator();
  const g = c.createGain();
  const t0 = now();

  o.type = type;
  o.frequency.setValueAtTime(f0, t0);
  o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);

  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noiseBurst(dur = 0.08, vol = 0.12) {
  const c = ac();
  const bufferSize = Math.floor(c.sampleRate * dur);
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);

  const src = c.createBufferSource();
  src.buffer = buffer;

  const filter = c.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.setValueAtTime(900, now());

  const g = c.createGain();
  const t0 = now();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  src.connect(filter).connect(g).connect(c.destination);
  src.start(t0);
  src.stop(t0 + dur);
}

export function playSfx(kind: SfxKind, enabled: boolean) {
  if (!enabled) return;
  // must be resumed by user gesture on some browsers
  void ac().resume();

  switch (kind) {
    case "tap":
      oscTone("square", 520, 330, 0.06, 0.12);
      break;
    case "correct":
      oscTone("triangle", 660, 990, 0.12, 0.18);
      oscTone("sine", 990, 1320, 0.12, 0.12);
      break;
    case "wrong":
      oscTone("sawtooth", 220, 140, 0.14, 0.18);
      noiseBurst(0.08, 0.12);
      break;
    case "count":
      oscTone("square", 440, 440, 0.08, 0.14);
      break;
    case "win":
      oscTone("triangle", 523, 784, 0.18, 0.22);
      oscTone("triangle", 784, 1046, 0.18, 0.18);
      break;
    case "lose":
      oscTone("sine", 196, 147, 0.22, 0.16);
      break;
  }
}
