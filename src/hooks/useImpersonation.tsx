import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSearchParams } from "react-router-dom";

interface ImpersonationContextType {
  /** The effective client ID to use — either the impersonated client or the logged-in user */
  effectiveClientId: string | undefined;
  /** Whether we're currently impersonating a client */
  isImpersonating: boolean;
  /** The impersonated client ID, if any */
  impersonatedClientId: string | null;
  /** Set/clear the impersonated client ID */
  setImpersonatedClientId: (id: string | null) => void;
}

const ImpersonationContext = createContext<ImpersonationContextType>({
  effectiveClientId: undefined,
  isImpersonating: false,
  impersonatedClientId: null,
  setImpersonatedClientId: () => {},
});

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [impersonatedClientId, setImpersonatedClientId] = useState<string | null>(() => {
    return localStorage.getItem("impersonatedClientId");
  });

  useEffect(() => {
    if (impersonatedClientId) {
      localStorage.setItem("impersonatedClientId", impersonatedClientId);
    } else {
      localStorage.removeItem("impersonatedClientId");
    }
  }, [impersonatedClientId]);

  const effectiveClientId = impersonatedClientId || user?.id;

  return (
    <ImpersonationContext.Provider
      value={{
        effectiveClientId,
        isImpersonating: !!impersonatedClientId,
        impersonatedClientId,
        setImpersonatedClientId,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  return useContext(ImpersonationContext);
}
