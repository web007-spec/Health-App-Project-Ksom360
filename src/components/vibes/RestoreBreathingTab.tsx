import { useState } from "react";
import { cn } from "@/lib/utils";
import { Settings2, Sparkles } from "lucide-react";
import { BREATHING_EXERCISES, type BreathingExercise, type RestoreMode } from "@/lib/breathingExercises";
import { BreathingPlayer } from "./BreathingPlayer";

const MODE_META: Record<RestoreMode, { label: string; desc: string; icon: string }> = {
  activate: { label: "Activate", desc: "Energizing, dynamic arc", icon: "⚡" },
  regulate: { label: "Regulate", desc: "Balanced, immersive", icon: "🔄" },
  downshift: { label: "Downshift", desc: "Deep calming arc", icon: "🌙" },
};

export function RestoreBreathingTab() {
  const [activeExercise, setActiveExercise] = useState<BreathingExercise | null>(null);
  const [modeOverride, setModeOverride] = useState<RestoreMode | null>(null);
  const [showOverrideModal, setShowOverrideModal] = useState(false);

  // Auto-recommended exercise (first regulate exercise)
  const recommended = BREATHING_EXERCISES.find((e) => e.motion.arcMode === "regulate") ?? BREATHING_EXERCISES[0];

  if (activeExercise) {
    return (
      <BreathingPlayer
        exercise={activeExercise}
        mode={modeOverride ?? undefined}
        onBack={() => {
          setActiveExercise(null);
          setModeOverride(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-5 mt-2">
      {/* Auto-recommendation card */}
      <div className="mx-auto max-w-md">
        <div
          className={cn(
            "rounded-2xl p-5 text-center space-y-3",
            "bg-gradient-to-br from-[hsl(260,25%,14%)] to-[hsl(260,20%,10%)]",
            "border border-white/[0.06]"
          )}
        >
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="h-4 w-4 text-white/40" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-medium">
              Restore Recommendation
            </span>
          </div>
          <p className="text-xs text-white/30">Optimized for your current state</p>

          <button
            onClick={() => setActiveExercise(recommended)}
            className={cn(
              "w-full py-3 rounded-xl text-sm font-medium text-white/80 transition-all",
              "bg-[hsl(260,35%,22%)] hover:bg-[hsl(260,35%,26%)]",
              "border border-white/[0.08] active:scale-[0.98]"
            )}
          >
            Begin Session
          </button>

          <button
            onClick={() => setShowOverrideModal(true)}
            className="text-[10px] text-white/25 hover:text-white/40 uppercase tracking-[0.15em] flex items-center gap-1 mx-auto"
          >
            <Settings2 className="h-3 w-3" />
            Adjust Experience
          </button>
        </div>
      </div>

      {/* Override modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowOverrideModal(false)}>
          <div
            className="bg-[hsl(260,20%,8%)] border border-white/[0.08] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-sm font-semibold text-white/80 text-center">Adjust Experience</h4>
            <p className="text-xs text-white/30 text-center">Override applies to this session only</p>

            {(["activate", "regulate", "downshift"] as RestoreMode[]).map((m) => {
              const meta = MODE_META[m];
              const isSelected = modeOverride === m;
              return (
                <button
                  key={m}
                  onClick={() => {
                    setModeOverride(m);
                    setShowOverrideModal(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left",
                    isSelected
                      ? "bg-[hsl(260,35%,20%)] border border-[hsl(260,40%,40%)]/40"
                      : "bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12]"
                  )}
                >
                  <span className="text-lg">{meta.icon}</span>
                  <div>
                    <span className="text-sm font-medium text-white/80">{meta.label}</span>
                    <p className="text-xs text-white/30">{meta.desc}</p>
                  </div>
                </button>
              );
            })}

            <button
              onClick={() => {
                setModeOverride(null);
                setShowOverrideModal(false);
              }}
              className="w-full text-center text-[10px] text-white/25 hover:text-white/40 uppercase tracking-[0.15em] py-2"
            >
              Reset to Auto
            </button>
          </div>
        </div>
      )}

      {/* Section header */}
      <div className="text-center space-y-1.5">
        <h3 className="text-lg font-bold text-white/90">Breathing Protocols</h3>
        <p className="text-xs text-white/40 max-w-sm mx-auto">
          Structured breath regulation for recovery and nervous system control.
        </p>
      </div>

      {/* Exercise grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {BREATHING_EXERCISES.map((ex) => {
          const modeLabel = MODE_META[ex.motion.arcMode];
          return (
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
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-white/90">{ex.name}</h4>
                  <span className="text-[10px] text-white/25 uppercase tracking-wider">{modeLabel.label}</span>
                </div>
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
          );
        })}
      </div>
    </div>
  );
}
