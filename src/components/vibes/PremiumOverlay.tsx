import { Lock, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface Props {
  /** Label for what's locked, e.g. "Sleep Stories" */
  label?: string;
  /** Compact mode for inline cards vs full-section overlay */
  compact?: boolean;
  /** Optional class overrides */
  className?: string;
}

/**
 * Soft premium overlay — does NOT hard-redirect.
 * Shows a lock indicator and CTA to upgrade.
 */
export function PremiumOverlay({ label, compact = false, className }: Props) {
  const navigate = useNavigate();

  if (compact) {
    return (
      <div
        className={cn(
          "absolute inset-0 z-10 flex items-center justify-center rounded-2xl",
          "bg-black/50 backdrop-blur-[2px]",
          className
        )}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate("/client/settings?tab=subscription");
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-[10px] font-semibold uppercase tracking-wider hover:bg-amber-500/30 transition-colors"
        >
          <Crown className="h-3 w-3" />
          Premium
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-10 px-6 text-center",
        className
      )}
    >
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-400/20 flex items-center justify-center mb-4">
        <Lock className="h-7 w-7 text-amber-400/70" />
      </div>
      <h4 className="text-sm font-bold text-white/90 mb-1">
        {label || "Premium Content"}
      </h4>
      <p className="text-xs text-white/40 mb-4 max-w-[240px] leading-relaxed">
        Upgrade to unlock full access to {label?.toLowerCase() || "this content"} and more.
      </p>
      <button
        onClick={() => navigate("/client/settings?tab=subscription")}
        className={cn(
          "flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold",
          "bg-gradient-to-r from-amber-500 to-amber-600 text-black",
          "hover:from-amber-400 hover:to-amber-500 transition-all duration-200",
          "shadow-[0_0_20px_rgba(245,158,11,0.2)]"
        )}
      >
        <Crown className="h-3.5 w-3.5" />
        Upgrade to Premium
      </button>
    </div>
  );
}

/**
 * Inline premium badge for cards/tiles — small lock icon overlay
 */
export function PremiumBadge({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "absolute top-1.5 right-1.5 z-10 w-5 h-5 rounded-full",
        "bg-amber-500/20 border border-amber-400/30 flex items-center justify-center",
        className
      )}
    >
      <Crown className="h-2.5 w-2.5 text-amber-400" />
    </div>
  );
}
