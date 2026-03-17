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

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);

      if (user) {
        try {
          const ensured = await ensureUserDocument(user);
          setProfile(ensured);
        } catch (error) {
          console.error("Failed to ensure user document", error);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const auth = getFirebaseAuth();
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (error.code === "auth/cancelled-popup-request" || error.code === "auth/popup-closed-by-user") {
        return;
      }
      throw error;
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
