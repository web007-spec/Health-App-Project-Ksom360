import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Utensils } from "lucide-react";

interface Props {
  clientId: string;
}

export function ClientFoodJournalTab({ clientId }: Props) {
  const { data: logs } = useQuery({
    queryKey: ["client-nutrition-logs", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nutrition_logs")
        .select("*")
        .eq("client_id", clientId)
        .order("log_date", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
  });

  // Group by date
  const grouped = logs?.reduce((acc: Record<string, any[]>, log) => {
    const date = log.log_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {}) || {};

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Food Journal</h2>

      {Object.keys(grouped).length > 0 ? (
        Object.entries(grouped).map(([date, meals]) => {
          const totalCal = meals.reduce((s, m) => s + (m.calories || 0), 0);
          const totalP = meals.reduce((s, m) => s + (Number(m.protein) || 0), 0);
          const totalC = meals.reduce((s, m) => s + (Number(m.carbs) || 0), 0);
          const totalF = meals.reduce((s, m) => s + (Number(m.fats) || 0), 0);

          return (
            <Card key={date}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {format(new Date(date), "EEEE, MMM dd")}
                  </CardTitle>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>{totalCal} cal</span>
                    <span>{Math.round(totalP)}g P</span>
                    <span>{Math.round(totalC)}g C</span>
                    <span>{Math.round(totalF)}g F</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {meals.map((meal) => (
                    <div key={meal.id} className="flex items-center gap-3 p-2 rounded bg-muted/50">
                      <Utensils className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{meal.meal_name}</p>
                        {meal.notes && <p className="text-xs text-muted-foreground truncate">{meal.notes}</p>}
                      </div>
                      <p className="text-xs text-muted-foreground shrink-0">{meal.calories || 0} cal</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Utensils className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No food journal entries yet</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
