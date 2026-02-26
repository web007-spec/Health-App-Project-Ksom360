import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, X, GripVertical, Copy, Trash2, Timer, FileText, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
  { value: "600", label: "10 min" },
  { value: "900", label: "15 min" },
  { value: "1200", label: "20 min" },
  { value: "1800", label: "30 min" },
  { value: "2700", label: "45 min" },
  { value: "3600", label: "60 min" },
];

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
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 px-3 py-2 border-b hover:bg-muted/30 transition-colors min-w-0">
      <Checkbox checked={item.selected} onCheckedChange={() => onToggleSelect(item.id)} className="shrink-0" />

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

      <span className="text-xs font-medium w-24 truncate shrink-0" title={exerciseInfo?.name}>
        {exerciseInfo?.name || "Unknown"}
      </span>

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

      <div {...attributes} {...listeners} className="cursor-grab p-1">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
}

function ExerciseLibraryCard({ exercise, onAdd }: { exercise: any; onAdd: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const thumbnail = exercise.image_url || null;

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <div
      className="cursor-pointer rounded-lg border bg-card hover:border-primary hover:shadow-md transition-all overflow-hidden"
      onClick={onAdd}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="aspect-[4/3] bg-muted relative overflow-hidden">
        {thumbnail && (
          <img
            src={thumbnail}
            alt={exercise.name}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
            style={{ opacity: isHovered && exercise.video_url ? 0 : 1, transition: "opacity 0.15s" }}
          />
        )}
        {!thumbnail && !exercise.video_url && (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <GripVertical className="h-8 w-8 opacity-20" />
          </div>
        )}
        {exercise.video_url && (
          <video
            ref={videoRef}
            src={exercise.video_url}
            preload="auto"
            muted
            playsInline
            loop
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            style={{ opacity: isHovered ? 1 : 0, transition: "opacity 0.15s" }}
          />
        )}
        <div
          className="absolute inset-0 bg-primary/10 flex items-center justify-center z-[2] pointer-events-none"
          style={{ opacity: isHovered ? 1 : 0, transition: "opacity 0.15s" }}
        >
          <Plus className="h-6 w-6 text-primary" />
        </div>
      </div>
      <div className="p-2">
        <p className="text-xs font-medium leading-tight line-clamp-2">{exercise.name}</p>
      </div>
    </div>
  );
}

