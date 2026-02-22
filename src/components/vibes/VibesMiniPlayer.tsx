import { useState } from "react";
import { Play, Pause, Timer, Save, Share2, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VibesMixerSheet } from "@/components/vibes/VibesMixerSheet";
import { VibesTimerDialog } from "@/components/vibes/VibesTimerDialog";
import { SaveMixDialog } from "@/components/vibes/SaveMixDialog";
import { shareMixLink } from "@/lib/vibesShare";
import { toast } from "sonner";

interface Props {
  mixer: any;
}

export function VibesMiniPlayer({ mixer }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);

  if (mixer.mixItems.length === 0) return null;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const handleShare = async () => {
    const url = window.location.origin + "/client/vibes";
    try {
      await shareMixLink(url);
      toast.success("Link copied!");
    } catch {}
  };

  const displayName = mixer.mixName || "Custom Mix";

  return (
    <>
      <div className="fixed bottom-16 left-0 right-0 z-40 safe-area-bottom">
        <div
          onClick={() => setSheetOpen(true)}
          className="mx-2 rounded-2xl bg-card/95 backdrop-blur border border-border shadow-lg p-3 flex items-center gap-3 cursor-pointer"
        >
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              mixer.isPlaying ? mixer.pause() : mixer.play();
            }}
          >
            {mixer.isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{displayName}</p>
            <p className="text-xs text-muted-foreground">
              {mixer.mixItems.length} layer{mixer.mixItems.length !== 1 ? "s" : ""}
              {mixer.timerRemaining !== null && ` · ${formatTime(mixer.timerRemaining)}`}
            </p>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setTimerOpen(true); }}>
              <Timer className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setSaveOpen(true); }}>
              <Save className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleShare(); }}>
              <Share2 className="h-4 w-4" />
            </Button>
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </div>

      <VibesMixerSheet open={sheetOpen} onOpenChange={setSheetOpen} mixer={mixer} />
      <VibesTimerDialog open={timerOpen} onOpenChange={setTimerOpen} mixer={mixer} />
      <SaveMixDialog open={saveOpen} onOpenChange={setSaveOpen} mixer={mixer} />
    </>
  );
}
