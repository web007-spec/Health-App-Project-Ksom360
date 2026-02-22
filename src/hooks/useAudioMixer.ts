import { useState, useCallback, useRef, useEffect } from "react";
import {
  MixItem,
  prepareItem,
  startItem,
  stopItem,
  setItemVolume,
  playMix,
  pauseMix,
  removeFromMix,
  clearMix,
  getAudioContext,
} from "@/lib/vibesMixer";

const STORAGE_KEY = "ksom-vibes-last-mix";

interface StoredMixItem {
  soundId: string;
  name: string;
  url: string;
  volume: number;
  iconUrl?: string;
}

export function useAudioMixer() {
  const [mixItems, setMixItems] = useState<MixItem[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timerRemaining, setTimerRemaining] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeOutRef = useRef(false);
  const originalVolumesRef = useRef<Record<string, number>>({});

  // Persist to localStorage on mix change
  useEffect(() => {
    const stored: StoredMixItem[] = mixItems.map(({ soundId, name, url, volume, iconUrl }) => ({
      soundId, name, url, volume, iconUrl,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  }, [mixItems]);

  const addSound = useCallback(
    async (sound: { id: string; name: string; audioUrl: string; iconUrl?: string }) => {
      // Ensure AudioContext is resumed (iOS needs user gesture)
      getAudioContext();

      // Don't add duplicates
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
          // Also restart any paused items
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
    // Restore volumes if fading
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

  const clearAll = useCallback(() => {
    setMixItems((prev) => clearMix(prev));
    setIsPlaying(false);
    cancelTimer();
  }, [cancelTimer]);

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

  const loadMix = useCallback(async (items: StoredMixItem[]) => {
    // Clear existing
    setMixItems((prev) => clearMix(prev));
    setIsPlaying(false);

    // Prepare all items (don't autoplay on restore)
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
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const items: StoredMixItem[] = JSON.parse(stored);
        if (items.length > 0) loadMix(items);
      }
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
