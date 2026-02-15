import { ClientLayout } from "@/components/ClientLayout";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useClientFeatureSettings } from "@/hooks/useClientFeatureSettings";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, endOfWeek, isToday, parseISO } from "date-fns";

export default function ClientCoaching() {
  const navigate = useNavigate();
  const clientId = useEffectiveClientId();
  const { settings } = useClientFeatureSettings();

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

  // Fetch this week's workouts
  const { data: weekWorkouts } = useQuery({
    queryKey: ["client-week-workouts", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_workouts")
        .select("*, workout_plan:workout_plans(name)")
        .eq("client_id", clientId)
        .gte("scheduled_date", format(weekStart, "yyyy-MM-dd"))
        .lte("scheduled_date", format(weekEnd, "yyyy-MM-dd"))
        .order("scheduled_date");
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  // Fetch tasks
  const { data: tasks } = useQuery({
    queryKey: ["client-recent-tasks", clientId],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data, error } = await supabase
        .from("client_tasks")
        .select("*")
        .eq("client_id", clientId)
        .gte("due_date", format(sevenDaysAgo, "yyyy-MM-dd"))
        .order("due_date");
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  // Fetch habits
  const { data: habits } = useQuery({
    queryKey: ["client-habits-coaching", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_habits")
        .select("*")
        .eq("client_id", clientId)
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const daysOfWeek = ["M", "T", "W", "T", "F", "S", "S"];
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <ClientLayout>
      <div className="p-4 space-y-4">
        <h1 className="text-2xl font-bold text-foreground">Coaching</h1>

        {/* Training section */}
        {settings.training_enabled !== false && (
          <div>
            <h2 className="font-semibold text-foreground mb-2">Training <span className="text-muted-foreground font-normal text-sm">(this week)</span></h2>
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-7 gap-1 text-center mb-3">
                  {daysOfWeek.map((day, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <span className={`text-xs font-medium ${isToday(weekDates[i]) ? "text-primary" : "text-muted-foreground"}`}>{day}</span>
                      <span className={`text-sm font-semibold w-8 h-8 flex items-center justify-center rounded-full ${isToday(weekDates[i]) ? "bg-primary text-primary-foreground" : ""}`}>
                        {weekDates[i].getDate()}
                      </span>
                    </div>
                  ))}
                </div>
                {(!weekWorkouts || weekWorkouts.length === 0) ? (
                  <p className="text-muted-foreground text-center text-sm py-2">No training assigned yet</p>
                ) : (
                  <div className="space-y-2">
                    {weekWorkouts.map((w: any) => (
                      <div key={w.id} className="text-sm p-2 bg-muted rounded">
                        {w.workout_plan?.name} — {w.scheduled_date && format(parseISO(w.scheduled_date), "EEE")}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tasks section */}
        {settings.tasks_enabled !== false && (
          <div>
            <h2 className="font-semibold text-foreground mb-2">Task <span className="text-muted-foreground font-normal text-sm">(last 7 days)</span></h2>
            <Card>
              <CardContent className="p-4">
                {(!tasks || tasks.length === 0) ? (
                  <p className="text-muted-foreground text-sm">There are no tasks</p>
                ) : (
                  <div className="space-y-2">
                    {tasks.map((t: any) => (
                      <div key={t.id} className="text-sm flex items-center justify-between" onClick={() => navigate("/client/tasks")}>
                        <span>{t.name}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Habits section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-foreground">Habits</h2>
            <button className="text-primary text-sm font-medium" onClick={() => navigate("/client/habits")}>View all</button>
          </div>
          <Card>
            <CardContent className="p-4 space-y-3">
              {(!habits || habits.length === 0) ? (
                <p className="text-muted-foreground text-sm">No habits yet</p>
              ) : (
                habits.map((h: any) => (
                  <div
                    key={h.id}
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => navigate(`/client/habits/${h.id}`)}
                  >
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-lg">
                      {h.icon_url ? <img src={h.icon_url} className="h-8 w-8 rounded-full object-cover" /> : "🎯"}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground text-sm">{h.name}</p>
                      <p className="text-xs text-muted-foreground">{h.goal_value} {h.goal_unit} a day</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Meal Options / Nutrition preview */}
        {settings.food_journal_enabled !== false && (
          <div>
            <h2 className="font-semibold text-foreground mb-2">Meal Options</h2>
            <Card className="cursor-pointer" onClick={() => navigate("/client/meal-plan")}>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">View your meal plan →</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
