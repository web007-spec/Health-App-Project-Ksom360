import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Dumbbell, CalendarDays, MonitorPlay } from "lucide-react";
import { ClientTrainingTab } from "./ClientTrainingTab";
import { ClientCalendarTab } from "./ClientCalendarTab";
import { ClientOnDemandTab } from "./ClientOnDemandTab";

interface GroupedTrainingTabProps {
  clientId: string;
  trainerId: string;
}

const sections = [
  { key: "training", label: "Workouts", icon: Dumbbell },
  { key: "calendar", label: "Calendar", icon: CalendarDays },
  { key: "on-demand", label: "On-Demand", icon: MonitorPlay },
] as const;

export function GroupedTrainingTab({ clientId, trainerId }: GroupedTrainingTabProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    training: true,
    calendar: false,
    "on-demand": false,
  });

  const toggle = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="space-y-4">
      {sections.map(({ key, label, icon: Icon }) => (
        <Collapsible key={key} open={openSections[key]} onOpenChange={() => toggle(key)}>
          <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
            <Icon className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm flex-1 text-left">{label}</span>
            {openSections[key] ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            {key === "training" && <ClientTrainingTab clientId={clientId} trainerId={trainerId} />}
            {key === "calendar" && <ClientCalendarTab clientId={clientId} trainerId={trainerId} />}
            {key === "on-demand" && <ClientOnDemandTab clientId={clientId} trainerId={trainerId} />}
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
}
