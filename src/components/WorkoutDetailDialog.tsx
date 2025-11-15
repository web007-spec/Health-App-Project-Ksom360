import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Target, Dumbbell, Play, CheckCircle2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Exercise {
  exercise: {
    id: string;
    name: string;
    description: string | null;
    muscle_group: string | null;
    equipment: string | null;
    image_url: string | null;
    video_url: string | null;
  };
  sets: number | null;
  reps: number | null;
  duration_seconds: number | null;
  rest_seconds: number | null;
  notes: string | null;
  order_index: number;
}

interface WorkoutPlan {
  id: string;
  name: string;
  description: string | null;
  category: string;
  difficulty: string;
  duration_minutes: number;
  image_url: string | null;
  video_url: string | null;
  workout_plan_exercises: Exercise[];
}

interface WorkoutDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workout: WorkoutPlan | null;
  isCompleted: boolean;
  onMarkComplete: () => void;
  completingWorkout: boolean;
}

const difficultyColors = {
  beginner: "bg-success/10 text-success",
  intermediate: "bg-accent/10 text-accent",
  advanced: "bg-destructive/10 text-destructive",
};

export function WorkoutDetailDialog({
  open,
  onOpenChange,
  workout,
  isCompleted,
  onMarkComplete,
  completingWorkout,
}: WorkoutDetailDialogProps) {
  if (!workout) return null;

  const exercises = workout.workout_plan_exercises?.sort((a, b) => a.order_index - b.order_index) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl">{workout.name}</DialogTitle>
              {workout.description && (
                <p className="text-muted-foreground mt-2">{workout.description}</p>
              )}
            </div>
            {isCompleted ? (
              <Badge className="bg-success/10 text-success">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Completed
              </Badge>
            ) : (
              <Button onClick={onMarkComplete} disabled={completingWorkout}>
                {completingWorkout ? "Marking..." : "Mark Complete"}
              </Button>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-200px)] pr-4">
          <div className="space-y-6">
            {/* Workout Info */}
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="font-semibold">{workout.duration_minutes} min</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Difficulty</p>
                  <Badge className={difficultyColors[workout.difficulty as keyof typeof difficultyColors]}>
                    {workout.difficulty}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Category</p>
                  <p className="font-semibold">{workout.category}</p>
                </div>
              </div>
            </div>

            {/* Video */}
            {workout.video_url && (
              <Card>
                <CardContent className="pt-6">
                  <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                    <a
                      href={workout.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-2 hover:text-primary transition-colors"
                    >
                      <Play className="h-12 w-12" />
                      <span className="text-sm font-medium">Watch Workout Video</span>
                    </a>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Exercises */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Exercises ({exercises.length})</h3>
              {exercises.map((exercise, index) => (
                <Card key={exercise.exercise.id}>
                  <CardContent className="pt-6">
                    <div className="flex gap-4">
                      {exercise.exercise.image_url && (
                        <img
                          src={exercise.exercise.image_url}
                          alt={exercise.exercise.name}
                          className="w-24 h-24 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-primary">#{index + 1}</span>
                              <h4 className="font-semibold text-lg">{exercise.exercise.name}</h4>
                            </div>
                            {exercise.exercise.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {exercise.exercise.description}
                              </p>
                            )}
                          </div>
                          {exercise.exercise.video_url && (
                            <a
                              href={exercise.exercise.video_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              <Play className="h-5 w-5" />
                            </a>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-3 text-sm">
                          {exercise.sets && (
                            <Badge variant="outline">
                              {exercise.sets} {exercise.sets === 1 ? "set" : "sets"}
                            </Badge>
                          )}
                          {exercise.reps && (
                            <Badge variant="outline">
                              {exercise.reps} {exercise.reps === 1 ? "rep" : "reps"}
                            </Badge>
                          )}
                          {exercise.duration_seconds && (
                            <Badge variant="outline">{exercise.duration_seconds}s duration</Badge>
                          )}
                          {exercise.rest_seconds && (
                            <Badge variant="outline">{exercise.rest_seconds}s rest</Badge>
                          )}
                        </div>

                        {(exercise.exercise.muscle_group || exercise.exercise.equipment) && (
                          <div className="flex flex-wrap gap-2 text-xs">
                            {exercise.exercise.muscle_group && (
                              <Badge variant="secondary">{exercise.exercise.muscle_group}</Badge>
                            )}
                            {exercise.exercise.equipment && (
                              <Badge variant="secondary">{exercise.exercise.equipment}</Badge>
                            )}
                          </div>
                        )}

                        {exercise.notes && (
                          <p className="text-sm text-muted-foreground italic border-l-2 border-primary pl-3">
                            {exercise.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
