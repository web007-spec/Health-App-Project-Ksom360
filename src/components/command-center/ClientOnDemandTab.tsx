import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Play, Trash2, GraduationCap } from "lucide-react";
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

/* ── Everfit-style promo card shown when nothing is assigned ── */
function PromoCard({
  gradient,
  icon: Icon,
  iconBg,
  title,
  description,
  buttonLabel,
  onAction,
}: {
  gradient: string;
  icon: React.ElementType;
  iconBg: string;
  title: string;
  description: string;
  buttonLabel: string;
  onAction: () => void;
}) {
  return (
    <Card className="overflow-hidden border-0 shadow-sm">
      <div className="flex flex-col sm:flex-row">
        {/* Illustration area */}
        <div className={`${gradient} flex items-center justify-center p-8 sm:w-[260px] shrink-0`}>
          <div className={`${iconBg} rounded-2xl p-6 shadow-lg`}>
            <Icon className="h-12 w-12 text-white" />
          </div>
        </div>
        {/* Content */}
        <div className="flex flex-col justify-center p-6 gap-3">
          <h4 className="text-lg font-bold">{title}</h4>
          <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
          <Button className="w-fit" onClick={onAction}>
            {buttonLabel}
          </Button>
        </div>
      </div>
    </Card>
  );
}

