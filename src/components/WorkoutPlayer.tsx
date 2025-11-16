import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, SkipForward, SkipBack, Check, X, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ExerciseSwapDialog } from "@/components/ExerciseSwapDialog";

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
  const [swapDialogOpen, setSwapDialogOpen] = useState(false);
  const [modifiedSections, setModifiedSections] = useState<Section[]>(sections);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const completionAudioRef = useRef<HTMLAudioElement>(null);
  const beepAudioRef = useRef<HTMLAudioElement>(null);
  const lastAnnouncedSecond = useRef<number>(-1);

  // Update modified sections when sections prop changes
  useEffect(() => {
    setModifiedSections(sections);
  }, [sections]);

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // Voice announcement function
  const speak = (text: string) => {
    if (!voiceEnabled) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  // Announce exercise changes
  useEffect(() => {
    if (currentExercise && isPlaying && phase === "work") {
      const exerciseName = currentExercise.exercise_name || "Exercise";
      speak(`Starting ${exerciseName}`);
      
      // Announce the next exercise if not the last one
      const nextExerciseIndex = currentExerciseIndex + 1;
      if (nextExerciseIndex < currentSection.exercises.length) {
        const nextExercise = currentSection.exercises[nextExerciseIndex];
        setTimeout(() => {
          if (voiceEnabled) {
            speak(`Next up: ${nextExercise.exercise_name}`);
          }
        }, 2000);
      }
    }
  }, [currentExerciseIndex, currentSectionIndex, currentRound, phase]);

  const currentSection = modifiedSections[currentSectionIndex];
  const currentExercise = currentSection?.exercises[currentExerciseIndex];
  const isTimedWorkout = ["emom", "amrap", "tabata"].includes(currentSection?.section_type);

  const handleSwapExercise = (newExercise: any) => {
    const updatedSections = [...modifiedSections];
    const currentExerciseData = updatedSections[currentSectionIndex].exercises[currentExerciseIndex];
    
    // Preserve the workout parameters but update the exercise details
    updatedSections[currentSectionIndex].exercises[currentExerciseIndex] = {
      ...currentExerciseData,
      exercise_id: newExercise.id,
      exercise_name: newExercise.name,
      exercise_image: newExercise.image_url,
      exercise_video: newExercise.video_url,
      exercise_description: newExercise.description,
    };

    setModifiedSections(updatedSections);
    
    toast({
      title: "Exercise Swapped",
      description: `Switched to ${newExercise.name}`,
    });
  };

  // Calculate total progress
  const getTotalProgress = () => {
    let completedExercises = 0;
    let totalExercises = 0;

    modifiedSections.forEach((section, sIdx) => {
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
        
        // Play countdown beeps during rest periods
        if ((phase === "rest" || phase === "round_rest") && prev <= 5 && prev > 1) {
          beepAudioRef.current?.play().catch(console.error);
        }
        
        // Voice countdown for rest periods
        if ((phase === "rest" || phase === "round_rest") && prev <= 5 && prev !== lastAnnouncedSecond.current && voiceEnabled) {
          lastAnnouncedSecond.current = prev;
          speak(`${prev}`);
        }
        
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, timeRemaining, phase, voiceEnabled]);

  // Play completion sound
  const playSound = () => {
    if (completionAudioRef.current) {
      completionAudioRef.current.play().catch(console.error);
    }
  };

  const handleTimerComplete = () => {
    playSound();

    if (phase === "work") {
      // Move to rest phase
      if (currentSection.rest_seconds || currentExercise.rest_seconds) {
        setPhase("rest");
        const restTime = currentExercise.rest_seconds || currentSection.rest_seconds || 0;
        setTimeRemaining(restTime);
        lastAnnouncedSecond.current = -1; // Reset for new rest period
        speak(`Rest for ${restTime} seconds`);
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
      const roundRestTime = currentSection.rest_between_rounds_seconds || 60;
      setTimeRemaining(roundRestTime);
      lastAnnouncedSecond.current = -1; // Reset for new rest period
      speak(`Round complete. Rest for ${roundRestTime} seconds before round ${currentRound + 1}`);
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
      const prevSection = modifiedSections[currentSectionIndex - 1];
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
    speak(`Starting round ${currentRound + 1}`);
    startWorkPhase();
  };

  const moveToNextSection = () => {
    const nextSectionIndex = currentSectionIndex + 1;

    if (nextSectionIndex < modifiedSections.length) {
      setCurrentSectionIndex(nextSectionIndex);
      setCurrentExerciseIndex(0);
      setCurrentRound(1);
      setPhase("work");
      setCurrentSet(1);
      setIsPlaying(false);
      setTimeRemaining(0);
      
      const nextSectionName = modifiedSections[nextSectionIndex].name;
      speak(`Section complete. Moving to ${nextSectionName}`);
      
      toast({
        title: "Section Complete!",
        description: `Starting: ${nextSectionName}`,
      });
    } else {
      // Workout complete
      setIsPlaying(false);
      speak("Workout complete! Great job!");
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
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                title={voiceEnabled ? "Disable voice guidance" : "Enable voice guidance"}
              >
                {voiceEnabled ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" x2="12" y1="19" y2="22"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="2" x2="22" y1="2" y2="22"/>
                    <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/>
                    <path d="M5 10v2a7 7 0 0 0 12 5"/>
                    <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/>
                    <path d="M9 9v3a3 3 0 0 0 5.12 2.12"/>
                    <line x1="12" x2="12" y1="19" y2="22"/>
                  </svg>
                )}
              </Button>
              <Button variant="ghost" onClick={onExit}>
                <X className="h-5 w-5" />
              </Button>
            </div>
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

              {/* Swap Exercise Button */}
              <Button
                variant="outline"
                onClick={() => setSwapDialogOpen(true)}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Swap Exercise
              </Button>
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

      {/* Audio for sounds */}
      <audio ref={completionAudioRef} src="/notification.mp3" preload="auto" />
      <audio ref={beepAudioRef} src="data:audio/wav;base64,UklGRhQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=" preload="auto" />

      {/* Exercise Swap Dialog */}
      <ExerciseSwapDialog
        open={swapDialogOpen}
        onOpenChange={setSwapDialogOpen}
        currentExercise={{
          id: currentExercise.exercise_id,
          name: currentExercise.exercise_name || "",
          muscle_group: currentExercise.exercise_description,
          equipment: "",
        }}
        onSwap={handleSwapExercise}
      />
    </div>
  );
}
