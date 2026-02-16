import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Clock, Trash2, ClipboardList, Dumbbell, CheckCircle2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, isPast } from "date-fns";
import { toast } from "sonner";

const REMINDER_ICONS: Record<string, typeof Bell> = {
  game_stats: ClipboardList,
  workout: Dumbbell,
  habit: CheckCircle2,
  task: Clock,
  custom: Bell,
};

const REMINDER_COLORS: Record<string, string> = {
  game_stats: "text-rose-500",
  workout: "text-primary",
  habit: "text-emerald-500",
  task: "text-amber-500",
  custom: "text-muted-foreground",
};

export function ClientRemindersSection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: reminders, isLoading } = useQuery({
    queryKey: ["client-reminders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_reminders" as any)
        .select("*")
        .eq("client_id", user?.id)
        .eq("is_dismissed", false)
        .order("remind_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user?.id,
  });

  const dismissMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("client_reminders" as any)
        .update({ is_dismissed: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-reminders"] });
      toast.success("Reminder dismissed");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("client_reminders" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-reminders"] });
      toast.success("Reminder deleted");
    },
  });

  const activeReminders = reminders?.filter((r: any) => !r.is_dismissed) || [];
  const pastDue = activeReminders.filter((r: any) => isPast(new Date(r.remind_at)));
  const upcoming = activeReminders.filter((r: any) => !isPast(new Date(r.remind_at)));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Reminders
        </CardTitle>
        <CardDescription>Manage your pending reminders for games, workouts, habits, and tasks</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}

        {!isLoading && activeReminders.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No active reminders</p>
            <p className="text-xs mt-1">Reminders will appear here when you set them</p>
          </div>
        )}

        {pastDue.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-destructive">Past Due</p>
            {pastDue.map((r: any) => (
              <ReminderRow key={r.id} reminder={r} onDismiss={() => dismissMutation.mutate(r.id)} onDelete={() => deleteMutation.mutate(r.id)} isPastDue />
            ))}
          </div>
        )}

        {upcoming.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Upcoming</p>
            {upcoming.map((r: any) => (
              <ReminderRow key={r.id} reminder={r} onDismiss={() => dismissMutation.mutate(r.id)} onDelete={() => deleteMutation.mutate(r.id)} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ReminderRow({ reminder, onDismiss, onDelete, isPastDue }: { reminder: any; onDismiss: () => void; onDelete: () => void; isPastDue?: boolean }) {
  const Icon = REMINDER_ICONS[reminder.reminder_type] || Bell;
  const colorClass = REMINDER_COLORS[reminder.reminder_type] || "text-muted-foreground";

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${isPastDue ? "border-destructive/30 bg-destructive/5" : "border-border"}`}>
      <Icon className={`h-5 w-5 shrink-0 ${colorClass}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{reminder.title}</p>
        <p className="text-xs text-muted-foreground">
          {format(new Date(reminder.remind_at), "MMM d, h:mm a")}
          {isPastDue && <Badge variant="destructive" className="ml-2 text-[10px]">Past due</Badge>}
        </p>
      </div>
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDismiss} title="Dismiss">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDelete} title="Delete">
          <Trash2 className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
}
