// Breathing exercise definitions for Restore hub

export interface BreathPhase {
  label: string;
  seconds: number;
  type: "inhale" | "hold" | "exhale";
}

export type BreathingAnimation = "ocean" | "lotus" | "orbital" | "aurora" | "heartbeat";

export type RestoreMode = "activate" | "regulate" | "downshift";

export type MotionType =
  | "diagonal-sweep"    // Aurora — diagonal light sweeps
  | "horizon-drift"     // Ocean/Downshift — horizontal horizon movement
  | "radial-gravity"    // Orbital — radial gravity field
  | "radial-pulse"      // Heartbeat — soft radial pulse
  | "ascent-arc"        // Morning Activation — bright ascent
  | "balanced-breath"   // Center — balanced symmetric
  | "deep-descent";     // Sleep — slow deep darkening

/** Per-protocol environmental tone tuning */
export interface ProtocolTone {
  hueBase: number;
  hueSat: number;
  warmth: number;
  luminanceSpeed: number;
}

/** Per-protocol motion & visual identity */
export interface MotionProfile {
  motionType: MotionType;
  /** Luminance shift amplitude (0–1 scale, e.g. 0.15 = 15%) */
  luminanceAmplitude: number;
  /** Particle density multiplier */
  particleDensity: number;
  /** Particle speed multiplier */
  particleSpeedMul: number;
  /** Particle drift amplitude multiplier */
  particleDriftMul: number;
  /** Light sweep angle in degrees (for diagonal-sweep) */
  sweepAngle: number;
  /** Secondary hue offset for gradient variety */
  hueSpread: number;
  /** Intensity arc category */
  arcMode: RestoreMode;
}

export interface BreathingExercise {
  id: string;
  name: string;
  description: string;
  phases: BreathPhase[];
  animation: BreathingAnimation;
  icon: string;
  tone: ProtocolTone;
  motion: MotionProfile;
}

// Tone presets
const TONE_COOL: ProtocolTone = { hueBase: 200, hueSat: 45, warmth: 0.2, luminanceSpeed: 1.0 };
const TONE_DEEP_BLUE: ProtocolTone = { hueBase: 215, hueSat: 50, warmth: 0.15, luminanceSpeed: 0.95 };
const TONE_DARK_SLOW: ProtocolTone = { hueBase: 220, hueSat: 35, warmth: 0.1, luminanceSpeed: 0.8 };
const TONE_NEUTRAL: ProtocolTone = { hueBase: 205, hueSat: 40, warmth: 0.25, luminanceSpeed: 1.0 };
const TONE_TEAL: ProtocolTone = { hueBase: 185, hueSat: 42, warmth: 0.3, luminanceSpeed: 1.05 };
const TONE_WARM_RISE: ProtocolTone = { hueBase: 35, hueSat: 55, warmth: 0.8, luminanceSpeed: 1.15 };

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
    motion: {
      motionType: "horizon-drift",
      luminanceAmplitude: 0.04,
      particleDensity: 1.2,
      particleSpeedMul: 0.7,
      particleDriftMul: 1.8,
      sweepAngle: 0,
      hueSpread: 30,
      arcMode: "downshift",
    },
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
    motion: {
      motionType: "balanced-breath",
      luminanceAmplitude: 0.07,
      particleDensity: 1.0,
      particleSpeedMul: 1.0,
      particleDriftMul: 1.0,
      sweepAngle: 0,
      hueSpread: 20,
      arcMode: "regulate",
    },
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
    motion: {
      motionType: "radial-gravity",
      luminanceAmplitude: 0.08,
      particleDensity: 1.4,
      particleSpeedMul: 0.5,
      particleDriftMul: 2.5,
      sweepAngle: 0,
      hueSpread: 40,
      arcMode: "regulate",
    },
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
    motion: {
      motionType: "diagonal-sweep",
      luminanceAmplitude: 0.06,
      particleDensity: 1.3,
      particleSpeedMul: 0.8,
      particleDriftMul: 2.0,
      sweepAngle: 35,
      hueSpread: 50,
      arcMode: "downshift",
    },
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
    motion: {
      motionType: "radial-pulse",
      luminanceAmplitude: 0.07,
      particleDensity: 0.8,
      particleSpeedMul: 0.6,
      particleDriftMul: 0.8,
      sweepAngle: 0,
      hueSpread: 15,
      arcMode: "regulate",
    },
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
    motion: {
      motionType: "radial-gravity",
      luminanceAmplitude: 0.07,
      particleDensity: 1.0,
      particleSpeedMul: 0.8,
      particleDriftMul: 1.2,
      sweepAngle: 0,
      hueSpread: 25,
      arcMode: "regulate",
    },
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
    motion: {
      motionType: "deep-descent",
      luminanceAmplitude: 0.035,
      particleDensity: 0.7,
      particleSpeedMul: 0.4,
      particleDriftMul: 1.5,
      sweepAngle: 15,
      hueSpread: 20,
      arcMode: "downshift",
    },
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
    motion: {
      motionType: "deep-descent",
      luminanceAmplitude: 0.03,
      particleDensity: 0.6,
      particleSpeedMul: 0.35,
      particleDriftMul: 1.0,
      sweepAngle: 10,
      hueSpread: 15,
      arcMode: "downshift",
    },
  },
];

/** Duration presets in seconds */
export const DURATION_PRESETS = [30, 60, 120, 180, 300, 600] as const;

/** Default durations per restore mode (seconds) */
export const MODE_DEFAULT_DURATIONS: Record<RestoreMode, number> = {
  activate: 60,
  regulate: 180,
  downshift: 300,
};

/** Map exercise to its recommended restore mode */
export function getExerciseMode(ex: BreathingExercise): RestoreMode {
  return ex.motion.arcMode;
}
