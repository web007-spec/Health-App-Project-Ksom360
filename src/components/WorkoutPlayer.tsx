import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { X, Timer, MoreVertical, Play, Pause, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ExerciseSwapDialog } from "@/components/ExerciseSwapDialog";
import { cn } from "@/lib/utils";

interface Exercise {
  id: string;
  exercise_id: string;
  exercise_name?: string;
  exercise_image?: string;
  exercise_video?: string;
  exercise_description?: string;
  sets: number | null;
  reps: number | null;
  duration_seconds: number | null;
  rest_seconds: number | null;
  tempo: string;
  notes: string;
}

interface Section {
  id: string;
  name: string;
  section_type: string;
  rounds: number;
  work_seconds: number | null;
  rest_seconds: number | null;
  rest_between_rounds_seconds: number | null;
  notes: string;
  exercises: Exercise[];
}

interface SetLog {
  reps: string;
  weight: string;
  completed: boolean;
}

interface WorkoutPlayerProps {
  sections: Section[];
  onComplete: () => void;
  onExit: () => void;
}

export function WorkoutPlayer({ sections, onComplete, onExit }: WorkoutPlayerProps) {
  const { toast } = useToast();
  const [modifiedSections, setModifiedSections] = useState<Section[]>(sections);
  const [swapDialogOpen, setSwapDialogOpen] = useState(false);
  const [swapTarget, setSwapTarget] = useState<{ sectionIdx: number; exerciseIdx: number } | null>(null);
  const [setLogs, setSetLogs] = useState<Record<string, SetLog>>({});

  // Global elapsed timer (counts UP)
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [workoutStarted, setWorkoutStarted] = useState(false);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Rest countdown timer
  const [restTimer, setRestTimer] = useState(0);
  const [restTimerMax, setRestTimerMax] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Track which set key to highlight next
  const [activeSetKey, setActiveSetKey] = useState<string>("");

  useEffect(() => {
    setModifiedSections(sections);
  }, [sections]);

  // Start workout automatically
  useEffect(() => {
    setWorkoutStarted(true);
  }, []);

  // Global elapsed timer
  useEffect(() => {
    if (workoutStarted) {
      elapsedRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (elapsedRef.current) clearInterval(elapsedRef.current);
    };
  }, [workoutStarted]);

  // Rest countdown timer
  useEffect(() => {
    if (isResting && restTimer > 0) {
      timerRef.current = setInterval(() => {
        setRestTimer((prev) => {
          if (prev <= 1) {
            setIsResting(false);
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isResting]);

  // Compute first incomplete set key for highlighting
  useEffect(() => {
    const firstIncomplete = findFirstIncompleteKey();
    setActiveSetKey(firstIncomplete);
  }, [setLogs, modifiedSections, isResting]);

  const findFirstIncompleteKey = (): string => {
    for (let sIdx = 0; sIdx < modifiedSections.length; sIdx++) {
      const section = modifiedSections[sIdx];
      const isGrouped = ["superset", "circuit"].includes(section.section_type);
      if (isGrouped) {
        for (let round = 1; round <= section.rounds; round++) {
          for (let eIdx = 0; eIdx < section.exercises.length; eIdx++) {
            const key = `${sIdx}-${eIdx}-${round}-1`;
            if (!setLogs[key]?.completed) return key;
          }
        }
      } else {
        for (let eIdx = 0; eIdx < section.exercises.length; eIdx++) {
          const totalSets = section.exercises[eIdx].sets || 1;
          for (let s = 1; s <= totalSets; s++) {
            const key = `${sIdx}-${eIdx}-1-${s}`;
            if (!setLogs[key]?.completed) return key;
          }
        }
      }
    }
    return "";
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getSetKey = (sectionIdx: number, exerciseIdx: number, round: number, setNum: number) =>
    `${sectionIdx}-${exerciseIdx}-${round}-${setNum}`;

  const updateSetLog = (key: string, field: "reps" | "weight", value: string) => {
    setSetLogs((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
        completed: prev[key]?.completed || false,
      },
    }));
  };

  const completeSet = (key: string, restSeconds: number) => {
    setSetLogs((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        reps: prev[key]?.reps || "",
        weight: prev[key]?.weight || "",
        completed: true,
      },
    }));
    // Start rest timer
    if (restSeconds > 0) {
      startRestTimer(restSeconds);
    }
  };

  const startRestTimer = (seconds: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRestTimer(seconds);
    setRestTimerMax(seconds);
    setIsResting(true);
  };

  const skipRest = () => {
    setIsResting(false);
    setRestTimer(0);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleSwapExercise = (newExercise: any) => {
    if (!swapTarget) return;
    const updatedSections = [...modifiedSections];
    const currentExerciseData = updatedSections[swapTarget.sectionIdx].exercises[swapTarget.exerciseIdx];
    updatedSections[swapTarget.sectionIdx].exercises[swapTarget.exerciseIdx] = {
      ...currentExerciseData,
      exercise_id: newExercise.id,
      exercise_name: newExercise.name,
      exercise_image: newExercise.image_url,
      exercise_video: newExercise.video_url,
      exercise_description: newExercise.description,
    };
    setModifiedSections(updatedSections);
    toast({ title: "Exercise Swapped", description: `Switched to ${newExercise.name}` });
  };

  const getSectionTypeLabel = (type: string, rounds: number) => {
    if (type === "superset") return `Superset of ${rounds} sets`;
    if (type === "circuit") return `Circuit of ${rounds} rounds`;
    if (type === "straight_set") return null;
    const labels: Record<string, string> = { drop_set: "Drop Set", emom: "EMOM", amrap: "AMRAP", tabata: "TABATA" };
    return labels[type] || type;
  };

  const restProgress = restTimerMax > 0 ? ((restTimerMax - restTimer) / restTimerMax) * 100 : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Global Timer Header - Trainerize style */}
      <div className="sticky top-0 z-20 bg-card border-b">
        {/* Elapsed time large display */}
        <div className="bg-foreground text-background text-center py-3">
          <span className="text-3xl font-mono font-bold tracking-wider">{formatTime(elapsedSeconds)}</span>
        </div>
        {/* Cancel / Save bar */}
        <div className="flex items-center justify-between px-4 py-2">
          <Button variant="ghost" size="sm" onClick={onExit} className="text-sm">
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startRestTimer(60)}>
              <Clock className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              toast({ title: "Workout Saved", description: "Your progress has been saved." });
              onComplete();
            }}
            className="text-primary font-semibold text-sm"
          >
            Save
          </Button>
        </div>
      </div>

      {/* Rest Timer Overlay Banner */}
      {isResting && (
        <div className="sticky top-[108px] z-10 bg-primary text-primary-foreground px-4 py-3 animate-in slide-in-from-top duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              <span className="font-bold text-lg font-mono">{formatTime(restTimer)}</span>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={skipRest}
              className="h-7 text-xs"
            >
              Skip
            </Button>
          </div>
          <Progress value={restProgress} className="h-1.5 bg-primary-foreground/30" />
        </div>
      )}

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        {modifiedSections.map((section, sIdx) => {
          const isGrouped = ["superset", "circuit"].includes(section.section_type);
          const sectionLabel = getSectionTypeLabel(section.section_type, section.rounds);
          const restBetweenRounds = section.rest_between_rounds_seconds || 60;

          if (isGrouped) {
            return (
              <div key={section.id}>
                {sectionLabel && (
                  <div className="bg-muted/70 px-4 py-2 border-b border-t">
                    <span className="text-sm font-semibold">{sectionLabel}</span>
                    {section.notes && <p className="text-xs text-muted-foreground mt-0.5">{section.notes}</p>}
                  </div>
                )}
                {Array.from({ length: section.rounds }, (_, roundIdx) => {
                  const round = roundIdx + 1;
                  return (
                    <div key={`round-${round}`}>
                      <div className="px-4 pt-4 pb-1">
                        <h3 className="font-bold text-sm">Set {round}</h3>
                      </div>
                      <div className="px-4">
                        {section.exercises.map((exercise, eIdx) => {
                          const key = getSetKey(sIdx, eIdx, round, 1);
                          const log = setLogs[key] || { reps: "", weight: "", completed: false };
                          const isActive = key === activeSetKey;
                          const restSec = exercise.rest_seconds || section.rest_seconds || 60;

                          return (
                            <div key={key}>
                              <div
                                className={cn(
                                  "py-3 rounded-lg transition-all duration-300",
                                  isActive && !log.completed && "bg-primary/5 ring-2 ring-primary/30 px-2 -mx-2"
                                )}
                              >
                                {/* Exercise header */}
                                <div className="flex items-center gap-3 mb-3">
                                  {exercise.exercise_image ? (
                                    <img src={exercise.exercise_image} alt={exercise.exercise_name} className="w-14 h-14 rounded-lg object-cover shrink-0" />
                                  ) : exercise.exercise_video ? (
                                    <video src={exercise.exercise_video} className="w-14 h-14 rounded-lg object-cover shrink-0" muted playsInline preload="metadata" />
                                  ) : (
                                    <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                      <span className="text-lg font-bold text-primary">{exercise.exercise_name?.charAt(0)?.toUpperCase() || "E"}</span>
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-sm leading-tight">{exercise.exercise_name}</h4>
                                    <p className="text-xs text-muted-foreground">
                                      {exercise.reps ? `${exercise.reps} Reps` : ""}
                                      {exercise.duration_seconds ? `${exercise.duration_seconds}s` : ""}
                                    </p>
                                  </div>
                                  <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => { setSwapTarget({ sectionIdx: sIdx, exerciseIdx: eIdx }); setSwapDialogOpen(true); }}>
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </div>
                                {/* Input row */}
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 text-xs text-muted-foreground">
                                    <div className="font-medium mb-1">Previous</div>
                                    <div>—</div>
                                  </div>
                                  <div className="w-20">
                                    <div className="text-xs text-muted-foreground font-medium mb-1 text-center">Reps</div>
                                    <Input type="number" value={log.reps} onChange={(e) => updateSetLog(key, "reps", e.target.value)} className="h-9 text-center text-sm" disabled={log.completed} />
                                  </div>
                                  <div className="w-20">
                                    <div className="text-xs text-muted-foreground font-medium mb-1 text-center">Lbs</div>
                                    <Input type="number" value={log.weight} onChange={(e) => updateSetLog(key, "weight", e.target.value)} className="h-9 text-center text-sm" disabled={log.completed} />
                                  </div>
                                  <div className="w-16 pt-4">
                                    <Button
                                      size="sm"
                                      variant={log.completed ? "secondary" : "default"}
                                      className="w-full h-9 text-xs"
                                      onClick={() => completeSet(key, eIdx === section.exercises.length - 1 ? restSec : 0)}
                                      disabled={log.completed}
                                    >
                                      {log.completed ? "✓" : "Log"}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                              {eIdx < section.exercises.length - 1 && <Separator />}
                            </div>
                          );
                        })}
                      </div>
                      {/* Rest between rounds */}
                      {round < section.rounds && (
                        <div className="px-4 py-2 flex items-center justify-between bg-muted/30 mx-4 rounded-lg mb-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Timer className="h-4 w-4" />
                            <span>Rest for {restBetweenRounds}s</span>
                          </div>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => startRestTimer(restBetweenRounds)}>
                            <Clock className="h-3 w-3 mr-1" />{restBetweenRounds}s
                          </Button>
                        </div>
                      )}
                      {round < section.rounds && <Separator />}
                    </div>
                  );
                })}
                <Separator className="my-2" />
              </div>
            );
          } else {
            // Straight sets
            return (
              <div key={section.id}>
                {section.name && section.name !== "Section" && (
                  <div className="bg-muted/70 px-4 py-2 border-b border-t">
                    <span className="text-sm font-semibold">{section.name}</span>
                    {section.notes && <p className="text-xs text-muted-foreground mt-0.5">{section.notes}</p>}
                  </div>
                )}
                {section.exercises.map((exercise, eIdx) => {
                  const totalSets = exercise.sets || 1;
                  const restSeconds = exercise.rest_seconds || 60;

                  return (
                    <div key={`${sIdx}-${eIdx}`} className="px-4">
                      {/* Exercise header */}
                      <div className="flex items-center gap-3 pt-4 pb-2">
                        {exercise.exercise_image ? (
                          <img src={exercise.exercise_image} alt={exercise.exercise_name} className="w-14 h-14 rounded-lg object-cover shrink-0" />
                        ) : exercise.exercise_video ? (
                          <video src={exercise.exercise_video} className="w-14 h-14 rounded-lg object-cover shrink-0" muted playsInline preload="metadata" />
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-lg font-bold text-primary">{exercise.exercise_name?.charAt(0)?.toUpperCase() || "E"}</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm">{exercise.exercise_name}</h4>
                          <p className="text-xs text-muted-foreground">
                            {totalSets} sets
                            {exercise.reps ? ` × ${exercise.reps} Reps` : ""}
                            {exercise.duration_seconds ? ` × ${exercise.duration_seconds}s` : ""}
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => { setSwapTarget({ sectionIdx: sIdx, exerciseIdx: eIdx }); setSwapDialogOpen(true); }}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Rest between each set indicator */}
                      <div className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2 mb-2">
                        <div className="flex items-center gap-2 text-sm text-primary">
                          <Timer className="h-4 w-4" />
                          <span>Rest between each set</span>
                        </div>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => startRestTimer(restSeconds)}>
                          <Clock className="h-3 w-3 mr-1" />{restSeconds}s
                        </Button>
                      </div>

                      {/* Set rows */}
                      <div className="space-y-1 pb-3">
                        {/* Header labels */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium py-1">
                          <div className="w-10 text-center">Set</div>
                          <div className="flex-1">Previous</div>
                          <div className="w-20 text-center">Reps</div>
                          <div className="w-20 text-center">Lbs</div>
                          <div className="w-16"></div>
                        </div>

                        {Array.from({ length: totalSets }, (_, setIdx) => {
                          const setNum = setIdx + 1;
                          const key = getSetKey(sIdx, eIdx, 1, setNum);
                          const log = setLogs[key] || { reps: "", weight: "", completed: false };
                          const isActive = key === activeSetKey;

                          return (
                            <div
                              key={key}
                              className={cn(
                                "flex items-center gap-2 py-1.5 rounded-lg transition-all duration-300",
                                isActive && !log.completed && "bg-primary/5 ring-2 ring-primary/30 px-1 -mx-1",
                                log.completed && "opacity-60"
                              )}
                            >
                              <div className="w-10 text-center text-sm font-medium">{setNum}</div>
                              <div className="flex-1 text-xs text-muted-foreground">—</div>
                              <Input
                                type="number"
                                value={log.reps}
                                onChange={(e) => updateSetLog(key, "reps", e.target.value)}
                                className={cn("w-20 h-9 text-center text-sm", isActive && !log.completed && "border-primary")}
                                disabled={log.completed}
                              />
                              <Input
                                type="number"
                                value={log.weight}
                                onChange={(e) => updateSetLog(key, "weight", e.target.value)}
                                className={cn("w-20 h-9 text-center text-sm", isActive && !log.completed && "border-primary")}
                                disabled={log.completed}
                              />
                              <Button
                                size="sm"
                                variant={log.completed ? "secondary" : "default"}
                                className="w-16 h-9 text-xs"
                                onClick={() => completeSet(key, setNum < totalSets ? restSeconds : 0)}
                                disabled={log.completed}
                              >
                                {log.completed ? "✓" : "Rest"}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                      {eIdx < section.exercises.length - 1 && <Separator />}
                    </div>
                  );
                })}
                <Separator className="my-2" />
              </div>
            );
          }
        })}
      </div>

      {/* Finish Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t p-4 z-10">
        <Button
          className="w-full"
          size="lg"
          onClick={() => {
            if (elapsedRef.current) clearInterval(elapsedRef.current);
            toast({ title: "Workout Complete!", description: `Great job! Duration: ${formatTime(elapsedSeconds)}` });
            onComplete();
          }}
        >
          Finish Workout
        </Button>
      </div>

      {/* Exercise Swap Dialog */}
      {swapTarget && modifiedSections[swapTarget.sectionIdx]?.exercises[swapTarget.exerciseIdx] && (
        <ExerciseSwapDialog
          open={swapDialogOpen}
          onOpenChange={setSwapDialogOpen}
          currentExercise={{
            id: modifiedSections[swapTarget.sectionIdx].exercises[swapTarget.exerciseIdx].exercise_id,
            name: modifiedSections[swapTarget.sectionIdx].exercises[swapTarget.exerciseIdx].exercise_name || "",
            muscle_group: modifiedSections[swapTarget.sectionIdx].exercises[swapTarget.exerciseIdx].exercise_description,
            equipment: "",
          }}
          onSwap={handleSwapExercise}
        />
      )}
    </div>
  );
}
