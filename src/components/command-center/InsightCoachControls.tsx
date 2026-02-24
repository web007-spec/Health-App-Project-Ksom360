import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Lightbulb, Pin, Plus, Trash2, Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCopilot } from "@/hooks/useCopilot";
import { buildCopilotContext } from "@/lib/buildCopilotContext";
import type { EngineMode } from "@/lib/engineConfig";

interface InsightCoachControlsProps {
  clientId: string;
  trainerId: string;
  settings: any;
  toggleMutation: any;
}

export function InsightCoachControls({ clientId, trainerId, settings, toggleMutation }: InsightCoachControlsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pinText, setPinText] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [customAction, setCustomAction] = useState("");

  const engineMode = (settings?.engine_mode || "performance") as string;

  const copilot = useCopilot({
    clientId,
    coachId: trainerId,
    engineMode,
  });

  // Fetch client context for AI generation
  const { data: contextData } = useQuery({
    queryKey: ["insight-ai-context", clientId],
    queryFn: async () => {
      const { data: clientSettings } = await supabase
        .from("client_feature_settings")
        .select("engine_mode, current_level, parent_link_enabled, is_minor")
        .eq("client_id", clientId)
        .maybeSingle();

      const { data: summary } = await supabase
        .from("client_weekly_summaries")
        .select("*")
        .eq("client_id", clientId)
        .maybeSingle();

      const { data: latestEvent } = await supabase
        .from("recommendation_events")
        .select("score_total, status, lowest_factor")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const engine = (clientSettings?.engine_mode as string) || "performance";
      return buildCopilotContext({
        engineMode: engine as EngineMode,
        currentLevel: clientSettings?.current_level || 1,
        readinessScore: latestEvent?.score_total ?? (summary?.avg_score_7d ? Number(summary.avg_score_7d) : null),
        status: latestEvent?.status || summary?.score_status || "moderate",
        lowestFactor: latestEvent?.lowest_factor || summary?.lowest_factor_mode || null,
        weeklyCompletionPct: summary?.completion_7d ? Number(summary.completion_7d) : null,
        streakDays: null,
        trendDirection: (summary?.trend_direction as "up" | "down" | "flat") || "flat",
        parentLinkActive: !!(clientSettings?.is_minor && engine === "athletic" && clientSettings?.parent_link_enabled),
      });
    },
  });

  const handleAIGeneratePin = async () => {
    if (!contextData) return;
    const text = await copilot.generate("insight_pin_suggest", contextData);
    if (text) setPinText(text);
  };

  const handleAIGenerateCustom = async () => {
    if (!contextData) return;
    const text = await copilot.generate("custom_insight_suggest", contextData);
    if (text) {
      // Parse MESSAGE: and ACTION: format
      const messageMatch = text.match(/MESSAGE:\s*(.+?)(?:\n|ACTION:)/s);
      const actionMatch = text.match(/ACTION:\s*(.+)/s);
      if (messageMatch) setCustomMessage(messageMatch[1].trim());
      if (actionMatch) setCustomAction(actionMatch[1].trim());
      if (!messageMatch) setCustomMessage(text.trim());
    }
  };

  // Fetch custom insights
  const { data: customInsights = [] } = useQuery({
    queryKey: ["coach-custom-insights", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coach_custom_insights")
        .select("*")
        .eq("client_id", clientId)
        .eq("trainer_id", trainerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Pin insight mutation
  const pinMutation = useMutation({
    mutationFn: async (text: string) => {
      const until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase
        .from("client_feature_settings")
        .update({
          pinned_insight_text: text,
          pinned_insight_until: until,
        } as any)
        .eq("client_id", clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      setPinText("");
      toast({ title: "Insight pinned for 24 hours" });
      queryClient.invalidateQueries({ queryKey: ["daily-insight"] });
    },
  });

  // Add custom insight
  const addCustomMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("coach_custom_insights").insert({
        trainer_id: trainerId,
        client_id: clientId,
        message: customMessage.trim(),
        action_text: customAction.trim() || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      setCustomMessage("");
      setCustomAction("");
      toast({ title: "Custom insight added" });
      queryClient.invalidateQueries({ queryKey: ["coach-custom-insights"] });
      queryClient.invalidateQueries({ queryKey: ["daily-insight"] });
    },
  });

  // Delete custom insight
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coach_custom_insights").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coach-custom-insights"] });
      queryClient.invalidateQueries({ queryKey: ["daily-insight"] });
    },
  });

  const isPinActive = settings?.pinned_insight_until && new Date(settings.pinned_insight_until) > new Date();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          Insight Intelligence
        </CardTitle>
        <CardDescription>Control daily insight messages for this client.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Enable/Disable toggle */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Daily Insights</Label>
            <p className="text-xs text-muted-foreground">Show intelligent daily insights on dashboard</p>
          </div>
          <Switch
            checked={!!settings?.insights_enabled}
            onCheckedChange={(checked) => toggleMutation.mutate({ key: "insights_enabled", value: checked })}
          />
        </div>

        <Separator />

        {/* Pin an insight */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Pin className="h-3.5 w-3.5" /> Pin Insight (24h override)
            </Label>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5 text-primary"
              onClick={handleAIGeneratePin}
              disabled={copilot.isGenerating || !contextData}
            >
              {copilot.isGenerating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              AI Suggest
            </Button>
          </div>
          {isPinActive && (
            <p className="text-xs text-primary">Currently pinned: "{settings.pinned_insight_text}"</p>
          )}
          <div className="flex gap-2">
            <Input
              value={pinText}
              onChange={(e) => setPinText(e.target.value)}
              placeholder="Type insight to pin..."
              className="flex-1"
              maxLength={300}
            />
            <Button
              size="sm"
              disabled={!pinText.trim() || pinMutation.isPending}
              onClick={() => pinMutation.mutate(pinText.trim())}
            >
              Pin
            </Button>
          </div>
        </div>

        <Separator />

        {/* Add custom insight */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Plus className="h-3.5 w-3.5" /> Add Custom Insight
            </Label>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5 text-primary"
              onClick={handleAIGenerateCustom}
              disabled={copilot.isGenerating || !contextData}
            >
              {copilot.isGenerating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              AI Generate
            </Button>
          </div>
          <Textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="Custom insight message (1–2 sentences)..."
            rows={2}
            maxLength={300}
          />
          <Input
            value={customAction}
            onChange={(e) => setCustomAction(e.target.value)}
            placeholder="Optional action line (e.g., 'Drink 3L water today')"
            maxLength={150}
          />
          <Button
            size="sm"
            disabled={!customMessage.trim() || addCustomMutation.isPending}
            onClick={() => addCustomMutation.mutate()}
          >
            Save Insight
          </Button>
        </div>

        {/* Existing custom insights */}
        {customInsights.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Custom Insights</Label>
              {customInsights.map((ci: any) => (
                <div key={ci.id} className="flex items-start justify-between gap-2 p-2 rounded-md bg-muted/50">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground">{ci.message}</p>
                    {ci.action_text && <p className="text-[10px] text-primary mt-0.5">→ {ci.action_text}</p>}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 flex-shrink-0"
                    onClick={() => deleteMutation.mutate(ci.id)}
                  >
                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
