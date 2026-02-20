import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, X, GripVertical, Copy, Trash2, Timer, FileText, Clock } from "lucide-react";
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
  target_type: "text" | "time";
  target_value: string;
  time_seconds: number;
  rest_seconds: number;
  exercise_type: "normal" | "rest";
  selected: boolean;
  group_id: string | null;
}

interface ExerciseGroup {
  id: string;
  type: "superset" | "circuit";
  sets: number;
}

const REST_OPTIONS = [
  { value: "0", label: "None" },
  { value: "10", label: "10 sec" },
  { value: "15", label: "15 sec" },
  { value: "20", label: "20 sec" },
  { value: "30", label: "30 sec" },
  { value: "45", label: "45 sec" },
  { value: "60", label: "60 sec" },
  { value: "90", label: "90 sec" },
  { value: "120", label: "2 min" },
  { value: "150", label: "2:30" },
  { value: "180", label: "3 min" },
  { value: "240", label: "4 min" },
  { value: "300", label: "5 min" },
];

const TIME_OPTIONS = [
  { value: "10", label: "10 sec" },
  { value: "15", label: "15 sec" },
  { value: "20", label: "20 sec" },
  { value: "30", label: "30 sec" },
  { value: "45", label: "45 sec" },
  { value: "60", label: "60 sec" },
  { value: "90", label: "90 sec" },
  { value: "120", label: "2 min" },
  { value: "180", label: "3 min" },
  { value: "300", label: "5 min" },
];

