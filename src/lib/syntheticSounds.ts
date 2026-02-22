// Synthetic ambient sound generator using Web Audio API
// Used as fallback when audio URLs fail to load

/** Generate a buffer of white noise */
export function generateWhiteNoise(ctx: AudioContext, durationSec = 10): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * durationSec;
  const buffer = ctx.createBuffer(2, length, sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }
  return buffer;
}

/** Generate pink noise (1/f) */
export function generatePinkNoise(ctx: AudioContext, durationSec = 10): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * durationSec;
  const buffer = ctx.createBuffer(2, length, sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  }
  return buffer;
}

/** Generate rain-like sound (filtered noise with modulation) */
export function generateRain(ctx: AudioContext, durationSec = 10): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * durationSec;
  const buffer = ctx.createBuffer(2, length, sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let prev = 0;
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const mod = 0.5 + 0.3 * Math.sin(t * 0.3) + 0.2 * Math.sin(t * 0.7);
      const white = Math.random() * 2 - 1;
      // Simple low-pass filter
      const filtered = prev * 0.85 + white * 0.15;
      prev = filtered;
      data[i] = filtered * mod * 0.6;
    }
  }
  return buffer;
}

/** Generate ocean wave sound (modulated noise) */
export function generateOcean(ctx: AudioContext, durationSec = 10): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * durationSec;
  const buffer = ctx.createBuffer(2, length, sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let prev = 0;
    const phaseOffset = ch * 1.5; // stereo offset
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      // Slow wave-like envelope
      const wave = Math.pow(Math.sin((t + phaseOffset) * 0.15 * Math.PI) * 0.5 + 0.5, 2);
      const white = Math.random() * 2 - 1;
      const filtered = prev * 0.92 + white * 0.08;
      prev = filtered;
      data[i] = filtered * wave * 0.5;
    }
  }
  return buffer;
}

/** Generate campfire crackling */
export function generateCampfire(ctx: AudioContext, durationSec = 10): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * durationSec;
  const buffer = ctx.createBuffer(2, length, sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let prev = 0;
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      // Base crackle
      const white = Math.random() * 2 - 1;
      const crackle = Math.random() < 0.003 ? (Math.random() * 2 - 1) * 0.8 : 0;
      const filtered = prev * 0.7 + white * 0.05 + crackle;
      prev = filtered * 0.95;
      // Low rumble
      const rumble = Math.sin(t * 20) * 0.02 + Math.sin(t * 35) * 0.01;
      data[i] = (filtered + rumble) * 0.4;
    }
  }
  return buffer;
}

/** Generate forest ambience (layered filtered noise + bird-like chirps) */
export function generateForest(ctx: AudioContext, durationSec = 10): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * durationSec;
  const buffer = ctx.createBuffer(2, length, sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let prev = 0;
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const white = Math.random() * 2 - 1;
      // Wind-like base
      const wind = prev * 0.93 + white * 0.07;
      prev = wind;
      const windMod = 0.3 + 0.2 * Math.sin(t * 0.2) + 0.1 * Math.sin(t * 0.5);
      // Occasional chirp
      const chirp = Math.sin(t * 2400 + Math.sin(t * 8) * 500) * 
        (Math.random() < 0.0005 ? 0.15 : 0) * Math.exp(-((t % 1) * 10));
      data[i] = wind * windMod * 0.3 + chirp;
    }
  }
  return buffer;
}

/** Generate gentle piano-like tones */
export function generateGentleTone(ctx: AudioContext, durationSec = 10): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * durationSec;
  const buffer = ctx.createBuffer(2, length, sampleRate);
  const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      let sample = 0;
      notes.forEach((freq, idx) => {
        const env = 0.5 + 0.5 * Math.sin(t * (0.1 + idx * 0.05));
        sample += Math.sin(t * freq * 2 * Math.PI) * env * 0.08;
      });
      data[i] = sample;
    }
  }
  return buffer;
}

/** Generate lo-fi beat-like pattern */
export function generateLofi(ctx: AudioContext, durationSec = 10): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * durationSec;
  const buffer = ctx.createBuffer(2, length, sampleRate);
  const bpm = 75;
  const beatLength = 60 / bpm;
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let prev = 0;
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const beatPos = (t % beatLength) / beatLength;
      // Kick-like
      const kick = beatPos < 0.05 ? Math.sin(t * 120 * (1 - beatPos * 10)) * (1 - beatPos * 20) * 0.3 : 0;
      // Hi-hat noise
      const hihat = beatPos > 0.5 && beatPos < 0.53 ? (Math.random() * 2 - 1) * 0.1 : 0;
      // Warm pad
      const pad = Math.sin(t * 220 * Math.PI) * 0.02 + Math.sin(t * 330 * Math.PI) * 0.015;
      const filtered = prev * 0.8 + (kick + hihat + pad) * 0.2;
      prev = filtered;
      data[i] = filtered;
    }
  }
  return buffer;
}

/** Generate binaural beat — two slightly offset sine waves for stereo effect */
export function generateBinauralBeat(
  ctx: AudioContext,
  baseFreq: number,
  beatFreq: number,
  durationSec = 10
): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * durationSec;
  const buffer = ctx.createBuffer(2, length, sampleRate);
  const freqL = baseFreq;
  const freqR = baseFreq + beatFreq;
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    const freq = ch === 0 ? freqL : freqR;
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      // Gentle amplitude modulation for warmth
      const env = 0.85 + 0.15 * Math.sin(t * 0.3);
      data[i] = Math.sin(t * freq * 2 * Math.PI) * 0.25 * env;
    }
  }
  return buffer;
}

export type BrainwaveType = "alpha" | "beta" | "theta" | "delta";

export const BRAINWAVE_DEFS: Record<BrainwaveType, { label: string; baseFreq: number; beatFreq: number; icon: string; description: string }> = {
  alpha: { label: "Alpha", baseFreq: 200, beatFreq: 10, icon: "🧘", description: "Focus & Calm" },
  beta:  { label: "Beta",  baseFreq: 200, beatFreq: 20, icon: "⚡", description: "Productivity" },
  theta: { label: "Theta", baseFreq: 200, beatFreq: 6,  icon: "🎨", description: "Creativity" },
  delta: { label: "Delta", baseFreq: 200, beatFreq: 2,  icon: "😴", description: "Deep Sleep" },
};

/** Get a binaural beat buffer for a brainwave type */
export function getBrainwaveBuffer(ctx: AudioContext, type: BrainwaveType): AudioBuffer {
  const def = BRAINWAVE_DEFS[type];
  return generateBinauralBeat(ctx, def.baseFreq, def.beatFreq, 10);
}

const GENERATORS: Record<string, (ctx: AudioContext, dur?: number) => AudioBuffer> = {
  rain: generateRain,
  "ocean waves": generateOcean,
  forest: generateForest,
  campfire: generateCampfire,
  "white noise": generateWhiteNoise,
  "pink noise": generatePinkNoise,
  "gentle piano": generateGentleTone,
  "lo-fi beat": generateLofi,
};

/** Get a synthetic fallback buffer by sound name */
export function getSyntheticBuffer(ctx: AudioContext, name: string): AudioBuffer | null {
  const key = name.toLowerCase();
  const gen = GENERATORS[key];
  if (gen) return gen(ctx, 10);
  return generateWhiteNoise(ctx, 10);
}
