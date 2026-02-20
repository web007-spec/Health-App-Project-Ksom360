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

// Number words for clean TTS pronunciation
const NUM_WORDS: Record<number, string> = { 1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six", 7: "seven", 8: "eight", 9: "nine", 10: "ten" };
function toWords(n: number): string { return NUM_WORDS[n] ?? String(n); }

// Active audio element — stop it before playing a new one
let activeAudio: HTMLAudioElement | null = null;

// Returns a Promise that resolves only when the audio has finished playing
async function playElevenLabsSpeech(text: string): Promise<void> {
  // Cancel any currently playing audio immediately
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.src = "";
    activeAudio = null;
  }
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const response = await fetch(`${supabaseUrl}/functions/v1/elevenlabs-tts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) throw new Error(`TTS ${response.status}`);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  activeAudio = audio;
  return new Promise((resolve) => {
    audio.onended = () => {
      URL.revokeObjectURL(url);
      if (activeAudio === audio) activeAudio = null;
      resolve();
    };
    audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
    audio.play().catch(() => resolve());
  });
}

// Browser speech fallback — returns Promise that resolves when done
function browserSpeak(text: string): Promise<void> {
  if (!("speechSynthesis" in window)) return Promise.resolve();
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.95;
  return new Promise((resolve) => {
    utter.onend = () => resolve();
    utter.onerror = () => resolve();
    window.speechSynthesis.speak(utter);
  });
}

export function WorkoutPlayer({ sections, onComplete, onEndEarly, onDiscard, onExit }: WorkoutPlayerProps) {
  const { toast } = useToast();
  const startedAtRef = useRef(new Date().toISOString());
  const [setLogs, setSetLogs] = useState<Record<string, SetLog>>({});
  const [voiceEnabled, setVoiceEnabled] = useState(true);
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

  const voiceEnabledRef = useRef(voiceEnabled);
  useEffect(() => { voiceEnabledRef.current = voiceEnabled; }, [voiceEnabled]);
  useEffect(() => { stepIdxRef.current = stepIdx; }, [stepIdx]);

  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);

  // speakText returns a Promise that resolves when audio finishes
  const speakText = useCallback((text: string): Promise<void> => {
    if (!voiceEnabledRef.current) return Promise.resolve();
    return playElevenLabsSpeech(text).catch(() => browserSpeak(text));
  }, []);

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
        return prev;
      }
      return next;
    });
  }, [steps.length, speakText]);

  // ── Start per-step countdown timer ──
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
          const step = stepsRef.current[stepIdxRef.current];
          const isCircuitRest = step?.type === "rest" && step.isCircuit;
          const donePhrase = isCircuitRest ? "Let's go!" : "Great job! Moving on.";
          const done = voiceEnabledRef.current
            ? speakText(donePhrase)
            : Promise.resolve();
          done.finally(() => advanceStep());
          return 0;
        }
        if (voiceEnabledRef.current) {
          const step = stepsRef.current[stepIdxRef.current];
          const isCircuitRest = step?.type === "rest" && step.isCircuit;

          if (next === 10) {
            if (isCircuitRest) {
              // Announce the round name at 10s — the 3,2,1 will fire naturally at 3,2,1
              const nextRound = step.round + 1;
              speakText(`Alright, let's go round ${toWords(nextRound)}!`);
            } else {
              speakText("Ten seconds left. Keep pushing!");
            }
          }
          // 3-2-1 fires for ALL steps (including circuit rests) so it aligns with the clock
          if (next === 3 || next === 2 || next === 1) {
            speakText(toWords(next));
          }
        }
        return next;
      });
    }, 1000);
  }, [advanceStep, speakText]);

  // ── GET READY → COUNTDOWN → PLAYING ──
  useEffect(() => {
    if (phase === "getready") {
      const t = setTimeout(() => setPhase("countdown"), 1800);
      return () => clearTimeout(t);
    }
    if (phase === "countdown") {
      setCountdownNum(3);
      let n = 3;
      speakText("Three");
      const interval = setInterval(() => {
        n--;
        setCountdownNum(n);
        if (n === 2) speakText("Two");
        else if (n === 1) speakText("One");
        if (n <= 0) {
          clearInterval(interval);
          setTimeout(() => setPhase("playing"), 500);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [phase, speakText]);

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
      if (voiceEnabledRef.current) {
        if (currentStep.isCircuit) {
          // Between-rounds rest: announce round completion and upcoming round
          const section = sections[currentStep.sectionIdx];
          const completedRound = currentStep.round;
          const totalRounds = section?.rounds || 1;
          const roundsLeft = totalRounds - completedRound;
          const nextRound = completedRound + 1;
          let msg = `You just finished round ${toWords(completedRound)}`;
          if (roundsLeft === 1) {
            msg += ` with ${toWords(roundsLeft)} more round to go. Take a quick rest and get ready for round ${toWords(nextRound)}!`;
          } else if (roundsLeft > 1) {
            msg += ` with ${toWords(roundsLeft)} more rounds to go. Take a quick rest and get ready for round ${toWords(nextRound)}!`;
          }
          speakText(msg);
        } else {
          speakText(`Rest for ${secs} seconds.`);
        }
      }
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
              className="w-full h-full object-cover"
              autoPlay
              loop
              muted
              playsInline
            />
          ) : !isRest && currentExercise?.exercise_image ? (
            <img
              src={currentExercise.exercise_image}
              alt={currentExercise.exercise_name}
              className="w-full h-full object-cover"
            />
          ) : isRest ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-muted/30">
              <Heart className="h-16 w-16 text-primary/40" />
              <p className="text-muted-foreground font-medium">Recovery Time</p>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-6xl font-black text-muted-foreground/20">
                {currentExercise?.exercise_name?.charAt(0) || "?"}
              </span>
            </div>
          )}

          {/* Lock overlay */}
          {isLocked && (
            <div
              className="absolute inset-0 bg-black/60 flex items-center justify-center cursor-pointer z-10"
              onClick={() => setIsLocked(false)}
            >
              <div className="text-center text-white">
                <Lock className="h-8 w-8 mx-auto mb-2 opacity-60" />
                <p className="text-sm opacity-60">Tap to unlock</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Timer & Info ── */}
        <div className="px-4 pt-3 pb-2 bg-white">
          <div className="flex items-center justify-between mb-2">
            {/* Timer */}
            <div className="text-center flex-1">
              {stepTimer > 0 ? (
                <p className="text-4xl font-black tabular-nums text-foreground">{formatTime(stepTimer)}</p>
              ) : (
                <p className="text-2xl font-semibold text-muted-foreground">
                  {currentExercise?.reps ? `${currentExercise.reps} reps` : "--"}
                </p>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {stepTimer > 0 && stepTimerDurationRef.current > 0 && (
            <div className="w-full bg-muted rounded-full h-1.5 mb-2">
              <div
                className="bg-primary h-1.5 rounded-full transition-all"
                style={{ width: `${((stepTimerDurationRef.current - stepTimer) / stepTimerDurationRef.current) * 100}%` }}
              />
            </div>
          )}

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
                <p className="text-xs text-muted-foreground mb-1">Weight (lbs)</p>
                <Input
                  type="number"
                  value={setLogs[currentStep.setKey]?.weight || ""}
                  onChange={(e) => updateSetLog(currentStep.setKey!, "weight", e.target.value)}
                  className="h-9 text-center"
                  placeholder="0"
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Up Next ── */}
        {nextExerciseName && (
          <div className="px-4 py-2 bg-muted/30 border-t border-border/40 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
              {nextExerciseImage ? (
                <img src={nextExerciseImage} alt={nextExerciseName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-muted-foreground/40">{nextExerciseName.charAt(0)}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Up Next</p>
              <p className="text-sm font-semibold truncate">{nextExerciseName}</p>
              {nextExerciseDuration && <p className="text-xs text-muted-foreground">{nextExerciseDuration}</p>}
            </div>
          </div>
        )}

        {/* ── Controls ── */}
        {!isLocked && (
          <div className="px-4 pb-6 pt-2 bg-white">
            <div className="flex items-center justify-between gap-2">
              {/* Voice toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setVoiceEnabled((v) => !v)}
                className="text-muted-foreground"
              >
                {voiceEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
              </Button>

              {/* Prev */}
              <Button variant="outline" size="icon" onClick={goToPrevStep} disabled={stepIdx === 0}>
                <SkipBack className="h-5 w-5" />
              </Button>

              {/* Play/Pause */}
              <Button size="icon" className="h-14 w-14 rounded-full" onClick={togglePause}>
                {isPaused ? <Play className="h-6 w-6" /> : <Pause className="h-6 w-6" />}
              </Button>

              {/* Next / Done */}
              {currentStep?.type === "exercise" && !currentExercise?.duration_seconds ? (
                <Button variant="outline" size="icon" onClick={markStepDone}>
                  <SkipForward className="h-5 w-5" />
                </Button>
              ) : (
                <Button variant="outline" size="icon" onClick={advanceStep}>
                  <SkipForward className="h-5 w-5" />
                </Button>
              )}

              {/* Lock */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsLocked(true)}
                className="text-muted-foreground"
              >
                <Lock className="h-5 w-5" />
              </Button>
            </div>

            {/* Exit menu */}
            <div className="flex justify-center mt-3">
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
      </div>

      {/* ── Bottom stats bar ── */}
      <div className="bg-black text-white px-4 py-2 flex items-center justify-around text-center">
        <div>
          <p className="text-xs text-white/50">Done</p>
          <p className="text-sm font-bold">{completedPercent}%</p>
        </div>
        <div>
          <p className="text-xs text-white/50">Elapsed</p>
          <p className="text-sm font-bold">{formatTime(elapsedSeconds)}</p>
        </div>
        <div>
          <p className="text-xs text-white/50">Remaining</p>
          <p className="text-sm font-bold">{formatTime(remainingSeconds)}</p>
        </div>
        <div>
          <p className="text-xs text-white/50">Cal</p>
          <p className="text-sm font-bold">{estimatedCal}</p>
        </div>
      </div>

      {/* ── End workout dialog ── */}
      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent className="z-[300]">
          <AlertDialogHeader>
            <AlertDialogTitle>End Workout?</AlertDialogTitle>
            <AlertDialogDescription>What would you like to do with this session?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <AlertDialogAction onClick={handleEndEarly}>Save & End</AlertDialogAction>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDiscard}
            >
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
          currentExercise={
            sections[swapTarget.sectionIdx]?.exercises[swapTarget.exerciseIdx] as any
          }
          onSwap={handleSwapExercise}
        />
      )}
    </div>
  );
}
