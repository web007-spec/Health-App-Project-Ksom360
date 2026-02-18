import { format } from "date-fns";
import { cn } from "@/lib/utils";

// Fasting stages with hour thresholds and icons
const FASTING_STAGES = [
  { hour: 0, label: "Anabolic", icon: "🔴", description: "Blood sugar rises" },
  { hour: 2, label: "Catabolic", icon: "🟠", description: "Insulin drops" },
  { hour: 4, label: "Post-Absorptive", icon: "🟡", description: "Blood sugar falls" },
  { hour: 8, label: "Gluconeogenesis", icon: "🟢", description: "Glucose from non-carbs" },
  { hour: 12, label: "Metabolic Shift", icon: "🔵", description: "Fat burning begins" },
  { hour: 14, label: "Partial Ketosis", icon: "🟣", description: "Ketone production" },
  { hour: 16, label: "Fat Burning", icon: "🔥", description: "Autophagy starts" },
  { hour: 18, label: "Growth Hormone", icon: "💪", description: "HGH increases" },
  { hour: 24, label: "Autophagy", icon: "♻️", description: "Cell renewal" },
  { hour: 36, label: "Renewal", icon: "✨", description: "Deep autophagy" },
  { hour: 48, label: "Immune Reset", icon: "🛡️", description: "Immune renewal" },
  { hour: 72, label: "Stem Cells", icon: "🧬", description: "Stem cell regeneration" },
];

interface FastingTimerProps {
  fastStartAt: string;
  targetHours: number;
  now: Date;
}

