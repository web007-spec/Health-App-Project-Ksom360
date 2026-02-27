import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

export function BookingSettingsTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState({
    booking_window_days: 30,
    min_notice_hours: 24,
    cancellation_notice_hours: 24,
    buffer_minutes: 15,
    max_daily_appointments: null as number | null,
    allow_self_booking: true,
  });

  const { data: existing, isLoading } = useQuery({
    queryKey: ["booking-settings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_settings")
        .select("*")
        .eq("trainer_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (existing) {
      setSettings({
        booking_window_days: existing.booking_window_days,
        min_notice_hours: existing.min_notice_hours,
        cancellation_notice_hours: existing.cancellation_notice_hours,
        buffer_minutes: existing.buffer_minutes,
        max_daily_appointments: existing.max_daily_appointments,
        allow_self_booking: existing.allow_self_booking,
      });
    }
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (existing) {
        const { error } = await supabase
          .from("booking_settings")
          .update(settings)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("booking_settings")
          .insert({ trainer_id: user!.id, ...settings });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking-settings"] });
      toast({ title: "Settings saved" });
    },
    onError: () => {
      toast({ title: "Error saving settings", variant: "destructive" });
    },
  });

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Self-Booking</CardTitle>
          <CardDescription>Control whether clients can book appointments on their own.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label>Allow Client Self-Booking</Label>
            <Switch
              checked={settings.allow_self_booking}
              onCheckedChange={(v) => setSettings((s) => ({ ...s, allow_self_booking: v }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Booking Window</CardTitle>
          <CardDescription>How far in advance clients can book appointments.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Booking Window (days)</Label>
              <Input
                type="number"
                min={1}
                value={settings.booking_window_days}
                onChange={(e) => setSettings((s) => ({ ...s, booking_window_days: parseInt(e.target.value) || 30 }))}
              />
              <p className="text-xs text-muted-foreground mt-1">Clients can book up to this many days ahead</p>
            </div>
            <div>
              <Label>Minimum Notice (hours)</Label>
              <Input
                type="number"
                min={0}
                value={settings.min_notice_hours}
                onChange={(e) => setSettings((s) => ({ ...s, min_notice_hours: parseInt(e.target.value) || 0 }))}
              />
              <p className="text-xs text-muted-foreground mt-1">Minimum lead time before an appointment</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scheduling Rules</CardTitle>
          <CardDescription>Buffer times and limits for your appointments.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Buffer Between Appointments (min)</Label>
              <Input
                type="number"
                min={0}
                value={settings.buffer_minutes}
                onChange={(e) => setSettings((s) => ({ ...s, buffer_minutes: parseInt(e.target.value) || 0 }))}
              />
              <p className="text-xs text-muted-foreground mt-1">Break time between sessions</p>
            </div>
            <div>
              <Label>Cancellation Notice (hours)</Label>
              <Input
                type="number"
                min={0}
                value={settings.cancellation_notice_hours}
                onChange={(e) => setSettings((s) => ({ ...s, cancellation_notice_hours: parseInt(e.target.value) || 0 }))}
              />
              <p className="text-xs text-muted-foreground mt-1">Minimum notice for cancellations</p>
            </div>
          </div>
          <div className="max-w-[200px]">
            <Label>Max Daily Appointments</Label>
            <Input
              type="number"
              min={1}
              placeholder="No limit"
              value={settings.max_daily_appointments || ""}
              onChange={(e) => setSettings((s) => ({ ...s, max_daily_appointments: e.target.value ? parseInt(e.target.value) : null }))}
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2">
        {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Save Settings
      </Button>
    </div>
  );
}
