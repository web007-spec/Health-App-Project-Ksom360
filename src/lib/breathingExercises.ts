// Breathing exercise definitions for Restore hub

export interface BreathPhase {
  label: string;
  seconds: number;
  type: "inhale" | "hold" | "exhale";
}

export type BreathingAnimation = "ocean" | "lotus" | "orbital" | "aurora" | "heartbeat";

/** Per-protocol environmental tone tuning */
export interface ProtocolTone {
  hueBase: number;      // primary hue (HSL)
  hueSat: number;       // saturation %
  warmth: number;       // 0 = cool, 1 = warm bias
  luminanceSpeed: number; // 0.8–1.2 multiplier for luminance shift speed
}

export interface BreathingExercise {
  id: string;
  name: string;
  description: string;
  phases: BreathPhase[];
  animation: BreathingAnimation;
  icon: string;
  tone: ProtocolTone;
}

// Tone presets
const TONE_COOL: ProtocolTone = { hueBase: 200, hueSat: 45, warmth: 0.2, luminanceSpeed: 1.0 };
const TONE_DEEP_BLUE: ProtocolTone = { hueBase: 215, hueSat: 50, warmth: 0.15, luminanceSpeed: 0.95 };
const TONE_DARK_SLOW: ProtocolTone = { hueBase: 220, hueSat: 35, warmth: 0.1, luminanceSpeed: 0.8 };
const TONE_NEUTRAL: ProtocolTone = { hueBase: 205, hueSat: 40, warmth: 0.25, luminanceSpeed: 1.0 };
const TONE_TEAL: ProtocolTone = { hueBase: 185, hueSat: 42, warmth: 0.3, luminanceSpeed: 1.05 };

export const BREATHING_EXERCISES: BreathingExercise[] = [
  {
    id: "ocean-wave",
    name: "Ocean Downshift",
    description: "Deep rhythmic breathing for nervous system regulation.",
    phases: [
      { label: "Inhale", seconds: 4, type: "inhale" },
      { label: "Hold", seconds: 2, type: "hold" },
      { label: "Exhale", seconds: 6, type: "exhale" },
    ],
    animation: "ocean",
    icon: "🌊",
    tone: TONE_DEEP_BLUE,
  },
  {
    id: "lotus-bloom",
    name: "Center",
    description: "Balanced breath cycle for baseline regulation.",
    phases: [
      { label: "Inhale", seconds: 5, type: "inhale" },
      { label: "Hold", seconds: 2, type: "hold" },
      { label: "Exhale", seconds: 5, type: "exhale" },
    ],
    animation: "lotus",
    icon: "🪷",
    tone: TONE_NEUTRAL,
  },
  {
    id: "orbital",
    name: "Sustained Hold",
    description: "Extended hold pattern for CO₂ tolerance training.",
    phases: [
      { label: "Inhale", seconds: 4, type: "inhale" },
      { label: "Hold", seconds: 6, type: "hold" },
      { label: "Exhale", seconds: 4, type: "exhale" },
    ],
    animation: "orbital",
    icon: "🔮",
    tone: TONE_TEAL,
  },
  {
    id: "aurora-flow",
    name: "Aurora Reset",
    description: "Extended cycle for deep parasympathetic activation.",
    phases: [
      { label: "Inhale", seconds: 6, type: "inhale" },
      { label: "Hold", seconds: 2, type: "hold" },
      { label: "Exhale", seconds: 6, type: "exhale" },
    ],
    animation: "aurora",
    icon: "🌌",
    tone: TONE_COOL,
  },
  {
    id: "heartbeat",
    name: "Cardiac Sync",
    description: "Equal-phase breathing for heart rate variability.",
    phases: [
      { label: "Inhale", seconds: 5, type: "inhale" },
      { label: "Hold", seconds: 5, type: "hold" },
      { label: "Exhale", seconds: 5, type: "exhale" },
    ],
    animation: "heartbeat",
    icon: "💜",
    tone: TONE_NEUTRAL,
  },
  {
    id: "box-breathing",
    name: "Box Breathing",
    description: "Navy SEAL technique. Equal counts for inhale, hold, exhale, hold.",
    phases: [
      { label: "Inhale", seconds: 4, type: "inhale" },
      { label: "Hold", seconds: 4, type: "hold" },
      { label: "Exhale", seconds: 4, type: "exhale" },
      { label: "Hold", seconds: 4, type: "hold" },
    ],
    animation: "orbital",
    icon: "🧘",
    tone: TONE_NEUTRAL,
  },
  {
    id: "478-relaxation",
    name: "4-7-8 Protocol",
    description: "Clinical technique for sleep onset and anxiety reduction.",
    phases: [
      { label: "Inhale", seconds: 4, type: "inhale" },
      { label: "Hold", seconds: 7, type: "hold" },
      { label: "Exhale", seconds: 8, type: "exhale" },
    ],
    animation: "aurora",
    icon: "😮‍💨",
    tone: TONE_DARK_SLOW,
  },
  {
    id: "calming-breath",
    name: "Sleep Descent",
    description: "Extended exhales to activate rest-and-digest response.",
    phases: [
      { label: "Inhale", seconds: 4, type: "inhale" },
      { label: "Exhale", seconds: 6, type: "exhale" },
    ],
    animation: "lotus",
    icon: "🍃",
    tone: TONE_DARK_SLOW,
  },
];
