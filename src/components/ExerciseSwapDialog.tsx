import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { Search, CheckCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Exercise {
  id: string;
  name: string;
  muscle_group?: string;
  equipment?: string;
  description?: string;
  image_url?: string;
  video_url?: string;
}

interface ExerciseSwapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentExercise: {
    id: string;
    name: string;
    muscle_group?: string;
    equipment?: string;
  };
  onSwap: (newExercise: Exercise) => void;
}

export function ExerciseSwapDialog({
  open,
  onOpenChange,
  currentExercise,
  onSwap,
}: ExerciseSwapDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch trainer-defined alternatives
  const { data: alternatives } = useQuery({
    queryKey: ["exercise-alternatives", currentExercise.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercise_alternatives")
        .select(`
          *,
          alternative:exercises!exercise_alternatives_alternative_exercise_id_fkey(*)
        `)
        .eq("exercise_id", currentExercise.id);

      if (error) throw error;
      return data;
    },
    enabled: open && !!currentExercise.id,
  });

  // Fetch all exercises matching muscle group as smart suggestions
  const { data: similarExercises } = useQuery({
    queryKey: ["similar-exercises", currentExercise.muscle_group],
    queryFn: async () => {
      let query = supabase
        .from("exercises")
        .select("*")
        .neq("id", currentExercise.id);

      if (currentExercise.muscle_group) {
        query = query.eq("muscle_group", currentExercise.muscle_group);
      }

      const { data, error } = await query.order("name").limit(20);

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const filteredSimilar = similarExercises?.filter(
    (ex) =>
      ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ex.equipment?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSwap = (exercise: Exercise) => {
    onSwap(exercise);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Swap Exercise</DialogTitle>
          <DialogDescription>
            Replace "{currentExercise.name}" with an alternative exercise
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search alternative exercises..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="h-[400px] pr-4">
            {/* Trainer-Defined Alternatives */}
            {alternatives && alternatives.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Recommended by Your Trainer</h3>
                </div>
                <div className="space-y-2">
                  {alternatives.map((alt) => {
                    const exercise = alt.alternative;
                    return (
                      <Card
                        key={alt.id}
                        className="p-4 cursor-pointer hover:bg-accent transition-colors"
                        onClick={() => handleSwap(exercise)}
                      >
                        <div className="flex gap-4">
                          {exercise.image_url && (
                            <img
                              src={exercise.image_url}
                              alt={exercise.name}
                              className="w-20 h-20 rounded object-cover"
                            />
                          )}
                          <div className="flex-1">
                            <h4 className="font-semibold">{exercise.name}</h4>
                            {alt.reason && (
                              <p className="text-sm text-primary mb-1">
                                {alt.reason}
                              </p>
                            )}
                            <div className="flex gap-2 mt-2">
                              {exercise.muscle_group && (
                                <Badge variant="outline" className="text-xs">
                                  {exercise.muscle_group}
                                </Badge>
                              )}
                              {exercise.equipment && (
                                <Badge variant="outline" className="text-xs">
                                  {exercise.equipment}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button size="sm">Select</Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Similar Exercises */}
            <div>
              <h3 className="font-semibold mb-3">
                Similar Exercises
                {currentExercise.muscle_group && (
                  <span className="text-sm text-muted-foreground ml-2">
                    ({currentExercise.muscle_group})
                  </span>
                )}
              </h3>
              <div className="space-y-2">
                {filteredSimilar && filteredSimilar.length > 0 ? (
                  filteredSimilar.map((exercise) => (
                    <Card
                      key={exercise.id}
                      className="p-4 cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => handleSwap(exercise)}
                    >
                      <div className="flex gap-4">
                        {exercise.image_url && (
                          <img
                            src={exercise.image_url}
                            alt={exercise.name}
                            className="w-20 h-20 rounded object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <h4 className="font-semibold">{exercise.name}</h4>
                          {exercise.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {exercise.description}
                            </p>
                          )}
                          <div className="flex gap-2 mt-2">
                            {exercise.muscle_group && (
                              <Badge variant="outline" className="text-xs">
                                {exercise.muscle_group}
                              </Badge>
                            )}
                            {exercise.equipment && (
                              <Badge variant="outline" className="text-xs">
                                {exercise.equipment}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button size="sm">Select</Button>
                      </div>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No similar exercises found. Try adjusting your search.
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
