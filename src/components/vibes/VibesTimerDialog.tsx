import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const PRESETS = [15, 30, 45, 60, 90];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mixer: any;
}

export function VibesTimerDialog({ open, onOpenChange, mixer }: Props) {
  const [custom, setCustom] = useState("");
  const [fadeOut, setFadeOut] = useState(true);

  const start = (mins: number) => {
    mixer.startTimer(mins, fadeOut);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sleep Timer</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map((m) => (
              <Button key={m} variant="outline" onClick={() => start(m)}>
                {m} min
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="Custom mins"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              className="flex-1"
            />
            <Button disabled={!custom} onClick={() => start(Number(custom))}>
              Start
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <Label>Fade out last 60s</Label>
            <Switch checked={fadeOut} onCheckedChange={setFadeOut} />
          </div>
          {mixer.timerRemaining !== null && (
            <Button variant="destructive" className="w-full" onClick={() => { mixer.cancelTimer(); onOpenChange(false); }}>
              Cancel Timer
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
