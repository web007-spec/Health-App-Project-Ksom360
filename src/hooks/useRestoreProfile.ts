import { useEngineMode } from "@/hooks/useEngineMode";
import type { EngineMode } from "@/lib/engineConfig";

export interface RestoreProfileConfig {
  engineMode: EngineMode;
  /** Accent HSL values for tinting UI */
  accent: string;
  accentMuted: string;
  accentGlow: string;
  /** Headlines */
  headline: string;
  subtitle: string;
  /** Quick Start outcome labels */
  quickStartLabel: string;
  /** Module descriptions */
  moduleMeta: {
    breathing: string;
    soundlab: string;
    sleep: string;
  };
  /** Tone-adapted copy */
  breathingTone: {
    sectionTitle: string;
    sectionSub: string;
  };
  soundLabTone: {
    headline: string;
    sub: string;
  };
  sleepTone: {
    headline: string;
    sub: string;
  };
}

const METABOLIC_CONFIG: RestoreProfileConfig = {
  engineMode: "metabolic",
  accent: "220,50%,42%",
  accentMuted: "220,30%,28%",
  accentGlow: "220,55%,60%",
  headline: "Restore & Regulation",
  subtitle: "Stabilize. Regulate. Recover.",
  quickStartLabel: "Regulation Session",
  moduleMeta: {
    breathing: "Cortisol regulation protocols",
    soundlab: "Ambient environments for stability",
    sleep: "Deep rest for metabolic recovery",
  },
  breathingTone: {
    sectionTitle: "Breathing Protocols",
    sectionSub: "Structured breath regulation for cortisol management and nervous system stability.",
  },
  soundLabTone: {
    headline: "Build Your Recovery Mix",
    sub: "Layer sound environments for regulation and rest.",
  },
  sleepTone: {
    headline: "Sleep Stories",
    sub: "Guided wind-down sessions for deep metabolic recovery.",
  },
};

const PERFORMANCE_CONFIG: RestoreProfileConfig = {
  engineMode: "performance",
  accent: "220,50%,42%",
  accentMuted: "220,30%,28%",
  accentGlow: "220,55%,60%",
  headline: "Recovery & Readiness",
  subtitle: "Regulate. Refocus. Recover.",
  quickStartLabel: "Recovery Session",
  moduleMeta: {
    breathing: "Reset and refocus protocols",
    soundlab: "Recovery environments for focus",
    sleep: "Deep rest for performance recovery",
  },
  breathingTone: {
    sectionTitle: "Breathing Protocols",
    sectionSub: "Structured breath regulation for recovery and nervous system optimization.",
  },
  soundLabTone: {
    headline: "Build Your Recovery Mix",
    sub: "Layer sound environments for focus or sleep.",
  },
  sleepTone: {
    headline: "Sleep Stories",
    sub: "Guided wind-down sessions for deep rest.",
  },
};

const ATHLETIC_CONFIG: RestoreProfileConfig = {
  engineMode: "athletic",
  accent: "200,45%,40%",
  accentMuted: "200,30%,28%",
  accentGlow: "200,50%,58%",
  headline: "Recovery Lab",
  subtitle: "Recover. Reset. Reload.",
  quickStartLabel: "Recovery Protocol",
  moduleMeta: {
    breathing: "Between-session recovery",
    soundlab: "Pre-game and cooldown environments",
    sleep: "Rest protocols for game readiness",
  },
  breathingTone: {
    sectionTitle: "Recovery Protocols",
    sectionSub: "Controlled activation and recovery breathing for between sessions.",
  },
  soundLabTone: {
    headline: "Build Your Recovery Mix",
    sub: "Layer sound environments for pre-game focus or post-game cooldown.",
  },
  sleepTone: {
    headline: "Sleep Stories",
    sub: "Guided wind-down sessions for game-day recovery.",
  },
};

const ENGINE_CONFIGS: Record<EngineMode, RestoreProfileConfig> = {
  metabolic: METABOLIC_CONFIG,
  performance: PERFORMANCE_CONFIG,
  athletic: ATHLETIC_CONFIG,
};

export function useRestoreProfile() {
  const { engineMode, isLoading } = useEngineMode();

  return {
    profileType: engineMode,
    config: ENGINE_CONFIGS[engineMode],
    isLoading,
  };
}
