"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  onAuthStateChanged,
  onIdTokenChanged,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { consumeRedirectResult } from "@/lib/firebase/redirectResult";
import {
  deleteAuthSessionCookie,
  postAuthSessionCookieWithRetry,
} from "@/lib/auth/clientSession";
import {
  AppUserProfile,
  ensureUserDocument,
  getFirebaseAuth,
  googleProvider,
} from "@/lib/firebase";
import {
  initialCookieSyncState,
  shouldSyncCookie,
  type CookieSyncState,
} from "@/components/auth/cookieSyncState";
import { mapAuthError, pendingSignInFailureMessage } from "@/components/auth/authErrors";
import {
  isAuthRateLimitError,
  isFatalAuthSessionError,
} from "@/lib/auth/sessionErrors";
import {
  AUTH_PENDING_GRACE_MS,
  clearAuthPendingExpiry,
  clearStaleAuthPending,
  hasPendingSignIn,
  markSignInPending,
} from "@/components/auth/pendingSignIn";
import { signInWithGooglePopupFirst } from "@/components/auth/signInGoogle";
import {
  refreshAuthClaimsFromServer,
  shouldRefreshAuthClaims,
} from "@/lib/auth/clientRefreshClaims";

export type AuthSessionState = {
  firebaseUser: FirebaseUser | null;
  profile: AppUserProfile | null;
  /** Firebase persistence has emitted its first auth state (signed in or out). */
  authReady: boolean;
  loading: boolean;
  authPending: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
};

async function persistSessionCookie(
  token: string,
  syncState: CookieSyncState,
): Promise<CookieSyncState> {
  await postAuthSessionCookieWithRetry(token);
  return { token, expiration: syncState.expiration };
}

