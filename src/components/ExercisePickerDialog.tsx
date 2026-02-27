import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, Check } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Exercise {
  id: string;
  name: string;
  description: string | null;
  muscle_group: string | null;
  equipment: string | null;
  image_url: string | null;
}

interface ExercisePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercises: Exercise[];
  selectedExerciseId?: string;
  onSelectExercise: (exerciseId: string) => void;
}

export function ExercisePickerDialog({
  open,
  onOpenChange,
  exercises,
  selectedExerciseId,
  onSelectExercise,
}: ExercisePickerDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredExercises = exercises?.filter((exercise) =>
    exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exercise.muscle_group?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleSelect = (exerciseId: string) => {
    onSelectExercise(exerciseId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Select Exercise</DialogTitle>
        </DialogHeader>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search exercises..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <ScrollArea className="h-[400px] pr-4">
          <div className="grid grid-cols-1 gap-3">
            {filteredExercises.map((exercise) => (
              <button
                key={exercise.id}
                onClick={() => handleSelect(exercise.id)}
                className={`relative flex items-center gap-4 p-3 rounded-lg border transition-all hover:shadow-md ${
                  selectedExerciseId === exercise.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {exercise.image_url ? (
                  <img
                    src={exercise.image_url}
                    alt={exercise.name}
                    className="w-20 h-20 object-cover rounded-md shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 bg-gradient-to-br from-primary/10 to-primary/5 rounded-md flex items-center justify-center shrink-0">
                    <span className="text-2xl font-bold text-primary/30">
                      {exercise.name.charAt(0)}
                    </span>
                  </div>
                )}

                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm truncate">{exercise.name}</h3>
                    {selectedExerciseId === exercise.id && (
                      <Check className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-1.5 mb-1">
                    {exercise.muscle_group && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {exercise.muscle_group}
                      </Badge>
                    )}
                    {exercise.equipment && (
                      <Badge variant="secondary" className="text-xs capitalize">
                        {exercise.equipment}
                      </Badge>
                    )}
                  </div>

                  {exercise.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {exercise.description}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>

          {filteredExercises.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No exercises found</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
