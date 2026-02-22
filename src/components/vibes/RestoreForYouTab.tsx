import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Clock, Headphones, Moon, BookOpen, Wind, Brain, Sparkles, TrendingUp } from "lucide-react";
import type { Mood } from "./RestoreEntryScreen";

type TimeOfDay = "morning" | "midday" | "evening" | "night";

function getTimeOfDay(): TimeOfDay {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "midday";
  if (h >= 17 && h < 21) return "evening";
  return "night";
}

/** Map mood + time-of-day to recommended guided session categories */
const MOOD_SESSION_MAP: Record<Exclude<Mood, null>, string[]> = {
  energized: ["focus", "breathwork"],
  calm: ["breathwork", "wind_down"],
  stressed: ["breathwork", "wind_down"],
  tired: ["wind_down", "sleep"],
};

const TIME_SESSION_MAP: Record<TimeOfDay, string[]> = {
  morning: ["breathwork", "focus"],
  midday: ["focus", "breathwork"],
  evening: ["wind_down", "sleep"],
  night: ["sleep", "wind_down"],
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  breathwork: Wind,
  focus: Brain,
  wind_down: Moon,
  sleep: Moon,
};

interface Props {
  mood: Mood;
  sounds: any[];
  mixer: any;
  onNavigateGuided: () => void;
  onNavigateSleep: () => void;
}

export function RestoreForYouTab({ mood, sounds, mixer, onNavigateGuided, onNavigateSleep }: Props) {
  const timeOfDay = getTimeOfDay();

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
    const preferredCats = mood ? MOOD_SESSION_MAP[mood] : TIME_SESSION_MAP[timeOfDay];
    const sorted = [...sessions].sort((a: any, b: any) => {
      const aIdx = preferredCats.indexOf(a.category);
      const bIdx = preferredCats.indexOf(b.category);
      const aScore = aIdx >= 0 ? aIdx : 99;
      const bScore = bIdx >= 0 ? bIdx : 99;
      return aScore - bScore;
    });
    return sorted.slice(0, 3);
  }, [sessions, mood, timeOfDay]);

  const recommendedStories = useMemo(() => {
    if (timeOfDay === "morning" || timeOfDay === "midday") {
      return stories.slice(0, 2);
    }
    // Evening/night: prioritize stories
    return stories.slice(0, 3);
  }, [stories, timeOfDay]);

  const moodTip = useMemo(() => {
    if (!mood) return null;
    const tips: Record<Exclude<Mood, null>, string> = {
      energized: "Channel that energy — try a focus session or build an upbeat mix.",
      calm: "Perfect state for breathwork or a gentle wind-down session.",
      stressed: "Take a breath — we recommend a guided breathwork session.",
      tired: "Rest up — a sleep story or long loop might be just what you need.",
    };
    return tips[mood];
  }, [mood]);

  const showSleepSection = timeOfDay === "evening" || timeOfDay === "night" || mood === "tired";

  return (
    <div className="space-y-6 mt-2">
      {/* Mood-based tip */}
      {moodTip && (
        <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[hsl(260,30%,14%)] border border-[hsl(260,40%,30%)]/20">
          <Sparkles className="h-4 w-4 text-[hsl(260,60%,70%)] shrink-0 mt-0.5" />
          <p className="text-xs text-white/60 leading-relaxed">{moodTip}</p>
        </div>
      )}

      {/* Recommended Guided Sessions */}
      {recommendedSessions.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
              <Headphones className="h-3.5 w-3.5" />
              Recommended for you
            </h4>
            <button onClick={onNavigateGuided} className="text-[10px] text-[hsl(260,60%,70%)] font-medium">
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
                  "w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-200",
                  "bg-gradient-to-br from-[hsl(260,25%,14%)] to-[hsl(260,20%,10%)]",
                  "border border-white/[0.06] hover:border-[hsl(260,40%,40%)]/40",
                  "active:scale-[0.98]"
                )}
              >
                <div className="shrink-0 w-10 h-10 rounded-xl bg-[hsl(260,45%,38%)]/20 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-[hsl(260,60%,70%)]" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-white/90">{session.name}</p>
                  {session.subtitle && <p className="text-xs text-white/40 mt-0.5">{session.subtitle}</p>}
                </div>
                <div className="shrink-0 flex items-center gap-1 text-white/30">
                  <Clock className="h-3 w-3" />
                  <span className="text-[10px] font-medium">{durationMin} min</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Sleep content — prominent at night */}
      {showSleepSection && recommendedStories.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
              <Moon className="h-3.5 w-3.5" />
              {timeOfDay === "night" ? "Tonight's picks" : "Sleep & Relax"}
            </h4>
            <button onClick={onNavigateSleep} className="text-[10px] text-[hsl(260,60%,70%)] font-medium">
              See all →
            </button>
          </div>
          {recommendedStories.map((story: any) => (
            <button
              key={story.id}
              onClick={onNavigateSleep}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-200",
                "bg-gradient-to-br from-[hsl(240,25%,12%)] to-[hsl(240,20%,8%)]",
                "border border-white/[0.06] hover:border-indigo-500/30",
                "active:scale-[0.98]"
              )}
            >
              <div className="shrink-0 w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                {story.story_type === "story" ? (
                  <BookOpen className="h-4 w-4 text-indigo-400/70" />
                ) : (
                  <Moon className="h-4 w-4 text-indigo-400/70" />
                )}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-white/90">{story.name}</p>
                {story.subtitle && <p className="text-xs text-white/40 mt-0.5">{story.subtitle}</p>}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Weekly Recovery Summary */}
      <RestoreWeeklySummary />

      {/* Fallback when nothing to show */}
      {recommendedSessions.length === 0 && recommendedStories.length === 0 && (
        <div className="text-center py-12">
          <Sparkles className="h-10 w-10 text-white/20 mx-auto mb-3" />
          <p className="text-sm text-white/40">Personalized content will appear here</p>
          <p className="text-xs text-white/20 mt-1">Your trainer is setting things up</p>
        </div>
      )}
    </div>
  );
}

/** Lightweight weekly recovery summary card */
function RestoreWeeklySummary() {
  // For now, show a static motivational card. 
  // Future: pull actual usage data from a restore_usage_log table.
  return (
    <div className="rounded-2xl overflow-hidden border border-white/[0.06]">
      <div className="p-4 bg-gradient-to-br from-[hsl(260,25%,14%)] to-[hsl(260,20%,10%)]">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-4 w-4 text-emerald-400/70" />
          <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider">Weekly Recovery</h4>
        </div>
        <p className="text-sm text-white/80 leading-relaxed">
          Take a moment to restore each day. Even 5 minutes of breathwork or a short sleep story can make a difference.
        </p>
        <div className="flex gap-4 mt-3">
          {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className={cn(
                "w-6 h-6 rounded-full border",
                i < new Date().getDay() 
                  ? "border-emerald-500/30 bg-emerald-500/10"
                  : "border-white/10 bg-white/[0.02]"
              )} />
              <span className="text-[9px] text-white/30">{day}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
