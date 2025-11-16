import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dumbbell, Target, Settings, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name must be less than 100 characters"),
  height: z.string().optional(),
  weight: z.string().optional(),
});

const goalSchema = z.object({
  title: z.string().trim().min(3, "Goal title must be at least 3 characters").max(100, "Title must be less than 100 characters"),
  description: z.string().trim().max(500, "Description must be less than 500 characters").optional(),
  target_value: z.string().optional(),
  target_date: z.string().min(1, "Please select a target date"),
});

const preferencesSchema = z.object({
  workout_days: z.string().optional(),
  workout_time: z.string().optional(),
  fitness_level: z.string().optional(),
});

export default function ClientOnboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Form data
  const [profileData, setProfileData] = useState({
    full_name: "",
    height: "",
    weight: "",
  });

  const [goalData, setGoalData] = useState({
    title: "",
    description: "",
    target_value: "",
    target_date: "",
  });

  const [preferencesData, setPreferencesData] = useState({
    workout_days: "",
    workout_time: "",
    fitness_level: "beginner",
  });

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      profileSchema.parse(profileData);
      
      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({ 
          full_name: profileData.full_name.trim()
        })
        .eq('id', user?.id);

      if (error) throw error;

      // Log initial progress entry if height/weight provided
      if (profileData.height || profileData.weight) {
        const { error: progressError } = await supabase
          .from('progress_entries')
          .insert({
            client_id: user?.id!,
            weight: profileData.weight ? parseFloat(profileData.weight) : null,
            notes: profileData.height ? `Height: ${profileData.height}` : null,
          });

        if (progressError) throw progressError;
      }

      setStep(2);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "Failed to update profile");
      }
    }
  };

  const handleGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      goalSchema.parse(goalData);

      // Create initial goal
      const { error } = await supabase
        .from('fitness_goals')
        .insert({
          client_id: user?.id!,
          trainer_id: user?.id!, // Self-set goal for now
          title: goalData.title.trim(),
          description: goalData.description?.trim() || null,
          target_value: goalData.target_value ? parseFloat(goalData.target_value) : null,
          target_date: goalData.target_date,
          goal_type: 'general',
        });

      if (error) throw error;

      setStep(3);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "Failed to create goal");
      }
    }
  };

  const handlePreferencesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      preferencesSchema.parse(preferencesData);

      // Store preferences in notification_preferences or a new table
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user?.id!,
          email_enabled: true,
          push_enabled: false,
        });

      if (error) throw error;

      setStep(4);
      
      // Redirect to dashboard after a moment
      setTimeout(() => {
        navigate("/client/dashboard");
        toast.success("Welcome! Your profile is all set up.");
      }, 2000);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "Failed to save preferences");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary mb-4">
            <Dumbbell className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Welcome to FitCoach Pro!</h1>
          <p className="text-muted-foreground mt-2">Let's get you started on your fitness journey</p>
        </div>

        <div className="mb-8">
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground text-center mt-2">
            Step {step} of {totalSteps}
          </p>
        </div>

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Set Up Your Profile
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
                  <Button type="submit" className="flex-1">
                    Continue
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Set Your First Goal
              </CardTitle>
              <CardDescription>What do you want to achieve?</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGoalSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="goal_title">Goal Title *</Label>
                  <Input
                    id="goal_title"
                    value={goalData.title}
                    onChange={(e) => setGoalData({ ...goalData, title: e.target.value })}
                    placeholder="Lose 20 pounds"
                    required
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="goal_description">Description (optional)</Label>
                  <Textarea
                    id="goal_description"
                    value={goalData.description}
                    onChange={(e) => setGoalData({ ...goalData, description: e.target.value })}
                    placeholder="I want to get healthier and feel more energetic..."
                    rows={3}
                    maxLength={500}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="target_value">Target Value (optional)</Label>
                    <Input
                      id="target_value"
                      type="number"
                      value={goalData.target_value}
                      onChange={(e) => setGoalData({ ...goalData, target_value: e.target.value })}
                      placeholder="20"
                      min="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="target_date">Target Date *</Label>
                    <Input
                      id="target_date"
                      type="date"
                      value={goalData.target_date}
                      onChange={(e) => setGoalData({ ...goalData, target_date: e.target.value })}
                      required
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setStep(1)}>
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

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Dumbbell className="h-5 w-5" />
                Workout Preferences
              </CardTitle>
              <CardDescription>Help us personalize your experience</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePreferencesSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="workout_days">Preferred Workout Days (optional)</Label>
                  <Input
                    id="workout_days"
                    value={preferencesData.workout_days}
                    onChange={(e) => setPreferencesData({ ...preferencesData, workout_days: e.target.value })}
                    placeholder="Monday, Wednesday, Friday"
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="workout_time">Preferred Workout Time (optional)</Label>
                  <Input
                    id="workout_time"
                    value={preferencesData.workout_time}
                    onChange={(e) => setPreferencesData({ ...preferencesData, workout_time: e.target.value })}
                    placeholder="Morning, Afternoon, or Evening"
                    maxLength={50}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fitness_level">Current Fitness Level</Label>
                  <select
                    id="fitness_level"
                    value={preferencesData.fitness_level}
                    onChange={(e) => setPreferencesData({ ...preferencesData, fitness_level: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setStep(2)}>
                    Back
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isLoading}>
                    {isLoading ? "Completing..." : "Complete Setup"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">You're All Set!</h2>
                <p className="text-muted-foreground">
                  Redirecting you to your dashboard...
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
