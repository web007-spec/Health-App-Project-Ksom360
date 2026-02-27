import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";
import { TIER_DISPLAY, type SubscriptionTier } from "@/lib/featureAccessGuard";

interface LockedFeatureBadgeProps {
  requiredTier: SubscriptionTier;
  onClick?: () => void;
  className?: string;
}

export function LockedFeatureBadge({ requiredTier, onClick, className }: LockedFeatureBadgeProps) {
  const tierLabel = TIER_DISPLAY[requiredTier]?.label || requiredTier;

  return (
    <Badge
      variant="outline"
      className={`gap-1 cursor-pointer hover:bg-muted/80 transition-colors text-muted-foreground border-muted-foreground/30 ${className || ""}`}
      onClick={onClick}
    >
      <Lock className="h-3 w-3" />
      <span className="text-[10px]">{tierLabel}</span>
    </Badge>
  );
}
