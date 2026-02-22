import { BrainwaveType } from "@/lib/syntheticSounds";

const STORAGE_KEY = "ksom-vibes-saved-mixes";

export interface SavedMix {
  id: string;
  name: string;
  createdAt: string;
  mode: string | null;
  sounds: { soundId: string; name: string; url: string; volume: number; iconUrl?: string }[];
  brainwave: { type: BrainwaveType; volume: number } | null;
  timerSec: number | null;
  fadeOutSec: number;
}

export function loadSavedMixes(): SavedMix[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedMix[];
  } catch {
    return [];
  }
}

export function saveMix(mix: SavedMix): SavedMix[] {
  const all = loadSavedMixes();
  all.unshift(mix);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return all;
}

export function deleteSavedMix(id: string): SavedMix[] {
  const all = loadSavedMixes().filter((m) => m.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return all;
}
