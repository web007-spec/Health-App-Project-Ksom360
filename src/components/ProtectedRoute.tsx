import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ("trainer" | "client")[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
      return;
    }

    // Check role-based access
    if (!loading && user && userRole && allowedRoles && allowedRoles.length > 0) {
      if (!allowedRoles.includes(userRole)) {
        // Redirect to appropriate dashboard based on role
        if (userRole === "client") {
          navigate("/client/dashboard");
        } else if (userRole === "trainer") {
          navigate("/");
        }
      }
    }
  }, [user, userRole, loading, navigate, allowedRoles]);

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

  // If role check is required but user doesn't have the right role, show nothing while redirecting
  if (allowedRoles && allowedRoles.length > 0 && userRole && !allowedRoles.includes(userRole)) {
    return null;
  }

  return <>{children}</>;
}
