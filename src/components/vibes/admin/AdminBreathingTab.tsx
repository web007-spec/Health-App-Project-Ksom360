import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, ArrowLeft, Music, Pin, Video, Trash2, Loader2 } from "lucide-react";
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
  const [uploadingVideoFor, setUploadingVideoFor] = useState<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const pendingExerciseRef = useRef<string | null>(null);

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

  // Fetch video assignments
  const { data: videoMap = {} } = useQuery({
    queryKey: ["breathing-exercise-videos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("breathing_exercise_videos")
        .select("*");
      if (error) throw error;
      const map: Record<string, { id: string; video_url: string }> = {};
      (data ?? []).forEach((row: any) => { map[row.exercise_id] = { id: row.id, video_url: row.video_url }; });
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

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const exerciseId = pendingExerciseRef.current;
    if (!file || !exerciseId || !user) return;
    e.target.value = "";

    setUploadingVideoFor(exerciseId);
    try {
      const ext = file.name.split(".").pop() || "mp4";
      const path = `${user.id}/${exerciseId}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("breathing-videos")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("breathing-videos").getPublicUrl(path);
      const videoUrl = urlData.publicUrl;

      const { error: dbError } = await supabase.from("breathing_exercise_videos").upsert({
        exercise_id: exerciseId,
        trainer_id: user.id,
        video_url: videoUrl,
      }, { onConflict: "exercise_id,trainer_id" });
      if (dbError) throw dbError;

      queryClient.invalidateQueries({ queryKey: ["breathing-exercise-videos"] });
      toast.success("Video uploaded");
    } catch (err: any) {
      toast.error("Upload failed: " + (err.message || "Unknown error"));
    } finally {
      setUploadingVideoFor(null);
      pendingExerciseRef.current = null;
    }
  };

  const removeVideo = useMutation({
    mutationFn: async (exerciseId: string) => {
      if (!user) return;
      await supabase.from("breathing_exercise_videos").delete()
        .eq("exercise_id", exerciseId).eq("trainer_id", user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["breathing-exercise-videos"] });
      toast.success("Video removed");
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
          const pinnedTrack = tracks.find((t) => t.id === pinnedTrackId);
          const videoEntry = videoMap[ex.id];

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

                {/* Per-exercise background video */}
                <div className="mt-2 flex items-center gap-2">
                  <Video className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {videoEntry ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-xs text-muted-foreground truncate flex-1">Video uploaded</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => removeVideo.mutate(ex.id)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      disabled={uploadingVideoFor === ex.id}
                      onClick={() => {
                        pendingExerciseRef.current = ex.id;
                        videoInputRef.current?.click();
                      }}
                    >
                      {uploadingVideoFor === ex.id ? (
                        <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Uploading…</>
                      ) : (
                        "Upload Video"
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Hidden video file input */}
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleVideoUpload}
      />
    </div>
  );
}
