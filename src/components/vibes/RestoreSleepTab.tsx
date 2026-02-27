import { useState } from "react";
import { Moon, Clock, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SleepStoryPlayer } from "./SleepStoryPlayer";
import { useIsPremium } from "@/hooks/useIsPremium";
import { PremiumBadge } from "./PremiumOverlay";
import { useRestoreProfile } from "@/hooks/useRestoreProfile";

interface Props {
  sounds: any[];
  mixer: any;
}

export function RestoreSleepTab({ sounds, mixer }: Props) {
  const [selectedStory, setSelectedStory] = useState<any>(null);
  const [playerOpen, setPlayerOpen] = useState(false);
  const { isPremium } = useIsPremium();
  const { config } = useRestoreProfile();

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

  const openStory = (story: any) => {
    setSelectedStory(story);
    setPlayerOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-white/90 tracking-tight">
          {config.sleepTone.headline}
        </h3>
        <p className="text-xs text-white/35 max-w-sm">
          {config.sleepTone.sub}
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-[3/4] rounded-xl bg-white/[0.04] animate-pulse" />
          ))}
        </div>
      ) : stories.length === 0 ? (
        <div className="text-center py-16">
          <Moon className="h-8 w-8 text-white/15 mx-auto mb-3" />
          <p className="text-sm text-white/30">No sleep content available yet</p>
          <p className="text-xs text-white/15 mt-1">Your trainer will add stories soon</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {stories.map((story: any) => {
            const durationMin = Math.round(story.duration_seconds / 60);
            const isLocked = !isPremium && story.is_premium;
            const isStory = story.story_type === "story";

            return (
              <button
                key={story.id}
                onClick={() => openStory(story)}
                className={cn(
                  "relative flex flex-col rounded-xl overflow-hidden transition-all duration-200",
                  "bg-white/[0.03] border border-white/[0.06]",
                  "hover:border-white/[0.12] active:scale-[0.98]",
                  "text-left"
                )}
              >
                {isLocked && <PremiumBadge />}

                {/* Cover area */}
                <div
                  className="aspect-[4/3] w-full flex items-center justify-center"
                  style={{
                    background: isStory
                      ? "linear-gradient(135deg, hsl(230,25%,12%) 0%, hsl(240,20%,8%) 100%)"
                      : "linear-gradient(135deg, hsl(210,20%,10%) 0%, hsl(220,25%,7%) 100%)",
                  }}
                >
                  {isStory ? (
                    <BookOpen className="h-8 w-8 text-white/15" />
                  ) : (
                    <Moon className="h-8 w-8 text-white/15" />
                  )}
                </div>

                {/* Info */}
                <div className="p-3 space-y-1">
                  <p className="text-sm font-medium text-white/85 line-clamp-2 leading-tight">
                    {story.name}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/30 flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {durationMin} min
                    </span>
                    <span className="text-[9px] text-white/20 uppercase tracking-wider">
                      {isStory ? "Story" : "Loop"}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedStory && (
        <SleepStoryPlayer
          open={playerOpen}
          onOpenChange={setPlayerOpen}
          story={selectedStory}
          sounds={sounds}
          isPremium={isPremium}
        />
      )}
    </div>
  );
}
