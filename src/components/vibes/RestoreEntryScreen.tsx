import { useRestoreProfile } from "@/hooks/useRestoreProfile";
import { cn } from "@/lib/utils";

/**
 * Restore State Header — Engine-aware top section.
 * Shows headline, subtitle, and optional readiness badge.
 * No mood chips, no section navigation.
 */
export function RestoreStateHeader() {
  const { config } = useRestoreProfile();

  return (
    <div className="space-y-1 pt-2">
      <h1
        className="text-2xl font-bold tracking-tight text-white/95"
        style={{ letterSpacing: "-0.02em" }}
      >
        {config.headline}
      </h1>
      <p className="text-sm text-white/40 font-light tracking-wide">
        {config.subtitle}
      </p>
    </div>
  );
}
