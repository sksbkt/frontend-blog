import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import "./globals.css";
import { ThemeProvider } from "@/components/shared/theme-provider";
import PwaRegister from "@/components/shared/pwa-register";

const vazir = localFont({
  src: "../fonts/Vazirmatn-Regular.ttf",
  variable: "--font-vazir",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#090d16",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Ali Portfolio",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  title: {
    default: "Ali — Frontend Developer | React, Next.js & TypeScript",
    template: "%s | Ali",
  },
  description:
    "Ali is a frontend developer specializing in React, Next.js, and TypeScript, building modern, accessible, responsive web applications and digital experiences.",
  keywords: [
    "Ali",
    "Frontend Developer",
    "React Developer",
    "Next.js Developer",
    "TypeScript Developer",
    "React",
    "Next.js",
    "TypeScript",
    "Tailwind CSS",
    "Web Development",
  ],
  authors: [
    {
      name: "Ali",
    },
  ],
  creator: "Ali",
  applicationName: "Ali — Frontend Developer",
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning>
      <body className={`${vazir.variable} antialiased`}>
        <ThemeProvider>
          <PwaRegister />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
