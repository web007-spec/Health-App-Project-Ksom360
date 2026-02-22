import { memo } from "react";
import { VibesTile } from "./VibesTile";

interface Props {
  sounds: any[];
  activeSoundIds?: Set<string>;
  isActiveCheck?: (id: string) => boolean;
  onToggle: (s: any) => void;
}

/** Staggered 4-column grid — odd rows shift right by half a tile and show 3 items */
export const StaggeredTileGrid = memo(function StaggeredTileGrid({
  sounds,
  activeSoundIds,
  isActiveCheck,
  onToggle,
}: Props) {
  // Split sounds into rows: row 0 = 4 items, row 1 = 3 items (offset), repeat
  const rows: { items: any[]; offset: boolean }[] = [];
  let i = 0;
  let rowIndex = 0;
  while (i < sounds.length) {
    const isOdd = rowIndex % 2 === 1;
    const count = isOdd ? 3 : 4;
    rows.push({ items: sounds.slice(i, i + count), offset: isOdd });
    i += count;
    rowIndex++;
  }

  const checkActive = (id: string) =>
    activeSoundIds ? activeSoundIds.has(id) : isActiveCheck ? isActiveCheck(id) : false;

  return (
    <div className="space-y-3">
      {rows.map((row, ri) => (
        <div
          key={ri}
          className="grid gap-2"
          style={{
            gridTemplateColumns: row.offset ? "repeat(3, 1fr)" : "repeat(4, 1fr)",
            paddingLeft: row.offset ? "calc(12.5% - 2px)" : undefined,
            paddingRight: row.offset ? "calc(12.5% - 2px)" : undefined,
          }}
        >
          {row.items.map((s) => (
            <div key={s.id} className="max-w-[80px] mx-auto w-full">
              <VibesTile
                name={s.name}
                iconUrl={s.icon_url}
                isActive={checkActive(s.id)}
                onToggle={() => onToggle(s)}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
});
