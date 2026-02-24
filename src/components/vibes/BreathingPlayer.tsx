import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, Pause, Play, RotateCcw } from "lucide-react";
import type { BreathingExercise, RestoreMode, MotionProfile, ProtocolTone } from "@/lib/breathingExercises";
import { BreathingEntryScreen } from "./BreathingEntryScreen";
import { BreathingSessionSummary } from "./BreathingSessionSummary";
import { BreathingAnimationLayer } from "./BreathingAnimationLayer";

interface Props {
  exercise: BreathingExercise;
  mode?: RestoreMode;
  onBack: () => void;
  contained?: boolean;
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

function generateParticles(density: number): Particle[] {
  const count = Math.round(24 * density);
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

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

/** Compute progressive intensity multiplier based on cycle progress */
function getArcIntensity(arcMode: RestoreMode, cycleCount: number, totalCycles: number): number {
  if (totalCycles <= 1) return 1;
  const progress = Math.min(cycleCount / totalCycles, 1);

  if (arcMode === "activate") {
    // Build: 0.6 → 1.2 peak at ~80%, slight resolve at end
    if (progress < 0.8) return 0.6 + progress * 0.75;
    return 1.2 - (progress - 0.8) * 1.0;
  }
  if (arcMode === "downshift") {
    // Reverse: 0.8 → 0.3 deepening
    return 0.8 - progress * 0.5;
  }
  // regulate: steady
  return 1.0;
}

export function BreathingPlayer({ exercise, mode, onBack, contained = false }: Props) {
  const effectiveMode = mode ?? exercise.motion.arcMode;
  const tone = exercise.tone;
  const motion = exercise.motion;
  const phases = exercise.phases;
  const ratioStr = phases.map((p) => p.seconds).join("–");

  // States
  const [stage, setStage] = useState<"entry" | "playing" | "summary">("entry");
  const [playing, setPlaying] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [phaseElapsed, setPhaseElapsed] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);
  const [durationSecs, setDurationSecs] = useState(180);
  const [sessionElapsed, setSessionElapsed] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const particlesRef = useRef<Particle[]>(generateParticles(motion.particleDensity));
  const frameRef = useRef(0);
  const sessionStartRef = useRef(0);

  const currentPhase = phases[phaseIndex];
  const rawProgress = phaseElapsed / currentPhase.seconds;
  const mappedProgress = currentPhase.type === "exhale" ? easeOutQuart(rawProgress) : rawProgress;

  // Estimate total cycles for arc calculation
  const cycleLength = phases.reduce((s, p) => s + p.seconds, 0);
  const estimatedTotalCycles = Math.max(1, Math.floor(durationSecs / cycleLength));

  const arcIntensity = getArcIntensity(effectiveMode, cycleCount, estimatedTotalCycles);

  /* ─── Tick engine ─── */
  const tick = useCallback(() => {
    setPhaseElapsed((prev) => {
      const next = prev + 0.05;
      if (next >= phases[phaseIndex].seconds) {
        setPhaseIndex((pi) => {
          const nextPi = pi + 1;
          if (nextPi >= phases.length) {
            setCycleCount((c) => c + 1);
            return 0;
          }
          return nextPi;
        });
        return 0;
      }
      return next;
    });
    setSessionElapsed((prev) => prev + 0.05);
    frameRef.current++;
  }, [phases, phaseIndex]);

  useEffect(() => {
    if (playing && stage === "playing") {
      intervalRef.current = setInterval(tick, 50);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, stage, tick]);

  // Auto-end when duration reached
  useEffect(() => {
    if (stage === "playing" && sessionElapsed >= durationSecs) {
      setPlaying(false);
      setStage("summary");
    }
  }, [sessionElapsed, durationSecs, stage]);

  const handleStart = (dur: number) => {
    setDurationSecs(dur);
    sessionStartRef.current = Date.now();
    setSessionElapsed(0);
    setCycleCount(0);
    setPhaseIndex(0);
    setPhaseElapsed(0);
    setStage("playing");
    setPlaying(true);
  };

  const handleReset = () => {
    setPlaying(false);
    setSessionElapsed(0);
    setCycleCount(0);
    setPhaseIndex(0);
    setPhaseElapsed(0);
  };

  const handleEnd = () => {
    setPlaying(false);
    setStage("summary");
  };

  /* ─── Entry screen ─── */
  if (stage === "entry") {
    return (
      <div className={contained ? "relative w-full aspect-[9/16] overflow-hidden rounded-2xl" : ""}>
        <BreathingEntryScreen
          exercise={exercise}
          mode={effectiveMode}
          onStart={handleStart}
          onBack={onBack}
          contained={contained}
        />
      </div>
    );
  }

  /* ─── Summary screen ─── */
  if (stage === "summary") {
    const totalSecs = Math.round(sessionElapsed);
    return (
      <div className={contained ? "relative w-full aspect-[9/16] overflow-hidden rounded-2xl" : ""}>
        <BreathingSessionSummary
          cycleCount={cycleCount}
          totalSeconds={totalSecs}
          onBack={onBack}
          tone={tone}
          contained={contained}
        />
      </div>
    );
  }

  /* ─── Atmosphere calculations ─── */
  const p = mappedProgress;
  const lSpeed = tone.luminanceSpeed;
  const lumAmp = motion.luminanceAmplitude * arcIntensity;

  const baseBrightness = 0.08;
  const brightness =
    currentPhase.type === "inhale"
      ? baseBrightness + p * lumAmp * lSpeed
      : currentPhase.type === "exhale"
      ? baseBrightness + lumAmp * lSpeed - p * lumAmp * lSpeed
      : baseBrightness + lumAmp * lSpeed + p * 0.02;

  const pulseIntensity =
    currentPhase.type === "hold" ? 0 : Math.sin(p * Math.PI) * 0.015 * arcIntensity;

  // Motion-type-specific light position
  const h = tone.hueBase;
  const s = tone.hueSat;
  const time = frameRef.current * 0.05;

  let lightX = 50;
  let lightY = 50;

  switch (motion.motionType) {
    case "horizon-drift": {
      lightX = 50 + Math.sin(time * 0.15) * 15;
      lightY = currentPhase.type === "inhale" ? 55 - p * 15 : currentPhase.type === "exhale" ? 40 + p * 15 : 40;
      break;
    }
    case "diagonal-sweep": {
      const angle = (motion.sweepAngle * Math.PI) / 180;
      const sweep = Math.sin(time * 0.2) * 20;
      lightX = 50 + Math.cos(angle) * sweep;
      lightY = (currentPhase.type === "inhale" ? 55 - p * 18 : currentPhase.type === "exhale" ? 37 + p * 18 : 40) + Math.sin(angle) * sweep * 0.3;
      break;
    }
    case "radial-gravity": {
      const orbit = time * 0.1;
      lightX = 50 + Math.cos(orbit) * 8 * (1 + p * 0.5);
      lightY = 50 + Math.sin(orbit) * 8 * (1 + p * 0.5);
      break;
    }
    case "radial-pulse": {
      lightX = 50;
      lightY = 50;
      break;
    }
    case "ascent-arc": {
      lightX = 50;
      lightY = currentPhase.type === "inhale" ? 60 - p * 25 : currentPhase.type === "exhale" ? 35 + p * 25 : 40;
      break;
    }
    case "deep-descent": {
      lightX = 50 + Math.sin(time * 0.08) * 5;
      lightY = currentPhase.type === "inhale" ? 55 - p * 10 : currentPhase.type === "exhale" ? 45 + p * 10 : 48;
      break;
    }
    default: {
      lightY = currentPhase.type === "inhale" ? 55 - p * 15 : currentPhase.type === "exhale" ? 40 + p * 15 : 40;
    }
  }

  // Radial-pulse specific: pulsing size
  const ellipseW = motion.motionType === "radial-pulse" ? 60 + Math.sin(time * 0.8) * 15 * arcIntensity : 80;
  const ellipseH = motion.motionType === "radial-pulse" ? 45 + Math.sin(time * 0.8) * 10 * arcIntensity : 60;

  // Particles
  const pSpeed = motion.particleSpeedMul * arcIntensity;
  const particleDir = currentPhase.type === "inhale" ? -1 : currentPhase.type === "exhale" ? 1 : -0.15;
  const particleDrift = motion.particleDriftMul;

  // Depth blur
  const depthBlur =
    currentPhase.type === "inhale" ? 1.5 - p * 1.5 : currentPhase.type === "exhale" ? p * 2 : 0.5;

  const secondsLeft = Math.ceil(currentPhase.seconds - phaseElapsed);
  const timeRemaining = Math.max(0, Math.ceil(durationSecs - sessionElapsed));
  const trMins = Math.floor(timeRemaining / 60);
  const trSecs = timeRemaining % 60;
  const timeRemainingStr = `${trMins}:${String(trSecs).padStart(2, "0")}`;

  const transitionDuration = currentPhase.type === "exhale" ? "1.4s" : "0.8s";
  const transitionEasing = currentPhase.type === "exhale"
    ? "cubic-bezier(0.33, 0.0, 0.15, 1)"
    : "cubic-bezier(0.25, 0.46, 0.45, 0.94)";

  const particleHue = h - 10;
  const hSpread = motion.hueSpread;

  return (
    <div
      className={`${contained ? "absolute" : "fixed"} inset-0 z-50 overflow-hidden select-none`}
      style={{
        transition: `background ${transitionDuration} ${transitionEasing}`,
        background: `
          radial-gradient(
            ellipse ${ellipseW}% ${ellipseH}% at ${lightX}% ${lightY}%,
            hsla(${h}, ${s}%, ${12 + (brightness + pulseIntensity) * 100}%, ${0.35 + brightness + pulseIntensity}) 0%,
            hsla(${h + hSpread * 0.4}, ${s - 5}%, ${8 + brightness * 60}%, 0.6) 40%,
            hsla(${h + hSpread * 0.8}, ${Math.max(s - 20, 15)}%, ${6 + brightness * 30}%, 0.8) 70%,
            hsla(${h + hSpread}, ${Math.max(s - 25, 10)}%, 4%, 1) 100%
          )
        `,
      }}
    >
      {/* Depth blur */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backdropFilter: `blur(${depthBlur}px)`,
          WebkitBackdropFilter: `blur(${depthBlur}px)`,
          transition: `backdrop-filter ${transitionDuration} ${transitionEasing}`,
        }}
      />

      {/* Parallax haze 1 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 120% 50% at 30% ${lightY + 10}%, hsla(${h - 15}, ${s - 10}%, 15%, ${0.08 + brightness * 0.3}) 0%, transparent 70%)`,
          transition: `all ${transitionDuration} ${transitionEasing}`,
        }}
      />
      {/* Parallax haze 2 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 90% 40% at 70% ${lightY - 5}%, hsla(${h + hSpread}, ${Math.max(s - 25, 12)}%, 18%, ${0.05 + brightness * 0.2}) 0%, transparent 60%)`,
          transition: `all ${transitionDuration} ${transitionEasing}`,
        }}
      />

      {/* Luminance pulse overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${lightX}% ${lightY}%, hsla(${h}, ${s - 10}%, 50%, ${pulseIntensity}) 0%, transparent 60%)`,
          transition: `all ${transitionDuration} ${transitionEasing}`,
        }}
      />

      {/* Horizon anchor */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{
          height: "30%",
          background: `linear-gradient(to top, hsla(${h + 10}, 30%, 8%, 0.1) 0%, transparent 100%)`,
          opacity: 0.1,
        }}
      />

      {/* Particles */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
        {particlesRef.current.map((pt) => {
          const yOffset = time * pt.speed * particleDir * pSpeed * 8;
          const y = ((pt.baseY + yOffset) % 120 + 120) % 120 - 10;
          const xSway = Math.sin(time * 0.3 * pt.speed + pt.id * 2.1) * pt.drift * 6 * particleDrift;
          const particleOpacity = pt.opacity * (0.6 + brightness * 3) *
            (currentPhase.type === "inhale" ? 0.7 + p * 0.6 : currentPhase.type === "exhale" ? 1.3 - p * 0.5 : 0.8);
          return (
            <circle
              key={pt.id}
              cx={`${pt.x + xSway}%`}
              cy={`${y}%`}
              r={pt.size * (0.8 + arcIntensity * 0.4)}
              fill={`hsla(${particleHue}, 40%, 70%, ${particleOpacity})`}
            />
          );
        })}
      </svg>

      {/* ─── Animation Layer ─── */}
      <BreathingAnimationLayer
        animation={exercise.animation}
        progress={mappedProgress}
        phaseType={currentPhase.type}
        hue={h}
        sat={s}
        brightness={brightness}
        arcIntensity={arcIntensity}
        time={time}
      />

      {/* ─── UI Layer ─── */}

      {/* Top bar: back + time remaining */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-5 z-10">
        <button
          onClick={handleEnd}
          className="flex items-center gap-1 text-white/40 hover:text-white/70 text-xs"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-[11px] text-white/35 font-light tabular-nums tracking-wide">
          {timeRemainingStr} remaining
        </span>
        <span className="text-[10px] text-white/20 uppercase tracking-[0.2em] tabular-nums">
          {cycleCount + 1}
        </span>
      </div>

      {/* Center guidance */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
        <span
          className="text-xl font-light tracking-[0.15em] uppercase"
          style={{
            color: `hsla(${h - 5}, 30%, 85%, ${0.6 + brightness * 2})`,
            transition: `color ${transitionDuration} ${transitionEasing}`,
            textShadow: `0 0 40px hsla(${h}, 40%, 50%, ${brightness * 0.5})`,
          }}
        >
          {currentPhase.type === "inhale" ? "Inhale" : currentPhase.type === "exhale" ? "Exhale" : "Hold"}
        </span>
        <span
          className="text-sm font-extralight mt-2 tabular-nums"
          style={{
            color: `hsla(${h}, 20%, 70%, ${0.3 + brightness})`,
            transition: `color ${transitionDuration} ${transitionEasing}`,
          }}
        >
          {secondsLeft}
        </span>
      </div>

      {/* Breath ratio — bottom */}
      <div className="absolute bottom-24 left-0 right-0 flex justify-center z-10 pointer-events-none opacity-20">
        <span className="text-[10px] font-light tracking-[0.25em] text-white/50 tabular-nums">
          {ratioStr}
        </span>
      </div>

      {/* Controls — always visible, slightly dimmed */}
      <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-6 z-20">
        <button
          onClick={handleReset}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white/25 hover:text-white/50 transition-colors"
          style={{ background: `hsla(${h}, 15%, 15%, 0.3)` }}
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          onClick={() => setPlaying(!playing)}
          className="w-14 h-14 rounded-full flex items-center justify-center backdrop-blur-sm active:scale-95 transition-transform"
          style={{
            background: `hsla(${h}, 30%, 20%, 0.5)`,
            border: `1px solid hsla(${h}, 30%, 50%, 0.2)`,
          }}
        >
          {playing ? (
            <Pause className="h-5 w-5 text-white/60" />
          ) : (
            <Play className="h-5 w-5 ml-0.5 text-white/60" />
          )}
        </button>
        <div className="w-10" /> {/* spacer for centering */}
      </div>
    </div>
  );
}
