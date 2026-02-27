import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ICON_OPTIONS } from "@/components/cardio/cardioActivities";
import { cn } from "@/lib/utils";
import { Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface AddCardioActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (name: string, iconName: string, iconUrl?: string | null) => void;
}

export function AddCardioActivityDialog({ open, onOpenChange, onAdd }: AddCardioActivityDialogProps) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("activity");
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user?.id}/cardio-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("task-icons").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("task-icons").getPublicUrl(path);
      setIconUrl(publicUrl);
      setSelectedIcon("custom");
    } catch {
      console.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    onAdd(name.trim(), iconUrl ? "custom" : selectedIcon, iconUrl);
    setName("");
    setSelectedIcon("activity");
    setIconUrl(null);
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

          {iconUrl && (
            <div className="space-y-1">
              <Label>Custom Icon</Label>
              <div className="flex items-center gap-2">
                <div className="h-12 w-12 rounded-lg border-2 border-primary bg-primary/10 flex items-center justify-center overflow-hidden">
                  <img src={iconUrl} alt="Custom icon" className="h-8 w-8 object-contain" />
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setIconUrl(null); setSelectedIcon("activity"); }}>
                  <X className="h-4 w-4 mr-1" /> Remove
                </Button>
              </div>
            </div>
          )}

          <div>
            <Label>{iconUrl ? "Or choose a built-in icon" : "Icon"}</Label>
            <div className="grid grid-cols-6 gap-2 mt-2">
              {ICON_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.name}
                    type="button"
                    onClick={() => { setSelectedIcon(opt.name); setIconUrl(null); }}
                    className={cn(
                      "flex items-center justify-center h-10 w-full rounded-lg border-2 transition-colors",
                      !iconUrl && selectedIcon === opt.name
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

          <div>
            <Label className="text-xs text-muted-foreground">Or upload your own icon (PNG, SVG, JPG)</Label>
            <label className="flex items-center gap-2 mt-1.5 cursor-pointer">
              <Button variant="outline" size="sm" className="gap-1.5 pointer-events-none" asChild>
                <span>
                  <Upload className="h-4 w-4" />
                  {uploading ? "Uploading…" : "Upload Icon"}
                </span>
              </Button>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={uploading}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
              />
            </label>
          </div>

          <Button className="w-full" onClick={handleSubmit} disabled={!name.trim()}>
            Add Activity
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}