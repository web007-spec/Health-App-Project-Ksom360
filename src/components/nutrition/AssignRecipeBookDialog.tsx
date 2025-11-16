import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface AssignRecipeBookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipeBookId: string;
}

export function AssignRecipeBookDialog({ open, onOpenChange, recipeBookId }: AssignRecipeBookDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedClients, setSelectedClients] = useState<string[]>([]);

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

  const assignMutation = useMutation({
    mutationFn: async () => {
      const inserts = selectedClients.map(clientId => ({
        client_id: clientId,
        trainer_id: user?.id!,
        recipe_book_id: recipeBookId,
      }));

      const { error } = await supabase
        .from("client_recipe_book_assignments")
        .insert(inserts);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-recipe-books"] });
      toast.success(`Recipe book assigned to ${selectedClients.length} client(s)`);
      onOpenChange(false);
      setSelectedClients([]);
    },
    onError: () => {
      toast.error("Failed to assign recipe book");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[70vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Assign Recipe Book to Clients</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-2">
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
