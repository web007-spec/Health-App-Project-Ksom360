import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, SkipForward, SkipBack, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

interface WorkoutPlayerProps {
  sections: Section[];
  onComplete: () => void;
  onExit: () => void;
}

export function WorkoutPlayer({ sections, onComplete, onExit }: WorkoutPlayerProps) {
  const { toast } = useToast();
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [phase, setPhase] = useState<"work" | "rest" | "round_rest">("work");
  const [currentSet, setCurrentSet] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);

  const currentSection = sections[currentSectionIndex];
  const currentExercise = currentSection?.exercises[currentExerciseIndex];
  const isTimedWorkout = ["emom", "amrap", "tabata"].includes(currentSection?.section_type);

  // Calculate total progress
  const getTotalProgress = () => {
    let completedExercises = 0;
    let totalExercises = 0;

    sections.forEach((section, sIdx) => {
      const exercisesInSection = section.exercises.length * section.rounds;
      totalExercises += exercisesInSection;

      if (sIdx < currentSectionIndex) {
        completedExercises += exercisesInSection;
      } else if (sIdx === currentSectionIndex) {
        completedExercises += (currentRound - 1) * section.exercises.length + currentExerciseIndex;
      }
    });

    return (completedExercises / totalExercises) * 100;
  };

  // Timer logic
  useEffect(() => {
    if (!isPlaying || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleTimerComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, timeRemaining]);

  // Play completion sound
  const playSound = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(console.error);
    }
  };

  const handleTimerComplete = () => {
    playSound();

    if (phase === "work") {
      // Move to rest phase
      if (currentSection.rest_seconds || currentExercise.rest_seconds) {
        setPhase("rest");
        setTimeRemaining(currentExercise.rest_seconds || currentSection.rest_seconds || 0);
      } else {
        moveToNextExercise();
      }
    } else if (phase === "rest") {
      moveToNextExercise();
    } else if (phase === "round_rest") {
      startNextRound();
    }
  };

  const moveToNextExercise = () => {
    const nextExerciseIndex = currentExerciseIndex + 1;

    if (nextExerciseIndex < currentSection.exercises.length) {
      // Next exercise in current section
      setCurrentExerciseIndex(nextExerciseIndex);
      setPhase("work");
      setCurrentSet(1);
      startWorkPhase();
    } else if (currentRound < currentSection.rounds) {
      // Next round in current section
      setPhase("round_rest");
      setTimeRemaining(currentSection.rest_between_rounds_seconds || 60);
    } else {
      // Move to next section
      moveToNextSection();
    }
  };

  const moveToPreviousExercise = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(currentExerciseIndex - 1);
      setPhase("work");
      setCurrentSet(1);
      startWorkPhase();
    } else if (currentSectionIndex > 0) {
      const prevSection = sections[currentSectionIndex - 1];
      setCurrentSectionIndex(currentSectionIndex - 1);
      setCurrentExerciseIndex(prevSection.exercises.length - 1);
      setCurrentRound(prevSection.rounds);
      setPhase("work");
      setCurrentSet(1);
      startWorkPhase();
    }
  };

  const startNextRound = () => {
    setCurrentRound((prev) => prev + 1);
    setCurrentExerciseIndex(0);
    setPhase("work");
    setCurrentSet(1);
    startWorkPhase();
  };

  const moveToNextSection = () => {
    const nextSectionIndex = currentSectionIndex + 1;

    if (nextSectionIndex < sections.length) {
      setCurrentSectionIndex(nextSectionIndex);
      setCurrentExerciseIndex(0);
      setCurrentRound(1);
      setPhase("work");
      setCurrentSet(1);
      setIsPlaying(false);
      setTimeRemaining(0);
      
      toast({
        title: "Section Complete!",
        description: `Starting: ${sections[nextSectionIndex].name}`,
      });
    } else {
      // Workout complete
      setIsPlaying(false);
      toast({
        title: "Workout Complete!",
        description: "Great job! You finished the workout.",
      });
      onComplete();
    }
  };

  const startWorkPhase = () => {
    if (isTimedWorkout && currentSection.work_seconds) {
      setTimeRemaining(currentSection.work_seconds);
      setIsPlaying(true);
    }
  };

  const handlePlayPause = () => {
    if (!isPlaying && timeRemaining === 0) {
      // Start workout
      startWorkPhase();
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleCompleteSet = () => {
    if (currentExercise.sets && currentSet < currentExercise.sets) {
      setCurrentSet((prev) => prev + 1);
      if (currentExercise.rest_seconds) {
        setPhase("rest");
        setTimeRemaining(currentExercise.rest_seconds);
        setIsPlaying(true);
      }
    } else {
      moveToNextExercise();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getSectionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      straight_set: "Straight Set",
      superset: "Superset",
      circuit: "Circuit",
      drop_set: "Drop Set",
      emom: "EMOM",
      amrap: "AMRAP",
      tabata: "TABATA",
    };
    return labels[type] || type;
  };

  if (!currentSection || !currentExercise) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">{currentSection.name}</h1>
              <div className="flex gap-2 mt-1">
                <Badge variant="outline">{getSectionTypeLabel(currentSection.section_type)}</Badge>
                <Badge variant="outline">Round {currentRound}/{currentSection.rounds}</Badge>
              </div>
            </div>
            <Button variant="ghost" onClick={onExit}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <Progress value={getTotalProgress()} className="h-2" />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 container mx-auto p-6 max-w-4xl">
        <div className="space-y-6">
          {/* Exercise Display */}
          <Card className="p-6">
            <div className="text-center space-y-4">
              {/* Phase Indicator */}
              {phase === "rest" && (
                <div className="bg-primary/10 text-primary px-4 py-2 rounded-full inline-block font-semibold">
                  REST TIME
                </div>
              )}
              {phase === "round_rest" && (
                <div className="bg-accent text-accent-foreground px-4 py-2 rounded-full inline-block font-semibold">
                  ROUND REST
                </div>
              )}
              {phase === "work" && (
                <div className="bg-green-500/10 text-green-600 px-4 py-2 rounded-full inline-block font-semibold">
                  WORK TIME
                </div>
              )}

              {/* Exercise Media */}
              {currentExercise.exercise_video && (
                <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                  <video
                    src={currentExercise.exercise_video}
                    controls
                    loop
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              {!currentExercise.exercise_video && currentExercise.exercise_image && (
                <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                  <img
                    src={currentExercise.exercise_image}
                    alt={currentExercise.exercise_name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Exercise Name */}
              <h2 className="text-4xl font-bold">{currentExercise.exercise_name}</h2>

              {/* Timer or Set Info */}
              {isTimedWorkout ? (
                <div className="text-8xl font-bold text-primary tabular-nums">
                  {formatTime(timeRemaining)}
                </div>
              ) : (
                <div className="space-y-2">
                  {currentExercise.sets && (
                    <div className="text-5xl font-bold">
                      Set {currentSet} / {currentExercise.sets}
                    </div>
                  )}
                  <div className="text-2xl text-muted-foreground">
                    {currentExercise.reps && `${currentExercise.reps} reps`}
                    {currentExercise.duration_seconds && `${currentExercise.duration_seconds}s`}
                    {currentExercise.tempo && ` • Tempo: ${currentExercise.tempo}`}
                  </div>
                </div>
              )}

              {/* Exercise Notes */}
              {currentExercise.notes && (
                <p className="text-muted-foreground text-lg">{currentExercise.notes}</p>
              )}
              {currentExercise.exercise_description && (
                <p className="text-sm text-muted-foreground">{currentExercise.exercise_description}</p>
              )}
            </div>
          </Card>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={moveToPreviousExercise}
              disabled={currentSectionIndex === 0 && currentExerciseIndex === 0}
            >
              <SkipBack className="h-6 w-6" />
            </Button>

            {isTimedWorkout ? (
              <Button
                size="lg"
                onClick={handlePlayPause}
                className="h-16 w-16 rounded-full"
              >
                {isPlaying ? (
                  <Pause className="h-8 w-8" />
                ) : (
                  <Play className="h-8 w-8 ml-1" />
                )}
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={handleCompleteSet}
                className="h-16 px-8 rounded-full"
              >
                <Check className="h-6 w-6 mr-2" />
                Complete Set
              </Button>
            )}

            <Button
              variant="outline"
              size="icon"
              onClick={moveToNextExercise}
            >
              <SkipForward className="h-6 w-6" />
            </Button>
          </div>

          {/* Up Next */}
          {currentExerciseIndex < currentSection.exercises.length - 1 && (
            <Card className="p-4 bg-muted/50">
              <div className="text-sm text-muted-foreground mb-1">Up Next</div>
              <div className="font-medium">
                {currentSection.exercises[currentExerciseIndex + 1].exercise_name}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Audio for completion sound */}
      <audio ref={audioRef} src="/notification.mp3" preload="auto" />
    </div>
  );
}
