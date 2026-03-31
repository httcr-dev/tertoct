"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import {
  onAuthStateChanged,
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

  useEffect(() => {
    const auth = getFirebaseAuth();
    let unsubscribe: (() => void) | null = null;

    const initAuth = async () => {
      try {
        await getRedirectResult(auth);
      } catch (error) {
        console.error("Error handling redirect result");
      }

      unsubscribe = onAuthStateChanged(auth, async (user) => {
        setFirebaseUser(user);

        if (user) {
          try {
            const ensured = await ensureUserDocument(user);
            setProfile(ensured);
          } catch (error) {
            console.error("Failed to ensure user document");
            setProfile(null);
          }
        } else {
          setProfile(null);
        }

        setLoading(false);
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
    } catch (error: any) {
      // Fallback to redirect if popup is blocked or unsupported
      if (
        error?.code === "auth/operation-not-supported-in-this-environment" ||
        error?.code === "auth/popup-blocked"
      ) {
        try {
          await signInWithRedirect(auth, googleProvider);
        } catch (redirectError) {
          console.error("Redirect sign-in failed");
          throw redirectError;
        }
      } else if (
        error?.code === "auth/cancelled-popup-request" ||
        error?.code === "auth/popup-closed-by-user"
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
