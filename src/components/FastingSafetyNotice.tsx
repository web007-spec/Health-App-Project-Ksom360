import { AlertTriangle } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

export function FastingSafetyNotice() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-6 space-y-2">
      <p className="text-xs text-muted-foreground italic text-center">
        This program provides educational guidance only and is not a substitute for medical care.
      </p>
      <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-left hover:bg-destructive/10 transition-colors">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <span className="text-sm font-semibold">Safety & Medical Guidance</span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </CollapsibleTrigger>

      <CollapsibleContent className="rounded-b-xl border border-t-0 border-destructive/20 bg-destructive/5 px-4 pb-4 pt-3 space-y-3">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Fasting is a voluntary nutrition strategy and may not be appropriate for everyone.
        </p>

        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground">Do not begin extended fasting if you:</p>
          <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
            <li>Are pregnant or breastfeeding</li>
            <li>Have a history of eating disorders</li>
            <li>Have uncontrolled diabetes</li>
            <li>Are underweight</li>
            <li>Are managing chronic medical conditions without physician oversight</li>
          </ul>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          If you are taking medications that require food intake, consult your healthcare provider before beginning any fasting protocol.
        </p>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Extended fasts (24 hours or more) should only be performed by experienced individuals, preferably under the guidance of a coach or medical supervision.
        </p>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Listen to your body. If you experience dizziness, fainting, confusion, or severe weakness, break your fast and seek medical advice.
        </p>

        <p className="text-xs font-semibold text-muted-foreground italic">
          KSOM360 promotes structured, intentional fasting — not extreme restriction.
        </p>
      </CollapsibleContent>
    </Collapsible>
    </div>
  );
}
