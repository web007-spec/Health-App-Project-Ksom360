import { useAuth } from "@/hooks/useAuth";

/**
 * Returns the effective client ID for client-side pages.
 * When a trainer is impersonating a client (stored in localStorage),
 * this returns the impersonated client's ID instead of the logged-in user's ID.
 */
export function useEffectiveClientId() {
  const { user, userRole } = useAuth();

  const impersonatedId = localStorage.getItem("impersonatedClientId");

  // Allow impersonation when trainer role is confirmed OR still loading (null)
  // to avoid race conditions where role has not resolved yet.
  if (impersonatedId && (userRole === "trainer" || userRole === null)) {
    return impersonatedId;
  }

  return user?.id;
}
