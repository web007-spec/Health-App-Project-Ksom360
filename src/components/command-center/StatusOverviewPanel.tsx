import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Gauge, Layers, Target, BarChart3, Activity } from "lucide-react";
import type { StatusLabel } from "@/lib/recommendationEngine";

interface StatusOverviewPanelProps {
  clientId: string;
}

const STATUS_COLORS: Record<string, string> = {
  strong: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  moderate: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  needs_support: "bg-red-500/15 text-red-400 border-red-500/30",
};

const ENGINE_COLORS: Record<string, string> = {
  metabolic: "bg-teal-500 text-white border-teal-600",
  performance: "bg-orange-500 text-white border-orange-600",
  athletic: "bg-blue-500 text-white border-blue-600",
};

const STATUS_LABELS: Record<string, string> = {
  strong: "Strong",
  moderate: "Moderate",
  needs_support: "Needs Support",
};

const ENGINE_LABELS: Record<string, string> = {
  metabolic: "Metabolic",
  performance: "Performance",
  athletic: "Athletic",
};

function getLevelBand(level: number): string {
  if (level >= 7) return "7 (Mastery)";
  if (level >= 4) return `${level} (4-6)`;
  return `${level} (1-3)`;
}

export function StatusOverviewPanel({ clientId }: StatusOverviewPanelProps) {
  const { data } = useQuery({
    queryKey: ["cc-status-overview", clientId],
    queryFn: async () => {
      const [settingsRes, recRes] = await Promise.all([
        supabase
          .from("client_feature_settings")
          .select("engine_mode, current_level")
          .eq("client_id", clientId)
          .maybeSingle(),
        supabase
          .from("recommendation_events")
          .select("*")
          .eq("client_id", clientId)
          .order("date", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      return {
        engineMode: settingsRes.data?.engine_mode || "metabolic",
        currentLevel: settingsRes.data?.current_level || 1,
        rec: recRes.data,
      };
    },
  });

  if (!data) return null;

  const { engineMode, currentLevel, rec } = data;
  const status = rec?.status || "moderate";
  const score = rec?.score_total || 0;
  const lowestFactor = rec?.lowest_factor || "—";
  const trend = rec?.score_total
    ? rec.score_total >= 80 ? "up" : rec.score_total >= 60 ? "flat" : "down"
    : "flat";

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "text-emerald-400" : trend === "down" ? "text-red-400" : "text-amber-400";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Gauge className="h-4 w-4" />
          Status Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="rounded-lg border border-border p-3 space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Engine</p>
            <Badge variant="outline" className={`text-xs capitalize font-semibold ${ENGINE_COLORS[engineMode] || ""}`}>
              {ENGINE_LABELS[engineMode] || engineMode}
            </Badge>
          </div>

          <div className="rounded-lg border border-border p-3 space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground flex items-center gap-1">
              <Layers className="h-3 w-3" /> Level
            </p>
            <p className="text-sm font-bold">{getLevelBand(currentLevel)}</p>
          </div>

          <div className="rounded-lg border border-border p-3 space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground flex items-center gap-1">
              <BarChart3 className="h-3 w-3" /> Score
            </p>
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold">{score}/100</p>
              <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[status] || ""}`}>
                {STATUS_LABELS[status] || status}
              </Badge>
            </div>
          </div>

          <div className="rounded-lg border border-border p-3 space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground flex items-center gap-1">
              <Target className="h-3 w-3" /> Lowest Factor
            </p>
            <p className="text-sm font-medium capitalize">{lowestFactor.replace("_", " ")}</p>
          </div>

          <div className="rounded-lg border border-border p-3 space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground flex items-center gap-1">
              <Activity className="h-3 w-3" /> Completion
            </p>
            <p className="text-sm font-bold">{rec ? "—" : "—"}%</p>
          </div>

          <div className="rounded-lg border border-border p-3 space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Trend</p>
            <div className="flex items-center gap-1.5">
              <TrendIcon className={`h-4 w-4 ${trendColor}`} />
              <p className={`text-sm font-medium capitalize ${trendColor}`}>{trend}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
