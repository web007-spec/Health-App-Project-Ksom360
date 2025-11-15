import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
}

export function ExerciseCard({ exercise }: ExerciseCardProps) {
  const [showVideoDialog, setShowVideoDialog] = useState(false);

  const getVideoEmbedUrl = (url: string | null) => {
    if (!url) return null;
    
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

  return (
    <>
      <Card className="group overflow-hidden hover:shadow-lg transition-shadow">
        <div className="relative aspect-video bg-muted overflow-hidden">
          {exercise.image_url ? (
            <img 
              src={exercise.image_url} 
              alt={exercise.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
              <span className="text-4xl font-bold text-primary/20">{exercise.name.charAt(0)}</span>
            </div>
          )}
          
          {exercise.video_url && (
            <button
              onClick={() => setShowVideoDialog(true)}
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
          <h3 className="font-semibold text-lg text-foreground line-clamp-1">{exercise.name}</h3>
          
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
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{exercise.name}</DialogTitle>
          </DialogHeader>
          {embedUrl && (
            <div className="aspect-video">
              <iframe
                src={embedUrl}
                className="w-full h-full rounded-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
