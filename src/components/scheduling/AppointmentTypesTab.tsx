import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Video, MapPin, Globe } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { CreateAppointmentTypeDialog } from "./CreateAppointmentTypeDialog";
import { EditAppointmentTypeDialog } from "./EditAppointmentTypeDialog";
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

export function AppointmentTypesTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingType, setEditingType] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: types, isLoading } = useQuery({
    queryKey: ["appointment-types", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointment_types")
        .select("*")
        .eq("trainer_id", user!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("appointment_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointment-types"] });
      toast({ title: "Appointment type deleted" });
      setDeletingId(null);
    },
    onError: () => {
      toast({ title: "Error deleting appointment type", variant: "destructive" });
    },
  });

  const locationIcon = (type: string) => {
    if (type === "virtual") return <Video className="h-4 w-4" />;
    if (type === "both") return <Globe className="h-4 w-4" />;
    return <MapPin className="h-4 w-4" />;
  };

  const locationLabel = (type: string) => {
    if (type === "virtual") return "Virtual";
    if (type === "both") return "In-Person & Virtual";
    return "In-Person";
  };

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Define the types of appointments your clients can book.
        </p>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New Type
        </Button>
      </div>

      {types && types.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No appointment types yet. Create your first one to get started.</p>
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Create Appointment Type
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {types?.map((type) => (
            <Card key={type.id} className="relative">
              <div className="absolute top-0 left-0 right-0 h-1 rounded-t-lg" style={{ backgroundColor: type.color || '#3b82f6' }} />
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{type.name}</CardTitle>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingType(type)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeletingId(type.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {type.description && (
                  <p className="text-sm text-muted-foreground">{type.description}</p>
                )}
                <div className="flex items-center gap-3 text-sm">
                  <Badge variant="secondary">{type.duration_minutes} min</Badge>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    {locationIcon(type.location_type)}
                    <span>{locationLabel(type.location_type)}</span>
                  </div>
                </div>
                {!type.is_active && (
                  <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateAppointmentTypeDialog open={createOpen} onOpenChange={setCreateOpen} />
      {editingType && (
        <EditAppointmentTypeDialog
          open={!!editingType}
          onOpenChange={(open) => !open && setEditingType(null)}
          appointmentType={editingType}
        />
      )}

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete appointment type?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the appointment type. Any existing appointments of this type will remain but won't be linked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingId && deleteMutation.mutate(deletingId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
