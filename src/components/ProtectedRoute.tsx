import { useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ("trainer" | "client")[];
}

/**
 * Check synchronously if there's a cached session in localStorage.
 * This lets us skip the loading spinner and redirect immediately
 * when we know there's no session at all (e.g. after preview reloads).
 */
function hasCachedSession(): boolean | null {
  try {
    const storageKey = `sb-eexxmfuknqttujecbcho-auth-token`;
    const raw = localStorage.getItem(storageKey);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return !!(parsed?.access_token || parsed?.user);
  } catch {
    return null; // can't determine, wait for auth
  }
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth", { replace: true });
      return;
    }
  }, [user, loading, navigate]);

  // Fast path: if no cached session at all, redirect immediately
  if (loading && hasCachedSession() === false) {
    return <Navigate to="/auth" replace />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Allow trainers to access client routes while impersonating a client
  const impersonatedClientId = localStorage.getItem("impersonatedClientId");
  const isTrainerImpersonatingClient = userRole === "trainer" && !!impersonatedClientId;

  if (allowedRoles?.includes("client") && isTrainerImpersonatingClient) {
    return <>{children}</>;
  }

  // Enforce role-based access: redirect to the correct dashboard if role doesn't match
  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    const redirectTo = userRole === "client" ? "/client/dashboard" : "/";
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
