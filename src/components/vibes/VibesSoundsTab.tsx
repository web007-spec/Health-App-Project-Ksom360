import { useState, useCallback, memo, useMemo } from "react";
import { VibesTile } from "./VibesTile";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORIES = [
  { label: "All", value: "all" },
  { label: "My ❤️", value: "favorites" },
  { label: "Nature", value: "nature" },
  { label: "ASMR", value: "asmr" },
  { label: "Colored Noise", value: "colored-noise" },
  { label: "Brainwaves", value: "brainwaves" },
  { label: "Music Layers", value: "musical" },
  { label: "Sleep", value: "sleep" },
];

interface Props {
  sounds: any[];
  categories: any[];
  mixer: any;
  isLoading?: boolean;
}

/** Memoized tile list — only re-renders when sounds/active set/favorites change, NOT on slider moves */
const TileGrid = memo(function TileGrid({
  sounds,
  activeSoundIds,
  onToggle,
}: {
  sounds: any[];
  activeSoundIds: Set<string>;
  onToggle: (s: any) => void;
}) {
  return (
    <div className="flex flex-wrap gap-x-2 gap-y-3 justify-start">
      {sounds.map((s, index) => {
        const cols = 4;
        const row = Math.floor(index / cols);
        const isOddRow = row % 2 === 1;
        return (
          <div
            key={s.id}
            className="flex-shrink-0"
            style={{
              width: "calc(25% - 6px)",
              marginLeft: isOddRow && (index % cols === 0) ? "calc(12.5% - 3px)" : undefined,
            }}
          >
            <VibesTile
              name={s.name}
              iconUrl={s.icon_url}
              isActive={activeSoundIds.has(s.id)}
              onToggle={() => onToggle(s)}
            />
          </div>
        );
      })}
    </div>
  );
});

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2.5">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="aspect-square rounded-[14px] bg-muted/40" />
      ))}
    </div>
  );
}

export function VibesSoundsTab({ sounds, categories, mixer, isLoading }: Props) {
  const [activeCategory, setActiveCategory] = useState("all");
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: favorites = [] } = useQuery({
    queryKey: ["vibes-favorites", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("vibes_favorites").select("sound_id").eq("user_id", user.id);
      return (data || []).map((f: any) => f.sound_id);
    },
    enabled: !!user,
  });

  const toggleFav = useMutation({
    mutationFn: async (soundId: string) => {
      if (!user) return;
      if (favorites.includes(soundId)) {
        await supabase.from("vibes_favorites").delete().eq("user_id", user.id).eq("sound_id", soundId);
      } else {
        await supabase.from("vibes_favorites").insert({ user_id: user.id, sound_id: soundId });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vibes-favorites"] }),
  });

  const filtered = useMemo(() =>
    sounds.filter((s) => {
      if (activeCategory === "all") return true;
      if (activeCategory === "favorites") return favorites.includes(s.id);
      return (s.tags || []).includes(activeCategory);
    }),
    [sounds, activeCategory, favorites]
  );

  // Stable set of active IDs — prevents grid re-render on slider/volume changes
  const activeSoundIds = useMemo(
    () => new Set<string>(mixer.mixItems.map((item: any) => item.soundId as string)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mixer.mixItems.length, mixer.mixItems.map((i: any) => i.soundId).join(",")]
  );

  const handleToggle = useCallback(
    (s: any) => mixer.toggleSound({ id: s.id, name: s.name, audioUrl: s.audio_url, iconUrl: s.icon_url }),
    [mixer.toggleSound]
  );

  const handleFavorite = useCallback(
    (id: string) => toggleFav.mutate(id),
    [toggleFav]
  );

  const activeLayers = mixer.mixItems.length;

  return (
    <div className="space-y-3 mt-4">
      {/* Category pills — horizontal scroll */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all duration-200 border",
              activeCategory === cat.value
                ? "bg-gradient-to-r from-[hsl(30,32%,40%)] to-[hsl(24,26%,32%)] text-white/90 border-[hsl(30,22%,48%)] shadow-sm"
                : "bg-transparent text-muted-foreground border-border hover:border-[hsl(30,18%,38%)] hover:text-foreground"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Active layers indicator */}
      {activeLayers > 0 && (
        <div className="flex items-center gap-2 px-0.5">
          <div className="flex gap-[3px]">
            {Array.from({ length: Math.min(activeLayers, 8) }).map((_, i) => (
              <div
                key={i}
                className="w-[5px] h-[5px] rounded-full bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.5)]"
              />
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground font-medium">
            {activeLayers} active layer{activeLayers !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Tile grid — memoized */}
      {isLoading ? (
        <SkeletonGrid />
      ) : filtered.length > 0 ? (
        <TileGrid
          sounds={filtered}
          activeSoundIds={activeSoundIds}
          onToggle={handleToggle}
        />
      ) : (
        <p className="text-center text-muted-foreground py-8 text-sm">No sounds match this filter</p>
      )}
    </div>
  );
}
