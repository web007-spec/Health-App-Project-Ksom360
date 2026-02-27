import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format, startOfWeek, endOfWeek, subDays } from "date-fns";
import { ShieldCheck, Moon, Dumbbell, Heart, Droplets, MessageSquareText } from "lucide-react";

export default function GuardianSummary() {
  const { token } = useParams<{ token: string }>();

  const { data: link, isLoading: linkLoading, error: linkError } = useQuery({
    queryKey: ["guardian-view", token],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guardian_links")
        .select("*, athlete:profiles!guardian_links_athlete_user_id_fkey(full_name)")
        .eq("token", token)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!token,
  });

  const athleteId = link?.athlete_user_id;
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  // Fetch aggregated data
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ["guardian-summary-data", athleteId],
    queryFn: async () => {
      const sevenDaysAgo = subDays(now, 7).toISOString();

      // Recommendation events for scores
      const { data: events } = await supabase
        .from("recommendation_events")
        .select("score_total, status, created_at")
        .eq("client_id", athleteId!)
        .gte("created_at", sevenDaysAgo)
        .order("created_at", { ascending: false });

      // Workout sessions for training load
      const { data: sessions } = await supabase
        .from("workout_sessions")
        .select("id, completed_at")
        .eq("client_id", athleteId!)
        .gte("started_at", sevenDaysAgo);

      // Client habits for recovery/hydration
      const { data: habits } = await supabase
        .from("client_habits")
        .select("id, name")
        .eq("client_id", athleteId!)
        .eq("is_active", true);

      return { events: events || [], sessions: sessions || [], habits: habits || [] };
    },
    enabled: !!athleteId,
  });

  if (linkLoading) {
    return (
      <div className="min-h-screen bg-background p-6 max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (linkError || !link) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-3">
            <ShieldCheck className="h-12 w-12 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-semibold">Link Not Found</h2>
            <p className="text-muted-foreground text-sm">
              This recovery summary link is invalid or has been revoked. Please contact the coach for a new link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (link.status === "revoked") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-3">
            <ShieldCheck className="h-12 w-12 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-semibold">Access Revoked</h2>
            <p className="text-muted-foreground text-sm">
              This recovery summary link has been revoked by the coach.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (new Date(link.expires_at) < now) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-3">
            <ShieldCheck className="h-12 w-12 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-semibold">Link Expired</h2>
            <p className="text-muted-foreground text-sm">
              This recovery summary link has expired. Please contact the coach for a new link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const events = summaryData?.events || [];
  const sessions = summaryData?.sessions || [];

  // Compute aggregated metrics
  const avgScore = events.length > 0
    ? Math.round(events.reduce((s, e) => s + (e.score_total || 0), 0) / events.length)
    : null;

  const statusDistribution = events.reduce(
    (acc, e) => {
      const status = (e.status || "moderate").toLowerCase();
      if (status.includes("strong")) acc.strong++;
      else if (status.includes("needs")) acc.needsSupport++;
      else acc.moderate++;
      return acc;
    },
    { strong: 0, moderate: 0, needsSupport: 0 }
  );
  const totalStatuses = statusDistribution.strong + statusDistribution.moderate + statusDistribution.needsSupport;

  const completedSessions = sessions.filter((s) => s.completed_at != null).length;

  const athleteName = (link as any).athlete?.full_name || "Athlete";

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            KSOM360 Athletic
          </p>
          <h1 className="text-2xl font-bold text-foreground">Weekly Recovery Summary</h1>
          <p className="text-sm text-muted-foreground">
            {athleteName} — Week of {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
          </p>
        </div>

        {summaryLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <>
            {/* A) Game Readiness */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Game Readiness
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Avg Readiness Score</span>
                  <span className="text-2xl font-bold text-foreground">
                    {avgScore !== null ? `${avgScore}/100` : "—"}
                  </span>
                </div>
                {totalStatuses > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase">Status Distribution</p>
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-400">
                        Strong: {Math.round((statusDistribution.strong / totalStatuses) * 100)}%
                      </Badge>
                      <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">
                        Moderate: {Math.round((statusDistribution.moderate / totalStatuses) * 100)}%
                      </Badge>
                      <Badge variant="secondary" className="bg-red-500/10 text-red-700 dark:text-red-400">
                        Needs Support: {Math.round((statusDistribution.needsSupport / totalStatuses) * 100)}%
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* B) Sleep Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Moon className="h-5 w-5 text-primary" />
                  Sleep Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Sleep data is tracked via the athlete's daily check-ins. Consistent sleep of 7+ hours supports game-day readiness and recovery.
                </p>
                {events.length > 0 ? (
                  <div className="mt-2 text-sm">
                    <span className="text-muted-foreground">Days tracked this week:</span>{" "}
                    <span className="font-medium">{events.length}</span>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-2">No data available this week.</p>
                )}
              </CardContent>
            </Card>

            {/* C) Training Load Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Dumbbell className="h-5 w-5 text-primary" />
                  Training Load Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Sessions Completed</span>
                  <span className="font-semibold">{completedSessions}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Scheduled</span>
                  <span className="font-semibold">{sessions.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Load Balance</span>
                  <Badge variant="secondary">
                    {sessions.length === 0
                      ? "No Data"
                      : completedSessions / sessions.length >= 0.8
                        ? "Balanced"
                        : completedSessions / sessions.length >= 0.5
                          ? "Moderate"
                          : "Low"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* D) Recovery Habits */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Heart className="h-5 w-5 text-primary" />
                  Recovery Habits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Active Recovery Habits</span>
                  <span className="font-semibold">{summaryData?.habits?.length || 0}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Recovery habits include stretching, hydration, and mobility routines assigned by the coach.
                </p>
              </CardContent>
            </Card>

            {/* E) Coach Note */}
            {link.coach_note && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquareText className="h-5 w-5 text-primary" />
                    Coach Note
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground">{link.coach_note}</p>
                </CardContent>
              </Card>
            )}
          </>
        )}

        <div className="text-center text-xs text-muted-foreground pt-4 pb-8">
          KSOM360 Athletic — Aggregated wellness data only. No detailed logs or private information included.
        </div>
      </div>
    </div>
  );
}
