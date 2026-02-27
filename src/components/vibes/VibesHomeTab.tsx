import { useState, useMemo, useEffect } from "react";
import { StaggeredTileGrid } from "./StaggeredTileGrid";
import { SessionCard } from "./SessionCard";
import { cn } from "@/lib/utils";
import { BRAINWAVE_DEFS, BrainwaveType } from "@/lib/syntheticSounds";
import { GUIDED_SESSIONS } from "@/lib/guidedSessions";
import { Check, Crown } from "lucide-react";
import { useIsPremium } from "@/hooks/useIsPremium";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const MODES = [
  { label: "Morning", value: "morning" },
  { label: "Focus", value: "focus" },
  { label: "Night", value: "night" },
] as const;

type Mode = (typeof MODES)[number]["value"];

const STATIC_HOME_CATEGORIES = [
  { label: "Featured", value: "featured" },
];

const MODE_SORT_TAGS: Record<Mode, string[]> = {
  morning: ["nature", "musical"],
  focus: ["brainwaves", "colored-noise"],
  night: ["nature", "brainwaves"],
};

const MODE_RECOMMENDED_BW: Record<Mode, BrainwaveType> = {
  morning: "beta",
  focus: "alpha",
  night: "theta",
};

const STORAGE_KEY = "vibes-mode";

function loadMode(): Mode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && MODES.some((m) => m.value === v)) return v as Mode;
  } catch {}
  return "focus";
}

interface Props {
  sounds: any[];
  mixer: any;
}

