import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ICON_OPTIONS, getIconComponent } from "@/components/cardio/cardioActivities";
import { cn } from "@/lib/utils";

interface AddCardioActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (name: string, iconName: string) => void;
}

export function AddCardioActivityDialog({ open, onOpenChange, onAdd }: AddCardioActivityDialogProps) {
  const [name, setName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("activity");

  const handleSubmit = () => {
    if (!name.trim()) return;
    onAdd(name.trim(), selectedIcon);
    setName("");
    setSelectedIcon("activity");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Activity</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Activity Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Lacrosse" autoFocus />
          </div>
          <div>
            <Label>Icon</Label>
            <div className="grid grid-cols-6 gap-2 mt-2">
              {ICON_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.name}
                    type="button"
                    onClick={() => setSelectedIcon(opt.name)}
                    className={cn(
                      "flex items-center justify-center h-10 w-full rounded-lg border-2 transition-colors",
                      selectedIcon === opt.name
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/40"
                    )}
                    title={opt.label}
                  >
                    <Icon className="h-5 w-5" />
                  </button>
                );
              })}
            </div>
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={!name.trim()}>
            Add Activity
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
