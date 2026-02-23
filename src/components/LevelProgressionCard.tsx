import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, CheckCircle2, Circle, Star, ArrowUp } from "lucide-react";
import { useState } from "react";
import { useLevelProgression } from "@/hooks/useLevelProgression";
import { useEngineMode } from "@/hooks/useEngineMode";
import { getLevelRange } from "@/lib/levelProgression";
import { toast } from "sonner";

export function LevelProgressionCard() {
  const { progression, isLoading, advanceLevel, isAdvancing } = useLevelProgression();
  const { engineMode } = useEngineMode();
  const [criteriaOpen, setCriteriaOpen] = useState(false);

  if (isLoading || !progression) return null;

  const handleAdvance = () => {
    advanceLevel(undefined, {
      onSuccess: () => toast.success(`Advanced to Level ${progression.currentLevel + 1}!`),
      onError: () => toast.error("Failed to advance level"),
    });
  };

  return (
    <Card className="border-border overflow-hidden">
      {/* Level Up Banner */}
      {progression.isEligible && (
        <div className="bg-gradient-to-r from-amber-500/20 to-primary/20 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowUp className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-semibold text-foreground">Level Up Available!</span>
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="h-7 text-xs"
            onClick={handleAdvance}
            disabled={isAdvancing}
          >
            {isAdvancing ? "Advancing..." : `Advance to Level ${progression.currentLevel + 1}`}
          </Button>
        </div>
      )}

      <CardContent className="p-4 space-y-3">
        {/* Level badge + name */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-lg ${
                progression.isMastery
                  ? "bg-gradient-to-br from-amber-500/20 to-yellow-500/20 text-amber-400"
                  : "bg-primary/10 text-primary"
              }`}>
                {progression.isMastery ? <Star className="h-5 w-5" /> : progression.currentLevel}
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">
                {progression.isMastery ? "Mastery Mode" : `Level ${progression.currentLevel}`}
              </p>
              <p className="text-xs text-muted-foreground">{progression.levelName}</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px]">
            {getLevelRange(progression.currentLevel, engineMode)}
          </Badge>
        </div>

        {/* Progress to next level */}
        {!progression.isMastery && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress to Level {progression.currentLevel + 1}</span>
              <span className="font-semibold text-foreground">{progression.completionPct}%</span>
            </div>
            <Progress
              value={progression.completionPct}
              className={`h-1.5 ${
                progression.completionPct >= 100
                  ? "[&>div]:bg-emerald-500"
                  : progression.completionPct >= 60
                  ? "[&>div]:bg-amber-500"
                  : "[&>div]:bg-primary"
              }`}
            />
            <p className="text-[10px] text-muted-foreground">
              Day {progression.daysInLevel} in current level
            </p>
          </div>
        )}

        {progression.isMastery && (
          <p className="text-xs text-muted-foreground">
            Self-directed within guardrails. Optimization over correction.
          </p>
        )}

        {/* Criteria checklist */}
        {!progression.isMastery && progression.criteria.length > 0 && (
          <Collapsible open={criteriaOpen} onOpenChange={setCriteriaOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full text-xs text-muted-foreground hover:text-foreground transition-colors pt-1">
              <span>Advancement criteria</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${criteriaOpen ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-1.5">
              {progression.criteria.map((c) => (
                <div key={c.label} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {c.met ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-muted-foreground/50" />
                    )}
                    <span className={c.met ? "text-foreground" : "text-muted-foreground"}>{c.label}</span>
                  </div>
                  <span className={`font-mono text-[10px] ${c.met ? "text-emerald-400" : "text-muted-foreground"}`}>
                    {c.current} / {c.required}
                  </span>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
