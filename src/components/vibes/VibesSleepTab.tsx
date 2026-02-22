import { StaggeredTileGrid } from "./StaggeredTileGrid";

interface Props {
  sounds: any[];
  mixer: any;
}

export function VibesSleepTab({ sounds, mixer }: Props) {
  const sleepSounds = sounds.filter((s) =>
    (s.tags || []).some((t: string) => ["sleep", "meditation", "bedtime"].includes(t))
  );

  return (
    <div className="space-y-4 mt-4">
      <p className="text-sm text-muted-foreground">Sounds tagged for sleep & meditation</p>
      {sleepSounds.length > 0 ? (
        <StaggeredTileGrid
          sounds={sleepSounds}
          isActiveCheck={(id) => mixer.isSoundActive(id)}
          onToggle={(s) => mixer.toggleSound({ id: s.id, name: s.name, audioUrl: s.audio_url, iconUrl: s.icon_url })}
        />
      ) : (
        <p className="text-center text-muted-foreground py-8">No sleep sounds available yet</p>
      )}
    </div>
  );
}
