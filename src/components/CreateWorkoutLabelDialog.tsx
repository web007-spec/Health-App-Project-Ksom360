import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreateWorkoutLabelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categories = [
  { value: "level", label: "Level" },
  { value: "duration", label: "Duration" },
  { value: "intensity", label: "Intensity" },
  { value: "type", label: "Type" },
  { value: "body_part", label: "Body Part" },
  { value: "location", label: "Location" },
];

export function CreateWorkoutLabelDialog({
  open,
  onOpenChange,
}: CreateWorkoutLabelDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<string>("");
  const [value, setValue] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("workout_labels").insert({
        category: category as any,
        value,
        trainer_id: user!.id,
        is_default: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-labels"] });
      toast({ title: "Label created successfully" });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      if (error.code === "23505") {
        toast({
          title: "Label already exists",
          description: "This label value already exists in this category",
          variant: "destructive",
        });
      } else {
        toast({ title: "Failed to create label", variant: "destructive" });
      }
    },
  });

  const resetForm = () => {
    setCategory("");
    setValue("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !value.trim()) {
      toast({
        title: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Workout Label</DialogTitle>
          <DialogDescription>
            Add a custom label to organize your workouts
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="value">Label Value *</Label>
            <Input
              id="value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="e.g., High Intensity, Full Body, Outdoor"
              required
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Label"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
