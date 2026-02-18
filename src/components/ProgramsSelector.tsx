import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORY_CONFIG, getDifficultyLabel, getDurationLabel } from "@/lib/fastingCategoryConfig";

interface FastingProtocol {
  id: string;
  name: string;
  category: string;
  description: string | null;
  duration_days: number;
  fast_target_hours: number;
  difficulty_level: string;
}

// Featured protocols to show on dashboard (one per visual category)
const FEATURED_NAMES = ["14-Day Weight Kickstart", "21-Day Deep Focus", "21-Day Rhythm Restore"];

export function ProgramsSelector({ navigate }: { navigate: (path: string) => void }) {
  const { data: protocols } = useQuery({
    queryKey: ["fasting-protocols-featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fasting_protocols")
        .select("*")
        .in("name", FEATURED_NAMES);
      if (error) throw error;
      return (data as any[]).map((d) => ({
        ...d,
        difficulty_level: d.difficulty_level || "beginner",
      })) as FastingProtocol[];
    },
  });

  // Sort to match the order of FEATURED_NAMES
  const sorted = FEATURED_NAMES.map((n) => protocols?.find((p) => p.name === n)).filter(Boolean) as FastingProtocol[];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-blue-400" />
          <h2 className="text-xl font-bold">Programs</h2>
        </div>
        <button
          className="text-sm font-semibold text-blue-400 flex items-center gap-1"
          onClick={() => navigate("/client/programs")}
        >
          View All <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {sorted.map((protocol) => {
        const config = CATEGORY_CONFIG[protocol.category];
        const Icon = config?.icon || CalendarDays;
        return (
          <Card
            key={protocol.id}
            className={`cursor-pointer border-l-4 ${config?.borderColor || "border-l-blue-500"} transition-colors hover:bg-muted/30`}
            onClick={() => navigate("/client/programs")}
          >
            <CardContent className="px-4 py-3.5">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full ${config?.bgColor || "bg-blue-500/20"} flex items-center justify-center shrink-0`}>
                  <Icon className={`h-5 w-5 ${config?.color || "text-blue-400"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base">{protocol.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {getDurationLabel(protocol.duration_days)}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs shrink-0 capitalize">
                  {getDifficultyLabel(protocol.difficulty_level)}
                </Badge>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
