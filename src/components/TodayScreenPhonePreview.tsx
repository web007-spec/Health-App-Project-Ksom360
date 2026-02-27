import { DashboardCardConfig } from "@/lib/dashboardCards";
import { 
  CalendarDays, Dumbbell, Clock, Leaf, Brain, MessageSquare, 
  Heart, Utensils, BookOpen, Footprints, CheckSquare, TrendingUp, 
  Trophy, Activity 
} from "lucide-react";

const CARD_ICON_MAP: Record<string, { icon: React.ElementType; color: string }> = {
  calendar: { icon: CalendarDays, color: "bg-blue-500/10 text-blue-500" },
  workouts: { icon: Dumbbell, color: "bg-orange-500/10 text-orange-500" },
  fasting: { icon: Clock, color: "bg-purple-500/10 text-purple-500" },
  restore: { icon: Leaf, color: "bg-emerald-500/10 text-emerald-500" },
  engine_cards: { icon: Brain, color: "bg-indigo-500/10 text-indigo-500" },
  coach_tip: { icon: MessageSquare, color: "bg-amber-500/10 text-amber-500" },
  habits: { icon: Heart, color: "bg-pink-500/10 text-pink-500" },
  nutrition: { icon: Utensils, color: "bg-green-500/10 text-green-500" },
  food_journal: { icon: BookOpen, color: "bg-teal-500/10 text-teal-500" },
  step_tracker: { icon: Footprints, color: "bg-cyan-500/10 text-cyan-500" },
  tasks: { icon: CheckSquare, color: "bg-sky-500/10 text-sky-500" },
  progress: { icon: TrendingUp, color: "bg-rose-500/10 text-rose-500" },
  game_stats: { icon: Trophy, color: "bg-yellow-500/10 text-yellow-500" },
  cardio: { icon: Activity, color: "bg-red-500/10 text-red-500" },
};

// Miniature card skeleton shapes for visual variety
function MiniCard({ card }: { card: DashboardCardConfig }) {
  const config = CARD_ICON_MAP[card.key] || { icon: CheckSquare, color: "bg-muted text-muted-foreground" };
  const Icon = config.icon;

  const isWide = ["calendar", "workouts", "fasting", "engine_cards"].includes(card.key);

  return (
    <div className="rounded-md border border-border bg-card p-2 flex items-center gap-2">
      <div className={`shrink-0 rounded p-1 ${config.color}`}>
        <Icon className="h-3 w-3" />
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="text-[9px] font-medium text-foreground truncate leading-none">{card.label}</div>
        {isWide ? (
          <div className="flex gap-1">
            <div className="h-1.5 rounded-full bg-muted flex-1" />
            <div className="h-1.5 rounded-full bg-muted w-1/3" />
          </div>
        ) : (
          <div className="h-1.5 rounded-full bg-muted w-2/3" />
        )}
      </div>
    </div>
  );
}

interface TodayScreenPhonePreviewProps {
  cards: DashboardCardConfig[];
  clientName?: string;
}

export function TodayScreenPhonePreview({ cards, clientName = "Client" }: TodayScreenPhonePreviewProps) {
  const visibleCards = cards.filter(c => c.visible);

  return (
    <div className="sticky top-6">
      <p className="text-xs text-muted-foreground text-center mb-2 font-medium">Live Preview</p>
      <div className="mx-auto w-[260px] rounded-[2rem] border-[6px] border-foreground/80 bg-background shadow-2xl overflow-hidden">
        {/* Status bar */}
        <div className="flex items-center justify-between px-5 py-1.5 bg-foreground/5">
          <span className="text-[10px] font-semibold text-muted-foreground">9:41</span>
          <div className="flex items-center gap-1">
            <div className="w-3.5 h-2 rounded-sm border border-muted-foreground/50">
              <div className="w-2 h-full bg-muted-foreground/50 rounded-sm" />
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="px-4 pt-3 pb-2">
          <p className="text-[10px] text-muted-foreground">Hello,</p>
          <p className="text-sm font-bold text-foreground">{clientName} 👋</p>
          <p className="text-[9px] text-muted-foreground">Let's do this</p>
        </div>

        {/* Cards */}
        <div className="h-[400px] overflow-y-auto scrollbar-hide px-3 pb-4 space-y-1.5">
          {visibleCards.length === 0 ? (
            <p className="text-[10px] text-muted-foreground text-center py-12">All cards hidden</p>
          ) : (
            visibleCards.map((card) => (
              <MiniCard key={card.key} card={card} />
            ))
          )}
        </div>

        {/* Bottom nav */}
        <div className="h-10 bg-foreground/5 flex items-center justify-around px-6 border-t border-border">
          <div className="flex flex-col items-center gap-0.5">
            <div className="w-4 h-3 rounded-sm bg-primary/60" />
            <div className="w-6 h-0.5 rounded-full bg-primary" />
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <div className="w-4 h-3 rounded-sm bg-muted-foreground/30" />
            <div className="w-6 h-0.5 rounded-full bg-transparent" />
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <div className="w-4 h-3 rounded-sm bg-muted-foreground/30" />
            <div className="w-6 h-0.5 rounded-full bg-transparent" />
          </div>
        </div>

        <div className="h-4 bg-foreground/5 flex items-center justify-center">
          <div className="w-20 h-1 rounded-full bg-foreground/20" />
        </div>
      </div>
    </div>
  );
}
