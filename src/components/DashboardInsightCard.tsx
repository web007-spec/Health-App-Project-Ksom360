import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb, ArrowRight, ShieldAlert } from "lucide-react";
import { useDailyInsight } from "@/hooks/useDailyInsight";
import { useEngineMode } from "@/hooks/useEngineMode";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { useClientFeatureSettings } from "@/hooks/useClientFeatureSettings";
import { checkAuthorityGate } from "@/lib/featureAccessGuard";
import type { EngineMode } from "@/lib/engineConfig";

export function DashboardInsightCard() {
  const { data: insight, isLoading } = useDailyInsight();
  const { config, engineMode } = useEngineMode();
  const { tier } = useSubscriptionTier();
  const { settings } = useClientFeatureSettings();

  const automationBlocked = !checkAuthorityGate(
    tier,
    engineMode as EngineMode,
    !!settings?.ai_suggestions_enabled,
  );

  if (isLoading || !insight) return null;

  const toneLabel =
    config.insightTone === "clinical"
      ? "Daily Insight"
      : config.insightTone === "athletic"
      ? "Performance Note"
      : "Game Day Insight";

  return (
    <Card className="border-border/40 bg-card">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-3.5 w-3.5 text-primary" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {toneLabel}
          </p>
          {insight.source === "pinned" && (
            <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
              Pinned
            </span>
          )}
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed italic">
          {insight.message}
        </p>

        {insight.action && (
          <div className="flex items-center gap-1.5 pt-1">
            <ArrowRight className="h-3 w-3 text-primary" />
            <p className="text-xs font-medium text-foreground">
              Today: {insight.action}
            </p>
          </div>
        )}

        {automationBlocked && (
          <div className="flex items-center gap-1.5 pt-1.5 border-t border-border/30 mt-2">
            <ShieldAlert className="h-3 w-3 text-muted-foreground" />
            <p className="text-[10px] text-muted-foreground font-medium">
              Coach Approval Required
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
