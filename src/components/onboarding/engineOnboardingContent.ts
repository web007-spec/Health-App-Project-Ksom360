import type { EngineMode } from "@/lib/engineConfig";

export interface IntroScreen {
  title: string;
  subtitle: string;
}

export interface OnboardingQuestion {
  id: string;
  label: string;
  type: "options" | "slider" | "toggle" | "dropdown";
  options?: string[];
  sliderMin?: number;
  sliderMax?: number;
  defaultValue?: string | number | boolean;
  required?: boolean;
}

interface EngineOnboardingContent {
  tone: string;
  introScreens: [IntroScreen, IntroScreen, IntroScreen];
  questions: [OnboardingQuestion, OnboardingQuestion, OnboardingQuestion];
}

const SPORT_OPTIONS = [
  "Baseball", "Basketball", "Cheer", "Cross Country", "Field Hockey",
  "Football", "Golf", "Gymnastics", "Ice Hockey", "Lacrosse",
  "Soccer", "Softball", "Swimming", "Tennis", "Track & Field",
  "Volleyball", "Wrestling", "Other",
];

export const ENGINE_ONBOARDING: Record<EngineMode, EngineOnboardingContent> = {
  metabolic: {
    tone: "clinical",
    introScreens: [
      {
        title: "Metabolic Stability System",
        subtitle: "This program improves metabolic health, energy, and fat regulation.",
      },
      {
        title: "Consistency Over Intensity",
        subtitle: "Small daily regulation wins drive long-term metabolic stability.",
      },
      {
        title: "Track. Stabilize. Improve.",
        subtitle: "Your Stability Index will guide adjustments week to week.",
      },
    ],
    questions: [
      {
        id: "fasting_experience",
        label: "Have you practiced fasting before?",
        type: "options",
        options: ["Yes, regularly", "Occasionally", "New to fasting"],
        required: true,
      },
      {
        id: "avg_sleep",
        label: "Average sleep per night?",
        type: "slider",
        sliderMin: 4,
        sliderMax: 9,
        defaultValue: 7,
      },
      {
        id: "primary_focus",
        label: "Primary focus?",
        type: "options",
        options: ["Fat loss", "Energy stability", "Metabolic health"],
        required: true,
      },
    ],
  },

  performance: {
    tone: "athletic",
    introScreens: [
      {
        title: "Performance Optimization",
        subtitle: "Train strong. Recover properly. Improve consistently.",
      },
      {
        title: "Readiness Drives Results",
        subtitle: "Your Performance Score adjusts based on training and recovery.",
      },
      {
        title: "Build. Recover. Repeat.",
        subtitle: "Consistency compounds.",
      },
    ],
    questions: [
      {
        id: "primary_goal",
        label: "Primary goal?",
        type: "options",
        options: ["Fat loss", "Recomposition", "Strength increase"],
        required: true,
      },
      {
        id: "training_frequency",
        label: "Training frequency?",
        type: "options",
        options: ["2–3 days/week", "4–5 days/week", "6+ days/week"],
        required: true,
      },
      {
        id: "include_fasting",
        label: "Include fasting?",
        type: "toggle",
        defaultValue: false,
      },
    ],
  },

  athletic: {
    tone: "motivational",
    introScreens: [
      {
        title: "Game Ready System",
        subtitle: "Train hard. Recover smart. Compete confident.",
      },
      {
        title: "Recovery = Performance",
        subtitle: "Sleep, fueling, and balance affect your game.",
      },
      {
        title: "Prepare. Perform. Win.",
        subtitle: "Your Game Readiness Score updates daily.",
      },
    ],
    questions: [
      {
        id: "primary_sport",
        label: "Primary sport?",
        type: "dropdown",
        options: SPORT_OPTIONS,
        required: true,
      },
      {
        id: "season_status",
        label: "Season status?",
        type: "options",
        options: ["In-season", "Off-season", "Pre-season"],
        required: true,
      },
      {
        id: "avg_sleep",
        label: "Average sleep per night?",
        type: "slider",
        sliderMin: 4,
        sliderMax: 9,
        defaultValue: 7,
      },
    ],
  },
};
