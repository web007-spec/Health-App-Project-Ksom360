import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ChevronLeft, ChevronRight, CheckCircle2, Settings, ArrowRight, Home, LayoutGrid, BarChart3, User, Play, Loader2, Eye, Zap } from "lucide-react";
import { ENGINE_ONBOARDING } from "@/components/onboarding/engineOnboardingContent";
import EngineIntroStep from "@/components/onboarding/EngineIntroStep";
import EngineQuestionsStep from "@/components/onboarding/EngineQuestionsStep";
import type { EngineMode } from "@/lib/engineConfig";
import { useCreateDemoClient } from "@/hooks/useCreateDemoClient";

const ENGINE_LABELS: Record<EngineMode, { label: string; color: string }> = {
  metabolic: { label: "Metabolic", color: "text-blue-400" },
  performance: { label: "Performance", color: "text-orange-400" },
  athletic: { label: "Athletic", color: "text-green-400" },
};

const STEP_LABELS = ["Intro 1", "Intro 2", "Intro 3", "Profile", "Questions", "Complete"];
const TOTAL_STEPS = 6;

export function OnboardingPreviewSection() {
  const [activeEngine, setActiveEngine] = useState<EngineMode>("metabolic");
  const [previewStep, setPreviewStep] = useState(0);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const navigate = useNavigate();
  const createDemoClient = useCreateDemoClient();

  const handleGoLive = (engine: EngineMode) => {
    createDemoClient.mutate(undefined, {
      onSuccess: (data) => {
        localStorage.setItem("impersonatedClientId", data.client.id);
        navigate("/client/onboarding");
      },
    });
  };

  const handleEngineChange = (engine: string) => {
    setActiveEngine(engine as EngineMode);
    setPreviewStep(0);
  };

  const handleRestart = () => setPreviewStep(0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              🚀 Onboarding Flows
            </CardTitle>
            <CardDescription className="mt-1.5">
              {isLiveMode
                ? "Launch a live onboarding session as a real demo client. Pick an engine and go live."
                : "Step-through preview of all 3 onboarding experiences."}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Eye className={`h-4 w-4 ${!isLiveMode ? "text-primary" : "text-muted-foreground"}`} />
            <Switch checked={isLiveMode} onCheckedChange={setIsLiveMode} />
            <Zap className={`h-4 w-4 ${isLiveMode ? "text-primary" : "text-muted-foreground"}`} />
            <span className="text-xs font-medium">{isLiveMode ? "Live" : "Preview"}</span>
          </div>
        </div>
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
              {isLiveMode ? (
                /* ── LIVE MODE ── */
                <div className="border border-border rounded-2xl overflow-hidden bg-muted/30">
                  <div className="bg-primary/5 px-4 py-3 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold">
                        Live Mode — {ENGINE_LABELS[engine].label}
                      </span>
                    </div>
                    <span className={`text-xs font-medium ${ENGINE_LABELS[engine].color}`}>
                      {ENGINE_ONBOARDING[engine].tone}
                    </span>
                  </div>
                  <div className="p-6 flex flex-col items-center text-center space-y-5">
                    <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10">
                      <Play className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold">Experience {ENGINE_LABELS[engine].label} Onboarding Live</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      This creates a demo client and drops you into the <strong>real onboarding flow</strong> from Step 1.
                      After completing it, you'll land on the live client dashboard with full navigation.
                    </p>
                    <Button
                      size="lg"
                      className="w-full max-w-xs gap-2"
                      onClick={() => handleGoLive(engine)}
                      disabled={createDemoClient.isPending}
                    >
                      {createDemoClient.isPending ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Creating demo client...</>
                      ) : (
                        <><Play className="h-4 w-4" /> Go Live — {ENGINE_LABELS[engine].label}</>
                      )}
                    </Button>
                    <p className="text-[11px] text-muted-foreground">
                      You'll be redirected to /client/onboarding as the demo client. Use the preview header to exit.
                    </p>
                  </div>
                </div>
              ) : (
                /* ── PREVIEW MODE ── */
                <>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      Step {previewStep + 1} of {TOTAL_STEPS} — {STEP_LABELS[previewStep]}
                    </span>
                    <span className={`font-semibold ${ENGINE_LABELS[engine].color}`}>
                      {ENGINE_LABELS[engine].label} · {ENGINE_ONBOARDING[engine].tone}
                    </span>
                  </div>

                  <div className="border border-border rounded-2xl overflow-hidden bg-muted/30">
                    <div className="bg-muted/50 px-4 py-2 border-b border-border flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="h-2.5 w-2.5 rounded-full bg-destructive/50" />
                        <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/50" />
                        <div className="h-2.5 w-2.5 rounded-full bg-green-500/50" />
                      </div>
                      <span className="text-[10px] text-muted-foreground flex-1 text-center font-mono">
                        /client/onboarding
                      </span>
                    </div>

                    <div className="p-4 min-h-[350px] flex flex-col">
                      {previewStep < 3 && (
                        <EngineIntroStep
                          screen={ENGINE_ONBOARDING[engine].introScreens[previewStep]}
                          screenIndex={previewStep}
                          totalIntroScreens={3}
                          tone={ENGINE_ONBOARDING[engine].tone}
                          onContinue={() => setPreviewStep(previewStep + 1)}
                        />
                      )}

                      {previewStep === 3 && (
                        <Card className="border-0 shadow-none bg-transparent">
                          <CardHeader className="px-0 pt-0">
                            <CardTitle className="flex items-center gap-2 text-lg">
                              <Settings className="h-5 w-5" /> Set Up Your Profile
                            </CardTitle>
                            <CardDescription>Tell us a bit about yourself</CardDescription>
                          </CardHeader>
                          <CardContent className="px-0 space-y-4">
                            <div className="space-y-2">
                              <Label>Full Name *</Label>
                              <Input placeholder="John Doe" disabled className="bg-card" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Height (optional)</Label>
                                <Input placeholder="5'10&quot;" disabled className="bg-card" />
                              </div>
                              <div className="space-y-2">
                                <Label>Weight (lbs, optional)</Label>
                                <Input placeholder="180" disabled className="bg-card" />
                              </div>
                            </div>
                            <Button className="w-full" onClick={() => setPreviewStep(4)}>
                              Continue
                            </Button>
                          </CardContent>
                        </Card>
                      )}

                      {previewStep === 4 && (
                        <EngineQuestionsStep
                          questions={ENGINE_ONBOARDING[engine].questions}
                          tone={ENGINE_ONBOARDING[engine].tone}
                          onSubmit={() => setPreviewStep(5)}
                          isLoading={false}
                        />
                      )}

                      {previewStep === 5 && (
                        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-5 py-6">
                          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10">
                            <CheckCircle2 className="h-8 w-8 text-primary" />
                          </div>
                          <h2 className="text-2xl font-bold">You're All Set!</h2>
                          <p className="text-muted-foreground text-sm">Redirecting to dashboard...</p>

                          <div className="w-full mt-4 border border-border rounded-xl overflow-hidden">
                            <div className="bg-primary/5 px-4 py-2.5 border-b border-border">
                              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                                <ArrowRight className="h-4 w-4" />
                                User lands on: /client/dashboard
                              </div>
                            </div>
                            <div className="p-4 space-y-3">
                              <p className="text-xs text-muted-foreground">
                                After completing onboarding, the client is redirected to their <strong>Client Dashboard</strong> with a welcome toast notification.
                              </p>
                              <div className="flex items-center justify-around bg-card rounded-lg border border-border p-3">
                                <div className="flex flex-col items-center gap-1 text-primary">
                                  <Home className="h-4 w-4" />
                                  <span className="text-[10px] font-semibold">Home</span>
                                </div>
                                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                                  <LayoutGrid className="h-4 w-4" />
                                  <span className="text-[10px]">Plans</span>
                                </div>
                                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                                  <BarChart3 className="h-4 w-4" />
                                  <span className="text-[10px]">Progress</span>
                                </div>
                                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                                  <User className="h-4 w-4" />
                                  <span className="text-[10px]">Profile</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 w-full items-center mt-2">
                            <p className="text-xs text-muted-foreground">
                              Want the full live experience? Flip the <strong>Live</strong> toggle above.
                            </p>
                            <Button variant="outline" size="sm" onClick={handleRestart}>
                              Restart Preview
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

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
                      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
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
                      disabled={previewStep === TOTAL_STEPS - 1}
                      onClick={() => setPreviewStep(previewStep + 1)}
                      className="gap-1"
                    >
                      Next <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
