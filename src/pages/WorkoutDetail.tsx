import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Play, Clock, Dumbbell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { WorkoutPlayer } from "@/components/WorkoutPlayer";

export default function WorkoutDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, userRole } = useAuth();
  const [isPlaying, setIsPlaying] = useState(searchParams.get("start") === "true");
  const isClient = userRole === "client";

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
    ?.sort((a, b) => a.order_index - b.order_index)
    .map((section) => ({
      id: section.id,
      name: section.name,
      section_type: section.section_type,
      rounds: section.rounds,
      work_seconds: section.work_seconds,
      rest_seconds: section.rest_seconds,
      rest_between_rounds_seconds: section.rest_between_rounds_seconds,
      notes: section.notes || "",
      exercises: section.workout_plan_exercises
        ?.sort((a, b) => a.order_index - b.order_index)
        .map((wpe) => ({
          id: wpe.id,
          exercise_id: wpe.exercise_id,
          exercise_name: wpe.exercise?.name,
          exercise_image: wpe.exercise?.image_url,
          exercise_video: wpe.exercise?.video_url,
          exercise_description: wpe.exercise?.description,
          sets: wpe.sets,
          reps: wpe.reps,
          duration_seconds: wpe.duration_seconds,
          rest_seconds: wpe.rest_seconds,
          tempo: wpe.tempo || "",
          notes: wpe.notes || "",
        })) || [],
    })) || [];

  const totalExercises = transformedSections.reduce(
    (sum, section) => sum + section.exercises.length * section.rounds,
    0
  );

  const handleComplete = () => {
    setIsPlaying(false);
    navigate(isClient ? "/client/workouts" : "/workouts");
  };

  const handleEndEarly = () => {
    setIsPlaying(false);
    navigate(isClient ? "/client/workouts" : "/workouts");
  };

  const handleDiscard = () => {
    setIsPlaying(false);
    navigate(isClient ? "/client/workouts" : "/workouts");
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
          <Button size="lg" onClick={() => setIsPlaying(true)} className="gap-2">
            <Play className="h-5 w-5" />
            Start Workout
          </Button>
        </div>

        {/* Workout Info */}
        <Card className="mb-6">
          <CardContent className="p-6">
            {workout.description && (
              <p className="text-muted-foreground mb-4">{workout.description}</p>
            )}
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <div className="text-2xl font-bold">{workout.duration_minutes}</div>
                <div className="text-sm text-muted-foreground">Minutes</div>
              </div>
              <div>
                <Dumbbell className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <div className="text-2xl font-bold">{transformedSections.length}</div>
                <div className="text-sm text-muted-foreground">Sections</div>
              </div>
              <div>
                <div className="text-3xl font-bold mx-auto mb-2">💪</div>
                <div className="text-2xl font-bold">{totalExercises}</div>
                <div className="text-sm text-muted-foreground">Exercises</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Workout Preview */}
        <div className="space-y-6">
          {transformedSections.map((section, sectionIdx) => (
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
                {section.exercises.map((exercise, exIdx) => (
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
                        <h4 className="font-semibold">{exercise.exercise_name}</h4>
                        <div className="text-sm text-muted-foreground mt-1">
                          {exercise.sets && `${exercise.sets} sets`}
                          {exercise.reps && ` × ${exercise.reps} reps`}
                          {exercise.duration_seconds && ` • ${exercise.duration_seconds}s`}
                          {exercise.rest_seconds && ` • ${exercise.rest_seconds}s rest`}
                          {exercise.tempo && ` • Tempo: ${exercise.tempo}`}
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
