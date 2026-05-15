export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertProductionFirebaseEnv } = await import("@/lib/env");
    assertProductionFirebaseEnv();
  }
}
