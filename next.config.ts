import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow ngrok and other dev origins for testing
  allowedDevOrigins: ["*.ngrok-free.dev", "*.ngrok.io"],
  images: {
    // Include all quality values used in <Image quality={N} /> props.
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
