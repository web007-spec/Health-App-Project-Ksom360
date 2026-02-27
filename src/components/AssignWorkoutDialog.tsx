import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon, Users } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface AssignWorkoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workoutId: string;
  workoutName: string;
}

export function AssignWorkoutDialog({ open, onOpenChange, workoutId, workoutName }: AssignWorkoutDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [notes, setNotes] = useState("");

  // Fetch trainer's clients
  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ["trainer-clients", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainer_clients")
        .select(`
          *,
          client:profiles!trainer_clients_client_id_fkey(*)
        `)
        .eq("trainer_id", user?.id)
        .eq("status", "active")
        .order("assigned_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && open,
  });

  // Assignment mutation
  const assignMutation = useMutation({
    mutationFn: async () => {
      if (selectedClients.length === 0) {
        throw new Error("Please select at least one client");
      }

      const assignments = selectedClients.map((clientId) => ({
        workout_plan_id: workoutId,
        client_id: clientId,
        assigned_by: user?.id,
        scheduled_date: scheduledDate ? format(scheduledDate, "yyyy-MM-dd") : null,
        notes: notes.trim() || null,
      }));

      const { error } = await supabase
        .from("client_workouts")
        .insert(assignments);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-workouts"] });
      toast({
        title: "Success",
        description: `Workout assigned to ${selectedClients.length} client${selectedClients.length > 1 ? 's' : ''}`,
      });
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign workout",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setSelectedClients([]);
    setScheduledDate(undefined);
    setNotes("");
    onOpenChange(false);
  };

  const toggleClient = (clientId: string) => {
    setSelectedClients((prev) =>
      prev.includes(clientId)
        ? prev.filter((id) => id !== clientId)
        : [...prev, clientId]
    );
  };

  const handleAssign = () => {
    assignMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Workout</DialogTitle>
          <DialogDescription>
            Assign "{workoutName}" to your clients
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Client Selection */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Select Clients
            </Label>
            {clientsLoading ? (
              <div className="text-sm text-muted-foreground">Loading clients...</div>
            ) : clients && clients.length > 0 ? (
              <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                {clients.map((tc) => (
                  <div
                    key={tc.id}
                    className="flex items-center space-x-3 p-3 hover:bg-muted/50 cursor-pointer"
                    onClick={() => toggleClient(tc.client_id)}
                  >
                    <Checkbox
                      checked={selectedClients.includes(tc.client_id)}
                      onCheckedChange={() => toggleClient(tc.client_id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1">
                      <p className="font-medium">
                        {tc.client?.full_name || "Unknown"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {tc.client?.email}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground border rounded-lg p-8 text-center">
                No active clients found. Add clients first to assign workouts.
              </div>
            )}
            {selectedClients.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {selectedClients.length} client{selectedClients.length > 1 ? 's' : ''} selected
              </p>
            )}
          </div>

          {/* Scheduled Date */}
          <div className="space-y-2">
            <Label>Scheduled Date (Optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !scheduledDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {scheduledDate ? format(scheduledDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={scheduledDate}
                  onSelect={setScheduledDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any special instructions or notes for the workout..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {notes.length}/500
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={selectedClients.length === 0 || assignMutation.isPending}
          >
            {assignMutation.isPending ? "Assigning..." : "Assign Workout"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
