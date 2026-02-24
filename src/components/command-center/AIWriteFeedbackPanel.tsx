import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MessageSquare, Sparkles, Loader2, Copy, Check, RefreshCw, Settings2, Send, Bell } from "lucide-react";
import { useCopilot, type CopilotStyleSettings } from "@/hooks/useCopilot";
import { buildCopilotContext } from "@/lib/buildCopilotContext";
import type { EngineMode } from "@/lib/engineConfig";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AIWriteFeedbackPanelProps {
  clientId: string;
  trainerId: string;
}

const TONE_OPTIONS = [
  { value: "casual", label: "Casual", description: "Warm & conversational" },
  { value: "formal", label: "Formal", description: "Professional & precise" },
  { value: "storytelling", label: "Storytelling", description: "Narrative & motivational" },
] as const;

const LENGTH_LABELS = ["Short", "Medium", "Long"];
const EMOJI_LABELS = ["None", "Some", "Lots"];

export function AIWriteFeedbackPanel({ clientId, trainerId }: AIWriteFeedbackPanelProps) {
  const [tone, setTone] = useState<CopilotStyleSettings["tone"]>("casual");
  const [lengthIdx, setLengthIdx] = useState(1); // 0=short, 1=medium, 2=long
  const [emojiIdx, setEmojiIdx] = useState(1); // 0=none, 1=some, 2=lots
  const [feedbackTopic, setFeedbackTopic] = useState("");
  const [generatedText, setGeneratedText] = useState("");
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeMode, setActiveMode] = useState<"feedback" | "alert" | "nudge">("feedback");

  const { data: contextData } = useQuery({
    queryKey: ["ai-write-context", clientId],
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

      const { data: latestEvent } = await supabase
        .from("recommendation_events")
        .select("score_total, status, lowest_factor")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const engine = (settings?.engine_mode as string) || "performance";
      return buildCopilotContext({
        engineMode: engine as EngineMode,
        currentLevel: settings?.current_level || 1,
        readinessScore: latestEvent?.score_total ?? (summary?.avg_score_7d ? Number(summary.avg_score_7d) : null),
        status: latestEvent?.status || summary?.score_status || "moderate",
        lowestFactor: latestEvent?.lowest_factor || summary?.lowest_factor_mode || null,
        weeklyCompletionPct: summary?.completion_7d ? Number(summary.completion_7d) : null,
        streakDays: null,
        trendDirection: (summary?.trend_direction as "up" | "down" | "flat") || "flat",
        parentLinkActive: !!(settings?.is_minor && engine === "athletic" && settings?.parent_link_enabled),
      });
    },
  });

  const engineMode = contextData?.engine_mode || "performance";

  const copilot = useCopilot({
    clientId,
    coachId: trainerId,
    engineMode: engineMode as string,
  });

  const getStyleSettings = (): CopilotStyleSettings => ({
    tone,
    length: (["short", "medium", "long"] as const)[lengthIdx],
    emoji_level: (["none", "some", "lots"] as const)[emojiIdx],
  });

  const handleGenerate = async () => {
    if (!contextData) return;

    const contextWithTopic = feedbackTopic
      ? { ...contextData, feedback_topic: feedbackTopic }
      : contextData;

    const useCase = activeMode === "feedback"
      ? "client_feedback" as const
      : activeMode === "alert"
      ? "alert_message" as const
      : "nudge_message_suggest" as const;

    const text = await copilot.generate(useCase, contextWithTopic as any, undefined, getStyleSettings());
    if (text) setGeneratedText(text);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedText);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const modeConfig = {
    feedback: { label: "Write Feedback", icon: MessageSquare, description: "AI-written client message" },
    alert: { label: "Draft Alert", icon: Bell, description: "Short alert notification" },
    nudge: { label: "Nudge Message", icon: Send, description: "Push notification text" },
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          AI Write
          <Badge variant="outline" className="text-[10px]">Draft</Badge>
        </CardTitle>
        <CardDescription>Generate AI-powered messages, alerts, and nudges for this client.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mode selector */}
        <div className="flex gap-1.5">
          {(Object.entries(modeConfig) as [keyof typeof modeConfig, typeof modeConfig[keyof typeof modeConfig]][]).map(([key, cfg]) => (
            <Button
              key={key}
              variant={activeMode === key ? "default" : "outline"}
              size="sm"
              className="flex-1 gap-1.5 text-xs"
              onClick={() => { setActiveMode(key); setGeneratedText(""); }}
            >
              <cfg.icon className="h-3 w-3" />
              {cfg.label}
            </Button>
          ))}
        </div>

        {/* Topic input for feedback mode */}
        {activeMode === "feedback" && (
          <Input
            value={feedbackTopic}
            onChange={(e) => setFeedbackTopic(e.target.value)}
            placeholder="Topic focus (optional, e.g., 'nutrition this week')"
            className="text-sm"
          />
        )}

        {/* AI Settings toggle */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1.5 text-muted-foreground h-7"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings2 className="h-3 w-3" />
            AI Settings
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={handleGenerate}
            disabled={copilot.isGenerating || !contextData}
          >
            {copilot.isGenerating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Generate
          </Button>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="space-y-4 p-3 rounded-lg bg-muted/50 border border-border">
            {/* Tone */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Tone</Label>
              <RadioGroup
                value={tone}
                onValueChange={(v) => setTone(v as CopilotStyleSettings["tone"])}
                className="flex gap-2"
              >
                {TONE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={cn(
                      "flex-1 flex items-center gap-2 rounded-md border p-2.5 cursor-pointer transition-colors",
                      tone === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/50"
                    )}
                  >
                    <RadioGroupItem value={opt.value} className="sr-only" />
                    <div>
                      <p className="text-xs font-medium">{opt.label}</p>
                      <p className="text-[10px] text-muted-foreground">{opt.description}</p>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </div>

            {/* Length slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-primary">Length</Label>
                <span className="text-[10px] text-muted-foreground">{LENGTH_LABELS[lengthIdx]}</span>
              </div>
              <Slider
                value={[lengthIdx]}
                onValueChange={([v]) => setLengthIdx(v)}
                min={0}
                max={2}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Short</span>
                <span>Long</span>
              </div>
            </div>

            {/* Emoji slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-primary">Emojis</Label>
                <span className="text-[10px] text-muted-foreground">{EMOJI_LABELS[emojiIdx]}</span>
              </div>
              <Slider
                value={[emojiIdx]}
                onValueChange={([v]) => setEmojiIdx(v)}
                min={0}
                max={2}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>None</span>
                <span>Lots</span>
              </div>
            </div>
          </div>
        )}

        {/* Generated output */}
        {generatedText && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">
                  {modeConfig[activeMode].label}
                </Badge>
                <span className="text-[10px] text-muted-foreground">AI Draft — Review before sending</span>
              </div>
              <div className="text-sm text-foreground bg-muted/50 rounded-lg p-3 whitespace-pre-wrap leading-relaxed border border-border">
                {generatedText}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="text-xs gap-1" onClick={handleCopy}>
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs gap-1"
                  onClick={handleGenerate}
                  disabled={copilot.isGenerating}
                >
                  <RefreshCw className="h-3 w-3" />
                  Regenerate
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs"
                  onClick={() => setGeneratedText("")}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
