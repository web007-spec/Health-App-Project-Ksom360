import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";

const SPORT_CONFIG: Record<string, { emoji: string; label: string }> = {
  softball: { emoji: "🥎", label: "Softball" },
  basketball: { emoji: "🏀", label: "Basketball" },
  baseball: { emoji: "⚾", label: "Baseball" },
  football: { emoji: "🏈", label: "Football" },
  soccer: { emoji: "⚽", label: "Soccer" },
  volleyball: { emoji: "🏐", label: "Volleyball" },
  tennis: { emoji: "🎾", label: "Tennis" },
  track: { emoji: "🏃", label: "Track & Field" },
};

interface SportHeroBannerProps {
  clientId: string;
  firstName: string;
}

export function SportHeroBanner({ clientId, firstName }: SportHeroBannerProps) {
  const navigate = useNavigate();

  const { data: sportProfiles } = useQuery({
    queryKey: ["client-sport-profiles", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_sport_profiles")
        .select("*")
        .eq("client_id", clientId);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!clientId,
  });

  // Auto-detect season from upcoming sport events
  const { data: upcomingEvents } = useQuery({
    queryKey: ["upcoming-sport-events-season", clientId],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("sport_events" as any)
        .select("id, event_type, sport_type")
        .eq("client_id", clientId)
        .gte("start_time", now)
        .limit(20);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!clientId,
  });

  if (!sportProfiles?.length) return null;

  // Determine season status per sport
  const resolvedProfiles = sportProfiles.map((profile) => {
    const config = SPORT_CONFIG[profile.sport] || { emoji: "🏅", label: profile.sport };
    
    let seasonStatus: "in_season" | "off_season" = "off_season";
    
    if (profile.season_override === "in_season" || profile.season_override === "off_season") {
      seasonStatus = profile.season_override;
    } else {
      // Auto-detect: if upcoming events exist for this sport, it's in season
      const hasUpcoming = upcomingEvents?.some(
        (e: any) => (e.sport_type || "").toLowerCase() === profile.sport.toLowerCase()
      );
      // If no sport_type on events, check if any events exist at all (legacy)
      const hasAnyEvents = !hasUpcoming && upcomingEvents && upcomingEvents.length > 0;
      seasonStatus = hasUpcoming || hasAnyEvents ? "in_season" : "off_season";
    }

    return { ...profile, ...config, seasonStatus };
  });

  return (
    <div className="space-y-3">
      {resolvedProfiles.map((profile) => (
        <Card
          key={profile.id}
          className="overflow-hidden cursor-pointer hover:shadow-md transition-all border-primary/20"
          onClick={() => navigate("/client/sports")}
        >
          <CardContent className="p-0">
            <div className="flex items-center gap-4 p-4">
              {/* Large Sport Emoji */}
              <div className="text-5xl shrink-0 leading-none">{profile.emoji}</div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">
                  {firstName}'s {profile.label} Program
                </p>
                {profile.team_name && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {profile.team_name}
                    {profile.position ? ` · ${profile.position}` : ""}
                    {profile.jersey_number ? ` · #${profile.jersey_number}` : ""}
                  </p>
                )}
                <Badge
                  variant={profile.seasonStatus === "in_season" ? "default" : "secondary"}
                  className={`mt-1.5 text-[10px] font-bold uppercase tracking-wider ${
                    profile.seasonStatus === "in_season"
                      ? "bg-primary/15 text-primary border-primary/30"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {profile.seasonStatus === "in_season" ? "In Season" : "Off Season"}
                </Badge>
              </div>

              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
