/**
 * Winner sound effects, synthesised with Web Audio — no audio files to host,
 * load, or license. Everything is created on the teacher's click/keypress,
 * which satisfies browser autoplay policies.
 */

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function noiseBuffer(audio: AudioContext, seconds: number): AudioBuffer {
  const buffer = audio.createBuffer(1, Math.max(1, Math.floor(audio.sampleRate * seconds)), audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

/** Confetti cannon pops in the first half-second. */
function confettiPops(audio: AudioContext, start: number) {
  for (let i = 0; i < 9; i++) {
    const t = start + Math.random() * 0.45;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(520 + Math.random() * 260, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.09);
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(gain).connect(audio.destination);
    osc.start(t);
    osc.stop(t + 0.11);
  }
}

/** Short triumphant brass-ish fanfare. */
function fanfare(audio: AudioContext, start: number) {
  const notes: [number, number, number][] = [
    // [frequency, offset, duration]
    [523.25, 0.05, 0.16], // C5
    [659.25, 0.2, 0.16], // E5
    [783.99, 0.35, 0.16], // G5
    [1046.5, 0.5, 0.55], // C6
    [783.99, 0.5, 0.55], // harmony G5
    [659.25, 0.5, 0.55], // harmony E5
  ];
  for (const [freq, offset, duration] of notes) {
    const t = start + offset;
    const osc = audio.createOscillator();
    const filter = audio.createBiquadFilter();
    const gain = audio.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = freq;
    filter.type = "lowpass";
    filter.frequency.value = 2400;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.07, t + 0.03);
    gain.gain.setValueAtTime(0.07, t + duration - 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(filter).connect(gain).connect(audio.destination);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }
}

/** Crowd applause: dozens of tiny filtered noise "claps" that taper off. */
function applause(audio: AudioContext, start: number) {
  const buffer = noiseBuffer(audio, 0.08);
  const totalClaps = 110;
  for (let i = 0; i < totalClaps; i++) {
    const progress = i / totalClaps;
    const t = start + 0.35 + Math.pow(Math.random(), 0.8) * 2.8;
    const source = audio.createBufferSource();
    source.buffer = buffer;
    const bandpass = audio.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.value = 900 + Math.random() * 1100;
    bandpass.Q.value = 1.1;
    const gain = audio.createGain();
    const peak = 0.05 + Math.random() * 0.1 * (1 - progress * 0.55);
    gain.gain.setValueAtTime(peak, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.055 + Math.random() * 0.03);
    const node: AudioNode = source.connect(bandpass).connect(gain);
    try {
      const panner = audio.createStereoPanner();
      panner.pan.value = Math.random() * 1.4 - 0.7;
      node.connect(panner).connect(audio.destination);
    } catch {
      node.connect(audio.destination);
    }
    source.start(t, Math.random() * 0.03);
    source.stop(t + 0.1);
  }
}

/** Call from the exact click/keypress that reveals the winner. */
export function playWinnerCelebration() {
  const audio = getContext();
  if (!audio) return;
  const start = audio.currentTime + 0.02;
  confettiPops(audio, start);
  fanfare(audio, start);
  applause(audio, start);
}

/** Soft rising tick-roll while "AND THE WINNER IS…" is on screen. */
export function playSuspenseRoll() {
  const audio = getContext();
  if (!audio) return;
  const start = audio.currentTime + 0.02;
  const buffer = noiseBuffer(audio, 0.05);
  for (let i = 0; i < 26; i++) {
    const t = start + i * 0.075;
    const source = audio.createBufferSource();
    source.buffer = buffer;
    const filter = audio.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 2500;
    const gain = audio.createGain();
    gain.gain.setValueAtTime(0.012 + (i / 26) * 0.03, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    source.connect(filter).connect(gain).connect(audio.destination);
    source.start(t, Math.random() * 0.02);
    source.stop(t + 0.05);
  }
}
