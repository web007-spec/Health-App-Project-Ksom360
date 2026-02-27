import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trophy, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Recommendation map based on protocol names
const NEXT_PROTOCOL_MAP: Record<string, string> = {
  "7-Day Fasting Kickstart": "14-Day Weight Kickstart",
  "14-Day Weight Kickstart": "21-Day Fat Loss Ladder",
  "21-Day Fat Loss Ladder": "28-Day Metabolic Reset",
  "14-Day Health Foundations": "28-Day Health Reset",
  "28-Day Health Reset": "28-Day Advanced Health Protocol",
  "7-Day Energy Reset": "14-Day Steady Energy",
  "14-Day Steady Energy": "21-Day Rhythm Restore",
  "14-Day Morning Clarity": "21-Day Deep Focus",
  "21-Day Deep Focus": "28-Day Flow State",
};

interface ProtocolCompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  protocolName: string;
  durationDays: number;
  onContinueRoutine: () => void;
  onSwitchToMaintenance?: () => void;
}

export function ProtocolCompletionDialog({
  open,
  onOpenChange,
  protocolName,
  durationDays,
  onContinueRoutine,
  onSwitchToMaintenance,
}: ProtocolCompletionDialogProps) {
  const navigate = useNavigate();
  const suggestedNext = NEXT_PROTOCOL_MAP[protocolName] || null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-primary/5 px-6 pt-8 pb-6 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Trophy className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Protocol Complete</h2>
          <p className="text-sm text-muted-foreground mt-1">You finished the program.</p>
        </div>

        {/* Body */}
        <div className="px-6 pb-2 space-y-4">
          <p className="text-sm text-foreground leading-relaxed">
            You've completed your fasting protocol. Consistency like this builds real metabolic change.
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            Take a moment to recognize the work you've done.
          </p>

          {/* Stats */}
          <div className="bg-muted/40 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Protocol</span>
              <span className="font-semibold text-foreground">{protocolName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Days completed</span>
              <span className="font-semibold text-foreground">{durationDays}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-4 space-y-2">
          <Button
            className="w-full h-12 text-base"
            onClick={() => {
              onOpenChange(false);
              navigate("/client/programs");
            }}
          >
            Start Next Protocol <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
          {suggestedNext && (
            <p className="text-[11px] text-muted-foreground text-center">
              Recommended: {suggestedNext}
            </p>
          )}
          <Button
            variant="outline"
            className="w-full h-11 text-sm"
            onClick={() => {
              onContinueRoutine();
              onOpenChange(false);
            }}
          >
            Continue Current Routine
          </Button>
          {onSwitchToMaintenance && (
            <Button
              variant="outline"
              className="w-full h-11 text-sm"
              onClick={() => {
                onSwitchToMaintenance();
                onOpenChange(false);
              }}
            >
              Switch to Maintenance Schedule
            </Button>
          )}
          <p className="text-[10px] text-muted-foreground text-center pt-1">
            Your coach can assign your next protocol anytime.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
