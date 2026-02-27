import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Dumbbell, Sparkles, Loader2, Copy, Check, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { buildCopilotContext } from "@/lib/buildCopilotContext";
import type { EngineMode } from "@/lib/engineConfig";
import { toast } from "sonner";

interface AIWorkoutBuilderPanelProps {
  clientId: string;
  trainerId: string;
}

export function AIWorkoutBuilderPanel({ clientId, trainerId }: AIWorkoutBuilderPanelProps) {
  const [focus, setFocus] = useState("full body");
  const [duration, setDuration] = useState("45");
  const [difficulty, setDifficulty] = useState("intermediate");
  const [goal, setGoal] = useState("general fitness");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);

  const { data: contextData } = useQuery({
    queryKey: ["ai-wb-context", clientId],
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

      const engine = (settings?.engine_mode as string) || "performance";
      return {
        engine_mode: engine,
        current_level: settings?.current_level || 1,
        level_band: settings?.current_level
          ? settings.current_level >= 7 ? "7" : settings.current_level >= 4 ? "4-6" : "1-3"
          : "1-3",
        status: summary?.score_status || "moderate",
      };
    },
  });

  const { data: exercises } = useQuery({
    queryKey: ["ai-wb-exercises", trainerId],
    queryFn: async () => {
      const { data } = await supabase
        .from("exercises")
        .select("id, name, muscle_group, equipment")
        .eq("trainer_id", trainerId)
        .limit(200);
      return data || [];
    },
  });

  const handleGenerate = async () => {
    if (!exercises?.length) {
      toast.error("No exercises found in your library.");
      return;
    }
    setIsGenerating(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-workout-builder", {
        body: {
          exercises: exercises.map(e => ({ id: e.id, name: e.name, muscle_group: e.muscle_group, equipment: e.equipment })),
          client_context: contextData,
          preferences: { focus, duration, difficulty, goal },
        },
      });
      if (error) throw error;
      if (data?.workout) {
        setResult(data.workout);
      } else if (data?.error) {
        toast.error(data.error);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate workout");
    } finally {
      setIsGenerating(false);
    }
  };

  const exerciseMap = new Map(exercises?.map(e => [e.id, e.name]) || []);

  const handleCopy = () => {
    if (!result) return;
    const text = `${result.name}\n${result.instructions || ""}\n\nExercises:\n${
      (result.exercises || []).map((ex: any, i: number) =>
        `${i + 1}. ${exerciseMap.get(ex.exercise_id) || ex.exercise_id} — ${ex.sets} sets × ${ex.target_value} | Rest: ${ex.rest_seconds}s`
      ).join("\n")
    }`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Dumbbell className="h-4 w-4 text-primary" />
          AI Workout Builder
          <Badge variant="outline" className="text-[10px]">Draft</Badge>
        </CardTitle>
        <CardDescription>Generate a workout from your exercise library using AI.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick inputs */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Focus</Label>
            <Select value={focus} onValueChange={setFocus}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="full body">Full Body</SelectItem>
                <SelectItem value="upper body">Upper Body</SelectItem>
                <SelectItem value="lower body">Lower Body</SelectItem>
                <SelectItem value="push">Push</SelectItem>
                <SelectItem value="pull">Pull</SelectItem>
                <SelectItem value="core">Core</SelectItem>
                <SelectItem value="cardio">Cardio</SelectItem>
                <SelectItem value="hiit">HIIT</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="20">20 min</SelectItem>
                <SelectItem value="30">30 min</SelectItem>
                <SelectItem value="45">45 min</SelectItem>
                <SelectItem value="60">60 min</SelectItem>
                <SelectItem value="75">75 min</SelectItem>
                <SelectItem value="90">90 min</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Expandable preferences */}
        <Button
          variant="ghost"
          size="sm"
          className="text-xs gap-1.5 text-muted-foreground h-7 w-full justify-start"
          onClick={() => setShowPrefs(!showPrefs)}
        >
          {showPrefs ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          More Options
        </Button>

        {showPrefs && (
          <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/50 border border-border">
            <div>
              <Label className="text-xs">Difficulty</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Goal</Label>
              <Input
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g., hypertrophy"
                className="h-9 text-sm"
              />
            </div>
          </div>
        )}

        <Button
          className="w-full gap-1.5"
          onClick={handleGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Generate Workout
        </Button>

        {/* Result */}
        {result && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{result.name}</p>
                  <p className="text-xs text-muted-foreground">{result.instructions}</p>
                </div>
                <Badge variant="secondary" className="text-[10px] capitalize">{result.difficulty}</Badge>
              </div>

              <div className="space-y-1.5">
                {(result.exercises || []).map((ex: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm py-1.5 px-2 rounded bg-muted/50">
                    <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                    <span className="flex-1 font-medium text-xs truncate">
                      {exerciseMap.get(ex.exercise_id) || "Unknown"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {ex.sets}× {ex.target_value}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {ex.rest_seconds}s rest
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="text-xs gap-1" onClick={handleCopy}>
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={handleGenerate} disabled={isGenerating}>
                  <RefreshCw className="h-3 w-3" />
                  Regenerate
                </Button>
              </div>

              <p className="text-[10px] text-muted-foreground">
                ⚠️ AI Draft — Review and customize before assigning to client.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
