import { useState } from "react";
import { format, addDays, isToday, isSameDay } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Dumbbell, Swords, Trophy, CheckSquare, Droplets, MapPin } from "lucide-react";
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
  const endDate = format(addDays(today, daysAhead), "yyyy-MM-dd");
  const startDate = format(today, "yyyy-MM-dd");

  // Fetch workouts, sport events, tasks, habits
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

  // Fetch custom cards for preview
  const { data: restDayCard } = useQuery({
    queryKey: ["day-strip-rest-card", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_rest_day_cards" as any)
        .select("*")
        .eq("client_id", clientId)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!clientId && trainingEnabled,
  });

  const { data: sportDayCards } = useQuery({
    queryKey: ["day-strip-sport-cards", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_sport_day_cards" as any)
        .select("*")
        .eq("client_id", clientId);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!clientId,
  });

  const practiceCard = sportDayCards?.find((c: any) => c.card_type === "practice");
  const gameCard = sportDayCards?.find((c: any) => c.card_type === "game");

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

  function formatEventTime(isoString: string): string {
    const match = isoString.match(/T(\d{2}):(\d{2})/);
    if (!match) return "";
    const hours = parseInt(match[1], 10);
    const displayHour = hours % 12 || 12;
    const ampm = hours >= 12 ? "PM" : "AM";
    return `${displayHour}:${match[2]} ${ampm}`;
  }

  const viewDate = selectedDate || today;
  const viewData = getDayData(viewDate);
  const isViewingToday = isToday(viewDate);
  const isRestDay = viewData.workouts.length === 0 && viewData.sportEvents.length === 0;
  const hasAnything = viewData.workouts.length > 0 || viewData.sportEvents.length > 0 || viewData.tasks.length > 0 || viewData.habits.length > 0;

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

      {/* Selected day preview (future days only) */}
      {selectedDate && !isViewingToday && (
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {format(viewDate, "EEEE, MMM d")}
          </p>

          {/* Sport Event Cards — full-bleed, matching dashboard */}
          {viewData.sportEvents.map((event: any) => {
            const isGame = event.event_type === "game" || event.event_type === "event";
            const customCard = isGame ? gameCard : practiceCard;
            const EventIcon = isGame ? Swords : Trophy;
            const label = isGame ? "Game Day" : "Practice";
            const startTime = formatEventTime(event.start_time);
            const endTime = event.end_time ? formatEventTime(event.end_time) : null;
            const timeDisplay = endTime && endTime !== startTime ? `${startTime} - ${endTime}` : startTime;

            return (
              <Card key={event.id} className="overflow-hidden">
                <div className={cn(
                  "relative h-56",
                  isGame ? "bg-gradient-to-br from-rose-500/20 to-rose-500/5" : "bg-gradient-to-br from-sky-500/20 to-sky-500/5"
                )}>
                  {customCard?.image_url ? (
                    <img src={customCard.image_url} alt={label} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <EventIcon className={cn("h-16 w-16", isGame ? "text-rose-400/30" : "text-sky-400/30")} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">{label}</p>
                    <p className="text-lg font-bold text-white">{event.title}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-sm text-white/80">{timeDisplay}</p>
                      {event.location && (
                        <p className="text-sm text-white/80 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </p>
                      )}
                    </div>
                    {customCard?.message && (
                      <p className="text-xs text-white/70 mt-1">{customCard.message}</p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}

          {/* Workout Cards — full-bleed, matching dashboard */}
          {viewData.workouts.map((w: any) => (
            <Card key={w.id} className="overflow-hidden">
              <div className="relative h-56 bg-gradient-to-br from-primary/20 to-primary/5">
                {w.workout_plan?.image_url ? (
                  <img src={w.workout_plan.image_url} alt={w.workout_plan.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Dumbbell className="h-16 w-16 text-primary/20" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">Workout</p>
                  <p className="text-lg font-bold text-white">{w.workout_plan?.name || "Workout"}</p>
                </div>
              </div>
            </Card>
          ))}

          {/* Rest Day Card — full-bleed, matching dashboard */}
          {isRestDay && trainingEnabled && (
            <Card className="overflow-hidden">
              {restDayCard?.image_url ? (
                <div className="relative h-56">
                  <img src={restDayCard.image_url} alt="Rest day" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">Rest Day</p>
                    <p className="text-base font-bold text-white">
                      {restDayCard?.message || "No workouts scheduled. Enjoy your rest!"}
                    </p>
                  </div>
                </div>
              ) : (
                <CardContent className="p-6 text-center">
                  <Dumbbell className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-lg font-semibold">Rest Day</p>
                  <p className="text-sm text-muted-foreground">
                    {restDayCard?.message || "No workouts scheduled. Enjoy your rest!"}
                  </p>
                </CardContent>
              )}
            </Card>
          )}

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

          {/* Nothing scheduled at all */}
          {!hasAnything && !trainingEnabled && (
            <p className="text-sm text-muted-foreground py-2">Nothing scheduled</p>
          )}
        </div>
      )}
    </div>
  );
}
