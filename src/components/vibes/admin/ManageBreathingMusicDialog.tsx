import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Trash2, Music, Loader2, GripVertical } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

export function ManageBreathingMusicDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [newName, setNewName] = useState("");

  const { data: tracks = [], isLoading } = useQuery({
    queryKey: ["breathing-music-tracks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("breathing_music_tracks")
        .select("*")
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("breathing_music_tracks")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["breathing-music-tracks"] }),
  });

  const deleteTrack = useMutation({
    mutationFn: async (id: string) => {
      const track = tracks.find((t) => t.id === id);
      if (track?.file_url) {
        const path = track.file_url.split("/breathing-music/")[1];
        if (path) await supabase.storage.from("breathing-music").remove([path]);
      }
      const { error } = await supabase.from("breathing_music_tracks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["breathing-music-tracks"] });
      toast.success("Track deleted");
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const name = newName.trim() || file.name.replace(/\.[^.]+$/, "");
    setUploading(true);

    try {
      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("breathing-music")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("breathing-music")
        .getPublicUrl(filePath);

      // Get audio duration
      let durationSecs: number | null = null;
      try {
        const audio = new Audio(urlData.publicUrl);
        await new Promise<void>((resolve) => {
          audio.addEventListener("loadedmetadata", () => {
            durationSecs = Math.round(audio.duration);
            resolve();
          });
          audio.addEventListener("error", () => resolve());
          setTimeout(resolve, 5000);
        });
      } catch {}

      const { error: insertError } = await supabase.from("breathing_music_tracks").insert({
        trainer_id: user.id,
        name,
        file_url: urlData.publicUrl,
        duration_seconds: durationSecs,
        order_index: tracks.length,
      });
      if (insertError) throw insertError;

      toast.success(`"${name}" uploaded`);
      setNewName("");
      queryClient.invalidateQueries({ queryKey: ["breathing-music-tracks"] });
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" /> Breathing Music Tracks
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload section */}
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <div className="flex-1 min-w-0">
              <Label className="text-xs text-muted-foreground">Track name (optional)</Label>
              <Input
                placeholder="e.g. Ocean Calm"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="sm:shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleUpload}
              />
              <Button
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Upload className="h-4 w-4 mr-1" />
                )}
                Upload
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Uploaded tracks are shared across all breathing exercises.
          </p>

          {/* Track list */}
          {isLoading ? (
            <div className="text-center text-sm text-muted-foreground py-8">Loading…</div>
          ) : tracks.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              No tracks uploaded yet. Upload your first breathing music track above.
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {tracks.map((track) => (
                <div
                  key={track.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{track.name}</p>
                    {track.duration_seconds && (
                      <p className="text-xs text-muted-foreground">
                        {Math.floor(track.duration_seconds / 60)}:{String(track.duration_seconds % 60).padStart(2, "0")}
                      </p>
                    )}
                  </div>
                  <Switch
                    checked={track.is_active}
                    onCheckedChange={(checked) =>
                      toggleActive.mutate({ id: track.id, is_active: checked })
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive/60 hover:text-destructive"
                    onClick={() => deleteTrack.mutate(track.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}