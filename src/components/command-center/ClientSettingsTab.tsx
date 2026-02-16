import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Dumbbell, MessageSquare, Camera, CheckSquare, Utensils, Activity, Target, Scale, BookOpen, CalendarDays, List, ChefHat } from "lucide-react";
import { RestDayCardEditor } from "./RestDayCardEditor";
import { ClientSportScheduleCard } from "./ClientSportScheduleCard";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";

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
    mutationFn: async ({ key, value }: { key: string; value: boolean | string }) => {
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
      <ClientSportScheduleCard clientId={clientId} trainerId={trainerId} />
      <RestDayCardEditor clientId={clientId} trainerId={trainerId} />

      {/* Meal Plan Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5" />
            Meal Plan Settings
          </CardTitle>
          <CardDescription>
            Choose how this client accesses nutrition content. You can assign a structured or flexible meal plan, or just give them recipe books to browse.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup
            value={settings?.meal_plan_type as string ?? "none"}
            onValueChange={(value) => toggleMutation.mutate({ key: "meal_plan_type", value })}
            className="space-y-3"
          >
            <div className={`flex items-start gap-4 rounded-lg border p-4 cursor-pointer transition-colors ${
              settings?.meal_plan_type === "none" ? "border-primary bg-primary/5" : "border-border"
            }`}>
              <RadioGroupItem value="none" id="mp-none" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="mp-none" className="text-base font-medium cursor-pointer">Off</Label>
                <p className="text-sm text-muted-foreground">Nutrition/meal plan features are hidden from this client</p>
              </div>
            </div>

            <div className={`flex items-start gap-4 rounded-lg border p-4 cursor-pointer transition-colors ${
              settings?.meal_plan_type === "structured" ? "border-primary bg-primary/5" : "border-border"
            }`}>
              <RadioGroupItem value="structured" id="mp-structured" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="mp-structured" className="text-base font-medium cursor-pointer flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Structured Meal Plan
                </Label>
                <p className="text-sm text-muted-foreground">Assign specific recipes to specific days & meals on a weekly calendar. Best for clients who want a detailed daily guide.</p>
              </div>
            </div>

            <div className={`flex items-start gap-4 rounded-lg border p-4 cursor-pointer transition-colors ${
              settings?.meal_plan_type === "flexible" ? "border-primary bg-primary/5" : "border-border"
            }`}>
              <RadioGroupItem value="flexible" id="mp-flexible" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="mp-flexible" className="text-base font-medium cursor-pointer flex items-center gap-2">
                  <List className="h-4 w-4" />
                  Flexible Meal Plan
                </Label>
                <p className="text-sm text-muted-foreground">Provide a pool of recipe options per meal type (Breakfast, Lunch, etc.) and let the client pick each day. Best for clients who want variety.</p>
              </div>
            </div>

            <div className={`flex items-start gap-4 rounded-lg border p-4 cursor-pointer transition-colors ${
              settings?.meal_plan_type === "recipe_books" ? "border-primary bg-primary/5" : "border-border"
            }`}>
              <RadioGroupItem value="recipe_books" id="mp-recipe-books" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="mp-recipe-books" className="text-base font-medium cursor-pointer flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Recipe Books Only
                </Label>
                <p className="text-sm text-muted-foreground">Give the client access to recipe books they can browse and cook from — no scheduled plan required.</p>
              </div>
            </div>
          </RadioGroup>

          {/* Sub-settings (only when a plan type is selected) */}
          {settings?.meal_plan_type && settings.meal_plan_type !== "none" && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Options</h4>

                {(settings.meal_plan_type === "structured" || settings.meal_plan_type === "flexible") && (
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <Label className="text-sm font-medium">Allow recipe replacement</Label>
                      <p className="text-xs text-muted-foreground">Let the client swap assigned recipes for alternatives</p>
                    </div>
                    <Switch
                      checked={settings?.meal_plan_allow_recipe_replacement as boolean ?? false}
                      onCheckedChange={(checked) => toggleMutation.mutate({ key: "meal_plan_allow_recipe_replacement", value: checked })}
                    />
                  </div>
                )}

                {(settings.meal_plan_type === "structured" || settings.meal_plan_type === "flexible") && (
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <Label className="text-sm font-medium">Add Recipe Books</Label>
                      <p className="text-xs text-muted-foreground">Also show recipe books alongside the meal plan</p>
                    </div>
                    <Switch
                      checked={settings?.meal_plan_add_recipe_books as boolean ?? false}
                      onCheckedChange={(checked) => toggleMutation.mutate({ key: "meal_plan_add_recipe_books", value: checked })}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Header label</Label>
                  <p className="text-xs text-muted-foreground">What the client sees as the section title in their app</p>
                  <Input
                    value={settings?.meal_plan_header_label as string ?? "Meal Plan"}
                    onChange={(e) => toggleMutation.mutate({ key: "meal_plan_header_label", value: e.target.value })}
                    placeholder="Meal Plan"
                    className="max-w-xs"
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

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
