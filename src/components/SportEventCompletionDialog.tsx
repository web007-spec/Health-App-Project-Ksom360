import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle, AlertTriangle, Swords, Trophy, PartyPopper } from "lucide-react";
import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, addDays } from "date-fns";
import { GameStatsEntryDialog } from "@/components/GameStatsEntryDialog";

type CompletionStatus = "completed" | "incomplete" | "missed";

interface SportEventCompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: any;
  clientId: string;
}

export function SportEventCompletionDialog({ open, onOpenChange, event, clientId }: SportEventCompletionDialogProps) {
  const [status, setStatus] = useState<CompletionStatus | null>(null);
  const [notes, setNotes] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [showGameStats, setShowGameStats] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isGame = event?.event_type === "game" || event?.event_type === "event";
  const eventLabel = isGame ? "Game" : "Practice";

  // Check if there's a game tomorrow
  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
  const { data: tomorrowEvents } = useQuery({
    queryKey: ["tomorrow-sport-events", clientId, tomorrow],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sport_schedule_events")
        .select("*")
        .eq("client_id", clientId)
        .gte("start_time", `${tomorrow}T00:00:00`)
        .lte("start_time", `${tomorrow}T23:59:59`);
      if (error) throw error;
      return data as any[];
    },
    enabled: open && !!clientId,
  });

  const hasGameTomorrow = tomorrowEvents?.some((e: any) => e.event_type === "game" || e.event_type === "event");

  const completeMutation = useMutation({
    mutationFn: async ({ status, notes }: { status: CompletionStatus; notes: string }) => {
      const { error } = await supabase
        .from("sport_event_completions" as any)
        .insert({
          client_id: clientId,
          sport_event_id: event.id,
          status,
          notes: notes || null,
        });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["sport-event-completions"] });
      queryClient.invalidateQueries({ queryKey: ["client-sport-events-today"] });
      if (variables.status === "completed") {
        setShowSuccess(true);
      } else {
        toast({
          title: variables.status === "missed" ? "Event logged as missed" : "Event logged as incomplete",
          description: "Your sport stats have been updated.",
        });
        handleClose();
      }
    },
  });

  const handleSubmit = (selectedStatus: CompletionStatus) => {
    setStatus(selectedStatus);
    completeMutation.mutate({ status: selectedStatus, notes });
  };

  const handleClose = () => {
    setStatus(null);
    setNotes("");
    setShowSuccess(false);
    setShowGameStats(false);
    onOpenChange(false);
  };

  if (showGameStats) {
    return (
      <GameStatsEntryDialog
        open={open}
        onOpenChange={handleClose}
        event={event}
        clientId={clientId}
      />
    );
  }

  if (showSuccess) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-sm text-center">
          <div className="py-6 space-y-4">
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <PartyPopper className="h-10 w-10 text-emerald-500" />
              </div>
            </div>
            <h2 className="text-xl font-bold">Great job! 🎉</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {isGame
                ? "Way to give it your all out there! Now make sure to rest up and recover."
                : hasGameTomorrow
                  ? "Awesome practice! Heads up — you have a game coming up tomorrow. Make sure to get plenty of rest tonight! 💪"
                  : "Solid practice session! Make sure to hydrate, stretch, and get some good rest tonight. 💪"}
            </p>
            {isGame ? (
              <div className="space-y-2">
                <Button className="w-full" onClick={() => { setShowSuccess(false); setShowGameStats(true); }}>
                  Log Game Stats ⚾
                </Button>
                <Button variant="ghost" className="w-full" onClick={handleClose}>Skip for now</Button>
              </div>
            ) : (
              <Button className="w-full" onClick={handleClose}>Done</Button>
            )}
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
            {isGame ? <Swords className="h-5 w-5 text-rose-500" /> : <Trophy className="h-5 w-5 text-sky-500" />}
            Log {eventLabel}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">
            How did <span className="font-semibold text-foreground">{event?.title}</span> go?
          </p>

          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-14 border-emerald-500/30 hover:bg-emerald-500/5 hover:border-emerald-500"
              onClick={() => handleSubmit("completed")}
              disabled={completeMutation.isPending}
            >
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <div className="text-left">
                <p className="font-semibold text-sm">{eventLabel} Completed</p>
                <p className="text-xs text-muted-foreground">Finished the full session</p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-14 border-amber-500/30 hover:bg-amber-500/5 hover:border-amber-500"
              onClick={() => handleSubmit("incomplete")}
              disabled={completeMutation.isPending}
            >
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <div className="text-left">
                <p className="font-semibold text-sm">Didn't Finish</p>
                <p className="text-xs text-muted-foreground">Left early or partial attendance</p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-14 border-destructive/30 hover:bg-destructive/5 hover:border-destructive"
              onClick={() => handleSubmit("missed")}
              disabled={completeMutation.isPending}
            >
              <XCircle className="h-5 w-5 text-destructive" />
              <div className="text-left">
                <p className="font-semibold text-sm">Missed {eventLabel}</p>
                <p className="text-xs text-muted-foreground">Couldn't make it today</p>
              </div>
            </Button>
          </div>

          <div>
            <Textarea
              placeholder="Add a note (optional)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
