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
  getEffectiveTier,
  type SubscriptionTier,
  type GatedFeature,
  type SubscriptionStatus,
  type BillingState,
} from "@/lib/featureAccessGuard";

export function useSubscriptionTier() {
  const clientId = useEffectiveClientId();

  const { data, isLoading } = useQuery({
    queryKey: ["subscription-tier", clientId],
    queryFn: async () => {
      if (!clientId) return { tier: "starter" as SubscriptionTier, billing: null as BillingState | null };

      // Fetch tier from feature settings
      const { data: settings, error: sErr } = await supabase
        .from("client_feature_settings")
        .select("subscription_tier")
        .eq("client_id", clientId)
        .maybeSingle();
      if (sErr) throw sErr;

      const storedTier = (settings?.subscription_tier as SubscriptionTier) || "starter";

      // Fetch billing state from profiles
      const { data: profile, error: pErr } = await supabase
        .from("profiles")
        .select("subscription_status, grace_period_ends_at")
        .eq("id", clientId)
        .maybeSingle();
      if (pErr) throw pErr;

      const billing: BillingState | null = profile?.subscription_status
        ? {
            subscriptionStatus: profile.subscription_status as SubscriptionStatus,
            gracePeriodEndsAt: profile.grace_period_ends_at ?? null,
          }
        : null;

      return { tier: storedTier, billing };
    },
    enabled: !!clientId,
    staleTime: 10 * 60 * 1000,
  });

  const storedTier = data?.tier || "starter";
  const billing = data?.billing ?? null;
  const currentTier = getEffectiveTier(storedTier, billing);

  return {
    tier: currentTier,
    storedTier,
    subscriptionStatus: billing?.subscriptionStatus ?? ("active" as SubscriptionStatus),
    gracePeriodEndsAt: billing?.gracePeriodEndsAt ?? null,
    isGracePeriod:
      billing?.gracePeriodEndsAt != null &&
      new Date(billing.gracePeriodEndsAt) > new Date() &&
      billing.subscriptionStatus !== "active",
    isLoading,
    hasAccess: (feature: GatedFeature) => hasFeatureAccess(currentTier, feature),
    availableEngines: getAvailableEngines(currentTier),
    maxLevel: getMaxLevel(currentTier),
    isEngineLocked: (engine: Parameters<typeof isEngineLocked>[1]) => isEngineLocked(currentTier, engine),
    isLevelLocked: (level: number) => isLevelLocked(currentTier, level),
    requiredTierFor: (feature: GatedFeature) => getRequiredTierForFeature(feature),
  };
}
