import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface CreateGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
}

export const GOAL_LIFE_EVENTS = [
  { value: "wedding", label: "💍 Wedding" },
  { value: "cruise", label: "🚢 Cruise" },
  { value: "beach_trip", label: "🏖️ Beach Trip" },
  { value: "birthday", label: "🎂 Birthday" },
  { value: "vacation", label: "✈️ Vacation" },
  { value: "reunion", label: "🤝 Reunion" },
  { value: "photo_shoot", label: "📸 Photo Shoot" },
  { value: "holiday", label: "🎄 Holiday" },
  { value: "anniversary", label: "💑 Anniversary" },
  { value: "health_doctor", label: "🏥 Health / Doctor" },
  { value: "competition_event", label: "🏆 Competition / Event" },
  { value: "other_custom", label: "✏️ Other (Custom)" },
] as const;

export type GoalLifeEventValue = typeof GOAL_LIFE_EVENTS[number]["value"];

export function CreateGoalDialog({ open, onOpenChange, clientId, clientName }: CreateGoalDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [goalType, setGoalType] = useState<GoalLifeEventValue>("wedding");
  const [customText, setCustomText] = useState("");
  const [goalWeight, setGoalWeight] = useState("");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [targetDate, setTargetDate] = useState<Date>();
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isCustom = goalType === "other_custom";
  const goalLabel = GOAL_LIFE_EVENTS.find(e => e.value === goalType)?.label || "";

  const validate = () => {
    const errs: Record<string, string> = {};
    if (isCustom && !customText.trim()) errs.customText = "Please describe your goal";
    if (!goalWeight || isNaN(parseFloat(goalWeight)) || parseFloat(goalWeight) <= 0) errs.goalWeight = "Enter a valid goal weight";
    if (!targetDate) errs.targetDate = "Target date is required";
    if (targetDate && startDate >= targetDate) errs.targetDate = "Target date must be after start date";
    return errs;
  };

  const createGoalMutation = useMutation({
    mutationFn: async () => {
      const errs = validate();
      if (Object.keys(errs).length > 0) {
        setErrors(errs);
        throw new Error("Validation failed");
      }
      setErrors({});

      const title = isCustom ? customText.trim() : goalLabel.replace(/^[\S]+\s/, ""); // strip emoji

      // current_value (start weight) is intentionally left NULL — the DB trigger
      // auto-sets it from the first qualifying Weight metric_entry on/after start_date.
      const { error } = await supabase.from("fitness_goals").insert({
        client_id: clientId,
        trainer_id: user?.id,
        goal_type: goalType,
        title,
        description: notes.trim() || null,
        target_value: parseFloat(goalWeight),
        current_value: null,
        unit: "lbs",
        start_date: format(startDate, "yyyy-MM-dd"),
        target_date: format(targetDate!, "yyyy-MM-dd"),
        status: "active",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-goals"] });
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast({ title: "Goal created", description: `Goal set for ${clientName}` });
      handleClose();
    },
    onError: (error: Error) => {
      if (error.message !== "Validation failed") {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    },
  });

  const handleClose = () => {
    setGoalType("wedding");
    setCustomText("");
    setGoalWeight("");
    setStartDate(new Date());
    setTargetDate(undefined);
    setNotes("");
    setErrors({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Goal for {clientName}</DialogTitle>
          <DialogDescription>Set a weight goal tied to a life event</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Goal Type */}
          <div className="space-y-2">
            <Label>Goal Type</Label>
            <Select value={goalType} onValueChange={(v) => setGoalType(v as GoalLifeEventValue)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GOAL_LIFE_EVENTS.map(e => (
                  <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Goal Text */}
          {isCustom && (
            <div className="space-y-2">
              <Label>Describe the Goal</Label>
              <Input
                placeholder="e.g., Summer fitness challenge"
                value={customText}
                onChange={e => setCustomText(e.target.value)}
                maxLength={100}
              />
              {errors.customText && <p className="text-xs text-destructive">{errors.customText}</p>}
            </div>
          )}

          {/* Goal Weight — start weight is set automatically by DB trigger from first weigh-in */}
          <div className="space-y-2">
            <Label>Goal Weight (lbs)</Label>
            <Input
              type="number"
              step="0.1"
              placeholder="e.g., 165"
              value={goalWeight}
              onChange={e => setGoalWeight(e.target.value)}
            />
            {errors.goalWeight && <p className="text-xs text-destructive">{errors.goalWeight}</p>}
            <p className="text-xs text-muted-foreground">Start weight is auto-set from the client's first weigh-in on/after the start date.</p>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "MMM d, yyyy") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(d) => d && setStartDate(d)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Target Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !targetDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {targetDate ? format(targetDate, "MMM d, yyyy") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={targetDate}
                    onSelect={setTargetDate}
                    disabled={(d) => d <= startDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              {errors.targetDate && <p className="text-xs text-destructive">{errors.targetDate}</p>}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea
              placeholder="Any additional context..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              maxLength={300}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={() => createGoalMutation.mutate()} disabled={createGoalMutation.isPending}>
            {createGoalMutation.isPending ? "Creating..." : "Create Goal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
