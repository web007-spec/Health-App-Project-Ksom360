import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
      <div className="w-12 h-16 border-2 border-current rounded flex flex-col">
        <div className="flex-1 border-b border-current" />
        <div className="h-4" />
      </div>
    ),
  },
  {
    id: "square",
    label: "Squares",
    icon: (
      <div className="w-16 h-10 flex gap-1">
        <div className="flex-1 border-2 border-current rounded" />
        <div className="flex-1 border-2 border-current rounded" />
      </div>
    ),
  },
  {
    id: "narrow",
    label: "Narrow Cards",
    icon: (
      <div className="w-16 h-10 flex gap-1">
        <div className="w-5 border-2 border-current rounded" />
        <div className="w-5 border-2 border-current rounded" />
        <div className="w-5 border-2 border-current rounded" />
      </div>
    ),
  },
  {
    id: "list",
    label: "List",
    icon: (
      <div className="w-16 h-10 flex flex-col gap-1">
        <div className="flex gap-1 flex-1">
          <div className="w-4 border-2 border-current rounded" />
          <div className="flex-1 border-2 border-current rounded" />
        </div>
        <div className="flex gap-1 flex-1">
          <div className="w-4 border-2 border-current rounded" />
          <div className="flex-1 border-2 border-current rounded" />
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Choose card design</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-4 gap-3">
          {layouts.map((layout) => (
            <button
              key={layout.id}
              type="button"
              onClick={() => setSelected(layout.id)}
              className={cn(
                "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors",
                selected === layout.id
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50"
              )}
            >
              {layout.icon}
              <span className="text-[10px] font-medium">{layout.label}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              onSelect(selected);
              onOpenChange(false);
            }}
          >
            Update
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
