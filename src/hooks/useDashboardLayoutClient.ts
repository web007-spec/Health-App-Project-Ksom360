import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardCardConfig, mergeWithDefaults } from "@/lib/dashboardCards";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";

/**
 * Client-side hook: reads the dashboard card layout for the current client.
 * Falls back to trainer default, then to hardcoded defaults.
 */
export function useDashboardLayoutClient() {
  const clientId = useEffectiveClientId();

  const { data: layout, isLoading } = useQuery({
    queryKey: ["dashboard-layout-client", clientId],
    queryFn: async () => {
      if (!clientId) return mergeWithDefaults(null);

      // 1. Try client-specific layout
      const { data: clientLayout } = await supabase
        .from("dashboard_card_layouts" as any)
        .select("cards")
        .eq("client_id", clientId)
        .maybeSingle();

      if (clientLayout) {
        return mergeWithDefaults((clientLayout as any).cards);
      }

      // 2. Try trainer default (find trainer via trainer_clients)
      const { data: relationship } = await supabase
        .from("trainer_clients")
        .select("trainer_id")
        .eq("client_id", clientId)
        .eq("status", "active")
        .maybeSingle();

      if (relationship?.trainer_id) {
        const { data: trainerLayout } = await supabase
          .from("dashboard_card_layouts" as any)
          .select("cards")
          .eq("trainer_id", relationship.trainer_id)
          .is("client_id", null)
          .maybeSingle();

        if (trainerLayout) {
          return mergeWithDefaults((trainerLayout as any).cards);
        }
      }

      // 3. Hardcoded defaults
      return mergeWithDefaults(null);
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    cards: layout ?? mergeWithDefaults(null),
    isLoading,
  };
}
