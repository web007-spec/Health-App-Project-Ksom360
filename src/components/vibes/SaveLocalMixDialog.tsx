import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveMix, SavedMix } from "@/lib/savedMixes";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mixer: any;
  onSaved?: () => void;
}

export function SaveLocalMixDialog({ open, onOpenChange, mixer, onSaved }: Props) {
  const [name, setName] = useState("");

  const handleSave = () => {
    if (!name.trim()) return;
    const mix: SavedMix = {
      id: `mix-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      createdAt: new Date().toISOString(),
      mode: mixer.activeMode || null,
      sounds: mixer.mixItems.map((item: any) => ({
        soundId: item.soundId,
        name: item.name,
        url: item.url,
        volume: item.volume,
        iconUrl: item.iconUrl,
      })),
      brainwave: mixer.brainwave || null,
      timerSec: mixer.timerRemaining,
      fadeOutSec: 30,
    };
    saveMix(mix);
    toast.success("Mix saved!");
    setName("");
    onOpenChange(false);
    onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Mix</DialogTitle>
        </DialogHeader>
        <div>
          <Label>Mix Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Rainy Evening"
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim()}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
