import { useState } from "react";
import { VibesTile } from "./VibesTile";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

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
}

export function VibesSoundsTab({ sounds, categories, mixer }: Props) {
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

  const filtered = sounds.filter((s) => {
    if (activeCategory === "all") return true;
    if (activeCategory === "favorites") return favorites.includes(s.id);
    return (s.tags || []).includes(activeCategory);
  });

  const activeLayers = mixer.mixItems.length;

  return (
    <div className="space-y-4 mt-4">
      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all duration-200",
              "border",
              activeCategory === cat.value
                ? "bg-gradient-to-r from-[hsl(30,35%,42%)] to-[hsl(25,30%,35%)] text-white/90 border-[hsl(30,25%,50%)] shadow-sm"
                : "bg-transparent text-muted-foreground border-border hover:border-[hsl(30,20%,40%)] hover:text-foreground"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Active layers indicator */}
      {activeLayers > 0 && (
        <div className="flex items-center gap-2 px-1">
          <div className="flex gap-0.5">
            {Array.from({ length: Math.min(activeLayers, 8) }).map((_, i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.5)]"
              />
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground font-medium">
            {activeLayers} active layer{activeLayers !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Sound grid — 4 columns on mobile for tighter wooden-tile feel */}
      <div className="grid grid-cols-4 gap-2.5">
        {filtered.map((s) => (
          <VibesTile
            key={s.id}
            name={s.name}
            iconUrl={s.icon_url}
            isActive={mixer.isSoundActive(s.id)}
            isFavorite={favorites.includes(s.id)}
            onToggle={() => mixer.toggleSound({ id: s.id, name: s.name, audioUrl: s.audio_url, iconUrl: s.icon_url })}
            onFavorite={() => toggleFav.mutate(s.id)}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-8">No sounds match this filter</p>
      )}
    </div>
  );
}
