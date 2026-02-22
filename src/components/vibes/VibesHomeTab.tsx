import { useState, useMemo, useEffect } from "react";
import { StaggeredTileGrid } from "./StaggeredTileGrid";
import { cn } from "@/lib/utils";

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

// Featured sort weight per mode — placeholder for future tuning
const MODE_SORT_TAGS: Record<Mode, string[]> = {
  morning: ["nature", "musical"],
  focus: ["brainwaves", "colored-noise"],
  night: ["nature", "brainwaves"],
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
    let list: any[];
    if (activeCategory === "featured") {
      list = sounds.filter((s) => s.is_featured);
      // Sort featured by mode-relevant tags first
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

  const activeLayers = mixer.mixItems?.length || 0;

  const handleToggle = (s: any) =>
    mixer.toggleSound({ id: s.id, name: s.name, audioUrl: s.audio_url, iconUrl: s.icon_url });

  const modeBg: Record<Mode, string> = {
    morning: "bg-[hsl(30,30%,6%)]",
    focus: "",
    night: "bg-[hsl(240,20%,5%)]",
  };

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

      {/* Filtered grid */}
      <div className="animate-fade-in" key={`${mode}-${activeCategory}`}>
        {filtered.length > 0 ? (
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
