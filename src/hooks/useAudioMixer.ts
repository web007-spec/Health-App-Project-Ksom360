import { useState, useCallback, useRef, useEffect } from "react";
import {
  MixItem,
  prepareItem,
  startItem,
  setItemVolume,
  playMix,
  pauseMix,
  removeFromMix,
  fadeOutAndClearMix,
  clearMix,
  getAudioContext,
} from "@/lib/vibesMixer";
import { BrainwaveType, getBrainwaveBuffer } from "@/lib/syntheticSounds";

const STORAGE_KEY = "ksom-vibes-state";
const CROSSFADE_MS = 200;

interface PersistedState {
  items: { soundId: string; name: string; url: string; volume: number; iconUrl?: string }[];
  mode: string | null;
  timerMinutes: number | null;
  timerFadeOut: boolean;
  mixName: string | null;
  brainwave: { type: BrainwaveType; volume: number } | null;
}

interface BrainwaveState {
  type: BrainwaveType;
  volume: number;
  source?: AudioBufferSourceNode;
  gain?: GainNode;
  buffer?: AudioBuffer;
}

export function useAudioMixer() {
  const [mixItems, setMixItems] = useState<MixItem[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timerRemaining, setTimerRemaining] = useState<number | null>(null);
  const [activeMode, setActiveMode] = useState<string | null>(null);
  const [mixName, setMixName] = useState<string | null>(null);
  const [brainwave, setBrainwaveState] = useState<BrainwaveState | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeOutRef = useRef(false);
  const originalVolumesRef = useRef<Record<string, number>>({});

  // Persist to localStorage on state change
  useEffect(() => {
    const state: PersistedState = {
      items: mixItems.map(({ soundId, name, url, volume, iconUrl }) => ({
        soundId, name, url, volume, iconUrl,
      })),
      mode: activeMode,
      timerMinutes: timerRemaining !== null ? Math.ceil(timerRemaining / 60) : null,
      timerFadeOut: fadeOutRef.current,
      mixName,
      brainwave: brainwave ? { type: brainwave.type, volume: brainwave.volume } : null,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [mixItems, activeMode, timerRemaining, mixName, brainwave]);

  // --- Brainwave helpers ---
  const stopBrainwaveAudio = useCallback((bw: BrainwaveState, fadeMs = 0) => {
    if (!bw.gain || !bw.source) return;
    const ctx = getAudioContext();
    if (fadeMs > 0) {
      const end = ctx.currentTime + fadeMs / 1000;
      bw.gain.gain.setValueAtTime(bw.gain.gain.value, ctx.currentTime);
      bw.gain.gain.linearRampToValueAtTime(0, end);
      try { bw.source.stop(end + 0.01); } catch {}
      setTimeout(() => {
        try { bw.source?.disconnect(); } catch {}
        try { bw.gain?.disconnect(); } catch {}
      }, fadeMs + 50);
    } else {
      try { bw.source.stop(); } catch {}
      try { bw.source.disconnect(); } catch {}
      try { bw.gain.disconnect(); } catch {}
    }
  }, []);

  const startBrainwaveAudio = useCallback((type: BrainwaveType, volume: number): BrainwaveState => {
    const ctx = getAudioContext();
    const buffer = getBrainwaveBuffer(ctx, type);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + CROSSFADE_MS / 1000);
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(0);
    return { type, volume, source, gain, buffer };
  }, []);

  const setBrainwave = useCallback((type: BrainwaveType) => {
    setBrainwaveState((prev) => {
      if (prev?.type === type) return prev; // already active
      if (prev) stopBrainwaveAudio(prev, CROSSFADE_MS);
      const vol = prev?.volume ?? 0.5;
      const next = startBrainwaveAudio(type, vol);
      return next;
    });
  }, [stopBrainwaveAudio, startBrainwaveAudio]);

  const removeBrainwave = useCallback(() => {
    setBrainwaveState((prev) => {
      if (prev) stopBrainwaveAudio(prev, CROSSFADE_MS);
      return null;
    });
  }, [stopBrainwaveAudio]);

  const setBrainwaveVolume = useCallback((vol: number) => {
    setBrainwaveState((prev) => {
      if (!prev) return prev;
      if (prev.gain) {
        const ctx = getAudioContext();
        prev.gain.gain.setValueAtTime(prev.gain.gain.value, ctx.currentTime);
        prev.gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.03);
      }
      return { ...prev, volume: vol };
    });
  }, []);

  // --- Original sound methods (unchanged) ---
  const addSound = useCallback(
    async (sound: { id: string; name: string; audioUrl: string; iconUrl?: string }) => {
      getAudioContext();
      if (mixItems.some((x) => x.soundId === sound.id)) return;

      try {
        const rawItem: MixItem = {
          soundId: sound.id,
          name: sound.name,
          url: sound.audioUrl,
          volume: 0.7,
          iconUrl: sound.iconUrl,
        };

        const prepared = await prepareItem(rawItem);
        const started = startItem(prepared);

        setMixItems((prev) => {
          const restarted = prev.map((existing) => {
            if (!existing.source && existing.buffer) {
              return startItem(existing);
            }
            return existing;
          });
          return [...restarted, started];
        });
        setIsPlaying(true);
      } catch (err) {
        console.error("Failed to load sound:", err);
      }
    },
    [mixItems]
  );

  const removeSound = useCallback((soundId: string) => {
    setMixItems((prev) => removeFromMix(prev, soundId));
  }, []);

  // Volume updates GainNode directly — no component re-render needed for audio
  const setVolume = useCallback((soundId: string, vol: number) => {
    setMixItems((prev) =>
      prev.map((item) => {
        if (item.soundId === soundId) {
          setItemVolume(item, vol);
          return { ...item, volume: vol };
        }
        return item;
      })
    );
  }, []);

  const play = useCallback(() => {
    setMixItems((prev) => playMix(prev));
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    setMixItems((prev) => pauseMix(prev));
    setIsPlaying(false);
  }, []);

  const cancelTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTimerRemaining(null);
    fadeOutRef.current = false;
    setMixItems((prev) =>
      prev.map((item) => {
        const orig = originalVolumesRef.current[item.soundId];
        if (orig !== undefined) {
          setItemVolume(item, orig);
          return { ...item, volume: orig };
        }
        return item;
      })
    );
    originalVolumesRef.current = {};
  }, []);

  // Smooth fade out all then clear
  const clearAll = useCallback(async () => {
    const items = [...mixItems];
    if (items.some((i) => i.source)) {
      await fadeOutAndClearMix(items);
    }
    setMixItems([]);
    setIsPlaying(false);
    setMixName(null);
    removeBrainwave();
    cancelTimer();
  }, [mixItems, cancelTimer, removeBrainwave]);

  const startTimer = useCallback(
    (minutes: number, fadeOut: boolean) => {
      cancelTimer();
      fadeOutRef.current = fadeOut;
      if (fadeOut) {
        originalVolumesRef.current = {};
        mixItems.forEach((item) => {
          originalVolumesRef.current[item.soundId] = item.volume;
        });
      }
      let remaining = minutes * 60;
      setTimerRemaining(remaining);

      timerRef.current = setInterval(() => {
        remaining -= 1;
        setTimerRemaining(remaining);

        if (fadeOutRef.current && remaining <= 60 && remaining > 0) {
          const fraction = remaining / 60;
          setMixItems((prev) =>
            prev.map((item) => {
              const orig = originalVolumesRef.current[item.soundId] ?? item.volume;
              const newVol = orig * fraction;
              setItemVolume(item, newVol);
              return { ...item, volume: newVol };
            })
          );
        }

        if (remaining <= 0) {
          setMixItems((prev) => pauseMix(prev));
          setIsPlaying(false);
          setTimerRemaining(null);
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          fadeOutRef.current = false;
          originalVolumesRef.current = {};
        }
      }, 1000);
    },
    [mixItems, cancelTimer]
  );

  const loadMix = useCallback(async (items: PersistedState["items"], name?: string) => {
    setMixItems((prev) => clearMix(prev));
    setIsPlaying(false);
    if (name) setMixName(name);

    const loaded: MixItem[] = [];
    for (const s of items) {
      try {
        const rawItem: MixItem = {
          soundId: s.soundId,
          name: s.name,
          url: s.url,
          volume: s.volume,
          iconUrl: s.iconUrl,
        };
        const prepared = await prepareItem(rawItem);
        loaded.push(prepared);
      } catch {
        loaded.push({
          soundId: s.soundId,
          name: s.name,
          url: s.url,
          volume: s.volume,
          iconUrl: s.iconUrl,
        });
      }
    }
    setMixItems(loaded);
  }, []);

  const restoreFromStorage = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const state: PersistedState = JSON.parse(raw);
      if (state.items?.length > 0) {
        loadMix(state.items, state.mixName ?? undefined);
      }
      if (state.mode) setActiveMode(state.mode);
      if (state.brainwave) {
        const bw = startBrainwaveAudio(state.brainwave.type, state.brainwave.volume);
        setBrainwaveState(bw);
      }
    } catch {}
  }, [loadMix, startBrainwaveAudio]);

  const isSoundActive = useCallback(
    (soundId: string) => mixItems.some((x) => x.soundId === soundId),
    [mixItems]
  );

  const toggleSound = useCallback(
    (sound: { id: string; name: string; audioUrl: string; iconUrl?: string }) => {
      if (isSoundActive(sound.id)) {
        removeSound(sound.id);
      } else {
        addSound(sound);
      }
    },
    [isSoundActive, removeSound, addSound]
  );

  return {
    mixItems,
    isPlaying,
    mixName,
    setMixName,
    activeMode,
    setActiveMode,
    addSound,
    removeSound,
    setVolume,
    play,
    pause,
    clearAll,
    timerRemaining,
    startTimer,
    cancelTimer,
    loadMix,
    restoreFromStorage,
    isSoundActive,
    toggleSound,
    // Brainwave
    brainwave: brainwave ? { type: brainwave.type, volume: brainwave.volume } : null,
    setBrainwave,
    removeBrainwave,
    setBrainwaveVolume,
  };
}