export default function EditWorkout() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [workoutName, setWorkoutName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);

  const [exerciseItems, setExerciseItems] = useState<WorkoutExercise[]>([]);
  const [groups, setGroups] = useState<ExerciseGroup[]>([]);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [visibleCount, setVisibleCount] = useState(60);
  const [videoFilter, setVideoFilter] = useState<"all" | "named" | "unnamed">("all");
  const [loaded, setLoaded] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor));

  // Fetch workout data
  const { data: workout, isLoading: workoutLoading } = useQuery({
    queryKey: ["workout-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_plans")
        .select(`
          *,
          workout_sections(
            *,
            workout_plan_exercises(
              *,
              exercise:exercises(*)
            )
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: exercises } = useQuery({
    queryKey: ["exercises", user?.id],
    queryFn: async () => {
      const { fetchAllExercises } = await import("@/lib/fetchAllRows");
      return fetchAllExercises(user!.id);
    },
    enabled: !!user?.id,
  });

  // Load workout into Trainerize-style flat format
  useEffect(() => {
    if (!workout || loaded) return;

    setWorkoutName(workout.name);
    setInstructions(workout.description || "");
    setCategory(workout.category || "");
    setDifficulty(workout.difficulty || "beginner");
    setExistingImageUrl(workout.image_url || null);

    const items: WorkoutExercise[] = [];
    const loadedGroups: ExerciseGroup[] = [];

    const sections = (workout.workout_sections || []).sort((a: any, b: any) => a.order_index - b.order_index);

    for (const section of sections) {
      const isGrouped = ["superset", "circuit"].includes(section.section_type);
      let groupId: string | null = null;

      if (isGrouped) {
        groupId = crypto.randomUUID();
        loadedGroups.push({
          id: groupId,
          type: section.section_type as "superset" | "circuit",
          sets: section.rounds || 3,
        });
      }

      const sectionExercises = (section.workout_plan_exercises || []).sort((a: any, b: any) => a.order_index - b.order_index);

      for (const wpe of sectionExercises) {
        const hasTime = wpe.duration_seconds != null && wpe.duration_seconds > 0;
        items.push({
          id: wpe.id || crypto.randomUUID(),
          exercise_id: wpe.exercise_id,
          sets: wpe.sets || 3,
          target_type: hasTime ? "time" : "text",
          target_value: wpe.notes || "",
          time_seconds: wpe.duration_seconds || 30,
          rest_seconds: wpe.rest_seconds || 30,
          exercise_type: wpe.exercise_type === "rest" ? "rest" : "normal",
          selected: false,
          group_id: groupId,
        });
      }
    }

    setExerciseItems(items);
    setGroups(loadedGroups);
    setLoaded(true);
  }, [workout, loaded]);

  // Auto-calculate duration
  const calculatedDuration = useMemo(() => {
    let totalSeconds = 0;

    for (const item of exerciseItems) {
      // Standalone rest items
      if (item.exercise_type === "rest" && !item.group_id) {
        totalSeconds += item.rest_seconds || 0;
        continue;
      }

      if (item.exercise_type !== "normal") continue;

      // Grouped exercises: multiply by group sets
      if (item.group_id) {
        const group = groups.find(g => g.id === item.group_id);
        const rounds = group?.sets || 1;
        const workPerRound = item.target_type === "time" ? (item.time_seconds || 30) : 30;
        totalSeconds += (workPerRound + (item.rest_seconds || 0)) * rounds;
      } else {
        // Ungrouped exercises: multiply by own sets
        const sets = item.sets || 1;
        const workPerSet = item.target_type === "time" ? (item.time_seconds || 30) : 30;
        totalSeconds += (workPerSet + (item.rest_seconds || 0)) * sets;
      }
    }

    // Add rest items inside groups
    for (const item of exerciseItems) {
      if (item.exercise_type === "rest" && item.group_id) {
        const group = groups.find(g => g.id === item.group_id);
        const rounds = group?.sets || 1;
        totalSeconds += (item.rest_seconds || 0) * rounds;
      }
    }

    return Math.max(1, Math.ceil(totalSeconds / 60));
  }, [exerciseItems, groups]);

  const isAutoGeneratedName = (name: string) => {
    const trimmed = name.trim();
    if (/^\d+$/.test(trimmed)) return true;
    if (/^\d+\s/.test(trimmed)) return true;
    if (/\.(mp4|mov|avi|mkv|webm)$/i.test(trimmed)) return true;
    return false;
  };

  const filteredExercises = useMemo(() => {
    return exercises
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
  }, [exercises, exerciseSearch, sortBy, videoFilter]);

  const visibleExercises = useMemo(() => {
    return filteredExercises?.slice(0, visibleCount);
  }, [filteredExercises, visibleCount]);

  const getExerciseById = (eId: string) => exercises?.find((e) => e.id === eId);

  const addExercise = (exerciseId: string) => {
    const newItem: WorkoutExercise = {
      id: crypto.randomUUID(),
      exercise_id: exerciseId,
      sets: 3,
      target_type: "text",
      target_value: "",
      time_seconds: 30,
      rest_seconds: 30,
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
      rest_seconds: 30,
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
      prev.map((item) => item.selected ? { ...item, selected: false, group_id: groupId } : item)
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

  const updateWorkoutMutation = useMutation({
    mutationFn: async () => {
      // Upload cover image if changed
      let imageUrl = existingImageUrl;
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

      // Update workout plan
      const { error: workoutError } = await supabase
        .from("workout_plans")
        .update({
          name: workoutName,
          description: instructions,
          category: category,
          difficulty: difficulty,
          duration_minutes: calculatedDuration,
          image_url: imageUrl,
        })
        .eq("id", id);
      if (workoutError) throw workoutError;

      // Delete existing sections (cascade deletes exercises)
      const { error: deleteSectionsError } = await supabase
        .from("workout_sections")
        .delete()
        .eq("workout_plan_id", id);
      if (deleteSectionsError) throw deleteSectionsError;

      // Recreate sections + exercises in Trainerize format (same as CreateWorkout)
      const ungroupedItems = exerciseItems.filter((i) => !i.group_id && (i.exercise_type === "normal" || i.exercise_type === "rest"));
      const sectionInserts: any[] = [];
      let sectionIdx = 0;

      if (ungroupedItems.length > 0) {
        sectionInserts.push({
          workout_plan_id: id,
          name: "Main",
          section_type: "straight_set",
          order_index: sectionIdx++,
          rounds: 1,
        });
      }

      for (const group of groups) {
        sectionInserts.push({
          workout_plan_id: id,
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

      const mainSection = sections.find((s: any) => s.name === "Main");
      const groupSections = new Map<string, string>();
      let groupIdx = 0;
      for (const group of groups) {
        const sec = sections.find((s: any) => s.section_type === group.type && s.order_index === (ungroupedItems.length > 0 ? groupIdx + 1 : groupIdx));
        if (sec) groupSections.set(group.id, sec.id);
        groupIdx++;
      }

      const exercisesToInsert = exerciseItems
        .map((item, index) => ({
          workout_plan_id: id,
          section_id: item.group_id ? groupSections.get(item.group_id) || sections[0].id : mainSection?.id || sections[0].id,
          exercise_id: item.exercise_type === "rest" ? null : item.exercise_id,
          order_index: index,
          sets: item.sets,
          reps: null,
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-plans"] });
      queryClient.invalidateQueries({ queryKey: ["workout-detail", id] });
      toast({ title: "Success!", description: "Workout updated" });
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
    updateWorkoutMutation.mutate();
  };

  const anySelected = exerciseItems.some((i) => i.selected);

  const renderExerciseList = () => {
    const rendered: React.ReactNode[] = [];
    const renderedGroups = new Set<string>();

    for (let i = 0; i < exerciseItems.length; i++) {
      const item = exerciseItems[i];

      if (item.group_id && !renderedGroups.has(item.group_id)) {
        renderedGroups.add(item.group_id);
        const group = groups.find((g) => g.id === item.group_id);
        const groupItems = exerciseItems.filter((ei) => ei.group_id === item.group_id);

        if (group) {
          rendered.push(
            <div key={`group-${item.group_id}`} className="border-2 border-primary/20 rounded-lg mx-2 my-2 overflow-hidden">
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

  if (workoutLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading workout...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-card border-b shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Edit workout:</span>
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
            disabled={updateWorkoutMutation.isPending}
            className="bg-primary text-primary-foreground px-6"
          >
            {updateWorkoutMutation.isPending ? "Saving..." : "SAVE"}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate("/workouts")} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Builder */}
        <div className="flex-1 flex flex-col overflow-hidden border-r min-w-0">
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
              {(coverImagePreview || existingImageUrl) ? (
                <div className="flex items-center gap-1">
                  <img src={coverImagePreview || existingImageUrl!} alt="Cover" className="h-7 w-10 object-cover rounded" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => { setCoverImage(null); setCoverImagePreview(null); setExistingImageUrl(null); }}
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
        <div className="w-[460px] shrink-0 flex flex-col overflow-hidden">
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
              {visibleExercises?.map((exercise) => (
                <ExerciseLibraryCard
                  key={exercise.id}
                  exercise={exercise}
                  onAdd={() => addExercise(exercise.id)}
                />
              ))}

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
    </div>
  );
}
