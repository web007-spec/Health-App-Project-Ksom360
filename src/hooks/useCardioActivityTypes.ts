import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DEFAULT_ACTIVITIES } from "@/components/cardio/cardioActivities";
import { toast } from "sonner";

export interface CardioActivityType {
  id: string;
  name: string;
  icon_name: string;
}

export function useCardioActivityTypes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: activities, isLoading } = useQuery({
    queryKey: ["cardio-activity-types", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cardio_activity_types")
        .select("*")
        .order("name");
      if (error) throw error;
      // If no rows yet, seed defaults
      if (!data || data.length === 0) {
        return DEFAULT_ACTIVITIES.map((a, i) => ({
          id: `default-${i}`,
          name: a.name,
          icon_name: a.icon_name,
        })) as CardioActivityType[];
      }
      return data as CardioActivityType[];
    },
    enabled: !!user?.id,
  });

  const seedDefaults = useMutation({
    mutationFn: async () => {
      const rows = DEFAULT_ACTIVITIES.map((a, i) => ({
        trainer_id: user!.id,
        name: a.name,
        icon_name: a.icon_name,
        is_default: true,
        order_index: i,
      }));
      const { error } = await supabase
        .from("cardio_activity_types")
        .insert(rows as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cardio-activity-types"] }),
  });

  const addActivity = useMutation({
    mutationFn: async ({ name, iconName }: { name: string; iconName: string }) => {
      // First ensure defaults exist
      const { data: existing } = await supabase
        .from("cardio_activity_types")
        .select("id")
        .limit(1);
      if (!existing || existing.length === 0) {
        await seedDefaults.mutateAsync();
      }
      const { error } = await supabase
        .from("cardio_activity_types")
        .insert({
          trainer_id: user!.id,
          name,
          icon_name: iconName,
          is_default: false,
          order_index: 999,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cardio-activity-types"] });
      toast.success("Activity added");
    },
    onError: (err: Error) => {
      if (err.message.includes("duplicate")) toast.error("Activity already exists");
      else toast.error("Failed to add activity");
    },
  });

  const updateActivity = useMutation({
    mutationFn: async ({ id, name, iconName }: { id: string; name: string; iconName: string }) => {
      const { error } = await supabase
        .from("cardio_activity_types")
        .update({ name, icon_name: iconName })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cardio-activity-types"] });
      toast.success("Activity updated");
    },
    onError: () => toast.error("Failed to update activity"),
  });

  const deleteActivity = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("cardio_activity_types")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cardio-activity-types"] });
      toast.success("Activity removed");
    },
    onError: () => toast.error("Failed to remove activity"),
  });

  return { activities: activities || [], isLoading, addActivity, seedDefaults, updateActivity, deleteActivity };
}
