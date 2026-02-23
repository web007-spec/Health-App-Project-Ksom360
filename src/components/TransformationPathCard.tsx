import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const WEEKLY_MILESTONES = [
  { week: "Week 1", insight: "You notice structure replacing chaos." },
  { week: "Week 2", insight: "Hunger becomes predictable." },
  { week: "Week 3", insight: "Energy stabilizes between meals." },
  { week: "Week 4", insight: "You feel in control — not reactive." },
];

const PILLARS = ["Consistency", "Recovery", "Longevity", "Structure"];

export function TransformationPathCard() {
  return (
    <Card className="border-border/60 bg-card">
      <CardContent className="px-4 py-5 space-y-5">
        {/* Header */}
        <div className="space-y-2">
          <h2 className="text-lg font-bold tracking-tight">Your Transformation Path</h2>
          <div className="space-y-1.5 text-xs text-muted-foreground leading-relaxed">
            <p>Fasting is not about punishment.<br />It is about control.</p>
            <p>
              Not control over food —<br />
              Control over habits, timing, and consistency.
            </p>
          </div>
        </div>

        <Separator className="opacity-40" />

        {/* Builds */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground/80">Every completed fast builds:</p>
          <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
            <li>Metabolic resilience</li>
            <li>Appetite awareness</li>
            <li>Discipline</li>
            <li>Confidence</li>
          </ul>
          <p className="text-xs text-muted-foreground italic">
            Small daily wins create visible change.
          </p>
        </div>

        <Separator className="opacity-40" />

        {/* Weekly milestones */}
        <div className="space-y-2.5">
          <p className="text-xs font-bold text-foreground/80">What Real Transformation Looks Like</p>
          <div className="space-y-2">
            {WEEKLY_MILESTONES.map((m) => (
              <div key={m.week} className="flex gap-3 items-start">
                <span className="text-xs font-mono font-semibold text-foreground/60 w-14 shrink-0">
                  {m.week}
                </span>
                <span className="text-xs text-muted-foreground">{m.insight}</span>
              </div>
            ))}
          </div>
        </div>

        <Separator className="opacity-40" />

        {/* KSOM360 Difference */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-foreground/80">The KSOM360 Difference</p>
          <p className="text-xs text-muted-foreground">We do not chase extremes.</p>
          <div className="flex flex-wrap gap-2 pt-0.5">
            {PILLARS.map((p) => (
              <span
                key={p}
                className="text-xs font-mono px-2.5 py-1 rounded-md bg-muted/80 text-foreground/70"
              >
                {p}
              </span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground italic">
            Visible results follow stable systems.
          </p>
        </div>

        <Separator className="opacity-40" />

        {/* Reminder */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-foreground/80">
            You do not need the hardest plan.
          </p>
          <p className="text-xs text-muted-foreground">You need the plan you can repeat.</p>
          <p className="text-xs font-semibold text-foreground/60 pt-1 tracking-wide">
            Discipline compounds. Results follow.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
