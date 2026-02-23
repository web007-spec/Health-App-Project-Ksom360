/**
 * Engine Mode Configuration
 *
 * Three engine modes, coach-controlled:
 * 1. Metabolic (45+ fasting-first)
 * 2. Performance (40+ fitness-first with fasting integrated)
 * 3. Athletic (13–18 recovery + training, NO fasting)
 *
 * Each engine drives: dashboard card order, scoring weights,
 * insight tone, feature emphasis, and safety rules.
 */

export type EngineMode = "metabolic" | "performance" | "athletic";

export type DashboardCardKey =
  | "header"
  | "calendar"
  | "fasting_card"
  | "workout_card"
  | "sport_schedule"
  | "score_panel"
  | "checkin"
  | "insight"
  | "break_fast"
  | "coach_tip"
  | "nutrition"
  | "recovery"
  | "fueling"
  | "focus_selector";

export interface EngineConfig {
  id: EngineMode;
  label: string;
  shortLabel: string;
  tagline: string;
  ageRange: string;

  /** Primary score displayed on dashboard */
  scoreLabel: string;

  /** Feature emphasis */
  emphasis: "fasting" | "training" | "recovery";

  /** Dashboard card order (rendered top to bottom, only matching cards show) */
  dashboardOrder: DashboardCardKey[];

  /** Scoring weights for the recommendation engine */
  scoringWeights: {
    streak: number;
    weeklyCompletion: number;
    sleepHours: number;
    sleepQuality: number;
    nutrition: number;
    recovery: number;
  };

  /** Insight messaging tone */
  insightTone: "clinical" | "athletic" | "motivational";
  insights: string[];

  /** Safety: disables all fasting features when true */
  fastingDisabled: boolean;

  /** Feature flags */
  features: {
    showFastingUI: boolean;
    showFastingProtocols: boolean;
    trainingDominant: boolean;
    recoveryDominant: boolean;
    showGameStats: boolean;
    showSportProfile: boolean;
    showFuelingGuidance: boolean;
  };

  /** Plans page emphasis description */
  plansEmphasis: string;
}

export const ENGINE_CONFIGS: Record<EngineMode, EngineConfig> = {
  metabolic: {
    id: "metabolic",
    label: "Metabolic Stability Engine",
    shortLabel: "Metabolic",
    tagline: "Build consistent metabolic rhythm",
    ageRange: "45+",
    scoreLabel: "Metabolic Stability Index",
    emphasis: "fasting",

    dashboardOrder: [
      "header",
      "calendar",
      "fasting_card",
      "score_panel",
      "checkin",
      "insight",
      "break_fast",
      "coach_tip",
      "workout_card",
      "recovery",
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

    fastingDisabled: false,

    features: {
      showFastingUI: true,
      showFastingProtocols: true,
      trainingDominant: false,
      recoveryDominant: false,
      showGameStats: false,
      showSportProfile: false,
      showFuelingGuidance: false,
    },

    plansEmphasis: "Fasting protocols shown first. Training supplements metabolic stability.",
  },

  performance: {
    id: "performance",
    label: "Performance Readiness Engine",
    shortLabel: "Performance",
    tagline: "Optimize training and recovery cycles",
    ageRange: "40+",
    scoreLabel: "Performance Readiness Score",
    emphasis: "training",

    dashboardOrder: [
      "header",
      "calendar",
      "workout_card",
      "score_panel",
      "checkin",
      "fasting_card",
      "insight",
      "nutrition",
      "coach_tip",
      "recovery",
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

    fastingDisabled: false,

    features: {
      showFastingUI: true,
      showFastingProtocols: true,
      trainingDominant: true,
      recoveryDominant: false,
      showGameStats: false,
      showSportProfile: false,
      showFuelingGuidance: false,
    },

    plansEmphasis: "Training and nutrition shown first. Fasting available as a supplementary tool.",
  },

  athletic: {
    id: "athletic",
    label: "Game Readiness Engine",
    shortLabel: "Game Ready",
    tagline: "Peak readiness for competition",
    ageRange: "13–18",
    scoreLabel: "Game Readiness Score",
    emphasis: "recovery",

    dashboardOrder: [
      "header",
      "calendar",
      "sport_schedule",
      "score_panel",
      "checkin",
      "workout_card",
      "recovery",
      "fueling",
      "coach_tip",
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

    fastingDisabled: true,

    features: {
      showFastingUI: false,
      showFastingProtocols: false,
      trainingDominant: false,
      recoveryDominant: true,
      showGameStats: true,
      showSportProfile: true,
      showFuelingGuidance: true,
    },

    plansEmphasis: "Training, recovery, and fueling only. No fasting protocols or recommendations.",
  },
};

export function getEngineConfig(mode: EngineMode): EngineConfig {
  return ENGINE_CONFIGS[mode];
}

export const ENGINE_MODE_OPTIONS: { value: EngineMode; label: string; description: string; ageRange: string }[] = [
  {
    value: "metabolic",
    label: "Metabolic Stability",
    description: "Fasting-first. Build consistent metabolic rhythm.",
    ageRange: "45+",
  },
  {
    value: "performance",
    label: "Performance Readiness",
    description: "Training-first with fasting integrated as a tool.",
    ageRange: "40+",
  },
  {
    value: "athletic",
    label: "Game Readiness",
    description: "Training + recovery + fueling. No fasting.",
    ageRange: "13–18",
  },
];
