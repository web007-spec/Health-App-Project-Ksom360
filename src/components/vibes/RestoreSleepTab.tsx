import { Moon, Clock, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const PLACEHOLDER_STORIES = [
  { id: "ocean-drift", name: "Ocean Drift", subtitle: "Gentle waves carrying you to sleep", duration: "30 min", type: "Story" },
  { id: "forest-night", name: "Forest at Night", subtitle: "Crickets and rustling leaves", duration: "45 min", type: "Long Loop" },
  { id: "rain-on-roof", name: "Rain on a Tin Roof", subtitle: "Steady rain for deep sleep", duration: "60 min", type: "Long Loop" },
];

interface Props {
  sounds: any[];
  mixer: any;
}

export function RestoreSleepTab({ sounds, mixer }: Props) {
  return (
    <div className="space-y-4 mt-2">
      <div>
        <h3 className="text-base font-semibold text-white/90">Sleep</h3>
        <p className="text-xs text-white/40 mt-0.5">Sleep stories and long ambient loops</p>
      </div>

      {/* Sleep stories placeholder */}
      <div className="space-y-3">
        {PLACEHOLDER_STORIES.map((story) => (
          <div
            key={story.id}
            className={cn(
              "flex items-center gap-4 p-4 rounded-2xl",
              "bg-gradient-to-br from-[hsl(240,25%,12%)] to-[hsl(240,20%,8%)]",
              "border border-white/[0.06]"
            )}
          >
            <div className="shrink-0 w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center">
              {story.type === "Story" ? (
                <BookOpen className="h-5 w-5 text-indigo-400/70" />
              ) : (
                <Moon className="h-5 w-5 text-indigo-400/70" />
              )}
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-white/90">{story.name}</p>
              <p className="text-xs text-white/40 mt-0.5">{story.subtitle}</p>
            </div>
            <div className="shrink-0 flex flex-col items-end gap-0.5">
              <span className="text-[10px] font-medium text-white/30 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {story.duration}
              </span>
              <span className="text-[9px] text-white/20 uppercase tracking-wider">{story.type}</span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-[11px] text-white/20 pt-2">
        Upload stories and loops via the admin dashboard
      </p>
    </div>
  );
}
