import { useAuth } from "@/hooks/useAuth";

/**
 * Returns the effective client ID for client-side pages.
 * When a trainer is impersonating a client (stored in localStorage),
 * this returns the impersonated client's ID instead of the logged-in user's ID.
 */
export function useEffectiveClientId() {
  const { user, userRole } = useAuth();
  
  // Only trainers can impersonate
  if (userRole === "trainer") {
    const impersonatedId = localStorage.getItem("impersonatedClientId");
    if (impersonatedId) return impersonatedId;
  }
  
  return user?.id;
}
