import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, Play, Dumbbell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateOndemandWorkoutDialog } from "@/components/CreateOndemandWorkoutDialog";
import { EditOndemandWorkoutDialog } from "@/components/EditOndemandWorkoutDialog";

export default function OndemandWorkouts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<any>(null);

  const { data: workouts, isLoading } = useQuery({
    queryKey: ["ondemand-workouts", user?.id],
    queryFn: async () => {
      const { data, error} = await supabase
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

  const filteredWorkouts = workouts?.filter((workout) =>
    workout.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">On-Demand Workouts</h1>
            <p className="text-muted-foreground mt-2">
              Create workouts for your on-demand library
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Workout
          </Button>
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search workouts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Loading workouts...</div>
        ) : !filteredWorkouts?.length ? (
          <Card className="text-center py-12">
            <CardContent className="pt-6">
              <Dumbbell className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No workouts yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first on-demand workout to get started
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Workout
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredWorkouts.map((workout) => {
              const labels = workout.workout_workout_labels?.map((l: any) => l.workout_labels) || [];
              const levelLabel = labels.find((l: any) => l?.category === "level");
              const durationLabel = labels.find((l: any) => l?.category === "duration");

              return (
                <Card key={workout.id} className="overflow-hidden">
                  <CardHeader className="p-0">
                    {workout.thumbnail_url ? (
                      <img
                        src={workout.thumbnail_url}
                        alt={workout.name}
                        className="w-full h-40 object-cover"
                      />
                    ) : (
                      <div className="w-full h-40 bg-muted flex items-center justify-center">
                        {workout.type === "video" ? (
                          <Play className="h-12 w-12 text-muted-foreground" />
                        ) : (
                          <Dumbbell className="h-12 w-12 text-muted-foreground" />
                        )}
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="p-4">
                    <h3 className="font-semibold line-clamp-2 mb-2">{workout.name}</h3>
                    <div className="flex gap-2 flex-wrap">
                      {levelLabel && (
                        <Badge variant="secondary" className="text-xs">
                          {levelLabel.value}
                        </Badge>
                      )}
                      {durationLabel && (
                        <Badge variant="outline" className="text-xs">
                          {durationLabel.value}
                        </Badge>
                      )}
                      <Badge variant="default" className="text-xs capitalize">
                        {workout.type}
                      </Badge>
                    </div>
                  </CardContent>
                  <CardFooter className="p-4 pt-0">
                    <Button variant="outline" size="sm" className="w-full" onClick={() => setEditingWorkout(workout)}>
                      Edit
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

        <CreateOndemandWorkoutDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />

        {editingWorkout && (
          <EditOndemandWorkoutDialog
            open={!!editingWorkout}
            onOpenChange={(open) => { if (!open) setEditingWorkout(null); }}
            workout={editingWorkout}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
