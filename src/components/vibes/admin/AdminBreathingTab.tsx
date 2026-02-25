import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, ArrowLeft, Music, Pin } from "lucide-react";
import { BREATHING_EXERCISES, type BreathingExercise } from "@/lib/breathingExercises";
import { BreathingPlayer } from "@/components/vibes/BreathingPlayer";
import { ManageBreathingMusicDialog } from "./ManageBreathingMusicDialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export function AdminBreathingTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [previewExercise, setPreviewExercise] = useState<BreathingExercise | null>(null);
  const [musicDialogOpen, setMusicDialogOpen] = useState(false);
  const [autoPickOnOpen, setAutoPickOnOpen] = useState(false);

  const { data: tracks = [] } = useQuery({
    queryKey: ["breathing-music-tracks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("breathing_music_tracks")
        .select("*")
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: pinnedMap = {} } = useQuery({
    queryKey: ["breathing-exercise-music"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("breathing_exercise_music")
        .select("*");
      if (error) throw error;
      const map: Record<string, string> = {};
      data.forEach((row: any) => { map[row.exercise_id] = row.track_id; });
      return map;
    },
  });

  const pinTrack = useMutation({
    mutationFn: async ({ exerciseId, trackId }: { exerciseId: string; trackId: string | null }) => {
      if (!user) return;
      if (trackId === null) {
        await supabase.from("breathing_exercise_music").delete()
          .eq("exercise_id", exerciseId).eq("trainer_id", user.id);
      } else {
        const { error } = await supabase.from("breathing_exercise_music").upsert({
          exercise_id: exerciseId,
          track_id: trackId,
          trainer_id: user.id,
        }, { onConflict: "exercise_id,trainer_id" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["breathing-exercise-music"] });
      toast.success("Track assignment updated");
    },
  });

  if (previewExercise) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setPreviewExercise(null)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to list
        </Button>
        <div className="max-w-md mx-auto rounded-2xl overflow-hidden relative" style={{ aspectRatio: "9/16", background: "hsl(220, 25%, 5%)" }}>
          <BreathingPlayer
            exercise={previewExercise}
            onBack={() => setPreviewExercise(null)}
            contained
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {BREATHING_EXERCISES.length} exercises available for clients in the Restore → Breathe tab
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setAutoPickOnOpen(false);
            setMusicDialogOpen(true);
          }}
        >
          <Music className="h-4 w-4 mr-1" /> Manage Music
        </Button>
      </div>

      <ManageBreathingMusicDialog
        open={musicDialogOpen}
        onOpenChange={(nextOpen) => {
          setMusicDialogOpen(nextOpen);
          if (!nextOpen) setAutoPickOnOpen(false);
        }}
        autoPickOnOpen={autoPickOnOpen}
      />

      <div className="grid gap-3 md:grid-cols-2">
        {BREATHING_EXERCISES.map((ex) => {
          const pinnedTrackId = pinnedMap[ex.id];

          return (
            <Card key={ex.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{ex.icon}</div>
                    <div>
                      <p className="font-semibold">{ex.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{ex.description}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPreviewExercise(ex)}
                    title="Preview"
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {ex.phases.map((phase, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {phase.label} {phase.seconds}s
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs capitalize">{ex.animation}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {ex.phases.reduce((s, p) => s + p.seconds, 0)}s per cycle
                  </span>
                </div>

                {/* Per-exercise music pin */}
                <div className="mt-3 flex items-center gap-2">
                  <Pin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <Select
                    value={pinnedTrackId ?? "none"}
                    onValueChange={(val) =>
                      pinTrack.mutate({ exerciseId: ex.id, trackId: val === "none" ? null : val })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs flex-1">
                      <SelectValue placeholder="Default (shared library)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Default (shared library)</SelectItem>
                      {tracks.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
