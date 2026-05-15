"use client";

import { createContext, useContext, ReactNode } from "react";
import {
  useAuthSession,
  type AuthSessionState,
} from "@/components/auth/useAuthSession";
import { E2eAuthBridge } from "@/components/auth/E2eAuthBridge";

const AuthContext = createContext<AuthSessionState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const session = useAuthSession();
  return (
    <AuthContext.Provider value={session}>
      <E2eAuthBridge />
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthSessionState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
