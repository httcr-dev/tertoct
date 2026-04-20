import { DecodedIdToken } from "firebase-admin/auth";
import * as admin from "firebase-admin";

type VerifyTokenOptions = {
  checkRevoked?: boolean;
};

export async function verifyToken(
  token: string,
  options: VerifyTokenOptions = {},
): Promise<DecodedIdToken> {
  try {
    const decodedToken = await admin.auth().verifyIdToken(token, options.checkRevoked);
    return decodedToken;
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
}
