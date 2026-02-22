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
        "relative flex flex-col items-center justify-center gap-2 p-4 rounded-[18px] aspect-square transition-all duration-200",
        "bg-gradient-to-br from-[hsl(30,30%,25%)] via-[hsl(25,25%,20%)] to-[hsl(20,20%,15%)]",
        "shadow-md hover:shadow-lg active:scale-95",
        isActive && "ring-2 ring-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]"
      )}
    >
      {onFavorite && (
        <button
          onClick={(e) => { e.stopPropagation(); onFavorite(); }}
          className="absolute top-2 right-2 z-10"
        >
          <Heart className={cn("h-4 w-4", isFavorite ? "fill-red-500 text-red-500" : "text-white/40")} />
        </button>
      )}
      <div className="h-10 w-10 flex items-center justify-center">
        {iconUrl ? (
          <img src={iconUrl} alt={name} className="h-10 w-10 object-contain rounded" />
        ) : (
          <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center text-lg">
            🎵
          </div>
        )}
      </div>
      <span className="text-xs text-white/80 font-medium text-center leading-tight line-clamp-2">
        {name}
      </span>
    </button>
  );
}
