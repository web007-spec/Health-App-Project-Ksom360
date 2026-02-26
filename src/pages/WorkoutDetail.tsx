import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Play, Clock, Dumbbell, Weight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { WorkoutPlayer, unlockAudioForMobile } from "@/components/WorkoutPlayer";
import { WorkoutSummary } from "@/components/WorkoutSummary";
import { awardBadges } from "@/hooks/useBadgeAwarder";

interface CompletionData {
  setLogs: Record<string, { reps: string; weight: string; completed: boolean }>;
  elapsedSeconds: number;
  startedAt: string;
}

export default function WorkoutDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, userRole } = useAuth();
  const [isPlaying, setIsPlaying] = useState(searchParams.get("start") === "true");
  const [summaryData, setSummaryData] = useState<{
    sessionId: string;
    setLogs: Record<string, any>;
    durationSeconds: number;
    startedAt: string;
    completedAt: string;
    isPartial: boolean;
  } | null>(null);
  const isClient = userRole === "client";

  // Fetch client_workout record for this workout plan
  const { data: clientWorkout } = useQuery({
    queryKey: ["client-workout-for-plan", id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_workouts")
        .select("*")
        .eq("workout_plan_id", id)
        .eq("client_id", user?.id)
        .is("completed_at", null)
        .order("assigned_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user?.id && isClient,
  });

  const { data: workout, isLoading } = useQuery({
    queryKey: ["workout-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_plans")
        .select(`
          *,
          workout_sections(
            *,
            workout_plan_exercises(
              *,
              exercise:exercises(*)
            )
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Transform data for WorkoutPlayer
  const transformedSections = workout?.workout_sections
    ?.sort((a: any, b: any) => a.order_index - b.order_index)
    .map((section: any) => ({
      id: section.id,
      name: section.name,
      section_type: section.section_type,
      rounds: section.rounds,
      work_seconds: section.work_seconds,
      rest_seconds: section.rest_seconds,
      rest_between_rounds_seconds: section.rest_between_rounds_seconds,
      notes: section.notes || "",
      exercises: section.workout_plan_exercises
        ?.sort((a: any, b: any) => a.order_index - b.order_index)
        .map((wpe: any) => ({
          id: wpe.id,
          exercise_id: wpe.exercise_id,
          is_rest: !wpe.exercise_id,
          exercise_name: wpe.exercise?.name || (!wpe.exercise_id ? "Rest" : ""),
          exercise_image: wpe.exercise?.image_url,
          exercise_video: wpe.exercise?.video_url,
          exercise_description: wpe.exercise?.description,
          equipment: wpe.exercise?.equipment,
          sets: wpe.sets,
          reps: wpe.reps,
          duration_seconds: wpe.duration_seconds,
          rest_seconds: wpe.rest_seconds,
          tempo: wpe.tempo || "",
          notes: wpe.notes || "",
        })) || [],
    })) || [];

  const totalExercises = transformedSections.reduce((sum: number, section: any) => {
    const nonRestExercises = section.exercises.filter((e: any) => e.exercise_id);
    const isGrouped = ["superset", "circuit"].includes(section.section_type);

    if (!isGrouped) return sum + nonRestExercises.length;

    const uniqueIds = new Set(nonRestExercises.map((e: any) => e.exercise_id));
    return sum + uniqueIds.size;
  }, 0);

  // Calculate true duration from actual exercise data (same formula as WorkoutPlayer)
  const calculatedTotalSeconds = transformedSections.reduce((acc: number, section: any) => {
    const isGrouped = ["superset", "circuit"].includes(section.section_type);
    if (isGrouped) {
      section.exercises.forEach((ex: any) => { acc += (ex.duration_seconds || 45) * section.rounds; });
      const exRestTotal = section.exercises.reduce((sum: number, ex: any) => sum + (ex.rest_seconds || 0), 0);
      acc += exRestTotal * section.rounds;
      acc += (section.rest_between_rounds_seconds || 60) * Math.max(0, section.rounds - 1);
    } else {
      section.exercises.forEach((ex: any) => {
        acc += ((ex.duration_seconds || 30) + (ex.rest_seconds || 30)) * (ex.sets || 1);
      });
    }
    return acc;
  }, 0);
  const calculatedMinutes = Math.ceil(calculatedTotalSeconds / 60);

  const saveSession = async (data: CompletionData, isPartial: boolean) => {
    const completedAt = new Date().toISOString();

    // Create workout session
    const { data: session, error: sessionError } = await supabase
      .from("workout_sessions")
      .insert({
        client_workout_id: clientWorkout?.id || null,
        client_id: user?.id,
        workout_plan_id: id,
        started_at: data.startedAt,
        completed_at: completedAt,
        duration_seconds: data.elapsedSeconds,
        is_partial: isPartial,
      })
      .select()
      .single();

    if (sessionError) throw sessionError;

    // Save exercise logs
    const logs: any[] = [];
    transformedSections.forEach((section: any, sIdx: number) => {
      const isGrouped = ["superset", "circuit"].includes(section.section_type);
      section.exercises.forEach((ex: any, eIdx: number) => {
        if (isGrouped) {
          for (let r = 1; r <= section.rounds; r++) {
            const key = `${sIdx}-${eIdx}-${r}-1`;
            const log = data.setLogs[key];
            if (log) {
              logs.push({
                session_id: session.id,
                exercise_id: ex.exercise_id,
                set_number: r,
                reps: log.reps ? parseInt(log.reps) : null,
                weight: log.weight ? parseFloat(log.weight) : null,
                completed: log.completed,
              });
            }
          }
        } else {
          const totalSets = ex.sets || 1;
          for (let s = 1; s <= totalSets; s++) {
            const key = `${sIdx}-${eIdx}-1-${s}`;
            const log = data.setLogs[key];
            if (log) {
              logs.push({
                session_id: session.id,
                exercise_id: ex.exercise_id,
                set_number: s,
                reps: log.reps ? parseInt(log.reps) : null,
                weight: log.weight ? parseFloat(log.weight) : null,
                completed: log.completed,
              });
            }
          }
        }
      });
    });

    if (logs.length > 0) {
      await supabase.from("workout_exercise_logs").insert(logs);
    }

    // Mark client_workout as completed
    if (clientWorkout?.id && !isPartial) {
      await supabase
        .from("client_workouts")
        .update({ completed_at: completedAt })
        .eq("id", clientWorkout.id);
    }

    // Award badges
    await awardBadges(user?.id!, session.id, workout?.difficulty);

    return { sessionId: session.id, completedAt };
  };

  const handleComplete = async (data: CompletionData) => {
    setIsPlaying(false);
    if (!isClient) {
      navigate("/workouts");
      return;
    }
    try {
      const result = await saveSession(data, false);
      setSummaryData({
        sessionId: result.sessionId,
        setLogs: data.setLogs,
        durationSeconds: data.elapsedSeconds,
        startedAt: data.startedAt,
        completedAt: result.completedAt,
        isPartial: false,
      });
    } catch (err) {
      console.error("Failed to save session:", err);
      navigate("/client/dashboard");
    }
  };

  const handleEndEarly = async (data: CompletionData) => {
    setIsPlaying(false);
    if (!isClient) {
      navigate("/workouts");
      return;
    }
    try {
      const result = await saveSession(data, true);
      setSummaryData({
        sessionId: result.sessionId,
        setLogs: data.setLogs,
        durationSeconds: data.elapsedSeconds,
        startedAt: data.startedAt,
        completedAt: result.completedAt,
        isPartial: true,
      });
    } catch (err) {
      console.error("Failed to save session:", err);
      navigate("/client/dashboard");
    }
  };

  const handleDiscard = () => {
    setIsPlaying(false);
    navigate(isClient ? "/client/dashboard" : "/workouts");
  };

  const handleExit = () => {
    setIsPlaying(false);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading workout...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!workout) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Workout not found</p>
          <Button onClick={() => navigate(-1)} className="mt-4">
            Go Back
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // Show summary after completion
  if (summaryData) {
    return (
      <WorkoutSummary
        sessionId={summaryData.sessionId}
        workoutName={workout.name}
        durationSeconds={summaryData.durationSeconds}
        startedAt={summaryData.startedAt}
        completedAt={summaryData.completedAt}
        isPartial={summaryData.isPartial}
        setLogs={summaryData.setLogs}
        sections={transformedSections}
        onClose={() => navigate("/client/dashboard")}
      />
    );
  }

  // Show workout player when playing
  if (isPlaying) {
    return (
      <WorkoutPlayer
        sections={transformedSections}
        onComplete={handleComplete}
        onEndEarly={handleEndEarly}
        onDiscard={handleDiscard}
        onExit={handleExit}
      />
    );
  }

  // Show workout preview
  const Layout = isClient ? ClientLayout : DashboardLayout;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{workout.name}</h1>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline" className="capitalize">
                {workout.difficulty}
              </Badge>
              <Badge variant="outline">{workout.category}</Badge>
            </div>
          </div>
          <Button size="lg" onClick={() => { unlockAudioForMobile(); setIsPlaying(true); }} className="gap-2">
            <Play className="h-5 w-5" />
            Start Workout
          </Button>
        </div>

        {/* Workout Info */}
        {(() => {
          const equipmentList: string[] = (workout as any).equipment || [];

          return (
            <Card className="mb-6">
              <CardContent className="p-6">
                {workout.description && (
                  <p className="text-muted-foreground mb-4">{workout.description}</p>
                )}
                
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <div className="text-2xl font-bold">{calculatedMinutes}</div>
                    <div className="text-sm text-muted-foreground">Minutes</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold mx-auto mb-2">💪</div>
                    <div className="text-2xl font-bold">{totalExercises}</div>
                    <div className="text-sm text-muted-foreground">Exercises</div>
                  </div>
                  <div>
                    <Dumbbell className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <div className="text-2xl font-bold">{equipmentList.length || "—"}</div>
                    <div className="text-sm text-muted-foreground">Equipment</div>
                  </div>
                </div>

                {equipmentList.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Equipment</p>
                    <div className="flex flex-wrap gap-2">
                      {equipmentList.map((eq) => (
                        <Badge key={eq} variant="secondary" className="capitalize">
                          {eq}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })()}

        {/* Workout Preview */}
        <div className="space-y-6">
          {transformedSections.map((section: any) => (
            <Card key={section.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{section.name}</CardTitle>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="capitalize">
                      {section.section_type.replace(/_/g, " ")}
                    </Badge>
                    {section.rounds > 1 && (
                      <Badge variant="outline">{section.rounds} Rounds</Badge>
                    )}
                  </div>
                </div>
                {section.notes && (
                  <p className="text-sm text-muted-foreground mt-2">{section.notes}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {section.exercises.map((exercise: any, exIdx: number) => (
                  <div key={exercise.id}>
                    {exIdx > 0 && <Separator />}
                    <div className="flex gap-4 pt-4">
                      {exercise.exercise_image && (
                        <img
                          src={exercise.exercise_image}
                          alt={exercise.exercise_name}
                          className="w-20 h-20 rounded object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <h4 className="font-semibold">{exercise.exercise_name || "Exercise"}</h4>
                        <div className="text-sm text-muted-foreground mt-1">
                          {exercise.is_rest ? (
                            <>
                              Rest
                              {exercise.duration_seconds && ` • ${exercise.duration_seconds >= 60 ? `${Math.round(exercise.duration_seconds / 60)}min` : `${exercise.duration_seconds}s`}`}
                            </>
                          ) : (
                            <>
                              {!["superset", "circuit"].includes(section.section_type) && exercise.sets && `${exercise.sets} sets`}
                              {exercise.reps && ` × ${exercise.reps} reps`}
                              {exercise.duration_seconds && ` • ${exercise.duration_seconds >= 3600 ? `${Math.round(exercise.duration_seconds / 3600)}hr` : exercise.duration_seconds >= 60 ? `${Math.round(exercise.duration_seconds / 60)}min` : `${exercise.duration_seconds}s`}`}
                              {exercise.rest_seconds && ` • ${exercise.rest_seconds >= 60 ? `${Math.round(exercise.rest_seconds / 60)}min rest` : `${exercise.rest_seconds}s rest`}`}
                              {exercise.tempo && ` • Tempo: ${exercise.tempo}`}
                            </>
                          )}
                        </div>
                        {exercise.notes && (
                          <p className="text-sm text-muted-foreground mt-1">{exercise.notes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Video Preview */}
        {workout.video_url && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Workout Demo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-video rounded-lg overflow-hidden">
                <video
                  src={workout.video_url}
                  controls
                  className="w-full h-full object-cover"
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
