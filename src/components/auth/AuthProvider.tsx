"use client";

import {
  createContext,
  useCallback,
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

const AUTH_PENDING_KEY = "tertoct:auth-pending-until";
const AUTH_PENDING_TTL_MS = 60_000;
const AUTH_PENDING_GRACE_MS = 1_800;

/**
 * Safari iOS often clears sessionStorage across the Google OAuth redirect; localStorage
 * survives. Fallback to sessionStorage if localStorage throws (private mode / quota).
 */
function readAuthPendingExpiry(): number {
  if (typeof window === "undefined") return 0;
  try {
    const fromLocal = Number(window.localStorage.getItem(AUTH_PENDING_KEY) ?? 0);
    if (Number.isFinite(fromLocal) && fromLocal > 0) return fromLocal;
  } catch {
    /* ignore */
  }
  try {
    const fromSession = Number(window.sessionStorage.getItem(AUTH_PENDING_KEY) ?? 0);
    return Number.isFinite(fromSession) ? fromSession : 0;
  } catch {
    return 0;
  }
}

function writeAuthPendingExpiry(expiresAt: number): void {
  const value = String(expiresAt);
  try {
    window.localStorage.setItem(AUTH_PENDING_KEY, value);
    return;
  } catch {
    /* fall through */
  }
  try {
    window.sessionStorage.setItem(AUTH_PENDING_KEY, value);
  } catch {
    /* ignore */
  }
}

function clearAuthPendingExpiry(): void {
  try {
    window.localStorage.removeItem(AUTH_PENDING_KEY);
  } catch {
    /* ignore */
  }
  try {
    window.sessionStorage.removeItem(AUTH_PENDING_KEY);
  } catch {
    /* ignore */
  }
}

function shouldUseRedirectSignIn() {
  if (typeof window === "undefined") return false;

  const ua = window.navigator.userAgent.toLowerCase();
  const platform = window.navigator.platform.toLowerCase();
  const maxTouchPoints = window.navigator.maxTouchPoints ?? 0;
  const isAndroid = ua.includes("android");
  const isIos = /iphone|ipad|ipod/.test(ua);

  const userAgentData = (
    navigator as Navigator & { userAgentData?: { mobile?: boolean } }
  ).userAgentData;
  if (userAgentData?.mobile === true) {
    return true;
  }

  // Chrome DevTools device emulation usually keeps Windows/macOS platform while spoofing a
  // mobile UA. Real Android phones almost always report platform as "Linux ..."; treating
  // "linux" as dev emulation incorrectly forced signInWithPopup, which breaks on phones.
  const isChromeDevtoolsMobileEmulation =
    maxTouchPoints > 0 &&
    (isAndroid || isIos) &&
    (platform.includes("win") || platform.includes("mac"));

  return (isAndroid || isIos) && maxTouchPoints > 0 && !isChromeDevtoolsMobileEmulation;
}

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  profile: AppUserProfile | null;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<AppUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authPending, setAuthPendingState] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const cookieSyncStateRef = useRef(initialCookieSyncState);
  const recoveringSessionRef = useRef(false);
  const authEventIdRef = useRef(0);
  const pendingClearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  // Track whether we have actually written a session cookie so we only
  // send DELETE when there is something to delete (avoids rate-limit spam
  // on every unauthenticated page load).
  const hasCookieRef = useRef(false);

  const setAuthPending = useCallback((pending: boolean) => {
    setAuthPendingState(pending);
    if (typeof window === "undefined") return;

    if (pending) {
      writeAuthPendingExpiry(Date.now() + AUTH_PENDING_TTL_MS);
      return;
    }

    clearAuthPendingExpiry();
  }, []);

  const getAuthErrorMessage = useCallback((error: unknown) => {
    const authError = error as { code?: string; message?: string };

    switch (authError.code) {
      case "permission-denied":
        return "Não foi possível sincronizar seu cadastro (permissão negada). Tente de novo ou fale com o suporte.";
      case "auth/unauthorized-domain":
        return "Este domínio não está autorizado no Firebase Authentication.";
      case "auth/operation-not-allowed":
        return "Login com Google não está habilitado no Firebase Authentication.";
      case "auth/popup-blocked":
        return "O navegador bloqueou o pop-up de login.";
      case "auth/popup-closed-by-user":
        return "O login foi fechado antes de concluir.";
      case "auth/network-request-failed":
        return "Falha de rede durante o login. Tente novamente.";
      default:
        return authError.message ?? "Não foi possível concluir o login.";
    }
  }, []);

  useEffect(() => {
    const auth = getFirebaseAuth();
    let unsubscribe: (() => void) | null = null;

    const initAuth = async () => {
      const pendingUntil = readAuthPendingExpiry();
      const hasPendingSignIn = pendingUntil > Date.now();
      if (hasPendingSignIn) {
        setAuthPendingState(true);
      } else {
        clearAuthPendingExpiry();
      }

      try {
        await getRedirectResult(auth);
      } catch (error) {
        console.error("Error handling redirect result", error);
        setAuthError(getAuthErrorMessage(error));
        setAuthPending(false);
        setLoading(false);
      }

      unsubscribe = onIdTokenChanged(auth, (user) => {
        const authEventId = ++authEventIdRef.current;
        if (recoveringSessionRef.current && user) {
          return;
        }

        if (user) {
          setAuthError(null);
          setLoading(true);
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
                  credentials: "same-origin",
                  body: JSON.stringify({ token }),
                });
                if (!cookieResponse.ok) {
                  let detail = `Sessão HTTP ${cookieResponse.status}`;
                  try {
                    const body = (await cookieResponse.json()) as {
                      error?: string;
                    };
                    if (body?.error) detail = `${detail}: ${body.error}`;
                  } catch {
                    /* ignore non-JSON error bodies */
                  }
                  throw new Error(detail);
                }
                cookieSyncStateRef.current = nextSyncState;
                hasCookieRef.current = true;
              }

              const ensured = await ensureUserDocument(user);
              if (authEventId === authEventIdRef.current) {
                if (pendingClearTimeoutRef.current) {
                  clearTimeout(pendingClearTimeoutRef.current);
                  pendingClearTimeoutRef.current = null;
                }
                setAuthPending(false);
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
                setAuthError(getAuthErrorMessage(error));
                recoveringSessionRef.current = true;
                cookieSyncStateRef.current = initialCookieSyncState;
                setFirebaseUser(null);
                setProfile(null);
                setAuthPending(false);
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
          cookieSyncStateRef.current = initialCookieSyncState;
          setProfile(null);
          setFirebaseUser(null);
          if (hasCookieRef.current) {
            hasCookieRef.current = false;
            void fetch("/api/auth/cookie", { method: "DELETE" }).catch(() => {
              // best effort cookie cleanup
            });
          }
          const pendingUntil = readAuthPendingExpiry();
          if (pendingUntil > Date.now()) {
            setAuthPendingState(true);
            pendingClearTimeoutRef.current = setTimeout(() => {
              if (!getFirebaseAuth().currentUser) {
                setAuthPending(false);
                setLoading(false);
              }
            }, AUTH_PENDING_GRACE_MS);
            return;
          }
          setAuthPending(false);
          setLoading(false);
        }
      });
    };

    initAuth();

    return () => {
      if (pendingClearTimeoutRef.current) {
        clearTimeout(pendingClearTimeoutRef.current);
      }
      unsubscribe?.();
    };
  }, [getAuthErrorMessage, setAuthPending]);

  const signInWithGoogle = useCallback(async () => {
    const auth = getFirebaseAuth();
    setAuthError(null);
    setAuthPending(true);
    setLoading(true);

    try {
      if (shouldUseRedirectSignIn()) {
        await signInWithRedirect(auth, googleProvider);
        return;
      }

      await signInWithPopup(auth, googleProvider);
    } catch (error: unknown) {
      // Fallback to redirect if popup is blocked or unsupported
      const authError = error as { code?: string };
      if (
        authError.code === "auth/operation-not-supported-in-this-environment" ||
        authError.code === "auth/popup-blocked" ||
        authError.code === "auth/popup-closed-by-user"
      ) {
        try {
          await signInWithRedirect(auth, googleProvider);
        } catch (redirectError) {
          console.error("Redirect sign-in failed");
          setAuthError(getAuthErrorMessage(redirectError));
          setAuthPending(false);
          setLoading(false);
          throw redirectError;
        }
      } else if (authError.code === "auth/cancelled-popup-request") {
        // User cancelled — do nothing
        setAuthError(getAuthErrorMessage(error));
        setAuthPending(false);
        setLoading(false);
        return;
      } else {
        setAuthError(getAuthErrorMessage(error));
        setAuthPending(false);
        setLoading(false);
        throw error;
      }
    }
  }, [getAuthErrorMessage, setAuthPending]);

  const signOutUser = useCallback(async () => {
    const auth = getFirebaseAuth();
    await signOut(auth);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      firebaseUser,
      profile,
      loading: loading || authPending,
      authError,
      signInWithGoogle,
      signOutUser,
    }),
    [
      firebaseUser,
      profile,
      loading,
      authPending,
      authError,
      signInWithGoogle,
      signOutUser,
    ],
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
