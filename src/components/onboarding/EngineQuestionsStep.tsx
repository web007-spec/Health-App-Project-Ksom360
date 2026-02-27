import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { OnboardingQuestion } from "./engineOnboardingContent";
import { toast } from "sonner";

interface EngineQuestionsStepProps {
  questions: OnboardingQuestion[];
  tone: string;
  onSubmit: (answers: Record<string, string | number | boolean>) => void;
  isLoading?: boolean;
}

export default function EngineQuestionsStep({
  questions,
  tone,
  onSubmit,
  isLoading,
}: EngineQuestionsStepProps) {
  const [answers, setAnswers] = useState<Record<string, string | number | boolean>>(() => {
    const defaults: Record<string, string | number | boolean> = {};
    questions.forEach((q) => {
      if (q.defaultValue !== undefined) defaults[q.id] = q.defaultValue;
    });
    return defaults;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    for (const q of questions) {
      if (q.required && (answers[q.id] === undefined || answers[q.id] === "")) {
        toast.error(`Please answer: ${q.label}`);
        return;
      }
    }
    onSubmit(answers);
  };

  const set = (id: string, value: string | number | boolean) =>
    setAnswers((prev) => ({ ...prev, [id]: value }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>About You</CardTitle>
        <CardDescription>Help us personalize your experience</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {questions.map((q) => (
            <div key={q.id} className="space-y-2">
              <Label className="text-sm font-medium">{q.label}</Label>

              {q.type === "options" && (
                <div className="grid gap-2">
                  {q.options!.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => set(q.id, opt)}
                      className={`text-left px-4 py-3 rounded-lg border transition-all text-sm ${
                        answers[q.id] === opt
                          ? "border-primary bg-primary/10 text-foreground font-medium"
                          : "border-border bg-card text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {q.type === "slider" && (
                <div className="space-y-3 pt-2">
                  <Slider
                    min={q.sliderMin}
                    max={q.sliderMax}
                    step={0.5}
                    value={[Number(answers[q.id] ?? q.defaultValue ?? q.sliderMin!)]}
                    onValueChange={([v]) => set(q.id, v)}
                  />
                  <p className="text-center text-lg font-semibold text-foreground">
                    {answers[q.id] ?? q.defaultValue ?? q.sliderMin} hours
                  </p>
                </div>
              )}

              {q.type === "toggle" && (
                <div className="flex items-center gap-3 pt-1">
                  <Switch
                    checked={!!answers[q.id]}
                    onCheckedChange={(v) => set(q.id, v)}
                  />
                  <span className="text-sm text-muted-foreground">
                    {answers[q.id] ? "Yes" : "No"}
                  </span>
                </div>
              )}

              {q.type === "dropdown" && (
                <Select
                  value={answers[q.id] as string || ""}
                  onValueChange={(v) => set(q.id, v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {q.options!.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          ))}

          <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
            {isLoading ? "Saving..." : "Complete Setup"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
