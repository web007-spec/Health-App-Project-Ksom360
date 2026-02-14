import { ClientLayout } from "@/components/ClientLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function ClientBadges() {
  const { user } = useAuth();

  const { data: allBadges } = useQuery({
    queryKey: ["badge-definitions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("badge_definitions").select("*").order("badge_type").order("requirement_value");
      if (error) throw error;
      return data;
    },
  });

  const { data: earnedBadges } = useQuery({
    queryKey: ["client-badges", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_badges")
        .select("*, badge:badge_definitions(*)")
        .eq("client_id", user?.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const earnedIds = new Set(earnedBadges?.map((b) => b.badge_id) || []);
  const groupedBadges: Record<string, any[]> = {};
  allBadges?.forEach((b) => {
    if (!groupedBadges[b.badge_type]) groupedBadges[b.badge_type] = [];
    groupedBadges[b.badge_type].push(b);
  });

  const typeLabels: Record<string, string> = {
    milestone: "Workout Milestones",
    streak: "Streak Badges",
    difficulty: "Difficulty Badges",
  };

  return (
    <ClientLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Trophy className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">My Badges</h1>
            <p className="text-muted-foreground">
              {earnedBadges?.length || 0} of {allBadges?.length || 0} earned
            </p>
          </div>
        </div>

        {Object.entries(groupedBadges).map(([type, badges]) => (
          <div key={type} className="space-y-3">
            <h2 className="text-lg font-semibold">{typeLabels[type] || type}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {badges.map((badge) => {
                const earned = earnedIds.has(badge.id);
                const earnedData = earnedBadges?.find((b) => b.badge_id === badge.id);
                return (
                  <Card
                    key={badge.id}
                    className={cn(
                      "transition-all",
                      earned ? "border-primary/30 bg-primary/5" : "opacity-40 grayscale"
                    )}
                  >
                    <CardContent className="p-4 text-center">
                      <div className="text-4xl mb-2">{badge.icon}</div>
                      <p className="font-semibold text-sm">{badge.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{badge.description}</p>
                      {earned && earnedData && (
                        <p className="text-xs text-primary mt-2">
                          Earned {format(new Date(earnedData.earned_at), "MMM d, yyyy")}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </ClientLayout>
  );
}
