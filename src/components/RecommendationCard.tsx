import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Shield, Zap, AlertTriangle } from "lucide-react";
import { useEngineScores } from "@/hooks/useEngineScores";
import {
  ENGINE_SCORE_LABELS,
  STATUS_DISPLAY,
  RECOMMENDATION_MESSAGES,
  CORRECTIVE_ACTIONS,
  StatusLabel,
  RecommendationType,
} from "@/lib/recommendationEngine";
import type { EngineMode } from "@/lib/engineConfig";

const ENGINE_ICONS: Record<EngineMode, React.ReactNode> = {
  metabolic: <Shield className="h-5 w-5" />,
  performance: <TrendingUp className="h-5 w-5" />,
  athletic: <Zap className="h-5 w-5" />,
};

const STATUS_BADGE_COLORS: Record<StatusLabel, string> = {
  strong: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  moderate: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  needs_support: "bg-red-500/15 text-red-400 border-red-500/30",
};

const PROGRESS_COLORS: Record<StatusLabel, string> = {
  strong: "[&>div]:bg-emerald-500",
  moderate: "[&>div]:bg-amber-500",
  needs_support: "[&>div]:bg-red-500",
};

export function RecommendationCard() {
  const { data: scores, isLoading } = useEngineScores();

  if (isLoading || !scores || scores.length === 0) return null;

  const result = scores[0];
  const recMsg = RECOMMENDATION_MESSAGES[result.recommendation][result.status];

  return (
    <Card className="border-border">
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {ENGINE_ICONS[result.engine]}
            <div>
              <p className="text-sm font-bold">{ENGINE_SCORE_LABELS[result.engine]}</p>
              <p className="text-xs text-muted-foreground">Based on recent activity</p>
            </div>
          </div>
          <Badge variant="outline" className={`text-xs ${STATUS_BADGE_COLORS[result.status]}`}>
            {STATUS_DISPLAY[result.status].label}
          </Badge>
        </div>

        {/* Main score bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-foreground">{result.score}</span>
            <span className="text-xs text-muted-foreground">/100</span>
          </div>
          <Progress value={result.score} className={`h-2.5 ${PROGRESS_COLORS[result.status]}`} />
        </div>

        {/* Factor breakdown */}
        <div className="space-y-2">
          {result.factors.map((f) => (
            <div key={f.factor} className="flex items-center justify-between text-xs">
              <span className={`${f.factor === result.lowestFactor.factor ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {f.label} ({Math.round(f.weight * 100)}%)
              </span>
              <div className="flex items-center gap-2">
                <Progress value={f.normalized} className={`h-1 w-16 ${f.normalized >= 80 ? "[&>div]:bg-emerald-500" : f.normalized >= 60 ? "[&>div]:bg-amber-500" : "[&>div]:bg-red-500"}`} />
                <span className="w-6 text-right font-mono">{f.normalized}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Recommendation */}
        <div className="border-t border-border pt-3 space-y-2">
          <p className="text-xs font-semibold text-foreground">{recMsg.title}</p>
          <p className="text-xs text-muted-foreground">{recMsg.description}</p>

          {/* Corrective action for moderate/needs_support */}
          {result.status !== "strong" && (
            <div className="flex items-start gap-2 p-2 rounded-md bg-muted/50 mt-1">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground">Lowest: {result.lowestFactor.label}.</span>{" "}
                {CORRECTIVE_ACTIONS[result.lowestFactor.factor]}
              </p>
            </div>
          )}
        </div>

        {/* Footer stats */}
        <div className="flex items-center gap-3 pt-1 border-t border-border">
          <span className="text-xs text-muted-foreground">
            Streak: <span className="font-semibold text-foreground">{result.streakDays}d</span>
          </span>
          <span className="text-xs text-muted-foreground">
            Weekly: <span className="font-semibold text-foreground">{result.weeklyCompletionPct}%</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
