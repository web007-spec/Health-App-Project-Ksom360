import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

interface CardLayoutPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentLayout: string;
  onSelect: (layout: string) => void;
}

const layouts = [
  {
    id: "large",
    label: "Large Cards",
    icon: (
      <div className="w-full aspect-[4/3] border border-border rounded-md flex items-end p-2">
        <div className="w-3/4 h-3/5 bg-muted-foreground/20 rounded" />
      </div>
    ),
  },
  {
    id: "square",
    label: "Squares",
    icon: (
      <div className="w-full aspect-[4/3] border border-border rounded-md flex items-center justify-center gap-2 p-2">
        <div className="w-10 h-10 border-2 border-primary rounded" />
        <div className="w-10 h-10 border-2 border-primary rounded" />
      </div>
    ),
  },
  {
    id: "narrow",
    label: "Narrow cards",
    icon: (
      <div className="w-full aspect-[4/3] border border-border rounded-md flex items-center justify-center gap-1.5 p-2">
        <div className="w-7 h-12 bg-muted-foreground/20 rounded" />
        <div className="w-7 h-12 bg-muted-foreground/20 rounded" />
        <div className="w-7 h-12 bg-muted-foreground/20 rounded" />
      </div>
    ),
  },
  {
    id: "list",
    label: "List",
    icon: (
      <div className="w-full aspect-[4/3] border border-border rounded-md flex flex-col justify-center gap-1.5 p-2">
        <div className="flex gap-1.5 items-center">
          <div className="w-5 h-4 bg-muted-foreground/20 rounded" />
          <div className="flex-1 h-3 bg-muted-foreground/20 rounded" />
        </div>
        <div className="flex gap-1.5 items-center">
          <div className="w-5 h-4 bg-muted-foreground/20 rounded" />
          <div className="flex-1 h-3 bg-muted-foreground/20 rounded" />
        </div>
      </div>
    ),
  },
];

export function CardLayoutPicker({
  open,
  onOpenChange,
  currentLayout,
  onSelect,
}: CardLayoutPickerProps) {
  const [selected, setSelected] = useState(currentLayout);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            onOpenChange(true);
          }}
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          Format
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-5" align="end" side="bottom">
        <h3 className="text-lg font-semibold text-foreground mb-4">Choose card design</h3>

        <div className="grid grid-cols-4 gap-3">
          {layouts.map((layout) => (
            <button
              key={layout.id}
              type="button"
              onClick={() => setSelected(layout.id)}
              className={cn(
                "flex flex-col items-center gap-2 p-2 rounded-lg border-2 transition-colors",
                selected === layout.id
                  ? "border-primary bg-primary/5"
                  : "border-transparent hover:border-border"
              )}
            >
              {layout.icon}
              <span className="text-xs font-medium text-foreground">{layout.label}</span>
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              onSelect(selected);
              onOpenChange(false);
            }}
          >
            Update
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
