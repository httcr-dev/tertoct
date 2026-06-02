"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  onIdTokenChanged,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { consumeRedirectResult } from "@/lib/firebase/redirectResult";
import {
  deleteAuthSessionCookie,
  postAuthSessionCookie,
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
} from "@/components/auth/cookieSyncState";
import { mapAuthError, pendingSignInFailureMessage } from "@/components/auth/authErrors";
import {
  AUTH_PENDING_GRACE_MS,
  clearAuthPendingExpiry,
  clearStaleAuthPending,
  hasPendingSignIn,
  markSignInPending,
} from "@/components/auth/pendingSignIn";
import { signInWithGooglePopupFirst } from "@/components/auth/signInGoogle";
import { refreshAuthClaimsFromServer } from "@/lib/auth/clientRefreshClaims";

export type AuthSessionState = {
  firebaseUser: FirebaseUser | null;
  profile: AppUserProfile | null;
  loading: boolean;
  authPending: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
};

export function useAuthSession(): AuthSessionState {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<AppUserProfile | null>(null);
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
        clearAuthPendingExpiry();
      }
    }, AUTH_PENDING_GRACE_MS);
  }, [clearPendingTimeout, setPending]);

  useEffect(() => {
    const auth = getFirebaseAuth();
    let unsubscribe: (() => void) | null = null;
    let bootstrapTimeout: ReturnType<typeof setTimeout> | undefined;

    const syncUserSession = async (user: FirebaseUser): Promise<void> => {
      if (recoveringSessionRef.current) return;

      const authEventId = ++authEventIdRef.current;
      setAuthError(null);
      setLoading(true);
      userSessionSyncInFlightRef.current += 1;

      try {
        const tokenResult = await user.getIdTokenResult();
        const nextSyncState = {
          token: tokenResult.token,
          expiration: tokenResult.expirationTime,
        };

        if (shouldSyncCookie(cookieSyncStateRef.current, nextSyncState)) {
          await postAuthSessionCookie(tokenResult.token);
          cookieSyncStateRef.current = nextSyncState;
          hasCookieRef.current = true;
        }

        const ensured = await ensureUserDocument(user);
        if (authEventId !== authEventIdRef.current) return;

        try {
          await refreshAuthClaimsFromServer();
          const refreshed = await user.getIdTokenResult(true);
          if (shouldSyncCookie(cookieSyncStateRef.current, {
            token: refreshed.token,
            expiration: refreshed.expirationTime,
          })) {
            await postAuthSessionCookie(refreshed.token);
            cookieSyncStateRef.current = {
              token: refreshed.token,
              expiration: refreshed.expirationTime,
            };
            hasCookieRef.current = true;
          }
        } catch (claimsError) {
          console.warn("[auth] Claims sync skipped:", claimsError);
        }

        clearPendingTimeout();
        setPending(false);
        setProfile(ensured);
        setFirebaseUser(user);
        setLoading(false);
      } catch (error) {
        console.error("Failed to ensure user document or set cookie", error);
        if (authEventId !== authEventIdRef.current) return;

        setAuthError(mapAuthError(error));
        recoveringSessionRef.current = true;
        cookieSyncStateRef.current = initialCookieSyncState;
        setFirebaseUser(null);
        setProfile(null);
        setPending(false);
        setLoading(false);

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

      setLoading(false);
    };

    const initAuth = async () => {
      clearStaleAuthPending();

      if (hasPendingSignIn()) {
        setAuthPending(true);
      } else {
        clearAuthPendingExpiry();
        setAuthPending(false);
      }

      bootstrapTimeout = setTimeout(() => {
        if (!auth.currentUser) {
          clearAuthPendingExpiry();
          setAuthPending(false);
          setLoading(false);
        }
      }, 10_000);

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
        setLoading(false);
        clearAuthPendingExpiry();
      }

      if (!auth.currentUser) {
        setLoading(false);
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

    try {
      await signInWithGooglePopupFirst(auth, googleProvider);
    } catch (error: unknown) {
      const code = (error as { code?: string }).code;
      if (code === "auth/cancelled-popup-request") {
        setAuthError(mapAuthError(error));
        setPending(false);
        setLoading(false);
        return;
      }
      setAuthError(mapAuthError(error));
      setPending(false);
      setLoading(false);
      throw error;
    }
  }, [setPending]);

  const signOutUser = useCallback(async () => {
    userSessionSyncInFlightRef.current = 0;
    await signOut(getFirebaseAuth());
  }, []);

  return {
    firebaseUser,
    profile,
    loading,
    authPending,
    authError,
    signInWithGoogle,
    signOutUser,
  };
}
