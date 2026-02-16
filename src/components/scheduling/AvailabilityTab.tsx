import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Clock } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  const label = `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${m} ${h < 12 ? "AM" : "PM"}`;
  const value = `${String(h).padStart(2, "0")}:${m}:00`;
  return { label, value };
});

export function AvailabilityTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: availability, isLoading } = useQuery({
    queryKey: ["trainer-availability", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainer_availability")
        .select("*, appointment_type:appointment_types(id, name)")
        .eq("trainer_id", user!.id)
        .order("day_of_week")
        .order("start_time");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: appointmentTypes } = useQuery({
    queryKey: ["appointment-types", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointment_types")
        .select("*")
        .eq("trainer_id", user!.id)
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const addMutation = useMutation({
    mutationFn: async ({ dayOfWeek }: { dayOfWeek: number }) => {
      const { error } = await supabase.from("trainer_availability").insert({
        trainer_id: user!.id,
        day_of_week: dayOfWeek,
        start_time: "09:00:00",
        end_time: "17:00:00",
        is_general: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainer-availability"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase
        .from("trainer_availability")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainer-availability"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trainer_availability").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainer-availability"] });
      toast({ title: "Time slot removed" });
    },
  });

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  }

  const groupedByDay = DAYS.map((name, index) => ({
    name,
    index,
    slots: (availability || []).filter((a) => a.day_of_week === index),
  }));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Set your weekly recurring availability. Clients will only be able to book during these hours.
      </p>

      <div className="space-y-3">
        {groupedByDay.map((day) => (
          <Card key={day.index}>
            <CardContent className="py-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 min-w-[120px]">
                  <span className="font-medium text-sm w-24">{day.name}</span>
                </div>
                <div className="flex-1 space-y-2">
                  {day.slots.length === 0 ? (
                    <span className="text-sm text-muted-foreground">Unavailable</span>
                  ) : (
                    day.slots.map((slot) => (
                      <div key={slot.id} className="flex items-center gap-2 flex-wrap">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <Select
                          value={slot.start_time}
                          onValueChange={(v) => updateMutation.mutate({ id: slot.id, updates: { start_time: v } })}
                        >
                          <SelectTrigger className="w-[130px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_OPTIONS.map((t) => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-muted-foreground text-sm">to</span>
                        <Select
                          value={slot.end_time}
                          onValueChange={(v) => updateMutation.mutate({ id: slot.id, updates: { end_time: v } })}
                        >
                          <SelectTrigger className="w-[130px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_OPTIONS.map((t) => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={slot.is_general ? "general" : (slot.appointment_type_id || "general")}
                          onValueChange={(v) => {
                            if (v === "general") {
                              updateMutation.mutate({ id: slot.id, updates: { is_general: true, appointment_type_id: null } });
                            } else {
                              updateMutation.mutate({ id: slot.id, updates: { is_general: false, appointment_type_id: v } });
                            }
                          }}
                        >
                          <SelectTrigger className="w-[160px] h-8">
                            <SelectValue placeholder="All types" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">All Types</SelectItem>
                            {appointmentTypes?.map((t) => (
                              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Location"
                          value={slot.location || ""}
                          onChange={(e) => updateMutation.mutate({ id: slot.id, updates: { location: e.target.value || null } })}
                          className="w-[140px] h-8"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => deleteMutation.mutate(slot.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-2"
                  onClick={() => addMutation.mutate({ dayOfWeek: day.index })}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
