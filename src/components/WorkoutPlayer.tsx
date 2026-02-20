import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface WorkoutStep {
  type: "exercise" | "rest";
  sectionIdx: number;
  exerciseIdx: number;
  round: number;
  exercise?: Exercise;
  restSeconds?: number;
  label?: string;
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

// Voice guidance — robust across browser quirks
function speakText(text: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.92;
  utter.pitch = 1.05;
  utter.volume = 1;
  const pickVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    return voices.find(
      (v) =>
        v.name.includes("Samantha") ||
        v.name.includes("Google UK English Female") ||
        v.name.includes("Karen") ||
        v.name.includes("Victoria") ||
        (v.lang.startsWith("en") && v.name.toLowerCase().includes("female"))
    ) || voices.find((v) => v.lang.startsWith("en")) || null;
  };
  const voice = pickVoice();
  if (voice) utter.voice = voice;
  window.speechSynthesis.speak(utter);
}

export function WorkoutPlayer({ sections, onComplete, onEndEarly, onDiscard, onExit }: WorkoutPlayerProps) {
  const { toast } = useToast();
  const startedAtRef = useRef(new Date().toISOString());
  const [setLogs, setSetLogs] = useState<Record<string, SetLog>>({});
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  // isLocked locks the screen (hides controls) — NOT disabling buttons
  const [isLocked, setIsLocked] = useState(false);

  const [phase, setPhase] = useState<"getready" | "countdown" | "playing">("getready");
  const [countdownNum, setCountdownNum] = useState(3);

  // steps is stable — built once from sections
  const stepsRef = useRef<WorkoutStep[]>(buildSteps(sections));
  const steps = stepsRef.current;

  const [stepIdx, setStepIdx] = useState(0);

  // stepTimer: current countdown value; -1 means "no timer for this step"
  const [stepTimer, setStepTimer] = useState(-1);
  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepTimerDurationRef = useRef(0); // max duration for progress calc

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPausedRef = useRef(false);
  const [isPaused, setIsPaused] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [swapDialogOpen, setSwapDialogOpen] = useState(false);
  const [swapTarget, setSwapTarget] = useState<{ sectionIdx: number; exerciseIdx: number } | null>(null);

  const voiceEnabledRef = useRef(voiceEnabled);
  useEffect(() => { voiceEnabledRef.current = voiceEnabled; }, [voiceEnabled]);

  // Keep isPausedRef in sync so intervals can read it without stale closures
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);

  // Pause/resume the video element when isPaused changes
  useEffect(() => {
    if (!videoRef.current) return;
    if (isPaused) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {});
    }
  }, [isPaused]);

  const currentStep = steps[stepIdx] || null;
  const nextStep = steps[stepIdx + 1] || null;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  // Total estimated seconds
  const totalEstimatedSeconds = sections.reduce((acc, s) => {
    const isGrouped = ["superset", "circuit"].includes(s.section_type);
    if (isGrouped) {
      s.exercises.forEach((ex) => { acc += (ex.duration_seconds || 45) * s.rounds; });
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
  const estimatedCal = Math.round(elapsedSeconds * 0.13);

  // ── Advance to next step ──
  const advanceStep = useCallback(() => {
    if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    setStepTimer(-1);
    setStepIdx((prev) => {
      const next = prev + 1;
      if (next >= steps.length) {
        if (voiceEnabledRef.current) speakText("Workout complete! Amazing job today!");
        return prev; // stay, show complete screen via currentStep check
      }
      return next;
    });
  }, [steps.length]);

  // ── Start per-step countdown timer ──
  const startStepCountdown = useCallback((seconds: number) => {
    if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    stepTimerDurationRef.current = seconds;
    setStepTimer(seconds);

    stepTimerRef.current = setInterval(() => {
      if (isPausedRef.current) return; // skip tick while paused
      setStepTimer((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(stepTimerRef.current!);
          if (voiceEnabledRef.current) speakText("Great job! Moving on.");
          // Use timeout to avoid setState-in-setState
          setTimeout(() => advanceStep(), 100);
          return 0;
        }
        if (next === 10 && voiceEnabledRef.current) speakText("Ten seconds left. Hang in there!");
        if (next <= 3 && next > 0 && voiceEnabledRef.current) speakText(String(next));
        return next;
      });
    }, 1000);
  }, [advanceStep]);

  // ── GET READY → COUNTDOWN → PLAYING ──
  useEffect(() => {
    if (phase === "getready") {
      const t = setTimeout(() => setPhase("countdown"), 1800);
      return () => clearTimeout(t);
    }
    if (phase === "countdown") {
      setCountdownNum(3);
      let n = 3;
      if (voiceEnabledRef.current) speakText("Three");
      const interval = setInterval(() => {
        n--;
        setCountdownNum(n);
        if (n > 0 && voiceEnabledRef.current) speakText(String(n));
        if (n <= 0) {
          clearInterval(interval);
          setTimeout(() => setPhase("playing"), 500);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [phase]);

  // ── Global elapsed timer ──
  useEffect(() => {
    if (phase !== "playing") return;
    elapsedRef.current = setInterval(() => {
      if (!isPausedRef.current) setElapsedSeconds((p) => p + 1);
    }, 1000);
    return () => { if (elapsedRef.current) clearInterval(elapsedRef.current); };
  }, [phase]);

  // ── Announce & start timer when step changes ──
  useEffect(() => {
    if (phase !== "playing" || !currentStep) return;

    if (currentStep.type === "exercise" && currentStep.exercise) {
      const ex = currentStep.exercise;
      const dur = ex.duration_seconds;
      const reps = ex.reps;
      let msg = `${ex.exercise_name}. `;
      if (dur) msg += `For ${dur} seconds. Let's go!`;
      else if (reps) msg += `${reps} reps. Let's go!`;
      else msg += "Let's go!";
      if (voiceEnabledRef.current) speakText(msg);
      if (dur) startStepCountdown(dur);
      else setStepTimer(-1);
    } else if (currentStep.type === "rest") {
      const secs = currentStep.restSeconds || 60;
      if (voiceEnabledRef.current) speakText(`Rest for ${secs} seconds.`);
      startStepCountdown(secs);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx, phase]);

  // ── Handlers ──
  const handleComplete = () => {
    if (elapsedRef.current) clearInterval(elapsedRef.current);
    if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    onComplete({ setLogs, elapsedSeconds, startedAt: startedAtRef.current });
  };

  const handleEndEarly = () => {
    if (elapsedRef.current) clearInterval(elapsedRef.current);
    if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    onEndEarly({ setLogs, elapsedSeconds, startedAt: startedAtRef.current });
  };

  const handleDiscard = () => {
    if (elapsedRef.current) clearInterval(elapsedRef.current);
    if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    onDiscard();
  };

  const togglePause = () => {
    const nowPaused = !isPausedRef.current;
    isPausedRef.current = nowPaused;
    setIsPaused(nowPaused);
    if ("speechSynthesis" in window) {
      if (nowPaused) {
        window.speechSynthesis.cancel();
      } else {
        // re-announce current exercise on resume
        if (voiceEnabledRef.current && currentStep?.type === "exercise" && currentStep?.exercise?.exercise_name) {
          speakText(`Resuming. ${currentStep.exercise.exercise_name}.`);
        }
      }
    }
  };

  const goToPrevStep = () => {
    if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    setStepTimer(-1);
    setStepIdx((prev) => Math.max(0, prev - 1));
  };

  const updateSetLog = (key: string, field: "reps" | "weight", value: string) => {
    setSetLogs((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value, completed: prev[key]?.completed || false },
    }));
  };

  const markStepDone = () => {
    if (currentStep?.setKey) {
      setSetLogs((prev) => ({
        ...prev,
        [currentStep.setKey!]: {
          ...prev[currentStep.setKey!],
          reps: prev[currentStep.setKey!]?.reps || "",
          weight: prev[currentStep.setKey!]?.weight || "",
          completed: true,
        },
      }));
    }
    advanceStep();
  };

  const handleSwapExercise = (newExercise: any) => {
    toast({ title: "Exercise Swapped", description: `Switched to ${newExercise.name}` });
    setSwapDialogOpen(false);
  };

  // ─── GET READY SCREEN ───
  if (phase === "getready") {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[hsl(218,33%,15%)]">
        <Button variant="ghost" size="icon" className="absolute top-6 left-4 text-white/60 hover:text-white" onClick={onExit}>
          <X className="h-6 w-6" />
        </Button>
        <h1 className="text-7xl font-light text-white tracking-widest text-center leading-tight">
          GET<br />READY
        </h1>
      </div>
    );
  }

  // ─── COUNTDOWN SCREEN ───
  if (phase === "countdown") {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[hsl(218,33%,15%)]">
        <span className="text-9xl font-black text-white tabular-nums">{countdownNum > 0 ? countdownNum : "GO!"}</span>
      </div>
    );
  }

  // ─── WORKOUT COMPLETE SCREEN ───
  if (!currentStep || stepIdx >= steps.length) {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background gap-6 px-6">
        <h2 className="text-2xl font-bold">Workout Complete! 🎉</h2>
        <Button size="lg" className="w-full" onClick={handleComplete}>Save Workout</Button>
      </div>
    );
  }

  const currentExercise = currentStep.exercise;
  const isRest = currentStep.type === "rest";

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
      if (dur) nextExerciseDuration = formatTime(dur);
      else if (reps) nextExerciseDuration = `${reps} reps`;
    } else if (nextStep.type === "rest") {
      nextExerciseName = "Rest";
      nextExerciseDuration = nextStep.restSeconds ? formatTime(nextStep.restSeconds) : "";
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-black">
      {/* ── Header ── */}
      <div className="bg-black text-white text-center pt-12 pb-3 px-4 relative">
        <p className="text-base font-semibold tracking-wide">
          {isRest ? "Rest" : currentExercise?.exercise_name || ""}
        </p>
        {isPaused && (
          <span className="absolute right-4 top-12 text-xs text-primary font-bold tracking-widest">PAUSED</span>
        )}
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        {/* Media area */}
        <div className="flex-1 relative bg-muted/20">
          {!isRest && currentExercise?.exercise_video ? (
            <video
              ref={videoRef}
              key={currentExercise.id + stepIdx}
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
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-secondary">
              <span className="text-6xl">😮‍💨</span>
              <p className="text-secondary-foreground text-2xl font-semibold">Rest</p>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <span className="text-8xl font-bold text-muted-foreground/20">
                {currentExercise?.exercise_name?.charAt(0)?.toUpperCase() || "?"}
              </span>
            </div>
          )}

          {/* Voice toggle */}
          <button
            className="absolute top-3 left-3 w-10 h-10 rounded-full bg-black/60 flex items-center justify-center z-10"
            onClick={() => {
              setVoiceEnabled((v) => {
                if (v && "speechSynthesis" in window) window.speechSynthesis.cancel();
                return !v;
              });
            }}
          >
            {voiceEnabled ? <Volume2 className="h-4 w-4 text-white" /> : <VolumeX className="h-4 w-4 text-white/40" />}
          </button>
        </div>

        {/* ── Timer & Info ── */}
        <div className="bg-white px-5 pt-3 pb-2">
          <div className="text-center">
            <p className="text-5xl font-black text-foreground tabular-nums tracking-tight">
              {stepTimer > 0
                ? formatTime(stepTimer)
                : isRest
                  ? formatTime(currentStep.restSeconds || 0)
                  : currentExercise?.reps
                    ? `${currentExercise.reps} reps`
                    : currentExercise?.sets
                      ? `Set ${currentStep.round} / ${currentStep.exercise?.sets || 1}`
                      : "--"}
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
                  <div className="w-14 h-14 rounded-lg bg-muted shrink-0 flex items-center justify-center">
                    <span className="text-xl font-bold text-muted-foreground/40">{nextExerciseName.charAt(0)}</span>
                  </div>
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

          {/* Set logging for rep-based exercises */}
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

      {/* ── Bottom Bar ── */}
      <div className="bg-black text-white shrink-0">
        {/* Stats */}
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

        {/* Controls — NOT disabled by lock (lock just shows overlay) */}
        <div className="flex items-center justify-around px-6 py-4 pb-8">
          <button
            className={cn("text-white/60 hover:text-white transition-colors", stepIdx === 0 && "opacity-30")}
            onClick={goToPrevStep}
            disabled={stepIdx === 0}
          >
            <SkipBack className="h-8 w-8 fill-current" />
          </button>

          {/* Stop → opens end dialog */}
          <button
            className="text-white hover:text-white/80 transition-colors"
            onClick={() => setShowDiscardDialog(true)}
          >
            <Square className="h-7 w-7 fill-current" />
          </button>

          {/* Lock toggle */}
          <button
            className={cn(
              "transition-colors",
              isLocked ? "text-primary bg-primary/20 rounded-full p-1" : "text-white/60 hover:text-white"
            )}
            onClick={() => setIsLocked((l) => !l)}
          >
            <Lock className="h-7 w-7" />
          </button>

          {/* Pause / Play */}
          <button
            className="text-white hover:text-white/80 transition-colors"
            onClick={togglePause}
          >
            {isPaused ? <Play className="h-8 w-8 fill-current" /> : <Pause className="h-8 w-8 fill-current" />}
          </button>

          {/* Skip forward */}
          <button
            className="text-white/60 hover:text-white transition-colors"
            onClick={advanceStep}
          >
            <SkipForward className="h-8 w-8 fill-current" />
          </button>
        </div>
      </div>

      {/* Lock overlay — only covers content area above the bottom controls */}
      {isLocked && (
        <div
          className="absolute inset-x-0 top-0 bottom-[160px] z-[201] flex items-center justify-center bg-black/60"
          onClick={() => setIsLocked(false)}
        >
          <div className="text-center text-white">
            <Lock className="h-12 w-12 mx-auto mb-3 text-white/80" />
            <p className="text-sm font-semibold tracking-wide">Screen Locked</p>
            <p className="text-xs text-white/60 mt-1">Tap anywhere to unlock</p>
          </div>
        </div>
      )}

      {/* End Workout Dialog */}
      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent className="z-[300]">
          <AlertDialogHeader>
            <AlertDialogTitle>End Workout?</AlertDialogTitle>
            <AlertDialogDescription>Choose to save your progress or discard it.</AlertDialogDescription>
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
