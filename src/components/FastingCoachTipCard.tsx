import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb, Trophy } from "lucide-react";
import { differenceInCalendarDays } from "date-fns";

const COACH_TIPS = [
  "Stay hydrated during fasting hours.",
  "Start meals with protein.",
  "Consistency matters more than perfection.",
  "Avoid overeating when the fast ends.",
  "Light movement supports fasting comfort.",
  "Sleep supports metabolic recovery.",
  "Eat slowly during your eating window.",
  "Keep meals simple and nutrient-dense.",
  "Listen to true hunger signals.",
  "Finish eating earlier in the evening when possible.",
];

const MILESTONE_MESSAGES: Record<number, string> = {
  1: "You've started your protocol. Focus on consistency this week.",
  3: "Your body is adjusting to fasting rhythm. Stay hydrated.",
  7: "One week complete. Appetite timing should feel more predictable.",
  14: "Two weeks in. Metabolic rhythm is strengthening.",
  21: "Consistency is building. Fasting should feel more natural.",
};

interface FastingCoachTipCardProps {
  protocolStartDate: string | null;
  protocolDurationDays: number | null;
  hideProtocolProgress?: boolean;
}

export function FastingCoachTipCard({ protocolStartDate, protocolDurationDays, hideProtocolProgress }: FastingCoachTipCardProps) {
  // Daily rotating tip
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const tipIndex = dayOfYear % COACH_TIPS.length;
  const tip = COACH_TIPS[tipIndex];

  // Protocol day calculation
  const protocolDay = protocolStartDate
    ? differenceInCalendarDays(new Date(), new Date(protocolStartDate + "T00:00:00")) + 1
    : null;

  // Milestone message
  let milestoneMessage: string | null = null;
  if (protocolDay !== null) {
    if (protocolDurationDays && protocolDay >= protocolDurationDays) {
      milestoneMessage = "Protocol complete. Your metabolic rhythm is stronger and more stable.";
    } else if (MILESTONE_MESSAGES[protocolDay]) {
      milestoneMessage = MILESTONE_MESSAGES[protocolDay];
    }
  }

  return (
    <div className="space-y-3">
      {/* Coach Tip */}
      <Card className="border-primary/15">
        <CardContent className="p-4 flex items-start gap-3">
          <div className="p-1.5 bg-primary/10 rounded-lg shrink-0 mt-0.5">
            <Lightbulb className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Coach Tip</p>
            <p className="text-sm font-medium text-foreground">{tip}</p>
          </div>
        </CardContent>
      </Card>

      {/* Protocol Progress Milestone */}
      {milestoneMessage && !hideProtocolProgress && (
        <Card className="border-primary/15">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="p-1.5 bg-primary/10 rounded-lg shrink-0 mt-0.5">
              <Trophy className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                {protocolDay !== null && protocolDurationDays && protocolDay >= protocolDurationDays
                  ? "Protocol Complete"
                  : `Day ${protocolDay} Milestone`}
              </p>
              <p className="text-sm font-medium text-foreground">{milestoneMessage}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
