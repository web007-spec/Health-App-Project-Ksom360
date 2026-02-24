import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BreathingExercise } from "@/lib/breathingExercises";

interface Props {
  exercise: BreathingExercise;
  onBack: () => void;
}

/* ─── Adaptive timing hook (Phase 2 ready) ─── */
interface BreathTiming {
  phases: { label: string; seconds: number; type: "inhale" | "hold" | "exhale" }[];
}

function useBreathTiming(exercise: BreathingExercise): BreathTiming {
  // Phase 2: This hook can accept an external pacing signal (e.g. HR)
  // and dynamically adjust phase durations. For now, pass-through.
  return { phases: exercise.phases };
}

/* ─── Particle system ─── */
interface Particle {
  id: number;
  x: number; // 0-100 vw%
  size: number;
  speed: number;
  opacity: number;
  drift: number; // horizontal sway
}

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    size: 1.5 + Math.random() * 3,
    speed: 0.3 + Math.random() * 0.7,
    opacity: 0.15 + Math.random() * 0.25,
    drift: (Math.random() - 0.5) * 0.4,
  }));
}

export function BreathingPlayer({ exercise, onBack }: Props) {
  const timing = useBreathTiming(exercise);
  const [playing, setPlaying] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [phaseElapsed, setPhaseElapsed] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);
  const [uiVisible, setUiVisible] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const uiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const particlesRef = useRef<Particle[]>(generateParticles(24));

  const currentPhase = timing.phases[phaseIndex];
  const phaseProgress = phaseElapsed / currentPhase.seconds;

  /* ─── Tick engine ─── */
  const tick = useCallback(() => {
    setPhaseElapsed((prev) => {
      const next = prev + 0.05;
      if (next >= timing.phases[phaseIndex].seconds) {
        setPhaseIndex((pi) => {
          const nextPi = pi + 1;
          if (nextPi >= timing.phases.length) {
            setCycleCount((c) => c + 1);
            return 0;
          }
          return nextPi;
        });
        return 0;
      }
      return next;
    });
  }, [timing.phases, phaseIndex]);

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(tick, 50);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing, tick]);

  /* ─── Auto-hide UI after 3s of playing ─── */
  useEffect(() => {
    if (uiTimerRef.current) clearTimeout(uiTimerRef.current);
    if (playing) {
      uiTimerRef.current = setTimeout(() => setUiVisible(false), 3000);
    } else {
      setUiVisible(true);
    }
    return () => {
      if (uiTimerRef.current) clearTimeout(uiTimerRef.current);
    };
  }, [playing]);

  const togglePlay = () => setPlaying((p) => !p);
  const showUi = () => {
    setUiVisible(true);
    if (uiTimerRef.current) clearTimeout(uiTimerRef.current);
    if (playing) {
      uiTimerRef.current = setTimeout(() => setUiVisible(false), 3000);
    }
  };

  /* ─── Atmosphere calculations ─── */
  // Brightness: inhale brightens, exhale darkens
  const baseBrightness = 0.08;
  const brightness =
    currentPhase.type === "inhale"
      ? baseBrightness + phaseProgress * 0.05
      : currentPhase.type === "exhale"
      ? baseBrightness + 0.05 - phaseProgress * 0.05
      : baseBrightness + 0.05 + phaseProgress * 0.02; // hold: slight intensify

  // Light source Y position (0=top, 100=bottom): inhale rises, exhale lowers
  const lightY =
    currentPhase.type === "inhale"
      ? 55 - phaseProgress * 15
      : currentPhase.type === "exhale"
      ? 40 + phaseProgress * 15
      : 40 + Math.sin(phaseProgress * Math.PI) * 3;

  // Particle direction: inhale=up, exhale=down, hold=still
  const particleDir =
    currentPhase.type === "inhale" ? -1 : currentPhase.type === "exhale" ? 1 : 0;

  const secondsLeft = Math.ceil(currentPhase.seconds - phaseElapsed);

  // Easing: exhale feels heavier
  const transitionDuration =
    currentPhase.type === "exhale" ? "1.2s" : "0.8s";
  const transitionEasing =
    currentPhase.type === "exhale"
      ? "cubic-bezier(0.4, 0.0, 0.2, 1)"
      : "cubic-bezier(0.25, 0.46, 0.45, 0.94)";

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden select-none cursor-pointer"
      onClick={showUi}
      style={{
        background: `
          radial-gradient(
            ellipse 80% 60% at 50% ${lightY}%,
            hsla(195, 50%, ${12 + brightness * 100}%, ${0.35 + brightness}) 0%,
            hsla(220, 45%, ${8 + brightness * 60}%, 0.6) 40%,
            hsla(250, 30%, ${6 + brightness * 30}%, 0.8) 70%,
            hsla(260, 25%, 4%, 1) 100%
          )
        `,
        transition: `background ${transitionDuration} ${transitionEasing}`,
      }}
    >
      {/* Parallax haze layers */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(
              ellipse 120% 50% at 30% ${lightY + 10}%,
              hsla(180, 35%, 15%, ${0.08 + brightness * 0.3}) 0%,
              transparent 70%
            )
          `,
          transition: `all ${transitionDuration} ${transitionEasing}`,
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(
              ellipse 90% 40% at 70% ${lightY - 5}%,
              hsla(270, 25%, 18%, ${0.05 + brightness * 0.2}) 0%,
              transparent 60%
            )
          `,
          transition: `all ${transitionDuration} ${transitionEasing}`,
        }}
      />

      {/* Atmospheric particles */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
        {particlesRef.current.map((p) => {
          // Calculate Y based on elapsed time and direction
          const baseY = ((Date.now() * p.speed * 0.01 * particleDir + p.id * 37) % 120) - 10;
          const clampedY = particleDir === 0 ? 30 + (p.id % 40) : baseY;
          return (
            <circle
              key={p.id}
              cx={`${p.x + Math.sin(Date.now() * 0.0005 * p.speed + p.id) * p.drift * 5}%`}
              cy={`${clampedY}%`}
              r={p.size}
              fill={`hsla(190, 40%, 70%, ${p.opacity * (0.6 + brightness * 3)})`}
              style={{
                transition: `all ${transitionDuration} ${transitionEasing}`,
              }}
            />
          );
        })}
      </svg>

      {/* ─── Minimal UI overlay ─── */}

      {/* Top bar: back + cycle (always subtle) */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between p-5 z-10"
        style={{
          opacity: uiVisible ? 0.7 : 0.25,
          transition: "opacity 0.6s ease",
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onBack();
          }}
          className="flex items-center gap-1 text-white/40 hover:text-white/70 text-xs"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-[10px] text-white/25 uppercase tracking-[0.2em] font-light">
          {cycleCount + 1}
        </span>
      </div>

      {/* Center: phase label + subtle countdown */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
        <span
          className="text-xl font-light tracking-[0.15em] uppercase"
          style={{
            color: `hsla(190, 30%, 85%, ${0.6 + brightness * 2})`,
            transition: `color ${transitionDuration} ${transitionEasing}`,
            textShadow: `0 0 40px hsla(190, 40%, 50%, ${brightness * 0.5})`,
          }}
        >
          {currentPhase.type === "inhale"
            ? "Inhale"
            : currentPhase.type === "exhale"
            ? "Exhale"
            : "Hold"}
        </span>
        <span
          className="text-sm font-extralight mt-2 tabular-nums"
          style={{
            color: `hsla(200, 20%, 70%, ${0.3 + brightness})`,
            transition: `color ${transitionDuration} ${transitionEasing}`,
          }}
        >
          {secondsLeft}
        </span>
      </div>

      {/* Play button — fades away */}
      {!playing && (
        <div
          className="absolute inset-0 flex items-center justify-center z-20"
          style={{
            opacity: uiVisible ? 1 : 0,
            transition: "opacity 0.6s ease",
            pointerEvents: uiVisible ? "auto" : "none",
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            className="w-16 h-16 rounded-full flex items-center justify-center backdrop-blur-sm"
            style={{
              background: "hsla(220, 30%, 20%, 0.4)",
              border: "1px solid hsla(200, 30%, 50%, 0.15)",
            }}
          >
            <Play className="h-6 w-6 ml-0.5 text-white/60" />
          </button>
        </div>
      )}

      {/* Tap-to-pause overlay when playing */}
      {playing && uiVisible && (
        <div
          className="absolute bottom-12 left-0 right-0 flex justify-center z-20"
          style={{
            opacity: 0.5,
            transition: "opacity 0.6s ease",
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setPlaying(false);
            }}
            className="text-[10px] uppercase tracking-[0.2em] text-white/30 hover:text-white/50 px-4 py-2"
          >
            Tap to pause
          </button>
        </div>
      )}
    </div>
  );
}
