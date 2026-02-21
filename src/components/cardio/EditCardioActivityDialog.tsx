import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ICON_OPTIONS } from "@/components/cardio/cardioActivities";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";

interface EditCardioActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: { id: string; name: string; icon_name: string } | null;
  onSave: (id: string, name: string, iconName: string) => void;
  onDelete: (id: string) => void;
}

export function EditCardioActivityDialog({ open, onOpenChange, activity, onSave, onDelete }: EditCardioActivityDialogProps) {
  const [name, setName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("activity");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (activity) {
      setName(activity.name);
      setSelectedIcon(activity.icon_name);
      setConfirmDelete(false);
    }
  }, [activity]);

  const handleSave = () => {
    if (!name.trim() || !activity) return;
    onSave(activity.id, name.trim(), selectedIcon);
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (!activity) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete(activity.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Activity</DialogTitle>
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
          <div className="flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" />
              {confirmDelete ? "Confirm Delete" : "Delete"}
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={!name.trim()}>
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
