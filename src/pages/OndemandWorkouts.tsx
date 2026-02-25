import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, Dumbbell, ChevronDown, MoreVertical, Users, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import { CreateOndemandWorkoutDialog } from "@/components/CreateOndemandWorkoutDialog";
import { EditOndemandWorkoutDialog } from "@/components/EditOndemandWorkoutDialog";
import { AddWorkoutTypePicker } from "@/components/AddWorkoutTypePicker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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

type SortField = "recent" | "name" | "level" | "duration";

export default function OndemandWorkouts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createType, setCreateType] = useState<"regular" | "video">("regular");
  const [editingWorkout, setEditingWorkout] = useState<any>(null);
  const [sortField, setSortField] = useState<SortField>("recent");
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const { data: workouts, isLoading } = useQuery({
    queryKey: ["ondemand-workouts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ondemand_workouts")
        .select(`
          *,
          workout_workout_labels(
            workout_labels(*)
          )
        `)
        .eq("trainer_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ondemand_workouts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ondemand-workouts"] });
      toast({ title: "Workout deleted" });
      setDeleteTarget(null);
    },
    onError: () => {
      toast({ title: "Failed to delete workout", variant: "destructive" });
    },
  });

  const getLabel = (workout: any, category: string) => {
    const labels = workout.workout_workout_labels?.map((l: any) => l.workout_labels) || [];
    return labels.find((l: any) => l?.category === category);
  };

  const sortedAndFiltered = useMemo(() => {
    let list = workouts?.filter((w) =>
      w.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    list.sort((a, b) => {
      if (sortField === "name") return a.name.localeCompare(b.name);
      if (sortField === "level") {
        const la = getLabel(a, "level")?.value || "";
        const lb = getLabel(b, "level")?.value || "";
        return la.localeCompare(lb);
      }
      if (sortField === "duration") {
        const da = getLabel(a, "duration")?.value || "";
        const db = getLabel(b, "duration")?.value || "";
        return da.localeCompare(db);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return list;
  }, [workouts, searchQuery, sortField]);

  const sortLabels: Record<SortField, string> = {
    recent: "Most Recent",
    name: "Name",
    level: "Level",
    duration: "Duration",
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">On-demand Workout Library</h1>
          <Button onClick={() => setTypePickerOpen(true)} className="bg-primary hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" />
            Add New Workout
          </Button>
        </div>

        {/* Search + Filter */}
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by keyword or name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
        </div>

        {/* Table header */}
        <div className="border-b border-border">
          <div className="flex items-center py-3 text-sm text-muted-foreground">
            <div className="flex-1">
              <span className="font-medium">Workouts ({sortedAndFiltered.length})</span>
              <ChevronDown className="inline h-3.5 w-3.5 ml-1" />
            </div>
            <button
              onClick={() => setSortField("level")}
              className={`w-28 text-left flex items-center gap-1 hover:text-foreground transition-colors ${sortField === "level" ? "text-primary font-medium" : ""}`}
            >
              Level <ChevronDown className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setSortField("duration")}
              className={`w-24 text-left flex items-center gap-1 hover:text-foreground transition-colors ${sortField === "duration" ? "text-primary font-medium" : ""}`}
            >
              Duration <ChevronDown className="h-3.5 w-3.5" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-32 text-right flex items-center justify-end gap-1 text-primary font-medium hover:text-primary/80 transition-colors">
                  {sortLabels[sortField]} <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(Object.keys(sortLabels) as SortField[]).map((key) => (
                  <DropdownMenuItem key={key} onClick={() => setSortField(key)}>
                    {sortLabels[key]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading workouts...</div>
        ) : !sortedAndFiltered.length ? (
          <div className="text-center py-16">
            <Dumbbell className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No workouts yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first on-demand workout to get started
            </p>
            <Button onClick={() => setTypePickerOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add New Workout
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sortedAndFiltered.map((workout) => {
              const levelLabel = getLabel(workout, "level");
              const durationLabel = getLabel(workout, "duration");

              return (
                <div
                  key={workout.id}
                  className="flex items-center py-3 hover:bg-accent/50 transition-colors rounded-md px-2 -mx-2 cursor-pointer group"
                  onClick={() => setEditingWorkout(workout)}
                >
                  {/* Thumbnail */}
                  <div className="h-12 w-16 rounded-md overflow-hidden bg-muted flex-shrink-0 mr-4">
                    {workout.thumbnail_url ? (
                      <img src={workout.thumbnail_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                        <Dumbbell className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{workout.name}</p>
                  </div>

                  {/* Level */}
                  <div className="w-28 text-sm text-muted-foreground">
                    {levelLabel?.value || "—"}
                  </div>

                  {/* Duration */}
                  <div className="w-24 text-sm text-muted-foreground">
                    {durationLabel?.value || "0s"}
                  </div>

                  {/* Actions */}
                  <div className="w-32 flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(workout);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Future: assign to client
                      }}
                    >
                      <Users className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingWorkout(workout)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteTarget(workout)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <AddWorkoutTypePicker
          open={typePickerOpen}
          onOpenChange={setTypePickerOpen}
          onSelectRegular={() => { setCreateType("regular"); setCreateDialogOpen(true); }}
          onSelectVideo={() => { setCreateType("video"); setCreateDialogOpen(true); }}
        />

        <CreateOndemandWorkoutDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          presetType={createType}
        />

        {editingWorkout && (
          <EditOndemandWorkoutDialog
            open={!!editingWorkout}
            onOpenChange={(open) => { if (!open) setEditingWorkout(null); }}
            workout={editingWorkout}
          />
        )}

        {/* Delete confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete workout?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete "{deleteTarget?.name}" and remove it from any collections.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
