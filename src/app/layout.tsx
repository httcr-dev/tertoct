import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Toaster position="top-center" toastOptions={{ style: { background: '#18181b', color: '#fff' } }} />
        <AuthProvider>{children}</AuthProvider>

        <footer className="bg-zinc-800 text-zinc-200 py-6 text-center">
          <p className="text-sm">
            &copy; 2026 TertoCT. Todos os direitos reservados.
          </p>
        </footer>
      </body>
    </html>
  );
}
