// Breathing exercise definitions for Restore hub

export interface BreathPhase {
  label: string;
  seconds: number;
  type: "inhale" | "hold" | "exhale";
}

export interface BreathingExercise {
  id: string;
  name: string;
  description: string;
  phases: BreathPhase[];
  animation: "ocean" | "lotus" | "orbital" | "aurora" | "heartbeat";
  icon: string;
}

export const BREATHING_EXERCISES: BreathingExercise[] = [
  {
    id: "ocean-wave",
    name: "Ocean Wave Breath",
    description: "A luminous wave syncs with your breath. Calm and expansive.",
    phases: [
      { label: "Breathe In", seconds: 4, type: "inhale" },
      { label: "Hold", seconds: 2, type: "hold" },
      { label: "Breathe Out", seconds: 6, type: "exhale" },
    ],
    animation: "ocean",
    icon: "🌊",
  },
  {
    id: "lotus-bloom",
    name: "Lotus Bloom Breath",
    description: "A glowing lotus blooms with each inhale and softly closes on exhale.",
    phases: [
      { label: "Breathe In", seconds: 5, type: "inhale" },
      { label: "Hold", seconds: 2, type: "hold" },
      { label: "Breathe Out", seconds: 5, type: "exhale" },
    ],
    animation: "lotus",
    icon: "🪷",
  },
  {
    id: "orbital",
    name: "Orbital Breath",
    description: "A pulsing orb expands and contracts with hypnotic ring trails.",
    phases: [
      { label: "Breathe In", seconds: 4, type: "inhale" },
      { label: "Hold", seconds: 6, type: "hold" },
      { label: "Breathe Out", seconds: 4, type: "exhale" },
    ],
    animation: "orbital",
    icon: "🔮",
  },
  {
    id: "aurora-flow",
    name: "Aurora Flow Breath",
    description: "Northern-light ribbons flow with your breath. Deep and meditative.",
    phases: [
      { label: "Breathe In", seconds: 6, type: "inhale" },
      { label: "Hold", seconds: 2, type: "hold" },
      { label: "Breathe Out", seconds: 6, type: "exhale" },
    ],
    animation: "aurora",
    icon: "🌌",
  },
  {
    id: "heartbeat",
    name: "Heartbeat Breath",
    description: "A glowing heart pulses in sync. Rhythmic and calming.",
    phases: [
      { label: "Breathe In", seconds: 5, type: "inhale" },
      { label: "Hold", seconds: 5, type: "hold" },
      { label: "Breathe Out", seconds: 5, type: "exhale" },
    ],
    animation: "heartbeat",
    icon: "💜",
  },
  {
    id: "box-breathing",
    name: "Box Breathing",
    description: "Navy SEAL technique. Equal counts for inhale, hold, exhale, hold.",
    phases: [
      { label: "Breathe In", seconds: 4, type: "inhale" },
      { label: "Hold", seconds: 4, type: "hold" },
      { label: "Breathe Out", seconds: 4, type: "exhale" },
      { label: "Hold", seconds: 4, type: "hold" },
    ],
    animation: "orbital",
    icon: "🧘",
  },
  {
    id: "478-relaxation",
    name: "4-7-8 Relaxation",
    description: "Dr. Weil's technique for sleep and anxiety relief.",
    phases: [
      { label: "Breathe In", seconds: 4, type: "inhale" },
      { label: "Hold", seconds: 7, type: "hold" },
      { label: "Breathe Out", seconds: 8, type: "exhale" },
    ],
    animation: "aurora",
    icon: "😮‍💨",
  },
  {
    id: "calming-breath",
    name: "Calming Breath",
    description: "Extended exhales to activate rest-and-digest response.",
    phases: [
      { label: "Breathe In", seconds: 4, type: "inhale" },
      { label: "Breathe Out", seconds: 6, type: "exhale" },
    ],
    animation: "lotus",
    icon: "🍃",
  },
];
