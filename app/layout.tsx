import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/contexts/AuthContext";
import { QueryProvider } from "@/lib/providers/QueryProvider";
import { SyncProvider } from "@/components/SyncProvider";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MOMU - Aprenda qualquer coisa",
  description: "Organize seu aprendizado com tópicos, vídeos e anotações",
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
        <QueryProvider>
          <AuthProvider>
            <SyncProvider>
              {children}
              <OfflineIndicator />
              <Toaster position="top-right" richColors />
            </SyncProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
