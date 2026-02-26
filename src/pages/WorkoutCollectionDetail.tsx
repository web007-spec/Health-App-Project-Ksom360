import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Plus, Play, Dumbbell, FolderOpen, FolderInput, CloudUpload } from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CreateCategoryDialog } from "@/components/CreateCategoryDialog";
import { AddWorkoutToCategoryDialog } from "@/components/AddWorkoutToCategoryDialog";
import { CollectionHeader } from "@/components/workout-collections/CollectionHeader";
import { CategoryCard } from "@/components/workout-collections/CategoryCard";
import { CategoryDetailView } from "@/components/workout-collections/CategoryDetailView";
import { WorkoutPhonePreview } from "@/components/workout-collections/WorkoutPhonePreview";
import { AddWorkoutTypePicker } from "@/components/AddWorkoutTypePicker";
import { CreateOndemandWorkoutDialog } from "@/components/CreateOndemandWorkoutDialog";
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [addWorkoutOpen, setAddWorkoutOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [typePickerCategoryId, setTypePickerCategoryId] = useState<string | null>(null);
  const [createRegularOpen, setCreateRegularOpen] = useState(false);

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

          <AddWorkoutTypePicker
            open={typePickerOpen}
            onOpenChange={setTypePickerOpen}
            onSelectRegular={() => {
              setSelectedCategory(typePickerCategoryId);
              setCreateRegularOpen(true);
            }}
            onSelectVideo={() => {
              navigate("/ondemand-workouts?create=video");
            }}
          />

          <CreateOndemandWorkoutDialog
            open={createRegularOpen}
            onOpenChange={setCreateRegularOpen}
            presetType="regular"
            categoryId={selectedCategory}
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
        <h1 className="text-2xl font-bold text-foreground">{collection.name}</h1>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-transparent p-0 h-auto gap-4 justify-start border-b border-border rounded-none w-full">
            <TabsTrigger
              value="overview"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-2 text-sm font-medium"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="clients"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-2 text-sm font-medium"
            >
              Clients
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="flex gap-8">
              {/* Left: main content */}
              <div className="flex-1 min-w-0 space-y-6">
                <CollectionHeader
                  collection={collection}
                  onTogglePublished={(val) => togglePublished.mutate(val === "published")}
                />

                <div className="border-t border-border" />

                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">Categories ({categories.length})</h2>
                  <Button onClick={() => setCreateCategoryOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create New Category
                  </Button>
                </div>

                {categories.length === 0 ? (
                  <div className="flex items-center justify-center gap-8 py-16">
                    <div className="flex flex-col items-center text-center max-w-[160px]">
                      <div className="h-16 w-16 rounded-xl bg-muted/60 flex items-center justify-center mb-3">
                        <FolderOpen className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Step 1</p>
                      <p className="text-sm font-medium text-foreground">Create Categories</p>
                    </div>
                    <div className="text-muted-foreground/30 text-2xl tracking-[0.3em] mt-[-2rem]">···›</div>
                    <div className="flex flex-col items-center text-center max-w-[160px]">
                      <div className="h-16 w-16 rounded-xl bg-muted/60 flex items-center justify-center mb-3">
                        <FolderInput className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Step 2</p>
                      <p className="text-sm font-medium text-foreground">Add Workouts into Categories</p>
                    </div>
                    <div className="text-muted-foreground/30 text-2xl tracking-[0.3em] mt-[-2rem]">···›</div>
                    <div className="flex flex-col items-center text-center max-w-[160px]">
                      <div className="h-16 w-16 rounded-xl bg-muted/60 flex items-center justify-center mb-3">
                        <CloudUpload className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Step 3</p>
                      <p className="text-sm font-medium text-foreground">Publish and add clients</p>
                    </div>
                  </div>
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
              </div>

              {/* Right: phone preview */}
              <div className="hidden lg:block w-[300px] shrink-0">
                <WorkoutPhonePreview
                  collectionName={collection.name}
                  categories={categories}
                />
              </div>
            </div>
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
          onCreated={(cat) => setActiveCategoryId(cat.id)}
        />

        <AddWorkoutTypePicker
          open={typePickerOpen}
          onOpenChange={setTypePickerOpen}
          onSelectRegular={() => {
            setSelectedCategory(typePickerCategoryId);
            setCreateRegularOpen(true);
          }}
          onSelectVideo={() => {
            navigate("/ondemand-workouts?create=video");
          }}
        />

        <CreateOndemandWorkoutDialog
          open={createRegularOpen}
          onOpenChange={setCreateRegularOpen}
          presetType="regular"
          categoryId={selectedCategory}
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
