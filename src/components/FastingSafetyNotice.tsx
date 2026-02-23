import { AlertTriangle } from "lucide-react";

export function FastingSafetyNotice() {
  return (
    <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 space-y-3 mt-6">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
        <h3 className="font-bold text-sm">Important Safety Notice</h3>
      </div>

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
    </div>
  );
}
