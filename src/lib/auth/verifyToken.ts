import * as admin from "firebase-admin";
import type { DecodedIdToken } from "firebase-admin/auth";

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "tertoct-local",
  });
}

type VerifyTokenOptions = {
  checkRevoked?: boolean;
};

export async function verifyToken(
  token: string,
  options: VerifyTokenOptions = {},
): Promise<DecodedIdToken> {
  try {
    const decoded = await admin
      .auth()
      .verifyIdToken(token, options.checkRevoked === true);
    return decoded;
  } catch {
    throw new Error("Invalid token");
  }
}
