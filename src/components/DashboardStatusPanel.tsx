import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Flame, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useEngineScores } from "@/hooks/useEngineScores";

interface DashboardStatusPanelProps {
  onStartFast: () => void;
  onEndFast: () => void;
  isFasting: boolean;
  planName: string | null;
  streakDays: number;
  fastStartAt: string | null;
  targetHours: number | null;
}

export function DashboardStatusPanel({
  onStartFast,
  onEndFast,
  isFasting,
  planName,
  streakDays,
  fastStartAt,
  targetHours,
}: DashboardStatusPanelProps) {
  const { data: scores } = useEngineScores();
  const primary = scores?.[0];

  // Calculate next milestone text
  const nextMilestone = (() => {
    if (streakDays < 7) return `${7 - streakDays} days to 1-week streak`;
    if (streakDays < 14) return `${14 - streakDays} days to 2-week streak`;
    if (streakDays < 21) return `${21 - streakDays} days to 3-week streak`;
    if (streakDays < 30) return `${30 - streakDays} days to 30-day streak`;
    return "Maintaining strong consistency";
  })();

  return (
    <Card className="border-border/60">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Today's Structure</p>
            <h3 className="text-base font-bold mt-0.5">{planName || "No plan selected"}</h3>
          </div>
          <Badge
            variant="outline"
            className={`text-xs ${
              isFasting
                ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
            }`}
          >
            {isFasting ? "Fasting" : "Eating Window"}
          </Badge>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-semibold">{streakDays}d streak</span>
          </div>
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{nextMilestone}</span>
          </div>
        </div>

        <Button
          className="w-full h-12 text-base font-semibold"
          variant={isFasting ? "destructive" : "default"}
          onClick={isFasting ? onEndFast : onStartFast}
        >
          <Clock className="h-4 w-4 mr-2" />
          {isFasting ? "End Fast" : "Start Fast"}
        </Button>
      </CardContent>
    </Card>
  );
}
