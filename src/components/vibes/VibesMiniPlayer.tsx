import { useState } from "react";
import { Play, Pause, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VibesMixerSheet } from "@/components/vibes/VibesMixerSheet";
import { VibesTimerDialog } from "@/components/vibes/VibesTimerDialog";
import { SaveMixDialog } from "@/components/vibes/SaveMixDialog";

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

  const displayName = mixer.mixName || "Current Mix";
  const itemCount = mixer.mixItems.length;

  // Show up to 3 stacked icon thumbnails
  const iconItems = mixer.mixItems.slice(0, 3);

  return (
    <>
      <div className="fixed bottom-16 left-0 right-0 z-40 safe-area-bottom px-2">
        <div
          onClick={() => setSheetOpen(true)}
          className="rounded-2xl overflow-hidden shadow-[0_-2px_20px_rgba(120,80,200,0.3)] cursor-pointer"
          style={{
            background: "linear-gradient(135deg, hsl(260,45%,38%) 0%, hsl(270,50%,30%) 50%, hsl(255,40%,25%) 100%)",
          }}
        >
          <div className="flex items-center gap-3 p-3">
            {/* Chevron up */}
            <ChevronUp className="h-5 w-5 text-white/60 shrink-0" />

            {/* Stacked icon thumbnails */}
            <div className="relative flex items-center shrink-0" style={{ width: 52, height: 40 }}>
              {iconItems.map((item: any, i: number) => (
                <div
                  key={item.soundId}
                  className="absolute rounded-lg overflow-hidden border border-white/20 shadow-md"
                  style={{
                    width: 32,
                    height: 32,
                    left: i * 10,
                    zIndex: 10 - i,
                    background: "linear-gradient(135deg, hsl(30,32%,45%), hsl(28,28%,35%))",
                  }}
                >
                  {item.iconUrl ? (
                    <img src={item.iconUrl} alt="" className="w-full h-full object-contain p-0.5" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-white/50">🎵</div>
                  )}
                </div>
              ))}
            </div>

            {/* Title + count */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{displayName}</p>
              <p className="text-xs text-white/60">
                {itemCount} item{itemCount !== 1 ? "s" : ""}
                {mixer.timerRemaining !== null && ` · ${formatTime(mixer.timerRemaining)}`}
              </p>
            </div>

            {/* Play/Pause */}
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-white hover:bg-white/10 h-10 w-10"
              onClick={(e) => {
                e.stopPropagation();
                mixer.isPlaying ? mixer.pause() : mixer.play();
              }}
            >
              {mixer.isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </div>

      <VibesMixerSheet open={sheetOpen} onOpenChange={setSheetOpen} mixer={mixer} />
      <VibesTimerDialog open={timerOpen} onOpenChange={setTimerOpen} mixer={mixer} />
      <SaveMixDialog open={saveOpen} onOpenChange={setSaveOpen} mixer={mixer} />
    </>
  );
}
