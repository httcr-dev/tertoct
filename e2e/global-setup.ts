import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { seedEmulatorAndCreateTokens } from "./seed-emulator";

export default async function globalSetup(): Promise<void> {
  const tokens = await seedEmulatorAndCreateTokens();
  const authDir = path.join(__dirname, ".auth");
  await mkdir(authDir, { recursive: true });
  await writeFile(
    path.join(authDir, "tokens.json"),
    JSON.stringify(tokens, null, 2),
    "utf8",
  );
}
