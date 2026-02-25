import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface EditOndemandWorkoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workout: any;
}

export function EditOndemandWorkoutDialog({
  open,
  onOpenChange,
  workout,
}: EditOndemandWorkoutDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [workoutType, setWorkoutType] = useState<"regular" | "video">("video");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);

  useEffect(() => {
    if (workout && open) {
      setName(workout.name || "");
      setDescription(workout.description || "");
      setWorkoutType(workout.type || "video");
      setVideoUrl(workout.video_url || "");
      setThumbnailUrl(workout.thumbnail_url || "");
      const existingLabelIds = workout.workout_workout_labels?.map(
        (l: any) => l.workout_labels?.id
      ).filter(Boolean) || [];
      setSelectedLabels(existingLabelIds);
    }
  }, [workout, open]);

  const { data: labels } = useQuery({
    queryKey: ["workout-labels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_labels")
        .select("*")
        .order("category", { ascending: true })
        .order("value", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const levelLabels = labels?.filter((l) => l.category === "level") || [];
  const durationLabels = labels?.filter((l) => l.category === "duration") || [];
  const intensityLabels = labels?.filter((l) => l.category === "intensity") || [];
  const typeLabels = labels?.filter((l) => l.category === "type") || [];
  const bodyPartLabels = labels?.filter((l) => l.category === "body_part") || [];
  const locationLabels = labels?.filter((l) => l.category === "location") || [];

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error: updateError } = await supabase
        .from("ondemand_workouts")
        .update({
          name,
          description,
          type: workoutType,
          video_url: workoutType === "video" ? videoUrl : null,
          thumbnail_url: thumbnailUrl || null,
        })
        .eq("id", workout.id);

      if (updateError) throw updateError;

      // Replace labels
      await supabase
        .from("workout_workout_labels")
        .delete()
        .eq("workout_id", workout.id);

      if (selectedLabels.length > 0) {
        const { error: labelsError } = await supabase
          .from("workout_workout_labels")
          .insert(
            selectedLabels.map((labelId) => ({
              workout_id: workout.id,
              label_id: labelId,
            }))
          );
        if (labelsError) throw labelsError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ondemand-workouts"] });
      toast({ title: "Workout updated successfully" });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Failed to update workout", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("ondemand_workouts")
        .delete()
        .eq("id", workout.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ondemand-workouts"] });
      toast({ title: "Workout deleted" });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Failed to delete workout", variant: "destructive" });
    },
  });

  const toggleLabel = (labelId: string) => {
    setSelectedLabels((prev) =>
      prev.includes(labelId)
        ? prev.filter((id) => id !== labelId)
        : [...prev, labelId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Please enter a workout name", variant: "destructive" });
      return;
    }
    if (workoutType === "video" && !videoUrl.trim()) {
      toast({ title: "Please enter a video URL", variant: "destructive" });
      return;
    }
    const hasLevel = selectedLabels.some((id) => levelLabels.some((l) => l.id === id));
    const hasDuration = selectedLabels.some((id) => durationLabels.some((l) => l.id === id));
    if (!hasLevel || !hasDuration) {
      toast({ title: "Level and Duration are required", variant: "destructive" });
      return;
    }
    updateMutation.mutate();
  };

  const renderLabelGroup = (title: string, items: any[], required = false) => {
    if (!items.length) return null;
    return (
      <div className="space-y-2">
        <div className={`font-medium text-sm ${required ? "text-red-500" : ""}`}>
          {title} {required && "*"}
        </div>
        <div className="flex flex-wrap gap-2">
          {items.map((label) => (
            <Badge
              key={label.id}
              variant={selectedLabels.includes(label.id) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleLabel(label.id)}
            >
              {label.value}
            </Badge>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit On-Demand Workout</DialogTitle>
          <DialogDescription>Update workout details</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <Label>Workout Type</Label>
            <RadioGroup value={workoutType} onValueChange={(v) => setWorkoutType(v as any)}>
              <div className="flex items-center space-x-2 p-3 border rounded-lg">
                <RadioGroupItem value="video" id="edit-video" />
                <Label htmlFor="edit-video" className="cursor-pointer flex-1">
                  <div className="font-medium">Video Workout</div>
                  <div className="text-sm text-muted-foreground">YouTube/Vimeo video link</div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-lg">
                <RadioGroupItem value="regular" id="edit-regular" />
                <Label htmlFor="edit-regular" className="cursor-pointer flex-1">
                  <div className="font-medium">Regular Workout</div>
                  <div className="text-sm text-muted-foreground">Copy from workout library</div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-name">Workout Name *</Label>
            <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea id="edit-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>

          {workoutType === "video" && (
            <div className="space-y-2">
              <Label htmlFor="edit-video-url">Video URL *</Label>
              <Input id="edit-video-url" type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} required />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-thumbnail">Thumbnail URL</Label>
            <Input id="edit-thumbnail" type="url" value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} />
          </div>

          <div className="space-y-3">
            <Label>Workout Labels (Level & Duration required)</Label>
            {renderLabelGroup("Level", levelLabels, true)}
            {renderLabelGroup("Duration", durationLabels, true)}
            {renderLabelGroup("Intensity", intensityLabels)}
            {renderLabelGroup("Type", typeLabels)}
            {renderLabelGroup("Body Part", bodyPartLabels)}
            {renderLabelGroup("Location", locationLabels)}
          </div>

          <div className="flex gap-2 pt-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" size="icon">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete workout?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete "{workout?.name}" and remove it from any collections.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteMutation.mutate()}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
