import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import {
  hasFeatureAccess,
  getAvailableEngines,
  getMaxLevel,
  isEngineLocked,
  isLevelLocked,
  getRequiredTierForFeature,
  type SubscriptionTier,
  type GatedFeature,
} from "@/lib/featureAccessGuard";

export function useSubscriptionTier() {
  const clientId = useEffectiveClientId();

  const { data: tier, isLoading } = useQuery({
    queryKey: ["subscription-tier", clientId],
    queryFn: async (): Promise<SubscriptionTier> => {
      if (!clientId) return "starter";

      const { data, error } = await supabase
        .from("client_feature_settings")
        .select("subscription_tier")
        .eq("client_id", clientId)
        .maybeSingle();

      if (error) throw error;
      return (data?.subscription_tier as SubscriptionTier) || "starter";
    },
    enabled: !!clientId,
    staleTime: 10 * 60 * 1000,
  });

  const currentTier = tier || "starter";

  return {
    tier: currentTier,
    isLoading,
    hasAccess: (feature: GatedFeature) => hasFeatureAccess(currentTier, feature),
    availableEngines: getAvailableEngines(currentTier),
    maxLevel: getMaxLevel(currentTier),
    isEngineLocked: (engine: Parameters<typeof isEngineLocked>[1]) => isEngineLocked(currentTier, engine),
    isLevelLocked: (level: number) => isLevelLocked(currentTier, level),
    requiredTierFor: (feature: GatedFeature) => getRequiredTierForFeature(feature),
  };
}
