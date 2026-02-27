import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Shield, TrendingUp, Zap, AlertTriangle } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Tier {
  level: string;
  icon: React.ReactNode;
  plans: string[];
  focus: string;
  primaryGoal: string;
  borderColor: string;
  badgeClass: string;
}

const TIERS: Tier[] = [
  {
    level: "Beginner",
    icon: <Shield className="h-4 w-4" />,
    plans: ["11:13", "12:12", "13:11", "14:10"],
    focus: "Establish meal timing structure and reduce grazing behavior.",
    primaryGoal: "Build metabolic rhythm and hunger awareness.",
    borderColor: "border-emerald-500/30",
    badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  {
    level: "Intermediate",
    icon: <TrendingUp className="h-4 w-4" />,
    plans: ["15:9", "16:8", "17:7", "18:6"],
    focus: "Improve insulin sensitivity and fat adaptation.",
    primaryGoal: "Stabilize energy and strengthen appetite control.",
    borderColor: "border-amber-500/30",
    badgeClass: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  },
  {
    level: "Advanced",
    icon: <Zap className="h-4 w-4" />,
    plans: ["19:5", "20:4", "21:3", "22:2", "23:1 (OMAD)"],
    focus: "Increase metabolic flexibility and reduce daily meal frequency.",
    primaryGoal: "Precision, control, and efficiency.",
    borderColor: "border-red-500/30",
    badgeClass: "bg-red-500/15 text-red-400 border-red-500/30",
  },
  {
    level: "Extended Fasts",
    icon: <AlertTriangle className="h-4 w-4" />,
    plans: ["24-Hour", "36-Hour", "42-Hour", "48-Hour", "72-Hour"],
    focus: "Strategic metabolic reset and appetite recalibration.",
    primaryGoal: "Occasional deep adaptation under supervision.",
    borderColor: "border-destructive/30",
    badgeClass: "bg-destructive/15 text-destructive border-destructive/30",
  },
];

export function FastingStructureComparison() {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full rounded-xl border border-border bg-card px-4 py-3 text-left hover:bg-muted/50 transition-colors">
        <div>
          <p className="text-sm font-bold">Fasting Structure Comparison</p>
          <p className="text-xs text-muted-foreground">Quick plan overview by experience level</p>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0 ${open ? "rotate-180" : ""}`}
        />
      </CollapsibleTrigger>

      <CollapsibleContent className="rounded-b-xl border border-t-0 border-border bg-card px-4 pb-5 pt-4 space-y-5">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Choose your fasting structure based on experience level, metabolic tolerance, and recovery capacity.
          </p>
          <p className="text-xs font-semibold text-muted-foreground">
            Progress gradually. Consistency matters more than intensity.
          </p>
        </div>

        {/* Tier Cards */}
        <div className="space-y-3">
          {TIERS.map((tier) => (
            <Card key={tier.level} className={`border ${tier.borderColor} bg-background/50`}>
              <CardContent className="p-3 space-y-2.5">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-xs ${tier.badgeClass}`}>
                    {tier.icon}
                    <span className="ml-1">{tier.level}</span>
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {tier.plans.map((plan) => (
                    <span
                      key={plan}
                      className="text-xs font-mono px-2 py-0.5 rounded-md bg-muted/80 text-foreground/80"
                    >
                      {plan}
                    </span>
                  ))}
                </div>

                <div className="space-y-1 pt-0.5">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground/70">Focus:</span> {tier.focus}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground/70">Goal:</span> {tier.primaryGoal}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Progression Guidance */}
        <div className="space-y-2 border-t border-border pt-4">
          <p className="text-xs font-bold text-foreground/80">Progression Guidance</p>
          <p className="text-xs font-semibold text-destructive/80">Do not skip levels.</p>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-semibold">Advance only when:</p>
            <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
              <li>Hunger is stable</li>
              <li>Energy remains consistent</li>
              <li>Sleep quality is maintained</li>
              <li>You can complete your current plan comfortably for 10–14 days</li>
            </ul>
          </div>
          <p className="text-xs text-muted-foreground italic">
            Metabolic adaptation requires time.
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
