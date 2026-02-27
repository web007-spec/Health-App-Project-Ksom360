import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Calendar, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface CreateHabitDialogProps {
  clientId: string;
  initialDate?: Date;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const popularHabits = [
  { name: "Drink Water", icon: "💧", goal_value: 8, goal_unit: "cups", frequency: "daily" },
  { name: "Meditate", icon: "🧘", goal_value: 1, goal_unit: "times", frequency: "daily" },
  { name: "Go for a Walk", icon: "🚶", goal_value: 30, goal_unit: "minutes", frequency: "daily" },
  { name: "Sleep 8+ Hours", icon: "😴", goal_value: 8, goal_unit: "hours", frequency: "daily" },
  { name: "Eat Vegetables", icon: "🥗", goal_value: 3, goal_unit: "servings", frequency: "daily" },
  { name: "Read a Book", icon: "📖", goal_value: 20, goal_unit: "minutes", frequency: "daily" },
  { name: "Exercise", icon: "💪", goal_value: 3, goal_unit: "times", frequency: "weekly" },
  { name: "Stretch", icon: "🤸", goal_value: 1, goal_unit: "times", frequency: "daily" },
  { name: "Journal", icon: "📝", goal_value: 1, goal_unit: "times", frequency: "daily" },
  { name: "No Sugar", icon: "🚫", goal_value: 1, goal_unit: "times", frequency: "daily" },
  { name: "Take Supplements", icon: "💊", goal_value: 1, goal_unit: "times", frequency: "daily" },
  { name: "Practice Gratitude", icon: "🙏", goal_value: 1, goal_unit: "times", frequency: "daily" },
];

export function CreateHabitDialog({ clientId, initialDate, open, onOpenChange }: CreateHabitDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<"select" | "form">("select");
  const [habitName, setHabitName] = useState("");
  const [description, setDescription] = useState("");
  const [goalValue, setGoalValue] = useState(1);
  const [goalUnit, setGoalUnit] = useState("times");
  const [frequency, setFrequency] = useState("daily");
  const [startDate, setStartDate] = useState<Date>(initialDate || new Date());
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("08:00");
  const [commentsEnabled, setCommentsEnabled] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState("🎯");

  useEffect(() => {
    if (open && initialDate) {
      setStartDate(initialDate);
    }
  }, [open, initialDate]);

  const resetForm = () => {
    setStep("select");
    setHabitName("");
    setDescription("");
    setGoalValue(1);
    setGoalUnit("times");
    setFrequency("daily");
    setStartDate(initialDate || new Date());
    setEndDate(undefined);
    setReminderEnabled(false);
    setReminderTime("08:00");
    setCommentsEnabled(false);
    setSelectedIcon("🎯");
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) resetForm();
    onOpenChange(isOpen);
  };

  const handleSelectPopular = (habit: typeof popularHabits[0]) => {
    setHabitName(habit.name);
    setGoalValue(habit.goal_value);
    setGoalUnit(habit.goal_unit);
    setFrequency(habit.frequency);
    setSelectedIcon(habit.icon);
    setStep("form");
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("client_habits" as any).insert([{
        client_id: clientId,
        trainer_id: user?.id,
        name: habitName,
        description: description || null,
        icon_url: `emoji:${selectedIcon}`,
        goal_value: goalValue,
        goal_unit: goalUnit,
        frequency,
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: endDate ? format(endDate, "yyyy-MM-dd") : null,
        reminder_enabled: reminderEnabled,
        reminder_time: reminderTime,
        comments_enabled: commentsEnabled,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-habits"] });
      toast({ title: "Habit created", description: "Habit has been assigned to the client." });
      handleOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        {step === "select" ? (
          <>
            <DialogHeader>
              <DialogTitle>Create a Habit</DialogTitle>
              <DialogDescription>Choose a popular habit or create a custom one</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Button
                variant="outline"
                className="w-full justify-start text-left h-auto py-3"
                onClick={() => setStep("form")}
              >
                <span className="text-xl mr-3">✨</span>
                <div>
                  <p className="font-medium">Create Custom Habit</p>
                  <p className="text-xs text-muted-foreground">Design your own habit from scratch</p>
                </div>
              </Button>

              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">MOST POPULAR</h3>
                <div className="grid grid-cols-3 gap-2">
                  {popularHabits.map((habit) => (
                    <button
                      key={habit.name}
                      onClick={() => handleSelectPopular(habit)}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border hover:border-primary hover:shadow-sm transition-all bg-background text-center"
                    >
                      <span className="text-2xl">{habit.icon}</span>
                      <span className="text-xs font-medium text-foreground leading-tight">{habit.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {habit.goal_value} {habit.goal_unit} per {habit.frequency === "daily" ? "day" : "week"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setStep("select")}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <span className="text-xl">{selectedIcon}</span>
                <DialogTitle>Create Habit</DialogTitle>
              </div>
            </DialogHeader>

            <div className="space-y-4">
              {/* Icon Picker */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Choose an Icon</Label>
                <div className="grid grid-cols-8 gap-2">
                  {["🎯","💧","🧘","🚶","😴","🥗","📖","💪","🤸","📝","🚫","💊","🙏","🏃","👟","🚴","🧗","🏊","⚽","🎾","🧠","🍎","☀️","🌙","❤️","🔥","⏰","🎵","✅","🧹","💤","🥤"].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setSelectedIcon(emoji)}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all ${
                        selectedIcon === emoji
                          ? "bg-primary/20 ring-2 ring-primary scale-110"
                          : "hover:bg-muted"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Name your Habit</Label>
                <div className="relative">
                  <Input
                    value={habitName}
                    onChange={(e) => setHabitName(e.target.value.slice(0, 90))}
                    placeholder="e.g., Drink 8 glasses of water"
                    className="pr-16"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    {habitName.length} / 90
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Goal Value</Label>
                  <Input
                    type="number"
                    min={1}
                    value={goalValue}
                    onChange={(e) => setGoalValue(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Unit</Label>
                  <Select value={goalUnit} onValueChange={setGoalUnit}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="times">Times</SelectItem>
                      <SelectItem value="cups">Cups</SelectItem>
                      <SelectItem value="minutes">Minutes</SelectItem>
                      <SelectItem value="hours">Hours</SelectItem>
                      <SelectItem value="servings">Servings</SelectItem>
                      <SelectItem value="steps">Steps</SelectItem>
                      <SelectItem value="glasses">Glasses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Per</Label>
                  <Select value={frequency} onValueChange={setFrequency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Day</SelectItem>
                      <SelectItem value="weekly">Week</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Habit Period</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">START DATE</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left mt-1" size="sm">
                          <Calendar className="mr-2 h-3 w-3" />
                          {format(startDate, "MMM d, yyyy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent mode="single" selected={startDate} onSelect={(d) => d && setStartDate(d)} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">END DATE</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left mt-1" size="sm">
                          <Calendar className="mr-2 h-3 w-3" />
                          {endDate ? format(endDate, "MMM d, yyyy") : "No end date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Description (Optional)</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add instructions or details..."
                  rows={2}
                />
              </div>

              <div className="flex flex-row items-center justify-between rounded-lg border p-3">
                <div>
                  <Label className="text-sm font-medium">Set Reminder</Label>
                  {reminderEnabled && (
                    <Input
                      type="time"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      className="mt-1 w-32 h-8"
                    />
                  )}
                </div>
                <Switch checked={reminderEnabled} onCheckedChange={setReminderEnabled} />
              </div>

              <div className="flex flex-row items-center justify-between rounded-lg border p-3">
                <div>
                  <Label className="text-sm font-medium">Enable comment capability</Label>
                  <p className="text-xs text-muted-foreground">Allow clients to comment on this habit</p>
                </div>
                <Switch checked={commentsEnabled} onCheckedChange={setCommentsEnabled} />
              </div>

              <div className="flex gap-3 justify-end pt-2 border-t">
                <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={!habitName.trim() || createMutation.isPending}
                >
                  {createMutation.isPending ? "Saving..." : "Save & Close"}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
