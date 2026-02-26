import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, GripVertical, Plus } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Exercise {
  id: string;
  exercise_id: string;
  exercise_name?: string;
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

interface WorkoutSectionProps {
  section: Section;
  onUpdate: (sectionId: string, updates: Partial<Section>) => void;
  onDelete: (sectionId: string) => void;
  onAddExercise: (sectionId: string) => void;
  onUpdateExercise: (sectionId: string, exerciseId: string, updates: Partial<Exercise>) => void;
  onDeleteExercise: (sectionId: string, exerciseId: string) => void;
  onSelectExercise: (sectionId: string, exerciseId: string) => void;
  exerciseOptions: any[];
}

const sectionTypes = [
  { value: "straight_set", label: "Straight Set" },
  { value: "superset", label: "Superset" },
  { value: "circuit", label: "Circuit" },
  { value: "drop_set", label: "Drop Set" },
  { value: "emom", label: "EMOM (Every Minute on Minute)" },
  { value: "amrap", label: "AMRAP (As Many Reps As Possible)" },
  { value: "tabata", label: "TABATA (20:10 Intervals)" },
];

export function WorkoutSection({
  section,
  onUpdate,
  onDelete,
  onAddExercise,
  onUpdateExercise,
  onDeleteExercise,
  onSelectExercise,
  exerciseOptions,
}: WorkoutSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getExerciseName = (exerciseId: string) => {
    const exercise = exerciseOptions?.find((ex) => ex.id === exerciseId);
    return exercise?.name || "Select exercise";
  };

  const showTimedFields = ["emom", "amrap", "tabata"].includes(section.section_type);
  const showSuperset = ["superset", "circuit"].includes(section.section_type);

  return (
    <Card ref={setNodeRef} style={style} className="p-4 mb-4 border-2">
      <div className="flex items-start gap-3 mb-4">
        <button
          {...attributes}
          {...listeners}
          className="mt-2 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </button>

        <div className="flex-1 space-y-4">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Label>Section Name</Label>
              <Input
                value={section.name}
                onChange={(e) => onUpdate(section.id, { name: e.target.value })}
                placeholder="e.g., Warm-up, Main Workout"
              />
            </div>

            <div className="flex-1">
              <Label>Type</Label>
              <Select
                value={section.section_type}
                onValueChange={(value) => onUpdate(section.id, { section_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sectionTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(section.id)}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Timing Configuration */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label>Rounds</Label>
              <Input
                type="number"
                value={section.rounds}
                onChange={(e) => onUpdate(section.id, { rounds: parseInt(e.target.value) })}
                min="1"
              />
            </div>

            {showTimedFields && (
              <>
                <div>
                  <Label>Work (seconds)</Label>
                  <Input
                    type="number"
                    value={section.work_seconds || ""}
                    onChange={(e) => onUpdate(section.id, { work_seconds: parseInt(e.target.value) || null })}
                  />
                </div>
                <div>
                  <Label>Rest (seconds)</Label>
                  <Input
                    type="number"
                    value={section.rest_seconds || ""}
                    onChange={(e) => onUpdate(section.id, { rest_seconds: parseInt(e.target.value) || null })}
                  />
                </div>
              </>
            )}

            <div>
              <Label>Rest Between Rounds (sec)</Label>
              <Input
                type="number"
                value={section.rest_between_rounds_seconds || ""}
                onChange={(e) => onUpdate(section.id, { rest_between_rounds_seconds: parseInt(e.target.value) || null })}
              />
            </div>
          </div>

          {/* Exercises */}
          <div className="space-y-2 pl-8 border-l-2 border-primary/20">
            {section.exercises.map((exercise) => (
              <Card key={exercise.id} className="p-3 bg-muted/50">
                <div className="space-y-3">
                  <div className="flex gap-2 items-start">
                    <button
                      onClick={() => onSelectExercise(section.id, exercise.id)}
                      className="flex-1 text-left px-3 py-2 rounded-md border hover:bg-accent transition-colors"
                    >
                      <span className="font-medium">{getExerciseName(exercise.exercise_id)}</span>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDeleteExercise(section.id, exercise.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {!showTimedFields && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs">Sets</Label>
                        <Input
                          type="number"
                          value={exercise.sets || ""}
                          onChange={(e) => onUpdateExercise(section.id, exercise.id, { sets: parseInt(e.target.value) || null })}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Reps</Label>
                        <Input
                          type="number"
                          value={exercise.reps || ""}
                          onChange={(e) => onUpdateExercise(section.id, exercise.id, { reps: parseInt(e.target.value) || null })}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Duration</Label>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            placeholder="45"
                            value={
                              exercise.duration_seconds
                                ? exercise.exercise_type === "duration_min"
                                  ? Math.round(exercise.duration_seconds / 60)
                                  : exercise.exercise_type === "duration_hr"
                                    ? Math.round(exercise.duration_seconds / 3600)
                                    : exercise.duration_seconds
                                : ""
                            }
                            onChange={(e) => {
                              const val = e.target.value ? parseInt(e.target.value) : null;
                              let inSeconds = val;
                              if (val && exercise.exercise_type === "duration_min") inSeconds = val * 60;
                              if (val && exercise.exercise_type === "duration_hr") inSeconds = val * 3600;
                              onUpdateExercise(section.id, exercise.id, { duration_seconds: inSeconds });
                            }}
                            className="h-8 min-w-0 flex-1"
                          />
                          <Select
                            value={exercise.exercise_type === "duration_min" ? "min" : exercise.exercise_type === "duration_hr" ? "hr" : "sec"}
                            onValueChange={(unit) => {
                              let newType = "sec";
                              if (unit === "min") newType = "duration_min";
                              if (unit === "hr") newType = "duration_hr";
                              onUpdateExercise(section.id, exercise.id, { exercise_type: newType });
                            }}
                          >
                            <SelectTrigger className="h-8 w-[60px] shrink-0 px-2 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sec">sec</SelectItem>
                              <SelectItem value="min">min</SelectItem>
                              <SelectItem value="hr">hr</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Rest (sec)</Label>
                        <Input
                          type="number"
                          value={exercise.rest_seconds || ""}
                          onChange={(e) => onUpdateExercise(section.id, exercise.id, { rest_seconds: parseInt(e.target.value) || null })}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Tempo</Label>
                        <Input
                          value={exercise.tempo || ""}
                          onChange={(e) => onUpdateExercise(section.id, exercise.id, { tempo: e.target.value })}
                          placeholder="3-1-1-0"
                          className="h-8"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <Label className="text-xs">Notes</Label>
                    <Textarea
                      value={exercise.notes || ""}
                      onChange={(e) => onUpdateExercise(section.id, exercise.id, { notes: e.target.value })}
                      placeholder="Add notes for this exercise..."
                      className="h-16 resize-none"
                    />
                  </div>
                </div>
              </Card>
            ))}

            <Button
              variant="outline"
              onClick={() => onAddExercise(section.id)}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Exercise {showSuperset && "to " + (section.section_type === "superset" ? "Superset" : "Circuit")}
            </Button>
          </div>

          {/* Section Notes */}
          <div>
            <Label>Section Notes</Label>
            <Textarea
              value={section.notes || ""}
              onChange={(e) => onUpdate(section.id, { notes: e.target.value })}
              placeholder="Add notes for this section..."
              className="h-20 resize-none"
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
