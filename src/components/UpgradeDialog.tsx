import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Sparkles } from "lucide-react";
import {
  TIER_COMPARISON,
  TIER_DISPLAY,
  getUpgradeCopy,
  type SubscriptionTier,
  type TierComparisonRow,
} from "@/lib/featureAccessGuard";
import type { EngineMode } from "@/lib/engineConfig";

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTier: SubscriptionTier;
  requiredTier?: SubscriptionTier;
  engineMode?: EngineMode;
}

const TIER_ORDER: SubscriptionTier[] = ["starter", "pro", "elite", "enterprise"];

export function UpgradeDialog({
  open,
  onOpenChange,
  currentTier,
  requiredTier,
  engineMode = "performance",
}: UpgradeDialogProps) {
  const copy = getUpgradeCopy(engineMode);
  const highlightTier = requiredTier || (currentTier === "starter" ? "pro" : "elite");

  const CellValue = ({ value }: { value: boolean | string }) => {
    if (typeof value === "string") {
      return <span className="text-xs font-medium text-foreground">{value}</span>;
    }
    return value ? (
      <Check className="h-4 w-4 text-primary mx-auto" />
    ) : (
      <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            {copy.headline}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">{copy.subtext}</p>
        </DialogHeader>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4 text-muted-foreground font-medium text-xs">Feature</th>
                {TIER_ORDER.map((t) => (
                  <th
                    key={t}
                    className={`text-center py-2 px-2 text-xs font-medium ${
                      t === highlightTier
                        ? "text-primary"
                        : t === currentTier
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="capitalize">{TIER_DISPLAY[t].label}</span>
                      {t === currentTier && (
                        <Badge variant="secondary" className="text-[9px] px-1 py-0">
                          Current
                        </Badge>
                      )}
                      {t === highlightTier && t !== currentTier && (
                        <Badge className="text-[9px] px-1 py-0 bg-primary text-primary-foreground">
                          Recommended
                        </Badge>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIER_COMPARISON.map((row, i) => (
                <tr
                  key={row.feature}
                  className={`border-b border-border/50 ${i % 2 === 0 ? "bg-muted/20" : ""}`}
                >
                  <td className="py-2.5 pr-4 text-xs text-foreground">{row.feature}</td>
                  {TIER_ORDER.map((t) => (
                    <td
                      key={t}
                      className={`text-center py-2.5 px-2 ${
                        t === highlightTier ? "bg-primary/5" : ""
                      }`}
                    >
                      <CellValue value={row[t]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex gap-3 mt-4">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Maybe Later
          </Button>
          <Button className="flex-1">
            Upgrade to {TIER_DISPLAY[highlightTier].label}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
