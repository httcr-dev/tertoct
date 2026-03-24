import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow ngrok and other dev origins for testing
  allowedDevOrigins: ["*.ngrok-free.dev", "*.ngrok.io"],
};

export default nextConfig;
