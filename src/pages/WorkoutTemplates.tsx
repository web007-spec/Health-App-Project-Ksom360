import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Search,
  Plus,
  Copy,
  Trash2,
  TrendingUp,
  FileText,
  Dumbbell,
  BookTemplate,
  Loader2,
  Clock,
  Check,
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

  // Browse & Save dialog state
  const [browseOpen, setBrowseOpen] = useState(false);
  const [browseSearch, setBrowseSearch] = useState("");
  const [selectedWorkout, setSelectedWorkout] = useState<{ id: string; name: string } | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateCategory, setTemplateCategory] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

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

  // Fetch non-template workouts for the browse dialog
  const { data: allWorkouts } = useQuery({
    queryKey: ["workout-plans-for-browse", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_plans")
        .select("id, name, category, difficulty, duration_minutes, image_url")
        .eq("trainer_id", user?.id)
        .eq("is_template", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && browseOpen,
  });

  // Save as template
  const handleSaveAsTemplate = async () => {
    if (!selectedWorkout) return;
    setSavingTemplate(true);
    try {
      // Fetch original workout with sections and exercises
      const { data: original, error: fetchError } = await supabase
        .from("workout_plans")
        .select(`*, workout_sections(*, workout_plan_exercises(*))`)
        .eq("id", selectedWorkout.id)
        .single();
      if (fetchError) throw fetchError;

      // Create template copy
      const { data: newTemplate, error: createError } = await supabase
        .from("workout_plans")
        .insert({
          name: templateName || selectedWorkout.name,
          description: original.description,
          category: original.category,
          difficulty: original.difficulty,
          duration_minutes: original.duration_minutes,
          image_url: original.image_url,
          trainer_id: user?.id,
          is_template: true,
          template_category: templateCategory || null,
        })
        .select()
        .single();
      if (createError) throw createError;

      // Copy sections and exercises
      for (const section of original.workout_sections || []) {
        const { data: newSection, error: sectionError } = await supabase
          .from("workout_sections")
          .insert({
            workout_plan_id: newTemplate.id,
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

        if (section.workout_plan_exercises?.length > 0) {
          const { error: exError } = await supabase
            .from("workout_plan_exercises")
            .insert(
              section.workout_plan_exercises.map((ex: any) => ({
                workout_plan_id: newTemplate.id,
                section_id: newSection.id,
                exercise_id: ex.exercise_id,
                sets: ex.sets,
                reps: ex.reps,
                duration_seconds: ex.duration_seconds,
                rest_seconds: ex.rest_seconds,
                order_index: ex.order_index,
                notes: ex.notes,
                tempo: ex.tempo,
                exercise_type: ex.exercise_type,
              }))
            );
          if (exError) throw exError;
        }
      }

      queryClient.invalidateQueries({ queryKey: ["workout-templates"] });
      toast({ title: "Template Saved", description: `"${templateName || selectedWorkout.name}" saved as a template` });
      setBrowseOpen(false);
      setSelectedWorkout(null);
      setTemplateName("");
      setTemplateCategory("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSavingTemplate(false);
    }
  };

  // Create from template mutation
  const createFromTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { data: template, error: fetchError } = await supabase
        .from("workout_plans")
        .select(`*, workout_sections(*, workout_plan_exercises(*))`)
        .eq("id", templateId)
        .single();
      if (fetchError) throw fetchError;

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

        if (section.workout_plan_exercises?.length > 0) {
          const exercises = section.workout_plan_exercises.map((ex: any) => ({
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
          const { error: exercisesError } = await supabase.from("workout_plan_exercises").insert(exercises);
          if (exercisesError) throw exercisesError;
        }
      }

      await supabase.from("workout_plans").update({ use_count: (template.use_count || 0) + 1 }).eq("id", templateId);
      return newWorkout;
    },
    onSuccess: (newWorkout) => {
      queryClient.invalidateQueries({ queryKey: ["workout-plans"] });
      queryClient.invalidateQueries({ queryKey: ["workout-templates"] });
      toast({ title: "Workout Created", description: "Created from template successfully" });
      navigate(`/workouts/edit/${newWorkout.id}`);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
      toast({ title: "Template Deleted", description: "Template removed successfully" });
      setDeleteId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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

  const categories = Array.from(new Set(templates?.map((t) => t.template_category).filter(Boolean)));

  const getExerciseCount = (template: any) => {
    return template.workout_sections?.reduce(
      (total: number, section: any) =>
        total + (section.workout_plan_exercises?.length || 0) * (section.rounds || 1),
      0
    ) || 0;
  };

  const filteredBrowseWorkouts = allWorkouts?.filter((w) =>
    w.name.toLowerCase().includes(browseSearch.toLowerCase())
  );

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
            <p className="text-muted-foreground">Reusable workout templates for quick client assignment</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate("/workouts")} variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              View All Workouts
            </Button>
            <Button onClick={() => { setBrowseOpen(true); setSelectedWorkout(null); setTemplateName(""); setTemplateCategory(""); }}>
              <Plus className="h-4 w-4 mr-2" />
              Browse Workouts to Save
            </Button>
          </div>
        </div>

        {/* Search */}
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
              <TabsTrigger key={cat} value={cat || ""} className="capitalize">{cat}</TabsTrigger>
            ))}
            <TabsTrigger value="uncategorized">Uncategorized</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Templates Grid */}
        {filteredTemplates && filteredTemplates.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow overflow-hidden">
                {template.image_url ? (
                  <img src={template.image_url} alt={template.name} className="w-full h-36 object-cover" />
                ) : (
                  <div className="w-full h-36 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Dumbbell className="h-10 w-10 text-primary/30" />
                  </div>
                )}
                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-base">{template.name}</h3>
                    <div className="flex gap-2 flex-wrap mt-1">
                      {template.difficulty && <Badge variant="outline" className="text-xs capitalize">{template.difficulty}</Badge>}
                      {template.category && <Badge variant="secondary" className="text-xs">{template.category}</Badge>}
                      {template.template_category && <Badge className="text-xs">{template.template_category}</Badge>}
                    </div>
                  </div>

                  {template.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{template.description}</p>
                  )}

                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div>
                      <div className="font-semibold">{template.duration_minutes || 0}</div>
                      <div className="text-xs text-muted-foreground">Minutes</div>
                    </div>
                    <div>
                      <div className="font-semibold">{getExerciseCount(template)}</div>
                      <div className="text-xs text-muted-foreground">Exercises</div>
                    </div>
                    <div>
                      <div className="font-semibold flex items-center justify-center gap-1">
                        <TrendingUp className="h-3 w-3" />{template.use_count || 0}
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
              <Button onClick={() => { setBrowseOpen(true); setSelectedWorkout(null); }} className="gap-2">
                <Plus className="h-4 w-4" />
                Browse Workouts to Save as Templates
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Browse & Save Dialog */}
      <Dialog open={browseOpen} onOpenChange={setBrowseOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Browse Workouts to Save as Template</DialogTitle>
            <DialogDescription>Select a workout to save as a reusable template</DialogDescription>
          </DialogHeader>

          {!selectedWorkout ? (
            <div className="flex flex-col gap-3 overflow-hidden">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search workouts..."
                  value={browseSearch}
                  onChange={(e) => setBrowseSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="overflow-y-auto space-y-2 max-h-[50vh]">
                {filteredBrowseWorkouts?.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No workouts found</p>
                )}
                {filteredBrowseWorkouts?.map((workout) => (
                  <div
                    key={workout.id}
                    onClick={() => { setSelectedWorkout(workout); setTemplateName(workout.name); }}
                    className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors"
                  >
                    {workout.image_url ? (
                      <img src={workout.image_url} alt={workout.name} className="w-14 h-14 rounded object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Dumbbell className="h-6 w-6 text-primary/40" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{workout.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {workout.category && <Badge variant="outline" className="text-xs">{workout.category}</Badge>}
                        {workout.duration_minutes && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />{workout.duration_minutes} min
                          </span>
                        )}
                      </div>
                    </div>
                    <BookTemplate className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/30 border">
                {selectedWorkout && (
                  <>
                    <Check className="h-5 w-5 text-primary" />
                    <span className="font-medium">{selectedWorkout.name}</span>
                    <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setSelectedWorkout(null)}>
                      Change
                    </Button>
                  </>
                )}
              </div>
              <div>
                <Label htmlFor="tpl-name">Template Name</Label>
                <Input
                  id="tpl-name"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Template name..."
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="tpl-category">Category (Optional)</Label>
                <Input
                  id="tpl-category"
                  value={templateCategory}
                  onChange={(e) => setTemplateCategory(e.target.value)}
                  placeholder="e.g. Beginner, HIIT, Strength"
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setBrowseOpen(false)}>Cancel</Button>
            {selectedWorkout && (
              <Button onClick={handleSaveAsTemplate} disabled={savingTemplate}>
                {savingTemplate && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save as Template
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
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
