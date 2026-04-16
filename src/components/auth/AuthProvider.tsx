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
import {
  initialCookieSyncState,
  shouldSyncCookie,
} from "@/components/auth/cookieSyncState";

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
  const cookieSyncStateRef = useRef(initialCookieSyncState);
  const recoveringSessionRef = useRef(false);
  const authEventIdRef = useRef(0);
  // Track whether we have actually written a session cookie so we only
  // send DELETE when there is something to delete (avoids rate-limit spam
  // on every unauthenticated page load).
  const hasCookieRef = useRef(false);

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
        if (recoveringSessionRef.current && user) {
          return;
        }

        if (user) {
          void (async () => {
            try {
              const tokenResult = await user.getIdTokenResult();
              const token = tokenResult.token;
              const tokenExpiry = tokenResult.expirationTime;
              const nextSyncState = { token, expiration: tokenExpiry };
              const mustSyncCookie = shouldSyncCookie(
                cookieSyncStateRef.current,
                nextSyncState,
              );

              if (mustSyncCookie) {
                const cookieResponse = await fetch("/api/auth/cookie", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ token }),
                });
                if (!cookieResponse.ok) {
                  throw new Error("Cookie sync failed");
                }
                cookieSyncStateRef.current = nextSyncState;
                hasCookieRef.current = true;
              }

              const ensured = await ensureUserDocument(user);
              if (authEventId === authEventIdRef.current) {
                setProfile(ensured);
                // Expose the user and stop loading ONLY after the cookie is securely mapped.
                // This prevents the page.tsx useEffect from redirecting to /dashboard prematurely
                // before the middleware in Next.js can read the cookie.
                setFirebaseUser(user);
                setLoading(false);
              }
            } catch (error) {
              console.error("Failed to ensure user document or set cookie", error);
              if (authEventId === authEventIdRef.current) {
                recoveringSessionRef.current = true;
                cookieSyncStateRef.current = initialCookieSyncState;
                setFirebaseUser(null);
                setProfile(null);
                setLoading(false);
                if (hasCookieRef.current) {
                  hasCookieRef.current = false;
                  try {
                    await fetch("/api/auth/cookie", { method: "DELETE" });
                  } catch {
                    // best effort cookie cleanup
                  }
                }
                try {
                  await signOut(auth);
                } finally {
                  recoveringSessionRef.current = false;
                }
              }
            }
          })();
        } else {
          if (hasCookieRef.current) {
            hasCookieRef.current = false;
            void fetch("/api/auth/cookie", { method: "DELETE" }).catch(() => {
              // best effort cookie cleanup
            });
          }
          cookieSyncStateRef.current = initialCookieSyncState;
          setProfile(null);
          setFirebaseUser(null);
          setLoading(false);
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
