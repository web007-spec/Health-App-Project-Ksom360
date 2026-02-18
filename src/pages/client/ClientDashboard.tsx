import { ClientLayout } from "@/components/ClientLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, Dumbbell, CheckCircle2, Circle, UtensilsCrossed, Footprints, ChevronRight, Smartphone, X, Plus, Pencil, Swords, Trophy, MapPin, Check, Activity, ScanBarcode, Camera, PenLine, MessageCircle, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { differenceInCalendarDays } from "date-fns";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { format, isToday, parseISO } from "date-fns";
import { useState, useRef, useEffect, useCallback } from "react";
import { useClientFeatureSettings } from "@/hooks/useClientFeatureSettings";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { SportEventCompletionDialog } from "@/components/SportEventCompletionDialog";
import { DayStripCalendar } from "@/components/DayStripCalendar";
import { QuickCardioFlow } from "@/components/cardio/QuickCardioFlow";
import { SpeedDialFAB } from "@/components/SpeedDialFAB";
import { BreakYourFastCard } from "@/components/BreakYourFastCard";
import { ProgramsSelector } from "@/components/ProgramsSelector";

// Fasting Protocol Card sub-component
function FastingProtocolCard({ clientId, navigate }: { clientId: string | null; navigate: (path: string) => void }) {
  const queryClient = useQueryClient();
  const [now, setNow] = useState(new Date());

  const { data: featureSettings } = useQuery({
    queryKey: ["my-feature-settings-fasting", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_feature_settings")
        .select("selected_protocol_id, selected_quick_plan_id, protocol_start_date, active_fast_start_at, active_fast_target_hours, last_fast_ended_at, eating_window_ends_at, eating_window_hours, fasting_strict_mode, protocol_assigned_by, fasting_card_subtitle, fasting_card_image_url")
        .eq("client_id", clientId)
        .maybeSingle();
      if (error) throw error;
      return data as {
        selected_protocol_id: string | null;
        selected_quick_plan_id: string | null;
        protocol_start_date: string | null;
        active_fast_start_at: string | null;
        active_fast_target_hours: number | null;
        last_fast_ended_at: string | null;
        eating_window_ends_at: string | null;
        eating_window_hours: number;
        fasting_strict_mode: boolean;
        protocol_assigned_by: string | null;
        fasting_card_subtitle: string | null;
        fasting_card_image_url: string | null;
      } | null;
    },
    enabled: !!clientId,
  });

  const { data: activeProtocol } = useQuery({
    queryKey: ["active-fasting-protocol", featureSettings?.selected_protocol_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fasting_protocols")
        .select("*")
        .eq("id", featureSettings!.selected_protocol_id!)
        .single();
      if (error) throw error;
      return data as { id: string; name: string; duration_days: number; fast_target_hours: number };
    },
    enabled: !!featureSettings?.selected_protocol_id,
  });

  const isFasting = !!featureSettings?.active_fast_start_at;
  const hasEatingWindow = !!featureSettings?.eating_window_ends_at && new Date(featureSettings.eating_window_ends_at) > now;

  // Tick every second while fasting or eating window is active
  useEffect(() => {
    if (!isFasting && !hasEatingWindow) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [isFasting, hasEatingWindow]);

  const startFastMutation = useMutation({
    mutationFn: async () => {
      const targetHours = activeProtocol?.fast_target_hours || featureSettings?.active_fast_target_hours || 16;
      const { error } = await supabase
        .from("client_feature_settings")
        .update({
          active_fast_start_at: new Date().toISOString(),
          active_fast_target_hours: targetHours,
          last_fast_ended_at: null,
        })
        .eq("client_id", clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings-fasting"] });
    },
  });

  const endFastMutation = useMutation({
    mutationFn: async () => {
      const eatingWindowHours = featureSettings?.eating_window_hours || 8;
      const eatingWindowEnd = new Date(Date.now() + eatingWindowHours * 3600000).toISOString();
      const { error } = await supabase
        .from("client_feature_settings")
        .update({
          last_fast_ended_at: new Date().toISOString(),
          last_fast_completed_at: new Date().toISOString(),
          active_fast_start_at: null,
          active_fast_target_hours: null,
          eating_window_ends_at: eatingWindowEnd,
        })
        .eq("client_id", clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings-fasting"] });
      queryClient.invalidateQueries({ queryKey: ["fasting-gate-state"] });
    },
  });

  const cancelProtocolMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("client_feature_settings")
        .update({
          selected_protocol_id: null,
          protocol_start_date: null,
          protocol_assigned_by: null,
          active_fast_start_at: null,
          active_fast_target_hours: null,
          eating_window_ends_at: null,
        })
        .eq("client_id", clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings-fasting"] });
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings"] });
      queryClient.invalidateQueries({ queryKey: ["fasting-gate-state"] });
    },
  });
  const fastingSubtitle = featureSettings?.fasting_card_subtitle || "Fasting is the foundation of your KSOM360 plan.";

  // No protocol selected — empty state
  const hasQuickPlan = !!featureSettings?.selected_quick_plan_id;
  const hasProtocol = !!featureSettings?.selected_protocol_id && !!activeProtocol;
  
  // No protocol or quick plan selected — empty state (but if actively fasting via quick plan, skip to timer)
  if (!hasProtocol && !hasQuickPlan && !isFasting && !hasEatingWindow) {
    const fastingCardBg = featureSettings?.fasting_card_image_url;
    return (
      <Card className="overflow-hidden border-primary/20 shadow-lg relative">
        {fastingCardBg ? (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${fastingCardBg})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <CardContent className="relative z-10 min-h-[240px] flex flex-col justify-end p-5 space-y-3">
              <div className="text-left">
                <p className="text-base font-bold text-white drop-shadow-lg">
                  {fastingSubtitle}
                </p>
              </div>
              <Button 
                className="w-full h-11 text-base bg-white/25 hover:bg-white/35 text-white border border-white/30 backdrop-blur-sm"
                variant="ghost"
                onClick={() => navigate("/client/choose-protocol")}
              >
                Choose Protocol
              </Button>
            </CardContent>
          </>
        ) : (
          <CardContent className="px-6 py-8 text-center space-y-4">
            <div>
              <p className="text-base font-bold">
                {fastingSubtitle}
              </p>
            </div>
            <Button className="w-full h-12 text-base" onClick={() => navigate("/client/choose-protocol")}>
              Choose Protocol
            </Button>
          </CardContent>
        )}
      </Card>
    );
  }

  const isCoachAssigned = !!featureSettings?.protocol_assigned_by;
  const planName = activeProtocol?.name || `${featureSettings?.active_fast_target_hours || 16}h Fast`;
  const hasDuration = !!activeProtocol?.duration_days;

  const startDate = featureSettings.protocol_start_date ? new Date(featureSettings.protocol_start_date + "T00:00:00") : new Date();
  const dayNumber = hasDuration ? Math.min(differenceInCalendarDays(new Date(), startDate) + 1, activeProtocol!.duration_days) : 0;

  // Timer calculations
  if (isFasting && featureSettings.active_fast_start_at && featureSettings.active_fast_target_hours) {
    const fastStart = new Date(featureSettings.active_fast_start_at);
    const fastEnd = new Date(fastStart.getTime() + featureSettings.active_fast_target_hours * 3600000);
    const elapsed = now.getTime() - fastStart.getTime();
    const total = fastEnd.getTime() - fastStart.getTime();
    const progress = Math.min(Math.max(elapsed / total, 0), 1);
    const remainingMs = Math.max(fastEnd.getTime() - now.getTime(), 0);
    const remainH = Math.floor(remainingMs / 3600000);
    const remainM = Math.floor((remainingMs % 3600000) / 60000);
    const remainS = Math.floor((remainingMs % 60000) / 1000);
    const timeStr = `${String(remainH).padStart(2, "0")}:${String(remainM).padStart(2, "0")}:${String(remainS).padStart(2, "0")}`;
    const endTimeStr = fastEnd.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

    // SVG ring params — hero-sized like Apple Activity / Zero
    const size = 240;
    const stroke = 14;
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference * (1 - progress);

    return (
      <Card className="overflow-hidden border-primary/20 shadow-lg">
        <CardContent className="px-5 pt-8 pb-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fasting Protocol</p>
                {isCoachAssigned && <Badge className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">Coach Assigned</Badge>}
              </div>
              <h3 className="text-base font-bold mt-0.5">{planName}</h3>
            </div>
            {hasDuration && <Badge variant="secondary" className="text-xs">Day {dayNumber} / {activeProtocol!.duration_days}</Badge>}
          </div>

          {/* Hero Circular Timer */}
          <div className="flex flex-col items-center py-4">
            <div className="relative" style={{ width: size, height: size }}>
              <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} opacity={0.4} />
                <circle
                  cx={size / 2} cy={size / 2} r={radius} fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  className="transition-[stroke-dashoffset] duration-1000 ease-linear"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold tabular-nums tracking-tight">{timeStr}</span>
                <span className="text-sm text-muted-foreground mt-1.5">remaining</span>
              </div>
            </div>
            <div className="mt-4 space-y-1 text-center">
              <p className="text-sm text-muted-foreground">
                {remainingMs > 0 ? `Eating window opens at ${endTimeStr}` : "Fast complete! 🎉"}
              </p>
              <div className="flex justify-center gap-4 text-xs text-muted-foreground">
                <span>Started: {format(fastStart, "MMM d, h:mm a")}</span>
                <span>Opens: {format(fastEnd, "MMM d, h:mm a")}</span>
              </div>
            </div>
          </div>

          <Button variant="destructive" className="w-full h-12 text-base" onClick={() => endFastMutation.mutate()}>
            End Fast
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Eating window active state
  if (hasEatingWindow && featureSettings?.eating_window_ends_at) {
    const ewEnd = new Date(featureSettings.eating_window_ends_at);
    const ewRemainingMs = Math.max(ewEnd.getTime() - now.getTime(), 0);
    const ewH = Math.floor(ewRemainingMs / 3600000);
    const ewM = Math.floor((ewRemainingMs % 3600000) / 60000);
    const ewS = Math.floor((ewRemainingMs % 60000) / 1000);
    const ewTimeStr = `${String(ewH).padStart(2, "0")}:${String(ewM).padStart(2, "0")}:${String(ewS).padStart(2, "0")}`;

    return (
      <Card className="overflow-hidden border-primary/20 shadow-lg">
        <CardContent className="px-5 pt-8 pb-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fasting Protocol</p>
                {isCoachAssigned && <Badge className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">Coach Assigned</Badge>}
              </div>
              <h3 className="text-base font-bold mt-0.5">{planName}</h3>
            </div>
            {hasDuration && <Badge variant="secondary" className="text-xs">Day {dayNumber} / {activeProtocol!.duration_days}</Badge>}
          </div>
          <div className="text-center py-6">
            <Badge className="mb-3 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/10">Eating Window</Badge>
            <p className="text-4xl font-bold tabular-nums tracking-tight">{ewTimeStr}</p>
            <p className="text-sm text-muted-foreground mt-2">Closes in {ewH}h {ewM}m</p>
            <p className="text-sm text-emerald-600 font-medium mt-1">Meals are available</p>
            <div className="flex justify-center gap-4 text-xs text-muted-foreground mt-2">
              {featureSettings?.last_fast_ended_at && (
                <span>Fast ended: {format(new Date(featureSettings.last_fast_ended_at), "MMM d, h:mm a")}</span>
              )}
              <span>Window closes: {format(ewEnd, "MMM d, h:mm a")}</span>
            </div>
          </div>
          <Button variant="outline" className="w-full h-12 text-base" onClick={() => startFastMutation.mutate()}>
            <Clock className="h-4 w-4 mr-2" /> Start next fast
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Not fasting — ready state
  return (
    <Card className="overflow-hidden border-primary/20 shadow-lg">
      <CardContent className="px-5 pt-8 pb-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fasting Protocol</p>
              {isCoachAssigned && <Badge className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">Coach Assigned</Badge>}
            </div>
            <h3 className="text-base font-bold mt-0.5">{planName}</h3>
          </div>
          {hasDuration && <Badge variant="secondary" className="text-xs">Day {dayNumber} / {activeProtocol!.duration_days}</Badge>}
        </div>
        <div className="text-center py-6">
          <p className="text-lg text-muted-foreground">Ready to start your next fast</p>
        </div>
        <Button className="w-full h-12 text-base" onClick={() => startFastMutation.mutate()}>
          <Clock className="h-4 w-4 mr-2" /> Start Fast
        </Button>
        {isCoachAssigned && (
          <p className="text-[11px] text-muted-foreground text-center">
            Need a different plan? Message your coach.
          </p>
        )}
        {!isCoachAssigned && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate("/client/programs")}>
              Change protocol
            </Button>
            <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={() => cancelProtocolMutation.mutate()}>
              Cancel protocol
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ClientDashboard() {
  const { user } = useAuth();
  const clientId = useEffectiveClientId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { settings } = useClientFeatureSettings();
  const { toast } = useToast();

  const DIET_STYLES = [
    { value: "standard_keto", label: "Standard Keto", split: "75F / 20P / 5C", icon: "🥑", fatPct: 0.75, proteinPct: 0.20, carbsPct: 0.05 },
    { value: "high_protein_keto", label: "High Protein Keto", split: "60F / 35P / 5C", icon: "💪", fatPct: 0.60, proteinPct: 0.35, carbsPct: 0.05 },
    { value: "modified_keto", label: "Modified Keto", split: "70F / 25P / 5C", icon: "⚖️", fatPct: 0.70, proteinPct: 0.25, carbsPct: 0.05 },
  ];

  // Quick-edit macro sheet state
  const [macroEditOpen, setMacroEditOpen] = useState(false);
  const [editMode, setEditMode] = useState<"grams" | "percent">("grams");
  const [customCalories, setCustomCalories] = useState("");
  const [customProtein, setCustomProtein] = useState("");
  const [customCarbs, setCustomCarbs] = useState("");
  const [customFats, setCustomFats] = useState("");

  // Carousel state
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Install banner state
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const [showInstallBanner, setShowInstallBanner] = useState(() => {
    if (isStandalone) return false;
    const dismissed = localStorage.getItem('installBannerDismissed');
    if (dismissed) {
      const days3 = 3 * 24 * 60 * 60 * 1000;
      if (Date.now() - parseInt(dismissed, 10) < days3) return false;
    }
    return true;
  });
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  const dismissInstallBanner = () => {
    setShowInstallBanner(false);
    localStorage.setItem('installBannerDismissed', Date.now().toString());
  };

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setActiveIndex(index);
  }, []);

  // Check if profile is complete, redirect to onboarding if not
  const { data: profile } = useQuery({
    queryKey: ["profile-check", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, onboarding_completed")
        .eq("id", clientId)
        .single();

      if (!data?.onboarding_completed) {
        navigate("/client/onboarding");
      }
      
      return data;
    },
    enabled: !!clientId,
  });

  // Fetch today's workouts
  const { data: clientWorkouts } = useQuery({
    queryKey: ["client-workouts-today", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_workouts")
        .select(`*, workout_plan:workout_plans(*)`)
        .eq("client_id", clientId)
        .order("scheduled_date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!clientId && settings.training_enabled,
  });

  // Fetch today's tasks
  const { data: tasks } = useQuery({
    queryKey: ["client-tasks-today", clientId],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("client_tasks")
        .select("*")
        .eq("client_id", clientId)
        .or(`due_date.eq.${today},due_date.is.null`)
        .order("assigned_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!clientId && settings.tasks_enabled,
  });

  // Fetch today's habits
  const { data: habits } = useQuery({
    queryKey: ["client-habits-today", clientId],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("client_habits")
        .select("*")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .lte("start_date", today);
      if (error) throw error;
      return (data as any[]).filter((h: any) => {
        if (h.end_date && h.end_date < today) return false;
        if (h.frequency === "daily") return true;
        const startDay = new Date(h.start_date + "T00:00:00").getDay();
        return new Date().getDay() === startDay;
      });
    },
    enabled: !!clientId && settings.tasks_enabled,
  });

  // Fetch today's habit completions
  const { data: habitCompletions } = useQuery({
    queryKey: ["client-habit-completions-today", clientId],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("habit_completions")
        .select("*")
        .eq("client_id", clientId)
        .eq("completion_date", today);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!clientId && settings.tasks_enabled,
  });

  // Toggle habit completion
  const toggleHabitMutation = useMutation({
    mutationFn: async ({ habitId, completed }: { habitId: string; completed: boolean }) => {
      const today = format(new Date(), "yyyy-MM-dd");
      if (completed) {
        const { error } = await supabase
          .from("habit_completions")
          .delete()
          .eq("habit_id", habitId)
          .eq("client_id", clientId)
          .eq("completion_date", today);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("habit_completions")
          .insert({ habit_id: habitId, client_id: clientId!, completion_date: today });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-habit-completions-today"] });
    },
  });

  // Fetch nutrition logs for today
  const { data: todayNutrition } = useQuery({
    queryKey: ["nutrition-today", clientId],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("nutrition_logs")
        .select("*")
        .eq("client_id", clientId)
        .eq("log_date", today);
      if (error) throw error;
      return data;
    },
    enabled: !!clientId && settings.food_journal_enabled,
  });

  // Fetch fasting state for meal gating
  const { data: fastingState } = useQuery({
    queryKey: ["fasting-gate-state", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_feature_settings")
        .select("selected_protocol_id, active_fast_start_at, active_fast_target_hours, fasting_strict_mode, eating_window_ends_at, eating_window_hours")
        .eq("client_id", clientId)
        .maybeSingle();
      if (error) throw error;
      return data as {
        selected_protocol_id: string | null;
        active_fast_start_at: string | null;
        active_fast_target_hours: number | null;
        fasting_strict_mode: boolean;
        eating_window_ends_at: string | null;
        eating_window_hours: number;
      } | null;
    },
    enabled: !!clientId && settings.fasting_enabled,
  });

  // Determine meal gating status
  const mealGateStatus = (() => {
    if (!settings.fasting_enabled) return "allowed"; // no gating
    if (!fastingState?.selected_protocol_id) return "no_protocol";
    if (fastingState.active_fast_start_at) return "fasting";
    // Not fasting — check strict mode
    if (fastingState.fasting_strict_mode) {
      // In strict mode, meals only during eating window
      if (fastingState.eating_window_ends_at && new Date(fastingState.eating_window_ends_at) > new Date()) {
        return "allowed";
      }
      return "strict_locked"; // no eating window active
    }
    return "allowed";
  })();

  const fastEndTimeStr = (() => {
    if (mealGateStatus !== "fasting" || !fastingState?.active_fast_start_at || !fastingState?.active_fast_target_hours) return "";
    const end = new Date(new Date(fastingState.active_fast_start_at).getTime() + fastingState.active_fast_target_hours * 3600000);
    return end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  })();

  // Fetch macro targets
  const { data: macroTargets } = useQuery({
    queryKey: ["client-macro-targets", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_macro_targets")
        .select("*")
        .eq("client_id", clientId!)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId && settings.macros_enabled,
  });


  // Quick macro edit mutation
  const saveMacrosMutation = useMutation({
    mutationFn: async (payload: { calories: number; protein: number; carbs: number; fats: number; diet_style: string }) => {
      const isImpersonating = clientId !== user?.id;
      const updateData = {
        target_calories: payload.calories,
        target_protein: payload.protein,
        target_carbs: payload.carbs,
        target_fats: payload.fats,
        diet_style: payload.diet_style,
        ...(isImpersonating ? { trainer_id: user?.id } : {}),
      };
      if (macroTargets) {
        const { error } = await supabase.from("client_macro_targets").update(updateData).eq("id", macroTargets.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-macro-targets"] });
      setMacroEditOpen(false);
      toast({ title: "Macro goals updated!" });
    },
  });

  const handleDietPresetSelect = (preset: typeof DIET_STYLES[0]) => {
    const cals = macroTargets?.target_calories || 2000;
    const protein = Math.round((cals * preset.proteinPct) / 4);
    const carbs = Math.round((cals * preset.carbsPct) / 4);
    const fats = Math.round((cals * preset.fatPct) / 9);
    saveMacrosMutation.mutate({ calories: cals, protein, carbs, fats, diet_style: preset.value });
  };

  const handleCustomSave = () => {
    const cals = parseInt(customCalories) || macroTargets?.target_calories || 2000;
    if (editMode === "percent") {
      const pPct = parseFloat(customProtein) || 0;
      const cPct = parseFloat(customCarbs) || 0;
      const fPct = parseFloat(customFats) || 0;
      saveMacrosMutation.mutate({
        calories: cals,
        protein: Math.round((cals * pPct / 100) / 4),
        carbs: Math.round((cals * cPct / 100) / 4),
        fats: Math.round((cals * fPct / 100) / 9),
        diet_style: "custom",
      });
    } else {
      saveMacrosMutation.mutate({
        calories: cals,
        protein: parseInt(customProtein) || 0,
        carbs: parseInt(customCarbs) || 0,
        fats: parseInt(customFats) || 0,
        diet_style: "custom",
      });
    }
  };

  const openMacroEdit = () => {
    if (macroTargets) {
      setCustomCalories(String(macroTargets.target_calories || ""));
      setCustomProtein(String(Math.round(Number(macroTargets.target_protein) || 0)));
      setCustomCarbs(String(Math.round(Number(macroTargets.target_carbs) || 0)));
      setCustomFats(String(Math.round(Number(macroTargets.target_fats) || 0)));
      setEditMode("grams");
    }
    setMacroEditOpen(true);
  };

  const getDietLabel = () => {
    const style = (macroTargets as any)?.diet_style;
    const found = DIET_STYLES.find(d => d.value === style);
    if (found) return found.label;
    if (style === "custom") return "Custom";
    // Infer from current macro ratios if diet_style not yet saved
    if (macroTargets && macroTargets.target_calories) {
      const cals = macroTargets.target_calories;
      const pPct = Math.round(((Number(macroTargets.target_protein) || 0) * 4 / cals) * 100);
      const fPct = Math.round(((Number(macroTargets.target_fats) || 0) * 9 / cals) * 100);
      for (const d of DIET_STYLES) {
        if (Math.abs(pPct - d.proteinPct * 100) <= 3 && Math.abs(fPct - d.fatPct * 100) <= 3) {
          return d.label;
        }
      }
      return "Custom";
    }
    return null;
  };

  // Complete task mutation
  const completeMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("client_tasks")
        .update({ completed_at: new Date().toISOString() })
        .eq("id", taskId)
        .eq("client_id", clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-tasks-today"] });
    },
  });

  const firstName = profile?.full_name?.split(" ")[0] || "there";
  const todayDate = format(new Date(), "EEEE, MMM d").toUpperCase();

  // Fetch custom rest day card
  const { data: restDayCard } = useQuery({
    queryKey: ["rest-day-card", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_rest_day_cards" as any)
        .select("*")
        .eq("client_id", clientId)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!clientId && settings.training_enabled,
  });

  // Fetch today's sport schedule events
  const { data: todaySportEvents } = useQuery({
    queryKey: ["client-sport-events-today", clientId],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("sport_schedule_events")
        .select("*")
        .eq("client_id", clientId)
        .gte("start_time", `${today}T00:00:00`)
        .lte("start_time", `${today}T23:59:59`)
        .order("start_time", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!clientId && settings.sport_schedule_enabled !== false,
  });

  // Fetch custom sport day cards (practice/game)
  const { data: sportDayCards } = useQuery({
    queryKey: ["sport-day-cards", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_sport_day_cards" as any)
        .select("*")
        .eq("client_id", clientId);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!clientId,
  });

  const practiceCard = sportDayCards?.find((c: any) => c.card_type === "practice");
  const gameCard = sportDayCards?.find((c: any) => c.card_type === "game");

  // Sport event completion dialog state
  const [selectedSportEvent, setSelectedSportEvent] = useState<any>(null);
  const [sportCompletionOpen, setSportCompletionOpen] = useState(false);
  const [cardioFlowOpen, setCardioFlowOpen] = useState(false);

  // Fetch today's sport event completions
  const { data: sportEventCompletions } = useQuery({
    queryKey: ["sport-event-completions", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sport_event_completions" as any)
        .select("*")
        .eq("client_id", clientId);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!clientId,
  });

  // Fetch today's completed cardio sessions
  const { data: todayCardioSessions } = useQuery({
    queryKey: ["cardio-sessions-today", clientId],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("cardio_sessions" as any)
        .select("*")
        .eq("client_id", clientId)
        .gte("created_at", `${today}T00:00:00`)
        .lte("created_at", `${today}T23:59:59`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!clientId,
  });

  function formatEventTime(isoString: string): string {
    const match = isoString.match(/T(\d{2}):(\d{2})/);
    if (!match) return "";
    const hours = parseInt(match[1], 10);
    const displayHour = hours % 12 || 12;
    const ampm = hours >= 12 ? "PM" : "AM";
    return `${displayHour}:${match[2]} ${ampm}`;
  }

  const formatCardioTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}m ${secs.toString().padStart(2, "0")}s`;
  };

  const handleCardioStart = async (activity: string, targetType: string, targetValue?: number) => {
    if (!clientId) return;
    const { data, error } = await supabase
      .from("cardio_sessions" as any)
      .insert({
        client_id: clientId,
        activity_type: activity,
        target_type: targetType,
        target_value: targetValue || null,
        status: "in_progress",
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) { toast({ title: "Error", variant: "destructive" }); return; }
    navigate(`/client/cardio-player?activity=${activity}&targetType=${targetType}&targetValue=${targetValue || ""}&sessionId=${(data as any).id}`);
  };

  const handleCardioComplete = async (activity: string, targetType: string, targetValue?: number) => {
    if (!clientId) return;
    await supabase
      .from("cardio_sessions" as any)
      .insert({
        client_id: clientId,
        activity_type: activity,
        target_type: targetType,
        target_value: targetValue || null,
        status: "completed",
        duration_seconds: 0,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      });
    queryClient.invalidateQueries({ queryKey: ["cardio-sessions-today"] });
    toast({ title: "Activity logged!", description: `${activity} marked as complete` });
  };

  // Today's workouts
  const todaysWorkouts = clientWorkouts?.filter((w) => {
    if (w.completed_at) return false;
    if (w.scheduled_date && isToday(parseISO(w.scheduled_date))) return true;
    return false;
  }) || [];

  const hasSportEvents = (todaySportEvents?.length || 0) > 0;
  const isRestDay = todaysWorkouts.length === 0 && !hasSportEvents;
  const totalCards = todaysWorkouts.length + (todaySportEvents?.length || 0);
  const hasMultiple = totalCards > 1;

  // Attach scroll listener
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !hasMultiple) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll, hasMultiple]);

  // Task stats
  const completedTaskCount = tasks?.filter((t) => t.completed_at)?.length || 0;
  const totalTaskCount = tasks?.length || 0;

  // Nutrition stats
  const todayMealCount = todayNutrition?.length || 0;
  const todayCalories = todayNutrition?.reduce((sum, log) => sum + (log.calories || 0), 0) || 0;
  const todayProtein = todayNutrition?.reduce((sum, log) => sum + (log.protein || 0), 0) || 0;
  const todayCarbs = todayNutrition?.reduce((sum, log) => sum + (log.carbs || 0), 0) || 0;
  const todayFats = todayNutrition?.reduce((sum, log) => sum + (log.fats || 0), 0) || 0;


  return (
    <ClientLayout>
      <div className="px-3 pt-4 pb-8 space-y-5 w-full">
        {/* Header */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <p className="text-xs font-semibold text-muted-foreground tracking-wider">{todayDate}</p>
            <h1 className="text-2xl font-bold mt-0.5">Hello, {firstName}! {settings.greeting_emoji || '👋'}</h1>
            <p className="text-sm text-muted-foreground font-medium mt-0.5">{settings.greeting_subtitle || 'Let\'s do this'}</p>
          </div>
          <Button variant="ghost" size="icon" className="relative" onClick={() => navigate("/client/settings")}>
            <Bell className="h-5 w-5" />
          </Button>
        </div>

        {/* Dashboard Hero Message */}
        {settings.dashboard_hero_message && (
          <Card className="overflow-hidden border-primary/20 bg-primary/5">
            <CardContent className="px-5 py-4">
              <p className="text-sm font-medium text-foreground">{settings.dashboard_hero_message}</p>
            </CardContent>
          </Card>
        )}

        {/* Day Strip Calendar */}
        {settings.calendar_days_ahead > 0 && clientId && (
          <DayStripCalendar
            clientId={clientId}
            daysAhead={settings.calendar_days_ahead}
            trainingEnabled={settings.training_enabled}
            tasksEnabled={settings.tasks_enabled}
          />
        )}

        {/* Today's Workouts — show FIRST when fasting is NOT enabled */}
        {!settings.fasting_enabled && settings.training_enabled && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              {isRestDay ? "Today" : hasSportEvents && todaysWorkouts.length === 0 ? "Today's Schedule" : `Today's Workout${hasMultiple ? "s" : ""}`}
            </h2>
            {isRestDay ? (
              <Card className="overflow-hidden">
                {restDayCard?.image_url ? (
                  <div className="relative h-56">
                    <img src={restDayCard.image_url} alt="Rest day" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">Rest Day</p>
                      <p className="text-base font-bold text-white">
                        {restDayCard?.message || "No workouts scheduled for today. Enjoy your rest!"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <CardContent className="p-6 text-center">
                    <Dumbbell className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-lg font-semibold">Rest Day</p>
                    <p className="text-sm text-muted-foreground">
                      {restDayCard?.message || "No workouts scheduled for today. Enjoy your rest!"}
                    </p>
                  </CardContent>
                )}
              </Card>
            ) : (
              <div>
                <div ref={!settings.fasting_enabled ? scrollRef : undefined} className={hasMultiple ? "flex overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-hide" : ""}>
                  {todaysWorkouts.map((workout) => (
                    <Card
                      key={workout.id}
                      className={`overflow-hidden cursor-pointer hover:shadow-md transition-all duration-300 shrink-0 snap-center ${hasMultiple ? "w-full min-w-full" : "w-full"}`}
                      onClick={() => navigate(`/client/workouts/${workout.workout_plan_id}`)}
                    >
                      <div className="relative h-56 bg-gradient-to-br from-primary/20 to-primary/5">
                        {workout.workout_plan?.image_url ? (
                          <img src={workout.workout_plan.image_url} alt={workout.workout_plan.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Dumbbell className="h-16 w-16 text-primary/20" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">Today's Workout</p>
                          <p className="text-lg font-bold text-white">{workout.workout_plan?.name}</p>
                        </div>
                      </div>
                      <CardContent className="p-3">
                        <Button className="w-full" size="lg" variant="outline" onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/client/workouts/${workout.workout_plan_id}`);
                        }}>
                          View Workout
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Fasting Protocol Card */}
        {settings.fasting_enabled && (
          <FastingProtocolCard clientId={clientId} navigate={navigate} />
        )}

        {/* Break Your Fast Card — only during active eating window */}
        {settings.fasting_enabled && mealGateStatus === "allowed" && fastingState?.eating_window_ends_at && new Date(fastingState.eating_window_ends_at) > new Date() && (
          <BreakYourFastCard hasFlexibleMealPlan={settings.meal_plan_type === "flexible"} />
        )}

        {/* Install App Banner */}
        {showInstallBanner && (
          <Card className="border-primary/30 bg-primary/5 overflow-hidden">
            <CardContent className="p-4 relative">
              <button onClick={dismissInstallBanner} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-primary/10 rounded-xl shrink-0">
                  <Smartphone className="h-6 w-6 text-primary" />
                </div>
                <div className="pr-4">
                  <p className="font-bold text-sm">📲 Install the app to get notifications</p>
                  {isIOS ? (
                    <div className="mt-1.5 space-y-1">
                      <p className="text-xs text-muted-foreground leading-relaxed">Get workout reminders on your lock screen:</p>
                      <ol className="text-xs text-muted-foreground list-decimal pl-4 space-y-0.5 leading-relaxed">
                        <li>Tap the <span className="font-semibold text-foreground">Share</span> button <span className="inline-block">⬆️</span> in Safari</li>
                        <li>Scroll down and tap <span className="font-semibold text-foreground">"Add to Home Screen"</span></li>
                        <li>Open the app from your home screen</li>
                        <li>Enable notifications in Settings</li>
                      </ol>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Add to your home screen for workout reminders, quick access, and offline use.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Habits - only if tasks enabled */}
        {settings.tasks_enabled && habits && habits.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold">Habits</h2>
              <button onClick={() => navigate("/client/habits")} className="text-sm font-semibold text-primary">View all</button>
            </div>
            <Card>
              <CardContent className="p-0 divide-y divide-border">
                {habits.map((habit: any) => {
                  const todayCompletionCount = habitCompletions?.filter((c: any) => c.habit_id === habit.id).length || 0;
                  const icon = habit.icon_url?.startsWith("emoji:") ? habit.icon_url.replace("emoji:", "") : "🎯";
                  return (
                    <div
                      key={habit.id}
                      className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => navigate(`/client/habits/${habit.id}`)}
                    >
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-xl shrink-0">
                        {icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold">{habit.name}</span>
                        <p className="text-xs text-muted-foreground mt-0.5">{todayCompletionCount} of {habit.goal_value} {habit.goal_unit} today</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Nutrition (Macros card) */}
        {settings.macros_enabled && !macroTargets && (
          <div>
            <Card className="overflow-hidden cursor-pointer hover:shadow-sm transition-shadow" onClick={() => navigate("/client/macro-setup")}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-base">Set Macro Goals</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      Macros First, Magic Later.{"\n"}Let's Lock in That Goal Today!
                    </p>
                    <button className="text-sm font-semibold text-primary mt-2">Set goals</button>
                  </div>
                  <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center text-3xl">
                    🍱
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {settings.macros_enabled && macroTargets && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nutrition</h2>
                {getDietLabel() && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {getDietLabel()}
                  </span>
                )}
              </div>
              <Button variant="ghost" size="sm" className="h-6 px-2 gap-1 text-xs" onClick={(e) => { e.stopPropagation(); openMacroEdit(); }}>
                <Pencil className="h-3 w-3" /> Edit
              </Button>
            </div>
            <Card className="cursor-pointer hover:shadow-sm transition-shadow min-h-[160px]" onClick={() => navigate("/client/nutrition")}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Mini donut chart */}
                  <div className="relative w-20 h-20 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { value: todayCalories, color: "hsl(var(--primary))" },
                            { value: Math.max((macroTargets.target_calories || 0) - todayCalories, 0), color: "hsl(var(--muted))" },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={28}
                          outerRadius={38}
                          startAngle={90}
                          endAngle={-270}
                          paddingAngle={0}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          <Cell fill="hsl(var(--primary))" />
                          <Cell fill="hsl(var(--muted))" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xs font-bold text-foreground leading-none">{todayCalories}</span>
                      <span className="text-[9px] text-muted-foreground">cal</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">
                      {todayCalories} / {macroTargets.target_calories?.toLocaleString()} cal
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {todayMealCount > 0
                        ? `${todayMealCount} meal${todayMealCount > 1 ? "s" : ""} logged today`
                        : "No meals logged yet"}
                    </p>
                  </div>
                </div>
                {/* Macro breakdown bars */}
                <div className="grid grid-cols-3 gap-3 mt-3">
                  {[
                    { label: "P", current: Math.round(todayProtein), target: Math.round(Number(macroTargets.target_protein) || 0), color: "#6366f1" },
                    { label: "C", current: Math.round(todayCarbs), target: Math.round(Number(macroTargets.target_carbs) || 0), color: "#22c55e" },
                    { label: "F", current: Math.round(todayFats), target: Math.round(Number(macroTargets.target_fats) || 0), color: "#eab308" },
                  ].map((macro) => (
                    <div key={macro.label} className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold" style={{ color: macro.color }}>{macro.label}</span>
                        <span className="text-xs text-muted-foreground">{macro.current}/{macro.target}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${macro.target > 0 ? Math.min((macro.current / macro.target) * 100, 100) : 0}%`,
                            backgroundColor: macro.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {mealGateStatus === "no_protocol" ? (
                  <div className="mt-3 p-3 rounded-lg bg-muted/50 text-center space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">Choose a fasting protocol to log meals.</p>
                    <Button variant="outline" size="sm" className="w-full" onClick={(e) => { e.stopPropagation(); navigate("/client/programs"); }}>
                      Choose Protocol
                    </Button>
                  </div>
                ) : mealGateStatus === "fasting" ? (
                  <div className="mt-3 p-3 rounded-lg bg-muted/50 text-center space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">You're currently fasting. Meals unlock when your fast ends.</p>
                    <p className="text-[10px] text-muted-foreground">Eating window opens at {fastEndTimeStr}</p>
                    <Button variant="outline" size="sm" className="w-full" onClick={async (e) => {
                      e.stopPropagation();
                      const ewHours = fastingState?.eating_window_hours || 8;
                      const ewEnd = new Date(Date.now() + ewHours * 3600000).toISOString();
                      await supabase.from("client_feature_settings").update({ last_fast_ended_at: new Date().toISOString(), last_fast_completed_at: new Date().toISOString(), active_fast_start_at: null, active_fast_target_hours: null, eating_window_ends_at: ewEnd }).eq("client_id", clientId);
                      queryClient.invalidateQueries({ queryKey: ["fasting-gate-state"] });
                      queryClient.invalidateQueries({ queryKey: ["my-feature-settings-fasting"] });
                    }}>
                      End Fast
                    </Button>
                  </div>
                ) : mealGateStatus === "strict_locked" ? (
                  <div className="mt-3 p-3 rounded-lg bg-muted/50 text-center space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">Start a fast to open your eating window.</p>
                    <Button variant="outline" size="sm" className="w-full gap-1" onClick={(e) => { e.stopPropagation(); navigate("/client/programs"); }}>
                      <Clock className="h-3.5 w-3.5" /> Start Fast
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full mt-3 gap-1"
                    onClick={(e) => { e.stopPropagation(); navigate("/client/log-meal"); }}
                  >
                    <Plus className="h-3.5 w-3.5" /> Log meal
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Food Journal fallback (no macros but food journal enabled) */}
        {settings.food_journal_enabled && !settings.macros_enabled && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Food Journal</h2>
            <Card className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => navigate("/client/nutrition")}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-accent/10 rounded-xl">
                  <UtensilsCrossed className="h-6 w-6 text-accent" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">
                    {todayMealCount > 0
                      ? `${todayMealCount} meal${todayMealCount > 1 ? "s" : ""} logged • ${todayCalories} cal`
                      : "What did you eat today?"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {todayMealCount > 0 ? "Tap to add more" : "Track your meals and macros"}
                  </p>
                </div>
                {mealGateStatus === "no_protocol" ? (
                  <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); navigate("/client/programs"); }}>
                    Choose Protocol
                  </Button>
                ) : mealGateStatus === "fasting" ? (
                  <div className="text-right space-y-1">
                    <p className="text-[10px] text-muted-foreground">Fasting · opens at {fastEndTimeStr}</p>
                  </div>
                ) : mealGateStatus === "strict_locked" ? (
                  <div className="text-right space-y-1">
                    <p className="text-[10px] text-muted-foreground">Start a fast first</p>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); navigate("/client/nutrition"); }}>
                    Add meal
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step Tracker / Health - only if activity logging enabled */}
        {settings.activity_logging_enabled && (
          <div>
            <h2 className="text-lg font-bold mb-2">Step tracker</h2>
            <Card className="cursor-pointer hover:shadow-sm transition-shadow min-h-[120px]" onClick={() => navigate("/client/health-connect")}>
              <CardContent className="p-5 flex items-center gap-4 h-full">
                <div className="flex-1">
                  <p className="font-semibold text-sm text-primary">Connect Apple Health</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Track your daily steps and activity</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Footprints className="h-10 w-10 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Today's Workouts & Sport Events — only here when fasting is enabled (otherwise rendered at top) */}
        {settings.fasting_enabled && settings.training_enabled && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              {isRestDay ? "Today" : hasSportEvents && todaysWorkouts.length === 0 ? "Today's Schedule" : `Today's Workout${hasMultiple ? "s" : ""}`}
            </h2>
            {isRestDay ? (
              <Card className="overflow-hidden">
                {restDayCard?.image_url ? (
                  <div className="relative h-56">
                    <img src={restDayCard.image_url} alt="Rest day" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">Rest Day</p>
                      <p className="text-base font-bold text-white">
                        {restDayCard?.message || "No workouts scheduled for today. Enjoy your rest!"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <CardContent className="p-6 text-center">
                    <Dumbbell className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-lg font-semibold">Rest Day</p>
                    <p className="text-sm text-muted-foreground">
                      {restDayCard?.message || "No workouts scheduled for today. Enjoy your rest!"}
                    </p>
                  </CardContent>
                )}
              </Card>
            ) : (
              <div>
                <div ref={scrollRef} className={hasMultiple ? "flex overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-hide" : ""}>
                  {/* Workout cards */}
                  {todaysWorkouts.map((workout) => (
                    <Card
                      key={workout.id}
                      className={`overflow-hidden cursor-pointer hover:shadow-md transition-all duration-300 shrink-0 snap-center ${hasMultiple ? "w-full min-w-full" : "w-full"}`}
                      onClick={() => navigate(`/client/workouts/${workout.workout_plan_id}`)}
                    >
                      <div className="relative h-56 bg-gradient-to-br from-primary/20 to-primary/5">
                        {workout.workout_plan?.image_url ? (
                          <img src={workout.workout_plan.image_url} alt={workout.workout_plan.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Dumbbell className="h-16 w-16 text-primary/20" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">Today's Workout</p>
                          <p className="text-lg font-bold text-white">{workout.workout_plan?.name}</p>
                        </div>
                      </div>
                      <CardContent className="p-3">
                        <Button className="w-full" size="lg" variant="outline" onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/client/workouts/${workout.workout_plan_id}`);
                        }}>
                          View Workout
                        </Button>
                      </CardContent>
                    </Card>
                  ))}

                  {/* Sport event cards */}
                  {todaySportEvents?.map((event: any) => {
                    const isGame = event.event_type === "game" || event.event_type === "event";
                    const customCard = isGame ? gameCard : practiceCard;
                    const EventIcon = isGame ? Swords : Trophy;
                    const gradientFrom = isGame ? "from-rose-500/20" : "from-sky-500/20";
                    const gradientTo = isGame ? "to-rose-500/5" : "to-sky-500/5";
                    const iconColor = isGame ? "text-rose-400/30" : "text-sky-400/30";
                    const label = isGame ? "Game Day" : "Practice";
                    const startTime = formatEventTime(event.start_time);
                    const endTime = event.end_time ? formatEventTime(event.end_time) : null;
                    const timeDisplay = endTime && endTime !== startTime ? `${startTime} - ${endTime}` : startTime;
                    const completion = sportEventCompletions?.find((c: any) => c.sport_event_id === event.id);
                    const isEventCompleted = !!completion;

                    return (
                      <Card
                        key={event.id}
                        className={`overflow-hidden shrink-0 snap-center cursor-pointer hover:shadow-md transition-all ${hasMultiple ? "w-full min-w-full" : "w-full"} ${isEventCompleted ? "opacity-75" : ""}`}
                        onClick={() => {
                          if (!isEventCompleted) {
                            setSelectedSportEvent(event);
                            setSportCompletionOpen(true);
                          }
                        }}
                      >
                        <div className={`relative h-56 bg-gradient-to-br ${gradientFrom} ${gradientTo}`}>
                          {customCard?.image_url ? (
                            <img src={customCard.image_url} alt={label} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <EventIcon className={`h-16 w-16 ${iconColor}`} />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                          {isEventCompleted && (
                            <div className="absolute top-3 right-3">
                              <div className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                                completion.status === 'completed' ? 'bg-emerald-500 text-white' :
                                completion.status === 'incomplete' ? 'bg-amber-500 text-white' :
                                'bg-destructive text-white'
                              }`}>
                                <Check className="h-3 w-3" />
                                {completion.status === 'completed' ? 'Done' : completion.status === 'incomplete' ? 'Partial' : 'Missed'}
                              </div>
                            </div>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 p-4">
                            <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">{label}</p>
                            <p className="text-lg font-bold text-white">{event.title}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <p className="text-sm text-white/80">{timeDisplay}</p>
                              {event.location && (
                                <p className="text-sm text-white/80 flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {event.location}
                                </p>
                              )}
                            </div>
                            {customCard?.message && (
                              <p className="text-xs text-white/70 mt-1">{customCard.message}</p>
                            )}
                          </div>
                        </div>
                        {!isEventCompleted && (
                          <CardContent className="p-3">
                            <Button className="w-full" size="lg" variant="outline" onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSportEvent(event);
                              setSportCompletionOpen(true);
                            }}>
                              Log {isGame ? "Game" : "Practice"}
                            </Button>
                          </CardContent>
                        )}
                      </Card>
                    );
                  })}
                </div>
                {hasMultiple && (
                  <div className="flex justify-center gap-1.5 mt-3">
                    {Array.from({ length: totalCards }).map((_, i) => (
                      <button
                        key={i}
                        className={`h-2 rounded-full transition-all duration-300 ${i === activeIndex ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30"}`}
                        onClick={() => {
                          scrollRef.current?.scrollTo({ left: i * (scrollRef.current?.clientWidth || 0), behavior: "smooth" });
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tasks - only if tasks enabled */}
        {settings.tasks_enabled && tasks && tasks.length > 0 && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Tasks ({completedTaskCount}/{totalTaskCount})
            </h2>
            <Card>
              <CardContent className="p-0 divide-y divide-border">
                {tasks.slice(0, 5).map((task) => {
                  const isCompleted = !!task.completed_at;
                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => { if (!isCompleted) completeMutation.mutate(task.id); }}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                      )}
                      <span className={`text-sm flex-1 ${isCompleted ? "line-through text-muted-foreground" : "font-medium"}`}>
                        {task.name}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
            {tasks.length > 5 && (
              <Button variant="ghost" size="sm" className="w-full mt-1 text-xs" onClick={() => navigate("/client/tasks")}>
                View all tasks
              </Button>
            )}
          </div>
        )}

        {/* Latest Game Stats Card */}
        <LatestGameStatsCard clientId={clientId} navigate={navigate} />

        {/* Completed Cardio Activities */}
        {todayCardioSessions && todayCardioSessions.filter((s: any) => s.status === "completed").length > 0 && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Activity</h2>
            <Card>
              <CardContent className="p-0 divide-y divide-border">
                {todayCardioSessions.filter((s: any) => s.status === "completed").map((session: any) => (
                  <div key={session.id} className="flex items-center gap-3 px-4 py-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold capitalize">{session.activity_type.replace(/_/g, " ")}</p>
                      <p className="text-xs text-muted-foreground">
                        Completed.{" "}
                        {session.distance_miles && `📍 ${session.distance_miles} miles `}
                        {session.duration_seconds > 0 && `⏱ ${formatCardioTime(session.duration_seconds)}`}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Speed Dial FAB */}
      <SpeedDialFAB
        items={[
          {
            label: "Workout",
            icon: <Dumbbell className="h-5 w-5" />,
            color: "hsl(217, 91%, 60%)",
            onClick: () => navigate("/client/workouts"),
          },
          {
            label: "Cardio",
            icon: <Footprints className="h-5 w-5" />,
            color: "hsl(142, 71%, 45%)",
            onClick: () => setCardioFlowOpen(true),
          },
          {
            label: "Meal",
            icon: <UtensilsCrossed className="h-5 w-5" />,
            color: "hsl(350, 89%, 60%)",
            onClick: () => navigate("/client/log-meal"),
            subItems: [
              { label: "Scan Barcode", icon: <ScanBarcode className="h-4 w-4" />, onClick: () => navigate("/client/log-meal?tab=scan") },
              { label: "Snap & Track", icon: <Camera className="h-4 w-4" />, onClick: () => navigate("/client/log-meal?tab=photo") },
              { label: "Manual Log", icon: <PenLine className="h-4 w-4" />, onClick: () => navigate("/client/log-meal?tab=manual") },
            ],
          },
        ]}
      />

      {/* Floating Message Button */}
      <button
        onClick={() => navigate("/client/messages")}
        className="fixed bottom-20 right-4 z-30 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 overflow-hidden"
        aria-label="Messages"
      >
        <img src="/logo.png" alt="Messages" className="w-full h-full object-cover" />
      </button>

      <QuickCardioFlow
        open={cardioFlowOpen}
        onOpenChange={setCardioFlowOpen}
        onStart={handleCardioStart}
        onMarkComplete={handleCardioComplete}
      />

      {/* Quick Edit Macros Sheet */}
      <Sheet open={macroEditOpen} onOpenChange={setMacroEditOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
          <div className="space-y-5 pb-6">
            <div className="text-center pt-2">
              <h2 className="text-lg font-bold">Change Macro Plan</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Pick a preset or customize your own</p>
            </div>

            {/* Preset options */}
            <div className="space-y-2">
              {DIET_STYLES.map((preset) => {
                const isActive = (macroTargets as any)?.diet_style === preset.value;
                return (
                  <button
                    key={preset.value}
                    onClick={() => handleDietPresetSelect(preset)}
                    disabled={saveMacrosMutation.isPending}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${
                      isActive
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30 hover:bg-muted/30"
                    }`}
                  >
                    <span className="text-2xl">{preset.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold">{preset.label}</p>
                      <p className="text-xs text-muted-foreground">{preset.split}</p>
                    </div>
                    {isActive && (
                      <span className="text-xs font-semibold text-primary px-2 py-0.5 rounded-full bg-primary/10">Active</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs font-semibold text-muted-foreground uppercase">or customize</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Custom section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-bold">Custom Macros</Label>
                <div className="flex items-center gap-2 text-xs">
                  <span className={editMode === "grams" ? "font-bold text-foreground" : "text-muted-foreground"}>Grams</span>
                  <Switch
                    checked={editMode === "percent"}
                    onCheckedChange={(checked) => {
                      setEditMode(checked ? "percent" : "grams");
                      if (checked && macroTargets) {
                        const cals = macroTargets.target_calories || 2000;
                        const totalMacroCals = (Number(macroTargets.target_protein) || 0) * 4 + (Number(macroTargets.target_carbs) || 0) * 4 + (Number(macroTargets.target_fats) || 0) * 9;
                        setCustomProtein(String(totalMacroCals > 0 ? Math.round(((Number(macroTargets.target_protein) || 0) * 4 / totalMacroCals) * 100) : 0));
                        setCustomCarbs(String(totalMacroCals > 0 ? Math.round(((Number(macroTargets.target_carbs) || 0) * 4 / totalMacroCals) * 100) : 0));
                        setCustomFats(String(totalMacroCals > 0 ? Math.round(((Number(macroTargets.target_fats) || 0) * 9 / totalMacroCals) * 100) : 0));
                      } else if (macroTargets) {
                        setCustomProtein(String(Math.round(Number(macroTargets.target_protein) || 0)));
                        setCustomCarbs(String(Math.round(Number(macroTargets.target_carbs) || 0)));
                        setCustomFats(String(Math.round(Number(macroTargets.target_fats) || 0)));
                      }
                    }}
                  />
                  <span className={editMode === "percent" ? "font-bold text-foreground" : "text-muted-foreground"}>%</span>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Calories</Label>
                <Input type="number" value={customCalories} onChange={e => setCustomCalories(e.target.value)} placeholder="2000" className="mt-1" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Protein {editMode === "percent" ? "%" : "(g)"}</Label>
                  <Input type="number" value={customProtein} onChange={e => setCustomProtein(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Carbs {editMode === "percent" ? "%" : "(g)"}</Label>
                  <Input type="number" value={customCarbs} onChange={e => setCustomCarbs(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Fats {editMode === "percent" ? "%" : "(g)"}</Label>
                  <Input type="number" value={customFats} onChange={e => setCustomFats(e.target.value)} className="mt-1" />
                </div>
              </div>
              <Button className="w-full h-11 font-semibold" onClick={handleCustomSave} disabled={saveMacrosMutation.isPending}>
                {saveMacrosMutation.isPending ? "Saving..." : "Save Custom Macros"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Sport Event Completion Dialog */}
      {selectedSportEvent && (
        <SportEventCompletionDialog
          open={sportCompletionOpen}
          onOpenChange={setSportCompletionOpen}
          event={selectedSportEvent}
          clientId={clientId!}
        />
      )}
    </ClientLayout>
  );
}

function LatestGameStatsCard({ clientId, navigate }: { clientId: string | undefined; navigate: (path: string) => void }) {
  const { data: latestGame } = useQuery({
    queryKey: ["latest-game-stat", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("game_stat_entries" as any)
        .select("*")
        .eq("client_id", clientId)
        .order("game_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!clientId,
  });

  if (!latestGame) return null;

  const battingAvg = latestGame.at_bats > 0 ? (latestGame.hits / latestGame.at_bats).toFixed(3) : ".000";

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Last Game</h2>
        <button onClick={() => navigate("/client/sports")} className="text-xs font-semibold text-primary">View all</button>
      </div>
      <Card className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => navigate("/client/sports")}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">{latestGame.opponent ? `vs ${latestGame.opponent}` : "Game"}</p>
              <p className="text-xs text-muted-foreground">{latestGame.game_date}</p>
            </div>
            {latestGame.result && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                latestGame.result === "win" ? "bg-emerald-500/10 text-emerald-600" :
                latestGame.result === "loss" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
              }`}>
                {latestGame.result}
              </span>
            )}
          </div>
          <div className="grid grid-cols-5 gap-2 mt-3 text-center">
            <div>
              <p className="text-base font-bold">{battingAvg}</p>
              <p className="text-[9px] text-muted-foreground font-semibold uppercase">AVG</p>
            </div>
            <div>
              <p className="text-base font-bold">{latestGame.hits}/{latestGame.at_bats}</p>
              <p className="text-[9px] text-muted-foreground font-semibold uppercase">H/AB</p>
            </div>
            <div>
              <p className="text-base font-bold">{latestGame.runs || 0}</p>
              <p className="text-[9px] text-muted-foreground font-semibold uppercase">R</p>
            </div>
            <div>
              <p className="text-base font-bold">{latestGame.rbis || 0}</p>
              <p className="text-[9px] text-muted-foreground font-semibold uppercase">RBI</p>
            </div>
            <div>
              <p className="text-base font-bold">{latestGame.home_runs || 0}</p>
              <p className="text-[9px] text-muted-foreground font-semibold uppercase">HR</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
