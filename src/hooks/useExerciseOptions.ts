import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const defaultMuscleGroups = ["arms", "back", "cardio", "chest", "core", "full body", "glutes", "legs", "shoulders"];
const defaultEquipmentTypes = ["barbell", "bodyweight", "cable", "dumbbells", "kettlebell", "machine", "medicine ball", "mini bands", "resistance bands"];
const defaultCategories = ["cardio", "cool-down", "flexibility", "mobility", "plyometric", "strength", "warm-up"];

export function useExerciseOptions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: customOptions } = useQuery({
    queryKey: ["exercise-custom-options", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercise_custom_options")
        .select("*")
        .eq("trainer_id", user!.id)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const mergeAndSort = (defaults: string[], type: string): string[] => {
    const custom = customOptions?.filter(o => o.option_type === type).map(o => o.name) || [];
    const merged = [...new Set([...defaults, ...custom])];
    return merged.sort((a, b) => a.localeCompare(b));
  };

  const muscleGroups = mergeAndSort(defaultMuscleGroups, "muscle_group");
  const equipmentTypes = mergeAndSort(defaultEquipmentTypes, "equipment");
  const categories = mergeAndSort(defaultCategories, "category");

  const addOption = useMutation({
    mutationFn: async ({ type, name }: { type: string; name: string }) => {
      const { error } = await supabase
        .from("exercise_custom_options")
        .insert({ trainer_id: user!.id, option_type: type, name: name.toLowerCase().trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercise-custom-options"] });
      toast.success("Custom option added");
    },
    onError: (error: Error) => {
      if (error.message.includes("duplicate")) {
        toast.error("This option already exists");
      } else {
        toast.error("Failed to add option");
      }
    },
  });

  return { muscleGroups, equipmentTypes, categories, addOption };
}
