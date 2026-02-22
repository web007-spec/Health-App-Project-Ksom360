import { useState, useMemo, useEffect } from "react";
import { StaggeredTileGrid } from "./StaggeredTileGrid";
import { cn } from "@/lib/utils";
import { BRAINWAVE_DEFS, BrainwaveType } from "@/lib/syntheticSounds";
import { Check } from "lucide-react";

const MODES = [
  { label: "Morning", value: "morning" },
  { label: "Focus", value: "focus" },
  { label: "Night", value: "night" },
] as const;

type Mode = (typeof MODES)[number]["value"];

const CATEGORIES = [
  { label: "Featured", value: "featured" },
  { label: "Nature", value: "nature" },
  { label: "Noise", value: "colored-noise" },
  { label: "Music", value: "musical" },
  { label: "Brainwaves", value: "brainwaves" },
];

const MODE_SORT_TAGS: Record<Mode, string[]> = {
  morning: ["nature", "musical"],
  focus: ["brainwaves", "colored-noise"],
  night: ["nature", "brainwaves"],
};

const MODE_RECOMMENDED_BW: Record<Mode, BrainwaveType> = {
  morning: "beta",
  focus: "alpha",
  night: "theta",
};

const STORAGE_KEY = "vibes-mode";

function loadMode(): Mode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && MODES.some((m) => m.value === v)) return v as Mode;
  } catch {}
  return "focus";
}

interface Props {
  sounds: any[];
  mixer: any;
}

export function VibesHomeTab({ sounds, mixer }: Props) {
  const [mode, setMode] = useState<Mode>(loadMode);
  const [activeCategory, setActiveCategory] = useState("featured");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const modeHeader: Record<Mode, { title: string; sub: string }> = {
    morning: { title: "🌅 Good Morning", sub: "Start your day with uplifting sounds" },
    focus: { title: "🎯 Focus Session", sub: "Lock in with deep concentration" },
    night: { title: "🌙 Wind Down", sub: "Ease into restful calm" },
  };

  const { title: timeLabel, sub: modeSub } = modeHeader[mode];

  const filtered = useMemo(() => {
    if (activeCategory === "brainwaves") return []; // handled separately
    let list: any[];
    if (activeCategory === "featured") {
      list = sounds.filter((s) => s.is_featured);
      const preferred = MODE_SORT_TAGS[mode];
      list.sort((a, b) => {
        const aScore = (a.tags || []).some((t: string) => preferred.includes(t)) ? 0 : 1;
        const bScore = (b.tags || []).some((t: string) => preferred.includes(t)) ? 0 : 1;
        return aScore - bScore;
      });
    } else {
      list = sounds.filter((s) => (s.tags || []).includes(activeCategory));
    }
    return list;
  }, [sounds, activeCategory, mode]);

  const activeLayers = (mixer.mixItems?.length || 0) + (mixer.brainwave ? 1 : 0);

  const handleToggle = (s: any) =>
    mixer.toggleSound({ id: s.id, name: s.name, audioUrl: s.audio_url, iconUrl: s.icon_url });

  const modeBg: Record<Mode, string> = {
    morning: "bg-[hsl(30,30%,6%)]",
    focus: "",
    night: "bg-[hsl(240,20%,5%)]",
  };

  const recommended = MODE_RECOMMENDED_BW[mode];
  const activeBw = mixer.brainwave?.type as BrainwaveType | undefined;

  return (
    <div className={cn("space-y-4 mt-4 rounded-xl px-1 transition-colors duration-300", modeBg[mode])}>
      <div>
        <p className="text-lg font-semibold mb-1">{timeLabel}</p>
        <p className="text-sm text-muted-foreground">
          {activeLayers > 0
            ? `${activeLayers} sound${activeLayers !== 1 ? "s" : ""} in your mix`
            : modeSub}
        </p>
      </div>

      {/* Mode segmented control */}
      <div className="flex rounded-full bg-muted/60 p-1 gap-0.5">
        {MODES.map((m) => (
          <button
            key={m.value}
            onClick={() => setMode(m.value)}
            className={cn(
              "flex-1 text-xs font-medium py-1.5 rounded-full transition-all duration-[180ms]",
              mode === m.value
                ? "bg-[hsl(260,45%,38%)] text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all duration-200 border",
              activeCategory === cat.value
                ? "bg-[hsl(260,45%,38%)] text-white/90 border-[hsl(260,40%,50%)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)]"
                : "bg-transparent text-muted-foreground border-border hover:border-[hsl(260,30%,45%)] hover:text-foreground"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="animate-fade-in" key={`${mode}-${activeCategory}`}>
        {activeCategory === "brainwaves" ? (
          <div className="grid grid-cols-2 gap-3 px-2">
            {(Object.entries(BRAINWAVE_DEFS) as [BrainwaveType, typeof BRAINWAVE_DEFS[BrainwaveType]][]).map(([type, def]) => {
              const isActive = activeBw === type;
              const isRecommended = recommended === type;
              return (
                <button
                  key={type}
                  onClick={() => isActive ? mixer.removeBrainwave() : mixer.setBrainwave(type)}
                  className={cn(
                    "relative flex flex-col items-center gap-2 py-5 px-3 rounded-2xl transition-all duration-[180ms] border",
                    "bg-gradient-to-br from-[hsl(260,25%,16%)] to-[hsl(260,20%,12%)]",
                    "active:scale-[0.97]",
                    isActive
                      ? "ring-[1.5px] ring-amber-400/70 border-amber-400/30 shadow-[0_0_14px_rgba(251,191,36,0.2)]"
                      : isRecommended
                        ? "border-[hsl(260,40%,40%)] shadow-[0_0_8px_rgba(139,92,246,0.15)]"
                        : "border-border/50"
                  )}
                >
                  {isRecommended && !isActive && (
                    <span className="absolute top-2 right-2 text-[9px] font-semibold uppercase tracking-wider text-[hsl(260,60%,70%)]">
                      Rec
                    </span>
                  )}
                  <span className="text-2xl">{def.icon}</span>
                  <span className="text-sm font-semibold text-white/90">{def.label}</span>
                  <span className="text-[10px] text-muted-foreground">{def.description}</span>
                  {isActive && (
                    <div className="absolute bottom-2 right-2 w-[14px] h-[14px] rounded-full bg-amber-400/90 flex items-center justify-center shadow-[0_0_6px_rgba(251,191,36,0.5)]">
                      <Check className="w-[8px] h-[8px] text-amber-950 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ) : filtered.length > 0 ? (
          <StaggeredTileGrid
            sounds={filtered}
            isActiveCheck={(id) => mixer.isSoundActive(id)}
            onToggle={handleToggle}
          />
        ) : (
          <p className="text-center text-muted-foreground py-8 text-sm">No sounds in this category yet</p>
        )}
      </div>
    </div>
  );
}
