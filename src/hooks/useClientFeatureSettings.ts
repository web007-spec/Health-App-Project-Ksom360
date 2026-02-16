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
    staleTime: 5 * 60 * 1000,
  });

  return {
    settings: settings || DEFAULT_SETTINGS,
    isLoading,
  };
}
