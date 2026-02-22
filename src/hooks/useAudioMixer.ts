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

const STORAGE_KEY = "ksom-vibes-state";

interface PersistedState {
  items: { soundId: string; name: string; url: string; volume: number; iconUrl?: string }[];
  mode: string | null;
  timerMinutes: number | null;
  timerFadeOut: boolean;
  mixName: string | null;
}

export function useAudioMixer() {
  const [mixItems, setMixItems] = useState<MixItem[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timerRemaining, setTimerRemaining] = useState<number | null>(null);
  const [activeMode, setActiveMode] = useState<string | null>(null);
  const [mixName, setMixName] = useState<string | null>(null);
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
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [mixItems, activeMode, timerRemaining, mixName]);

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
    cancelTimer();
  }, [mixItems, cancelTimer]);

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
    } catch {}
  }, [loadMix]);

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
  };
}
