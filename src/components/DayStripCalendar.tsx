import { useState } from "react";
import { format, addDays, isToday, isSameDay } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Dumbbell, Swords, Trophy, CheckSquare, Droplets } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface DayStripCalendarProps {
  clientId: string;
  daysAhead: number;
  trainingEnabled: boolean;
  tasksEnabled: boolean;
}

interface DayData {
  workouts: any[];
  sportEvents: any[];
  tasks: any[];
  habits: any[];
}

export function DayStripCalendar({ clientId, daysAhead, trainingEnabled, tasksEnabled }: DayStripCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const today = new Date();

  const days = Array.from({ length: daysAhead + 1 }, (_, i) => addDays(today, i));

  // Fetch workouts for the range
  const endDate = format(addDays(today, daysAhead), "yyyy-MM-dd");
  const startDate = format(today, "yyyy-MM-dd");

  const { data: workouts } = useQuery({
    queryKey: ["day-strip-workouts", clientId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_workouts")
        .select("*, workout_plan:workout_plans(*)")
        .eq("client_id", clientId)
        .gte("scheduled_date", startDate)
        .lte("scheduled_date", endDate)
        .is("completed_at", null);
      if (error) throw error;
      return data;
    },
    enabled: !!clientId && trainingEnabled,
  });

  const { data: sportEvents } = useQuery({
    queryKey: ["day-strip-sport-events", clientId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sport_schedule_events")
        .select("*")
        .eq("client_id", clientId)
        .gte("start_time", `${startDate}T00:00:00`)
        .lte("start_time", `${endDate}T23:59:59`)
        .order("start_time", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!clientId,
  });

  const { data: tasks } = useQuery({
    queryKey: ["day-strip-tasks", clientId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_tasks")
        .select("*")
        .eq("client_id", clientId)
        .gte("due_date", startDate)
        .lte("due_date", endDate)
        .is("completed_at", null);
      if (error) throw error;
      return data;
    },
    enabled: !!clientId && tasksEnabled,
  });

  const { data: habits } = useQuery({
    queryKey: ["day-strip-habits", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_habits")
        .select("*")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .lte("start_date", endDate);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!clientId && tasksEnabled,
  });

  function getDayData(date: Date): DayData {
    const dateStr = format(date, "yyyy-MM-dd");
    return {
      workouts: workouts?.filter(w => w.scheduled_date === dateStr) || [],
      sportEvents: sportEvents?.filter(e => e.start_time?.startsWith(dateStr)) || [],
      tasks: tasks?.filter(t => t.due_date === dateStr) || [],
      habits: habits?.filter(h => {
        if (h.end_date && h.end_date < dateStr) return false;
        if (h.start_date > dateStr) return false;
        if (h.frequency === "daily") return true;
        const startDay = new Date(h.start_date + "T00:00:00").getDay();
        return date.getDay() === startDay;
      }) || [],
    };
  }

  function hasDots(date: Date) {
    const data = getDayData(date);
    return {
      hasWorkout: data.workouts.length > 0,
      hasSport: data.sportEvents.length > 0,
      hasTask: data.tasks.length > 0 || data.habits.length > 0,
    };
  }

  const viewDate = selectedDate || today;
  const viewData = getDayData(viewDate);
  const isViewingToday = isToday(viewDate);
  const hasAnything = viewData.workouts.length > 0 || viewData.sportEvents.length > 0 || viewData.tasks.length > 0 || viewData.habits.length > 0;

  function formatEventTime(isoString: string): string {
    const match = isoString.match(/T(\d{2}):(\d{2})/);
    if (!match) return "";
    const hours = parseInt(match[1], 10);
    const displayHour = hours % 12 || 12;
    const ampm = hours >= 12 ? "PM" : "AM";
    return `${displayHour}:${match[2]} ${ampm}`;
  }

  return (
    <div className="space-y-3">
      {/* Day Strip */}
      <div className="flex gap-1 justify-between">
        {days.map((day) => {
          const isSelected = selectedDate ? isSameDay(day, selectedDate) : isToday(day);
          const isTodayDay = isToday(day);
          const dots = hasDots(day);
          const hasAny = dots.hasWorkout || dots.hasSport || dots.hasTask;

          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelectedDate(isTodayDay && !selectedDate ? null : day)}
              className={cn(
                "flex flex-col items-center gap-1 py-2 px-2 rounded-xl transition-all flex-1 min-w-0",
                isSelected
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "hover:bg-muted"
              )}
            >
              <span className={cn(
                "text-[10px] font-semibold uppercase tracking-wide",
                isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
              )}>
                {format(day, "EEE")}
              </span>
              <span className={cn(
                "text-lg font-bold leading-none",
                isSelected ? "text-primary-foreground" : "text-foreground"
              )}>
                {format(day, "d")}
              </span>
              {/* Activity dots */}
              <div className="flex gap-0.5 h-2 items-center">
                {dots.hasWorkout && (
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    isSelected ? "bg-primary-foreground/70" : "bg-primary"
                  )} />
                )}
                {dots.hasSport && (
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    isSelected ? "bg-primary-foreground/70" : "bg-rose-500"
                  )} />
                )}
                {dots.hasTask && (
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    isSelected ? "bg-primary-foreground/70" : "bg-amber-500"
                  )} />
                )}
                {!hasAny && <div className="w-1.5 h-1.5" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected day preview (only for future days) */}
      {selectedDate && !isViewingToday && (
        <Card className="border-dashed">
          <CardContent className="p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {format(viewDate, "EEEE, MMM d")}
            </p>

            {!hasAnything && (
              <p className="text-sm text-muted-foreground py-2">Nothing scheduled</p>
            )}

            {/* Sport Events */}
            {viewData.sportEvents.map((event: any) => {
              const isGame = event.event_type === "game";
              return (
                <div
                  key={event.id}
                  className={cn(
                    "flex items-center gap-3 rounded-lg p-3",
                    isGame ? "bg-rose-500/10 border border-rose-500/20" : "bg-sky-500/10 border border-sky-500/20"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-lg",
                    isGame ? "bg-rose-500/20" : "bg-sky-500/20"
                  )}>
                    {isGame ? <Swords className="h-4 w-4 text-rose-500" /> : <Trophy className="h-4 w-4 text-sky-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {event.title || (isGame ? "Game" : "Practice")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatEventTime(event.start_time)} - {formatEventTime(event.end_time)}
                      {event.location ? ` · ${event.location}` : ""}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* Workouts */}
            {viewData.workouts.map((w: any) => (
              <div key={w.id} className="flex items-center gap-3 rounded-lg p-3 bg-primary/5 border border-primary/10">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Dumbbell className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {w.workout_plan?.name || "Workout"}
                  </p>
                  <p className="text-xs text-muted-foreground">Scheduled workout</p>
                </div>
              </div>
            ))}

            {/* Tasks */}
            {viewData.tasks.map((t: any) => (
              <div key={t.id} className="flex items-center gap-3 rounded-lg p-3 bg-amber-500/5 border border-amber-500/10">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <CheckSquare className="h-4 w-4 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{t.name}</p>
                  <p className="text-xs text-muted-foreground">Task</p>
                </div>
              </div>
            ))}

            {/* Habits */}
            {viewData.habits.length > 0 && (
              <div className="flex items-center gap-3 rounded-lg p-3 bg-emerald-500/5 border border-emerald-500/10">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Droplets className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">
                    {viewData.habits.length} habit{viewData.habits.length > 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {viewData.habits.map((h: any) => h.name).join(", ")}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
