import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";
import {
  ENGINE_OUTCOME_LABELS,
  FACTOR_DISPLAY_LABELS,
} from "@/lib/calibrationEngine";

interface ImpactTrendsSectionProps {
  trainerId: string;
}

export function ImpactTrendsSection({ trainerId }: ImpactTrendsSectionProps) {
  const { data: impactData, isLoading } = useQuery({
    queryKey: ["factor-impact-trends", trainerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("factor_impact_history")
        .select("*")
        .eq("trainer_id", trainerId)
        .order("week_number", { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) return null;

      // Group by engine, then pick latest per factor
      const engines = ["metabolic", "performance", "athletic"] as const;
      const result: Record<string, {
        factor: string;
        correlation: number;
        trend: string;
        sampleSize: number;
        isActive: boolean;
      }[]> = {};

      for (const engine of engines) {
        const engineRows = data.filter((r) => r.engine_mode === engine);
        const latestByFactor = new Map<string, typeof engineRows[0]>();

        for (const row of engineRows) {
          if (!latestByFactor.has(row.factor_name) ||
              row.week_number > latestByFactor.get(row.factor_name)!.week_number) {
            latestByFactor.set(row.factor_name, row);
          }
        }

        result[engine] = Array.from(latestByFactor.values()).map((r) => ({
          factor: r.factor_name,
          correlation: Number(r.outcome_correlation) || 0,
          trend: r.trend_direction || "flat",
          sampleSize: r.sample_size || 0,
          isActive: (r.sample_size || 0) >= 20,
        })).sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
      }

      return result;
    },
    enabled: !!trainerId,
    staleTime: 10 * 60 * 1000,
  });

  const TrendIcon = ({ trend }: { trend: string }) => {
    if (trend === "up") return <TrendingUp className="h-3.5 w-3.5 text-green-600" />;
    if (trend === "down") return <TrendingDown className="h-3.5 w-3.5 text-red-600" />;
    return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  const correlationColor = (corr: number) => {
    const abs = Math.abs(corr);
    if (abs >= 0.6) return "text-green-600 dark:text-green-400";
    if (abs >= 0.3) return "text-amber-600 dark:text-amber-400";
    return "text-muted-foreground";
  };

  const correlationLabel = (corr: number) => {
    const abs = Math.abs(corr);
    if (abs >= 0.6) return "Strong";
    if (abs >= 0.3) return "Moderate";
    return "Weak";
  };

  // If no data yet, show a placeholder
  if (!impactData && !isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Impact Trends
          </CardTitle>
          <CardDescription>
            Factor-to-outcome correlations will appear here once enough data is collected (20+ weeks per factor).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Collecting data — minimum 20 samples needed per factor.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) return null;

  const engines = (["metabolic", "performance", "athletic"] as const).filter(
    (e) => impactData?.[e] && impactData[e].length > 0,
  );

  if (engines.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Impact Trends
          </CardTitle>
          <CardDescription>
            Factor-to-outcome correlations appear here once enough data is collected.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No impact data available yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Impact Trends
        </CardTitle>
        <CardDescription>
          Which factor improvements most predict real outcomes — coach-only analytics.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {engines.map((engine) => {
          const factors = impactData![engine];
          const outcomeLabel = ENGINE_OUTCOME_LABELS[engine];

          return (
            <div key={engine} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium capitalize">{engine}</span>
                <Badge variant="outline" className="text-[10px]">{outcomeLabel}</Badge>
              </div>

              {factors.map((f) => (
                <div key={f.factor} className="flex items-center gap-3 py-1.5">
                  <span className="text-xs w-28 truncate text-muted-foreground">
                    {FACTOR_DISPLAY_LABELS[f.factor] || f.factor}
                  </span>
                  <div className="flex-1">
                    <Progress
                      value={Math.abs(f.correlation) * 100}
                      className="h-1.5"
                    />
                  </div>
                  <span className={`text-xs font-medium w-14 text-right ${correlationColor(f.correlation)}`}>
                    {f.isActive ? correlationLabel(f.correlation) : "—"}
                  </span>
                  <TrendIcon trend={f.trend} />
                  <span className="text-[10px] text-muted-foreground w-8 text-right">
                    n={f.sampleSize}
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
