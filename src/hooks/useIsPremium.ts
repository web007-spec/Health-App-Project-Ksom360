import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";

export function useIsPremium() {
  const clientId = useEffectiveClientId();

  const { data: isPremium = false, isLoading } = useQuery({
    queryKey: ["is-premium", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_feature_settings")
        .select("is_premium")
        .eq("client_id", clientId)
        .maybeSingle();
      if (error) throw error;
      return data?.is_premium ?? false;
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
  });

  return { isPremium, isLoading };
}
