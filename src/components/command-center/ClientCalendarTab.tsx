import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, CheckCircle2, Circle, Trophy, Swords, MapPin, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, startOfWeek, endOfWeek } from "date-fns";

interface ClientCalendarTabProps {
  clientId: string;
  trainerId: string;
}

/**
 * Formats a UTC timestamp string as if it were local time.
 * The iCal sync stores times with +00:00 offset but the actual
 * times represent the local timezone (e.g. EST). So we strip
 * the timezone and display the raw hour/minute.
 */
function formatEventTime(isoString: string): string {
  // Extract hours and minutes directly from the ISO string
  const match = isoString.match(/T(\d{2}):(\d{2})/);
  if (!match) return "";
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${minutes.toString().padStart(2, "0")} ${ampm}`;
}

export function ClientCalendarTab({ clientId, trainerId }: ClientCalendarTabProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const { data: workouts } = useQuery({
    queryKey: ["cc-calendar-workouts", clientId, format(monthStart, "yyyy-MM")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_workouts")
        .select("*, workout_plans(id, name, category, duration_minutes, difficulty)")
        .eq("client_id", clientId)
        .gte("scheduled_date", format(monthStart, "yyyy-MM-dd"))
        .lte("scheduled_date", format(monthEnd, "yyyy-MM-dd"))
        .order("scheduled_date");
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const { data: tasks } = useQuery({
    queryKey: ["cc-calendar-tasks", clientId, format(monthStart, "yyyy-MM")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_tasks")
        .select("*")
        .eq("client_id", clientId)
        .gte("due_date", format(monthStart, "yyyy-MM-dd"))
        .lte("due_date", format(monthEnd, "yyyy-MM-dd"))
        .order("due_date");
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const { data: sportEvents } = useQuery({
    queryKey: ["cc-sport-events", clientId, format(monthStart, "yyyy-MM")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sport_schedule_events")
        .select("*")
        .eq("client_id", clientId)
        .gte("start_time", format(monthStart, "yyyy-MM-dd"))
        .lte("start_time", format(monthEnd, "yyyy-MM-dd'T'23:59:59"))
        .order("start_time");
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const { data: habits } = useQuery({
    queryKey: ["cc-calendar-habits", clientId, format(monthStart, "yyyy-MM")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_habits")
        .select("*")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .lte("start_date", format(monthEnd, "yyyy-MM-dd"));
      if (error) throw error;
      return data as any[];
    },
    enabled: !!clientId,
  });

  const getWorkoutsForDay = (day: Date) =>
    workouts?.filter((w) => w.scheduled_date && isSameDay(parseISO(w.scheduled_date), day)) || [];
  const getTasksForDay = (day: Date) =>
    tasks?.filter((t) => t.due_date && isSameDay(parseISO(t.due_date), day)) || [];
  const getSportEventsForDay = (day: Date) =>
    sportEvents?.filter((e: any) => e.start_time && isSameDay(parseISO(e.start_time), day)) || [];
  const getHabitsForDay = (day: Date) => {
    if (!habits) return [];
    const dateStr = format(day, "yyyy-MM-dd");
    return habits.filter((h: any) => {
      if (h.start_date > dateStr) return false;
      if (h.end_date && h.end_date < dateStr) return false;
      if (h.frequency === "daily") return true;
      const startDay = new Date(h.start_date + "T00:00:00").getDay();
      return day.getDay() === startDay;
    });
  };

  const selectedDayWorkouts = selectedDay ? getWorkoutsForDay(selectedDay) : [];
  const selectedDayTasks = selectedDay ? getTasksForDay(selectedDay) : [];
  const selectedDayHabits = selectedDay ? getHabitsForDay(selectedDay) : [];
  const selectedDaySportEvents = selectedDay ? getSportEventsForDay(selectedDay) : [];
  const hasSelectedDayEvents = selectedDayWorkouts.length + selectedDayTasks.length + selectedDayHabits.length + selectedDaySportEvents.length > 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{format(currentDate, "MMMM yyyy")}</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => { setCurrentDate(new Date()); setSelectedDay(new Date()); }}>
                <CalendarIcon className="h-4 w-4 mr-2" />
                Today
              </Button>
              <Button variant="outline" size="icon" onClick={() => { setCurrentDate(subMonths(currentDate, 1)); setSelectedDay(null); }}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => { setCurrentDate(addMonths(currentDate, 1)); setSelectedDay(null); }}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}

            {calendarDays.map((day) => {
              const dayWorkouts = getWorkoutsForDay(day);
              const dayTasks = getTasksForDay(day);
              const dayHabits = getHabitsForDay(day);
              const daySportEvents = getSportEventsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, new Date());
              const isSelected = selectedDay && isSameDay(day, selectedDay);
              const hasEvents = dayWorkouts.length + dayTasks.length + dayHabits.length + daySportEvents.length > 0;

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => setSelectedDay(day)}
                  className={`min-h-24 border rounded-lg p-2 cursor-pointer transition-colors ${
                    isCurrentMonth ? "bg-background hover:bg-muted/50" : "bg-muted/30 hover:bg-muted/50"
                  } ${isSelected ? "ring-2 ring-primary border-primary" : isToday ? "border-primary border-2" : "border-border"}`}
                >
                  <div className={`text-sm font-medium mb-1 ${
                    isCurrentMonth ? "text-foreground" : "text-muted-foreground"
                  }`}>
                    {format(day, "d")}
                  </div>

                  <div className="space-y-1">
                    {dayWorkouts.map((workout) => {
                      const isCompleted = !!workout.completed_at;
                      return (
                        <div
                          key={workout.id}
                          className={`w-full text-left text-xs p-1.5 rounded ${
                            isCompleted
                              ? "bg-success/20 text-success-foreground"
                              : "bg-primary/20 text-primary"
                          }`}
                        >
                          <div className="font-medium truncate">{workout.workout_plans?.name}</div>
                        </div>
                      );
                    })}
                    {dayTasks.map((task) => {
                      const isCompleted = !!task.completed_at;
                      return (
                        <div
                          key={task.id}
                          className={`w-full text-left text-xs p-1.5 rounded ${
                            isCompleted
                              ? "bg-success/20 text-success-foreground"
                              : "bg-amber-500/20 text-amber-900 dark:text-amber-200"
                          }`}
                        >
                          <div className="font-medium truncate flex items-center gap-1">
                            {isCompleted ? <CheckCircle2 className="h-3 w-3 shrink-0" /> : <Circle className="h-3 w-3 shrink-0" />}
                            {task.name}
                          </div>
                        </div>
                      );
                    })}
                    {dayHabits.map((habit: any) => {
                      const icon = habit.icon_url?.startsWith("emoji:") ? habit.icon_url.replace("emoji:", "") : "🎯";
                      return (
                        <div
                          key={habit.id}
                          className="w-full text-left text-xs p-1.5 rounded bg-violet-500/20 text-violet-900 dark:text-violet-200"
                        >
                          <div className="font-medium truncate">{icon} {habit.name}</div>
                        </div>
                      );
                    })}
                    {daySportEvents.map((event: any) => {
                      const isGame = event.event_type === "game";
                      return (
                        <div
                          key={event.id}
                          className={`w-full text-left text-xs p-1.5 rounded ${
                            isGame
                              ? "bg-rose-500/20 text-rose-900 dark:text-rose-200"
                              : "bg-sky-500/20 text-sky-900 dark:text-sky-200"
                          }`}
                        >
                          <div className="font-medium truncate flex items-center gap-1">
                            {isGame ? <Swords className="h-3 w-3 shrink-0" /> : <Trophy className="h-3 w-3 shrink-0" />}
                            {event.title}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mt-6 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-primary/20"></div>
              <span className="text-sm text-muted-foreground">Workout</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-amber-500/20"></div>
              <span className="text-sm text-muted-foreground">Task</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-violet-500/20"></div>
              <span className="text-sm text-muted-foreground">Habit</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-rose-500/20"></div>
              <span className="text-sm text-muted-foreground">Game</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-sky-500/20"></div>
              <span className="text-sm text-muted-foreground">Practice</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-success/20"></div>
              <span className="text-sm text-muted-foreground">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2 border-primary"></div>
              <span className="text-sm text-muted-foreground">Today</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Day Detail Panel */}
      {selectedDay && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{format(selectedDay, "EEEE, MMMM d, yyyy")}</CardTitle>
          </CardHeader>
          <CardContent>
            {!hasSelectedDayEvents ? (
              <p className="text-sm text-muted-foreground text-center py-4">No events scheduled for this day.</p>
            ) : (
              <div className="space-y-3">
                {selectedDaySportEvents.map((event: any) => {
                  const isGame = event.event_type === "game";
                  const startTime = formatEventTime(event.start_time);
                  const endTime = event.end_time ? formatEventTime(event.end_time) : null;
                  const timeDisplay = endTime && endTime !== startTime ? `${startTime} - ${endTime}` : startTime;

                  return (
                    <div
                      key={event.id}
                      className={`p-3 rounded-lg border ${
                        isGame
                          ? "bg-rose-500/10 border-rose-500/30"
                          : "bg-sky-500/10 border-sky-500/30"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {isGame ? <Swords className={`h-4 w-4 text-rose-500`} /> : <Trophy className={`h-4 w-4 text-sky-500`} />}
                        <span className="font-medium text-sm">{event.title}</span>
                        <Badge variant="outline" className="text-xs ml-auto">
                          {event.event_type === "game" ? "Game" : event.event_type === "practice" ? "Practice" : "Event"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                        {timeDisplay && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {timeDisplay}
                          </span>
                        )}
                        {event.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {event.location}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {selectedDayWorkouts.map((workout) => {
                  const isCompleted = !!workout.completed_at;
                  return (
                    <div
                      key={workout.id}
                      className={`p-3 rounded-lg border ${
                        isCompleted
                          ? "bg-success/10 border-success/30"
                          : "bg-primary/10 border-primary/30"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isCompleted && <CheckCircle2 className="h-4 w-4 text-success" />}
                        <span className="font-medium text-sm">{workout.workout_plans?.name}</span>
                        <Badge variant="outline" className="text-xs ml-auto">Workout</Badge>
                      </div>
                      {workout.workout_plans?.duration_minutes && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {workout.workout_plans.duration_minutes} min
                        </p>
                      )}
                    </div>
                  );
                })}

                {selectedDayTasks.map((task) => {
                  const isCompleted = !!task.completed_at;
                  return (
                    <div
                      key={task.id}
                      className={`p-3 rounded-lg border ${
                        isCompleted
                          ? "bg-success/10 border-success/30"
                          : "bg-amber-500/10 border-amber-500/30"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isCompleted ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Circle className="h-4 w-4 text-amber-500" />}
                        <span className="font-medium text-sm">{task.name}</span>
                        <Badge variant="outline" className="text-xs ml-auto">Task</Badge>
                      </div>
                      {task.description && (
                        <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                      )}
                    </div>
                  );
                })}

                {selectedDayHabits.map((habit: any) => {
                  const icon = habit.icon_url?.startsWith("emoji:") ? habit.icon_url.replace("emoji:", "") : "🎯";
                  return (
                    <div key={habit.id} className="p-3 rounded-lg border bg-violet-500/10 border-violet-500/30">
                      <div className="flex items-center gap-2">
                        <span>{icon}</span>
                        <span className="font-medium text-sm">{habit.name}</span>
                        <Badge variant="outline" className="text-xs ml-auto">Habit</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