export function useAuthSession(): AuthSessionState {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<AppUserProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authPending, setAuthPending] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const cookieSyncStateRef = useRef(initialCookieSyncState);
  const recoveringSessionRef = useRef(false);
  const authEventIdRef = useRef(0);
  const pendingClearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const hasCookieRef = useRef(false);
  const userSessionSyncInFlightRef = useRef(0);
  const claimsSyncedUidRef = useRef<string | null>(null);

  const setPending = useCallback((pending: boolean) => {
    setAuthPending(pending);
    if (pending) {
      markSignInPending();
    } else {
      clearAuthPendingExpiry();
    }
  }, []);

  const clearPendingTimeout = useCallback(() => {
    if (pendingClearTimeoutRef.current) {
      clearTimeout(pendingClearTimeoutRef.current);
      pendingClearTimeoutRef.current = null;
    }
  }, []);

  const schedulePendingFailure = useCallback(() => {
    clearPendingTimeout();
    pendingClearTimeoutRef.current = setTimeout(() => {
      if (!getFirebaseAuth().currentUser) {
        setAuthError(pendingSignInFailureMessage(window.location.hostname));
        setPending(false);
        setLoading(false);
        setAuthReady(true);
        clearAuthPendingExpiry();
      }
    }, AUTH_PENDING_GRACE_MS);
  }, [clearPendingTimeout, setPending]);

  useEffect(() => {
    const auth = getFirebaseAuth();
    let unsubscribe: (() => void) | null = null;
    let bootstrapTimeout: ReturnType<typeof setTimeout> | undefined;

    const finishAuthBootstrap = () => {
      setAuthReady(true);
      setLoading(false);
    };

    const syncUserSession = async (user: FirebaseUser): Promise<void> => {
      if (recoveringSessionRef.current) return;

      const authEventId = ++authEventIdRef.current;
      setAuthError(null);
      setLoading(true);
      userSessionSyncInFlightRef.current += 1;

      try {
        const tokenResult = await user.getIdTokenResult();
        let syncState: CookieSyncState = {
          token: tokenResult.token,
          expiration: tokenResult.expirationTime,
        };

        if (shouldSyncCookie(cookieSyncStateRef.current, syncState)) {
          syncState = await persistSessionCookie(tokenResult.token, syncState);
          cookieSyncStateRef.current = syncState;
          hasCookieRef.current = true;
        }

        const ensured = await ensureUserDocument(user);
        if (authEventId !== authEventIdRef.current) return;

        const needsClaims =
          claimsSyncedUidRef.current !== user.uid ||
          shouldRefreshAuthClaims(tokenResult.claims, ensured.role);

        if (needsClaims) {
          try {
            const refreshed = await refreshAuthClaimsFromServer(user);
            cookieSyncStateRef.current = refreshed;
            hasCookieRef.current = true;
            claimsSyncedUidRef.current = user.uid;
          } catch (claimsError) {
            if (isAuthRateLimitError(claimsError)) {
              throw claimsError;
            }
            console.warn("[auth] Claims sync skipped:", claimsError);
          }
        }

        clearPendingTimeout();
        setPending(false);
        setProfile(ensured);
        setFirebaseUser(user);
        finishAuthBootstrap();
      } catch (error) {
        console.error("Failed to ensure user document or set cookie", error);
        if (authEventId !== authEventIdRef.current) return;

        if (isAuthRateLimitError(error)) {
          setAuthError(
            "Muitas tentativas em pouco tempo. Aguarde cerca de 1 minuto e atualize a página.",
          );
          setProfile(null);
          setFirebaseUser(user);
          setPending(false);
          finishAuthBootstrap();
          return;
        }

        if (!isFatalAuthSessionError(error)) {
          setAuthError(mapAuthError(error));
          setFirebaseUser(user);
          setPending(false);
          finishAuthBootstrap();
          return;
        }

        setAuthError(mapAuthError(error));
        recoveringSessionRef.current = true;
        cookieSyncStateRef.current = initialCookieSyncState;
        claimsSyncedUidRef.current = null;
        setFirebaseUser(null);
        setProfile(null);
        setPending(false);
        finishAuthBootstrap();

        if (hasCookieRef.current) {
          hasCookieRef.current = false;
          try {
            await deleteAuthSessionCookie();
          } catch {
            /* best effort */
          }
        }

        try {
          await signOut(auth);
        } finally {
          recoveringSessionRef.current = false;
        }
      } finally {
        userSessionSyncInFlightRef.current -= 1;
      }
    };

    const handleSignedOut = () => {
      if (userSessionSyncInFlightRef.current > 0) return;

      cookieSyncStateRef.current = initialCookieSyncState;
      claimsSyncedUidRef.current = null;
      setProfile(null);
      setFirebaseUser(null);

      if (hasCookieRef.current) {
        hasCookieRef.current = false;
        void deleteAuthSessionCookie().catch(() => {
          /* best effort */
        });
      }

      if (hasPendingSignIn()) {
        setAuthPending(true);
        schedulePendingFailure();
      } else {
        setPending(false);
      }

      finishAuthBootstrap();
    };

    const initAuth = async () => {
      clearStaleAuthPending();

      if (hasPendingSignIn()) {
        setAuthPending(true);
      } else {
        clearAuthPendingExpiry();
        setPending(false);
      }

      bootstrapTimeout = setTimeout(() => {
        if (!auth.currentUser) {
          clearAuthPendingExpiry();
          setAuthPending(false);
          finishAuthBootstrap();
        }
      }, 10_000);

      await new Promise<void>((resolve) => {
        const unsubReady = onAuthStateChanged(auth, () => {
          unsubReady();
          resolve();
        });
      });

      unsubscribe = onIdTokenChanged(auth, (user) => {
        if (recoveringSessionRef.current && user) return;
        if (user) {
          void syncUserSession(user);
        } else {
          handleSignedOut();
        }
      });

      try {
        const redirectResult = await consumeRedirectResult(auth);
        const userAfterRedirect = redirectResult?.user ?? auth.currentUser;
        if (userAfterRedirect) {
          await syncUserSession(userAfterRedirect);
        }
      } catch (error) {
        console.error("Error handling redirect result", error);
        setAuthError(mapAuthError(error));
        setPending(false);
        finishAuthBootstrap();
        clearAuthPendingExpiry();
      }
    };

    void initAuth();

    return () => {
      if (bootstrapTimeout !== undefined) {
        clearTimeout(bootstrapTimeout);
      }
      clearPendingTimeout();
      unsubscribe?.();
    };
  }, [clearPendingTimeout, schedulePendingFailure, setPending]);

  const signInWithGoogle = useCallback(async () => {
    const auth = getFirebaseAuth();
    setAuthError(null);
    setPending(true);
    setLoading(true);
    setAuthReady(false);

    try {
      await signInWithGooglePopupFirst(auth, googleProvider);
    } catch (error: unknown) {
      const code = (error as { code?: string }).code;
      if (code === "auth/cancelled-popup-request") {
        setAuthError(mapAuthError(error));
        setPending(false);
        setLoading(false);
        setAuthReady(true);
        return;
      }
      setAuthError(mapAuthError(error));
      setPending(false);
      setLoading(false);
      setAuthReady(true);
      throw error;
    }
  }, [setPending]);

  const signOutUser = useCallback(async () => {
    userSessionSyncInFlightRef.current = 0;
    claimsSyncedUidRef.current = null;
    await signOut(getFirebaseAuth());
  }, []);

  return {
    firebaseUser,
    profile,
    authReady,
    loading,
    authPending,
    authError,
    signInWithGoogle,
    signOutUser,
  };
}
