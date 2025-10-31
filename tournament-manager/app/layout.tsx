import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { Toaster } from "react-hot-toast"; // <-- For notifications
import { ThemeProvider } from "@/components/providers/ThemeProvider"; // <-- For dark mode
import SessionProvider from "@/components/providers/SessionProvider"; // <-- For Auth

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Flexible Tournament Manager",
  description: "The ultimate flexible tournament manager.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning is required for next-themes
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <SessionProvider>
            {/* Toaster is for notifications */}
            <Toaster position="top-center" />
            <main className="flex-grow">{children}</main>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}