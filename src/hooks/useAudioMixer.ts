import { useState, useCallback, useRef, useEffect } from "react";
import { MixItem, createHowl, playMix, pauseMix, setItemVolume as setMixItemVolume, removeFromMix, clearMix } from "@/lib/vibesMixer";

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

  const addSound = useCallback((sound: { id: string; name: string; audioUrl: string; iconUrl?: string }) => {
    setMixItems((prev) => {
      if (prev.find((x) => x.soundId === sound.id)) return prev;
      const item: MixItem = {
        soundId: sound.id,
        name: sound.name,
        url: sound.audioUrl,
        volume: 0.7,
        iconUrl: sound.iconUrl,
      };
      // Always create howl and play immediately when adding a sound
      item.howl = createHowl(item.url, item.volume);
      item.howl.play();
      // Also start playing any existing items that aren't playing yet
      prev.forEach((existing) => {
        if (!existing.howl) existing.howl = createHowl(existing.url, existing.volume);
        if (!existing.howl.playing()) existing.howl.play();
      });
      return [...prev, item];
    });
    setIsPlaying(true);
  }, []);

  const removeSound = useCallback((soundId: string) => {
    setMixItems((prev) => removeFromMix(prev, soundId));
  }, []);

  const setVolume = useCallback((soundId: string, vol: number) => {
    setMixItems((prev) =>
      prev.map((item) => {
        if (item.soundId === soundId) {
          setMixItemVolume(item, vol);
          return { ...item, volume: vol };
        }
        return item;
      })
    );
  }, []);

  const play = useCallback(() => {
    setMixItems((prev) => {
      playMix(prev);
      return [...prev];
    });
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    setMixItems((prev) => {
      pauseMix(prev);
      return prev;
    });
    setIsPlaying(false);
  }, []);

  const clearAll = useCallback(() => {
    setMixItems((prev) => clearMix(prev));
    setIsPlaying(false);
    cancelTimer();
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
          item.howl?.volume(orig);
          return { ...item, volume: orig };
        }
        return item;
      })
    );
    originalVolumesRef.current = {};
  }, []);

  const startTimer = useCallback((minutes: number, fadeOut: boolean) => {
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
            item.howl?.volume(newVol);
            return { ...item, volume: newVol };
          })
        );
      }

      if (remaining <= 0) {
        // Stop everything
        setMixItems((prev) => {
          pauseMix(prev);
          return prev;
        });
        setIsPlaying(false);
        setTimerRemaining(null);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        fadeOutRef.current = false;
        originalVolumesRef.current = {};
      }
    }, 1000);
  }, [mixItems, cancelTimer]);

  const loadMix = useCallback((items: StoredMixItem[]) => {
    // Clear existing
    setMixItems((prev) => clearMix(prev));
    setIsPlaying(false);
    const newItems: MixItem[] = items.map((s) => ({
      soundId: s.soundId,
      name: s.name,
      url: s.url,
      volume: s.volume,
      iconUrl: s.iconUrl,
    }));
    setMixItems(newItems);
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

  const isSoundActive = useCallback((soundId: string) => {
    return mixItems.some((x) => x.soundId === soundId);
  }, [mixItems]);

  const toggleSound = useCallback((sound: { id: string; name: string; audioUrl: string; iconUrl?: string }) => {
    if (isSoundActive(sound.id)) {
      removeSound(sound.id);
    } else {
      addSound(sound);
    }
  }, [isSoundActive, removeSound, addSound]);

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
