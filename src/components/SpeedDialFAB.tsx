import { useState } from "react";
import { Plus, X, Dumbbell, Footprints, UtensilsCrossed, ScanBarcode, Camera, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpeedDialItem {
  label: string;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
  subItems?: { label: string; icon: React.ReactNode; onClick: () => void }[];
}

interface SpeedDialFABProps {
  items: SpeedDialItem[];
}

export function SpeedDialFAB({ items }: SpeedDialFABProps) {
  const [open, setOpen] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const handleItemClick = (item: SpeedDialItem, index: number) => {
    if (item.subItems && item.subItems.length > 0) {
      setExpandedIndex(expandedIndex === index ? null : index);
    } else {
      item.onClick();
      setOpen(false);
      setExpandedIndex(null);
    }
  };

  const handleSubItemClick = (subItem: { onClick: () => void }) => {
    subItem.onClick();
    setOpen(false);
    setExpandedIndex(null);
  };

  const handleClose = () => {
    setOpen(false);
    setExpandedIndex(null);
  };

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={handleClose}
        />
      )}

      {/* Menu items */}
      <div className="fixed bottom-36 right-4 z-50 flex flex-col-reverse items-end gap-3">
        {/* FAB Button */}
        <button
          onClick={() => (open ? handleClose() : setOpen(true))}
          className={cn(
            "w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200",
            open
              ? "bg-muted-foreground text-background rotate-0"
              : "bg-primary text-primary-foreground"
          )}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        </button>

        {/* Items */}
        {open &&
          items.map((item, i) => {
            const isExpanded = expandedIndex === i;
            return (
              <div key={i} className="flex flex-col items-end gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200" style={{ animationDelay: `${i * 40}ms` }}>
                {/* Sub-items */}
                {isExpanded &&
                  item.subItems?.map((sub, si) => (
                    <button
                      key={si}
                      onClick={() => handleSubItemClick(sub)}
                      className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-1 duration-150"
                      style={{ animationDelay: `${si * 30}ms` }}
                    >
                      <span className="text-sm font-medium text-background bg-black/60 px-3 py-1 rounded-full whitespace-nowrap">
                        {sub.label}
                      </span>
                      <div className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center text-foreground">
                        {sub.icon}
                      </div>
                    </button>
                  ))}

                {/* Main item */}
                <button
                  onClick={() => handleItemClick(item, i)}
                  className="flex items-center gap-3"
                >
                  <span className="text-sm font-semibold text-background bg-black/60 px-3 py-1.5 rounded-full whitespace-nowrap">
                    {item.label}
                  </span>
                  <div
                    className="w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-white"
                    style={{ backgroundColor: item.color }}
                  >
                    {item.icon}
                  </div>
                </button>
              </div>
            );
          })}
      </div>
    </>
  );
}
