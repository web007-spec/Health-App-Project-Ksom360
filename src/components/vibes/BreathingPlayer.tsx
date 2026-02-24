import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, Play, Pause, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BreathingExercise, BreathPhase } from "@/lib/breathingExercises";

interface Props {
  exercise: BreathingExercise;
  onBack: () => void;
}

export function BreathingPlayer({ exercise, onBack }: Props) {
  const [playing, setPlaying] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [phaseElapsed, setPhaseElapsed] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentPhase = exercise.phases[phaseIndex];
  const totalCycleSec = exercise.phases.reduce((s, p) => s + p.seconds, 0);

  // Progress within the current phase (0→1)
  const phaseProgress = phaseElapsed / currentPhase.seconds;

  const tick = useCallback(() => {
    setPhaseElapsed((prev) => {
      const next = prev + 0.05; // 50ms tick
      if (next >= exercise.phases[phaseIndex].seconds) {
        // Advance phase
        setPhaseIndex((pi) => {
          const nextPi = pi + 1;
          if (nextPi >= exercise.phases.length) {
            setCycleCount((c) => c + 1);
            return 0;
          }
          return nextPi;
        });
        return 0;
      }
      return next;
    });
  }, [exercise.phases, phaseIndex]);

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

  const reset = () => {
    setPlaying(false);
    setPhaseIndex(0);
    setPhaseElapsed(0);
    setCycleCount(0);
  };

  const togglePlay = () => setPlaying((p) => !p);

  return (
    <div className="flex flex-col items-center relative">
      {/* Header */}
      <div className="w-full flex items-center justify-between mb-6">
        <button onClick={onBack} className="flex items-center gap-1.5 text-white/50 hover:text-white/80 text-xs">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <span className="text-[10px] text-white/30 uppercase tracking-widest">
          Cycle {cycleCount + 1}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-lg font-bold text-white/90 mb-1">{exercise.name}</h3>
      <p className="text-xs text-white/40 mb-4">{exercise.description}</p>

      {/* Animation area */}
      <div className="relative w-48 h-48 sm:w-64 sm:h-64 flex items-center justify-center mb-4">
        <BreathingAnimation
          type={exercise.animation}
          phaseType={currentPhase.type}
          progress={phaseProgress}
        />
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          <span className="text-2xl font-bold text-white/90">{currentPhase.label}</span>
          <span className="text-4xl font-mono text-white/70 mt-1">
            {Math.ceil(currentPhase.seconds - phaseElapsed)}
          </span>
        </div>
      </div>

      {/* Phase indicator dots */}
      <div className="flex gap-2 mb-6">
        {exercise.phases.map((phase, i) => (
          <div
            key={i}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              i === phaseIndex ? "w-8" : "w-2",
              i === phaseIndex
                ? phase.type === "inhale"
                  ? "bg-sky-400"
                  : phase.type === "exhale"
                  ? "bg-violet-400"
                  : "bg-amber-400"
                : i < phaseIndex
                ? "bg-white/20"
                : "bg-white/10"
            )}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={reset}
          className="w-10 h-10 rounded-full bg-white/[0.06] flex items-center justify-center text-white/40 hover:text-white/70 transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          onClick={togglePlay}
          className="w-14 h-14 rounded-full bg-[hsl(260,45%,38%)] flex items-center justify-center text-white shadow-lg shadow-[hsl(260,45%,38%)]/30 hover:bg-[hsl(260,45%,44%)] transition-colors"
        >
          {playing ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
        </button>
        <div className="w-10" /> {/* spacer for symmetry */}
      </div>
    </div>
  );
}

/* ─── Animation Visuals ─── */

interface AnimProps {
  type: string;
  phaseType: "inhale" | "hold" | "exhale";
  progress: number;
}

function BreathingAnimation({ type, phaseType, progress }: AnimProps) {
  // Scale mapping: inhale grows, exhale shrinks, hold stays
  const scale =
    phaseType === "inhale"
      ? 0.5 + progress * 0.5
      : phaseType === "exhale"
      ? 1.0 - progress * 0.5
      : 0.75 + Math.sin(progress * Math.PI * 2) * 0.05; // subtle pulse on hold

  switch (type) {
    case "ocean":
      return <OceanAnimation scale={scale} progress={progress} phaseType={phaseType} />;
    case "lotus":
      return <LotusAnimation scale={scale} progress={progress} phaseType={phaseType} />;
    case "orbital":
      return <OrbitalAnimation scale={scale} progress={progress} phaseType={phaseType} />;
    case "aurora":
      return <AuroraAnimation scale={scale} progress={progress} phaseType={phaseType} />;
    case "heartbeat":
      return <HeartbeatAnimation scale={scale} progress={progress} phaseType={phaseType} />;
    default:
      return <OrbitalAnimation scale={scale} progress={progress} phaseType={phaseType} />;
  }
}

function OceanAnimation({ scale, progress, phaseType }: { scale: number; progress: number; phaseType: string }) {
  const waveY = phaseType === "inhale" ? 60 - progress * 40 : phaseType === "exhale" ? 20 + progress * 40 : 40;
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <radialGradient id="ocean-glow" cx="50%" cy="50%">
          <stop offset="0%" stopColor="hsl(200,80%,60%)" stopOpacity={0.3 * scale} />
          <stop offset="100%" stopColor="hsl(220,70%,30%)" stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r={45 * scale} fill="url(#ocean-glow)" className="transition-all duration-100" />
      {/* Wave paths */}
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          d={`M 5 ${waveY + i * 8} Q 25 ${waveY - 8 + i * 8 + Math.sin(progress * Math.PI * 2 + i) * 4}, 50 ${waveY + i * 8} T 95 ${waveY + i * 8}`}
          fill="none"
          stroke={`hsla(200, 80%, ${60 + i * 10}%, ${0.4 - i * 0.1})`}
          strokeWidth={2 - i * 0.5}
          className="transition-all duration-100"
        />
      ))}
      {/* Particles */}
      {Array.from({ length: 6 }).map((_, i) => (
        <circle
          key={`p${i}`}
          cx={15 + i * 14}
          cy={waveY - 5 + Math.sin(progress * Math.PI * 3 + i * 1.2) * 6}
          r={1}
          fill="hsla(200,90%,80%,0.4)"
          className="transition-all duration-200"
        />
      ))}
    </svg>
  );
}

