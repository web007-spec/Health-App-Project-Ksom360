import { Play, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRestoreProfile } from "@/hooks/useRestoreProfile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BREATHING_EXERCISES, type BreathingExercise } from "@/lib/breathingExercises";

interface Props {
  onStartBreathing: (exercise: BreathingExercise) => void;
  onNavigateGuided: () => void;
}

export function RestoreQuickStart({ onStartBreathing, onNavigateGuided }: Props) {
  const { config } = useRestoreProfile();

  // Fetch guided sessions to see if there's a recommendation
  const { data: sessions = [] } = useQuery({
    queryKey: ["restore-guided-quick"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restore_guided_sessions")
        .select("id, name, subtitle, category, duration_seconds")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return data;
    },
  });

  // Pick recommended breathing exercise (first regulate, then first available)
  const recommended =
    BREATHING_EXERCISES.find((e) => e.motion.arcMode === "regulate") ??
    BREATHING_EXERCISES[0];

  const guidedSession = sessions[0];
  const cycleLen = recommended.phases.reduce((s, p) => s + p.seconds, 0);
  const recDuration = Math.round((cycleLen * 5) / 60); // ~5 cycles

  // Determine outcome label based on arc mode
  const outcomeMap: Record<string, string> = {
    downshift: "Downshift",
    regulate: "Regulate",
    activate: "Focus",
  };
  const outcome = outcomeMap[recommended.motion.arcMode] || "Recovery";

  return (
    <div className="space-y-3">
      {/* Hero tile — primary action */}
      <button
        onClick={() => onStartBreathing(recommended)}
        className={cn(
          "w-full relative overflow-hidden rounded-2xl transition-all duration-200",
          "active:scale-[0.98]",
          "border border-white/[0.08]"
        )}
        style={{
          background: `linear-gradient(135deg, hsl(${config.accent}) 0%, hsla(${config.accentMuted}, 0.6) 100%)`,
        }}
      >
        <div className="relative z-10 p-6 text-left">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-medium mb-3">
            {config.quickStartLabel}
          </p>
          <h3 className="text-lg font-semibold text-white/95 mb-1">
            {recommended.name}
          </h3>
          <p className="text-sm text-white/50 mb-4">
            {outcome} · {recDuration} min
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 text-sm font-medium text-white/90">
            <Play className="h-4 w-4" />
            Start Session
          </div>
        </div>
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/20" />
      </button>

      {/* Guided session nudge — if available */}
      {guidedSession && (
        <button
          onClick={onNavigateGuided}
          className={cn(
            "w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200",
            "bg-white/[0.03] border border-white/[0.06]",
            "hover:bg-white/[0.06] active:scale-[0.98]"
          )}
        >
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-white/80">{guidedSession.name}</p>
            {guidedSession.subtitle && (
              <p className="text-xs text-white/35 mt-0.5">{guidedSession.subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-1 text-white/30">
            <span className="text-[10px] font-medium">
              {Math.round(guidedSession.duration_seconds / 60)} min
            </span>
            <ChevronRight className="h-4 w-4" />
          </div>
        </button>
      )}
    </div>
  );
}
