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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

interface CreateOndemandWorkoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateOndemandWorkoutDialog({
  open,
  onOpenChange,
}: CreateOndemandWorkoutDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [workoutType, setWorkoutType] = useState<"regular" | "video">("video");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);

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

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: workout, error: workoutError } = await supabase
        .from("ondemand_workouts")
        .insert({
          name,
          description,
          type: workoutType,
          video_url: workoutType === "video" ? videoUrl : null,
          thumbnail_url: thumbnailUrl || null,
          trainer_id: user!.id,
        })
        .select()
        .single();

      if (workoutError) throw workoutError;

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
      toast({ title: "Workout created successfully" });
      onOpenChange(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to create workout", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setVideoUrl("");
    setThumbnailUrl("");
    setSelectedLabels([]);
    setWorkoutType("video");
  };

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

    // Check required labels
    const hasLevel = selectedLabels.some((id) =>
      levelLabels.some((l) => l.id === id)
    );
    const hasDuration = selectedLabels.some((id) =>
      durationLabels.some((l) => l.id === id)
    );

    if (!hasLevel || !hasDuration) {
      toast({
        title: "Please select Level and Duration labels",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create On-Demand Workout</DialogTitle>
          <DialogDescription>
            Add a workout to your on-demand library
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <Label>Workout Type</Label>
            <RadioGroup
              value={workoutType}
              onValueChange={(v) => setWorkoutType(v as any)}
            >
              <div className="flex items-center space-x-2 p-3 border rounded-lg">
                <RadioGroupItem value="video" id="video" />
                <Label htmlFor="video" className="cursor-pointer flex-1">
                  <div className="font-medium">Video Workout</div>
                  <div className="text-sm text-muted-foreground">
                    YouTube/Vimeo video link
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-lg">
                <RadioGroupItem value="regular" id="regular" />
                <Label htmlFor="regular" className="cursor-pointer flex-1">
                  <div className="font-medium">Regular Workout</div>
                  <div className="text-sm text-muted-foreground">
                    Copy from workout library
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Workout Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Full Body HIIT"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the workout..."
              rows={2}
            />
          </div>

          {workoutType === "video" && (
            <div className="space-y-2">
              <Label htmlFor="video">Video URL *</Label>
              <Input
                id="video"
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="thumbnail">Thumbnail URL</Label>
            <Input
              id="thumbnail"
              type="url"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-3">
            <Label>Workout Labels * (Level and Duration required)</Label>
            
            <div className="space-y-2">
              <div className="font-medium text-sm">Level</div>
              <div className="flex flex-wrap gap-2">
                {levelLabels.map((label) => (
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

            <div className="space-y-2">
              <div className="font-medium text-sm">Duration</div>
              <div className="flex flex-wrap gap-2">
                {durationLabels.map((label) => (
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
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Workout"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
