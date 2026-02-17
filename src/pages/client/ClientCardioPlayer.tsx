import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { Button } from "@/components/ui/button";
import { Square, Lock, Pause, Play, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function ClientCardioPlayer() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clientId = useEffectiveClientId();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const activity = searchParams.get("activity") || "general";
  const targetType = searchParams.get("targetType") || "none";
  const targetValue = searchParams.get("targetValue") || "";
  const sessionId = searchParams.get("sessionId") || "";

  const [seconds, setSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer
  useEffect(() => {
    if (!isPaused) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPaused]);

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStop = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    if (intervalRef.current) clearInterval(intervalRef.current);

    try {
      if (sessionId) {
        await supabase
          .from("cardio_sessions" as any)
          .update({
            status: "completed",
            duration_seconds: seconds,
            completed_at: new Date().toISOString(),
          })
          .eq("id", sessionId);
      }

      queryClient.invalidateQueries({ queryKey: ["cardio-sessions-today"] });
      toast({ title: "Activity logged!", description: `${activityLabel} completed • ${formatTime(seconds)}` });
      navigate("/client/dashboard");
    } catch (err) {
      toast({ title: "Error saving", variant: "destructive" });
      setIsSaving(false);
    }
  }, [sessionId, seconds, isSaving]);

  const ACTIVITY_MAP: Record<string, { label: string; emoji: string }> = {
    running: { label: "Running", emoji: "🏃" },
    walking: { label: "Walking", emoji: "🚶" },
    cycling: { label: "Cycling", emoji: "🚴" },
    rowing: { label: "Rowing", emoji: "🚣" },
    elliptical: { label: "Elliptical", emoji: "🏋️" },
    stair_climbing: { label: "Stair climbing", emoji: "🪜" },
    swimming: { label: "Swimming", emoji: "🏊" },
    hiking: { label: "Hiking", emoji: "🥾" },
    jump_rope: { label: "Jump rope", emoji: "🤸" },
    dancing: { label: "Dancing", emoji: "💃" },
    yoga: { label: "Yoga", emoji: "🧘" },
    pilates: { label: "Pilates", emoji: "🤸‍♀️" },
    hiit: { label: "HIIT", emoji: "⚡" },
    crossfit: { label: "CrossFit", emoji: "🏋️‍♂️" },
    flexibility: { label: "Flexibility", emoji: "🧘‍♂️" },
    kickboxing: { label: "Kickboxing", emoji: "🥊" },
    tennis: { label: "Tennis", emoji: "🎾" },
    basketball: { label: "Basketball", emoji: "🏀" },
    soccer: { label: "Soccer", emoji: "⚽" },
    golf: { label: "Golf", emoji: "⛳" },
    general: { label: "General", emoji: "🏃‍♂️" },
  };

  const activityLabel = ACTIVITY_MAP[activity]?.label || activity;
  const activityEmoji = ACTIVITY_MAP[activity]?.emoji || "🏃";

  // Target progress
  const targetMins = targetType === "time" && targetValue ? parseFloat(targetValue) : null;
  const currentMins = seconds / 60;
  const targetReached = targetMins ? currentMins >= targetMins : false;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background">
      {/* Header */}
      <div className="text-center pt-8 pb-2">
        <p className="text-sm text-muted-foreground font-medium">Today</p>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
        <div className="w-24 h-24 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
          <span className="text-5xl">{activityEmoji}</span>
        </div>
        <h2 className="text-2xl font-bold">{activityLabel}</h2>

        {/* Timer */}
        <p className="text-6xl font-bold tracking-tight font-mono tabular-nums">
          {formatTime(seconds)}
        </p>

        {/* Target info */}
        {targetType !== "none" && targetValue && (
          <p className={`text-sm font-semibold ${targetReached ? "text-emerald-500" : "text-muted-foreground"}`}>
            Target: {targetValue} {targetType === "distance" ? "miles" : "min"}
            {targetReached && " ✓"}
          </p>
        )}
      </div>

      {/* Bottom bar */}
      <div className="bg-card border-t border-border">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="text-sm font-bold">{Math.round(seconds * 0.1)} Cal</p>
          </div>
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-destructive" />
            <span className="text-sm font-bold">--</span>
          </div>
        </div>
        <div className="flex items-center justify-around pb-8 pt-2">
          <Button
            variant="outline"
            size="icon"
            className="h-14 w-14 rounded-full"
            onClick={handleStop}
            disabled={isLocked || isSaving}
          >
            <Square className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className={`h-14 w-14 rounded-full ${isLocked ? "bg-primary text-primary-foreground" : ""}`}
            onClick={() => setIsLocked(!isLocked)}
          >
            <Lock className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-14 w-14 rounded-full"
            onClick={() => setIsPaused(!isPaused)}
            disabled={isLocked}
          >
            {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
