import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { X, Square, Lock, Play, Pause, SkipBack, SkipForward, Heart, Volume2, VolumeX } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  onComplete: (data: { setLogs: Record<string, SetLog>; elapsedSeconds: number; startedAt: string }) => void;
  onEndEarly: (data: { setLogs: Record<string, SetLog>; elapsedSeconds: number; startedAt: string }) => void;
  onDiscard: () => void;
  onExit: () => void;
}

// Flatten all steps for circuit mode player
interface WorkoutStep {
  type: "exercise" | "rest";
  sectionIdx: number;
  exerciseIdx: number;
  round: number;
  exercise?: Exercise;
  restSeconds?: number;
  label?: string; // e.g. "Rest"
  setKey?: string;
  isCircuit: boolean;
}

function buildSteps(sections: Section[]): WorkoutStep[] {
  const steps: WorkoutStep[] = [];
  sections.forEach((section, sIdx) => {
    const isGrouped = ["superset", "circuit"].includes(section.section_type);
    if (isGrouped) {
      for (let round = 1; round <= section.rounds; round++) {
        section.exercises.forEach((ex, eIdx) => {
          steps.push({
            type: "exercise",
            sectionIdx: sIdx,
            exerciseIdx: eIdx,
            round,
            exercise: ex,
            isCircuit: true,
            setKey: `${sIdx}-${eIdx}-${round}-1`,
          });
        });
        // Rest between rounds (except last)
        if (round < section.rounds) {
          const restSec = section.rest_between_rounds_seconds || section.rest_seconds || 60;
          steps.push({
            type: "rest",
            sectionIdx: sIdx,
            exerciseIdx: 0,
            round,
            restSeconds: restSec,
            label: `Rest for ${restSec}s`,
            isCircuit: true,
          });
        }
      }
    } else {
      section.exercises.forEach((ex, eIdx) => {
        const totalSets = ex.sets || 1;
        for (let s = 1; s <= totalSets; s++) {
          steps.push({
            type: "exercise",
            sectionIdx: sIdx,
            exerciseIdx: eIdx,
            round: s,
            exercise: ex,
            isCircuit: false,
            setKey: `${sIdx}-${eIdx}-1-${s}`,
          });
          if (s < totalSets && (ex.rest_seconds || 0) > 0) {
            steps.push({
              type: "rest",
              sectionIdx: sIdx,
              exerciseIdx: eIdx,
              round: s,
              restSeconds: ex.rest_seconds || 60,
              label: `Rest for ${ex.rest_seconds || 60}s`,
              isCircuit: false,
            });
          }
        }
      });
    }
  });
  return steps;
}

// Voice guidance using Web Speech API
function speak(text: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.95;
  utter.pitch = 1.05;
  utter.volume = 1;
  // Prefer a female voice
  const voices = window.speechSynthesis.getVoices();
  const femaleVoice = voices.find(
    (v) => v.name.includes("Samantha") || v.name.includes("Google UK English Female") || v.name.includes("Karen") || v.name.includes("Victoria")
  );
  if (femaleVoice) utter.voice = femaleVoice;
  window.speechSynthesis.speak(utter);
}

