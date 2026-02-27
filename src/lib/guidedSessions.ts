import { BrainwaveType } from "@/lib/syntheticSounds";

export interface GuidedSession {
  id: string;
  name: string;
  subtitle: string;
  mode: "morning" | "focus" | "night";
  durationSec: number;
  fadeOutSec: number;
  sounds: { soundId: string; volume: number }[];
  brainwave: { type: BrainwaveType; volume: number } | null;
  featured: boolean;
}

/**
 * Static guided sessions — single source of truth.
 * Will later be managed via Admin CRUD.
 */
export const GUIDED_SESSIONS: GuidedSession[] = [
  {
    id: "session-morning-boost",
    name: "Morning Boost",
    subtitle: "Energize your start",
    mode: "morning",
    durationSec: 15 * 60,
    fadeOutSec: 30,
    sounds: [
      { soundId: "d5619004-3f3f-4bd5-966f-8c3cd2d17527", volume: 0.5 },  // Forest
      { soundId: "9a4eee15-c559-4b07-9044-e76925679032", volume: 0.35 }, // Gentle Piano
    ],
    brainwave: { type: "beta", volume: 0.4 },
    featured: true,
  },
  {
    id: "session-deep-focus",
    name: "Deep Focus Block",
    subtitle: "Lock in for 25 minutes",
    mode: "focus",
    durationSec: 25 * 60,
    fadeOutSec: 60,
    sounds: [
      { soundId: "73ded4d2-656b-4301-a9ad-d7d2e4185a07", volume: 0.3 },  // Rain
      { soundId: "e8106e6f-c2e5-4631-9762-4aac6b52aa1e", volume: 0.25 }, // Pink Noise
    ],
    brainwave: { type: "alpha", volume: 0.45 },
    featured: true,
  },
  {
    id: "session-wind-down",
    name: "Wind Down",
    subtitle: "Ease into evening calm",
    mode: "night",
    durationSec: 30 * 60,
    fadeOutSec: 90,
    sounds: [
      { soundId: "ba4e9db7-9294-401e-8863-101c7133fbd2", volume: 0.45 }, // Ocean Waves
      { soundId: "9a4eee15-c559-4b07-9044-e76925679032", volume: 0.3 },  // Gentle Piano
    ],
    brainwave: { type: "theta", volume: 0.4 },
    featured: true,
  },
  {
    id: "session-deep-sleep",
    name: "Deep Sleep",
    subtitle: "90-minute sleep cycle",
    mode: "night",
    durationSec: 90 * 60,
    fadeOutSec: 120,
    sounds: [
      { soundId: "ba4e9db7-9294-401e-8863-101c7133fbd2", volume: 0.35 }, // Ocean Waves
      { soundId: "e8106e6f-c2e5-4631-9762-4aac6b52aa1e", volume: 0.2 },  // Pink Noise
    ],
    brainwave: { type: "delta", volume: 0.5 },
    featured: true,
  },
];