function LotusAnimation({ scale, progress, phaseType }: { scale: number; progress: number; phaseType: string }) {
  const petalCount = 8;
  const petalSpread = scale * 30;
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <radialGradient id="lotus-glow" cx="50%" cy="50%">
          <stop offset="0%" stopColor="hsl(300,60%,60%)" stopOpacity={0.3} />
          <stop offset="100%" stopColor="transparent" stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r={40 * scale} fill="url(#lotus-glow)" />
      {Array.from({ length: petalCount }).map((_, i) => {
        const angle = (i / petalCount) * 360;
        const rad = (angle * Math.PI) / 180;
        const px = 50 + Math.cos(rad) * petalSpread;
        const py = 50 + Math.sin(rad) * petalSpread;
        return (
          <ellipse
            key={i}
            cx={px}
            cy={py}
            rx={8 * scale}
            ry={14 * scale}
            transform={`rotate(${angle}, ${px}, ${py})`}
            fill={`hsla(${290 + i * 8}, 60%, ${55 + i * 3}%, ${0.25 + scale * 0.2})`}
            stroke={`hsla(${290 + i * 8}, 70%, 70%, 0.2)`}
            strokeWidth={0.5}
            className="transition-all duration-150"
          />
        );
      })}
      {/* Center */}
      <circle cx="50" cy="50" r={6 * scale} fill="hsla(45,80%,70%,0.5)" />
      {/* Sparkles */}
      {phaseType === "inhale" &&
        Array.from({ length: 4 }).map((_, i) => (
          <circle
            key={`s${i}`}
            cx={50 + Math.cos((progress * Math.PI * 2 + i * 1.5)) * 35 * scale}
            cy={50 + Math.sin((progress * Math.PI * 2 + i * 1.5)) * 35 * scale}
            r={0.8}
            fill="hsla(50,90%,80%,0.6)"
          />
        ))}
    </svg>
  );
}