export function VibesHomeTab({ sounds, mixer }: Props) {
  const { isPremium } = useIsPremium();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>(loadMode);
  const [activeCategory, setActiveCategory] = useState("featured");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const { data: dbTags = [] } = useQuery({
    queryKey: ["vibes-tags"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vibes_tags").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const CATEGORIES = useMemo(() => [
    ...STATIC_HOME_CATEGORIES,
    ...dbTags.map((t: any) => ({ label: t.name, value: t.slug })),
  ], [dbTags]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const modeHeader: Record<Mode, { title: string; sub: string }> = {
    morning: { title: "Good Morning", sub: "Start your day with uplifting sounds" },
    focus: { title: "Focus Session", sub: "Lock in with deep concentration" },
    night: { title: "Wind Down", sub: "Ease into restful calm" },
  };

  const { title: timeLabel, sub: modeSub } = modeHeader[mode];

  const filtered = useMemo(() => {
    if (activeCategory === "brainwaves") return [];
    let list: any[];
    if (activeCategory === "featured") {
      list = sounds.filter((s) => s.is_featured);
      const preferred = MODE_SORT_TAGS[mode];
      list.sort((a, b) => {
        const aScore = (a.tags || []).some((t: string) => preferred.includes(t)) ? 0 : 1;
        const bScore = (b.tags || []).some((t: string) => preferred.includes(t)) ? 0 : 1;
        return aScore - bScore;
      });
    } else {
      list = sounds.filter((s) => (s.tags || []).includes(activeCategory));
    }
    return list;
  }, [sounds, activeCategory, mode]);

  const activeLayers = (mixer.mixItems?.length || 0) + (mixer.brainwave ? 1 : 0);

  const handleToggle = (s: any) =>
    mixer.toggleSound({ id: s.id, name: s.name, audioUrl: s.audio_url, iconUrl: s.icon_url });

  // Default brainwave priority
  const defaultPriority = ["alpha", "beta", "theta", "gamma", "delta"];
  const recommended = (defaultPriority[0] || "alpha") as BrainwaveType;
  const activeBw = mixer.brainwave?.type as BrainwaveType | undefined;

  const handleApplySession = async (session: typeof GUIDED_SESSIONS[number]) => {
    setActiveSessionId(session.id);
    await mixer.applySession(session, sounds);
  };

  return (
    <div className="space-y-4 mt-4 rounded-xl px-1 transition-colors duration-300">
      {/* Sessions row */}
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
        {GUIDED_SESSIONS.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            isActive={activeSessionId === session.id}
            onTap={() => handleApplySession(session)}
          />
        ))}
      </div>

      <div>
        <p className="text-lg font-semibold mb-1">{timeLabel}</p>
        <p className="text-sm text-muted-foreground">
          {activeLayers > 0
            ? `${activeLayers} sound${activeLayers !== 1 ? "s" : ""} in your mix`
            : modeSub}
        </p>
      </div>

      {/* Mode segmented control */}
      <div className="flex rounded-lg bg-white/[0.04] p-1 gap-0.5 border border-white/[0.06]">
        {MODES.map((m) => (
          <button
            key={m.value}
            onClick={() => setMode(m.value)}
            className={cn(
              "flex-1 text-xs font-medium py-1.5 rounded-md transition-all duration-200",
              mode === m.value
                ? "bg-white/[0.10] text-white/90 shadow-sm"
                : "text-white/35 hover:text-white/55"
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-all duration-200 border",
              activeCategory === cat.value
                ? "bg-white/[0.10] text-white/90 border-white/[0.15]"
                : "bg-transparent text-white/40 border-white/[0.06] hover:border-white/[0.12] hover:text-white/60"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="animate-fade-in" key={`${mode}-${activeCategory}`}>
        {activeCategory === "brainwaves" ? (
          <div className="grid grid-cols-2 gap-3 px-2">
            {(Object.entries(BRAINWAVE_DEFS) as [BrainwaveType, typeof BRAINWAVE_DEFS[BrainwaveType]][])
              .sort(([a], [b]) => {
                const aIdx = defaultPriority.indexOf(a);
                const bIdx = defaultPriority.indexOf(b);
                return (aIdx < 0 ? 99 : aIdx) - (bIdx < 0 ? 99 : bIdx);
              })
              .map(([type, def]) => {
              const isActive = activeBw === type;
              const isRecommended = recommended === type;
              const isBwFree = type === "alpha";
              const isBwLocked = !isPremium && !isBwFree;
              return (
                <button
                  key={type}
                  onClick={() => {
                    if (isBwLocked) {
                      navigate("/client/settings?tab=subscription");
                      return;
                    }
                    isActive ? mixer.removeBrainwave() : mixer.setBrainwave(type);
                  }}
                  className={cn(
                    "relative flex flex-col items-center gap-2 py-5 px-3 rounded-xl transition-all duration-200 border",
                    "bg-white/[0.03]",
                    "active:scale-[0.97]",
                    isBwLocked && "opacity-60",
                    isActive
                      ? "ring-1 ring-white/30 border-white/20"
                      : isRecommended
                        ? "border-white/[0.10]"
                        : "border-white/[0.06]"
                  )}
                >
                  {isBwLocked && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-amber-500/20 border border-amber-400/30 flex items-center justify-center">
                      <Crown className="h-2.5 w-2.5 text-amber-400" />
                    </div>
                  )}
                  {isRecommended && !isActive && !isBwLocked && (
                    <span className="absolute top-2 right-2 text-[9px] font-semibold uppercase tracking-wider text-white/30">
                      Rec
                    </span>
                  )}
                  <span className="text-2xl">{def.icon}</span>
                  <span className="text-sm font-semibold text-white/90">{def.label}</span>
                  <span className="text-[10px] text-white/35">{def.description}</span>
                  {isActive && (
                    <div className="absolute bottom-2 right-2 w-[14px] h-[14px] rounded-full bg-white/30 flex items-center justify-center">
                      <Check className="w-[8px] h-[8px] text-white stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ) : filtered.length > 0 ? (
          <StaggeredTileGrid
            sounds={filtered}
            isActiveCheck={(id) => mixer.isSoundActive(id)}
            onToggle={handleToggle}
          />
        ) : (
          <p className="text-center text-white/30 py-8 text-sm">No sounds in this category yet</p>
        )}
      </div>
    </div>
  );
}
