import { useState, useRef } from "react";
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
import { Search, Share2, X, ImagePlus, Dumbbell } from "lucide-react";

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
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [workoutSearch, setWorkoutSearch] = useState("");
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const [selectedWorkoutData, setSelectedWorkoutData] = useState<{ name: string; exerciseCount: number; sectionCount: number; imageUrl: string | null } | null>(null);
  const [showMoreLabels, setShowMoreLabels] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const thumbInputRef = useRef<HTMLInputElement>(null);

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
        .select(`
          id, name, image_url,
          workout_sections(
            id,
            workout_plan_exercises(id)
          )
        `)
        .eq("trainer_id", user?.id)
        .order("name", { ascending: true });
      if (error) throw error;
      return data?.map((w: any) => {
        const sections = w.workout_sections || [];
        const exerciseCount = sections.reduce(
          (sum: number, s: any) => sum + (s.workout_plan_exercises?.length || 0),
          0
        );
        return { id: w.id, name: w.name, exerciseCount, sectionCount: sections.length, imageUrl: w.image_url || null };
      });
    },
    enabled: !!user?.id && open && workoutType === "regular",
  });

  const filteredLibrary = workoutSearch.trim()
    ? libraryWorkouts?.filter((w) =>
        w.name.toLowerCase().includes(workoutSearch.toLowerCase())
      )
    : libraryWorkouts;

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
      let finalThumbnailUrl = thumbnailUrl || null;

      // Upload thumbnail file if selected
      if (thumbnailFile && user) {
        const ext = thumbnailFile.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("workout-covers")
          .upload(path, thumbnailFile, { contentType: thumbnailFile.type, upsert: false });
        if (uploadErr) throw uploadErr;
        const { data: { publicUrl } } = supabase.storage.from("workout-covers").getPublicUrl(path);
        finalThumbnailUrl = publicUrl;
      }

      const { data: workout, error: workoutError } = await supabase
        .from("ondemand_workouts")
        .insert({
          name,
          description,
          type: workoutType,
          video_url: workoutType === "video" ? videoUrl : null,
          thumbnail_url: finalThumbnailUrl,
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
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setSelectedLabels([]);
    setWorkoutSearch("");
    setSelectedWorkoutId(null);
    setSelectedWorkoutData(null);
    setShowMoreLabels(false);
    setShowSearchResults(false);
  };

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
  };

  const handleSelectWorkout = (w: { id: string; name: string; exerciseCount: number; sectionCount: number; imageUrl: string | null }) => {
    setSelectedWorkoutId(w.id);
    setSelectedWorkoutData(w);
    setWorkoutSearch("");
    setShowSearchResults(false);
    // Don't auto-fill name — user names the on-demand workout independently
    // Use the workout's cover image as thumbnail if we don't have one
    if (!thumbnailPreview && !thumbnailUrl && w.imageUrl) {
      setThumbnailUrl(w.imageUrl);
    }
  };

  const handleClearWorkout = () => {
    setSelectedWorkoutId(null);
    setSelectedWorkoutData(null);
    setWorkoutSearch("");
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
          {/* Name input + thumbnail */}
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name your Workout"
                className="w-full text-2xl font-medium text-foreground placeholder:text-muted-foreground/50 bg-transparent border-none outline-none"
              />
            </div>
            {/* Thumbnail upload */}
            <input ref={thumbInputRef} type="file" accept="image/*" className="hidden" onChange={handleThumbnailSelect} />
            <button
              onClick={() => thumbInputRef.current?.click()}
              className="h-16 w-16 rounded-lg border border-border bg-muted/50 flex items-center justify-center overflow-hidden flex-shrink-0 hover:border-primary/50 transition-colors"
            >
              {thumbnailPreview || thumbnailUrl ? (
                <img src={thumbnailPreview || thumbnailUrl} alt="Cover" className="h-full w-full object-cover" />
              ) : (
                <ImagePlus className="h-6 w-6 text-muted-foreground" />
              )}
            </button>
            <button className="text-muted-foreground hover:text-foreground mt-1">
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

                {/* Show selected workout card OR search */}
                {selectedWorkoutData ? (
                  <div className="bg-background rounded-md border border-border p-3 flex items-center gap-3">
                    {selectedWorkoutData.imageUrl ? (
                      <img src={selectedWorkoutData.imageUrl} alt="" className="h-14 w-20 rounded-md object-cover flex-shrink-0" />
                    ) : (
                      <div className="h-14 w-20 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                        <Dumbbell className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground">{selectedWorkoutData.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedWorkoutData.exerciseCount} Exercises • {selectedWorkoutData.sectionCount} Sections
                      </p>
                    </div>
                    <button onClick={handleClearWorkout} className="text-muted-foreground hover:text-destructive p-1">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={workoutSearch}
                        onChange={(e) => {
                          setWorkoutSearch(e.target.value);
                          setShowSearchResults(true);
                        }}
                        onFocus={() => setShowSearchResults(true)}
                        placeholder="Search by workout name"
                        className="pl-10 bg-background"
                      />
                    </div>
                    {showSearchResults && filteredLibrary && filteredLibrary.length > 0 && (
                      <div className="bg-background rounded-md border border-border max-h-48 overflow-y-auto shadow-lg">
                        {filteredLibrary.map((w) => (
                          <button
                            key={w.id}
                            className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-accent transition-colors border-b border-border last:border-b-0"
                            onClick={() => handleSelectWorkout(w)}
                          >
                            {w.imageUrl ? (
                              <img src={w.imageUrl} alt="" className="h-10 w-14 rounded object-cover flex-shrink-0" />
                            ) : (
                              <div className="h-10 w-14 rounded bg-muted flex items-center justify-center flex-shrink-0">
                                <Dumbbell className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-foreground">{w.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {w.exerciseCount} Exercises • {w.sectionCount} Sections
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
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
