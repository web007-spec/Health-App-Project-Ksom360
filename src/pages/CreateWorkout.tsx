import { DashboardLayout } from "@/components/DashboardLayout";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ExercisePickerDialog } from "@/components/ExercisePickerDialog";
import { WorkoutSection } from "@/components/WorkoutSection";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Exercise {
  id: string;
  exercise_id: string;
  sets: number | null;
  reps: number | null;
  duration_seconds: number | null;
  rest_seconds: number | null;
  tempo: string;
  notes: string;
  exercise_type: string;
}

interface Section {
  id: string;
  name: string;
  section_type: string;
  order_index: number;
  rounds: number;
  work_seconds: number | null;
  rest_seconds: number | null;
  rest_between_rounds_seconds: number | null;
  notes: string;
  exercises: Exercise[];
}

export default function CreateWorkout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [workoutData, setWorkoutData] = useState({
    name: "",
    description: "",
    category: "",
    difficulty: "beginner" as const,
    duration_minutes: 30,
    video_url: "",
    image_url: "",
  });

  const [sections, setSections] = useState<Section[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(null);
  const [currentExerciseId, setCurrentExerciseId] = useState<string | null>(null);
  const [exerciseSearch, setExerciseSearch] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: exercises } = useQuery({
    queryKey: ["exercises", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercises")
        .select("*")
        .eq("trainer_id", user?.id)
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const filteredExercises = exercises?.filter((ex) =>
    ex.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
    ex.muscle_group?.toLowerCase().includes(exerciseSearch.toLowerCase())
  );

  const createWorkoutMutation = useMutation({
    mutationFn: async () => {
      // Create workout plan
      const { data: workout, error: workoutError } = await supabase
        .from("workout_plans")
        .insert({
          ...workoutData,
          trainer_id: user?.id,
        })
        .select()
        .single();

      if (workoutError) throw workoutError;

      // Create sections and exercises
      for (const section of sections) {
        const { data: createdSection, error: sectionError } = await supabase
          .from("workout_sections")
          .insert({
            workout_plan_id: workout.id,
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

        // Add exercises to section
        if (section.exercises.length > 0) {
          const exercisesToInsert = section.exercises.map((ex, index) => ({
            workout_plan_id: workout.id,
            section_id: createdSection.id,
            exercise_id: ex.exercise_id,
            order_index: index,
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
            .insert(exercisesToInsert);

          if (exercisesError) throw exercisesError;
        }
      }

      return workout;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-plans"] });
      toast({
        title: "Success!",
        description: "Workout plan created successfully",
      });
      navigate("/workouts");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addSection = () => {
    const newSection: Section = {
      id: crypto.randomUUID(),
      name: "Section " + (sections.length + 1),
      section_type: "straight_set",
      order_index: sections.length,
      rounds: 1,
      work_seconds: null,
      rest_seconds: null,
      rest_between_rounds_seconds: 60,
      notes: "",
      exercises: [],
    };
    setSections([...sections, newSection]);
  };

  const updateSection = (sectionId: string, updates: Partial<Section>) => {
    setSections(sections.map((s) => (s.id === sectionId ? { ...s, ...updates } : s)));
  };

  const deleteSection = (sectionId: string) => {
    setSections(sections.filter((s) => s.id !== sectionId));
  };

  const addExerciseToSection = (sectionId: string) => {
    setCurrentSectionId(sectionId);
    setCurrentExerciseId(crypto.randomUUID());
    setPickerOpen(true);
  };

  const handleExerciseSelect = (exerciseId: string) => {
    if (!currentSectionId || !currentExerciseId) return;

    const newExercise: Exercise = {
      id: currentExerciseId,
      exercise_id: exerciseId,
      sets: 3,
      reps: 12,
      duration_seconds: null,
      rest_seconds: 60,
      tempo: "",
      notes: "",
      exercise_type: "normal",
    };

    setSections(
      sections.map((s) =>
        s.id === currentSectionId
          ? { ...s, exercises: [...s.exercises, newExercise] }
          : s
      )
    );

    setPickerOpen(false);
    setCurrentSectionId(null);
    setCurrentExerciseId(null);
  };

  const updateExerciseInSection = (sectionId: string, exerciseId: string, updates: Partial<Exercise>) => {
    setSections(
      sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              exercises: s.exercises.map((ex) =>
                ex.id === exerciseId ? { ...ex, ...updates } : ex
              ),
            }
          : s
      )
    );
  };

  const deleteExerciseFromSection = (sectionId: string, exerciseId: string) => {
    setSections(
      sections.map((s) =>
        s.id === sectionId
          ? { ...s, exercises: s.exercises.filter((ex) => ex.id !== exerciseId) }
          : s
      )
    );
  };

  const openExercisePickerForEdit = (sectionId: string, exerciseId: string) => {
    setCurrentSectionId(sectionId);
    setCurrentExerciseId(exerciseId);
    setPickerOpen(true);
  };

  const handleEditExerciseSelect = (newExerciseId: string) => {
    if (!currentSectionId || !currentExerciseId) return;

    updateExerciseInSection(currentSectionId, currentExerciseId, {
      exercise_id: newExerciseId,
    });

    setPickerOpen(false);
    setCurrentSectionId(null);
    setCurrentExerciseId(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSections((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex);
        return reordered.map((item, index) => ({ ...item, order_index: index }));
      });
    }
  };

  const handleSubmit = async () => {
    if (!workoutData.name || !workoutData.category) {
      toast({
        title: "Missing Information",
        description: "Please fill in workout name and category",
        variant: "destructive",
      });
      return;
    }

    if (sections.length === 0) {
      toast({
        title: "No Sections",
        description: "Please add at least one section to your workout",
        variant: "destructive",
      });
      return;
    }

    createWorkoutMutation.mutate();
  };

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Exercise Library Sidebar */}
        <div className="w-80 border-r bg-muted/30 flex flex-col">
          <div className="p-4 border-b">
            <h3 className="font-semibold mb-3">Exercise Library</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search exercises..."
                value={exerciseSearch}
                onChange={(e) => setExerciseSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {filteredExercises?.map((exercise) => (
                <Card
                  key={exercise.id}
                  className="p-3 cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => {
                    if (sections.length === 0) {
                      toast({
                        title: "Add a Section First",
                        description: "Create a section before adding exercises",
                      });
                      return;
                    }
                    // Add to the last section
                    const lastSection = sections[sections.length - 1];
                    addExerciseToSection(lastSection.id);
                    setTimeout(() => handleExerciseSelect(exercise.id), 100);
                  }}
                >
                  <div className="flex items-center gap-3">
                    {exercise.image_url && (
                      <img
                        src={exercise.image_url}
                        alt={exercise.name}
                        className="w-12 h-12 rounded object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{exercise.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {exercise.muscle_group}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Main Workout Builder */}
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <Button variant="ghost" size="icon" onClick={() => navigate("/workouts")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-3xl font-bold">Create Workout</h1>
            </div>

            {/* Workout Info */}
            <Card className="p-6 mb-6">
              <CardContent className="p-0 space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Workout Name *</Label>
                    <Input
                      value={workoutData.name}
                      onChange={(e) => setWorkoutData({ ...workoutData, name: e.target.value })}
                      placeholder="e.g., Full Body Strength"
                    />
                  </div>
                  <div>
                    <Label>Category *</Label>
                    <Input
                      value={workoutData.category}
                      onChange={(e) => setWorkoutData({ ...workoutData, category: e.target.value })}
                      placeholder="e.g., Strength, HIIT, Cardio"
                    />
                  </div>
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={workoutData.description}
                    onChange={(e) => setWorkoutData({ ...workoutData, description: e.target.value })}
                    placeholder="Describe the workout focus and goals..."
                    rows={3}
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>Difficulty</Label>
                    <Select
                      value={workoutData.difficulty}
                      onValueChange={(value: any) => setWorkoutData({ ...workoutData, difficulty: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Duration (minutes)</Label>
                    <Input
                      type="number"
                      value={workoutData.duration_minutes}
                      onChange={(e) => setWorkoutData({ ...workoutData, duration_minutes: parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Video URL</Label>
                    <Input
                      value={workoutData.video_url}
                      onChange={(e) => setWorkoutData({ ...workoutData, video_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sections */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Workout Sections</h2>
                <Button onClick={addSection}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Section
                </Button>
              </div>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={sections.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {sections.map((section) => (
                    <WorkoutSection
                      key={section.id}
                      section={section}
                      onUpdate={updateSection}
                      onDelete={deleteSection}
                      onAddExercise={addExerciseToSection}
                      onUpdateExercise={updateExerciseInSection}
                      onDeleteExercise={deleteExerciseFromSection}
                      onSelectExercise={openExercisePickerForEdit}
                      exerciseOptions={exercises || []}
                    />
                  ))}
                </SortableContext>
              </DndContext>

              {sections.length === 0 && (
                <Card className="p-8 text-center border-dashed">
                  <p className="text-muted-foreground mb-4">
                    No sections yet. Add a section to start building your workout.
                  </p>
                  <Button onClick={addSection} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Section
                  </Button>
                </Card>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => navigate("/workouts")}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createWorkoutMutation.isPending}
              >
                {createWorkoutMutation.isPending ? "Creating..." : "Create Workout"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ExercisePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        exercises={exercises || []}
        selectedExerciseId={
          currentSectionId && currentExerciseId
            ? sections
                .find((s) => s.id === currentSectionId)
                ?.exercises.find((ex) => ex.id === currentExerciseId)?.exercise_id
            : undefined
        }
        onSelectExercise={
          sections.find((s) => s.id === currentSectionId)?.exercises.some((ex) => ex.id === currentExerciseId)
            ? handleEditExerciseSelect
            : handleExerciseSelect
        }
      />
    </DashboardLayout>
  );
}
