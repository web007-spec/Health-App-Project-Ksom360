import { useState } from "react";
import { VibesTile } from "./VibesTile";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const CHIP_FILTERS = ["All", "My ❤️", "Nature", "ASMR", "Colored Noise", "Brainwaves", "Musical", "Sleep"];

interface Props {
  sounds: any[];
  categories: any[];
  mixer: any;
}

export function VibesSoundsTab({ sounds, categories, mixer }: Props) {
  const [activeChip, setActiveChip] = useState("All");
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

  const tagMap: Record<string, string> = {
    "Nature": "nature",
    "ASMR": "asmr",
    "Colored Noise": "colored-noise",
    "Brainwaves": "brainwaves",
    "Musical": "musical",
    "Sleep": "sleep",
  };

  const filtered = sounds.filter((s) => {
    if (activeChip === "All") return true;
    if (activeChip === "My ❤️") return favorites.includes(s.id);
    const tag = tagMap[activeChip];
    return tag && (s.tags || []).includes(tag);
  });

  return (
    <div className="space-y-4 mt-4">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
        {CHIP_FILTERS.map((chip) => (
          <Badge
            key={chip}
            variant={activeChip === chip ? "default" : "outline"}
            className="cursor-pointer whitespace-nowrap shrink-0"
            onClick={() => setActiveChip(chip)}
          >
            {chip}
          </Badge>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
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
