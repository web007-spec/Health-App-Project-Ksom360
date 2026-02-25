import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Search, Share2, X } from "lucide-react";

interface CreateOndemandWorkoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presetType?: "regular" | "video";
  categoryId?: string | null;
}

export function CreateOndemandWorkoutDialog({
  open,
  onOpenChange,
  presetType = "regular",
  categoryId,
}: CreateOndemandWorkoutDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [workoutSearch, setWorkoutSearch] = useState("");
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const [showMoreLabels, setShowMoreLabels] = useState(false);

  const workoutType = presetType;

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

  // Fetch workout library for "copy from library" search
  const { data: libraryWorkouts } = useQuery({
    queryKey: ["workout-library-search", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_plans")
        .select("id, name")
        .eq("trainer_id", user?.id)
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && open && workoutType === "regular",
  });

  const filteredLibrary = libraryWorkouts?.filter((w) =>
    w.name.toLowerCase().includes(workoutSearch.toLowerCase())
  );

  const levelLabels = labels?.filter((l) => l.category === "level") || [];
  const durationLabels = labels?.filter((l) => l.category === "duration") || [];
  const intensityLabels = labels?.filter((l) => l.category === "intensity") || [];
  const typeLabels = labels?.filter((l) => l.category === "type") || [];
  const bodyPartLabels = labels?.filter((l) => l.category === "body_part") || [];
  const locationLabels = labels?.filter((l) => l.category === "location") || [];

  const extraLabelGroups = [
    { name: "Intensity", items: intensityLabels },
    { name: "Type", items: typeLabels },
    { name: "Body Part", items: bodyPartLabels },
    { name: "Location", items: locationLabels },
  ].filter((g) => g.items.length > 0);

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
          source_workout_id: selectedWorkoutId,
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

      // If categoryId provided, also add to category
      if (categoryId) {
        const { data: maxRow } = await supabase
          .from("category_workouts")
          .select("order_index")
          .eq("category_id", categoryId)
          .order("order_index", { ascending: false })
          .limit(1);

        const maxOrder = maxRow?.[0]?.order_index ?? -1;

        const { error: catError } = await supabase
          .from("category_workouts")
          .insert({
            category_id: categoryId,
            workout_id: workout.id,
            order_index: maxOrder + 1,
          });
        if (catError) throw catError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ondemand-workouts"] });
      queryClient.invalidateQueries({ queryKey: ["workout-collection"] });
      queryClient.invalidateQueries({ queryKey: ["category-workout-ids"] });
      toast({ title: "Workout added successfully" });
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
    setWorkoutSearch("");
    setSelectedWorkoutId(null);
    setShowMoreLabels(false);
  };

  const toggleLabel = (labelId: string, category: string) => {
    // For level/duration, allow only one per category
    const categoryLabels =
      category === "level" ? levelLabels :
      category === "duration" ? durationLabels : [];

    if (categoryLabels.length > 0) {
      const otherIds = categoryLabels.map((l) => l.id);
      setSelectedLabels((prev) => {
        const filtered = prev.filter((id) => !otherIds.includes(id));
        return prev.includes(labelId) ? filtered : [...filtered, labelId];
      });
    } else {
      setSelectedLabels((prev) =>
        prev.includes(labelId)
          ? prev.filter((id) => id !== labelId)
          : [...prev, labelId]
      );
    }
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      toast({ title: "Please enter a workout name", variant: "destructive" });
      return;
    }
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* Header area */}
        <div className="p-6 pb-0 space-y-5">
          {/* Name input - large, borderless */}
          <div className="flex items-center gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name your Workout"
              className="flex-1 text-2xl font-medium text-foreground placeholder:text-muted-foreground/50 bg-transparent border-none outline-none"
            />
            <button className="text-muted-foreground hover:text-foreground">
              <Share2 className="h-5 w-5" />
            </button>
          </div>

          {/* Description */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Description
            </p>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description"
              className="w-full text-sm text-foreground placeholder:text-muted-foreground/50 bg-transparent border-none outline-none"
            />
          </div>

          {/* Video URL (only for video type) */}
          {workoutType === "video" && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Video URL
              </p>
              <Input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
          )}

          {/* Add Workout - copy from library */}
          {workoutType === "regular" && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Add Workout
              </p>
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <p className="text-sm text-muted-foreground">
                  Copy a workout from your Workout library
                </p>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={workoutSearch}
                    onChange={(e) => setWorkoutSearch(e.target.value)}
                    placeholder="Search by workout name"
                    className="pl-10 bg-background"
                  />
                </div>
                {workoutSearch && filteredLibrary && filteredLibrary.length > 0 && (
                  <div className="bg-background rounded-md border border-border max-h-40 overflow-y-auto">
                    {filteredLibrary.map((w) => (
                      <button
                        key={w.id}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${
                          selectedWorkoutId === w.id ? "bg-accent font-medium" : ""
                        }`}
                        onClick={() => {
                          setSelectedWorkoutId(w.id);
                          setWorkoutSearch(w.name);
                        }}
                      >
                        {w.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Workout Labels */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Workout Labels
              </p>
              {extraLabelGroups.length > 0 && (
                <button
                  className="text-sm font-medium text-primary hover:underline"
                  onClick={() => setShowMoreLabels(!showMoreLabels)}
                >
                  {showMoreLabels ? "- Less Labels" : "+ More Labels"}
                </button>
              )}
            </div>
            <div className="bg-muted/50 rounded-lg p-4 space-y-4">
              {/* Level */}
              <div className="flex items-start gap-4">
                <span className="text-sm font-semibold text-primary min-w-[70px] pt-1">Level</span>
                <div className="flex flex-wrap gap-2">
                  {levelLabels.map((label) => (
                    <button
                      key={label.id}
                      onClick={() => toggleLabel(label.id, "level")}
                      className={`px-3 py-1.5 rounded-md border text-sm transition-colors ${
                        selectedLabels.includes(label.id)
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-border bg-background text-foreground hover:border-primary/50"
                      }`}
                    >
                      {label.value}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div className="flex items-start gap-4">
                <span className="text-sm font-semibold text-primary min-w-[70px] pt-1">Duration</span>
                <div className="flex flex-wrap gap-2">
                  {durationLabels.map((label) => (
                    <button
                      key={label.id}
                      onClick={() => toggleLabel(label.id, "duration")}
                      className={`px-3 py-1.5 rounded-md border text-sm transition-colors ${
                        selectedLabels.includes(label.id)
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-border bg-background text-foreground hover:border-primary/50"
                      }`}
                    >
                      {label.value}
                    </button>
                  ))}
                </div>
              </div>

              {/* Extra label groups */}
              {showMoreLabels && extraLabelGroups.map((group) => (
                <div key={group.name} className="flex items-start gap-4">
                  <span className="text-sm font-semibold text-primary min-w-[70px] pt-1">{group.name}</span>
                  <div className="flex flex-wrap gap-2">
                    {group.items.map((label) => (
                      <button
                        key={label.id}
                        onClick={() => toggleLabel(label.id, label.category)}
                        className={`px-3 py-1.5 rounded-md border text-sm transition-colors ${
                          selectedLabels.includes(label.id)
                            ? "border-primary bg-primary/10 text-primary font-medium"
                            : "border-border bg-background text-foreground hover:border-primary/50"
                        }`}
                      >
                        {label.value}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-3 p-6 pt-4 border-t border-border mt-4">
          <Button
            variant="outline"
            className="min-w-[100px]"
            onClick={() => {
              onOpenChange(false);
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button
            className="min-w-[120px]"
            onClick={handleSubmit}
            disabled={createMutation.isPending || !name.trim()}
          >
            {createMutation.isPending ? "Adding..." : "Add Workout"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
