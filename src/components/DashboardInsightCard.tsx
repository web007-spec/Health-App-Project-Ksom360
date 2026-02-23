import { Card, CardContent } from "@/components/ui/card";
import { useEngineMode } from "@/hooks/useEngineMode";

export function DashboardInsightCard() {
  const { config } = useEngineMode();

  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  const insight = config.insights[dayOfYear % config.insights.length];

  const toneLabel = config.insightTone === "clinical" ? "Daily Insight"
    : config.insightTone === "athletic" ? "Performance Note"
    : "Game Day Insight";

  return (
    <Card className="border-border/40 bg-card">
      <CardContent className="p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">{toneLabel}</p>
        <p className="text-xs text-muted-foreground leading-relaxed italic">
          {insight}
        </p>
      </CardContent>
    </Card>
  );
}
