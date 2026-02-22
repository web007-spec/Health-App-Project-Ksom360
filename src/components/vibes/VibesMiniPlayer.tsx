import { useState } from "react";
import { Play, Pause, ChevronUp, Bookmark } from "lucide-react";
import { useTransparentIcon } from "@/hooks/useTransparentIcon";
import { Button } from "@/components/ui/button";
import { VibesMixerSheet } from "@/components/vibes/VibesMixerSheet";
import { VibesTimerDialog } from "@/components/vibes/VibesTimerDialog";
import { SaveMixDialog } from "@/components/vibes/SaveMixDialog";
import { SaveLocalMixDialog } from "@/components/vibes/SaveLocalMixDialog";

interface Props {
  mixer: any;
  onMixSaved?: () => void;
}

/** Small thumbnail with same engraved wood look as grid tiles */
function MiniThumb({ iconUrl, index }: { iconUrl?: string; index: number }) {
  const transparentIcon = useTransparentIcon(iconUrl);
  return (
    <div
      className="absolute rounded-[10px] overflow-hidden shadow-lg"
      style={{
        width: 44, height: 44, left: index * 14, zIndex: 10 - index,
        background: "linear-gradient(145deg, hsl(30,32%,42%), hsl(28,28%,36%), hsl(24,24%,28%))",
        border: "1.5px solid hsl(40,25%,45%)",
        boxShadow: "inset 0 2px 3px rgba(255,255,255,0.1), inset 0 -2px 4px rgba(0,0,0,0.25), 0 2px 6px rgba(0,0,0,0.4)",
      }}
    >
      {/* Wood grain */}
      <div className="absolute inset-0 rounded-[10px] pointer-events-none" style={{
        backgroundImage: [
          "repeating-linear-gradient(78deg, transparent, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px)",
          "repeating-linear-gradient(82deg, transparent, transparent 6px, rgba(255,255,255,0.05) 6px, rgba(255,255,255,0.05) 7px)",
        ].join(", "),
      }} />
      {/* Engraved icon layers */}
      {transparentIcon ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-7 h-7">
            <img src={transparentIcon} alt="" className="absolute inset-0 w-7 h-7 object-contain opacity-50"
              style={{ filter: "brightness(0) blur(0.8px)", transform: "translate(0.8px, 1px)" }} aria-hidden />
            <img src={transparentIcon} alt="" className="relative w-7 h-7 object-contain"
              style={{ filter: "brightness(0.15) sepia(0.2) saturate(0.3) contrast(1.4)", opacity: 0.85 }} />
            <img src={transparentIcon} alt="" className="absolute inset-0 w-7 h-7 object-contain opacity-25"
              style={{ filter: "brightness(2.5) contrast(0.4) blur(0.3px)", transform: "translate(-0.4px, -0.6px)", mixBlendMode: "overlay" }} aria-hidden />
          </div>
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center text-xs text-white/50">🎵</div>
      )}
    </div>
  );
}

export function VibesMiniPlayer({ mixer, onMixSaved }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveLocalOpen, setSaveLocalOpen] = useState(false);

  if (mixer.mixItems.length === 0 && !mixer.brainwave) return null;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const displayName = mixer.mixName || "Current Mix";
  const itemCount = (mixer.mixItems?.length || 0) + (mixer.brainwave ? 1 : 0);
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
            <ChevronUp className="h-5 w-5 text-white/60 shrink-0" />

            <div className="relative flex items-center shrink-0" style={{ width: 72, height: 48 }}>
              {iconItems.map((item: any, i: number) => (
                <MiniThumb key={item.soundId} iconUrl={item.iconUrl} index={i} />
              ))}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{displayName}</p>
              <p className="text-xs text-white/60">
                {itemCount} item{itemCount !== 1 ? "s" : ""}
                {mixer.timerRemaining !== null && ` · ${formatTime(mixer.timerRemaining)}`}
              </p>
            </div>

            {/* Save button */}
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-white hover:bg-white/10 h-10 w-10"
              onClick={(e) => {
                e.stopPropagation();
                setSaveLocalOpen(true);
              }}
            >
              <Bookmark className="h-5 w-5" />
            </Button>

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
      <SaveLocalMixDialog
        open={saveLocalOpen}
        onOpenChange={setSaveLocalOpen}
        mixer={mixer}
        onSaved={onMixSaved}
      />
    </>
  );
}
