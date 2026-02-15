import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Play, Edit, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ManageExerciseAlternativesDialog } from "@/components/ManageExerciseAlternativesDialog";
import { cn } from "@/lib/utils";

interface Exercise {
  id: string;
  name: string;
  description: string | null;
  muscle_group: string | null;
  equipment: string | null;
  image_url: string | null;
  video_url: string | null;
}

interface ExerciseCardProps {
  exercise: Exercise;
  onEdit?: (exercise: Exercise) => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

export function ExerciseCard({ exercise, onEdit, selectionMode, isSelected, onToggleSelect }: ExerciseCardProps) {
  const [showVideoDialog, setShowVideoDialog] = useState(false);
  const [showAlternativesDialog, setShowAlternativesDialog] = useState(false);

  // Fetch tags for this exercise
  const { data: exerciseTags } = useQuery({
    queryKey: ["exercise-tags", exercise.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercise_exercise_tags")
        .select(`
          tag_id,
          exercise_tags:tag_id (
            id,
            name
          )
        `)
        .eq("exercise_id", exercise.id);
      
      if (error) throw error;
      return data.map((t: any) => t.exercise_tags);
    },
  });

  // Check if URL is a direct video file (not YouTube/Vimeo embed)
  const isDirectVideoUrl = (url: string | null) => {
    if (!url) return false;
    return !url.includes('youtube.com') && !url.includes('youtu.be') && !url.includes('vimeo.com');
  };

  const getVideoEmbedUrl = (url: string | null) => {
    if (!url) return null;
    
    // Direct video URL - return as-is
    if (isDirectVideoUrl(url)) {
      return url;
    }
    
    // Vimeo
    if (url.includes('vimeo.com')) {
      const vimeoId = url.split('/').pop()?.split('?')[0];
      return `https://player.vimeo.com/video/${vimeoId}`;
    }
    
    // YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.includes('youtube.com') 
        ? url.split('v=')[1]?.split('&')[0]
        : url.split('/').pop()?.split('?')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    
    return url;
  };

  const embedUrl = getVideoEmbedUrl(exercise.video_url);
  const isDirectVideo = isDirectVideoUrl(exercise.video_url);


  return (
    <>
      <Card 
        className={cn(
          "group overflow-hidden hover:shadow-lg transition-shadow cursor-pointer",
          selectionMode && isSelected && "ring-2 ring-primary"
        )}
        onClick={selectionMode ? onToggleSelect : undefined}
      >
        <div className="relative aspect-video bg-muted overflow-hidden">
          {selectionMode && (
            <div className="absolute top-3 left-3 z-10">
              <Checkbox
                checked={isSelected}
                onCheckedChange={onToggleSelect}
                onClick={(e) => e.stopPropagation()}
                className="h-5 w-5 bg-background border-2"
              />
            </div>
          )}
        {exercise.image_url ? (
            <img 
              src={exercise.image_url} 
              alt={exercise.name}
              className="w-full h-full object-contain bg-muted"
            />
          ) : exercise.video_url ? (
            <video
              src={exercise.video_url}
              preload="metadata"
              muted
              playsInline
              className="w-full h-full object-contain bg-muted pointer-events-none"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
              <span className="text-4xl font-bold text-primary/20">{exercise.name.charAt(0)}</span>
            </div>
          )}
          
          {exercise.video_url && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowVideoDialog(true);
              }}
              className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <div className="bg-white rounded-full p-3">
                <Play className="h-6 w-6 text-primary fill-primary" />
              </div>
              <span className="absolute bottom-4 text-white font-semibold">Watch Demo</span>
            </button>
          )}
        </div>

        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-lg text-foreground line-clamp-1 flex-1">{exercise.name}</h3>
            {onEdit && (
              <div className="flex gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowAlternativesDialog(true)}
                  className="h-8 w-8"
                  title="Manage Alternatives"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(exercise)}
                  className="h-8 w-8"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2">
            {exercise.equipment && (
              <Badge variant="secondary" className="capitalize">
                {exercise.equipment}
              </Badge>
            )}
            {exercise.muscle_group && (
              <Badge variant="outline" className="capitalize">
                {exercise.muscle_group}
              </Badge>
            )}
            {exerciseTags && exerciseTags.map((tag: any) => (
              <Badge key={tag.id} variant="default" className="capitalize bg-primary/20 text-primary hover:bg-primary/30">
                {tag.name}
              </Badge>
            ))}
          </div>

          {exercise.description && (
            <p className="text-sm text-muted-foreground line-clamp-3">
              {exercise.description}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Video Dialog */}
      <Dialog open={showVideoDialog} onOpenChange={setShowVideoDialog}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle>{exercise.name}</DialogTitle>
          </DialogHeader>
          {embedUrl && (
            <div className="w-full aspect-video">
              {isDirectVideo ? (
                <video
                  src={embedUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain bg-black"
                />
              ) : (
                <iframe
                  src={embedUrl}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Manage Alternatives Dialog */}
      <ManageExerciseAlternativesDialog
        open={showAlternativesDialog}
        onOpenChange={setShowAlternativesDialog}
        exercise={{
          id: exercise.id,
          name: exercise.name,
          muscle_group: exercise.muscle_group || undefined,
        }}
      />
    </>
  );
}
