import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Leaf, Flame, HeartPulse, Target } from "lucide-react";

interface FocusOption {
  id: string;
  label: string;
  subtitle: string;
  range: string;
  focus: string;
  icon: React.ElementType;
  borderColor: string;
  iconBg: string;
  iconColor: string;
  badgeClass: string;
}

const FOCUS_OPTIONS: FocusOption[] = [
  {
    id: "balanced",
    label: "Balanced Lifestyle",
    subtitle: "I want structure without extreme restriction.",
    range: "12:12 – 16:8",
    focus: "Sustainable routine, steady energy, better meal timing.",
    icon: Leaf,
    borderColor: "border-emerald-500/40",
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-400",
    badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  {
    id: "transformation",
    label: "Body Transformation",
    subtitle: "I want visible fat loss and stronger metabolic change.",
    range: "16:8 – 20:4",
    focus: "Fat adaptation, appetite control, structured discipline.",
    icon: Flame,
    borderColor: "border-amber-500/40",
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-400",
    badgeClass: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  },
  {
    id: "longevity",
    label: "Longevity & Metabolic Health",
    subtitle: "I want deeper cellular and metabolic support.",
    range: "18:6 – 24 Hour",
    focus: "Metabolic flexibility, insulin control, recovery emphasis.",
    icon: HeartPulse,
    borderColor: "border-sky-500/40",
    iconBg: "bg-sky-500/15",
    iconColor: "text-sky-400",
    badgeClass: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  },
  {
    id: "advanced",
    label: "Advanced Discipline",
    subtitle: "I am experienced and comfortable with extended fasting.",
    range: "20:4 – 23:1 + Extended",
    focus: "Precision, structure, and high metabolic efficiency.",
    icon: Target,
    borderColor: "border-red-500/40",
    iconBg: "bg-red-500/15",
    iconColor: "text-red-400",
    badgeClass: "bg-red-500/15 text-red-400 border-red-500/30",
  },
];

interface Props {
  selected: string | null;
  onSelect: (id: string | null) => void;
}

export function LifestylePlanSelector({ selected, onSelect }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-xl font-bold">Choose Your Focus</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Your fasting structure should match your current goal — not your ego.
        </p>
      </div>

      <div className="space-y-2.5">
        {FOCUS_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isActive = selected === opt.id;
          return (
            <Card
              key={opt.id}
              className={`cursor-pointer border transition-all duration-200 ${
                isActive
                  ? `${opt.borderColor} ring-1 ring-offset-0 ring-current/10 bg-muted/40`
                  : "border-border hover:bg-muted/20"
              }`}
              onClick={() => onSelect(isActive ? null : opt.id)}
            >
              <CardContent className="px-4 py-3.5 space-y-2">
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-full ${opt.iconBg} flex items-center justify-center shrink-0`}>
                    <Icon className={`h-4.5 w-4.5 ${opt.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm">{opt.label}</h3>
                    <p className="text-xs text-muted-foreground">{opt.subtitle}</p>
                  </div>
                </div>

                {isActive && (
                  <div className="pl-12 space-y-1.5 pt-1">
                    <Badge variant="outline" className={`text-xs ${opt.badgeClass}`}>
                      {opt.range}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground/70">Focus:</span> {opt.focus}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground italic pt-1">
        Choose the level that supports your life — not one that disrupts it.
        <br />
        <span className="font-semibold">Intensity without recovery is regression.</span>
      </p>
    </div>
  );
}
