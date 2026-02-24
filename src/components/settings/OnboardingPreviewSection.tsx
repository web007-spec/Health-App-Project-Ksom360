import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ENGINE_ONBOARDING } from "@/components/onboarding/engineOnboardingContent";
import EngineIntroStep from "@/components/onboarding/EngineIntroStep";
import EngineQuestionsStep from "@/components/onboarding/EngineQuestionsStep";
import type { EngineMode } from "@/lib/engineConfig";

const ENGINE_LABELS: Record<EngineMode, { label: string; color: string }> = {
  metabolic: { label: "Metabolic", color: "text-blue-400" },
  performance: { label: "Performance", color: "text-orange-400" },
  athletic: { label: "Athletic", color: "text-green-400" },
};

export function OnboardingPreviewSection() {
  const [activeEngine, setActiveEngine] = useState<EngineMode>("metabolic");
  const [previewStep, setPreviewStep] = useState(0); // 0-2 = intro, 3 = questions

  const content = ENGINE_ONBOARDING[activeEngine];
  const totalSteps = 4; // 3 intros + 1 questions

  const handleEngineChange = (engine: string) => {
    setActiveEngine(engine as EngineMode);
    setPreviewStep(0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🚀 Onboarding Flows
        </CardTitle>
        <CardDescription>
          Preview all 3 onboarding experiences. These are what clients see on their first login.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeEngine} onValueChange={handleEngineChange}>
          <TabsList className="grid w-full grid-cols-3">
            {(Object.keys(ENGINE_LABELS) as EngineMode[]).map((engine) => (
              <TabsTrigger key={engine} value={engine} className="text-xs sm:text-sm">
                {ENGINE_LABELS[engine].label}
              </TabsTrigger>
            ))}
          </TabsList>

          {(Object.keys(ENGINE_LABELS) as EngineMode[]).map((engine) => (
            <TabsContent key={engine} value={engine} className="mt-4 space-y-4">
              {/* Step indicator */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Step {previewStep + 1} of {totalSteps} —{" "}
                  {previewStep < 3 ? `Intro ${previewStep + 1}` : "Questions"}
                </span>
                <span className={`font-semibold ${ENGINE_LABELS[engine].color}`}>
                  {ENGINE_LABELS[engine].label} · {ENGINE_ONBOARDING[engine].tone}
                </span>
              </div>

              {/* Preview content */}
              <div className="border border-border rounded-xl p-4 bg-muted/30">
                {previewStep < 3 ? (
                  <EngineIntroStep
                    screen={ENGINE_ONBOARDING[engine].introScreens[previewStep]}
                    screenIndex={previewStep}
                    totalIntroScreens={3}
                    tone={ENGINE_ONBOARDING[engine].tone}
                    onContinue={() => setPreviewStep(Math.min(previewStep + 1, 3))}
                  />
                ) : (
                  <EngineQuestionsStep
                    questions={ENGINE_ONBOARDING[engine].questions}
                    tone={ENGINE_ONBOARDING[engine].tone}
                    onSubmit={() => {
                      // Preview only — no actual submission
                    }}
                    isLoading={false}
                  />
                )}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={previewStep === 0}
                  onClick={() => setPreviewStep(previewStep - 1)}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
                <div className="flex gap-1.5">
                  {Array.from({ length: totalSteps }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPreviewStep(i)}
                      className={`h-2 rounded-full transition-all ${
                        i === previewStep ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={previewStep === 3}
                  onClick={() => setPreviewStep(previewStep + 1)}
                  className="gap-1"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
