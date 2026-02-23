import { Card, CardContent } from "@/components/ui/card";

const INSIGHTS = [
  {
    text: "Fasting is not about punishment. It is about control over habits, timing, and consistency.",
  },
  {
    text: "Consistency builds metabolic resilience. Progression follows stability. Recovery is part of performance.",
  },
  {
    text: "You do not need the hardest plan. You need the plan you can repeat.",
  },
  {
    text: "Discipline compounds. Results follow. Small daily wins create visible change.",
  },
  {
    text: "Choose the level that supports your life — not one that disrupts it. Intensity without recovery is regression.",
  },
  {
    text: "Every completed fast builds metabolic resilience, appetite awareness, discipline, and confidence.",
  },
  {
    text: "We do not chase extremes. We build consistency, recovery, longevity, and structure.",
  },
];

export function DashboardInsightCard() {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  const insight = INSIGHTS[dayOfYear % INSIGHTS.length];

  return (
    <Card className="border-border/40 bg-card">
      <CardContent className="p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Daily Insight</p>
        <p className="text-xs text-muted-foreground leading-relaxed italic">
          {insight.text}
        </p>
      </CardContent>
    </Card>
  );
}
