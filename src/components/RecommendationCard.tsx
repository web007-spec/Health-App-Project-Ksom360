import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Shield, Zap } from "lucide-react";
import { useEngineScores } from "@/hooks/useEngineScores";
import {
  EngineType,
  ENGINE_LABELS,
  STATUS_LABELS,
  RECOMMENDATION_LABELS,
  StatusLabel,
  Recommendation,
} from "@/lib/recommendationEngine";

const ENGINE_ICONS: Record<EngineType, React.ReactNode> = {
  metabolic_stability: <Shield className="h-4 w-4" />,
  performance_readiness: <TrendingUp className="h-4 w-4" />,
  game_readiness: <Zap className="h-4 w-4" />,
};

const STATUS_COLORS: Record<StatusLabel, string> = {
  strong: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  moderate: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  needs_support: "bg-red-500/15 text-red-400 border-red-500/30",
};

const REC_COLORS: Record<Recommendation, string> = {
  advance: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  maintain: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  reduce: "bg-red-500/15 text-red-400 border-red-500/30",
};

const PROGRESS_COLORS: Record<StatusLabel, string> = {
  strong: "[&>div]:bg-emerald-500",
  moderate: "[&>div]:bg-amber-500",
  needs_support: "[&>div]:bg-red-500",
};

export function RecommendationCard() {
  const { data: scores, isLoading } = useEngineScores();

  if (isLoading || !scores || scores.length === 0) return null;

  // Show the primary engine based on user's engine mode (first result is always the user's active engine)
  const primary = scores[0];

  return (
    <Card className="border-border">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold">Readiness Status</p>
            <p className="text-xs text-muted-foreground">Based on your recent check-ins</p>
          </div>
          <Badge variant="outline" className={`text-xs ${REC_COLORS[primary.recommendation]}`}>
            {RECOMMENDATION_LABELS[primary.recommendation].label}
          </Badge>
        </div>

        <div className="space-y-3">
          {scores.map((result) => (
            <div key={result.engine} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {ENGINE_ICONS[result.engine]}
                  <span className="text-xs font-semibold">{ENGINE_LABELS[result.engine]}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{result.score}/100</span>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${STATUS_COLORS[result.status]}`}>
                    {STATUS_LABELS[result.status]}
                  </Badge>
                </div>
              </div>
              <Progress value={result.score} className={`h-1.5 ${PROGRESS_COLORS[result.status]}`} />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-border">
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              Streak: <span className="font-semibold text-foreground">{primary.streakDays}d</span>
            </span>
            <span className="text-xs text-muted-foreground">
              Weekly: <span className="font-semibold text-foreground">{primary.weeklyCompletionPct}%</span>
            </span>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground italic">
          {RECOMMENDATION_LABELS[primary.recommendation].description}
        </p>
      </CardContent>
    </Card>
  );
}
