import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, Clock, Dumbbell, MessageCircle, Send, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const difficultyLabels = ["", "Easy 😌", "Light 🙂", "Moderate 💪", "Hard 🔥", "Max Effort 🤯"];
const difficultyColors = ["", "text-green-500", "text-blue-500", "text-yellow-500", "text-orange-500", "text-red-500"];

export default function ClientWorkoutHistory() {
  const { clientId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState<Record<string, string>>({});

  // Fetch client profile
  const { data: client } = useQuery({
    queryKey: ["client-profile", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", clientId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  // Fetch workout sessions
  const { data: sessions, isLoading } = useQuery({
    queryKey: ["client-workout-sessions", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_sessions")
        .select(`
          *,
          workout_plan:workout_plans(name, difficulty, category),
          exercise_logs:workout_exercise_logs(
            *,
            exercise:exercises(name)
          ),
          comments:workout_comments(
            *,
            profile:user_id(full_name)
          )
        `)
        .eq("client_id", clientId)
        .order("completed_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  // Fetch client badges
  const { data: badges } = useQuery({
    queryKey: ["client-badges-trainer", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_badges")
        .select("*, badge:badge_definitions(*)")
        .eq("client_id", clientId)
        .order("earned_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const commentMutation = useMutation({
    mutationFn: async ({ sessionId, content }: { sessionId: string; content: string }) => {
      const { error } = await supabase
        .from("workout_comments")
        .insert({ session_id: sessionId, user_id: user?.id, content });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-workout-sessions", clientId] });
    },
  });

  const handleComment = (sessionId: string) => {
    const text = commentText[sessionId]?.trim();
    if (!text) return;
    commentMutation.mutate({ sessionId, content: text });
    setCommentText((prev) => ({ ...prev, [sessionId]: "" }));
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{client?.full_name || "Client"}'s Workout History</h1>
            <p className="text-sm text-muted-foreground">{sessions?.length || 0} completed workouts</p>
          </div>
        </div>

        {/* Badges section */}
        {badges && badges.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                <CardTitle>Badges Earned ({badges.length})</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {badges.map((b: any) => (
                  <div key={b.id} className="flex items-center gap-2 bg-primary/5 rounded-full px-3 py-1.5 border border-primary/20">
                    <span className="text-lg">{b.badge?.icon}</span>
                    <div>
                      <span className="text-sm font-medium">{b.badge?.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {format(new Date(b.earned_at), "MMM d")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sessions */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
            <p className="text-muted-foreground">Loading sessions...</p>
          </div>
        ) : sessions?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Dumbbell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No completed workout sessions yet.</p>
            </CardContent>
          </Card>
        ) : (
          sessions?.map((session: any) => {
            const exerciseMap: Record<string, { name: string; sets: any[] }> = {};
            session.exercise_logs
              ?.sort((a: any, b: any) => a.set_number - b.set_number)
              .forEach((log: any) => {
                const exId = log.exercise_id;
                if (!exerciseMap[exId]) {
                  exerciseMap[exId] = { name: log.exercise?.name || "Exercise", sets: [] };
                }
                exerciseMap[exId].sets.push(log);
              });

            return (
              <Card key={session.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase">
                        {session.completed_at ? format(new Date(session.completed_at), "EEEE, MMM d") : "In Progress"}
                      </p>
                      <CardTitle className="text-lg">{session.workout_plan?.name}</CardTitle>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="capitalize text-xs">{session.workout_plan?.difficulty}</Badge>
                        {session.is_partial && <Badge variant="secondary" className="text-xs">Partial</Badge>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">{Math.floor((session.duration_seconds || 0) / 60)} min</span>
                      </div>
                      {session.difficulty_rating && (
                        <p className={cn("text-sm font-medium mt-1", difficultyColors[session.difficulty_rating])}>
                          {difficultyLabels[session.difficulty_rating]}
                        </p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Exercise logs */}
                  {Object.values(exerciseMap).map((ex, i) => (
                    <div key={i}>
                      {i > 0 && <Separator className="mb-2" />}
                      <p className="font-medium text-sm mb-1">{ex.name}</p>
                      <div className="space-y-0.5">
                        {ex.sets.map((s: any) => (
                          <div key={s.id} className={cn("flex gap-4 text-sm px-2 py-0.5 rounded", s.completed ? "" : "opacity-40")}>
                            <span className="w-6 text-muted-foreground">{s.set_number}.</span>
                            <span className="flex-1">{s.reps || "-"} reps</span>
                            <span className="text-muted-foreground">{s.weight ? `${s.weight} lbs` : "-"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Comments */}
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <MessageCircle className="h-4 w-4" />
                      Comments ({session.comments?.length || 0})
                    </div>
                    {session.comments?.map((c: any) => (
                      <div key={c.id} className="flex gap-2 text-sm">
                        <span className="font-medium">{c.profile?.full_name || "User"}:</span>
                        <span className="text-muted-foreground">{c.content}</span>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a comment..."
                        value={commentText[session.id] || ""}
                        onChange={(e) => setCommentText((prev) => ({ ...prev, [session.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && handleComment(session.id)}
                        className="h-8 text-sm"
                      />
                      <Button size="icon" className="h-8 w-8 shrink-0" onClick={() => handleComment(session.id)}>
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </DashboardLayout>
  );
}
