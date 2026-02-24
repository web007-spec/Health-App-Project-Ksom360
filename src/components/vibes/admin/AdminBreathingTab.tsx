import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, ArrowLeft } from "lucide-react";
import { BREATHING_EXERCISES, type BreathingExercise } from "@/lib/breathingExercises";
import { BreathingPlayer } from "@/components/vibes/BreathingPlayer";

export function AdminBreathingTab() {
  const [previewExercise, setPreviewExercise] = useState<BreathingExercise | null>(null);

  if (previewExercise) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setPreviewExercise(null)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to list
        </Button>
        <div className="max-w-md mx-auto rounded-2xl overflow-hidden relative" style={{ aspectRatio: "9/16", background: "hsl(220, 25%, 5%)" }}>
          <BreathingPlayer
            exercise={previewExercise}
            onBack={() => setPreviewExercise(null)}
            contained
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {BREATHING_EXERCISES.length} exercises available for clients in the Restore → Breathe tab
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {BREATHING_EXERCISES.map((ex) => (
          <Card key={ex.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{ex.icon}</div>
                  <div>
                    <p className="font-semibold">{ex.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{ex.description}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setPreviewExercise(ex)}
                  title="Preview"
                >
                  <Play className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {ex.phases.map((phase, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {phase.label} {phase.seconds}s
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs capitalize">{ex.animation}</Badge>
                <span className="text-xs text-muted-foreground">
                  {ex.phases.reduce((s, p) => s + p.seconds, 0)}s per cycle
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
