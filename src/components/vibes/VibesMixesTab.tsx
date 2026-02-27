import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Props {
  mixer: any;
}

export function VibesMixesTab({ mixer }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: myMixes = [] } = useQuery({
    queryKey: ["vibes-my-mixes", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("vibes_mixes")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_public", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: starterMixes = [] } = useQuery({
    queryKey: ["vibes-starter-mixes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vibes_mixes")
        .select("*")
        .eq("is_public", true)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const loadMix = async (mixId: string) => {
    const { data: items } = await supabase
      .from("vibes_mix_items")
      .select("sound_id, volume, vibes_sounds(name, audio_url, icon_url)")
      .eq("mix_id", mixId)
      .order("sort_order");
    if (!items) return;
    const loaded = items.map((it: any) => ({
      soundId: it.sound_id,
      name: it.vibes_sounds?.name || "Sound",
      url: it.vibes_sounds?.audio_url || "",
      volume: it.volume,
      iconUrl: it.vibes_sounds?.icon_url,
    }));
    mixer.loadMix(loaded);
    mixer.play();
    toast.success("Mix loaded!");
  };

  const deleteMix = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vibes_mixes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vibes-my-mixes"] }); toast.success("Mix deleted"); },
  });

  const MixCard = ({ mix, canDelete }: { mix: any; canDelete: boolean }) => (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="font-medium">{mix.name}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(mix.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="icon" variant="ghost" onClick={() => loadMix(mix.id)}>
            <Play className="h-4 w-4" />
          </Button>
          {canDelete && (
            <Button size="icon" variant="ghost" onClick={() => deleteMix.mutate(mix.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 mt-4">
      {myMixes.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">My Saved Mixes</h3>
          <div className="space-y-2">
            {myMixes.map((m: any) => <MixCard key={m.id} mix={m} canDelete />)}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Starter Mixes</h3>
        {starterMixes.length > 0 ? (
          <div className="space-y-2">
            {starterMixes.map((m: any) => <MixCard key={m.id} mix={m} canDelete={false} />)}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">No starter mixes available</p>
        )}
      </div>
    </div>
  );
}
