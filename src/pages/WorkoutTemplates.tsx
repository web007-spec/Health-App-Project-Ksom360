import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Plus,
  Copy,
  Trash2,
  Users,
  TrendingUp,
  FileText,
  Dumbbell,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function WorkoutTemplates() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Fetch templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ["workout-templates", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_plans")
        .select(`
          *,
          workout_sections(
            id,
            workout_plan_exercises(id)
          )
        `)
        .eq("trainer_id", user?.id)
        .eq("is_template", true)
        .order("use_count", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Create from template mutation
  const createFromTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      // Fetch full template data
      const { data: template, error: fetchError } = await supabase
        .from("workout_plans")
        .select(`
          *,
          workout_sections(
            *,
            workout_plan_exercises(*)
          )
        `)
        .eq("id", templateId)
        .single();

      if (fetchError) throw fetchError;

      // Create new workout from template
      const { data: newWorkout, error: workoutError } = await supabase
        .from("workout_plans")
        .insert({
          name: `${template.name} (Copy)`,
          description: template.description,
          category: template.category,
          difficulty: template.difficulty,
          duration_minutes: template.duration_minutes,
          video_url: template.video_url,
          image_url: template.image_url,
          trainer_id: user?.id,
          is_template: false,
        })
        .select()
        .single();

      if (workoutError) throw workoutError;

      // Copy sections and exercises
      for (const section of template.workout_sections || []) {
        const { data: newSection, error: sectionError } = await supabase
          .from("workout_sections")
          .insert({
            workout_plan_id: newWorkout.id,
            name: section.name,
            section_type: section.section_type,
            order_index: section.order_index,
            rounds: section.rounds,
            work_seconds: section.work_seconds,
            rest_seconds: section.rest_seconds,
            rest_between_rounds_seconds: section.rest_between_rounds_seconds,
            notes: section.notes,
          })
          .select()
          .single();

        if (sectionError) throw sectionError;

        // Copy exercises
        if (section.workout_plan_exercises && section.workout_plan_exercises.length > 0) {
          const exercises = section.workout_plan_exercises.map((ex) => ({
            workout_plan_id: newWorkout.id,
            section_id: newSection.id,
            exercise_id: ex.exercise_id,
            order_index: ex.order_index,
            sets: ex.sets,
            reps: ex.reps,
            duration_seconds: ex.duration_seconds,
            rest_seconds: ex.rest_seconds,
            tempo: ex.tempo,
            notes: ex.notes,
            exercise_type: ex.exercise_type,
          }));

          const { error: exercisesError } = await supabase
            .from("workout_plan_exercises")
            .insert(exercises);

          if (exercisesError) throw exercisesError;
        }
      }

      // Increment use count
      await supabase
        .from("workout_plans")
        .update({ use_count: (template.use_count || 0) + 1 })
        .eq("id", templateId);

      return newWorkout;
    },
    onSuccess: (newWorkout) => {
      queryClient.invalidateQueries({ queryKey: ["workout-plans"] });
      queryClient.invalidateQueries({ queryKey: ["workout-templates"] });
      toast({
        title: "Workout Created",
        description: "Created from template successfully",
      });
      navigate(`/workouts/edit/${newWorkout.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workout_plans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-templates"] });
      toast({
        title: "Template Deleted",
        description: "Template removed successfully",
      });
      setDeleteId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredTemplates = templates?.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory =
      selectedCategory === "all" ||
      template.template_category === selectedCategory ||
      (selectedCategory === "uncategorized" && !template.template_category);

    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = Array.from(
    new Set(templates?.map((t) => t.template_category).filter(Boolean))
  );

  const getExerciseCount = (template: any) => {
    return template.workout_sections?.reduce(
      (total: number, section: any) =>
        total + (section.workout_plan_exercises?.length || 0) * section.rounds,
      0
    ) || 0;
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading templates...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Workout Templates</h1>
            <p className="text-muted-foreground">
              Reusable workout templates for quick client assignment
            </p>
          </div>
          <Button onClick={() => navigate("/workouts")} variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            View All Workouts
          </Button>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-6">
          <TabsList>
            <TabsTrigger value="all">All Templates</TabsTrigger>
            {categories.map((cat) => (
              <TabsTrigger key={cat} value={cat || ""} className="capitalize">
                {cat}
              </TabsTrigger>
            ))}
            <TabsTrigger value="uncategorized">Uncategorized</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Templates Grid */}
        {filteredTemplates && filteredTemplates.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{template.name}</CardTitle>
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="outline" className="capitalize">
                          {template.difficulty}
                        </Badge>
                        <Badge variant="secondary">{template.category}</Badge>
                        {template.template_category && (
                          <Badge variant="default">{template.template_category}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {template.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {template.description}
                    </p>
                  )}

                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div>
                      <div className="font-semibold">{template.duration_minutes}</div>
                      <div className="text-xs text-muted-foreground">Minutes</div>
                    </div>
                    <div>
                      <div className="font-semibold">{getExerciseCount(template)}</div>
                      <div className="text-xs text-muted-foreground">Exercises</div>
                    </div>
                    <div>
                      <div className="font-semibold flex items-center justify-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {template.use_count || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Used</div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => createFromTemplateMutation.mutate(template.id)}
                      disabled={createFromTemplateMutation.isPending}
                      className="flex-1 gap-2"
                    >
                      <Copy className="h-4 w-4" />
                      Use Template
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(template.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Dumbbell className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">No Templates Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create reusable workout templates to save time when programming for clients
                </p>
              </div>
              <Button onClick={() => navigate("/workouts")} className="gap-2">
                <Plus className="h-4 w-4" />
                Browse Workouts to Save as Templates
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteTemplateMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
