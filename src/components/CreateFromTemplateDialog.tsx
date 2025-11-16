import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, Copy, Clock, Dumbbell, TrendingUp } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CreateFromTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateFromTemplateDialog({
  open,
  onOpenChange,
}: CreateFromTemplateDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Fetch templates
  const { data: templates } = useQuery({
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
    enabled: open && !!user?.id,
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
          name: template.name,
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
      onOpenChange(false);
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

  const categories = Array.from(
    new Set(templates?.map((t) => t.template_category).filter(Boolean))
  );

  const getExerciseCount = (template: any) => {
    return template.workout_sections?.reduce(
      (total: number, section: any) =>
        total + (section.workout_plan_exercises?.length || 0),
      0
    ) || 0;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Create from Template</DialogTitle>
          <DialogDescription>
            Choose a template to quickly create a new workout
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Category Tabs */}
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              {categories.map((cat) => (
                <TabsTrigger key={cat} value={cat || ""} className="capitalize">
                  {cat}
                </TabsTrigger>
              ))}
              {templates && templates.some((t) => !t.template_category) && (
                <TabsTrigger value="uncategorized">Other</TabsTrigger>
              )}
            </TabsList>
          </Tabs>

          {/* Templates Grid */}
          <ScrollArea className="h-[400px]">
            {filteredTemplates && filteredTemplates.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 pr-4">
                {filteredTemplates.map((template) => (
                  <Card
                    key={template.id}
                    className="p-4 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => createFromTemplateMutation.mutate(template.id)}
                  >
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-semibold line-clamp-1">{template.name}</h4>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-xs capitalize">
                            {template.difficulty}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {template.category}
                          </Badge>
                        </div>
                      </div>

                      {template.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {template.description}
                        </p>
                      )}

                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="text-center">
                          <Clock className="h-3 w-3 mx-auto mb-1 text-muted-foreground" />
                          <div className="font-medium">{template.duration_minutes}m</div>
                        </div>
                        <div className="text-center">
                          <Dumbbell className="h-3 w-3 mx-auto mb-1 text-muted-foreground" />
                          <div className="font-medium">{getExerciseCount(template)}</div>
                        </div>
                        <div className="text-center">
                          <TrendingUp className="h-3 w-3 mx-auto mb-1 text-muted-foreground" />
                          <div className="font-medium">{template.use_count || 0}</div>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        className="w-full gap-2"
                        disabled={createFromTemplateMutation.isPending}
                      >
                        <Copy className="h-3 w-3" />
                        Use Template
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No templates found. Save workouts as templates to see them here.
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
