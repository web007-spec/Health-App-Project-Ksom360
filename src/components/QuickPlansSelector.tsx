import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight, Clock, Hourglass, UtensilsCrossed } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface QuickPlan {
  id: string;
  name: string;
  fast_hours: number;
  eat_hours: number;
  difficulty_group: string;
  order_index: number;
}

const FEATURED_PLANS = ["16:8", "18:6", "20:4"];

export function QuickPlansSelector({ navigate }: { navigate: (path: string) => void }) {
  const { data: plans } = useQuery({
    queryKey: ["quick-plans-featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quick_fasting_plans")
        .select("*")
        .in("name", FEATURED_PLANS);
      if (error) throw error;
      return data as QuickPlan[];
    },
  });

  const sorted = FEATURED_PLANS.map((n) => plans?.find((p) => p.name === n)).filter(Boolean) as QuickPlan[];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-6 w-6 text-blue-400" />
          <h2 className="text-xl font-bold">Quick Plans</h2>
        </div>
        <button
          className="text-sm font-semibold text-blue-400 flex items-center gap-1"
          onClick={() => navigate("/client/quick-plans")}
        >
          View All <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {sorted.map((plan) => (
        <Card
          key={plan.id}
          className="cursor-pointer border-l-4 border-l-blue-500 transition-colors hover:bg-muted/30"
          onClick={() => navigate("/client/quick-plans")}
        >
          <CardContent className="px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base">{plan.name}</h3>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Hourglass className="h-3.5 w-3.5 text-blue-400" />
                  <span>{plan.fast_hours}h</span>
                  <span className="mx-0.5">•</span>
                  <UtensilsCrossed className="h-3.5 w-3.5 text-blue-400" />
                  <span>{plan.eat_hours}h</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
