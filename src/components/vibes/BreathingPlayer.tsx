import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, Play } from "lucide-react";
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
  return { phases: exercise.phases };
}

/* ─── Particle system ─── */
interface Particle {
  id: number;
  x: number;
  size: number;
  speed: number;
  opacity: number;
  drift: number;
  baseY: number;
}

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    size: 1.5 + Math.random() * 3,
    speed: 0.3 + Math.random() * 0.7,
    opacity: 0.15 + Math.random() * 0.25,
    drift: (Math.random() - 0.5) * 0.4,
    baseY: Math.random() * 100,
  }));
}

export function BreathingPlayer({ exercise, onBack }: Props) {
  const timing = useBreathTiming(exercise);
  const [playing, setPlaying] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [phaseElapsed, setPhaseElapsed] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);
  const [uiVisible, setUiVisible] = useState(true);
  const [entered, setEntered] = useState(false); // session entry transition
  const [entryOpacity, setEntryOpacity] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const uiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const particlesRef = useRef<Particle[]>(generateParticles(24));
  const frameRef = useRef(0);

  const currentPhase = timing.phases[phaseIndex];
  const rawProgress = phaseElapsed / currentPhase.seconds;

  // 3️⃣ Exhale elongation bias: decelerate final 20%
  const phaseProgress =
    currentPhase.type === "exhale" && rawProgress > 0.8
      ? 0.8 + (rawProgress - 0.8) * easeOutCubic((rawProgress - 0.8) / 0.2) * 0.2 / ((rawProgress - 0.8) || 0.001) * (rawProgress - 0.8)
      : rawProgress;

  // Simpler: remap exhale progress with gravitational decel
  const mappedProgress = (() => {
    if (currentPhase.type !== "exhale") return rawProgress;
    // Apply ease-out curve that decelerates heavily at the end
    return easeOutQuart(rawProgress);
  })();

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
    frameRef.current++;
  }, [timing.phases, phaseIndex]);

  useEffect(() => {
    if (playing && entered) {
      intervalRef.current = setInterval(tick, 50);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing, entered, tick]);

  /* ─── Auto-hide UI after 3s ─── */
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

  /* ─── 6️⃣ Session entry transition ─── */
  const handleStart = () => {
    setEntryOpacity(0);
    // Fade environment in over 1.2s, then start breathing
    requestAnimationFrame(() => {
      setEntryOpacity(1);
    });
    setTimeout(() => {
      setEntered(true);
      setPlaying(true);
    }, 1200);
  };

  const showUi = () => {
    setUiVisible(true);
    if (uiTimerRef.current) clearTimeout(uiTimerRef.current);
    if (playing) {
      uiTimerRef.current = setTimeout(() => setUiVisible(false), 3000);
    }
  };

  /* ─── Atmosphere calculations ─── */
  const p = entered ? mappedProgress : 0;
  const baseBrightness = 0.08;
  const brightness =
    currentPhase.type === "inhale"
      ? baseBrightness + p * 0.05
      : currentPhase.type === "exhale"
      ? baseBrightness + 0.05 - p * 0.05
      : baseBrightness + 0.05 + p * 0.02;

  // 1️⃣ Micro-luminance pulse: 1-2% radial pulse from center
  const pulseIntensity =
    currentPhase.type === "hold"
      ? 0
      : Math.sin(p * Math.PI) * 0.015; // peaks mid-phase

  const lightY =
    currentPhase.type === "inhale"
      ? 55 - p * 15
      : currentPhase.type === "exhale"
      ? 40 + p * 15
      : 40 + Math.sin(p * Math.PI) * 3;

  // 4️⃣ Particles: hold = 15% speed, never freeze
  const particleSpeed =
    currentPhase.type === "hold" ? 0.15 : 1.0;
  const particleDir =
    currentPhase.type === "inhale" ? -1 : currentPhase.type === "exhale" ? 1 : -0.15;

  // 2️⃣ Depth blur: inhale sharpens, exhale softens
  const depthBlur =
    currentPhase.type === "inhale"
      ? 1.5 - p * 1.5
      : currentPhase.type === "exhale"
      ? p * 2
      : 0.5;

  const secondsLeft = Math.ceil(currentPhase.seconds - phaseElapsed);

  const transitionDuration = currentPhase.type === "exhale" ? "1.4s" : "0.8s";
  const transitionEasing =
    currentPhase.type === "exhale"
      ? "cubic-bezier(0.33, 0.0, 0.15, 1)"
      : "cubic-bezier(0.25, 0.46, 0.45, 0.94)";

  const showEntryButton = !entered && !playing;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden select-none cursor-pointer"
      onClick={entered ? showUi : undefined}
      style={{
        opacity: entered ? 1 : entryOpacity,
        transition: entered
          ? `background ${transitionDuration} ${transitionEasing}`
          : "opacity 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        background: `
          radial-gradient(
            ellipse 80% 60% at 50% ${lightY}%,
            hsla(195, 50%, ${12 + (brightness + pulseIntensity) * 100}%, ${0.35 + brightness + pulseIntensity}) 0%,
            hsla(220, 45%, ${8 + brightness * 60}%, 0.6) 40%,
            hsla(250, 30%, ${6 + brightness * 30}%, 0.8) 70%,
            hsla(260, 25%, 4%, 1) 100%
          )
        `,
      }}
    >
      {/* 2️⃣ Depth blur layer */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backdropFilter: `blur(${depthBlur}px)`,
          WebkitBackdropFilter: `blur(${depthBlur}px)`,
          transition: `backdrop-filter ${transitionDuration} ${transitionEasing}`,
        }}
      />

      {/* Parallax haze layer 1 */}
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
      {/* Parallax haze layer 2 */}
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

      {/* 1️⃣ Micro-luminance pulse overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 50%, hsla(195, 40%, 50%, ${pulseIntensity}) 0%, transparent 60%)`,
          transition: `all ${transitionDuration} ${transitionEasing}`,
        }}
      />

      {/* 5️⃣ Subtle horizon anchor */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{
          height: "30%",
          background: `linear-gradient(to top, hsla(220, 30%, 8%, 0.1) 0%, transparent 100%)`,
          opacity: 0.1,
        }}
      />

      {/* 4️⃣ Atmospheric particles with drift continuity */}
      {entered && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
          {particlesRef.current.map((pt) => {
            const time = frameRef.current * 0.05;
            const yOffset = time * pt.speed * particleDir * particleSpeed * 8;
            const y = ((pt.baseY + yOffset) % 120 + 120) % 120 - 10;
            const xSway = Math.sin(time * 0.3 * pt.speed + pt.id * 2.1) * pt.drift * 6;
            return (
              <circle
                key={pt.id}
                cx={`${pt.x + xSway}%`}
                cy={`${y}%`}
                r={pt.size}
                fill={`hsla(190, 40%, 70%, ${pt.opacity * (0.6 + brightness * 3)})`}
              />
            );
          })}
        </svg>
      )}

      {/* ─── Minimal UI ─── */}

      {/* Top bar */}
      {entered && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-between p-5 z-10"
          style={{
            opacity: uiVisible ? 0.7 : 0.25,
            transition: "opacity 0.6s ease",
          }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); onBack(); }}
            className="flex items-center gap-1 text-white/40 hover:text-white/70 text-xs"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="text-[10px] text-white/25 uppercase tracking-[0.2em] font-light">
            {cycleCount + 1}
          </span>
        </div>
      )}

      {/* Center guidance */}
      {entered && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
          <span
            className="text-xl font-light tracking-[0.15em] uppercase"
            style={{
              color: `hsla(190, 30%, 85%, ${0.6 + brightness * 2})`,
              transition: `color ${transitionDuration} ${transitionEasing}`,
              textShadow: `0 0 40px hsla(190, 40%, 50%, ${brightness * 0.5})`,
            }}
          >
            {currentPhase.type === "inhale" ? "Inhale" : currentPhase.type === "exhale" ? "Exhale" : "Hold"}
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
      )}

      {/* 6️⃣ Entry button — fades into environment */}
      {showEntryButton && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-[hsla(260,25%,4%,1)]">
          <h3 className="text-lg font-light text-white/70 tracking-wide mb-2">{exercise.name}</h3>
          <p className="text-xs text-white/30 mb-8 max-w-[240px] text-center">{exercise.description}</p>
          <button
            onClick={handleStart}
            className="w-16 h-16 rounded-full flex items-center justify-center backdrop-blur-sm"
            style={{
              background: "hsla(220, 30%, 20%, 0.4)",
              border: "1px solid hsla(200, 30%, 50%, 0.15)",
            }}
          >
            <Play className="h-6 w-6 ml-0.5 text-white/60" />
          </button>
          <button
            onClick={onBack}
            className="mt-6 text-[10px] uppercase tracking-[0.2em] text-white/25 hover:text-white/40"
          >
            Back
          </button>
        </div>
      )}

      {/* Tap to pause */}
      {playing && uiVisible && entered && (
        <div
          className="absolute bottom-12 left-0 right-0 flex justify-center z-20"
          style={{ opacity: 0.5, transition: "opacity 0.6s ease" }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setPlaying(false); }}
            className="text-[10px] uppercase tracking-[0.2em] text-white/30 hover:text-white/50 px-4 py-2"
          >
            Tap to pause
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Easing helpers ─── */
function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
