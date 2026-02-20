import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Square, Lock, Play, Pause, SkipBack, SkipForward, Heart, MoreVertical, Timer } from "lucide-react";
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
          // Add rest between exercises within a round (if exercise has rest_seconds > 0)
          const exRest = ex.rest_seconds || 0;
          if (exRest > 0 && eIdx < section.exercises.length - 1) {
            steps.push({
              type: "rest",
              sectionIdx: sIdx,
              exerciseIdx: eIdx,
              round,
              restSeconds: exRest,
              label: `Rest for ${exRest}s`,
              isCircuit: true,
            });
          }
        });
        if (round < section.rounds) {
          const restSec = section.rest_between_rounds_seconds || section.rest_seconds || 60;
          steps.push({
            type: "rest",
            sectionIdx: sIdx,
            exerciseIdx: 0,
            round,
            restSeconds: restSec,
            label: `Rest between rounds ${restSec}s`,
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

// ── Single-channel speech system ──────────────────────────────────────────────
// Only one audio source plays at a time. cancelSpeech() stops everything.
let activeAudio: HTMLAudioElement | null = null;
let speechAbortController: AbortController | null = null;

function cancelSpeech() {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.src = "";
    activeAudio = null;
  }
  if (speechAbortController) {
    speechAbortController.abort();
    speechAbortController = null;
  }
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

// Instant browser TTS — for numbers and short cues (no network latency)
function browserSpeakNow(text: string): Promise<void> {
  cancelSpeech();
  if (!("speechSynthesis" in window)) return Promise.resolve();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.95;
  return new Promise((resolve) => {
    utter.onend = () => resolve();
    utter.onerror = () => resolve();
    window.speechSynthesis.speak(utter);
  });
}

// ElevenLabs TTS — for exercise names and motivational cues (high quality)
async function elevenLabsSpeakNow(text: string): Promise<void> {
  cancelSpeech();
  const controller = new AbortController();
  speechAbortController = controller;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  let response: Response;
  try {
    response = await fetch(`${supabaseUrl}/functions/v1/elevenlabs-tts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });
  } catch {
    if (!controller.signal.aborted) await browserSpeakNow(text);
    return;
  }
  if (!response.ok || controller.signal.aborted) return;
  const blob = await response.blob();
  if (controller.signal.aborted) return;
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  activeAudio = audio;
  speechAbortController = null;
  return new Promise((resolve) => {
    audio.onended = () => { URL.revokeObjectURL(url); if (activeAudio === audio) activeAudio = null; resolve(); };
    audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
    audio.play().catch(() => resolve());
  });
}
// ─────────────────────────────────────────────────────────────────────────────

export function WorkoutPlayer({ sections, onComplete, onEndEarly, onDiscard, onExit }: WorkoutPlayerProps) {
  const { toast } = useToast();
  const startedAtRef = useRef(new Date().toISOString());
  const [setLogs, setSetLogs] = useState<Record<string, SetLog>>({});
  const [isLocked, setIsLocked] = useState(false);

  const [phase, setPhase] = useState<"getready" | "countdown" | "playing">("getready");
  const [countdownNum, setCountdownNum] = useState(3);

  const stepsRef = useRef<WorkoutStep[]>(buildSteps(sections));
  const steps = stepsRef.current;

  const [stepIdx, setStepIdx] = useState(0);
  const stepIdxRef = useRef(0);

  const [stepTimer, setStepTimer] = useState(-1);
  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepTimerDurationRef = useRef(0);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPausedRef = useRef(false);
  const [isPaused, setIsPaused] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [swapDialogOpen, setSwapDialogOpen] = useState(false);
  const [swapTarget, setSwapTarget] = useState<{ sectionIdx: number; exerciseIdx: number } | null>(null);

  // Track if voice was already announced for the current step
  const announcedStepRef = useRef<number>(-1);
  const lastCountdownRef = useRef<number>(-1); // last spoken countdown tick

  useEffect(() => { stepIdxRef.current = stepIdx; }, [stepIdx]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);

  // Announce exercise/rest when step changes (ElevenLabs — cancels any prior speech)
  useEffect(() => {
    if (phase !== "playing") return;
    if (announcedStepRef.current === stepIdx) return;
    announcedStepRef.current = stepIdx;

    const step = steps[stepIdx];
    if (!step) return;

    // Small delay on the very first step so "1" browser-speech fully finishes
    // before we cancel and fire the ElevenLabs request
    const delayMs = stepIdx === 0 ? 500 : 0;

    const timer = setTimeout(() => {
      if (step.type === "rest") {
        const nextEx = steps[stepIdx + 1]?.exercise;
        const msg = nextEx
          ? `Rest. Up next: ${nextEx.exercise_name}`
          : "Rest up, you're almost done!";
        elevenLabsSpeakNow(msg).catch(() => {});
      } else if (step.type === "exercise" && step.exercise) {
        const ex = step.exercise;
        const section = sections[step.sectionIdx];
        const isGrouped = ["superset", "circuit"].includes(section?.section_type);
        let msg = ex.exercise_name || "";
        if (isGrouped) {
          msg += `, round ${step.round}`;
        } else if (ex.sets && ex.sets > 1) {
          msg += `, set ${step.round} of ${ex.sets}`;
        }
        if (ex.reps) msg += `, ${ex.reps} reps`;
        elevenLabsSpeakNow(msg).catch(() => {});
      }
    }, delayMs);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx, phase]);

  // "Get ready!" — browser speech (instant). Each speak fn cancels prior speech itself.
  useEffect(() => {
    if (phase === "getready") {
      browserSpeakNow("Get ready").catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // 3-2-1 countdown — browser speech only (instant, no network latency)
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdownNum > 0) {
      browserSpeakNow(String(countdownNum)).catch(() => {});
    }
    // "Go!" is implied by the exercise announcement that fires when phase → playing
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdownNum, phase]);

  // Last-3-seconds tick countdown & motivational milestones
  useEffect(() => {
    if (phase !== "playing") return;
    const step = steps[stepIdx];
    if (!step) return;

    // ── Exercise-specific cues ──
    if (step.type === "exercise") {
      const totalSteps = steps.filter(s => s.type === "exercise").length;
      const completedExSteps = steps.slice(0, stepIdx).filter(s => s.type === "exercise").length;

      // Last 3-second countdown (browser TTS for zero latency)
      if (stepTimer > 0 && stepTimer <= 3 && lastCountdownRef.current !== stepTimer) {
        lastCountdownRef.current = stepTimer;
        browserSpeakNow(String(stepTimer)).catch(() => {});
        return;
      }

      // Halfway through THIS exercise's timer — Jessica encouragement
      const duration = stepTimerDurationRef.current;
      if (duration >= 20) {
        const halfMark = Math.floor(duration / 2);
        if (stepTimer === halfMark && lastCountdownRef.current !== -97) {
          lastCountdownRef.current = -97;
          elevenLabsSpeakNow("Halfway there, keep going!").catch(() => {});
        }
      }

      // Workout-level motivational milestones (well away from countdown ticks)
      if (stepTimer > 5 && announcedStepRef.current === stepIdx) {
        if (completedExSteps === Math.floor(totalSteps / 2) && lastCountdownRef.current !== -99) {
          lastCountdownRef.current = -99;
          elevenLabsSpeakNow("Halfway through the workout! Keep it up!").catch(() => {});
        }
        if (completedExSteps === totalSteps - 1 && lastCountdownRef.current !== -98) {
          lastCountdownRef.current = -98;
          elevenLabsSpeakNow("Last one! You've got this!").catch(() => {});
        }
      }
    }

    // ── Rest-step cue: 30 seconds remaining ──
    if (step.type === "rest") {
      if (stepTimer === 30 && lastCountdownRef.current !== -96) {
        lastCountdownRef.current = -96;
        elevenLabsSpeakNow("30 seconds to go before your next round, get ready!").catch(() => {});
      }
      // Last 3-second countdown during rest too
      if (stepTimer > 0 && stepTimer <= 3 && lastCountdownRef.current !== stepTimer) {
        lastCountdownRef.current = stepTimer;
        browserSpeakNow(String(stepTimer)).catch(() => {});
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepTimer, stepIdx, phase]);

  useEffect(() => {
    if (!videoRef.current) return;
    if (isPaused) videoRef.current.pause();
    else videoRef.current.play().catch(() => {});
  }, [isPaused]);

  const currentStep = steps[stepIdx] || null;
  const nextStep = steps[stepIdx + 1] || null;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const totalEstimatedSeconds = sections.reduce((acc, s) => {
    const isGrouped = ["superset", "circuit"].includes(s.section_type);
    if (isGrouped) {
      s.exercises.forEach((ex) => { acc += (ex.duration_seconds || 45) * s.rounds; });
      const exRestTotal = s.exercises.reduce((sum, ex) => sum + (ex.rest_seconds || 0), 0);
      acc += exRestTotal * s.rounds;
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

  const advanceStep = useCallback(() => {
    if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    lastCountdownRef.current = -1;
    setStepTimer(-1);
    setStepIdx((prev) => {
      const next = prev + 1;
      if (next >= steps.length) return prev;

      // "X down, Y to go" after completing an exercise step
      const currentStepType = steps[prev]?.type;
      if (currentStepType === "exercise") {
        const doneCount = steps.slice(0, next).filter(s => s.type === "exercise").length;
        const remaining = steps.slice(next).filter(s => s.type === "exercise").length;
        if (remaining > 0 && doneCount > 0) {
          const doneWord = doneCount === 1 ? "one" : String(doneCount);
          const remWord = remaining === 1 ? "one more" : `${remaining} to go`;
          elevenLabsSpeakNow(`${doneWord} down, ${remWord}`).catch(() => {});
        }
      }

      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps]);

  const startStepCountdown = useCallback((seconds: number) => {
    if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    stepTimerDurationRef.current = seconds;
    setStepTimer(seconds);

    stepTimerRef.current = setInterval(() => {
      if (isPausedRef.current) return;
      setStepTimer((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(stepTimerRef.current!);
          advanceStep();
          return 0;
        }
        return next;
      });
    }, 1000);
  }, [advanceStep]);

  useEffect(() => {
    if (phase === "getready") {
      const t = setTimeout(() => setPhase("countdown"), 1800);
      return () => clearTimeout(t);
    }
    if (phase === "countdown") {
      setCountdownNum(3);
      let n = 3;
      const interval = setInterval(() => {
        n--;
        setCountdownNum(n);
        if (n <= 0) {
          clearInterval(interval);
          setTimeout(() => setPhase("playing"), 500);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [phase]);

  useEffect(() => {
    if (phase !== "playing") return;
    elapsedRef.current = setInterval(() => {
      if (!isPausedRef.current) setElapsedSeconds((p) => p + 1);
    }, 1000);
    return () => { if (elapsedRef.current) clearInterval(elapsedRef.current); };
  }, [phase]);

  useEffect(() => {
    if (phase !== "playing" || !currentStep) return;
    if (currentStep.type === "exercise" && currentStep.exercise) {
      const ex = currentStep.exercise;
      if (ex.duration_seconds) startStepCountdown(ex.duration_seconds);
      else setStepTimer(-1);
    } else if (currentStep.type === "rest") {
      const secs = currentStep.restSeconds || 60;
      startStepCountdown(secs);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx, phase]);

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
    if (nowPaused) cancelSpeech();
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
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-foreground">
        <Button variant="ghost" size="icon" className="absolute top-6 left-4 text-background/60 hover:text-background" onClick={onExit}>
          <X className="h-6 w-6" />
        </Button>
        <h1 className="text-7xl font-light text-background tracking-widest text-center leading-tight">
          GET<br />READY
        </h1>
      </div>
    );
  }

  // ─── COUNTDOWN SCREEN ───
  if (phase === "countdown") {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-foreground">
        <span className="text-9xl font-black text-background tabular-nums">{countdownNum > 0 ? countdownNum : "GO!"}</span>
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
  const currentSection = sections[currentStep.sectionIdx];
  const isGrouped = currentSection && ["superset", "circuit"].includes(currentSection.section_type);
  const isCircuitMode = currentStep.isCircuit;

  const sectionLabel = isGrouped
    ? `${currentSection.section_type === "superset" ? "Superset" : "Circuit"} of ${currentSection.rounds} sets`
    : currentSection?.name || "";

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
      nextExerciseDuration = nextStep.restSeconds ? `${nextStep.restSeconds}s` : "";
    }
  }

  const timerPercent = stepTimer > 0 && stepTimerDurationRef.current > 0
    ? Math.round((stepTimer / stepTimerDurationRef.current) * 100)
    : 0;

  // ─── CIRCUIT / TIMED CINEMATIC MODE ───────────────────────────────────────
  if (isCircuitMode && !isRest) {
    const hasMedia = currentExercise?.exercise_video || currentExercise?.exercise_image;
    return (
      <div className="fixed inset-0 z-[200] flex flex-col bg-background">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 pt-12 pb-3 bg-background/90 backdrop-blur border-b border-border/30">
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setShowDiscardDialog(true)}>
            <X className="h-4 w-4 mr-1" /> Cancel
          </Button>
          <div className="text-center">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              {currentSection?.name || sectionLabel}
            </p>
            <p className="text-sm font-bold">Round {currentStep.round} of {currentSection?.rounds}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={togglePause} className="text-muted-foreground">
              {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
            </Button>
            <Button size="sm" className="font-semibold px-4" onClick={handleEndEarly}>Save</Button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-4 px-4 py-2 border-b border-border/30 bg-background">
          <div className="text-center">
            <p className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">TIME</p>
            <p className="text-sm font-bold tabular-nums">{formatTime(elapsedSeconds)}</p>
          </div>
          <div className="text-center border-x border-border/30">
            <p className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Remaining</p>
            <p className="text-sm font-bold tabular-nums">{formatTime(remainingSeconds)}</p>
          </div>
          <div className="text-center border-r border-border/30">
            <p className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Cal</p>
            <p className="text-sm font-bold">{estimatedCal}</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Progress</p>
            <p className="text-sm font-bold">{completedPercent}%</p>
          </div>
        </div>

        {/* Main cinematic area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Large media display */}
          <div className="relative flex-1 bg-foreground/5 overflow-hidden">
            {currentExercise?.exercise_video ? (
              <video
                ref={videoRef}
                key={currentExercise.id + stepIdx}
                src={currentExercise.exercise_video}
                className="w-full h-full object-cover"
                autoPlay
                loop
                muted
                playsInline
              />
            ) : currentExercise?.exercise_image ? (
              <img
                src={currentExercise.exercise_image}
                alt={currentExercise.exercise_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-8xl font-black text-foreground/10">
                  {currentExercise?.exercise_name?.charAt(0) || "?"}
                </span>
              </div>
            )}

            {/* Overlay gradient at bottom */}
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />

            {/* Exercise name overlay */}
            <div className="absolute inset-x-0 bottom-0 px-4 pb-3">
              <p className="text-2xl font-black text-foreground drop-shadow-lg leading-tight">
                {currentExercise?.exercise_name}
              </p>
              {currentExercise?.reps && (
                <p className="text-base font-semibold text-primary">{currentExercise.reps} reps</p>
              )}
              {currentExercise?.notes && (
                <p className="text-xs text-muted-foreground italic mt-0.5">{currentExercise.notes}</p>
              )}
            </div>

            {/* Countdown timer bubble — for timed exercises */}
            {currentExercise?.duration_seconds && stepTimer > 0 && (
              <div className="absolute top-3 right-3">
                <div className="relative w-20 h-20">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="34" fill="rgba(0,0,0,0.55)" stroke="rgba(255,255,255,0.15)" strokeWidth="5" />
                    <circle
                      cx="40" cy="40" r="34"
                      fill="none"
                      stroke="hsl(var(--primary))"
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 34}`}
                      strokeDashoffset={`${2 * Math.PI * 34 * (1 - timerPercent / 100)}`}
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-black text-white tabular-nums leading-none">{stepTimer}</span>
                    <span className="text-[9px] text-white/60 font-medium">sec</span>
                  </div>
                </div>
              </div>
            )}

            {/* Pause overlay */}
            {isPaused && (
              <div
                className="absolute inset-0 bg-background/70 flex items-center justify-center cursor-pointer"
                onClick={togglePause}
              >
                <Play className="h-16 w-16 text-foreground opacity-70" />
              </div>
            )}
          </div>

          {/* Up Next strip */}
          {nextExerciseName && (
            <div className="flex items-center gap-3 px-4 py-3 border-t border-border/40 bg-muted/20">
              {nextExerciseImage ? (
                <img src={nextExerciseImage} alt={nextExerciseName} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-bold text-muted-foreground/40">{nextExerciseName.charAt(0)}</span>
                </div>
              )}
              <div className="flex-1">
                <p className="text-xs text-muted-foreground font-medium">Up Next</p>
                <p className="text-sm font-semibold">{nextExerciseName}</p>
                {nextExerciseDuration && <p className="text-xs text-muted-foreground">{nextExerciseDuration}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Bottom controls */}
        {!isLocked && (
          <div className="bg-background border-t border-border/50 px-4 pb-8 pt-3">
            <div className="flex items-center justify-between gap-2">
              <Button variant="ghost" size="icon" onClick={goToPrevStep} disabled={stepIdx === 0} className="text-muted-foreground">
                <SkipBack className="h-5 w-5" />
              </Button>
              <Button
                size="lg"
                className="flex-1 h-12 font-bold text-base rounded-xl"
                onClick={currentExercise?.duration_seconds ? advanceStep : markStepDone}
              >
                {currentExercise?.duration_seconds ? "Skip" : "Done →"}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsLocked(true)} className="text-muted-foreground">
                <Lock className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex justify-center mt-2">
              <Button variant="ghost" size="sm" className="text-destructive/60 text-xs" onClick={() => setShowDiscardDialog(true)}>
                <Square className="h-3 w-3 mr-1" /> End Workout
              </Button>
            </div>
          </div>
        )}

        {/* Lock overlay */}
        {isLocked && (
          <div
            className="fixed inset-0 z-[210] bg-foreground/80 flex items-center justify-center cursor-pointer"
            onClick={() => setIsLocked(false)}
          >
            <div className="text-center text-background">
              <Lock className="h-10 w-10 mx-auto mb-3 opacity-60" />
              <p className="text-sm opacity-60 font-medium">Tap to unlock</p>
            </div>
          </div>
        )}

        {/* End workout dialog */}
        <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
          <AlertDialogContent className="z-[300]">
            <AlertDialogHeader>
              <AlertDialogTitle>End Workout?</AlertDialogTitle>
              <AlertDialogDescription>What would you like to do with this session?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
              <AlertDialogAction onClick={handleEndEarly}>Save & End</AlertDialogAction>
              <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDiscard}>Discard</AlertDialogAction>
              <AlertDialogCancel>Keep Going</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // ─── STANDARD GYM MODE (rep-based / non-circuit) ─────────────────────────
  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-background">
      {/* ── Top Nav Bar ── */}
      <div className="flex items-center justify-between px-4 pt-12 pb-3 bg-background border-b border-border/50">
        <Button variant="ghost" size="sm" className="text-muted-foreground font-medium" onClick={() => setShowDiscardDialog(true)}>
          <X className="h-4 w-4 mr-1" /> Cancel
        </Button>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={togglePause} className="text-muted-foreground">
            {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
          </Button>
          <Button
            size="sm"
            className="font-semibold px-5"
            onClick={handleEndEarly}
          >
            Save
          </Button>
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <div className="grid grid-cols-4 px-4 py-3 border-b border-border/40 bg-background">
        <div className="text-center">
          <p className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">TIME</p>
          <p className="text-base font-bold tabular-nums">{formatTime(elapsedSeconds)}</p>
        </div>
        <div className="text-center border-x border-border/40">
          <p className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Remaining</p>
          <p className="text-base font-bold tabular-nums">{formatTime(remainingSeconds)}</p>
        </div>
        <div className="text-center border-r border-border/40">
          <p className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Active</p>
          <p className="text-base font-bold">{estimatedCal} Cal</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Progress</p>
          <p className="text-base font-bold">{completedPercent}%</p>
        </div>
      </div>

      {/* ── Scrollable Content ── */}
      <div className="flex-1 overflow-y-auto">
        {/* Rest Screen */}
        {isRest ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 gap-6">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="54" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                <circle
                  cx="60" cy="60" r="54"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 54}`}
                  strokeDashoffset={`${2 * Math.PI * 54 * (1 - timerPercent / 100)}`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Timer className="h-5 w-5 text-primary mb-1" />
                <p className="text-3xl font-black tabular-nums">{stepTimer > 0 ? stepTimer : "—"}</p>
                <p className="text-xs text-muted-foreground font-medium">seconds</p>
              </div>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">Rest</p>
              <p className="text-muted-foreground text-sm mt-1">
                {nextExerciseName ? `Up next: ${nextExerciseName}` : "Get ready!"}
              </p>
            </div>
            <Button variant="outline" className="w-full max-w-xs" onClick={advanceStep}>
              Skip Rest
            </Button>
          </div>
        ) : (
          <>
            {/* Section header */}
            {sectionLabel && (
              <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 border-l-4 border-primary mx-0">
                <p className="text-sm font-semibold text-foreground">{sectionLabel}</p>
              </div>
            )}

            {/* Set indicator for grouped */}
            {isGrouped && (
              <div className="px-4 pt-4 pb-1">
                <p className="text-lg font-bold">Set {currentStep.round}</p>
              </div>
            )}

            {/* Exercise Card */}
            {currentExercise && (
              <div className="border-l-4 border-primary mx-4 my-3 bg-card rounded-r-xl overflow-hidden shadow-sm">
                <div className="flex items-center gap-3 p-3">
                  {/* Thumbnail */}
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
                    {currentExercise.exercise_video ? (
                      <video
                        ref={videoRef}
                        key={currentExercise.id + stepIdx}
                        src={currentExercise.exercise_video}
                        className="w-full h-full object-cover"
                        autoPlay
                        loop
                        muted
                        playsInline
                      />
                    ) : currentExercise.exercise_image ? (
                      <img src={currentExercise.exercise_image} alt={currentExercise.exercise_name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-black text-muted-foreground/30">
                        {currentExercise.exercise_name?.charAt(0) || "?"}
                      </span>
                    )}
                  </div>

                  {/* Name + target */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground leading-tight">{currentExercise.exercise_name}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {currentExercise.duration_seconds
                        ? `${currentExercise.duration_seconds}s`
                        : currentExercise.reps
                        ? `${currentExercise.reps} reps`
                        : ""}
                    </p>
                  </div>

                  <Button variant="ghost" size="icon" className="text-muted-foreground flex-shrink-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>

                {/* Timer for timed exercises */}
                {currentExercise.duration_seconds && stepTimer > 0 && (
                  <div className="px-3 pb-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-muted-foreground font-medium">Time remaining</span>
                      <span className="text-2xl font-black tabular-nums text-primary">{formatTime(stepTimer)}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-1000"
                        style={{ width: `${timerPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Rep + weight logging for rep-based */}
                {!currentExercise.duration_seconds && currentStep.setKey && (
                  <div className="px-3 pb-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Previous</p>
                        <p className="text-sm text-muted-foreground">—</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Reps</p>
                        <Input
                          type="number"
                          value={setLogs[currentStep.setKey]?.reps || ""}
                          onChange={(e) => updateSetLog(currentStep.setKey!, "reps", e.target.value)}
                          className="h-10 text-center text-lg font-bold border-2 focus:border-primary"
                          placeholder="0"
                          inputMode="numeric"
                        />
                      </div>
                    </div>
                    {/* Weight row */}
                    <div className="mt-2">
                      <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Weight (lbs)</p>
                      <Input
                        type="number"
                        value={setLogs[currentStep.setKey]?.weight || ""}
                        onChange={(e) => updateSetLog(currentStep.setKey!, "weight", e.target.value)}
                        className="h-10 text-center text-lg font-bold border-2 focus:border-primary"
                        placeholder="0"
                        inputMode="decimal"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            {currentExercise?.notes && (
              <p className="text-sm text-muted-foreground px-4 pb-2 italic">{currentExercise.notes}</p>
            )}

            {/* Next up preview */}
            {nextExerciseName && (
              <div className="mx-4 mt-2 mb-3 px-3 py-2.5 bg-muted/40 rounded-xl flex items-center gap-3 border border-border/50">
                {nextExerciseImage ? (
                  <img src={nextExerciseImage} alt={nextExerciseName} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <span className="text-base font-bold text-muted-foreground/40">{nextExerciseName.charAt(0)}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground font-medium">Up Next</p>
                  <p className="text-sm font-semibold truncate">{nextExerciseName}</p>
                  {nextExerciseDuration && <p className="text-xs text-muted-foreground">{nextExerciseDuration}</p>}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Bottom Controls ── */}
      {!isLocked && (
        <div className="bg-background border-t border-border/50 px-4 pb-8 pt-3">
          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" size="icon" onClick={goToPrevStep} disabled={stepIdx === 0} className="text-muted-foreground">
              <SkipBack className="h-5 w-5" />
            </Button>

            <Button
              size="lg"
              className="flex-1 h-12 font-bold text-base rounded-xl"
              onClick={!isRest && currentStep?.type === "exercise" && !currentExercise?.duration_seconds ? markStepDone : advanceStep}
            >
              {isRest ? "Skip Rest" : currentExercise?.duration_seconds ? "Skip" : "Next →"}
            </Button>

            <Button variant="ghost" size="icon" onClick={() => setIsLocked(true)} className="text-muted-foreground">
              <Lock className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex justify-center mt-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive/60 text-xs"
              onClick={() => setShowDiscardDialog(true)}
            >
              <Square className="h-3 w-3 mr-1" /> End Workout
            </Button>
          </div>
        </div>
      )}

      {/* Lock overlay */}
      {isLocked && (
        <div
          className="fixed inset-0 z-[210] bg-foreground/80 flex items-center justify-center cursor-pointer"
          onClick={() => setIsLocked(false)}
        >
          <div className="text-center text-background">
            <Lock className="h-10 w-10 mx-auto mb-3 opacity-60" />
            <p className="text-sm opacity-60 font-medium">Tap to unlock</p>
          </div>
        </div>
      )}

      {/* ── End workout dialog ── */}
      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent className="z-[300]">
          <AlertDialogHeader>
            <AlertDialogTitle>End Workout?</AlertDialogTitle>
            <AlertDialogDescription>What would you like to do with this session?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <AlertDialogAction onClick={handleEndEarly}>Save & End</AlertDialogAction>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDiscard}>
              Discard
            </AlertDialogAction>
            <AlertDialogCancel>Keep Going</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Swap exercise dialog ── */}
      {swapTarget && (
        <ExerciseSwapDialog
          open={swapDialogOpen}
          onOpenChange={setSwapDialogOpen}
          currentExercise={sections[swapTarget.sectionIdx]?.exercises[swapTarget.exerciseIdx] as any}
          onSwap={handleSwapExercise}
        />
      )}
    </div>
  );
}
