/**
 * Engine Mode Configuration
 * 
 * Defines how each engine mode shapes the entire app experience:
 * - Dashboard card order & emphasis
 * - Scoring weight profiles
 * - Insight messaging tone
 * - Feature visibility priorities
 * - Onboarding flow customization
 * - Progress metrics display order
 */

export type EngineMode = "metabolic_stability" | "performance_readiness" | "game_readiness";

export interface EngineConfig {
  id: EngineMode;
  label: string;
  shortLabel: string;
  tagline: string;
  ageRange: string;
  
  /** Which features are dominant in this engine */
  emphasis: "fasting" | "training" | "recovery";

  /** Dashboard card order (array of card keys, top to bottom) */
  dashboardOrder: DashboardCardKey[];

  /** Scoring weight overrides for the recommendation engine */
  scoringWeights: {
    streak: number;
    weeklyCompletion: number;
    sleepHours: number;
    sleepQuality: number;
    nutrition: number;
    recovery: number;
  };

  /** Insight messaging — tone + sample messages */
  insightTone: "clinical" | "athletic" | "motivational";
  insights: string[];

  /** Progress metrics shown first */
  primaryMetrics: string[];

  /** Onboarding steps emphasis */
  onboardingFocus: string;
  onboardingDescription: string;

  /** Feature emphasis flags */
  features: {
    fastingDominant: boolean;
    trainingDominant: boolean;
    recoveryDominant: boolean;
    showGameStats: boolean;
    showSportProfile: boolean;
  };
}

export type DashboardCardKey =
  | "status_panel"
  | "fasting_card"
  | "focus_selector"
  | "checkin"
  | "readiness"
  | "recommendation"
  | "insight"
  | "training"
  | "progress"
  | "sport_schedule"
  | "game_stats";

export const ENGINE_CONFIGS: Record<EngineMode, EngineConfig> = {
  metabolic_stability: {
    id: "metabolic_stability",
    label: "Metabolic Stability Engine",
    shortLabel: "Metabolic",
    tagline: "Build consistent metabolic rhythm",
    ageRange: "45+",
    emphasis: "fasting",

    dashboardOrder: [
      "status_panel",
      "fasting_card",
      "focus_selector",
      "checkin",
      "readiness",
      "recommendation",
      "progress",
      "insight",
    ],

    scoringWeights: {
      streak: 0.25,
      weeklyCompletion: 0.25,
      sleepHours: 0.10,
      sleepQuality: 0.05,
      nutrition: 0.25,
      recovery: 0.10,
    },

    insightTone: "clinical",
    insights: [
      "Fasting is not about punishment. It is about control over habits, timing, and consistency.",
      "Consistency builds metabolic resilience. Progression follows stability.",
      "You do not need the hardest plan. You need the plan you can repeat.",
      "Discipline compounds. Results follow. Small daily wins create visible change.",
      "Every completed fast builds metabolic resilience, appetite awareness, and confidence.",
      "We do not chase extremes. We build consistency, recovery, longevity, and structure.",
      "Choose the level that supports your life — not one that disrupts it.",
    ],

    primaryMetrics: ["weight", "body_fat", "sleep", "caloric_intake"],

    onboardingFocus: "Metabolic Health",
    onboardingDescription: "Build consistent fasting habits and metabolic stability for long-term health.",

    features: {
      fastingDominant: true,
      trainingDominant: false,
      recoveryDominant: false,
      showGameStats: false,
      showSportProfile: false,
    },
  },

  performance_readiness: {
    id: "performance_readiness",
    label: "Performance Readiness Engine",
    shortLabel: "Performance",
    tagline: "Optimize training and recovery cycles",
    ageRange: "Fitness-First",
    emphasis: "training",

    dashboardOrder: [
      "status_panel",
      "training",
      "readiness",
      "checkin",
      "fasting_card",
      "focus_selector",
      "progress",
      "recommendation",
      "insight",
    ],

    scoringWeights: {
      streak: 0.15,
      weeklyCompletion: 0.15,
      sleepHours: 0.20,
      sleepQuality: 0.15,
      nutrition: 0.10,
      recovery: 0.25,
    },

    insightTone: "athletic",
    insights: [
      "Recovery is not optional. It is where adaptation happens.",
      "Sleep quality drives performance more than volume. Protect your rest.",
      "Train with intent. Recover with discipline. Results follow structure.",
      "Your readiness score reflects your body's actual capacity — respect it.",
      "Pushing through fatigue is not strength. Managing energy is.",
      "Nutrition fuels performance. Track it like you track your lifts.",
      "Consistency in recovery produces consistency in output.",
    ],

    primaryMetrics: ["resting_hr", "sleep", "steps", "caloric_burn"],

    onboardingFocus: "Training Performance",
    onboardingDescription: "Optimize your training output through sleep, recovery, and structured nutrition.",

    features: {
      fastingDominant: false,
      trainingDominant: true,
      recoveryDominant: false,
      showGameStats: false,
      showSportProfile: false,
    },
  },

  game_readiness: {
    id: "game_readiness",
    label: "Game Readiness Engine",
    shortLabel: "Game Ready",
    tagline: "Peak readiness for competition",
    ageRange: "13–18 Athletes",
    emphasis: "recovery",

    dashboardOrder: [
      "status_panel",
      "sport_schedule",
      "readiness",
      "game_stats",
      "training",
      "checkin",
      "fasting_card",
      "progress",
      "focus_selector",
      "recommendation",
      "insight",
    ],

    scoringWeights: {
      streak: 0.20,
      weeklyCompletion: 0.15,
      sleepHours: 0.15,
      sleepQuality: 0.15,
      nutrition: 0.15,
      recovery: 0.20,
    },

    insightTone: "motivational",
    insights: [
      "Game day starts with last night's sleep. Rest is your competitive edge.",
      "Champions are built in recovery. Every rest day is an investment.",
      "Your body is your equipment. Fuel it, rest it, sharpen it.",
      "Readiness is not a feeling. It is a score based on your habits.",
      "The best athletes do not just train harder — they recover smarter.",
      "Nutrition is not a diet. It is fuel strategy for your sport.",
      "Consistency separates good athletes from great ones.",
    ],

    primaryMetrics: ["sleep", "resting_hr", "steps", "body_weight"],

    onboardingFocus: "Athletic Performance",
    onboardingDescription: "Track game readiness, recovery, and sport-specific performance metrics.",

    features: {
      fastingDominant: false,
      trainingDominant: false,
      recoveryDominant: true,
      showGameStats: true,
      showSportProfile: true,
    },
  },
};

export function getEngineConfig(mode: EngineMode): EngineConfig {
  return ENGINE_CONFIGS[mode];
}

export const ENGINE_MODE_OPTIONS: { value: EngineMode; label: string; description: string; ageRange: string }[] = [
  {
    value: "metabolic_stability",
    label: "Metabolic Stability",
    description: "Fasting-dominant. Build consistent metabolic rhythm.",
    ageRange: "45+",
  },
  {
    value: "performance_readiness",
    label: "Performance Readiness",
    description: "Training-dominant. Optimize recovery and output.",
    ageRange: "Fitness-First",
  },
  {
    value: "game_readiness",
    label: "Game Readiness",
    description: "Recovery-dominant. Peak readiness for competition.",
    ageRange: "13–18 Athletes",
  },
];
