import { useState } from "react";
import { cn } from "@/lib/utils";
import { BREATHING_EXERCISES, type BreathingExercise } from "@/lib/breathingExercises";
import { BreathingPlayer } from "./BreathingPlayer";

export function RestoreBreathingTab() {
  const [activeExercise, setActiveExercise] = useState<BreathingExercise | null>(null);

  if (activeExercise) {
    return (
      <BreathingPlayer
        exercise={activeExercise}
        onBack={() => setActiveExercise(null)}
      />
    );
  }

  return (
    <div className="space-y-4 mt-2">
      <div className="text-center space-y-1.5">
        <h3 className="text-lg font-bold text-white/90">Breathing Exercises</h3>
        <p className="text-xs text-white/40 max-w-sm mx-auto">
          Choose a technique to calm your mind, reduce stress, or energize your body.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {BREATHING_EXERCISES.map((ex) => (
          <button
            key={ex.id}
            onClick={() => setActiveExercise(ex)}
            className={cn(
              "flex flex-col gap-3 p-4 rounded-2xl text-left transition-all duration-200",
              "bg-gradient-to-br from-[hsl(260,25%,14%)] to-[hsl(260,20%,10%)]",
              "border border-white/[0.06] hover:border-[hsl(260,40%,40%)]/40",
              "active:scale-[0.98]"
            )}
          >
            <div className="flex items-center gap-3">
              <div className="shrink-0 w-10 h-10 rounded-xl bg-[hsl(260,45%,38%)]/20 flex items-center justify-center text-lg">
                {ex.icon}
              </div>
              <h4 className="text-sm font-semibold text-white/90">{ex.name}</h4>
            </div>
            <p className="text-xs text-white/40 leading-relaxed">{ex.description}</p>
            <div className="flex flex-wrap gap-1.5">
              {ex.phases.map((phase, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/[0.06] text-white/50"
                >
                  {phase.label} {phase.seconds}s
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
