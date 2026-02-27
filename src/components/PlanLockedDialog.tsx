import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

interface PlanLockedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lockMessage: string;
  onViewRecommended?: () => void;
}

export function PlanLockedDialog({
  open,
  onOpenChange,
  lockMessage,
  onViewRecommended,
}: PlanLockedDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-muted-foreground" />
            Plan Locked
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">{lockMessage}</p>
          <p className="text-xs text-muted-foreground">
            Continue with your current plan to build stability and unlock this option.
          </p>
          <div className="flex flex-col gap-2">
            {onViewRecommended && (
              <Button onClick={onViewRecommended} className="w-full">
                View Recommended Plan
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="w-full"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
