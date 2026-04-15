"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";
import {
  onIdTokenChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  User as FirebaseUser,
} from "firebase/auth";
import {
  AppUserProfile,
  getFirebaseAuth,
  googleProvider,
  ensureUserDocument,
} from "@/lib/firebase";

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  profile: AppUserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<AppUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const hasSyncedCookieForUidRef = useRef<string | null>(null);
  const authEventIdRef = useRef(0);

  useEffect(() => {
    const auth = getFirebaseAuth();
    let unsubscribe: (() => void) | null = null;

    const initAuth = async () => {
      try {
        await getRedirectResult(auth);
      } catch {
        console.error("Error handling redirect result");
      }

      unsubscribe = onIdTokenChanged(auth, (user) => {
        const authEventId = ++authEventIdRef.current;
        setFirebaseUser(user);
        setLoading(false);

        if (user) {
          void (async () => {
            try {
              if (hasSyncedCookieForUidRef.current !== user.uid) {
                const token = await user.getIdToken();
                await fetch("/api/auth/cookie", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ token }),
                });
                hasSyncedCookieForUidRef.current = user.uid;
              }

              const ensured = await ensureUserDocument(user);
              if (authEventId === authEventIdRef.current) {
                setProfile(ensured);
              }
            } catch (error) {
              console.error("Failed to ensure user document or set cookie", error);
              if (authEventId === authEventIdRef.current) {
                setProfile(null);
              }
            }
          })();
        } else {
          if (hasSyncedCookieForUidRef.current) {
            void fetch("/api/auth/cookie", { method: "DELETE" }).catch(() => {
              // best effort cookie cleanup
            });
            hasSyncedCookieForUidRef.current = null;
          }
          setProfile(null);
        }
      });
    };

    initAuth();

    return () => {
      unsubscribe?.();
    };
  }, []);

  const signInWithGoogle = async () => {
    const auth = getFirebaseAuth();

    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: unknown) {
      // Fallback to redirect if popup is blocked or unsupported
      const authError = error as { code?: string };
      if (
        authError.code === "auth/operation-not-supported-in-this-environment" ||
        authError.code === "auth/popup-blocked"
      ) {
        try {
          await signInWithRedirect(auth, googleProvider);
        } catch (redirectError) {
          console.error("Redirect sign-in failed");
          throw redirectError;
        }
      } else if (
        authError.code === "auth/cancelled-popup-request" ||
        authError.code === "auth/popup-closed-by-user"
      ) {
        // User cancelled — do nothing
        return;
      } else {
        throw error;
      }
    }
  };

  const signOutUser = async () => {
    const auth = getFirebaseAuth();
    await signOut(auth);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      firebaseUser,
      profile,
      loading,
      signInWithGoogle,
      signOutUser,
    }),
    [firebaseUser, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return ctx;
}
