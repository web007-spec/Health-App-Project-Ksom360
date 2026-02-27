import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Clock, Headphones, Moon, BookOpen, Sparkles, TrendingUp } from "lucide-react";
import { useRestoreProfile } from "@/hooks/useRestoreProfile";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  breathwork: Sparkles,
  focus: Sparkles,
  wind_down: Moon,
  sleep: Moon,
};

interface Props {
  onNavigateGuided: () => void;
  onNavigateSleep: () => void;
}

export function RestoreForYouTab({ onNavigateGuided, onNavigateSleep }: Props) {
  const { config } = useRestoreProfile();

  const { data: sessions = [] } = useQuery({
    queryKey: ["restore-guided-for-you"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restore_guided_sessions")
        .select("*, restore_session_voices(*)")
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: stories = [] } = useQuery({
    queryKey: ["restore-sleep-for-you"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restore_sleep_stories")
        .select("*, restore_story_voices(*)")
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const recommendedSessions = useMemo(() => {
    return sessions.slice(0, 3);
  }, [sessions]);

  const recommendedStories = useMemo(() => {
    return stories.slice(0, 3);
  }, [stories]);

  return (
    <div className="space-y-6 mt-2">
      {/* Recommended Guided Sessions */}
      {recommendedSessions.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
              <Headphones className="h-3.5 w-3.5" />
              Recommended
            </h4>
            <button onClick={onNavigateGuided} className="text-[10px] text-white/40 font-medium">
              See all →
            </button>
          </div>
          {recommendedSessions.map((session: any) => {
            const Icon = CATEGORY_ICONS[session.category] || Sparkles;
            const durationMin = Math.round(session.duration_seconds / 60);
            return (
              <button
                key={session.id}
                onClick={onNavigateGuided}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200",
                  "bg-white/[0.03] border border-white/[0.06]",
                  "hover:border-white/[0.12] active:scale-[0.98]"
                )}
              >
                <div
                  className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `hsla(${config.accent}, 0.12)` }}
                >
                  <Icon className="h-4 w-4" style={{ color: `hsl(${config.accentGlow})` }} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-white/85">{session.name}</p>
                  {session.subtitle && <p className="text-xs text-white/35 mt-0.5">{session.subtitle}</p>}
                </div>
                <div className="shrink-0 flex items-center gap-1 text-white/25">
                  <Clock className="h-3 w-3" />
                  <span className="text-[10px] font-medium">{durationMin} min</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Sleep content */}
      {recommendedStories.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
              <Moon className="h-3.5 w-3.5" />
              Sleep
            </h4>
            <button onClick={onNavigateSleep} className="text-[10px] text-white/40 font-medium">
              See all →
            </button>
          </div>
          {recommendedStories.map((story: any) => (
            <button
              key={story.id}
              onClick={onNavigateSleep}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200",
                "bg-white/[0.03] border border-white/[0.06]",
                "hover:border-white/[0.12] active:scale-[0.98]"
              )}
            >
              <div className="shrink-0 w-10 h-10 rounded-lg bg-white/[0.04] flex items-center justify-center">
                {story.story_type === "story" ? (
                  <BookOpen className="h-4 w-4 text-white/25" />
                ) : (
                  <Moon className="h-4 w-4 text-white/25" />
                )}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-white/85">{story.name}</p>
                {story.subtitle && <p className="text-xs text-white/35 mt-0.5">{story.subtitle}</p>}
              </div>
            </button>
          ))}
        </div>
      )}

      {recommendedSessions.length === 0 && recommendedStories.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-white/30">Personalized content will appear here</p>
          <p className="text-xs text-white/15 mt-1">Your trainer is setting things up</p>
        </div>
      )}
    </div>
  );
}
