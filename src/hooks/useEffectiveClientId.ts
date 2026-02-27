import { useAuth } from "@/hooks/useAuth";

/**
 * Returns the effective client ID for client-side pages.
 * Priority: ?previewClientId query param > localStorage impersonation > logged-in user.
 */
export function useEffectiveClientId() {
  const { user, userRole } = useAuth();

  // Check for preview query param (used by live phone preview iframe)
  const params = new URLSearchParams(window.location.search);
  const previewClientId = params.get("previewClientId");
  if (previewClientId) {
    return previewClientId;
  }

  const impersonatedId = localStorage.getItem("impersonatedClientId");

  // Allow impersonation when trainer role is confirmed OR still loading (null)
  // to avoid race conditions where role has not resolved yet.
  if (impersonatedId && (userRole === "trainer" || userRole === null)) {
    return impersonatedId;
  }

  return user?.id;
}
