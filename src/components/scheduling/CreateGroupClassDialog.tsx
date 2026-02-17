import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateGroupClassDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [maxCapacity, setMaxCapacity] = useState(10);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [location, setLocation] = useState("");
  const [locationType, setLocationType] = useState("in_person");
  const [color, setColor] = useState("#8b5cf6");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceDay, setRecurrenceDay] = useState("1");
  const [recurrenceTime, setRecurrenceTime] = useState("09:00");

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("group_classes").insert({
        trainer_id: user!.id,
        name,
        description: description || null,
        max_capacity: maxCapacity,
        duration_minutes: durationMinutes,
        location: location || null,
        location_type: locationType,
        color,
        is_recurring: isRecurring,
        recurrence_day: isRecurring ? parseInt(recurrenceDay) : null,
        recurrence_time: isRecurring ? `${recurrenceTime}:00` : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-classes"] });
      toast({ title: "Group class created" });
      onOpenChange(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Error creating class", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setMaxCapacity(10);
    setDurationMinutes(60);
    setLocation("");
    setLocationType("in_person");
    setColor("#8b5cf6");
    setIsRecurring(false);
    setRecurrenceDay("1");
    setRecurrenceTime("09:00");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Group Class</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Class Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Morning Bootcamp" />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Class description..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Max Capacity</Label>
              <Input type="number" min={1} value={maxCapacity} onChange={(e) => setMaxCapacity(parseInt(e.target.value) || 1)} />
            </div>
            <div>
              <Label>Duration (min)</Label>
              <Input type="number" min={15} step={15} value={durationMinutes} onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 15)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Location Type</Label>
              <Select value={locationType} onValueChange={setLocationType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_person">In-Person</SelectItem>
                  <SelectItem value="virtual">Virtual</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Color</Label>
              <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10" />
            </div>
          </div>
          <div>
            <Label>Location (optional)</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Main Studio" />
          </div>
          <div className="flex items-center justify-between">
            <Label>Recurring Weekly</Label>
            <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
          </div>
          {isRecurring && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Day</Label>
                <Select value={recurrenceDay} onValueChange={setRecurrenceDay}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAYS.map((day, i) => (
                      <SelectItem key={i} value={String(i)}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Time</Label>
                <Input type="time" value={recurrenceTime} onChange={(e) => setRecurrenceTime(e.target.value)} />
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={!name || mutation.isPending}>
            {mutation.isPending ? "Creating..." : "Create Class"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
