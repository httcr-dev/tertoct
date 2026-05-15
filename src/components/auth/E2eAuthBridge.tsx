"use client";

import { useEffect } from "react";
import { signInWithCustomToken, signOut } from "firebase/auth";
import { connectEmulatorsIfEnabled } from "@/lib/firebase/connectEmulators";
import { getFirebaseAuth } from "@/lib/firebase/client";

declare global {
  interface Window {
    __TEROCT_E2E_SIGN_IN__?: (customToken: string) => Promise<void>;
    __TEROCT_E2E_SIGN_OUT__?: () => Promise<void>;
  }
}

export function E2eAuthBridge() {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_E2E !== "true") return;

    connectEmulatorsIfEnabled();

    window.__TEROCT_E2E_SIGN_IN__ = async (customToken: string) => {
      await signInWithCustomToken(getFirebaseAuth(), customToken);
    };
    window.__TEROCT_E2E_SIGN_OUT__ = async () => {
      await signOut(getFirebaseAuth());
    };
  }, []);

  return null;
}
