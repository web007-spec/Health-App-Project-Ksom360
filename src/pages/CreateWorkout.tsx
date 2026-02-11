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
import { ArrowLeft, Plus, Search, BookTemplate, Filter, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ExercisePickerDialog } from "@/components/ExercisePickerDialog";
import { WorkoutSection } from "@/components/WorkoutSection";
import { CreateFromTemplateDialog } from "@/components/CreateFromTemplateDialog";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

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
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [sortBy, setSortBy] = useState("name");

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

  const filteredExercises = exercises
    ?.filter((ex) =>
      ex.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
      ex.muscle_group?.toLowerCase().includes(exerciseSearch.toLowerCase())
    )
    ?.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "muscle_group") return (a.muscle_group || "").localeCompare(b.muscle_group || "");
      return 0;
    });

  const createWorkoutMutation = useMutation({
    mutationFn: async () => {
      const { data: workout, error: workoutError } = await supabase
        .from("workout_plans")
        .insert({
          ...workoutData,
          trainer_id: user?.id,
        })
        .select()
        .single();

      if (workoutError) throw workoutError;

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

  const addExerciseDirectly = (exerciseId: string) => {
    if (sections.length === 0) {
      // Auto-create a section first
      const newSection: Section = {
        id: crypto.randomUUID(),
        name: "Section 1",
        section_type: "straight_set",
        order_index: 0,
        rounds: 1,
        work_seconds: null,
        rest_seconds: null,
        rest_between_rounds_seconds: 60,
        notes: "",
        exercises: [],
      };

      const newExercise: Exercise = {
        id: crypto.randomUUID(),
        exercise_id: exerciseId,
        sets: 3,
        reps: 12,
        duration_seconds: null,
        rest_seconds: 60,
        tempo: "",
        notes: "",
        exercise_type: "normal",
      };

      newSection.exercises.push(newExercise);
      setSections([newSection]);
      toast({ title: "Exercise added", description: "Created a new section with this exercise" });
      return;
    }

    const lastSection = sections[sections.length - 1];
    const newExercise: Exercise = {
      id: crypto.randomUUID(),
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
        s.id === lastSection.id
          ? { ...s, exercises: [...s.exercises, newExercise] }
          : s
      )
    );
    toast({ title: "Exercise added", description: `Added to ${lastSection.name}` });
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

  // Helper to detect if URL is a direct video
  const isDirectVideo = (url: string) => {
    return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
  };

  const getExerciseThumbnail = (exercise: typeof exercises extends (infer T)[] | undefined ? T : never) => {
    if (exercise.image_url) return exercise.image_url;
    if (exercise.video_url && !isDirectVideo(exercise.video_url)) {
      // Try to extract YouTube thumbnail
      const ytMatch = exercise.video_url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (ytMatch) return `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg`;
    }
    return null;
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/workouts")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Workout:</span>
            <Input
              value={workoutData.name}
              onChange={(e) => setWorkoutData({ ...workoutData, name: e.target.value })}
              placeholder="Workout name..."
              className="h-8 w-56 font-semibold"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTemplateDialogOpen(true)}
          >
            <BookTemplate className="h-4 w-4 mr-1.5" />
            From Template
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={createWorkoutMutation.isPending}
            className="bg-primary text-primary-foreground"
          >
            {createWorkoutMutation.isPending ? "Saving..." : "SAVE"}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Workout Builder */}
        <div className="flex-1 flex flex-col overflow-hidden border-r">
          {/* Instructions */}
          <div className="p-4 border-b bg-muted/20">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Instructions</p>
            <Textarea
              value={workoutData.description}
              onChange={(e) => setWorkoutData({ ...workoutData, description: e.target.value })}
              placeholder="(Optional) A short summary of this workout or general cues during workout."
              className="text-sm min-h-[60px] bg-transparent border-none resize-none p-0 focus-visible:ring-0 shadow-none"
            />
          </div>

          {/* Workout Settings Row */}
          <div className="flex items-center gap-4 px-4 py-3 border-b bg-muted/10">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Category:</Label>
              <Input
                value={workoutData.category}
                onChange={(e) => setWorkoutData({ ...workoutData, category: e.target.value })}
                placeholder="e.g., Strength"
                className="h-7 w-32 text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Difficulty:</Label>
              <Select
                value={workoutData.difficulty}
                onValueChange={(value: any) => setWorkoutData({ ...workoutData, difficulty: value })}
              >
                <SelectTrigger className="h-7 w-28 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Duration:</Label>
              <Input
                type="number"
                value={workoutData.duration_minutes}
                onChange={(e) => setWorkoutData({ ...workoutData, duration_minutes: parseInt(e.target.value) || 0 })}
                className="h-7 w-16 text-xs"
              />
              <span className="text-xs text-muted-foreground">min</span>
            </div>
          </div>

          {/* Exercises Section Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h2 className="text-sm font-bold uppercase tracking-wide">Exercises</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={addSection}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Section
              </Button>
            </div>
          </div>

          {/* Sections & Exercises */}
          <ScrollArea className="flex-1">
            <div className="p-4">
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
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-4 text-6xl opacity-30">💪</div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Workouts require at least one exercise
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Click an exercise from the library to add it
                  </p>
                  <Button onClick={addSection} variant="outline" size="sm">
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add First Section
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right Panel - Exercise Library */}
        <div className="w-[520px] flex flex-col overflow-hidden bg-muted/10">
          {/* Search Bar */}
          <div className="p-3 border-b space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search for an exercise"
                value={exerciseSearch}
                onChange={(e) => setExerciseSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center justify-between">
              <Button
                variant="link"
                size="sm"
                className="text-primary p-0 h-auto text-xs"
                onClick={() => {
                  // Could open create exercise dialog
                  navigate("/exercises");
                }}
              >
                + Add custom exercise
              </Button>
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-7 w-24 text-xs border-none shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="muscle_group">Muscle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Exercise Grid */}
          <ScrollArea className="flex-1">
            <div className="p-3 grid grid-cols-3 gap-2">
              {filteredExercises?.map((exercise) => {
                const thumbnail = getExerciseThumbnail(exercise);
                const hasVideo = exercise.video_url && isDirectVideo(exercise.video_url);

                return (
                  <div
                    key={exercise.id}
                    className="group cursor-pointer rounded-lg border bg-card hover:border-primary hover:shadow-md transition-all overflow-hidden"
                    onClick={() => addExerciseDirectly(exercise.id)}
                  >
                    {/* Thumbnail */}
                    <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                      {hasVideo ? (
                        <video
                          src={exercise.video_url!}
                          className="w-full h-full object-cover"
                          muted
                          loop
                          playsInline
                          onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                          onMouseLeave={(e) => {
                            const vid = e.target as HTMLVideoElement;
                            vid.pause();
                            vid.currentTime = 0;
                          }}
                        />
                      ) : thumbnail ? (
                        <img
                          src={thumbnail}
                          alt={exercise.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <GripVertical className="h-8 w-8 opacity-20" />
                        </div>
                      )}
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Plus className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                    {/* Name */}
                    <div className="p-2">
                      <p className="text-xs font-medium leading-tight line-clamp-2">
                        {exercise.name}
                      </p>
                      {exercise.muscle_group && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                          {exercise.muscle_group}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredExercises?.length === 0 && (
                <div className="col-span-3 py-12 text-center">
                  <p className="text-sm text-muted-foreground">No exercises found</p>
                </div>
              )}
            </div>
          </ScrollArea>
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

      <CreateFromTemplateDialog
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
      />
    </div>
  );
}
