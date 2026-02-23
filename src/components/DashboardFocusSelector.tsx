import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Leaf, Flame, HeartPulse, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";

const FOCUS_OPTIONS = [
  { id: "balanced", label: "Balanced Lifestyle", icon: Leaf, color: "text-emerald-400", bg: "bg-emerald-500/15" },
  { id: "transformation", label: "Body Transformation", icon: Flame, color: "text-amber-400", bg: "bg-amber-500/15" },
  { id: "longevity", label: "Longevity & Metabolic Health", icon: HeartPulse, color: "text-sky-400", bg: "bg-sky-500/15" },
  { id: "advanced", label: "Advanced Discipline", icon: Target, color: "text-red-400", bg: "bg-red-500/15" },
] as const;

interface DashboardFocusSelectorProps {
  currentFocus: string | null;
}

export function DashboardFocusSelector({ currentFocus }: DashboardFocusSelectorProps) {
  const navigate = useNavigate();
  const active = FOCUS_OPTIONS.find((o) => o.id === currentFocus) || FOCUS_OPTIONS[0];
  const Icon = active.icon;

  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Your Current Focus</p>
        <div className="flex items-center gap-3">
          <div className={`h-9 w-9 rounded-full ${active.bg} flex items-center justify-center shrink-0`}>
            <Icon className={`h-4.5 w-4.5 ${active.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold">{active.label}</h3>
          </div>
        </div>
        <button
          className="text-xs font-semibold text-primary mt-2"
          onClick={() => navigate("/client/choose-protocol")}
        >
          Change Focus
        </button>
      </CardContent>
    </Card>
  );
}
