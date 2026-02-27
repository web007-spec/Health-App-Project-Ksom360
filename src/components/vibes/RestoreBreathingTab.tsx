import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import { BREATHING_EXERCISES, type BreathingExercise, type RestoreMode } from "@/lib/breathingExercises";
import { useRestoreProfile } from "@/hooks/useRestoreProfile";

type FilterTab = "downshift" | "focus" | "sleep" | "co2";

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: "downshift", label: "Downshift" },
  { id: "focus", label: "Focus" },
  { id: "sleep", label: "Sleep" },
  { id: "co2", label: "CO₂ Training" },
];

/** Map filter tabs to exercise arc modes / characteristics */
function matchesFilter(ex: BreathingExercise, tab: FilterTab): boolean {
  switch (tab) {
    case "downshift":
      return ex.motion.arcMode === "downshift";
    case "focus":
      return ex.motion.arcMode === "regulate" || ex.motion.arcMode === "activate";
    case "sleep":
      return ex.id === "478-relaxation" || ex.id === "calming-breath" || ex.motion.arcMode === "downshift";
    case "co2":
      return ex.id === "orbital" || ex.id === "box-breathing"; // Extended hold protocols
  }
}

interface Props {
  onStartSession?: (exercise: BreathingExercise) => void;
}

export function RestoreBreathingTab({ onStartSession }: Props) {
  const { config } = useRestoreProfile();
  const [activeTab, setActiveTab] = useState<FilterTab>("downshift");

  const filtered = useMemo(
    () => BREATHING_EXERCISES.filter((ex) => matchesFilter(ex, activeTab)),
    [activeTab]
  );

  const handleStart = (ex: BreathingExercise) => {
    onStartSession?.(ex);
  };

  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-white/90 tracking-tight">
          {config.breathingTone.sectionTitle}
        </h3>
        <p className="text-xs text-white/35 max-w-sm">
          {config.breathingTone.sectionSub}
        </p>
      </div>

      {/* Filter tabs — segmented control */}
      <div className="flex rounded-lg bg-white/[0.04] p-1 gap-0.5 border border-white/[0.06]">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 text-xs font-medium py-2 rounded-md transition-all duration-200",
              activeTab === tab.id
                ? "bg-white/[0.10] text-white/90 shadow-sm"
                : "text-white/35 hover:text-white/55"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Session cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map((ex) => {
          const rhythm = ex.phases.map((p) => p.seconds).join(" · ");
          const phaseLabels = ex.phases.map((p) => p.label).join(" — ");
          const cycleLen = ex.phases.reduce((s, p) => s + p.seconds, 0);

          return (
            <div
              key={ex.id}
              className={cn(
                "flex flex-col gap-3 p-4 rounded-xl transition-all duration-200",
                "bg-white/[0.02] border border-white/[0.06]",
                "hover:border-white/[0.12]"
              )}
            >
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-white/90 mb-1">
                  {ex.name}
                </h4>
                <p className="text-xs text-white/40 leading-relaxed mb-3">
                  {ex.description}
                </p>
                {/* Rhythm line */}
                <div className="space-y-0.5">
                  <p className="text-base font-semibold text-white/70 tracking-wider tabular-nums">
                    {rhythm}
                  </p>
                  <p className="text-[10px] text-white/25 uppercase tracking-wider">
                    {phaseLabels}
                  </p>
                </div>
                <p className="text-[10px] text-white/20 mt-1.5">
                  {cycleLen}s cycle · 4–6 min recommended
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleStart(ex)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all",
                    "text-white/85 active:scale-[0.97]"
                  )}
                  style={{
                    backgroundColor: `hsla(${config.accent}, 0.2)`,
                    border: `1px solid hsla(${config.accent}, 0.3)`,
                  }}
                >
                  Start
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-white/30">No protocols in this category</p>
        </div>
      )}
    </div>
  );
}
