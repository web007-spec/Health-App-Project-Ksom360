import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { getEngineConfig, type EngineMode, type EngineConfig } from "@/lib/engineConfig";

const DEFAULT_ENGINE: EngineMode = "metabolic_stability";

export function useEngineMode() {
  const clientId = useEffectiveClientId();
  const queryClient = useQueryClient();

  const { data: engineMode, isLoading } = useQuery({
    queryKey: ["engine-mode", clientId],
    queryFn: async (): Promise<EngineMode> => {
      if (!clientId) return DEFAULT_ENGINE;

      const { data, error } = await supabase
        .from("profiles")
        .select("engine_mode")
        .eq("id", clientId)
        .maybeSingle();

      if (error) throw error;
      return (data?.engine_mode as EngineMode) || DEFAULT_ENGINE;
    },
    enabled: !!clientId,
    staleTime: 10 * 60 * 1000,
  });

  const setEngineMode = useMutation({
    mutationFn: async (mode: EngineMode) => {
      if (!clientId) throw new Error("No client ID");

      // Update both profiles and client_feature_settings
      const [profileRes, settingsRes] = await Promise.all([
        supabase.from("profiles").update({ engine_mode: mode }).eq("id", clientId),
        supabase.from("client_feature_settings").update({ engine_mode: mode }).eq("client_id", clientId),
      ]);

      if (profileRes.error) throw profileRes.error;
      if (settingsRes.error) throw settingsRes.error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["engine-mode"] });
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings"] });
    },
  });

  const mode = engineMode || DEFAULT_ENGINE;
  const config = getEngineConfig(mode);

  return {
    engineMode: mode,
    config,
    isLoading,
    setEngineMode: setEngineMode.mutate,
    isUpdating: setEngineMode.isPending,
  };
}
