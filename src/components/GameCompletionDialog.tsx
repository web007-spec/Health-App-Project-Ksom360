import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Swords, Trophy, ClipboardList, Clock, XCircle, PartyPopper, Bell } from "lucide-react";
import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, addHours, setHours, setMinutes } from "date-fns";
import { GameStatsEntryDialog } from "@/components/GameStatsEntryDialog";

type Step = "choose" | "reminder" | "success" | "stats";

interface GameCompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: any;
  clientId: string;
}

export function GameCompletionDialog({ open, onOpenChange, event, clientId }: GameCompletionDialogProps) {
  const [step, setStep] = useState<Step>("choose");
  const [reminderTime, setReminderTime] = useState("19:00");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const completeMutation = useMutation({
    mutationFn: async ({ status, notes }: { status: string; notes: string | null }) => {
      const { error } = await supabase
        .from("sport_event_completions" as any)
        .insert({
          client_id: clientId,
          sport_event_id: event.id,
          status,
          notes: notes,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sport-event-completions"] });
      queryClient.invalidateQueries({ queryKey: ["client-sport-events-today"] });
    },
  });

  const reminderMutation = useMutation({
    mutationFn: async (remindAt: string) => {
      const { error } = await supabase
        .from("client_reminders" as any)
        .insert({
          client_id: clientId,
          reminder_type: "game_stats",
          title: `Log stats for: ${event?.title}`,
          description: "Don't forget to log your game stats!",
          reference_id: event?.id,
          remind_at: remindAt,
        });
      if (error) throw error;
    },
  });

  const handleLogStatsNow = async () => {
    await completeMutation.mutateAsync({ status: "completed", notes: null });
    setStep("stats");
  };

  const handleSetReminder = () => {
    completeMutation.mutate({ status: "completed", notes: "Stats reminder set" });
    setStep("reminder");
  };

  const handleSaveReminder = async () => {
    const [hours, minutes] = reminderTime.split(":").map(Number);
    const now = new Date();
    let remindAt = setMinutes(setHours(now, hours), minutes);
    // If time has passed today, set for tomorrow
    if (remindAt <= now) {
      remindAt = addDays(remindAt, 1);
    }
    await reminderMutation.mutateAsync(remindAt.toISOString());
    queryClient.invalidateQueries({ queryKey: ["client-reminders"] });
    toast({ title: "Reminder set! ⏰", description: `We'll remind you at ${format(remindAt, "h:mm a")}` });
    handleClose();
  };

  const handleMissedGame = () => {
    completeMutation.mutate(
      { status: "missed", notes: null },
      {
        onSuccess: () => {
          toast({ title: "Game logged as missed", description: "Your sport stats have been updated." });
          handleClose();
        },
      }
    );
  };

  const handleClose = () => {
    setStep("choose");
    setReminderTime("19:00");
    onOpenChange(false);
  };

  if (step === "stats") {
    return (
      <GameStatsEntryDialog
        open={open}
        onOpenChange={handleClose}
        event={event}
        clientId={clientId}
      />
    );
  }

  if (step === "reminder") {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-amber-500" />
              Set Stats Reminder
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              When would you like to be reminded to log your game stats?
            </p>
            <div>
              <Label className="text-xs">Remind me at</Label>
              <Input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                Skip
              </Button>
              <Button
                className="flex-1"
                onClick={handleSaveReminder}
                disabled={reminderMutation.isPending}
              >
                {reminderMutation.isPending ? "Saving..." : "Set Reminder"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Swords className="h-5 w-5 text-rose-500" />
            Log Game
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">
            How did <span className="font-semibold text-foreground">{event?.title}</span> go?
          </p>

          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-14 border-emerald-500/30 hover:bg-emerald-500/10 hover:border-emerald-500 hover:text-foreground"
              onClick={handleLogStatsNow}
              disabled={completeMutation.isPending}
            >
              <ClipboardList className="h-5 w-5 text-emerald-500" />
              <div className="text-left">
                <p className="font-semibold text-sm">Game Completed — Log Stats</p>
                <p className="text-xs text-muted-foreground">Enter your game stats now</p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-14 border-amber-500/30 hover:bg-amber-500/10 hover:border-amber-500 hover:text-foreground"
              onClick={handleSetReminder}
              disabled={completeMutation.isPending}
            >
              <Clock className="h-5 w-5 text-amber-500" />
              <div className="text-left">
                <p className="font-semibold text-sm">Game Completed — Log Later</p>
                <p className="text-xs text-muted-foreground">Set a reminder to add stats later</p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-14 border-destructive/30 hover:bg-destructive/10 hover:border-destructive hover:text-foreground"
              onClick={handleMissedGame}
              disabled={completeMutation.isPending}
            >
              <XCircle className="h-5 w-5 text-destructive" />
              <div className="text-left">
                <p className="font-semibold text-sm">Missed Game</p>
                <p className="text-xs text-muted-foreground">Couldn't make it today</p>
              </div>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
