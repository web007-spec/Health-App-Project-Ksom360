import { DashboardLayout } from "@/components/DashboardLayout";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Video, ArrowUpDown, Dumbbell, Trash2, X } from "lucide-react";
import { ExerciseCard } from "@/components/ExerciseCard";
import { CreateExerciseDialog } from "@/components/CreateExerciseDialog";
import { EditExerciseDialog } from "@/components/EditExerciseDialog";
import { toast } from "sonner";
import { useExerciseOptions } from "@/hooks/useExerciseOptions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Options provided by useExerciseOptions hook

export default function Exercises() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { muscleGroups, equipmentTypes, categories } = useExerciseOptions();
  const [searchTerm, setSearchTerm] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("all");
  const [equipmentFilter, setEquipmentFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: exercises, isLoading } = useQuery({
    queryKey: ["exercises", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercises")
        .select("*")
        .eq("trainer_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch exercise tags for filtering
  const { data: exerciseTagsData } = useQuery({
    queryKey: ["exercise-tags-with-exercises", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercise_exercise_tags")
        .select(`
          exercise_id,
          tag_id,
          exercise_tags:tag_id (
            id,
            name
          )
        `);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch available tags
  const { data: availableTags } = useQuery({
    queryKey: ["exercise-tags", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercise_tags")
        .select("*")
        .or(`trainer_id.eq.${user?.id},is_default.eq.true`)
        .order("name");
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Filter and sort exercises
  const filteredExercises = exercises?.filter((exercise) => {
    const matchesSearch = 
      exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exercise.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMuscle = muscleFilter === "all" || exercise.muscle_group === muscleFilter;
    const matchesEquipment = equipmentFilter === "all" || exercise.equipment === equipmentFilter;
    const matchesCategory = categoryFilter === "all" || exercise.category === categoryFilter;
    
    // Check if exercise has the selected tag
    const matchesTag = tagFilter === "all" || 
      exerciseTagsData?.some((et: any) => 
        et.exercise_id === exercise.id && et.tag_id === tagFilter
      );

    return matchesSearch && matchesMuscle && matchesEquipment && matchesCategory && matchesTag;
  }) || [];

  // Sort exercises
  const sortedExercises = [...filteredExercises].sort((a, b) => {
    if (sortBy === "newest") {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    } else if (sortBy === "oldest") {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    } else if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    }
    return 0;
  });

  const videoDemoCount = exercises?.filter(ex => ex.video_url).length || 0;

  const handleEditExercise = (exercise: any) => {
    setSelectedExercise(exercise);
    setIsEditDialogOpen(true);
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("exercises")
        .delete()
        .in("id", Array.from(selectedIds));

      if (error) throw error;

      toast.success(`Deleted ${selectedIds.size} exercise${selectedIds.size > 1 ? 's' : ''}`);
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      exitSelectionMode();
    } catch (error) {
      console.error("Error deleting exercises:", error);
      toast.error("Failed to delete exercises");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Exercise Library</h1>
            <p className="text-muted-foreground mt-1">
              {exercises?.length || 0} total exercises • {videoDemoCount} with video demos
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectionMode ? (
              <>
                <Button variant="outline" onClick={exitSelectionMode}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={selectedIds.size === 0}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete ({selectedIds.size})
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setSelectionMode(true)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Bulk Delete
                </Button>
                <Button onClick={() => setIsCreateDialogOpen(true)} size="lg">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Exercise
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-lg border border-border p-6 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter Row */}
          <div className="flex flex-wrap gap-4 items-center">
            <Select value={muscleFilter} onValueChange={setMuscleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Muscles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Muscles</SelectItem>
                {muscleGroups.map((muscle) => (
                  <SelectItem key={muscle} value={muscle}>
                    {muscle.charAt(0).toUpperCase() + muscle.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={equipmentFilter} onValueChange={setEquipmentFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Equipment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Equipment</SelectItem>
                {equipmentTypes.map((equipment) => (
                  <SelectItem key={equipment} value={equipment}>
                    {equipment.charAt(0).toUpperCase() + equipment.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Tags" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tags</SelectItem>
                {availableTags?.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    {tag.name.charAt(0).toUpperCase() + tag.name.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="ml-auto flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="name">Name A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {sortedExercises.length} of {exercises?.length || 0} exercises
          </p>
          {videoDemoCount > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Video className="h-4 w-4" />
              <span>{videoDemoCount} with videos</span>
            </div>
          )}
        </div>

        {/* Exercise Grid */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading exercises...</div>
        ) : sortedExercises.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-lg border border-border">
            <Dumbbell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No exercises found</h3>
            <p className="text-muted-foreground mb-4">
              {exercises?.length === 0 
                ? "Create your first exercise to get started" 
                : "Try adjusting your filters"}
            </p>
            {exercises?.length === 0 && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Exercise
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedExercises.map((exercise) => (
              <ExerciseCard 
                key={exercise.id} 
                exercise={exercise} 
                onEdit={selectionMode ? undefined : handleEditExercise}
                selectionMode={selectionMode}
                isSelected={selectedIds.has(exercise.id)}
                onToggleSelect={() => toggleSelection(exercise.id)}
              />
            ))}
          </div>
        )}
      </div>

      <CreateExerciseDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      <EditExerciseDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        exercise={selectedExercise}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} exercise{selectedIds.size > 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected exercises from your library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete} 
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