// Exercise row for the builder
function ExerciseRow({
  item,
  exerciseInfo,
  onUpdate,
  onToggleSelect,
}: {
  item: WorkoutExercise;
  exerciseInfo: any;
  onUpdate: (id: string, updates: Partial<WorkoutExercise>) => void;
  onToggleSelect: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (item.exercise_type === "rest") {
    return (
      <div ref={setNodeRef} style={style} className="flex items-center gap-3 px-4 py-3 border-b bg-amber-50 dark:bg-amber-950/20">
        <Checkbox checked={item.selected} onCheckedChange={() => onToggleSelect(item.id)} />
        <div className="w-12 h-12 rounded bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
          <Timer className="h-5 w-5 text-amber-600" />
        </div>
        <span className="text-sm font-medium flex-1">Rest</span>
        <Select value={String(item.rest_seconds)} onValueChange={(v) => onUpdate(item.id, { rest_seconds: parseInt(v) })}>
          <SelectTrigger className="h-9 w-28 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REST_OPTIONS.filter(o => o.value !== "0").map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div {...attributes} {...listeners} className="cursor-grab p-1">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    );
  }

  const hasDirectVideo = exerciseInfo?.video_url && /\.(mp4|webm|ogg|mov)(\?|$)/i.test(exerciseInfo.video_url);
  const thumbnail = exerciseInfo?.image_url || (exerciseInfo?.video_url?.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/) ? `https://img.youtube.com/vi/${exerciseInfo.video_url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)[1]}/mqdefault.jpg` : null);

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 px-3 py-2 border-b hover:bg-muted/30 transition-colors overflow-hidden">
      <Checkbox checked={item.selected} onCheckedChange={() => onToggleSelect(item.id)} className="shrink-0" />

      {/* Thumbnail - show video if available */}
      <div className="w-14 h-10 rounded bg-muted overflow-hidden shrink-0">
        {hasDirectVideo ? (
          <video
            src={exerciseInfo.video_url}
            className="w-full h-full object-cover"
            muted
            loop
            playsInline
            onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
            onMouseLeave={(e) => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
          />
        ) : thumbnail ? (
          <img src={thumbnail} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/30 text-xs">IMG</div>
        )}
      </div>

      {/* Name */}
      <span className="text-xs font-medium w-24 truncate shrink-0" title={exerciseInfo?.name}>
        {exerciseInfo?.name || "Unknown"}
      </span>

      {/* Sets - only for ungrouped exercises (grouped ones use the group header sets) */}
      {!item.group_id && (
        <>
          <Input
            type="number"
            value={item.sets}
            onChange={(e) => onUpdate(item.id, { sets: parseInt(e.target.value) || 1 })}
            className="h-9 w-14 text-center text-sm shrink-0"
            min={1}
          />
          <span className="text-muted-foreground text-xs shrink-0">×</span>
        </>
      )}

      <Select value={item.target_type} onValueChange={(v: "text" | "time") => onUpdate(item.id, { target_type: v })}>
        <SelectTrigger className="h-9 w-14 text-xs px-2">
          <SelectValue>
            {item.target_type === "text" ? <FileText className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="text">
            <span className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Text</span>
          </SelectItem>
          <SelectItem value="time">
            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Time</span>
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Conditional target fields */}
      {item.target_type === "time" ? (
        <>
          <Select value={String(item.time_seconds || 30)} onValueChange={(v) => onUpdate(item.id, { time_seconds: parseInt(v) })}>
            <SelectTrigger className="h-9 w-28 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={item.target_value}
            onChange={(e) => onUpdate(item.id, { target_value: e.target.value })}
            placeholder="reps, tempo, etc"
            className="h-9 flex-1 text-sm min-w-0"
          />
        </>
      ) : (
        <Input
          value={item.target_value}
          onChange={(e) => onUpdate(item.id, { target_value: e.target.value })}
          placeholder="reps, weight, tempo, etc"
          className="h-9 flex-1 text-sm min-w-0"
        />
      )}

      {/* Rest Period - only show in text mode since time mode already has a time selector */}
      {item.target_type !== "time" && (
        <Select value={String(item.rest_seconds)} onValueChange={(v) => onUpdate(item.id, { rest_seconds: parseInt(v) })}>
          <SelectTrigger className="h-9 w-28 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REST_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

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
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);

  const [exerciseItems, setExerciseItems] = useState<WorkoutExercise[]>([]);
  const [groups, setGroups] = useState<ExerciseGroup[]>([]);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [visibleCount, setVisibleCount] = useState(60);
  const [videoFilter, setVideoFilter] = useState<"all" | "named" | "unnamed">("all");
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor));

  const { data: exercises } = useQuery({
    queryKey: ["exercises", user?.id],
    queryFn: async () => {
      const { fetchAllExercises } = await import("@/lib/fetchAllRows");
      return fetchAllExercises(user!.id);
    },
    enabled: !!user?.id,
  });

  // Auto-calculate duration from exercises
  const calculatedDuration = useMemo(() => {
    let totalSeconds = 0;
    for (const item of exerciseItems) {
      if (item.exercise_type === "rest") {
        totalSeconds += item.rest_seconds;
      } else {
        // Estimate: each set ~45 sec work + rest between sets
        const sets = item.sets || 1;
        const workPerSet = item.target_type === "time" ? (item.time_seconds || 30) : 45;
        totalSeconds += sets * workPerSet + (sets - 1) * item.rest_seconds;
        // Add rest after exercise
        totalSeconds += item.rest_seconds;
      }
    }
    return Math.max(1, Math.round(totalSeconds / 60));
  }, [exerciseItems]);

  // Detects names that look auto-generated from a bulk upload (e.g. "001", "Video 23", "123 Squat", etc.)
  const isAutoGeneratedName = (name: string) => {
    const trimmed = name.trim();
    // Purely numeric (e.g. "001", "42")
    if (/^\d+$/.test(trimmed)) return true;
    // Starts with a number followed by space (e.g. "1 Squat", "23 Bench")
    if (/^\d+\s/.test(trimmed)) return true;
    // Still has a file extension somehow
    if (/\.(mp4|mov|avi|mkv|webm)$/i.test(trimmed)) return true;
    return false;
  };

  const filteredExercises = useMemo(() => {
    const filtered = exercises
      ?.filter((ex) => {
        const matchesSearch =
          ex.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
          ex.muscle_group?.toLowerCase().includes(exerciseSearch.toLowerCase());
        if (!matchesSearch) return false;
        if (videoFilter === "named") return !!ex.video_url && !isAutoGeneratedName(ex.name);
        if (videoFilter === "unnamed") return !!ex.video_url && isAutoGeneratedName(ex.name);
        return true;
      })
      ?.sort((a, b) => {
        if (sortBy === "name") return a.name.localeCompare(b.name);
        if (sortBy === "muscle_group") return (a.muscle_group || "").localeCompare(b.muscle_group || "");
        return 0;
      });
    return filtered;
  }, [exercises, exerciseSearch, sortBy, videoFilter]);

  // Reset visible count when search changes
  const visibleExercises = useMemo(() => {
    return filteredExercises?.slice(0, visibleCount);
  }, [filteredExercises, visibleCount]);

  const getExerciseById = (id: string) => exercises?.find((e) => e.id === id);

  const addExercise = (exerciseId: string) => {
    const newItem: WorkoutExercise = {
      id: crypto.randomUUID(),
      exercise_id: exerciseId,
      sets: 3,
      target_type: "text",
      target_value: "",
      time_seconds: 30,
      rest_seconds: 90,
      exercise_type: "normal",
      selected: false,
      group_id: null,
    };
    setExerciseItems((prev) => [...prev, newItem]);
  };

  const addRest = () => {
    const newItem: WorkoutExercise = {
      id: crypto.randomUUID(),
      exercise_id: "",
      sets: 0,
      target_type: "text",
      target_value: "",
      time_seconds: 0,
      rest_seconds: 90,
      exercise_type: "rest",
      selected: false,
      group_id: null,
    };
    setExerciseItems((prev) => [...prev, newItem]);
  };

  const updateItem = useCallback((id: string, updates: Partial<WorkoutExercise>) => {
    setExerciseItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setExerciseItems((prev) => prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item)));
  }, []);

  const toggleSelectAll = () => {
    const allSelected = exerciseItems.every((i) => i.selected);
    setExerciseItems((prev) => prev.map((item) => ({ ...item, selected: !allSelected })));
  };

  const deleteSelected = () => {
    setExerciseItems((prev) => prev.filter((item) => !item.selected));
  };

  const duplicateSelected = () => {
    const selected = exerciseItems.filter((i) => i.selected);
    const copies = selected.map((item) => ({ ...item, id: crypto.randomUUID(), selected: false, group_id: null }));
    setExerciseItems((prev) => [...prev, ...copies]);
  };

  // Superset / Circuit grouping
  const createGroup = (type: "superset" | "circuit") => {
    const selectedNormal = exerciseItems.filter((i) => i.selected && i.exercise_type === "normal");
    if (selectedNormal.length < 2) {
      toast({ title: "Select at least 2 exercises", variant: "destructive" });
      return;
    }
    const groupId = crypto.randomUUID();
    const newGroup: ExerciseGroup = { id: groupId, type, sets: 3 };
    setGroups((prev) => [...prev, newGroup]);
    setExerciseItems((prev) =>
      prev.map((item) =>
        item.selected && item.exercise_type === "normal"
          ? { ...item, selected: false, group_id: groupId }
          : item
      )
    );
  };

  const ungroupItems = (groupId: string) => {
    setExerciseItems((prev) =>
      prev.map((item) => (item.group_id === groupId ? { ...item, group_id: null } : item))
    );
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
  };

  const updateGroupSets = (groupId: string, sets: number) => {
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, sets } : g)));
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
      // Upload cover image if provided
      let imageUrl: string | null = null;
      if (coverImage) {
        const fileExt = coverImage.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('workout-covers')
          .upload(fileName, coverImage);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from('workout-covers')
          .getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
      }

      const { data: workout, error: workoutError } = await supabase
        .from("workout_plans")
        .insert({
          name: workoutName,
          description: instructions,
          category: category,
          difficulty: difficulty,
          duration_minutes: calculatedDuration,
          trainer_id: user?.id,
          image_url: imageUrl,
        })
        .select()
        .single();
      if (workoutError) throw workoutError;

      // Create sections for groups + a default section for ungrouped
      const ungroupedItems = exerciseItems.filter((i) => !i.group_id && i.exercise_type === "normal");
      const sectionInserts: any[] = [];
      let sectionIdx = 0;

      if (ungroupedItems.length > 0) {
        sectionInserts.push({
          workout_plan_id: workout.id,
          name: "Main",
          section_type: "straight_set",
          order_index: sectionIdx++,
          rounds: 1,
        });
      }

      for (const group of groups) {
        sectionInserts.push({
          workout_plan_id: workout.id,
          name: group.type === "superset" ? "Superset" : "Circuit",
          section_type: group.type,
          order_index: sectionIdx++,
          rounds: group.sets,
        });
      }

      const { data: sections, error: sectionError } = await supabase
        .from("workout_sections")
        .insert(sectionInserts)
        .select();
      if (sectionError) throw sectionError;

      // Map sections
      const mainSection = sections.find((s) => s.name === "Main");
      const groupSections = new Map<string, string>();
      let groupIdx = 0;
      for (const group of groups) {
        const sec = sections.find((s) => s.section_type === group.type && s.order_index === (ungroupedItems.length > 0 ? groupIdx + 1 : groupIdx));
        if (sec) groupSections.set(group.id, sec.id);
        groupIdx++;
      }

      // Insert exercises
      const exercisesToInsert = exerciseItems
        .filter((item) => item.exercise_type === "normal")
        .map((item, index) => ({
          workout_plan_id: workout.id,
          section_id: item.group_id ? groupSections.get(item.group_id) || sections[0].id : mainSection?.id || sections[0].id,
          exercise_id: item.exercise_id,
          order_index: index,
          sets: item.sets,
          reps: item.target_type === "text" ? null : null,
          duration_seconds: item.target_type === "time" ? item.time_seconds : null,
          rest_seconds: item.rest_seconds,
          notes: item.target_value || "",
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

  // Build rendered list with group headers
  const renderExerciseList = () => {
    const rendered: React.ReactNode[] = [];
    const renderedGroups = new Set<string>();

    for (let i = 0; i < exerciseItems.length; i++) {
      const item = exerciseItems[i];

      // If this item belongs to a group and we haven't rendered the group header yet
      if (item.group_id && !renderedGroups.has(item.group_id)) {
        renderedGroups.add(item.group_id);
        const group = groups.find((g) => g.id === item.group_id);
        const groupItems = exerciseItems.filter((ei) => ei.group_id === item.group_id);

        if (group) {
          rendered.push(
            <div key={`group-${item.group_id}`} className="border-2 border-primary/20 rounded-lg mx-2 my-2 overflow-hidden">
              {/* Group Header */}
              <div className="flex items-center gap-3 px-4 py-2 bg-primary/5 border-b">
                <Checkbox
                  checked={groupItems.every((gi) => gi.selected)}
                  onCheckedChange={() => {
                    const allSelected = groupItems.every((gi) => gi.selected);
                    setExerciseItems((prev) =>
                      prev.map((ei) =>
                        ei.group_id === item.group_id ? { ...ei, selected: !allSelected } : ei
                      )
                    );
                  }}
                />
                <span className="text-sm text-muted-foreground">
                  {group.type === "superset" ? "Superset" : "Circuit"} of
                </span>
                <Input
                  type="number"
                  value={group.sets}
                  onChange={(e) => updateGroupSets(group.id, parseInt(e.target.value) || 1)}
                  className="h-7 w-14 text-sm text-center"
                  min={1}
                />
                <span className="text-sm text-muted-foreground">sets</span>
                <div className="flex-1" />
                <Button
                  variant="link"
                  size="sm"
                  className="text-primary text-xs p-0 h-auto"
                  onClick={() => ungroupItems(group.id)}
                >
                  Ungroup
                </Button>
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
              {/* Group Items */}
              {groupItems.map((gi) => (
                <ExerciseRow
                  key={gi.id}
                  item={gi}
                  exerciseInfo={getExerciseById(gi.exercise_id)}
                  onUpdate={updateItem}
                  onToggleSelect={toggleSelect}
                />
              ))}
            </div>
          );
        }
      }

      // Render ungrouped items normally
      if (!item.group_id) {
        rendered.push(
          <ExerciseRow
            key={item.id}
            item={item}
            exerciseInfo={getExerciseById(item.exercise_id)}
            onUpdate={updateItem}
            onToggleSelect={toggleSelect}
          />
        );
      }
    }

    return rendered;
  };

  const isDirectVideo = (url: string) => /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);

  const getExerciseThumbnail = (exercise: any) => {
    if (exercise.image_url) return exercise.image_url;
    if (exercise.video_url) {
      const ytMatch = exercise.video_url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (ytMatch) return `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg`;
    }
    return null;
  };

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

          {/* Workout Settings */}
          <div className="flex items-center gap-3 px-4 py-2 border-b text-xs flex-wrap">
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
              <span className="font-medium">{calculatedDuration} min</span>
              <span className="text-muted-foreground">(auto)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Cover:</span>
              {coverImagePreview ? (
                <div className="flex items-center gap-1">
                  <img src={coverImagePreview} alt="Cover" className="h-7 w-10 object-cover rounded" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => { setCoverImage(null); setCoverImagePreview(null); }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <span className="text-primary hover:underline text-xs">Upload</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setCoverImage(file);
                        setCoverImagePreview(URL.createObjectURL(file));
                      }
                    }}
                  />
                </label>
              )}
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
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7 ml-2"
              disabled={!anySelected}
              onClick={() => createGroup("superset")}
            >
              SUPERSET
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7"
              disabled={!anySelected}
              onClick={() => createGroup("circuit")}
            >
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

          {/* Exercise List */}
          <ScrollArea className="flex-1">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={exerciseItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                {renderExerciseList()}
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
          <div className="p-3 border-b space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search for an exercise"
                value={exerciseSearch}
                onChange={(e) => { setExerciseSearch(e.target.value); setVisibleCount(60); }}
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
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground mr-1">Videos:</span>
              {(["all", "named", "unnamed"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => { setVideoFilter(f); setVisibleCount(60); }}
                  className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                    videoFilter === f
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {f === "all" ? "All" : f === "named" ? "Named ✓" : "Needs name"}
                </button>
              ))}
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-3 grid grid-cols-3 gap-2">
              {visibleExercises?.map((exercise) => {
                const thumbnail = getExerciseThumbnail(exercise);

                return (
                  <div
                    key={exercise.id}
                    className="group cursor-pointer rounded-lg border bg-card hover:border-primary hover:shadow-md transition-all overflow-hidden"
                    onClick={() => addExercise(exercise.id)}
                  >
                    <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                      {thumbnail ? (
                        <img src={thumbnail} alt={exercise.name} className="w-full h-full object-cover" loading="lazy" />
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

              {filteredExercises && visibleCount < filteredExercises.length && (
                <div className="col-span-3 py-4 text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setVisibleCount((prev) => prev + 60)}
                  >
                    Load More ({filteredExercises.length - visibleCount} remaining)
                  </Button>
                </div>
              )}

              {visibleExercises?.length === 0 && (
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
