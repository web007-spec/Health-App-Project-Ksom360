import { cn } from "@/lib/utils";
import { Heart } from "lucide-react";

interface Props {
  name: string;
  iconUrl?: string;
  isActive: boolean;
  isFavorite?: boolean;
  onToggle: () => void;
  onFavorite?: () => void;
}

export function VibesTile({ name, iconUrl, isActive, isFavorite, onToggle, onFavorite }: Props) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "relative flex flex-col items-center justify-center gap-1.5 rounded-[16px] aspect-square transition-all duration-300",
        // Wood texture gradient
        "bg-gradient-to-br from-[hsl(30,35%,45%)] via-[hsl(28,30%,38%)] to-[hsl(25,28%,30%)]",
        // Inset shadow for carved depth
        "shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),inset_0_-1px_2px_rgba(0,0,0,0.2),0_2px_6px_rgba(0,0,0,0.3)]",
        "hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),inset_0_-1px_2px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.4)]",
        "active:scale-[0.96]",
        // Active glow
        isActive && "ring-2 ring-amber-400/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_0_18px_rgba(251,191,36,0.35),0_0_6px_rgba(251,191,36,0.2)]"
      )}
    >
      {/* Nail dot at top center */}
      <div className="absolute top-[6px] left-1/2 -translate-x-1/2 w-[5px] h-[5px] rounded-full bg-gradient-to-br from-[hsl(40,15%,60%)] to-[hsl(30,10%,35%)] shadow-[inset_0_0.5px_0.5px_rgba(255,255,255,0.3),0_0.5px_1px_rgba(0,0,0,0.4)]" />

      {/* Wood grain overlay */}
      <div className="absolute inset-0 rounded-[16px] opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(
            85deg,
            transparent,
            transparent 8px,
            rgba(255,255,255,0.08) 8px,
            rgba(255,255,255,0.08) 9px
          )`,
        }}
      />

      {/* Favorite button */}
      {onFavorite && (
        <span
          role="button"
          onClick={(e) => { e.stopPropagation(); onFavorite(); }}
          className="absolute top-1.5 right-1.5 z-10"
        >
          <Heart className={cn("h-3.5 w-3.5 transition-colors", isFavorite ? "fill-red-400 text-red-400" : "text-white/25 hover:text-white/50")} />
        </span>
      )}

      {/* Icon */}
      <div className="h-9 w-9 flex items-center justify-center relative z-[1]">
        {iconUrl ? (
          <img src={iconUrl} alt={name} className="h-9 w-9 object-contain drop-shadow-sm" />
        ) : (
          <div className={cn(
            "h-9 w-9 rounded-lg flex items-center justify-center text-base",
            "bg-white/[0.08] text-white/60"
          )}>
            🎵
          </div>
        )}
      </div>

      {/* Name */}
      <span className="text-[10px] text-white/75 font-medium text-center leading-tight line-clamp-2 px-1 relative z-[1]">
        {name}
      </span>

      {/* Active indicator dot */}
      {isActive && (
        <div className="absolute bottom-[5px] left-1/2 -translate-x-1/2 w-[4px] h-[4px] rounded-full bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.6)]" />
      )}
    </button>
  );
}
