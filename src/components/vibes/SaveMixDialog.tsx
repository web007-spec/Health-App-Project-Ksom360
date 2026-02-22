import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mixer: any;
}

export function SaveMixDialog({ open, onOpenChange, mixer }: Props) {
  const [name, setName] = useState("");
  const { user } = useAuth();
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-" + Date.now().toString(36);
      const { data: mix, error } = await supabase
        .from("vibes_mixes")
        .insert({ user_id: user.id, name, share_slug: slug, is_public: false })
        .select("id")
        .single();
      if (error) throw error;

      const items = mixer.mixItems.map((item: any, i: number) => ({
        mix_id: mix.id,
        sound_id: item.soundId,
        volume: item.volume,
        sort_order: i,
      }));
      const { error: itemsError } = await supabase.from("vibes_mix_items").insert(items);
      if (itemsError) throw itemsError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vibes-my-mixes"] });
      toast.success("Mix saved!");
      setName("");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Mix</DialogTitle>
        </DialogHeader>
        <div>
          <Label>Mix Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rainy Evening" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={!name || mutation.isPending}>
            {mutation.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
