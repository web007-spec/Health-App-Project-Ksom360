import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ClipboardList, Sparkles, Loader2, Copy, Check, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AIOnboardingSummaryPanelProps {
  clientId: string;
  trainerId: string;
}

export function AIOnboardingSummaryPanel({ clientId, trainerId }: AIOnboardingSummaryPanelProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [summary, setSummary] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: clientData } = useQuery({
    queryKey: ["ai-onboard-data", clientId],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email, onboarding_completed, onboarding_answers")
        .eq("id", clientId)
        .maybeSingle();

      const { data: settings } = await supabase
        .from("client_feature_settings")
        .select("engine_mode, current_level, subscription_tier")
        .eq("client_id", clientId)
        .maybeSingle();

      const { data: sportProfile } = await supabase
        .from("client_sport_profiles")
        .select("sport, position, team_name")
        .eq("client_id", clientId)
        .maybeSingle();

      return {
        name: profile?.full_name || "Client",
        onboarding_completed: profile?.onboarding_completed,
        onboarding_answers: profile?.onboarding_answers,
        engine_mode: settings?.engine_mode || "performance",
        current_level: settings?.current_level || 1,
        tier: settings?.subscription_tier || "starter",
        sport_profile: sportProfile,
      };
    },
  });

  const handleGenerate = async () => {
    if (!clientData) return;
    setIsGenerating(true);
    setSummary("");
    try {
      const { data, error } = await supabase.functions.invoke("ai-onboarding-summary", {
        body: {
          client_name: clientData.name,
          engine_mode: clientData.engine_mode,
          onboarding_answers: clientData.onboarding_answers,
          profile_data: {
            level: clientData.current_level,
            tier: clientData.tier,
            sport_profile: clientData.sport_profile,
            onboarding_completed: clientData.onboarding_completed,
          },
        },
      });
      if (error) throw error;
      if (data?.summary) {
        setSummary(data.summary);
      } else if (data?.error) {
        toast.error(data.error);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate summary");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(summary);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const hasOnboardingData = clientData?.onboarding_completed && clientData?.onboarding_answers;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          AI Onboarding Brief
          <Badge variant="outline" className="text-[10px]">Draft</Badge>
        </CardTitle>
        <CardDescription>
          {hasOnboardingData
            ? "Generate a coaching brief from this client's onboarding data."
            : "Client hasn't completed onboarding yet. Summary will use available data."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick context */}
        {clientData && (
          <div className="grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
            <div>Engine: <span className="text-foreground font-medium capitalize">{clientData.engine_mode}</span></div>
            <div>Level: <span className="text-foreground font-medium">{clientData.current_level}</span></div>
            <div>Tier: <span className="text-foreground font-medium capitalize">{clientData.tier}</span></div>
          </div>
        )}

        <Button
          className="w-full gap-1.5"
          onClick={handleGenerate}
          disabled={isGenerating || !clientData}
        >
          {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Generate Coaching Brief
        </Button>

        {summary && (
          <>
            <Separator />
            <div className="space-y-3">
              <Badge variant="secondary" className="text-[10px]">Coaching Brief</Badge>
              <div className="text-sm text-foreground bg-muted/50 rounded-lg p-3 whitespace-pre-wrap leading-relaxed border border-border max-h-72 overflow-y-auto">
                {summary}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="text-xs gap-1" onClick={handleCopy}>
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={handleGenerate} disabled={isGenerating}>
                  <RefreshCw className="h-3 w-3" /> Regenerate
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
