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

  // First: Handle redirect result and initialize auth listener
  useEffect(() => {
    const auth = getFirebaseAuth();
    let unsubscribe: (() => void) | null = null;

    const initAuth = async () => {
      try {
        // First, try to get the redirect result from Google sign-in
        console.log("🔍 Checking for redirect result...");
        const result = await getRedirectResult(auth);
        if (result?.user) {
          console.log("✅ Redirect sign-in successful:", {
            email: result.user.email,
            uid: result.user.uid,
            isAnonymous: result.user.isAnonymous,
          });
        } else {
          console.log(
            "❓ No redirect result (normal if not returning from Google login)",
          );
        }
      } catch (error: any) {
        console.error("❌ Error handling redirect result:", {
          message: error?.message,
          code: error?.code,
        });
      }

      // Now set up the auth state listener
      console.log("🔐 Setting up auth state listener...");
      unsubscribe = onAuthStateChanged(auth, async (user) => {
        console.log("👤 Auth state changed:", {
          email: user?.email || "logged out",
          uid: user?.uid,
        });

        setFirebaseUser(user);

        if (user) {
          try {
            console.log("📝 Ensuring user document in Firestore...");
            const ensured = await ensureUserDocument(user);
            setProfile(ensured);
            console.log("✅ User profile ready:", ensured.email);
          } catch (error) {
            console.error("❌ Failed to ensure user document:", error);
            setProfile(null);
          }
        } else {
          console.log("⚠️ No user, clearing profile");
          setProfile(null);
        }

        console.log("✅ Loading set to false");
        setLoading(false);
      });
    };

    initAuth();

    return () => {
      if (unsubscribe) {
        console.log("🧹 Cleaning up auth listener");
        unsubscribe();
      }
    };
  }, []);

  const signInWithGoogle = async () => {
    const auth = getFirebaseAuth();

    // Detect if mobile device
    const isMobile =
      /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        navigator.userAgent.toLowerCase(),
      );

    console.log("🔐 Starting Google sign-in...", {
      isMobile,
      userAgent: navigator.userAgent,
    });

    try {
      // Always try popup first - works better on modern mobile browsers
      console.log("📱 Attempting popup method...");
      await signInWithPopup(auth, googleProvider);
      console.log("✅ Popup sign-in successful");
    } catch (error: any) {
      console.error("⚠️ Popup error:", {
        code: error?.code,
        message: error?.message,
      });

      // Only use redirect if popup is not supported (e.g., in WebViews)
      if (
        error?.code === "auth/operation-not-supported-in-this-environment" ||
        error?.code === "auth/popup-blocked"
      ) {
        console.log("🔄 Popup not supported, trying redirect...");
        try {
          await signInWithRedirect(auth, googleProvider);
          // Execution stops here on redirect
        } catch (redirectError: any) {
          console.error("❌ Redirect also failed:", {
            code: redirectError?.code,
            message: redirectError?.message,
          });
          throw redirectError;
        }
      } else if (
        error?.code === "auth/cancelled-popup-request" ||
        error?.code === "auth/popup-closed-by-user"
      ) {
        console.log("❌ Sign-in was cancelled by user");
        return;
      } else {
        console.error("❌ Unexpected sign-in error:", error);
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
