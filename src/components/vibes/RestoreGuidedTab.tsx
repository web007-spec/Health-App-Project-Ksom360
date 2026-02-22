import { Headphones, Clock, Wind, Brain, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

const PLACEHOLDER_SESSIONS = [
  { id: "breathwork-calm", name: "Calm Breathing", subtitle: "4-7-8 pattern for relaxation", duration: "5 min", icon: Wind, category: "Breathwork" },
  { id: "focus-reset", name: "Focus Reset", subtitle: "Clear mental fog in 3 minutes", duration: "3 min", icon: Brain, category: "Focus" },
  { id: "wind-down", name: "Evening Wind Down", subtitle: "Gentle breathwork before sleep", duration: "10 min", icon: Moon, category: "Wind Down" },
  { id: "morning-energy", name: "Morning Energy", subtitle: "Activate your day with breath", duration: "7 min", icon: Wind, category: "Breathwork" },
];

export function RestoreGuidedTab() {
  return (
    <div className="space-y-4 mt-2">
      <div>
        <h3 className="text-base font-semibold text-white/90">Guided Sessions</h3>
        <p className="text-xs text-white/40 mt-0.5">Breathwork, focus resets, and wind-down routines</p>
      </div>

      <div className="space-y-3">
        {PLACEHOLDER_SESSIONS.map((session) => {
          const Icon = session.icon;
          return (
            <button
              key={session.id}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-200",
                "bg-gradient-to-br from-[hsl(260,25%,14%)] to-[hsl(260,20%,10%)]",
                "border border-white/[0.06] hover:border-[hsl(260,40%,40%)]/40",
                "active:scale-[0.98]"
              )}
            >
              <div className="shrink-0 w-12 h-12 rounded-xl bg-[hsl(260,45%,38%)]/20 flex items-center justify-center">
                <Icon className="h-5 w-5 text-[hsl(260,60%,70%)]" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-white/90">{session.name}</p>
                <p className="text-xs text-white/40 mt-0.5">{session.subtitle}</p>
              </div>
              <div className="shrink-0 flex items-center gap-1 text-white/30">
                <Clock className="h-3 w-3" />
                <span className="text-[10px] font-medium">{session.duration}</span>
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-center text-[11px] text-white/20 pt-2">
        More sessions coming soon via admin uploads
      </p>
    </div>
  );
}
