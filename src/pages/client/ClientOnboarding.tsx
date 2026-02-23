import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Settings } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useEngineMode } from "@/hooks/useEngineMode";
import { ENGINE_ONBOARDING } from "@/components/onboarding/engineOnboardingContent";
import EngineIntroStep from "@/components/onboarding/EngineIntroStep";
import EngineQuestionsStep from "@/components/onboarding/EngineQuestionsStep";

const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  height: z.string().optional(),
  weight: z.string().optional(),
});

export default function ClientOnboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { engineMode } = useEngineMode();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const [profileData, setProfileData] = useState({
    full_name: "",
    height: "",
    weight: "",
  });

  const content = ENGINE_ONBOARDING[engineMode];
  // Steps: 1-3 = intro screens, 4 = profile, 5 = engine questions, 6 = completion
  const totalSteps = 6;
  const progress = (step / totalSteps) * 100;

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      profileSchema.parse(profileData);
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: profileData.full_name.trim() })
        .eq("id", user?.id);
      if (error) throw error;

      if (profileData.height || profileData.weight) {
        const { error: progressError } = await supabase
          .from("progress_entries")
          .insert({
            client_id: user?.id!,
            weight: profileData.weight ? parseFloat(profileData.weight) : null,
            notes: profileData.height ? `Height: ${profileData.height}` : null,
          });
        if (progressError) throw progressError;
      }
      setStep(5);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "Failed to update profile");
      }
    }
  };

  const handleQuestionsSubmit = async (answers: Record<string, string | number | boolean>) => {
    setIsLoading(true);
    try {
      // Store onboarding answers as JSON in profiles
      const { error } = await supabase
        .from("profiles")
        .update({
          onboarding_completed: true,
          onboarding_answers: answers as any,
        })
        .eq("id", user?.id);
      if (error) throw error;

      // If performance engine and fasting toggle answered, update feature settings
      if (engineMode === "performance" && answers.include_fasting !== undefined) {
        await supabase
          .from("client_feature_settings")
          .update({ fasting_enabled: !!answers.include_fasting })
          .eq("client_id", user?.id);
      }

      setStep(6);
      setTimeout(() => {
        navigate("/client/dashboard");
        toast.success("Welcome! Your profile is all set up.");
      }, 2000);
    } catch (error: any) {
      toast.error(error.message || "Failed to save preferences");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="KSOM360" className="h-16 w-16 rounded-2xl object-contain mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-foreground">Welcome to KSOM360!</h1>
          <p className="text-muted-foreground mt-2">Let's get you started on your fitness journey</p>
        </div>

        <div className="mb-8">
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground text-center mt-2">
            Step {step} of {totalSteps}
          </p>
        </div>

        {/* Steps 1-3: Engine Intro Screens */}
        {step >= 1 && step <= 3 && (
          <EngineIntroStep
            screen={content.introScreens[step - 1]}
            screenIndex={step - 1}
            totalIntroScreens={3}
            tone={content.tone}
            onContinue={() => setStep(step + 1)}
          />
        )}

        {/* Step 4: Profile */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" /> Set Up Your Profile
              </CardTitle>
              <CardDescription>Tell us a bit about yourself</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={profileData.full_name}
                    onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                    placeholder="John Doe"
                    required
                    maxLength={100}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="height">Height (optional)</Label>
                    <Input
                      id="height"
                      value={profileData.height}
                      onChange={(e) => setProfileData({ ...profileData, height: e.target.value })}
                      placeholder="5'10&quot;"
                      maxLength={20}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight">Weight (lbs, optional)</Label>
                    <Input
                      id="weight"
                      type="number"
                      value={profileData.weight}
                      onChange={(e) => setProfileData({ ...profileData, weight: e.target.value })}
                      placeholder="180"
                      min="0"
                      max="1000"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setStep(3)}>
                    Back
                  </Button>
                  <Button type="submit" className="flex-1">
                    Continue
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 5: Engine-Specific Questions */}
        {step === 5 && (
          <EngineQuestionsStep
            questions={content.questions}
            tone={content.tone}
            onSubmit={handleQuestionsSubmit}
            isLoading={isLoading}
          />
        )}

        {/* Step 6: Completion */}
        {step === 6 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">You're All Set!</h2>
                <p className="text-muted-foreground">Redirecting you to your dashboard...</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
