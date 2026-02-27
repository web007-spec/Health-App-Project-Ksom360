import { useState } from "react";
import { ClientLayout } from "@/components/ClientLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { CalendarIcon, Clock, User, XCircle, CheckCircle2, AlertCircle, Plus } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
  confirmed: { label: "Upcoming", variant: "default", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", variant: "destructive", icon: XCircle },
  completed: { label: "Completed", variant: "secondary", icon: CheckCircle2 },
  no_show: { label: "No Show", variant: "outline", icon: AlertCircle },
};

export default function ClientAppointments() {
  const { user } = useAuth();
  const clientId = useEffectiveClientId();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"upcoming" | "past">("upcoming");

  const { data: appointments, isLoading } = useQuery({
    queryKey: ["client-appointments", clientId, filter],
    queryFn: async () => {
      let query = supabase
        .from("appointments")
        .select("*, appointment_type:appointment_types(name, color, duration_minutes, location_type)")
        .eq("client_id", clientId!);

      if (filter === "upcoming") {
        query = query.gte("start_time", new Date().toISOString()).in("status", ["confirmed"]);
      } else {
        query = query.lt("start_time", new Date().toISOString());
      }

      const { data, error } = await query.order("start_time", { ascending: filter === "upcoming" });
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "cancelled", cancelled_by: user!.id, cancelled_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-appointments"] });
      toast({ title: "Appointment cancelled" });
    },
  });

  return (
    <ClientLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Appointments</h1>
            <p className="text-muted-foreground mt-1">Your scheduled sessions</p>
          </div>
          <Button onClick={() => navigate("/client/booking")}>
            <Plus className="h-4 w-4 mr-2" /> Book Session
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            variant={filter === "upcoming" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("upcoming")}
          >
            Upcoming
          </Button>
          <Button
            variant={filter === "past" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("past")}
          >
            Past
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : appointments && appointments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                {filter === "upcoming" ? "No upcoming appointments." : "No past appointments."}
              </p>
              {filter === "upcoming" && (
                <Button onClick={() => navigate("/client/booking")}>Book Your First Session</Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {appointments?.map((appt) => {
              const statusConfig = STATUS_CONFIG[appt.status] || STATUS_CONFIG.confirmed;
              const StatusIcon = statusConfig.icon;
              return (
                <Card key={appt.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div
                          className="w-1.5 h-12 rounded-full mt-0.5"
                          style={{ backgroundColor: (appt as any).appointment_type?.color || "#3b82f6" }}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{(appt as any).appointment_type?.name || "Appointment"}</p>
                            <Badge variant={statusConfig.variant} className="text-xs gap-1">
                              <StatusIcon className="h-3 w-3" />
                              {statusConfig.label}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3" />
                              {format(new Date(appt.start_time), "EEE, MMM d, yyyy")}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(appt.start_time), "h:mm a")} – {format(new Date(appt.end_time), "h:mm a")}
                            </span>
                          </div>
                        </div>
                      </div>
                      {appt.status === "confirmed" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => cancelMutation.mutate(appt.id)}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}