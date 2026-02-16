import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ImagePlus, Trash2, Save, Swords, Trophy } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Props {
  clientId: string;
  trainerId: string;
}

function CardEditor({ clientId, trainerId, cardType, icon: Icon, iconColor, label }: Props & { cardType: "practice" | "game"; icon: any; iconColor: string; label: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const { data: card, isLoading } = useQuery({
    queryKey: ["sport-day-card", clientId, cardType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_sport_day_cards" as any)
        .select("*")
        .eq("client_id", clientId)
        .eq("card_type", cardType)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  if (card && !initialized) {
    setMessage(card.message || "");
    setInitialized(true);
  }

  const saveMutation = useMutation({
    mutationFn: async ({ msg, imageUrl }: { msg?: string; imageUrl?: string | null }) => {
      const payload: any = {
        client_id: clientId,
        trainer_id: trainerId,
        card_type: cardType,
        ...(msg !== undefined && { message: msg }),
        ...(imageUrl !== undefined && { image_url: imageUrl }),
      };

      if (card) {
        const { error } = await supabase
          .from("client_sport_day_cards" as any)
          .update(payload)
          .eq("id", card.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("client_sport_day_cards" as any)
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sport-day-card", clientId, cardType] });
      toast({ title: `${label} card updated` });
    },
    onError: () => {
      toast({ title: "Error", description: `Failed to save ${label.toLowerCase()} card`, variant: "destructive" });
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${clientId}/${cardType}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("rest-day-images")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("rest-day-images").getPublicUrl(path);
      saveMutation.mutate({ imageUrl: publicUrl });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) return null;

  return (
    <div className="space-y-4">
      {/* Preview */}
      <div className="rounded-lg overflow-hidden border">
        <div className="relative h-36 bg-gradient-to-br from-primary/20 to-primary/5">
          {card?.image_url ? (
            <img src={card.image_url} alt={label} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Icon className={`h-12 w-12 ${iconColor}`} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">{label} Day</p>
            <p className="text-sm font-bold text-white">
              {card?.message || `${label} scheduled today!`}
            </p>
          </div>
        </div>
      </div>

      {/* Image upload */}
      <div>
        <Label className="text-sm font-medium">Cover Image</Label>
        <div className="flex gap-2 mt-1.5">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <ImagePlus className="h-4 w-4 mr-1.5" />
            {uploading ? "Uploading..." : card?.image_url ? "Change" : "Upload"}
          </Button>
          {card?.image_url && (
            <Button variant="outline" size="sm" onClick={() => saveMutation.mutate({ imageUrl: null })}>
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
          placeholder={`${label} scheduled today!`}
          className="mt-1.5"
          rows={2}
        />
      </div>

      <Button size="sm" onClick={() => saveMutation.mutate({ msg: message })} disabled={saveMutation.isPending}>
        <Save className="h-4 w-4 mr-1.5" />
        Save Message
      </Button>
    </div>
  );
}

export function SportDayCardEditor({ clientId, trainerId }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Practice & Game Day Cards</CardTitle>
        <CardDescription>
          Customize the cards shown on the client's Today screen when they have practices or games scheduled.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="practice">
          <TabsList className="w-full">
            <TabsTrigger value="practice" className="flex-1 gap-1.5">
              <Trophy className="h-4 w-4" />
              Practice
            </TabsTrigger>
            <TabsTrigger value="game" className="flex-1 gap-1.5">
              <Swords className="h-4 w-4" />
              Game
            </TabsTrigger>
          </TabsList>
          <TabsContent value="practice" className="mt-4">
            <CardEditor clientId={clientId} trainerId={trainerId} cardType="practice" icon={Trophy} iconColor="text-sky-400/30" label="Practice" />
          </TabsContent>
          <TabsContent value="game" className="mt-4">
            <CardEditor clientId={clientId} trainerId={trainerId} cardType="game" icon={Swords} iconColor="text-rose-400/30" label="Game" />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
