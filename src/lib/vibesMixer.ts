// Web Audio API mixer engine — pure AudioContext + GainNodes
// Falls back to synthetic audio when URLs fail to load

import { getSyntheticBuffer } from "./syntheticSounds";

let audioCtx: AudioContext | null = null;

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const FADE_DURATION = 0.15; // 150ms crossfade

/** Proxy external URLs through edge function for CORS */
function getProxiedUrl(url: string): string {
  if (url.startsWith("/") || url.startsWith(SUPABASE_URL)) return url;
  return `${SUPABASE_URL}/functions/v1/audio-proxy?url=${encodeURIComponent(url)}`;
}

export interface MixItem {
  soundId: string;
  name: string;
  url: string;
  volume: number;
  iconUrl?: string;
  source?: AudioBufferSourceNode;
  gain?: GainNode;
  buffer?: AudioBuffer;
}

/** Lazily create / resume the shared AudioContext */
export function getAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

/** Fetch + decode audio, fallback to synthetic generation */
export async function prepareItem(item: MixItem): Promise<MixItem> {
  const ctx = getAudioContext();
  
  try {
    const fetchUrl = getProxiedUrl(item.url);
    const res = await fetch(fetchUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const arrayBuf = await res.arrayBuffer();
    const audioBuf = await ctx.decodeAudioData(arrayBuf);
    return { ...item, buffer: audioBuf };
  } catch (err) {
    console.log(`[vibesMixer] URL load failed for "${item.name}", using synthetic audio`);
    const synth = getSyntheticBuffer(ctx, item.name);
    if (synth) return { ...item, buffer: synth };
    throw err;
  }
}

/** Wire BufferSource → GainNode → destination, start looping */
export function startItem(item: MixItem): MixItem {
  const ctx = getAudioContext();
  stopItemImmediate(item);
  if (!item.buffer) return item;

  const source = ctx.createBufferSource();
  source.buffer = item.buffer;
  source.loop = true;

  const gain = ctx.createGain();
  gain.gain.value = item.volume;

  source.connect(gain);
  gain.connect(ctx.destination);
  source.start(0);

  return { ...item, source, gain };
}

/** Stop immediately — no fade (used internally) */
function stopItemImmediate(item: MixItem): void {
  try { item.source?.stop(); } catch {}
  try { item.source?.disconnect(); } catch {}
  try { item.gain?.disconnect(); } catch {}
  item.source = undefined;
  item.gain = undefined;
}

/** Stop a single item with 150ms crossfade out */
export function stopItem(item: MixItem): void {
  if (!item.gain || !item.source) {
    stopItemImmediate(item);
    return;
  }
  const ctx = getAudioContext();
  const gain = item.gain;
  const source = item.source;
  
  // Fade out over FADE_DURATION
  gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + FADE_DURATION);
  
  // Schedule cleanup after fade
  setTimeout(() => {
    try { source.stop(); } catch {}
    try { source.disconnect(); } catch {}
    try { gain.disconnect(); } catch {}
  }, FADE_DURATION * 1000 + 20);
  
  // Clear refs immediately so we don't double-stop
  item.source = undefined;
  item.gain = undefined;
}

/** Set volume via GainNode directly — no React re-render needed */
export function setItemVolume(item: MixItem, volume: number): void {
  if (item.gain) {
    item.gain.gain.value = volume;
  }
  item.volume = volume;
}

/** Play all items */
export function playMix(items: MixItem[]): MixItem[] {
  getAudioContext();
  return items.map((item) => {
    if (!item.source && item.buffer) {
      return startItem(item);
    }
    return item;
  });
}

/** Pause all — stops sources (immediate), keeps buffers for restart */
export function pauseMix(items: MixItem[]): MixItem[] {
  return items.map((item) => {
    stopItemImmediate(item);
    return { ...item, source: undefined, gain: undefined };
  });
}

/** Remove one item with crossfade */
export function removeFromMix(items: MixItem[], soundId: string): MixItem[] {
  const target = items.find((x) => x.soundId === soundId);
  if (target) stopItem(target); // crossfade out
  return items.filter((x) => x.soundId !== soundId);
}

/** Smooth fade out all sounds, then clear */
export function fadeOutAndClearMix(items: MixItem[]): Promise<void> {
  const ctx = getAudioContext();
  items.forEach((item) => {
    if (item.gain && item.source) {
      item.gain.gain.setValueAtTime(item.gain.gain.value, ctx.currentTime);
      item.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
    }
  });
  return new Promise((resolve) => {
    setTimeout(() => {
      items.forEach((item) => {
        try { item.source?.stop(); } catch {}
        try { item.source?.disconnect(); } catch {}
        try { item.gain?.disconnect(); } catch {}
      });
      resolve();
    }, 550);
  });
}

/** Stop + clear everything (immediate) */
export function clearMix(items: MixItem[]): MixItem[] {
  items.forEach(stopItemImmediate);
  return [];
}
