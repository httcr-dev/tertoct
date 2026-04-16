import type { User } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebase/client";
import type { AppUserProfile } from "@/lib/types";

export async function ensureUserDocument(user: User): Promise<AppUserProfile> {
  const db = getFirestoreDb();
  const userRef = doc(db, "users", user.uid);
  const publicProfileRef = doc(db, "publicProfiles", user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    const profile: Omit<AppUserProfile, "id" | "createdAt"> = {
      name: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      role: "student",
      planId: null,
      active: true,
    };

    await setDoc(userRef, {
      ...profile,
      createdAt: serverTimestamp(),
    });

    if (profile.role === "coach" || profile.role === "admin") {
      await setDoc(
        publicProfileRef,
        {
          name: profile.name ?? null,
          photoURL: profile.photoURL ?? null,
          role: profile.role,
          bio: null,
        },
        { merge: true },
      );
    }

    return {
      id: user.uid,
      ...profile,
      createdAt: null,
    };
  }

  const data = snap.data();
  const updates: Record<string, string> = {};

  if (user.displayName && data.name !== user.displayName) {
    updates.name = user.displayName;
  }
  if (user.email && data.email !== user.email) {
    updates.email = user.email;
  }
  if (user.photoURL && data.photoURL !== user.photoURL) {
    updates.photoURL = user.photoURL;
  }

  if (Object.keys(updates).length > 0) {
    try {
      await updateDoc(userRef, updates);
    } catch {
      // Non-critical: profile sync failure shouldn't block login
    }
  }

  const role = data.role ?? "student";
  if (role === "coach" || role === "admin") {
    await setDoc(
      publicProfileRef,
      {
        name: updates.name ?? data.name ?? user.displayName ?? null,
        photoURL: updates.photoURL ?? data.photoURL ?? user.photoURL ?? null,
        role,
        bio: data.bio ?? null,
      },
      { merge: true },
    );
  }

  return {
    id: snap.id,
    name: updates.name ?? data.name ?? user.displayName ?? null,
    email: updates.email ?? data.email ?? user.email ?? null,
    photoURL: updates.photoURL ?? data.photoURL ?? user.photoURL ?? null,
    role,
    planId: data.planId ?? null,
    active: data.active ?? true,
    createdAt: data.createdAt?.toDate?.() ?? null,
    paymentDueDay: data.paymentDueDay ?? null,
    monthlyPaymentPaid: data.monthlyPaymentPaid ?? false,
    paymentValidUntil: data.paymentValidUntil ?? null,
  };
}

