import { useState, useMemo } from "react";
import { StaggeredTileGrid } from "./StaggeredTileGrid";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { label: "Featured", value: "featured" },
  { label: "Nature", value: "nature" },
  { label: "Noise", value: "colored-noise" },
  { label: "Music", value: "musical" },
  { label: "Brainwaves", value: "brainwaves" },
];

interface Props {
  sounds: any[];
  mixer: any;
}

export function VibesHomeTab({ sounds, mixer }: Props) {
  const [activeCategory, setActiveCategory] = useState("featured");

  const hour = new Date().getHours();
  const timeLabel = hour < 12 ? "🌅 Good Morning" : hour < 17 ? "☀️ Good Afternoon" : "🌙 Good Evening";

  const filtered = useMemo(() => {
    if (activeCategory === "featured") return sounds.filter((s) => s.is_featured);
    return sounds.filter((s) => (s.tags || []).includes(activeCategory));
  }, [sounds, activeCategory]);

  const activeLayers = mixer.mixItems?.length || 0;

  const handleToggle = (s: any) =>
    mixer.toggleSound({ id: s.id, name: s.name, audioUrl: s.audio_url, iconUrl: s.icon_url });

  return (
    <div className="space-y-4 mt-4">
      <div>
        <p className="text-lg font-semibold mb-1">{timeLabel}</p>
        <p className="text-sm text-muted-foreground">
          {activeLayers > 0
            ? `${activeLayers} sound${activeLayers !== 1 ? "s" : ""} in your mix`
            : "Pick sounds to build your perfect mix"}
        </p>
      </div>

      {/* Category chips — purple accent */}
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

      {/* Filtered grid with fade transition */}
      <div className="animate-fade-in" key={activeCategory}>
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
