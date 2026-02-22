import { useState } from "react";
import { Moon, Clock, BookOpen, Headphones } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SleepStoryPlayer } from "./SleepStoryPlayer";

interface Props {
  sounds: any[];
  mixer: any;
}

export function RestoreSleepTab({ sounds, mixer }: Props) {
  const [selectedStory, setSelectedStory] = useState<any>(null);
  const [playerOpen, setPlayerOpen] = useState(false);

  const { data: stories = [], isLoading } = useQuery({
    queryKey: ["restore-sleep-stories-client"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restore_sleep_stories")
        .select("*, restore_story_voices(*)")
        .eq("is_published", true)
        .order("story_type")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const storyItems = stories.filter((s: any) => s.story_type === "story");
  const loopItems = stories.filter((s: any) => s.story_type === "long_loop");

  const openStory = (story: any) => {
    setSelectedStory(story);
    setPlayerOpen(true);
  };

  const renderCard = (story: any) => {
    const durationMin = Math.round(story.duration_seconds / 60);
    return (
      <button
        key={story.id}
        onClick={() => openStory(story)}
        className={cn(
          "w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-200",
          "bg-gradient-to-br from-[hsl(240,25%,12%)] to-[hsl(240,20%,8%)]",
          "border border-white/[0.06] hover:border-indigo-500/30",
          "active:scale-[0.98]"
        )}
      >
        <div className="shrink-0 w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center">
          {story.story_type === "story" ? (
            <BookOpen className="h-5 w-5 text-indigo-400/70" />
          ) : (
            <Moon className="h-5 w-5 text-indigo-400/70" />
          )}
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-white/90">{story.name}</p>
          {story.subtitle && (
            <p className="text-xs text-white/40 mt-0.5">{story.subtitle}</p>
          )}
        </div>
        <div className="shrink-0 flex flex-col items-end gap-0.5">
          <span className="text-[10px] font-medium text-white/30 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {durationMin} min
          </span>
          <span className="text-[9px] text-white/20 uppercase tracking-wider">
            {story.story_type === "story" ? "Story" : "Loop"}
          </span>
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-5 mt-2">
      <div>
        <h3 className="text-base font-semibold text-white/90">Sleep</h3>
        <p className="text-xs text-white/40 mt-0.5">Sleep stories and long ambient loops</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : stories.length === 0 ? (
        <div className="text-center py-12">
          <Moon className="h-10 w-10 text-white/20 mx-auto mb-3" />
          <p className="text-sm text-white/40">No sleep content available yet</p>
          <p className="text-xs text-white/20 mt-1">Your trainer will add stories soon</p>
        </div>
      ) : (
        <>
          {storyItems.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" />
                Sleep Stories
              </h4>
              {storyItems.map(renderCard)}
            </div>
          )}
          {loopItems.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
                <Moon className="h-3.5 w-3.5" />
                Long Loops
              </h4>
              {loopItems.map(renderCard)}
            </div>
          )}
        </>
      )}

      {selectedStory && (
        <SleepStoryPlayer
          open={playerOpen}
          onOpenChange={setPlayerOpen}
          story={selectedStory}
          sounds={sounds}
        />
      )}
    </div>
  );
}
