import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft, Trash2, GripVertical, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateCategoryDialog } from "@/components/CreateCategoryDialog";
import { AddWorkoutToCategoryDialog } from "@/components/AddWorkoutToCategoryDialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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

function SortableCategory({ category, onDelete, onAddWorkout }: any) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: category.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Card ref={setNodeRef} style={style} className="mb-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-3 flex-1">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">{category.name}</CardTitle>
            {category.description && (
              <p className="text-sm text-muted-foreground">{category.description}</p>
            )}
            <p className="text-sm text-muted-foreground mt-1">
              {category.category_workouts?.length || 0} workouts
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => onAddWorkout(category.id)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Workout
          </Button>
          <Button size="sm" variant="destructive" onClick={() => onDelete(category.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {category.category_workouts?.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {category.category_workouts.map((cw: any) => {
              const workout = cw.ondemand_workouts;
              const labels =
                workout.workout_workout_labels?.map((l: any) => l.workout_labels) || [];
              const levelLabel = labels.find((l: any) => l?.category === "level");

              return (
                <Card key={cw.id} className="overflow-hidden">
                  {workout.thumbnail_url ? (
                    <img
                      src={workout.thumbnail_url}
                      alt={workout.name}
                      className="w-full h-24 object-cover"
                    />
                  ) : (
                    <div className="w-full h-24 bg-muted flex items-center justify-center">
                      <Play className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <CardContent className="p-2">
                    <p className="font-medium text-xs line-clamp-2">{workout.name}</p>
                    {levelLabel && (
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {levelLabel.value}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            No workouts yet. Click "Add Workout" to get started.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function WorkoutCollectionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [addWorkoutOpen, setAddWorkoutOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const { data: collection, isLoading } = useQuery({
    queryKey: ["workout-collection", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_collections")
        .select(`
          *,
          workout_collection_categories(
            *,
            category_workouts(
              *,
              ondemand_workouts(
                *,
                workout_workout_labels(
                  workout_labels(*)
                )
              )
            )
          )
        `)
        .eq("id", id)
        .eq("trainer_id", user?.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user?.id,
  });

  const togglePublished = useMutation({
    mutationFn: async (isPublished: boolean) => {
      const { error } = await supabase
        .from("workout_collections")
        .update({ is_published: isPublished })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-collection", id] });
      toast({ title: "Collection updated" });
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (categoryId: string) => {
      const { error } = await supabase
        .from("workout_collection_categories")
        .delete()
        .eq("id", categoryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-collection", id] });
      toast({ title: "Category deleted" });
    },
  });

  const reorderCategories = useMutation({
    mutationFn: async (categories: any[]) => {
      const updates = categories.map((category, index) => ({
        id: category.id,
        order_index: index,
      }));

      for (const update of updates) {
        await supabase
          .from("workout_collection_categories")
          .update({ order_index: update.order_index })
          .eq("id", update.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-collection", id] });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const categories = collection?.workout_collection_categories || [];
    const oldIndex = categories.findIndex((c: any) => c.id === active.id);
    const newIndex = categories.findIndex((c: any) => c.id === over.id);

    const reordered = arrayMove(categories, oldIndex, newIndex);
    reorderCategories.mutate(reordered);
  };

  const handleAddWorkout = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setAddWorkoutOpen(true);
  };

  if (isLoading) return <DashboardLayout><div className="p-6">Loading...</div></DashboardLayout>;
  if (!collection) return <DashboardLayout><div className="p-6">Collection not found</div></DashboardLayout>;

  const categories =
    collection.workout_collection_categories?.sort(
      (a: any, b: any) => a.order_index - b.order_index
    ) || [];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/workout-collections")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{collection.name}</h1>
              {collection.description && (
                <p className="text-muted-foreground mt-1">{collection.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="published">Published</Label>
              <Switch
                id="published"
                checked={collection.is_published}
                onCheckedChange={(checked) => togglePublished.mutate(checked)}
              />
            </div>
            <Button onClick={() => setCreateCategoryOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </div>
        </div>

        {categories.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent className="pt-6">
              <Play className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No categories yet</h3>
              <p className="text-muted-foreground mb-4">
                Create categories to organize your workouts (like Netflix seasons)
              </p>
              <Button onClick={() => setCreateCategoryOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            </CardContent>
          </Card>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={categories.map((c: any) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              {categories.map((category: any) => (
                <SortableCategory
                  key={category.id}
                  category={category}
                  onDelete={(categoryId: string) => deleteCategory.mutate(categoryId)}
                  onAddWorkout={handleAddWorkout}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}

        <CreateCategoryDialog
          collectionId={id!}
          open={createCategoryOpen}
          onOpenChange={setCreateCategoryOpen}
        />

        <AddWorkoutToCategoryDialog
          categoryId={selectedCategory!}
          open={addWorkoutOpen}
          onOpenChange={setAddWorkoutOpen}
        />
      </div>
    </DashboardLayout>
  );
}
