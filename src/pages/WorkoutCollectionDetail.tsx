import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Plus, Play, Dumbbell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CreateCategoryDialog } from "@/components/CreateCategoryDialog";
import { AddWorkoutToCategoryDialog } from "@/components/AddWorkoutToCategoryDialog";
import { CollectionHeader } from "@/components/workout-collections/CollectionHeader";
import { CategoryCard } from "@/components/workout-collections/CategoryCard";
import { CategoryDetailView } from "@/components/workout-collections/CategoryDetailView";
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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

export default function WorkoutCollectionDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [addWorkoutOpen, setAddWorkoutOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

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

  const toggleCategoryActive = useMutation({
    mutationFn: async ({ categoryId, isActive }: { categoryId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("workout_collection_categories")
        .update({ is_active: isActive })
        .eq("id", categoryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-collection", id] });
    },
  });

  const changeCategoryLayout = useMutation({
    mutationFn: async ({ categoryId, layout }: { categoryId: string; layout: string }) => {
      const { error } = await supabase
        .from("workout_collection_categories")
        .update({ card_layout: layout })
        .eq("id", categoryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-collection", id] });
      toast({ title: "Layout updated" });
    },
  });

  const reorderCategories = useMutation({
    mutationFn: async (categories: any[]) => {
      for (let i = 0; i < categories.length; i++) {
        await supabase
          .from("workout_collection_categories")
          .update({ order_index: i })
          .eq("id", categories[i].id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-collection", id] });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const cats = categories;
    const oldIndex = cats.findIndex((c: any) => c.id === active.id);
    const newIndex = cats.findIndex((c: any) => c.id === over.id);
    const reordered = arrayMove(cats, oldIndex, newIndex);
    reorderCategories.mutate(reordered);
  };

  const handleAddWorkout = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setAddWorkoutOpen(true);
  };

  if (isLoading) return <DashboardLayout><div className="p-6">Loading...</div></DashboardLayout>;
  if (!collection) return <DashboardLayout><div className="p-6">Collection not found</div></DashboardLayout>;

  const categories = (collection.workout_collection_categories || []).sort(
    (a: any, b: any) => a.order_index - b.order_index
  );

  const activeCategory = activeCategoryId
    ? categories.find((c: any) => c.id === activeCategoryId)
    : null;

  // If we have drilled into a category, show its detail view
  if (activeCategory) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-4">
          <CategoryDetailView
            category={activeCategory}
            collectionId={id!}
            collectionName={collection.name}
            onBack={() => setActiveCategoryId(null)}
            onAddWorkout={handleAddWorkout}
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

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <CollectionHeader
          collection={collection}
          onTogglePublished={(val) => togglePublished.mutate(val === "published")}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Categories ({categories.length})</h2>
              <Button onClick={() => setCreateCategoryOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create New Category
              </Button>
            </div>

            {categories.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent className="pt-6">
                  <Play className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No categories yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create categories to organize your workouts
                  </p>
                  <Button onClick={() => setCreateCategoryOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create New Category
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext
                  items={categories.map((c: any) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {categories.map((category: any) => (
                      <CategoryCard
                        key={category.id}
                        category={category}
                        onDelete={(cId) => deleteCategory.mutate(cId)}
                        onAddWorkout={handleAddWorkout}
                        onToggleActive={(cId, isActive) =>
                          toggleCategoryActive.mutate({ categoryId: cId, isActive })
                        }
                        onChangeLayout={(cId, layout) =>
                          changeCategoryLayout.mutate({ categoryId: cId, layout })
                        }
                        onNavigate={(cId) => setActiveCategoryId(cId)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </TabsContent>

          <TabsContent value="clients" className="mt-4">
            <Card className="text-center py-12">
              <CardContent className="pt-6 text-muted-foreground">
                Client assignment management coming soon
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

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
