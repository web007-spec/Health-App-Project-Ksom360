import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { X, Trash2, BrainCircuit } from "lucide-react";
import { BRAINWAVE_DEFS } from "@/lib/syntheticSounds";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mixer: any;
}

export function VibesMixerSheet({ open, onOpenChange, mixer }: Props) {
  const bw = mixer.brainwave;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[70vh]">
        <DrawerHeader className="flex items-center justify-between">
          <DrawerTitle>Current Mix</DrawerTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { mixer.clearAll(); onOpenChange(false); }}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-1" /> Clear All
          </Button>
        </DrawerHeader>
        <div className="px-4 pb-6 space-y-4 overflow-y-auto">
          {/* Sound layers */}
          {mixer.mixItems.map((item: any) => (
            <div key={item.soundId} className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                {item.iconUrl ? (
                  <img src={item.iconUrl} alt={item.name} className="h-8 w-8 object-contain rounded" />
                ) : (
                  <span className="text-lg">🎵</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.name}</p>
                <Slider
                  value={[Math.round(item.volume * 100)]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={([v]) => mixer.setVolume(item.soundId, v / 100)}
                  className="mt-1 [&_[role=slider]]:bg-[hsl(260,45%,50%)] [&_[data-orientation=horizontal]>span:first-child>span]:bg-[hsl(260,45%,50%)]"
                />
              </div>
              <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => mixer.removeSound(item.soundId)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {mixer.mixItems.length === 0 && !bw && (
            <p className="text-center text-muted-foreground py-8">No sounds in mix</p>
          )}

          {/* Brainwave section */}
          {bw && (
            <>
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <BrainCircuit className="h-4 w-4 text-[hsl(260,45%,55%)]" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Brainwave</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[hsl(260,30%,18%)] flex items-center justify-center shrink-0 text-lg">
                  {BRAINWAVE_DEFS[bw.type].icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{BRAINWAVE_DEFS[bw.type].label} <span className="text-muted-foreground text-xs">· {BRAINWAVE_DEFS[bw.type].description}</span></p>
                  <Slider
                    value={[Math.round(bw.volume * 100)]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={([v]) => mixer.setBrainwaveVolume(v / 100)}
                    className="mt-1 [&_[role=slider]]:bg-[hsl(260,45%,50%)] [&_[data-orientation=horizontal]>span:first-child>span]:bg-[hsl(260,45%,50%)]"
                  />
                </div>
                <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => mixer.removeBrainwave()}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
