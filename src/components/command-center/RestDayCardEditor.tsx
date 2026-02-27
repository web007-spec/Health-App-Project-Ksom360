import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ImagePlus, Trash2, Save, Dumbbell } from "lucide-react";

interface RestDayCardEditorProps {
  clientId: string;
  trainerId: string;
}

export function RestDayCardEditor({ clientId, trainerId }: RestDayCardEditorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const { data: restDayCard, isLoading } = useQuery({
    queryKey: ["rest-day-card", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_rest_day_cards" as any)
        .select("*")
        .eq("client_id", clientId)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  // Initialize message from fetched data
  if (restDayCard && !initialized) {
    setMessage(restDayCard.message || "");
    setInitialized(true);
  }

  const saveMutation = useMutation({
    mutationFn: async ({ msg, imageUrl }: { msg?: string; imageUrl?: string | null }) => {
      const payload: any = {
        client_id: clientId,
        trainer_id: trainerId,
        ...(msg !== undefined && { message: msg }),
        ...(imageUrl !== undefined && { image_url: imageUrl }),
      };

      if (restDayCard) {
        const { error } = await supabase
          .from("client_rest_day_cards" as any)
          .update(payload)
          .eq("id", restDayCard.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("client_rest_day_cards" as any)
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rest-day-card", clientId] });
      toast({ title: "Rest day card updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save rest day card", variant: "destructive" });
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${clientId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("rest-day-images")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("rest-day-images")
        .getPublicUrl(path);

      saveMutation.mutate({ imageUrl: publicUrl });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    saveMutation.mutate({ imageUrl: null });
  };

  const saveMessage = () => {
    saveMutation.mutate({ msg: message });
  };

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Rest Day Card</CardTitle>
        <CardDescription>
          Customize the card shown on the client's Today screen when no workouts are scheduled.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preview */}
        <div className="rounded-lg overflow-hidden border">
          <div className="relative h-36 bg-gradient-to-br from-primary/20 to-primary/5">
            {restDayCard?.image_url ? (
              <img
                src={restDayCard.image_url}
                alt="Rest day"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Dumbbell className="h-12 w-12 text-primary/20" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">Rest Day</p>
              <p className="text-sm font-bold text-white">
                {restDayCard?.message || "No workouts scheduled for today. Enjoy your rest!"}
              </p>
            </div>
          </div>
        </div>

        {/* Image upload */}
        <div>
          <Label className="text-sm font-medium">Cover Image</Label>
          <div className="flex gap-2 mt-1.5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <ImagePlus className="h-4 w-4 mr-1.5" />
              {uploading ? "Uploading..." : restDayCard?.image_url ? "Change" : "Upload"}
            </Button>
            {restDayCard?.image_url && (
              <Button variant="outline" size="sm" onClick={removeImage}>
                <Trash2 className="h-4 w-4 mr-1.5" />
                Remove
              </Button>
            )}
          </div>
        </div>

        {/* Message */}
        <div>
          <Label className="text-sm font-medium">Message</Label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="No workouts scheduled for today. Enjoy your rest!"
            className="mt-1.5"
            rows={2}
          />
        </div>

        <Button size="sm" onClick={saveMessage} disabled={saveMutation.isPending}>
          <Save className="h-4 w-4 mr-1.5" />
          Save Message
        </Button>
      </CardContent>
    </Card>
  );
}
