import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { Toaster } from "react-hot-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TertoCT Gym",
  description: "Check-in system for TertoCT Gym",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? "";

  return (
    <html lang="en" suppressHydrationWarning nonce={nonce || undefined}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Toaster
          position="top-center"
          toastOptions={{
            style: { background: "#18181b", color: "#fff" },
            duration: 3200,
          }}
        />
        <AuthProvider>{children}</AuthProvider>

        <footer className="relative z-10 mt-auto flex flex-col items-center justify-center gap-4 border-t border-zinc-800/60 bg-zinc-950/80 py-8 text-zinc-400 backdrop-blur-sm">
          <p className="text-sm">
            &copy; 2026 TertoCT. Todos os direitos reservados.
          </p>
        </footer>
      </body>
    </html>
  );
}
