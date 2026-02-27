import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CalendarClock, Plus, Trash2, Sparkles, Pause, Play, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Props {
  clientId: string;
  trainerId: string;
}

const FREQUENCY_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Every 2 Weeks",
  monthly: "Monthly",
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function RecurringCheckinScheduler({ clientId, trainerId }: Props) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    schedule_name: "",
    schedule_type: "checkin" as "checkin" | "checkout",
    frequency: "weekly",
    day_of_week: 1,
    day_of_month: 1,
    time_of_day: "09:00",
    template_id: "",
    ai_auto_draft: false,
    ai_auto_send: false,
  });

  const { data: schedules, isLoading } = useQuery({
    queryKey: ["recurring-checkin-schedules", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recurring_checkin_schedules")
        .select("*")
        .eq("client_id", clientId)
        .eq("trainer_id", trainerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: templates } = useQuery({
    queryKey: ["task-templates-for-schedule", trainerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_templates")
        .select("id, name, task_type")
        .eq("trainer_id", trainerId)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const [h, m] = formData.time_of_day.split(":").map(Number);
      const nextTrigger = new Date(now);
      nextTrigger.setHours(h, m, 0, 0);
      if (nextTrigger <= now) nextTrigger.setDate(nextTrigger.getDate() + 1);

      const { error } = await supabase
        .from("recurring_checkin_schedules")
        .insert({
          trainer_id: trainerId,
          client_id: clientId,
          schedule_name: formData.schedule_name,
          schedule_type: formData.schedule_type,
          frequency: formData.frequency,
          day_of_week: formData.frequency === "weekly" || formData.frequency === "biweekly" ? formData.day_of_week : null,
          day_of_month: formData.frequency === "monthly" ? formData.day_of_month : null,
          time_of_day: formData.time_of_day + ":00",
          template_id: formData.template_id || null,
          ai_auto_draft: formData.ai_auto_draft,
          ai_auto_send: formData.ai_auto_send,
          next_trigger_at: nextTrigger.toISOString(),
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-checkin-schedules"] });
      toast.success("Recurring schedule created");
      setDialogOpen(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err.message || "Failed to create schedule"),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("recurring_checkin_schedules")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-checkin-schedules"] });
      toast.success("Schedule updated");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("recurring_checkin_schedules")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-checkin-schedules"] });
      toast.success("Schedule deleted");
    },
  });

  const resetForm = () => {
    setFormData({
      schedule_name: "",
      schedule_type: "checkin",
      frequency: "weekly",
      day_of_week: 1,
      day_of_month: 1,
      time_of_day: "09:00",
      template_id: "",
      ai_auto_draft: false,
      ai_auto_send: false,
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-primary" />
              Recurring Check-ins
            </CardTitle>
            <CardDescription className="mt-1">
              Auto-assign check-in/check-out tasks on a schedule with optional AI responses.
            </CardDescription>
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            New Schedule
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {schedules && schedules.length === 0 && (
          <p className="text-sm text-muted-foreground">No recurring schedules yet.</p>
        )}
        {schedules?.map((s: any) => (
          <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${s.is_active ? "bg-green-500" : "bg-muted-foreground/40"}`} />
              <div>
                <p className="text-sm font-medium">{s.schedule_name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className="text-[10px]">{s.schedule_type}</Badge>
                  <Badge variant="secondary" className="text-[10px]">{FREQUENCY_LABELS[s.frequency] || s.frequency}</Badge>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    {s.time_of_day?.slice(0, 5)}
                  </span>
                  {s.ai_auto_draft && (
                    <Badge variant="secondary" className="text-[10px] gap-0.5">
                      <Sparkles className="h-2.5 w-2.5" />AI Draft
                    </Badge>
                  )}
                  {s.ai_auto_send && (
                    <Badge className="text-[10px] bg-primary/20 text-primary border-0">Auto-Send</Badge>
                  )}
                </div>
                {s.next_trigger_at && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Next: {format(new Date(s.next_trigger_at), "MMM d, h:mm a")}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => toggleMutation.mutate({ id: s.id, is_active: !s.is_active })}
              >
                {s.is_active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => deleteMutation.mutate(s.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Recurring Schedule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Schedule Name</Label>
              <Input
                placeholder="e.g. Weekly Monday Check-in"
                value={formData.schedule_name}
                onChange={(e) => setFormData({ ...formData, schedule_name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={formData.schedule_type} onValueChange={(v) => setFormData({ ...formData, schedule_type: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checkin">Check-in</SelectItem>
                    <SelectItem value="checkout">Check-out</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Frequency</Label>
                <Select value={formData.frequency} onValueChange={(v) => setFormData({ ...formData, frequency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Every 2 Weeks</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(formData.frequency === "weekly" || formData.frequency === "biweekly") && (
              <div>
                <Label>Day of Week</Label>
                <Select value={String(formData.day_of_week)} onValueChange={(v) => setFormData({ ...formData, day_of_week: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAY_LABELS.map((d, i) => (
                      <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.frequency === "monthly" && (
              <div>
                <Label>Day of Month</Label>
                <Input
                  type="number"
                  min={1}
                  max={28}
                  value={formData.day_of_month}
                  onChange={(e) => setFormData({ ...formData, day_of_month: Number(e.target.value) })}
                />
              </div>
            )}

            <div>
              <Label>Time</Label>
              <Input
                type="time"
                value={formData.time_of_day}
                onChange={(e) => setFormData({ ...formData, time_of_day: e.target.value })}
              />
            </div>

            <div>
              <Label>Task Template (optional)</Label>
              <Select value={formData.template_id} onValueChange={(v) => setFormData({ ...formData, template_id: v })}>
                <SelectTrigger><SelectValue placeholder="None — use name only" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {templates?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.task_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-3">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                AI Automation
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">Auto-draft AI response</p>
                  <p className="text-xs text-muted-foreground">AI drafts a reply when client completes the check-in</p>
                </div>
                <Switch
                  checked={formData.ai_auto_draft}
                  onCheckedChange={(v) => setFormData({ ...formData, ai_auto_draft: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">Auto-send to client</p>
                  <p className="text-xs text-muted-foreground">Send AI response without coach review</p>
                </div>
                <Switch
                  checked={formData.ai_auto_send}
                  onCheckedChange={(v) => setFormData({ ...formData, ai_auto_send: v })}
                  disabled={!formData.ai_auto_draft}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!formData.schedule_name || createMutation.isPending}
            >
              Create Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
