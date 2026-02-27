import { useState } from "react";
import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Sparkles, Dumbbell, Flame } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ProgramsSelector } from "@/components/ProgramsSelector";
import { QuickPlansSelector } from "@/components/QuickPlansSelector";
import { FastingSafetyNotice } from "@/components/FastingSafetyNotice";
import { FastingStructureComparison } from "@/components/FastingStructureComparison";
import { RecommendationCard } from "@/components/RecommendationCard";
import { LifestylePlanSelector } from "@/components/LifestylePlanSelector";
import { TransformationPathCard } from "@/components/TransformationPathCard";
import { useEngineMode } from "@/hooks/useEngineMode";
import { useClientFeatureSettings } from "@/hooks/useClientFeatureSettings";

export default function ClientChooseProtocol() {
  const navigate = useNavigate();
  const [focusFilter, setFocusFilter] = useState<string | null>(null);
  const { engineMode, config, isLoading: engineLoading } = useEngineMode();
  const { settings, isLoading: settingsLoading } = useClientFeatureSettings();

  if (engineLoading || settingsLoading) {
    return (
      <ClientLayout>
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </ClientLayout>
    );
  }

  const showFasting = config.features.showFastingUI;
  const showRestore = settings.restore_enabled;

  return (
    <ClientLayout>
      <div className="px-3 pt-4 pb-8 space-y-6 w-full">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">
            {engineMode === "athletic" ? "Training Plans" : "Plans"}
          </h1>
        </div>

        {/* Restore entry — all engines when enabled */}
        {showRestore && (
          <Card
            className="overflow-hidden border-primary/20 shadow-md cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => navigate("/client/vibes")}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold">Restore</h3>
                <p className="text-sm text-muted-foreground">Recovery sounds, breathing & guided sessions</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Training section — Performance & Athletic */}
        {(engineMode === "performance" || engineMode === "athletic") && (
          <Card
            className="overflow-hidden border-accent/20 shadow-md cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => navigate("/client/workouts")}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                <Dumbbell className="h-6 w-6 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold">Training Programs</h3>
                <p className="text-sm text-muted-foreground">
                  {engineMode === "athletic"
                    ? "Your assigned training & game-day prep"
                    : "View your assigned workouts and training schedule"}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Fasting section — Metabolic & Performance only */}
        {showFasting && (
          <>
            {engineMode === "performance" && (
              <div className="flex items-center gap-2 pt-2">
                <Flame className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Fasting Tools (Optional)
                </p>
              </div>
            )}

            <RecommendationCard />
            <LifestylePlanSelector selected={focusFilter} onSelect={setFocusFilter} />
            <TransformationPathCard />
            <ProgramsSelector navigate={navigate} />
            <QuickPlansSelector navigate={navigate} />

            <FastingStructureComparison />
            <FastingSafetyNotice />
          </>
        )}

        {/* Athletic: no fasting, show fueling guidance placeholder */}
        {engineMode === "athletic" && (
          <Card className="border-muted">
            <CardContent className="p-4 text-center space-y-2">
              <p className="text-sm font-medium">🏋️ Focus on Training & Recovery</p>
              <p className="text-xs text-muted-foreground">
                Your plan emphasizes training readiness, recovery protocols, and proper fueling. 
                Fasting is not part of the Game Ready system.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </ClientLayout>
  );
}
