import { memo } from "react";
import { cn } from "@/lib/utils";
import { Clock, Waves, BrainCircuit } from "lucide-react";
import { GuidedSession } from "@/lib/guidedSessions";
import { BRAINWAVE_DEFS } from "@/lib/syntheticSounds";

interface Props {
  session: GuidedSession;
  isActive: boolean;
  onTap: () => void;
}

export const SessionCard = memo(function SessionCard({ session, isActive, onTap }: Props) {
  const mins = Math.round(session.durationSec / 60);

  return (
    <button
      onClick={onTap}
      className={cn(
        "shrink-0 w-[160px] rounded-2xl p-3 text-left transition-all duration-[180ms] border",
        "bg-gradient-to-br from-[hsl(260,25%,16%)] to-[hsl(260,20%,12%)]",
        "active:scale-[0.97]",
        isActive
          ? "ring-[1.5px] ring-amber-400/60 border-amber-400/30 shadow-[0_0_12px_rgba(251,191,36,0.15)]"
          : "border-border/40 hover:border-[hsl(260,30%,35%)]"
      )}
    >
      <p className="text-sm font-semibold text-white/90 leading-tight">{session.name}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{session.subtitle}</p>

      <div className="flex items-center gap-2 mt-3">
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-white/60 bg-white/[0.06] rounded-full px-2 py-0.5">
          <Clock className="w-3 h-3" />
          {mins}m
        </span>
        <span className="inline-flex items-center gap-0.5 text-[10px] text-white/50">
          <Waves className="w-3 h-3" />
          {session.sounds.length}
        </span>
        {session.brainwave && (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-[hsl(260,60%,70%)]">
            <BrainCircuit className="w-3 h-3" />
            {BRAINWAVE_DEFS[session.brainwave.type].label}
          </span>
        )}
      </div>
    </button>
  );
});
