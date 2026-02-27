import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";

export interface ClientFeatureSettings {
  training_enabled: boolean;
  workout_comments_enabled: boolean;
  activity_logging_enabled: boolean;
  progress_photos_enabled: boolean;
  tasks_enabled: boolean;
  messages_enabled: boolean;
  food_journal_enabled: boolean;
  macros_enabled: boolean;
  body_metrics_enabled: boolean;
  goals_enabled: boolean;
  meal_plan_type: string;
  meal_plan_allow_recipe_replacement: boolean;
  meal_plan_add_recipe_books: boolean;
  meal_plan_header_label: string;
  calendar_days_ahead: number;
  fasting_enabled: boolean;
  fasting_strict_mode: boolean;
  eating_window_hours: number;
  sport_schedule_enabled: boolean;
  restore_enabled: boolean;
  greeting_emoji: string;
  greeting_subtitle: string;
  fasting_card_subtitle: string;
  dashboard_hero_image_url: string | null;
  dashboard_hero_message: string | null;
  fasting_card_image_url: string | null;
  maintenance_mode: boolean;
  maintenance_schedule_type: string | null;
  restore_profile_type: string;
  subscription_tier: string;
  ai_suggestions_enabled: boolean;
  auto_level_advance_enabled: boolean;
  auto_plan_adjust_enabled: boolean;
  auto_nudge_optimization_enabled: boolean;
}

const DEFAULT_SETTINGS: ClientFeatureSettings = {
  training_enabled: true,
  workout_comments_enabled: true,
  activity_logging_enabled: true,
  progress_photos_enabled: true,
  tasks_enabled: true,
  messages_enabled: true,
  food_journal_enabled: true,
  macros_enabled: true,
  body_metrics_enabled: true,
  goals_enabled: true,
  meal_plan_type: "none",
  meal_plan_allow_recipe_replacement: false,
  meal_plan_add_recipe_books: false,
  meal_plan_header_label: "Meal Plan",
  calendar_days_ahead: 0,
  fasting_enabled: false,
  fasting_strict_mode: false,
  eating_window_hours: 8,
  sport_schedule_enabled: true,
  restore_enabled: false,
  greeting_emoji: "👋",
  greeting_subtitle: "Let's do this",
  fasting_card_subtitle: "Fasting is the foundation of your KSOM360 plan.",
  dashboard_hero_image_url: null,
  dashboard_hero_message: null,
  fasting_card_image_url: null,
  maintenance_mode: false,
  maintenance_schedule_type: null,
  restore_profile_type: "performance",
  subscription_tier: "starter",
  ai_suggestions_enabled: false,
  auto_level_advance_enabled: false,
  auto_plan_adjust_enabled: false,
  auto_nudge_optimization_enabled: false,
};

export function useClientFeatureSettings() {
  const clientId = useEffectiveClientId();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["my-feature-settings", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_feature_settings")
        .select("*")
        .eq("client_id", clientId)
        .maybeSingle();

      if (error) throw error;
      return data as ClientFeatureSettings | null;
    },
    enabled: !!clientId,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  // When clientId is not yet available (auth loading), treat as loading
  // to prevent premature redirects based on DEFAULT_SETTINGS
  const effectiveLoading = isLoading || !clientId;

  return {
    settings: settings || DEFAULT_SETTINGS,
    isLoading: effectiveLoading,
  };
}
