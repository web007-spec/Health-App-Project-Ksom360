import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Users, Clock, MapPin, Calendar, Trash2, Video } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { format, addMinutes } from "date-fns";
import { CreateGroupClassDialog } from "./CreateGroupClassDialog";

export function GroupClassesTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [addSessionFor, setAddSessionFor] = useState<any>(null);
  const [sessionDate, setSessionDate] = useState("");
  const [sessionTime, setSessionTime] = useState("");

  const { data: classes, isLoading } = useQuery({
    queryKey: ["group-classes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_classes")
        .select("*")
        .eq("trainer_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch upcoming sessions for each class
  const { data: upcomingSessions } = useQuery({
    queryKey: ["group-class-sessions-upcoming", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_class_sessions")
        .select("*, group_class:group_classes(name, color), bookings:group_class_bookings(id, status)")
        .eq("trainer_id", user!.id)
        .gte("start_time", new Date().toISOString())
        .order("start_time");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const addSessionMutation = useMutation({
    mutationFn: async () => {
      if (!addSessionFor || !sessionDate || !sessionTime) return;
      const startTime = new Date(`${sessionDate}T${sessionTime}`);
      const endTime = addMinutes(startTime, addSessionFor.duration_minutes);
      const { error } = await supabase.from("group_class_sessions").insert({
        class_id: addSessionFor.id,
        trainer_id: user!.id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        max_capacity: addSessionFor.max_capacity,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-class-sessions-upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-class-sessions"] });
      toast({ title: "Session added" });
      setAddSessionFor(null);
      setSessionDate("");
      setSessionTime("");
    },
    onError: () => {
      toast({ title: "Error adding session", variant: "destructive" });
    },
  });

  const cancelSessionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("group_class_sessions")
        .update({ is_cancelled: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-class-sessions-upcoming"] });
      toast({ title: "Session cancelled" });
    },
  });

  const deleteClassMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("group_classes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-classes"] });
      toast({ title: "Class deleted" });
    },
  });

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;

  const locationIcon = (type: string) => type === "virtual" ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />;

  return (
    <div className="space-y-6">
      {/* Class definitions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Your Classes</h3>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Class
          </Button>
        </div>

        {(!classes || classes.length === 0) ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">No group classes yet.</p>
              <Button onClick={() => setShowCreate(true)}>Create Your First Class</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {classes.map((cls) => (
              <Card key={cls.id}>
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-12 rounded-full" style={{ backgroundColor: cls.color || "#8b5cf6" }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{cls.name}</p>
                        {cls.is_recurring && <Badge variant="secondary" className="text-xs">Recurring</Badge>}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{cls.duration_minutes}min</span>
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" />Max {cls.max_capacity}</span>
                        <span className="flex items-center gap-1">{locationIcon(cls.location_type)}{cls.location_type === "in_person" ? "In-Person" : cls.location_type === "virtual" ? "Virtual" : "Both"}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => setAddSessionFor(cls)}>
                        <Calendar className="h-3 w-3 mr-1" /> Add Session
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteClassMutation.mutate(cls.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming sessions */}
      {upcomingSessions && upcomingSessions.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold">Upcoming Sessions</h3>
          <div className="space-y-2">
            {upcomingSessions.map((session) => {
              const confirmedCount = (session.bookings || []).filter((b: any) => b.status === "confirmed").length;
              return (
                <Card key={session.id}>
                  <CardContent className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-1 h-10 rounded-full" style={{ backgroundColor: (session as any).group_class?.color || "#8b5cf6" }} />
                      <div>
                        <p className="text-sm font-medium">{(session as any).group_class?.name}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(session.start_time), "EEE, MMM d")}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(session.start_time), "h:mm a")}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {confirmedCount}/{session.max_capacity}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {session.is_cancelled ? (
                        <Badge variant="destructive">Cancelled</Badge>
                      ) : (
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => cancelSessionMutation.mutate(session.id)}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <CreateGroupClassDialog open={showCreate} onOpenChange={setShowCreate} />

      {/* Add Session Dialog */}
      <Dialog open={!!addSessionFor} onOpenChange={() => setAddSessionFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Session – {addSessionFor?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date</Label>
              <Input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} />
            </div>
            <div>
              <Label>Time</Label>
              <Input type="time" value={sessionTime} onChange={(e) => setSessionTime(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddSessionFor(null)}>Cancel</Button>
            <Button onClick={() => addSessionMutation.mutate()} disabled={!sessionDate || !sessionTime || addSessionMutation.isPending}>
              {addSessionMutation.isPending ? "Adding..." : "Add Session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
