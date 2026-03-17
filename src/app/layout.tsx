import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TertoCT Gym Check-In",
  description: "Check-in system for TertoCT Gym",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
        <footer className="bg-zinc-800 text-zinc-200 py-6 text-center">
          <p className="text-sm">
            &copy; 2026 TertoCT. Todos os direitos reservados.
          </p>
          <p className="text-xs">Desenvolvido com ❤️ por Heitor</p>
        </footer>
      </body>
    </html>
  );
}
