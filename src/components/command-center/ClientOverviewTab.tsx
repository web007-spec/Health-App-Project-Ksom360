import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar, Dumbbell, Target, Plus, Clock, Trash2, CheckCircle2, StickyNote, Timer } from "lucide-react";
import { ClientRecommendationReview } from "./ClientRecommendationReview";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { format, formatDistanceToNow, differenceInDays, differenceInHours } from "date-fns";

interface ClientOverviewTabProps {
  clientId: string;
  trainerId: string;
}

export function ClientOverviewTab({ clientId, trainerId }: ClientOverviewTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Training stats
  const { data: trainingStats } = useQuery({
    queryKey: ["training-stats", clientId],
    queryFn: async () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Last 7 days sessions
      const { count: last7 } = await supabase
        .from("workout_sessions")
        .select("*", { count: "exact", head: true })
        .eq("client_id", clientId)
        .gte("started_at", sevenDaysAgo.toISOString());

      // Last 30 days sessions
      const { count: last30 } = await supabase
        .from("workout_sessions")
        .select("*", { count: "exact", head: true })
        .eq("client_id", clientId)
        .gte("started_at", thirtyDaysAgo.toISOString());

      // Assigned workouts last 7 days
      const { count: assigned7 } = await supabase
        .from("client_workouts")
        .select("*", { count: "exact", head: true })
        .eq("client_id", clientId)
        .gte("scheduled_date", sevenDaysAgo.toISOString().split("T")[0]);

      // Assigned workouts last 30 days
      const { count: assigned30 } = await supabase
        .from("client_workouts")
        .select("*", { count: "exact", head: true })
        .eq("client_id", clientId)
        .gte("scheduled_date", thirtyDaysAgo.toISOString().split("T")[0]);

      // Next week assigned
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      const { count: nextWeekCount } = await supabase
        .from("client_workouts")
        .select("*", { count: "exact", head: true })
        .eq("client_id", clientId)
        .gte("scheduled_date", now.toISOString().split("T")[0])
        .lte("scheduled_date", nextWeek.toISOString().split("T")[0]);

      // Last workout
      const { data: lastSession } = await supabase
        .from("workout_sessions")
        .select("*, workout_plan:workout_plans(name)")
        .eq("client_id", clientId)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        last7: last7 || 0,
        last30: last30 || 0,
        assigned7: assigned7 || 0,
        assigned30: assigned30 || 0,
        nextWeek: nextWeekCount || 0,
        lastSession,
      };
    },
  });

  // Goals & Countdowns
  const { data: goalsCountdowns } = useQuery({
    queryKey: ["client-goals-countdowns", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_goal_countdowns")
        .select("*")
        .eq("client_id", clientId)
        .eq("trainer_id", trainerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Notes
  const { data: notes } = useQuery({
    queryKey: ["client-notes", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_notes")
        .select("*")
        .eq("client_id", clientId)
        .eq("trainer_id", trainerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Recent activity (nutrition logs, workout sessions, tasks)
  const { data: recentActivity } = useQuery({
    queryKey: ["client-activity", clientId],
    queryFn: async () => {
      const [meals, sessions, tasks] = await Promise.all([
        supabase
          .from("nutrition_logs")
          .select("*")
          .eq("client_id", clientId)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("workout_sessions")
          .select("*, workout_plan:workout_plans(name)")
          .eq("client_id", clientId)
          .order("started_at", { ascending: false })
          .limit(5),
        supabase
          .from("client_tasks")
          .select("*")
          .eq("client_id", clientId)
          .eq("trainer_id", trainerId)
          .order("assigned_at", { ascending: false })
          .limit(5),
      ]);

      const activities: Array<{ type: string; message: string; time: string }> = [];

      sessions.data?.forEach((s: any) => {
        activities.push({
          type: "workout",
          message: `Logged workout: ${s.workout_plan?.name || "Workout"}`,
          time: s.started_at,
        });
      });

      meals.data?.forEach((m: any) => {
        activities.push({
          type: "meal",
          message: `Added meal: ${m.meal_name}`,
          time: m.created_at,
        });
      });

      tasks.data?.forEach((t: any) => {
        if (t.completed_at) {
          activities.push({
            type: "task",
            message: `Completed task: ${t.name}`,
            time: t.completed_at,
          });
        }
      });

      return activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 10);
    },
  });

  // Body metrics
  const { data: latestMetrics } = useQuery({
    queryKey: ["client-latest-metrics", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("progress_entries")
        .select("*")
        .eq("client_id", clientId)
        .order("entry_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left column */}
      <div className="lg:col-span-2 space-y-6">
        {/* Adaptive Recommendations */}
        <ClientRecommendationReview clientId={clientId} />

        {/* Training Stats */}
        <TrainingStatsCard stats={trainingStats} />

        {/* Body Metrics */}
        <BodyMetricsCard metrics={latestMetrics} />

        {/* Goals & Countdowns */}
        <GoalsCountdownsCard
          clientId={clientId}
          trainerId={trainerId}
          items={goalsCountdowns || []}
        />
      </div>

      {/* Right column */}
      <div className="space-y-6">
        {/* Notes */}
        <NotesCard clientId={clientId} trainerId={trainerId} notes={notes || []} />

        {/* Updates / Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Updates</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity && recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((activity, i) => (
                  <div key={i} className="flex gap-3">
                    <div className={`h-2 w-2 rounded-full mt-2 shrink-0 ${
                      activity.type === "workout" ? "bg-primary" :
                      activity.type === "meal" ? "bg-green-500" : "bg-blue-500"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">{activity.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.time), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// --- Sub-components ---

function TrainingStatsCard({ stats }: { stats: any }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            Training
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
            <Calendar className="h-3 w-3 mr-1" /> Open Calendar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Last 7 Days</p>
            <p className="text-2xl font-bold text-foreground">
              {stats?.last7 || 0}/{stats?.assigned7 || 0}
            </p>
            <p className="text-xs text-muted-foreground">Tracked</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Last 30 Days</p>
            <p className="text-2xl font-bold text-foreground">
              {stats?.last30 || 0}/{stats?.assigned30 || 0}
            </p>
            <p className="text-xs text-muted-foreground">Tracked</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Next Week</p>
            <p className="text-2xl font-bold text-foreground">{stats?.nextWeek || 0}</p>
            <p className="text-xs text-muted-foreground">Assigned</p>
          </div>
        </div>
        {stats?.lastSession && (
          <div className="mt-4 pt-3 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Last Workout: <span className="text-foreground font-medium">{stats.lastSession.workout_plan?.name || "Workout"}</span>
              {" · "}
              {formatDistanceToNow(new Date(stats.lastSession.started_at), { addSuffix: true })}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BodyMetricsCard({ metrics }: { metrics: any }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Body Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Weight</p>
            {metrics?.weight ? (
              <p className="text-2xl font-bold">{metrics.weight} <span className="text-sm text-muted-foreground font-normal">lbs</span></p>
            ) : (
              <p className="text-sm text-muted-foreground italic">No data</p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Body Fat</p>
            {metrics?.body_fat_percentage ? (
              <p className="text-2xl font-bold">{metrics.body_fat_percentage}<span className="text-sm text-muted-foreground font-normal">%</span></p>
            ) : (
              <p className="text-sm text-muted-foreground italic">No data</p>
            )}
          </div>
        </div>
        {metrics?.entry_date && (
          <p className="text-xs text-muted-foreground mt-3">
            Last updated: {format(new Date(metrics.entry_date), "MMM dd, yyyy")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function GoalsCountdownsCard({ clientId, trainerId, items }: { clientId: string; trainerId: string; items: any[] }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [countdownDialogOpen, setCountdownDialogOpen] = useState(false);
  const [newGoal, setNewGoal] = useState("");
  const [newCountdown, setNewCountdown] = useState({ title: "", icon: "🎯", end_date: "" });

  const createGoalMutation = useMutation({
    mutationFn: async (data: { type: string; title: string; end_date?: string; icon?: string }) => {
      const { error } = await supabase.from("client_goal_countdowns").insert({
        client_id: clientId,
        trainer_id: trainerId,
        type: data.type,
        title: data.title,
        end_date: data.end_date || null,
        icon: data.icon || "🎯",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-goals-countdowns", clientId] });
      toast({ title: "Created successfully" });
      setGoalDialogOpen(false);
      setCountdownDialogOpen(false);
      setNewGoal("");
      setNewCountdown({ title: "", icon: "🎯", end_date: "" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_goal_countdowns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-goals-countdowns", clientId] });
    },
  });

  const toggleCompleteMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase.from("client_goal_countdowns").update({
        is_completed: completed,
        completed_at: completed ? new Date().toISOString() : null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-goals-countdowns", clientId] });
    },
  });

  const goals = items.filter(i => i.type === "goal");
  const countdowns = items.filter(i => i.type === "countdown");

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Goals & Countdowns</CardTitle>
          <div className="flex gap-2">
            <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <Plus className="h-3 w-3" /> Goal
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Set a Goal</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label>Goal Description</Label>
                    <Textarea
                      value={newGoal}
                      onChange={(e) => setNewGoal(e.target.value)}
                      placeholder="e.g., Gain strength for upcoming marathon"
                    />
                  </div>
                  <Button
                    onClick={() => createGoalMutation.mutate({ type: "goal", title: newGoal })}
                    disabled={!newGoal.trim() || createGoalMutation.isPending}
                    className="w-full"
                  >
                    Create Goal
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={countdownDialogOpen} onOpenChange={setCountdownDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <Plus className="h-3 w-3" /> Countdown
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create a Countdown</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label>Countdown Title</Label>
                    <Input
                      value={newCountdown.title}
                      onChange={(e) => setNewCountdown(p => ({ ...p, title: e.target.value }))}
                      placeholder="e.g., 5K Race Day"
                    />
                  </div>
                  <div>
                    <Label>Icon</Label>
                    <Input
                      value={newCountdown.icon}
                      onChange={(e) => setNewCountdown(p => ({ ...p, icon: e.target.value }))}
                      placeholder="🎯"
                    />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input
                      type="datetime-local"
                      value={newCountdown.end_date}
                      onChange={(e) => setNewCountdown(p => ({ ...p, end_date: e.target.value }))}
                    />
                  </div>
                  <Button
                    onClick={() => createGoalMutation.mutate({
                      type: "countdown",
                      title: newCountdown.title,
                      end_date: newCountdown.end_date,
                      icon: newCountdown.icon,
                    })}
                    disabled={!newCountdown.title.trim() || !newCountdown.end_date || createGoalMutation.isPending}
                    className="w-full"
                  >
                    Create Countdown
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Shared with client</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {goals.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Goals</p>
            {goals.map((goal) => (
              <div key={goal.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <button
                  onClick={() => toggleCompleteMutation.mutate({ id: goal.id, completed: !goal.is_completed })}
                  className="shrink-0"
                >
                  <CheckCircle2 className={`h-5 w-5 ${goal.is_completed ? "text-green-500 fill-green-500" : "text-muted-foreground"}`} />
                </button>
                <span className={`flex-1 text-sm ${goal.is_completed ? "line-through text-muted-foreground" : ""}`}>
                  {goal.title}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteMutation.mutate(goal.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {countdowns.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Countdowns</p>
            {countdowns.map((cd) => {
              const daysLeft = cd.end_date ? differenceInDays(new Date(cd.end_date), new Date()) : 0;
              const hoursLeft = cd.end_date ? differenceInHours(new Date(cd.end_date), new Date()) % 24 : 0;
              const isPast = daysLeft < 0;

              return (
                <div key={cd.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <span className="text-xl">{cd.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{cd.title}</p>
                    {cd.end_date && (
                      <p className={`text-xs ${isPast ? "text-destructive" : "text-muted-foreground"}`}>
                        {isPast ? "Ended" : `${daysLeft}d ${hoursLeft}h remaining`}
                        {" · "}
                        {format(new Date(cd.end_date), "MMM dd, yyyy")}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteMutation.mutate(cd.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {goals.length === 0 && countdowns.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No goals or countdowns set yet
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function NotesCard({ clientId, trainerId, notes }: { clientId: string; trainerId: string; notes: any[] }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newNote, setNewNote] = useState("");

  const addNoteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("client_notes").insert({
        client_id: clientId,
        trainer_id: trainerId,
        content: newNote,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-notes", clientId] });
      setNewNote("");
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-notes", clientId] });
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <StickyNote className="h-5 w-5" />
          Notes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a note about this client..."
            className="min-h-[60px] text-sm"
          />
        </div>
        <Button
          size="sm"
          onClick={() => addNoteMutation.mutate()}
          disabled={!newNote.trim() || addNoteMutation.isPending}
          className="w-full"
        >
          Add Note
        </Button>

        {notes.map((note) => (
          <div key={note.id} className="p-3 rounded-lg bg-muted/50 space-y-1">
            <p className="text-sm">{note.content}</p>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {format(new Date(note.created_at), "MMM dd, hh:mm a")}
              </p>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={() => deleteNoteMutation.mutate(note.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
