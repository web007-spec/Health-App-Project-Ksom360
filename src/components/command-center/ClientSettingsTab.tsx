import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Dumbbell, MessageSquare, Camera, CheckSquare, Utensils, Activity, Target, Scale } from "lucide-react";
import { RestDayCardEditor } from "./RestDayCardEditor";

interface ClientSettingsTabProps {
  clientId: string;
  trainerId: string;
}

const FEATURES = [
  {
    key: "training_enabled",
    label: "Training",
    description: "Allow client to view and track workouts",
    icon: Dumbbell,
  },
  {
    key: "workout_comments_enabled",
    label: "Workout Comments",
    description: "Allow client to leave comments on workouts",
    icon: MessageSquare,
  },
  {
    key: "activity_logging_enabled",
    label: "Activity Logging",
    description: "Allow client to log activities outside workouts",
    icon: Activity,
  },
  {
    key: "progress_photos_enabled",
    label: "Progress Photos",
    description: "Visualize improvement with before and after photos",
    icon: Camera,
  },
  {
    key: "tasks_enabled",
    label: "Tasks",
    description: "Assign and track tasks for the client",
    icon: CheckSquare,
  },
  {
    key: "messages_enabled",
    label: "Messages",
    description: "Message your client directly through the platform",
    icon: MessageSquare,
  },
  {
    key: "food_journal_enabled",
    label: "Food Journal",
    description: "Monitor client's food intake and easily provide feedback",
    icon: Utensils,
  },
  {
    key: "macros_enabled",
    label: "Macros",
    description: "Track client nutrition with macro targets",
    icon: Activity,
  },
  {
    key: "body_metrics_enabled",
    label: "Body Metrics",
    description: "Track client progress using various body metrics",
    icon: Scale,
  },
  {
    key: "goals_enabled",
    label: "Goals & Countdowns",
    description: "Set and track goals and countdowns for the client",
    icon: Target,
  },
] as const;

type FeatureKey = typeof FEATURES[number]["key"];

export function ClientSettingsTab({ clientId, trainerId }: ClientSettingsTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["client-feature-settings", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_feature_settings")
        .select("*")
        .eq("client_id", clientId)
        .eq("trainer_id", trainerId)
        .maybeSingle();

      if (error) throw error;

      // If no settings exist, create defaults
      if (!data) {
        const { data: newSettings, error: insertError } = await supabase
          .from("client_feature_settings")
          .insert({ client_id: clientId, trainer_id: trainerId })
          .select()
          .single();
        if (insertError) throw insertError;
        return newSettings;
      }

      return data;
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: boolean }) => {
      const { error } = await supabase
        .from("client_feature_settings")
        .update({ [key]: value })
        .eq("client_id", clientId)
        .eq("trainer_id", trainerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-feature-settings", clientId] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update setting", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <RestDayCardEditor clientId={clientId} trainerId={trainerId} />
      <Card>
        <CardHeader>
          <CardTitle>Feature Settings</CardTitle>
          <CardDescription>
            Create a custom experience for this client by enabling or disabling features.
            When a feature is disabled, it will not appear in the client's app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            const isEnabled = settings?.[feature.key as keyof typeof settings] as boolean ?? true;

            return (
              <div key={feature.key}>
                <div className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                      isEnabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <Label className="text-base font-medium cursor-pointer">
                        {feature.label}
                      </Label>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(checked) => {
                      toggleMutation.mutate({ key: feature.key, value: checked });
                    }}
                  />
                </div>
                {index < FEATURES.length - 1 && <Separator />}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
