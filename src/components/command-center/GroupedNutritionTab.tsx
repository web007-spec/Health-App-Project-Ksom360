import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, BookOpen, Activity, UtensilsCrossed } from "lucide-react";
import { ClientFoodJournalTab } from "./ClientFoodJournalTab";
import { ClientMacrosTab } from "./ClientMacrosTab";
import { ClientMealPlanTab } from "./ClientMealPlanTab";

interface GroupedNutritionTabProps {
  clientId: string;
  trainerId: string;
}

const sections = [
  { key: "food-journal", label: "Food Journal", icon: BookOpen },
  { key: "macros", label: "Macros", icon: Activity },
  { key: "meal-plan", label: "Meal Plan", icon: UtensilsCrossed },
] as const;

export function GroupedNutritionTab({ clientId, trainerId }: GroupedNutritionTabProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    "food-journal": true,
    macros: false,
    "meal-plan": false,
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
            {key === "food-journal" && <ClientFoodJournalTab clientId={clientId} />}
            {key === "macros" && <ClientMacrosTab clientId={clientId} trainerId={trainerId} />}
            {key === "meal-plan" && <ClientMealPlanTab clientId={clientId} trainerId={trainerId} />}
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
}
