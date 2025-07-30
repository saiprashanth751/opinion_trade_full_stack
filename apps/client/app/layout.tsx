// apps/client/app/layout.tsx
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css"
import { QueryProvider } from "@/components/providers/QueryProvider";
import { NextAuthProvider } from "@/components/providers/NextAuthProvider";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "TradePulse - Prediction Trading Platform",
  description: "Trade on future events with confidence",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <NextAuthProvider>
          <QueryProvider>
            {children}
          </QueryProvider>
        </NextAuthProvider>
      </body>
    </html>
  );
}