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
import { z } from "zod";

interface CreateGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
}

const goalSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(100, "Title must be less than 100 characters"),
  description: z.string().trim().max(500, "Description must be less than 500 characters").optional(),
  goal_type: z.enum(["weight", "body_fat", "workouts", "strength", "custom"]),
  target_value: z.number().positive("Target value must be positive").optional(),
  unit: z.string().trim().max(20, "Unit must be less than 20 characters").optional(),
  target_date: z.date().refine((date) => date > new Date(), "Target date must be in the future"),
});

export function CreateGoalDialog({ open, onOpenChange, clientId, clientName }: CreateGoalDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [goalType, setGoalType] = useState<string>("weight");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [unit, setUnit] = useState("kg");
  const [targetDate, setTargetDate] = useState<Date>();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createGoalMutation = useMutation({
    mutationFn: async () => {
      // Validate input
      const validation = goalSchema.safeParse({
        title,
        description: description || undefined,
        goal_type: goalType,
        target_value: targetValue ? parseFloat(targetValue) : undefined,
        unit: unit || undefined,
        target_date: targetDate,
      });

      if (!validation.success) {
        const fieldErrors: Record<string, string> = {};
        validation.error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(fieldErrors);
        throw new Error("Validation failed");
      }

      setErrors({});

      const { error } = await supabase.from("fitness_goals").insert({
        client_id: clientId,
        trainer_id: user?.id,
        goal_type: goalType,
        title: validation.data.title,
        description: validation.data.description || null,
        target_value: validation.data.target_value || null,
        unit: validation.data.unit || null,
        target_date: format(validation.data.target_date, "yyyy-MM-dd"),
        status: "active",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-goals"] });
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast({
        title: "Success",
        description: "Goal created successfully",
      });
      handleClose();
    },
    onError: (error: Error) => {
      if (error.message !== "Validation failed") {
        toast({
          title: "Error",
          description: error.message || "Failed to create goal",
          variant: "destructive",
        });
      }
    },
  });

  const handleClose = () => {
    setGoalType("weight");
    setTitle("");
    setDescription("");
    setTargetValue("");
    setUnit("kg");
    setTargetDate(undefined);
    setErrors({});
    onOpenChange(false);
  };

  const handleGoalTypeChange = (type: string) => {
    setGoalType(type);
    // Set default units based on goal type
    switch (type) {
      case "weight":
        setUnit("kg");
        break;
      case "body_fat":
        setUnit("%");
        break;
      case "workouts":
        setUnit("workouts");
        break;
      case "strength":
        setUnit("kg");
        break;
      default:
        setUnit("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createGoalMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Goal for {clientName}</DialogTitle>
          <DialogDescription>Set a new fitness goal to help your client stay motivated</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Goal Type */}
          <div className="space-y-2">
            <Label htmlFor="goal-type">Goal Type *</Label>
            <Select value={goalType} onValueChange={handleGoalTypeChange}>
              <SelectTrigger id="goal-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weight">Weight Loss/Gain</SelectItem>
                <SelectItem value="body_fat">Body Fat Percentage</SelectItem>
                <SelectItem value="workouts">Workout Frequency</SelectItem>
                <SelectItem value="strength">Strength Milestone</SelectItem>
                <SelectItem value="custom">Custom Goal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Goal Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Lose 5kg by summer"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
            {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Additional details about this goal..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
            />
            {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
          </div>

          {/* Target Value & Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target-value">Target Value</Label>
              <Input
                id="target-value"
                type="number"
                step="0.1"
                placeholder="e.g., 75"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
              />
              {errors.target_value && <p className="text-sm text-destructive">{errors.target_value}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                placeholder="e.g., kg, %, reps"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                maxLength={20}
              />
              {errors.unit && <p className="text-sm text-destructive">{errors.unit}</p>}
            </div>
          </div>

          {/* Target Date */}
          <div className="space-y-2">
            <Label>Target Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !targetDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {targetDate ? format(targetDate, "PPP") : "Pick a target date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={targetDate}
                  onSelect={setTargetDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            {errors.target_date && <p className="text-sm text-destructive">{errors.target_date}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createGoalMutation.isPending}>
              {createGoalMutation.isPending ? "Creating..." : "Create Goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
