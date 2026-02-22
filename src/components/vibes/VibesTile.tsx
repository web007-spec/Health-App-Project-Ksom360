import { memo, useState, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface Props {
  name: string;
  iconUrl?: string;
  isActive: boolean;
  onToggle: () => void;
}

/** Strips white/light backgrounds from an image, returning a data URL with transparency */
function useTransparentIcon(src?: string) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!src) { setDataUrl(null); return; }
    if (cacheRef.current.has(src)) { setDataUrl(cacheRef.current.get(src)!); return; }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imageData.data;
      // Make near-white pixels transparent
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2];
        const brightness = (r + g + b) / 3;
        if (brightness > 220) {
          d[i + 3] = 0; // fully transparent
        } else if (brightness > 200) {
          d[i + 3] = Math.round((220 - brightness) / 20 * 255); // fade out
        }
      }
      ctx.putImageData(imageData, 0, 0);
      const url = canvas.toDataURL("image/png");
      cacheRef.current.set(src, url);
      setDataUrl(url);
    };
    img.onerror = () => setDataUrl(src); // fallback to original
    img.src = src;
  }, [src]);

  return dataUrl;
}

export const VibesTile = memo(function VibesTile({
  name,
  iconUrl,
  isActive,
  onToggle,
}: Props) {
  const [pulse, setPulse] = useState(false);
  const transparentIcon = useTransparentIcon(iconUrl);

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
          "group relative flex flex-col items-center justify-center rounded-[14px] aspect-square w-full transition-all duration-[180ms] select-none",
          "bg-gradient-to-br from-[hsl(30,32%,42%)] via-[hsl(28,28%,36%)] to-[hsl(24,24%,28%)]",
          "shadow-[inset_0_2px_3px_rgba(255,255,255,0.1),inset_0_-2px_4px_rgba(0,0,0,0.25),0_1px_4px_rgba(0,0,0,0.25)]",
          "hover:translate-y-[-2px] hover:shadow-[inset_0_2px_3px_rgba(255,255,255,0.12),inset_0_-2px_4px_rgba(0,0,0,0.25),0_4px_12px_rgba(0,0,0,0.35)]",
          "active:scale-[0.97] active:translate-y-0",
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

        {/* Deep wood grain overlay — layered for realistic carved look */}
        <div
          className="absolute inset-0 rounded-[14px] pointer-events-none"
          style={{
            backgroundImage: [
              `repeating-linear-gradient(78deg, transparent, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px)`,
              `repeating-linear-gradient(82deg, transparent, transparent 6px, rgba(255,255,255,0.05) 6px, rgba(255,255,255,0.05) 7px)`,
              `repeating-linear-gradient(85deg, transparent, transparent 11px, rgba(0,0,0,0.06) 11px, rgba(0,0,0,0.06) 12.5px)`,
              `repeating-linear-gradient(74deg, transparent, transparent 18px, rgba(255,255,255,0.03) 18px, rgba(255,255,255,0.03) 20px)`,
              `repeating-linear-gradient(80deg, transparent, transparent 25px, rgba(0,0,0,0.04) 25px, rgba(0,0,0,0.04) 27px)`,
            ].join(", "),
          }}
        />
        {/* Knot / swirl accent */}
        <div
          className="absolute inset-0 rounded-[14px] pointer-events-none opacity-[0.06]"
          style={{
            backgroundImage: `radial-gradient(ellipse 40% 30% at 70% 60%, rgba(0,0,0,0.3), transparent),
                              radial-gradient(ellipse 25% 20% at 25% 35%, rgba(0,0,0,0.2), transparent)`,
          }}
        />

        {/* Icon — carved/engraved into wood effect */}
        <div className="relative z-[1] flex items-center justify-center w-12 h-12">
          {transparentIcon ? (
            <div className="relative w-10 h-10">
              {/* Shadow layer — carving depth */}
              <img
                src={transparentIcon}
                alt=""
                className="absolute inset-0 w-10 h-10 object-contain opacity-35"
                style={{
                  filter: "brightness(0) blur(0.5px)",
                  transform: "translate(0.5px, 1px)",
                }}
                aria-hidden
              />
              {/* Main icon — darkened to look carved into wood */}
              <img
                src={transparentIcon}
                alt={name}
                className="relative w-10 h-10 object-contain"
                style={{
                  filter: "brightness(0.3) sepia(0.3) saturate(0.4)",
                  opacity: 0.75,
                }}
              />
              {/* Highlight edge */}
              <img
                src={transparentIcon}
                alt=""
                className="absolute inset-0 w-10 h-10 object-contain opacity-20"
                style={{
                  filter: "brightness(1.8) contrast(0.5) blur(0.3px)",
                  transform: "translate(-0.3px, -0.5px)",
                  mixBlendMode: "overlay",
                }}
                aria-hidden
              />
            </div>
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
