import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Plus, Tags } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateWorkoutLabelDialog } from "@/components/CreateWorkoutLabelDialog";
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

const categoryInfo = {
  level: { title: "Level", description: "Workout difficulty levels", color: "bg-blue-500" },
  duration: { title: "Duration", description: "Workout length", color: "bg-green-500" },
  intensity: { title: "Intensity", description: "Workout intensity levels", color: "bg-orange-500" },
  type: { title: "Type", description: "Workout categories", color: "bg-purple-500" },
  body_part: { title: "Body Part", description: "Target muscle groups", color: "bg-pink-500" },
  location: { title: "Location", description: "Where workouts take place", color: "bg-cyan-500" },
};

export default function WorkoutLabels() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [labelToDelete, setLabelToDelete] = useState<any>(null);

  const { data: labels, isLoading } = useQuery({
    queryKey: ["workout-labels", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_labels")
        .select("*")
        .or(`trainer_id.eq.${user?.id},is_default.eq.true`)
        .order("category", { ascending: true })
        .order("value", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workout_labels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-labels"] });
      toast({ title: "Label deleted successfully" });
      setDeleteDialogOpen(false);
      setLabelToDelete(null);
    },
    onError: () => {
      toast({ title: "Failed to delete label", variant: "destructive" });
    },
  });

  const groupedLabels = labels?.reduce((acc: any, label) => {
    if (!acc[label.category]) {
      acc[label.category] = [];
    }
    acc[label.category].push(label);
    return acc;
  }, {});

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Workout Labels</h1>
            <p className="text-muted-foreground mt-2">
              Manage labels to help organize and filter your on-demand workouts
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Label
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Loading labels...</div>
        ) : !labels?.length ? (
          <Card className="text-center py-12">
            <CardContent className="pt-6">
              <Tags className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No custom labels yet</h3>
              <p className="text-muted-foreground mb-4">
                Create custom labels to organize your workouts
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Label
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(categoryInfo).map(([category, info]: [string, any]) => {
              const categoryLabels = groupedLabels?.[category] || [];
              
              return (
                <Card key={category}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${info.color}`} />
                      {info.title}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{info.description}</p>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {categoryLabels.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">No labels yet</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {categoryLabels.map((label: any) => (
                          <Badge
                            key={label.id}
                            variant={label.is_default ? "secondary" : "default"}
                            className="cursor-pointer hover:opacity-80 relative group"
                          >
                            {label.value}
                            {!label.is_default && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLabelToDelete(label);
                                  setDeleteDialogOpen(true);
                                }}
                                className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                ×
                              </button>
                            )}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <CreateWorkoutLabelDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Label</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{labelToDelete?.value}"? This will remove it from all workouts.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => labelToDelete && deleteMutation.mutate(labelToDelete.id)}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
