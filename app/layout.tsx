import type { Metadata } from "next";
import localFont from "next/font/local";

import "./globals.css";
import { ThemeProvider } from "@/components/shared/theme-provider";

const vazir = localFont({
  src: "../fonts/Vazirmatn-Regular.ttf",
  variable: "--font-vazir",
  display: "swap",
});

export const metadata: Metadata = {
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
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
