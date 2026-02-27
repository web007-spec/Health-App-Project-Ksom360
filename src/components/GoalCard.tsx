import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Calendar, CheckCircle2, TrendingDown, TrendingUp, Minus, Clock, AlertTriangle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { weightProgressPct, paceStatus, requiredWeightTomorrow } from "@/lib/weightGoalProgress";
import { daysRemaining, expectedPct } from "@/lib/goalDates";
import { GOAL_LIFE_EVENTS } from "@/components/CreateGoalDialog";

interface Goal {
  id: string;
  goal_type: string;
  title: string;
  description: string | null;
  target_value: number | null;   // goal weight
  current_value: number | null;  // start weight (locked after set)
  unit: string | null;
  start_date: string;
  target_date: string;
  status: string;
  completed_at: string | null;
  // optional enrichment from trainer view
  client_profile?: { full_name?: string };
  // today's weight from metric entries (passed in)
  today_weight?: number | null;
}

interface GoalCardProps {
  goal: Goal;
  onStatusChange?: (goalId: string, status: string) => void;
  isTrainer?: boolean;
  showClientName?: boolean;
}

const PACE_CONFIG = {
  ahead: { label: "Ahead of pace", color: "text-success", bg: "bg-success/10", Icon: TrendingDown },
  on_pace: { label: "On pace", color: "text-primary", bg: "bg-primary/10", Icon: Minus },
  behind: { label: "Behind pace", color: "text-destructive", bg: "bg-destructive/10", Icon: TrendingUp },
} as const;

export function GoalCard({ goal, onStatusChange, isTrainer = false, showClientName = false }: GoalCardProps) {
  const startWeight = goal.current_value;          // locked start weight
  const goalWeight = goal.target_value;
  const todayWeight = goal.today_weight ?? startWeight; // fall back to start if no weigh-in yet

  // Life event emoji
  const eventEntry = GOAL_LIFE_EVENTS.find(e => e.value === goal.goal_type);
  const emoji = eventEntry ? eventEntry.label.split(" ")[0] : "🎯";

  // Progress
  const progressPct =
    startWeight != null && goalWeight != null && todayWeight != null
      ? weightProgressPct(startWeight, todayWeight, goalWeight)
      : 0;

  const pace = startWeight != null && goalWeight != null
    ? paceStatus(progressPct, goal.start_date, goal.target_date)
    : "on_pace";

  const paceConf = PACE_CONFIG[pace];
  const PaceIcon = paceConf.Icon;

  const remaining = daysRemaining(goal.target_date);

  // Back-on-pace guidance
  const backOnPaceWeight =
    pace === "behind" && startWeight != null && goalWeight != null
      ? requiredWeightTomorrow(startWeight, goalWeight, goal.start_date, goal.target_date)
      : null;

  const isCompleted = goal.status === "completed";
  const isActive = goal.status === "active";

  const weightChange = todayWeight != null && startWeight != null ? startWeight - todayWeight : null;
  const totalNeeded = startWeight != null && goalWeight != null ? startWeight - goalWeight : null;

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all",
      isCompleted && "border-success/50"
    )}>
      {/* Top accent bar */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-1",
        isCompleted ? "bg-success" : "bg-primary"
      )} />

      <CardContent className="pt-5 pb-4 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-2xl leading-none">{emoji}</span>
            <div className="min-w-0">
              <p className="font-semibold text-base leading-tight truncate">{goal.title}</p>
              {showClientName && goal.client_profile?.full_name && (
                <p className="text-xs text-muted-foreground mt-0.5">{goal.client_profile.full_name}</p>
              )}
              {goal.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{goal.description}</p>
              )}
            </div>
          </div>

          {isCompleted ? (
            <Badge className="bg-success/15 text-success border-success/30 shrink-0">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Done
            </Badge>
          ) : (
            <Badge variant="outline" className="shrink-0 gap-1">
              <Clock className="h-3 w-3" />
              {remaining > 0 ? `${remaining}d left` : "Overdue"}
            </Badge>
          
          )}
        </div>

        {/* No start weight yet — pending state */}
        {startWeight == null && goalWeight != null && (
          <div className="rounded-lg bg-muted/40 border border-dashed border-muted-foreground/30 p-4 text-center space-y-1">
            <p className="text-sm font-medium text-muted-foreground">⚖️ Awaiting first weigh-in</p>
            <p className="text-xs text-muted-foreground">
              Log your weight on or after {format(parseISO(goal.start_date), "MMM d")} to activate progress tracking
            </p>
            <p className="text-sm font-semibold mt-2">Goal: <span className="text-primary">{goalWeight} lbs</span></p>
          </div>
        )}

        {/* Weight stats */}
        {startWeight != null && goalWeight != null && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-muted/40 p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Start</p>
              <p className="text-sm font-bold mt-0.5">{startWeight} lbs</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Today</p>
              <p className="text-sm font-bold mt-0.5">{todayWeight} lbs</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Goal</p>
              <p className="text-sm font-bold mt-0.5 text-primary">{goalWeight} lbs</p>
            </div>
          </div>
        )}

        {/* Progress bar */}
        {startWeight != null && goalWeight != null && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-semibold">{Math.round(progressPct)}%</span>
            </div>
            <Progress value={progressPct} className="h-2" />
            {totalNeeded != null && weightChange != null && (
              <p className="text-xs text-muted-foreground">
                {Math.abs(Math.round(weightChange * 10) / 10)} / {Math.abs(Math.round(totalNeeded * 10) / 10)} lbs {totalNeeded > 0 ? "lost" : "gained"}
              </p>
            )}
          </div>
        )}

        {/* Pace badge + back-on-pace tip */}
        {isActive && startWeight != null && goalWeight != null && (
          <div className="space-y-2">
            <div className={cn("flex items-center gap-2 rounded-lg px-3 py-2", paceConf.bg)}>
              <PaceIcon className={cn("h-4 w-4 shrink-0", paceConf.color)} />
              <span className={cn("text-sm font-medium", paceConf.color)}>{paceConf.label}</span>
            </div>

            {backOnPaceWeight != null && (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
                <p className="text-xs text-destructive">
                  To be on pace tomorrow: target <strong>{backOnPaceWeight} lbs</strong>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Dates */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(parseISO(goal.start_date), "MMM d, yyyy")}
          </span>
          <span>→</span>
          <span className="flex items-center gap-1">
            {format(parseISO(goal.target_date), "MMM d, yyyy")}
            <Calendar className="h-3 w-3" />
          </span>
        </div>

        {/* Trainer action */}
        {isTrainer && onStatusChange && isActive && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => onStatusChange(goal.id, "completed")}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Mark Completed
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
