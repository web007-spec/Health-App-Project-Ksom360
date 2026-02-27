import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

interface ClientStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientRelationId: string;
  currentStatus: "active" | "paused" | "pending";
  clientName: string;
}

export function ClientStatusDialog({
  open,
  onOpenChange,
  clientRelationId,
  currentStatus,
  clientName,
}: ClientStatusDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"active" | "paused" | "pending">(currentStatus);

  const updateStatusMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("trainer_clients")
        .update({ status })
        .eq("id", clientRelationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({
        title: "Success",
        description: `${clientName}'s status updated to ${status}`,
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Client Status</DialogTitle>
          <DialogDescription>
            Change the status for {clientName}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <RadioGroup value={status} onValueChange={(value: any) => setStatus(value)}>
            <div className="flex items-center space-x-2 mb-3">
              <RadioGroupItem value="active" id="active" />
              <Label htmlFor="active" className="cursor-pointer">
                <div>
                  <p className="font-medium">Active</p>
                  <p className="text-sm text-muted-foreground">Client is actively training</p>
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-2 mb-3">
              <RadioGroupItem value="paused" id="paused" />
              <Label htmlFor="paused" className="cursor-pointer">
                <div>
                  <p className="font-medium">Paused</p>
                  <p className="text-sm text-muted-foreground">Client has temporarily paused training</p>
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="pending" id="pending" />
              <Label htmlFor="pending" className="cursor-pointer">
                <div>
                  <p className="font-medium">Pending</p>
                  <p className="text-sm text-muted-foreground">Awaiting client activation</p>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => updateStatusMutation.mutate()}
            disabled={updateStatusMutation.isPending || status === currentStatus}
          >
            {updateStatusMutation.isPending ? "Updating..." : "Update Status"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