export function FastingTimer({ fastStartAt, targetHours, now }: FastingTimerProps) {
  const fastStart = new Date(fastStartAt);
  const fastEnd = new Date(fastStart.getTime() + targetHours * 3600000);
  const elapsed = now.getTime() - fastStart.getTime();
  const total = fastEnd.getTime() - fastStart.getTime();
  const progress = Math.min(Math.max(elapsed / total, 0), 1);
  const elapsedHours = elapsed / 3600000;
  const remainingMs = Math.max(fastEnd.getTime() - now.getTime(), 0);
  const remainH = Math.floor(remainingMs / 3600000);
  const remainM = Math.floor((remainingMs % 3600000) / 60000);
  const remainS = Math.floor((remainingMs % 60000) / 1000);
  const timeStr = `${String(remainH).padStart(2, "0")}:${String(remainM).padStart(2, "0")}:${String(remainS).padStart(2, "0")}`;
  const elapsedPct = Math.round(progress * 100);

  // Filter stages relevant to this fast duration
  const relevantStages = FASTING_STAGES.filter(s => s.hour <= targetHours + 2);

  // Current active stage
  const currentStage = [...FASTING_STAGES].reverse().find(s => elapsedHours >= s.hour) || FASTING_STAGES[0];

  // SVG dimensions
  const size = 280;
  const outerStroke = 12;
  const innerStroke = 8;
  const outerRadius = (size - outerStroke) / 2;
  const innerRadius = outerRadius - 18;
  const outerCircumference = 2 * Math.PI * outerRadius;
  const innerCircumference = 2 * Math.PI * innerRadius;
  const outerDashOffset = outerCircumference * (1 - progress);

  // Position a stage icon on the outer ring
  function getStagePosition(hour: number) {
    const fraction = Math.min(hour / targetHours, 1);
    const angle = fraction * 360 - 90; // start from top
    const rad = (angle * Math.PI) / 180;
    const cx = size / 2 + outerRadius * Math.cos(rad);
    const cy = size / 2 + outerRadius * Math.sin(rad);
    return { cx, cy };
  }

  // Indicator dot position (progress marker)
  const indicatorAngle = progress * 360 - 90;
  const indicatorRad = (indicatorAngle * Math.PI) / 180;
  const indicatorX = size / 2 + outerRadius * Math.cos(indicatorRad);
  const indicatorY = size / 2 + outerRadius * Math.sin(indicatorRad);

  return (
    <div className="flex flex-col items-center">
      {/* Timer Ring */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Outer track (dark) */}
          <circle
            cx={size / 2} cy={size / 2} r={outerRadius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={outerStroke}
            opacity={0.25}
          />
          {/* Inner track (subtle ring) */}
          <circle
            cx={size / 2} cy={size / 2} r={innerRadius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={innerStroke}
            opacity={0.12}
          />
          {/* Inner subtle fill — elapsed time as a faint glow */}
          <circle
            cx={size / 2} cy={size / 2} r={innerRadius}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={innerStroke}
            strokeLinecap="round"
            strokeDasharray={innerCircumference}
            strokeDashoffset={innerCircumference * (1 - progress)}
            opacity={0.15}
            className="transition-[stroke-dashoffset] duration-1000 ease-linear"
          />
          {/* Outer progress arc */}
          <circle
            cx={size / 2} cy={size / 2} r={outerRadius}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={outerStroke}
            strokeLinecap="round"
            strokeDasharray={outerCircumference}
            strokeDashoffset={outerDashOffset}
            className="transition-[stroke-dashoffset] duration-1000 ease-linear"
            style={{
              filter: "drop-shadow(0 0 6px hsl(var(--primary) / 0.5))",
            }}
          />
          {/* Progress indicator dot */}
          {progress > 0.005 && (
            <circle
              cx={indicatorX} cy={indicatorY} r={7}
              fill="hsl(var(--primary))"
              stroke="hsl(var(--background))"
              strokeWidth={2}
              style={{
                filter: "drop-shadow(0 0 4px hsl(var(--primary) / 0.6))",
              }}
            />
          )}
        </svg>

        {/* Stage milestone icons positioned around the ring */}
        {relevantStages.map((stage) => {
          const pos = getStagePosition(stage.hour);
          const isReached = elapsedHours >= stage.hour;
          const isCurrent = currentStage.hour === stage.hour;
          return (
            <div
              key={stage.hour}
              className={cn(
                "absolute flex items-center justify-center rounded-full text-xs transition-all duration-500",
                isCurrent
                  ? "w-8 h-8 -ml-4 -mt-4 bg-primary/20 ring-2 ring-primary/40 scale-110 z-10"
                  : isReached
                    ? "w-7 h-7 -ml-3.5 -mt-3.5 bg-card/90 ring-1 ring-primary/30"
                    : "w-6 h-6 -ml-3 -mt-3 bg-muted/60 opacity-40"
              )}
              style={{
                left: pos.cx,
                top: pos.cy,
              }}
              title={`${stage.label} (${stage.hour}h) – ${stage.description}`}
            >
              <span className={cn("text-[11px]", !isReached && "grayscale")}>{stage.icon}</span>
            </div>
          );
        })}

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl mb-0.5">{currentStage.icon}</span>
          <span className="text-[11px] font-medium text-primary tracking-wide uppercase">{currentStage.label}</span>
          <span className="text-4xl font-bold tabular-nums tracking-tight mt-1">{timeStr}</span>
          <span className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">
            Elapsed ({elapsedPct}%)
          </span>
        </div>
      </div>

      {/* Start / Goal timestamps */}
      <div className="w-full grid grid-cols-2 gap-3 mt-5">
        <div className="bg-muted/40 rounded-lg px-3 py-2.5 text-center">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Started</p>
          <p className="text-xs font-medium">{format(fastStart, "EEE, h:mm a")}</p>
        </div>
        <div className="bg-muted/40 rounded-lg px-3 py-2.5 text-center">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">{targetHours}h Goal</p>
          <p className="text-xs font-medium">{format(fastEnd, "EEE, h:mm a")}</p>
        </div>
      </div>

      {/* Current stage description */}
      <p className="text-xs text-muted-foreground mt-3 text-center">
        {currentStage.description}
        {remainingMs <= 0 && " — Fast complete! 🎉"}
      </p>
    </div>
  );
}
