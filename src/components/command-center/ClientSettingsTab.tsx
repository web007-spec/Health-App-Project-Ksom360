import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Dumbbell, MessageSquare, Camera, CheckSquare, Utensils, Activity, Target, Scale, BookOpen, CalendarDays, List, ChefHat, Eye, Clock, Smile, Type, Image } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { RestDayCardEditor } from "./RestDayCardEditor";
import { SportDayCardEditor } from "./SportDayCardEditor";
import { ClientSportScheduleCard } from "./ClientSportScheduleCard";
import { ClientSportProfileEditor } from "./ClientSportProfileEditor";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { ClientRemindersSection } from "@/components/ClientRemindersSection";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";

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
  {
    key: "fasting_enabled",
    label: "Fasting Protocols",
    description: "Enable fasting protocol assignments for this client",
    icon: Clock,
  },
  {
    key: "sport_schedule_enabled",
    label: "Sport Schedule",
    description: "Show synced sport schedule events (games, practices) on the client's dashboard",
    icon: Activity,
  },
] as const;

// Strict Mode sub-settings shown when fasting is enabled
function FastingStrictModeSettings({ settings, toggleMutation }: { settings: any; toggleMutation: any }) {
  if (!settings?.fasting_enabled) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Strict Mode (Fasting)
        </CardTitle>
        <CardDescription>
          When enabled, meals are only available during eating windows. When disabled, meals work normally outside of active fasts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between py-2">
          <div>
            <Label className="text-sm font-medium">Strict Mode</Label>
            <p className="text-xs text-muted-foreground">Meals only available during eating windows</p>
          </div>
          <Switch
            checked={settings?.fasting_strict_mode as boolean ?? false}
            onCheckedChange={(checked) => toggleMutation.mutate({ key: "fasting_strict_mode", value: checked })}
          />
        </div>
        <Separator />
        <div className="space-y-2">
          <Label className="text-sm font-medium">Eating Window Duration (hours)</Label>
          <p className="text-xs text-muted-foreground">How long the eating window stays open after a fast ends</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-primary min-w-[2ch] text-right">
              {settings?.eating_window_hours ?? 8}
            </span>
          </div>
          <Slider
            value={[settings?.eating_window_hours ?? 8]}
            onValueChange={([value]) => toggleMutation.mutate({ key: "eating_window_hours", value: value as any })}
            min={4}
            max={12}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>4h</span>
            <span>6h</span>
            <span>8h</span>
            <span>10h</span>
            <span>12h</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

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
      {/* Dashboard Customization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smile className="h-5 w-5" />
            Dashboard Customization
          </CardTitle>
          <CardDescription>
            Personalize the greeting, motivational message, and hero card shown on this client's Today screen.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Smile className="h-4 w-4" />
              Greeting Emoji
            </Label>
            <Input
              value={(settings as any)?.greeting_emoji ?? "👋"}
              onChange={(e) => toggleMutation.mutate({ key: "greeting_emoji", value: e.target.value })}
              placeholder="👋"
              className="max-w-[80px] text-center text-xl"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Type className="h-4 w-4" />
              Greeting Subtitle
            </Label>
            <p className="text-xs text-muted-foreground">The motivational line shown below "Hello, [Name]!"</p>
            <Input
              value={(settings as any)?.greeting_subtitle ?? "Let's do this"}
              onChange={(e) => toggleMutation.mutate({ key: "greeting_subtitle", value: e.target.value })}
              placeholder="Let's do this"
              className="max-w-sm"
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Fasting Card Subtitle
            </Label>
            <p className="text-xs text-muted-foreground">The message shown on the fasting protocol card</p>
            <Input
              value={(settings as any)?.fasting_card_subtitle ?? "Fasting is the foundation of your KSOM360 plan."}
              onChange={(e) => toggleMutation.mutate({ key: "fasting_card_subtitle", value: e.target.value })}
              placeholder="Fasting is the foundation of your KSOM360 plan."
              className="max-w-sm"
            />
          </div>

           <Separator />

          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Image className="h-4 w-4" />
              Fasting Card Background Image
            </Label>
            <p className="text-xs text-muted-foreground">Optional background image for the fasting protocol card</p>
            {(settings as any)?.fasting_card_image_url && (
              <div className="relative max-w-sm">
                <img
                  src={(settings as any).fasting_card_image_url}
                  alt="Fasting card background"
                  className="rounded-lg h-24 w-full object-cover border"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-1 right-1 h-6 px-2 text-xs"
                  onClick={() => toggleMutation.mutate({ key: "fasting_card_image_url", value: null })}
                >
                  Remove
                </Button>
              </div>
            )}
            <Input
              type="file"
              accept="image/*"
              className="max-w-sm"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const ext = file.name.split(".").pop();
                  const path = `${clientId}/fasting-card-${Date.now()}.${ext}`;
                  const { error: uploadError } = await supabase.storage
                    .from("rest-day-images")
                    .upload(path, file, { upsert: true });
                  if (uploadError) throw uploadError;
                  const { data: { publicUrl } } = supabase.storage.from("rest-day-images").getPublicUrl(path);
                  toggleMutation.mutate({ key: "fasting_card_image_url", value: publicUrl });
                } catch (err) {
                  console.error("Failed to upload fasting card image:", err);
                }
              }}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Image className="h-4 w-4" />
              Eating Window Card Background Image
            </Label>
            <p className="text-xs text-muted-foreground">Optional background image for the eating window timer card</p>
            {(settings as any)?.eating_window_card_image_url && (
              <div className="relative max-w-sm">
                <img
                  src={(settings as any).eating_window_card_image_url}
                  alt="Eating window card background"
                  className="rounded-lg h-24 w-full object-cover border"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-1 right-1 h-6 px-2 text-xs"
                  onClick={() => toggleMutation.mutate({ key: "eating_window_card_image_url", value: null })}
                >
                  Remove
                </Button>
              </div>
            )}
            <Input
              type="file"
              accept="image/*"
              className="max-w-sm"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const ext = file.name.split(".").pop();
                  const path = `${clientId}/eating-window-card-${Date.now()}.${ext}`;
                  const { error: uploadError } = await supabase.storage
                    .from("rest-day-images")
                    .upload(path, file, { upsert: true });
                  if (uploadError) throw uploadError;
                  const { data: { publicUrl } } = supabase.storage.from("rest-day-images").getPublicUrl(path);
                  toggleMutation.mutate({ key: "eating_window_card_image_url", value: publicUrl });
                } catch (err) {
                  console.error("Failed to upload eating window card image:", err);
                }
              }}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Image className="h-4 w-4" />
              Dashboard Hero Message
            </Label>
            <p className="text-xs text-muted-foreground">Optional motivational message shown as a hero banner on the dashboard</p>
            <Input
              value={(settings as any)?.dashboard_hero_message ?? ""}
              onChange={(e) => toggleMutation.mutate({ key: "dashboard_hero_message", value: e.target.value })}
              placeholder="You've got this! Stay consistent 💪"
              className="max-w-sm"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Calendar Preview
          </CardTitle>
          <CardDescription>
            Show a compact day strip on the client's dashboard so they can preview upcoming scheduled events. Set to 0 to hide the strip entirely.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Days ahead to show</Label>
            <span className="text-2xl font-bold text-primary min-w-[2ch] text-right">
              {(settings as any)?.calendar_days_ahead ?? 0}
            </span>
          </div>
          <Slider
            value={[(settings as any)?.calendar_days_ahead ?? 0]}
            onValueChange={([value]) => toggleMutation.mutate({ key: "calendar_days_ahead", value: value as any })}
            min={0}
            max={7}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Off</span>
            <span>1</span>
            <span>2</span>
            <span>3</span>
            <span>4</span>
            <span>5</span>
            <span>6</span>
            <span>7 days</span>
          </div>
        </CardContent>
      </Card>

      <div className={cn("space-y-6 transition-opacity", !settings?.sport_schedule_enabled && "opacity-40 pointer-events-none")}>
        <ClientSportProfileEditor clientId={clientId} trainerId={trainerId} />
        <ClientSportScheduleCard clientId={clientId} trainerId={trainerId} />
        <SportDayCardEditor clientId={clientId} trainerId={trainerId} />
      </div>
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

      <FastingProtocolAssignment clientId={clientId} trainerId={trainerId} settings={settings} />
      <MaintenanceScheduleAssignment clientId={clientId} trainerId={trainerId} settings={settings} />
      <FastingStrictModeSettings settings={settings} toggleMutation={toggleMutation} />

      <ClientRemindersSection clientId={clientId} />
    </div>
  );
}

const MAINTENANCE_SCHEDULES = [
  { value: "16:8_daily", label: "16:8 Daily" },
  { value: "16:8_weekdays", label: "16:8 Weekdays" },
  { value: "14:10_daily", label: "14:10 Daily" },
  { value: "flexible", label: "Flexible Fasting" },
];

function MaintenanceScheduleAssignment({ clientId, trainerId, settings }: { clientId: string; trainerId: string; settings: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSchedule, setSelectedSchedule] = useState<string>(settings?.maintenance_schedule_type || "");

  const assignMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("client_feature_settings")
        .update({
          maintenance_mode: true,
          maintenance_schedule_type: selectedSchedule,
          selected_protocol_id: null,
          protocol_start_date: null,
          protocol_assigned_by: null,
          protocol_completed: false,
        })
        .eq("client_id", clientId)
        .eq("trainer_id", trainerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-feature-settings", clientId] });
      toast({ title: "Maintenance schedule assigned", description: "Client is now in maintenance mode." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to assign maintenance schedule", variant: "destructive" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("client_feature_settings")
        .update({ maintenance_mode: false, maintenance_schedule_type: null })
        .eq("client_id", clientId)
        .eq("trainer_id", trainerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-feature-settings", clientId] });
      toast({ title: "Maintenance mode removed" });
    },
  });

  if (!settings?.fasting_enabled) return null;

  const currentLabel = MAINTENANCE_SCHEDULES.find(s => s.value === settings?.maintenance_schedule_type)?.label;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Maintenance Schedule
        </CardTitle>
        <CardDescription>
          Assign a maintenance fasting schedule. This replaces the active protocol and puts the client in maintenance mode.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {settings?.maintenance_mode && currentLabel && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Schedule</p>
            <p className="text-sm font-bold mt-1">{currentLabel}</p>
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-sm font-medium">Schedule Type</Label>
          <Select value={selectedSchedule} onValueChange={setSelectedSchedule}>
            <SelectTrigger>
              <SelectValue placeholder="Select a schedule..." />
            </SelectTrigger>
            <SelectContent>
              {MAINTENANCE_SCHEDULES.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          className="w-full"
          disabled={!selectedSchedule || assignMutation.isPending}
          onClick={() => assignMutation.mutate()}
        >
          {assignMutation.isPending ? "Saving..." : "Assign Schedule"}
        </Button>

        {settings?.maintenance_mode && (
          <Button variant="ghost" size="sm" className="w-full text-xs text-destructive" onClick={() => removeMutation.mutate()}>
            Remove Maintenance Mode
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Coach-assigned fasting protocol card
function FastingProtocolAssignment({ clientId, trainerId, settings }: { clientId: string; trainerId: string; settings: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProtocolId, setSelectedProtocolId] = useState<string>(settings?.selected_protocol_id || "");
  const [startDate, setStartDate] = useState<Date>(
    settings?.protocol_start_date ? new Date(settings.protocol_start_date + "T00:00:00") : new Date()
  );

  const { data: protocols } = useQuery({
    queryKey: ["fasting-protocols-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fasting_protocols")
        .select("*")
        .order("category", { ascending: true })
        .order("duration_days", { ascending: true });
      if (error) throw error;
      return data as { id: string; name: string; category: string; duration_days: number; fast_target_hours: number; description: string | null }[];
    },
    enabled: !!settings?.fasting_enabled,
  });

  const { data: currentProtocol } = useQuery({
    queryKey: ["current-fasting-protocol", settings?.selected_protocol_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fasting_protocols")
        .select("*")
        .eq("id", settings.selected_protocol_id)
        .single();
      if (error) throw error;
      return data as { id: string; name: string; category: string; duration_days: number; fast_target_hours: number };
    },
    enabled: !!settings?.selected_protocol_id,
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("client_feature_settings")
        .update({
          selected_protocol_id: selectedProtocolId,
          protocol_start_date: format(startDate, "yyyy-MM-dd"),
          protocol_assigned_by: trainerId,
        })
        .eq("client_id", clientId)
        .eq("trainer_id", trainerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-feature-settings", clientId] });
      queryClient.invalidateQueries({ queryKey: ["current-fasting-protocol"] });
      toast({ title: "Protocol assigned", description: "Fasting protocol has been assigned to this client." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to assign protocol", variant: "destructive" });
    },
  });

  if (!settings?.fasting_enabled) return null;

  const selectedInfo = protocols?.find(p => p.id === selectedProtocolId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Fasting Protocol Assignment
        </CardTitle>
        <CardDescription>
          Assign a fasting protocol to this client. They'll see it on their Today screen with your coaching guidance.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentProtocol && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Protocol</p>
            <p className="text-sm font-bold mt-1">{currentProtocol.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {currentProtocol.duration_days} days • {currentProtocol.fast_target_hours}h fasts
              {settings?.protocol_start_date && ` • Started ${format(new Date(settings.protocol_start_date + "T00:00:00"), "MMM d, yyyy")}`}
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-sm font-medium">Protocol</Label>
          <Select value={selectedProtocolId} onValueChange={setSelectedProtocolId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a protocol..." />
            </SelectTrigger>
            <SelectContent>
              {protocols?.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  <span className="font-medium">{p.name}</span>
                  <span className="text-muted-foreground ml-2 text-xs">({p.duration_days}d • {p.fast_target_hours}h)</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedInfo?.description && (
            <p className="text-xs text-muted-foreground">{selectedInfo.description}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Start Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(d) => d && setStartDate(d)}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>

        <Button
          className="w-full"
          disabled={!selectedProtocolId || assignMutation.isPending}
          onClick={() => assignMutation.mutate()}
        >
          {assignMutation.isPending ? "Saving..." : currentProtocol ? "Update Protocol" : "Assign Protocol"}
        </Button>
      </CardContent>
    </Card>
  );
}
