import { memo } from "react";
import { VibesTile } from "./VibesTile";

interface Props {
  sounds: any[];
  activeSoundIds?: Set<string>;
  isActiveCheck?: (id: string) => boolean;
  onToggle: (s: any) => void;
}

/** 4-column grid with vertical stagger — odd tiles shift down ~16px */
export const StaggeredTileGrid = memo(function StaggeredTileGrid({
  sounds,
  activeSoundIds,
  isActiveCheck,
  onToggle,
}: Props) {
  const checkActive = (id: string) =>
    activeSoundIds ? activeSoundIds.has(id) : isActiveCheck ? isActiveCheck(id) : false;

  return (
    <div className="grid grid-cols-4 gap-x-6 gap-y-1 px-4">
      {sounds.map((s, index) => {
        const isOdd = index % 2 === 1;
        return (
          <div
            key={s.id}
            style={{ paddingTop: isOdd ? 16 : 0 }}
          >
            <VibesTile
              name={s.name}
              iconUrl={s.icon_url}
              isActive={checkActive(s.id)}
              onToggle={() => onToggle(s)}
            />
          </div>
        );
      })}
    </div>
  );
});
