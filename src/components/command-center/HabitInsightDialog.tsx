import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, eachDayOfInterval, parseISO, differenceInDays, startOfMonth, endOfMonth, isAfter, isBefore, isSameDay } from "date-fns";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Flame, Trophy, BarChart3, CheckCircle2 } from "lucide-react";

interface HabitInsightDialogProps {
  habit: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HabitInsightDialog({ habit, open, onOpenChange }: HabitInsightDialogProps) {
  const [viewMonth, setViewMonth] = useState(new Date());

  const { data: completions } = useQuery({
    queryKey: ["habit-completions", habit?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("habit_completions" as any)
        .select("*")
        .eq("habit_id", habit.id)
        .order("completion_date", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!habit?.id && open,
  });

  if (!habit) return null;

  const completionDates = new Set(completions?.map((c: any) => c.completion_date) || []);
  
  const startDate = parseISO(habit.start_date);
  const endDate = habit.end_date ? parseISO(habit.end_date) : new Date();
  const today = new Date();
  const effectiveEnd = isBefore(endDate, today) ? endDate : today;

  // Calculate total days in range
  const totalDays = Math.max(1, differenceInDays(effectiveEnd, startDate) + 1);
  const completedDays = completions?.length || 0;
  const dailyAverage = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

  // Calculate streaks
  let currentStreak = 0;
  let bestStreak = 0;
  let tempStreak = 0;

  if (completions && completions.length > 0) {
    const allDays = eachDayOfInterval({ start: startDate, end: effectiveEnd });
    
    for (const day of allDays) {
      const dateStr = format(day, "yyyy-MM-dd");
      if (completionDates.has(dateStr)) {
        tempStreak++;
        bestStreak = Math.max(bestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }
    currentStreak = tempStreak;
  }

  // Calendar rendering
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = monthStart.getDay() === 0 ? 6 : monthStart.getDay() - 1;

  const iconDisplay = habit.icon_url?.startsWith("emoji:")
    ? habit.icon_url.replace("emoji:", "")
    : "🎯";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-xl">{iconDisplay}</span>
            {habit.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Goal info */}
          <div className="text-sm text-muted-foreground text-center">
            {habit.goal_value} {habit.goal_unit} per {habit.frequency === "daily" ? "day" : "week"}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30">
              <Flame className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-lg font-bold text-foreground">{currentStreak} {currentStreak === 1 ? "day" : "days"}</p>
                <p className="text-xs text-muted-foreground">Current Streak</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/30">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-lg font-bold text-foreground">{bestStreak} {bestStreak === 1 ? "day" : "days"}</p>
                <p className="text-xs text-muted-foreground">Best Streak</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-lg font-bold text-foreground">{dailyAverage}%</p>
                <p className="text-xs text-muted-foreground">Daily Average</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-lg font-bold text-foreground">{completedDays}/{totalDays}</p>
                <p className="text-xs text-muted-foreground">Completed Days</p>
              </div>
            </div>
          </div>

          {/* Calendar view */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Button variant="ghost" size="icon" onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-semibold">{format(viewMonth, "MMMM yyyy")}</span>
              <Button variant="ghost" size="icon" onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {["MO", "TU", "WE", "TH", "FR", "SA", "SU"].map((d) => (
                <div key={d} className="text-[10px] font-semibold text-muted-foreground py-1">{d}</div>
              ))}
              {Array.from({ length: startDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {monthDays.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const isCompleted = completionDates.has(dateStr);
                const isInRange = !isBefore(day, startDate) && !isAfter(day, effectiveEnd);
                const isCurrentDay = isSameDay(day, today);

                return (
                  <div
                    key={dateStr}
                    className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center text-xs ${
                      isCompleted
                        ? "bg-green-500 text-white font-bold"
                        : isCurrentDay
                        ? "ring-2 ring-primary text-foreground"
                        : isInRange
                        ? "text-foreground"
                        : "text-muted-foreground/40"
                    }`}
                  >
                    {format(day, "d")}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Period info */}
          <div className="text-xs text-muted-foreground text-center border-t pt-3">
            {format(startDate, "MMM d, yyyy")} — {habit.end_date ? format(parseISO(habit.end_date), "MMM d, yyyy") : "No end date"}
            {" · "}{habit.frequency === "daily" ? "Daily" : "Weekly"}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