/* ── Assigned item row ── */
function AssignedRow({
  icon: Icon,
  imageUrl,
  name,
  description,
  onRemove,
}: {
  icon: React.ElementType;
  imageUrl?: string | null;
  name: string;
  description?: string | null;
  onRemove: () => void;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {imageUrl ? (
            <img src={imageUrl} alt={name} className="h-10 w-10 rounded-lg object-cover" />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="h-5 w-5 text-primary" />
            </div>
          )}
          <div>
            <p className="font-medium">{name}</p>
            {description && (
              <p className="text-sm text-muted-foreground line-clamp-1">{description}</p>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onRemove}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </CardContent>
    </Card>
  );
}

export function ClientOnDemandTab({ clientId, trainerId }: ClientOnDemandTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [resourcePickerOpen, setResourcePickerOpen] = useState(false);
  const [workoutPickerOpen, setWorkoutPickerOpen] = useState(false);
  const [programPickerOpen, setProgramPickerOpen] = useState(false);

  // ── Queries ──
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

  const { data: assignedPrograms, isLoading: loadingPrograms } = useQuery({
    queryKey: ["client-studio-program-access", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_studio_program_access")
        .select("*, studio_programs(*)")
        .eq("client_id", clientId);
      if (error) throw error;
      return data;
    },
  });

  // ── Picker queries ──
  const { data: allResourceCollections } = useQuery({
    queryKey: ["trainer-resource-collections", trainerId],
    queryFn: async () => {
      const { data, error } = await supabase.from("resource_collections").select("*").eq("trainer_id", trainerId);
      if (error) throw error;
      return data;
    },
    enabled: resourcePickerOpen,
  });

  const { data: allWorkoutCollections } = useQuery({
    queryKey: ["trainer-workout-collections", trainerId],
    queryFn: async () => {
      const { data, error } = await supabase.from("workout_collections").select("*").eq("trainer_id", trainerId);
      if (error) throw error;
      return data;
    },
    enabled: workoutPickerOpen,
  });

  const { data: allStudioPrograms } = useQuery({
    queryKey: ["trainer-studio-programs", trainerId],
    queryFn: async () => {
      const { data, error } = await supabase.from("studio_programs").select("*").eq("trainer_id", trainerId);
      if (error) throw error;
      return data;
    },
    enabled: programPickerOpen,
  });

  // ── Mutations ──
  const assignResourceMutation = useMutation({
    mutationFn: async (collectionId: string) => {
      const { error } = await supabase.from("client_collection_access").insert({ client_id: clientId, collection_id: collectionId });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["client-resource-access", clientId] }); toast({ title: "Resource collection assigned" }); setResourcePickerOpen(false); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const removeResourceMutation = useMutation({
    mutationFn: async (accessId: string) => { const { error } = await supabase.from("client_collection_access").delete().eq("id", accessId); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["client-resource-access", clientId] }); toast({ title: "Resource collection removed" }); },
  });

  const assignWorkoutMutation = useMutation({
    mutationFn: async (collectionId: string) => {
      const { error } = await supabase.from("client_workout_collection_access").insert({ client_id: clientId, collection_id: collectionId });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["client-workout-collection-access", clientId] }); toast({ title: "Workout collection assigned" }); setWorkoutPickerOpen(false); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const removeWorkoutMutation = useMutation({
    mutationFn: async (accessId: string) => { const { error } = await supabase.from("client_workout_collection_access").delete().eq("id", accessId); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["client-workout-collection-access", clientId] }); toast({ title: "Workout collection removed" }); },
  });

  const assignProgramMutation = useMutation({
    mutationFn: async (programId: string) => {
      const { error } = await supabase.from("client_studio_program_access").insert({ client_id: clientId, program_id: programId });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["client-studio-program-access", clientId] }); toast({ title: "Studio program assigned" }); setProgramPickerOpen(false); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const removeProgramMutation = useMutation({
    mutationFn: async (accessId: string) => { const { error } = await supabase.from("client_studio_program_access").delete().eq("id", accessId); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["client-studio-program-access", clientId] }); toast({ title: "Studio program removed" }); },
  });

  // ── Derived ──
  const assignedResourceIds = assignedResources?.map((a: any) => a.collection_id) || [];
  const assignedWorkoutIds = assignedWorkouts?.map((a: any) => a.collection_id) || [];
  const assignedProgramIds = assignedPrograms?.map((a: any) => a.program_id) || [];
  const availableResources = allResourceCollections?.filter((c: any) => !assignedResourceIds.includes(c.id)) || [];
  const availableWorkouts = allWorkoutCollections?.filter((c: any) => !assignedWorkoutIds.includes(c.id)) || [];
  const availablePrograms = allStudioPrograms?.filter((p: any) => !assignedProgramIds.includes(p.id)) || [];

  return (
    <div className="space-y-10">
      {/* ── Resource Collections ── */}
      <section className="space-y-4">
        <h3 className="text-xl font-bold">Resource Collections</h3>

        {loadingResources ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : !assignedResources?.length ? (
          <PromoCard
            gradient="bg-gradient-to-br from-rose-100 to-orange-100 dark:from-rose-950/40 dark:to-orange-950/40"
            icon={Package}
            iconBg="bg-gradient-to-br from-rose-400 to-orange-400"
            title="Assign a Resource Collection"
            description="Empower your client with a collection of resources (links and documents)"
            buttonLabel="Choose Collection"
            onAction={() => setResourcePickerOpen(true)}
          />
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3">
              {assignedResources.map((access: any) => (
                <AssignedRow
                  key={access.id}
                  icon={Package}
                  name={access.resource_collections?.name}
                  description={access.resource_collections?.description}
                  onRemove={() => removeResourceMutation.mutate(access.id)}
                />
              ))}
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setResourcePickerOpen(true)}>
              + Add Another
            </Button>
          </div>
        )}
      </section>

      {/* ── Workout Collections ── */}
      <section className="space-y-4">
        <h3 className="text-xl font-bold">Workout Collections</h3>

        {loadingWorkouts ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : !assignedWorkouts?.length ? (
          <PromoCard
            gradient="bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-950/40 dark:to-indigo-950/40"
            icon={Play}
            iconBg="bg-gradient-to-br from-blue-400 to-indigo-500"
            title="Assign a Workout Collection"
            description="Offer on-demand workouts that your clients can browse and start anytime"
            buttonLabel="Choose Collection"
            onAction={() => setWorkoutPickerOpen(true)}
          />
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3">
              {assignedWorkouts.map((access: any) => (
                <AssignedRow
                  key={access.id}
                  icon={Play}
                  imageUrl={access.workout_collections?.cover_image_url}
                  name={access.workout_collections?.name}
                  description={access.workout_collections?.description}
                  onRemove={() => removeWorkoutMutation.mutate(access.id)}
                />
              ))}
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setWorkoutPickerOpen(true)}>
              + Add Another
            </Button>
          </div>
        )}
      </section>

      {/* ── Studio Programs ── */}
      <section className="space-y-4">
        <h3 className="text-xl font-bold">Studio Programs</h3>

        {loadingPrograms ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : !assignedPrograms?.length ? (
          <PromoCard
            gradient="bg-gradient-to-br from-sky-100 to-cyan-100 dark:from-sky-950/40 dark:to-cyan-950/40"
            icon={GraduationCap}
            iconBg="bg-gradient-to-br from-sky-400 to-cyan-500"
            title="Add Studio Programs"
            description="Add flexible programs your client can start and stop anytime, without you lifting a finger."
            buttonLabel="Add a Studio Program"
            onAction={() => setProgramPickerOpen(true)}
          />
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3">
              {assignedPrograms.map((access: any) => (
                <AssignedRow
                  key={access.id}
                  icon={GraduationCap}
                  imageUrl={access.studio_programs?.cover_image_url}
                  name={access.studio_programs?.name}
                  description={access.studio_programs?.description}
                  onRemove={() => removeProgramMutation.mutate(access.id)}
                />
              ))}
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setProgramPickerOpen(true)}>
              + Add Another
            </Button>
          </div>
        )}
      </section>

      {/* ── Picker Dialogs ── */}
      <PickerDialog
        open={resourcePickerOpen}
        onOpenChange={setResourcePickerOpen}
        title="Assign a Resource Collection"
        items={availableResources}
        icon={Package}
        onSelect={(id) => assignResourceMutation.mutate(id)}
      />
      <PickerDialog
        open={workoutPickerOpen}
        onOpenChange={setWorkoutPickerOpen}
        title="Assign a Workout Collection"
        items={availableWorkouts}
        icon={Play}
        imageKey="cover_image_url"
        onSelect={(id) => assignWorkoutMutation.mutate(id)}
      />
      <PickerDialog
        open={programPickerOpen}
        onOpenChange={setProgramPickerOpen}
        title="Assign a Studio Program"
        items={availablePrograms}
        icon={GraduationCap}
        imageKey="cover_image_url"
        onSelect={(id) => assignProgramMutation.mutate(id)}
      />
    </div>
  );
}

/* ── Reusable picker dialog ── */
function PickerDialog({
  open,
  onOpenChange,
  title,
  items,
  icon: Icon,
  imageKey,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  items: any[];
  icon: React.ElementType;
  imageKey?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {!items.length ? (
          <p className="text-muted-foreground text-sm py-4 text-center">
            No more items available to assign
          </p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {items.map((item: any) => (
              <Card
                key={item.id}
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => onSelect(item.id)}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  {imageKey && item[imageKey] ? (
                    <img src={item[imageKey]} alt={item.name} className="h-8 w-8 rounded object-cover" />
                  ) : (
                    <Icon className="h-5 w-5 text-primary shrink-0" />
                  )}
                  <div>
                    <p className="font-medium text-sm">{item.name}</p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
