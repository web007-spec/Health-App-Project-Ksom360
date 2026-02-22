import { memo, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface Props {
  name: string;
  iconUrl?: string;
  isActive: boolean;
  onToggle: () => void;
}

export const VibesTile = memo(function VibesTile({
  name,
  iconUrl,
  isActive,
  onToggle,
}: Props) {
  const [pulse, setPulse] = useState(false);

  const handleTap = useCallback(() => {
    setPulse(true);
    setTimeout(() => setPulse(false), 250);
    onToggle();
  }, [onToggle]);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        onClick={handleTap}
        className={cn(
          "group relative flex flex-col items-center justify-center rounded-[14px] aspect-square w-full transition-all duration-200 select-none",
          "bg-gradient-to-br from-[hsl(30,32%,42%)] via-[hsl(28,28%,36%)] to-[hsl(24,24%,28%)]",
          "shadow-[inset_0_2px_3px_rgba(255,255,255,0.1),inset_0_-2px_4px_rgba(0,0,0,0.25),0_1px_4px_rgba(0,0,0,0.25)]",
          "hover:translate-y-[-2px] hover:shadow-[inset_0_2px_3px_rgba(255,255,255,0.12),inset_0_-2px_4px_rgba(0,0,0,0.25),0_4px_12px_rgba(0,0,0,0.35)]",
          "active:scale-[0.96] active:translate-y-0",
          isActive && [
            "ring-[1.5px] ring-amber-400/70",
            "shadow-[inset_0_2px_3px_rgba(255,255,255,0.1),inset_0_-2px_4px_rgba(0,0,0,0.25),0_0_14px_rgba(251,191,36,0.3),0_0_4px_rgba(251,191,36,0.15)]",
          ],
          pulse && "animate-[vibes-pulse_250ms_ease-out]"
        )}
        style={{ minHeight: 44, minWidth: 44 }}
      >
        {/* Nail dot */}
        <div
          className="absolute top-[5px] left-1/2 -translate-x-1/2 w-[4px] h-[4px] rounded-full"
          style={{
            background: "radial-gradient(circle at 40% 35%, hsl(40,18%,65%), hsl(30,12%,32%))",
            boxShadow: "inset 0 0.5px 0.5px rgba(255,255,255,0.35), 0 0.5px 1px rgba(0,0,0,0.5)",
          }}
        />

        {/* Wood grain overlay */}
        <div
          className="absolute inset-0 rounded-[14px] pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage: `repeating-linear-gradient(82deg, transparent, transparent 7px, rgba(255,255,255,0.12) 7px, rgba(255,255,255,0.12) 8px)`,
          }}
        />

        {/* Icon */}
        <div className="relative z-[1] flex items-center justify-center w-12 h-12">
          {iconUrl ? (
            <img src={iconUrl} alt={name} className="w-10 h-10 object-contain drop-shadow-sm" loading="lazy" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-white/[0.07] flex items-center justify-center text-lg text-white/50">🎵</div>
          )}
        </div>

        {/* Active check */}
        {isActive && (
          <div className="absolute bottom-[4px] left-1/2 -translate-x-1/2">
            <div className="w-[14px] h-[14px] rounded-full bg-amber-400/90 flex items-center justify-center shadow-[0_0_6px_rgba(251,191,36,0.5)]">
              <Check className="w-[8px] h-[8px] text-amber-950 stroke-[3]" />
            </div>
          </div>
        )}
      </button>

      {/* Name below tile */}
      <span className="text-[11px] leading-tight font-medium text-muted-foreground text-center line-clamp-2 w-full">
        {name}
      </span>
    </div>
  );
});
