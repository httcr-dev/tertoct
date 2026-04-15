import type { DecodedIdToken } from "firebase-admin/auth";
import { getAdminAuth } from "./admin";

type VerifyTokenOptions = {
  checkRevoked?: boolean;
};

export async function verifyToken(
  token: string,
  options: VerifyTokenOptions = {},
): Promise<DecodedIdToken> {
  try {
    const decoded = await getAdminAuth()
      .verifyIdToken(token, options.checkRevoked === true);
    return decoded;
  } catch {
    throw new Error("Invalid token");
  }
}
