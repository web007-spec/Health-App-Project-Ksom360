import type { ProtocolTone } from "@/lib/breathingExercises";

interface Props {
  cycleCount: number;
  totalSeconds: number;
  onBack: () => void;
  tone: ProtocolTone;
  contained?: boolean;
}

export function BreathingSessionSummary({ cycleCount, totalSeconds, onBack, tone, contained }: Props) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  return (
    <div
      className={`${contained ? "absolute" : "fixed"} inset-0 z-50 flex flex-col items-center justify-center`}
      style={{ background: `hsl(${tone.hueBase}, ${tone.hueSat - 20}%, 4%)` }}
    >
      <span
        className="text-[10px] uppercase tracking-[0.3em] font-medium"
        style={{ color: `hsla(${tone.hueBase}, 30%, 60%, 0.7)` }}
      >
        Restore Complete
      </span>

      <div className="mt-10 space-y-6 text-center">
        <div>
          <span className="block text-[10px] uppercase tracking-[0.2em] text-white/25">
            Breath Cycles Completed
          </span>
          <span className="block text-2xl font-light text-white/70 mt-1 tabular-nums">
            {cycleCount}
          </span>
        </div>
        <div>
          <span className="block text-[10px] uppercase tracking-[0.2em] text-white/25">
            Total Regulation Time
          </span>
          <span className="block text-2xl font-light text-white/70 mt-1 tabular-nums">
            {timeStr}
          </span>
        </div>
      </div>

      <button
        onClick={onBack}
        className="mt-14 text-[10px] uppercase tracking-[0.2em] text-white/30 hover:text-white/50 px-6 py-3"
      >
        Done
      </button>
    </div>
  );
}
