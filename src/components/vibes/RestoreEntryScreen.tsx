import { useState, useEffect } from "react";
import { Moon, Sun, Sunrise, CloudSun, Sparkles, Music2, Headphones } from "lucide-react";
import { cn } from "@/lib/utils";

type TimeOfDay = "morning" | "midday" | "evening" | "night";

function getTimeOfDay(): TimeOfDay {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "midday";
  if (h >= 17 && h < 21) return "evening";
  return "night";
}

const TIME_CONFIG: Record<TimeOfDay, { icon: React.ElementType; greeting: string; sub: string; gradient: string }> = {
  morning: {
    icon: Sunrise,
    greeting: "Good Morning",
    sub: "Start your day with intention",
    gradient: "from-amber-950/40 via-orange-950/20 to-transparent",
  },
  midday: {
    icon: Sun,
    greeting: "Stay Focused",
    sub: "Power through your afternoon",
    gradient: "from-sky-950/30 via-blue-950/20 to-transparent",
  },
  evening: {
    icon: CloudSun,
    greeting: "Wind Down",
    sub: "Ease into the evening",
    gradient: "from-purple-950/40 via-violet-950/20 to-transparent",
  },
  night: {
    icon: Moon,
    greeting: "Good Night",
    sub: "Rest deeply tonight",
    gradient: "from-indigo-950/50 via-slate-950/30 to-transparent",
  },
};

export type RestoreSection = "home" | "guided" | "sleep" | "soundlab";
export type Mood = "energized" | "calm" | "stressed" | "tired" | null;

const MOOD_OPTIONS: { value: Exclude<Mood, null>; emoji: string; label: string }[] = [
  { value: "energized", emoji: "⚡", label: "Energized" },
  { value: "calm", emoji: "😌", label: "Calm" },
  { value: "stressed", emoji: "😰", label: "Stressed" },
  { value: "tired", emoji: "😴", label: "Tired" },
];

interface SectionDef {
  id: RestoreSection;
  label: string;
  icon: React.ElementType;
  description: string;
}

const SECTIONS: SectionDef[] = [
  { id: "home", label: "For You", icon: Sparkles, description: "Personalized picks" },
  { id: "guided", label: "Guided", icon: Headphones, description: "Breathwork & focus" },
  { id: "sleep", label: "Sleep", icon: Moon, description: "Stories & long loops" },
  { id: "soundlab", label: "Sound Lab", icon: Music2, description: "Build your mix" },
];

interface Props {
  activeSection: RestoreSection;
  onSectionChange: (section: RestoreSection) => void;
  mood: Mood;
  onMoodChange: (mood: Mood) => void;
}

export function RestoreEntryScreen({ activeSection, onSectionChange, mood, onMoodChange }: Props) {
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(getTimeOfDay);

  useEffect(() => {
    const interval = setInterval(() => setTimeOfDay(getTimeOfDay()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const config = TIME_CONFIG[timeOfDay];
  const TimeIcon = config.icon;

  return (
    <div className="space-y-5">
      {/* Time-of-day header */}
      <div className={cn("relative rounded-2xl overflow-hidden p-5", "bg-gradient-to-br", config.gradient)}>
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(260,30%,10%)] to-[hsl(260,20%,6%)] -z-10" />
        <div className="flex items-center gap-3 mb-1">
          <TimeIcon className="h-6 w-6 text-amber-400/80" />
          <h2 className="text-xl font-bold text-white/95 tracking-tight">{config.greeting}</h2>
        </div>
        <p className="text-sm text-white/50 ml-9">{config.sub}</p>

        {/* Mood check-in */}
        <div className="mt-4 ml-9">
          <p className="text-[10px] uppercase tracking-widest text-white/30 mb-2">How are you feeling?</p>
          <div className="flex gap-2">
            {MOOD_OPTIONS.map((m) => {
              const isActive = mood === m.value;
              return (
                <button
                  key={m.value}
                  onClick={() => onMoodChange(isActive ? null : m.value)}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-medium transition-all duration-200",
                    "active:scale-[0.95]",
                    isActive
                      ? "bg-white/15 text-white/90 ring-1 ring-white/20"
                      : "bg-white/[0.04] text-white/40 hover:bg-white/[0.08]"
                  )}
                >
                  <span className="text-sm">{m.emoji}</span>
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Section navigation */}
      <div className="grid grid-cols-4 gap-2">
        {SECTIONS.map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => onSectionChange(sec.id)}
              className={cn(
                "flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all duration-200",
                "active:scale-[0.96]",
                isActive
                  ? "bg-[hsl(260,45%,38%)]/20 ring-1 ring-[hsl(260,45%,50%)]/40"
                  : "bg-white/[0.03] hover:bg-white/[0.06]"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive ? "text-[hsl(260,60%,70%)]" : "text-white/40")} />
              <span className={cn("text-[11px] font-semibold", isActive ? "text-white/90" : "text-white/50")}>
                {sec.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
