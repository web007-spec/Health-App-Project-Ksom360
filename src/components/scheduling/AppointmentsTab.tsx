import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { CalendarIcon, Clock, User, XCircle, CheckCircle2, AlertCircle, Plus } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { CreateAppointmentDialog } from "./CreateAppointmentDialog";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
  confirmed: { label: "Confirmed", variant: "default", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", variant: "destructive", icon: XCircle },
  completed: { label: "Completed", variant: "secondary", icon: CheckCircle2 },
  no_show: { label: "No Show", variant: "outline", icon: AlertCircle },
};

export function AppointmentsTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("upcoming");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data: appointments, isLoading } = useQuery({
    queryKey: ["trainer-appointments", user?.id, filter],
    queryFn: async () => {
      let query = supabase
        .from("appointments")
        .select("*, appointment_type:appointment_types(name, color, duration_minutes), client:profiles!appointments_client_id_fkey(full_name, email)")
        .eq("trainer_id", user!.id);

      if (filter === "upcoming") {
        query = query.gte("start_time", new Date().toISOString()).in("status", ["confirmed"]);
      } else if (filter === "past") {
        query = query.lt("start_time", new Date().toISOString());
      }

      const { data, error } = await query.order("start_time", { ascending: filter === "upcoming" });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === "cancelled") {
        updates.cancelled_by = user!.id;
        updates.cancelled_at = new Date().toISOString();
      }
      const { error } = await supabase.from("appointments").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainer-appointments"] });
      toast({ title: "Appointment updated" });
    },
  });

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="past">Past</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Appointment
        </Button>
      </div>

      {appointments && appointments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No {filter} appointments.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {appointments?.map((appt) => {
            const statusConfig = STATUS_CONFIG[appt.status] || STATUS_CONFIG.confirmed;
            const StatusIcon = statusConfig.icon;
            return (
              <Card key={appt.id}>
                <CardContent className="py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-1 h-12 rounded-full"
                      style={{ backgroundColor: (appt as any).appointment_type?.color || "#3b82f6" }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{(appt as any).appointment_type?.name || "Appointment"}</p>
                        <Badge variant={statusConfig.variant} className="text-xs gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3" />
                          {format(new Date(appt.start_time), "EEE, MMM d, yyyy")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(appt.start_time), "h:mm a")} — {format(new Date(appt.end_time), "h:mm a")}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {(appt as any).client?.full_name || (appt as any).client?.email || "Client"}
                        </span>
                      </div>
                    </div>
                  </div>
                  {appt.status === "confirmed" && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateStatusMutation.mutate({ id: appt.id, status: "completed" })}
                      >
                        Complete
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => updateStatusMutation.mutate({ id: appt.id, status: "cancelled" })}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <CreateAppointmentDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
    </div>
  );
}
