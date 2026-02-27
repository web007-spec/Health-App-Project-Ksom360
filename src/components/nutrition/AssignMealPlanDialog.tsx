import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

interface AssignMealPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mealPlanId: string;
}

export function AssignMealPlanDialog({ open, onOpenChange, mealPlanId }: AssignMealPlanDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const { data: clients } = useQuery({
    queryKey: ["trainer-clients", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainer_clients")
        .select(`
          *,
          profiles!trainer_clients_client_id_fkey (*)
        `)
        .eq("trainer_id", user?.id)
        .eq("status", "active");

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && open,
  });

  const { data: mealPlan } = useQuery({
    queryKey: ["meal-plan", mealPlanId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meal_plans")
        .select("*")
        .eq("id", mealPlanId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!mealPlanId && open,
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      const inserts = selectedClients.map(clientId => ({
        client_id: clientId,
        trainer_id: user?.id!,
        meal_plan_id: mealPlanId,
        plan_type: mealPlan?.plan_type as any,
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: endDate ? format(endDate, "yyyy-MM-dd") : null,
      }));

      const { error } = await supabase
        .from("client_meal_plan_assignments")
        .insert(inserts);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-meal-assignment"] });
      toast.success(`Meal plan assigned to ${selectedClients.length} client(s)`);
      onOpenChange(false);
      setSelectedClients([]);
      setStartDate(new Date());
      setEndDate(undefined);
    },
    onError: () => {
      toast.error("Failed to assign meal plan");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Assign Meal Plan to Clients</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(startDate, "PP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>End Date (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PP") : "No end"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 max-h-[300px]">
            <Label>Select Clients</Label>
            {clients && clients.length > 0 ? (
              clients.map((client) => (
                <div
                  key={client.client_id}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent cursor-pointer"
                  onClick={() => {
                    setSelectedClients(prev =>
                      prev.includes(client.client_id)
                        ? prev.filter(id => id !== client.client_id)
                        : [...prev, client.client_id]
                    );
                  }}
                >
                  <Checkbox
                    checked={selectedClients.includes(client.client_id)}
                    onCheckedChange={(checked) => {
                      setSelectedClients(prev =>
                        checked
                          ? [...prev, client.client_id]
                          : prev.filter(id => id !== client.client_id)
                      );
                    }}
                  />
                  <div className="flex-1">
                    <p className="font-semibold">{client.profiles?.full_name || "Unknown"}</p>
                    <p className="text-sm text-muted-foreground">{client.profiles?.email}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No active clients found
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => assignMutation.mutate()}
            disabled={selectedClients.length === 0 || assignMutation.isPending}
          >
            {assignMutation.isPending
              ? "Assigning..."
              : `Assign to ${selectedClients.length} Client(s)`
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
