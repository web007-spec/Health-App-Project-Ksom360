import { VibesTile } from "./VibesTile";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  sounds: any[];
  mixer: any;
}

export function VibesSleepTab({ sounds, mixer }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const sleepSounds = sounds.filter((s) =>
    (s.tags || []).some((t: string) => ["sleep", "meditation", "bedtime"].includes(t))
  );

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

  return (
    <div className="space-y-4 mt-4">
      <p className="text-sm text-muted-foreground">Sounds tagged for sleep & meditation</p>
      {sleepSounds.length > 0 ? (
        <div className="flex flex-wrap gap-x-2 gap-y-3 justify-start">
          {sleepSounds.map((s, index) => {
            const row = Math.floor(index / 4);
            const isOddRow = row % 2 === 1;
            return (
              <div
                key={s.id}
                className="flex-shrink-0"
                style={{
                  width: "calc(25% - 6px)",
                  marginLeft: isOddRow && (index % 4 === 0) ? "calc(12.5% - 3px)" : undefined,
                }}
              >
                <VibesTile
                  name={s.name}
                  iconUrl={s.icon_url}
                  isActive={mixer.isSoundActive(s.id)}
                  isFavorite={favorites.includes(s.id)}
                  onToggle={() => mixer.toggleSound({ id: s.id, name: s.name, audioUrl: s.audio_url, iconUrl: s.icon_url })}
                  onFavorite={() => toggleFav.mutate(s.id)}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-center text-muted-foreground py-8">No sleep sounds available yet</p>
      )}
    </div>
  );
}