function OrbitalAnimation({ scale, progress, phaseType }: { scale: number; progress: number; phaseType: string }) {
  const ringCount = 3;
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <radialGradient id="orb-glow" cx="50%" cy="50%">
          <stop offset="0%" stopColor="hsl(260,70%,65%)" stopOpacity={0.5} />
          <stop offset="60%" stopColor="hsl(260,50%,40%)" stopOpacity={0.15} />
          <stop offset="100%" stopColor="transparent" stopOpacity={0} />
        </radialGradient>
      </defs>
      {/* Pulsing rings */}
      {Array.from({ length: ringCount }).map((_, i) => {
        const ringScale = scale + (phaseType === "inhale" ? progress * 0.15 * (i + 1) : 0);
        return (
          <circle
            key={i}
            cx="50"
            cy="50"
            r={20 + i * 10}
            fill="none"
            stroke={`hsla(260, 60%, ${60 + i * 10}%, ${0.25 - i * 0.07})`}
            strokeWidth={1}
            transform={`scale(${ringScale})`}
            style={{ transformOrigin: "50px 50px", transition: "all 150ms ease" }}
          />
        );
      })}
      {/* Core orb */}
      <circle cx="50" cy="50" r={18 * scale} fill="url(#orb-glow)" className="transition-all duration-150" />
      <circle cx="50" cy="50" r={8 * scale} fill="hsla(260,80%,75%,0.4)" className="transition-all duration-150" />
    </svg>
  );
}

function AuroraAnimation({ scale, progress, phaseType }: { scale: number; progress: number; phaseType: string }) {
  const ribbonY = phaseType === "inhale" ? 70 - progress * 40 : phaseType === "exhale" ? 30 + progress * 40 : 50;
  const colors = ["180,80%,50%", "260,70%,55%", "300,60%,50%", "140,60%,45%"];
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <filter id="aurora-blur">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
      {colors.map((color, i) => {
        const offset = i * 6;
        const wave = Math.sin(progress * Math.PI * 2 + i * 0.8) * 12;
        return (
          <path
            key={i}
            d={`M 0 ${ribbonY + offset} Q 25 ${ribbonY + offset + wave}, 50 ${ribbonY + offset - wave * 0.5} T 100 ${ribbonY + offset + wave * 0.3}`}
            fill="none"
            stroke={`hsla(${color}, ${0.3 + scale * 0.2})`}
            strokeWidth={4 + scale * 4}
            strokeLinecap="round"
            filter="url(#aurora-blur)"
            className="transition-all duration-200"
          />
        );
      })}
      {/* Glow core */}
      <circle cx="50" cy={ribbonY} r={10 * scale} fill={`hsla(260,60%,60%,${0.15 * scale})`} filter="url(#aurora-blur)" />
    </svg>
  );
}

function HeartbeatAnimation({ scale, progress, phaseType }: { scale: number; progress: number; phaseType: string }) {
  // Extra pulse effect on hold
  const pulseRing = phaseType === "hold" ? 1 + Math.sin(progress * Math.PI * 4) * 0.08 : 1;
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <radialGradient id="heart-glow" cx="50%" cy="45%">
          <stop offset="0%" stopColor="hsl(320,70%,55%)" stopOpacity={0.4 * scale} />
          <stop offset="100%" stopColor="transparent" stopOpacity={0} />
        </radialGradient>
      </defs>
      {/* Radiating pulses on exhale */}
      {phaseType === "exhale" &&
        [1, 2, 3].map((i) => (
          <circle
            key={`pulse${i}`}
            cx="50"
            cy="48"
            r={20 + progress * 20 * i}
            fill="none"
            stroke={`hsla(320,60%,60%,${0.2 - progress * 0.15})`}
            strokeWidth={0.5}
          />
        ))}
      {/* Glow */}
      <circle cx="50" cy="48" r={35 * scale * pulseRing} fill="url(#heart-glow)" />
      {/* Heart shape */}
      <g transform={`translate(50,48) scale(${scale * 0.35 * pulseRing})`} style={{ transformOrigin: "0 0" }}>
        <path
          d="M0 -10 C -25 -40, -55 -5, 0 25 C 55 -5, 25 -40, 0 -10 Z"
          fill="hsla(320,65%,50%,0.5)"
          stroke="hsla(320,70%,65%,0.4)"
          strokeWidth={1.5}
        />
      </g>
    </svg>
  );
}
