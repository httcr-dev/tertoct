import type { NextConfig } from "next";
import os from "node:os";

function devServerPort(): string {
  const argv = process.argv;
  const pIdx = argv.indexOf("-p");
  if (pIdx !== -1 && argv[pIdx + 1]) return argv[pIdx + 1]!;
  const portArg = argv.find((a) => a.startsWith("--port="));
  if (portArg) return portArg.split("=")[1] ?? "3000";
  return process.env.PORT ?? "3000";
}

function lanHttpDevOrigins(): string[] {
  if (process.env.NODE_ENV !== "development") return [];
  const port = devServerPort();
  return Object.values(os.networkInterfaces())
    .flat()
    .filter(
      (n): n is NonNullable<typeof n> & { address: string } =>
        Boolean(n && !n.internal && n.family === "IPv4"),
    )
    .map((n) => `http://${n.address}:${port}`);
}

const extraDevOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  : [];

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "*.ngrok-free.dev",
    "*.ngrok-free.app",
    "*.ngrok.io",
    "*.ngrok.app",
    ...lanHttpDevOrigins(),
    ...extraDevOrigins,
  ],
  images: {
    qualities: [100, 75],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