export function WorkoutPlayer({ sections, onComplete, onEndEarly, onDiscard, onExit }: WorkoutPlayerProps) {
  const { toast } = useToast();
  const startedAtRef = useRef(new Date().toISOString());
  const [setLogs, setSetLogs] = useState<Record<string, SetLog>>({});
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isLocked, setIsLocked] = useState(false);

  // GET READY → countdown → playing
  const [phase, setPhase] = useState<"getready" | "countdown" | "playing">("getready");
  const [countdownNum, setCountdownNum] = useState(3);

  // Current step index
  const steps = buildSteps(sections);
  const [stepIdx, setStepIdx] = useState(0);

  // Per-step countdown (for timed exercises and rests)
  const [stepTimer, setStepTimer] = useState(0);
  const [stepTimerMax, setStepTimerMax] = useState(0);
  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Global elapsed
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isPaused, setIsPaused] = useState(false);
  const [showEndEarlyDialog, setShowEndEarlyDialog] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [swapDialogOpen, setSwapDialogOpen] = useState(false);
  const [swapTarget, setSwapTarget] = useState<{ sectionIdx: number; exerciseIdx: number } | null>(null);

  const currentStep = steps[stepIdx] || null;
  const nextStep = steps[stepIdx + 1] || null;

  // Total estimated seconds for progress bar
  const totalEstimatedSeconds = sections.reduce((acc, s) => {
    const isGrouped = ["superset", "circuit"].includes(s.section_type);
    if (isGrouped) {
      s.exercises.forEach((ex) => {
        acc += (ex.duration_seconds || 45) * s.rounds;
      });
      acc += (s.rest_between_rounds_seconds || 60) * Math.max(0, s.rounds - 1);
    } else {
      s.exercises.forEach((ex) => {
        acc += ((ex.duration_seconds || 30) + (ex.rest_seconds || 30)) * (ex.sets || 1);
      });
    }
    return acc;
  }, 0);

  const completedPercent = totalEstimatedSeconds > 0
    ? Math.min(100, Math.round((elapsedSeconds / totalEstimatedSeconds) * 100))
    : 0;

  const remainingSeconds = Math.max(0, totalEstimatedSeconds - elapsedSeconds);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  // GET READY → COUNTDOWN
  useEffect(() => {
    if (phase === "getready") {
      if (voiceEnabled) speak("Welcome to today's workout. Get ready!");
      const t = setTimeout(() => setPhase("countdown"), 2000);
      return () => clearTimeout(t);
    }
    if (phase === "countdown") {
      setCountdownNum(3);
      let n = 3;
      const interval = setInterval(() => {
        if (voiceEnabled) speak(String(n));
        n--;
        setCountdownNum(n);
        if (n <= 0) {
          clearInterval(interval);
          setPhase("playing");
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [phase]);

  // Start global timer when playing
  useEffect(() => {
    if (phase !== "playing") return;
    elapsedRef.current = setInterval(() => {
      if (!isPaused) setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => { if (elapsedRef.current) clearInterval(elapsedRef.current); };
  }, [phase, isPaused]);

  // Announce exercise when step changes
  useEffect(() => {
    if (phase !== "playing" || !currentStep) return;
    if (currentStep.type === "exercise" && currentStep.exercise) {
      const ex = currentStep.exercise;
      const dur = ex.duration_seconds;
      const reps = ex.reps;
      let announcement = `${ex.exercise_name}. `;
      if (dur) announcement += `For ${dur} seconds. Let's go!`;
      else if (reps) announcement += `${reps} reps. Let's go!`;
      else announcement += "Let's go!";
      if (voiceEnabled) speak(announcement);
      // Start step timer if duration based
      if (dur) {
        startStepTimer(dur);
      }
    } else if (currentStep.type === "rest" && currentStep.restSeconds) {
      if (voiceEnabled) speak(`Rest for ${currentStep.restSeconds} seconds.`);
      startStepTimer(currentStep.restSeconds);
    }
  }, [stepIdx, phase]);

  const startStepTimer = (seconds: number) => {
    if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    setStepTimer(seconds);
    setStepTimerMax(seconds);
  };

  // Step timer countdown
  useEffect(() => {
    if (stepTimerMax === 0 || stepTimer <= 0) return;
    if (isPaused) return;
    stepTimerRef.current = setInterval(() => {
      setStepTimer((prev) => {
        if (prev <= 1) {
          clearInterval(stepTimerRef.current!);
          // Auto advance
          if (voiceEnabled) speak("Great job! Moving on.");
          advanceStep();
          return 0;
        }
        if (prev === 11 && voiceEnabled) speak("Ten seconds left. Hang in there!");
        if (prev <= 4 && voiceEnabled) speak(String(prev - 1));
        return prev - 1;
      });
    }, 1000);
    return () => { if (stepTimerRef.current) clearInterval(stepTimerRef.current); };
  }, [stepTimer > 0 ? stepTimerMax : 0, isPaused]);

  const advanceStep = useCallback(() => {
    setStepIdx((prev) => {
      const next = prev + 1;
      if (next >= steps.length) {
        // Workout complete
        if (voiceEnabled) speak("Workout complete! Amazing job today!");
        return prev;
      }
      return next;
    });
  }, [steps.length]);

  const goToPrevStep = () => {
    setStepIdx((prev) => Math.max(0, prev - 1));
  };

  const updateSetLog = (key: string, field: "reps" | "weight", value: string) => {
    setSetLogs((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value, completed: prev[key]?.completed || false },
    }));
  };

  const markStepDone = () => {
    if (!currentStep?.setKey) { advanceStep(); return; }
    setSetLogs((prev) => ({
      ...prev,
      [currentStep.setKey!]: { ...prev[currentStep.setKey!], reps: prev[currentStep.setKey!]?.reps || "", weight: prev[currentStep.setKey!]?.weight || "", completed: true },
    }));
    advanceStep();
  };

  const handleComplete = () => {
    if (elapsedRef.current) clearInterval(elapsedRef.current);
    onComplete({ setLogs, elapsedSeconds, startedAt: startedAtRef.current });
  };

  const handleEndEarly = () => {
    if (elapsedRef.current) clearInterval(elapsedRef.current);
    onEndEarly({ setLogs, elapsedSeconds, startedAt: startedAtRef.current });
  };

  const handleDiscard = () => {
    if (elapsedRef.current) clearInterval(elapsedRef.current);
    onDiscard();
  };

  const handleSwapExercise = (newExercise: any) => {
    toast({ title: "Exercise Swapped", description: `Switched to ${newExercise.name}` });
    setSwapDialogOpen(false);
  };

  // ─── GET READY SCREEN ───────────────────────────────────────────
  if (phase === "getready") {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[hsl(218,33%,15%)]">
        <Button variant="ghost" size="icon" className="absolute top-6 left-4 text-white/60 hover:text-white" onClick={() => onExit()}>
          <X className="h-6 w-6" />
        </Button>
        <h1 className="text-7xl font-light text-white tracking-widest text-center leading-tight">
          GET<br />READY
        </h1>
      </div>
    );
  }

  // ─── COUNTDOWN SCREEN ───────────────────────────────────────────
  if (phase === "countdown") {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[hsl(218,33%,15%)]">
        <span className="text-8xl font-light text-white/50 tabular-nums">{countdownNum > 0 ? countdownNum : ""}</span>
      </div>
    );
  }

  // ─── MAIN PLAYER ────────────────────────────────────────────────
  if (!currentStep) {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background gap-6 px-6">
        <h2 className="text-2xl font-bold">Workout Complete! 🎉</h2>
        <Button size="lg" className="w-full" onClick={handleComplete}>Save Workout</Button>
      </div>
    );
  }

  const currentExercise = currentStep.exercise;
  const isRest = currentStep.type === "rest";
  const stepProgress = stepTimerMax > 0 ? ((stepTimerMax - stepTimer) / stepTimerMax) * 100 : 0;

  // Next exercise info
  let nextExerciseName = "";
  let nextExerciseDuration = "";
  let nextExerciseImage = "";
  if (nextStep) {
    if (nextStep.type === "exercise" && nextStep.exercise) {
      nextExerciseName = nextStep.exercise.exercise_name || "";
      nextExerciseImage = nextStep.exercise.exercise_image || "";
      const dur = nextStep.exercise.duration_seconds;
      const reps = nextStep.exercise.reps;
      if (dur) nextExerciseDuration = `${String(Math.floor(dur / 60)).padStart(2, "0")}:${String(dur % 60).padStart(2, "0")}`;
      else if (reps) nextExerciseDuration = `${reps} reps`;
    } else if (nextStep.type === "rest") {
      nextExerciseName = "Rest";
      nextExerciseDuration = nextStep.restSeconds ? formatTime(nextStep.restSeconds) : "";
    }
  }

  // Calories estimate
  const estimatedCal = Math.round(elapsedSeconds * 0.13);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-black">
      {/* ── Exercise Name Header ── */}
      <div className="bg-black text-white text-center pt-12 pb-3 px-4">
        <p className="text-base font-semibold tracking-wide">
          {isRest ? "Rest" : currentExercise?.exercise_name || ""}
        </p>
      </div>

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        {/* Video/Image area */}
        <div className="flex-1 relative bg-muted/20">
          {!isRest && currentExercise?.exercise_video ? (
            <video
              key={currentExercise.exercise_video}
              src={currentExercise.exercise_video}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : !isRest && currentExercise?.exercise_image ? (
            <img
              src={currentExercise.exercise_image}
              alt={currentExercise.exercise_name}
              className="w-full h-full object-cover"
            />
          ) : isRest ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-[hsl(218,33%,15%)]">
              <span className="text-6xl">😮‍💨</span>
              <p className="text-white text-2xl font-semibold">Rest</p>
              {stepTimer > 0 && (
                <p className="text-white/70 text-lg">{formatTime(stepTimer)}</p>
              )}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <span className="text-6xl font-bold text-muted-foreground/30">
                {currentExercise?.exercise_name?.charAt(0)?.toUpperCase() || "?"}
              </span>
            </div>
          )}

          {/* Voice toggle button overlay */}
          <button
            className="absolute top-3 left-3 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center"
            onClick={() => setVoiceEnabled((v) => !v)}
          >
            {voiceEnabled ? <Volume2 className="h-4 w-4 text-white" /> : <VolumeX className="h-4 w-4 text-white/50" />}
          </button>
        </div>

        {/* ── Timer & Up Next ── */}
        <div className="bg-white px-5 pt-3 pb-2">
          {/* Big countdown */}
          <div className="text-center">
            <p className="text-5xl font-black text-foreground tabular-nums tracking-tight">
              {stepTimer > 0 ? formatTime(stepTimer) : isRest ? formatTime(currentStep.restSeconds || 0) : (
                currentExercise?.reps ? `${currentExercise.reps} reps` :
                currentExercise?.sets ? `Set ${currentStep.round}/${currentStep.exercise?.sets || 1}` : "--"
              )}
            </p>
          </div>

          {/* Up Next */}
          {nextExerciseName ? (
            <div className="mt-3 bg-muted/50 rounded-xl p-3">
              <p className="text-xs font-bold text-foreground uppercase tracking-wide mb-1.5">Up Next</p>
              <div className="flex items-center gap-3">
                {nextExerciseImage ? (
                  <img src={nextExerciseImage} alt={nextExerciseName} className="w-14 h-14 rounded-lg object-cover shrink-0 border border-border" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-muted shrink-0" />
                )}
                <div>
                  <p className="font-semibold text-sm text-foreground leading-tight">{nextExerciseName}</p>
                  {nextExerciseDuration && (
                    <span className="inline-block mt-1 bg-muted text-muted-foreground text-xs font-semibold px-2 py-0.5 rounded-full">
                      {nextExerciseDuration}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {/* Set logging row (for non-timed exercises) */}
          {!isRest && currentStep.setKey && !currentExercise?.duration_seconds && (
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">Reps</p>
                <Input
                  type="number"
                  value={setLogs[currentStep.setKey]?.reps || ""}
                  onChange={(e) => updateSetLog(currentStep.setKey!, "reps", e.target.value)}
                  className="h-9 text-center"
                  placeholder="0"
                />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">Lbs</p>
                <Input
                  type="number"
                  value={setLogs[currentStep.setKey]?.weight || ""}
                  onChange={(e) => updateSetLog(currentStep.setKey!, "weight", e.target.value)}
                  className="h-9 text-center"
                  placeholder="0"
                />
              </div>
              <div className="pt-4">
                <Button size="sm" className="h-9 px-4" onClick={markStepDone}>Done</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Stats & Controls ── */}
      <div className="bg-black text-white shrink-0">
        {/* Stats row */}
        <div className="flex items-start justify-between px-5 pt-3 pb-1">
          <div className="text-center">
            <p className="text-xs text-white/50 font-semibold">Remaining</p>
            <p className="text-base font-bold tabular-nums">{formatTime(remainingSeconds)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-white/50 font-semibold">Completed</p>
            <p className="text-base font-bold">{completedPercent}%</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-white/50 font-semibold">Active</p>
            <p className="text-base font-bold">{estimatedCal > 0 ? `${estimatedCal} Cal` : "- Cal"}</p>
          </div>
          <div className="text-center flex flex-col items-center">
            <p className="text-xs text-white/50 font-semibold">Zone</p>
            <div className="flex items-center gap-1 mt-0.5">
              <Heart className="h-4 w-4 text-destructive fill-destructive" />
              <p className="text-base font-bold">-</p>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-2 py-1">
          <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-1000"
              style={{ width: `${completedPercent}%` }}
            />
          </div>
        </div>

        {/* Playback controls */}
        <div className="flex items-center justify-around px-6 py-4 pb-8">
          <button
            className="text-white/60 hover:text-white transition-colors disabled:opacity-30"
            onClick={goToPrevStep}
            disabled={isLocked || stepIdx === 0}
          >
            <SkipBack className="h-8 w-8 fill-current" />
          </button>

          <button
            className="text-white hover:text-white/80 transition-colors"
            onClick={() => setShowDiscardDialog(true)}
            disabled={isLocked}
          >
            <Square className="h-7 w-7 fill-current" />
          </button>

          <button
            className={cn(
              "text-white/60 hover:text-white transition-colors",
              isLocked && "text-white bg-white/20 rounded-full p-1"
            )}
            onClick={() => setIsLocked((l) => !l)}
          >
            <Lock className={cn("h-7 w-7", isLocked && "text-white")} />
          </button>

          <button
            className="text-white/60 hover:text-white transition-colors"
            onClick={() => setIsPaused((p) => !p)}
            disabled={isLocked}
          >
            {isPaused ? <Play className="h-8 w-8 fill-current" /> : <Pause className="h-8 w-8 fill-current" />}
          </button>

          <button
            className="text-white/60 hover:text-white transition-colors disabled:opacity-30"
            onClick={() => { if (!isLocked) advanceStep(); }}
            disabled={isLocked}
          >
            <SkipForward className="h-8 w-8 fill-current" />
          </button>
        </div>
      </div>

      {/* End Early Confirm */}
      <AlertDialog open={showEndEarlyDialog} onOpenChange={setShowEndEarlyDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Workout Early?</AlertDialogTitle>
            <AlertDialogDescription>Your progress so far will be saved.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Workout</AlertDialogCancel>
            <AlertDialogAction onClick={handleEndEarly}>End & Save</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Discard Confirm */}
      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Workout?</AlertDialogTitle>
            <AlertDialogDescription>Choose to save or discard your progress.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" className="flex-1" onClick={() => setShowDiscardDialog(false)}>Continue</Button>
            <Button variant="secondary" className="flex-1" onClick={handleEndEarly}>End & Save</Button>
            <Button variant="destructive" className="flex-1" onClick={handleDiscard}>Discard</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {swapTarget && (
        <ExerciseSwapDialog
          open={swapDialogOpen}
          onOpenChange={setSwapDialogOpen}
          currentExercise={{ id: "", name: "", muscle_group: "", equipment: "" }}
          onSwap={handleSwapExercise}
        />
      )}
    </div>
  );
}
