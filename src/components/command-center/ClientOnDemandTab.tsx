import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Play, Dumbbell, Trash2, Plus } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ClientOnDemandTabProps {
  clientId: string;
  trainerId: string;
}

export function ClientOnDemandTab({ clientId, trainerId }: ClientOnDemandTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [resourcePickerOpen, setResourcePickerOpen] = useState(false);
  const [workoutPickerOpen, setWorkoutPickerOpen] = useState(false);

  // Fetch assigned resource collections
  const { data: assignedResources, isLoading: loadingResources } = useQuery({
    queryKey: ["client-resource-access", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_collection_access")
        .select("*, resource_collections(*)")
        .eq("client_id", clientId);
      if (error) throw error;
      return data;
    },
  });

  // Fetch assigned workout collections
  const { data: assignedWorkouts, isLoading: loadingWorkouts } = useQuery({
    queryKey: ["client-workout-collection-access", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_workout_collection_access")
        .select("*, workout_collections(*)")
        .eq("client_id", clientId);
      if (error) throw error;
      return data;
    },
  });

  // Fetch all trainer resource collections for picker
  const { data: allResourceCollections } = useQuery({
    queryKey: ["trainer-resource-collections", trainerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resource_collections")
        .select("*")
        .eq("trainer_id", trainerId);
      if (error) throw error;
      return data;
    },
    enabled: resourcePickerOpen,
  });

  // Fetch all trainer workout collections for picker
  const { data: allWorkoutCollections } = useQuery({
    queryKey: ["trainer-workout-collections", trainerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_collections")
        .select("*")
        .eq("trainer_id", trainerId);
      if (error) throw error;
      return data;
    },
    enabled: workoutPickerOpen,
  });

  const assignResourceMutation = useMutation({
    mutationFn: async (collectionId: string) => {
      const { error } = await supabase
        .from("client_collection_access")
        .insert({ client_id: clientId, collection_id: collectionId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-resource-access", clientId] });
      toast({ title: "Resource collection assigned" });
      setResourcePickerOpen(false);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const removeResourceMutation = useMutation({
    mutationFn: async (accessId: string) => {
      const { error } = await supabase
        .from("client_collection_access")
        .delete()
        .eq("id", accessId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-resource-access", clientId] });
      toast({ title: "Resource collection removed" });
    },
  });

  const assignWorkoutMutation = useMutation({
    mutationFn: async (collectionId: string) => {
      const { error } = await supabase
        .from("client_workout_collection_access")
        .insert({ client_id: clientId, collection_id: collectionId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-workout-collection-access", clientId] });
      toast({ title: "Workout collection assigned" });
      setWorkoutPickerOpen(false);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const removeWorkoutMutation = useMutation({
    mutationFn: async (accessId: string) => {
      const { error } = await supabase
        .from("client_workout_collection_access")
        .delete()
        .eq("id", accessId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-workout-collection-access", clientId] });
      toast({ title: "Workout collection removed" });
    },
  });

  const assignedResourceIds = assignedResources?.map((a: any) => a.collection_id) || [];
  const assignedWorkoutIds = assignedWorkouts?.map((a: any) => a.collection_id) || [];
  const availableResources = allResourceCollections?.filter((c: any) => !assignedResourceIds.includes(c.id)) || [];
  const availableWorkouts = allWorkoutCollections?.filter((c: any) => !assignedWorkoutIds.includes(c.id)) || [];

  return (
    <div className="space-y-8">
      {/* Resource Collections */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Resource Collections</h3>
          <Button size="sm" className="gap-2" onClick={() => setResourcePickerOpen(true)}>
            <Plus className="h-4 w-4" />
            Assign Collection
          </Button>
        </div>

        {loadingResources ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : !assignedResources?.length ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Package className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">No resource collections assigned yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {assignedResources.map((access: any) => {
              const col = access.resource_collections;
              return (
                <Card key={access.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{col?.name}</p>
                        {col?.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">{col.description}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeResourceMutation.mutate(access.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Workout Collections */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Workout Collections</h3>
          <Button size="sm" className="gap-2" onClick={() => setWorkoutPickerOpen(true)}>
            <Plus className="h-4 w-4" />
            Assign Collection
          </Button>
        </div>

        {loadingWorkouts ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : !assignedWorkouts?.length ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Dumbbell className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">No workout collections assigned yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {assignedWorkouts.map((access: any) => {
              const col = access.workout_collections;
              return (
                <Card key={access.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {col?.cover_image_url ? (
                        <img src={col.cover_image_url} alt={col.name} className="h-10 w-10 rounded-lg object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Play className="h-5 w-5 text-primary" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{col?.name}</p>
                        {col?.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">{col.description}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeWorkoutMutation.mutate(access.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Resource Collection Picker */}
      <Dialog open={resourcePickerOpen} onOpenChange={setResourcePickerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign a Resource Collection</DialogTitle>
          </DialogHeader>
          {!availableResources.length ? (
            <p className="text-muted-foreground text-sm py-4 text-center">
              No more collections available to assign
            </p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {availableResources.map((col: any) => (
                <Card
                  key={col.id}
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => assignResourceMutation.mutate(col.id)}
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    <Package className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="font-medium text-sm">{col.name}</p>
                      {col.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{col.description}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Workout Collection Picker */}
      <Dialog open={workoutPickerOpen} onOpenChange={setWorkoutPickerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign a Workout Collection</DialogTitle>
          </DialogHeader>
          {!availableWorkouts.length ? (
            <p className="text-muted-foreground text-sm py-4 text-center">
              No more collections available to assign
            </p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {availableWorkouts.map((col: any) => (
                <Card
                  key={col.id}
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => assignWorkoutMutation.mutate(col.id)}
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    {col.cover_image_url ? (
                      <img src={col.cover_image_url} alt={col.name} className="h-8 w-8 rounded object-cover" />
                    ) : (
                      <Play className="h-5 w-5 text-primary shrink-0" />
                    )}
                    <div>
                      <p className="font-medium text-sm">{col.name}</p>
                      {col.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{col.description}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
