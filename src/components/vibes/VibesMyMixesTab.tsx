import { useState, useCallback, useEffect } from "react";
import { loadSavedMixes, deleteSavedMix, SavedMix } from "@/lib/savedMixes";
import { GuidedSession } from "@/lib/guidedSessions";
import { Button } from "@/components/ui/button";
import { Trash2, Clock, Waves, BrainCircuit } from "lucide-react";
import { cn } from "@/lib/utils";
import { BRAINWAVE_DEFS } from "@/lib/syntheticSounds";
import { toast } from "sonner";

interface Props {
  mixer: any;
  sounds: any[];
  refreshKey?: number;
}

export function VibesMyMixesTab({ mixer, sounds, refreshKey }: Props) {
  const [mixes, setMixes] = useState<SavedMix[]>(() => loadSavedMixes());
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    setMixes(loadSavedMixes());
  }, [refreshKey]);

  const handleApply = async (mix: SavedMix) => {
    setActiveId(mix.id);
    // Build a GuidedSession-compatible object
    const session: GuidedSession = {
      id: mix.id,
      name: mix.name,
      subtitle: "Saved mix",
      mode: (mix.mode as any) || "focus",
      durationSec: mix.timerSec || 25 * 60,
      fadeOutSec: mix.fadeOutSec || 30,
      sounds: mix.sounds.map((s) => ({ soundId: s.soundId, volume: s.volume })),
      brainwave: mix.brainwave,
      featured: false,
    };
    await mixer.applySession(session, sounds);
  };

  const handleDelete = (id: string) => {
    const updated = deleteSavedMix(id);
    setMixes(updated);
    if (activeId === id) setActiveId(null);
    toast.success("Mix deleted");
  };

  if (mixes.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-sm">No saved mixes yet</p>
        <p className="text-muted-foreground text-xs mt-1">Build a mix and tap the bookmark icon to save it</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 mt-4">
      {mixes.map((mix) => {
        const isActive = activeId === mix.id;
        const soundCount = mix.sounds.length;
        return (
          <button
            key={mix.id}
            onClick={() => handleApply(mix)}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all duration-[180ms] border",
              "bg-gradient-to-br from-[hsl(260,25%,16%)] to-[hsl(260,20%,12%)]",
              "active:scale-[0.98]",
              isActive
                ? "ring-[1.5px] ring-amber-400/60 border-amber-400/30"
                : "border-border/40 hover:border-[hsl(260,30%,35%)]"
            )}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white/90 truncate">{mix.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center gap-1 text-[10px] text-white/50">
                  <Waves className="w-3 h-3" />
                  {soundCount}
                </span>
                {mix.brainwave && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-[hsl(260,60%,70%)]">
                    <BrainCircuit className="w-3 h-3" />
                    {BRAINWAVE_DEFS[mix.brainwave.type]?.label}
                  </span>
                )}
                {mix.timerSec && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-white/40">
                    <Clock className="w-3 h-3" />
                    {Math.round(mix.timerSec / 60)}m
                  </span>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(mix.id);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </button>
        );
      })}
    </div>
  );
}
