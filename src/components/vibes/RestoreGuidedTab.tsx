import { useState } from "react";
import { Headphones, Clock, Wind, Brain, Moon, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GuidedSessionPlayer } from "./GuidedSessionPlayer";
import { useIsPremium } from "@/hooks/useIsPremium";
import { PremiumBadge } from "./PremiumOverlay";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  breathwork: Wind,
  focus: Brain,
  wind_down: Moon,
  sleep: Moon,
};

const CATEGORY_LABELS: Record<string, string> = {
  breathwork: "Breathwork",
  focus: "Focus",
  wind_down: "Wind Down",
  sleep: "Sleep",
};

/** Sessions with these names are free for all users */
const FREE_SESSION_NAMES = ["morning boost"];

function isSessionFree(session: any): boolean {
  return FREE_SESSION_NAMES.includes(session.name?.toLowerCase?.() ?? "");
}

interface Props {
  sounds?: any[];
}

export function RestoreGuidedTab({ sounds = [] }: Props) {
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [playerOpen, setPlayerOpen] = useState(false);
  const { isPremium } = useIsPremium();

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["restore-guided-sessions-client"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restore_guided_sessions")
        .select("*, restore_session_voices(*)")
        .eq("is_published", true)
        .order("category")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const categories = [...new Set(sessions.map((s: any) => s.category))];

  const openSession = (session: any) => {
    setSelectedSession(session);
    setPlayerOpen(true);
  };

  return (
    <div className="space-y-5 mt-2">
      <div>
        <h3 className="text-base font-semibold text-white/90">Guided Sessions</h3>
        <p className="text-xs text-white/40 mt-0.5">Breathwork, focus resets, and wind-down routines</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12">
          <Headphones className="h-10 w-10 text-white/20 mx-auto mb-3" />
          <p className="text-sm text-white/40">No guided sessions available yet</p>
          <p className="text-xs text-white/20 mt-1">Your trainer will add sessions soon</p>
        </div>
      ) : (
        categories.map((cat) => {
          const catSessions = sessions.filter((s: any) => s.category === cat);
          const Icon = CATEGORY_ICONS[cat] || Sparkles;
          return (
            <div key={cat} className="space-y-2">
              <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5" />
                {CATEGORY_LABELS[cat] || cat}
              </h4>
              {catSessions.map((session: any) => {
                const bp = session.breathing_pattern as any;
                const durationMin = Math.round(session.duration_seconds / 60);
                const isFree = isSessionFree(session);
                const isLocked = !isPremium && !isFree && session.is_premium;

                return (
                  <button
                    key={session.id}
                    onClick={() => openSession(session)}
                    className={cn(
                      "relative w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-200",
                      "bg-gradient-to-br from-[hsl(260,25%,14%)] to-[hsl(260,20%,10%)]",
                      "border border-white/[0.06] hover:border-[hsl(260,40%,40%)]/40",
                      "active:scale-[0.98]"
                    )}
                  >
                    {isLocked && <PremiumBadge />}
                    <div className="shrink-0 w-12 h-12 rounded-xl bg-[hsl(260,45%,38%)]/20 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-[hsl(260,60%,70%)]" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold text-white/90">{session.name}</p>
                      {session.subtitle && (
                        <p className="text-xs text-white/40 mt-0.5">{session.subtitle}</p>
                      )}
                      {bp && (
                        <p className="text-[10px] text-white/25 mt-0.5">
                          {bp.inhale}-{bp.hold}-{bp.exhale} breathing
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 flex items-center gap-1 text-white/30">
                      <Clock className="h-3 w-3" />
                      <span className="text-[10px] font-medium">{durationMin} min</span>
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })
      )}

      {selectedSession && (
        <GuidedSessionPlayer
          open={playerOpen}
          onOpenChange={setPlayerOpen}
          session={selectedSession}
          sounds={sounds}
          isPremium={isPremium}
          isFree={isSessionFree(selectedSession)}
        />
      )}
    </div>
  );
}
