import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { getEngineConfig, type EngineMode, type EngineConfig } from "@/lib/engineConfig";
import { switchEngineMode } from "@/lib/engineSwitchGuard";
import { useAuth } from "@/hooks/useAuth";

const DEFAULT_ENGINE: EngineMode = "performance";

export function useEngineMode() {
  const clientId = useEffectiveClientId();
  const { user } = useAuth();
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
      const previousMode = engineMode || DEFAULT_ENGINE;

      // Use safeguarded engine switch
      await switchEngineMode(clientId, user?.id || "", mode, previousMode);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["engine-mode"] });
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings"] });
      queryClient.invalidateQueries({ queryKey: ["client-feature-settings"] });
      queryClient.invalidateQueries({ queryKey: ["engine-scores"] });
      queryClient.invalidateQueries({ queryKey: ["level-progression"] });
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
