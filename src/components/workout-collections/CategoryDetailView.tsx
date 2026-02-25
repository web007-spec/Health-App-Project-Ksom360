import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  GripVertical,
  MoreVertical,
  Play,
  Dumbbell,
  Plus,
  Search,
  ArrowDown,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableWorkoutRow({ cw, index, onRemove, onMoveToBottom }: any) {
  const workout = cw.ondemand_workouts;
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: cw.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const labels = workout?.workout_workout_labels?.map((l: any) => l.workout_labels) || [];
  const levelLabel = labels.find((l: any) => l?.category === "level");
  const durationLabel = labels.find((l: any) => l?.category === "duration");
  const otherLabels = labels.filter(
    (l: any) => l && l.category !== "level" && l.category !== "duration"
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 py-3 px-3 border-b border-border last:border-0 hover:bg-muted/50"
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      <span className="text-sm text-muted-foreground w-6 text-center font-medium">
        {index + 1}
      </span>

      {workout?.thumbnail_url ? (
        <div className="relative w-20 h-14 rounded overflow-hidden flex-shrink-0">
          <img
            src={workout.thumbnail_url}
            alt={workout.name}
            className="w-full h-full object-cover"
          />
          {workout.type === "video" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <Play className="h-4 w-4 text-white fill-white" />
            </div>
          )}
        </div>
      ) : (
        <div className="w-20 h-14 bg-muted flex items-center justify-center rounded flex-shrink-0">
          {workout?.type === "video" ? (
            <Play className="h-5 w-5 text-muted-foreground" />
          ) : (
            <Dumbbell className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm line-clamp-1">{workout?.name}</p>
        {otherLabels.length > 0 && (
          <div className="flex gap-1 flex-wrap mt-1">
            {otherLabels.map((l: any) => (
              <Badge key={l.id} variant="outline" className="text-[10px] px-1.5 py-0">
                {l.value}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {durationLabel && (
        <span className="text-xs text-muted-foreground font-medium uppercase flex-shrink-0">
          {durationLabel.value}
        </span>
      )}

      {levelLabel && (
        <span className="text-xs text-muted-foreground font-medium uppercase flex-shrink-0">
          {levelLabel.value}
        </span>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onMoveToBottom(cw.id)}>
            <ArrowDown className="h-4 w-4 mr-2" />
            Move to bottom
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => onRemove(cw.id)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

interface CategoryDetailViewProps {
  category: any;
  collectionId: string;
  collectionName: string;
  onBack: () => void;
  onAddWorkout: (categoryId: string) => void;
}

export function CategoryDetailView({
  category,
  collectionId,
  collectionName,
  onBack,
  onAddWorkout,
}: CategoryDetailViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const workouts = (category.category_workouts || []).sort(
    (a: any, b: any) => a.order_index - b.order_index
  );

  const filteredWorkouts = searchQuery
    ? workouts.filter((cw: any) =>
        cw.ondemand_workouts?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : workouts;

  const toggleActive = useMutation({
    mutationFn: async (isActive: boolean) => {
      const { error } = await supabase
        .from("workout_collection_categories")
        .update({ is_active: isActive })
        .eq("id", category.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-collection", collectionId] });
    },
  });

  const removeWorkout = useMutation({
    mutationFn: async (categoryWorkoutId: string) => {
      const { error } = await supabase
        .from("category_workouts")
        .delete()
        .eq("id", categoryWorkoutId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-collection", collectionId] });
      toast({ title: "Workout removed" });
    },
  });

  const reorderWorkouts = useMutation({
    mutationFn: async (reordered: any[]) => {
      for (let i = 0; i < reordered.length; i++) {
        await supabase
          .from("category_workouts")
          .update({ order_index: i })
          .eq("id", reordered[i].id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-collection", collectionId] });
    },
  });

  const moveToBottom = (categoryWorkoutId: string) => {
    const idx = workouts.findIndex((w: any) => w.id === categoryWorkoutId);
    if (idx === -1 || idx === workouts.length - 1) return;
    const reordered = arrayMove(workouts, idx, workouts.length - 1);
    reorderWorkouts.mutate(reordered);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = workouts.findIndex((w: any) => w.id === active.id);
    const newIndex = workouts.findIndex((w: any) => w.id === over.id);
    const reordered = arrayMove(workouts, oldIndex, newIndex);
    reorderWorkouts.mutate(reordered);
  };

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button variant="ghost" size="sm" className="gap-1 px-2" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          {collectionName}
        </Button>
        <span>/</span>
        <span className="text-foreground font-medium">{category.name}</span>
      </div>

      {/* Category header */}
      <div className="flex items-start gap-5">
        {category.cover_image_url ? (
          <img
            src={category.cover_image_url}
            alt={category.name}
            className="w-28 h-28 object-cover rounded-lg flex-shrink-0"
          />
        ) : (
          <div className="w-28 h-28 bg-muted flex items-center justify-center rounded-lg flex-shrink-0">
            <Dumbbell className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">{category.name}</h2>
              {category.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {category.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {category.is_active !== false ? "Active" : "Inactive"}
              </span>
              <Switch
                checked={category.is_active !== false}
                onCheckedChange={(checked) => toggleActive.mutate(checked)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Search + Add */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search for a workout"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => onAddWorkout(category.id)}>
          <Plus className="h-4 w-4 mr-1" />
          Add workout
        </Button>
      </div>

      {/* Workout count */}
      <p className="text-sm text-muted-foreground">{workouts.length} workouts</p>

      {/* Workout list */}
      {filteredWorkouts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Dumbbell className="mx-auto h-10 w-10 mb-3" />
          <p className="font-medium">No workouts yet</p>
          <p className="text-sm mt-1">Click "Add workout" to get started.</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filteredWorkouts.map((w: any) => w.id)}
              strategy={verticalListSortingStrategy}
            >
              {filteredWorkouts.map((cw: any, index: number) => (
                <SortableWorkoutRow
                  key={cw.id}
                  cw={cw}
                  index={index}
                  onRemove={(id: string) => removeWorkout.mutate(id)}
                  onMoveToBottom={moveToBottom}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
}
