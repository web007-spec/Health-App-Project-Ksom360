import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Dumbbell, Play } from "lucide-react";

interface AddWorkoutTypePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectRegular: () => void;
  onSelectVideo: () => void;
}

export function AddWorkoutTypePicker({
  open,
  onOpenChange,
  onSelectRegular,
  onSelectVideo,
}: AddWorkoutTypePickerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Create an on-demand workout</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 pt-2">
          <button
            onClick={() => {
              onOpenChange(false);
              onSelectRegular();
            }}
            className="flex flex-col items-center justify-center gap-3 p-6 rounded-lg border-2 border-border hover:border-primary/50 hover:bg-accent transition-all text-center cursor-pointer"
          >
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
              <Dumbbell className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Regular Workout</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Add a workout from your Library that your clients can track
              </p>
            </div>
          </button>

          <button
            onClick={() => {
              onOpenChange(false);
              onSelectVideo();
            }}
            className="flex flex-col items-center justify-center gap-3 p-6 rounded-lg border-2 border-border hover:border-primary/50 hover:bg-accent transition-all text-center cursor-pointer"
          >
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
              <Play className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Video Workout</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Add a video for on-demand access, perfect for skills training or recorded workout routines
              </p>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
