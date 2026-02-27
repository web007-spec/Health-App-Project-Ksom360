import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { IntroScreen } from "./engineOnboardingContent";

interface EngineIntroStepProps {
  screen: IntroScreen;
  screenIndex: number;
  totalIntroScreens: number;
  tone: string;
  onContinue: () => void;
}

const toneGradients: Record<string, string> = {
  clinical: "from-blue-500/10 to-cyan-500/10",
  athletic: "from-orange-500/10 to-amber-500/10",
  motivational: "from-green-500/10 to-emerald-500/10",
};

const toneAccents: Record<string, string> = {
  clinical: "text-blue-400",
  athletic: "text-orange-400",
  motivational: "text-green-400",
};

export default function EngineIntroStep({
  screen,
  screenIndex,
  totalIntroScreens,
  tone,
  onContinue,
}: EngineIntroStepProps) {
  const gradient = toneGradients[tone] || toneGradients.athletic;
  const accent = toneAccents[tone] || toneAccents.athletic;

  return (
    <Card className={`overflow-hidden bg-gradient-to-br ${gradient} border-0`}>
      <CardContent className="pt-12 pb-10 px-8 text-center space-y-6">
        <div className="flex justify-center gap-2 mb-4">
          {Array.from({ length: totalIntroScreens }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i <= screenIndex ? `w-8 bg-primary` : "w-4 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        <h2 className={`text-3xl font-bold tracking-tight ${accent}`}>
          {screen.title}
        </h2>
        <p className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
          {screen.subtitle}
        </p>

        <Button onClick={onContinue} size="lg" className="mt-8 min-w-[200px]">
          Continue
        </Button>
      </CardContent>
    </Card>
  );
}
