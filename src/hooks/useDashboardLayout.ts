import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardCardConfig, mergeWithDefaults } from "@/lib/dashboardCards";

export function useDashboardLayout(trainerId: string | undefined, clientId?: string | null) {
  const queryClient = useQueryClient();

  // Fetch client-specific layout first, fall back to trainer default
  const { data: layout, isLoading } = useQuery({
    queryKey: ["dashboard-layout", trainerId, clientId],
    queryFn: async () => {
      // Try client-specific first
      if (clientId) {
        const { data } = await supabase
          .from("dashboard_card_layouts" as any)
          .select("*")
          .eq("client_id", clientId)
          .maybeSingle();
        if (data) return { cards: mergeWithDefaults((data as any).cards), isClientOverride: true, id: (data as any).id };
      }
      
      // Fall back to trainer default
      if (trainerId) {
        const { data } = await supabase
          .from("dashboard_card_layouts" as any)
          .select("*")
          .eq("trainer_id", trainerId)
          .is("client_id", null)
          .maybeSingle();
        if (data) return { cards: mergeWithDefaults((data as any).cards), isClientOverride: false, id: (data as any).id };
      }
      
      return { cards: mergeWithDefaults(null), isClientOverride: false, id: null };
    },
    enabled: !!trainerId,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ cards, forClient }: { cards: DashboardCardConfig[]; forClient?: string | null }) => {
      const payload = {
        trainer_id: trainerId,
        client_id: forClient || null,
        cards,
      };

      const { data: existing } = await supabase
        .from("dashboard_card_layouts" as any)
        .select("id, client_id")
        .eq("trainer_id", trainerId)
        .then(res => {
          // Filter in JS since we need conditional null check
          const rows = (res.data || []) as any[];
          return { data: rows.find(r => forClient ? r.client_id === forClient : r.client_id === null) };
        });

      if (existing) {
        const { error } = await supabase
          .from("dashboard_card_layouts" as any)
          .update({ cards } as any)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("dashboard_card_layouts" as any)
          .insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-layout"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-layout-client"] });
    },
  });

  return {
    cards: layout?.cards ?? mergeWithDefaults(null),
    isClientOverride: layout?.isClientOverride ?? false,
    isLoading,
    save: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
  };
}
