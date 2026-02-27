import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { addMinutes } from "date-fns";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateAppointmentDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [clientId, setClientId] = useState("");
  const [typeId, setTypeId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");

  const { data: clients } = useQuery({
    queryKey: ["trainer-clients-list", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainer_clients")
        .select("client_id, profiles!trainer_clients_client_id_fkey(full_name, email)")
        .eq("trainer_id", user!.id)
        .eq("status", "active");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && open,
  });

  const { data: types } = useQuery({
    queryKey: ["appointment-types", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointment_types")
        .select("*")
        .eq("trainer_id", user!.id)
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && open,
  });

  const selectedType = types?.find((t) => t.id === typeId);

  const mutation = useMutation({
    mutationFn: async () => {
      const startTime = new Date(`${date}T${time}`);
      const duration = selectedType?.duration_minutes || 60;
      const endTime = addMinutes(startTime, duration);

      const { error } = await supabase.from("appointments").insert({
        trainer_id: user!.id,
        client_id: clientId,
        appointment_type_id: typeId || null,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        notes: notes || null,
        status: "confirmed",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainer-appointments"] });
      toast({ title: "Appointment created" });
      onOpenChange(false);
      setClientId("");
      setTypeId("");
      setDate("");
      setTime("");
      setNotes("");
    },
    onError: () => {
      toast({ title: "Error creating appointment", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Appointment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Client</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>
                {clients?.map((c) => (
                  <SelectItem key={c.client_id} value={c.client_id}>
                    {(c as any).profiles?.full_name || (c as any).profiles?.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Appointment Type</Label>
            <Select value={typeId} onValueChange={setTypeId}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {types?.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name} ({t.duration_minutes}min)</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label>Time</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any notes for this appointment..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!clientId || !date || !time || mutation.isPending}
          >
            {mutation.isPending ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}