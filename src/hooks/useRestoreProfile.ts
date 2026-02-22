import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";

export type RestoreProfileType = "performance" | "precision";

export interface RestoreProfileConfig {
  profileType: RestoreProfileType;
  /** Accent HSL values for tinting UI */
  accent: string;
  accentMuted: string;
  accentGlow: string;
  /** Copy tone adaptations */
  greeting: Record<"morning" | "midday" | "evening" | "night", { title: string; sub: string }>;
  moodTips: Record<"energized" | "calm" | "stressed" | "tired", string>;
  /** Brainwave priority order */
  brainwavePriority: string[];
  /** Guided session priority categories */
  sessionPriority: string[];
  /** Section descriptions */
  sectionMeta: { home: string; guided: string; sleep: string; soundlab: string };
}

const PERFORMANCE_CONFIG: RestoreProfileConfig = {
  profileType: "performance",
  accent: "260,45%,38%",
  accentMuted: "260,30%,25%",
  accentGlow: "260,60%,70%",
  greeting: {
    morning: { title: "Rise & Conquer", sub: "Prime your nervous system" },
    midday: { title: "Stay Locked In", sub: "Sharpen your edge" },
    evening: { title: "Recover Hard", sub: "Downregulate for tomorrow" },
    night: { title: "Deep Recovery", sub: "Maximize overnight repair" },
  },
  moodTips: {
    energized: "Channel that fire — a focus session or high-beta brainwave will amplify it.",
    calm: "Great baseline. Layer in breathwork to lock this state before training.",
    stressed: "Activate your parasympathetic — try a guided breathwork reset.",
    tired: "Recovery is performance. A sleep story or theta loop is your move.",
  },
  brainwavePriority: ["beta", "alpha", "gamma", "theta", "delta"],
  sessionPriority: ["focus", "breathwork", "wind_down", "sleep"],
  sectionMeta: {
    home: "Recovery picks",
    guided: "Breathwork & focus",
    sleep: "Deep recovery",
    soundlab: "Build your mix",
  },
};

const PRECISION_CONFIG: RestoreProfileConfig = {
  profileType: "precision",
  accent: "220,50%,42%",
  accentMuted: "220,30%,28%",
  accentGlow: "220,60%,68%",
  greeting: {
    morning: { title: "Good Morning", sub: "Set your intention for today" },
    midday: { title: "Mindful Pause", sub: "Return to center" },
    evening: { title: "Wind Down", sub: "Gently ease into the evening" },
    night: { title: "Good Night", sub: "Rest deeply tonight" },
  },
  moodTips: {
    energized: "Beautiful energy — try a focus session or build an upbeat ambient mix.",
    calm: "Perfect state for breathwork or a gentle wind-down session.",
    stressed: "Take a breath — we recommend a guided breathwork session.",
    tired: "Rest up — a sleep story or gentle long loop might be just what you need.",
  },
  brainwavePriority: ["alpha", "theta", "delta", "beta", "gamma"],
  sessionPriority: ["breathwork", "wind_down", "sleep", "focus"],
  sectionMeta: {
    home: "Personalized picks",
    guided: "Breathwork & mindfulness",
    sleep: "Stories & long loops",
    soundlab: "Build your mix",
  },
};

const PROFILE_CONFIGS: Record<RestoreProfileType, RestoreProfileConfig> = {
  performance: PERFORMANCE_CONFIG,
  precision: PRECISION_CONFIG,
};

export function useRestoreProfile() {
  const clientId = useEffectiveClientId();

  const { data: profileType = "performance" as RestoreProfileType, isLoading } = useQuery({
    queryKey: ["restore-profile-type", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_feature_settings")
        .select("restore_profile_type")
        .eq("client_id", clientId)
        .maybeSingle();
      if (error) throw error;
      const val = (data as any)?.restore_profile_type;
      return (val === "precision" ? "precision" : "performance") as RestoreProfileType;
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    profileType,
    config: PROFILE_CONFIGS[profileType],
    isLoading,
  };
}
