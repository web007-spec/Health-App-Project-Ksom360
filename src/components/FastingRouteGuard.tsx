import { Navigate } from "react-router-dom";
import { useEngineMode } from "@/hooks/useEngineMode";

/**
 * Wraps fasting-related routes to block athletic engine users.
 * Athletic users are redirected to the plans page.
 */
export function FastingRouteGuard({ children }: { children: React.ReactNode }) {
  const { config, isLoading } = useEngineMode();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (config.fastingDisabled) {
    return <Navigate to="/client/choose-protocol" replace />;
  }

  return <>{children}</>;
}
