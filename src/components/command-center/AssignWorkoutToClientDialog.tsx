import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Dumbbell, Search } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  clientId: string;
  trainerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate?: Date;
}

export function AssignWorkoutToClientDialog({ clientId, trainerId, open, onOpenChange, initialDate }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(initialDate);
  const [search, setSearch] = useState("");

  // Sync the date when the dialog opens with a pre-selected day from the calendar
  useEffect(() => {
    if (open) setScheduledDate(initialDate);
  }, [open, initialDate]);

  const { data: workouts } = useQuery({
    queryKey: ["trainer-workouts", trainerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_plans")
        .select("id, name, category, difficulty, duration_minutes")
        .eq("trainer_id", trainerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const filteredWorkouts = workouts?.filter(w =>
    w.name?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!selectedWorkoutId) throw new Error("Select a workout");
      const { error } = await supabase.from("client_workouts").insert({
        client_id: clientId,
        workout_plan_id: selectedWorkoutId,
        assigned_by: trainerId,
        scheduled_date: scheduledDate ? format(scheduledDate, "yyyy-MM-dd") : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-assigned-workouts", clientId] });
      queryClient.invalidateQueries({ queryKey: ["training-stats", clientId] });
      toast({ title: "Workout assigned!" });
      handleClose();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleClose = () => {
    setSelectedWorkoutId(null);
    setScheduledDate(undefined);
    setSearch("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Assign Workout</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search workouts..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Workout list */}
          <div className="max-h-48 overflow-y-auto space-y-1 border rounded-md p-2">
            {filteredWorkouts.length > 0 ? filteredWorkouts.map(w => (
              <button
                key={w.id}
                onClick={() => setSelectedWorkoutId(w.id)}
                className={cn(
                  "w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors",
                  selectedWorkoutId === w.id
                    ? "bg-primary/10 border border-primary/30"
                    : "hover:bg-muted/50"
                )}
              >
                <Dumbbell className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-medium">{w.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[w.category, w.difficulty, w.duration_minutes ? `${w.duration_minutes} min` : null].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </button>
            )) : (
              <p className="text-sm text-muted-foreground text-center py-4">No workouts found</p>
            )}
          </div>

          {/* Date picker */}
          <div>
            <Label>Schedule Date (optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !scheduledDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {scheduledDate ? format(scheduledDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={scheduledDate} onSelect={setScheduledDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={() => assignMutation.mutate()} disabled={!selectedWorkoutId || assignMutation.isPending}>
            {assignMutation.isPending ? "Assigning..." : "Assign Workout"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
