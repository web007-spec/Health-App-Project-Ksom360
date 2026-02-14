import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Clock, Dumbbell, MessageCircle, Send, Trophy, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface SetLogData {
  reps: string;
  weight: string;
  completed: boolean;
}

interface WorkoutSummaryProps {
  sessionId: string;
  workoutName: string;
  durationSeconds: number;
  startedAt: string;
  completedAt: string;
  isPartial: boolean;
  setLogs: Record<string, SetLogData>;
  sections: any[];
  onClose: () => void;
}

const difficultyLabels = ["", "Easy 😌", "Light 🙂", "Moderate 💪", "Hard 🔥", "Max Effort 🤯"];
const difficultyColors = ["", "text-green-500", "text-blue-500", "text-yellow-500", "text-orange-500", "text-red-500"];

export function WorkoutSummary({
  sessionId,
  workoutName,
  durationSeconds,
  startedAt,
  completedAt,
  isPartial,
  setLogs,
  sections,
  onClose,
}: WorkoutSummaryProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(3);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showComments, setShowComments] = useState(false);

  // Fetch current session to check if rating already set
  const { data: session } = useQuery({
    queryKey: ["workout-session", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (session?.difficulty_rating) {
      setRating(session.difficulty_rating);
      setRatingSubmitted(true);
    }
  }, [session]);

  // Fetch comments
  const { data: comments } = useQuery({
    queryKey: ["workout-comments", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_comments")
        .select("*, profile:user_id(full_name, avatar_url)")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch newly earned badges
  const { data: newBadges } = useQuery({
    queryKey: ["new-badges", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_badges")
        .select("*, badge:badge_definitions(*)")
        .eq("session_id", sessionId)
        .eq("client_id", user?.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Submit rating
  const ratingMutation = useMutation({
    mutationFn: async (value: number) => {
      const { error } = await supabase
        .from("workout_sessions")
        .update({ difficulty_rating: value })
        .eq("id", sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      setRatingSubmitted(true);
      toast({ title: "Rating saved!" });
    },
  });

  // Post comment
  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase
        .from("workout_comments")
        .insert({ session_id: sessionId, user_id: user?.id, content });
      if (error) throw error;
    },
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: ["workout-comments", sessionId] });
    },
  });

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s.toString().padStart(2, "0")}`;
  };

  // Calculate completed sets
  const totalSets = Object.keys(setLogs).length;
  const completedSets = Object.values(setLogs).filter((s) => s.completed).length;

  // Build exercise summary from sections and setLogs
  const exerciseSummary: { name: string; sets: { setNum: number; reps: string; weight: string; completed: boolean }[] }[] = [];
  sections.forEach((section, sIdx) => {
    const isGrouped = ["superset", "circuit"].includes(section.section_type);
    section.exercises.forEach((ex: any, eIdx: number) => {
      const sets: { setNum: number; reps: string; weight: string; completed: boolean }[] = [];
      if (isGrouped) {
        for (let r = 1; r <= section.rounds; r++) {
          const key = `${sIdx}-${eIdx}-${r}-1`;
          const log = setLogs[key];
          sets.push({ setNum: r, reps: log?.reps || "-", weight: log?.weight || "-", completed: log?.completed || false });
        }
      } else {
        const totalS = ex.sets || 1;
        for (let s = 1; s <= totalS; s++) {
          const key = `${sIdx}-${eIdx}-1-${s}`;
          const log = setLogs[key];
          sets.push({ setNum: s, reps: log?.reps || "-", weight: log?.weight || "-", completed: log?.completed || false });
        }
      }
      exerciseSummary.push({ name: ex.exercise_name || "Exercise", sets });
    });
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-foreground text-background p-6 pb-8">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={onClose} className="text-background hover:bg-background/10">
            <X className="h-5 w-5" />
          </Button>
          <span className="text-sm opacity-70">{isPartial ? "Partial Workout" : "Workout Complete"}</span>
          <div className="w-10" />
        </div>
        <p className="text-xs uppercase opacity-60">
          {format(new Date(startedAt), "EEEE, MMM d")}
        </p>
        <h1 className="text-2xl font-bold mt-1">{workoutName}</h1>
        {comments && comments.length > 0 && (
          <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-1 mt-2 text-xs opacity-70 hover:opacity-100">
            <MessageCircle className="h-3.5 w-3.5" />
            {comments.length} comment{comments.length !== 1 ? "s" : ""}
          </button>
        )}
      </div>

      <div className="px-4 -mt-4 space-y-4 pb-8">
        {/* New badges */}
        {newBadges && newBadges.length > 0 && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="h-5 w-5 text-primary" />
                <span className="font-semibold">Badges Earned!</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {newBadges.map((b: any) => (
                  <div key={b.id} className="flex items-center gap-2 bg-background rounded-full px-3 py-1.5 border">
                    <span className="text-xl">{b.badge?.icon}</span>
                    <span className="text-sm font-medium">{b.badge?.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Duration card */}
        <Card>
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span className="text-3xl font-bold">{Math.floor(durationSeconds / 60)}</span>
            </div>
            <p className="text-sm text-muted-foreground">Training min</p>
            <p className="text-xs text-muted-foreground mt-2">
              {format(new Date(startedAt), "MMM d")} • {format(new Date(startedAt), "hh:mm a")} - {format(new Date(completedAt), "hh:mm a")}
            </p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <Badge variant="outline">
                <Dumbbell className="h-3 w-3 mr-1" />
                {completedSets}/{totalSets} sets
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Difficulty rating */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold">How was the workout?</span>
              <span className={cn("text-sm font-medium", difficultyColors[rating])}>
                {difficultyLabels[rating]}
              </span>
            </div>
            <Slider
              value={[rating]}
              onValueChange={(v) => setRating(v[0])}
              min={1}
              max={5}
              step={1}
              disabled={ratingSubmitted}
              className="mb-4"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Easy</span>
              <span>Max Effort</span>
            </div>
            {!ratingSubmitted && (
              <Button className="w-full mt-4" onClick={() => ratingMutation.mutate(rating)} disabled={ratingMutation.isPending}>
                Submit Rating
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Workout details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Workout Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {exerciseSummary.map((ex, i) => (
              <div key={i}>
                {i > 0 && <Separator className="mb-3" />}
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{ex.name}</span>
                </div>
                <div className="space-y-1">
                  {ex.sets.map((s) => (
                    <div key={s.setNum} className={cn("flex items-center gap-4 text-sm px-2 py-1 rounded", s.completed ? "" : "opacity-40")}>
                      <span className="w-6 text-muted-foreground">{s.setNum}.</span>
                      <span className="flex-1">{s.reps || "-"} reps</span>
                      <span className="text-muted-foreground">{s.weight ? `${s.weight} lbs` : "-"}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Comments */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              <CardTitle className="text-lg">Comments</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {comments && comments.length > 0 ? (
              comments.map((c: any) => (
                <div key={c.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary">
                      {(c as any).profile?.full_name?.charAt(0)?.toUpperCase() || "?"}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{(c as any).profile?.full_name || "User"}</p>
                    <p className="text-sm text-muted-foreground">{c.content}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(c.created_at), "MMM d, h:mm a")}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No comments yet. Leave a note for your trainer!</p>
            )}
            <div className="flex gap-2 pt-2">
              <Input
                placeholder="Add a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && commentText.trim() && commentMutation.mutate(commentText.trim())}
              />
              <Button
                size="icon"
                onClick={() => commentText.trim() && commentMutation.mutate(commentText.trim())}
                disabled={!commentText.trim() || commentMutation.isPending}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Done button */}
        <Button className="w-full" size="lg" onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  );
}
