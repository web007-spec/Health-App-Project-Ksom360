import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Sparkles } from "lucide-react";

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

type SeasonStatus = "in_season" | "off_season";

function resolveSeasonStatus(profile: any, hasUpcomingEvents: boolean): SeasonStatus {
  if (profile.season_override === "in_season" || profile.season_override === "off_season") {
    return profile.season_override;
  }

  return hasUpcomingEvents ? "in_season" : "off_season";
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

  const { data: upcomingEvents } = useQuery({
    queryKey: ["upcoming-sport-events-season", clientId],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("sport_schedule_events")
        .select("id")
        .eq("client_id", clientId)
        .gte("start_time", now)
        .limit(20);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!clientId,
  });

  if (!sportProfiles?.length) return null;

  const hasUpcomingEvents = Boolean(upcomingEvents?.length);
  const resolvedProfiles = sportProfiles.map((profile) => {
    const config = SPORT_CONFIG[profile.sport] || { emoji: "🏅", label: profile.sport };
    const seasonStatus = resolveSeasonStatus(profile, hasUpcomingEvents);

    return { ...profile, ...config, seasonStatus };
  });

  const inSeason = resolvedProfiles.filter((profile) => profile.seasonStatus === "in_season");
  const outOfSeason = resolvedProfiles.filter((profile) => profile.seasonStatus === "off_season");

  const renderGroup = (title: string, profiles: any[], status: SeasonStatus) => {
    if (!profiles.length) return null;

    return (
      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
          <Badge variant={status === "in_season" ? "default" : "secondary"} className="text-[10px] uppercase tracking-wider">
            {profiles.length}
          </Badge>
        </div>

        <div className="space-y-2">
          {profiles.map((profile) => (
            <Card
              key={profile.id}
              className="overflow-hidden cursor-pointer transition-all hover:shadow-md border-border"
              onClick={() => navigate("/client/sports")}
            >
              <CardContent className="p-0">
                <div className={`p-4 ${status === "in_season" ? "bg-primary/5" : "bg-muted/40"}`}>
                  <div className="flex items-center gap-4">
                    <div className="text-4xl shrink-0 leading-none">{profile.emoji}</div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">
                        {firstName}'s {profile.label} Program
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {profile.team_name || "No team selected"}
                        {profile.position ? ` · ${profile.position}` : ""}
                        {profile.jersey_number ? ` · #${profile.jersey_number}` : ""}
                      </p>

                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant={status === "in_season" ? "default" : "secondary"} className="text-[10px] uppercase tracking-wider">
                          {status === "in_season" ? "In Season" : "Out of Season"}
                        </Badge>
                        {status === "in_season" && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary">
                            <Sparkles className="h-3.5 w-3.5" /> Peak mode
                          </span>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="space-y-3">
      {renderGroup("In Season Program", inSeason, "in_season")}
      {renderGroup("Out of Season Program", outOfSeason, "off_season")}
    </div>
  );
}
