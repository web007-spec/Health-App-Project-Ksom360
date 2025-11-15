import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Target, TrendingUp, Calendar, Award, Play, Pause, CheckCircle2 } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

interface Goal {
  id: string;
  goal_type: string;
  title: string;
  description: string | null;
  target_value: number | null;
  current_value: number | null;
  unit: string | null;
  start_date: string;
  target_date: string;
  status: string;
  completed_at: string | null;
}

interface GoalCardProps {
  goal: Goal;
  onUpdateProgress?: (goalId: string, value: number) => void;
  onStatusChange?: (goalId: string, status: string) => void;
  isTrainer?: boolean;
}

export function GoalCard({ goal, onUpdateProgress, onStatusChange, isTrainer = false }: GoalCardProps) {
  const progress = goal.target_value
    ? Math.min(Math.round((Number(goal.current_value || 0) / goal.target_value) * 100), 100)
    : 0;

  const daysRemaining = differenceInDays(parseISO(goal.target_date), new Date());
  const daysTotal = differenceInDays(parseISO(goal.target_date), parseISO(goal.start_date));
  const timeProgress = Math.max(0, Math.min(100, ((daysTotal - daysRemaining) / daysTotal) * 100));

  const statusConfig = {
    active: { color: "bg-primary", label: "Active", icon: Play },
    completed: { color: "bg-success", label: "Completed", icon: CheckCircle2 },
    paused: { color: "bg-muted", label: "Paused", icon: Pause },
    abandoned: { color: "bg-destructive", label: "Abandoned", icon: Target },
  };

  const config = statusConfig[goal.status as keyof typeof statusConfig] || statusConfig.active;
  const StatusIcon = config.icon;

  const goalTypeLabels = {
    weight: "Weight",
    body_fat: "Body Fat",
    workouts: "Workouts",
    strength: "Strength",
    custom: "Custom",
  };

  return (
    <Card className={cn("relative overflow-hidden", goal.status === "completed" && "border-success")}>
      {/* Status indicator bar */}
      <div className={cn("absolute top-0 left-0 right-0 h-1", config.color)} />

      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{goalTypeLabels[goal.goal_type as keyof typeof goalTypeLabels]}</Badge>
              <Badge className={cn("gap-1", config.color)}>
                <StatusIcon className="h-3 w-3" />
                {config.label}
              </Badge>
            </div>
            <CardTitle className="text-xl">{goal.title}</CardTitle>
            {goal.description && <CardDescription>{goal.description}</CardDescription>}
          </div>
          
          {isTrainer && onStatusChange && goal.status === "active" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onStatusChange(goal.id, "completed")}
            >
              Mark Complete
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Section */}
        {goal.target_value && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">
                {goal.current_value || 0} / {goal.target_value} {goal.unit}
              </span>
            </div>
            <Progress value={progress} className="h-3" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{progress}% Complete</span>
              {progress >= 100 && (
                <span className="text-success font-medium flex items-center gap-1">
                  <Award className="h-3 w-3" />
                  Goal Achieved!
                </span>
              )}
            </div>
          </div>
        )}

        {/* Time Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Timeline
            </span>
            <span className="font-medium">
              {daysRemaining > 0 ? `${daysRemaining} days left` : "Deadline passed"}
            </span>
          </div>
          <Progress value={timeProgress} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Started {format(parseISO(goal.start_date), "MMM d, yyyy")}</span>
            <span>Target: {format(parseISO(goal.target_date), "MMM d, yyyy")}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="p-3 rounded-lg border bg-muted/30">
            <p className="text-xs text-muted-foreground mb-1">Current</p>
            <p className="text-lg font-bold">
              {goal.current_value || 0} {goal.unit}
            </p>
          </div>
          <div className="p-3 rounded-lg border bg-muted/30">
            <p className="text-xs text-muted-foreground mb-1">Target</p>
            <p className="text-lg font-bold">
              {goal.target_value} {goal.unit}
            </p>
          </div>
        </div>

        {/* Action Buttons for Clients */}
        {!isTrainer && onUpdateProgress && goal.status === "active" && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              const newValue = prompt(`Enter your current ${goal.unit} value:`);
              if (newValue && !isNaN(parseFloat(newValue))) {
                onUpdateProgress(goal.id, parseFloat(newValue));
              }
            }}
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Update Progress
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
