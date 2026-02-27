import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Bot, Sparkles, ArrowUpCircle, RefreshCw, Check, Loader2, AlertTriangle } from "lucide-react";
import { useCopilot } from "@/hooks/useCopilot";
import { buildCopilotContext, type CopilotContext } from "@/lib/buildCopilotContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CopilotAssistPanelProps {
  clientId: string;
  trainerId: string;
}

export function CopilotAssistPanel({ clientId, trainerId }: CopilotAssistPanelProps) {
  const [activeUseCase, setActiveUseCase] = useState<string | null>(null);

  // Fetch client context data
  const { data: contextData } = useQuery({
    queryKey: ["copilot-context", clientId],
    queryFn: async () => {
      const { data: settings } = await supabase
        .from("client_feature_settings")
        .select("engine_mode, current_level, parent_link_enabled, is_minor")
        .eq("client_id", clientId)
        .maybeSingle();

      const { data: summary } = await supabase
        .from("client_weekly_summaries")
        .select("*")
        .eq("client_id", clientId)
        .maybeSingle();

      // Latest recommendation event
      const { data: latestEvent } = await supabase
        .from("recommendation_events")
        .select("score_total, status, lowest_factor")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const engineMode = (settings?.engine_mode as string) || "performance";
      const parentLinkActive = !!(settings?.is_minor && engineMode === "athletic" && settings?.parent_link_enabled);

      return {
        engineMode,
        currentLevel: settings?.current_level || 1,
        readinessScore: latestEvent?.score_total ?? (summary?.avg_score_7d ? Number(summary.avg_score_7d) : null),
        status: latestEvent?.status || summary?.score_status || "moderate",
        lowestFactor: latestEvent?.lowest_factor || summary?.lowest_factor_mode || null,
        weeklyCompletionPct: summary?.completion_7d ? Number(summary.completion_7d) : null,
        streakDays: null,
        trendDirection: (summary?.trend_direction as "up" | "down" | "flat") || "flat",
        parentLinkActive,
      };
    },
  });

  const engineMode = contextData?.engineMode || "performance";

  const copilot = useCopilot({
    clientId,
    coachId: trainerId,
    engineMode,
  });

  const handleGenerate = async (useCase: "plan_suggestion" | "level_up") => {
    if (!contextData) return;
    setActiveUseCase(useCase);

    const context = buildCopilotContext({
      engineMode: contextData.engineMode as any,
      currentLevel: contextData.currentLevel,
      readinessScore: contextData.readinessScore,
      status: contextData.status,
      lowestFactor: contextData.lowestFactor,
      weeklyCompletionPct: contextData.weeklyCompletionPct,
      streakDays: contextData.streakDays,
      trendDirection: contextData.trendDirection,
      parentLinkActive: contextData.parentLinkActive,
    });

    await copilot.generate(useCase, context);
  };

  const engineLabel = engineMode === "metabolic" ? "Metabolic" : engineMode === "athletic" ? "Athletic" : "Performance";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          Copilot Assist
          <Badge variant="outline" className="text-[10px] capitalize">{engineLabel}</Badge>
        </CardTitle>
        <CardDescription className="flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3" />
          AI Draft — Coach Approval Required
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleGenerate("plan_suggestion")}
            disabled={copilot.isGenerating}
            className="flex-1"
          >
            {copilot.isGenerating && activeUseCase === "plan_suggestion" ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            )}
            Generate Plan Suggestion
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleGenerate("level_up")}
            disabled={copilot.isGenerating}
            className="flex-1"
          >
            {copilot.isGenerating && activeUseCase === "level_up" ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <ArrowUpCircle className="h-3.5 w-3.5 mr-1.5" />
            )}
            Level-Up Message
          </Button>
        </div>

        {/* Response Display */}
        {copilot.lastResponse && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">
                  {activeUseCase === "plan_suggestion" ? "Plan Suggestion" : "Level-Up Message"}
                </Badge>
                <span className="text-[10px] text-muted-foreground">AI Draft</span>
              </div>
              <div className="text-sm text-foreground bg-muted/50 rounded-lg p-3 whitespace-pre-wrap leading-relaxed">
                {copilot.lastResponse}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copilot.clearResponse()}
                  className="text-xs"
                >
                  Dismiss
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => activeUseCase && handleGenerate(activeUseCase as any)}
                  disabled={copilot.isGenerating}
                  className="text-xs"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Regenerate
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Context Summary */}
        {contextData && (
          <div className="grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
            <div>Score: <span className="text-foreground font-medium">{contextData.readinessScore ?? "—"}</span></div>
            <div>Level: <span className="text-foreground font-medium">{contextData.currentLevel}</span></div>
            <div>Status: <span className="text-foreground font-medium capitalize">{contextData.status}</span></div>
            <div>Trend: <span className="text-foreground font-medium capitalize">{contextData.trendDirection}</span></div>
            <div>Completion: <span className="text-foreground font-medium">{contextData.weeklyCompletionPct ?? "—"}%</span></div>
            <div>Streak: <span className="text-foreground font-medium">{contextData.streakDays ?? "—"}d</span></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
