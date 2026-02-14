import { ClientLayout } from "@/components/ClientLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export default function ClientHabits() {
  const clientId = useEffectiveClientId();
  const navigate = useNavigate();
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: habits } = useQuery({
    queryKey: ["client-habits-all", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_habits")
        .select("*")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!clientId,
  });

  const { data: todayCompletions } = useQuery({
    queryKey: ["client-habit-completions-today", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("habit_completions")
        .select("*")
        .eq("client_id", clientId)
        .eq("completion_date", today);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!clientId,
  });

  return (
    <ClientLayout>
      <div className="min-h-screen bg-muted/30">
        <div className="flex items-center gap-3 px-4 py-3 bg-background border-b">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold flex-1 text-center">Habits</h1>
          <div className="w-9" />
        </div>

        <div className="p-4 space-y-2">
          {habits?.map((habit: any) => {
            const count = todayCompletions?.filter((c: any) => c.habit_id === habit.id).length || 0;
            const icon = habit.icon_url?.startsWith("emoji:") ? habit.icon_url.replace("emoji:", "") : "🎯";
            return (
              <Card
                key={habit.id}
                className="cursor-pointer hover:shadow-sm transition-shadow"
                onClick={() => navigate(`/client/habits/${habit.id}`)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-xl shrink-0">
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{habit.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {count} of {habit.goal_value} {habit.goal_unit} today
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            );
          })}
          {(!habits || habits.length === 0) && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="font-medium">No habits assigned yet</p>
              <p className="text-sm mt-1">Your trainer will assign habits for you</p>
            </div>
          )}
        </div>
      </div>
    </ClientLayout>
  );
}
