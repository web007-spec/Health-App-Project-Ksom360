import { useState } from "react";
import { Play, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import type { RestoreMode, BreathingExercise } from "@/lib/breathingExercises";
import { DURATION_PRESETS, MODE_DEFAULT_DURATIONS } from "@/lib/breathingExercises";

interface Props {
  exercise: BreathingExercise;
  mode: RestoreMode;
  onStart: (durationSecs: number) => void;
  onBack: () => void;
  contained?: boolean;
}

const PRESET_LABELS: Record<number, string> = {
  30: "30s",
  60: "1 min",
  120: "2 min",
  180: "3 min",
  300: "5 min",
  600: "10 min",
};

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m === 0) return `0:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function BreathingEntryScreen({ exercise, mode, onStart, onBack, contained }: Props) {
  const defaultDuration = MODE_DEFAULT_DURATIONS[mode];
  const [duration, setDuration] = useState(defaultDuration);

  const h = exercise.tone.hueBase;
  const s = exercise.tone.hueSat;

  const ratioStr = exercise.phases.map((p) => p.seconds).join("–");

  return (
    <div
      className={`${contained ? "absolute" : "fixed"} inset-0 z-50 flex flex-col items-center justify-center`}
      style={{ background: `hsl(${h + 45}, ${Math.max(s - 25, 10)}%, 4%)` }}
    >
      {/* Exercise info */}
      <h3 className="text-lg font-light text-white/70 tracking-wide mb-1">{exercise.name}</h3>
      <p className="text-xs text-white/30 mb-1 max-w-[240px] text-center">{exercise.description}</p>
      <span className="text-[10px] text-white/20 tracking-[0.2em] tabular-nums mb-6">{ratioStr}</span>

      {/* Duration display */}
      <span
        className="text-4xl font-extralight text-white/60 tabular-nums mb-5"
        style={{ textShadow: `0 0 30px hsla(${h}, 30%, 50%, 0.2)` }}
      >
        {formatDuration(duration)}
      </span>

      {/* Quick select chips */}
      <div className="flex flex-wrap justify-center gap-2 mb-4 max-w-[320px]">
        {DURATION_PRESETS.map((preset) => (
          <button
            key={preset}
            onClick={() => setDuration(preset)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200",
              duration === preset
                ? "text-white/80"
                : "text-white/30 hover:text-white/50"
            )}
            style={{
              background: duration === preset
                ? `hsla(${h}, ${s - 10}%, 25%, 0.5)`
                : `hsla(${h}, 15%, 15%, 0.3)`,
              border: `1px solid ${duration === preset
                ? `hsla(${h}, ${s}%, 50%, 0.25)`
                : `hsla(${h}, 15%, 30%, 0.15)`}`,
            }}
          >
            {PRESET_LABELS[preset]}
          </button>
        ))}
      </div>

      {/* Fine control slider */}
      <div className="w-56 mb-8">
        <Slider
          value={[duration]}
          onValueChange={([v]) => setDuration(v)}
          min={15}
          max={900}
          step={15}
          className="[&_[data-slot=slider-track]]:h-1 [&_[data-slot=slider-track]]:bg-white/[0.06] [&_[data-slot=slider-range]]:bg-white/20 [&_[data-slot=slider-thumb]]:w-3 [&_[data-slot=slider-thumb]]:h-3 [&_[data-slot=slider-thumb]]:bg-white/50 [&_[data-slot=slider-thumb]]:border-0"
        />
      </div>

      {/* Begin button */}
      <button
        onClick={() => onStart(duration)}
        className="w-16 h-16 rounded-full flex items-center justify-center backdrop-blur-sm active:scale-95 transition-transform"
        style={{
          background: `hsla(${h}, 30%, 20%, 0.4)`,
          border: `1px solid hsla(${h}, 30%, 50%, 0.15)`,
        }}
      >
        <Play className="h-6 w-6 ml-0.5 text-white/60" />
      </button>

      {/* Back */}
      <button
        onClick={onBack}
        className="mt-6 text-[10px] uppercase tracking-[0.2em] text-white/25 hover:text-white/40"
      >
        Back
      </button>
    </div>
  );
}
