import { memo } from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { useTransparentIcon } from "@/hooks/useTransparentIcon";
import woodBg from "@/assets/wood-tile-bg.jpg";

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
  const transparentIcon = useTransparentIcon(iconUrl);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        onClick={onToggle}
        className={cn(
          "group relative flex flex-col items-center justify-center rounded-[16px] aspect-square w-full transition-all duration-[180ms] select-none overflow-hidden",
          "shadow-[0_2px_8px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.08)]",
          "hover:translate-y-[-2px] hover:shadow-[0_6px_16px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.1)]",
          "active:scale-[0.97] active:translate-y-0",
          isActive && [
            "ring-[2px] ring-amber-400/80",
            "shadow-[0_0_18px_rgba(251,191,36,0.35),0_2px_8px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.08)]",
            "animate-vibes-sway origin-top",
          ],
        )}
        style={{ minHeight: 44, minWidth: 44 }}
      >
        {/* Real wood texture background */}
        <div
          className="absolute inset-0 rounded-[16px]"
          style={{
            backgroundImage: `url(${woodBg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />

        {/* Warm vignette overlay for depth */}
        <div
          className="absolute inset-0 rounded-[16px] pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 80% 80% at 50% 40%, rgba(180,130,60,0.15) 0%, rgba(0,0,0,0.4) 100%)",
          }}
        />

        {/* Subtle inner bevel for 3D edge */}
        <div
          className="absolute inset-0 rounded-[16px] pointer-events-none"
          style={{
            boxShadow: "inset 0 2px 4px rgba(255,255,255,0.12), inset 0 -3px 6px rgba(0,0,0,0.35), inset 2px 0 4px rgba(0,0,0,0.15), inset -2px 0 4px rgba(0,0,0,0.15)",
          }}
        />

        {/* Nail hole */}
        <div
          className="absolute top-[6px] left-1/2 -translate-x-1/2 w-[5px] h-[5px] rounded-full z-[2]"
          style={{
            background: "rgba(30,20,10,0.7)",
            boxShadow: "inset 0 1px 2px rgba(0,0,0,0.9), inset 0 -0.5px 0.5px rgba(255,255,255,0.1), 0 0.5px 1px rgba(0,0,0,0.5)",
            border: "0.5px solid rgba(0,0,0,0.4)",
          }}
        />

        {/* Icon — deep carved/engraved into wood */}
        <div className="relative z-[1] flex items-center justify-center w-12 h-12">
          {transparentIcon ? (
            <div className="relative w-10 h-10">
              {/* Deep carved shadow — offset for 3D depth */}
              <img
                src={transparentIcon}
                alt=""
                className="absolute inset-0 w-10 h-10 object-contain opacity-60"
                style={{
                  filter: "brightness(0) blur(1.2px)",
                  transform: "translate(1.5px, 2px)",
                }}
                aria-hidden
              />
              {/* Inner groove shadow */}
              <img
                src={transparentIcon}
                alt=""
                className="absolute inset-0 w-10 h-10 object-contain opacity-50"
                style={{
                  filter: "brightness(0) blur(0.4px)",
                  transform: "translate(0.5px, 0.8px)",
                }}
                aria-hidden
              />
              {/* Main icon — very dark for deep engrave */}
              <img
                src={transparentIcon}
                alt={name}
                className="relative w-10 h-10 object-contain"
                style={{
                  filter: "brightness(0.1) sepia(0.3) saturate(0.2) contrast(1.5)",
                  opacity: 0.9,
                }}
              />
              {/* Top-left light catch — chiseled edge highlight */}
              <img
                src={transparentIcon}
                alt=""
                className="absolute inset-0 w-10 h-10 object-contain opacity-25"
                style={{
                  filter: "brightness(3) contrast(0.3) blur(0.4px)",
                  transform: "translate(-0.8px, -1px)",
                  mixBlendMode: "overlay",
                }}
                aria-hidden
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg bg-black/20 flex items-center justify-center text-lg text-white/40">🎵</div>
          )}
        </div>

        {/* Active check */}
        {isActive && (
          <div className="absolute bottom-[4px] left-1/2 -translate-x-1/2 z-[2]">
            <div className="w-[14px] h-[14px] rounded-full bg-amber-400/90 flex items-center justify-center shadow-[0_0_8px_rgba(251,191,36,0.6)]">
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
