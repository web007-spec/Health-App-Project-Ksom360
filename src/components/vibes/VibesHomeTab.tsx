import { VibesTile } from "./VibesTile";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  sounds: any[];
  mixer: any;
}

export function VibesHomeTab({ sounds, mixer }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const featured = sounds.filter((s) => s.is_featured);

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

  const hour = new Date().getHours();
  const timeLabel = hour < 12 ? "🌅 Good Morning" : hour < 17 ? "☀️ Good Afternoon" : "🌙 Good Evening";

  return (
    <div className="space-y-6 mt-4">
      <div>
        <p className="text-lg font-semibold mb-1">{timeLabel}</p>
        <p className="text-sm text-muted-foreground">Pick sounds to build your perfect mix</p>
      </div>

      {featured.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Featured</h3>
          <div className="grid grid-cols-4 gap-2.5">
            {featured.map((s) => (
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
        </div>
      )}

      {sounds.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">All Sounds</h3>
          <div className="grid grid-cols-4 gap-2.5">
            {sounds.map((s) => (
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
        </div>
      )}
    </div>
  );
}
