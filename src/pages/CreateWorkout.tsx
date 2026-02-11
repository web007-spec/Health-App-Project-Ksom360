import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, X, GripVertical, Copy, Trash2, Timer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CreateFromTemplateDialog } from "@/components/CreateFromTemplateDialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface WorkoutExercise {
  id: string;
  exercise_id: string;
  sets: number;
  target_type: "reps" | "time" | "text";
  target_value: string;
  rest_seconds: number;
  exercise_type: "normal" | "rest";
  selected: boolean;
}

// Sortable exercise row component
function SortableExerciseRow({
  item,
  exerciseInfo,
  onUpdate,
  onDelete,
  onToggleSelect,
  getExerciseThumbnail,
}: {
  item: WorkoutExercise;
  exerciseInfo: any;
  onUpdate: (id: string, updates: Partial<WorkoutExercise>) => void;
  onDelete: (id: string) => void;
  onToggleSelect: (id: string) => void;
  getExerciseThumbnail: (ex: any) => string | null;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (item.exercise_type === "rest") {
    return (
      <div ref={setNodeRef} style={style} className="flex items-center gap-3 px-4 py-2 border-b bg-amber-50 dark:bg-amber-950/20">
        <Checkbox
          checked={item.selected}
          onCheckedChange={() => onToggleSelect(item.id)}
        />
        <div className="w-10 h-10 rounded bg-amber-400 flex items-center justify-center text-lg">
          ✋
        </div>
        <span className="text-sm font-medium flex-1">Rest</span>
        <Select
          value={String(item.rest_seconds)}
          onValueChange={(v) => onUpdate(item.id, { rest_seconds: parseInt(v) })}
        >
          <SelectTrigger className="h-8 w-24 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[30, 35, 40, 45, 50, 55, 60, 90, 120, 150, 180].map((s) => (
              <SelectItem key={s} value={String(s)}>{s} sec</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div {...attributes} {...listeners} className="cursor-grab p-1">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    );
  }

  const thumbnail = exerciseInfo ? getExerciseThumbnail(exerciseInfo) : null;

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 px-4 py-2 border-b hover:bg-muted/30 transition-colors">
      <Checkbox
        checked={item.selected}
        onCheckedChange={() => onToggleSelect(item.id)}
      />
      {/* Thumbnail */}
      <div className="w-10 h-10 rounded bg-muted overflow-hidden shrink-0">
        {thumbnail ? (
          <img src={thumbnail} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
            <GripVertical className="h-4 w-4 opacity-30" />
          </div>
        )}
      </div>
      {/* Exercise Name */}
      <span className="text-sm font-medium w-36 truncate shrink-0" title={exerciseInfo?.name}>
        {exerciseInfo?.name || "Unknown"}
      </span>
      {/* Sets */}
      <Input
        type="number"
        value={item.sets}
        onChange={(e) => onUpdate(item.id, { sets: parseInt(e.target.value) || 1 })}
        className="h-8 w-14 text-center text-sm"
      />
      {/* X separator */}
      <span className="text-muted-foreground text-xs">X</span>
      {/* Target Type Dropdown */}
      <Select
        value={item.target_type}
        onValueChange={(v: "reps" | "time" | "text") => onUpdate(item.id, { target_type: v })}
      >
        <SelectTrigger className="h-8 w-16 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="reps">
            <span className="flex items-center gap-1">🔢</span>
          </SelectItem>
          <SelectItem value="time">time</SelectItem>
          <SelectItem value="text">text</SelectItem>
        </SelectContent>
      </Select>
      {/* Target Value */}
      <Input
        value={item.target_value}
        onChange={(e) => onUpdate(item.id, { target_value: e.target.value })}
        placeholder={item.target_type === "reps" ? "reps, weight, tempo, etc" : item.target_type === "time" ? "e.g. 30 sec" : "notes..."}
        className="h-8 flex-1 text-sm min-w-0"
      />
      {/* Rest Period */}
      <Select
        value={String(item.rest_seconds)}
        onValueChange={(v) => onUpdate(item.id, { rest_seconds: parseInt(v) })}
      >
        <SelectTrigger className="h-8 w-24 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {[30, 35, 40, 45, 50, 55, 60, 90, 120, 150, 180].map((s) => (
            <SelectItem key={s} value={String(s)}>{s} sec</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {/* Drag Handle */}
      <div {...attributes} {...listeners} className="cursor-grab p-1">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
}

export default function CreateWorkout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [workoutName, setWorkoutName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [durationMinutes, setDurationMinutes] = useState(30);

  const [exerciseItems, setExerciseItems] = useState<WorkoutExercise[]>([]);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor));

  const { data: exercises } = useQuery({
    queryKey: ["exercises", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercises")
        .select("*")
        .eq("trainer_id", user?.id)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const filteredExercises = exercises
    ?.filter((ex) =>
      ex.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
      ex.muscle_group?.toLowerCase().includes(exerciseSearch.toLowerCase())
    )
    ?.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "muscle_group") return (a.muscle_group || "").localeCompare(b.muscle_group || "");
      return 0;
    });

  const getExerciseThumbnail = (exercise: any) => {
    if (exercise.image_url) return exercise.image_url;
    if (exercise.video_url) {
      const ytMatch = exercise.video_url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (ytMatch) return `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg`;
    }
    return null;
  };

  const isDirectVideo = (url: string) => /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);

  const getExerciseById = (id: string) => exercises?.find((e) => e.id === id);

  // Add exercise from library
  const addExercise = (exerciseId: string) => {
    const newItem: WorkoutExercise = {
      id: crypto.randomUUID(),
      exercise_id: exerciseId,
      sets: 3,
      target_type: "reps",
      target_value: "",
      rest_seconds: 90,
      exercise_type: "normal",
      selected: false,
    };
    setExerciseItems((prev) => [...prev, newItem]);
  };

  // Add rest
  const addRest = () => {
    const newItem: WorkoutExercise = {
      id: crypto.randomUUID(),
      exercise_id: "",
      sets: 0,
      target_type: "text",
      target_value: "",
      rest_seconds: 90,
      exercise_type: "rest",
      selected: false,
    };
    setExerciseItems((prev) => [...prev, newItem]);
  };

  const updateItem = (id: string, updates: Partial<WorkoutExercise>) => {
    setExerciseItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const deleteItem = (id: string) => {
    setExerciseItems((prev) => prev.filter((item) => item.id !== id));
  };

  const toggleSelect = (id: string) => {
    setExerciseItems((prev) => prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item)));
  };

  const toggleSelectAll = () => {
    const allSelected = exerciseItems.every((i) => i.selected);
    setExerciseItems((prev) => prev.map((item) => ({ ...item, selected: !allSelected })));
  };

  const deleteSelected = () => {
    setExerciseItems((prev) => prev.filter((item) => !item.selected));
  };

  const duplicateSelected = () => {
    const selected = exerciseItems.filter((i) => i.selected);
    const copies = selected.map((item) => ({ ...item, id: crypto.randomUUID(), selected: false }));
    setExerciseItems((prev) => [...prev, ...copies]);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setExerciseItems((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const createWorkoutMutation = useMutation({
    mutationFn: async () => {
      const { data: workout, error: workoutError } = await supabase
        .from("workout_plans")
        .insert({
          name: workoutName,
          description: instructions,
          category: category,
          difficulty: difficulty,
          duration_minutes: durationMinutes,
          trainer_id: user?.id,
        })
        .select()
        .single();

      if (workoutError) throw workoutError;

      // Create a single default section
      const { data: section, error: sectionError } = await supabase
        .from("workout_sections")
        .insert({
          workout_plan_id: workout.id,
          name: "Main",
          section_type: "straight_set",
          order_index: 0,
          rounds: 1,
        })
        .select()
        .single();

      if (sectionError) throw sectionError;

      // Insert exercises
      const exercisesToInsert = exerciseItems
        .filter((item) => item.exercise_type === "normal")
        .map((item, index) => ({
          workout_plan_id: workout.id,
          section_id: section.id,
          exercise_id: item.exercise_id,
          order_index: index,
          sets: item.sets,
          reps: item.target_type === "reps" ? parseInt(item.target_value) || null : null,
          duration_seconds: item.target_type === "time" ? parseInt(item.target_value) || null : null,
          rest_seconds: item.rest_seconds,
          notes: item.target_type === "text" ? item.target_value : "",
          exercise_type: item.exercise_type,
          tempo: "",
        }));

      if (exercisesToInsert.length > 0) {
        const { error: exercisesError } = await supabase
          .from("workout_plan_exercises")
          .insert(exercisesToInsert);
        if (exercisesError) throw exercisesError;
      }

      return workout;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-plans"] });
      toast({ title: "Success!", description: "Workout created" });
      navigate("/workouts");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (!workoutName.trim()) {
      toast({ title: "Missing name", description: "Enter a workout name", variant: "destructive" });
      return;
    }
    if (!category.trim()) {
      toast({ title: "Missing category", description: "Enter a category", variant: "destructive" });
      return;
    }
    const hasExercises = exerciseItems.some((i) => i.exercise_type === "normal");
    if (!hasExercises) {
      toast({ title: "No exercises", description: "Add at least one exercise", variant: "destructive" });
      return;
    }
    createWorkoutMutation.mutate();
  };

  const anySelected = exerciseItems.some((i) => i.selected);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-card border-b shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Regular workout:</span>
          <Input
            value={workoutName}
            onChange={(e) => setWorkoutName(e.target.value)}
            placeholder="Workout name"
            className="h-8 w-64 font-semibold text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={createWorkoutMutation.isPending}
            className="bg-primary text-primary-foreground px-6"
          >
            {createWorkoutMutation.isPending ? "Saving..." : "SAVE"}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate("/workouts")} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Builder */}
        <div className="flex-1 flex flex-col overflow-hidden border-r">
          {/* Instructions */}
          <div className="px-4 pt-4 pb-2">
            <p className="text-xs font-bold uppercase tracking-wide mb-1">Instructions</p>
            <p className="text-xs text-muted-foreground mb-2">
              (Optional) A short summary of this workout or general cues during workout.
            </p>
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Add rest times and any weight/rep/tempo targets with each exercise so the client can follow along with the mobile app."
              className="text-sm min-h-[50px] resize-none"
              rows={2}
            />
          </div>

          {/* Workout Settings (hidden compact row) */}
          <div className="flex items-center gap-3 px-4 py-2 border-b text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Category:</span>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Strength"
                className="h-7 w-28 text-xs"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Difficulty:</span>
              <Select value={difficulty} onValueChange={(v: any) => setDifficulty(v)}>
                <SelectTrigger className="h-7 w-28 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Duration:</span>
              <Input
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
                className="h-7 w-14 text-xs"
              />
              <span className="text-muted-foreground">min</span>
            </div>
          </div>

          {/* Exercises Header */}
          <div className="px-4 pt-3 pb-1">
            <p className="text-xs font-bold uppercase tracking-wide">Exercises</p>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-1 px-4 py-2 border-b">
            <Checkbox
              checked={exerciseItems.length > 0 && exerciseItems.every((i) => i.selected)}
              onCheckedChange={toggleSelectAll}
            />
            <Button variant="outline" size="sm" className="text-xs h-7 ml-2" disabled={!anySelected}>
              SUPERSET
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-7" disabled={!anySelected}>
              CIRCUIT
            </Button>
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={duplicateSelected} disabled={!anySelected}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={deleteSelected} disabled={!anySelected}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            <div className="flex-1" />
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={addRest}>
              <Timer className="h-3.5 w-3.5 mr-1" />
              ADD REST
            </Button>
          </div>

          {/* Column Headers */}
          <div className="flex items-center gap-3 px-4 py-1.5 text-[11px] text-muted-foreground uppercase tracking-wide border-b bg-muted/20">
            <div className="w-5" />
            <div className="w-10" />
            <div className="w-36">Exercise Name</div>
            <div className="w-14 text-center">Sets</div>
            <div className="w-4" />
            <div className="w-16">Target</div>
            <div className="flex-1" />
            <div className="w-24">Rest Period</div>
            <div className="w-6" />
          </div>

          {/* Exercise List */}
          <ScrollArea className="flex-1">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={exerciseItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                {exerciseItems.map((item) => (
                  <SortableExerciseRow
                    key={item.id}
                    item={item}
                    exerciseInfo={getExerciseById(item.exercise_id)}
                    onUpdate={updateItem}
                    onDelete={deleteItem}
                    onToggleSelect={toggleSelect}
                    getExerciseThumbnail={getExerciseThumbnail}
                  />
                ))}
              </SortableContext>
            </DndContext>

            {exerciseItems.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-3 text-5xl opacity-30">💪</div>
                <p className="text-sm text-muted-foreground font-medium">
                  Workouts require at least one exercise
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Click an exercise from the library to add it
                </p>
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right Panel - Exercise Library */}
        <div className="w-[520px] flex flex-col overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search for an exercise"
                value={exerciseSearch}
                onChange={(e) => setExerciseSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center justify-between">
              <Button
                variant="link"
                size="sm"
                className="text-primary p-0 h-auto text-xs"
                onClick={() => navigate("/exercises")}
              >
                + Add custom exercise
              </Button>
              <div className="flex items-center gap-1">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-7 w-24 text-xs border-none shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="muscle_group">Muscle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Exercise Grid */}
          <ScrollArea className="flex-1">
            <div className="p-3 grid grid-cols-3 gap-2">
              {filteredExercises?.map((exercise) => {
                const thumbnail = getExerciseThumbnail(exercise);
                const hasVideo = exercise.video_url && isDirectVideo(exercise.video_url);

                return (
                  <div
                    key={exercise.id}
                    className="group cursor-pointer rounded-lg border bg-card hover:border-primary hover:shadow-md transition-all overflow-hidden"
                    onClick={() => addExercise(exercise.id)}
                  >
                    <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                      {hasVideo ? (
                        <video
                          src={exercise.video_url!}
                          className="w-full h-full object-cover"
                          muted
                          loop
                          playsInline
                          onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                          onMouseLeave={(e) => {
                            const vid = e.target as HTMLVideoElement;
                            vid.pause();
                            vid.currentTime = 0;
                          }}
                        />
                      ) : thumbnail ? (
                        <img src={thumbnail} alt={exercise.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <GripVertical className="h-8 w-8 opacity-20" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Plus className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium leading-tight line-clamp-2">{exercise.name}</p>
                    </div>
                  </div>
                );
              })}

              {filteredExercises?.length === 0 && (
                <div className="col-span-3 py-12 text-center">
                  <p className="text-sm text-muted-foreground">No exercises found</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      <CreateFromTemplateDialog
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
      />
    </div>
  );
}
